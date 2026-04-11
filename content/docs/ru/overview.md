---
title: "Обзор проекта — Архитектура и Pipeline"
date: 2026-04-11
description: "Hugo pipeline, структура директорий и процесс деплоя maks.top"
page_lang: "ru"
lang_pair: "/docs/overview/"
pagefind_ignore: true
_build:
  list: never
  render: always
tags: ["docs"]
---

## Что такое этот проект?

`maks.top` — статический сайт на Hugo с кастомной темой `maks`. Никаких сторонних тем или фреймворков — всё написано с нуля.

---

## Hugo pipeline: как сайт собирается

```
content/ (markdown)  ──┐
layouts/ (templates) ──┼──► Hugo build ──► public/ ──► GitHub Pages
static/  (assets)    ──┘
```

1. Hugo читает `hugo.toml` — конфигурация сайта
2. Для каждого `.md` файла из `content/` ищет подходящий шаблон из `layouts/`
3. Шаблон вставляет данные из frontmatter + `.Content` (тело markdown)
4. Статические файлы из `static/` и `themes/maks/static/` копируются as-is
5. Результат — папка `public/` с чистым HTML/CSS/JS

---

## Поиск шаблона — приоритет

Hugo ищет шаблон в таком порядке (первый найденный побеждает):

| Страница | Поиск шаблонов (по порядку) |
|---|---|
| `/posts/lpic2-200-1/` | `layouts/posts/single.html` → `layouts/_default/single.html` |
| `/posts/linux-namespaces/` | `layouts/posts/linux-namespaces.html` → `layouts/posts/single.html` → `layouts/_default/single.html` |
| `/certs/lpic-2/` | `layouts/certs/single.html` → `layouts/_default/single.html` |
| `/about/` | `layouts/about/single.html` → `layouts/_default/single.html` |
| `/` | `layouts/index.html` |
| `/posts/` | `layouts/posts/list.html` → `layouts/_default/list.html` |
| `/tags/` | `layouts/taxonomy/tag.html` |

Ключевое правило: **более специфичный путь всегда переопределяет дефолтный**.

---

## Структура директорий

```
maks.top/
│
├── hugo.toml                        # Конфигурация сайта
│
├── content/                         # Контент (markdown)
│   ├── about.md                     # Страница /about/
│   ├── posts/                       # Раздел /posts/ (блог)
│   │   ├── lpic2-200-1-*.md         # Статьи LPIC-2
│   │   └── linux-namespaces.md      # Интерактивная страница
│   ├── certs/                       # Раздел /certs/
│   │   ├── lpic-2.md                # Страница-оглавление LPIC-2
│   │   ├── lpic-1.md
│   │   ├── aws-saa.md
│   │   └── ccna.md
│   └── docs/                        # Раздел /docs/ (эта документация)
│
├── static/                          # Глобальные статические файлы
│   └── CNAME                        # Кастомный домен для GitHub Pages
│
└── themes/maks/                     # Кастомная тема
    ├── theme.toml                   # Мета-информация темы
    │
    ├── layouts/                     # Шаблоны Hugo (Go templates)
    │   ├── index.html               # Главная страница /
    │   ├── _default/
    │   │   ├── baseof.html          # Базовый layout (обёртка для всех страниц)
    │   │   ├── single.html          # Статья с ToC и progress bar
    │   │   └── list.html            # Листинг страниц с пагинацией
    │   ├── posts/
    │   │   ├── list.html            # Листинг постов + Pagefind поиск
    │   │   └── linux-namespaces.html # Интерактивный explorer namespace'ов
    │   ├── about/
    │   │   └── single.html          # Страница about с certs-widget
    │   ├── certs/
    │   │   └── single.html          # Accordion-страница сертификата
    │   ├── taxonomy/
    │   │   └── tag.html             # Теги с интерактивной фильтрацией
    │   ├── partials/                # Переиспользуемые фрагменты
    │   │   ├── certs-widget.html    # Виджет сертификаций (карточки)
    │   │   ├── pagination.html      # Пагинация с ellipsis
    │   │   └── search.html          # (не используется напрямую)
    │   └── shortcodes/              # Shortcode-компоненты для markdown
    │       ├── ns-card.html         # Карточка Linux namespace
    │       └── code.html            # Code block с кнопкой copy
    │
    └── static/                      # Статические файлы темы
        ├── js/
        │   ├── site.js              # Глобальные функции (тема, меню)
        │   └── ns.js                # Логика namespace explorer
        └── styles/
            ├── global.css           # Переменные, nav, общие компоненты
            ├── home.css             # Стили главной страницы
            ├── prose.css            # Типографика статей
            ├── cert.css             # Страницы сертификаций
            ├── ns.css               # Namespace explorer
            └── mobile.css           # Мобильная навигация и breakpoints
```

---

## Build pipeline: от пуша до живого сайта

```
git push origin hugo
        │
        ▼
GitHub Actions (.github/workflows/deploy.yml)
        │
        ├── actions/checkout@v4          # Клонирует репо с submodules
        ├── peaceiris/actions-hugo@v3    # Устанавливает Hugo (latest, extended)
        ├── hugo --minify --gc           # Собирает сайт в public/
        │   ├── --minify: сжимает HTML/CSS/JS
        │   └── --gc: удаляет неиспользуемые файлы кэша
        ├── pagefind --site public        # Индексирует контент для поиска
        ├── actions/upload-pages-artifact # Загружает public/ как артефакт
        └── actions/deploy-pages@v4       # Деплоит на GitHub Pages
                │
                ▼
        https://maks.top/
        (Fastly CDN + Let's Encrypt TLS + gzip)
```

---

## hugo.toml — ключевые параметры

```toml
baseURL = "https://maks.top/"   # Используется для абсолютных ссылок
languageCode = "en"
title = "maks.top"
theme = "maks"                  # Ссылается на themes/maks/
paginate = 10                   # Постов на страницу в листингах

[params]                        # Доступны в шаблонах как .Site.Params.*
  author      = "Maks"
  description = "..."
  location    = "Sydney, AU"
  github      = "https://github.com/NickelFace"
  linkedin    = "..."
  telegram    = "..."

[taxonomies]
  tag      = "tags"             # Теги: /tags/{tag-name}/
  category = "categories"      # Категории: /categories/{name}/

[outputs]
  home    = ["HTML"]            # Только HTML (без RSS, JSON)
  section = ["HTML"]
  page    = ["HTML"]

[markup.goldmark.renderer]
  unsafe = true                 # Разрешает сырой HTML внутри markdown
```

---

## Как Hugo передаёт данные в шаблон

В каждом шаблоне доступен объект `.` (dot) — контекст текущей страницы:

| Переменная | Тип | Описание |
|---|---|---|
| `.Title` | string | Из frontmatter `title:` |
| `.Date` | time.Time | Из frontmatter `date:` |
| `.Content` | template.HTML | Тело markdown, преобразованное в HTML |
| `.Description` | string | Из frontmatter `description:` |
| `.Params` | map | Все кастомные поля frontmatter |
| `.Params.tags` | []string | Из frontmatter `tags:` |
| `.Permalink` | string | Полный URL страницы |
| `.RelPermalink` | string | Относительный URL |
| `.Section` | string | Раздел: "posts", "certs", "docs" |
| `.IsHome` | bool | true только для главной страницы |
| `.Site` | Site | Глобальный объект сайта |
| `.Site.Params` | map | Параметры из `[params]` в hugo.toml |
| `.Site.RegularPages` | []Page | Все страницы сайта |
| `.Site.Taxonomies.tags` | Taxonomy | Все теги с количеством постов |
| `.Paginator` | Paginator | Объект пагинации (в list-шаблонах) |

---

## Связанные страницы

- [Шаблоны](/docs/ru/templates/)
- [CSS](/docs/ru/css/)
- [Frontmatter](/docs/ru/frontmatter/)
- [JavaScript](/docs/ru/javascript/)
