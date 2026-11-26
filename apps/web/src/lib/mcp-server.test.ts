import { beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { randomBytes } from 'node:crypto';
import type { AuthInfo } from '@modelcontextprotocol/server';

const state = vi.hoisted(() => ({ tools: new Map<string, (input?: any) => Promise<any>>(), blob: null as Blob | null, calls: [] as { method: string; args: any[] }[], select: vi.fn(), eq: vi.fn(), responses: [] as any[], download: vi.fn(), links: vi.fn() }));
vi.mock('@/src/lib/mcp-image-links', () => ({ createMcpImageLinks: (...args: any[]) => state.links(...args) }));
vi.mock('@modelcontextprotocol/server', () => ({ McpServer: class { registerTool(name: string, _config: unknown, handler: any) { state.tools.set(name, handler); } } }));
vi.mock('@/src/lib/supabase/admin', () => ({ createAdminClient: () => ({
  from: () => { const chain: any = { then: (resolve: any) => Promise.resolve(state.responses.shift()).then(resolve) }; for (const method of ['select', 'eq', 'is', 'in', 'order', 'limit', 'range', 'ilike', 'or', 'update', 'maybeSingle']) chain[method] = (...args: any[]) => { state.calls.push({ method, args }); if (method === 'select') state.select(...args); if (method === 'eq') state.eq(...args); return chain; }; return chain; },
  storage: { from: () => ({ download: async () => { state.download(); return { data: state.blob ?? new Blob(['image'], { type: 'image/png' }), error: null }; } }) },
}) }));
import { createScreenPulseMcpServer } from './mcp-server';

describe('MCP image retrieval', () => {
  beforeEach(() => { state.blob = null; state.calls.length = 0; state.tools.clear(); state.select.mockClear(); state.eq.mockClear(); state.responses.length = 0; state.download.mockClear(); state.links.mockReset().mockImplementation(async (_user, shots) => shots.map((shot: any) => ({ screenshotId: shot.id, imageUrl: 'https://example.com/mcp/image/secret', expiresInSeconds: 7200 }))); });
  function server(scopes = ['screenshots:read']) { createScreenPulseMcpServer({ scopes, extra: { userId: 'owner' } } as unknown as AuthInfo); }
  function screenshot() { return { id: 'shot', page_url: 'https://screenpulse.local/upload', page_title: 'example.png', captured_at: '2026-11-26T00:00:00Z', storage_path: 'private/image', mime_type: 'image/png', folder_id: 'folder', analysis_description: null, user_notes: 'Personal context' }; }
  it('returns one PNG with owner filtering and excludes notes by default', async () => {
    server(); state.responses.push({ data: [screenshot()], error: null });
    const response = await state.tools.get('get_screenshot')!({ screenshotId: 'shot' });
    expect(response.content.filter((item: any) => item.type === 'image')).toHaveLength(1);
    expect(response.content[1].mimeType).toBe('image/png');
    expect(response.structuredContent.linkNotice).toContain('In your reply to the user');
    expect(response.structuredContent.linkNotice).toContain('[filename](imageUrl)');
    expect(response.structuredContent).not.toHaveProperty('userNotes');
    expect(state.select.mock.calls[0][0]).not.toContain('user_notes');
    expect(state.eq).toHaveBeenCalledWith('user_id', 'owner');
  });
  it('includes notes only on explicit request', async () => {
    server(); state.responses.push({ data: [screenshot()], error: null });
    const response = await state.tools.get('get_screenshot')!({ screenshotId: 'shot', includeNotes: true });
    expect(response.structuredContent.userNotes).toBe('Personal context');
  });
  it('rejects reads without the screenshot permission', async () => {
    server([]); const response = await state.tools.get('get_screenshot')!({ screenshotId: 'shot' });
    expect(response.isError).toBe(true); expect(state.select).not.toHaveBeenCalled();
  });
  it('returns a viewing link without downloading or encoding the image', async () => {
    server(); state.responses.push({ data: [screenshot()] });
    const response = await state.tools.get('get_screenshot')!({ screenshotId: 'shot', responseMode: 'link' });
    expect(response.structuredContent.imageUrl).toContain('/mcp/image/');
    expect(response.structuredContent.expiresInSeconds).toBe(7200);
    expect(response.structuredContent.linkNotice).toContain('[filename](imageUrl)');
    expect(response.content.every((item: any) => item.type === 'text')).toBe(true);
    expect(state.download).not.toHaveBeenCalled();
    expect(response.structuredContent).not.toHaveProperty('userNotes');
  });
  it('returns batch links in requested order without image downloads', async () => {
    server(); state.responses.push({ data: [{ ...screenshot(), id: 'second' }, screenshot()] });
    const response = await state.tools.get('get_screenshot_links')!({ screenshotIds: ['shot', 'second'] });
    expect(response.structuredContent.screenshots.map((shot: any) => shot.id)).toEqual(['shot', 'second']);
    expect(response.structuredContent.linkNotice).toContain('Keep screenshots in the returned order');
    expect(state.links).toHaveBeenCalledWith('owner', [{ id: 'shot' }, { id: 'second' }]);
    expect(state.download).not.toHaveBeenCalled();
  });
  it('does not create links when a batch contains an unavailable screenshot', async () => {
    server(); state.responses.push({ data: [screenshot()] });
    const response = await state.tools.get('get_screenshot_links')!({ screenshotIds: ['shot', 'other-owner-shot'] });
    expect(response.isError).toBe(true);
    expect(state.links).not.toHaveBeenCalled();
  });
  it('preserves analysis image content when link creation fails', async () => {
    server(); state.responses.push({ data: [screenshot()] }); state.links.mockRejectedValueOnce(new Error('offline'));
    const response = await state.tools.get('get_screenshot')!({ screenshotId: 'shot' });
    expect(response.content.some((item: any) => item.type === 'image')).toBe(true);
    expect(response.structuredContent.imageLinkError).toBeTruthy();
    expect(response.structuredContent).not.toHaveProperty('linkNotice');
  });
  it('rejects batch links without screenshot-read permission', async () => {
    server([]);
    const response = await state.tools.get('get_screenshot_links')!({ screenshotIds: ['shot'] });
    expect(response.isError).toBe(true);
    expect(state.links).not.toHaveBeenCalled();
    expect(state.select).not.toHaveBeenCalled();
  });
  it('supports a lightweight link for the latest screenshot', async () => {
    server(); state.responses.push({ data: [screenshot()] });
    const response = await state.tools.get('get_latest_screenshot')!({ responseMode: 'link' });
    expect(response.structuredContent.filename).toBe('example.png');
    expect(response.structuredContent.imageUrl).toBeTruthy();
    expect(state.download).not.toHaveBeenCalled();
  });
});


describe('MCP workflow regressions', () => {
  beforeEach(() => { state.blob = null; state.calls.length = 0; state.responses.length = 0; createScreenPulseMcpServer({ scopes: ['screenshots:read', 'screenshots:analysis:write'], extra: { userId: 'owner' } } as unknown as AuthInfo); });
  const shot = { id: 'shot', page_url: 'https://screenpulse.local/upload', page_title: 'image.png', captured_at: '2026-11-26', storage_path: 'private/image', mime_type: 'image/png', folder_id: 'folder', analysis_description: null };
  it.each(['png', 'jpeg', 'webp'] as const)('returns decodable %s image data', async (format) => {
    const bytes = await sharp({ create: { width: 100, height: 80, channels: 3, background: '#fafafa' } }).toFormat(format).toBuffer();
    state.blob = new Blob([new Uint8Array(bytes)]);
    state.responses.push({ data: [{ ...shot, mime_type: 'image/' + format }], error: null });
    const response = await state.tools.get('get_screenshot')!({ screenshotId: 'shot' });
    const image = response.content.find((item: any) => item.type === 'image');
    expect((await sharp(Buffer.from(image.data, 'base64')).metadata()).format).toBe(format);
  });
  it('processes a large PNG within the byte budget', async () => {
    const bytes = await sharp(randomBytes(1600 * 1200 * 3), { raw: { width: 1600, height: 1200, channels: 3 } }).png().toBuffer();
    state.blob = new Blob([new Uint8Array(bytes)]);
    state.responses.push({ data: [shot], error: null });
    const response = await state.tools.get('get_screenshot')!({ screenshotId: 'shot' });
    const image = response.content.find((item: any) => item.type === 'image');
    expect(Buffer.from(image.data, 'base64').length).toBeLessThanOrEqual(1024 * 1024);
    expect(response.structuredContent.imageProcessed).toBe(true);
    expect((await sharp(Buffer.from(image.data, 'base64')).metadata()).format).toBe('jpeg');
  });
  it('orders folder pages by saved position and exposes continuation', async () => {
    state.responses.push({ data: [{ id: 'folder' }] }, { data: [shot, { ...shot, id: 'next' }] });
    const response = await state.tools.get('list_screenshots')!({ folderId: 'folder', limit: 1, offset: 48, unanalyzedOnly: false });
    expect(response.structuredContent.nextOffset).toBe(49);
    expect(state.calls).toContainEqual({ method: 'order', args: ['folder_sort_order'] });
    expect(state.calls).toContainEqual({ method: 'range', args: [48, 49] });
  });
  it('rejects an ambiguous filename', async () => {
    state.responses.push({ data: [{ id: 'folder' }] }, { data: [shot, { ...shot, id: 'other' }] });
    const response = await state.tools.get('get_screenshot')!({ folderId: 'folder', filename: 'image.png' });
    expect(response.isError).toBe(true);
    expect(response.structuredContent.error).toMatch(/ambiguous/i);
  });
  it('skips existing analysis using a conditional update and keeps legacy response ID', async () => {
    state.responses.push({ data: { id: 'shot' } }, { data: null });
    const response = await state.tools.get('save_screenshot_analysis')!({ screenshotId: 'shot', description: 'Visible description' });
    expect(response.structuredContent.screenshotId).toBe('shot');
    expect(response.structuredContent.results[0].status).toBe('already_analyzed');
    expect(state.calls).toContainEqual({ method: 'is', args: ['analysis_description', null] });
  });
  it('resumes at the first remaining page', async () => {
    state.responses.push({ data: [] });
    await state.tools.get('list_unanalyzed_screenshots')!({ limit: 3 });
    expect(state.calls).toContainEqual({ method: 'range', args: [0, 3] });
    expect(state.calls).toContainEqual({ method: 'is', args: ['analysis_description', null] });
  });
});
