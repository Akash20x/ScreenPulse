import { describe, expect, it } from 'vitest';
import {
  prioritizeNeighborScreenshotIds,
  sessionScreenshotImagePath
} from './screenshot-session-cache';

describe('session screenshot image paths', () => {
  it('uses the authenticated image route without a cache session', () => {
    expect(sessionScreenshotImagePath('shot/one')).toBe(
      '/api/screenshots/shot%2Fone/image'
    );
  });

  it('adds an encoded private session identifier when caching is active', () => {
    expect(sessionScreenshotImagePath('shot one', 'session one')).toBe(
      '/api/screenshots/shot%20one/image?sp_session=session%20one'
    );
  });
});

describe('neighbor prefetch priority', () => {
  it('warms the next image first, then alternates backward and forward', () => {
    expect(
      prioritizeNeighborScreenshotIds(['a', 'b', 'c', 'd', 'e'], 2)
    ).toEqual(['d', 'b', 'e', 'a']);
  });

  it('stays within the available screenshot window at either edge', () => {
    expect(prioritizeNeighborScreenshotIds(['a', 'b', 'c'], 0)).toEqual([
      'b',
      'c'
    ]);
    expect(prioritizeNeighborScreenshotIds(['a', 'b', 'c'], 2)).toEqual([
      'b',
      'a'
    ]);
  });
});
