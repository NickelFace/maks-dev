---
title: "Деплой и локальная разработка"
date: 2026-04-13
description: "CI/CD пайплайн, локальная разработка, Pagefind и известные проблемы деплоя"
page_lang: "ru"
lang_pair: "/docs/deploy/"
pagefind_ignore: true
build:
  list: never
  render: always
tags: ["docs"]
---

## Локальная разработка

### Быстрый старт

```bash
# Клонировать с сабмодулями (тема — сабмодуль)
git clone --recurse-submodules https://github.com/NickelFace/maks.top.git
cd maks.top

# Переключиться на рабочую ветку
git checkout hugo
```

### Запуск dev-сервера

Три варианта в зависимости от задачи:

```bash
# Вариант 1 — полный цикл (как в CI): сборка + индексация + сервер
./dev.sh
# = hugo && npx pagefind --site public && hugo server --disableFastRender

# Вариант 2 — быстрые итерации (Pagefind не работает, поиск недоступен)
hugo server -D

# Вариант 3 — другой порт, если 1313 занят
hugo server -D --port 1314
```

> **`--disableFastRender`** заставляет Hugo полностью перестраивать страницу при каждом изменении вместо патчинга только изменённой части. Медленнее, но предотвращает устаревшее состояние в браузере.

> **`-D`** включает черновики (`draft: true` во frontmatter). Без этого флага черновики пропускаются.

### Зачем запускать Pagefind локально?

`hugo server` раздаёт контент из памяти — `public/` не пишется на диск. Но Pagefind нужны готовые HTML-файлы. Поэтому `dev.sh` сначала запускает `hugo` (записывает в `public/`), индексирует через Pagefind, затем стартует сервер с `--disableFastRender`.

Без этого шага строка поиска на `/posts/` локально не возвращает результатов.

### Проверка CSS-проблем

Браузерный кэш часто маскирует изменения CSS при локальной разработке:

```bash
# Всегда проверяйте изменения CSS через:
# — Режим инкогнито, или
# — DevTools → вкладка Network → включить "Disable cache" → перезагрузить
```

---

## CI/CD пайплайн

Деплоится автоматически при каждом пуше в ветку **`hugo`**.

```
git push origin hugo
        │
        ▼
GitHub Actions (.github/workflows/deploy.yml)
        │
        ├── 1. actions/checkout@v4
        │      submodules: recursive   ← обязательно! тема — сабмодуль
        │      fetch-depth: 0          ← полная история для .GitInfo
        │
        ├── 2. peaceiris/actions-hugo@v3
        │      hugo-version: "latest"
        │      extended: true          ← обязательно для поддержки SASS
        │
        ├── 3. hugo --minify --gc
        │      --minify  сжимает HTML/CSS/JS
        │      --gc      удаляет неиспользуемые файлы кэша
        │
        ├── 4. grep stylesheet check   ← отладочный шаг, проверяет пути CSS в public/index.html
        │
        ├── 5. pagefind --site public  ← строит поисковый индекс в public/pagefind/
        │
        ├── 6. actions/upload-pages-artifact@v3
        │
        └── 7. actions/deploy-pages@v4
                    │
                    ▼
            https://maks.top/
```

### Ветки

| Ветка | Назначение |
|---|---|
| `hugo` | Рабочая ветка — все коммиты сюда, CI запускается отсюда |
| `main` | Не используется / legacy |
| `gh-pages` | Создаётся GitHub Actions автоматически, не трогать |

> **Никогда не пушьте напрямую в `gh-pages`** — она перезаписывается при каждом деплое.

### Почему нужен `submodules: recursive`

Тема `themes/maks/` является git-сабмодулем. Без `submodules: recursive` в checkout Hugo находит пустую директорию `themes/maks/` и падает с ошибкой:

```
Error: module "maks" not found; ...
```

### Первичная настройка GitHub Pages (один раз)

1. **Settings → Pages → Source: GitHub Actions** (не "Deploy from branch")
2. Добавить кастомный домен: `maks.top`
3. GitHub автоматически выпускает TLS-сертификат Let's Encrypt и раздаёт через Fastly CDN

DNS-записи в Cloudflare:

| Тип | Имя | Значение |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | nickelface.github.io |

---

## Известные проблемы деплоя

### `actions/configure-pages@v4` — не использовать

Этот экшен часто встречается в примерах деплоя Hugo, но **здесь его использовать нельзя**.

**Почему ломает:** `configure-pages@v4` читает URL GitHub Pages и перезаписывает `baseURL` в конфиге Hugo. Для кастомного домена (`maks.top`) подставляется неверное значение, что ломает все относительные пути к CSS/JS:

```html
<!-- сломанный результат: -->
<link rel="stylesheet" href="https://nickelface.github.io/styles/global.css">

<!-- правильный результат (без configure-pages): -->
<link rel="stylesheet" href="/styles/global.css">
```

В текущем `deploy.yml` этого шага **нет**. Не добавляйте его.

### `hugo-version: "latest"` может сломаться при мажорных обновлениях

`peaceiris/actions-hugo@v3` с `hugo-version: "latest"` всегда устанавливает новейшую версию. Если Hugo выпустит breaking change, сборка может неожиданно упасть.

**Решение:** зафиксировать конкретную версию:

```yaml
- uses: peaceiris/actions-hugo@v3
  with:
    hugo-version: "0.145.0"   # последняя заведомо рабочая версия
    extended: true
```

### Ручное редактирование `public/`

`public/` полностью пересоздаётся при каждом запуске `hugo`. Любые ручные изменения перезаписываются.

**Никогда не редактируйте файлы в `public/` напрямую.**

### Сабмодуль темы не обновлён

Если `themes/maks/` отображается как пустая директория локально:

```bash
# Инициализировать и подтянуть сабмодуль
git submodule update --init --recursive
```

Если сабмодуль отстаёт:

```bash
cd themes/maks
git pull origin main
cd ../..
git add themes/maks
git commit -m "chore: update theme submodule"
```

### `markup.goldmark.renderer.unsafe = false`

Сырой HTML и теги `<script>` в Markdown-файлах молча вырезаются, если в `hugo.toml` не установлено `unsafe = true`. Это уже настроено корректно, но если конфиг когда-либо сбросится — убедитесь, что строчка осталась:

```toml
[markup.goldmark.renderer]
  unsafe = true
```

---

## Диагностика упавшей сборки

Основной источник — логи GitHub Actions. Типичные точки отказа:

```bash
# 1. Сборка Hugo упала — искать ошибки шаблонов
#    Ищите: "Error: ... template"

# 2. Pagefind упал — проверить доступность npm/node
#    Ищите: "pagefind: command not found"

# 3. Деплой упал — проверить права Pages
#    Ищите: "HttpError: Not Found" или ошибки прав доступа
#    Решение: Settings → Pages → Source должен быть "GitHub Actions"
```

Отладочный шаг в `deploy.yml` выводит теги CSS-ссылок из `public/index.html` — полезно для подтверждения корректности путей CSS после сборки:

```yaml
- name: Check generated HTML
  run: grep -r "stylesheet" public/index.html | head -20
```

---

## Связанные страницы

- [Обзор проекта](/docs/ru/overview/)
- [Шаблоны](/docs/ru/templates/)
- [Создание новых страниц](/docs/ru/new-page/)
