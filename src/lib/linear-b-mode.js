// Linear B mode: re-spells the site chrome in Linear B signs. Elements opt in
// with a `data-lb` attribute holding the glyph string; the English text is kept
// in aria-label and title while the glyphs are shown.
const KEY = 'lb';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Linear+B&display=swap';
const root = document.documentElement;

const stored = () => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};

function loadFont() {
  if (document.querySelector('link[href*="Noto+Sans+Linear+B"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FONT_HREF;
  document.head.append(link);
}

function render(on) {
  for (const el of document.querySelectorAll('body [data-lb]')) {
    if (on && el.dataset.lbText === undefined) {
      el.dataset.lbText = el.textContent;
      el.textContent = el.dataset.lb;
      el.setAttribute('aria-label', el.dataset.lbText);
      el.setAttribute('title', el.dataset.lbText);
    } else if (!on && el.dataset.lbText !== undefined) {
      el.textContent = el.dataset.lbText;
      el.removeAttribute('aria-label');
      el.removeAttribute('title');
      delete el.dataset.lbText;
    }
  }
  if (on) { root.dataset.lb = '1'; loadFont(); } else { delete root.dataset.lb; }
  root.dataset.lbReady = '1';
}

export const isOn = () => root.dataset.lb === '1';

// Turns the mode on or off, remembers the choice, and tells listeners.
export function setMode(on) {
  try { on ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch { /* choice lasts this page only */ }
  render(on);
  document.dispatchEvent(new CustomEvent('lbchange', { detail: { on } }));
}

export function init() {
  render(stored());
  for (const btn of document.querySelectorAll('.lb-off')) btn.addEventListener('click', () => setMode(false));
}
