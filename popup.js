const statusEl = document.getElementById('status');
const appEl = document.getElementById('app');
const toastEl = document.getElementById('toast');

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
  return '(meta)';
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

function button(label, className, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  return btn;
}

function rowEl(label, value, copyValue) {
  const row = document.createElement('div');
  row.className = 'row';
  const lab = document.createElement('div');
  lab.className = 'row-label';
  lab.textContent = label;
  const val = document.createElement('pre');
  val.className = 'row-value';
  val.textContent = value;
  row.append(lab, val, button('Копировать', 'btn', () => copyText(copyValue ?? value)));
  return row;
}

function sectionEl(title, lines, bodyBuilder) {
  const details = document.createElement('details');
  details.className = 'section';
  details.open = lines.length > 0;

  const summary = document.createElement('summary');
  summary.className = 'section-head';
  const label = document.createElement('span');
  label.className = 'section-title';
  label.textContent = title;
  summary.append(
    label,
    button('Копировать секцию', 'btn btn-section', () => {
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

  const docLines = [`title: ${data.title || ''}`, `url: ${data.url || ''}`];
  appEl.append(
    sectionEl('Document', docLines, (body) => {
      body.append(
        rowEl('title', data.title || '', data.title || ''),
        rowEl('url', data.url || '', data.url || '')
      );
    })
  );

  const metaLines = (data.meta || []).map(
    (m) => `${metaLabel(m)}: ${m.content ?? m.charset ?? ''}`
  );
  appEl.append(
    sectionEl('Meta', metaLines, (body) => {
      for (const m of data.meta) {
        body.append(rowEl(metaLabel(m), m.content ?? m.charset ?? '', m.content ?? m.charset ?? ''));
      }
    })
  );

  const linkLines = (data.links || []).map((l) => `${linkLabel(l)}: ${linkValue(l)}`);
  appEl.append(
    sectionEl('Links', linkLines, (body) => {
      for (const l of data.links) {
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
        const block = document.createElement('div');
        block.className = 'block';
        const head = document.createElement('div');
        head.className = 'block-head';
        head.textContent = j.parsed != null ? `#${i + 1}` : `#${i + 1} — ошибка разбора`;
        const text =
          j.parsed != null ? JSON.stringify(j.parsed, null, 2) : j.raw || '';
        const pre = document.createElement('pre');
        pre.className = 'row-value' + (j.parsed == null ? ' is-error' : '');
        pre.textContent =
          j.parsed != null ? text : `${j.error || 'parse error'}\n${text}`;
        block.append(
          head,
          pre,
          button('Копировать', 'btn', () => copyText(text))
        );
        body.append(block);
      });
    })
  );

  statusEl.hidden = true;
  appEl.hidden = false;
}

async function load() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab || tab.id == null) {
      setError('Нет активной вкладки.');
      return;
    }
    if (tab.url && RESTRICTED.test(tab.url)) {
      setError('Не удалось прочитать эту страницу.');
      return;
    }

    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['helpers.js', 'extract.js'],
    });
    const [injection] = await browser.scripting.executeScript({
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
