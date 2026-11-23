import { describe, it, expect } from 'vitest';
import { parseConcerts } from '../src/lib/concerts-csv.js';

const csv = (...lines) => lines.join('\n') + '\n';

describe('parseConcerts', () => {
  it('turns rows into concerts in the shape the Music page uses', () => {
    const out = parseConcerts(csv('Artist,Date,City', 'The National,13 September 2024,NYC'));
    expect(out).toEqual([{ artist: 'The National', venue: '', city: 'NYC', date: '13 September 2024', setlist: '' }]);
  });

  it('trims every field, including a trailing space on the city', () => {
    const out = parseConcerts(csv('Artist,Date,City', ' Hozier , 8 June 2024 ,NYC '));
    expect(out).toEqual([{ artist: 'Hozier', venue: '', city: 'NYC', date: '8 June 2024', setlist: '' }]);
  });

  it('reads columns by header name, ignoring unknown ones', () => {
    const out = parseConcerts(csv('Notes,City,Seat,Artist,Date', 'private,Boston,12B,Vampire Weekend,6 October 2024'));
    expect(out).toEqual([{ artist: 'Vampire Weekend', venue: '', city: 'Boston', date: '6 October 2024', setlist: '' }]);
    expect(JSON.stringify(out)).not.toContain('private');
  });

  it('reads an optional Venue column, trimmed', () => {
    const out = parseConcerts(csv('Artist,Date,City,Venue', 'San Fermin,1 August 2025,NYC, Pioneer Works ', 'Hozier,8 June 2024,NYC,'));
    expect(out.map((c) => c.venue)).toEqual(['Pioneer Works', '']);
  });

  it('drops fully empty rows', () => {
    const out = parseConcerts(csv('Artist,Date,City', 'A,1 May 2020,NYC', ',,', '', 'B,2 May 2020,NYC'));
    expect(out.map((c) => c.artist)).toEqual(['B', 'A']);
  });

  it('sorts newest first by date and keeps sheet order within a day', () => {
    const out = parseConcerts(csv(
      'Artist,Date,City',
      'Old,3 March 2017,NYC',
      'Newest,9 February 2026,NYC',
      'First same day,5 June 2020,NYC',
      'Second same day,5 June 2020,NYC',
      'Mid,28 September 2019,NYC',
    ));
    expect(out.map((c) => c.artist)).toEqual(['Newest', 'First same day', 'Second same day', 'Mid', 'Old']);
  });

  it('throws when a required header is missing', () => {
    expect(() => parseConcerts(csv('Artist,When,City', 'A,1 May 2020,NYC'))).toThrow(/Date/);
  });

  it('throws when there are no rows', () => {
    expect(() => parseConcerts(csv('Artist,Date,City'))).toThrow(/no rows/i);
    expect(() => parseConcerts('')).toThrow();
  });

  it('throws on a row with no artist or no date, naming the row', () => {
    expect(() => parseConcerts(csv('Artist,Date,City', ',1 May 2020,NYC'))).toThrow(/row 2.*artist/i);
    expect(() => parseConcerts(csv('Artist,Date,City', 'A,,NYC'))).toThrow(/row 2.*date/i);
  });

  it('throws on a date that is not "D Month YYYY"', () => {
    for (const bad of ['2020-05-01', '5/1/2020', '1 Mayy 2020', '31 February 2020', 'May 1, 2020']) {
      expect(() => parseConcerts(csv('Artist,Date,City', `A,${bad},NYC`)), bad).toThrow(/date/i);
    }
  });

  it('throws on an HTML error page instead of a CSV', () => {
    expect(() => parseConcerts('<!DOCTYPE html><html><body>Sign in</body></html>')).toThrow();
  });

  describe('setlist links', () => {
    const text = csv('Artist,Date,City', 'Hozier,8 June 2024,NYC', ',,', 'The Beths,1 May 2023,NYC');
    const url = 'https://www.setlist.fm/setlist/beths/x.html';

    it('pairs the sheet\'s non-empty Artist cells with its rows, in order, skipping blank rows', () => {
      const cells = [{ row: 2, text: 'Hozier', url: '' }, { row: 4, text: 'The Beths', url }];
      const out = parseConcerts(text, { cells });
      expect(out.find((c) => c.artist === 'The Beths').setlist).toBe(url);
      expect(out.find((c) => c.artist === 'Hozier').setlist).toBe('');
    });

    it('throws when a cell names a different artist, so links never shift onto the wrong show', () => {
      const cells = [{ row: 2, text: 'The Beths', url }, { row: 4, text: 'Hozier', url: '' }];
      expect(() => parseConcerts(text, { cells })).toThrow(/Hozier.*The Beths/);
    });

    it('throws when the cell count differs from the row count', () => {
      expect(() => parseConcerts(text, { cells: [{ row: 2, text: 'Hozier', url: '' }] })).toThrow(/1 Artist cells but more concerts/);
      expect(() => parseConcerts(text, { cells: [{ text: 'Hozier', url: '' }, { text: 'The Beths', url: '' }, { text: 'Extra', url: '' }] })).toThrow(/3 Artist cells but 2 concerts/);
    });
  });
});
