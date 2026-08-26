import os
import logging
from datetime import datetime, timedelta
import asyncio
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scheduler")


# ---------------------------------------------------------------------------
# get_next_scheduled_date
#
# MUST STAY IN SYNC WITH frontend/src/App.tsx — getNextScheduledDate()
# (lines 1200-1215). Both implement identical date-arithmetic.
# If you change one, change the other.
# ---------------------------------------------------------------------------
def get_next_scheduled_date(current_date_str: str, interval: str) -> str:
    try:
        date = datetime.strptime(current_date_str, "%Y-%m-%d")
    except ValueError:
        date = datetime.now()
    
    if interval == "weekly":
        date += timedelta(days=7)
    elif interval == "bi-weekly":
        date += timedelta(days=14)
    elif interval == "monthly":
        # Add 1 month approx by adding 30 days or using calendar
        # To perfectly match JS: setMonth(getMonth() + 1)
        # In Python we can add 30 days or handle month transition:
        month = date.month
        year = date.year
        if month == 12:
            month = 1
            year += 1
        else:
            month += 1
        try:
            date = date.replace(year=year, month=month)
        except ValueError:
            # Handle day out of range (e.g. Jan 31 -> Feb 28)
            # Fall back to adding 30 days
            date += timedelta(days=30)
    elif interval == "yearly":
        try:
            date = date.replace(year=date.year + 1)
        except ValueError:
            # Leap year fallback (Feb 29 -> Feb 28 next year)
            date = date.replace(year=date.year + 1, day=28)
            
    return date.strftime("%Y-%m-%d")


def _make_child_id(parent_id: str, billing_date: str) -> str:
    """
    Deterministic child invoice ID derived from parent ID + billing date.
    Format: inv_rec_{parentId}_{YYYYMMDD}

    Using a stable ID (not random) is the primary idempotency mechanism:
    if the client-side useEffect (App.tsx) and the server scheduler both fire
    on the same day for the same parent, the second writer hits the DB unique
    index on (parentInvoiceId, date) and is silently ignored — no duplicates.

    MUST STAY IN SYNC WITH frontend/src/App.tsx child ID generation.
    """
    safe_parent = "".join(c if c.isalnum() or c in "-_" else "" for c in parent_id)
    safe_date = billing_date.replace("-", "")   # e.g. "20250115"
    return f"inv_rec_{safe_parent}_{safe_date}"


async def run_recurring_invoices_job() -> int:
    """
    Scans all active recurring-parent invoices, backfills any missed billing
    cycles (up to 10 per parent per run), writes child invoices to Supabase,
    and updates each parent's lastGeneratedDate.

    Returns the number of child invoices generated in this run.

    Idempotency guarantee
    ---------------------
    * lastGeneratedDate guard  : if lastGeneratedDate >= today, skip parent.
      Both App.tsx useEffect and this function check this before spawning.
    * Deterministic child IDs  : inv_rec_{parentId}_{date} is stable —
      a race between client and server results in ON CONFLICT DO NOTHING.
    * resolution=ignore-duplicates: PostgREST insert never errors on conflict.

    Audit trail
    -----------
    Every run (success or failure) is recorded in the job_runs table.
    """
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    # Service-role key bypasses RLS so the scheduler can read all users' invoices.
    # Falls back to anon key for local dev (will be limited by RLS).
    supabase_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )

    if not supabase_url or "YOUR_PROJECT_REF" in supabase_url or not supabase_key:
        logger.error("Supabase credentials not configured. Scheduler cannot run.")
        return 0

    base_url = supabase_url.rstrip("/")
    job_id = None
    started_at = datetime.utcnow().isoformat() + "Z"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
        }
        
        # ------------------------------------------------------------------ #
        # 1. Open audit log row (run_status = "running")
        # ------------------------------------------------------------------ #
        try:
            res = await client.post(
                f"{base_url}/rest/v1/job_runs",
                json={
                    "job_name": "recurring_invoice_generation",
                    "run_status": "running",
                    "started_at": started_at,
                },
                headers={**headers, "Prefer": "return=representation"},
            )
            if res.status_code == 201:
                data = res.json()
                if data:
                    job_id = data[0].get("id")
        except Exception as e:
            logger.warning(f"Failed to open audit log row: {e}")

        async def _fail_job(reason: str):
            """Mark the current job_runs row as failed."""
            if job_id:
                try:
                    await client.patch(
                        f"{base_url}/rest/v1/job_runs?id=eq.{job_id}",
                        json={
                            "run_status": "failed",
                            "error_message": reason,
                            "completed_at": datetime.utcnow().isoformat() + "Z",
                        },
                        headers=headers,
                    )
                except Exception:
                    pass

        # ------------------------------------------------------------------ #
        # 2. Fetch only active recurring parent invoices
        #    Filter server-side to avoid pulling the whole invoices table.
        # ------------------------------------------------------------------ #
        try:
            invoices_url = f"{base_url}/rest/v1/invoices"
            res = await client.get(
                invoices_url,
                params={
                    "recurringSettings->>isRecurring": "eq.true",
                    "recurringSettings->>hasEnded":    "not.eq.true",
                    "parentInvoiceId":                 "is.null",
                },
                headers=headers,
            )
            if res.status_code != 200:
                raise Exception(
                    f"Failed to fetch invoices: HTTP {res.status_code} — {res.text}"
                )
            all_invoices = res.json()
        except Exception as e:
            logger.error(f"Error fetching invoices: {e}")
            await _fail_job(str(e))
            return 0

        today_str = datetime.now().strftime("%Y-%m-%d")
        new_spawned: list[dict] = []
        updated_parents: list[dict] = []

        for parent in all_invoices:
            rec = parent.get("recurringSettings")
            if not rec or not rec.get("isRecurring") or rec.get("hasEnded"):
                continue

            interval   = rec.get("interval", "monthly")
            start_date = rec.get("startDate", today_str)
            end_date   = rec.get("endDate")

            if today_str < start_date:
                continue

            # Idempotency guard #1: lastGeneratedDate
            cursor_date = rec.get("lastGeneratedDate") or start_date
            if rec.get("lastGeneratedDate") and rec["lastGeneratedDate"] >= today_str:
                continue

            temp_last_generated = cursor_date
            has_ended = False
            iterations = 0

            # MUST STAY IN SYNC WITH frontend/src/App.tsx useEffect (L1217-L1317)
            while iterations < 10:
                next_date = get_next_scheduled_date(temp_last_generated, interval)

                if next_date > today_str:
                    break

                if end_date and next_date > end_date:
                    has_ended = True
                    break

                # Idempotency guard #2: deterministic child ID
                # inv_rec_{parentId}_{date} is stable — a second write for the
                # same parent+date is silently ignored by the DB unique index.
                child_id = _make_child_id(parent.get("id", ""), next_date)

                spawn_due = (
                    datetime.strptime(next_date, "%Y-%m-%d") + timedelta(days=14)
                ).strftime("%Y-%m-%d")

                spawn_number = f"{parent.get('invoiceNumber', 'INV')}-R{next_date.replace('-', '')}"

                child_invoice = {
                    **parent,
                    "id":                child_id,
                    "invoiceNumber":     spawn_number,
                    "date":              next_date,
                    "dueDate":           spawn_due,
                    "status":            "pending",
                    "createdAt":         datetime.utcnow().isoformat() + "Z",
                    "updatedAt":         datetime.utcnow().isoformat() + "Z",
                    "parentInvoiceId":   parent.get("id"),
                    "recurringSettings": None,
                }

                new_spawned.append(child_invoice)
                temp_last_generated = next_date
                iterations += 1

            if temp_last_generated != cursor_date or has_ended:
                updated_parents.append({
                    **parent,
                    "recurringSettings": {
                        **rec,
                        "lastGeneratedDate": temp_last_generated,
                        "hasEnded": has_ended,
                    },
                    "updatedAt": datetime.utcnow().isoformat() + "Z",
                })

        total_generated = len(new_spawned)
        logger.info(
            f"Scheduler: {len(all_invoices)} active parents scanned, "
            f"{total_generated} child(ren) to generate, "
            f"{len(updated_parents)} parent(s) to update."
        )

        # ------------------------------------------------------------------ #
        # 3. Persist changes
        # ------------------------------------------------------------------ #
        if updated_parents or new_spawned:
            try:
                # 3a. Update parents individually via PATCH so we only touch
                #     recurringSettings + updatedAt, not all columns.
                for parent in updated_parents:
                    pid = parent["id"]
                    patch_res = await client.patch(
                        f"{base_url}/rest/v1/invoices?id=eq.{pid}",
                        json={
                            "recurringSettings": parent["recurringSettings"],
                            "updatedAt":         parent["updatedAt"],
                        },
                        headers=headers,
                    )
                    if patch_res.status_code not in (200, 204):
                        logger.warning(
                            f"Failed to patch parent {pid}: "
                            f"HTTP {patch_res.status_code} — {patch_res.text}"
                        )

                # 3b. Insert children with resolution=ignore-duplicates.
                #     If a child with the same deterministic ID already exists
                #     (created by the client-side useEffect), Postgres ignores
                #     the duplicate and the request still returns 200/201.
                if new_spawned:
                    insert_res = await client.post(
                        invoices_url,
                        json=new_spawned,
                        headers={
                            **headers,
                            "Prefer": "resolution=ignore-duplicates,return=minimal",
                        },
                    )
                    if insert_res.status_code not in (200, 201):
                        raise Exception(
                            f"Failed to insert child invoices: "
                            f"HTTP {insert_res.status_code} — {insert_res.text}"
                        )

                logger.info(
                    f"Scheduler: persisted {total_generated} child invoice(s) successfully."
                )

            except Exception as e:
                logger.error(f"Error persisting recurring invoices: {e}")
                await _fail_job(str(e))
                return 0

        # ------------------------------------------------------------------ #
        # 4. Close audit log row (run_status = "success")
        # ------------------------------------------------------------------ #
        if job_id:
            try:
                await client.patch(
                    f"{base_url}/rest/v1/job_runs?id=eq.{job_id}",
                    json={
                        "run_status":         "success",
                        "invoices_generated": total_generated,
                        "completed_at":       datetime.utcnow().isoformat() + "Z",
                    },
                    headers=headers,
                )
            except Exception as e:
                logger.warning(f"Failed to close audit log row: {e}")

        return total_generated


async def scheduler_loop():
    """
    Long-running background asyncio task started by main.py's lifespan handler.
    Fires run_recurring_invoices_job() immediately on boot (so there's no
    24-hour wait after deployment) then sleeps 24 h before the next run.
    """
    logger.info("Recurring invoice scheduler started.")
    while True:
        try:
            count = await run_recurring_invoices_job()
            logger.info(f"Scheduler run complete — {count} invoice(s) generated.")
        except Exception as e:
            logger.error(f"Unhandled error in scheduler_loop: {e}")
        # Sleep 24 h before next run
        await asyncio.sleep(24 * 3600)

