import { listPendingCaptures, updatePendingCapture } from './queue';
import { getSettings } from './settings';
import type { ConnectionState, PendingCapture } from './types';
import { UploadError, postMultipartUpload } from './upload-client';

export async function uploadCapture(capture: PendingCapture): Promise<{ uploaded: boolean; message: string }> {
  const settings = await getSettings();
  if (!settings.uploadEndpoint || !settings.deviceToken) {
    await updatePendingCapture(capture.captureId, { status: 'pending', lastError: 'Upload connection is not configured.' });
    return { uploaded: false, message: 'Saved locally. Upload connection is not configured.' };
  }

  const attemptedAt = new Date().toISOString();
  try {
    const result = await postMultipartUpload({ endpoint: settings.uploadEndpoint, token: settings.deviceToken }, capture);
    await updatePendingCapture(capture.captureId, {
      status: 'uploaded',
      uploadAttempts: capture.uploadAttempts + 1,
      lastAttemptAt: attemptedAt,
      lastError: undefined,
      uploadedAt: attemptedAt,
      serverScreenshotId: result.screenshotId,
    });
    return { uploaded: true, message: 'Saved locally and uploaded.' };
  } catch (error) {
    const uploadError = error instanceof UploadError ? error : new UploadError('The upload endpoint is unavailable.', 'retryable');
    await updatePendingCapture(capture.captureId, {
      status: uploadError.kind === 'retryable' ? 'pending' : 'failed',
      uploadAttempts: capture.uploadAttempts + 1,
      lastAttemptAt: attemptedAt,
      lastError: uploadError.message,
    });
    return { uploaded: false, message: `Saved locally. ${uploadError.message}` };
  }
}

export async function retryUploads(): Promise<{ attempted: number; uploaded: number; message: string }> {
  const captures = await listPendingCaptures(100);
  const retryable = captures.filter((capture) => capture.status !== 'uploaded');
  let uploaded = 0;
  for (const capture of retryable) {
    const result = await uploadCapture(capture);
    if (result.uploaded) uploaded += 1;
  }
  return {
    attempted: retryable.length,
    uploaded,
    message: retryable.length ? `Uploaded ${uploaded} of ${retryable.length} queued screenshot${retryable.length === 1 ? '' : 's'}.` : 'There are no local uploads waiting to retry.',
  };
}

export function connectionStateForError(error: unknown): ConnectionState {
  if (error instanceof UploadError) {
    if (error.kind === 'unauthorized') return 'unauthorized';
    if (error.kind === 'retryable') return 'unavailable';
  }
  return 'invalid';
}
