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
const WHITESPACE_RE = /\s+/;
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

const SOCIAL_HOSTS: Record<string, string> = {
  'instagram.com': 'instagram',
  'x.com': 'twitter',
  'twitter.com': 'twitter',
  'youtube.com': 'youtube',
  'youtu.be': 'youtube',
  'tiktok.com': 'tiktok',
  'facebook.com': 'facebook',
  'fb.com': 'facebook',
  'github.com': 'github',
  'linkedin.com': 'linkedin',
  't.me': 'telegram',
  'telegram.me': 'telegram',
  'discord.com': 'discord',
  'discord.gg': 'discord',
  'twitch.tv': 'twitch',
};

const LEADING_WWW_RE = /^(www\.|m\.)/;

// Social network behind a URL, or null for any other website.
export function socialPlatformOf(url: string): string | null {
  try {
    const host = new URL(url).hostname
      .toLowerCase()
      .replace(LEADING_WWW_RE, '');
    return SOCIAL_HOSTS[host] ?? null;
  } catch {
    return null;
  }
}

export function firstNameOf(name: string): string {
  const trimmed = name.trim();
  const [first] = trimmed.split(WHITESPACE_RE);
  if (!first || first === trimmed || first.length < 3) {
    return trimmed;
  }
  return first;
}

export function initialsOf(name: string): string {
  const words = name.trim().split(WHITESPACE_RE).filter(Boolean);
  const first = words[0] ?? '';
  const last = words.length > 1 ? (words.at(-1) ?? '') : '';
  const letters = last
    ? `${first[0] ?? ''}${last[0] ?? ''}`
    : first.slice(0, 2);
  return letters.toUpperCase() || '?';
}

function others(n: number) {
  return n === 1 ? '1 autre' : `${n} autres`;
}

export function supportersSummary({
  names,
  count,
  firstName,
}: {
  names: string[];
  count: number;
  firstName: string;
}): string {
  if (count === 0) {
    return `Soyez le premier à soutenir ${firstName}`;
  }
  const [a, b] = names;
  if (!a) {
    return count === 1 ? '1 soutien' : `${count} soutiens`;
  }
  if (!b) {
    return count === 1
      ? `${a} soutient ${firstName}`
      : `${a} et ${others(count - 1)}`;
  }
  const rest = count - 2;
  return rest <= 0 ? `${a} et ${b}` : `${a}, ${b} et ${others(rest)}`;
}
