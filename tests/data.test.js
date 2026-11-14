// Validates the site's data files against the assets that render them.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf-8');
const json = (p) => JSON.parse(read(p));

describe('travel data renders on the maps', () => {
  it('every visited country has a matching region in world.svg', () => {
    const { countries } = json('src/data/travel.json');
    expect(countries.length).toBeGreaterThan(10); // 11+ countries visited by 2018
    const svg = read('src/assets/maps/world.svg');
    for (const c of countries) {
      expect(c.code, `country ${c.name} needs an ISO code`).toMatch(/^[A-Z]{2}$/);
      expect(c.name.length, `country ${c.code} needs a name`).toBeGreaterThan(1);
      expect(
        svg.includes(`id="${c.code}"`) || svg.includes(`id="${c.code.toLowerCase()}"`),
        `world.svg has no region for ${c.code} (${c.name})`
      ).toBe(true);
    }
  });

  it('every visited US state has a matching region in us.svg', () => {
    const { states } = json('src/data/travel.json');
    expect(states.length).toBeGreaterThan(5);
    const svg = read('src/assets/maps/us.svg');
    for (const s of states) {
      expect(s.code, `state ${s.name} needs a USPS code`).toMatch(/^[A-Z]{2}$/);
      expect(
        svg.includes(`id="${s.code}"`) || svg.includes(`id="${s.code.toLowerCase()}"`),
        `us.svg has no region for ${s.code} (${s.name})`
      ).toBe(true);
    }
  });
});

describe('concerts data', () => {
  it('parses and every entry has artist and venue or city', () => {
    const concerts = json('src/data/concerts.json');
    expect(concerts.length).toBeGreaterThan(10);
    for (const c of concerts) {
      expect(c.artist?.length, JSON.stringify(c)).toBeGreaterThan(0);
      expect((c.venue || c.city || '').length, `concert ${c.artist} needs venue/city`).toBeGreaterThan(0);
    }
  });
});

describe('publications data', () => {
  it('every publication has title, authors, status, and valid links', () => {
    const pubs = json('src/data/publications.json');
    expect(pubs.length).toBeGreaterThanOrEqual(4);
    for (const p of pubs) {
      expect(p.title?.length).toBeGreaterThan(0);
      expect(p.status, p.title).toMatch(/^(published|preprint|other)$/);
      for (const l of p.links ?? []) {
        expect(l.url, `${p.title} link`).toMatch(/^https?:\/\//);
        expect(l.label?.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('books data', () => {
  it('favorites have title and author', () => {
    const { favorites } = json('src/data/books.json');
    expect(favorites.length).toBeGreaterThan(5);
    for (const b of favorites) {
      expect(b.title?.length, JSON.stringify(b)).toBeGreaterThan(0);
      expect(b.author?.length, b.title).toBeGreaterThan(0);
    }
  });
});

describe('essays data', () => {
  it('parses as an array and every entry has title, https url, and ISO date', () => {
    const essays = json('src/data/essays.json');
    expect(Array.isArray(essays)).toBe(true);
    for (const e of essays) {
      expect(e.title?.length, JSON.stringify(e)).toBeGreaterThan(0);
      expect(e.url, e.title).toMatch(/^https:\/\//);
      expect(e.date, e.title).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('required assets exist', () => {
  it.each(['public/favicon.png', 'public/images/linear-a.png'])('%s exists', (p) => {
    expect(existsSync(new URL(`../${p}`, import.meta.url))).toBe(true);
  });
});
