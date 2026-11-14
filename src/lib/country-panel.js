// Browser-side country picker for the Travel page's world map: makes visited
// countries clickable (map regions and chips) and fills a panel with the books
// and concerts for the chosen country.
//
// data: { books: [{title, author, year}], booksByCountry: {code: [index]},
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

const bookRow = (b) => {
  const li = el('li');
  const main = el('span', 'tl-main');
  main.append(el('em', '', b.title));
  if (b.author) main.append(el('span', 'tl-by', ` · ${b.author}`));
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
  let selected = null;
  let halo = null;
  let origin = 'region';

  const regionOf = (code) => svg.querySelector(`#${code}`);

  function renderPanel() {
    panel.replaceChildren();
    if (!selected) {
      panel.append(el('p', 'tl-prompt', 'Pick a country to see what I read and heard there.'));
      return;
    }
    const c = visited.get(selected);
    const books = (data.booksByCountry[selected] || []).map((i) => data.books[i]);
    const concerts = data.concertsByCountry[selected] || [];
    const head = el('div', 'tl-head');
    const title = el('div');
    title.append(el('h3', 'tl-name', c.name), el('p', 'tl-years', c.home ? 'Home' : c.years ? `Visited ${c.years}` : 'Visited'));
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
    if (!visited.has(code)) return;
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
    const target = origin === 'chip' ? [...chips.children].find((b) => b.dataset.code === code) : regionOf(code);
    target?.focus();
  }

  function sync() {
    for (const [code] of visited) regionOf(code)?.setAttribute('aria-pressed', String(code === selected));
    for (const b of chips.children) b.setAttribute('aria-pressed', String(b.dataset.code === selected));
    drawHalo();
    renderPanel();
  }

  function bind(code) {
    const r = regionOf(code);
    if (!r) return;
    r.setAttribute('tabindex', '0');
    r.setAttribute('role', 'button');
    r.setAttribute('aria-label', `${visited.get(code).name}: show books and concerts`);
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
    for (const a of ['tabindex', 'role', 'aria-label', 'aria-pressed']) r.removeAttribute(a);
  }

  // list: [{code, name, years, home?}] with lowercase codes. Replaces the clickable set.
  function setVisited(list) {
    for (const code of visited.keys()) unbind(code);
    visited = new Map(list.map((c) => [c.code, c]));
    for (const code of visited.keys()) bind(code);
    chips.replaceChildren(...[...visited.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => {
        const b = el('button', 'tl-chip', c.name);
        b.type = 'button';
        b.dataset.code = c.code;
        b.addEventListener('click', () => select(c.code, 'chip'));
        return b;
      }));
    if (selected && !visited.has(selected)) selected = null;
    sync();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selected && [wrap, chips, panel].some((n) => n.contains(e.target))) deselect(true);
  });

  return { setVisited };
}
