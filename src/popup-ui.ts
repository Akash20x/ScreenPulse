import './ui.css';
import { getLastStatus } from './settings';

const state = document.querySelector<HTMLElement>('#tracking-state')!;
const schedule = document.querySelector<HTMLElement>('#schedule')!;
const next = document.querySelector<HTMLElement>('#next-capture')!;
const count = document.querySelector<HTMLElement>('#queue-count')!;
const uploadSummary = document.querySelector<HTMLElement>('#upload-summary')!;
const last = document.querySelector<HTMLElement>('#last-status')!;
const capture = document.querySelector<HTMLButtonElement>('#capture-now')!;
const pause = document.querySelector<HTMLButtonElement>('#pause')!;
const retryUploads = document.querySelector<HTMLButtonElement>('#retry-uploads')!;

void refresh();

capture.addEventListener('click', async () => {
  capture.disabled = true;
  const result = await chrome.runtime.sendMessage({ type: 'capture-now' });
  last.textContent = result.message;
  capture.disabled = false;
  await refresh();
});

pause.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'pause' });
  await refresh();
});

retryUploads.addEventListener('click', async () => {
  retryUploads.disabled = true;
  const result = await chrome.runtime.sendMessage({ type: 'retry-uploads' });
  last.textContent = result.message;
  retryUploads.disabled = false;
  await refresh();
});

document.querySelector('#open-settings')!.addEventListener('click', () => void chrome.runtime.openOptionsPage());
document.querySelector('#open-gallery')!.addEventListener('click', () =>
  void chrome.tabs.create({ url: chrome.runtime.getURL('gallery.html') }),
);

async function refresh() {
  const [runtime, recent] = await Promise.all([chrome.runtime.sendMessage({ type: 'status' }), getLastStatus()]);
  const { settings, pendingCount, uploadSummary: uploads, nextCaptureAt } = runtime;
  state.textContent = settings.trackingEnabled ? 'Tracking is on' : 'Tracking is paused';
  schedule.textContent = settings.setupComplete ? `${settings.startDate}${settings.endDate ? ` – ${settings.endDate}` : ''} · ${settings.startTime}–${settings.endTime}` : 'Finish setup to create your schedule.';
  next.textContent = nextCaptureAt ? new Date(nextCaptureAt).toLocaleString() : 'No future slot';
  count.textContent = String(pendingCount);
  uploadSummary.textContent = `${uploads.uploaded} sent · ${uploads.pending + uploads.failed} waiting`;
  last.textContent = recent?.message || 'No capture activity yet.';
  capture.disabled = !settings.trackingEnabled;
  pause.hidden = !settings.trackingEnabled;
  retryUploads.disabled = uploads.pending + uploads.failed === 0;
}
