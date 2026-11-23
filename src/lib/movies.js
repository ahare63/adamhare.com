import { parseCSV } from './travel-map.js';

// movies.json is {watched, ratings, diary}:
//   watched: every film marked watched [{title, year}] (most were never logged with a date)
//   ratings: every rated film [{title, year, rating}]
//   diary:   dated watches [{title, year, watched: 'YYYY-MM-DD', rating: number|null, rewatch: boolean}], newest first
// Review text is never kept: the site shows a summary and links to Letterboxd.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const newestFirst = (a, b) => (a.watched < b.watched ? 1 : a.watched > b.watched ? -1 : 0);
const filmKey = (f) => `${f.title}\u0000${f.year}`;
const key = (w) => `${w.title}\u0000${w.year}\u0000${w.watched}`;
const rating = (text) => (text ? Number(text) : null);

// diary.csv from the Letterboxd data export -> watches, newest first.
export function parseDiaryCsv(text) {
  const rows = parseCSV(text);
  const header = (rows[0] || []).map((h) => h.trim());
  const col = {};
  for (const name of ['Name', 'Year', 'Rating', 'Rewatch', 'Watched Date']) {
    col[name] = header.indexOf(name);
    if (col[name] === -1) throw new Error(`diary.csv has no "${name}" column`);
  }
  const watches = [];
  for (const r of rows.slice(1)) {
    const cell = (name) => (r[col[name]] || '').trim();
    const title = cell('Name');
    if (!title) continue;
    const watched = cell('Watched Date');
    if (!ISO_DATE.test(watched)) throw new Error(`diary.csv: ${title}: watched date "${watched}" is not YYYY-MM-DD`);
    watches.push({ title, year: Number(cell('Year')), watched, rating: rating(cell('Rating')), rewatch: cell('Rewatch') === 'Yes' });
  }
  return watches.sort(newestFirst);
}

// watched.csv -> [{title, year}]; with {rated: true}, ratings.csv -> [{title, year, rating}].
export function parseFilmsCsv(text, { rated = false } = {}) {
  const rows = parseCSV(text);
  const header = (rows[0] || []).map((h) => h.trim());
  const names = rated ? ['Name', 'Year', 'Rating'] : ['Name', 'Year'];
  const col = {};
  for (const name of names) {
    col[name] = header.indexOf(name);
    if (col[name] === -1) throw new Error(`${rated ? 'ratings' : 'watched'}.csv has no "${name}" column`);
  }
  const films = [];
  for (const r of rows.slice(1)) {
    const cell = (name) => (r[col[name]] || '').trim();
    const title = cell('Name');
    if (!title) continue;
    films.push(rated ? { title, year: Number(cell('Year')), rating: Number(cell('Rating')) } : { title, year: Number(cell('Year')) });
  }
  return films;
}

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1].trim()) : '';
};

// Letterboxd member RSS feed -> its diary watches (about the 50 most recent), newest first.
export function parseLetterboxdRss(xml) {
  if (!/^\s*(<\?xml|<rss)/.test(xml)) throw new Error('response is not an RSS feed');
  const watches = [];
  for (const [, block] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const watched = tag(block, 'letterboxd:watchedDate');
    if (!watched) continue;
    if (!ISO_DATE.test(watched)) throw new Error(`feed: watched date "${watched}" is not YYYY-MM-DD`);
    watches.push({
      title: tag(block, 'letterboxd:filmTitle'),
      year: Number(tag(block, 'letterboxd:filmYear')),
      watched,
      rating: rating(tag(block, 'letterboxd:memberRating')),
      rewatch: tag(block, 'letterboxd:rewatch') === 'Yes',
    });
  }
  return watches.sort(newestFirst);
}

// Adds incoming watches to existing ones. A film on the same day is one watch; the incoming copy wins.
export function mergeWatches(existing, incoming) {
  const byKey = new Map(existing.map((w) => [key(w), w]));
  for (const w of incoming) byKey.set(key(w), w);
  return [...byKey.values()].sort(newestFirst);
}

// Adds feed watches to the snapshot: new diary entries, newly watched films, and each film's
// rating from its newest rated watch in the feed.
export function mergeFeed(data, recent) {
  const watched = [...data.watched];
  const seen = new Set(watched.map(filmKey));
  const ratings = new Map(data.ratings.map((f) => [filmKey(f), f]));
  for (const w of [...recent].reverse()) {
    if (!seen.has(filmKey(w))) {
      seen.add(filmKey(w));
      watched.push({ title: w.title, year: w.year });
    }
    if (w.rating) ratings.set(filmKey(w), { title: w.title, year: w.year, rating: w.rating });
  }
  return { watched, ratings: [...ratings.values()], diary: mergeWatches(data.diary, recent) };
}

// Summary for the Movies section of the Stage & Screen page.
export function movieStats({ watched, ratings, diary }, { recentCount = 5 } = {}) {
  return { films: watched.length, rated: ratings.length, logged: diary.length, recent: diary.slice(0, recentCount) };
}
