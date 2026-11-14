// Pairs books.md entries with LibraryThing catalogue entries, and cleans up the
// cover URLs and descriptions that come with them.

const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^(the|a|an) /, '');

const mainTitle = (s) => String(s ?? '').split(/[:(]/)[0];

const titleForms = (title) => [normalize(title), normalize(mainTitle(title))].filter(Boolean);

const surname = (author) => {
  const first = author.split(/ and |,|;/)[0];
  return normalize(first).split(' ').pop();
};

// The best LibraryThing entry for a book, or null. Among candidates an exact
// full-title match wins, then one with an ISBN, then the most recent. Titles must agree (full or
// main title, either side) and, when the book has an author, the first author's
// surname must appear among the entry's authors.
export function matchBook(book, entries) {
  const wanted = titleForms(book.title);
  const sur = book.author ? surname(book.author) : '';
  const hits = entries.filter((e) => {
    if (!titleForms(e.title).some((t) => wanted.includes(t))) return false;
    return !sur || ` ${normalize(e.author_fl)} `.includes(` ${sur} `);
  });
  if (!hits.length) return null;
  const full = normalize(book.title);
  const rank = (e) => [normalize(e.title) === full ? 1 : 0, e.ISBN_cleaned ? 1 : 0, Number(e.entry_stamp) || 0];
  const cmp = (a, b) => {
    const [x, y] = [rank(a), rank(b)];
    return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
  };
  return hits.sort(cmp)[0];
}

// LibraryThing feed covers are thumbnails; the size is part of the URL.
export function largeCover(url) {
  if (url.includes('images-amazon.com')) return url.replace('_SX100_SY200_', '_SX400_');
  if (url.includes('pics.cdn.librarything.com')) return url.replace('-h200-w100-', '-h600-w300-');
  return url;
}

const MAX_BLURB = 600;
const MIN_BLURB = 40;

// Plain-text description, or null when there is nothing worth showing.
export function cleanBlurb(text) {
  if (typeof text !== 'string') return null;
  let t = text
    .replace(/(?:-{10,}|Contains:|See also:|\(\[source\])[\s\S]*$/, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1')
    .replace(/(\*\*|__|\*)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > MAX_BLURB) {
    const head = t.slice(0, MAX_BLURB);
    const ends = [...head.matchAll(/[.!?]["”')]*(?=\s|$)/g)];
    const last = ends[ends.length - 1];
    t = last ? head.slice(0, last.index + last[0].length) : `${head.slice(0, head.lastIndexOf(' ')).trim()}…`;
  }
  return t.length < MIN_BLURB ? null : t;
}
