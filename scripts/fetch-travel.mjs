// Snapshots the "Travel-Public" Google Sheet into src/data/travel.json.
// Run before build (CI runs it on every deploy). The Travel page also
// re-fetches the same CSV in the browser, so sheet edits appear live.
import { writeFileSync } from 'node:fs';
import { fetchSheet } from '../src/lib/travel-map.js';

const { countries, states, unknown } = await fetchSheet();

// Refuse to overwrite the committed snapshot with depleted data: unmapped
// entries (sheet typos, or an error page parsed as CSV) must fail loudly,
// BEFORE writing, so CI falls back to the snapshot instead of deploying
// a map with countries silently dropped.
if (unknown.length || countries.length === 0 || states.length === 0) {
  console.error(
    unknown.length
      ? `Could not map these sheet entries (fix spelling in the sheet): ${unknown.join(', ')}`
      : 'Sheet returned no usable rows.'
  );
  process.exit(1);
}

const out = new URL('../src/data/travel.json', import.meta.url);
writeFileSync(out, JSON.stringify({ countries, states }, null, 2) + '\n');
console.log(`travel.json: ${countries.length} countries, ${states.length} states`);
