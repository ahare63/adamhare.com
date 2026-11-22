// setlist.fm page URL -> setlist id, e.g. ".../eventim-apollo-london-england-6394a257.html" -> "6394a257".
export function setlistId(url) {
  const m = url.match(/^https:\/\/www\.setlist\.fm\/setlist\/.+-([0-9a-f]{6,8})\.html$/);
  return m ? m[1] : null;
}

// setlist.fm API setlist response -> venue name.
export function venueOf(setlist) {
  return setlist?.venue?.name?.trim() || null;
}
