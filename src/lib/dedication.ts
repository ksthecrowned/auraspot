export const DEDICATION_MAX_LENGTH = 280;
export const THANK_YOU_MAX_LENGTH = 140;

// Stored only for a public support. Private supports keep the column null.
export function dedicationForCreate(input: {
  message?: string;
  isPublic: boolean;
}): string | null {
  if (!input.isPublic) {
    return null;
  }
  const text = input.message?.trim() ?? '';
  if (!text || text.length > DEDICATION_MAX_LENGTH) {
    return null;
  }
  return text;
}

export function clampDedicationLines(text: string, maxBreaks = 3) {
  let breaks = 0;
  let out = '';
  for (const char of text) {
    if (char === '\n') {
      breaks += 1;
      out += breaks <= maxBreaks ? '\n' : ' ';
    } else {
      out += char;
    }
  }
  return out;
}
