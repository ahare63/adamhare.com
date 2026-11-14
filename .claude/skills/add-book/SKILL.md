---
name: add-book
description: Add a book the owner just read to adamhare.com (books.md bullet, LibraryThing cover and description, author country, original language), confirm it with him, then commit and publish. Use when he says "add <title> by <author>" or similar.
---

# Add a book to adamhare.com

Work from the repo root. The site is Astro; the Books page reads `src/content/books.md` and the data files in
`src/data/`. Never write anything before the user confirms (step 4).

1. **Get the details** from the user's message: title, author, and optionally a translator (`--translator`)
   and a note such as "re-read" (`--note`). The book should already be on his LibraryThing (user `ahare63`).
2. **Look it up**: `npm run -s book:lookup -- --title "…" --author "…" [--translator "…"] [--note "…"]`.
   It prints one JSON object (the proposal) and changes nothing. Read it:
   - `librarything.found` false: show `nearest` and ask whether to proceed without a LibraryThing cover or to
     wait until he has added it. Proceeding means `library: null` in step 5.
   - `alreadyListed` non-empty: tell him (a re-read is fine; just report it).
3. **Fill the gaps from your own knowledge and label them "my proposal"**:
   - `country.known` null: the author's country or countries as lowercase ISO-2 codes. Only countries the
     author is IDENTIFIED WITH, not a mere birthplace, residence or citizenship; two only when genuinely
     identified with both. Match existing entries in `src/data/author-countries.json`.
   - `language.needed` true and `known` null: the original language, as a plain English name used in
     `src/data/languages.json` (e.g. "Italian", "Ancient Greek"). If unsure, say so; do not guess.
4. **Show the cover, then ask for confirmation.** Download `librarything.cover` into the session scratchpad
   (`curl -sL -o <scratchpad>/cover.jpg "<url>"`), display it with the Read tool, and give the URL. Then
   give ONE summary: the exact `bulletLine`, year, LibraryThing title and ISBN, cover, blurb, page count
   (`pages`; if `approx` is true say it is a typical length across editions, not his edition), country,
   language, and anything not found. Ask him to confirm or correct (use AskUserQuestion if available). He may
   change the page count, e.g. for a partial read give the pages he actually read (then it is exact).
   Never invent a blurb; if `blurb` is null say so and leave it null unless he supplies one.
5. **Apply** after confirmation. Write the proposal JSON to the scratchpad:
   ```json
   { "bulletLine": "- *…*", "year": 2026, "key": "<key from lookup>",
     "library": { "ltId": "…", "isbn": "…", "cover": "…", "blurb": "…or null" },
     "countries": ["it"], "authorKey": "<author exactly as in the bullet, or null>",
     "titleKey": "<title when there is no author, else null>", "language": "Italian",
     "pages": { "n": 412, "approx": false } }
   ```
   Use `"library": null` if not on LibraryThing, `countries`/`language` null when already known, `pages` null if there is no count. Run
   `npm run book:add -- <file>`, then `npm run build && npx vitest run`. If anything fails, stop and report;
   do not commit. (`--force` overwrites existing different data; use it only if he asks.)
6. **Commit and push.** `git add -A src/content/books.md src/data` and commit with the message
   `Books: add <Title>` using the repo's existing git identity (never change git config). Push to `main`: his
   confirmation in step 4 is the approval to publish content additions. If `main` does not yet contain the
   site (the `overhaul` branch / PR #1 is not merged), push the current branch instead and tell him it goes
   live when the PR is merged. Never force-push.
7. **Report**: the book is added; the site redeploys in a couple of minutes at https://www.adamhare.com/books.

## Fixing things later

- Wrong cover: edit `cover` for the book's key in `src/data/library.json`, or add a LibraryThing id to
  `src/data/cover-overrides.json` pointing at an image saved under `public/images/books/covers/`.
- Wrong or missing description: edit `blurb` in `src/data/library.json`.
- Page count: edit `src/data/pages.json` (`{ "n": 412 }`, add `"approx": true` for a typical length).
- Country or language: edit `src/data/author-countries.json` or `src/data/languages.json`.
- Then `npm run build && npx vitest run`, commit, push.
