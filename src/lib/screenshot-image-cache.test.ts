import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadScreenshotImage, retainScreenshotImage, screenshotCacheName, screenshotCacheRequestPath } from './screenshot-image-cache';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('session screenshot cache keys', () => {
  it('scopes a cache to the user and browser session', () => {
    expect(screenshotCacheName('user-a', 'session-a')).toBe('screenpulse-session-images:user-a:session-a');
    expect(screenshotCacheName('user-b', 'session-a')).not.toBe(screenshotCacheName('user-a', 'session-a'));
  });

  it('uses screenshot IDs instead of temporary signed URLs as cache keys', () => {
    expect(screenshotCacheRequestPath('a/b c')).toBe('/__screenpulse/session-image/a%2Fb%20c');
  });
});

describe('screenshot loading', () => {
  it('shares concurrent preloads and recovers from an expired signed URL', async () => {
    const cache = { match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) };
    const storage = { getItem: (key: string) => key.includes('session') ? 'session-test' : 'user-test', setItem: vi.fn() };
    vi.stubGlobal('window', { caches: {}, sessionStorage: storage });
    vi.stubGlobal('caches', { keys: vi.fn().mockResolvedValue([]), open: vi.fn().mockResolvedValue(cache) });
    vi.stubGlobal('Request', class { constructor(public url: string) {} });
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 403 })).mockResolvedValueOnce(new Response(new Blob(['image'], { type: 'image/png' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-image');
    const [first, second] = await Promise.all([
      loadScreenshotImage('user-test', 'image-test', 'https://storage.example/expired'),
      loadScreenshotImage('user-test', 'image-test', 'https://storage.example/expired'),
    ]);
    expect(first).toBe('blob:test-image');
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/screenshots/image-test/image', { cache: 'no-store' });
    expect(cache.put).toHaveBeenCalledOnce();
  });

  it('keeps the displayed blob URL alive while many neighboring images preload', async () => {
    const cache = { match: vi.fn().mockResolvedValue(undefined), put: vi.fn().mockResolvedValue(undefined) };
    const storage = { getItem: (key: string) => key.includes('session') ? 'session-pinned' : 'user-pinned', setItem: vi.fn() };
    vi.stubGlobal('window', { caches: {}, sessionStorage: storage });
    vi.stubGlobal('caches', { keys: vi.fn().mockResolvedValue([]), open: vi.fn().mockResolvedValue(cache) });
    vi.stubGlobal('Request', class { constructor(public url: string) {} });
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(new Blob(['image'], { type: 'image/png' }), { status: 200 })));
    let nextUrl = 0;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:pinned-test-${++nextUrl}`);
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const release = retainScreenshotImage('user-pinned', 'current');
    const currentUrl = await loadScreenshotImage('user-pinned', 'current', 'https://storage.example/current');
    for (let index = 0; index < 70; index += 1) {
      await loadScreenshotImage('user-pinned', `neighbor-${index}`, `https://storage.example/${index}`);
    }
    expect(revoke).not.toHaveBeenCalledWith(currentUrl);
    expect(await loadScreenshotImage('user-pinned', 'current', 'https://storage.example/current')).toBe(currentUrl);
    release();
    for (let index = 0; index < 70; index += 1) {
      await loadScreenshotImage('user-pinned', `later-neighbor-${index}`, `https://storage.example/later-${index}`);
    }
    expect(revoke).toHaveBeenCalledWith(currentUrl);
  });
});
