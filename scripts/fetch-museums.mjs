// Snapshots the Museums tab of the public concerts Google Sheet into src/data/museums.json.
// Run before build (CI runs it on every deploy). Exits 1 WITHOUT writing when the sheet
// is unreachable or malformed, so the committed snapshot stays in place. Name links come
// from the .xlsx export, since CSV drops hyperlinks.
import { writeFileSync } from 'node:fs';
import { parseMuseums } from '../src/lib/museums.js';
import { xlsxColumnCells } from './xlsx-cells.mjs';

const SHEET_ID = '1-CdQRuN3z2tnZ2HZfcWtx97496zCuqgfmxBYf-A6KhY';
const TAB = 'Museums';
const GID = '71723608';
const EXPORT = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export`;

async function get(url, as = 'text') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return as === 'buffer' ? Buffer.from(await res.arrayBuffer()) : res.text();
}

let museums;
try {
  const [csv, xlsx] = await Promise.all([get(`${EXPORT}?format=csv&gid=${GID}`), get(`${EXPORT}?format=xlsx`, 'buffer')]);
  museums = parseMuseums(csv, { cells: xlsxColumnCells(xlsx, TAB, 'A') });
} catch (err) {
  console.error(`museums.json not updated: ${err.message}`);
  process.exit(1);
}

writeFileSync(new URL('../src/data/museums.json', import.meta.url), JSON.stringify(museums, null, 2) + '\n');
console.log(`museums.json: ${museums.length} visits, ${museums.filter((m) => m.link).length} with links`);
