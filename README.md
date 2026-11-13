# adamhare.com

Personal site, built with [Astro](https://astro.build) and deployed to GitHub Pages.

## Everyday edits

- **Add a book**: edit `src/content/books.md` — add one `- *Title* by Author` bullet under the right
  `## YEAR` heading (create the heading if it's a new year). Per-year counts are computed at build time;
  never type them. To list works read inside a collection, indent them four spaces under the
  collection's bullet (`    - *Antigone* …`); nested items are shown but not counted. Committing to `main` (the GitHub web editor works) redeploys the site automatically.
- **Travel maps**: edit the "Travel-Public" Google Sheet (Countries / States tabs). The live page re-fetches
  the sheet on every visit, so changes show up immediately; the build also snapshots it

## Commands

```sh
npm install
npm run dev              # local preview at localhost:4321
npm run build            # production build to dist/
npm test                 # data tests
npm run test:integrity   # build + link/asset/redirect checks
npm run fetch            # refresh travel + essays snapshots
node scripts/fetch-travel.mjs  # refresh src/data/travel.json from the sheet
```

## Layout

- `src/content/*.md` — page prose (frontmatter: title, description)
- `src/data/*.json` — structured data (concerts, publications, favorite books, travel snapshot)
- `src/pages/` — one `.astro` file per page, plus `[...redirect].astro` for old Google-Sites URLs
- `src/layouts/Base.astro` — shared shell (nav, footer, head)
- `src/assets/maps/` — world + US SVGs (sources and licenses in `SOURCES.md`)
- `tests/` — data validation and built-output integrity checks
