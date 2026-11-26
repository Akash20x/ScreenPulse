import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  responses: [] as any[],
  calls: [] as { table: string; method: string; args: any[] }[],
  download: vi.fn()
}));
vi.mock('@/src/mcp/mcp-oauth', () => ({
  appUrl: () => 'https://screenpulse.example'
}));
vi.mock('@/src/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from(table: string) {
      const chain: any = {
        then: (resolve: any) =>
          Promise.resolve(state.responses.shift()).then(resolve)
      };
      for (const method of [
        'select',
        'eq',
        'in',
        'gt',
        'maybeSingle',
        'insert'
      ])
        chain[method] = (...args: any[]) => {
          state.calls.push({ table, method, args });
          return chain;
        };
      return chain;
    },
    storage: { from: () => ({ download: state.download }) }
  })
}));

import { createMcpImageLinks, hashMcpImageLinkToken } from './mcp-image-links';
import { GET } from '../../app/mcp/image/[token]/route';

const token = 'a-valid-secret-image-token';
const callRoute = (value = token) =>
  GET(new Request(`https://screenpulse.example/mcp/image/${value}`), {
    params: Promise.resolve({ token: value })
  });
const activeLink = () => ({
  screenshot_id: 'shot',
  user_id: 'owner',
  expires_at: new Date(Date.now() + 60_000).toISOString()
});

beforeEach(() => {
  state.responses.length = 0;
  state.calls.length = 0;
  state.download.mockReset().mockResolvedValue({
    data: new Blob(['original-image'], { type: 'image/png' }),
    error: null
  });
});

describe('temporary MCP links', () => {
  it('creates distinct two-hour links and stores only token hashes after owner validation', async () => {
    state.responses.push(
      { data: [{ id: 'first' }, { id: 'second' }] },
      { error: null }
    );
    const before = Date.now();
    const links = await createMcpImageLinks('owner', [
      { id: 'first' },
      { id: 'second' }
    ]);
    expect(links).toHaveLength(2);
    expect(links[0].expiresInSeconds).toBe(7200);
    expect(Date.parse(links[0].expiresAt) - before).toBeGreaterThanOrEqual(
      7_200_000
    );
    expect(Date.parse(links[0].expiresAt) - before).toBeLessThan(7_201_000);
    expect(links[0].imageUrl).not.toBe(links[1].imageUrl);
    const records = state.calls.find((call) => call.method === 'insert')!
      .args[0];
    const rawToken = links[0].imageUrl.split('/').at(-1)!;
    expect(records[0].token_hash).toBe(hashMcpImageLinkToken(rawToken));
    expect(JSON.stringify(records)).not.toContain(rawToken);
    expect(state.calls).toContainEqual({
      table: 'screenshots',
      method: 'eq',
      args: ['user_id', 'owner']
    });
  });
  it('does not mint a link for another owner or a deleted image', async () => {
    state.responses.push({ data: [] });
    await expect(
      createMcpImageLinks('owner', [{ id: 'not-owned' }])
    ).rejects.toThrow('unavailable');
    expect(state.calls.some((call) => call.method === 'insert')).toBe(false);
  });
  it('reports storage of link records failing instead of returning unusable links', async () => {
    state.responses.push(
      { data: [{ id: 'shot' }] },
      { error: { message: 'database error' } }
    );
    await expect(
      createMcpImageLinks('owner', [{ id: 'shot' }])
    ).rejects.toThrow('Unable to create');
  });
});

describe('anonymous MCP image route', () => {
  it('serves the original bytes with private no-store headers and no storage redirect', async () => {
    state.responses.push(
      { data: activeLink() },
      { data: { storage_path: 'owner/image', mime_type: 'image/png' } }
    );
    const response = await callRoute();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('original-image');
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
    expect(response.headers.has('location')).toBe(false);
    expect(state.calls).toContainEqual({
      table: 'screenshots',
      method: 'eq',
      args: ['user_id', 'owner']
    });
    expect(state.calls).toContainEqual({
      table: 'mcp_image_links',
      method: 'eq',
      args: ['token_hash', hashMcpImageLinkToken(token)]
    });
  });
  it.each(['missing', 'expired', 'deleted', 'storage-error'])(
    'rejects %s images without cacheable errors',
    async (scenario) => {
      state.responses.push({
        data:
          scenario === 'missing'
            ? null
            : scenario === 'expired'
              ? {
                  ...activeLink(),
                  expires_at: new Date(Date.now() - 1).toISOString()
                }
              : activeLink()
      });
      if (scenario === 'deleted') state.responses.push({ data: null });
      if (scenario === 'storage-error') {
        state.responses.push({
          data: { storage_path: 'owner/image', mime_type: 'image/png' }
        });
        state.download.mockResolvedValueOnce({
          data: null,
          error: { message: 'unavailable' }
        });
      }
      const response = await callRoute();
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toContain('no-store');
      if (scenario !== 'storage-error')
        expect(state.download).not.toHaveBeenCalled();
    }
  );
  it('rechecks expiry for every visit to the same URL', async () => {
    state.responses.push(
      { data: activeLink() },
      { data: { storage_path: 'owner/image', mime_type: 'image/png' } }
    );
    expect((await callRoute()).status).toBe(200);
    state.responses.push({ data: null });
    expect((await callRoute()).status).toBe(404);
    expect(state.download).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed tokens before querying the database', async () => {
    expect((await callRoute('invalid')).status).toBe(404);
    expect(state.calls).toHaveLength(0);
  });
  it('does not serve a link that expires while the image is loading', async () => {
    const link = activeLink();
    state.responses.push(
      { data: link },
      { data: { storage_path: 'owner/image', mime_type: 'image/png' } }
    );
    state.download.mockImplementationOnce(async () => {
      link.expires_at = new Date(Date.now() - 1).toISOString();
      return { data: new Blob(['image']), error: null };
    });
    expect((await callRoute()).status).toBe(404);
  });
});
