import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This route is the sendBeacon target — used when the page is unloading.
// sendBeacon cannot use the Supabase JS client directly (no cookies in unload context),
// so we accept the client's access_token and use it to authenticate the request.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    if (!body) {
      return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const { draft, accessToken, userId: payloadUserId } = payload as { draft: Record<string, unknown>; accessToken?: string; userId?: string };

    if (!draft || !draft.id) {
      return NextResponse.json({ error: 'Invalid draft payload' }, { status: 400 });
    }

    // Resolve the correct userId from the access token
    let resolvedUserId: string | null = null;

    if (accessToken) {
      try {
        // Use service role client to verify the user from the JWT
        const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false },
        });
        const { data: { user }, error: authError } = await adminClient.auth.getUser(accessToken);
        if (!authError && user?.id) {
          resolvedUserId = user.id;
        }
      } catch {
        // Fall through — will try anon upsert below
      }
    }

    // Fallback to the payload's userId if the token couldn't be resolved
    const finalUserId = resolvedUserId || payloadUserId || draft.userId;

    // Ensure we NEVER attempt to save with 'local' as userId which breaks foreign key constraint
    if (finalUserId === 'local') {
      return NextResponse.json({ error: 'Missing valid userId' }, { status: 400 });
    }

    // Build the final draft record — always override userId with the verified value
    const draftRecord = {
      ...draft,
      status: 'draft',
      updatedAt: new Date().toISOString(),
      userId: finalUserId
    };

    // Use the auth token from the client for RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : {},
      auth: { persistSession: false },
    });

    const { error } = await supabase
      .from('invoices')
      .upsert(draftRecord);

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
