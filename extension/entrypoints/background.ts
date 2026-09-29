import { defineBackground } from 'wxt/sandbox';
import { captureActivePage } from '../src/capture';
import { configureNextAlarm } from '../src/alarm';
import { getPendingCount, getUploadSummary } from '../src/queue';
import { isCaptureAllowedNow } from '../src/schedule';
import { getSettings, saveLastStatus } from '../src/settings';
import { CAPTURE_ALARM, CAPTURE_ORIGINS, type CaptureStatus } from '../src/types';
import { retryUploads } from '../src/upload-manager';

let captureInProgress = false;

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(async () => {
    const settings = await getSettings();
    if (!settings.setupComplete) await chrome.runtime.openOptionsPage();
    await configureNextAlarm();
  });

  chrome.runtime.onStartup.addListener(() => void configureNextAlarm());

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === CAPTURE_ALARM) void handleScheduledCapture();
  });

  chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
    if (message.type === 'capture-now') {
      void handleManualCapture().then(sendResponse);
      return true;
    }
    if (message.type === 'pause') {
      void pauseTracking().then(sendResponse);
      return true;
    }
    if (message.type === 'status') {
      void getRuntimeStatus().then(sendResponse);
      return true;
    }
    if (message.type === 'retry-uploads') {
      void retryUploads().then(sendResponse);
      return true;
    }
  });
});

async function handleScheduledCapture(): Promise<CaptureStatus> {
  if (captureInProgress) return recordStatus('skipped', 'A screenshot is already being captured.');
  captureInProgress = true;
  try {
    const settings = await getSettings();
    const hasPermission = await chrome.permissions.contains({ origins: CAPTURE_ORIGINS });
    if (!hasPermission) return recordStatus('skipped', 'Website-capture permission is not granted.');
    if (!isCaptureAllowedNow(settings)) return recordStatus('idle', 'No active capture window right now.');
    return await captureActivePage('automatic');
  } finally {
    captureInProgress = false;
    await configureNextAlarm();
  }
}

async function handleManualCapture(): Promise<CaptureStatus> {
  const settings = await getSettings();
  const hasPermission = await chrome.permissions.contains({ origins: CAPTURE_ORIGINS });
  if (!settings.trackingEnabled) return recordStatus('skipped', 'Enable tracking before capturing a screenshot.');
  if (!hasPermission) return recordStatus('skipped', 'Website-capture permission is not granted.');
  if (captureInProgress) return recordStatus('skipped', 'A screenshot is already being captured.');
  captureInProgress = true;
  try {
    return await captureActivePage('manual');
  } finally {
    captureInProgress = false;
  }
}

async function pauseTracking(): Promise<void> {
  const settings = await getSettings();
  await chrome.storage.local.set({ 'screenpulse-settings': { ...settings, trackingEnabled: false } });
  await chrome.alarms.clear(CAPTURE_ALARM);
  await recordStatus('idle', 'Tracking is paused.');
}

async function getRuntimeStatus() {
  const [settings, pendingCount, uploadSummary, alarm] = await Promise.all([
    getSettings(),
    getPendingCount(),
    getUploadSummary(),
    chrome.alarms.get(CAPTURE_ALARM),
  ]);
  return { settings, pendingCount, uploadSummary, nextCaptureAt: alarm?.scheduledTime };
}

async function recordStatus(outcome: CaptureStatus['outcome'], message: string): Promise<CaptureStatus> {
  const status: CaptureStatus = { outcome, message, capturedAt: new Date().toISOString() };
  await saveLastStatus(status);
  return status;
}
