import { addPendingCapture, QueueFullError } from './queue';
import { saveLastStatus } from './settings';
import type { CaptureStatus, PendingCapture } from './types';
import { uploadCapture } from './upload-manager';

export type CaptureReason = 'automatic' | 'manual';

export async function captureActivePage(reason: CaptureReason): Promise<CaptureStatus> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const eligibility = captureEligibility(tab);
    if (!tab || eligibility) return saveOutcome('skipped', eligibility || 'No active Chrome tab is available.');

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 70 });
    const now = new Date().toISOString();
    const capture: PendingCapture = {
      captureId: crypto.randomUUID(),
      image: await (await fetch(dataUrl)).blob(),
      mimeType: 'image/jpeg',
      pageUrl: tab.url!,
      pageTitle: tab.title || undefined,
      capturedAt: now,
      createdAt: now,
      status: 'pending',
      uploadAttempts: 0,
    };
    await addPendingCapture(capture);
    const upload = await uploadCapture(capture);
    return saveOutcome('captured', `${reason === 'manual' ? 'Manual' : 'Scheduled'} screenshot: ${upload.message}`, capture.captureId);
  } catch (error) {
    if (error instanceof QueueFullError) return saveOutcome('queue-full', error.message);
    return saveOutcome('failed', error instanceof Error ? error.message : 'Screenshot capture failed.');
  }
}

export function captureEligibility(tab: chrome.tabs.Tab | undefined): string | undefined {
  if (!tab?.id || tab.windowId === chrome.windows.WINDOW_ID_NONE) return 'No active Chrome tab is available.';
  if (tab.incognito) return 'Incognito tabs are never captured.';
  if (!tab.url) return 'This tab does not have a capturable URL.';
  try {
    const protocol = new URL(tab.url).protocol;
    if (protocol !== 'https:' && protocol !== 'http:') return 'Only normal HTTP and HTTPS webpages are captured.';
  } catch {
    return 'This tab does not have a valid webpage URL.';
  }
  return undefined;
}

async function saveOutcome(outcome: CaptureStatus['outcome'], message: string, captureId?: string): Promise<CaptureStatus> {
  const status: CaptureStatus = { outcome, message, capturedAt: new Date().toISOString(), captureId };
  await saveLastStatus(status);
  return status;
}
