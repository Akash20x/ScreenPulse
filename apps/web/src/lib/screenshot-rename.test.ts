import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  responses: [] as any[],
  calls: [] as { method: string; args: any[] }[],
  revalidate: vi.fn()
}));
vi.mock('@/src/lib/auth', () => ({
  requireUser: async () => ({ id: 'owner' })
}));
vi.mock('next/cache', () => ({ revalidatePath: state.revalidate }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/src/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      const chain: any = {
        then: (resolve: any) =>
          Promise.resolve(state.responses.shift()).then(resolve)
      };
      for (const method of [
        'select',
        'eq',
        'neq',
        'is',
        'ilike',
        'limit',
        'maybeSingle',
        'update'
      ])
        chain[method] = (...args: any[]) => {
          state.calls.push({ method, args });
          return chain;
        };
      return chain;
    }
  })
}));
import { renameScreenshot } from '../../app/screenshots/[id]/actions';

const id = '123e4567-e89b-42d3-a456-426614174000';
function form(name: string, screenshotId = id) {
  const data = new FormData();
  data.set('screenshotId', screenshotId);
  data.set('name', name);
  return data;
}
beforeEach(() => {
  state.responses.length = 0;
  state.calls.length = 0;
  state.revalidate.mockClear();
});

describe('screenshot renaming', () => {
  it.each(['', '   ', 'line\nbreak', 'a'.repeat(256)])(
    'rejects invalid names before accessing screenshots',
    async (name) => {
      expect((await renameScreenshot(form(name))).error).toBeTruthy();
      expect(state.calls).toHaveLength(0);
    }
  );
  it('rejects invalid screenshot IDs', async () => {
    expect(
      (await renameScreenshot(form('New name', 'bad-id'))).error
    ).toBeTruthy();
    expect(state.calls).toHaveLength(0);
  });
  it('cannot rename another owner’s screenshot', async () => {
    state.responses.push({ data: null });
    expect((await renameScreenshot(form('New name'))).error).toBeTruthy();
    expect(state.calls).toContainEqual({
      method: 'eq',
      args: ['user_id', 'owner']
    });
    expect(state.calls.some((call) => call.method === 'update')).toBe(false);
  });
  it('rejects a case-insensitive name collision in the same folder', async () => {
    state.responses.push(
      { data: { id, folder_id: 'folder' } },
      { data: [{ id: 'existing' }] }
    );
    expect((await renameScreenshot(form('Existing.PNG'))).error).toContain(
      'already exists'
    );
    expect(state.calls).toContainEqual({
      method: 'eq',
      args: ['folder_id', 'folder']
    });
    expect(state.calls).toContainEqual({
      method: 'ilike',
      args: ['page_title', 'Existing.PNG']
    });
    expect(state.calls.some((call) => call.method === 'update')).toBe(false);
  });
  it('saves the trimmed name and refreshes the gallery and detail without altering the image', async () => {
    state.responses.push(
      { data: { id, folder_id: 'folder' } },
      { data: [] },
      { data: [{ id }] }
    );
    expect(await renameScreenshot(form('  Meeting notes.png  '))).toEqual({
      name: 'Meeting notes.png'
    });
    expect(state.calls).toContainEqual({
      method: 'update',
      args: [{ page_title: 'Meeting notes.png' }]
    });
    expect(
      state.calls.filter(
        (call) => call.method === 'eq' && call.args[0] === 'user_id'
      )
    ).toHaveLength(3);
    expect(state.revalidate).toHaveBeenCalledWith('/dashboard');
    expect(state.revalidate).toHaveBeenCalledWith(`/screenshots/${id}`);
  });
  it('treats wildcard characters as literal name characters', async () => {
    state.responses.push(
      { data: { id, folder_id: null } },
      { data: [] },
      { data: [{ id }] }
    );
    await renameScreenshot(form('100%_notes.png'));
    expect(state.calls).toContainEqual({
      method: 'ilike',
      args: ['page_title', '100\\%\\_notes.png']
    });
    expect(state.calls).toContainEqual({
      method: 'is',
      args: ['folder_id', null]
    });
  });
  it('reports failed writes without claiming success', async () => {
    state.responses.push(
      { data: { id, folder_id: 'folder' } },
      { data: [] },
      { data: [], error: { message: 'write failed' } }
    );
    expect((await renameScreenshot(form('New name'))).error).toBeTruthy();
    expect(state.revalidate).not.toHaveBeenCalled();
  });
});
