import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { addPendingCapture, clearPendingCaptures, deletePendingCapture, getPendingCount, listPendingCaptures } from './queue';
import type { PendingCapture } from './types';

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('screenpulse-captures');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
});

function capture(index: number): PendingCapture {
  const createdAt = new Date(2026, 0, 1, 0, index).toISOString();
  return { captureId: `capture-${index}`, image: new Blob([String(index)], { type: 'image/jpeg' }), mimeType: 'image/jpeg', pageUrl: 'https://example.com', capturedAt: createdAt, createdAt, status: 'pending', uploadAttempts: 0 };
}

describe('local screenshot queue', () => {
  it('returns only the newest requested captures', async () => {
    for (let index = 0; index < 21; index += 1) await addPendingCapture(capture(index));
    const captures = await listPendingCaptures(20);
    expect(captures).toHaveLength(20);
    expect(captures[0]?.captureId).toBe('capture-20');
    expect(captures.at(-1)?.captureId).toBe('capture-1');
  });

  it('permanently deletes one capture', async () => {
    await addPendingCapture(capture(1));
    await deletePendingCapture('capture-1');
    expect(await getPendingCount()).toBe(0);
    expect(await listPendingCaptures()).toEqual([]);
  });

  it('permanently clears every capture, including captures outside the gallery display limit', async () => {
    for (let index = 0; index < 21; index += 1) await addPendingCapture(capture(index));
    await clearPendingCaptures();
    expect(await getPendingCount()).toBe(0);
    expect(await listPendingCaptures()).toEqual([]);
  });
});
