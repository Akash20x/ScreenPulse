import { describe, expect, it } from 'vitest';
import { validateUpload } from './upload-validation';

const fields = {
  captureId: 'a5b1f98a-0d08-479a-8fc9-c88a190e040a',
  capturedAt: '2026-09-22T10:00:00.000Z',
  pageUrl: 'https://example.com/dashboard',
  pageTitle: 'Dashboard',
  mimeType: 'image/jpeg',
};

describe('validateUpload', () => {
  it('accepts a JPEG upload with valid metadata', () => {
    expect(validateUpload(fields, new File(['image'], 'capture.jpg', { type: 'image/jpeg' }))).toBeNull();
  });

  it('accepts PNG and WebP screenshots', () => {
    expect(validateUpload({ ...fields, mimeType: 'image/png' }, new File(['image'], 'capture.png', { type: 'image/png' }))).toBeNull();
    expect(validateUpload({ ...fields, mimeType: 'image/webp' }, new File(['image'], 'capture.webp', { type: 'image/webp' }))).toBeNull();
  });

  it('rejects unsupported screenshot formats', () => {
    expect(validateUpload({ ...fields, mimeType: 'image/gif' }, new File(['image'], 'capture.gif', { type: 'image/gif' }))).toMatch(/Only JPEG/);
  });

  it('rejects invalid page URLs', () => {
    expect(validateUpload({ ...fields, pageUrl: 'not a URL' }, new File(['image'], 'capture.jpg', { type: 'image/jpeg' }))).toMatch(/pageUrl/);
  });
});
