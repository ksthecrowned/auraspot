// The one list of social networks and platforms AuraSpot knows. Every screen
// (signup, link blocks, official socials, admin fiches) reads it, so a
// network added here shows up everywhere. Icons live in
// src/components/icons/social-icons.tsx (client side).

export const SOCIAL_PLATFORMS = [
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'whatsapp',
  'snapchat',
  'threads',
  'telegram',
  'linkedin',
  'spotify',
  'applemusic',
  'boomplay',
  'audiomack',
  'deezer',
  'soundcloud',
  'twitch',
  'discord',
  'github',
  'website',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type SocialGroup = 'social' | 'music' | 'community' | 'other';

type PlatformSpec = {
  label: string;
  group: SocialGroup;
  // Brand colour; null means "use the text colour" (black-and-white logos).
  color: string | null;
  // Label of the call-to-action on link blocks.
  action: string;
  // Profile URL for a handle; null when only full links make sense.
  handlePrefix: string | null;
  // What the handle looks like, for placeholders.
  handleHint: string;
  // Hostnames (without www. or m.) that belong to the platform.
  hosts: string[];
};

export const PLATFORMS: Record<SocialPlatform, PlatformSpec> = {
  facebook: {
    label: 'Facebook',
    group: 'social',
    color: '#1877F2',
    action: 'Suivre',
    handlePrefix: 'https://facebook.com/',
    handleHint: 'nom.de.page',
    hosts: ['facebook.com', 'fb.com', 'fb.me'],
  },
  instagram: {
    label: 'Instagram',
    group: 'social',
    color: '#E4405F',
    action: 'Suivre',
    handlePrefix: 'https://instagram.com/',
    handleHint: '@identifiant',
    hosts: ['instagram.com', 'instagr.am'],
  },
  tiktok: {
    label: 'TikTok',
    group: 'social',
    color: null,
    action: 'Suivre',
    handlePrefix: 'https://www.tiktok.com/@',
    handleHint: '@identifiant',
    hosts: ['tiktok.com', 'vm.tiktok.com'],
  },
  youtube: {
    label: 'YouTube',
    group: 'social',
    color: '#FF0000',
    action: 'S’abonner',
    handlePrefix: 'https://youtube.com/@',
    handleHint: '@chaine',
    hosts: ['youtube.com', 'youtu.be', 'music.youtube.com'],
  },
  twitter: {
    label: 'X',
    group: 'social',
    color: null,
    action: 'Suivre',
    handlePrefix: 'https://x.com/',
    handleHint: '@identifiant',
    hosts: ['x.com', 'twitter.com'],
  },
  whatsapp: {
    label: 'WhatsApp',
    group: 'social',
    color: '#25D366',
    action: 'Écrire',
    handlePrefix: 'https://wa.me/',
    handleHint: '242061234567',
    hosts: ['wa.me', 'whatsapp.com', 'chat.whatsapp.com'],
  },
  snapchat: {
    label: 'Snapchat',
    group: 'social',
    color: '#FFFC00',
    action: 'Ajouter',
    handlePrefix: 'https://www.snapchat.com/add/',
    handleHint: 'identifiant',
    hosts: ['snapchat.com'],
  },
  threads: {
    label: 'Threads',
    group: 'social',
    color: null,
    action: 'Suivre',
    handlePrefix: 'https://www.threads.net/@',
    handleHint: '@identifiant',
    hosts: ['threads.net', 'threads.com'],
  },
  telegram: {
    label: 'Telegram',
    group: 'social',
    color: '#26A5E4',
    action: 'Écrire',
    handlePrefix: 'https://t.me/',
    handleHint: 'identifiant',
    hosts: ['t.me', 'telegram.me'],
  },
  linkedin: {
    label: 'LinkedIn',
    group: 'social',
    color: '#0A66C2',
    action: 'Se connecter',
    handlePrefix: 'https://www.linkedin.com/in/',
    handleHint: 'identifiant',
    hosts: ['linkedin.com'],
  },
  spotify: {
    label: 'Spotify',
    group: 'music',
    color: '#1DB954',
    action: 'Écouter',
    handlePrefix: null,
    handleHint: 'https://open.spotify.com/artist/…',
    hosts: ['open.spotify.com', 'spotify.com', 'spotify.link'],
  },
  applemusic: {
    label: 'Apple Music',
    group: 'music',
    color: '#FA243C',
    action: 'Écouter',
    handlePrefix: null,
    handleHint: 'https://music.apple.com/…',
    hosts: ['music.apple.com'],
  },
  boomplay: {
    label: 'Boomplay',
    group: 'music',
    color: '#0A0A0A',
    action: 'Écouter',
    handlePrefix: null,
    handleHint: 'https://www.boomplay.com/artists/…',
    hosts: ['boomplay.com', 'boomplaymusic.com'],
  },
  audiomack: {
    label: 'Audiomack',
    group: 'music',
    color: '#FFA200',
    action: 'Écouter',
    handlePrefix: 'https://audiomack.com/',
    handleHint: 'identifiant',
    hosts: ['audiomack.com'],
  },
  deezer: {
    label: 'Deezer',
    group: 'music',
    color: '#A238FF',
    action: 'Écouter',
    handlePrefix: null,
    handleHint: 'https://www.deezer.com/artist/…',
    hosts: ['deezer.com', 'deezer.page.link', 'link.deezer.com'],
  },
  soundcloud: {
    label: 'SoundCloud',
    group: 'music',
    color: '#FF5500',
    action: 'Écouter',
    handlePrefix: 'https://soundcloud.com/',
    handleHint: 'identifiant',
    hosts: ['soundcloud.com', 'on.soundcloud.com'],
  },
  twitch: {
    label: 'Twitch',
    group: 'community',
    color: '#9146FF',
    action: 'Suivre',
    handlePrefix: 'https://www.twitch.tv/',
    handleHint: 'identifiant',
    hosts: ['twitch.tv'],
  },
  discord: {
    label: 'Discord',
    group: 'community',
    color: '#5865F2',
    action: 'Rejoindre',
    handlePrefix: null,
    handleHint: 'https://discord.gg/…',
    hosts: ['discord.com', 'discord.gg'],
  },
  github: {
    label: 'GitHub',
    group: 'other',
    color: null,
    action: 'Suivre',
    handlePrefix: 'https://github.com/',
    handleHint: 'identifiant',
    hosts: ['github.com'],
  },
  website: {
    label: 'Site web',
    group: 'other',
    color: null,
    action: 'Visiter',
    handlePrefix: null,
    handleHint: 'https://…',
    hosts: [],
  },
};

export function isSocialPlatform(value: string): value is SocialPlatform {
  return (SOCIAL_PLATFORMS as readonly string[]).includes(value);
}

export function platformsByGroup(group: SocialGroup) {
  return SOCIAL_PLATFORMS.filter(
    (platform) => PLATFORMS[platform].group === group
  );
}

export type PlatformSyncAction =
  | { kind: 'create'; href: string }
  | { kind: 'update'; id: string; href: string }
  | { kind: 'delete'; id: string };

function indexExistingLinks(
  platforms: readonly SocialPlatform[],
  existing: { id: string; href: string }[]
) {
  const allowed = new Set<SocialPlatform>(platforms);
  const byPlatform = new Map<SocialPlatform, { id: string; href: string }>();
  for (const card of existing) {
    const platform = socialPlatformOf(card.href);
    if (platform && allowed.has(platform) && !byPlatform.has(platform)) {
      byPlatform.set(platform, card);
    }
  }
  return byPlatform;
}

function actionForPlatform(
  platform: SocialPlatform,
  raw: string,
  current: { id: string; href: string } | undefined
): PlatformSyncAction | 'invalid' | null {
  if (!raw) {
    return current ? { kind: 'delete', id: current.id } : null;
  }
  const href = toSocialUrl(platform, raw);
  if (!href) {
    return 'invalid';
  }
  if (!current) {
    return { kind: 'create', href };
  }
  return current.href === href
    ? null
    : { kind: 'update', id: current.id, href };
}

// What to create, update, or remove so the page's link blocks match the
// form. Empty fields drop that platform's block. The first invalid value
// stops the plan.
export function planPlatformLinkSync(
  platforms: readonly SocialPlatform[],
  values: Partial<Record<SocialPlatform, string>>,
  existing: { id: string; href: string }[]
):
  | { ok: true; actions: PlatformSyncAction[] }
  | { ok: false; platform: SocialPlatform } {
  const byPlatform = indexExistingLinks(platforms, existing);
  const actions: PlatformSyncAction[] = [];
  for (const platform of platforms) {
    const action = actionForPlatform(
      platform,
      values[platform]?.trim() ?? '',
      byPlatform.get(platform)
    );
    if (action === 'invalid') {
      return { ok: false, platform };
    }
    if (action) {
      actions.push(action);
    }
  }
  return { ok: true, actions };
}

export function platformLabel(platform: string) {
  return isSocialPlatform(platform) ? PLATFORMS[platform].label : platform;
}

const HTTP_URL_RE = /^https?:\/\//i;
const LEADING_AT_RE = /^@/;
const HANDLE_RE = /^[\w.-]{1,100}$/;
const PHONE_CHARS_RE = /[\s+().-]/g;
const PHONE_RE = /^\d{6,15}$/;
const LEADING_HOST_RE = /^(www\.|m\.|mobile\.)/;

const HOST_TO_PLATFORM = new Map<string, SocialPlatform>(
  SOCIAL_PLATFORMS.flatMap((platform) =>
    PLATFORMS[platform].hosts.map((host) => [host, platform] as const)
  )
);

function hostOf(url: string) {
  return new URL(url).hostname.toLowerCase().replace(LEADING_HOST_RE, '');
}

// Social network behind a URL, or null for any other website.
export function socialPlatformOf(url: string): SocialPlatform | null {
  try {
    const host = hostOf(url);
    const exact = HOST_TO_PLATFORM.get(host);
    if (exact) {
      return exact;
    }
    // Country or regional subdomains (fr-fr.facebook.com, web.facebook.com).
    for (const [known, platform] of HOST_TO_PLATFORM) {
      if (host.endsWith(`.${known}`)) {
        return platform;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// A full link, or a handle turned into the platform's profile URL.
// Returns null when the value cannot be a link for that platform.
export function toSocialUrl(
  platform: SocialPlatform,
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
  const prefix = PLATFORMS[platform].handlePrefix;
  if (!prefix) {
    return null;
  }
  if (platform === 'whatsapp') {
    const digits = value.replace(PHONE_CHARS_RE, '');
    return PHONE_RE.test(digits) ? `${prefix}${digits}` : null;
  }
  const handle = value.replace(LEADING_AT_RE, '');
  return HANDLE_RE.test(handle) ? `${prefix}${handle}` : null;
}

// Handles or links typed in a form, as profile URLs, in order. Empty rows
// are skipped; the first invalid or repeated platform is reported.
export type SocialLinkInput = { platform: SocialPlatform; value: string };

export function normalizeSocialLinks(
  inputs: SocialLinkInput[]
):
  | { ok: true; links: { platform: SocialPlatform; url: string }[] }
  | { ok: false; index: number; reason: 'invalid' | 'duplicate' } {
  const links: { platform: SocialPlatform; url: string }[] = [];
  const seen = new Set<SocialPlatform>();
  for (const [index, input] of inputs.entries()) {
    if (!input.value.trim()) {
      continue;
    }
    if (seen.has(input.platform)) {
      return { ok: false, index, reason: 'duplicate' };
    }
    const url = toSocialUrl(input.platform, input.value);
    if (!url) {
      return { ok: false, index, reason: 'invalid' };
    }
    seen.add(input.platform);
    links.push({ platform: input.platform, url });
  }
  return { ok: true, links };
}
