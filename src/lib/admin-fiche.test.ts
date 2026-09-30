import { describe, expect, test } from 'bun:test';
import {
  bioFromPlainText,
  normalizeSocialLinks,
  plainTextFromBio,
} from './admin-fiche';

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

describe('bio conversion', () => {
  test('plain text becomes escaped paragraphs', () => {
    expect(
      bioFromPlainText('Chanteur <b>&</b> auteur\nBrazzaville\n\nDepuis 1998')
    ).toBe(
      '<p>Chanteur &lt;b&gt;&amp;&lt;/b&gt; auteur<br>Brazzaville</p><p>Depuis 1998</p>'
    );
  });

  test('an empty bio is stored as null', () => {
    expect(bioFromPlainText('  \n ')).toBeNull();
  });

  test('stored HTML reads back as plain text', () => {
    expect(
      plainTextFromBio(
        '<p>Chanteur &lt;b&gt;&amp;&lt;/b&gt; auteur<br>Brazzaville</p><p><strong>Depuis</strong> 1998</p>'
      )
    ).toBe('Chanteur <b>&</b> auteur\nBrazzaville\n\nDepuis 1998');
  });

  test('no bio reads back as empty text', () => {
    expect(plainTextFromBio(null)).toBe('');
  });
});
