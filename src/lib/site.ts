// Single source of truth for the brand and its domain.
// NEXT_PUBLIC_* values are inlined at build time, so this works in
// server, client and edge code alike.

export const SITE_NAME = 'AuraSpot';

export const TAGLINE = 'Discover. Connect. Support.';

export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'auraspot.me';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_URL ?? `https://${ROOT_DOMAIN}`
).replace(/\/$/, '');

export const CONTACT_EMAIL = `contact@${ROOT_DOMAIN}`;

export const LOGO_URL = `${SITE_URL}/logo.png`;

export function profileUrl(slug: string) {
  return `${SITE_URL}/${slug}`;
}
