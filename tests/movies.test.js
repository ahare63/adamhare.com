import { describe, it, expect } from 'vitest';
import { parseDiaryCsv, parseLetterboxdRss, mergeWatches, movieStats } from '../src/lib/movies.js';

const csv = (...lines) => lines.join('\n') + '\n';
const HEADER = 'Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date';

const item = ({ title, year, watched, rating, rewatch = 'No', slug = 'x' }) => `
  <item>
    <title>${title}, ${year}</title>
    <link>https://letterboxd.com/ahare63/film/${slug}/</link>
    <letterboxd:watchedDate>${watched}</letterboxd:watchedDate>
    <letterboxd:rewatch>${rewatch}</letterboxd:rewatch>
    <letterboxd:filmTitle>${title}</letterboxd:filmTitle>
    <letterboxd:filmYear>${year}</letterboxd:filmYear>
    ${rating ? `<letterboxd:memberRating>${rating}</letterboxd:memberRating>` : ''}
    <description><![CDATA[ <p>private review text</p> ]]></description>
  </item>`;
const rss = (...items) => `<?xml version="1.0"?><rss><channel>${items.join('')}</channel></rss>`;

describe('parseDiaryCsv', () => {
  it('reads the Letterboxd diary export into watches, newest first', () => {
    const out = parseDiaryCsv(csv(
      HEADER,
      '2024-01-02,Amélie,2001,https://boxd.it/abc,4,,,2024-01-01',
      '2024-03-02,"The Cook, the Thief, His Wife & Her Lover",1989,https://boxd.it/def,3.5,Yes,,2024-03-01',
    ));
    expect(out).toEqual([
      { title: 'The Cook, the Thief, His Wife & Her Lover', year: 1989, watched: '2024-03-01', rating: 3.5, rewatch: true },
      { title: 'Amélie', year: 2001, watched: '2024-01-01', rating: 4, rewatch: false },
    ]);
  });

  it('keeps unrated watches with a null rating', () => {
    const [w] = parseDiaryCsv(csv(HEADER, '2024-01-02,Zoolander,2001,https://boxd.it/a,,,,2024-01-01'));
    expect(w.rating).toBeNull();
  });

  it('throws when a required column is missing, so a bad file never replaces the snapshot', () => {
    expect(() => parseDiaryCsv(csv('Date,Name,Year,Rating,Rewatch', '2024-01-02,X,2001,,'))).toThrow(/no "Watched Date" column/);
  });

  it('throws on a watched date that is not YYYY-MM-DD', () => {
    expect(() => parseDiaryCsv(csv(HEADER, '2024-01-02,X,2001,u,,,,01/02/2024'))).toThrow(/X.*01\/02\/2024/);
  });
});

describe('parseLetterboxdRss', () => {
  it('reads diary items into the same shape as the export, without review text', () => {
    const out = parseLetterboxdRss(rss(
      item({ title: 'Broadcast News', year: 1987, watched: '2026-11-17', rating: '4.0' }),
      item({ title: 'Big Fish', year: 2003, watched: '2026-06-14', rewatch: 'Yes' }),
    ));
    expect(out).toEqual([
      { title: 'Broadcast News', year: 1987, watched: '2026-11-17', rating: 4, rewatch: false },
      { title: 'Big Fish', year: 2003, watched: '2026-06-14', rating: null, rewatch: true },
    ]);
    expect(JSON.stringify(out)).not.toContain('private');
  });

  it('decodes entities in titles', () => {
    const [w] = parseLetterboxdRss(rss(item({ title: 'The Cook, the Thief, His Wife &amp; Her Lover', year: 1989, watched: '2026-11-20' })));
    expect(w.title).toBe('The Cook, the Thief, His Wife & Her Lover');
  });

  it('skips items that are not diary entries (lists have no watchedDate)', () => {
    const list = '<item><title>My list</title><link>https://letterboxd.com/ahare63/list/x/</link></item>';
    expect(parseLetterboxdRss(rss(list, item({ title: 'A', year: 2000, watched: '2026-01-01' })))).toHaveLength(1);
  });

  it('throws when the response is not an RSS feed', () => {
    expect(() => parseLetterboxdRss('<html>error</html>')).toThrow(/RSS/);
  });
});

describe('mergeWatches', () => {
  const a = { title: 'A', year: 2000, watched: '2026-01-01', rating: 4, rewatch: false };
  const b = { title: 'B', year: 2001, watched: '2026-02-01', rating: null, rewatch: false };

  it('adds new watches and keeps the result newest first', () => {
    expect(mergeWatches([a], [b])).toEqual([b, a]);
  });

  it('treats the same film on the same day as one watch, preferring the incoming copy', () => {
    const edited = { ...a, rating: 4.5 };
    expect(mergeWatches([a, b], [edited])).toEqual([b, edited]);
  });

  it('keeps two watches of one film on different days', () => {
    const again = { ...a, watched: '2026-03-01', rewatch: true };
    expect(mergeWatches([a], [again])).toHaveLength(2);
  });
});

describe('movieStats', () => {
  const w = (title, watched, rating = null, rewatch = false, year = 2000) => ({ title, year, watched, rating, rewatch });
  const watches = [
    w('C', '2026-05-01', 5),
    w('A', '2026-04-01', 3, true),
    w('B', '2025-03-01', 5),
    w('A', '2025-02-01', 4),
  ];
  const s = movieStats(watches);

  it('counts watches, distinct films and rewatches', () => {
    expect(s.total).toBe(4);
    expect(s.films).toBe(3);
    expect(s.rewatches).toBe(1);
  });

  it('counts watches per year, oldest year first', () => {
    expect(s.perYear).toEqual([[2025, 2], [2026, 2]]);
  });

  it('builds a half-star rating histogram from 0.5 to 5', () => {
    expect(s.ratings).toHaveLength(10);
    expect(s.ratings.find(([r]) => r === 5)[1]).toBe(2);
    expect(s.ratings.find(([r]) => r === 0.5)[1]).toBe(0);
  });

  it('lists five-star films once each, most recently watched first', () => {
    expect(s.favorites.map((f) => f.title)).toEqual(['C', 'B']);
  });

  it('gives the most recent watches', () => {
    expect(s.recent.map((f) => f.title)).toEqual(['C', 'A', 'B', 'A']);
  });
});
