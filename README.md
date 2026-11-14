# adamhare.com

Personal site, built with [Astro](https://astro.build) and deployed to GitHub Pages.

## Everyday edits

- **Add a book**: the quickest way is to ask Claude Code, "add *Title* by Author" (the `add-book` skill in
  `.claude/skills/`). It looks the book up in your LibraryThing data (`npm run book:lookup`), shows you the cover and
  one summary to confirm, then saves (`npm run book:add`), commits and pushes. To publish Travel, Concerts or
  essay changes right away, ask it to publish the site (the `publish-site` skill).
  Manual fallback: add one `- *Title* by Author` bullet under the right `## YEAR` heading of
  `src/content/books.md` (create the heading for a new year; counts are computed, never typed; indent works read
  inside a collection four spaces under its bullet), and a line for a new author in `src/data/author-countries.json`
  and, for a translated book, in `src/data/languages.json`. Committing to `main` redeploys the site.
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
- **Books on the Travel map**: a new author needs a line in `src/data/author-countries.json` (ISO-2 codes, more than
  one if it fits; `titles` for books with no author) to show up in the Travel page's country panel.
- **Fallback covers**: books not in `library.json` use `src/data/covers.json` (`npm run fetch:covers`, Open Library;
  the id is the number in a `covers.openlibrary.org/b/id/<id>-M.jpg` URL, `null` shows a plain cover).
- **Concerts**: edit the public concerts Google Sheet (columns Artist, Date as "D Month YYYY", City; other columns are
  ignored). Each deploy (every push, and weekly) runs `scripts/fetch-concerts.mjs`, which rewrites
  `src/data/concerts.json` newest first, or leaves it alone if the sheet is unreachable or malformed. Run
  `npm run fetch:concerts` to refresh it locally.
- **Concert map**: a concert in a new city needs one line in the table in `src/lib/places.js` (`placeOfCity`) to appear
  on the Music page's map; `npm test` fails and names any city that is missing.
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
