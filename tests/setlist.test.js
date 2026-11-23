import { describe, it, expect } from 'vitest';
import { setlistId, venueOf } from '../src/lib/setlist.js';

describe('setlistId', () => {
  it('takes the id from the end of a setlist.fm URL', () => {
    expect(setlistId('https://www.setlist.fm/setlist/hozier/2018/eventim-apollo-london-england-6394a257.html')).toBe('6394a257');
    expect(setlistId('https://www.setlist.fm/setlist/the-killers/2017/terminal-5-new-york-ny-5be20328.html')).toBe('5be20328');
  });

  it('returns null for a URL that is not a setlist page', () => {
    expect(setlistId('https://www.setlist.fm/venue/eventim-apollo-london-england-1bd4d104.html')).toBeNull();
    expect(setlistId('https://example.com/x-6394a257.html')).toBeNull();
  });
});

describe('venueOf', () => {
  // Shape of GET https://api.setlist.fm/rest/1.0/setlist/{id} (application/json).
  const response = {
    id: '6394a257',
    eventDate: '11-12-2018',
    artist: { name: 'Hozier' },
    venue: { id: '1bd4d104', name: 'Eventim Apollo', city: { name: 'London', country: { code: 'GB', name: 'United Kingdom' } } },
  };

  it('reads the venue name from a setlist response', () => {
    expect(venueOf(response)).toBe('Eventim Apollo');
  });

  it('returns null when the response has no venue name', () => {
    expect(venueOf({ ...response, venue: {} })).toBeNull();
    expect(venueOf({})).toBeNull();
  });
});
