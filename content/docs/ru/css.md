---
title: "CSS — Архитектура и Справочник Классов"
date: 2026-04-15
description: "Структура CSS файлов, переменные темы и полный справочник классов maks.top"
page_lang: "ru"
lang_pair: "/docs/css/"
pagefind_ignore: true
build:
  list: never
  render: always
tags: ["docs"]
---

## Архитектура CSS

Стили разбиты на 8 файлов по принципу **scope** (область применения):

| Файл | Загружается | Назначение |
|---|---|---|
| `global.css` | везде | Переменные, nav, базовые компоненты, dot-grid пагинация |
| `mobile.css` | везде | Мобильная навигация, breakpoints |
| `fonts.css` | везде | `@font-face` для Inter (body), JetBrains Mono (код), Unbounded (заголовки) |
| `prose.css` | posts, about, kb, docs | Типографика, NS-карточки/tabs/ref-panel, section divider |
| `home.css` | только `/` | Hero, recent posts, KB grid, cert-grid |
| `cert.css` | `/certs/*` | Cert hero, плитки ресурсов, аккордеон тем |
| `quiz.css` | `/ccna-quiz/*` | Карточки квиза, состояния вариантов, значки баллов |
| `ns.css` | `/posts/linux-namespaces/` | Двухколоночный layout, TOC sidebar, прогресс, фильтры |
| `chroma.css` | везде | Подсветка синтаксиса (Dracula тёмная / GitHub светлая) |

Загрузка в `baseof.html`:
```html
<link rel="stylesheet" href="/styles/fonts.css">    <!-- всегда -->
<link rel="stylesheet" href="/styles/global.css">   <!-- всегда -->
<link rel="stylesheet" href="/styles/chroma.css">   <!-- всегда -->
{{ if .IsHome }}<link href="/styles/home.css">{{ end }}
{{ if or (eq .Type "posts") (eq .Type "about") (eq .Type "docs") (eq .Type "kb") }}
  <link href="/styles/prose.css">{{ end }}
<link rel="stylesheet" href="/styles/mobile.css">   <!-- всегда -->
{{ block "head" . }}{{ end }}  <!-- cert.css / quiz.css / ns.css добавляются здесь -->
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
| `--danger` | `#ef4444` | `#ef4444` | Ошибка / опасность (красный) |
| `--bg` | `#13151f` | `#f5f7fa` | Основной фон |
| `--bg2` | `#1c1f2e` | `#ffffff` | Карточки, панели |
| `--bg3` | `#252840` | `#eef2f8` | Hover-состояния |
| `--border` | `#2d3356` | `#d1dbe8` | Границы |
| `--border2` | `#353a60` | `#c2cfe0` | Вторичные границы |
| `--text` | `#e2e8f0` | `#1a2235` | Основной текст |
| `--text2` | `#94a3b8` | `#475569` | Вторичный текст |
| `--text3` | `#64748b` | `#94a3b8` | Приглушённый текст |
| `--glow` | `rgba(0,212,255,0.08)` | `rgba(0,150,180,0.06)` | Hover-подсветка |
| `--tag-bg` | `rgba(0,212,255,0.08)` | `rgba(0,150,180,0.08)` | Фон тегов |
| `--tag-color` | `#67e8f9` | `#0369a1` | Цвет текста тегов |
| `--grid-line` | `rgba(0,212,255,0.03)` | `rgba(0,150,180,0.04)` | Линии dot-grid фона |
| `--shadow` | `0 4px 24px rgba(0,0,0,0.5)` | `0 4px 24px rgba(0,0,0,0.10)` | Box shadow |
| `--nav-blur` | `rgba(19,21,31,0.85)` | `rgba(245,247,250,0.90)` | Фон навигации (backdrop blur) |
| `--code-bg` | `#0d1520` | `#f6f8fa` | Фон блоков кода |

**Переменные компонентов** (задаются через inline `style=""`):
| Переменная | Используется | Описание |
|---|---|---|
| `--c` | NS-карточки, map-кнопки, tabs, фильтры | Акцентный цвет карточки |
| `--cert-color` | Cert hero, плитки ресурсов | Акцентный цвет сертификата |

---

## global.css — справочник классов

### Reset и базовые стили

| Класс / Селектор | Описание |
|---|---|
| `*, *::before, *::after` | `box-sizing: border-box`, сброс margin/padding |
| `body` | `background: var(--bg)`, `font-family: 'Inter', system-ui, sans-serif` |
| `a` | `color: inherit`, без подчёркивания |

### Навигация (десктоп)

| Класс | Описание |
|---|---|
| `.desk-nav` | Flex-контейнер: логотип + ссылки + правая панель. Sticky, `z-index: 100` |
| `.nav-logo` | Логотип с gradient-текстом |
| `.nav-links a.active` | Активная ссылка: `color: var(--accent)` |
| `.lang-btn` | Кнопки EN/RU |
| `.theme-btn` | Кнопка смены темы 🌙/☀️ |

### Хлебные крошки

| Класс | Описание |
|---|---|
| `.breadcrumb` | Flex-строка с разделителями `/`. Рендерится через `partial "breadcrumb.html"` |
| `.breadcrumb a` | `color: var(--text3)`, hover → accent |

### Панели

| Класс | Описание |
|---|---|
| `.panel` | Карточка: `background: var(--bg2)`, border, `border-radius: 10px` |
| `.panel-head` | Flex-заголовок панели |
| `.sec-title` | Заголовок секции H2 (шрифт Unbounded, gradient) |

### Карточки статей

| Класс | Описание |
|---|---|
| `.posts-list` | Flex-колонка |
| `.post-card` | Карточка статьи: поднимается на 2px при hover |
| `.post-card-meta` | Строка: дата + теги |
| `.post-card-title` | Заголовок в карточке |
| `.post-card-desc` | Краткое описание |

### Теги

| Класс | Описание |
|---|---|
| `.tag` | `display: inline-flex`, `background: var(--tag-bg)`, `border-radius: 4px` |
| `.tag:hover` | `border-color: var(--accent)`, `color: var(--accent)` |
| `.tag.active` | Активный фильтр на `/tags/` |
| `.tag-lg` | Увеличенный тег на странице `/tags/` |

### Пагинация (dot-grid)

Используется как в блоге (`pagination.html`), так и в квизе (`ccna-quiz/single.html`).

| Класс | Описание |
|---|---|
| `.pg-dot-nav` | Flex-контейнер: кнопка Prev + сетка + кнопка Next |
| `.pg-dot-grid` | Flex-строка с переносом для номеров страниц |
| `.pg-dot` | Отдельная плитка номера страницы |
| `.pg-dot.pg-active` | Текущая страница: `background: var(--accent)` |
| `.pg-btn` | Кнопки Prev / Next |
| `.pg-btn.pg-disabled` | Неактивная стрелка (первая/последняя страница) |

### Поиск

| Класс | Описание |
|---|---|
| `.search-wrap` | Контейнер для результатов |
| `.search-input` | Поле ввода: `background: var(--bg2)` |
| `#searchResults` | Создаётся динамически через JS |

### Сетка сертификаций (главная / About)

| Класс | Описание |
|---|---|
| `.cert-grid` | Сетка из 4 колонок |
| `.cert-card` | Карточка с кастомной переменной `--cert-color` |
| `.cert-badge` | Emoji-иконка |
| `.cert-name` | Название (шрифт Unbounded, `color: var(--cert-color)`) |

---

## mobile.css — справочник классов

| Класс | Описание |
|---|---|
| `.mob-nav` | Мобильная верхняя навигация (скрыта на десктопе) |
| `.burger` | Кнопка-гамбургер (3 линии → X при открытии) |
| `.mob-drawer` | Выдвижное меню |
| `.mob-bottom-nav` | Нижняя навигационная панель |
| `.mob-bnav-item.active` | `color: var(--accent)` |

| Breakpoint | Что изменяется |
|---|---|
| `max-width: 860px` | Десктопная навигация скрыта, мобильная + нижняя панель видны |
| `max-width: 560px` | Уменьшены отступы; `.cert-grid` → 2 колонки |
| `max-width: 480px` | `.pg-dot` уменьшены до 22px для 49 плиток квиза |

---

## prose.css — типографика статей + общие компоненты

Применяется к `.prose` (тело статьи) и доступна в любом посте, KB или docs.

### Тело статьи

| Селектор | Описание |
|---|---|
| `.prose h2, .prose h3` | Заголовки с `border-bottom` |
| `.prose code` | Inline-код: `background: var(--bg3)` |
| `.prose blockquote` | Цитата: `border-left: 3px solid var(--accent)` |
| `.prose table` | Таблица на всю ширину |
| `.prose a` | `color: var(--accent)` с подчёркиванием |

### Общие компоненты

| Класс | Описание |
|---|---|
| `.intro-card` | Выделенный вводный блок: `border-left: 3px solid var(--accent)` |
| `.sec` | Разделитель секции: uppercase-метка + горизонтальная линия |
| `.code-block` | Обёртка кода: строка с меткой + содержимое Chroma |
| `.code-label` | Строка: язык + кнопка копирования |
| `.copy-btn` | "copy" → "ok!" (сбрасывается через 1.5с) |
| `.ns-grid` | Сетка NS-карточек |
| `.ns-card` | Раскрывающаяся карточка с переменной `--c`. Анимация через `@keyframes fadeUp` |
| `.ns-card.active` | Раскрытая: `border-color: var(--c)` |
| `.ns-header` | Заголовок карточки: иконка + название + флаг + chevron |
| `.ns-body` | Скрытое тело, показывается при `.active` |
| `.ns-map` | Виджет карты namespace |
| `.ns-map-btn` | Плитка карты: flex-column, иконка + название + флаг |
| `.tabs` | Строка кнопок вкладок |
| `.tab-btn` | Кнопка вкладки. Активная/hover использует `--c` |
| `.tab-content.active` | Видимая панель вкладки |
| `.ref-panel` | Обёртка справочной таблицы |
| `.ref-panel-head` | Заголовок панели (uppercase) |
| `.ref-panel-body` | Область таблицы с горизонтальной прокруткой |
| `.cheat-table` | Таблица данных внутри `.ref-panel` |
| `.cheat-table .mono` | `color: var(--accent)` |
| `.stag` | Inline-значок типа namespace |
| `.stag-uts/.stag-pid/.stag-net/…` | Цветовые варианты по типу |
| `.back-link` | Ссылка "← Back to posts" внизу страницы |

### TOC sidebar (в `_default/single.html`)

| Класс | Описание |
|---|---|
| `.prose-page.has-toc` | `display: grid; grid-template-columns: 1fr 240px` |
| `.toc-aside` | Правая колонка TOC, sticky |
| `.toc-item` | Ссылка на заголовок |
| `.toc-item.cur` | Активный заголовок: `color: var(--accent)` |

---

## cert.css — страницы сертификаций

| Класс | Описание |
|---|---|
| `.cert-hero` | Hero-блок. `--cert-color` задаёт цвет границы и текста |
| `.cert-hero-badge` | Emoji-иконка |
| `.cert-hero-name` | Название сертификата (шрифт Unbounded) |
| `.cert-hero-desc` | Текст описания |
| `.cert-resources` | Flex-строка плиток ресурсов |
| `.cert-resource-card` | Плитка: flex-column, иконка + заголовок + описание |
| `.cert-resource-icon` | Emoji-иконка вверху плитки |
| `.cert-resource-body` | Flex-column обёртка для заголовка и описания |
| `.cert-resource-title` | Заголовок плитки (JetBrains Mono, жирный) |
| `.cert-resource-desc` | Описание плитки |
| `.cert-stats` | Строка статистики: N экзаменов · N тем · N статей |
| `.exam-block` | Группа тем для одного кода экзамена |
| `.exam-label` | Заголовок экзамена (uppercase) |
| `.cert-topic` | Один элемент аккордеона |
| `.cert-topic.open` | Раскрытый: `border-color: var(--accent)` |
| `.cert-topic:not(.has-posts)` | Тема без статей — некликабельна, chevron приглушён |
| `.cert-topic-head` | Кнопка-заголовок аккордеона |
| `.topic-num` | Номер темы: `color: var(--accent)` |
| `.topic-chevron` | `›`, поворачивается на 90° при `.open` |
| `.cert-topic-body` | Тело аккордеона: `max-height: 0` → `scrollHeight` через JS |
| `.cert-post-link` | Ссылка на статью внутри темы |
| `.cert-post-title` | Заголовок статьи: `color: var(--accent)` |

---

## quiz.css — CCNA квиз

| Класс | Описание |
|---|---|
| `.quiz-disclaimer` | Предупреждение вверху страниц квиза |
| `.quiz-index-grid` | Сетка из 49 плиток страниц |
| `.quiz-index-card` | Плитка страницы с номером |
| `.quiz-index-card.visited` | Посещённая страница: зелёная граница и номер |
| `.quiz-page` | Контейнер страницы квиза |
| `.quiz-progress-wrap` | Тонкий progress bar вверху |
| `.quiz-card` | Карточка вопроса |
| `.quiz-q-num` | Значок номера вопроса |
| `.quiz-q-text` | Текст вопроса |
| `.quiz-images` | Область изображений |
| `.quiz-multi-hint` | Значок "Choose N" для вопросов с множественным выбором |
| `.quiz-options` | Список вариантов ответа |
| `.quiz-opt` | Один вариант: radio/checkbox + буква + текст |
| `.quiz-opt.selected` | Выбранный пользователем вариант |
| `.quiz-opt.correct` | Правильный вариант (после reveal): зелёный |
| `.quiz-opt.wrong` | Неправильно выбранный вариант: красный |
| `.quiz-opt.missed` | Правильный, но не выбранный: жёлтый |
| `.quiz-reveal-btn` | Кнопка "Show Answer" / "Hide Answer" |
| `.quiz-score-badge` | Inline-значок результата |
| `.quiz-answer` | Блок ответа с объяснением |
| `.quiz-explanation` | Текст объяснения |

---

## ns.css — layout страницы linux-namespaces

Загружается только для `/posts/linux-namespaces/`. Все общие компоненты (NS-карточки, tabs, map-кнопки, ref-panel, stags) находятся в `prose.css`.

| Класс | Описание |
|---|---|
| `.ns-page-wrap` | Двухколоночная сетка: `1fr 240px` |
| `.ns-page-main` | Левая колонка контента |
| `.ns-page-aside` | Правая боковая панель (sticky, скрыта на мобильном) |
| `.toc-box` | Панель содержания в sidebar |
| `.toc-item` | Ссылка на заголовок в TOC |
| `.toc-item.hl` | Активный заголовок |
| `.progress-box` | Панель прогресса чтения |
| `.progress-fill` | Анимированная заливка |
| `.filter-row` | Строка кнопок фильтра для таблицы |
| `.f-btn` | Кнопка фильтра, использует `--c` |
| `.f-btn.on` | Активный фильтр |
| `.ns-pre` | Область вывода кода с кастомными цветами синтаксиса |

---

## Связанные страницы

- [Обзор проекта](/docs/ru/overview/)
- [Шаблоны](/docs/ru/templates/)
- [Frontmatter](/docs/ru/frontmatter/)
- [JavaScript](/docs/ru/javascript/)
