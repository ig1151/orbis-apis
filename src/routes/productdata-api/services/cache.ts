import Redis from 'ioredis';

const TTL_MS = parseInt(process.env.PRODUCT_CACHE_TTL_MS || '3600000', 10);
const redis  = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 2 })
  : null;
if (redis) redis.on('error', () => {});

function cacheKey(url: string): string {
  try {
    const u = new URL(url);
    ['utm_source','utm_medium','utm_campaign'].forEach(p => u.searchParams.delete(p));
    return 'pd:' + u.toString();
  } catch { return 'pd:' + url; }
}

export async function getCache(url: string): Promise<any | null> {
  try {
    if (redis) {
      const v = await redis.get(cacheKey(url));
      return v ? JSON.parse(v) : null;
    }
  } catch {}
  return null;
}

export async function setCache(url: string, data: any): Promise<void> {
  try {
    if (redis) {
      await redis.set(cacheKey(url), JSON.stringify(data), 'PX', TTL_MS);
    }
  } catch {}
}

export async function getCachedWithMeta(url: string): Promise<{ data: any; cached_at: string } | null> {
  try {
    if (redis) {
      const v = await redis.get(cacheKey(url) + ':meta');
      return v ? JSON.parse(v) : null;
    }
  } catch {}
  return null;
}

export async function setCachedWithMeta(url: string, data: any): Promise<void> {
  try {
    if (redis) {
      const meta = { data, cached_at: new Date().toISOString() };
      await redis.set(cacheKey(url) + ':meta', JSON.stringify(meta), 'PX', TTL_MS);
    }
  } catch {}
}
