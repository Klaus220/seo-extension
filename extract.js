/** Runs in the page; depends on helpers.js injected first. */
(function () {
  function attr(el, name) {
    const v = el.getAttribute(name);
    return v == null || v === '' ? undefined : v;
  }

  function extractSeo(doc) {
    const meta = Array.from(doc.querySelectorAll('meta')).map((el) => {
      const row = {
        name: attr(el, 'name'),
        property: attr(el, 'property'),
        httpEquiv: attr(el, 'http-equiv'),
        charset: attr(el, 'charset'),
        content: attr(el, 'content'),
        raw: el.outerHTML,
      };
      return row;
    });

    const links = Array.from(doc.head ? doc.head.querySelectorAll('link') : []).map((el) => ({
      rel: attr(el, 'rel'),
      href: attr(el, 'href'),
      hreflang: attr(el, 'hreflang'),
      type: attr(el, 'type'),
      sizes: attr(el, 'sizes'),
      as: attr(el, 'as'),
      raw: el.outerHTML,
    }));

    const { openGraph, twitter } = splitMeta(meta);

    const jsonLd = Array.from(
      doc.querySelectorAll('script[type="application/ld+json"]')
    ).map((el) => parseJsonLdText(el.textContent || ''));

    return {
      url: doc.defaultView ? doc.defaultView.location.href : '',
      title: doc.title || '',
      meta,
      links,
      openGraph,
      twitter,
      jsonLd,
    };
  }

  globalThis.__SEO_VIEWER_DATA__ = extractSeo(document);
})();
