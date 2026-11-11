/** The name as it will be stored: trimmed, single spaces, 2 to 80 characters; null when it is not worth keeping. */
export function requestName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ').slice(0, 80);
  return name.length >= 2 ? name : null;
}
