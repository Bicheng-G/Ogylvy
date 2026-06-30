const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

export function stableHash(input: string): string {
  let hash = FNV_OFFSET;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function stableId(prefix: string, ...parts: Array<string | number>): string {
  const hash = stableHash(parts.join("::"));
  return `${prefix}_${hash}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export const FIXED_DEMO_TIME = "2026-06-19T02:00:00.000Z";

