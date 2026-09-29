import type { CaptureStatus, ExtensionSettings, ScheduleSettings } from './types';

const SETTINGS_KEY = 'screenpulse-settings';
const LAST_STATUS_KEY = 'screenpulse-last-status';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  setupComplete: false,
  trackingEnabled: false,
  startDate: '',
  endDate: undefined,
  startTime: '09:00',
  endTime: '18:00',
  uploadEndpoint: undefined,
  deviceToken: undefined,
  connectionState: 'untested',
};

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined) };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function getLastStatus(): Promise<CaptureStatus | undefined> {
  const stored = await chrome.storage.local.get(LAST_STATUS_KEY);
  return stored[LAST_STATUS_KEY] as CaptureStatus | undefined;
}

export async function saveLastStatus(status: CaptureStatus): Promise<void> {
  await chrome.storage.local.set({ [LAST_STATUS_KEY]: status });
}

export function validateSchedule(schedule: ScheduleSettings): string | undefined {
  if (!isDate(schedule.startDate)) return 'Choose a valid start date.';
  if (schedule.endDate && !isDate(schedule.endDate)) return 'Choose a valid end date.';
  if (schedule.endDate && schedule.endDate < schedule.startDate) {
    return 'The end date must be on or after the start date.';
  }
  if (!isTime(schedule.startTime) || !isTime(schedule.endTime)) {
    return 'Choose valid start and end times.';
  }
  if (schedule.endTime <= schedule.startTime) {
    return 'End time must be later than start time. Overnight schedules are not supported.';
  }
  return undefined;
}

export function validateUploadEndpoint(value: string): string | undefined {
  if (!value) return 'Enter an upload endpoint.';
  try {
    const url = new URL(value);
    const isLocalhost = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    if (url.protocol === 'https:' || isLocalhost) return undefined;
  } catch {
    // Return the same safe validation message below.
  }
  return 'Use an HTTPS endpoint, or http://localhost for local development.';
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(localDate(value).getTime());
}

function isTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour = -1, minute = -1] = value.split(':').map(Number);
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60;
}

export function localDate(value: string): Date {
  const [year = Number.NaN, month = Number.NaN, day = Number.NaN] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
