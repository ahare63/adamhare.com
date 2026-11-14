import { describe, it, expect } from 'vitest';
import { buildProposal, bulletLine } from '../scripts/lookup-book.mjs';

const md = `---
title: "Books"
---

Intro.

## 2026

- *Taipei Story* by R.F. Kuang
- *The Leopard* by Giuseppe Tomasi di Lampedusa, trans. Archibald Colquhoun

## 2023

- *The Leopard* by Giuseppe Tomasi di Lampedusa, trans. Archibald Colquhoun (audiobook)
- *Beowulf*, trans. Seamus Heaney
`;

const entry = (over) => ({
  book_id: '77', title: 'The Leopard', author_fl: 'Giuseppe Tomasi di Lampedusa', ISBN_cleaned: '0375714065',
  entry_stamp: '1', cover: 'https://ecx.images-amazon.com/images/P/0375714065.01._SX100_SY200_SCRM_.jpg', ...over,
});
const base = { year: 2026, title: 'The Leopard', author: 'Giuseppe Tomasi di Lampedusa', translator: null, note: null };
const proposal = (over = {}) => buildProposal({
  book: base, entries: [entry()], booksMd: md,
  authorCountries: { authors: {}, titles: {} }, languages: { authors: {}, titles: {} }, blurb: null, ...over,
});

describe('bulletLine', () => {
  it('writes author, translator and note in the books.md convention', () => {
    expect(bulletLine({ title: 'The Leopard', author: 'G. Lampedusa', translator: null, note: null })).toBe('- *The Leopard* by G. Lampedusa');
    expect(bulletLine({ title: 'The Leopard', author: 'G. Lampedusa', translator: 'A. Colquhoun', note: null })).toBe('- *The Leopard* by G. Lampedusa, trans. A. Colquhoun');
    expect(bulletLine({ title: 'Beowulf', author: '', translator: 'Seamus Heaney', note: null })).toBe('- *Beowulf*, trans. Seamus Heaney');
    expect(bulletLine({ title: 'Hamlet', author: 'William Shakespeare', translator: null, note: 'Arden Third Series' })).toBe('- *Hamlet* by William Shakespeare (Arden Third Series)');
    expect(bulletLine({ title: 'Hamlet', author: '', translator: null, note: null })).toBe('- *Hamlet*');
  });

  it('escapes asterisks in a title so parseBooks reads it back', () => {
    expect(bulletLine({ title: 'The Footnote* *A Curious History', author: 'A B', translator: null, note: null }))
      .toBe('- *The Footnote\\* \\*A Curious History* by A B');
  });
});

describe('buildProposal', () => {
  it('reports the book, its bullet and its cover key', () => {
    const p = proposal();
    expect(p.book).toEqual(base);
    expect(p.bulletLine).toBe('- *The Leopard* by Giuseppe Tomasi di Lampedusa');
    expect(p.key).toBe('the leopard|giuseppe tomasi di lampedusa');
  });

  it('lists earlier readings of the same title and author, whatever the year', () => {
    const p = proposal();
    expect(p.alreadyListed).toEqual([
      { year: 2026, line: '- *The Leopard* by Giuseppe Tomasi di Lampedusa, trans. Archibald Colquhoun' },
      { year: 2023, line: '- *The Leopard* by Giuseppe Tomasi di Lampedusa, trans. Archibald Colquhoun (audiobook)' },
    ]);
    expect(proposal({ book: { ...base, title: 'Taipei Story', author: 'R.F. Kuang' } }).alreadyListed).toHaveLength(1);
    expect(proposal({ book: { ...base, title: 'Unlisted' } }).alreadyListed).toEqual([]);
  });

  it('reports the LibraryThing match with a large cover', () => {
    const lt = proposal().librarything;
    expect(lt).toEqual({
      found: true, ltId: '77', title: 'The Leopard', author: 'Giuseppe Tomasi di Lampedusa', isbn: '0375714065',
      cover: 'https://ecx.images-amazon.com/images/P/0375714065.01._SX400_SCRM_.jpg',
    });
  });

  it('suggests the nearest titles when there is no match', () => {
    const entries = [
      entry({ book_id: '1', title: 'Leopard Skin', author_fl: 'A One' }),
      entry({ book_id: '2', title: 'The Snow Leopard', author_fl: 'Peter Matthiessen' }),
      entry({ book_id: '3', title: 'Unrelated Thing', author_fl: 'B Two' }),
    ];
    const lt = proposal({ entries, book: { ...base, title: 'The Snow Leopard Cub', author: 'Nobody Else' } }).librarything;
    expect(lt.found).toBe(false);
    expect(lt.nearest).toEqual([
      { title: 'The Snow Leopard', author: 'Peter Matthiessen' },
      { title: 'Leopard Skin', author: 'A One' },
    ]);
  });

  it('does not count common words such as "the" and "of" as shared', () => {
    const entries = [entry({ book_id: '1', title: 'The Hobbit of the Shire', author_fl: 'X Y' })];
    expect(proposal({ entries, book: { ...base, author: 'Nobody Else' } }).librarything.nearest).toEqual([]);
  });

  it('keeps at most five nearest titles', () => {
    const entries = Array.from({ length: 8 }, (_, i) => entry({ book_id: String(i), title: `Leopard ${i}`, author_fl: 'X Y' }));
    expect(proposal({ entries, book: { ...base, author: 'Nobody Else' } }).librarything.nearest).toHaveLength(5);
  });

  it('passes the page count through, or null', () => {
    const pages = { n: 432, approx: false, source: 'openlibrary-isbn' };
    expect(proposal({ pages }).pages).toEqual(pages);
    expect(proposal().pages).toBeNull();
  });

  it('passes the blurb through', () => {
    expect(proposal({ blurb: 'A novel.' }).blurb).toBe('A novel.');
    expect(proposal().blurb).toBeNull();
  });

  it('reports a known country from author-countries.json, exactly keyed, else null', () => {
    const known = proposal({ authorCountries: { authors: { 'Giuseppe Tomasi di Lampedusa': ['it'] }, titles: {} } });
    expect(known.country).toEqual({ known: ['it'] });
    expect(proposal().country).toEqual({ known: null });
    const byTitle = proposal({ book: { ...base, author: '' }, authorCountries: { authors: {}, titles: { 'The Leopard': ['it'] } } });
    expect(byTitle.country).toEqual({ known: ['it'] });
  });

  it('asks for the original language only when there is a translator', () => {
    expect(proposal().language).toEqual({ needed: false, known: null });
    const withT = { ...base, translator: 'Archibald Colquhoun' };
    expect(proposal({ book: withT }).language).toEqual({ needed: true, known: null });
    const langs = { authors: { 'giuseppe tomasi di lampedusa': 'Italian' }, titles: {} };
    expect(proposal({ book: withT, languages: langs }).language).toEqual({ needed: true, known: 'Italian' });
    expect(proposal({ languages: langs }).language).toEqual({ needed: false, known: null });
  });

  it('falls back to the LibraryThing original-language code when the data files have none', () => {
    const withT = { ...base, translator: 'Archibald Colquhoun' };
    expect(proposal({ book: withT, entries: [entry({ original: 'ita' })] }).language).toEqual({ needed: true, known: 'Italian' });
  });
});
