import { createAdminClient } from '@/src/lib/supabase/admin';
import type { ScreenshotView } from '@/src/lib/screenshots';

const WINDOW_RADIUS = 3;

export type ContextScreenshot = {
  id: string;
  page_url: string;
  page_title: string | null;
  folder_id: string | null;
  folder: { id: string; name: string } | null;
  captured_at: string;
  storage_path: string;
  user_notes: string | null;
  analysis_description: string | null;
  analysis_provider: string | null;
  analyzed_at: string | null;
  imageUrl: string;
};

export type ScreenshotContext = {
  items: ContextScreenshot[];
  currentIndex: number;
  previousId?: string;
  nextId?: string;
};

type ContextRow = Omit<ContextScreenshot, 'imageUrl' | 'folder'>;

export function contextWindow<T extends { id: string }>(
  items: T[],
  currentId: string,
  radius = WINDOW_RADIUS
) {
  const currentIndex = items.findIndex((item) => item.id === currentId);
  if (currentIndex < 0) return null;
  const start = Math.max(0, currentIndex - radius);
  const end = Math.min(items.length, currentIndex + radius + 1);
  return {
    items: items.slice(start, end),
    currentIndex: currentIndex - start,
    previousId: items[start - 1]?.id,
    nextId: items[end]?.id
  };
}

export async function loadScreenshotContext(
  userId: string,
  currentId: string,
  view: ScreenshotView
): Promise<ScreenshotContext | null> {
  const admin = createAdminClient();
  let query = admin
    .from('screenshots')
    .select(
      'id,page_url,page_title,folder_id,captured_at,storage_path,user_notes,analysis_description,analysis_provider,analyzed_at'
    )
    .eq('user_id', userId)
    .eq('storage_status', 'stored');
  if (view.kind === 'folder')
    query = query.eq('folder_id', view.folderId ?? '');
  if (view.kind === 'unfiled') query = query.is('folder_id', null);
  query =
    view.kind === 'folder'
      ? query.order('folder_sort_order', { ascending: true })
      : query.order('captured_at', { ascending: false });
  const { data, error } = await query.order('id', { ascending: false });
  if (error) throw error;
  const window = contextWindow((data ?? []) as ContextRow[], currentId);
  if (!window) return null;
  const folderIds = [
    ...new Set(
      window.items
        .map((item) => item.folder_id)
        .filter((id): id is string => !!id)
    )
  ];
  const folders = new Map<string, { id: string; name: string }>();
  if (folderIds.length) {
    const { data: folderRows, error: folderError } = await admin
      .from('screenshot_folders')
      .select('id,name,is_default')
      .eq('user_id', userId)
      .in('id', folderIds);
    if (folderError) throw folderError;
    for (const folder of folderRows ?? [])
      folders.set(folder.id, {
        id: folder.id,
        name: folder.is_default ? 'Unfiled' : folder.name
      });
  }
  const items = await Promise.all(
    window.items.map(async (item) => {
      const { data: signed, error: signedError } = await admin.storage
        .from('screenshots')
        .createSignedUrl(item.storage_path, 60 * 10);
      if (signedError) throw signedError;
      return {
        ...item,
        folder: item.folder_id ? (folders.get(item.folder_id) ?? null) : null,
        imageUrl: signed.signedUrl
      };
    })
  );
  return { ...window, items };
}
