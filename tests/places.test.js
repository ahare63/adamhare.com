import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { countriesOfBook, placeOfCity } from '../src/lib/places.js';
import { parseBooks } from '../src/lib/books.js';

const data = {
  authors: { 'Virginia Woolf': ['gb'], 'Salman Rushdie': ['gb', 'in'] },
  titles: { 'The Poetic Edda': ['is'], 'Beowulf': ['gb'] },
};

describe('countriesOfBook', () => {
  it('finds an author', () => {
    expect(countriesOfBook({ title: 'The Waves', author: 'Virginia Woolf' }, data)).toEqual(['gb']);
  });

  it('returns every country of a multi-country author', () => {
    expect(countriesOfBook({ title: "Midnight's Children", author: 'Salman Rushdie' }, data)).toEqual(['gb', 'in']);
  });

  it('lets a title entry win over the author entry', () => {
    expect(countriesOfBook({ title: 'Beowulf', author: 'Virginia Woolf' }, data)).toEqual(['gb']);
  });

  it('finds books with no author by title', () => {
    expect(countriesOfBook({ title: 'The Poetic Edda', author: '' }, data)).toEqual(['is']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(countriesOfBook({ title: 'X', author: 'Nobody Known' }, data)).toEqual([]);
    expect(countriesOfBook({ title: 'X', author: '' }, data)).toEqual([]);
  });
});

describe('placeOfCity', () => {
  it('maps a US city with its state', () => {
    expect(placeOfCity('Cincinnati, OH')).toEqual({ city: 'Cincinnati', state: 'oh', country: 'us' });
  });

  it('displays NYC as New York', () => {
    expect(placeOfCity('NYC')).toEqual({ city: 'New York', state: 'ny', country: 'us' });
  });

  it('gives no state outside the US', () => {
    expect(placeOfCity('Oxford')).toEqual({ city: 'Oxford', state: null, country: 'gb' });
    expect(placeOfCity('Toronto')).toEqual({ city: 'Toronto', state: null, country: 'ca' });
  });

  it('returns null for an unknown city', () => {
    expect(placeOfCity('Atlantis')).toBeNull();
  });
});

describe('real data', () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf-8');
  const authorCountries = JSON.parse(read('../src/data/author-countries.json'));
  const books = parseBooks(read('../src/content/books.md'));

  it('every country code is two lowercase letters', () => {
    const codes = [...Object.values(authorCountries.authors), ...Object.values(authorCountries.titles)].flat();
    expect(codes.length).toBeGreaterThan(0);
    const bad = codes.filter((c) => !/^[a-z]{2}$/.test(c));
    expect(bad).toEqual([]);
  });

  it('places at least 95% of the reading list', () => {
    const placed = books.filter((b) => countriesOfBook(b, authorCountries).length > 0).length;
    expect(placed / books.length).toBeGreaterThanOrEqual(0.95);
  });

  it('every concert city is mapped to a place', () => {
    const concerts = JSON.parse(read('../src/data/concerts.json'));
    const unmapped = [...new Set(concerts.map((c) => c.city))].filter((c) => !placeOfCity(c));
    expect(unmapped, `add these cities to src/lib/places.js: ${unmapped.join(', ')}`).toEqual([]);
  });
});
