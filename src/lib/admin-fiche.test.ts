import { describe, expect, test } from 'bun:test';
import {
  bioForDisplay,
  bioFromPlainText,
  bioPlainText,
  plainTextFromBio,
} from './admin-fiche';

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

  test('double asterisks become bold', () => {
    expect(bioFromPlainText('Artiste\n**auteur** & co')).toBe(
      '<p>Artiste<br><strong>auteur</strong> &amp; co</p>'
    );
  });

  test('stored HTML reads back as plain text', () => {
    expect(
      plainTextFromBio(
        '<p>Chanteur &lt;b&gt;&amp;&lt;/b&gt; auteur<br>Brazzaville</p><p><strong>Depuis</strong> 1998</p>'
      )
    ).toBe('Chanteur <b>&</b> auteur\nBrazzaville\n\n**Depuis** 1998');
  });

  test('bold and line breaks round-trip', () => {
    const source = 'Salut\n**monde**';
    expect(plainTextFromBio(bioFromPlainText(source))).toBe(source);
  });

  test('plain text is formatted for the profile, stored HTML is kept', () => {
    expect(bioForDisplay('Salut\n**monde**')).toBe(
      '<p>Salut<br><strong>monde</strong></p>'
    );
    expect(bioForDisplay('<p>Déjà <strong>gras</strong></p>')).toBe(
      '<p>Déjà <strong>gras</strong></p>'
    );
    expect(bioPlainText('<p>Déjà <strong>gras</strong></p>')).toBe('Déjà gras');
  });

  test('no bio reads back as empty text', () => {
    expect(plainTextFromBio(null)).toBe('');
  });
});
