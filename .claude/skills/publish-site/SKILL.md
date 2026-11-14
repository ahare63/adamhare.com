---
name: publish-site
description: Publish new travel countries, concerts or Substack essays to adamhare.com now instead of waiting for the weekly build. Use when the owner says he updated the Travel or Concerts Google Sheet or posted an essay and wants it live.
---

# Publish site content now

New content in these three places needs **no code change**. It is read at every deploy, and a scheduled
build refreshes it weekly:

- **Travel** (countries and states): the "Travel-Public" Google Sheet.
- **Concerts**: the Concerts Google Sheet.
- **Essays**: the Substack feed (`ahare63.substack.com`).

To publish now, trigger the deploy workflow from the repo root:

1. Confirm with the user first unless he already asked you to publish.
2. Run `gh workflow run deploy.yml --ref main`.
3. Wait a few seconds, then run `gh run list --workflow deploy.yml --limit 1` and report the run URL (the
   `gh run view --web` link or the URL from `gh run list --json url`). The site is live when the run ends.

Two manual cases:

- **A concert in a new city** needs a line in the city table in `src/lib/places.js`. The tests name the
  missing city: run `npm run build && npx vitest run`, read the failure, add the city (the key is the city exactly as
  written in the sheet; the value gives displayed city, lowercase state and country code), re-run the tests, then commit and push to `main` (that push deploys by itself).
- **A new country** needs nothing: add it to the Travel sheet.

Books are different: use the `add-book` skill, which commits and pushes.
