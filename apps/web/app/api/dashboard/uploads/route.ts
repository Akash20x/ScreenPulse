import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';
import { createAdminClient } from '@/src/lib/supabase/admin';
import {
  isScreenshotMimeType,
  validateUpload
} from '@/src/lib/upload-validation';
import { DASHBOARD_PAGE_SIZE } from '@/src/lib/screenshots';

export const runtime = 'nodejs';

function json(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function GET(request: Request) {
  const client = await createClient();
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) return json('Sign in to upload screenshots.', 401);
  const folderId = new URL(request.url).searchParams.get('folderId') || null;
  if (!folderId) return json('Choose a named folder.', 400);
  const admin = createAdminClient();
  if (folderId) {
    const { data: folder } = await admin
      .from('screenshot_folders')
      .select('id')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .eq('is_default', false)
      .maybeSingle();
    if (!folder) return json('Choose one of your folders.', 400);
  }
  let query = admin
    .from('screenshots')
    .select('page_title')
    .eq('user_id', user.id)
    .eq('page_url', 'https://screenpulse.local/upload')
    .eq('storage_status', 'stored');
  query = folderId
    ? query.eq('folder_id', folderId)
    : query.is('folder_id', null);
  const names: string[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await query.range(start, start + 999);
    if (error) return json('Could not check existing screenshots.', 503);
    names.push(
      ...(data ?? [])
        .map((item) => item.page_title)
        .filter((name): name is string => !!name)
    );
    if (!data || data.length < 1000) break;
  }
  return NextResponse.json({ names });
}

export async function POST(request: Request) {
  const client = await createClient();
  const {
    data: { user }
  } = await client.auth.getUser();
  if (!user) return json('Sign in to upload screenshots.', 401);
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json('Request must use multipart/form-data.', 400);
  }
  const file = formData.get('screenshot');
  const screenshot = file instanceof File ? file : null;
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
  if (validationError)
    return json(validationError, validationError.includes('5 MB') ? 413 : 400);
  if (!screenshot || !isScreenshotMimeType(mimeType))
    return json('Choose a JPEG, PNG, or WebP screenshot.', 415);
  const folderId = String(formData.get('folderId') ?? '').trim() || null;
  if (!folderId) return json('Choose a named folder.', 400);
  const referenceId = String(formData.get('referenceId') ?? '').trim();
  const position = String(formData.get('position') ?? '').trim();
  if (
    (referenceId || position) &&
    (!folderId || !referenceId || !['before', 'after'].includes(position))
  )
    return json('Choose a valid screenshot position.', 400);
  const admin = createAdminClient();
  if (folderId) {
    const { data: folder } = await admin
      .from('screenshot_folders')
      .select('id')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .eq('is_default', false)
      .maybeSingle();
    if (!folder) return json('Choose one of your folders.', 400);
  }
  if (referenceId) {
    const { data: reference, error } = await admin
      .from('screenshots')
      .select('id')
      .eq('id', referenceId)
      .eq('folder_id', folderId)
      .eq('user_id', user.id)
      .eq('storage_status', 'stored')
      .maybeSingle();
    if (error || !reference)
      return json(
        'The reference screenshot is no longer available. Refresh and try again.',
        409
      );
  }
  let duplicateQuery = admin
    .from('screenshots')
    .select('id')
    .eq('user_id', user.id)
    .eq('page_url', 'https://screenpulse.local/upload')
    .eq('storage_status', 'stored')
    .ilike('page_title', screenshot.name.replace(/[\\%_]/g, '\\$&'))
    .limit(1);
  duplicateQuery = folderId
    ? duplicateQuery.eq('folder_id', folderId)
    : duplicateQuery.is('folder_id', null);
  const { data: duplicates, error: duplicateError } = await duplicateQuery;
  if (duplicateError) return json('Could not check existing screenshots.', 503);
  if (duplicates?.length)
    return json(
      'A screenshot with this filename already exists in this folder.',
      409
    );
  const filenameKey = createHash('sha256')
    .update(JSON.stringify([folderId, screenshot.name.toLowerCase()]))
    .digest('hex');
  const storagePath = `${user.id}/uploads/names/${filenameKey}`;
  const { error: storageError } = await admin.storage
    .from('screenshots')
    .upload(storagePath, await screenshot.arrayBuffer(), {
      contentType: mimeType,
      upsert: false
    });
  if (storageError)
    return json(
      'Could not store this screenshot. A file with this name may already be uploading.',
      409
    );
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
      storage_status: 'uploading',
      folder_id: folderId
    })
    .select('id')
    .single();
  if (insertError || !inserted) {
    await admin.storage.from('screenshots').remove([storagePath]);
    return json('Could not prepare this screenshot for upload.', 503);
  }
  let itemIndex: number | null = null;
  let finalizeError;
  if (referenceId && folderId) {
    const result = await admin.rpc('place_folder_screenshot', {
      p_user_id: user.id,
      p_folder_id: folderId,
      p_screenshot_id: inserted.id,
      p_reference_id: referenceId,
      p_direction: position
    });
    itemIndex = result.data;
    finalizeError = result.error;
  } else {
    const result = await admin
      .from('screenshots')
      .update({ storage_status: 'stored' })
      .eq('id', inserted.id);
    finalizeError = result.error;
  }
  if (finalizeError) {
    await admin.storage.from('screenshots').remove([storagePath]);
    await admin.from('screenshots').delete().eq('id', inserted.id);
    return json('Screenshot could not be finalized. Please retry.', 503);
  }
  return NextResponse.json(
    {
      screenshotId: inserted.id,
      page:
        itemIndex === null ? null : Math.floor(itemIndex / DASHBOARD_PAGE_SIZE)
    },
    { status: 201 }
  );
}
