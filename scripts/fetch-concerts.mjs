// Snapshots the public concerts Google Sheet into src/data/concerts.json.
// Run before build (CI runs it on every deploy). Exits 1 WITHOUT writing when the
// sheet is unreachable or malformed, so the committed snapshot stays in place.
import { writeFileSync } from 'node:fs';
import { parseConcerts } from '../src/lib/concerts-csv.js';
import { placeOfCity } from '../src/lib/places.js';

const SHEET_ID = '1-CdQRuN3z2tnZ2HZfcWtx97496zCuqgfmxBYf-A6KhY';
const URL_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

let concerts;
try {
  const res = await fetch(URL_CSV);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  concerts = parseConcerts(await res.text());
} catch (err) {
  console.error(`concerts.json not updated: ${err.message}`);
  process.exit(1);
}

const unmapped = [...new Set(concerts.map((c) => c.city))].filter((city) => !placeOfCity(city));
if (unmapped.length) {
  console.warn(`WARNING: no map place for ${unmapped.map((c) => `"${c}"`).join(', ')}; add a line to src/lib/places.js`);
}

writeFileSync(new URL('../src/data/concerts.json', import.meta.url), JSON.stringify(concerts, null, 2) + '\n');
console.log(`concerts.json: ${concerts.length} concerts`);
