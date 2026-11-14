// Wraps each <h2> and everything up to the next <h2> in a <section class="panel">,
// so the page's top-level sections render as separate panels (see global.css).
export const panelize = (html) =>
  html.replace(/<h2[\s\S]*?(?=<h2|$)/g, (s) => `<section class="panel">${s}</section>`);
