import './ui.css';
import { configureNextAlarm } from './alarm';
import { getSettings, saveSettings, toLocalDateKey, validateSchedule, validateUploadEndpoint } from './settings';
import { CAPTURE_ORIGINS } from './types';
import { connectionStateForError } from './upload-manager';
import { probeUploadConnection } from './upload-client';

const form = document.querySelector<HTMLFormElement>('#settings-form')!;
const startDate = document.querySelector<HTMLInputElement>('#start-date')!;
const endDate = document.querySelector<HTMLInputElement>('#end-date')!;
const startTime = document.querySelector<HTMLInputElement>('#start-time')!;
const endTime = document.querySelector<HTMLInputElement>('#end-time')!;
const message = document.querySelector<HTMLElement>('#form-message')!;
const title = document.querySelector<HTMLElement>('#page-title')!;
const enableButton = document.querySelector<HTMLButtonElement>('#enable-button')!;
const pauseButton = document.querySelector<HTMLButtonElement>('#pause-button')!;
const uploadEndpoint = document.querySelector<HTMLInputElement>('#upload-endpoint')!;
const deviceToken = document.querySelector<HTMLInputElement>('#device-token')!;
const connectionMessage = document.querySelector<HTMLElement>('#connection-message')!;
const testConnection = document.querySelector<HTMLButtonElement>('#test-connection')!;

void initialise();

async function initialise() {
  const settings = await getSettings();
  startDate.value = settings.startDate || toLocalDateKey(new Date());
  endDate.value = settings.endDate || '';
  startTime.value = settings.startTime;
  endTime.value = settings.endTime;
  uploadEndpoint.value = settings.uploadEndpoint || '';
  deviceToken.value = settings.deviceToken || '';
  showConnection(connectionLabel(settings.connectionState || 'untested'));
  if (settings.setupComplete) {
    title.textContent = 'Tracking settings';
    enableButton.textContent = settings.trackingEnabled ? 'Save schedule' : 'Enable tracking';
    pauseButton.hidden = !settings.trackingEnabled;
  } else {
    pauseButton.hidden = true;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const schedule = { startDate: startDate.value, endDate: endDate.value || undefined, startTime: startTime.value, endTime: endTime.value };
  const validationError = validateSchedule(schedule);
  if (validationError) return show(validationError, true);
  enableButton.disabled = true;
  const granted = await chrome.permissions.request({ origins: CAPTURE_ORIGINS });
  if (!granted) {
    enableButton.disabled = false;
    return show('Permission was not granted. Chrome must allow website capture before tracking can start.', true);
  }
  const current = await getSettings();
  await saveSettings({ ...current, ...schedule, setupComplete: true, trackingEnabled: true });
  const next = await configureNextAlarm();
  enableButton.disabled = false;
  title.textContent = 'Tracking settings';
  enableButton.textContent = 'Save schedule';
  pauseButton.hidden = false;
  show(next ? `Tracking is on. Next capture: ${next.toLocaleString()}.` : 'Tracking is on, but this date range has no future capture slots.');
});

pauseButton.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'pause' });
  pauseButton.hidden = true;
  enableButton.textContent = 'Enable tracking';
  show('Tracking is paused. Your schedule has been kept.');
});

testConnection.addEventListener('click', async () => {
  const endpoint = uploadEndpoint.value.trim();
  const token = deviceToken.value.trim();
  const validationError = validateUploadEndpoint(endpoint) || (!token ? 'Enter a device token.' : undefined);
  if (validationError) return showConnection(validationError, true);
  testConnection.disabled = true;
  const current = await getSettings();
  await saveSettings({ ...current, uploadEndpoint: endpoint, deviceToken: token, connectionState: 'untested' });
  try {
    await probeUploadConnection({ endpoint, token });
    const saved = await getSettings();
    await saveSettings({ ...saved, connectionState: 'connected' });
    showConnection('Connected. New screenshots will upload immediately after being saved locally.');
  } catch (error) {
    const saved = await getSettings();
    await saveSettings({ ...saved, connectionState: connectionStateForError(error) });
    showConnection(error instanceof Error ? error.message : 'Connection test failed.', true);
  } finally {
    testConnection.disabled = false;
  }
});

function show(text: string, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

function showConnection(text: string, isError = false) {
  connectionMessage.textContent = text;
  connectionMessage.classList.toggle('error', isError);
}

function connectionLabel(state: string): string {
  if (state === 'connected') return 'Connected. New screenshots upload immediately.';
  if (state === 'unauthorized') return 'Your device token was rejected. Update it and test again.';
  if (state === 'unavailable') return 'The upload endpoint is currently unavailable.';
  if (state === 'invalid') return 'The connection settings need attention.';
  return 'Not tested yet. Local screenshots remain private on this device.';
}
