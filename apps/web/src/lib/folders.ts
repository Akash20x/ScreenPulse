import { createAdminClient } from '@/src/lib/supabase/admin';

export type ScreenshotFolder = {
  id: string;
  name: string;
  created_at: string;
  screenshotCount: number;
  is_default?: boolean;
};
export type FolderLibrary = {
  folders: ScreenshotFolder[];
  totalCount: number;
  unfiledCount: number;
};

export async function listUserScreenshotFolders(
  userId: string
): Promise<FolderLibrary> {
  const admin = createAdminClient();
  const { error: defaultError } = await admin.rpc(
    'ensure_default_screenshot_folder',
    { p_user_id: userId }
  );
  if (defaultError) throw defaultError;
  const [{ data, error }, { data: screenshots, error: countError }] =
    await Promise.all([
      admin
        .from('screenshot_folders')
        .select('id,name,created_at,is_default')
        .eq('user_id', userId)
        .order('name'),
      admin.from('screenshots').select('folder_id').eq('user_id', userId)
    ]);
  if (error || countError) throw error ?? countError;
  const counts = new Map<string, number>();
  let unfiledCount = 0;
  for (const screenshot of screenshots ?? []) {
    if (screenshot.folder_id)
      counts.set(
        screenshot.folder_id,
        (counts.get(screenshot.folder_id) ?? 0) + 1
      );
    else unfiledCount += 1;
  }
  return {
    folders: (data ?? []).map((folder) => ({
      ...folder,
      name: folder.is_default ? 'Unfiled' : folder.name,
      screenshotCount: counts.get(folder.id) ?? 0
    })),
    totalCount: (screenshots ?? []).length,
    unfiledCount
  };
}
