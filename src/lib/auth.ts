import crypto from 'crypto';
import { db } from '@/lib/db';

/**
 * Get auth token from request - checks X-Auth-Token header first, then cookie.
 * This ensures auth works even when cookies are not reliably sent (e.g. proxy environments).
 */
export function getAuthToken(request: Request): string | null {
  // Try custom header first (most reliable)
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) return authHeader;
  // Then try cookie
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/br_token=([^;]+)/);
  if (match) return match[1];
  return null;
}
