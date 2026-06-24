import crypto from 'crypto';
import { db } from '@/lib/db';
import { sendOtpEmail, isSimulation } from '@/lib/email';

/**
 * Generate a random 32-char hex session token.
 *
 * Each successful login (or registration / OTP verification) rotates this
 * token on the user record and sets it as the `br_token` cookie. Because the
 * token is single-use per session, a new login on another device invalidates
 * the previous session — this is the mechanism that prevents concurrent
 * logins of the same account (anti-fraud, hidden from the UI).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Extract the raw auth token from a request — checks the X-Auth-Token header
 * first, then the `br_token` cookie. Returns the raw token string (which may
 * be either a sessionToken for new sessions or a user.id for legacy sessions
 * created before the sessionToken migration).
 */
function extractRawToken(request: Request): string | null {
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}

/**
 * Resolve the authenticated user from the request.
 *
 * The `br_token` cookie now contains a `sessionToken` (not the user id).
 * We look up the user by sessionToken first. If not found, we fall back to
 * looking up by id (backward compat for sessions created before the
 * sessionToken migration).
 *
 * Backward-compat rules:
 * - Found by sessionToken → return the user (normal new-session flow).
 * - Not found by sessionToken, found by id AND sessionToken is null → return
 *   the user (legacy session: cookie still holds user.id; the sessionToken
 *   will be set on the next login). We do NOT persist a sessionToken here,
 *   because that would invalidate the legacy cookie on the next request.
 * - Not found by sessionToken, found by id AND sessionToken is set → return
 *   null (the session was invalidated by a newer login on another device).
 * - Not found at all → return null.
 *
 * Returns the user, or null if no valid session is found.
 */
export async function getAuthToken(request: Request) {
  const rawToken = extractRawToken(request);
  if (!rawToken) return null;

  // 1) New auth model: look up by sessionToken.
  //    (sessionToken is not @unique in the schema, so use findFirst.)
  const bySession = await db.user.findFirst({ where: { sessionToken: rawToken } });
  if (bySession) return bySession;

  // 2) Backward compat: legacy cookie holds user.id.
  const byId = await db.user.findUnique({ where: { id: rawToken } });
  if (byId) {
    if (!byId.sessionToken) {
      // Legacy session with no sessionToken yet — accept it. The sessionToken
      // will be generated and persisted on the next login.
      return byId;
    }
    // sessionToken is set but the cookie holds user.id (not the sessionToken)
    // → this session was superseded by a newer login elsewhere. Invalidate.
    return null;
  }

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
