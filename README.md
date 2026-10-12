# SEO Viewer

Расширение для Firefox, Chrome и Яндекс.Браузера: во всплывающем окне показывает SEO-разметку страницы — meta, link, Open Graph, Twitter, itemprop и JSON-LD. Есть фильтр, копирование и переключение JSON-LD между структурой и JSON.

## Сборка пакетов

```bash
python3 scripts/build.py
```

Появятся файлы в `dist/`:

| Файл | Для кого |
|------|----------|
| `seo-viewer-*-firefox.xpi` | Firefox |
| `seo-viewer-*-chromium.zip` | Chrome, Яндекс.Браузер, другие Chromium |
| `dist/firefox/`, `dist/chromium/` | Распакованные копии (удобно для «Load unpacked») |

## Установка

### Chrome / Яндекс.Браузер (постоянно в профиле)

1. Распакуй `seo-viewer-*-chromium.zip` **или** используй папку `dist/chromium`
2. Открой `chrome://extensions` (в Яндексе: `browser://extensions`)
3. Включи **Режим разработчика**
4. **Загрузить распакованное расширение** → укажи папку с `manifest.json`

Расширение останется после перезапуска браузера (пока не удалишь). Обновление кода: кнопка «Обновить» на карточке расширения.

### Firefox

**Вариант A — из папки (удобно для разработки):**

1. `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…** → `dist/firefox/manifest.json`  
   Снимается после перезапуска Firefox.

**Вариант B — файл `.xpi`:**

1. `about:addons` → шестерёнка → **Install Add-on From File…** → выбери `.xpi`  
   На обычном Firefox Release неподписанный `.xpi` может быть отклонён. Тогда используй вариант A, либо Firefox Developer Edition / Nightly, либо подпись через [AMO / web-ext sign](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

## Как пользоваться

1. Открой обычную страницу (`https://…`)
2. Нажми иконку **SEO Viewer**
3. Фильтр сверху; иконки — копирование и JSON/структура для JSON-LD

Служебные страницы (`about:…`, `chrome://…`) не читаются.

## Демо-страница

```bash
cd fixtures && python3 -m http.server 8765
```

Открой http://127.0.0.1:8765/sample.html

## Самопроверка

```bash
node tests/extract-selfcheck.mjs
```

Ожидается: `ok`
