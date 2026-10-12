/** Pure helpers shared by extract.js (page) and Node self-check. */

function parseJsonLdText(raw) {
  try {
    return { raw, parsed: JSON.parse(raw), error: undefined };
  } catch (e) {
    return { raw, parsed: null, error: String(e && e.message ? e.message : e) };
  }
}

function splitMeta(metaRows) {
  const openGraph = [];
  const twitter = [];
  for (const row of metaRows) {
    if (row.property && String(row.property).startsWith('og:')) {
      openGraph.push({ property: row.property, content: row.content || '' });
    }
    if (row.name && String(row.name).startsWith('twitter:')) {
      twitter.push({ name: row.name, content: row.content || '' });
    }
  }
  return { openGraph, twitter };
}

function formatSectionText(title, lines) {
  return [title, ...lines].join('\n');
}

globalThis.parseJsonLdText = parseJsonLdText;
globalThis.splitMeta = splitMeta;
globalThis.formatSectionText = formatSectionText;
