import { describe, it, expect } from 'vitest';
import { buildCoverMap } from '../scripts/fetch-covers.mjs';

const book = (title, author = '') => ({ title, author });

describe('buildCoverMap', () => {
  it('preserves existing entries and only looks up missing keys', async () => {
    const looked = [];
    const existing = { 'a|x': 7, 'b|y': null };
    const out = await buildCoverMap(
      [book('A', 'X'), book('B', 'Y'), book('C', 'Z')],
      existing,
      async (b) => { looked.push(b.title); return 99; },
    );
    expect(looked).toEqual(['C']);
    expect(out).toEqual({ 'a|x': 7, 'b|y': null, 'c|z': 99 });
  });

  it('stores null when lookup finds nothing', async () => {
    const out = await buildCoverMap([book('A', 'X')], {}, async () => null);
    expect(out).toEqual({ 'a|x': null });
  });

  it('leaves the key absent when lookup throws, and continues', async () => {
    const out = await buildCoverMap([book('A', 'X'), book('B', 'Y')], {}, async (b) => {
      if (b.title === 'A') throw new Error('network');
      return 5;
    });
    expect(out).toEqual({ 'b|y': 5 });
  });

  it('keeps keys for books no longer listed and sorts by key', async () => {
    const out = await buildCoverMap([book('B')], { 'zzz|q': 1, 'a|a': 2 }, async () => 3);
    expect(Object.keys(out)).toEqual(['a|a', 'b|', 'zzz|q']);
  });

  it('looks up a duplicated key once', async () => {
    let n = 0;
    await buildCoverMap([book('A', 'X'), book('a', 'x')], {}, async () => { n++; return 1; });
    expect(n).toBe(1);
  });
});
