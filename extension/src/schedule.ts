import { CAPTURE_INTERVAL_MINUTES, type ExtensionSettings } from './types';
import { localDate, toLocalDateKey, validateSchedule } from './settings';

const MINUTE_MS = 60_000;

export function isCaptureAllowedNow(settings: ExtensionSettings, now = new Date()): boolean {
  if (!settings.setupComplete || !settings.trackingEnabled || validateSchedule(settings)) return false;
  const date = toLocalDateKey(now);
  const endDate = settings.endDate || settings.startDate;
  if (date < settings.startDate || date > endDate) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= timeToMinutes(settings.startTime)
    && currentMinutes < timeToMinutes(settings.endTime);
}

/** Returns the next scheduled capture strictly after `after`. */
export function nextCaptureAt(settings: ExtensionSettings, after = new Date()): Date | undefined {
  if (!settings.setupComplete || !settings.trackingEnabled || validateSchedule(settings)) return undefined;

  const lastDate = settings.endDate || settings.startDate;
  const first = localDate(settings.startDate);
  const candidateDay = new Date(Math.max(startOfDay(after).getTime(), first.getTime()));
  const last = localDate(lastDate);

  for (let day = candidateDay; day <= last; day = addDays(day, 1)) {
    const dayKey = toLocalDateKey(day);
    if (dayKey < settings.startDate || dayKey > lastDate) continue;
    const start = atTime(day, settings.startTime);
    const end = atTime(day, settings.endTime);
    let candidate = new Date(start);
    while (candidate <= after) {
      candidate = new Date(candidate.getTime() + CAPTURE_INTERVAL_MINUTES * MINUTE_MS);
    }
    if (candidate < end) return candidate;
  }
  return undefined;
}

export function timeToMinutes(value: string): number {
  const [hours = 0, minutes = 0] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function atTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
