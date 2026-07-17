import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This route is the sendBeacon target — used when the page is unloading.
// sendBeacon cannot use the Supabase JS client directly (no cookies in unload context),
// so we use the anon key here. RLS on the invoices table must allow upsert for authenticated users.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    if (!body) {
      return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const { draft, accessToken } = payload as { draft: Record<string, unknown>; accessToken?: string };

    if (!draft || !draft.id) {
      return NextResponse.json({ error: 'Invalid draft payload' }, { status: 400 });
    }

    // Use the auth token from the client if provided (authenticated save)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : {},
      auth: { persistSession: false },
    });

    const { error } = await supabase
      .from('invoices')
      .upsert({ ...draft, status: 'draft', updatedAt: new Date().toISOString() });

    if (error) {
      console.error('[save-draft] Supabase upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[save-draft] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
