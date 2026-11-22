import { parseCSV } from './travel-map.js';
import { parseDate } from './concerts-csv.js';

// A dated tab of the public concerts sheet (CSV) -> one object per row, newest first.
// Reads only `columns`, by header name, into lower-cased keys, plus `link`. Rows with
// no Name are skipped. `cells` is the tab's non-empty Name cells below the header, in
// order ({text, url}, from columnCells); each pairs with one row and gives its link.
// Throws, naming the problem, on anything that should not replace the committed snapshot.
export function parseDatedTab(text, { tab, columns, cells }) {
  const rows = parseCSV(text);
  const header = (rows[0] || []).map((h) => h.trim());
  const col = {};
  for (const name of columns) {
    col[name] = header.indexOf(name);
    if (col[name] === -1) throw new Error(`${tab} tab has no "${name}" column`);
  }
  const out = [];
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
    const item = Object.fromEntries(columns.map((c) => [c.toLowerCase(), cell(c)]));
    out.push({ item: { ...item, link: sheetCell?.url ?? '' }, ts });
  }
  if (cells && cells.length !== n) throw new Error(`sheet has ${cells.length} Name cells but ${n} ${tab} rows`);
  return out.sort((a, b) => b.ts - a.ts).map((e) => e.item);
}
