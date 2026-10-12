import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { globalThis: {} };
ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(path.join(root, 'helpers.js'), 'utf8'), ctx);

const {
  parseJsonLdText,
  splitMeta,
  formatSectionText,
  collectJsonLdTypes,
  jsonLdTypeLabel,
  jsonLdEntityNodes,
  jsonLdNodeTitle,
} = ctx;

const ok = parseJsonLdText('{"@type":"WebPage"}');
assert.equal(ok.parsed['@type'], 'WebPage');
assert.equal(ok.error, undefined);

const bad = parseJsonLdText('{not json');
assert.equal(bad.parsed, null);
assert.ok(bad.error);

const { openGraph, twitter } = splitMeta([
  { name: 'description', content: 'd' },
  { property: 'og:title', content: 'T' },
  { name: 'twitter:card', content: 'summary' },
]);
// ponytail: vm realm objects — compare via JSON
assert.equal(
  JSON.stringify(openGraph),
  JSON.stringify([{ property: 'og:title', content: 'T' }])
);
assert.equal(
  JSON.stringify(twitter),
  JSON.stringify([{ name: 'twitter:card', content: 'summary' }])
);

assert.equal(
  formatSectionText('Meta', ['description: d', 'og:title: T']),
  'Meta\ndescription: d\nog:title: T'
);

assert.equal(
  jsonLdTypeLabel({
    '@graph': [
      { '@type': 'Organization', name: 'A' },
      { '@type': 'WebPage', name: 'B' },
      { '@type': 'Organization', name: 'C' },
      { '@type': ['BreadcrumbList', 'ItemList'] },
    ],
  }),
  'Organization, WebPage, BreadcrumbList, ItemList'
);

assert.equal(
  JSON.stringify(collectJsonLdTypes([{ '@type': 'FAQPage' }, { '@type': 'FAQPage' }])),
  JSON.stringify(['FAQPage'])
);

const graphNodes = jsonLdEntityNodes({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', name: 'SANCTUM' },
    { '@type': 'WebPage', '@id': 'https://example.com/' },
  ],
});
assert.equal(graphNodes.length, 2);
assert.equal(jsonLdNodeTitle(graphNodes[0], 0), 'Organization · SANCTUM');
assert.equal(jsonLdNodeTitle(graphNodes[1], 1), 'WebPage · https://example.com/');

console.log('ok');
