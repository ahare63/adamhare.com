---
name: add-book
description: Add a book the owner just read to adamhare.com (books.md bullet, LibraryThing cover and description, author country, original language), confirm it with him, then commit and publish. Use when he says "add <title> by <author>" or similar.
---

# Add a book to adamhare.com

Work from the repo root. The site is Astro; the Books page reads `src/content/books.md` and the data files in
`src/data/`. Never write anything before the user confirms (step 4).

0. **Sync**: `git pull --ff-only` on `main`.
1. **Get the details** from the user's message: title, author, and optionally a translator (`--translator`)
   and a note such as "re-read" (`--note`). The book should already be on his LibraryThing (user `ahare63`).
   He often gives only a short title ("I finished Monkey King"). Then run the lookup with just
   `--title "<what he said>"` first and take the full title and author from `librarything.nearest`.
   LibraryThing does not reliably record translators: if the book is translated and more than one translation
   is plausible, ask which one rather than guessing.
2. **Look it up**: `npm run -s book:lookup -- --title "…" --author "…" [--translator "…"] [--note "…"] --out <scratchpad>/draft.json`.
   It prints the proposal JSON to stdout and writes `draft.json`, already in the shape `book:add` applies; the
   site's files are not touched. Read the printed proposal:
   - `librarything.found` false: show `nearest` and ask whether to proceed without a LibraryThing cover or to
     wait until he has added it. Proceeding means `library: null` in step 5.
   - `alreadyListed` non-empty: tell him (a re-read is fine; just report it).
3. **Fill the gaps from your own knowledge and label them "my proposal"**:
   - `country.known` null: the author's country or countries as lowercase ISO-2 codes. Only countries the
     author is IDENTIFIED WITH, not a mere birthplace, residence or citizenship; two only when genuinely
     identified with both. Match existing entries in `src/data/author-countries.json`.
   - `setting.known` null: where the book is set or what it is about, as lowercase ISO-2 codes (today's
     borders: Aztecs → `mx`, Constantinople → `tr`), from the blurb and your own knowledge. Only the most
     relevant countries, usually one to three; include the author's own country when the book is set there. Null
     when there is no real-world place (invented worlds, abstract nonfiction, most poetry). Antarctica and other
     places that are not regions on the world map cannot be used.
   - `language.needed` true and `known` null: the original language, as a plain English name used in
     `src/data/languages.json` (e.g. "Italian", "Ancient Greek"). If unsure, say so; do not guess.
4. **Show the cover, then ask for confirmation.** Download `librarything.cover` into the session scratchpad
   (`curl -sL -o <scratchpad>/cover.jpg "<url>"`), display it with the Read tool, and give the URL. Then
   give ONE summary: the exact `bulletLine`, year, LibraryThing title and ISBN, cover, blurb, page count
   (`pages`; if `approx` is true say it is a typical length across editions, not his edition), country,
   setting, language, and anything not found. Ask him to confirm or correct (use AskUserQuestion if available). He may
   change the page count, e.g. for a partial read give the pages he actually read (then it is exact).
   Never invent a blurb; if `blurb` is null say so and leave it null unless he supplies one (then set
   `library.blurb` in `draft.json`).
5. **Apply and publish** after confirmation, with the confirmed judgement calls as flags (omit a flag when
   the value is already known or does not apply; `--pages` only when he gave a count, which is then exact;
   `--finished YYYY-MM-DD` only when he says he finished it on another day, since the home page shows that date
   and it defaults to today):
   ```sh
   npm run book:add -- <scratchpad>/draft.json --countries cn --settings cn,in --language Chinese --pages 339 \
     && npm run build && npx vitest run
   ```
   `book:add` rewrites only the files whose data changed. If anything fails, stop and report; do not commit.
   (`--force` overwrites existing different data; use it only if he asks.) Then
   `git add -A src/content/books.md src/data`, commit as `Books: add <Title>` with the repo's existing git
   identity (never change git config), and push to `main`: his confirmation in step 4 is the approval to
   publish content additions. Never force-push.
6. **Report**: the book is added; the site redeploys in a couple of minutes at https://www.adamhare.com/books.

## Fixing things later

- Wrong cover: edit `cover` for the book's key in `src/data/library.json`, or add a LibraryThing id to
  `src/data/cover-overrides.json` pointing at an image saved under `public/images/books/covers/`.
- Wrong or missing description: edit `blurb` in `src/data/library.json`.
- Page count: edit `src/data/pages.json` (`{ "n": 412 }`, add `"approx": true` for a typical length).
- Finished date: edit `src/data/finished.json` (`"title|author": "2026-11-20"`, same key as pages.json).
- Country or language: edit `src/data/author-countries.json` or `src/data/languages.json`.
- Setting (where a book is set or what it is about): edit `src/data/book-settings.json`, keyed by the exact title.
- Then `npm run build && npx vitest run`, commit, push.
