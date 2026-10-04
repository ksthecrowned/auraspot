const VIEW_SOURCES = ['carte', 'qr', 'bio'] as const;

export type ViewSource = (typeof VIEW_SOURCES)[number];

export function parseViewSource(
  value: string | null | undefined
): ViewSource | null {
  if (!value) {
    return null;
  }
  return VIEW_SOURCES.includes(value as ViewSource)
    ? (value as ViewSource)
    : null;
}

export function shareCardHeadline(input: {
  isPublic: boolean;
  displayName: string | null;
  personalityName: string;
}) {
  const name = input.displayName?.trim();
  if (input.isPublic && name) {
    return `${name} soutient ${input.personalityName}`;
  }
  return `J’ai soutenu ${input.personalityName}`;
}

export function shareCardSizes(format: string | null) {
  if (format === 'wide') {
    return { width: 1200, height: 630 };
  }
  return { width: 1080, height: 1920 };
}

export function shareCardUrl(origin: string, slug: string) {
  const base = origin.replace(/\/$/, '');
  return `${base}/${slug}?src=carte`;
}
