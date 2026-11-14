import { describe, it, expect } from 'vitest';
import { buildLibrary, fillBlurbs, fillCovers, findBlurb, normalizeEntries } from '../scripts/fetch-library.mjs';

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

describe('normalizeEntries with a LibraryThing export', () => {
  const exp = (over) => ({
    books_id: '10', title: 'Small Gods', primaryauthor: 'Pratchett, Terry',
    authors: [{ lf: 'Pratchett, Terry', fl: 'Terry Pratchett', role: 'Author' }],
    originalisbn: '0552152978', isbn: { 0: '0552152978', 2: '9780552152976' },
    language_codeA: ['eng'], entrydate: '2025-12-22', privatecomment: 'secret', ...over,
  });

  it('maps export fields to the internal shape and drops everything else', () => {
    const [e] = normalizeEntries([{ 10: exp() }]);
    expect(e).toEqual({
      book_id: '10', title: 'Small Gods', author_fl: 'Terry Pratchett', ISBN_cleaned: '0552152978',
      entry_stamp: String(Date.UTC(2025, 11, 22) / 1000), language: 'eng', originaltitle: undefined, cover: undefined,
    });
  });
  it('prefers a 10-digit ISBN, else a 13-digit one, from isbn lists and objects', () => {
    expect(normalizeEntries([{ 1: exp({ originalisbn: '', isbn: ['9780552152976', '0552152978'] }) }])[0].ISBN_cleaned).toBe('0552152978');
    expect(normalizeEntries([{ 1: exp({ originalisbn: '9780552152976', isbn: { 0: '9780552152976' } }) }])[0].ISBN_cleaned).toBe('9780552152976');
    expect(normalizeEntries([{ 1: exp({ originalisbn: undefined, isbn: null }) }])[0].ISBN_cleaned).toBe('');
  });
  it('handles missing authors and a missing language', () => {
    const [e] = normalizeEntries([{ 1: exp({ authors: undefined, primaryauthor: undefined, language_codeA: null }) }]);
    expect(e.author_fl).toBe('');
    expect(e.language).toBeUndefined();
  });
  it('lets a feed entry keep its cover while the export supplies the language', () => {
    const feed = { books: { 10: lt({ book_id: '10', title: 'Small Gods (feed)', cover: 'feed.jpg' }) } };
    const out = normalizeEntries([feed, { 10: exp() }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ title: 'Small Gods (feed)', cover: 'feed.jpg', language: 'eng' });
    const reversed = normalizeEntries([{ 10: exp() }, feed])[0];
    expect(reversed).toMatchObject({ title: 'Small Gods (feed)', cover: 'feed.jpg', language: 'eng' });
  });
  it('keeps an export-only entry without a cover', () => {
    expect(normalizeEntries([{ 10: exp() }])[0].cover).toBeUndefined();
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
  it('looks up every entry that has no blurb property, passing the entry and its key', async () => {
    const looked = [];
    const library = {
      a: { ltId: '1', isbn: '111', cover: 'c' },
      b: { ltId: '2', isbn: '222', cover: 'c', blurb: null },
      c: { ltId: '3', isbn: null, cover: 'c' },
      d: { ltId: '4', isbn: '444', cover: 'c', blurb: 'kept' },
    };
    const { library: out, found, none, failed } = await fillBlurbs(library, async (entry, key) => { looked.push(key); return 'text'; });
    expect(looked).toEqual(['a', 'c']);
    expect(out.a.blurb).toBe('text');
    expect(out.b.blurb).toBeNull();
    expect(out.c.blurb).toBe('text');
    expect(out.d.blurb).toBe('kept');
    expect([found, none, failed]).toEqual([2, 0, 0]);
  });

  it('stores null when nothing is found and leaves the property absent when the lookup throws', async () => {
    const library = { a: { isbn: '1' }, b: { isbn: '2' }, c: { isbn: '3' } };
    const { library: out, found, none, failed } = await fillBlurbs(library, async (entry) => {
      if (entry.isbn === '2') throw new Error('boom');
      return entry.isbn === '1' ? null : 'desc';
    });
    expect(out.a.blurb).toBeNull();
    expect('blurb' in out.b).toBe(false);
    expect(out.c.blurb).toBe('desc');
    expect([found, none, failed]).toEqual([1, 1, 1]);
  });
});

describe('buildLibrary additions', () => {
  it('stores a null cover when the entry has none, and reports added keys', () => {
    const { library, added } = buildLibrary([{ year: 1, title: 'Small Gods', author: 'Terry Pratchett' }], {}, [lt({ cover: undefined })]);
    expect(library['small gods|terry pratchett'].cover).toBeNull();
    expect(added).toEqual(['small gods|terry pratchett']);
  });
  it('fills a null isbn on an existing entry from the catalogue, by ltId', () => {
    const existing = { 'small gods|terry pratchett': { ltId: '10', isbn: null, cover: 'hand.jpg', blurb: 'mine' } };
    const { library, added } = buildLibrary([{ year: 1, title: 'Small Gods', author: 'Terry Pratchett' }], existing, [lt()]);
    expect(library['small gods|terry pratchett']).toEqual({ ltId: '10', isbn: '111', cover: 'hand.jpg', blurb: 'mine' });
    expect(added).toEqual([]);
  });
});

describe('fillCovers', () => {
  const amazon = (isbn) => `https://ecx.images-amazon.com/images/P/${isbn}.01._SX400_SCRM_.jpg`;
  it('derives and verifies an Amazon cover for added entries with a 10-digit ISBN and no cover', async () => {
    const checked = [];
    const library = {
      a: { ltId: '1', isbn: '0552152978', cover: null },
      b: { ltId: '2', isbn: '9780552152976', cover: null },
      c: { ltId: '3', isbn: null, cover: null },
      d: { ltId: '4', isbn: '0000000000', cover: null },
      e: { ltId: '5', isbn: '1111111111', cover: 'have.jpg' },
      f: { ltId: '6', isbn: '2222222222', cover: null },
    };
    const out = await fillCovers(library, ['a', 'b', 'c', 'd', 'e'], async (url) => { checked.push(url); return !url.includes('0000000000'); });
    expect(checked).toEqual([amazon('0552152978'), amazon('0000000000')]);
    expect(out.a.cover).toBe(amazon('0552152978'));
    expect(out.b.cover).toBeNull();
    expect(out.d.cover).toBeNull();
    expect(out.e.cover).toBe('have.jpg');
    expect(out.f.cover).toBeNull();
  });
  it('leaves the cover null when the check throws', async () => {
    const out = await fillCovers({ a: { isbn: '0552152978', cover: null } }, ['a'], async () => { throw new Error('net'); });
    expect(out.a.cover).toBeNull();
  });
});

describe('findBlurb', () => {
  const desc = 'A long enough description of the book, which is told with the care that it deserves.';
  const book = { title: 'Asterix the Gaul', author: 'Rene Goscinny' };
  const respond = (routes) => async (url) => (url in routes ? routes[url] : null);

  it('uses an English edition description', async () => {
    const get = respond({ 'https://openlibrary.org/isbn/1.json': { description: desc, languages: [{ key: '/languages/eng' }], works: [{ key: '/works/W' }] } });
    expect(await findBlurb({ isbn: '1' }, book, get)).toBe(desc);
  });
  it('skips a non-English edition description and takes the work description', async () => {
    const get = respond({
      'https://openlibrary.org/isbn/1.json': { description: 'El primer album de la serie de comics mas popular del mundo, que es la mas leida.', languages: [{ key: '/languages/spa' }], works: [{ key: '/works/W' }] },
      'https://openlibrary.org/works/W.json': { description: { value: desc } },
    });
    expect(await findBlurb({ isbn: '1' }, book, get)).toBe(desc);
  });
  it('treats an edition without languages as acceptable and falls to the work when it has no description', async () => {
    const get = respond({
      'https://openlibrary.org/isbn/1.json': { works: [{ key: '/works/W' }] },
      'https://openlibrary.org/works/W.json': { description: desc },
    });
    expect(await findBlurb({ isbn: '1' }, book, get)).toBe(desc);
  });
  it('falls back to a title and author search when there is no ISBN or no result', async () => {
    const search = 'https://openlibrary.org/search.json?title=Asterix+the+Gaul&author=Rene+Goscinny&fields=key&limit=1';
    const get = respond({ [search]: { docs: [{ key: '/works/S' }] }, 'https://openlibrary.org/works/S.json': { description: desc } });
    expect(await findBlurb({ isbn: null }, book, get)).toBe(desc);
    expect(await findBlurb({ isbn: '9' }, book, get)).toBe(desc);
  });
  it('returns null when nothing yields a usable description', async () => {
    expect(await findBlurb({ isbn: '1' }, book, respond({}))).toBeNull();
  });
  it('lets a request failure propagate', async () => {
    await expect(findBlurb({ isbn: '1' }, book, async () => { throw new Error('HTTP 500'); })).rejects.toThrow('HTTP 500');
  });
});

describe('buildLibrary with hand-picked covers', () => {
  it('uses the cover chosen for a LibraryThing id over the entry\'s own cover', () => {
    const books = [{ year: 1, title: 'Small Gods', author: 'Terry Pratchett' }];
    const { library } = buildLibrary(books, {}, [lt()], { 10: '/images/books/covers/small-gods.jpg' });
    expect(library['small gods|terry pratchett'].cover).toBe('/images/books/covers/small-gods.jpg');
  });
});

describe('original language (lang)', () => {
  const book = [{ year: 1, title: 'Small Gods', author: 'Terry Pratchett' }];
  const key = 'small gods|terry pratchett';

  it('maps the feed language_original, ignoring English and empty values', () => {
    expect(normalizeEntries([{ books: { 1: lt({ language_original: 'por' }) } }])[0].original).toBe('por');
    expect(normalizeEntries([{ books: { 1: lt({ language_original: 'eng' }) } }])[0].original).toBeUndefined();
    expect(normalizeEntries([{ books: { 1: lt({ language_original: '' }) } }])[0].original).toBeUndefined();
  });

  it('maps the first non-English code of the export and lets it fill a feed entry that has none', () => {
    const exp = { books_id: '10', title: 'Small Gods', originallanguage_codeA: ['eng', 'grc'] };
    expect(normalizeEntries([{ 10: exp }])[0].original).toBe('grc');
    const feed = { books: { 10: lt({ book_id: '10', language_original: 'eng' }) } };
    expect(normalizeEntries([feed, { 10: exp }])[0].original).toBe('grc');
  });

  it('stores lang on a newly added entry only when the catalogue has a non-English original', () => {
    const entries = (over) => normalizeEntries([{ books: { 10: lt(over) } }]);
    expect(buildLibrary(book, {}, entries({ language_original: 'por' })).library[key].lang).toBe('por');
    expect('lang' in buildLibrary(book, {}, entries({ language_original: 'eng' })).library[key]).toBe(false);
  });

  it('back-fills lang on an existing entry without overwriting one that is set', () => {
    const entries = normalizeEntries([{ books: { 10: lt({ language_original: 'por' }) } }]);
    const filled = buildLibrary(book, { [key]: { ltId: '10', isbn: '111', cover: 'c' } }, entries).library[key];
    expect(filled).toEqual({ ltId: '10', isbn: '111', cover: 'c', lang: 'por' });
    const kept = buildLibrary(book, { [key]: { ltId: '10', isbn: '111', cover: 'c', lang: 'fre' } }, entries).library[key];
    expect(kept.lang).toBe('fre');
  });
});
