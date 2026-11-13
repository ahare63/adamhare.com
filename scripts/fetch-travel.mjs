// Snapshots the "Travel-Public" Google Sheet into src/data/travel.json.
// Run before build (CI runs it on every deploy). The Travel page also
// re-fetches the same CSV in the browser, so sheet edits appear live.
import { writeFileSync } from 'node:fs';
import { fetchSheet } from '../src/lib/travel-map.js';

const { countries, states, unknown } = await fetchSheet();

if (unknown.length) {
  console.error('Could not map these sheet entries (fix spelling in the sheet):', unknown.join(', '));
  process.exitCode = 1;
}

const out = new URL('../src/data/travel.json', import.meta.url);
writeFileSync(out, JSON.stringify({ countries, states }, null, 2) + '\n');
console.log(`travel.json: ${countries.length} countries, ${states.length} states${unknown.length ? ` (${unknown.length} unmapped!)` : ''}`);
