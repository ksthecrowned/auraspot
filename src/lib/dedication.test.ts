import { describe, expect, test } from 'bun:test';
import { clampDedicationLines, dedicationForCreate } from './dedication';

describe('dedicationForCreate', () => {
  test('garde un message public tronqué des espaces', () => {
    expect(
      dedicationForCreate({ message: '  Bravo Aïcha  ', isPublic: true })
    ).toBe('Bravo Aïcha');
  });

  test('refuse un message de plus de 280 caractères', () => {
    expect(
      dedicationForCreate({ message: 'a'.repeat(281), isPublic: true })
    ).toBeNull();
  });

  test('accepte exactement 280 caractères', () => {
    const text = 'a'.repeat(280);
    expect(dedicationForCreate({ message: text, isPublic: true })).toBe(text);
  });

  test('ignore le message si le soutien n’est pas public', () => {
    expect(
      dedicationForCreate({ message: 'Bravo', isPublic: false })
    ).toBeNull();
  });

  test('ignore un message vide', () => {
    expect(dedicationForCreate({ message: '   ', isPublic: true })).toBeNull();
    expect(dedicationForCreate({ isPublic: true })).toBeNull();
  });
});

describe('clampDedicationLines', () => {
  test('conserve trois retours à la ligne', () => {
    expect(clampDedicationLines('a\nb\nc\nd')).toBe('a\nb\nc\nd');
  });

  test('remplace les retours au-delà de trois par des espaces', () => {
    expect(clampDedicationLines('a\nb\nc\nd\ne')).toBe('a\nb\nc\nd e');
  });
});
