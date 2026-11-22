// Snapshots the public concerts Google Sheet into src/data/concerts.json.
// Run before build (CI runs it on every deploy). Exits 1 WITHOUT writing when the
// sheet is unreachable or malformed, so the committed snapshot stays in place.
//
// Rows come from the CSV export. Setlist links come from the .xlsx export (CSV drops
// hyperlinks), read with the system `unzip`. Venues come from the setlist.fm API (key in
// SETLIST_FM_API) and are cached by setlist id in src/data/setlist-venues.json, so only new
// setlists are looked up. Without a key, or when a lookup fails, cached venues are still used.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseConcerts } from '../src/lib/concerts-csv.js';
import { placeOfCity } from '../src/lib/places.js';
import { sheetPath, columnCells } from '../src/lib/sheet-links.js';
import { setlistId, venueOf } from '../src/lib/setlist.js';

const SHEET_ID = '1-CdQRuN3z2tnZ2HZfcWtx97496zCuqgfmxBYf-A6KhY';
const TAB = 'Concerts';
const EXPORT = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export`;
const VENUES = new URL('../src/data/setlist-venues.json', import.meta.url);
const API = 'https://api.setlist.fm/rest/1.0/setlist/';
const API_INTERVAL_MS = 1000; // 600 ms (the stated 2/s) drew a 429

async function get(url, as = 'text') {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (adamhare.com build)' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : res.text();
}

function artistCells(xlsx) {
  const dir = mkdtempSync(join(tmpdir(), 'concerts-'));
  try {
    const file = join(dir, 'sheet.xlsx');
    writeFileSync(file, xlsx);
    const part = (name) => execFileSync('unzip', ['-p', file, name], { encoding: 'utf8', maxBuffer: 64 << 20 });
    const sheet = sheetPath(part('xl/workbook.xml'), part('xl/_rels/workbook.xml.rels'), TAB);
    const rels = sheet.replace(/([^/]+)$/, '_rels/$1.rels');
    return columnCells(part(sheet), part(rels), part('xl/sharedStrings.xml'), 'A').filter((c) => c.row > 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

let concerts;
try {
  const [csv, xlsx] = await Promise.all([get(`${EXPORT}?format=csv`), get(`${EXPORT}?format=xlsx`, 'buffer')]);
  concerts = parseConcerts(csv, { cells: artistCells(xlsx) });
} catch (err) {
  console.error(`concerts.json not updated: ${err.message}`);
  process.exit(1);
}

const venues = JSON.parse(readFileSync(VENUES, 'utf8'));
const missing = [...new Set(concerts.map((c) => setlistId(c.setlist)).filter((id) => id && !(id in venues)))];
const key = process.env.SETLIST_FM_API;
if (missing.length && !key) console.warn(`${missing.length} setlists have no cached venue; set SETLIST_FM_API to look them up`);
if (missing.length && key) {
  for (const [i, id] of missing.entries()) {
    if (i) await new Promise((r) => setTimeout(r, API_INTERVAL_MS));
    try {
      const res = await fetch(API + id, { headers: { 'x-api-key': key, Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const venue = venueOf(await res.json());
      if (venue) venues[id] = venue;
      else console.warn(`setlist ${id}: no venue in the API response`);
    } catch (err) {
      console.warn(`setlist ${id}: venue lookup failed, retried next run (${err.message})`);
    }
  }
  const sorted = Object.fromEntries(Object.entries(venues).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(VENUES, JSON.stringify(sorted, null, 2) + '\n');
}
for (const c of concerts) c.venue = venues[setlistId(c.setlist)] ?? '';

const unmapped = [...new Set(concerts.map((c) => c.city))].filter((city) => !placeOfCity(city));
if (unmapped.length) {
  console.warn(`WARNING: no map place for ${unmapped.map((c) => `"${c}"`).join(', ')}; add a line to src/lib/places.js`);
}

writeFileSync(new URL('../src/data/concerts.json', import.meta.url), JSON.stringify(concerts, null, 2) + '\n');
console.log(`concerts.json: ${concerts.length} concerts, ${concerts.filter((c) => c.setlist).length} with setlists, ${concerts.filter((c) => c.venue).length} with venues`);
