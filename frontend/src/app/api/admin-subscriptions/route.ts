import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Direct Admin endpoint to sync and fetch all active subscriptions across users
 * Runs with Supabase Service Role Key to bypass client-side RLS.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uidsParam = searchParams.get("uids");
    const emailsParam = searchParams.get("emails");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase connection keys missing" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    let query = supabaseAdmin
      .from("subscriptions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (uidsParam) {
      const uids = uidsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (uids.length > 0) {
        query = query.in("user_id", uids);
      }
    } else if (emailsParam) {
      const emails = emailsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (emails.length > 0) {
        query = query.in("user_email", emails);
      }
    }

    const { data: subs, error } = await query;

    if (error) {
      console.error("[Admin Subscriptions API Error]:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map by user_id and user_email for instantaneous lookup
    const byUserId: Record<string, any> = {};
    const byUserEmail: Record<string, any> = {};

    if (Array.isArray(subs)) {
      for (const s of subs) {
        if (s.user_id && !byUserId[s.user_id]) {
          byUserId[s.user_id] = s;
        }
        if (s.user_email && !byUserEmail[s.user_email.toLowerCase()]) {
          byUserEmail[s.user_email.toLowerCase()] = s;
        }
      }
    }

    return NextResponse.json({
      success: true,
      subscriptions: subs || [],
      byUserId,
      byUserEmail,
      total: subs?.length || 0,
    });
  } catch (err: any) {
    console.error("[Admin Subscriptions API Exception]:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
