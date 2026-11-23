// Browser-side country picker for the Travel page's world map: makes visited
// countries, and optionally countries only read about, clickable (map regions
// and chips) and fills a panel with the books and concerts for the chosen country.
// Map colouring (visited, lined) is the page's job; this only handles clicks.
//
// data: { books: [{title, author, year}], booksByCountry: {code: [[index, why]]},
//         concertsByCountry: {code: [{artist, city, date}]} } with lowercase codes.

const SHOW = 12;
const HALO_ATTRS = ['id', 'class', 'tabindex', 'role', 'aria-label', 'aria-pressed', 'data-tip-name', 'data-tip-bound'];

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

function listSection(heading, rows, makeRow) {
  const sec = el('section', 'tl-col');
  const h = el('h3');
  h.append(`${heading} `, el('span', 'tl-count', `· ${rows.length}`));
  sec.append(h);
  if (!rows.length) {
    sec.append(el('p', 'tl-empty', 'Nothing on the list yet'));
    return sec;
  }
  const ul = el('ul', 'tl-list');
  rows.slice(0, SHOW).forEach((r) => ul.append(makeRow(r)));
  sec.append(ul);
  if (rows.length > SHOW) {
    const more = el('button', 'tl-more', `Show all ${rows.length}`);
    more.type = 'button';
    more.addEventListener('click', () => {
      rows.slice(SHOW).forEach((r) => ul.append(makeRow(r)));
      more.remove();
    });
    sec.append(more);
  }
  return sec;
}

const WHY = { from: 'from here', about: 'about here', both: 'from & about here' };

const bookRow = (b) => {
  const li = el('li');
  const main = el('span', 'tl-main');
  main.append(el('em', '', b.title));
  if (b.author) main.append(el('span', 'tl-by', ` · ${b.author}`));
  main.append(el('span', 'tl-why', ` · ${WHY[b.why]}`));
  li.append(main, el('span', 'tl-when', String(b.year)));
  return li;
};

const concertRow = (c) => {
  const li = el('li');
  const main = el('span', 'tl-main');
  main.append(el('strong', '', c.artist), el('span', 'tl-by', ` · ${c.city}`));
  li.append(main, el('span', 'tl-when', c.date));
  return li;
};

export function initCountryPanel({ wrap, chips, panel, data }) {
  const svg = wrap.querySelector('svg');
  let visited = new Map();
  let readOnly = new Map();
  let selected = null;
  let halo = null;
  let origin = 'region';

  const regionOf = (code) => svg.querySelector(`#${code}`);
  const infoOf = (code) => visited.get(code) || readOnly.get(code);

  function renderPanel() {
    panel.replaceChildren();
    if (!selected) {
      panel.append(el('p', 'tl-prompt', 'Pick a country to see what I read and heard there.'));
      return;
    }
    const c = infoOf(selected);
    const books = (data.booksByCountry[selected] || []).map(([i, why]) => ({ ...data.books[i], why }));
    const concerts = data.concertsByCountry[selected] || [];
    const head = el('div', 'tl-head');
    const title = el('div');
    title.append(el('h3', 'tl-name', c.name), el('p', 'tl-years', c.home ? 'Home' : !visited.has(selected) ? 'Not visited yet' : c.years ? `Visited ${c.years}` : 'Visited'));
    const close = el('button', 'tl-close', 'Close');
    close.type = 'button';
    close.addEventListener('click', () => deselect(true));
    head.append(title, close);
    panel.append(head);
    const cols = el('div', 'tl-cols' + (concerts.length ? ' tl-two' : ''));
    cols.append(listSection('Books', books, bookRow));
    if (concerts.length) cols.append(listSection('Concerts', concerts, concertRow));
    panel.append(cols);
    const links = el('div', 'tl-links');
    const allBooks = el('a', '', 'See all books');
    allBooks.href = '/books';
    const allConcerts = el('a', '', 'See all concerts');
    allConcerts.href = '/music';
    links.append(allBooks, allConcerts);
    panel.append(links);
  }

  function drawHalo() {
    halo?.remove();
    halo = null;
    const target = selected && regionOf(selected);
    if (!target) return;
    halo = target.cloneNode(true);
    for (const n of [halo, ...halo.querySelectorAll('*')]) HALO_ATTRS.forEach((a) => n.removeAttribute(a));
    halo.classList.add('tl-halo');
    svg.append(halo);
  }

  // `via` is where the selection came from ('region' or 'chip'); closing returns focus there.
  function select(code, via) {
    if (!infoOf(code)) return;
    if (code === selected) return deselect(false);
    selected = code;
    origin = via;
    sync();
  }

  function deselect(refocus) {
    if (!selected) return;
    const code = selected;
    selected = null;
    sync();
    if (!refocus) return;
    const target = origin === 'chip' ? [...chips.querySelectorAll('button')].find((b) => b.dataset.code === code) : regionOf(code);
    target?.focus();
  }

  function sync() {
    for (const code of [...visited.keys(), ...readOnly.keys()]) regionOf(code)?.setAttribute('aria-pressed', String(code === selected));
    for (const b of chips.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.code === selected));
    drawHalo();
    renderPanel();
  }

  function bind(code) {
    const r = regionOf(code);
    if (!r) return;
    r.setAttribute('tabindex', '0');
    r.setAttribute('role', 'button');
    const { name } = infoOf(code);
    r.setAttribute('aria-label', `${name}: show books${data.concertsByCountry[code]?.length ? ' and concerts' : ''}`);
    window.bindMapTip?.(r, name);
    if (r.dataset.tlBound) return;
    r.dataset.tlBound = '1';
    r.addEventListener('click', () => select(code, 'region'));
    r.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(code, 'region'); }
    });
  }

  function unbind(code) {
    const r = regionOf(code);
    if (!r) return;
    delete r.dataset.tipName;
    for (const a of ['tabindex', 'role', 'aria-label', 'aria-pressed']) r.removeAttribute(a);
  }

  const chip = (c, cls) => {
    const b = el('button', cls, c.name);
    b.type = 'button';
    b.dataset.code = c.code;
    b.addEventListener('click', () => select(c.code, 'chip'));
    return b;
  };
  const byName = (m) => [...m.values()].sort((a, b) => a.name.localeCompare(b.name));

  function renderChips() {
    chips.replaceChildren(...byName(visited).map((c) => chip(c, 'tl-chip')));
    if (!readOnly.size) return;
    chips.append(el('p', 'tl-chip-label', 'Only read about'), ...byName(readOnly).map((c) => chip(c, 'tl-chip read')));
  }

  // Swaps one clickable set for another; a code still in the other set stays bound.
  function replace(current, list, other) {
    for (const code of current.keys()) if (!other.has(code)) unbind(code);
    return new Map(list.map((c) => [c.code, c]));
  }

  function rebind() {
    for (const code of [...readOnly.keys(), ...visited.keys()]) bind(code);
    renderChips();
    if (selected && !infoOf(selected)) selected = null;
    sync();
  }

  // list: [{code, name, years, home?}] with lowercase codes. Replaces the visited set.
  function setVisited(list) {
    visited = replace(visited, list, readOnly);
    rebind();
  }

  // list: [{code, name}] with lowercase codes, countries with books but no visit. [] hides them.
  function setReadOnly(list) {
    readOnly = replace(readOnly, list, visited);
    rebind();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selected && [wrap, chips, panel].some((n) => n.contains(e.target))) deselect(true);
  });

  return { setVisited, setReadOnly };
}
