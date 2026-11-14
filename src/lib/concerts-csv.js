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

// Concerts-sheet CSV text -> [{artist, venue, city, date}], newest first.
// Reads only the Artist, Date and City columns, by header name. Throws, naming the
// problem, on anything that should not replace the committed snapshot.
export function parseConcerts(text) {
  const rows = parseCSV(text);
  const header = (rows[0] || []).map((h) => h.trim().toLowerCase());
  const col = {};
  for (const name of ['artist', 'date', 'city']) {
    col[name] = header.indexOf(name);
    if (col[name] === -1) throw new Error(`concerts sheet has no "${name[0].toUpperCase()}${name.slice(1)}" column`);
  }
  const concerts = [];
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
    concerts.push({ concert: { artist, venue: '', city, date }, ts });
  });
  if (!concerts.length) throw new Error('concerts sheet has no rows');
  return concerts.sort((a, b) => b.ts - a.ts).map((c) => c.concert);
}
