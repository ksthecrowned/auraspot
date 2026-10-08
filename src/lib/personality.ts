const DIACRITICS_RE = /\p{M}/gu;
const NON_SLUG_RE = /[^a-z0-9]+/g;
const EDGE_DASH_RE = /^-+|-+$/g;
const TRAILING_DASH_RE = /-+$/g;
const WHITESPACE_RE = /\s+/;

export function slugifyPersonalityName(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .toLowerCase()
    .replace(NON_SLUG_RE, '-')
    .replace(EDGE_DASH_RE, '')
    .slice(0, 50)
    .replace(TRAILING_DASH_RE, '');
}

export function firstNameOf(name: string): string {
  // const trimmed = name.trim();
  // const [first] = trimmed.split(WHITESPACE_RE);
  // if (!first || first === trimmed || first.length < 3) {
  //   return trimmed;
  // }
  return name;
}

export function initialsOf(name: string): string {
  const words = name.trim().split(WHITESPACE_RE).filter(Boolean);
  const first = words[0] ?? '';
  const last = words.length > 1 ? (words.at(-1) ?? '') : '';
  const letters = last
    ? `${first[0] ?? ''}${last[0] ?? ''}`
    : first.slice(0, 2);
  return letters.toUpperCase() || '?';
}

function others(n: number) {
  return n === 1 ? '1 autre' : `${n} autres`;
}

export function supportersSummary({
  names,
  count,
  firstName,
}: {
  names: string[];
  count: number;
  firstName: string;
}): string {
  if (count === 0) {
    return `Soyez le premier à soutenir ${firstName}`;
  }
  const [a, b] = names;
  if (!a) {
    return count === 1 ? '1 soutien' : `${count} soutiens`;
  }
  if (!b) {
    return count === 1
      ? `${a} soutient ${firstName}`
      : `${a} et ${others(count - 1)}`;
  }
  const rest = count - 2;
  return rest <= 0 ? `${a} et ${b}` : `${a}, ${b} et ${others(rest)}`;
}
