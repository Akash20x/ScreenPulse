import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadScreenshotImage, screenshotCacheName, screenshotCacheRequestPath } from './screenshot-image-cache';

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
});
