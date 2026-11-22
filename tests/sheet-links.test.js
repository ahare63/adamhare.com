import { describe, it, expect } from 'vitest';
import { sheetPath, columnCells } from '../src/lib/sheet-links.js';

const rel = (id, target, type = 'worksheet') =>
  `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"${type === 'hyperlink' ? ' TargetMode="External"' : ''}/>`;
const rels = (...rs) => `<?xml version="1.0"?><Relationships>${rs.join('')}</Relationships>`;

describe('sheetPath', () => {
  it('finds a tab\'s worksheet file by tab name', () => {
    const workbook = '<workbook><sheets><sheet state="visible" name="Concerts" sheetId="1" r:id="rId5"/><sheet name="Live Events" sheetId="2" r:id="rId6"/></sheets></workbook>';
    const wbRels = rels(rel('rId6', 'worksheets/sheet2.xml'), rel('rId5', 'worksheets/sheet1.xml'));
    expect(sheetPath(workbook, wbRels, 'Concerts')).toBe('xl/worksheets/sheet1.xml');
    expect(sheetPath(workbook, wbRels, 'Live Events')).toBe('xl/worksheets/sheet2.xml');
  });

  it('throws when the tab is missing', () => {
    expect(() => sheetPath('<sheets></sheets>', rels(), 'Concerts')).toThrow(/no "Concerts" tab/);
  });
});

describe('columnCells', () => {
  const sheet = `<worksheet><sheetData>
    <row r="1"><c r="A1" t="str"><v>Artist</v></c></row>
    <row r="2"><c r="A2" s="6" t="str"><f>IFERROR(x)</f><v>Motion City Soundtrack</v></c><c r="B2"><v>46052</v></c></row>
    <row r="3"><c r="A3" t="s"><v>1</v></c></row>
    <row r="4"><c r="A4" t="str"><v>No Link &amp; Co</v></c><c r="B4" s="9"/></row>
    <row r="5"><c r="A5" s="9"/></row>
    <row r="12"><c r="A12" t="str"><v>Hozier </v></c></row>
  </sheetData><hyperlinks><hyperlink r:id="rId1" ref="A2"/><hyperlink r:id="rId2" ref="A3"/><hyperlink r:id="rId3" ref="B2"/><hyperlink r:id="rId4" ref="A12"/></hyperlinks></worksheet>`;
  const sheetRels = rels(
    rel('rId1', 'https://www.setlist.fm/setlist/mcs/a.html', 'hyperlink'),
    rel('rId2', 'https://www.setlist.fm/setlist/beths/b.html?x=1&amp;y=2', 'hyperlink'),
    rel('rId3', 'https://example.com/date', 'hyperlink'),
    rel('rId4', 'https://www.setlist.fm/setlist/hozier/c.html', 'hyperlink'),
  );
  const shared = '<sst><si><t>Unused</t></si><si><r><t>The </t></r><r><t>Beths</t></r></si></sst>';
  const cells = columnCells(sheet, sheetRels, shared, 'A');

  it('lists every non-empty cell in the column in row order, with its link or an empty url', () => {
    expect(cells).toEqual([
      { row: 1, text: 'Artist', url: '' },
      { row: 2, text: 'Motion City Soundtrack', url: 'https://www.setlist.fm/setlist/mcs/a.html' },
      { row: 3, text: 'The Beths', url: 'https://www.setlist.fm/setlist/beths/b.html?x=1&y=2' },
      { row: 4, text: 'No Link & Co', url: '' },
      { row: 12, text: 'Hozier', url: 'https://www.setlist.fm/setlist/hozier/c.html' },
    ]);
  });
});
