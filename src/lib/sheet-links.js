// Reads hyperlinks out of a Google Sheets .xlsx export. The CSV export drops them.

const decode = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

function relTargets(relsXml) {
  const out = new Map();
  for (const [tag] of relsXml.matchAll(/<Relationship\s[^>]*>/g)) out.set(attr(tag, 'Id'), decode(attr(tag, 'Target')));
  return out;
}

// xl/workbook.xml + xl/_rels/workbook.xml.rels -> the zip path of the named tab's worksheet.
export function sheetPath(workbookXml, workbookRelsXml, name) {
  const sheet = [...workbookXml.matchAll(/<sheet\s[^>]*>/g)].map(([t]) => t).find((t) => decode(attr(t, 'name') ?? '') === name);
  const target = sheet && relTargets(workbookRelsXml).get(attr(sheet, 'r:id'));
  if (!target) throw new Error(`workbook has no "${name}" tab`);
  return `xl/${target.replace(/^\/?xl\//, '')}`;
}

// Worksheet XML, its rels and the shared strings -> the non-empty cells of one column, in row
// order, as [{row, text, url}] (url is '' when the cell has no link).
export function columnCells(sheetXml, sheetRelsXml, sharedStringsXml, column) {
  const shared = [...sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(([, si]) =>
    decode([...si.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1]).join('')));
  const targets = relTargets(sheetRelsXml);
  const urls = new Map();
  for (const [tag] of sheetXml.matchAll(/<hyperlink\s[^>]*>/g)) urls.set(attr(tag, 'ref'), targets.get(attr(tag, 'r:id')) ?? '');
  const out = [];
  for (const [, open, body] of sheetXml.matchAll(/<c(\s[^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const ref = attr(open, 'r');
    const m = ref?.match(/^([A-Z]+)(\d+)$/);
    const v = body?.match(/<v>([^<]*)<\/v>/)?.[1];
    if (!m || m[1] !== column || v === undefined) continue;
    const text = (attr(open, 't') === 's' ? shared[Number(v)] : decode(v)).trim();
    if (text) out.push({ row: Number(m[2]), text, url: urls.get(ref) ?? '' });
  }
  return out.sort((a, b) => a.row - b.row);
}
