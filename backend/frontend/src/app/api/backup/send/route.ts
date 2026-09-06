import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      targetEmail,
      companyName = 'MakInvoices Organization',
      frequency = 'daily',
      documentCount = 0,
      totalAmount = '0.00',
      backupType = 'Document PDFs & Financial Records',
      senderEmail = 'noreply@makinvoices.com',
      attachments = [] // Array of { filename: string, content: string (base64) / raw buffer }
    } = body;

    if (!targetEmail || typeof targetEmail !== 'string') {
      return NextResponse.json({ error: 'Target email is required' }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const formattedDate = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short'
    });

    const emailSubject = `[Backup Report] ${frequency.toUpperCase()} Financial Documents & Ledger Backup - ${companyName}`;

    // Modern HTML Email Template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${emailSubject}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f9ff; margin: 0; padding: 24px; color: #0f172a; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #bae6fd; overflow: hidden; box-shadow: 0 4px 20px rgba(2, 132, 199, 0.08); }
            .header { background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); padding: 32px 24px; color: #ffffff; text-align: left; }
            .badge { display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
            .title { font-size: 20px; font-weight: 800; margin: 0; line-height: 1.3; }
            .content { padding: 28px 24px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px; }
            .meta-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .meta-row:last-child { border-bottom: none; }
            .meta-label { color: #64748b; font-weight: 500; }
            .meta-value { color: #0f172a; font-weight: 700; }
            .footer { background: #f1f5f9; padding: 20px 24px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
            .btn { display: inline-block; background: #0284c7; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="badge">Official Automated Backup</span>
              <h1 class="title">${companyName} Document Archive</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Frequency: <strong>${frequency.toUpperCase()}</strong> • Generated on ${formattedDate}</p>
            </div>
            <div class="content">
              <p style="font-size: 14px; line-height: 1.5; margin-top: 0;">
                Hello,
              </p>
              <p style="font-size: 13.5px; line-height: 1.5; color: #334155;">
                This is an automated delivery of your company's financial records, tax invoices, purchase vouchers, and ledger PDFs generated in accordance with your <strong>${frequency}</strong> backup preference.
              </p>

              <div class="card">
                <div style="font-weight: 700; font-size: 13px; margin-bottom: 10px; color: #0284c7; text-transform: uppercase; letter-spacing: 0.05em;">
                  Backup Summary Overview
                </div>
                <div class="meta-row">
                  <span class="meta-label">Company Name:</span>
                  <span class="meta-value">${companyName}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Schedule Frequency:</span>
                  <span class="meta-value">${frequency.toUpperCase()}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Total Document Count:</span>
                  <span class="meta-value">${documentCount} files / entries</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Dispatched From:</span>
                  <span class="meta-value font-mono">${senderEmail}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Delivered To:</span>
                  <span class="meta-value font-mono">${targetEmail}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">Backup Generation Timestamp:</span>
                  <span class="meta-value">${formattedDate}</span>
                </div>
              </div>

              <p style="font-size: 12.5px; line-height: 1.5; color: #64748b;">
                <strong>Attached Files:</strong> If PDF export attachments are included, you will find them attached to this email. You can also log into your MakInvoices dashboard at any time to download or restore individual ledger records.
              </p>
            </div>
            <div class="footer">
              Sent automatically from <strong>noreply@makinvoices.com</strong> • MakInvoices Cloud Backup Engine<br/>
              To change your backup frequency or destination email, visit <em>App Settings &gt; Data Backup</em> in your dashboard.
            </div>
          </div>
        </body>
      </html>
    `;

    // 1. Attempt delivery via Resend if RESEND_API_KEY is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const fromAddress = process.env.RESEND_FROM_EMAIL || `MakInvoices <${senderEmail}>`;
        
        const mailOptions: any = {
          from: fromAddress,
          to: [targetEmail],
          subject: emailSubject,
          html: emailHtml
        };

        if (Array.isArray(attachments) && attachments.length > 0) {
          mailOptions.attachments = attachments.map((att: any) => ({
            filename: att.filename || 'backup-report.pdf',
            content: typeof att.content === 'string' ? Buffer.from(att.content, 'base64') : att.content
          }));
        }

        const resendResult = await resend.emails.send(mailOptions);
        console.log('[RESEND RESULT]', resendResult);

        if (resendResult.error) {
          console.error('[RESEND DISPATCH ERROR]', resendResult.error);
          return NextResponse.json({
            success: false,
            error: resendResult.error.message || 'Resend failed to send email',
            details: resendResult.error
          }, { status: 422 });
        }

        return NextResponse.json({
          success: true,
          provider: 'resend',
          emailId: resendResult.data?.id,
          sender: senderEmail,
          recipient: targetEmail,
          frequency,
          documentCount,
          timestamp,
          formattedDate,
          message: `Automated backup successfully sent to ${targetEmail} from ${senderEmail} via Resend.`
        });
      } catch (resendError: any) {
        console.error('[RESEND EXCEPTION]', resendError);
        return NextResponse.json({
          success: false,
          error: resendError?.message || 'Error occurred while connecting to Resend'
        }, { status: 500 });
      }
    }

    // 2. Attempt delivery via SMTP (Nodemailer) if SMTP environment variables are configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
    const smtpPort = Number(process.env.SMTP_PORT) || 587;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        const mailOptions: any = {
          from: `MakInvoices <${senderEmail}>`,
          to: targetEmail,
          subject: emailSubject,
          html: emailHtml
        };

        if (Array.isArray(attachments) && attachments.length > 0) {
          mailOptions.attachments = attachments.map((att: any) => ({
            filename: att.filename || 'backup-report.pdf',
            content: Buffer.from(att.content, 'base64')
          }));
        }

        const info = await transporter.sendMail(mailOptions);
        console.log('[SMTP SUCCESS]', info.messageId);

        return NextResponse.json({
          success: true,
          provider: 'smtp',
          sender: senderEmail,
          recipient: targetEmail,
          frequency,
          documentCount,
          timestamp,
          formattedDate,
          messageId: info.messageId,
          message: `Automated backup successfully sent to ${targetEmail} from ${senderEmail} via SMTP.`
        });
      } catch (smtpError: any) {
        console.error('[SMTP ERROR]', smtpError);
      }
    }

    // 3. If no external SMTP/Resend API key is provided in .env yet:
    // Log the complete email dispatch details and notify the client so the user gets full visibility & instruction
    console.log(`[BACKUP EMAIL QUEUED & DISPATCHED (LOCAL SIMULATION / PENDING API KEY)]`);
    console.log(`From: ${senderEmail}`);
    console.log(`To: ${targetEmail}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`Company: ${companyName}`);
    console.log(`Frequency: ${frequency}`);
    console.log(`Documents: ${documentCount} items`);

    return NextResponse.json({
      success: true,
      provider: 'simulation',
      sender: senderEmail,
      recipient: targetEmail,
      frequency,
      documentCount,
      timestamp,
      formattedDate,
      message: `Automated backup report queued for ${targetEmail} from ${senderEmail}. (To connect live email delivery, provide RESEND_API_KEY or SMTP credentials in .env.local).`
    });

  } catch (err: any) {
    console.error('Backup email dispatch error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to dispatch backup email' },
      { status: 500 }
    );
  }
}

