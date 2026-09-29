'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/src/lib/auth';
import { createAdminClient } from '@/src/lib/supabase/admin';

export async function deleteScreenshot(formData: FormData) {
  const screenshotId = String(formData.get('screenshotId') ?? '');
  const user = await requireUser();
  const admin = createAdminClient();
  const { data: screenshot, error } = await admin.from('screenshots').select('id,storage_path').eq('id', screenshotId).eq('user_id', user.id).single();
  if (error || !screenshot) redirect('/dashboard');

  const { error: storageError } = await admin.storage.from('screenshots').remove([screenshot.storage_path]);
  if (storageError) throw new Error(`Could not delete the private image: ${storageError.message}`);
  const { error: deleteError } = await admin.from('screenshots').delete().eq('id', screenshot.id).eq('user_id', user.id);
  if (deleteError) throw new Error(`Could not delete screenshot metadata: ${deleteError.message}`);
  revalidatePath('/dashboard');
  redirect('/dashboard');
}
