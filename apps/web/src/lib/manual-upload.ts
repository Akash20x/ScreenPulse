import { MAX_SCREENSHOT_BYTES, SCREENSHOT_MIME_TYPES } from './upload-validation';

export const MAX_BATCH_UPLOADS = 50;
export const UPLOAD_GROUP_SIZE = 5;

export function splitUploadBatches<T>(items: T[]): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += UPLOAD_GROUP_SIZE) batches.push(items.slice(index, index + UPLOAD_GROUP_SIZE));
  return batches;
}

export function findDuplicateNames(names: string[], existingNames: string[]) {
  const seen = new Set(existingNames.map((name) => name.toLowerCase()));
  return names.map((name) => { const key = name.toLowerCase(); const duplicate = seen.has(key); seen.add(key); return duplicate; });
}

export function validateBatchFiles(files: File[]) {
  if (!files.length) return 'Choose at least one screenshot.';
  if (files.length > MAX_BATCH_UPLOADS) return `Choose no more than ${MAX_BATCH_UPLOADS} screenshots at once.`;
  for (const file of files) {
    if (!SCREENSHOT_MIME_TYPES.includes(file.type as (typeof SCREENSHOT_MIME_TYPES)[number])) return `${file.name}: only JPEG, PNG, and WebP screenshots are accepted.`;
    if (!file.size) return `${file.name}: screenshot must not be empty.`;
    if (file.size > MAX_SCREENSHOT_BYTES) return `${file.name}: screenshot exceeds the 5 MB limit.`;
  }
  return null;
}
