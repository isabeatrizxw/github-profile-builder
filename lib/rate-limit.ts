import "server-only";

// Small in-memory sliding-window limiter. It is best effort: each server
// instance keeps its own counts, so it bounds bursts from one client but is
// not a global quota.

const hits = new Map<string, number[]>();

/** Returns true when `key` made fewer than `limit` calls in the last `windowMs`. */
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  hits.set(key, [...recent, now]);
  return true;
}
