import { queryOne, run } from '../db/index.js';

interface CacheEntry<T> {
  data: T;
  statusCode: number;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export async function getCached<T>(key: string): Promise<T | null> {
  const now = Date.now();

  // 1. Memory cache check
  const mem = memoryCache.get(key);
  if (mem) {
    if (mem.expiresAt > now) {
      return mem.data as T;
    }
    memoryCache.delete(key);
  }

  // 2. Persistent DB cache check
  try {
    const row = await queryOne<{ response_data: string; expires_at: string }>(
      'SELECT response_data, expires_at FROM api_cache WHERE cache_key = ?',
      [key]
    );

    if (row) {
      const exp = new Date(row.expires_at).getTime();
      if (exp > now) {
        const parsed = JSON.parse(row.response_data);
        memoryCache.set(key, { data: parsed, statusCode: 200, expiresAt: exp });
        return parsed as T;
      }
    }
  } catch (err) {
    console.warn(`[Cache] Error reading cache key ${key}:`, err);
  }

  return null;
}

export async function setCached<T>(
  key: string,
  serviceName: string,
  data: T,
  ttlMs: number = 3600 * 1000,
  statusCode: number = 200
): Promise<void> {
  const expiresAt = Date.now() + ttlMs;
  memoryCache.set(key, { data, statusCode, expiresAt });

  try {
    const expDateStr = new Date(expiresAt).toISOString();
    const dataStr = JSON.stringify(data);
    await run(
      `INSERT OR REPLACE INTO api_cache (cache_key, service_name, response_data, status_code, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [key, serviceName, dataStr, statusCode, expDateStr]
    );
  } catch (err) {
    console.warn(`[Cache] Error saving cache key ${key}:`, err);
  }
}
