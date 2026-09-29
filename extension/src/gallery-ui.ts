import './ui.css';
import { clearPendingCaptures, deletePendingCapture, listPendingCaptures } from './queue';
import type { PendingCapture } from './types';

const gallery = document.querySelector<HTMLElement>('#gallery-list')!;
const emptyState = document.querySelector<HTMLElement>('#gallery-empty')!;
const summary = document.querySelector<HTMLElement>('#gallery-summary')!;
const dialog = document.querySelector<HTMLDialogElement>('#capture-dialog')!;
const detailImage = document.querySelector<HTMLImageElement>('#capture-image')!;
const detailDomain = document.querySelector<HTMLElement>('#capture-domain')!;
const detailTitle = document.querySelector<HTMLElement>('#capture-title')!;
const detailTime = document.querySelector<HTMLElement>('#capture-time')!;
const detailUploadStatus = document.querySelector<HTMLElement>('#capture-upload-status')!;
const downloadButton = document.querySelector<HTMLButtonElement>('#download-capture')!;
const deleteButton = document.querySelector<HTMLButtonElement>('#delete-capture')!;
const resetButton = document.querySelector<HTMLButtonElement>('#reset-gallery')!;

let captures: PendingCapture[] = [];
let thumbnailUrls: string[] = [];
let detailUrl: string | undefined;
let selectedCapture: PendingCapture | undefined;

void refreshGallery();

document.querySelector('#refresh-gallery')!.addEventListener('click', () => void refreshGallery());
resetButton.addEventListener('click', () => void resetGallery());
document.querySelector('#close-dialog')!.addEventListener('click', closeDialog);
dialog.addEventListener('close', revokeDetailUrl);
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

downloadButton.addEventListener('click', () => {
  if (!selectedCapture) return;
  const url = URL.createObjectURL(selectedCapture.image);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = downloadFilename(selectedCapture);
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
});

deleteButton.addEventListener('click', async () => {
  if (!selectedCapture) return;
  if (!window.confirm('Delete this screenshot permanently from this device?')) return;
  deleteButton.disabled = true;
  await deletePendingCapture(selectedCapture.captureId);
  closeDialog();
  await refreshGallery();
  deleteButton.disabled = false;
});

window.addEventListener('beforeunload', () => {
  revokeThumbnailUrls();
  revokeDetailUrl();
});

async function refreshGallery() {
  revokeThumbnailUrls();
  captures = await listPendingCaptures(20);
  gallery.replaceChildren();
  emptyState.hidden = captures.length !== 0;
  summary.textContent = captures.length
    ? `Showing ${captures.length} newest screenshot${captures.length === 1 ? '' : 's'} saved on this device.`
    : 'Your saved screenshots stay private on this device.';

  for (const capture of captures) gallery.append(createCard(capture));
}

async function resetGallery() {
  if (!window.confirm('Reset the gallery? This permanently deletes every saved screenshot from this device.')) return;
  resetButton.disabled = true;
  try {
    await clearPendingCaptures();
    closeDialog();
    await refreshGallery();
  } finally {
    resetButton.disabled = false;
  }
}

function createCard(capture: PendingCapture): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'capture-card';
  button.type = 'button';
  button.setAttribute('aria-label', `View screenshot from ${formatTime(capture.capturedAt)} on ${domainOf(capture.pageUrl)}`);
  button.addEventListener('click', () => openCapture(capture));

  const image = document.createElement('img');
  const url = URL.createObjectURL(capture.image);
  thumbnailUrls.push(url);
  image.src = url;
  image.alt = '';
  image.className = 'capture-thumbnail';

  const content = document.createElement('span');
  content.className = 'capture-card-content';
  const domain = document.createElement('strong');
  domain.textContent = domainOf(capture.pageUrl);
  const title = document.createElement('span');
  title.className = 'capture-title';
  title.textContent = capture.pageTitle || 'Untitled page';
  const time = document.createElement('span');
  time.className = 'capture-time';
  time.textContent = formatTime(capture.capturedAt);
  const status = document.createElement('span');
  status.className = `upload-badge ${uploadClass(capture.status)}`;
  status.textContent = uploadLabel(capture);
  content.append(domain, title, time, status);
  button.append(image, content);
  return button;
}

function openCapture(capture: PendingCapture) {
  selectedCapture = capture;
  revokeDetailUrl();
  detailUrl = URL.createObjectURL(capture.image);
  detailImage.src = detailUrl;
  detailDomain.textContent = domainOf(capture.pageUrl);
  detailTitle.textContent = capture.pageTitle || 'Untitled page';
  detailTime.textContent = `Captured ${formatTime(capture.capturedAt)}`;
  detailUploadStatus.className = `upload-badge ${uploadClass(capture.status)}`;
  detailUploadStatus.textContent = uploadLabel(capture);
  dialog.showModal();
}

function closeDialog() {
  if (dialog.open) dialog.close();
  selectedCapture = undefined;
}

function revokeThumbnailUrls() {
  for (const url of thumbnailUrls) URL.revokeObjectURL(url);
  thumbnailUrls = [];
}

function revokeDetailUrl() {
  if (!detailUrl) return;
  URL.revokeObjectURL(detailUrl);
  detailUrl = undefined;
  detailImage.removeAttribute('src');
}

function domainOf(url: string): string {
  try { return new URL(url).hostname; } catch { return 'Unknown site'; }
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function downloadFilename(capture: PendingCapture): string {
  const timestamp = capture.capturedAt.replace(/[:.]/g, '-');
  return `screenpulse-${timestamp}-${capture.captureId.slice(0, 8)}.jpg`;
}

function uploadClass(status: PendingCapture['status']): string {
  return `upload-${status}`;
}

function uploadLabel(capture: PendingCapture): string {
  if (capture.status === 'uploaded') return 'Uploaded';
  if (capture.status === 'failed') return capture.lastError ? `Needs attention: ${capture.lastError}` : 'Upload needs attention';
  return capture.lastError ? `Waiting to retry: ${capture.lastError}` : 'Waiting to upload';
}
