import { describe, expect, it } from 'vitest';
import { screenshotDisplayTitle, screenshotSourceDomain } from './screenshot-labels';

describe('screenshot labels', () => {
  it('hides the manual-upload placeholder and keeps the filename', () => {
    const url = 'https://screenpulse.local/upload';
    expect(screenshotSourceDomain(url)).toBeNull();
    expect(screenshotDisplayTitle('39818.jpg', url)).toBe('39818.jpg');
    expect(screenshotDisplayTitle(null, url)).toBe('Screenshot');
    expect(screenshotDisplayTitle('  ', url)).toBe('Screenshot');
  });

  it('keeps a real source domain and uses it as a title when needed', () => {
    const url = 'https://example.com/path';
    expect(screenshotSourceDomain(url)).toBe('example.com');
    expect(screenshotDisplayTitle(null, url)).toBe('example.com');
    expect(screenshotDisplayTitle('Page title', url)).toBe('Page title');
  });
});
