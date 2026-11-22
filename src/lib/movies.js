import { parseCSV } from './travel-map.js';

// A watch is {title, year, watched: 'YYYY-MM-DD', rating: number|null, rewatch: boolean}.
// Review text is never kept: the site shows a summary and links to Letterboxd.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const newestFirst = (a, b) => (a.watched < b.watched ? 1 : a.watched > b.watched ? -1 : 0);
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

// Summary numbers for the Movies page. `watches` must be newest first.
export function movieStats(watches, { recentCount = 10 } = {}) {
  const films = new Set(watches.map((w) => `${w.title}\u0000${w.year}`));
  const perYear = new Map();
  for (const w of watches) {
    const y = Number(w.watched.slice(0, 4));
    perYear.set(y, (perYear.get(y) ?? 0) + 1);
  }
  const ratings = Array.from({ length: 10 }, (_, i) => [(i + 1) / 2, 0]);
  for (const w of watches) if (w.rating) ratings[w.rating * 2 - 1][1]++;
  const seen = new Set();
  const favorites = [];
  for (const w of watches) {
    const film = `${w.title}\u0000${w.year}`;
    if (w.rating === 5 && !seen.has(film)) {
      seen.add(film);
      favorites.push(w);
    }
  }
  return {
    total: watches.length,
    films: films.size,
    rewatches: watches.filter((w) => w.rewatch).length,
    perYear: [...perYear.entries()].sort((a, b) => a[0] - b[0]),
    ratings,
    favorites,
    recent: watches.slice(0, recentCount),
  };
}
