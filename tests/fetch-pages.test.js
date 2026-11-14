import { describe, it, expect } from 'vitest';
import { buildPagesMap, serializePages, pageCountOf, isbnPages, searchPages } from '../scripts/fetch-pages.mjs';

const book = (title, author = 'A B') => ({ title, author });
const never = async () => { throw new Error('should not be called'); };
const none = async () => null;

describe('pageCountOf', () => {
  it('accepts counts from 10 to 3000 and rejects the rest', () => {
    expect(pageCountOf(10)).toBe(10);
    expect(pageCountOf(3000)).toBe(3000);
    expect(pageCountOf(9)).toBeNull();
    expect(pageCountOf(3001)).toBeNull();
    expect(pageCountOf('432 ')).toBe(432);
    expect(pageCountOf(undefined)).toBeNull();
    expect(pageCountOf('x')).toBeNull();
  });
});

describe('buildPagesMap', () => {
  it('prefers the export over the ISBN lookup over the search, and marks only search results approx', async () => {
    const lookups = {
      fromExport: (bk) => ({ One: 111 })[bk.title],
      fromIsbn: async (bk) => ({ Two: 222 })[bk.title] ?? null,
      fromSearch: async (bk) => ({ One: 999, Two: 999, Three: 333 })[bk.title] ?? null,
    };
    const out = await buildPagesMap([book('One'), book('Two'), book('Three')], {}, lookups);
    expect(out['one|a b']).toEqual({ n: 111 });
    expect(out['two|a b']).toEqual({ n: 222 });
    expect(out['three|a b']).toEqual({ n: 333, approx: true });
  });

  it('does not query anything further once an earlier source answers', async () => {
    const out = await buildPagesMap([book('One')], {}, { fromExport: () => 50, fromIsbn: never, fromSearch: never });
    expect(out['one|a b']).toEqual({ n: 50 });
  });

  it('stores null when every source comes up empty', async () => {
    const out = await buildPagesMap([book('One')], {}, { fromExport: () => undefined, fromIsbn: none, fromSearch: none });
    expect(out['one|a b']).toBeNull();
  });

  it('ignores out-of-bounds values and falls through to the next source', async () => {
    const out = await buildPagesMap([book('One'), book('Two')], {}, {
      fromExport: (bk) => (bk.title === 'One' ? 5 : undefined),
      fromIsbn: async (bk) => (bk.title === 'Two' ? 4000 : null),
      fromSearch: async () => 300,
    });
    expect(out['one|a b']).toEqual({ n: 300, approx: true });
    expect(out['two|a b']).toEqual({ n: 300, approx: true });
  });

  it('never overwrites an existing entry, including a hand-edited or null one', async () => {
    const existing = { 'one|a b': { n: 12 }, 'two|a b': null };
    const out = await buildPagesMap([book('One'), book('Two')], existing, { fromExport: never, fromIsbn: never, fromSearch: never });
    expect(out).toEqual(existing);
  });

  it('leaves the key absent when a lookup fails, and carries on with the other books', async () => {
    const failures = [];
    const out = await buildPagesMap([book('One'), book('Two')], {}, {
      fromExport: () => undefined,
      fromIsbn: none,
      fromSearch: async (bk) => { if (bk.title === 'One') throw new Error('HTTP 500'); return 200; },
    }, { onFailure: (bk) => failures.push(bk.title) });
    expect('one|a b' in out).toBe(false);
    expect(out['two|a b']).toEqual({ n: 200, approx: true });
    expect(failures).toEqual(['One']);
  });

  it('keeps keys of books no longer listed and sorts by key', async () => {
    const out = await buildPagesMap([book('B')], { 'zzz|': { n: 1 }, 'a|': { n: 2 } }, { fromExport: () => 20, fromIsbn: never, fromSearch: never });
    expect(Object.keys(out)).toEqual(['a|', 'b|a b', 'zzz|']);
  });

  it('looks a duplicated key up once', async () => {
    let calls = 0;
    await buildPagesMap([book('A'), book('a')], {}, { fromExport: () => { calls++; return 20; }, fromIsbn: never, fromSearch: never });
    expect(calls).toBe(1);
  });
});

describe('serializePages', () => {
  it('writes one entry per line, sorted by key', () => {
    expect(serializePages({ 'b|': null, 'a|x': { n: 5, approx: true }, 'c|': { n: 400 } }))
      .toBe('{\n  "a|x": { "n": 5, "approx": true },\n  "b|": null,\n  "c|": { "n": 400 }\n}\n');
  });
});

describe('Open Library lookups', () => {
  it('reads number_of_pages for an ISBN and treats a missing edition as no count', async () => {
    const get = async (url) => (url === 'https://openlibrary.org/isbn/111.json' ? { number_of_pages: 320 } : null);
    expect(await isbnPages('111', get)).toBe(320);
    expect(await isbnPages('222', get)).toBeNull();
    expect(await isbnPages('111', async () => ({}))).toBeNull();
  });

  it('takes the first search result with an in-bounds median, omitting an empty author', async () => {
    const urls = [];
    const get = async (url) => {
      urls.push(url);
      return { docs: [{ number_of_pages_median: 4 }, {}, { number_of_pages_median: 250 }, { number_of_pages_median: 900 }] };
    };
    expect(await searchPages({ title: 'Beowulf', author: '' }, get)).toBe(250);
    expect(urls[0]).toContain('title=Beowulf');
    expect(urls[0]).not.toContain('author=');
    expect(urls[0]).toContain('limit=3');
    await searchPages({ title: 'Ulysses', author: 'James Joyce' }, get);
    expect(urls[1]).toContain('author=James+Joyce');
  });

  it('returns null when the search has no usable result', async () => {
    expect(await searchPages({ title: 'X', author: 'Y' }, async () => ({ docs: [] }))).toBeNull();
    expect(await searchPages({ title: 'X', author: 'Y' }, async () => null)).toBeNull();
  });
});
