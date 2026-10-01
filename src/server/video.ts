import { parseVideoUrl } from '@/lib/video-embed';

// TikTok's share button gives short links (vm.tiktok.com/…, vt.tiktok.com/…,
// tiktok.com/t/…) that only redirect to the video. They are resolved once,
// when the block is saved, and the full link is stored.

const SHORT_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com']);
const TIKTOK_HOSTS = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'vm.tiktok.com',
  'vt.tiktok.com',
]);
const SHORT_PATH_RE = /^\/t\/[\w-]+\/?$/;
const TRAILING_SLASH_RE = /\/$/;
const MAX_HOPS = 4;
const HOP_TIMEOUT_MS = 5000;

function parseHttps(raw: string, base?: URL) {
  try {
    const url = new URL(raw.trim(), base);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function isTikTokShortLink(url: URL) {
  const host = url.hostname.toLowerCase();
  return (
    SHORT_HOSTS.has(host) ||
    (TIKTOK_HOSTS.has(host) && SHORT_PATH_RE.test(url.pathname))
  );
}

// The stored form: TikTok links without tracking parameters.
function canonical(url: URL) {
  const ref = parseVideoUrl(url.toString());
  if (!ref) {
    return null;
  }
  if (ref.provider === 'tiktok') {
    return `https://www.tiktok.com${url.pathname.replace(TRAILING_SLASH_RE, '')}`;
  }
  return url.toString();
}

// A playable video link, or null. Only TikTok short links cause requests,
// and only redirects that stay on TikTok are followed.
export async function resolveVideoUrl(
  raw: string,
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  const start = parseHttps(raw);
  if (!start) {
    return null;
  }
  const direct = canonical(start);
  if (direct) {
    return direct;
  }
  if (!isTikTokShortLink(start)) {
    return null;
  }

  let current = start;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    let location: string | null;
    try {
      const res = await fetchImpl(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(HOP_TIMEOUT_MS),
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; AuraSpot/1.0)' },
      });
      location = res.headers.get('location');
    } catch {
      return null;
    }
    const next = location ? parseHttps(location, current) : null;
    if (!(next && TIKTOK_HOSTS.has(next.hostname.toLowerCase()))) {
      return null;
    }
    const resolved = canonical(next);
    if (resolved) {
      return resolved;
    }
    current = next;
  }
  return null;
}
