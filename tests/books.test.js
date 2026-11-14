import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseBooks, coverKey } from '../src/lib/books.js';

describe('parseBooks', () => {
  it('extracts title, author, translator and note', () => {
    const [a, b, c] = parseBooks(`## 2020

- *Plain Book* by Jane Doe
- *Translated* by Ann Lee, trans. Bob Ray
- *Noted* by Cy Dee, trans. Eve Fox (audiobook)
`);
    expect(a).toEqual({ year: 2020, title: 'Plain Book', author: 'Jane Doe', translator: null, note: null, works: [] });
    expect(b).toMatchObject({ title: 'Translated', author: 'Ann Lee', translator: 'Bob Ray', note: null });
    expect(c).toMatchObject({ author: 'Cy Dee', translator: 'Eve Fox', note: 'audiobook' });
  });

  it('handles escaped asterisks and punctuation in titles', () => {
    const [a, b] = parseBooks(`## 2020

- *Wild\\* Card: A Story, Told* by X Y
- *Mason & Dixon* by Thomas Pynchon
`);
    expect(a.title).toBe('Wild* Card: A Story, Told');
    expect(b.title).toBe('Mason & Dixon');
  });

  it('allows a book with no author', () => {
    const [a] = parseBooks(`## 2020

- *The Story of Hong Gildong*, trans. Minsoo Kang
`);
    expect(a).toMatchObject({ title: 'The Story of Hong Gildong', author: '', translator: 'Minsoo Kang' });
  });

  it('attaches nested works to the parent without counting them as books', () => {
    const books = parseBooks(`## 2020

- *Collection*, including:
    - *Egil's Saga*, trans. Bernard Scudder
    - *"Head and Shoulders"*
- *Next* by A B
`);
    expect(books).toHaveLength(2);
    expect(books[0].works).toEqual(["Egil's Saga, trans. Bernard Scudder", '"Head and Shoulders"']);
    expect(books[1].works).toEqual([]);
  });

  it('assigns years from headings in file order', () => {
    const books = parseBooks(`## 2021

- *B* by X

## 2020

- *A* by Y
`);
    expect(books.map((b) => [b.year, b.title])).toEqual([[2021, 'B'], [2020, 'A']]);
  });

  it('counts the real books.md per finished year', () => {
    const raw = readFileSync(new URL('../src/content/books.md', import.meta.url), 'utf-8');
    const counts = {};
    for (const b of parseBooks(raw)) counts[b.year] = (counts[b.year] ?? 0) + 1;
    expect(counts[2024]).toBe(66);
    expect(counts[2023]).toBe(135);
    expect(counts[2022]).toBe(111);
  });
});

describe('coverKey', () => {
  it('is the lower-cased title|author', () => {
    expect(coverKey({ title: 'Mason & Dixon', author: 'Thomas Pynchon' })).toBe('mason & dixon|thomas pynchon');
    expect(coverKey({ title: 'X', author: '' })).toBe('x|');
  });
});
