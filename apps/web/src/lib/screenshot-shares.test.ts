import { describe, expect, it } from 'vitest';
import {
  createShareToken,
  hashShareToken,
  isShareToken,
  SHARE_DURATIONS
} from './screenshot-shares';

describe('screenshot share tokens', () => {
  it('generates unique, URL-safe secrets and stores only their hashes', () => {
    const first = createShareToken();
    const second = createShareToken();
    expect(isShareToken(first)).toBe(true);
    expect(first).not.toBe(second);
    expect(hashShareToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashShareToken(first)).not.toContain(first);
    expect(isShareToken('../bad')).toBe(false);
  });
  it('limits expiry choices to one hour, one day and one week', () => {
    expect(SHARE_DURATIONS).toEqual([1, 24, 168]);
  });
});
