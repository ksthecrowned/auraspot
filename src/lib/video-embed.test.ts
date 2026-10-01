import { describe, expect, test } from 'bun:test';
import { parseVideoUrl, videoEmbedUrl, videoThumbnail } from './video-embed';

describe('parseVideoUrl', () => {
  test.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
  ])('YouTube: %s', (url) => {
    expect(parseVideoUrl(url)).toEqual({
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
    });
  });

  test('TikTok video links', () => {
    expect(
      parseVideoUrl(
        'https://www.tiktok.com/@rogaroga/video/7301234567890123456?lang=fr'
      )
    ).toEqual({ provider: 'tiktok', id: '7301234567890123456' });
  });

  test.each([
    'https://www.youtube.com/@ExtraMusica',
    'https://www.youtube.com/watch?v=short',
    'https://www.tiktok.com/@rogaroga',
    'https://vm.tiktok.com/ZMabc123/',
    'https://vimeo.com/123456',
    'javascript:alert(1)',
    'pas un lien',
    '',
  ])('not a playable video: %s', (url) => {
    expect(parseVideoUrl(url)).toBeNull();
  });
});

describe('embed and thumbnail urls', () => {
  test('YouTube plays from the no-cookie domain', () => {
    expect(videoEmbedUrl({ provider: 'youtube', id: 'dQw4w9WgXcQ' })).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1'
    );
    expect(videoThumbnail({ provider: 'youtube', id: 'dQw4w9WgXcQ' })).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  test('TikTok uses its official player, without a thumbnail', () => {
    expect(
      videoEmbedUrl({ provider: 'tiktok', id: '7301234567890123456' })
    ).toBe('https://www.tiktok.com/player/v1/7301234567890123456?autoplay=1');
    expect(
      videoThumbnail({ provider: 'tiktok', id: '7301234567890123456' })
    ).toBeNull();
  });
});
