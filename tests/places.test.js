import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { countriesOfBook, placesOfBook, placeOfCity, countryName, readOnlyCountries, readByYear } from '../src/lib/places.js';
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

describe('placesOfBook', () => {
  const settings = { HHhH: ['cz'], "Midnight's Children": ['in'], 'The Poetic Edda': ['no'] };
  const binet = { title: 'HHhH', author: 'Laurent Binet' };
  const withBinet = { ...data, authors: { ...data.authors, 'Laurent Binet': ['fr'] } };

  it('lists a book under its author\'s country as "from" and its setting as "about"', () => {
    expect(placesOfBook(binet, withBinet, settings)).toEqual([{ code: 'fr', why: 'from' }, { code: 'cz', why: 'about' }]);
  });

  it('marks a country that is both origin and setting as "both", once', () => {
    expect(placesOfBook({ title: "Midnight's Children", author: 'Salman Rushdie' }, data, settings))
      .toEqual([{ code: 'gb', why: 'from' }, { code: 'in', why: 'both' }]);
  });

  it('places a book by setting alone when its author is unknown', () => {
    expect(placesOfBook(binet, data, settings)).toEqual([{ code: 'cz', why: 'about' }]);
  });

  it('uses the title entry as the origin of an authorless work', () => {
    expect(placesOfBook({ title: 'The Poetic Edda', author: '' }, data, settings)).toEqual([{ code: 'is', why: 'from' }, { code: 'no', why: 'about' }]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(placesOfBook({ title: 'X', author: 'Nobody Known' }, data, settings)).toEqual([]);
  });
});

describe('countryName', () => {
  it('names a country from its code', () => {
    expect(countryName('jp')).toBe('Japan');
    expect(countryName('kr')).toBe('South Korea');
  });

  it('spells out names ICU abbreviates or qualifies', () => {
    expect(countryName('cd')).toBe('DR Congo');
    expect(countryName('lc')).toBe('Saint Lucia');
    expect(countryName('ba')).toBe('Bosnia and Herzegovina');
  });
});

describe('readOnlyCountries', () => {
  const byCountry = { jp: [[0, 'from']], fr: [[1, 'from']], cd: [[2, 'about']], br: [] };

  it('lists countries with books that are not visited, by name', () => {
    expect(readOnlyCountries(byCountry, ['fr'])).toEqual([
      { code: 'cd', name: 'DR Congo' },
      { code: 'jp', name: 'Japan' },
    ]);
  });

  it('leaves out countries with an empty book list', () => {
    expect(readOnlyCountries(byCountry, []).map((c) => c.code)).not.toContain('br');
  });

  it('is empty when every country with books is visited', () => {
    expect(readOnlyCountries(byCountry, ['jp', 'fr', 'cd'])).toEqual([]);
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

describe('readByYear', () => {
  const books = [{ year: 2017 }, { year: 2020 }, { year: 2018 }, { year: 2023 }];
  const byCountry = { se: [[0, 'from'], [3, 'about']], jp: [[1, 'from']], be: [[2, 'about']], br: [] };

  it('lists countries with a book read by that year and not yet visited, sorted by code', () => {
    expect(readByYear(byCountry, books, [], 2018)).toEqual(['be', 'se']);
  });

  it('counts a country from its first book, whatever later books are read', () => {
    expect(readByYear(byCountry, books, [], 2017)).toEqual(['se']);
  });

  it('leaves out countries visited by then', () => {
    expect(readByYear(byCountry, books, ['se'], 2023)).toEqual(['be', 'jp']);
  });

  it('is empty before the first book', () => {
    expect(readByYear(byCountry, books, [], 2016)).toEqual([]);
  });
});
