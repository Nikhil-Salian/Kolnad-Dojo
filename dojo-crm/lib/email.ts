import nodemailer from 'nodemailer';

export function isGmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('Gmail SMTP credentials (GMAIL_USER, GMAIL_APP_PASSWORD) are not configured.');
  }

  // Support app password with or without spaces
  const cleanPass = pass.replace(/\s+/g, '');

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass: cleanPass,
    },
  });
}

export interface SendReminderOptions {
  toEmail: string;
  studentName: string;
  monthName: string;
  amount: number;
}

export async function sendFeeReminderEmail({ toEmail, studentName, monthName, amount }: SendReminderOptions) {
  const transporter = getTransporter();
  const fromEmail = process.env.GMAIL_USER;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fee Reminder - Kolnad Dojo</title>
      </head>
      <body style="margin:0; padding:0; background-color:#0B0A09; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color:#EDE6D6;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; margin:30px auto; background-color:#161412; border:1px solid #332E29; border-radius:8px; overflow:hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td align="center" style="padding:28px 20px; background-color:#1E1A17; border-bottom:2px solid #D4A843;">
              <span style="font-size:26px; font-weight:bold; color:#D4A843; letter-spacing:1px;">🥋 KOLNAD DOJO</span>
              <p style="margin:5px 0 0 0; font-size:12px; color:#A89F91; text-transform:uppercase; letter-spacing:1.5px;">Institute of Karate and Allied Arts</p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px 28px;">
              <h2 style="color:#EDE6D6; font-size:20px; margin-top:0; margin-bottom:16px;">
                Monthly Dojo Fee Notice
              </h2>
              
              <p style="color:#C9BFB5; font-size:15px; line-height:1.6; margin-bottom:20px;">
                Dear <strong style="color:#EDE6D6;">${studentName}</strong>,
              </p>

              <p style="color:#C9BFB5; font-size:15px; line-height:1.6; margin-bottom:24px;">
                This is a friendly reminder from Kolnad Dojo that your training fee for the month of <strong style="color:#D4A843;">${monthName}</strong> is currently pending.
              </p>

              <!-- Payment Details Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#211D1A; border-left:4px solid #D4A843; border-radius:4px; margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#A89F91; font-size:13px; text-transform:uppercase; font-weight:600;">Student Name:</td>
                        <td align="right" style="color:#EDE6D6; font-size:14px; font-weight:600;">${studentName}</td>
                      </tr>
                      <tr>
                        <td style="color:#A89F91; font-size:13px; text-transform:uppercase; font-weight:600; padding-top:10px;">Pending Month:</td>
                        <td align="right" style="color:#D4A843; font-size:14px; font-weight:600; padding-top:10px;">${monthName}</td>
                      </tr>
                      <tr>
                        <td style="color:#A89F91; font-size:13px; text-transform:uppercase; font-weight:600; padding-top:10px;">Amount Due:</td>
                        <td align="right" style="color:#EDE6D6; font-size:18px; font-weight:bold; padding-top:10px;">₹${amount}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#C9BFB5; font-size:14px; line-height:1.6; margin-bottom:24px;">
                Please ensure the fee payment is cleared at the earliest during regular class hours or via your preferred payment method. If you have already made the payment recently, kindly ignore this reminder or contact Sensei for updates.
              </p>

              <p style="color:#C9BFB5; font-size:14px; margin-bottom:0;">
                Osu & Best regards,<br/>
                <strong style="color:#D4A843;">Sensei / Management</strong><br/>
                <span style="color:#8C8275; font-size:13px;">Kolnad Dojo CRM System</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:18px 20px; background-color:#12100E; border-top:1px solid #2B2622; color:#786F63; font-size:12px;">
              Sent via Kolnad Dojo Fee System • Email: ${fromEmail}
            </td>
          </tr>

        </table>
      </body>
    </html>
  `;

  const info = await transporter.sendMail({
    from: `"Kolnad Dojo Fee Reminder" <${fromEmail}>`,
    to: toEmail,
    subject: `🥋 Dojo Fee Reminder for ${monthName} - ${studentName}`,
    html: htmlContent,
  });

  return info;
}
