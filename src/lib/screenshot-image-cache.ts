const CACHE_PREFIX = 'screenpulse-session-images';
const SESSION_KEY = 'screenpulse-image-cache-session';
const USER_KEY = 'screenpulse-image-cache-user';
const MAX_MEMORY_IMAGES = 60;

const objectUrls = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();
let preparedFor = '';
let preparePromise: Promise<string | null> | null = null;

export function screenshotCacheName(userId: string, sessionId: string) {
  return `${CACHE_PREFIX}:${userId}:${sessionId}`;
}

export function screenshotCacheRequestPath(screenshotId: string) {
  return `/__screenpulse/session-image/${encodeURIComponent(screenshotId)}`;
}

export function screenshotImageFallbackPath(screenshotId: string) {
  return `/api/screenshots/${encodeURIComponent(screenshotId)}/image`;
}

function browserCacheAvailable() {
  return typeof window !== 'undefined' && 'caches' in window && 'sessionStorage' in window;
}

function clearMemory() {
  for (const url of objectUrls.values()) URL.revokeObjectURL(url);
  objectUrls.clear();
}

function remember(key: string, blob: Blob) {
  const existing = objectUrls.get(key);
  if (existing) { objectUrls.delete(key); objectUrls.set(key, existing); return existing; }
  const url = URL.createObjectURL(blob);
  objectUrls.set(key, url);
  if (objectUrls.size > MAX_MEMORY_IMAGES) {
    const oldest = objectUrls.entries().next().value as [string, string] | undefined;
    if (oldest) { objectUrls.delete(oldest[0]); URL.revokeObjectURL(oldest[1]); }
  }
  return url;
}

export async function prepareScreenshotImageCache(userId: string) {
  if (!browserCacheAvailable()) return null;
  const existingSession = window.sessionStorage.getItem(SESSION_KEY);
  const existingUser = window.sessionStorage.getItem(USER_KEY);
  const signature = `${userId}:${existingSession ?? ''}`;
  if (preparedFor === signature && preparePromise) return preparePromise;
  preparedFor = signature;
  preparePromise = (async () => {
    const sessionId = existingSession ?? crypto.randomUUID();
    const keys = await caches.keys();
    if (!existingSession || existingUser !== userId) {
      await Promise.all(keys.filter((key) => key.startsWith(`${CACHE_PREFIX}:`)).map((key) => caches.delete(key)));
      clearMemory();
    }
    window.sessionStorage.setItem(SESSION_KEY, sessionId);
    window.sessionStorage.setItem(USER_KEY, userId);
    return screenshotCacheName(userId, sessionId);
  })().catch(() => null);
  return preparePromise;
}

export async function loadScreenshotImage(userId: string, screenshotId: string, sourceUrl: string) {
  const memoryKey = `${userId}:${screenshotId}`;
  const memoryUrl = objectUrls.get(memoryKey);
  if (memoryUrl) { objectUrls.delete(memoryKey); objectUrls.set(memoryKey, memoryUrl); return memoryUrl; }
  const pending = inFlight.get(memoryKey);
  if (pending) return pending;
  const load = loadImage(memoryKey, userId, screenshotId, sourceUrl);
  inFlight.set(memoryKey, load);
  try { return await load; } finally { if (inFlight.get(memoryKey) === load) inFlight.delete(memoryKey); }
}

async function loadImage(memoryKey: string, userId: string, screenshotId: string, sourceUrl: string) {
  try {
  const cacheName = await prepareScreenshotImageCache(userId);
  if (!cacheName) return sourceUrl;
    const cache = await caches.open(cacheName);
    const request = new Request(screenshotCacheRequestPath(screenshotId));
    let response = await cache.match(request);
    if (!response) {
      try { response = await fetch(sourceUrl); } catch { response = undefined; }
      if (!response?.ok) response = await fetch(screenshotImageFallbackPath(screenshotId), { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not fetch screenshot image.');
      try { await cache.put(request, response.clone()); } catch { /* Render even if the cache is full. */ }
    }
    return remember(memoryKey, await response.blob());
  } catch {
    return sourceUrl;
  }
}

export async function invalidateScreenshotImage(userId: string, screenshotId: string) {
  const key = `${userId}:${screenshotId}`;
  const url = objectUrls.get(key);
  if (url) { objectUrls.delete(key); URL.revokeObjectURL(url); }
  try {
    const cacheName = await prepareScreenshotImageCache(userId);
    if (cacheName) await (await caches.open(cacheName)).delete(new Request(screenshotCacheRequestPath(screenshotId)));
  } catch { /* The next load can still use the authenticated fallback. */ }
}

export async function warmScreenshotImage(userId: string, screenshotId: string, sourceUrl: string) {
  await loadScreenshotImage(userId, screenshotId, sourceUrl);
}

export async function clearScreenshotImageCache() {
  if (!browserCacheAvailable()) return;
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith(`${CACHE_PREFIX}:`)).map((key) => caches.delete(key)));
  window.sessionStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(USER_KEY);
  preparedFor = ''; preparePromise = null; clearMemory();
}
