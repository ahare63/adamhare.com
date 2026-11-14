import { describe, it, expect } from 'vitest';
import { originalLanguage } from '../src/lib/languages.js';

const languages = {
  authors: { 'fernando pessoa': 'Portuguese', 'ovid': 'Latin' },
  titles: { 'gilgamesh': 'Akkadian', 'metamorphoses': 'Greek' },
};

describe('originalLanguage', () => {
  it('prefers the title entry over the author entry', () => {
    expect(originalLanguage({ title: 'Metamorphoses', author: 'Ovid' }, languages, null)).toBe('Greek');
  });

  it('finds titles case-insensitively for books with no author', () => {
    expect(originalLanguage({ title: 'Gilgamesh', author: '' }, languages, null)).toBe('Akkadian');
  });

  it('finds authors with the same lower-casing the cover keys use', () => {
    expect(originalLanguage({ title: 'Message', author: 'Fernando Pessoa' }, languages, null)).toBe('Portuguese');
  });

  it('falls back to a known non-English LibraryThing code', () => {
    expect(originalLanguage({ title: 'X', author: 'Unlisted Person' }, languages, 'ger')).toBe('German');
    expect(originalLanguage({ title: 'X', author: 'Unlisted Person' }, languages, 'grc')).toBe('Ancient Greek');
  });

  it('ignores English, empty and unknown LibraryThing codes', () => {
    const book = { title: 'X', author: 'Unlisted Person' };
    expect(originalLanguage(book, languages, 'eng')).toBeNull();
    expect(originalLanguage(book, languages, '')).toBeNull();
    expect(originalLanguage(book, languages, undefined)).toBeNull();
    expect(originalLanguage(book, languages, 'zzz')).toBeNull();
  });

  it('prefers the data file over a LibraryThing code', () => {
    expect(originalLanguage({ title: 'Message', author: 'Fernando Pessoa' }, languages, 'spa')).toBe('Portuguese');
  });
});
