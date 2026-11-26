import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ responses: [] as any[], calls: [] as { table: string; method: string; args: any[] }[] }));
vi.mock('@/src/lib/supabase/admin', () => ({ createAdminClient: () => ({
  from(table: string) {
    const chain: any = { then: (resolve: any) => Promise.resolve(state.responses.shift()).then(resolve) };
    for (const method of ['select', 'eq', 'is', 'in', 'order']) chain[method] = (...args: any[]) => { state.calls.push({ table, method, args }); return chain; };
    return chain;
  },
  storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: 'https://image.example' } }) }) },
}) }));
import { contextWindow, loadScreenshotContext } from './screenshot-context';

describe('screenshot context window', () => {
  const items = Array.from({ length: 10 }, (_, index) => ({ id: String(index) }));

  it('loads three screenshots on each side of the current item', () => {
    const context = contextWindow(items, '5');
    expect(context?.items.map((item) => item.id)).toEqual(['2', '3', '4', '5', '6', '7', '8']);
    expect(context?.currentIndex).toBe(3);
    expect(context?.previousId).toBe('1');
    expect(context?.nextId).toBe('9');
  });

  it('uses the available screenshots at collection boundaries', () => {
    expect(contextWindow(items, '0')).toMatchObject({ currentIndex: 0, previousId: undefined, nextId: '4' });
    expect(contextWindow(items, '9')).toMatchObject({ currentIndex: 3, previousId: '5', nextId: undefined });
  });
});

describe('screenshot folder labels', () => {
  beforeEach(() => { state.responses.length = 0; state.calls.length = 0; });
  it('returns each image’s actual owner-scoped folder when browsing All', async () => {
    state.responses.push({ data: [{ id: 'one', folder_id: 'ideas' }, { id: 'two', folder_id: 'work' }] }, { data: [{ id: 'ideas', name: 'Ideas', is_default: false }, { id: 'work', name: 'Work', is_default: false }] });
    const context = await loadScreenshotContext('owner', 'one', { kind: 'all' });
    expect(context?.items.map((item) => item.folder?.name)).toEqual(['Ideas', 'Work']);
    expect(state.calls).toContainEqual({ table: 'screenshot_folders', method: 'eq', args: ['user_id', 'owner'] });
    expect(state.calls).toContainEqual({ table: 'screenshot_folders', method: 'in', args: ['id', ['ideas', 'work']] });
  });
  it('labels the built-in folder Unfiled', async () => {
    state.responses.push({ data: [{ id: 'one', folder_id: 'default' }] }, { data: [{ id: 'default', name: 'Internal name', is_default: true }] });
    const context = await loadScreenshotContext('owner', 'one', { kind: 'all' });
    expect(context?.items[0].folder).toEqual({ id: 'default', name: 'Unfiled' });
  });
  it('keeps legacy unfiled screenshots accessible without a folder lookup', async () => {
    state.responses.push({ data: [{ id: 'one', folder_id: null }] });
    const context = await loadScreenshotContext('owner', 'one', { kind: 'unfiled' });
    expect(context?.items[0].folder).toBeNull();
    expect(state.calls.some((call) => call.table === 'screenshot_folders')).toBe(false);
  });
});
