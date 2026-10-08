// Plain-text bio for the admin fiche form: the profile stores the bio as the
// rich-text editor's HTML. Line breaks become paragraphs or <br>, and
// **gras** becomes <strong>.

import { emphasizeMarkup } from '@/lib/inline-markup';

const PARAGRAPH_BREAK_RE = /\n\s*\n/;
const LINE_BREAK_RE = /\n/g;
const BR_RE = /<br\s*\/?>/gi;
const PARAGRAPH_END_RE = /<\/p>\s*/gi;
const TAG_RE = /<[^>]*>/g;
const TRIPLE_NEWLINE_RE = /\n{3,}/g;
const STRONG_RE = /<(strong|b)>([\s\S]*?)<\/\1>/gi;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function unescapeHtml(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

export function bioFromPlainText(text: string): string | null {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(PARAGRAPH_BREAK_RE)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) {
    return null;
  }
  return paragraphs
    .map(
      (paragraph) =>
        `<p>${emphasizeMarkup(escapeHtml(paragraph).replace(LINE_BREAK_RE, '<br>'))}</p>`
    )
    .join('');
}

// HTML already produced by the editor is left as-is. Plain text typed in a
// form is turned into that HTML so line breaks and **gras** show on the fiche.
export function bioForDisplay(stored: string | null | undefined): string {
  if (!stored?.trim()) {
    return '';
  }
  if (stored.trimStart().startsWith('<')) {
    return stored;
  }
  return bioFromPlainText(stored) ?? '';
}

export function bioPlainText(stored: string | null | undefined): string {
  return plainTextFromBio(stored)
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function plainTextFromBio(html: string | null | undefined): string {
  if (!html) {
    return '';
  }
  return unescapeHtml(
    html
      .replace(BR_RE, '\n')
      .replace(STRONG_RE, '**$2**')
      .replace(PARAGRAPH_END_RE, '\n\n')
      .replace(TAG_RE, '')
  )
    .replace(TRIPLE_NEWLINE_RE, '\n\n')
    .trim();
}
