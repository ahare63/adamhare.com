import { describe, it, expect } from 'vitest';
import { parseLiveEvents } from '../src/lib/live-events.js';

const csv = (...lines) => lines.join('\n') + '\n';
const HEADER = 'Name,Type,Date,Venue,City,Country';

describe('parseLiveEvents', () => {
  it('reads rows into events, newest first', () => {
    const out = parseLiveEvents(csv(
      HEADER,
      'Hamlet,Play,3 March 2024,Park Theater,NYC,USA',
      ' Paranormal Activity ,Play,22 November 2026,August Wilson Theater,NYC ,USA',
    ));
    expect(out).toEqual([
      { name: 'Paranormal Activity', type: 'Play', date: '22 November 2026', venue: 'August Wilson Theater', city: 'NYC', country: 'USA', link: '' },
      { name: 'Hamlet', type: 'Play', date: '3 March 2024', venue: 'Park Theater', city: 'NYC', country: 'USA', link: '' },
    ]);
  });

  it('reads columns by header name and ignores any others', () => {
    const [e] = parseLiveEvents(csv('Country,Name,Notes,Date,Type,City,Venue', 'USA,Cats,private,1 May 2020,Musical,NYC,Winter Garden'));
    expect(e).toMatchObject({ name: 'Cats', type: 'Musical', venue: 'Winter Garden' });
    expect(JSON.stringify(e)).not.toContain('private');
  });

  it('attaches Name links from the sheet cells, in order', () => {
    const url = 'https://www.ibdb.com/broadway-production/paranormal-activity-546939';
    const out = parseLiveEvents(csv(HEADER, 'Paranormal Activity,Play,22 November 2026,V,NYC,USA', ',,,,,'), { cells: [{ text: 'Paranormal Activity', url }] });
    expect(out[0].link).toBe(url);
  });

  it('throws when a linked cell names a different event', () => {
    expect(() => parseLiveEvents(csv(HEADER, 'Cats,Musical,1 May 2020,V,NYC,USA'), { cells: [{ text: 'Hamlet', url: 'u' }] })).toThrow(/Cats.*Hamlet/);
  });

  it('allows an empty sheet (header only)', () => {
    expect(parseLiveEvents(csv(HEADER))).toEqual([]);
  });

  it('throws on a missing column or a bad date, so a broken sheet never replaces the snapshot', () => {
    expect(() => parseLiveEvents(csv('Name,Date', 'X,1 May 2020'))).toThrow(/no "Type" column/);
    expect(() => parseLiveEvents(csv(HEADER, 'X,Play,May 2020,V,NYC,USA'))).toThrow(/X.*"May 2020"/);
  });
});
