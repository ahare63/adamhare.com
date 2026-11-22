import { describe, it, expect } from 'vitest';
import { parseMuseums } from '../src/lib/museums.js';

const csv = (...lines) => lines.join('\n') + '\n';
const HEADER = 'Name,Date,City,Country';

describe('parseMuseums', () => {
  it('reads rows into visits, newest first, with Name links from the sheet cells', () => {
    const url = 'https://www.metmuseum.org/';
    const out = parseMuseums(
      csv(HEADER, 'Louvre,2 June 2019,Paris,France', ',,,', ' Metropolitan Museum of Art ,15 November 2026,NYC,USA'),
      { cells: [{ text: 'Louvre', url: '' }, { text: 'Metropolitan Museum of Art', url }] },
    );
    expect(out).toEqual([
      { name: 'Metropolitan Museum of Art', date: '15 November 2026', city: 'NYC', country: 'USA', link: url },
      { name: 'Louvre', date: '2 June 2019', city: 'Paris', country: 'France', link: '' },
    ]);
  });

  it('ignores columns it does not read, so nothing private leaks', () => {
    const [m] = parseMuseums(csv('Country,Friends,Name,Date,City', 'USA,Sam,Met,1 May 2020,NYC'));
    expect(JSON.stringify(m)).not.toContain('Sam');
  });

  it('allows a header-only sheet', () => {
    expect(parseMuseums(csv(HEADER))).toEqual([]);
  });

  it('throws on a missing column, a bad date or a link mismatch, so a broken sheet never replaces the snapshot', () => {
    expect(() => parseMuseums(csv('Name,Date,City', 'X,1 May 2020,NYC'))).toThrow(/Museums tab has no "Country" column/);
    expect(() => parseMuseums(csv(HEADER, 'X,May 2020,NYC,USA'))).toThrow(/X.*"May 2020"/);
    expect(() => parseMuseums(csv(HEADER, 'Met,1 May 2020,NYC,USA'), { cells: [{ text: 'Louvre', url: 'u' }] })).toThrow(/Met.*Louvre/);
    expect(() => parseMuseums(csv(HEADER, 'Met,1 May 2020,NYC,USA'), { cells: [] })).toThrow();
  });
});
