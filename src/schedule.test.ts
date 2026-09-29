import { describe, expect, it } from 'vitest';
import { isCaptureAllowedNow, nextCaptureAt } from './schedule';
import type { ExtensionSettings } from './types';

const settings: ExtensionSettings = {
  setupComplete: true,
  trackingEnabled: true,
  startDate: '2026-09-24',
  endDate: '2026-09-28',
  startTime: '16:00',
  endTime: '18:00',
};

describe('schedule', () => {
  it('allows slots inside the selected inclusive date range and exclusive end time', () => {
    expect(isCaptureAllowedNow(settings, new Date(2026, 8, 24, 16, 0))).toBe(true);
    expect(isCaptureAllowedNow(settings, new Date(2026, 8, 28, 17, 59))).toBe(true);
    expect(isCaptureAllowedNow(settings, new Date(2026, 8, 28, 18, 0))).toBe(false);
  });

  it('finds the next slot anchored to the configured start time', () => {
    expect(nextCaptureAt(settings, new Date(2026, 8, 24, 16, 13))?.getTime())
      .toBe(new Date(2026, 8, 24, 16, 30).getTime());
  });

  it('moves to the next eligible day after the daily window ends', () => {
    expect(nextCaptureAt(settings, new Date(2026, 8, 24, 18, 0))?.getTime())
      .toBe(new Date(2026, 8, 25, 16, 0).getTime());
  });

  it('has no future capture after the range ends', () => {
    expect(nextCaptureAt(settings, new Date(2026, 8, 29, 9, 0))).toBeUndefined();
  });
});
