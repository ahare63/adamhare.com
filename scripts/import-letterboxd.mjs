// Imports the Letterboxd data export into src/data/movies.json.
// Usage: node scripts/import-letterboxd.mjs <letterboxd-export.zip>
// The export's watched and ratings lists replace the snapshot's; its diary is merged in,
// so re-running with a newer export is safe.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseDiaryCsv, parseFilmsCsv, mergeWatches } from '../src/lib/movies.js';

const zip = process.argv[2];
if (!zip || !zip.endsWith('.zip') || !existsSync(zip)) {
  console.error('usage: node scripts/import-letterboxd.mjs <letterboxd-export.zip>');
  process.exit(1);
}
const read = (name) => execFileSync('unzip', ['-p', zip, name], { encoding: 'utf8' });
const watched = parseFilmsCsv(read('watched.csv'));
const ratings = parseFilmsCsv(read('ratings.csv'), { rated: true });
const diary = parseDiaryCsv(read('diary.csv'));

const OUT = new URL('../src/data/movies.json', import.meta.url);
const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { diary: [] };
const data = { watched, ratings, diary: mergeWatches(existing.diary ?? [], diary) };
writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
console.log(`movies.json: ${watched.length} films watched, ${ratings.length} rated, ${data.diary.length} diary entries`);
