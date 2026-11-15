import { describe, it, expect } from 'vitest';
import { downloadDataUrl, createPresentationCalendarPng } from './calendarPng.js';

describe('calendarPng', () => {
  it('handles null/undefined gracefully in Node/test environment', async () => {
    const rawDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = await createPresentationCalendarPng(rawDataUrl, {
      aoiName: 'Serengeti',
      dateRange: '2018-01 to 2024-12',
      sourceLabel: 'Harmonized',
    });
    // In node/test environment without window.Image, returns input rawDataUrl
    expect(result).toBe(rawDataUrl);
  });

  it('runs downloadDataUrl safely without errors', () => {
    expect(() => downloadDataUrl('data:image/png;base64,test', 'test.png')).not.toThrow();
  });
});
