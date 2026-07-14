-- Enable Row Level Security (RLS) on all user-data tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_items ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------
-- PIN LOCK — server-side bcrypt hash per user

-- Stored on the users row; existing RLS policies already
-- restrict this column to the owning user only.
-- The backend hashes the PIN with bcrypt (passlib) before writing.
-- Never store a plaintext PIN here.
-- ----------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT;


-- ----------------------------------------------------
-- POLICIES FOR 'users' TABLE (column: uid)
-- ----------------------------------------------------
CREATE POLICY "Allow users to view their own profile"
ON users FOR SELECT
USING (auth.uid() = uid);

CREATE POLICY "Allow users to insert/update their own profile"
ON users FOR ALL
USING (auth.uid() = uid)
WITH CHECK (auth.uid() = uid);

-- ----------------------------------------------------
-- POLICIES FOR 'invoices' TABLE (column: userId)
-- ----------------------------------------------------
CREATE POLICY "Allow users to view their own invoices"
ON invoices FOR SELECT
USING (auth.uid() = "userId");

CREATE POLICY "Allow users to manage their own invoices"
ON invoices FOR ALL
USING (auth.uid() = "userId")
WITH CHECK (auth.uid() = "userId");

-- ----------------------------------------------------
-- POLICIES FOR 'clients' TABLE (column: userId)
-- ----------------------------------------------------
CREATE POLICY "Allow users to view their own clients"
ON clients FOR SELECT
USING (auth.uid() = "userId");

CREATE POLICY "Allow users to manage their own clients"
ON clients FOR ALL
USING (auth.uid() = "userId")
WITH CHECK (auth.uid() = "userId");

-- ----------------------------------------------------
-- POLICIES FOR 'expenses' TABLE (column: userId)
-- ----------------------------------------------------
CREATE POLICY "Allow users to view their own expenses"
ON expenses FOR SELECT
USING (auth.uid() = "userId");

CREATE POLICY "Allow users to manage their own expenses"
ON expenses FOR ALL
USING (auth.uid() = "userId")
WITH CHECK (auth.uid() = "userId");

-- ----------------------------------------------------
-- POLICIES FOR 'preset_items' TABLE (column: userId)
-- ----------------------------------------------------
CREATE POLICY "Allow users to view their own presets"
ON preset_items FOR SELECT
USING (auth.uid() = "userId");

CREATE POLICY "Allow users to manage their own presets"
ON preset_items FOR ALL
USING (auth.uid() = "userId")
WITH CHECK (auth.uid() = "userId");

-- ----------------------------------------------------
-- IDEMPOTENCY GUARD — prevent duplicate child invoices
-- A child invoice is uniquely identified by its parent + the billing date.
-- If both the client-side useEffect and the server scheduler fire on the same
-- day for the same parent, the second upsert hits this constraint and is
-- silently ignored (ON CONFLICT DO NOTHING).
-- ----------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS invoices_parent_date_unique
  ON invoices ("parentInvoiceId", "date")
  WHERE "parentInvoiceId" IS NOT NULL;

-- ----------------------------------------------------
-- JOB_RUNS TABLE — audit trail for the recurring scheduler
-- Records every execution of run_recurring_invoices_job():
--   job_name      : identifier of the job (e.g. "recurring_invoice_generation")
--   run_status    : "running" | "success" | "failed"
--   started_at    : UTC timestamp when the job began
--   completed_at  : UTC timestamp when the job finished (NULL while running)
--   invoices_generated : how many child invoices were created in this run
--   error_message : populated only on failure
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS job_runs (
  id              BIGSERIAL PRIMARY KEY,
  job_name        TEXT        NOT NULL DEFAULT 'recurring_invoice_generation',
  run_status      TEXT        NOT NULL DEFAULT 'running',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  invoices_generated INT      DEFAULT 0,
  error_message   TEXT
);

-- Only the service role (backend scheduler) can read/write job_runs.
-- Regular authenticated users and anon callers are denied entirely.
ALTER TABLE job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only — job_runs"
  ON job_runs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ----------------------------------------------------
-- PAN DETAILS SCHEMA ADDITION
-- Adds pan column to both users and company_settings tables
-- ----------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pan TEXT;


