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

/** Unique @type values from a JSON-LD node, including @graph / arrays. */
function collectJsonLdTypes(node) {
  const seen = new Set();

  function walk(value) {
    if (value == null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    const t = value['@type'];
    if (typeof t === 'string') seen.add(t);
    else if (Array.isArray(t)) {
      for (const x of t) if (typeof x === 'string') seen.add(x);
    }
    if (Object.prototype.hasOwnProperty.call(value, '@graph')) {
      walk(value['@graph']);
    }
  }

  walk(node);
  return Array.from(seen);
}

function jsonLdTypeLabel(parsed) {
  return collectJsonLdTypes(parsed).join(', ');
}

/** Top-level entity nodes: @graph items, array items, or the object itself. */
function jsonLdEntityNodes(parsed) {
  if (parsed == null || typeof parsed !== 'object') return [];
  if (Array.isArray(parsed)) {
    return parsed.filter((x) => x && typeof x === 'object' && !Array.isArray(x));
  }
  if (Array.isArray(parsed['@graph'])) {
    return parsed['@graph'].filter((x) => x && typeof x === 'object' && !Array.isArray(x));
  }
  return [parsed];
}

function jsonLdNodeTitle(node, index) {
  if (!node || typeof node !== 'object') return `узел ${index + 1}`;
  const type = collectJsonLdTypes(node).join(', ') || `узел ${index + 1}`;
  const name =
    (typeof node.name === 'string' && node.name) ||
    (typeof node.headline === 'string' && node.headline) ||
    (typeof node['@id'] === 'string' && node['@id']) ||
    '';
  return name ? `${type} · ${name}` : type;
}

globalThis.parseJsonLdText = parseJsonLdText;
globalThis.splitMeta = splitMeta;
globalThis.formatSectionText = formatSectionText;
globalThis.collectJsonLdTypes = collectJsonLdTypes;
globalThis.jsonLdTypeLabel = jsonLdTypeLabel;
globalThis.jsonLdEntityNodes = jsonLdEntityNodes;
globalThis.jsonLdNodeTitle = jsonLdNodeTitle;
