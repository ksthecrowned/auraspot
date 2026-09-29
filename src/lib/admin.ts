import { env } from '@/env.mjs';

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }
  const allowed = (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
