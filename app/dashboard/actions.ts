'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/src/lib/auth';
import { createAdminClient } from '@/src/lib/supabase/admin';
import { createClient } from '@/src/lib/supabase/server';
import { fileExtensionForMimeType, isScreenshotMimeType, validateUpload } from '@/src/lib/upload-validation';

export type UploadScreenshotState = { error?: string; success?: string };

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function uploadScreenshot(_: UploadScreenshotState, formData: FormData): Promise<UploadScreenshotState> {
  const user = await requireUser();
  const fileValue = formData.get('screenshot');
  const screenshot = fileValue instanceof File ? fileValue : null;
  const mimeType = screenshot?.type || '';
  const captureId = randomUUID();
  const validationError = validateUpload({
    captureId,
    capturedAt: new Date().toISOString(),
    pageUrl: 'https://screenpulse.local/upload',
    pageTitle: screenshot?.name || 'Uploaded screenshot',
    mimeType,
  }, screenshot);
  if (validationError) return { error: validationError };
  if (!isScreenshotMimeType(mimeType) || !screenshot) return { error: 'Choose a JPEG, PNG, or WebP screenshot.' };

  const admin = createAdminClient();
  const storagePath = `${user.id}/uploads/${captureId}.${fileExtensionForMimeType(mimeType)}`;
  const { data: inserted, error: insertError } = await admin.from('screenshots').insert({
    user_id: user.id,
    device_id: null,
    capture_id: captureId,
    page_url: 'https://screenpulse.local/upload',
    page_title: screenshot.name || 'Uploaded screenshot',
    mime_type: mimeType,
    captured_at: new Date().toISOString(),
    storage_path: storagePath,
    storage_status: 'uploading',
  }).select('id').single();
  if (insertError || !inserted) return { error: 'Could not prepare this screenshot for upload. Please try again.' };

  const { error: storageError } = await admin.storage.from('screenshots').upload(storagePath, await screenshot.arrayBuffer(), { contentType: mimeType, upsert: false });
  if (storageError) {
    await admin.from('screenshots').update({ storage_status: 'failed' }).eq('id', inserted.id);
    return { error: 'Could not store this screenshot. Please try again.' };
  }

  const { error: finalizeError } = await admin.from('screenshots').update({ storage_status: 'stored' }).eq('id', inserted.id);
  if (finalizeError) return { error: 'Screenshot uploaded but could not be finalized. Please try again.' };
  revalidatePath('/dashboard');
  return { success: 'Screenshot uploaded.' };
}
