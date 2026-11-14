// Spell a modern name the way a Mycenaean scribe would have: in Linear B, a
// syllabary of vowel and consonant+vowel signs (Unicode block U+10000–1007F).
// The rules below are the standard spelling conventions of the tablets.

const SERIES = {
  '': [0x10000, 'aeiou'],
  d: [0x10005, 'aeiou'],
  k: [0x1000f, 'aeiou'],
  m: [0x10014, 'aeiou'],
  n: [0x10019, 'aeiou'],
  p: [0x1001e, 'aeiou'],
  r: [0x10028, 'aeiou'],
  s: [0x1002d, 'aeiou'],
  t: [0x10032, 'aeiou'],
};

/** syllable → character, e.g. SIGNS.ko === '𐀒' */
export const SIGNS = {};
for (const [c, [base, vowels]] of Object.entries(SERIES)) {
  [...vowels].forEach((v, i) => { SIGNS[c + v] = String.fromCodePoint(base + i); });
}
// Series with gaps (no ji, qu, wu, zi, zu signs exist).
Object.assign(SIGNS, {
  ja: '\u{1000A}', je: '\u{1000B}', jo: '\u{1000D}', ju: '\u{1000E}',
  qa: '\u{10023}', qe: '\u{10024}', qi: '\u{10025}', qo: '\u{10026}',
  wa: '\u{10037}', we: '\u{10038}', wi: '\u{10039}', wo: '\u{1003A}',
  za: '\u{1003C}', ze: '\u{1003D}', zo: '\u{1003F}',
});
const FALLBACK = { ji: 'i', qu: 'ku', wu: 'u', zi: 'si', zu: 'su' };

const VOWELS = 'aeiou';
const isVowel = (ch) => ch !== undefined && VOWELS.includes(ch);

/** Reduce a word to the sounds Linear B can write: a e i o u + d j k m n p q r s t w z. */
function normalize(word) {
  let w = word
    .replace(/ph/g, 'p').replace(/th/g, 't').replace(/kh/g, 'k').replace(/ch/g, 'k')
    .replace(/sh/g, 's').replace(/ck/g, 'k').replace(/qu/g, 'q').replace(/x/g, 'ks')
    .replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k');
  // y is a consonant (j) only when it opens a syllable; otherwise the vowel i.
  w = [...w].map((ch, i, a) => {
    if (ch !== 'y') return ch;
    return isVowel(a[i + 1]) && (i === 0 || isVowel(a[i - 1])) ? 'j' : 'i';
  }).join('');
  const map = { b: 'p', f: 'p', g: 'k', l: 'r', v: 'w', h: '' };
  w = [...w].map((ch) => (ch in map ? map[ch] : ch)).join('');
  return w.replace(/(.)\1+/g, '$1'); // doubled letters are written once
}

function sign(c, v) {
  const s = FALLBACK[c + v] ?? c + v;
  return { syl: s, char: SIGNS[s] };
}

function spell(word) {
  const w = normalize(word);
  const out = [];
  let prevVowel = null;
  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    const next = w[i + 1];
    if (isVowel(ch)) { out.push(sign('', ch)); prevVowel = ch; continue; }
    if (isVowel(next)) { out.push(sign(ch, next)); prevVowel = next; i++; continue; }
    // A consonant with no vowel of its own.
    const sonorant = 'rmn'.includes(ch);
    if (next === undefined) {
      // Word-final r/l, m, n and s are not written; a final stop borrows the last vowel.
      if (!sonorant && ch !== 's') out.push(sign(ch, prevVowel ?? 'a'));
      continue;
    }
    // Before another consonant: r/l, m, n and s are omitted (except m before n,
    // and s before m or w); stops are written with the vowel of the next syllable.
    const written = (!sonorant && ch !== 's') || (ch === 'm' && next === 'n') || (ch === 's' && 'mw'.includes(next));
    if (written) {
      const ahead = [...w.slice(i + 1)].find(isVowel);
      out.push(sign(ch, ahead ?? prevVowel ?? 'a'));
    }
  }
  return out;
}

/**
 * @param {string} text  a name or phrase in Latin letters
 * @returns {{word: string, syllables: {syl: string, char: string}[]}[]}
 */
export function transliterate(text) {
  return String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .split(/[^a-z]+/).filter(Boolean)
    .map((word) => ({ word, syllables: spell(word) }))
    .filter((w) => w.syllables.length > 0);
}

/** A label spelled in Linear B signs, words separated by a space; '' when nothing can be spelled. */
export function linearBLabel(text) {
  return transliterate(text).map((w) => w.syllables.map((s) => s.char).join('')).join(' ');
}
