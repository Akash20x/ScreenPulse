import { describe, expect, it } from 'vitest';
import {
  activeSegmentAt,
  narrationForScreenshot,
  segmentNarration
} from './slideshow';

describe('slideshow narration', () => {
  it('uses the saved analysis when present', () => {
    expect(
      narrationForScreenshot({
        analysis_description: 'A saved description.',
        page_title: 'Ignored',
        page_url: 'https://example.com',
        captured_at: '2026-09-23T08:00:00.000Z'
      })
    ).toBe('A saved description.');
  });

  it('creates a concise metadata fallback when analysis is absent', () => {
    const narration = narrationForScreenshot({
      analysis_description: null,
      page_title: 'Dashboard',
      page_url: 'https://example.com/path',
      captured_at: '2026-09-23T08:00:00.000Z'
    });
    expect(narration).toContain('Dashboard');
    expect(narration).toContain('example.com');
    expect(narration).toContain('No Codex analysis is available.');
  });

  it('maps speech character indexes to stable word segments', () => {
    const segments = segmentNarration('Hello, world!');
    expect(segments.map((segment) => segment.text)).toEqual([
      'Hello,',
      ' ',
      'world!'
    ]);
    expect(activeSegmentAt(segments, 0)).toBe(0);
    expect(activeSegmentAt(segments, 6)).toBe(2);
    expect(activeSegmentAt(segments, 7)).toBe(2);
  });
});
