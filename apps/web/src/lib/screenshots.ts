import { createAdminClient } from '@/src/lib/supabase/admin';

export type GalleryScreenshot = {
  id: string;
  page_url: string;
  page_title: string | null;
  captured_at: string;
  storage_path: string;
  folder_id: string | null;
  user_notes: string | null;
  analysis_description: string | null;
  analysis_provider: string | null;
  analysis_status: string | null;
  analyzed_at: string | null;
  imageUrl: string;
};

export const DASHBOARD_PAGE_SIZE = 48;
export type ScreenshotView = {
  kind: 'all' | 'unfiled' | 'folder';
  folderId?: string;
};
export type ScreenshotPage = {
  screenshots: GalleryScreenshot[];
  hasMore: boolean;
};

export async function listUserScreenshots(
  userId: string,
  view: ScreenshotView,
  page = 0
): Promise<ScreenshotPage> {
  const admin = createAdminClient();
  let query = admin
    .from('screenshots')
    .select(
      'id,page_url,page_title,captured_at,storage_path,folder_id,user_notes,analysis_description,analysis_provider,analysis_status,analyzed_at'
    )
    .eq('user_id', userId)
    .eq('storage_status', 'stored');
  if (view.kind === 'unfiled') query = query.is('folder_id', null);
  if (view.kind === 'folder')
    query = query.eq('folder_id', view.folderId ?? '');
  query =
    view.kind === 'folder'
      ? query.order('folder_sort_order', { ascending: true })
      : query.order('captured_at', { ascending: false });
  const { data, error } = await query
    .order('id', { ascending: false })
    .range(page * DASHBOARD_PAGE_SIZE, (page + 1) * DASHBOARD_PAGE_SIZE);
  if (error) throw error;

  const rows = data ?? [];
  const screenshots = await Promise.all(
    rows.slice(0, DASHBOARD_PAGE_SIZE).map(async (screenshot) => {
      const { data: signed, error: signedError } = await admin.storage
        .from('screenshots')
        .createSignedUrl(screenshot.storage_path, 60 * 10);
      if (signedError) throw signedError;
      return { ...screenshot, imageUrl: signed.signedUrl };
    })
  );
  return { screenshots, hasMore: rows.length > DASHBOARD_PAGE_SIZE };
}
