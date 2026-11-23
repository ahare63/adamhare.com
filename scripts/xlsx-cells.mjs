// Google Sheets .xlsx export -> one tab's non-empty cells in a column, below the header,
// as [{row, text, url}]. Uses the system `unzip`.
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { sheetPath, columnCells } from '../src/lib/sheet-links.js';

export function xlsxColumnCells(xlsx, tab, column) {
  const dir = mkdtempSync(join(tmpdir(), 'sheet-'));
  try {
    const file = join(dir, 'sheet.xlsx');
    writeFileSync(file, xlsx);
    const part = (name) => execFileSync('unzip', ['-p', file, name], { encoding: 'utf8', maxBuffer: 64 << 20 });
    const sheet = sheetPath(part('xl/workbook.xml'), part('xl/_rels/workbook.xml.rels'), tab);
    const rels = sheet.replace(/([^/]+)$/, '_rels/$1.rels');
    let relsXml = '';
    try {
      relsXml = part(rels);
    } catch {
      // A tab with no links has no rels part.
    }
    return columnCells(part(sheet), relsXml, part('xl/sharedStrings.xml'), column).filter((c) => c.row > 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
