import { describe, it, expect } from 'vitest';
import { applyProposal, insertBullet, serializeCountries } from '../scripts/add-book.mjs';

const md = `---
title: "Books"
---

Intro paragraph.

## 2026

- *Taipei Story* by R.F. Kuang
- *Hares*, ed. D. Wyn Hughes

## 2025

- *Copaganda* by Alec Karakatsanis
`;

describe('insertBullet', () => {
  it('puts the line first under an existing year', () => {
    const out = insertBullet(md, 2026, '- *New Book* by A B');
    expect(out).toContain('## 2026\n\n- *New Book* by A B\n- *Taipei Story* by R.F. Kuang\n');
    expect(out.replace('- *New Book* by A B\n', '')).toBe(md);
  });

  it('creates a newer year section above the newest, with the file blank-line convention', () => {
    const out = insertBullet(md, 2027, '- *New Book* by A B');
    expect(out).toContain('Intro paragraph.\n\n## 2027\n\n- *New Book* by A B\n\n## 2026\n\n- *Taipei Story*');
  });

  it('places a missing older year between its neighbours', () => {
    const out = insertBullet(md.replace('## 2025', '## 2024'), 2025, '- *Mid* by A B');
    expect(out).toContain('- *Hares*, ed. D. Wyn Hughes\n\n## 2025\n\n- *Mid* by A B\n\n## 2024');
  });

  it('refuses when that exact line is already the first bullet of the year', () => {
    expect(() => insertBullet(md, 2026, '- *Taipei Story* by R.F. Kuang')).toThrow(/already/);
  });

  it('allows the same line lower down (a re-read in the same year)', () => {
    expect(insertBullet(md, 2026, '- *Hares*, ed. D. Wyn Hughes')).toContain('## 2026\n\n- *Hares*, ed. D. Wyn Hughes\n- *Taipei Story*');
  });
});

const state = () => ({
  booksMd: md,
  library: { 'taipei story|r.f. kuang': { ltId: '1', isbn: null, cover: 'c', blurb: null } },
  countries: { authors: { 'R.F. Kuang': ['us'] }, titles: {} },
  languages: { authors: { 'han kang': 'Korean' }, titles: {} },
  pages: { 'taipei story|r.f. kuang': { n: 300 } },
});
const proposal = (over = {}) => ({
  bulletLine: '- *The Leopard* by Giuseppe Tomasi di Lampedusa, trans. Archibald Colquhoun', year: 2026,
  key: 'the leopard|giuseppe tomasi di lampedusa',
  library: { ltId: '77', isbn: '0375714065', cover: 'https://x/c.jpg', blurb: 'A novel.' },
  countries: ['it'], authorKey: 'Giuseppe Tomasi di Lampedusa', titleKey: null, language: 'Italian', ...over,
});

describe('applyProposal', () => {
  it('adds the bullet and every data entry', () => {
    const r = applyProposal(state(), proposal());
    expect(r.booksMd).toContain('## 2026\n\n- *The Leopard* by Giuseppe Tomasi di Lampedusa, trans. Archibald Colquhoun\n- *Taipei Story*');
    expect(r.library['the leopard|giuseppe tomasi di lampedusa']).toEqual({ ltId: '77', isbn: '0375714065', cover: 'https://x/c.jpg', blurb: 'A novel.' });
    expect(r.countries.authors['Giuseppe Tomasi di Lampedusa']).toEqual(['it']);
    expect(r.languages.authors['giuseppe tomasi di lampedusa']).toBe('Italian');
    expect(r.skipped).toEqual([]);
    expect(r.summary.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps data files sorted the way they already are', () => {
    const r = applyProposal(state(), proposal());
    expect(Object.keys(r.library)).toEqual(['taipei story|r.f. kuang', 'the leopard|giuseppe tomasi di lampedusa']);
    expect(Object.keys(r.countries.authors)).toEqual(['Giuseppe Tomasi di Lampedusa', 'R.F. Kuang']);
    expect(Object.keys(r.languages.authors)).toEqual(['giuseppe tomasi di lampedusa', 'han kang']);
  });

  it('sorts languages.json by code unit, so accented names stay where they are', () => {
    const s = state();
    s.languages.authors = { 'gérard dalmaz': 'French', 'han kang': 'Korean', 'søren kierkegaard': 'Danish', 'zeno': 'Italian' };
    const r = applyProposal(s, proposal());
    expect(Object.keys(r.languages.authors)).toEqual(['giuseppe tomasi di lampedusa', 'gérard dalmaz', 'han kang', 'søren kierkegaard', 'zeno']);
  });

  it('keys a book with no author by title (exact for countries, lower-cased for languages)', () => {
    const r = applyProposal(state(), proposal({ authorKey: null, titleKey: 'The Leopard' }));
    expect(r.countries.titles['The Leopard']).toEqual(['it']);
    expect(r.languages.titles['the leopard']).toBe('Italian');
  });

  it('skips library, countries and language when they are null', () => {
    const r = applyProposal(state(), proposal({ library: null, countries: null, language: null }));
    expect(r.library).toEqual(state().library);
    expect(r.countries).toEqual(state().countries);
    expect(r.languages).toEqual(state().languages);
  });

  it('never overwrites a different existing value without force, and reports it', () => {
    const s = state();
    s.countries.authors['Giuseppe Tomasi di Lampedusa'] = ['fr'];
    s.languages.authors['giuseppe tomasi di lampedusa'] = 'French';
    s.library['the leopard|giuseppe tomasi di lampedusa'] = { ltId: '1', isbn: null, cover: 'hand.jpg', blurb: 'mine' };
    const r = applyProposal(s, proposal());
    expect(r.countries.authors['Giuseppe Tomasi di Lampedusa']).toEqual(['fr']);
    expect(r.languages.authors['giuseppe tomasi di lampedusa']).toBe('French');
    expect(r.library['the leopard|giuseppe tomasi di lampedusa'].cover).toBe('hand.jpg');
    expect(r.library['the leopard|giuseppe tomasi di lampedusa'].isbn).toBe('0375714065');
    // library: ltId, cover and blurb differ; plus the country and the language.
    expect(r.skipped).toHaveLength(5);
  });

  it('overwrites with force', () => {
    const s = state();
    s.countries.authors['Giuseppe Tomasi di Lampedusa'] = ['fr'];
    s.library['the leopard|giuseppe tomasi di lampedusa'] = { ltId: '1', isbn: null, cover: 'hand.jpg', blurb: 'mine' };
    const r = applyProposal(s, proposal(), { force: true });
    expect(r.countries.authors['Giuseppe Tomasi di Lampedusa']).toEqual(['it']);
    expect(r.library['the leopard|giuseppe tomasi di lampedusa'].cover).toBe('https://x/c.jpg');
    expect(r.skipped).toEqual([]);
  });

  it('does not mutate its input', () => {
    const s = state();
    const before = JSON.stringify(s);
    applyProposal(s, proposal());
    expect(JSON.stringify(s)).toBe(before);
  });

  it('is all-or-nothing: a duplicate first bullet throws before anything is returned', () => {
    expect(() => applyProposal(state(), proposal({ bulletLine: '- *Taipei Story* by R.F. Kuang' }))).toThrow(/already/);
  });

  it('rejects malformed proposals', () => {
    expect(() => applyProposal(state(), proposal({ bulletLine: 'The Leopard' }))).toThrow(/bullet/);
    expect(() => applyProposal(state(), proposal({ year: 'x' }))).toThrow(/year/);
    expect(() => applyProposal(state(), proposal({ countries: ['Italy'] }))).toThrow(/country/);
    expect(() => applyProposal(state(), proposal({ authorKey: null, titleKey: null }))).toThrow(/authorKey|titleKey/);
    expect(() => applyProposal(state(), proposal({ language: '' }))).toThrow(/language/);
  });
});

describe('applyProposal page counts', () => {
  const key = 'the leopard|giuseppe tomasi di lampedusa';

  it('adds an exact and an approximate count to pages.json, sorted', () => {
    const exact = applyProposal(state(), proposal({ pages: { n: 320, approx: false } }));
    expect(exact.pages[key]).toEqual({ n: 320 });
    expect(Object.keys(exact.pages)).toEqual(['taipei story|r.f. kuang', key]);
    const approx = applyProposal(state(), proposal({ pages: { n: 320, approx: true } }));
    expect(approx.pages[key]).toEqual({ n: 320, approx: true });
  });

  it('leaves pages.json alone when the proposal has none', () => {
    expect(applyProposal(state(), proposal({ pages: null })).pages).toEqual(state().pages);
    expect(applyProposal(state(), proposal()).pages).toEqual(state().pages);
  });

  it('keeps a different existing count unless forced', () => {
    const s = state();
    s.pages[key] = { n: 100 };
    const kept = applyProposal(s, proposal({ pages: { n: 320 } }));
    expect(kept.pages[key]).toEqual({ n: 100 });
    expect(kept.skipped).toHaveLength(1);
    expect(applyProposal(s, proposal({ pages: { n: 320 } }), { force: true }).pages[key]).toEqual({ n: 320 });
  });

  it('rejects an implausible count', () => {
    expect(() => applyProposal(state(), proposal({ pages: { n: 5 } }))).toThrow(/pages/);
    expect(() => applyProposal(state(), proposal({ pages: { n: 'x' } }))).toThrow(/pages/);
  });
});

describe('serializeCountries', () => {
  it('writes one-space indent with inline, comma-spaced arrays', () => {
    expect(serializeCountries({ authors: { A: ['fr', 'dz'] }, titles: { T: ['is'] } }))
      .toBe('{\n "authors": {\n  "A": ["fr", "dz"]\n },\n "titles": {\n  "T": ["is"]\n }\n}\n');
  });
});
