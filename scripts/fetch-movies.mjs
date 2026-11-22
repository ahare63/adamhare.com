// Adds recent Letterboxd diary entries (from the member RSS feed) to src/data/movies.json.
// Run before build (CI runs it on every deploy). The feed holds only the latest ~50 entries,
// so the full history comes from scripts/import-letterboxd.mjs. Exits 1 WITHOUT writing
// when the feed is unreachable or malformed, so the committed snapshot stays in place.
import { readFileSync, writeFileSync } from 'node:fs';
import { parseLetterboxdRss, mergeFeed } from '../src/lib/movies.js';

const FEED_URL = 'https://letterboxd.com/ahare63/rss/';
const OUT = new URL('../src/data/movies.json', import.meta.url);

let recent;
try {
  const res = await fetch(FEED_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (adamhare.com build)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  recent = parseLetterboxdRss(await res.text());
  if (!recent.length) throw new Error('feed has no diary entries');
} catch (err) {
  console.error(`movies.json not updated: ${err.message}`);
  process.exit(1);
}

const existing = JSON.parse(readFileSync(OUT, 'utf8'));
const oldestInFeed = recent[recent.length - 1].watched;
if (existing.diary.length && existing.diary[0].watched < oldestInFeed) {
  console.warn(`WARNING: the feed starts at ${oldestInFeed}, after the snapshot's newest watch (${existing.diary[0].watched}); ` +
    'watches in between may be missing. Re-run scripts/import-letterboxd.mjs with a fresh export and commit movies.json.');
}
const merged = mergeFeed(existing, recent);
writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n');
console.log(`movies.json: ${merged.diary.length} diary entries (${merged.diary.length - existing.diary.length} new), ${merged.watched.length} films`);
