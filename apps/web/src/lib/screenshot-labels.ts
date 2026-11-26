const MANUAL_UPLOAD_URL = 'https://screenpulse.local/upload';

export function screenshotSourceDomain(pageUrl: string): string | null {
  if (pageUrl === MANUAL_UPLOAD_URL) return null;
  try {
    return new URL(pageUrl).hostname;
  } catch {
    return pageUrl;
  }
}

export function screenshotDisplayTitle(
  title: string | null,
  pageUrl: string
): string {
  return title?.trim() || screenshotSourceDomain(pageUrl) || 'Screenshot';
}
