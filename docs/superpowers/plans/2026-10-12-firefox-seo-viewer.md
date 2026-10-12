# Firefox SEO Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Manifest V3 Firefox toolbar popup that extracts and displays page meta, links, Open Graph, Twitter, and JSON-LD with copy helpers.

**Architecture:** On popup open, `popup.js` uses `browser.scripting.executeScript` to run `extract.js` in the active tab (`activeTab`). The popup renders grouped sections and copies text via `navigator.clipboard`. No background worker, no build step.

**Tech Stack:** Vanilla HTML/CSS/JS, WebExtensions MV3 (`browser.*` APIs), Node for one assert-based self-check of pure helpers.

## Global Constraints

- Manifest V3 only; permissions limited to `activeTab` + `scripting`
- No npm dependencies, no bundler
- Russian UI labels
- Read-only viewer — no SEO scoring or missing-tag warnings
- Spec: `docs/superpowers/specs/2026-10-12-firefox-seo-viewer-design.md`

## File Structure

| File | Responsibility |
|------|----------------|
| `manifest.json` | Extension metadata, action popup, permissions |
| `extract.js` | DOM scrape → plain data object (+ pure helpers for self-check) |
| `popup.html` | Popup DOM shell |
| `popup.css` | Popup styles |
| `popup.js` | Inject, render, copy |
| `icons/icon-48.png`, `icons/icon-96.png` | Toolbar icons |
| `tests/extract-selfcheck.mjs` | Assert-based check of pure helpers |
| `fixtures/sample.html` | Manual browser fixture |
| `README.md` | Install + usage |

---

### Task 1: Extractor + self-check

**Files:**
- Create: `extract.js`
- Create: `tests/extract-selfcheck.mjs`

**Interfaces:**
- Produces: `extractSeo(doc)` → data object per spec; when injected without calling, sets `globalThis.__seoExtractResult` OR returns via executeScript function form
- Pure helpers exported for Node: `classifyMeta(metaRows)`, `parseJsonLdScripts(rawTexts)`, `formatSectionText(sectionName, data)`

**Note:** Prefer `browser.scripting.executeScript({ func: extractSeo })` is awkward with separate file. Use `files: ['extract.js']` where extract.js defines:

```js
function extractSeo(doc = document) { /* ... */ return data; }
```

and ends with:

```js
extractSeo(); // return value ignored for files[]; instead:
```

Actually Firefox `executeScript` with `files` does **not** return the last expression of the file. Use:

```js
// extract.js — only function definitions
function extractSeo(doc = document) { ... }

// popup.js
const [{ result }] = await browser.scripting.executeScript({
  target: { tabId },
  func: () => extractSeo(),
});
```

That fails — `extractSeo` from a prior file injection isn't in the func world unless both are in the same injection. Correct pattern:

```js
await browser.scripting.executeScript({ target: { tabId }, files: ['extract.js'] });
const [{ result }] = await browser.scripting.executeScript({
  target: { tabId },
  func: () => globalThis.__SEO_EXTRACT__(),
});
```

Where `extract.js` assigns `globalThis.__SEO_EXTRACT__ = extractSeo`.

Or single injection:

```js
browser.scripting.executeScript({
  target: { tabId },
  files: ['extract.js'],
});
```

with extract.js last line being impossible for return... **Use world MAIN and store on window, or use one `func` with inlined code.**

**Chosen approach:** `extract.js` is loaded as a classic script via `files`, and its last statement is:

```js
globalThis.__seoExtract = extractSeo();
```

Then second `executeScript` with `func: () => globalThis.__seoExtract` to read it back. Simpler: **one** `executeScript` with `func` that is the full extractSeo — but keep source in extract.js for maintainability by reading file... can't in extension easily.

**Simplest reliable approach for Firefox:**

```js
// popup.js
const [{ result }] = await browser.scripting.executeScript({
  target: { tabId },
  files: ['extract.js'],
});
```

In Firefox, when using `files`, the result is `undefined`. So use:

```js
await browser.scripting.executeScript({ target: { tabId }, files: ['extract.js'] });
const [{ result }] = await browser.scripting.executeScript({
  target: { tabId },
  func: () => globalThis.__SEO_VIEWER_DATA__,
});
```

And `extract.js`:

```js
(function () {
  function extractSeo(doc) { ... }
  globalThis.__SEO_VIEWER_DATA__ = extractSeo(document);
})();
```

For Node self-check, duplicate pure helpers at top of extract.js as named functions, and selfcheck imports via dynamic eval or a tiny shared `extract-helpers.js`.

**Lazier split:** `extract-helpers.js` with pure functions; `extract.js` uses them in browser (must be listed in executeScript files array in order); Node selfcheck imports helpers only.

- [ ] **Step 1: Write `extract-helpers.js`**

```js
export function parseJsonLdText(raw) {
  try {
    return { raw, parsed: JSON.parse(raw), error: undefined };
  } catch (e) {
    return { raw, parsed: null, error: String(e.message || e) };
  }
}

export function splitMeta(metaRows) {
  const openGraph = [];
  const twitter = [];
  for (const row of metaRows) {
    if (row.property && row.property.startsWith('og:')) {
      openGraph.push({ property: row.property, content: row.content || '' });
    }
    if (row.name && row.name.startsWith('twitter:')) {
      twitter.push({ name: row.name, content: row.content || '' });
    }
  }
  return { openGraph, twitter };
}

export function formatSectionText(title, lines) {
  return [title, ...lines].join('\n');
}
```

Extensions can't use ES modules in injected content scripts easily without `"type": "module"`. **Avoid modules in extension files.** Use plain scripts + Node selfcheck that re-implements asserts by reading helpers as text, OR put helpers as non-module functions in `extract-helpers.js` without export, and in Node:

```js
import { readFileSync } from 'fs';
import { createRequire } from 'module';
// use vm.runInNewContext
```

**Final lazy approach:** one `extract.js` (browser IIFE). One `tests/extract-selfcheck.mjs` that copies the pure logic inline for assert OR uses `vm` to eval a helpers block.

Even lazier: selfcheck only tests `parseJsonLd` / `splitMeta` / `formatSection` duplicated in selfcheck file that imports from a `helpers.js` CommonJS-free ESM file **not** used by the extension — DRY violation.

**Best small DRY:** `helpers.js` without import/export — functions in global scope. Extension injects `['helpers.js', 'extract.js']`. Node:

```js
import vm from 'node:vm';
import fs from 'node:fs';
const ctx = {};
vm.runInNewContext(fs.readFileSync('helpers.js','utf8'), ctx);
// call ctx.parseJsonLdText etc — only if helpers assign to globalThis
```

helpers.js:

```js
function parseJsonLdText(raw) { ... }
function splitMeta(metaRows) { ... }
function formatSectionText(title, lines) { ... }
```

extract.js uses those functions (same tab global after both files inject).

selfcheck.mjs:

```js
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ctx = { console };
vm.runInNewContext(fs.readFileSync(new URL('../helpers.js', import.meta.url)), ctx);
// Wait — function declarations become global in vm? In vm.runInNewContext, function decls go on ctx if we use script carefully.

Better helpers.js ends with:
globalThis.parseJsonLdText = parseJsonLdText;
...
```

- [ ] **Step 2: Write failing selfcheck**

`tests/extract-selfcheck.mjs` — assert parseJsonLdText valid/invalid, splitMeta filters, formatSectionText joins. Run before helpers exist → fail.

- [ ] **Step 3: Implement `helpers.js` + `extract.js`**

`extract.js` builds meta/links/jsonLd from `document`, uses helpers, sets `globalThis.__SEO_VIEWER_DATA__`.

- [ ] **Step 4: Run selfcheck**

```bash
node tests/extract-selfcheck.mjs
```

Expected: prints `ok` and exit 0.

- [ ] **Step 5: Commit**

```bash
git add helpers.js extract.js tests/extract-selfcheck.mjs
git commit -m "Add SEO DOM extractor and helper self-check."
```

---

### Task 2: Manifest, icons, popup shell

**Files:**
- Create: `manifest.json`
- Create: `icons/icon-48.png`, `icons/icon-96.png` (generate via simple script or SVG→PNG)
- Create: `popup.html`, `popup.css` (empty state / loading only)

**Interfaces:**
- Consumes: none yet
- Produces: loadable temporary add-on pointing at `popup.html`

- [ ] **Step 1: Write manifest.json**

```json
{
  "manifest_version": 3,
  "name": "SEO Viewer",
  "version": "1.0.0",
  "description": "Просмотр meta, Open Graph, Twitter и JSON-LD текущей страницы.",
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_popup": "popup.html",
    "default_title": "SEO Viewer",
    "default_icon": {
      "48": "icons/icon-48.png",
      "96": "icons/icon-96.png"
    }
  },
  "icons": {
    "48": "icons/icon-48.png",
    "96": "icons/icon-96.png"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "seo-viewer@local",
      "strict_min_version": "109.0"
    }
  }
}
```

- [ ] **Step 2: Generate simple PNG icons** (solid color + "SEO" text via Python PIL or ImageMagick, or minimal valid PNG bytes)

- [ ] **Step 3: popup.html + popup.css** — header «SEO Viewer», `#status`, `#app` container, toast element. Russian strings.

- [ ] **Step 4: Commit**

```bash
git commit -m "Add MV3 manifest, icons, and popup shell."
```

---

### Task 3: Popup logic — inject, render, copy

**Files:**
- Create: `popup.js`
- Modify: `popup.html` (script tag), `popup.css` as needed

**Interfaces:**
- Consumes: `globalThis.__SEO_VIEWER_DATA__` shape from extract.js; helpers `formatSectionText` not needed in page — popup formats locally
- Produces: working popup UX

- [ ] **Step 1: Implement popup.js**

1. Show «Загрузка…»
2. `browser.tabs.query({ active: true, currentWindow: true })`
3. Guard missing tab / restricted URL prefix (`about:`, `moz-extension:`, `chrome:`, `resource:`)
4. `executeScript` files `['helpers.js', 'extract.js']` then `func: () => globalThis.__SEO_VIEWER_DATA__`
5. Render sections: Document, Meta, Links, Open Graph, Twitter, JSON-LD
6. Per-row copy button; per-section «Копировать секцию»
7. Toast «Скопировано»
8. On failure: «Не удалось прочитать эту страницу.»

- [ ] **Step 2: Wire popup.html → popup.js**

- [ ] **Step 3: Manual sanity** — load temporary add-on (document in README next task)

- [ ] **Step 4: Commit**

```bash
git commit -m "Render SEO data in popup with copy actions."
```

---

### Task 4: Fixture + README

**Files:**
- Create: `fixtures/sample.html`
- Create: `README.md`

- [ ] **Step 1: sample.html** with title, description, canonical, robots, og:*, twitter:*, two JSON-LD blocks (one intentionally invalid)

- [ ] **Step 2: README** — purpose, `about:debugging` install steps, how to open fixture (`file://` may need extra permission on some Firefox — note: file:// often blocked; suggest `python -m http.server` in fixtures/)

- [ ] **Step 3: Run `node tests/extract-selfcheck.mjs` again**

- [ ] **Step 4: Commit**

```bash
git commit -m "Add sample fixture and install README."
```

---

## Spec coverage check

| Spec item | Task |
|-----------|------|
| All meta/links + OG + Twitter + JSON-LD | 1, 3 |
| Copy value + copy section | 3 |
| No audit | 3 (not implemented) |
| Toolbar popup MV3 activeTab | 2, 3 |
| Restricted URL message | 3 |
| Invalid JSON-LD soft-fail | 1, 3 |
| Temporary install docs | 4 |
| Self-check for non-trivial logic | 1 |
