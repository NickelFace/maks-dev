---
title: "CSS — Архитектура и Справочник Классов"
date: 2026-04-11
description: "Структура CSS файлов, переменные темы и полный справочник классов maks.top"
page_lang: "ru"
lang_pair: "/docs/css/"
pagefind_ignore: true
tags: ["docs"]
---

## Архитектура CSS

Стили разбиты на 6 файлов по принципу **scope** (область применения):

| Файл | Размер | Загружается | Назначение |
|---|---|---|---|
| `global.css` | 757 строк | везде | Переменные, nav, базовые компоненты |
| `mobile.css` | 440 строк | везде | Мобильная навигация, breakpoints |
| `home.css` | 110 строк | только `/` | Hero, recent posts, KB, cert-grid |
| `prose.css` | 164 строки | posts, about | Типографика статей, ns-card в markdown |
| `cert.css` | 189 строк | `/certs/*` | Accordion, cert-hero, exam-blocks |
| `ns.css` | 258 строк | `/posts/linux-namespaces/` | Namespace explorer |

Загрузка в `baseof.html`:
```html
<link rel="stylesheet" href="/styles/global.css">   <!-- всегда -->
{{ if .IsHome }}<link href="/styles/home.css">{{ end }}
{{ if or (eq .Type "posts") (eq .Type "about") }}<link href="/styles/prose.css">{{ end }}
<link rel="stylesheet" href="/styles/mobile.css">   <!-- всегда -->
{{ block "head" . }}{{ end }}  <!-- дочерний шаблон может добавить cert.css или ns.css -->
```

---

## CSS переменные — темы

Переменные объявлены на `[data-theme="dark"]` и `[data-theme="light"]`:

| Переменная | Dark | Light | Назначение |
|---|---|---|---|
| `--accent` | `#00d4ff` | `#00d4ff` | Основной акцент (циан) |
| `--accent2` | `#7c3aed` | `#7c3aed` | Вторичный акцент (фиолетовый) |
| `--accent3` | `#10b981` | `#10b981` | Третий акцент (зелёный) |
| `--warn` | `#f59e0b` | `#f59e0b` | Предупреждение (amber) |
| `--bg` | `#0a0e17` | `#f5f7fa` | Основной фон |
| `--bg2` | `#111827` | `#ffffff` | Карточки, панели |
| `--bg3` | `#1a2235` | `#eef2f8` | Hover-состояния |
| `--border` | `#1e2d45` | `#d1dbe8` | Рамки |
| `--border2` | `#263347` | `#c2cfe0` | Рамки (тёмнее) |
| `--text` | `#e2e8f0` | `#1a2235` | Основной текст |
| `--text2` | `#94a3b8` | `#475569` | Вторичный текст |
| `--text3` | `#64748b` | `#94a3b8` | Muted текст (дата, мета) |
| `--glow` | `rgba(0,212,255,0.08)` | `rgba(0,150,180,0.08)` | Hover-подсветка с акцентом |
| `--shadow` | `0 4px 24px rgba(0,0,0,0.4)` | `0 4px 24px rgba(0,0,0,0.08)` | Тень элементов |
| `--nav-blur` | `rgba(10,14,23,0.85)` | `rgba(245,247,250,0.85)` | Фон nav с прозрачностью |
| `--tag-bg` | `rgba(0,212,255,0.08)` | `rgba(0,150,180,0.08)` | Фон тегов |

**Как переключение темы работает технически:**
1. JS ставит `document.documentElement.setAttribute('data-theme', 'light')`
2. CSS `[data-theme="light"]` переопределяет все переменные
3. Все компоненты используют `var(--bg)` и т.д. — автоматически перекрашиваются

---

## global.css — справочник классов

### Сброс и базовые стили

| Класс / Селектор | Описание |
|---|---|
| `*, *::before, *::after` | `box-sizing: border-box`, сброс margin/padding |
| `body` | `background: var(--bg)`, `color: var(--text)`, JetBrains Mono font |
| `a` | `color: inherit`, `text-decoration: none` |

### Навигация (desktop)

| Класс | Описание |
|---|---|
| `.desk-nav` | Flex-контейнер: логотип + ссылки + правая панель. `position: sticky; top: 0; z-index: 100` |
| `.nav-logo` | Логотип с gradient-текстом (`--accent` → `--accent2`) |
| `.nav-links` | Список nav-ссылок |
| `.nav-links a.active` | Активная ссылка: `color: var(--accent)` |
| `.nav-right` | Lang-toggle + theme button |
| `.lang-btn` | Кнопки EN/RU. `localStorage.lang` хранит выбор |
| `.lang-btn.active` | Активный язык: border-color accent |
| `.theme-btn` | 🌙/☀️ кнопка переключения темы |

### Хлебные крошки

| Класс | Описание |
|---|---|
| `.breadcrumb` | Flex-строка с разделителями `/`. Рендерится в `single.html` и `certs/single.html` |

### Панели

| Класс | Описание |
|---|---|
| `.panel` | Карточка: `background: var(--bg2)`, `border`, `border-radius: 10px`, `padding: 20px` |
| `.panel-head` | Flex заголовок панели: `.panel-title` + `.panel-more` |
| `.panel-title` | Заголовок панели (uppercase, small font) |
| `.panel-more` | Ссылка "all →" справа в заголовке |
| `.sec-title` | H2-заголовок секции (Unbounded font, gradient) |

### Статьи (post-card)

| Класс | Описание |
|---|---|
| `.posts-list` | Flex-колонка с gap |
| `.post-card` | Карточка статьи: `background: var(--bg2)`, hover поднимается на 2px |
| `.post-card-meta` | Строка: дата + теги |
| `.post-card-title` | Заголовок статьи в карточке |
| `.post-card-desc` | Краткое описание (`color: var(--text3)`) |
| `.post-date` | Дата в формате YYYY-MM-DD |

### Теги

| Класс | Описание |
|---|---|
| `.tag` | `display: inline-flex`, `background: var(--tag-bg)`, `border`, `border-radius: 4px` |
| `.tag:hover` | `border-color: var(--accent)`, `color: var(--accent)` |
| `.tag.active` | То же что hover — для активного фильтра на `/tags/` |
| `button.tag` | Сброс стилей кнопки при использовании `<button>` с классом `.tag` |
| `.tag-lg` | Увеличенный тег (на странице `/tags/`): `font-size: 12px`, `padding: 6px 14px` |
| `.tag .count` | Счётчик в теге: `color: var(--text3)` |
| `.tags-header` | Заголовок страницы тегов: sec-title + search-wrap |
| `.tags-grid` | `display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 48px` |
| `.tag-filter` | Тег-кнопка на странице `/tags/` |

### Пагинация

| Класс | Описание |
|---|---|
| `.pagination` | Flex-контейнер кнопок пагинации |
| `.pg-btn` | Кнопка/ссылка страницы |
| `.pg-btn.pg-active` | Текущая страница: `background: var(--accent)`, белый текст |
| `.pg-btn.pg-disabled` | Неактивная стрелка |
| `.pg-arrow` | Кнопка со стрелкой (prev/next) |
| `.pg-ellipsis` | `···` между страницами |
| `.pg-info` | Счётчик `N / Total` |

### Поиск

| Класс | Описание |
|---|---|
| `.search-wrap` | `position: relative` — контейнер для absolute-позиционированных результатов |
| `.search-input` | Input поиска: `background: var(--bg2)`, `border`, font Mono |
| `.search-icon` | Иконка ⌕ — абсолютно позиционирована справа в input |
| `#searchResults` | Создаётся JS динамически. Absolute, `z-index: 50`, max-height 400px |

### Code blocks

| Класс | Описание |
|---|---|
| `.code-block` | Обёртка: border + border-radius |
| `.code-label` | Шапка блока: язык + label + кнопка copy |
| `.copy-btn` | Кнопка "copy" → "ok!" через 1.5s |
| `.copy-btn.copied` | Состояние после копирования: `color: var(--accent3)` |

### Сертификаты (cert-grid)

| Класс | Описание |
|---|---|
| `.cert-grid` | Grid 4 колонки (с breakpoints) |
| `.cert-card` | Карточка сертификата: `--cert-color` кастомная переменная для цвета |
| `.cert-top` | Flex: badge + name |
| `.cert-badge` | Emoji-иконка |
| `.cert-name` | Название (Unbounded font, `color: var(--cert-color)`) |
| `.cert-sub` | Подзаголовок (мелкий серый) |
| `.progress-bar` | Серая полоска прогресса |
| `.progress-fill` | Заполнение (ширина в % задаётся inline style) |
| `.progress-label` | Flex: текст статуса + процент |
| `.pct` | Процент справа |

---

## mobile.css — справочник классов

### Мобильная навигация

| Класс | Описание |
|---|---|
| `.mob-nav` | `display: none` на десктопе, flex на мобильном. Sticky, blur-background |
| `.mob-nav-right` | Flex: theme-btn + burger |
| `.burger` | Кнопка гамбургер-меню (3 линии) |
| `.burger span` | Линии бургера, анимируются при открытии |
| `.burger.open span:nth-child(1)` | Верхняя линия: `rotate(45deg)` |
| `.burger.open span:nth-child(3)` | Нижняя линия: `rotate(-45deg)` |
| `.mob-drawer` | Выдвижное меню: `position: fixed`, трансформируется slidein |
| `.mob-drawer.open` | Видимое состояние |
| `.mob-overlay` | Полупрозрачный overlay за drawer |
| `.mob-bottom-nav` | Нижняя панель навигации (Home, Blog, Certs, KB) |
| `.mob-bnav-item` | Элемент нижней панели: icon + label |
| `.mob-bnav-item.active` | Активный пункт: `color: var(--accent)` |

### Responsive breakpoints

| Breakpoint | Что меняется |
|---|---|
| `max-width: 860px` | `.desk-nav` скрыт, `.mob-nav` + `.mob-bottom-nav` видны; `.has-toc` не применяется |
| `max-width: 560px` | Уменьшаются padding, font-size; `.cert-grid` → 2 колонки |

---

## prose.css — типографика статей

Применяется к `.prose` (тело статьи). Стилизует стандартные HTML-элементы markdown:

| Селектор | Описание |
|---|---|
| `.prose h2, .prose h3` | Заголовки с `border-bottom: 1px solid var(--border)` |
| `.prose code` | Инлайн код: `background: var(--bg3)`, моноширинный |
| `.prose pre` | Блок кода: `overflow-x: auto`, padding |
| `.prose blockquote` | Цитата: `border-left: 3px solid var(--accent)`, отступ |
| `.prose table` | Таблица: `border-collapse: collapse`, полная ширина |
| `.prose th` | Заголовок таблицы: `background: var(--bg3)` |
| `.prose td, .prose th` | Ячейки: `border: 1px solid var(--border)`, padding |
| `.prose a` | Ссылки: `color: var(--accent)` с underline |
| `.prose strong` | Жирный: `color: var(--text)` |
| `.prose ul, .prose ol` | Списки с отступами |

### ToC sidebar (в single.html)

| Класс | Описание |
|---|---|
| `.prose-page` | Контейнер страницы, переключается в grid при `.has-toc` |
| `.prose-page.has-toc` | `display: grid; grid-template-columns: 1fr 240px` |
| `.toc-aside` | Правая колонка ToC, sticky |
| `.toc-inner` | Карточка ToC |
| `.toc-title` | Заголовок "Contents" |
| `.toc-item` | Ссылка на заголовок |
| `.toc-item.toc-h3` | H3 — сдвинут влево на 12px |
| `.toc-item.cur` | Активный заголовок: `color: var(--accent)` |

---

## cert.css — страницы сертификаций

| Класс | Описание |
|---|---|
| `.cert-hero` | Hero-блок с badge, именем, описанием. `--cert-color` определяет цвет рамки |
| `.cert-stats` | Строка статистики (exams · topics · articles) |
| `.exam-block` | Группа тем одного экзамена |
| `.exam-label` | Заголовок экзамена (uppercase, `color: var(--text3)`) |
| `.cert-topic` | Один accordion-элемент |
| `.cert-topic.has-posts` | Топик с постами (остальные — без кликабельности) |
| `.cert-topic.open` | Раскрытое состояние: border-color → accent |
| `.cert-topic-head` | Кнопка-заголовок accordion |
| `.topic-num` | Номер темы (например "200"): `color: var(--accent)` |
| `.topic-title` | Название темы: `color: var(--text)` |
| `.topic-meta` | Счётчик статей или "no articles yet" |
| `.topic-chevron` | `›`, поворачивается на 90° при `.open` |
| `.cert-topic-body` | Тело accordion: `max-height: 0` → `scrollHeight` через JS |
| `.cert-post-link` | Ссылка на статью внутри темы |
| `.cert-post-title` | Заголовок статьи: `color: var(--accent)` |
| `.cert-post-desc` | Описание статьи: `color: var(--text2)` |
| `.cert-coming-soon` | Заглушка для страниц без контента |

---

## Связанные страницы

- [Обзор проекта](/docs/ru/overview/)
- [Шаблоны](/docs/ru/templates/)
- [Frontmatter](/docs/ru/frontmatter/)
- [JavaScript](/docs/ru/javascript/)
