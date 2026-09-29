export const PERSONALITY_PLATFORMS = [
  'instagram',
  'twitter',
  'youtube',
  'tiktok',
  'facebook',
  'website',
  'github',
  'linkedin',
  'telegram',
] as const;

export type PersonalityPlatform = (typeof PERSONALITY_PLATFORMS)[number];

export const PLATFORM_LABELS: Record<PersonalityPlatform, string> = {
  instagram: 'Instagram',
  twitter: 'X',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  website: 'Site web',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  telegram: 'Telegram',
};

export function platformLabel(platform: string) {
  if (platform in PLATFORM_LABELS) {
    return PLATFORM_LABELS[platform as PersonalityPlatform];
  }
  return platform;
}

const DIACRITICS_RE = /\p{M}/gu;
const NON_SLUG_RE = /[^a-z0-9]+/g;
const EDGE_DASH_RE = /^-+|-+$/g;
const TRAILING_DASH_RE = /-+$/g;
const HTTP_URL_RE = /^https?:\/\//i;
const LEADING_AT_RE = /^@/;
const SOCIAL_HANDLE_RE = /^[\w.-]{1,100}$/;

const PLATFORM_PREFIX: Record<
  Exclude<PersonalityPlatform, 'website'>,
  string
> = {
  instagram: 'https://instagram.com/',
  twitter: 'https://x.com/',
  youtube: 'https://youtube.com/@',
  tiktok: 'https://www.tiktok.com/@',
  facebook: 'https://facebook.com/',
  github: 'https://github.com/',
  linkedin: 'https://www.linkedin.com/in/',
  telegram: 'https://t.me/',
};

export function slugifyPersonalityName(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .toLowerCase()
    .replace(NON_SLUG_RE, '-')
    .replace(EDGE_DASH_RE, '')
    .slice(0, 50)
    .replace(TRAILING_DASH_RE, '');
}

export function toSocialUrl(
  platform: PersonalityPlatform,
  raw: string
): string | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  if (HTTP_URL_RE.test(value)) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  }

  if (platform === 'website') {
    return null;
  }

  const handle = value.replace(LEADING_AT_RE, '');
  if (!SOCIAL_HANDLE_RE.test(handle)) {
    return null;
  }

  return `${PLATFORM_PREFIX[platform]}${handle}`;
}
