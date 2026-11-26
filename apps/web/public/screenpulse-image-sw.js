const CACHE_PREFIX = 'screenpulse-private-images:';
const MAX_IMAGES_PER_SESSION = 60;
const activeSessions = new Set();
const inFlight = new Map();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

function cacheName(sessionId) {
  return `${CACHE_PREFIX}${sessionId}`;
}

function imageRequestDetails(request) {
  if (request.method !== 'GET') return null;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !/^\/api\/screenshots\/[^/]+\/image$/.test(url.pathname)) return null;
  const sessionId = url.searchParams.get('sp_session');
  if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
  return { sessionId, url };
}

async function trim(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_IMAGES_PER_SESSION;
  if (excess > 0) await Promise.all(keys.slice(0, excess).map((key) => cache.delete(key)));
}

async function fetchAndCache(request, name) {
  const key = request.url;
  const existing = inFlight.get(key);
  if (existing) return (await existing).clone();
  const pending = (async () => {
    const response = await fetch(request);
    if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
      const cache = await caches.open(name);
      await cache.put(request, response.clone()).catch(() => undefined);
      await trim(cache).catch(() => undefined);
    }
    return response;
  })();
  inFlight.set(key, pending);
  try {
    return (await pending).clone();
  } finally {
    inFlight.delete(key);
  }
}

self.addEventListener('fetch', (event) => {
  const details = imageRequestDetails(event.request);
  if (!details) return;
  event.respondWith((async () => {
    const name = cacheName(details.sessionId);
    const cache = await caches.open(name);
    const cached = await cache.match(event.request);
    return cached ?? fetchAndCache(event.request, name);
  })());
});

self.addEventListener('message', (event) => {
  const message = event.data ?? {};
  const respond = () => event.ports[0]?.postMessage({ ok: true });
  if (message.type === 'SCREENPULSE_IMAGE_CACHE_INIT' && message.sessionId) {
    activeSessions.add(message.sessionId);
    respond();
    return;
  }
  if (message.type === 'SCREENPULSE_IMAGE_CACHE_CLEAR' && message.sessionId) {
    activeSessions.delete(message.sessionId);
    event.waitUntil(caches.delete(cacheName(message.sessionId)).finally(respond));
    return;
  }
  if (message.type === 'SCREENPULSE_IMAGE_CACHE_EVICT' && message.sessionId && message.screenshotId) {
    event.waitUntil((async () => {
      const cache = await caches.open(cacheName(message.sessionId));
      const keys = await cache.keys();
      const path = `/api/screenshots/${encodeURIComponent(message.screenshotId)}/image`;
      await Promise.all(keys.filter((key) => new URL(key.url).pathname === path).map((key) => cache.delete(key)));
    })().finally(respond));
    return;
  }
  respond();
});
