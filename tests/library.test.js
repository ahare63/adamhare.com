import { describe, it, expect } from 'vitest';
import { buildLibrary, fillBlurbs, normalizeEntries } from '../scripts/fetch-library.mjs';

const lt = (over) => ({
  book_id: '10', title: 'Small Gods', author_fl: 'Terry Pratchett', ISBN_cleaned: '111', entry_stamp: '5',
  cover: 'https://ecx.images-amazon.com/images/P/111.01._SX100_SY200_SCRM_.jpg', ...over,
});

describe('normalizeEntries', () => {
  it('accepts both the {books:{}} feed and the bare-object shape, later sources winning', () => {
    const feed = { books: { 1: lt({ book_id: '1', title: 'Feed' }) } };
    const bare = { 2: lt({ book_id: '2', title: 'Seed' }), 1: lt({ book_id: '1', title: 'Seed override' }) };
    const out = normalizeEntries([bare, feed]);
    expect(out.map((e) => e.title).sort()).toEqual(['Feed', 'Seed']);
  });
});

describe('buildLibrary', () => {
  it('adds matched books with a resized cover and no blurb yet', () => {
    const { library, unmatched } = buildLibrary([{ year: 2026, title: 'Small Gods', author: 'Terry Pratchett' }], {}, [lt()]);
    expect(library['small gods|terry pratchett']).toEqual({
      ltId: '10', isbn: '111', cover: 'https://ecx.images-amazon.com/images/P/111.01._SX400_SCRM_.jpg',
    });
    expect('blurb' in library['small gods|terry pratchett']).toBe(false);
    expect(unmatched).toEqual([]);
  });

  it('leaves unmatched books out and reports them', () => {
    const books = [{ year: 2025, title: 'Unknown', author: 'Nobody Here' }];
    const { library, unmatched } = buildLibrary(books, {}, [lt()]);
    expect(library).toEqual({});
    expect(unmatched).toEqual(books);
  });

  it('never overwrites existing entries, including hand edits', () => {
    const existing = { 'small gods|terry pratchett': { ltId: '1', isbn: null, cover: 'hand.jpg', blurb: 'mine' } };
    const { library } = buildLibrary([{ year: 2026, title: 'Small Gods', author: 'Terry Pratchett' }], existing, [lt()]);
    expect(library).toEqual(existing);
  });

  it('stores a null isbn when the entry has none', () => {
    const { library } = buildLibrary([{ year: 1, title: 'Small Gods', author: 'Terry Pratchett' }], {}, [lt({ ISBN_cleaned: '' })]);
    expect(library['small gods|terry pratchett'].isbn).toBeNull();
  });
});

describe('fillBlurbs', () => {
  it('looks up only entries with an isbn and no blurb property', async () => {
    const looked = [];
    const library = {
      a: { ltId: '1', isbn: '111', cover: 'c' },
      b: { ltId: '2', isbn: '222', cover: 'c', blurb: null },
      c: { ltId: '3', isbn: null, cover: 'c' },
      d: { ltId: '4', isbn: '444', cover: 'c', blurb: 'kept' },
    };
    const { library: out, found, none, failed } = await fillBlurbs(library, async (isbn) => { looked.push(isbn); return 'text'; });
    expect(looked).toEqual(['111']);
    expect(out.a.blurb).toBe('text');
    expect(out.b.blurb).toBeNull();
    expect('blurb' in out.c).toBe(false);
    expect(out.d.blurb).toBe('kept');
    expect([found, none, failed]).toEqual([1, 0, 0]);
  });

  it('stores null when nothing is found and leaves the property absent when the lookup throws', async () => {
    const library = { a: { isbn: '1' }, b: { isbn: '2' }, c: { isbn: '3' } };
    const { library: out, found, none, failed } = await fillBlurbs(library, async (isbn) => {
      if (isbn === '2') throw new Error('boom');
      return isbn === '1' ? null : 'desc';
    });
    expect(out.a.blurb).toBeNull();
    expect('blurb' in out.b).toBe(false);
    expect(out.c.blurb).toBe('desc');
    expect([found, none, failed]).toEqual([1, 1, 1]);
  });
});
