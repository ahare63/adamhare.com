// One-time import of the Letterboxd data export into src/data/movies.json.
// Usage: node scripts/import-letterboxd.mjs <letterboxd-export.zip | diary.csv>
// Merges into the existing snapshot, so re-running with a newer export is safe.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseDiaryCsv, mergeWatches } from '../src/lib/movies.js';

const src = process.argv[2];
if (!src || !existsSync(src)) {
  console.error('usage: node scripts/import-letterboxd.mjs <letterboxd-export.zip | diary.csv>');
  process.exit(1);
}
const text = src.endsWith('.zip') ? execFileSync('unzip', ['-p', src, 'diary.csv'], { encoding: 'utf8' }) : readFileSync(src, 'utf8');
const imported = parseDiaryCsv(text);

const OUT = new URL('../src/data/movies.json', import.meta.url);
const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
const merged = mergeWatches(existing, imported);
writeFileSync(OUT, JSON.stringify(merged, null, 2) + '\n');
console.log(`movies.json: ${imported.length} diary entries imported, ${merged.length} watches total`);
