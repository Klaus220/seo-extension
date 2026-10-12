/** Cross-browser WebExtension API (Firefox `browser` / Chromium `chrome`). */
globalThis.ext =
  typeof globalThis.browser !== 'undefined' && globalThis.browser.runtime
    ? globalThis.browser
    : globalThis.chrome;
