'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/src/lib/auth';
import { createAdminClient } from '@/src/lib/supabase/admin';
import { createClient } from '@/src/lib/supabase/server';
import {
  fileExtensionForMimeType,
  isScreenshotMimeType,
  validateUpload
} from '@/src/lib/upload-validation';

export type UploadScreenshotState = {
  error?: string;
  success?: string;
  folderId?: string;
};

function folderName(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export async function createScreenshotFolder(
  _: UploadScreenshotState,
  formData: FormData
): Promise<UploadScreenshotState> {
  const user = await requireUser();
  const name = folderName(formData.get('name'));
  if (!name || name.length > 80)
    return { error: 'Folder names must be between 1 and 80 characters.' };
  const { data, error } = await createAdminClient().rpc(
    'create_named_screenshot_folder',
    { p_user_id: user.id, p_name: name }
  );
  if (error?.code === '23505')
    return { error: 'You already have a folder with that name.' };
  if (error) return { error: 'Could not create the folder.' };
  revalidatePath('/dashboard');
  return { success: 'Folder created.', folderId: data };
}

export async function renameScreenshotFolder(
  _: UploadScreenshotState,
  formData: FormData
): Promise<UploadScreenshotState> {
  const user = await requireUser();
  const id = String(formData.get('folderId') ?? '');
  const name = folderName(formData.get('name'));
  if (!id || !name || name.length > 80)
    return { error: 'Enter a folder name between 1 and 80 characters.' };
  const { data, error } = await createAdminClient()
    .from('screenshot_folders')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id');
  if (error?.code === '23505')
    return { error: 'You already have a folder with that name.' };
  if (error || !data?.length) return { error: 'Could not rename that folder.' };
  revalidatePath('/dashboard');
  return { success: 'Folder renamed.' };
}

export async function deleteScreenshotFolder(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get('folderId') ?? '');
  if (!id) return { error: 'Could not find that folder.' };
  const { data, error } = await createAdminClient()
    .from('screenshot_folders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id');
  if (error || !data?.length)
    return { error: 'Could not delete that folder. Please try again.' };
  revalidatePath('/dashboard');
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function uploadScreenshot(
  _: UploadScreenshotState,
  formData: FormData
): Promise<UploadScreenshotState> {
  const user = await requireUser();
  const fileValue = formData.get('screenshot');
  const screenshot = fileValue instanceof File ? fileValue : null;
  const mimeType = screenshot?.type || '';
  const captureId = randomUUID();
  const validationError = validateUpload(
    {
      captureId,
      capturedAt: new Date().toISOString(),
      pageUrl: 'https://screenpulse.local/upload',
      pageTitle: screenshot?.name || 'Uploaded screenshot',
      mimeType
    },
    screenshot
  );
  if (validationError) return { error: validationError };
  if (!isScreenshotMimeType(mimeType) || !screenshot)
    return { error: 'Choose a JPEG, PNG, or WebP screenshot.' };

  const admin = createAdminClient();
  const storagePath = `${user.id}/uploads/${captureId}.${fileExtensionForMimeType(mimeType)}`;
  const { data: inserted, error: insertError } = await admin
    .from('screenshots')
    .insert({
      user_id: user.id,
      capture_id: captureId,
      page_url: 'https://screenpulse.local/upload',
      page_title: screenshot.name || 'Uploaded screenshot',
      mime_type: mimeType,
      captured_at: new Date().toISOString(),
      storage_path: storagePath,
      storage_status: 'uploading'
    })
    .select('id')
    .single();
  if (insertError || !inserted)
    return {
      error: 'Could not prepare this screenshot for upload. Please try again.'
    };

  const { error: storageError } = await admin.storage
    .from('screenshots')
    .upload(storagePath, await screenshot.arrayBuffer(), {
      contentType: mimeType,
      upsert: false
    });
  if (storageError) {
    await admin
      .from('screenshots')
      .update({ storage_status: 'failed' })
      .eq('id', inserted.id);
    return { error: 'Could not store this screenshot. Please try again.' };
  }

  const { error: finalizeError } = await admin
    .from('screenshots')
    .update({ storage_status: 'stored' })
    .eq('id', inserted.id);
  if (finalizeError)
    return {
      error: 'Screenshot uploaded but could not be finalized. Please try again.'
    };
  revalidatePath('/dashboard');
  return { success: 'Screenshot uploaded.' };
}
