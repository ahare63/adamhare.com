import { parseCSV } from './travel-map.js';
import { parseDate } from './concerts-csv.js';

const COLUMNS = ['Name', 'Type', 'Date', 'Venue', 'City', 'Country'];

// Live Events tab CSV -> [{name, type, date, venue, city, country, link}], newest first.
// Reads columns by header name. `cells` is the tab's non-empty Name cells below the header,
// in order ({text, url}, from columnCells); each pairs with one row and gives its link.
// Throws, naming the problem, on anything that should not replace the committed snapshot.
export function parseLiveEvents(text, { cells } = {}) {
  const rows = parseCSV(text);
  const header = (rows[0] || []).map((h) => h.trim());
  const col = {};
  for (const name of COLUMNS) {
    col[name] = header.indexOf(name);
    if (col[name] === -1) throw new Error(`Live Events tab has no "${name}" column`);
  }
  const events = [];
  let n = 0;
  for (const r of rows.slice(1)) {
    const cell = (name) => (r[col[name]] || '').trim();
    const name = cell('Name');
    if (!name) continue;
    const date = cell('Date');
    const ts = parseDate(date);
    if (ts === null) throw new Error(`${name}: date "${date}" is not "D Month YYYY"`);
    const sheetCell = cells?.[n++];
    if (cells && sheetCell?.text !== name) throw new Error(`CSV says "${name}" but the linked sheet says "${sheetCell?.text}"`);
    events.push({
      event: { name, type: cell('Type'), date, venue: cell('Venue'), city: cell('City'), country: cell('Country'), link: sheetCell?.url ?? '' },
      ts,
    });
  }
  if (cells && cells.length !== n) throw new Error(`sheet has ${cells.length} Name cells but ${n} events`);
  return events.sort((a, b) => b.ts - a.ts).map((e) => e.event);
}
