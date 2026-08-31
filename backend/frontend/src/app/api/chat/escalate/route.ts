import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transcript, sessionId, userEmail } = body;

    if (!transcript) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }

    // In a real app, this would insert a row into a `support_tickets` table
    // or send an email via Resend/SendGrid.
    console.log(`[ESCALATION] Ticket created for session ${sessionId}. User: ${userEmail || 'Anonymous'}. Transcript length: ${transcript.length}`);

    return NextResponse.json({ success: true, message: "Ticket created from chat transcript." });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
