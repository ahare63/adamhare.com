// Parses the raw markdown of src/content/books.md into
// [{ year, title, author, translator, note, works }], in file order
// (newest year first, and within a year newest read first).
// Top-level bullets are books. Bullets indented four spaces directly beneath
// a book are works read inside that collection and attach to it as `works`.
export function parseBooks(raw) {
  const books = [];
  let year = null;
  let current = null;
  for (const line of raw.split('\n')) {
    const h = line.match(/^##\s+(\d{4})\s*$/);
    if (h) { year = Number(h[1]); current = null; continue; }
    if (year === null) continue;

    if (line.startsWith('    - ')) {
      if (current) current.works.push(line.slice(6).replace(/\\\*/g, '\0').replace(/\*/g, '').replace(/\0/g, '*').trim());
      continue;
    }
    if (!line.startsWith('- ')) continue;

    current = null;
    const m = line.slice(2).match(/^\*((?:\\.|[^*\\])+)\*(.*)$/);
    if (!m) continue;
    const title = m[1].replace(/\\(.)/g, '$1').trim();
    let rest = m[2];
    let author = '';
    let translator = null;
    let note = null;
    const by = rest.match(/^ by (.*)$/);
    if (by) {
      const tail = by[1];
      const cut = tail.search(/, (?:trans|ed)\.| \(/);
      author = (cut === -1 ? tail : tail.slice(0, cut)).trim();
      rest = cut === -1 ? '' : tail.slice(cut);
    }
    const t = rest.match(/trans\. (.+?)(?: in |, ed\.| \(|$)/);
    if (t) translator = t[1].trim();
    const n = rest.match(/\(([^)]*)\)\s*$/);
    if (n) note = n[1].trim();
    current = { year, title, author, translator, note, works: [] };
    books.push(current);
  }
  return books;
}

// Key under which a book's cover id is stored in src/data/covers.json.
export const coverKey = (book) => `${book.title}|${book.author}`.toLowerCase();
