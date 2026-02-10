import { getGreeting } from '@client/utils/timeUtils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('getGreeting', () => {
  // Save the original Date implementation
  const originalDate = global.Date;

  beforeEach(() => {
    // Restore original Date before each test
    global.Date = originalDate;
  });

  it('returns "Good morning" for hours 0-11', () => {
    // Test early morning (6 AM)
    vi.spyOn(global.Date.prototype, 'getHours').mockReturnValue(6);
    expect(getGreeting()).toBe('Good morning');

    // Test late morning (11 AM)
    vi.spyOn(global.Date.prototype, 'getHours').mockReturnValue(11);
    expect(getGreeting()).toBe('Good morning');
  });

  it('returns "Good afternoon" for hours 12-17', () => {
    // Test noon (12 PM)
    vi.spyOn(global.Date.prototype, 'getHours').mockReturnValue(12);
    expect(getGreeting()).toBe('Good afternoon');

    // Test mid-afternoon (3 PM)
    vi.spyOn(global.Date.prototype, 'getHours').mockReturnValue(15);
    expect(getGreeting()).toBe('Good afternoon');

    // Test late afternoon (5 PM)
    vi.spyOn(global.Date.prototype, 'getHours').mockReturnValue(17);
    expect(getGreeting()).toBe('Good afternoon');
  });

  it('returns "Good evening" for hours 18-23', () => {
    // Test early evening (6 PM)
    vi.spyOn(global.Date.prototype, 'getHours').mockReturnValue(18);
    expect(getGreeting()).toBe('Good evening');

    // Test night (9 PM)
    vi.spyOn(global.Date.prototype, 'getHours').mockReturnValue(21);
    expect(getGreeting()).toBe('Good evening');

    // Test late night (11 PM)
    vi.spyOn(global.Date.prototype, 'getHours').mockReturnValue(23);
    expect(getGreeting()).toBe('Good evening');
  });

  it('handles boundary at midnight', () => {
    // Test midnight
    vi.spyOn(global.Date.prototype, 'getHours').mockReturnValue(0);
    expect(getGreeting()).toBe('Good morning');
  });
});
