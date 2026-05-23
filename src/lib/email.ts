import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// ==================== CONFIG ====================
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

// Priority: Resend (best deliverability) > Gmail SMTP (fallback) > Simulation
const emailProvider: 'resend' | 'gmail' | 'simulation' = RESEND_API_KEY
  ? 'resend'
  : (GMAIL_USER && GMAIL_APP_PASSWORD)
    ? 'gmail'
    : 'simulation';

const isSimulation = emailProvider === 'simulation';

// Resend client
const resend = emailProvider === 'resend' ? new Resend(RESEND_API_KEY) : null;

// Gmail transporter with improved settings
const gmailTransporter = emailProvider === 'gmail'
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      // Improve deliverability
      pool: true,
      maxConnections: 1,
      rateLimit: 5,
    })
  : null;

console.log(`[EMAIL] Provider: ${emailProvider}${emailProvider === 'resend' ? ' (excellent deliverability)' : emailProvider === 'gmail' ? ' (may land in spam - consider adding RESEND_API_KEY)' : ' (OTP will be displayed on screen)'}`);

// ==================== TYPES ====================
interface SendOtpOptions {
  to: string;
  code: string;
  userName: string;
  purpose: 'login' | 'password_reset' | 'email_verification';
  expiresInMinutes?: number;
}

// ==================== TEMPLATES ====================
const PURPOSE_LABELS: Record<string, { title: string; subtitle: string }> = {
  login: { title: 'Connexion', subtitle: 'utilisez ce code pour vous connecter' },
  password_reset: { title: 'Réinitialisation', subtitle: 'utilisez ce code pour réinitialiser votre mot de passe' },
  email_verification: { title: 'Vérification', subtitle: 'utilisez ce code pour vérifier votre adresse email' },
};

function generateOtpHtml(code: string, userName: string, title: string, subtitle: string, expiresInMinutes: number): string {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Code ${title} - Be Rich</title>
    </head>
    <body style="margin:0;padding:0;background:#f4f5f7;font-family:'Inter',Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#22C55E,#16A34A);padding:36px 32px;text-align:center;">
                  <h1 style="color:#ffffff;font-size:26px;font-weight:900;letter-spacing:2px;margin:0;">BE RICH</h1>
                  <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:6px 0 0;text-transform:uppercase;letter-spacing:1px;">Investissement &amp; Finance</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:32px;">
                  <h2 style="color:#1F2937;font-size:18px;font-weight:800;margin:0 0 8px;">Code de ${title}</h2>
                  <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
                    Bonjour <strong style="color:#1F2937;">${userName}</strong>,<br/>
                    Voici votre code de vérification pour ${subtitle}.
                  </p>
                  <!-- OTP Code Box -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border:2px dashed #22C55E;border-radius:12px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:20px;text-align:center;">
                        <div style="font-size:32px;font-weight:900;letter-spacing:6px;color:#16A34A;font-family:'Courier New',monospace;">${code}</div>
                      </td>
                    </tr>
                  </table>
                  <!-- Expiry -->
                  <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0 0 16px;">
                    Ce code expire dans <strong style="color:#F59E0B;">${expiresInMinutes} minutes</strong>.
                  </p>
                  <!-- Security Notice -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FEF3C7;border-radius:10px;border-left:3px solid #F59E0B;">
                    <tr>
                      <td style="padding:14px;">
                        <p style="color:#92400E;font-size:12px;margin:0;line-height:1.5;">
                          <strong>Sécurité :</strong> Ne partagez jamais ce code avec qui que ce soit. L'équipe Be Rich ne vous demandera jamais votre code.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:16px 32px;background:#F8F9FA;text-align:center;">
                  <p style="color:#9CA3AF;font-size:11px;margin:0;">
                    © ${new Date().getFullYear()} Be Rich. Tous droits réservés.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function generateOtpText(code: string, userName: string, title: string, subtitle: string, expiresInMinutes: number): string {
  return `
BE RICH - Code de ${title}

Bonjour ${userName},

Voici votre code de vérification pour ${subtitle}.

Code : ${code}

Ce code expire dans ${expiresInMinutes} minutes.

Sécurité : Ne partagez jamais ce code avec qui que ce soit. L'équipe Be Rich ne vous demandera jamais votre code.

© ${new Date().getFullYear()} Be Rich. Tous droits réservés.
  `.trim();
}

// ==================== SEND VIA RESEND ====================
async function sendViaResend(to: string, subject: string, html: string, text: string): Promise<{ sent: boolean; error?: string }> {
  try {
    const { error } = await resend!.emails.send({
      from: 'Be Rich <onboarding@resend.dev>',
      to,
      subject,
      html,
      text,
      // Improve deliverability headers
      headers: {
        'X-Entity-Ref-ID': `br-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
    });

    if (error) {
      console.error('[RESEND] Error:', error);
      return { sent: false, error: error.message || 'Erreur Resend' };
    }

    console.log(`[RESEND] Email sent to ${to}`);
    return { sent: true };
  } catch (error: any) {
    console.error('[RESEND] Exception:', error);
    return { sent: false, error: error.message || 'Erreur Resend' };
  }
}

// ==================== SEND VIA GMAIL SMTP ====================
async function sendViaGmail(to: string, subject: string, html: string, text: string): Promise<{ sent: boolean; error?: string }> {
  try {
    await gmailTransporter!.sendMail({
      from: `"Be Rich" <${GMAIL_USER}>`,
      to,
      subject,
      html,
      text, // Add text/plain part to reduce spam score
      // Anti-spam headers
      headers: {
        'X-Mailer': 'Be Rich App',
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
        'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN',
        'List-Unsubscribe': '<mailto:silomano228@gmail.com?subject=unsubscribe>',
        'Precedence': 'bulk',
      },
    });

    console.log(`[GMAIL] Email sent to ${to}`);
    return { sent: true };
  } catch (error: any) {
    console.error('[GMAIL] Error:', error);
    return { sent: false, error: error.message || 'Erreur envoi email' };
  }
}

// ==================== MAIN EXPORT ====================
export async function sendOtpEmail({ to, code, userName, purpose, expiresInMinutes = 5 }: SendOtpOptions): Promise<{ sent: boolean; error?: string }> {
  if (isSimulation) {
    console.log(`[OTP SIMULATION] Code: ${code} | To: ${to} | Purpose: ${purpose}`);
    return { sent: true };
  }

  const { title, subtitle } = PURPOSE_LABELS[purpose] || PURPOSE_LABELS.login;
  const subject = `Code ${title} - Be Rich`;
  const html = generateOtpHtml(code, userName, title, subtitle, expiresInMinutes);
  const text = generateOtpText(code, userName, title, subtitle, expiresInMinutes);

  if (emailProvider === 'resend') {
    const result = await sendViaResend(to, subject, html, text);
    // If Resend fails, try Gmail as fallback
    if (!result.sent && gmailTransporter) {
      console.log('[EMAIL] Resend failed, falling back to Gmail SMTP...');
      return sendViaGmail(to, subject, html, text);
    }
    return result;
  }

  if (emailProvider === 'gmail') {
    return sendViaGmail(to, subject, html, text);
  }

  return { sent: false, error: 'Aucun fournisseur email configuré' };
}

export { isSimulation, emailProvider };
