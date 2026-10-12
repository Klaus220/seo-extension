# Firefox SEO Viewer — Design Spec

Date: 2026-10-12  
Status: approved for planning

## Goal

Firefox WebExtension (Linux) that shows the current page’s SEO-related markup in a toolbar popup: all head meta/link tags, Open Graph, Twitter cards, and JSON-LD. Read-only viewer with copy helpers. No audit scores or warnings.

## Non-goals

- SEO scoring, length checks, or “missing tag” warnings
- Sidebar / DevTools panel
- Persistent background worker
- Build toolchain, frameworks, or npm dependencies
- AMO listing (temporary load / local `.xpi` is enough for v1)

## Architecture

Manifest V3 WebExtension.

| File | Role |
|------|------|
| `manifest.json` | `action` popup; permissions `activeTab`, `scripting` |
| `popup.html` | Popup shell |
| `popup.css` | Popup layout and styles |
| `popup.js` | Open flow: get active tab → inject extractor → render UI → copy handlers |
| `extract.js` | Pure DOM scrape of the page document; returns a plain data object |

**Flow**

1. User clicks toolbar icon → popup opens.
2. `popup.js` resolves the active tab.
3. Via `browser.scripting.executeScript`, run `extract.js` in that tab.
4. Popup receives the result and renders grouped sections.
5. Copy buttons write to clipboard from the popup context.

No background/service worker in v1.

## Data model

Returned object from `extract.js`:

```ts
{
  url: string,
  title: string,
  meta: Array<{ name?: string, property?: string, httpEquiv?: string, charset?: string, content?: string, raw: string }>,
  links: Array<{ rel?: string, href?: string, hreflang?: string, type?: string, sizes?: string, as?: string, raw: string }>,
  openGraph: Array<{ property: string, content: string }>,
  twitter: Array<{ name: string, content: string }>,
  jsonLd: Array<{ raw: string, parsed: object | null, error?: string }>
}
```

**Extraction rules**

- `title`: `document.title`
- `url`: `location.href`
- `meta`: every `<meta>` in `document` (prefer `document.head`, include any in body if present)
- `links`: every `<link>` in `document.head`
- `openGraph`: meta entries whose `property` starts with `og:`
- `twitter`: meta entries whose `name` starts with `twitter:`
- `jsonLd`: every `<script type="application/ld+json">`; attempt `JSON.parse`; on failure keep `raw` and set `error`

Open Graph / Twitter are convenience slices of `meta`; the Meta section still lists all tags.

## UI

- Popup size ~400×560px (scrollable).
- Language: Russian labels (product used in RU context).
- Sections (collapsible, open by default if non-empty; empty → one-line “не найдено”):
  1. Document (`title`, URL)
  2. Meta
  3. Links
  4. Open Graph
  5. Twitter
  6. JSON-LD (pretty-printed when parse succeeds; otherwise raw + error note)
- Each row: label + value; click/control to copy that value.
- Each section header: “Copy section” copies a plain-text dump of that section.
- Brief toast/feedback on successful copy.

## Error handling

| Case | Behavior |
|------|----------|
| Restricted URL (`about:`, `moz-extension:`, PDF viewer, etc.) or inject fails | Short Russian message: page not available for inspection |
| No active tab | Same class of message |
| Empty SEO sections | Show section with “не найдено” |
| Invalid JSON-LD | Show raw text + parse error; do not crash popup |

## Permissions

- `activeTab` — temporary access to the page the user clicked the icon on
- `scripting` — inject `extract.js` on demand

No `<all_urls>`, no host permissions in v1.

## Install (Linux Firefox)

1. Open `about:debugging#/runtime/this-firefox`
2. “Load Temporary Add-on…”
3. Select `manifest.json` from the extension root

Optional later: zip the folder → rename to `.xpi` for semi-permanent local install. Temporary add-ons unload when Firefox restarts.

## Testing

Manual checklist (no test framework in v1):

1. Static HTML page with title, description, canonical, og:*, twitter:*, one valid JSON-LD → all sections populated.
2. Page with two JSON-LD blocks → both listed.
3. Page with broken JSON-LD → raw + error, popup still works.
4. Page with no SEO tags → empty states.
5. `about:addons` or similar → friendly error.
6. Copy value and copy section → clipboard contains expected text.

## File layout

```
firefox-seo-plugin/
  manifest.json
  popup.html
  popup.css
  popup.js
  extract.js
  icons/          # simple toolbar icon(s)
  docs/superpowers/specs/2026-10-12-firefox-seo-viewer-design.md
  README.md       # install + usage (added at implementation)
```
