import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/src/lib/supabase/admin';
import { fileExtensionForMimeType, isScreenshotMimeType, validateUpload } from '@/src/lib/upload-validation';

export const runtime = 'nodejs';

function json(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

function bearerToken(request: Request) {
  const value = request.headers.get('authorization');
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function sameHash(left: string, right: string) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const token = bearerToken(request);
  if (!token) return json('A Bearer device token is required.', 401);

  const admin = createAdminClient();
  const hash = tokenHash(token);
  const { data: device, error: deviceError } = await admin
    .from('devices')
    .select('id,user_id,token_hash')
    .eq('token_hash', hash)
    .is('revoked_at', null)
    .maybeSingle();
  if (deviceError) return json('Could not validate the device token.', 503);
  if (!device || !sameHash(hash, device.token_hash)) return json('The device token is invalid or revoked.', 401);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json('Request must use multipart/form-data.', 400);
  }

  if (formData.get('probe') === 'true') {
    return NextResponse.json({ ok: true });
  }

  const screenshotValue = formData.get('screenshot');
  const screenshot = screenshotValue instanceof File ? screenshotValue : null;
  const fields = {
    captureId: String(formData.get('captureId') ?? ''),
    capturedAt: String(formData.get('capturedAt') ?? ''),
    pageUrl: String(formData.get('pageUrl') ?? ''),
    pageTitle: String(formData.get('pageTitle') ?? ''),
    mimeType: String(formData.get('mimeType') ?? ''),
  };
  const validationError = validateUpload(fields, screenshot);
  if (validationError) {
    const status = validationError.includes('5 MB') ? 413 : validationError.includes('Only image') ? 415 : 400;
    return json(validationError, status);
  }
  if (!isScreenshotMimeType(fields.mimeType)) return json('Unsupported screenshot format.', 415);

  const storagePath = `${device.user_id}/${device.id}/${fields.captureId}.${fileExtensionForMimeType(fields.mimeType)}`;
  const { data: existing } = await admin
    .from('screenshots')
    .select('id,storage_status')
    .eq('user_id', device.user_id)
    .eq('device_id', device.id)
    .eq('capture_id', fields.captureId)
    .maybeSingle();
  if (existing?.storage_status === 'stored') {
    return NextResponse.json({ screenshotId: existing.id, error: 'This capture is already stored.' }, { status: 409 });
  }

  let screenshotId = existing?.id;
  if (existing?.storage_status === 'failed') {
    const { error: retryError } = await admin.from('screenshots')
      .update({ storage_status: 'uploading' })
      .eq('id', existing.id)
      .eq('storage_status', 'failed');
    if (retryError) return json('Could not resume this capture upload.', 503);
  }
  if (!existing) {
    const { data: inserted, error: insertError } = await admin.from('screenshots').insert({
      user_id: device.user_id,
      device_id: device.id,
      capture_id: fields.captureId,
      page_url: fields.pageUrl,
      page_title: fields.pageTitle || null,
      mime_type: fields.mimeType,
      captured_at: new Date(fields.capturedAt).toISOString(),
      storage_path: storagePath,
      storage_status: 'uploading',
    }).select('id').single();
    if (insertError?.code === '23505') {
      const { data: duplicate } = await admin.from('screenshots').select('id,storage_status').eq('user_id', device.user_id).eq('device_id', device.id).eq('capture_id', fields.captureId).maybeSingle();
      if (duplicate?.storage_status === 'stored') return NextResponse.json({ screenshotId: duplicate.id, error: 'This capture is already stored.' }, { status: 409 });
      return json('The same capture is being finalized; retry shortly.', 503);
    }
    if (insertError || !inserted) return json('Could not reserve this capture.', 503);
    screenshotId = inserted.id;
  }

  const { error: uploadError } = await admin.storage.from('screenshots').upload(storagePath, await screenshot!.arrayBuffer(), { contentType: fields.mimeType, upsert: false });
  // A deterministic path means an existing object can only be an interrupted retry for this same authenticated capture.
  const objectAlreadyExists = Boolean(uploadError?.message.toLowerCase().includes('already exists'));
  if (uploadError && !objectAlreadyExists) {
    await admin.from('screenshots').update({ storage_status: 'failed' }).eq('id', screenshotId);
    return json('Could not store the screenshot; retry this capture.', 503);
  }

  const { error: finalizeError } = await admin.from('screenshots').update({ storage_status: 'stored' }).eq('id', screenshotId).eq('storage_status', 'uploading');
  if (finalizeError) return json('Screenshot was received but could not be finalized; retry this capture.', 503);
  return NextResponse.json({ screenshotId }, { status: 201 });
}
