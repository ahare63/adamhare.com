// Snapshots the latest Substack posts into src/data/essays.json.
// Run before build (CI runs it on every deploy). Exits non-zero WITHOUT
// writing when the feed is unusable, so the committed snapshot survives.
import { writeFileSync } from 'node:fs';

const FEED_URL = 'https://ahare63.substack.com/feed';
const COUNT = 5;

const fail = (msg) => {
  console.error(`fetch-essays: ${msg}`);
  process.exit(1);
};

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');

// Returns the text of <tag>, unwrapping CDATA (kept verbatim) or decoding entities.
const field = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  if (!m) return '';
  const cdata = m[1].match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return (cdata ? cdata[1] : decode(m[1])).trim();
};

let xml;
try {
  const res = await fetch(FEED_URL);
  if (!res.ok) fail(`feed returned HTTP ${res.status}`);
  xml = await res.text();
} catch (err) {
  fail(`could not fetch feed: ${err.message}`);
}

const blocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
if (!/^\s*<\?xml|^\s*<rss/.test(xml) || blocks.length === 0) {
  fail('response is not an RSS feed with at least one <item>');
}

const essays = [];
for (const block of blocks.slice(0, COUNT)) {
  const title = field(block, 'title');
  const url = field(block, 'link');
  const parsed = new Date(field(block, 'pubDate'));
  if (!title || !url || Number.isNaN(parsed.getTime())) {
    fail(`item missing title, link, or valid pubDate: ${title || url || '(unknown)'}`);
  }
  const subtitle = decode(field(block, 'description').replace(/<[^>]*>/g, '')).trim();
  essays.push({ title, url, date: parsed.toISOString().slice(0, 10), subtitle });
}

essays.sort((a, b) => b.date.localeCompare(a.date));

const out = new URL('../src/data/essays.json', import.meta.url);
writeFileSync(out, JSON.stringify(essays, null, 2) + '\n');
console.log(`essays.json: ${essays.length} posts`);
