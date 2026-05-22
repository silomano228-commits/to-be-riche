import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

const isSimulation = !GMAIL_USER || !GMAIL_APP_PASSWORD;

const transporter = isSimulation
  ? null
  : nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });

interface SendOtpOptions {
  to: string;
  code: string;
  userName: string;
  purpose: 'login' | 'password_reset' | 'email_verification';
  expiresInMinutes?: number;
}

const PURPOSE_LABELS: Record<string, { title: string; subtitle: string }> = {
  login: { title: 'Connexion', subtitle: 'utilisez ce code pour vous connecter' },
  password_reset: { title: 'Réinitialisation', subtitle: 'utilisez ce code pour réinitialiser votre mot de passe' },
  email_verification: { title: 'Vérification', subtitle: 'utilisez ce code pour vérifier votre adresse email' },
};

export async function sendOtpEmail({ to, code, userName, purpose, expiresInMinutes = 5 }: SendOtpOptions): Promise<{ sent: boolean; error?: string }> {
  if (isSimulation) {
    console.log(`[OTP SIMULATION] Code: ${code} | To: ${to} | Purpose: ${purpose}`);
    return { sent: true };
  }

  const { title, subtitle } = PURPOSE_LABELS[purpose] || PURPOSE_LABELS.login;

  try {
    await transporter!.sendMail({
      from: `"Be Rich" <${GMAIL_USER}>`,
      to,
      subject: `Code ${title} - Be Rich`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06);">
          <div style="background: linear-gradient(135deg, #22C55E, #16A34A); padding: 36px 32px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: 2px; margin: 0;">BE RICH</h1>
            <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px;">Investissement & Finance</p>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #1F2937; font-size: 18px; font-weight: 800; margin: 0 0 8px;">Code de ${title}</h2>
            <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              Bonjour <strong style="color: #1F2937;">${userName}</strong>,<br/>
              Voici votre code de vérification pour ${subtitle}.
            </p>
            <div style="background: #F0FDF4; border: 2px dashed #22C55E; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #16A34A; font-family: 'Courier New', monospace;">${code}</div>
            </div>
            <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin: 0 0 16px;">
              Ce code expire dans <strong style="color: #F59E0B;">${expiresInMinutes} minutes</strong>.
            </p>
            <div style="padding: 14px; background: #FEF3C7; border-radius: 10px; border-left: 3px solid #F59E0B;">
              <p style="color: #92400E; font-size: 12px; margin: 0; line-height: 1.5;">
                <strong>Sécurité :</strong> Ne partagez jamais ce code avec qui que ce soit. L'équipe Be Rich ne vous demandera jamais votre code.
              </p>
            </div>
          </div>
          <div style="padding: 16px 32px; background: #F8F9FA; text-align: center;">
            <p style="color: #9CA3AF; font-size: 11px; margin: 0;">
              © ${new Date().getFullYear()} Be Rich. Tous droits réservés.
            </p>
          </div>
        </div>
      `,
    });
    return { sent: true };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { sent: false, error: error.message || 'Erreur envoi email' };
  }
}

export { isSimulation };
