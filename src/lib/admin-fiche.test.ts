import { describe, expect, test } from 'bun:test';
import { bioFromPlainText, plainTextFromBio } from './admin-fiche';

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
