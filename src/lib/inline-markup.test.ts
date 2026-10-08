import { describe, expect, test } from 'bun:test';
import { parseInlineMarkup } from './inline-markup';

describe('parseInlineMarkup', () => {
  test('keeps line breaks and bold', () => {
    expect(parseInlineMarkup('Artiste\n**auteur**\r\nBrazzaville')).toEqual([
      { type: 'text', value: 'Artiste' },
      { type: 'break' },
      { type: 'bold', value: 'auteur' },
      { type: 'break' },
      { type: 'text', value: 'Brazzaville' },
    ]);
  });

  test('leaves unmatched asterisks as text', () => {
    expect(parseInlineMarkup('note ** incomplète')).toEqual([
      { type: 'text', value: 'note ** incomplète' },
    ]);
  });
});
