import { describe, it, expect } from 'vitest';
import { pagesOf, pageStats, roundedPages } from '../src/lib/pages.js';

const b = (title, author = 'A B') => ({ title, author });
const data = {
  'one|a b': { n: 300 },
  'two|a b': { n: 200, approx: true },
  'three|a b': null,
};

describe('pagesOf', () => {
  it('returns n and approx for a book with a count', () => {
    expect(pagesOf(b('One'), data)).toEqual({ n: 300, approx: false });
    expect(pagesOf(b('Two'), data)).toEqual({ n: 200, approx: true });
  });

  it('returns null for a null entry and for a missing key', () => {
    expect(pagesOf(b('Three'), data)).toBeNull();
    expect(pagesOf(b('Unlisted'), data)).toBeNull();
  });

  it('uses the same lower-cased title|author key as the covers', () => {
    expect(pagesOf({ title: 'ONE', author: 'a B' }, data)).toEqual({ n: 300, approx: false });
    expect(pagesOf({ title: 'one', author: '' }, { 'one|': { n: 50 } })).toEqual({ n: 50, approx: false });
  });
});

describe('pageStats', () => {
  it('sums the counts it has and says how many books that covers', () => {
    expect(pageStats([b('One'), b('Two'), b('Three'), b('Unlisted')], data)).toEqual({ total: 500, counted: 2, of: 4 });
  });

  it('handles an empty list', () => {
    expect(pageStats([], data)).toEqual({ total: 0, counted: 0, of: 0 });
  });
});

describe('roundedPages', () => {
  it('rounds to the nearest hundred below 10,000 and the nearest thousand from there', () => {
    expect(roundedPages(4249)).toBe(4200);
    expect(roundedPages(9949)).toBe(9900);
    expect(roundedPages(10499)).toBe(10000);
    expect(roundedPages(181740)).toBe(182000);
  });
});
