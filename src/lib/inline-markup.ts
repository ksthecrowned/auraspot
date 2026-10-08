export type InlinePart =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'break' };

// `**gras**` becomes bold. A line break stays a line break. Anything else
// is plain text, so a profile description cannot inject HTML.
export function parseInlineMarkup(text: string): InlinePart[] {
  const normalized = text.replace(/\r\n/g, '\n');
  const parts: InlinePart[] = [];
  let last = 0;
  for (const match of normalized.matchAll(/\*\*([^*\n]+)\*\*|\n/g)) {
    const index = match.index ?? 0;
    const token = match[0] ?? '';
    if (index > last) {
      parts.push({ type: 'text', value: normalized.slice(last, index) });
    }
    const bold = match[1];
    if (bold) {
      parts.push({ type: 'bold', value: bold });
    } else {
      parts.push({ type: 'break' });
    }
    last = index + token.length;
  }
  if (last < normalized.length) {
    parts.push({ type: 'text', value: normalized.slice(last) });
  }
  return parts;
}

export function emphasizeMarkup(escaped: string) {
  return escaped.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
}
