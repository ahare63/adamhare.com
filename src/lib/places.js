// Where books and concerts belong on the maps. Codes are lowercase ISO-2 (countries)
// and lowercase USPS (US states), matching the region ids in the map SVGs.

// Countries of a book: its title entry if there is one, else its author's entry.
// `data` is src/data/author-countries.json.
export function countriesOfBook(book, data) {
  const byTitle = data.titles?.[book.title];
  if (byTitle) return byTitle;
  return (book.author && data.authors?.[book.author]) || [];
}

// Every country a book belongs under, each with why: 'from' (its author's or the
// work's country), 'about' (where it is set or what it is about) or 'both'.
// `settings` is src/data/book-settings.json: exact title -> codes.
export function placesOfBook(book, data, settings) {
  const about = settings?.[book.title] || [];
  const from = countriesOfBook(book, data);
  return [
    ...from.map((code) => ({ code, why: about.includes(code) ? 'both' : 'from' })),
    ...about.filter((code) => !from.includes(code)).map((code) => ({ code, why: 'about' })),
  ];
}

// ICU's English names that read badly on the page.
const NAMES = { cd: 'DR Congo', lc: 'Saint Lucia', ba: 'Bosnia and Herzegovina' };
let regionNames = null;

// Display name of a lowercase ISO-2 country code.
export function countryName(code) {
  if (NAMES[code]) return NAMES[code];
  regionNames ??= new Intl.DisplayNames(['en'], { type: 'region' });
  return regionNames.of(code.toUpperCase());
}

// Countries with at least one book that aren't in `visitedCodes`, as [{code, name}] sorted by name.
// `booksByCountry` is code -> [[index, why]], as built for the Travel page.
export function readOnlyCountries(booksByCountry, visitedCodes) {
  const visited = new Set(visitedCodes);
  return Object.entries(booksByCountry)
    .filter(([code, list]) => list.length > 0 && !visited.has(code))
    .map(([code]) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Countries with a book read in or before `year` that aren't in `visitedCodes` (visited by then), sorted by code.
// `books` is [{year}] (year read), indexed by `booksByCountry` entries.
export function readByYear(booksByCountry, books, visitedCodes, year) {
  const visited = new Set(visitedCodes);
  return Object.entries(booksByCountry)
    .filter(([code, list]) => !visited.has(code) && list.some(([i]) => books[i].year <= year))
    .map(([code]) => code)
    .sort();
}

// Concert city exactly as written in concerts.json -> displayed city and map regions.
const CITIES = {
  'NYC': { city: 'New York', state: 'ny', country: 'us' },
  'Port Chester, NY': { city: 'Port Chester', state: 'ny', country: 'us' },
  'Princeton, NJ': { city: 'Princeton', state: 'nj', country: 'us' },
  'Cincinnati, OH': { city: 'Cincinnati', state: 'oh', country: 'us' },
  'Columbus, OH': { city: 'Columbus', state: 'oh', country: 'us' },
  'Kettering, OH': { city: 'Kettering', state: 'oh', country: 'us' },
  'Dayton, OH': { city: 'Dayton', state: 'oh', country: 'us' },
  'Chicago': { city: 'Chicago', state: 'il', country: 'us' },
  'Milwaukee, WI': { city: 'Milwaukee', state: 'wi', country: 'us' },
  'Austin, TX': { city: 'Austin', state: 'tx', country: 'us' },
  'Dallas, TX': { city: 'Dallas', state: 'tx', country: 'us' },
  'Boston': { city: 'Boston', state: 'ma', country: 'us' },
  'Pittsburgh, PA': { city: 'Pittsburgh', state: 'pa', country: 'us' },
  'Wilkes-Barre, PA': { city: 'Wilkes-Barre', state: 'pa', country: 'us' },
  'London': { city: 'London', state: null, country: 'gb' },
  'Oxford': { city: 'Oxford', state: null, country: 'gb' },
  'Toronto': { city: 'Toronto', state: null, country: 'ca' },
};

export function placeOfCity(city) {
  const p = CITIES[city];
  return p ? { ...p } : null;
}
