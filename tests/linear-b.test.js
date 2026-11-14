// The transliterator follows Mycenaean spelling conventions, so the reference
// cases are attested Linear B spellings of Greek words and place names.
import { describe, it, expect } from 'vitest';
import { transliterate, linearBLabel, SIGNS } from '../src/lib/linear-b.js';

const syl = (text) => transliterate(text).map((w) => w.syllables.map((s) => s.syl).join('-')).join(' ');

describe('Linear B transliteration', () => {
  it.each([
    ['Knossos', 'ko-no-so'],   // attested: ko-no-so
    ['tripos', 'ti-ri-po'],    // attested: ti-ri-po
    ['pantes', 'pa-te'],       // attested: pa-te
    ['khalkos', 'ka-ko'],      // attested: ka-ko
    ['sperma', 'pe-ma'],       // attested: pe-ma
    ['Amnisos', 'a-mi-ni-so'], // attested: a-mi-ni-so
  ])('spells %s as %s', (word, expected) => {
    expect(syl(word)).toBe(expected);
  });

  it('adapts modern names: no L/R distinction, b→p, g→k, h dropped, final sonorants dropped', () => {
    expect(syl('Adam Hare')).toBe('a-da a-re');
    expect(syl('Lily')).toBe('ri-ri');
    expect(syl('Bob')).toBe('po-po');
    expect(syl('Greg')).toBe('ke-re-ke');
  });

  it('every emitted syllable has a real sign in the Linear B Unicode block', () => {
    for (const name of ['Jacqueline', 'Xavier', 'Zuzu', 'Quentin', 'Wu', 'Yvonne', 'Christopher', 'Ng']) {
      for (const word of transliterate(name)) {
        expect(word.syllables.length, name).toBeGreaterThan(0);
        for (const s of word.syllables) {
          expect(SIGNS[s.syl], `${name}: ${s.syl}`).toBeDefined();
          const cp = s.char.codePointAt(0);
          expect(cp).toBeGreaterThanOrEqual(0x10000);
          expect(cp).toBeLessThanOrEqual(0x1003f);
        }
      }
    }
  });

  it('ignores punctuation, digits and accents, and returns nothing for empty input', () => {
    expect(syl('  José-María!! 42 ')).toBe('jo-se ma-ri-a');
    expect(transliterate('')).toEqual([]);
    expect(transliterate('123 !?')).toEqual([]);
  });
});

describe('linearBLabel', () => {
  const glyphs = (...syls) => syls.map((x) => SIGNS[x]).join('');

  it('joins the signs of each word and separates words with a space', () => {
    expect(linearBLabel('Knossos')).toBe(glyphs('ko', 'no', 'so'));
    expect(linearBLabel('Lily Knossos')).toBe(`${glyphs('ri', 'ri')} ${glyphs('ko', 'no', 'so')}`);
  });

  it('uses only Linear B syllabary characters and spaces', () => {
    expect(linearBLabel('Adam Hare Background')).toMatch(/^[\u{10000}-\u{1003F} ]+$/u);
  });

  it('returns an empty string when nothing can be spelled', () => {
    expect(linearBLabel('')).toBe('');
    expect(linearBLabel('42 !?')).toBe('');
  });
});
