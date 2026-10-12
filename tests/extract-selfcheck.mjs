import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { globalThis: {} };
ctx.globalThis = ctx;
vm.runInNewContext(fs.readFileSync(path.join(root, 'helpers.js'), 'utf8'), ctx);

const { parseJsonLdText, splitMeta, formatSectionText } = ctx;

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

console.log('ok');
