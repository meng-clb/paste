const MAX_LEN = 20000;

export function normalizeContent(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return trimmed.length > MAX_LEN ? trimmed.slice(0, MAX_LEN) : trimmed;
}

export function hashContent(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

export function shouldSkipDuplicate(
  lastHash: string | null,
  nextHash: string,
  lastAtMs: number | null,
  nowMs: number,
  windowMs = 2000
): boolean {
  if (!lastHash || !lastAtMs) return false;
  return lastHash === nextHash && nowMs - lastAtMs <= windowMs;
}
