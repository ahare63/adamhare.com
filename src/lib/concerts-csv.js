import { parseCSV } from './travel-map.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "D Month YYYY" -> UTC timestamp, or null when it is not a real calendar date.
function parseDate(text) {
  const m = text.match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2]);
  if (month === -1) return null;
  const ts = Date.UTC(Number(m[3]), month, Number(m[1]));
  return new Date(ts).getUTCMonth() === month ? ts : null;
}

// Concerts-sheet CSV text -> [{artist, venue, city, date, setlist}], newest first.
// Reads only the Artist, Date and City columns, by header name. `cells` is the
// sheet's non-empty Artist cells below the header, in order ({text, url}, from columnCells);
// each pairs with one concert row and gives its setlist link. Throws, naming the problem,
// on anything that should not replace the committed snapshot.
export function parseConcerts(text, { cells } = {}) {
  const rows = parseCSV(text);
  const header = (rows[0] || []).map((h) => h.trim().toLowerCase());
  const col = {};
  for (const name of ['artist', 'date', 'city']) {
    col[name] = header.indexOf(name);
    if (col[name] === -1) throw new Error(`concerts sheet has no "${name[0].toUpperCase()}${name.slice(1)}" column`);
  }
  const concerts = [];
  let n = 0;
  rows.slice(1).forEach((r, i) => {
    const cell = (name) => (r[col[name]] || '').trim();
    const artist = cell('artist');
    const date = cell('date');
    const city = cell('city');
    if (!artist && !date && !city) return;
    const row = `row ${i + 2}`;
    if (!artist) throw new Error(`${row}: missing artist`);
    if (!date) throw new Error(`${row} (${artist}): missing date`);
    const ts = parseDate(date);
    if (ts === null) throw new Error(`${row} (${artist}): date "${date}" is not "D Month YYYY"`);
    const sheetCell = cells?.[n++];
    if (cells && !sheetCell) throw new Error(`sheet has ${cells.length} Artist cells but more concerts than that`);
    if (cells && sheetCell.text !== artist) throw new Error(`${row}: CSV says "${artist}" but the linked sheet says "${sheetCell.text}"`);
    concerts.push({ concert: { artist, venue: '', city, date, setlist: sheetCell?.url ?? '' }, ts });
  });
  if (!concerts.length) throw new Error('concerts sheet has no rows');
  if (cells && cells.length !== n) throw new Error(`sheet has ${cells.length} Artist cells but ${n} concerts`);
  return concerts.sort((a, b) => b.ts - a.ts).map((c) => c.concert);
}
