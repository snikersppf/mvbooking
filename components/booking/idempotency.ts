export type IdempotencyEntry = Readonly<{
  fingerprint: string;
  key: string;
}>;

export function resolveIdempotencyEntry(
  current: IdempotencyEntry | null,
  fingerprint: string,
  createKey: () => string,
): IdempotencyEntry {
  if (current?.fingerprint === fingerprint) return current;
  return { fingerprint, key: createKey() };
}
