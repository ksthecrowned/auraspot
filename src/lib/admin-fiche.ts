import { type PersonalityPlatform, toSocialUrl } from '@/lib/personality';

// Helpers for the admin fiche form: official social links and a plain-text
// bio (the profile stores the bio as the rich-text editor's HTML).

export type SocialLinkInput = { platform: PersonalityPlatform; value: string };

export function normalizeSocialLinks(
  inputs: SocialLinkInput[]
):
  | { ok: true; links: { platform: PersonalityPlatform; url: string }[] }
  | { ok: false; index: number; reason: 'invalid' | 'duplicate' } {
  const links: { platform: PersonalityPlatform; url: string }[] = [];
  const seen = new Set<PersonalityPlatform>();
  for (const [index, input] of inputs.entries()) {
    if (!input.value.trim()) {
      continue;
    }
    if (seen.has(input.platform)) {
      return { ok: false, index, reason: 'duplicate' };
    }
    const url = toSocialUrl(input.platform, input.value);
    if (!url) {
      return { ok: false, index, reason: 'invalid' };
    }
    seen.add(input.platform);
    links.push({ platform: input.platform, url });
  }
  return { ok: true, links };
}

const PARAGRAPH_BREAK_RE = /\n\s*\n/;
const LINE_BREAK_RE = /\n/g;
const BR_RE = /<br\s*\/?>/gi;
const PARAGRAPH_END_RE = /<\/p>\s*/gi;
const TAG_RE = /<[^>]*>/g;
const TRIPLE_NEWLINE_RE = /\n{3,}/g;

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
        `<p>${escapeHtml(paragraph).replace(LINE_BREAK_RE, '<br>')}</p>`
    )
    .join('');
}

export function plainTextFromBio(html: string | null | undefined): string {
  if (!html) {
    return '';
  }
  return unescapeHtml(
    html
      .replace(BR_RE, '\n')
      .replace(PARAGRAPH_END_RE, '\n\n')
      .replace(TAG_RE, '')
  )
    .replace(TRIPLE_NEWLINE_RE, '\n\n')
    .trim();
}
