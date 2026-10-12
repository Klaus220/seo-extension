const statusEl = document.getElementById('status');
const appEl = document.getElementById('app');
const toastEl = document.getElementById('toast');
const filterEl = document.getElementById('filter');

const RESTRICTED = /^(about|moz-extension|chrome|resource|view-source):/i;

let toastTimer;

function showToast() {
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 1200);
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
  showToast();
}

function setError(message) {
  statusEl.textContent = message;
  statusEl.classList.add('is-error');
  appEl.hidden = true;
}

function metaLabel(row) {
  if (row.property) return row.property;
  if (row.name) return row.name;
  if (row.httpEquiv) return `http-equiv:${row.httpEquiv}`;
  if (row.charset) return 'charset';
  if (row.itemprop) return `itemprop:${row.itemprop}`;
  return '(meta)';
}

function isItempropMeta(row) {
  return Boolean(row.itemprop);
}

/** Keep Meta free of tags that have their own sections / Document. */
function isGeneralMeta(row) {
  if (isItempropMeta(row)) return false;
  const prop = row.property || '';
  const name = row.name || '';
  if (prop.startsWith('og:') || name.startsWith('twitter:')) return false;
  if (name === 'description') return false;
  return true;
}

function isCanonicalLink(row) {
  return String(row.rel || '')
    .toLowerCase()
    .split(/\s+/)
    .includes('canonical');
}

function metaContent(row) {
  return row.content ?? row.charset ?? '';
}

function linkLabel(row) {
  return row.rel || '(link)';
}

function linkValue(row) {
  const parts = [];
  if (row.href) parts.push(row.href);
  if (row.hreflang) parts.push(`hreflang=${row.hreflang}`);
  if (row.type) parts.push(`type=${row.type}`);
  if (row.sizes) parts.push(`sizes=${row.sizes}`);
  if (row.as) parts.push(`as=${row.as}`);
  return parts.join(' · ') || row.raw || '';
}

const ICONS = {
  copy: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  json: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/></svg>',
  structure: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
};

function iconButton(icon, title, className, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `btn btn-icon${className ? ` ${className}` : ''}`;
  btn.title = title;
  btn.setAttribute('aria-label', title);
  btn.innerHTML = ICONS[icon];
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(btn);
  });
  return btn;
}

function setIconButton(btn, icon, title) {
  btn.innerHTML = ICONS[icon];
  btn.title = title;
  btn.setAttribute('aria-label', title);
}

function rowEl(label, value, copyValue) {
  const row = document.createElement('div');
  row.className = 'row';
  row.dataset.filter = `${label}\n${value}`.toLowerCase();
  const lab = document.createElement('div');
  lab.className = 'row-label';
  lab.textContent = label;
  const val = document.createElement('pre');
  val.className = 'row-value';
  val.textContent = value;
  row.append(
    lab,
    val,
    iconButton('copy', 'Копировать', '', () => copyText(copyValue ?? value))
  );
  return row;
}

function applyFilter(query) {
  const q = query.trim().toLowerCase();
  const filtering = q.length > 0;

  for (const section of appEl.querySelectorAll('.section')) {
    const title =
      section.querySelector('.section-title')?.textContent.toLowerCase() || '';
    const titleMatch = filtering && title.includes(q);

    if (!filtering) {
      section.hidden = false;
      section.open = section.dataset.defaultOpen === '1';
      for (const el of section.querySelectorAll('.row, .jsonld-block, .jsonld-node')) {
        el.hidden = false;
        if (el.matches('details.jsonld-block, details.jsonld-node')) el.open = false;
      }
      const empty = section.querySelector('.empty');
      if (empty) empty.hidden = false;
      continue;
    }

    for (const row of section.querySelectorAll('.row')) {
      row.hidden = !(titleMatch || (row.dataset.filter || '').includes(q));
    }

    const nested = [...section.querySelectorAll('.jsonld-node, .jsonld-block')].reverse();
    for (const node of nested) {
      const selfMatch = titleMatch || (node.dataset.filter || '').includes(q);
      if (selfMatch) {
        node.hidden = false;
        node.open = true;
        for (const el of node.querySelectorAll('.row, .jsonld-node')) {
          el.hidden = false;
          if (el.matches('details.jsonld-node')) el.open = true;
        }
      } else {
        const hasVisible = [...node.querySelectorAll('.row')].some((r) => !r.hidden);
        node.hidden = !hasVisible;
        if (hasVisible) node.open = true;
      }
    }

    const empty = section.querySelector('.empty');
    if (empty) empty.hidden = true;

    const visibleCount = [...section.querySelectorAll('.row, .jsonld-block')].filter(
      (el) => !el.hidden
    ).length;
    const showSection = titleMatch || visibleCount > 0;
    section.hidden = !showSection;
    if (showSection) section.open = true;
  }
}

function formatJsonLdScalar(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function jsonLdPropEl(key, value) {
  if (Array.isArray(value)) {
    const allScalar = value.every((item) => !isPlainObject(item) && !Array.isArray(item));
    if (allScalar) {
      const text = value.map(formatJsonLdScalar).join(', ');
      return rowEl(key, text, text);
    }
    const wrap = document.createElement('details');
    wrap.className = 'jsonld-node';
    wrap.dataset.filter = `${key}\n${JSON.stringify(value)}`.toLowerCase();
    const summary = document.createElement('summary');
    summary.className = 'jsonld-summary';
    const title = document.createElement('span');
    title.className = 'jsonld-title';
    title.textContent = `${key} [${value.length}]`;
    summary.append(title);
    const body = document.createElement('div');
    body.className = 'jsonld-node-body';
    value.forEach((item, idx) => {
      if (isPlainObject(item)) body.append(jsonLdNodeEl(item, idx));
      else if (Array.isArray(item)) body.append(jsonLdPropEl(`${idx}`, item));
      else body.append(rowEl(String(idx), formatJsonLdScalar(item), formatJsonLdScalar(item)));
    });
    wrap.append(summary, body);
    return wrap;
  }

  if (isPlainObject(value)) {
    return jsonLdNodeEl(value, 0, key);
  }

  const text = formatJsonLdScalar(value);
  return rowEl(key, text, text);
}

/** Toggle structured ↔ JSON view inside a JSON-LD details body. */
function appendJsonLdViewToggle(summary, body, { buildStructured, jsonText }) {
  const structured = document.createElement('div');
  structured.className = 'jsonld-view jsonld-view-struct';
  buildStructured(structured);

  const pre = document.createElement('pre');
  pre.className = 'row-value jsonld-view jsonld-view-json';
  pre.hidden = true;
  pre.textContent = jsonText;

  body.append(structured, pre);

  let mode = 'struct';
  const toggle = iconButton('json', 'Показать JSON', '', (btn) => {
    mode = mode === 'struct' ? 'json' : 'struct';
    structured.hidden = mode !== 'struct';
    pre.hidden = mode !== 'json';
    if (mode === 'struct') setIconButton(btn, 'json', 'Показать JSON');
    else setIconButton(btn, 'structure', 'Показать структуру');
  });
  summary.append(toggle);
}

function jsonLdNodeEl(node, index, keyPrefix) {
  const details = document.createElement('details');
  details.className = 'jsonld-node';
  const label = keyPrefix
    ? `${keyPrefix} · ${jsonLdNodeTitle(node, index)}`
    : jsonLdNodeTitle(node, index);
  const jsonText = JSON.stringify(node, null, 2);
  details.dataset.filter = `${label}\n${jsonText}`.toLowerCase();

  const summary = document.createElement('summary');
  summary.className = 'jsonld-summary';
  const title = document.createElement('span');
  title.className = 'jsonld-title';
  title.textContent = label;
  summary.append(
    title,
    iconButton('copy', 'Копировать', '', () => copyText(jsonText))
  );

  const body = document.createElement('div');
  body.className = 'jsonld-node-body';
  appendJsonLdViewToggle(summary, body, {
    jsonText,
    buildStructured(container) {
      for (const [key, value] of Object.entries(node)) {
        container.append(jsonLdPropEl(key, value));
      }
    },
  });
  details.append(summary, body);
  return details;
}

function jsonLdBlockEl(j, i) {
  const details = document.createElement('details');
  details.className = 'jsonld-block';

  const type = j.parsed != null ? jsonLdTypeLabel(j.parsed) : '';
  const summary = document.createElement('summary');
  summary.className = 'jsonld-summary';
  const title = document.createElement('span');
  title.className = 'jsonld-title';
  if (j.parsed == null) {
    title.textContent = `#${i + 1} — ошибка разбора`;
  } else if (type) {
    title.textContent = `#${i + 1} · ${type}`;
  } else {
    title.textContent = `#${i + 1}`;
  }

  const text =
    j.parsed != null ? JSON.stringify(j.parsed, null, 2) : j.raw || '';
  details.dataset.filter = `${title.textContent}\n${text}`.toLowerCase();
  summary.append(
    title,
    iconButton('copy', 'Копировать', '', () => copyText(text))
  );

  const body = document.createElement('div');
  body.className = 'jsonld-body';

  if (j.parsed == null) {
    const pre = document.createElement('pre');
    pre.className = 'row-value is-error';
    pre.textContent = `${j.error || 'parse error'}\n${text}`;
    body.append(pre);
  } else {
    appendJsonLdViewToggle(summary, body, {
      jsonText: text,
      buildStructured(container) {
        const nodes = jsonLdEntityNodes(j.parsed);
        const isGraph =
          !Array.isArray(j.parsed) && Array.isArray(j.parsed['@graph']);
        const isArrayRoot = Array.isArray(j.parsed);

        if (isGraph) {
          for (const [key, value] of Object.entries(j.parsed)) {
            if (key === '@graph') continue;
            container.append(jsonLdPropEl(key, value));
          }
          nodes.forEach((node, ni) => container.append(jsonLdNodeEl(node, ni)));
        } else if (isArrayRoot) {
          nodes.forEach((node, ni) => container.append(jsonLdNodeEl(node, ni)));
        } else if (nodes[0]) {
          for (const [key, value] of Object.entries(nodes[0])) {
            container.append(jsonLdPropEl(key, value));
          }
        }
      },
    });
  }

  details.append(summary, body);
  return details;
}

function sectionEl(title, lines, bodyBuilder, { open = false } = {}) {
  const details = document.createElement('details');
  details.className = 'section';
  details.open = open;
  if (open) details.dataset.defaultOpen = '1';

  const summary = document.createElement('summary');
  summary.className = 'section-head';
  const label = document.createElement('span');
  label.className = 'section-title';
  label.textContent = title;
  summary.append(
    label,
    iconButton('copy', 'Копировать секцию', 'btn-section', () => {
      copyText([title, ...lines].join('\n'));
    })
  );

  const body = document.createElement('div');
  body.className = 'section-body';
  if (lines.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'не найдено';
    body.append(empty);
  } else {
    bodyBuilder(body);
  }

  details.append(summary, body);
  return details;
}

function render(data) {
  appEl.replaceChildren();

  const description =
    (data.meta || []).find((m) => m.name === 'description') || null;
  const canonical = (data.links || []).find(isCanonicalLink) || null;
  const descriptionValue = description ? metaContent(description) : '';
  const canonicalValue = canonical ? canonical.href || linkValue(canonical) : '';

  const docLines = [
    `title: ${data.title || ''}`,
    `description: ${descriptionValue}`,
    `canonical: ${canonicalValue}`,
    `url: ${data.url || ''}`,
  ];
  appEl.append(
    sectionEl(
      'Document',
      docLines,
      (body) => {
        body.append(
          rowEl('title', data.title || '', data.title || ''),
          rowEl('description', descriptionValue, descriptionValue),
          rowEl('canonical', canonicalValue, canonicalValue),
          rowEl('url', data.url || '', data.url || '')
        );
      },
      { open: true }
    )
  );

  const generalMeta = (data.meta || []).filter(isGeneralMeta);
  const metaLines = generalMeta.map((m) => `${metaLabel(m)}: ${metaContent(m)}`);
  appEl.append(
    sectionEl('Meta', metaLines, (body) => {
      for (const m of generalMeta) {
        body.append(rowEl(metaLabel(m), metaContent(m), metaContent(m)));
      }
    })
  );

  const itempropMeta = (data.meta || []).filter(isItempropMeta);
  const itempropLines = itempropMeta.map(
    (m) => `${m.itemprop}: ${metaContent(m)}`
  );
  appEl.append(
    sectionEl('Itemprop', itempropLines, (body) => {
      for (const m of itempropMeta) {
        body.append(rowEl(m.itemprop, metaContent(m), metaContent(m)));
      }
    })
  );

  const otherLinks = (data.links || []).filter((l) => !isCanonicalLink(l));
  const linkLines = otherLinks.map((l) => `${linkLabel(l)}: ${linkValue(l)}`);
  appEl.append(
    sectionEl('Links', linkLines, (body) => {
      for (const l of otherLinks) {
        body.append(rowEl(linkLabel(l), linkValue(l), l.href || linkValue(l)));
      }
    })
  );

  const ogLines = (data.openGraph || []).map((o) => `${o.property}: ${o.content}`);
  appEl.append(
    sectionEl('Open Graph', ogLines, (body) => {
      for (const o of data.openGraph) {
        body.append(rowEl(o.property, o.content, o.content));
      }
    })
  );

  const twLines = (data.twitter || []).map((t) => `${t.name}: ${t.content}`);
  appEl.append(
    sectionEl('Twitter', twLines, (body) => {
      for (const t of data.twitter) {
        body.append(rowEl(t.name, t.content, t.content));
      }
    })
  );

  const jsonLines = (data.jsonLd || []).map((j, i) => {
    if (j.parsed != null) return `#${i + 1}\n${JSON.stringify(j.parsed, null, 2)}`;
    return `#${i + 1} (ошибка: ${j.error || 'parse'})\n${j.raw || ''}`;
  });
  appEl.append(
    sectionEl('JSON-LD', jsonLines, (body) => {
      (data.jsonLd || []).forEach((j, i) => {
        body.append(jsonLdBlockEl(j, i));
      });
    })
  );

  statusEl.hidden = true;
  appEl.hidden = false;
  filterEl.hidden = false;
  applyFilter(filterEl.value);
}

filterEl.addEventListener('input', () => applyFilter(filterEl.value));

async function load() {
  try {
    const tabs = await ext.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || tab.id == null) {
      setError('Нет активной вкладки.');
      return;
    }
    if (tab.url && RESTRICTED.test(tab.url)) {
      setError('Не удалось прочитать эту страницу.');
      return;
    }

    await ext.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['helpers.js', 'extract.js'],
    });
    const [injection] = await ext.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => globalThis.__SEO_VIEWER_DATA__,
    });

    if (!injection || injection.result == null) {
      setError('Не удалось прочитать эту страницу.');
      return;
    }
    render(injection.result);
  } catch (e) {
    console.error(e);
    setError('Не удалось прочитать эту страницу.');
  }
}

load();
