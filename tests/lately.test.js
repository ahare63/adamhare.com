import { describe, it, expect } from 'vitest';
import { recentFirst, longDate } from '../src/lib/lately.js';

const NOW = Date.UTC(2026, 10, 22, 12);

describe('recentFirst', () => {
  const at = (date) => ({ date });
  const timeOf = (x) => Date.parse(x.date);

  it('returns the newest item when it is inside the window', () => {
    expect(recentFirst([at('20 November 2026'), at('1 June 2026')], timeOf, NOW)).toEqual(at('20 November 2026'));
  });

  it('returns null when the newest item is older than about three months', () => {
    expect(recentFirst([at('1 August 2026')], timeOf, NOW)).toBeNull();
  });

  it('returns null for a future-dated item, an unparseable date, or no items', () => {
    expect(recentFirst([at('1 December 2026')], timeOf, NOW)).toBeNull();
    expect(recentFirst([at('December 2025')], () => NaN, NOW)).toBeNull();
    expect(recentFirst([], timeOf, NOW)).toBeNull();
  });
});

describe('longDate', () => {
  it('formats an ISO date the way the sheets write dates', () => {
    expect(longDate('2026-11-05')).toBe('5 November 2026');
  });
});
