'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/src/lib/auth';
import { createAdminClient } from '@/src/lib/supabase/admin';
import { z } from 'zod';

export type NotesState = { error?: string; success?: string };

export async function renameScreenshot(
  formData: FormData
): Promise<{ error?: string; name?: string }> {
  const user = await requireUser();
  const screenshotId = String(formData.get('screenshotId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!z.string().uuid().safeParse(screenshotId).success)
    return { error: 'Screenshot not found.' };
  if (!name || name.length > 255 || /[\u0000-\u001f\u007f]/.test(name))
    return {
      error: 'Enter a name between 1 and 255 characters without line breaks.'
    };
  const admin = createAdminClient();
  const { data: screenshot, error: lookupError } = await admin
    .from('screenshots')
    .select('id,folder_id')
    .eq('id', screenshotId)
    .eq('user_id', user.id)
    .eq('storage_status', 'stored')
    .maybeSingle();
  if (lookupError || !screenshot)
    return { error: 'Screenshot not found or unavailable.' };
  let duplicates = admin
    .from('screenshots')
    .select('id')
    .eq('user_id', user.id)
    .eq('storage_status', 'stored')
    .neq('id', screenshotId)
    .ilike('page_title', name.replace(/[\\%_]/g, '\\$&'))
    .limit(1);
  duplicates = screenshot.folder_id
    ? duplicates.eq('folder_id', screenshot.folder_id)
    : duplicates.is('folder_id', null);
  const { data: existing, error: duplicateError } = await duplicates;
  if (duplicateError)
    return { error: 'Could not check the name. Please try again.' };
  if (existing?.length)
    return {
      error: 'A screenshot with this name already exists in this folder.'
    };
  const { data, error } = await admin
    .from('screenshots')
    .update({ page_title: name })
    .eq('id', screenshotId)
    .eq('user_id', user.id)
    .eq('storage_status', 'stored')
    .select('id');
  if (error || !data?.length)
    return { error: 'Could not save the name. Please try again.' };
  revalidatePath(`/screenshots/${screenshotId}`);
  revalidatePath('/dashboard');
  return { name };
}

export async function saveScreenshotNotes(
  _: NotesState,
  formData: FormData
): Promise<NotesState> {
  const user = await requireUser();
  const screenshotId = String(formData.get('screenshotId') ?? '');
  const notes = String(formData.get('notes') ?? '');
  if (!screenshotId) return { error: 'Screenshot not found.' };
  if (notes.length > 10000)
    return { error: 'Notes must be 10,000 characters or fewer.' };
  const { data, error } = await createAdminClient()
    .from('screenshots')
    .update({ user_notes: notes.trim() || null })
    .eq('id', screenshotId)
    .eq('user_id', user.id)
    .select('id');
  if (error || !data?.length) return { error: 'Could not save your notes.' };
  revalidatePath(`/screenshots/${screenshotId}`);
  revalidatePath('/dashboard');
  return { success: 'Notes saved.' };
}

export async function deleteScreenshot(formData: FormData) {
  const screenshotId = String(formData.get('screenshotId') ?? '');
  const user = await requireUser();
  const admin = createAdminClient();
  const { data: screenshot, error } = await admin
    .from('screenshots')
    .select('id,storage_path,folder_id')
    .eq('id', screenshotId)
    .eq('user_id', user.id)
    .single();
  if (error || !screenshot) redirect('/dashboard');

  const { error: storageError } = await admin.storage
    .from('screenshots')
    .remove([screenshot.storage_path]);
  if (storageError)
    throw new Error(
      `Could not delete the private image: ${storageError.message}`
    );
  const { error: deleteError } = await admin
    .from('screenshots')
    .delete()
    .eq('id', screenshot.id)
    .eq('user_id', user.id);
  if (deleteError)
    throw new Error(
      `Could not delete screenshot metadata: ${deleteError.message}`
    );
  if (screenshot.folder_id) {
    const { data: remaining, error: remainingError } = await admin
      .from('screenshots')
      .select('id')
      .eq('folder_id', screenshot.folder_id)
      .limit(1);
    if (!remainingError && !remaining?.length)
      await admin
        .from('screenshot_folders')
        .delete()
        .eq('id', screenshot.folder_id)
        .eq('user_id', user.id);
  }
  revalidatePath('/dashboard');
  redirect('/dashboard');
}
