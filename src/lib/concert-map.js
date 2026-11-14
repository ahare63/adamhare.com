// Browser-side concert map for the Music page: shades US states and countries by
// concert count up to a chosen year, draws a count bubble on each shaded region,
// and lists the concerts of the chosen region by city, newest first.
//
// events: [{artist, date, city, state, country, year, ts}] (state/country lowercase codes)
// names: {code: display name}; first/last: slider range (years).

const NS = 'http://www.w3.org/2000/svg';
const LEVELS = ['cm-l1', 'cm-l2', 'cm-l3', 'cm-l4'];
const HALO_ATTRS = ['id', 'class', 'tabindex', 'role', 'aria-label', 'aria-pressed'];

const level = (n) => (n >= 20 ? 4 : n >= 8 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0);
const plural = (n, word, many) => `${n} ${n === 1 ? word : many ?? `${word}s`}`;
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

// The widest-bounding path of a region: a bubble belongs on the mainland, not on
// the centre of a country's far-flung islands.
function largestPart(node) {
  if (node.tagName.toLowerCase() !== 'g') return node;
  let best = node;
  let area = -1;
  for (const p of node.querySelectorAll('path, circle')) {
    const b = p.getBBox();
    if (b.width * b.height > area) { area = b.width * b.height; best = p; }
  }
  return best;
}

export function initConcertMap({ root, data }) {
  const { events, names, first, last } = data;
  const q = (sel) => root.querySelector(sel);
  const maps = {
    us: { wrap: q('[data-map="us"]'), key: 'state', halos: [] },
    world: { wrap: q('[data-map="world"]'), key: 'country', halos: [] },
  };
  for (const m of Object.values(maps)) {
    m.svg = m.wrap.querySelector('svg');
    m.codes = [...new Set(events.map((e) => e[m.key]).filter(Boolean))];
    m.svg.setAttribute('role', 'group');
    m.svg.setAttribute('aria-label', m.key === 'state'
      ? 'Map of US states, shaded by number of concerts'
      : 'World map, shaded by number of concerts');
  }

  const slider = q('#cm-year');
  const out = q('#cm-year-out');
  const play = q('#cm-play');
  const through = q('#cm-through');
  const detail = q('#cm-detail');
  let sel = null;
  let focused = null;

  const region = (m, code) => m.svg.querySelector(`#${code}`);
  const upTo = (y) => events.filter((e) => e.year <= y);

  function drawBubbles(m, counts) {
    m.svg.querySelector('.cm-bubbles')?.remove();
    const scale = m.svg.getBoundingClientRect().width / m.svg.viewBox.baseVal.width;
    if (!scale) return;
    const r = 8.5 / scale; // constant on-screen size, whatever the viewBox
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'cm-bubbles');
    for (const [code, n] of Object.entries(counts)) {
      const node = region(m, code);
      if (!node) continue;
      const b = largestPart(node).getBBox();
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', cx);
      c.setAttribute('cy', cy);
      c.setAttribute('r', r);
      c.setAttribute('stroke-width', 1 / scale);
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', cx);
      t.setAttribute('y', cy);
      t.setAttribute('dominant-baseline', 'central');
      t.setAttribute('font-size', r * (String(n).length > 1 ? 1.05 : 1.25));
      t.textContent = String(n);
      g.append(c, t);
    }
    m.svg.append(g);
  }

  // Selection and focus are drawn as a white casing under a dark stroke on a copy
  // of the region: one of the two tones contrasts with every fill in the ramp.
  function drawHalos(m, code, kind) {
    m.halos = m.halos.filter((h) => {
      if (h.kind !== kind) return true;
      h.nodes.forEach((n) => n.remove());
      return false;
    });
    const node = code && region(m, code);
    if (!node) return;
    const bubbles = m.svg.querySelector('.cm-bubbles');
    const scale = m.svg.getBoundingClientRect().width / m.svg.viewBox.baseVal.width;
    const nodes = [['cm-halo-casing', 5], ['cm-halo-line', 2]].map(([cls, px]) => {
      const h = node.cloneNode(true);
      for (const n of [h, ...h.querySelectorAll('*')]) {
        HALO_ATTRS.forEach((a) => n.removeAttribute(a));
        n.querySelector?.('title')?.remove();
      }
      h.setAttribute('class', `${cls} cm-halo-${kind}`);
      h.style.strokeWidth = `${px / scale}px`; // constant on-screen width, whatever the viewBox
      m.svg.insertBefore(h, bubbles);
      return h;
    });
    m.halos.push({ kind, nodes });
  }

  function paint(y) {
    const subset = upTo(y);
    for (const [name, m] of Object.entries(maps)) {
      const counts = {};
      for (const e of subset) {
        const c = e[m.key];
        if (c) counts[c] = (counts[c] || 0) + 1;
      }
      for (const code of m.codes) {
        const node = region(m, code);
        if (!node) continue;
        const n = counts[code] || 0;
        node.classList.remove(...LEVELS);
        node.querySelector(':scope > title')?.remove();
        if (n) {
          node.classList.add(`cm-l${level(n)}`);
          node.setAttribute('tabindex', '0');
          node.setAttribute('role', 'button');
          node.setAttribute('aria-label', `${names[code]}: ${plural(n, 'concert')}, show list`);
          node.setAttribute('aria-pressed', String(sel?.map === name && sel.code === code));
          const tip = document.createElementNS(NS, 'title');
          tip.textContent = `${names[code]} · ${plural(n, 'concert')}`;
          node.prepend(tip);
        } else {
          for (const a of ['tabindex', 'role', 'aria-label', 'aria-pressed']) node.removeAttribute(a);
        }
        // Marker circles keyed by class follow their region (as on the Travel page).
        for (const dot of m.svg.querySelectorAll(`circle.${CSS.escape(code)}`)) {
          dot.classList.remove(...LEVELS);
          if (n) dot.classList.add(`cm-l${level(n)}`);
        }
      }
      m.wrap.querySelector('[data-count]').textContent = String(Object.keys(counts).length);
      drawBubbles(m, counts);
      drawHalos(m, sel?.map === name ? sel.code : null, 'sel');
      drawHalos(m, focused?.map === name ? focused.code : null, 'focus');
    }
    out.textContent = String(y);
    through.textContent = `${plural(subset.length, 'concert')} through ${y}.`;
    renderDetail(y);
  }

  function renderDetail(y) {
    detail.replaceChildren();
    if (!sel) {
      detail.append(el('p', 'cm-prompt', 'Pick a shaded state or country to list its concerts.'));
      return;
    }
    const m = maps[sel.map];
    const rows = upTo(y).filter((e) => e[m.key] === sel.code).sort((a, b) => b.ts - a.ts);
    const head = el('div', 'cm-head');
    const title = el('div');
    title.append(el('h3', 'cm-name', names[sel.code]));
    const close = el('button', 'cm-close', 'Close');
    close.type = 'button';
    close.addEventListener('click', () => deselect(true));
    head.append(title, close);
    detail.append(head);
    if (!rows.length) {
      detail.append(el('p', 'cm-empty', `No concerts here yet by ${y}.`));
      return;
    }
    const byCity = new Map();
    for (const e of rows) {
      if (!byCity.has(e.city)) byCity.set(e.city, []);
      byCity.get(e.city).push(e);
    }
    title.append(el('p', 'cm-sub', `${plural(rows.length, 'concert')} in ${plural(byCity.size, 'city', 'cities')}, newest first`));
    const groups = el('div', 'cm-groups' + (byCity.size > 1 ? ' cm-multi' : ''));
    for (const [city, list] of byCity) {
      const sec = el('section', 'cm-group');
      const h = el('h4', '', `${city} `);
      h.append(el('span', 'cm-n', `· ${list.length}`));
      const ul = el('ul', 'cm-list');
      for (const e of list) {
        const li = el('li');
        li.append(el('span', 'cm-artist', e.artist), el('span', 'cm-when', e.date));
        ul.append(li);
      }
      sec.append(h, ul);
      groups.append(sec);
    }
    detail.append(groups);
  }

  // Choosing the selected region again clears the selection.
  function choose(map, code) {
    sel = sel?.map === map && sel.code === code ? null : { map, code };
    paint(Number(slider.value));
  }

  // Closing returns focus to the region that was selected.
  function deselect(refocus) {
    if (!sel) return;
    const { map, code } = sel;
    sel = null;
    paint(Number(slider.value));
    if (refocus) region(maps[map], code)?.focus();
  }

  for (const [name, m] of Object.entries(maps)) {
    for (const code of m.codes) {
      const node = region(m, code);
      if (!node) continue;
      const active = () => node.getAttribute('role') === 'button';
      node.addEventListener('click', () => { if (active()) choose(name, code); });
      node.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && active()) { e.preventDefault(); choose(name, code); }
      });
      node.addEventListener('focus', () => { focused = { map: name, code }; drawHalos(m, code, 'focus'); });
      node.addEventListener('blur', () => { focused = null; drawHalos(m, null, 'focus'); });
    }
  }

  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sel && e.target.closest('.cm-maps, #cm-detail')) deselect(true);
  });

  slider.addEventListener('input', () => paint(Number(slider.value)));
  let timer = null;
  const stop = () => { clearInterval(timer); timer = null; play.textContent = '▶ Play'; };
  play.addEventListener('click', () => {
    if (timer) return stop();
    slider.value = String(first);
    paint(first);
    play.textContent = '❚❚ Pause';
    timer = setInterval(() => {
      if (Number(slider.value) >= last) return stop();
      slider.value = String(Number(slider.value) + 1);
      paint(Number(slider.value));
    }, 900);
  });

  // Bubbles are sized in screen pixels, so redraw when the maps change width.
  let resizeTimer = null;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => paint(Number(slider.value)), 80);
  }).observe(q('.cm-maps'));
  paint(last);
}
