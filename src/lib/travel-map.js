// Shared logic for turning the "Travel-Public" Google Sheet rows into
// map-ready {code, name} lists. Used at build time (scripts/fetch-travel.mjs)
// and in the browser (Travel page live refresh).

export const SHEET_BASE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSrgr7BGXJ8qJNyvcenfqG9l8Af8HEjZE4DOOwIAz0Sau-J16fzBlx2LJyDtA87veenZ3F5ZwLdEEh-/pub?single=true&output=csv&gid=';
export const COUNTRIES_GID = '0';
export const STATES_GID = '2018686828';

// Ported from the hand-built Google Sites embed (Travel page, DRAFT).
export const ALIASES = {
  usa: 'US', us: 'US', 'united states of america': 'US', america: 'US', 'united states': 'US',
  uk: 'GB', 'great britain': 'GB', britain: 'GB', england: 'GB', scotland: 'GB', wales: 'GB', 'northern ireland': 'GB',
  vatican: 'VA', 'vatican city': 'VA', 'holy see': 'VA', 'holy see vatican city': 'VA',
  czechia: 'CZ', 'czech republic': 'CZ', turkiye: 'TR', turkey: 'TR',
  'saint vincent and the grenadines': 'VC', 'st vincent and the grenadines': 'VC', 'st vincent': 'VC', 'saint vincent': 'VC',
  'south korea': 'KR', korea: 'KR', 'north korea': 'KP', russia: 'RU', holland: 'NL', 'the netherlands': 'NL',
  'ivory coast': 'CI', 'cote divoire': 'CI', burma: 'MM', myanmar: 'MM', macedonia: 'MK', 'north macedonia': 'MK',
  eswatini: 'SZ', swaziland: 'SZ', 'cape verde': 'CV', 'cabo verde': 'CV', vietnam: 'VN', laos: 'LA', syria: 'SY',
  iran: 'IR', bolivia: 'BO', venezuela: 'VE', tanzania: 'TZ', moldova: 'MD', palestine: 'PS', taiwan: 'TW',
  bahamas: 'BS', 'the bahamas': 'BS', gambia: 'GM', 'the gambia': 'GM', congo: 'CG', drc: 'CD', 'dr congo': 'CD',
  'democratic republic of the congo': 'CD', 'st lucia': 'LC', 'st kitts and nevis': 'KN', brunei: 'BN', 'east timor': 'TL',
};

export const STATES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA',
  washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  dc: 'DC', 'washington dc': 'DC', 'washington d c': 'DC', 'district of columbia': 'DC', 'd c': 'DC',
};

// Legacy/exceptional ISO 3166 codes that ICU names identically to a current code.
const LEGACY = new Set(['DD', 'FX', 'SU', 'YU', 'ZR', 'AN', 'BU', 'CS', 'NT', 'TP', 'UK']);

export const norm = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export function buildNameToIso() {
  const out = {};
  const dn = new Intl.DisplayNames(['en'], { type: 'region' });
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a) + String.fromCharCode(b);
      if (LEGACY.has(code)) continue;
      try {
        const name = dn.of(code);
        if (name && name !== code && !out[norm(name)]) out[norm(name)] = code;
      } catch { /* not a region */ }
    }
  }
  return out;
}

export function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** Header rows included; returns {countries, states, unknown}. */
export function rowsToData(cRows, sRows) {
  const nameToIso = buildNameToIso();
  const unknown = [];
  const countries = [];
  for (const r of cRows.slice(1)) {
    const name = (r[0] || '').trim();
    if (!name) continue;
    const n = norm(name);
    const code = ALIASES[n] || nameToIso[n] || nameToIso[n.replace(/^the /, '')];
    if (!code) { unknown.push(name); continue; }
    countries.push({ code, name, years: (r[1] || '').trim() });
  }
  const states = [];
  for (const r of sRows.slice(1)) {
    const name = (r[0] || '').trim();
    if (!name) continue;
    const code = STATES[norm(name)];
    if (!code) { unknown.push(name); continue; }
    if (!states.some((s) => s.code === code)) states.push({ code, name });
  }
  return { countries, states, unknown };
}

export async function fetchSheet(fetchImpl = fetch) {
  const get = async (gid) => {
    const res = await fetchImpl(SHEET_BASE + gid + '&t=' + Date.now());
    if (!res.ok) throw new Error(`gid ${gid}: HTTP ${res.status}`);
    return parseCSV(await res.text());
  };
  const [cRows, sRows] = await Promise.all([get(COUNTRIES_GID), get(STATES_GID)]);
  return rowsToData(cRows, sRows);
}
