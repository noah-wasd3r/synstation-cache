import fs from 'fs/promises';
import path from 'path';
import type { PonderCacheData, PonderFetchOptions } from '../types/ponder';

const CACHE_DIR = path.join(process.cwd(), 'cache', 'api');

async function ensureCacheDir() {
  try {
    await fs.access(CACHE_DIR);
  } catch {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  }
}

async function saveToCache<T>(key: string, data: T): Promise<void> {
  await ensureCacheDir();
  const cacheData: PonderCacheData<T> = {
    data,
    timestamp: Math.floor(Date.now() / 1000),
  };

  const filePath = path.join(CACHE_DIR, `${key}.json`);
  await fs.writeFile(filePath, JSON.stringify(cacheData));
}

async function getFromCache<T>(key: string): Promise<PonderCacheData<T> | null> {
  try {
    const filePath = path.join(CACHE_DIR, `${key}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as PonderCacheData<T>;
  } catch {
    return null;
  }
}

async function fetchFromPonder<T>(endpoint: string): Promise<T> {
  const baseUrl = process.env.PONDER_BASE_URL;
  if (!baseUrl) throw new Error('PONDER_BASE_URL is not defined');

  if (endpoint === '/favicon.ico') {
    return '' as T;
  }

  console.log('try response', `${baseUrl}${endpoint}`);
  const response = await fetch(`${baseUrl}${endpoint}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`Ponder API error: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchPonderData<T>(endpoint: string, options: PonderFetchOptions = {}): Promise<any> {
  const cacheKey = options.cacheKey ?? endpoint.replace(/[^a-zA-Z0-9]/g, '_');
  // if (!forceFetch) {
  //   const cached = await getFromCache<T>(cacheKey);
  //   const ponderMaxCacheTime = Number(process.env.PONDER_MAXIMUM_CACHE_TIME ?? 60);
  //   const nowInSeconds = Math.floor(Date.now() / 1000);

  //   if (cached && nowInSeconds - cached.timestamp < ponderMaxCacheTime) {
  //     console.log('Using cached data');
  //     return cached.data;
  //   }
  // }

  try {
    const data = await fetchFromPonder<T>(endpoint);

    if (Array.isArray(data) && data.length === 0) {
      throw new Error(`No data [] returned from Ponder ${endpoint}`);
    }

    await saveToCache(cacheKey, data);
    return data;
  } catch (error) {
    const cached = await getFromCache<T>(cacheKey);
    if (cached) return cached.data;
    throw error;
  }
}
