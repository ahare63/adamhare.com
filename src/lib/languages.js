// LibraryThing language codes (MARC-style) for the original languages the
// site's translated books come from.
const CODES = {
  ara: 'Arabic', akk: 'Akkadian', ang: 'Old English', chi: 'Chinese', cze: 'Czech', dan: 'Danish',
  dut: 'Dutch', fin: 'Finnish', fre: 'French', fro: 'Old French', ger: 'German', gle: 'Irish',
  gre: 'Greek', grc: 'Ancient Greek', heb: 'Hebrew', hun: 'Hungarian', ice: 'Icelandic', ita: 'Italian',
  jpn: 'Japanese', kor: 'Korean', lat: 'Latin', non: 'Old Norse', nor: 'Norwegian', per: 'Persian',
  pol: 'Polish', por: 'Portuguese', rum: 'Romanian', rus: 'Russian', san: 'Sanskrit', spa: 'Spanish',
  sux: 'Sumerian', swe: 'Swedish', tur: 'Turkish',
};

// The language a translated book was originally written in, or null.
// `languages` is src/data/languages.json: `titles` (lower-cased title, for books
// with no author or an author who wrote in several languages) and `authors`
// (lower-cased author). `ltOriginal` is LibraryThing's original-language code,
// which is only trusted when it names a language other than English.
export function originalLanguage(book, languages, ltOriginal) {
  return languages.titles?.[book.title.toLowerCase()]
    ?? (book.author ? languages.authors?.[book.author.toLowerCase()] : undefined)
    ?? CODES[ltOriginal]
    ?? null;
}
