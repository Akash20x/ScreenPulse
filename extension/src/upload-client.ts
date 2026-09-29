import type { PendingCapture, UploadClient } from './types';

export type UploadFailureKind = 'configuration' | 'unauthorized' | 'permanent' | 'retryable';

export class UploadError extends Error {
  constructor(message: string, readonly kind: UploadFailureKind, readonly status?: number) {
    super(message);
    this.name = 'UploadError';
  }
}

export interface UploadConnection {
  endpoint: string;
  token: string;
}

export async function postMultipartUpload(connection: UploadConnection, capture: PendingCapture): Promise<{ screenshotId?: string }> {
  const formData = new FormData();
  formData.append('screenshot', capture.image, `screenpulse-${capture.captureId}.jpg`);
  formData.append('captureId', capture.captureId);
  formData.append('capturedAt', capture.capturedAt);
  formData.append('pageUrl', capture.pageUrl);
  if (capture.pageTitle) formData.append('pageTitle', capture.pageTitle);
  formData.append('mimeType', capture.mimeType);
  const response = await post(connection, formData);
  if (response.status === 409) return {};
  if (!response.ok) throw await responseError(response);
  return readResponse(response);
}

export async function probeUploadConnection(connection: UploadConnection): Promise<void> {
  const formData = new FormData();
  formData.append('probe', 'true');
  const response = await post(connection, formData);
  if (!response.ok) throw await responseError(response);
}

async function post(connection: UploadConnection, body: FormData): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    return await fetch(connection.endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${connection.token}` },
      body,
      signal: controller.signal,
    });
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError' ? 'The upload timed out.' : 'The upload endpoint is unavailable.';
    throw new UploadError(message, 'retryable');
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponse(response: Response): Promise<{ screenshotId?: string }> {
  try {
    const body = await response.json() as { screenshotId?: unknown };
    return typeof body.screenshotId === 'string' ? { screenshotId: body.screenshotId } : {};
  } catch {
    return {};
  }
}

async function responseError(response: Response): Promise<UploadError> {
  let message = `Upload failed (${response.status}).`;
  try {
    const body = await response.json() as { message?: unknown; error?: unknown };
    if (typeof body.message === 'string') message = body.message;
    else if (typeof body.error === 'string') message = body.error;
  } catch {
    // A response body is optional.
  }
  if (response.status === 401 || response.status === 403) return new UploadError(message, 'unauthorized', response.status);
  if (response.status === 400 || response.status === 413 || response.status === 415) return new UploadError(message, 'permanent', response.status);
  return new UploadError(message, 'retryable', response.status);
}

/** Placeholder boundary for the later server-backed upload phase. */
export const localOnlyUploadClient: UploadClient = {
  async upload(_capture: PendingCapture): Promise<{ screenshotId?: string }> {
    throw new Error('Upload is not configured. Screenshots remain safely stored in this device queue.');
  },
};
