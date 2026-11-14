// Where books and concerts belong on the maps. Codes are lowercase ISO-2 (countries)
// and lowercase USPS (US states), matching the region ids in the map SVGs.

// Countries of a book: its title entry if there is one, else its author's entry.
// `data` is src/data/author-countries.json.
export function countriesOfBook(book, data) {
  const byTitle = data.titles?.[book.title];
  if (byTitle) return byTitle;
  return (book.author && data.authors?.[book.author]) || [];
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
