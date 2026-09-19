// ==================== CONFIG ====================
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD || '';

// Priority: Resend (best deliverability) > Gmail SMTP (fallback) > Simulation
const emailProvider: 'resend' | 'gmail' | 'simulation' = RESEND_API_KEY
  ? 'resend'
  : (GMAIL_USER && GMAIL_APP_PASSWORD)
    ? 'gmail'
    : 'simulation';

const isSimulation = emailProvider === 'simulation';

console.log(`[EMAIL] Provider: ${emailProvider}${emailProvider === 'resend' ? '' : emailProvider === 'gmail' ? ' (may land in spam)' : ' (code affiché à l\'écran)'}`);

// ==================== TYPES ====================
interface SendOtpOptions {
  to: string;
  code: string;
  userName: string;
  purpose: 'password_reset' | 'email_verification';
  expiresInMinutes?: number;
}

// ==================== TEMPLATES ====================
const PURPOSE_LABELS: Record<string, { title: string; subtitle: string }> = {
  password_reset: { title: 'Réinitialisation', subtitle: 'réinitialiser votre mot de passe' },
  email_verification: { title: 'Vérification', subtitle: 'vérifier votre adresse email' },
};

function generateOtpHtml(code: string, userName: string, title: string, subtitle: string, expiresInMinutes: number): string {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Code ${title} - Espace Jeunes</title>
    </head>
    <body style="margin:0;padding:0;background:#f4f5f7;font-family:'Inter',Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
              <tr>
                <td style="background:linear-gradient(135deg,#22C55E,#16A34A);padding:36px 32px;text-align:center;">
                  <h1 style="color:#ffffff;font-size:26px;font-weight:900;letter-spacing:2px;margin:0;">ESPACE JEUNES</h1>
                  <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:6px 0 0;text-transform:uppercase;letter-spacing:1px;">Mission &amp; Prospérité</p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <h2 style="color:#1F2937;font-size:18px;font-weight:800;margin:0 0 8px;">Code de ${title}</h2>
                  <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
                    Bonjour <strong style="color:#1F2937;">${userName}</strong>,<br/>
                    Voici votre code de vérification pour ${subtitle}.
                  </p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0FDF4;border:2px dashed #22C55E;border-radius:12px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:20px;text-align:center;">
                        <div style="font-size:32px;font-weight:900;letter-spacing:6px;color:#16A34A;font-family:'Courier New',monospace;">${code}</div>
                      </td>
                    </tr>
                  </table>
                  <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0 0 16px;">
                    Ce code expire dans <strong style="color:#F59E0B;">${expiresInMinutes} minutes</strong>.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 32px;background:#F8F9FA;text-align:center;">
                  <p style="color:#9CA3AF;font-size:11px;margin:0;">
                    © ${new Date().getFullYear()} Espace Jeunes. Tous droits réservés.
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
ESPACE JEUNES - Code de ${title}

Bonjour ${userName},

Voici votre code de vérification pour ${subtitle}.

Code : ${code}

Ce code expire dans ${expiresInMinutes} minutes.

© ${new Date().getFullYear()} Espace Jeunes. Tous droits réservés.
  `.trim();
}

// ==================== MAIN EXPORT ====================
// NOTE: Resend and nodemailer are NOT imported at the top level.
// They are loaded lazily only when actually configured, using a pattern
// that avoids static analysis by Turbopack's bundler.
// When in simulation mode (no API keys), no heavy packages are loaded.

export async function sendOtpEmail({ to, code, userName, purpose, expiresInMinutes = 10 }: SendOtpOptions): Promise<{ sent: boolean; error?: string }> {
  // In simulation mode, just log the code and return success
  if (isSimulation) {
    console.log(`[OTP SIMULATION] Code: ${code} | To: ${to} | Purpose: ${purpose}`);
    return { sent: true };
  }

  const { title, subtitle } = PURPOSE_LABELS[purpose] || PURPOSE_LABELS.email_verification;
  const subject = `Code ${title} - Espace Jeunes`;
  const html = generateOtpHtml(code, userName, title, subtitle, expiresInMinutes);
  const text = generateOtpText(code, userName, title, subtitle, expiresInMinutes);

  // Lazy-load email providers using eval-based require to avoid Turbopack static analysis
  // These code paths are only reached when actually configured (not in simulation mode)
  if (emailProvider === 'resend') {
    try {
      const { Resend } = (0, eval)('require')('resend');
      const resend = new Resend(RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: 'Espace Jeunes <onboarding@resend.dev>',
        to, subject, html, text,
      });
      if (error) return { sent: false, error: error.message || 'Erreur Resend' };
      console.log(`[RESEND] Email sent to ${to}`);
      return { sent: true };
    } catch (error: any) {
      console.error('[RESEND] Exception:', error);
      return { sent: false, error: error.message || 'Erreur Resend' };
    }
  }

  if (emailProvider === 'gmail') {
    try {
      const nodemailer = (0, eval)('require')('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
        pool: true, maxConnections: 1, rateLimit: 5,
      });
      await transporter.sendMail({
        from: `"Espace Jeunes" <${GMAIL_USER}>`,
        to, subject, html, text,
      });
      console.log(`[GMAIL] Email sent to ${to}`);
      return { sent: true };
    } catch (error: any) {
      console.error('[GMAIL] Error:', error);
      return { sent: false, error: error.message || 'Erreur envoi email' };
    }
  }

  return { sent: false, error: 'Aucun fournisseur email configuré' };
}

export { isSimulation, emailProvider };
