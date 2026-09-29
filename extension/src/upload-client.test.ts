import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PendingCapture } from './types';
import { UploadError, postMultipartUpload, probeUploadConnection } from './upload-client';

const connection = { endpoint: 'https://screenpulse.example/api/screenshots', token: 'device-token' };
const capture: PendingCapture = {
  captureId: 'capture-123',
  image: new Blob(['image'], { type: 'image/jpeg' }),
  mimeType: 'image/jpeg',
  pageUrl: 'https://example.com/page',
  pageTitle: 'Example',
  capturedAt: '2026-09-24T10:00:00.000Z',
  createdAt: '2026-09-24T10:00:00.000Z',
  status: 'pending',
  uploadAttempts: 0,
};

afterEach(() => vi.unstubAllGlobals());

describe('multipart upload client', () => {
  it('sends the image, metadata, and Bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ screenshotId: 'server-1' }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(postMultipartUpload(connection, capture)).resolves.toEqual({ screenshotId: 'server-1' });
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toEqual({ Authorization: 'Bearer device-token' });
    const form = options.body as FormData;
    expect(form.get('captureId')).toBe('capture-123');
    expect(form.get('screenshot')).toBeInstanceOf(Blob);
  });

  it('treats an existing captureId response as a successful idempotent upload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 409 })));
    await expect(postMultipartUpload(connection, capture)).resolves.toEqual({});
  });

  it('classifies an invalid token and sends a probe without an image', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Invalid token' }), { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(probeUploadConnection(connection)).rejects.toMatchObject({ kind: 'unauthorized', status: 401 });
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const form = options.body as FormData;
    expect(form.get('probe')).toBe('true');
    expect(form.get('screenshot')).toBeNull();
  });
});
