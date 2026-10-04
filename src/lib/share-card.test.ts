import { describe, expect, test } from 'bun:test';
import {
  parseViewSource,
  shareCardHeadline,
  shareCardSizes,
} from './share-card';

describe('parseViewSource', () => {
  test('accepte la liste blanche', () => {
    expect(parseViewSource('carte')).toBe('carte');
    expect(parseViewSource('qr')).toBe('qr');
    expect(parseViewSource('bio')).toBe('bio');
  });

  test('rejette le reste', () => {
    expect(parseViewSource('facebook')).toBeNull();
    expect(parseViewSource('')).toBeNull();
    expect(parseViewSource(null)).toBeNull();
    expect(parseViewSource(undefined)).toBeNull();
  });
});

describe('shareCardHeadline', () => {
  test('nomme le fan quand le soutien est public', () => {
    expect(
      shareCardHeadline({
        isPublic: true,
        displayName: 'Aïcha',
        personalityName: 'Fally Ipupa',
      })
    ).toBe('Aïcha soutient Fally Ipupa');
  });

  test('reste anonyme sinon', () => {
    expect(
      shareCardHeadline({
        isPublic: false,
        displayName: 'Aïcha',
        personalityName: 'Fally Ipupa',
      })
    ).toBe('J’ai soutenu Fally Ipupa');
    expect(
      shareCardHeadline({
        isPublic: true,
        displayName: '  ',
        personalityName: 'Fally Ipupa',
      })
    ).toBe('J’ai soutenu Fally Ipupa');
  });
});

describe('shareCardSizes', () => {
  test('portrait par défaut, paysage si wide', () => {
    expect(shareCardSizes(null)).toEqual({ width: 1080, height: 1920 });
    expect(shareCardSizes('wide')).toEqual({ width: 1200, height: 630 });
  });
});
