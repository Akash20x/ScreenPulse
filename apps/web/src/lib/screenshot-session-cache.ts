const CACHE_PREFIX = 'screenpulse-private-images:';
const SESSION_KEY = 'screenpulse-private-image-session';
const USER_KEY = 'screenpulse-private-image-user';
const WORKER_PATH = '/screenpulse-image-sw.js';

let preparedFor = '';
let preparePromise: Promise<string | null> | null = null;

function supported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'caches' in window &&
    'sessionStorage' in window
  );
}

export function sessionScreenshotImagePath(
  screenshotId: string,
  sessionId?: string
) {
  const path = `/api/screenshots/${encodeURIComponent(screenshotId)}/image`;
  return sessionId
    ? `${path}?sp_session=${encodeURIComponent(sessionId)}`
    : path;
}

export function currentScreenshotSessionUser() {
  if (typeof window === 'undefined' || !('sessionStorage' in window))
    return null;
  return window.sessionStorage.getItem(USER_KEY);
}

export function prioritizeNeighborScreenshotIds(
  ids: string[],
  currentIndex: number
) {
  const ordered: string[] = [];
  for (let distance = 1; distance < ids.length; distance += 1) {
    const next = ids[currentIndex + distance];
    const previous = ids[currentIndex - distance];
    if (next) ordered.push(next);
    if (previous) ordered.push(previous);
  }
  return ordered;
}

async function deletePrivateImageCaches() {
  if (!('caches' in window)) return;
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .map((key) => caches.delete(key))
  );
}

async function waitForController(registration: ServiceWorkerRegistration) {
  if (navigator.serviceWorker.controller)
    return navigator.serviceWorker.controller;
  if (registration.active) {
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, 2000);
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          window.clearTimeout(timeout);
          resolve();
        },
        { once: true }
      );
    });
  }
  return navigator.serviceWorker.controller ?? registration.active;
}

function sendMessage(
  worker: ServiceWorker | null,
  message: Record<string, string>
) {
  if (!worker) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(resolve, 1500);
    channel.port1.onmessage = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    worker.postMessage(message, [channel.port2]);
  });
}

export async function prepareScreenshotSessionCache(userId: string) {
  if (!supported()) return null;
  const existingSession = window.sessionStorage.getItem(SESSION_KEY);
  const existingUser = window.sessionStorage.getItem(USER_KEY);
  const sessionId =
    existingSession && existingUser === userId
      ? existingSession
      : crypto.randomUUID();
  const signature = `${userId}:${sessionId}`;
  if (preparedFor === signature && preparePromise) return preparePromise;

  preparedFor = signature;
  preparePromise = (async () => {
    if (!existingSession || existingUser !== userId)
      await deletePrivateImageCaches();
    window.sessionStorage.setItem(SESSION_KEY, sessionId);
    window.sessionStorage.setItem(USER_KEY, userId);
    const registration = await navigator.serviceWorker.register(WORKER_PATH, {
      scope: '/',
      updateViaCache: 'none'
    });
    const ready = await navigator.serviceWorker.ready;
    const worker = await waitForController(ready ?? registration);
    await sendMessage(worker, {
      type: 'SCREENPULSE_IMAGE_CACHE_INIT',
      sessionId
    });
    return sessionId;
  })().catch(() => null);
  return preparePromise;
}

export async function screenshotSessionImagePath(
  userId: string,
  screenshotId: string
) {
  const sessionId = await prepareScreenshotSessionCache(userId);
  return sessionScreenshotImagePath(screenshotId, sessionId ?? undefined);
}

export async function evictScreenshotSessionImage(
  userId: string,
  screenshotId: string
) {
  const sessionId = await prepareScreenshotSessionCache(userId);
  if (!sessionId) return;
  const registration = await navigator.serviceWorker.ready;
  const worker = navigator.serviceWorker.controller ?? registration.active;
  await sendMessage(worker, {
    type: 'SCREENPULSE_IMAGE_CACHE_EVICT',
    sessionId,
    screenshotId
  });
}

export async function prefetchScreenshotSessionImages(
  userId: string,
  screenshotIds: string[],
  options: {
    concurrency?: number;
    decodeCount?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
) {
  const sessionId = await prepareScreenshotSessionCache(userId);
  const ids = [...new Set(screenshotIds)];
  const total = ids.length;
  if (!sessionId || !total) return { completed: 0, total };

  let cursor = 0;
  let completed = 0;
  const run = async () => {
    while (cursor < total) {
      const position = cursor;
      const id = ids[position];
      cursor += 1;
      try {
        const path = sessionScreenshotImagePath(id, sessionId);
        await fetch(path, { credentials: 'same-origin' });
        if (position < (options.decodeCount ?? 0)) {
          const image = new Image();
          image.src = path;
          await image.decode();
        }
      } catch {
        // The visible image keeps its normal network fallback if background caching fails.
      }
      completed += 1;
      options.onProgress?.(completed, total);
    }
  };
  const workerCount = Math.min(Math.max(options.concurrency ?? 3, 1), total);
  await Promise.all(Array.from({ length: workerCount }, run));
  return { completed, total };
}

export async function clearScreenshotSessionCache() {
  if (typeof window === 'undefined') return;
  const sessionId = window.sessionStorage.getItem(SESSION_KEY);
  if ('serviceWorker' in navigator && sessionId) {
    const registration = await navigator.serviceWorker
      .getRegistration('/')
      .catch(() => undefined);
    const worker =
      navigator.serviceWorker.controller ?? registration?.active ?? null;
    await sendMessage(worker, {
      type: 'SCREENPULSE_IMAGE_CACHE_CLEAR',
      sessionId
    });
  }
  if ('caches' in window) await deletePrivateImageCaches();
  window.sessionStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(USER_KEY);
  preparedFor = '';
  preparePromise = null;
}
