// Runs against the production build in dist/: no dead internal links,
// no missing images, and old Google-Sites URLs redirect to live pages.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist', import.meta.url).pathname;

function htmlFiles(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (f.endsWith('.html')) out.push(p);
  }
  return out;
}

function resolves(href) {
  const path = href.split('#')[0].split('?')[0];
  if (path === '' || path === '/') return existsSync(join(DIST, 'index.html'));
  const clean = decodeURIComponent(path).replace(/^\//, '').replace(/\/$/, '');
  return (
    existsSync(join(DIST, clean)) ||
    existsSync(join(DIST, clean, 'index.html')) ||
    existsSync(join(DIST, `${clean}.html`))
  );
}

describe('built site integrity', () => {
  let pages;
  beforeAll(() => {
    expect(existsSync(DIST), 'run `npm run build` first (test:integrity does)').toBe(true);
    pages = htmlFiles(DIST);
    expect(pages.length).toBeGreaterThanOrEqual(7);
  });

  it('every internal link and asset reference resolves', () => {
    const broken = [];
    for (const page of pages) {
      const html = readFileSync(page, 'utf-8');
      const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
      for (const r of refs) {
        if (/^(https?:|mailto:|#|data:|tel:)/.test(r)) continue;
        if (!resolves(r)) broken.push(`${page.replace(DIST, '')}: ${r}`);
      }
    }
    expect(broken, broken.join('\n')).toEqual([]);
  });

  it('old Google-Sites URLs land on the right new pages', () => {
    const redirects = {
      'about-me': '/about',
      'academic-background': '/background',
      'work-experience': '/background',
      'independent-projects': '/projects',
      'research-projects': '/projects',
      'papers-presentations': '/projects',
      'personal-interests': '/interests',
      'music-concerts': '/music',
      'peers': '/interests',
    };
    for (const [oldPath, target] of Object.entries(redirects)) {
      const stub = join(DIST, oldPath, 'index.html');
      expect(existsSync(stub), `missing redirect stub for /${oldPath}`).toBe(true);
      const html = readFileSync(stub, 'utf-8');
      expect(html, `/${oldPath} should point at ${target}`).toContain(target);
      expect(html).toMatch(/http-equiv="refresh"|window\.location/);
    }
  });

  it('every page carries the site shell: nav, footer links, favicon', () => {
    const mains = ['index.html', 'about/index.html', 'background/index.html', 'projects/index.html',
      'interests/index.html', 'books/index.html', 'music/index.html', 'travel/index.html'];
    for (const m of mains) {
      const p = join(DIST, m);
      expect(existsSync(p), `missing page ${m}`).toBe(true);
      const html = readFileSync(p, 'utf-8');
      expect(html).toContain('href="/about');
      expect(html).toContain('github.com/ahare63');
      expect(html).toContain('linkedin.com/in/ahare63');
      expect(html).toContain('mailto:adamt1195@gmail.com');
      expect(html).toMatch(/rel="icon"/);
    }
  });

  it('books page carries per-year counts from the parser and the interactive controls', () => {
    const html = readFileSync(join(DIST, 'books/index.html'), 'utf-8');
    const island = html.match(/<script[^>]*id="books-data"[^>]*>([\s\S]*?)<\/script>/);
    expect(island, 'books JSON island').not.toBeNull();
    const books = JSON.parse(island[1]);
    const counts = {};
    for (const b of books) counts[b.year] = (counts[b.year] ?? 0) + 1;
    // Finished years, checked against the counts on the original site.
    for (const [year, n] of [['2024', 66], ['2023', 135], ['2022', 111], ['2021', 30], ['2017', 14]]) {
      expect(counts[year], `${year} should show ${n} books`).toBe(n);
    }
    expect(html).toContain('id="bk-scrub"');
    expect(html).toContain('type="search"');
    expect(html).toContain('id="bk-pull"');
    expect(html).toContain('<dialog');
  });

  it('books island carries the cover and blurb chosen from library.json and covers.json', () => {
    const html = readFileSync(join(DIST, 'books/index.html'), 'utf-8');
    const books = JSON.parse(html.match(/<script[^>]*id="books-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
    const data = (p) => JSON.parse(readFileSync(new URL(`../src/data/${p}`, import.meta.url), 'utf-8'));
    const library = data('library.json');
    const covers = data('covers.json');
    const key = (b) => `${b.title}|${b.author}`.toLowerCase();
    const withLibrary = books.filter((b) => library[key(b)]);
    const openLibraryOnly = books.filter((b) => !library[key(b)] && covers[key(b)] != null);
    expect(withLibrary.length, 'library.json should match some books').toBeGreaterThan(0);
    const openLibrary = (b) => (covers[key(b)] != null ? `https://covers.openlibrary.org/b/id/${covers[key(b)]}-M.jpg` : null);
    for (const b of withLibrary) {
      expect(b.cover, `cover for ${b.title}`).toBe(library[key(b)].cover || openLibrary(b));
      expect(b.blurb, `blurb for ${b.title}`).toBe(library[key(b)].blurb ?? null);
    }
    for (const b of openLibraryOnly) {
      expect(b.cover).toBe(openLibrary(b));
      expect(b.blurb).toBeNull();
    }
    expect(html).toContain('librarything.com/profile/ahare63');
  });

  it('books page server-renders the newest book in the list', () => {
    const html = readFileSync(join(DIST, 'books/index.html'), 'utf-8');
    const md = readFileSync(new URL('../src/content/books.md', import.meta.url), 'utf-8');
    const firstBullet = md.split(/^## /m)[1].split('\n').find((l) => l.startsWith('- '));
    const title = firstBullet.match(/\*([^*]+)\*/)[1];
    const list = html.match(/<ol[^>]*id="bk-list"[^>]*>([\s\S]*?)<\/ol>/);
    expect(list, 'server-rendered list').not.toBeNull();
    expect(list[1], `newest book "${title}"`).toContain(title.replace(/&/g, '&amp;'));
  });

  it('home page shows the Lately strip with the newest book and essay', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf-8');
    expect(html).toContain('Lately');
    const essays = JSON.parse(readFileSync(new URL('../src/data/essays.json', import.meta.url), 'utf-8'));
    if (essays.length) expect(html, 'latest essay link').toContain(essays[0].url);
    const books = readFileSync(new URL('../src/content/books.md', import.meta.url), 'utf-8');
    const firstBullet = books.split(/^## /m)[1].split('\n').find((l) => l.startsWith('- '));
    const title = firstBullet.match(/\*([^*]+)\*/)[1];
    expect(html, `newest book "${title}"`).toContain(title.replace(/&/g, '&amp;'));
  });

  it('travel page embeds both interactive maps fed by travel data', () => {
    const html = readFileSync(join(DIST, 'travel/index.html'), 'utf-8');
    expect(html).toContain('data-map="world"');
    expect(html).toContain('data-map="us"');
    const travel = JSON.parse(readFileSync(new URL('../src/data/travel.json', import.meta.url), 'utf-8'));
    for (const c of travel.countries) {
      expect(html, `map missing visited marker for ${c.code}`).toContain(`"${c.code}"`);
    }
  });
});
