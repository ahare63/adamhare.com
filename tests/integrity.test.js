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

  it('books page charts the original languages of translated books', async () => {
    const html = readFileSync(join(DIST, 'books/index.html'), 'utf-8');
    const { parseBooks, coverKey } = await import('../src/lib/books.js');
    const { originalLanguage } = await import('../src/lib/languages.js');
    const data = (p) => JSON.parse(readFileSync(new URL(`../src/data/${p}`, import.meta.url), 'utf-8'));
    const library = data('library.json');
    const languages = data('languages.json');
    const md = readFileSync(new URL('../src/content/books.md', import.meta.url), 'utf-8');
    const translated = parseBooks(md).filter((b) => b.translator);
    const counts = new Map();
    for (const b of translated) {
      const lang = originalLanguage(b, languages, library[coverKey(b)]?.lang);
      if (lang) counts.set(lang, (counts.get(lang) ?? 0) + 1);
    }
    const [top, n] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    const recorded = [...counts.values()].reduce((a, b) => a + b, 0);
    expect(html).toContain('Read in translation from');
    expect(html).toMatch(new RegExp(`${top}</span>\\s*<span class="bk-count"[^>]*>${n}</span>`));
    expect(html).toContain(`${recorded} of ${translated.length} translated books`);
  });

  describe('books page page counts', () => {
    const data = (p) => JSON.parse(readFileSync(new URL(`../src/data/${p}`, import.meta.url), 'utf-8'));
    const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    const setup = async () => {
      const html = readFileSync(join(DIST, 'books/index.html'), 'utf-8');
      const island = JSON.parse(html.match(/<script[^>]*id="books-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
      const { parseBooks } = await import('../src/lib/books.js');
      const { pagesOf, pageStats, roundedPages } = await import('../src/lib/pages.js');
      const md = readFileSync(new URL('../src/content/books.md', import.meta.url), 'utf-8');
      return { html, island, books: parseBooks(md), pages: data('pages.json'), pagesOf, pageStats, roundedPages };
    };

    it('the island carries each book\'s pages', async () => {
      const { island, books, pages, pagesOf } = await setup();
      expect(island).toHaveLength(books.length);
      island.forEach((b, i) => expect(b.pages, b.title).toEqual(pagesOf(books[i], pages)));
      expect(island.some((b) => b.pages), 'some books have a page count').toBe(true);
    });

    it('the tiles and their caption match pageStats', async () => {
      const { html, books, pages, pageStats, roundedPages } = await setup();
      const all = pageStats(books, pages);
      const latest = Math.max(...books.map((b) => b.year));
      const newest = pageStats(books.filter((b) => b.year === latest), pages);
      const fmt = (n) => roundedPages(n).toLocaleString('en-US');
      expect(html).toContain(`about ${fmt(all.total)} pages`);
      expect(html).toContain(`about ${fmt(newest.total)} pages`);
      expect(html).toContain(`Page totals cover ${all.counted} of ${all.of} books with a known length.`);
    });

    it('the latest year\'s note shows its page total and average', async () => {
      const { html, books, pages, pageStats } = await setup();
      const latest = Math.max(...books.map((b) => b.year));
      const s = pageStats(books.filter((b) => b.year === latest), pages);
      expect(html).toContain(`${s.total.toLocaleString('en-US')} across ${s.counted} of ${s.of} books`);
      expect(html).toContain(`${Math.round(s.total / s.counted).toLocaleString('en-US')} pages`);
    });

    it('the longest-reads list starts with the longest book', async () => {
      const { html, books, pages, pagesOf } = await setup();
      const max = Math.max(...books.map((b) => pagesOf(b, pages)?.n ?? 0));
      const longest = new Set(books.filter((b) => pagesOf(b, pages)?.n === max).map((b) => b.title));
      const block = html.slice(html.indexOf('Longest reads'));
      const first = decode(block.match(/<em[^>]*>([^<]*)<\/em>/)[1]);
      expect(longest.has(first), `"${first}" should be one of ${[...longest]}`).toBe(true);
    });
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

  it('each favorite is a button that opens the book card, linked to its reading-list entry when there is one', () => {
    const html = readFileSync(join(DIST, 'books/index.html'), 'utf-8');
    const island = JSON.parse(html.match(/<script type="application\/json" id="books-data">([\s\S]*?)<\/script>/)[1]);
    const { favorites, longTerm } = JSON.parse(readFileSync(new URL('../src/data/books.json', import.meta.url), 'utf-8'));
    const buttons = [...html.matchAll(/<button[^>]*class="fav-open"[^>]*>/g)].map((m) => m[0]);
    expect(buttons.length).toBe(favorites.length + longTerm.length);
    const withBlurb = [...favorites, ...longTerm].find((f) => f.blurb);
    expect(html, 'a favorite\'s own description is on its button').toContain(withBlurb.blurb.slice(0, 40).replace(/&/g, '&amp;'));
    const linked = buttons.map((b) => b.match(/data-i="(\d+)"/)).filter(Boolean).map((m) => island[Number(m[1])].title);
    expect(linked).toContain('The Great Gatsby');
    expect(linked).toContain('Stoner');
    expect(linked.length).toBeGreaterThanOrEqual(12);
  });

  it('every main page spells its nav links in Linear B and offers a way back to English', () => {
    const mains = ['index.html', 'about/index.html', 'background/index.html', 'projects/index.html',
      'interests/index.html', 'books/index.html', 'music/index.html', 'travel/index.html', 'linear-b/index.html'];
    for (const m of mains) {
      const html = readFileSync(join(DIST, m), 'utf-8');
      const nav = html.match(/<nav class="site-nav"[\s\S]*?<\/nav>/)[0];
      const links = [...nav.matchAll(/<a [^>]*>/g)].map((x) => x[0]);
      expect(links.length, `${m}: nav links`).toBeGreaterThanOrEqual(4);
      for (const a of links) {
        const lb = a.match(/data-lb="([^"]+)"/)?.[1];
        expect(lb, `${m}: ${a}`).toBeTruthy();
        expect(lb, `${m}: ${a}`).toMatch(/^[\u{10000}-\u{1003F} ]+$/u);
      }
      expect(html, `${m}: brand`).toMatch(/<span[^>]*data-lb="[^"]+"[^>]*>Adam Hare<\/span>/);
      expect(html, `${m}: footer button`).toMatch(/<button[^>]*class="lb-off"[^>]*>Back to English<\/button>/);
    }
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
  it('travel page offers a country panel with books for the US and at least 15 countries, multi-country authors under each country', async () => {
    const html = readFileSync(join(DIST, 'travel/index.html'), 'utf-8');
    expect(html).toContain('id="tl-panel"');
    expect(html).toContain('aria-live="polite"');
    const chips = html.match(/<div[^>]*id="tl-chips"[^>]*>([\s\S]*?)<\/div>/);
    expect(chips, 'country chips').not.toBeNull();
    expect(chips[1]).toContain('United States');
    const travel = JSON.parse(readFileSync(new URL('../src/data/travel.json', import.meta.url), 'utf-8'));
    for (const c of travel.countries.filter((x) => x.code !== 'US')) expect(chips[1], `chip for ${c.name}`).toContain(c.name);

    const island = html.match(/<script[^>]*id="travel-places"[^>]*>([\s\S]*?)<\/script>/);
    expect(island, 'travel-places JSON island').not.toBeNull();
    const places = JSON.parse(island[1]);
    expect(places.booksByCountry.us.length, 'books for us').toBeGreaterThan(0);
    const withBooks = Object.values(places.booksByCountry).filter((l) => l.length > 0);
    expect(withBooks.length).toBeGreaterThanOrEqual(15);
    expect(places.concertsByCountry.us.length, 'US concerts').toBeGreaterThan(0);

    const { parseBooks } = await import('../src/lib/books.js');
    const authorCountries = JSON.parse(readFileSync(new URL('../src/data/author-countries.json', import.meta.url), 'utf-8'));
    const md = readFileSync(new URL('../src/content/books.md', import.meta.url), 'utf-8');
    const books = parseBooks(md);
    const [author, codes] = Object.entries(authorCountries.authors).find(([a, c]) => c.length > 1 && books.some((b) => b.author === a));
    const book = books.find((b) => b.author === author && !authorCountries.titles[b.title]);
    const i = places.books.findIndex((b) => b.title === book.title && b.author === author);
    expect(i, `${book.title} in island`).toBeGreaterThanOrEqual(0);
    for (const code of codes) expect(places.booksByCountry[code], `${book.title} under ${code}`).toContain(i);
  });

  it('music page carries the concert map with both maps, the year slider and summary numbers from concerts.json', async () => {
    const html = readFileSync(join(DIST, 'music/index.html'), 'utf-8').replace(/ data-astro-cid-\w+/g, '');
    const { placeOfCity } = await import('../src/lib/places.js');
    const concerts = JSON.parse(readFileSync(new URL('../src/data/concerts.json', import.meta.url), 'utf-8'));
    const placed = concerts.map((c) => placeOfCity(c.city)).filter(Boolean);
    const n = (xs) => new Set(xs).size;
    expect(html).toContain('id="concert-map"');
    expect(html).toContain('data-map="us"');
    expect(html).toContain('data-map="world"');
    expect(html).toContain('id="cm-year"');
    expect(html).toContain('id="cm-play"');
    const summary = `<strong>${placed.length}</strong> concerts in <strong>${n(placed.map((p) => p.city))}</strong> cities, `
      + `<strong>${n(placed.map((p) => p.state).filter(Boolean))}</strong> states and <strong>${n(placed.map((p) => p.country))}</strong> countries`;
    expect(html).toContain(summary);
  });
});
