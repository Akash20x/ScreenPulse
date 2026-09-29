import { nextCaptureAt } from './schedule';
import { getSettings } from './settings';
import { CAPTURE_ALARM } from './types';

/** Replaces the one-shot alarm with the next valid local schedule slot. */
export async function configureNextAlarm(now = new Date()): Promise<Date | undefined> {
  await chrome.alarms.clear(CAPTURE_ALARM);
  const settings = await getSettings();
  const next = nextCaptureAt(settings, now);
  if (next) await chrome.alarms.create(CAPTURE_ALARM, { when: next.getTime() });
  return next;
}
