import { describe, it, expect } from 'vitest';
import { matchBook, largeCover, cleanBlurb } from '../src/lib/library-match.js';

const entry = (over) => ({ book_id: '1', title: 'T', author_fl: 'A B', ISBN_cleaned: '', entry_stamp: '1', cover: 'c', ...over });

describe('matchBook', () => {
  it('matches when only the entry has a subtitle', () => {
    const e = entry({ title: "Foucault's Pendulum: An International Bestseller", author_fl: 'Umberto Eco' });
    expect(matchBook({ title: "Foucault's Pendulum", author: 'Umberto Eco' }, [e])).toBe(e);
  });

  it('matches when only the book has a subtitle or parenthetical', () => {
    const e = entry({ title: 'The Sagas of Icelanders', author_fl: 'Jane Smith' });
    expect(matchBook({ title: 'The Sagas of Icelanders (Penguin Classics Deluxe Edition), including:', author: 'Jane Smith' }, [e])).toBe(e);
    const f = entry({ title: 'A Concise History of Korea', author_fl: 'Michael J. Seth' });
    expect(matchBook({ title: 'A Concise History of Korea: From Antiquity to the Present', author: 'Michael J. Seth' }, [f])).toBe(f);
  });

  it('ignores leading articles, accents and punctuation', () => {
    const e = entry({ title: 'Rubaiyat of Omar Khayyam', author_fl: 'Omar Khayyám' });
    expect(matchBook({ title: 'The Rubáiyát of Omar Khayyám', author: 'Omar Khayyám' }, [e])).toBe(e);
    const f = entry({ title: 'Mason & Dixon', author_fl: 'Thomas Pynchon' });
    expect(matchBook({ title: 'Mason and Dixon', author: 'Thomas Pynchon' }, [f])).toBe(f);
    expect(matchBook({ title: 'Mason & Dixon', author: 'Thomas Pynchon' }, [f])).toBe(f);
  });

  it('rejects the same title by a different author', () => {
    const hamlet = entry({ title: 'Hamlet', author_fl: 'William Shakespeare' });
    expect(matchBook({ title: 'Hamlet', author: 'Jane Doe' }, [hamlet])).toBeNull();
    expect(matchBook({ title: 'Hamlet', author: 'William Shakespeare' }, [hamlet])).toBe(hamlet);
  });

  it('uses the surname of the first author named', () => {
    const e = entry({ title: 'The Korean Myths', author_fl: 'Heinz Insu Fenkl' });
    expect(matchBook({ title: 'The Korean Myths', author: 'Heinz Insu Fenkl and Bella M Dalton-Fenkl' }, [e])).toBe(e);
    const f = entry({ title: 'Some Book', author_fl: 'Ann Lee' });
    expect(matchBook({ title: 'Some Book', author: 'Ann Kim' }, [f])).toBeNull();
    expect(matchBook({ title: 'Some Book', author: 'Ann Lee, trans. X' }, [f])).toBe(f);
  });

  it('matches a book without an author on title alone', () => {
    const e = entry({ title: 'The Story of Hong Gildong', author_fl: 'Anonymous' });
    expect(matchBook({ title: 'The Story of Hong Gildong', author: '' }, [e])).toBe(e);
  });

  it('returns null when nothing matches', () => {
    expect(matchBook({ title: 'Nope', author: 'X Y' }, [entry({ title: 'Other', author_fl: 'X Y' })])).toBeNull();
  });

  it('prefers an entry whose full title equals the book title over a main-title match', () => {
    const texts = entry({ book_id: 'a', title: 'Hamlet: The Texts of 1603 and 1623', author_fl: 'William Shakespeare', ISBN_cleaned: '1', entry_stamp: '900' });
    const plain = entry({ book_id: 'b', title: 'Hamlet', author_fl: 'William Shakespeare', entry_stamp: '1' });
    expect(matchBook({ title: 'Hamlet', author: 'William Shakespeare' }, [texts, plain])).toBe(plain);
  });

  it('prefers an entry with an ISBN, then the most recent entry', () => {
    const noIsbn = entry({ book_id: 'a', title: 'Dup', author_fl: 'X Y', entry_stamp: '900' });
    const old = entry({ book_id: 'b', title: 'Dup', author_fl: 'X Y', ISBN_cleaned: '111', entry_stamp: '100' });
    const recent = entry({ book_id: 'c', title: 'Dup', author_fl: 'X Y', ISBN_cleaned: '222', entry_stamp: '200' });
    expect(matchBook({ title: 'Dup', author: 'X Y' }, [noIsbn, old, recent])).toBe(recent);
    expect(matchBook({ title: 'Dup', author: 'X Y' }, [noIsbn, old])).toBe(old);
  });
});

describe('largeCover', () => {
  it('enlarges Amazon covers', () => {
    expect(largeCover('https://ecx.images-amazon.com/images/P/152995150X.01._SX100_SY200_SCRM_.jpg'))
      .toBe('https://ecx.images-amazon.com/images/P/152995150X.01._SX400_SCRM_.jpg');
  });
  it('enlarges LibraryThing covers', () => {
    expect(largeCover('https://pics.cdn.librarything.com/picsizes/10/53/10539504-b-h200-w100-pv25_abc_v5.jpg'))
      .toBe('https://pics.cdn.librarything.com/picsizes/10/53/10539504-b-h600-w300-pv25_abc_v5.jpg');
  });
  it('leaves other URLs unchanged', () => {
    expect(largeCover('https://example.com/x.jpg')).toBe('https://example.com/x.jpg');
  });
});

describe('cleanBlurb', () => {
  const long = 'This is a sentence that is long enough to count as a description. ';
  it('strips HTML tags and markdown links and emphasis', () => {
    expect(cleanBlurb(`<p>A **bold** claim about [a link](http://x.y/z) and *more* text, long enough to keep.</p>`))
      .toBe('A bold claim about a link and more text, long enough to keep.');
  });
  it('cuts trailing boilerplate sections', () => {
    expect(cleanBlurb(`${long}\n\n----------\nOther editions`)).toBe(long.trim());
    expect(cleanBlurb(`${long}Contains: Part one, Part two`)).toBe(long.trim());
    expect(cleanBlurb(`${long}\nSee also: Another`)).toBe(long.trim());
    expect(cleanBlurb(`${long}([source][1])`)).toBe(long.trim());
  });
  it('collapses whitespace', () => {
    expect(cleanBlurb('One   two\n\nthree four five six seven eight nine ten eleven twelve thirteen.'))
      .toBe('One two three four five six seven eight nine ten eleven twelve thirteen.');
  });
  it('truncates at the last sentence end before 600 characters', () => {
    const s = 'Sentence number one ends here. '.repeat(30);
    const out = cleanBlurb(s);
    expect(out.length).toBeLessThanOrEqual(600);
    expect(out.endsWith('here.')).toBe(true);
  });
  it('falls back to a word boundary with an ellipsis', () => {
    const out = cleanBlurb('word '.repeat(200));
    expect(out.length).toBeLessThanOrEqual(601);
    expect(out.endsWith('word…')).toBe(true);
  });
  it('returns null for empty or very short text', () => {
    expect(cleanBlurb('')).toBeNull();
    expect(cleanBlurb('<p>Too short.</p>')).toBeNull();
    expect(cleanBlurb(undefined)).toBeNull();
  });
});
