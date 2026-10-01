// Video links a profile can play in place: YouTube (videos, Shorts, lives)
// and TikTok. Only the URL is stored; it is parsed when the block renders.

export type VideoRef =
  | { provider: 'youtube'; id: string }
  | { provider: 'tiktok'; id: string };

const YOUTUBE_ID_RE = /^[\w-]{11}$/;
const TIKTOK_ID_RE = /^\d{15,20}$/;
const LEADING_HOST_RE = /^(www\.|m\.|music\.)/;
const YOUTUBE_PATH_RE = /^\/(?:shorts|live|embed)\/([\w-]{11})/;
const TIKTOK_PATH_RE = /^\/@[\w.-]+\/video\/(\d{15,20})/;

function parseUrl(raw: string) {
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

export function parseVideoUrl(raw: string): VideoRef | null {
  const url = parseUrl(raw);
  if (!url) {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(LEADING_HOST_RE, '');

  if (host === 'youtube.com') {
    const fromQuery = url.searchParams.get('v');
    if (
      url.pathname === '/watch' &&
      fromQuery &&
      YOUTUBE_ID_RE.test(fromQuery)
    ) {
      return { provider: 'youtube', id: fromQuery };
    }
    const fromPath = YOUTUBE_PATH_RE.exec(url.pathname)?.[1];
    return fromPath ? { provider: 'youtube', id: fromPath } : null;
  }
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0] ?? '';
    return YOUTUBE_ID_RE.test(id) ? { provider: 'youtube', id } : null;
  }
  if (host === 'tiktok.com') {
    const id = TIKTOK_PATH_RE.exec(url.pathname)?.[1];
    return id && TIKTOK_ID_RE.test(id) ? { provider: 'tiktok', id } : null;
  }
  return null;
}

// Loaded on click only, so the profile page stays light.
export function videoEmbedUrl(video: VideoRef) {
  if (video.provider === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1`;
  }
  return `https://www.tiktok.com/player/v1/${video.id}?autoplay=1`;
}

// TikTok exposes no stable thumbnail URL without an API call.
export function videoThumbnail(video: VideoRef) {
  return video.provider === 'youtube'
    ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
    : null;
}
