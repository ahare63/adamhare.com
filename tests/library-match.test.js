import { describe, it, expect } from 'vitest';
import { matchBook, largeCover, cleanBlurb, looksEnglish } from '../src/lib/library-match.js';

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
    expect(cleanBlurb(`<p>A **bold** claim about [a link](http://x.y/z) and *more* text, which is long enough to keep.</p>`))
      .toBe('A bold claim about a link and more text, which is long enough to keep.');
  });
  it('cuts trailing boilerplate sections', () => {
    expect(cleanBlurb(`${long}\n\n----------\nOther editions`)).toBe(long.trim());
    expect(cleanBlurb(`${long}Contains: Part one, Part two`)).toBe(long.trim());
    expect(cleanBlurb(`${long}\nSee also: Another`)).toBe(long.trim());
    expect(cleanBlurb(`${long}([source][1])`)).toBe(long.trim());
  });
  it('collapses whitespace', () => {
    expect(cleanBlurb('The   story of a man\n\nand his dog, which is told with the care that it deserves.'))
      .toBe('The story of a man and his dog, which is told with the care that it deserves.');
  });
  it('truncates at the last sentence end before 600 characters', () => {
    const s = 'The first sentence of this story ends here. '.repeat(30);
    const out = cleanBlurb(s);
    expect(out.length).toBeLessThanOrEqual(600);
    expect(out.endsWith('here.')).toBe(true);
  });
  it('falls back to a word boundary with an ellipsis', () => {
    const out = cleanBlurb('the word of the day is for them '.repeat(40));
    expect(out.length).toBeLessThanOrEqual(601);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });
  it('returns null for empty or very short text', () => {
    expect(cleanBlurb('')).toBeNull();
    expect(cleanBlurb('<p>Too short.</p>')).toBeNull();
    expect(cleanBlurb(undefined)).toBeNull();
  });
});

describe('matchBook fallback on titles that contain one another', () => {
  const lahiri = entry({ title: 'Interpreter of Maladies By Lahiri Jhumpa', author_fl: 'Jhumpa Lahiri' });
  it('matches wording differences when the author agrees', () => {
    expect(matchBook({ title: 'Interpreter of Maladies', author: 'Jhumpa Lahiri' }, [lahiri])).toBe(lahiri);
    const gaiman = entry({ title: 'Signed Norse Mythology Special Edition b', author_fl: 'Neil Gaiman' });
    expect(matchBook({ title: 'Norse Mythology', author: 'Neil Gaiman' }, [gaiman])).toBe(gaiman);
    const lotr = entry({ title: 'The Lord of the Rings Illustrated', author_fl: 'J.R.R. Tolkien' });
    expect(matchBook({ title: 'The Lord of the Rings', author: 'J.R.R. Tolkien' }, [lotr])).toBe(lotr);
    const rebecca = entry({ title: 'Rebecca (Virago Modern Classics)', author_fl: 'Daphne Du Maurier' });
    expect(matchBook({ title: 'Rebecca', author: 'Daphne du Maurier' }, [rebecca])).toBe(rebecca);
  });
  it('rejects an entry whose title is only a part of a different, longer book title', () => {
    const e = entry({ title: 'Pride and Prejudice (Bantam Classics)', author_fl: 'Jane Austen' });
    expect(matchBook({ title: 'Pride and Prejudice and Zombies', author: 'Jane Austen and Seth Grahame-Smith' }, [e])).toBeNull();
  });
  it('requires the author surname', () => {
    expect(matchBook({ title: 'Interpreter of Maladies', author: 'Someone Else' }, [lahiri])).toBeNull();
    expect(matchBook({ title: 'Interpreter of Maladies', author: '' }, [lahiri])).toBeNull();
  });
  it('rejects a one-word title that is not the start of the entry title', () => {
    const sources = entry({ title: 'The Sources of Hamlet', author_fl: 'William Shakespeare' });
    expect(matchBook({ title: 'Hamlet', author: 'William Shakespeare' }, [sources])).toBeNull();
    const theme = entry({ title: 'The Ulysses Theme', author_fl: 'James Joyce' });
    expect(matchBook({ title: 'Ulysses', author: 'James Joyce' }, [theme])).toBeNull();
  });
  it('lets a one-word title match the start of an entry title', () => {
    const e = entry({ title: 'Ulysses Annotated Edition', author_fl: 'James Joyce' });
    expect(matchBook({ title: 'Ulysses', author: 'James Joyce' }, [e])).toBe(e);
  });
  it('matches on the original title when the entry has one', () => {
    const e = entry({ title: 'La Peste', originaltitle: 'The Plague', author_fl: 'Albert Camus' });
    expect(matchBook({ title: 'The Plague', author: 'Albert Camus' }, [e])).toBe(e);
  });
  it('prefers a primary match over a fallback match', () => {
    const fallback = entry({ book_id: 'f', title: 'Norse Mythology Special Edition', author_fl: 'Neil Gaiman', ISBN_cleaned: '1', entry_stamp: '999' });
    const exact = entry({ book_id: 'e', title: 'Norse Mythology', author_fl: 'Neil Gaiman', entry_stamp: '1' });
    expect(matchBook({ title: 'Norse Mythology', author: 'Neil Gaiman' }, [fallback, exact])).toBe(exact);
  });
});

describe('cleanBlurb quotes and source tails', () => {
  const body = 'a book of questions, which is also a book of false starts and red herrings, with the novel at its heart';
  it('collapses doubled opening quotes to a balanced quotation', () => {
    expect(cleanBlurb(`""What's new. What else." Pitch Dark is ${body}.`)).toBe(`"What's new. What else." Pitch Dark is ${body}.`);
  });
  it('removes quotes that wrap the whole text', () => {
    expect(cleanBlurb(`"This is ${body}."`)).toBe(`This is ${body}.`);
    expect(cleanBlurb(`\u201cThis is ${body}.\u201d`)).toBe(`This is ${body}.`);
  });
  it('drops a lone unbalanced quote at either end', () => {
    expect(cleanBlurb(`"This is ${body}.`)).toBe(`This is ${body}.`);
    expect(cleanBlurb(`This is ${body}."`)).toBe(`This is ${body}.`);
  });
  it('strips publisher and source tails after a double hyphen', () => {
    for (const tail of ["--Publisher's description", '-- Provided by publisher.', '--Amazon.com', '--Jacket', '--Back cover', '--BACK COVER']) {
      expect(cleanBlurb(`This is ${body}. ${tail}`), tail).toBe(`This is ${body}.`);
    }
  });
  it('treats a catalogue wrapper ending in "-- as quotes around the text, keeping an inner quotation', () => {
    expect(cleanBlurb(`""What's new. What else." Pitch Dark is ${body}."--`)).toBe(`"What's new. What else." Pitch Dark is ${body}.`);
  });
  it('keeps a double hyphen that is not a source tail', () => {
    expect(cleanBlurb(`This is ${body} -- and more besides.`)).toContain('-- and more besides.');
  });
  it('returns null for text that is not English', () => {
    expect(cleanBlurb('El primer album de la serie de comics mas popular del mundo. Las aventuras del galo han vendido hasta el momento 350 millones de ejemplares.')).toBeNull();
  });
});

describe('looksEnglish', () => {
  it('accepts English, including short blurbs with many proper nouns', () => {
    expect(looksEnglish('In nineteenth-century America, citizens of an unknown island jealously guard its fantastic wealth from the outside world.')).toBe(true);
    expect(looksEnglish('Anna Karenina follows Tolstoy\u2019s heroine through Moscow and Petersburg, with Levin and Kitty.')).toBe(true);
  });
  it('rejects Spanish, French and German', () => {
    expect(looksEnglish('Las aventuras del galo han vendido mas de trescientos millones de ejemplares en todo el mundo, y es la serie mas popular.')).toBe(false);
    expect(looksEnglish('Les aventures du petit gaulois sont devenues la serie de bandes dessinees la plus populaire du monde entier, avec des millions de lecteurs.')).toBe(false);
    expect(looksEnglish('Die Abenteuer des kleinen Galliers sind die beliebteste Comicserie der Welt und wurden millionenfach verkauft, in vielen Sprachen.')).toBe(false);
  });
});
