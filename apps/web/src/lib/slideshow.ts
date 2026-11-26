import type { GalleryScreenshot } from './screenshots';

export type NarrationSegment = {
  text: string;
  start: number;
  end: number;
  isWord: boolean;
};

function hostname(pageUrl: string) {
  try {
    return new URL(pageUrl).hostname;
  } catch {
    return pageUrl;
  }
}

export function formatCaptureTime(capturedAt: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(capturedAt));
}

export function narrationForScreenshot(
  screenshot: Pick<
    GalleryScreenshot,
    'analysis_description' | 'page_title' | 'page_url' | 'captured_at'
  >
) {
  if (screenshot.analysis_description?.trim())
    return screenshot.analysis_description.trim();

  const title = screenshot.page_title?.trim() || hostname(screenshot.page_url);
  return `Screenshot from ${title} on ${hostname(screenshot.page_url)}, captured ${formatCaptureTime(screenshot.captured_at)}. No Codex analysis is available.`;
}

export function segmentNarration(text: string): NarrationSegment[] {
  const segments: NarrationSegment[] = [];
  const matcher = /\S+|\s+/g;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(text))) {
    const start = match.index;
    segments.push({
      text: match[0],
      start,
      end: start + match[0].length,
      isWord: /\S/.test(match[0])
    });
  }

  return segments;
}

export function activeSegmentAt(
  segments: NarrationSegment[],
  characterIndex: number
) {
  const direct = segments.findIndex(
    (segment) =>
      segment.isWord &&
      characterIndex >= segment.start &&
      characterIndex < segment.end
  );
  if (direct >= 0) return direct;

  return segments.findIndex(
    (segment) => segment.isWord && segment.start >= characterIndex
  );
}
