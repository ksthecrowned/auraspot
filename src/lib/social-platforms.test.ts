import { describe, expect, test } from 'bun:test';
import {
  PLATFORMS,
  SOCIAL_PLATFORMS,
  normalizeSocialLinks,
  planPlatformLinkSync,
  platformsByGroup,
  socialPlatformOf,
  toSocialUrl,
} from './social-platforms';

describe('socialPlatformOf', () => {
  test.each([
    ['https://www.facebook.com/rogaroga', 'facebook'],
    ['https://fr-fr.facebook.com/page', 'facebook'],
    ['https://m.facebook.com/page', 'facebook'],
    ['https://www.tiktok.com/@roga', 'tiktok'],
    ['https://vm.tiktok.com/ZMabc/', 'tiktok'],
    ['https://wa.me/242061234567', 'whatsapp'],
    ['https://chat.whatsapp.com/AbCd', 'whatsapp'],
    ['https://www.snapchat.com/add/roga', 'snapchat'],
    ['https://open.spotify.com/artist/123', 'spotify'],
    ['https://music.apple.com/cg/artist/x/1', 'applemusic'],
    ['https://www.boomplay.com/artists/42', 'boomplay'],
    ['https://audiomack.com/roga', 'audiomack'],
    ['https://www.deezer.com/fr/artist/7', 'deezer'],
    ['https://twitter.com/roga', 'twitter'],
    ['https://x.com/roga', 'twitter'],
    ['https://youtu.be/abc', 'youtube'],
  ])('%s → %s', (url, platform) => {
    expect<string | null>(socialPlatformOf(url)).toBe(platform);
  });

  test('other websites and invalid urls are not socials', () => {
    expect(socialPlatformOf('https://auraspot.me/roga')).toBeNull();
    expect(socialPlatformOf('https://notfacebook.com/x')).toBeNull();
    expect(socialPlatformOf('pas une url')).toBeNull();
  });
});

describe('toSocialUrl', () => {
  test('builds profile urls from handles', () => {
    expect(toSocialUrl('facebook', 'rogaroga.officiel')).toBe(
      'https://facebook.com/rogaroga.officiel'
    );
    expect(toSocialUrl('tiktok', '@roga')).toBe('https://www.tiktok.com/@roga');
    expect(toSocialUrl('snapchat', 'roga')).toBe(
      'https://www.snapchat.com/add/roga'
    );
  });

  test('WhatsApp takes a phone number', () => {
    expect(toSocialUrl('whatsapp', '+242 06 123 45 67')).toBe(
      'https://wa.me/242061234567'
    );
    expect(toSocialUrl('whatsapp', 'roga')).toBeNull();
  });

  test('keeps full links as they are', () => {
    expect(toSocialUrl('spotify', 'https://open.spotify.com/artist/1')).toBe(
      'https://open.spotify.com/artist/1'
    );
  });

  test('link-only platforms refuse a bare handle', () => {
    expect(toSocialUrl('spotify', 'roga')).toBeNull();
    expect(toSocialUrl('website', 'roga')).toBeNull();
  });

  test('refuses other schemes and invalid handles', () => {
    expect(toSocialUrl('website', 'javascript:alert(1)')).toBeNull();
    expect(toSocialUrl('instagram', 'deux mots')).toBeNull();
    expect(toSocialUrl('instagram', '   ')).toBeNull();
  });
});

describe('registry', () => {
  test('every platform has a label and an action', () => {
    for (const platform of SOCIAL_PLATFORMS) {
      expect(PLATFORMS[platform].label.length).toBeGreaterThan(0);
      expect(PLATFORMS[platform].action.length).toBeGreaterThan(0);
    }
  });

  test('a hostname belongs to one platform only', () => {
    const hosts = SOCIAL_PLATFORMS.flatMap((p) => PLATFORMS[p].hosts);
    expect(new Set(hosts).size).toBe(hosts.length);
  });
});

describe('normalizeSocialLinks', () => {
  test('turns handles and urls into links, in order', () => {
    expect(
      normalizeSocialLinks([
        { platform: 'instagram', value: '@rogaroga' },
        { platform: 'youtube', value: 'https://www.youtube.com/@ExtraMusica' },
      ])
    ).toEqual({
      ok: true,
      links: [
        { platform: 'instagram', url: 'https://instagram.com/rogaroga' },
        { platform: 'youtube', url: 'https://www.youtube.com/@ExtraMusica' },
      ],
    });
  });

  test('ignores empty rows', () => {
    expect(
      normalizeSocialLinks([{ platform: 'tiktok', value: '   ' }])
    ).toEqual({ ok: true, links: [] });
  });

  test('points at the invalid row', () => {
    expect(
      normalizeSocialLinks([
        { platform: 'instagram', value: 'ok_handle' },
        { platform: 'website', value: 'pas une url' },
      ])
    ).toEqual({ ok: false, index: 1, reason: 'invalid' });
  });

  test('refuses the same platform twice', () => {
    expect(
      normalizeSocialLinks([
        { platform: 'twitter', value: 'a_one' },
        { platform: 'twitter', value: 'a_two' },
      ])
    ).toEqual({ ok: false, index: 1, reason: 'duplicate' });
  });
});

describe('platformsByGroup', () => {
  test('music platforms are the listening ones', () => {
    expect(platformsByGroup('music')).toEqual([
      'spotify',
      'applemusic',
      'boomplay',
      'audiomack',
      'deezer',
      'soundcloud',
    ]);
  });
});

describe('planPlatformLinkSync', () => {
  const music = platformsByGroup('music');

  test('creates, updates, and removes only the edited group', () => {
    const plan = planPlatformLinkSync(
      music,
      { spotify: 'https://open.spotify.com/artist/new', deezer: '' },
      [
        { id: 'spotify', href: 'https://open.spotify.com/artist/old' },
        { id: 'deezer', href: 'https://www.deezer.com/artist/1' },
        { id: 'ig', href: 'https://instagram.com/roga' },
      ]
    );
    expect(plan).toEqual({
      ok: true,
      actions: [
        {
          kind: 'update',
          id: 'spotify',
          href: 'https://open.spotify.com/artist/new',
        },
        { kind: 'delete', id: 'deezer' },
      ],
    });
  });

  test('adds a platform that was not on the page', () => {
    const plan = planPlatformLinkSync(music, { audiomack: 'roga' }, []);
    expect(plan).toEqual({
      ok: true,
      actions: [{ kind: 'create', href: 'https://audiomack.com/roga' }],
    });
  });

  test('stops on the first invalid value', () => {
    expect(
      planPlatformLinkSync(music, { boomplay: 'pas un lien' }, [])
    ).toEqual({ ok: false, platform: 'boomplay' });
  });
});
