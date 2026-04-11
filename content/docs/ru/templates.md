---
title: "Шаблоны — Справочник по Layout'ам"
date: 2026-04-11
description: "Каждый файл шаблона Hugo: что рендерит, контекст данных, структура блоков"
page_lang: "ru"
lang_pair: "/docs/templates/"
pagefind_ignore: true
_build:
  list: never
  render: always
tags: ["docs"]
---

## Как работают шаблоны Hugo

Hugo использует язык шаблонов Go. Все шаблоны находятся в `themes/maks/layouts/`.

**Ключевые концепции:**
- `{{ .Field }}` — вывести значение поля
- `{{ range .Items }}...{{ end }}` — цикл по коллекции
- `{{ if .Condition }}...{{ end }}` — условный блок
- `{{ partial "name.html" . }}` — вставить partial, передав текущий контекст
- `{{ block "name" . }}...{{ end }}` — определить именованный блок (в baseof)
- `{{ define "name" }}...{{ end }}` — переопределить блок (в дочерних шаблонах)
- `{{ "path" | relURL }}` — преобразовать путь в относительный URL
- `{{ .Value | funcName }}` — pipe: передать значение в функцию

---

## baseof.html — мастер-шаблон

**Путь:** `themes/maks/layouts/_default/baseof.html`  
**Рендерится для:** каждой страницы сайта (является обёрткой)

Это основа всего сайта. Каждый другой шаблон расширяет `baseof` через `define` блоки.

### Блоки, которые можно переопределить

| Блок | Место в baseof | Назначение |
|---|---|---|
| `{{ block "head" . }}` | внутри `<head>` | Дополнительные `<link>` или `<meta>` |
| `{{ block "main" . }}` | основное содержимое | Контент страницы |
| `{{ block "scripts" . }}` | перед `</body>` | Инлайн JS, специфичный для страницы |

### Что рендерится всегда (не переопределяется)

- **Desktop nav** `.desk-nav` — логотип + ссылки + lang-toggle + theme-toggle
- **Mobile nav** `.mob-nav` — логотип + burger
- **Mobile drawer** `.mob-drawer` — выдвижное меню
- **Mobile bottom nav** `.mob-bottom-nav` — нижняя панель с иконками
- **Footer** — логотип + стек + локация + год
- **`<script>`** — инлайн: `toggleTheme()`, `setLang()`, `toggleMobMenu()`, `closeMobMenu()`, restore from localStorage

> **Важно:** `site.js` не загружается из baseof! Функции прописаны инлайн прямо в baseof для гарантированного порядка выполнения. `site.js` в `static/js/` — устаревший файл, его функции дублированы.

### Как тема переключается

```html
<html data-theme="dark">   ← атрибут на <html>
```

CSS читает атрибут через `[data-theme="light"]` и переключает переменные. Значение хранится в `localStorage.theme`.

---

## index.html — главная страница

**Путь:** `themes/maks/layouts/index.html`  
**Рендерится для:** `/`  
**Определяет блок:** `main`

### Секции главной страницы

| CSS-класс | Содержимое | Откуда данные |
|---|---|---|
| `.hero` | Заголовок + описание + кнопки | Хардкод в шаблоне |
| `.panel .recent-posts` | Последние 5 постов | `{{ range first 5 .Site.RegularPages }}` |
| `.panel .kb-section` | Быстрые ссылки KB | Хардкод ссылок |
| `.panel .certs-section` | Виджет сертификаций | `{{ partial "certs-widget.html" . }}` |
| `.cert-grid` | 4 карточки сертификатов | Хардкод в `certs-widget.html` |

> **Особенность:** прогресс-бары сертификаций (`width:62%`) захардкожены в `certs-widget.html`. Для обновления нужно редактировать файл partial вручную.

---

## _default/single.html — страница статьи

**Путь:** `themes/maks/layouts/_default/single.html`  
**Рендерится для:** любая `single` страница без специфичного шаблона  
**Используется:** все статьи `/posts/lpic2-*/`, `/docs/*/`, `/about/`... (если нет своего шаблона)  
**Определяет блоки:** `main`, `scripts`

### Структура `main`

```
.page.prose-page
  .breadcrumb          ← maks.top / {section} / {title}
  article
    .post-header
      h1               ← .Title
      .post-meta
        .post-date     ← .Date.Format "2006-01-02"
        (readingtime)  ← .Params.readingtime (если задан)
        .tag × N       ← range .Params.tags → ссылки на /tags/{tag}/
    .prose             ← {{ .Content }} (тело markdown → HTML)
    .back-link         ← ← Back to {section}
  .toc-aside           ← пустой div, заполняется JS
```

### Блок `scripts` — ToC + progress bar + copy buttons

**Reading progress bar:** создаётся динамически `document.createElement('div')`, стиль инлайн, обновляется через `scroll` event.

**ToC sidebar:**
1. Находит все `h2`, `h3` внутри `#articleBody`
2. Если заголовков `> 2` — генерирует `.toc-inner` с ссылками
3. На ширине `>= 860px` добавляет `.has-toc` к `.page` (двухколоночный layout)
4. `IntersectionObserver` подсвечивает активный пункт при скролле

**Copy buttons:** для каждого `<pre>` не внутри `.code-block` создаёт обёртку `.code-block` с кнопкой.

---

## _default/list.html — листинг страниц

**Путь:** `themes/maks/layouts/_default/list.html`  
**Рендерится для:** любой раздел без специфичного шаблона (`/docs/`, `/certs/` если нет своего)  
**Определяет блок:** `main`

```
.page
  .sec-title           ← .Title | default .Section
  .posts-list
    .post-card × N     ← range .Paginator.Pages
      .post-card-meta  ← дата + первые 2 тега
      .post-card-title ← .Title
      .post-card-desc  ← .Description или .Summary (обрезается до 120 символов)
  pagination.html      ← {{ partial "pagination.html" . }}
```

---

## posts/list.html — листинг блога

**Путь:** `themes/maks/layouts/posts/list.html`  
**Рендерится для:** `/posts/`  
**Переопределяет:** `_default/list.html`  
**Добавляет:** поиск Pagefind

**Отличие от `_default/list.html`:** добавляет `.tags-header` с поисковым `<input>` и инициализирует Pagefind через динамический `import('/pagefind/pagefind.js')`.

**Как работает Pagefind:**
1. GitHub Actions после `hugo build` запускает `pagefind --site public`
2. Pagefind обходит `public/` и создаёт индекс в `public/pagefind/`
3. На клиенте `pagefind.js` загружается лениво (только при первом вводе в поиск)
4. Результаты показываются в абсолютно позиционированном div под input

---

## posts/linux-namespaces.html — интерактивная страница

**Путь:** `themes/maks/layouts/posts/linux-namespaces.html`  
**Рендерится для:** `/posts/linux-namespaces/`  
**Загружает:** `styles/ns.css` через блок `head`, `js/ns.js` через блок `scripts`

Полностью кастомный layout с двухколоночной структурой:
- Левая колонка: контент markdown + namespace map + grid + cheatsheet
- Правая колонка: ToC + progress bar

Данные namespace'ов (`nsData`, `cheatData`) определены в `ns.js`.

---

## about/single.html

**Путь:** `themes/maks/layouts/about/single.html`  
**Рендерится для:** `/about/`

Рендерит профильную карточку `.about-strip` с данными из `hugo.toml [params]`:

| HTML | Источник |
|---|---|
| `.about-name` | `.Site.Params.author` |
| GitHub / LinkedIn / Telegram ссылки | `.Site.Params.github` / `.Site.Params.linkedin` / `.Site.Params.telegram` |
| `.prose` | `.Content` (тело `about.md`) |

Затем вставляет `{{ partial "certs-widget.html" . }}` — те же карточки что и на главной.

---

## certs/single.html — страница сертификата

**Путь:** `themes/maks/layouts/certs/single.html`  
**Рендерится для:** `/certs/lpic-2/`, `/certs/lpic-1/` и т.д.  
**Загружает:** `styles/cert.css` через блок `head`

### Алгоритм построения accordion

```
1. $allPosts = все страницы раздела "posts"
2. $prefix   = .Params.post_prefix (например "lpic2")
3. Для каждого exam в .Params.exams:
   Для каждого topic в exam.topics:
     $topicPattern = "{prefix}-{topic.num}-"
     $topicPosts   = фильтр: страницы, у которых BaseFileName начинается с $topicPattern
     → если $topicPosts не пустой → рендерит accordion с ссылками
```

**Функция `toggleTopic(btn)`:** toggle класса `.open` на `.cert-topic`, анимирует `max-height` у `.cert-topic-body`.

---

## taxonomy/tag.html — страница тегов

**Путь:** `themes/maks/layouts/taxonomy/tag.html`  
**Рендерится для:** `/tags/`

Встраивает все посты как JSON-массив `POSTS` прямо в HTML. Каждый объект:
```js
{ url, title, date, tags: [urlized], tagLabels: [display], summary }
```

При клике на кнопку-тег — фильтрует массив и перерисовывает `.posts-list` через `innerHTML`.

---

## partials/

### certs-widget.html

Вставляется на главную (`index.html`) и about (`about/single.html`).  
Хардкодит 4 карточки с прогресс-барами. Прогресс обновляется вручную (`width:62%` и т.д.).

### pagination.html

Принимает контекст с `.Paginator`. Логика отображения страниц:
- Всегда показывает первую и последнюю страницу
- Показывает `cur-1`, `cur`, `cur+1`
- Между ними вставляет `···` если есть пропуск

### search.html

Существует, но нигде не используется через `partial`. Поиск встроен инлайн в `posts/list.html` и `taxonomy/tag.html`.

---

## shortcodes/

### `code`

```markdown
{{</* code lang="bash" label="example" */>}}
команда
{{</* /code */>}}
```

| Параметр | Тип | Default | Описание |
|---|---|---|---|
| `lang` | string | `"bash"` | Язык в шапке блока |
| `label` | string | — | Дополнительная метка (мелким текстом) |

Рендерит `.code-block` с кнопкой copy. `.Inner` — тело между тегами, проходит через `htmlEscape`.

### `ns-card`

```markdown
{{</* ns-card name="PID" flag="CLONE_NEWPID" icon="⚙️" color="#7c3aed"
    summary="Process ID isolation"
    desc="Подробное описание..."
    host="PID 84521 on host"
    ns_view="PID 1 inside"
*/>}}
{{</* /ns-card */>}}
```

| Параметр | Обязательный | Описание |
|---|---|---|
| `name` | да | Название namespace (PID, NET, UTS...) |
| `flag` | да | Kernel flag (CLONE_NEWPID) |
| `icon` | да | Emoji-иконка |
| `color` | да | CSS-цвет (hex), используется для `--card-color` |
| `summary` | да | Короткое описание в заголовке |
| `desc` | да | Полное описание в раскрытом теле |
| `host` | нет | Значение на стороне хоста (виз. блок) |
| `ns_view` | нет | Значение внутри namespace (виз. блок) |

`.Inner` — произвольный markdown внутри тегов (например code block).

---

## Связанные страницы

- [Обзор проекта](/docs/ru/overview/)
- [CSS](/docs/ru/css/)
- [Frontmatter](/docs/ru/frontmatter/)
- [JavaScript](/docs/ru/javascript/)
