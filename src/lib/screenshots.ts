import { createAdminClient } from '@/src/lib/supabase/admin';

export type GalleryScreenshot = {
  id: string;
  page_url: string;
  page_title: string | null;
  captured_at: string;
  storage_path: string;
  analysis_description: string | null;
  analysis_provider: string | null;
  analysis_status: string | null;
  analyzed_at: string | null;
  imageUrl: string;
};

export async function listUserScreenshots(userId: string): Promise<GalleryScreenshot[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('screenshots')
    .select('id,page_url,page_title,captured_at,storage_path,analysis_description,analysis_provider,analysis_status,analyzed_at')
    .eq('user_id', userId)
    .eq('storage_status', 'stored')
    .order('captured_at', { ascending: false });
  if (error) throw error;

  return Promise.all((data ?? []).map(async (screenshot) => {
    const { data: signed, error: signedError } = await admin.storage
      .from('screenshots')
      .createSignedUrl(screenshot.storage_path, 60 * 10);
    if (signedError) throw signedError;
    return { ...screenshot, imageUrl: signed.signedUrl };
  }));
}
