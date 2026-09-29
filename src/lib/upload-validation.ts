export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const SCREENSHOT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ScreenshotMimeType = (typeof SCREENSHOT_MIME_TYPES)[number];

export type UploadFields = {
  captureId: string;
  capturedAt: string;
  pageUrl: string;
  pageTitle: string;
  mimeType: string;
};

export function isScreenshotMimeType(value: string): value is ScreenshotMimeType {
  return SCREENSHOT_MIME_TYPES.includes(value as ScreenshotMimeType);
}

export function fileExtensionForMimeType(mimeType: ScreenshotMimeType) {
  return mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
}

export function validateUpload(fields: UploadFields, screenshot: File | null): string | null {
  if (!screenshot) return 'screenshot is required.';
  if (!fields.captureId.trim()) return 'captureId is required.';
  if (Number.isNaN(Date.parse(fields.capturedAt))) return 'capturedAt must be an ISO timestamp.';
  try {
    const url = new URL(fields.pageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return 'pageUrl must use HTTP or HTTPS.';
  } catch {
    return 'pageUrl must be a valid URL.';
  }
  if (!isScreenshotMimeType(fields.mimeType) || screenshot.type !== fields.mimeType) return 'Only JPEG, PNG, and WebP screenshots are accepted.';
  if (screenshot.size === 0) return 'screenshot must not be empty.';
  if (screenshot.size > MAX_SCREENSHOT_BYTES) return 'screenshot exceeds the 5 MB limit.';
  return null;
}
