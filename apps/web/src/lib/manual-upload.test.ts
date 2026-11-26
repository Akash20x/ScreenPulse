import { describe, expect, it } from 'vitest';
import { MAX_BATCH_UPLOADS, validateBatchFiles, splitUploadBatches, findDuplicateNames } from './manual-upload';

describe('manual batch uploads', () => {
  it('accepts up to 50 supported images', () => {
    const files = Array.from({ length: MAX_BATCH_UPLOADS }, (_, index) => new File(['image'], `${index}.png`, { type: 'image/png' }));
    expect(validateBatchFiles(files)).toBeNull();
  });

  it('rejects a batch above the limit', () => {
    const files = Array.from({ length: MAX_BATCH_UPLOADS + 1 }, (_, index) => new File(['image'], `${index}.png`, { type: 'image/png' }));
    expect(validateBatchFiles(files)).toMatch(/no more than 50/i);
  });

  it('splits uploads into groups of at most five', () => {
    for (const [count, sizes] of [[1, [1]], [5, [5]], [6, [5, 1]], [50, Array(10).fill(5)]] as const) {
      expect(splitUploadBatches(Array.from({ length: count })).map((batch) => batch.length)).toEqual(sizes);
    }
  });

  it('finds existing and repeated filenames without regard to case', () => {
    expect(findDuplicateNames(['A.png', 'b.png', 'B.PNG', 'c.png'], ['a.PNG'])).toEqual([true, false, true, false]);
  });
});
