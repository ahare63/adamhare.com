# adamhare.com

Personal site, built with [Astro](https://astro.build) and deployed to GitHub Pages.

## Everyday edits

- **Add a book**: edit `src/content/books.md` — add one `- *Title* by Author` bullet under the right
  `## YEAR` heading (create the heading if it's a new year). Per-year counts are computed at build time;
  never type them. To list works read inside a collection, indent them four spaces under the
  collection's bullet (`    - *Antigone* …`); nested items appear in the book's detail card but are not counted. Committing to `main` (the GitHub web editor works) redeploys the site automatically.
- **Book covers and descriptions**: add the book on LibraryThing (user `ahare63`) as well as in `books.md`. Each
  deploy pairs `books.md` with the 250 newest LibraryThing entries (plus the seed files in `librarything/`) and
  takes the cover from LibraryThing and the description from Open Library. Run `npm run fetch:library` locally and
  commit `src/data/library.json` to make the result permanent; edit that file to fix a wrong cover or description.
  `librarything/unmatched.txt` lists books it could not pair (usually a title worded differently).
- **Hand-picked covers**: `src/data/cover-overrides.json` maps a LibraryThing book id to an image (a file in
  `public/images/books/covers/` or a URL). It is applied when that book is first paired, including books not yet in `books.md`.
- **Read in translation**: a translated book (one with `trans.`) is counted under its original language from
  `src/data/languages.json` (`authors` by lower-cased name, `titles` for books with no author). A new translated
  author needs a line there, otherwise the book is counted as "not recorded".
- **Fallback covers**: books not in `library.json` use `src/data/covers.json` (`npm run fetch:covers`, Open Library;
  the id is the number in a `covers.openlibrary.org/b/id/<id>-M.jpg` URL, `null` shows a plain cover).
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
