# SEO Viewer

Расширение для Firefox, Chrome и Яндекс.Браузера: во всплывающем окне показывает SEO-разметку страницы — meta, link, Open Graph, Twitter, itemprop и JSON-LD. Есть фильтр, копирование и переключение JSON-LD между структурой и JSON.

Актуальный релиз всегда в ветке **`release`**. В этой ветке коммиты только релизы (`Release x.y.z`).

## Firefox: автообновление

В `manifest.json` для Gecko заданы:

- `id`: `seo-viewer@klaus220`
- `update_url`: `https://raw.githubusercontent.com/Klaus220/seo-extension/release/updates.json`

Каталог обновлений: [`updates.json`](./updates.json) → XPI в [`artifacts/`](./artifacts/).

> Автообновление в обычном Firefox Release работает только для **подписанного** Mozilla XPI. Неподписанный пакет ставится временно / в Developer Edition; для продакшена нужна [подпись AMO](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

## Сборка пакетов

```bash
python3 scripts/build.py
```

| Файл | Назначение |
|------|------------|
| `dist/seo-viewer-*-firefox.xpi` | Firefox (сборка) |
| `artifacts/seo-viewer-*-firefox.xpi` | Firefox (публикуется в git на `release` для `update_link`) |
| `dist/seo-viewer-*-chromium.zip` | Chrome / Яндекс.Браузер |
| `updates.json` | манифест обновлений Firefox (перезаписывается сборкой) |

## Установка

### Chrome / Яндекс.Браузер

1. Распакуй `seo-viewer-*-chromium.zip` или возьми `dist/chromium`
2. `chrome://extensions` / `browser://extensions` → режим разработчика
3. **Загрузить распакованное расширение**

### Firefox

Скачай XPI с ветки `release`:  
`artifacts/seo-viewer-*-firefox.xpi`

- Release: лучше подписанный XPI (AMO) или Developer Edition / temporary load
- Разработка: `about:debugging` → Load Temporary Add-on → `manifest.json`

## Релиз (ветка `release`)

1. Поднять `version` в `manifest.json`
2. `python3 scripts/build.py`
3. Один коммит: `Release x.y.z`
4. `git push origin release`

## Как пользоваться

1. Открой обычную страницу (`https://…`)
2. Иконка **SEO Viewer**
3. Фильтр; иконки — копирование и JSON / структура

## Демо / самопроверка

```bash
cd fixtures && python3 -m http.server 8765
# http://127.0.0.1:8765/sample.html

node tests/extract-selfcheck.mjs
```
