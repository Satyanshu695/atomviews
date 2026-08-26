const store = new Map<string, { value: any; ts: number }>();

export async function cacheGetOrSet<T>(key: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<T> {
  const now = Date.now() / 1000;
  const entry = store.get(key);
  if (entry && now - entry.ts < ttlSeconds) return entry.value;
  const value = await fetchFn();
  store.set(key, { value, ts: now });
  return value;
}
