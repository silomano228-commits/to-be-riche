import crypto from 'crypto';
import { db } from '@/lib/db';
import { sendOtpEmail, isSimulation } from '@/lib/email';

/**
 * Get auth token from request - checks X-Auth-Token header first, then cookie.
 */
export function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}

/**
 * Generate a secure 6-digit OTP code
 */
export function createOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash an OTP code with SHA-256 for storage
 */
export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Initiate OTP: generate code, store hash, send email
 * Returns plain_code only in simulation mode
 */
export async function initiateOtp(email: string, userName: string, purpose: 'password_reset' | 'email_verification', expiresInMinutes = 10) {
  const code = createOtp();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // Invalidate any existing unused OTPs for this email/purpose
  await db.otpCode.updateMany({
    where: { email, purpose, used: false },
    data: { used: true },
  });

  // Store the new OTP hash
  await db.otpCode.create({
    data: { email, codeHash, purpose, expiresAt },
  });

  // Send email
  const result = await sendOtpEmail({
    to: email,
    code,
    userName,
    purpose,
    expiresInMinutes,
  });

  return {
    sent: result.sent,
    error: result.error,
    plain_code: isSimulation ? code : undefined,
  };
}

/**
 * Verify an OTP code
 */
export async function verifyOtp(email: string, code: string, purpose: string): Promise<{ valid: boolean; error?: string }> {
  const codeHash = hashOtp(code);

  const otpRecord = await db.otpCode.findFirst({
    where: {
      email,
      codeHash,
      purpose,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) {
    return { valid: false, error: 'Code invalide ou expiré' };
  }

  // Mark as used
  await db.otpCode.update({
    where: { id: otpRecord.id },
    data: { used: true },
  });

  return { valid: true };
}
