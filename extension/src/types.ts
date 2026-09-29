export const CAPTURE_INTERVAL_MINUTES = 30;
export const MAX_PENDING_CAPTURES = 100;
export const CAPTURE_ALARM = 'screenpulse-next-capture';
// Required by Chrome for scheduled captureVisibleTab calls. Do not broaden
// product behavior: captureEligibility still rejects every non-HTTP(S) URL.
export const CAPTURE_ORIGINS = ['<all_urls>'];

export type CaptureOutcome =
  | 'captured'
  | 'skipped'
  | 'queue-full'
  | 'failed'
  | 'idle';

export interface ScheduleSettings {
  /** Local date in YYYY-MM-DD form. */
  startDate: string;
  /** Local date in YYYY-MM-DD form. Omit for one selected day. */
  endDate?: string;
  /** Local 24-hour time in HH:mm form. */
  startTime: string;
  /** Local 24-hour time in HH:mm form. The endpoint is exclusive. */
  endTime: string;
}

export interface ExtensionSettings extends ScheduleSettings {
  setupComplete: boolean;
  trackingEnabled: boolean;
  uploadEndpoint?: string;
  deviceToken?: string;
  connectionState?: ConnectionState;
}

export type ConnectionState = 'untested' | 'connected' | 'unauthorized' | 'unavailable' | 'invalid';
export type UploadState = 'pending' | 'uploaded' | 'failed';

export interface PendingCapture {
  captureId: string;
  image: Blob;
  mimeType: 'image/jpeg';
  pageUrl: string;
  pageTitle?: string;
  capturedAt: string;
  createdAt: string;
  status: UploadState;
  uploadAttempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  uploadedAt?: string;
  serverScreenshotId?: string;
}

export interface CaptureStatus {
  outcome: CaptureOutcome;
  message: string;
  capturedAt: string;
  captureId?: string;
}

export interface UploadClient {
  upload(capture: PendingCapture): Promise<{ screenshotId?: string }>;
}

export interface UploadSummary {
  pending: number;
  uploaded: number;
  failed: number;
}
