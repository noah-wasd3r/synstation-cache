import type { Context, MiddlewareHandler } from 'hono';
import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'api');

interface CacheOptions {
  maxAge?: number; // seconds
  blacklist?: string[];
}

async function ensureCacheDir() {
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
}

async function getCachedResponse(key: string): Promise<{ data: any; timestamp: number } | null> {
  try {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function setCachedResponse(key: string, data: any): Promise<void> {
  await ensureCacheDir();
  const cacheData = {
    data,
    timestamp: Math.floor(Date.now() / 1000),
  };
  const filePath = path.join(CACHE_DIR, `${key}.json`);
  await fs.writeFile(filePath, JSON.stringify(cacheData));
}

export function cache(options: CacheOptions = {}): MiddlewareHandler {
  const { maxAge = Number(process.env.API_CACHE_MAX_AGE ?? 60), blacklist = ['/favicon.ico'] } = options;

  return async (c: Context, next: Function) => {
    // Skip caching for blacklisted paths
    if (blacklist.includes(c.req.path)) {
      return next();
    }

    // Only cache GET requests
    if (c.req.method !== 'GET') return next();

    // Generate cache key from URL
    const url = new URL(c.req.url);
    const cacheKey = `${url.pathname}${url.search}`.replace(/[^a-zA-Z0-9]/g, '_');

    // Check if force refresh is requested
    const forceFetch = c.req.query('forceFetch') === 'true';

    if (!forceFetch) {
      const cached = await getCachedResponse(cacheKey);
      const now = Math.floor(Date.now() / 1000);

      if (cached && now - cached.timestamp < maxAge) {
        return c.json(cached.data);
      }
    }

    // If not cached or cache expired, proceed with the request
    await next();

    // Cache the response if it's successful
    if (c.res.status === 200) {
      const responseData = await c.res.json();
      await setCachedResponse(cacheKey, responseData);
      return c.json(responseData);
    }
  };
}
