export function safeNextPath(
  value: string | null | undefined,
  fallback = '/app'
) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }
  if (value.includes('\\') || value.includes('://')) {
    return fallback;
  }
  return value;
}
