import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  responses: [] as any[],
  inserted: vi.fn(),
  uploaded: vi.fn(),
  rpc: vi.fn(),
  user: { id: 'owner' } as { id: string } | null
}));
vi.mock('@/src/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) }
  })
}));
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
        'is',
        'ilike',
        'limit',
        'insert',
        'update',
        'single',
        'maybeSingle'
      ])
        chain[method] = (...args: any[]) => {
          if (method === 'insert') state.inserted(...args);
          return chain;
        };
      return chain;
    },
    rpc: state.rpc,
    storage: { from: () => ({ upload: state.uploaded, remove: vi.fn() }) }
  })
}));
import { POST } from '../../app/api/dashboard/uploads/route';

function request(reference = false) {
  const data = new FormData();
  data.set(
    'screenshot',
    new File(['image'], 'notes.png', { type: 'image/png' })
  );
  data.set('folderId', 'folder');
  if (reference) {
    data.set('referenceId', 'previous-image');
    data.set('position', 'after');
  }
  return new Request('https://screenpulse.example/api/dashboard/uploads', {
    method: 'POST',
    body: data
  });
}
beforeEach(() => {
  state.responses.length = 0;
  state.inserted.mockClear();
  state.uploaded.mockReset().mockResolvedValue({ error: null });
  state.rpc.mockReset().mockResolvedValue({ data: 2, error: null });
  state.user = { id: 'owner' };
});

describe('manual uploads without device records', () => {
  it('uploads into an owned folder without inserting a removed device column', async () => {
    state.responses.push(
      { data: { id: 'folder' } },
      { data: [] },
      { data: { id: 'image' } },
      { error: null }
    );
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ screenshotId: 'image' });
    expect(state.inserted.mock.calls[0][0]).not.toHaveProperty('device_id');
    expect(state.inserted.mock.calls[0][0]).toMatchObject({
      user_id: 'owner',
      folder_id: 'folder',
      page_title: 'notes.png',
      mime_type: 'image/png'
    });
  });
  it('keeps the same-folder duplicate check and does not repeat uploads', async () => {
    state.responses.push(
      { data: { id: 'folder' } },
      { data: [{ id: 'existing' }] }
    );
    expect((await POST(request())).status).toBe(409);
    expect(state.uploaded).not.toHaveBeenCalled();
    expect(state.inserted).not.toHaveBeenCalled();
  });
  it('preserves insertion after a selected screenshot', async () => {
    state.responses.push(
      { data: { id: 'folder' } },
      { data: { id: 'previous-image' } },
      { data: [] },
      { data: { id: 'image' } }
    );
    expect((await POST(request(true))).status).toBe(201);
    expect(state.rpc).toHaveBeenCalledWith('place_folder_screenshot', {
      p_user_id: 'owner',
      p_folder_id: 'folder',
      p_screenshot_id: 'image',
      p_reference_id: 'previous-image',
      p_direction: 'after'
    });
  });
  it('requires a signed-in user and an owned folder', async () => {
    state.user = null;
    expect((await POST(request())).status).toBe(401);
    state.user = { id: 'owner' };
    state.responses.push({ data: null });
    expect((await POST(request())).status).toBe(400);
    expect(state.uploaded).not.toHaveBeenCalled();
  });
});
