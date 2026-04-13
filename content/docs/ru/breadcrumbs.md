---
title: "Breadcrumbs"
date: 2026-04-13
description: "Реализация breadcrumbs в шаблонах — разметка, CSS и различия по типам страниц"
page_lang: "ru"
lang_pair: "/docs/breadcrumbs/"
pagefind_ignore: true
build:
  list: never
  render: always
tags: ["docs"]
---

## Обзор

Breadcrumbs — это чистый HTML, без партиалов и шорткодов. Каждый шаблон, которому они нужны, включает блок `.breadcrumb` напрямую. Общего партиала для breadcrumbs нет.

**Страницы с breadcrumbs:**

| Страница | Шаблон | Breadcrumb |
|---|---|---|
| `/posts/lpic2-*/` | `_default/single.html` | `maks.top / posts / Заголовок страницы` |
| `/posts/linux-namespaces/` | `posts/linux-namespaces.html` | `maks.top / posts / Заголовок страницы` |
| `/certs/lpic-2/` | `certs/single.html` | `maks.top / Заголовок страницы` |

**Страницы без breadcrumbs:** `/` (главная), `/posts/` (список), `/tags/`, `/about/`.

---

## CSS (определён в `global.css`)

```css
.breadcrumb       { font-size: 11px; color: var(--text3); margin-bottom: 24px; }
.breadcrumb a     { color: var(--text3); text-decoration: none; }
.breadcrumb a:hover { color: var(--accent); }
.breadcrumb span  { margin: 0 6px; }   /* разделитель "/" */
```

Все ссылки breadcrumb по умолчанию имеют цвет `--text3` (приглушённый), при наведении меняются на `--accent` (циановый). Разделители `/` — простые элементы `<span>` с горизонтальными отступами.

---

## Реализация по шаблонам

### `_default/single.html` — prose-статьи

Используется всеми постами кроме `linux-namespaces`, а также страницами `docs/`.

```html
<div class="breadcrumb">
  <a href="{{ "/" | relURL }}">maks.top</a>
  <span>/</span>
  <a href="{{ .Section | relURL }}">{{ .Section }}</a>
  <span>/</span>
  {{ .Title }}
</div>
```

**Динамический средний сегмент** — использует `.Section` как для URL, так и для метки:

| Страница | Значение `.Section` | Результат |
|---|---|---|
| `/posts/lpic2-200-1/` | `posts` | `maks.top / posts / LPIC-2 200.1 ...` |
| `/docs/overview/` | `docs` | `maks.top / docs / Обзор проекта` |
| `/kb/some-topic/` | `kb` | `maks.top / kb / Заголовок темы` |

Последний сегмент (текущая страница) — простой текст, не ссылка.

---

### `posts/linux-namespaces.html` — интерактивная статья

Захардкожен вместо использования `.Section` — функционально идентично, но с явными строками пути:

```html
<div class="breadcrumb">
  <a href="{{ "/" | relURL }}">maks.top</a><span>/</span>
  <a href="{{ "/posts/" | relURL }}">posts</a><span>/</span>
  <span style="color:var(--text2)">{{ .Title }}</span>
</div>
```

**Отличия от `_default/single.html`:**
- Средняя ссылка захардкожена как `"/posts/"` вместо `{{ .Section | relURL }}`
- Заголовок текущей страницы обёрнут в `<span style="color:var(--text2)">` вместо простого текста — чуть светлее, чем `--text3`
- Разделители расставлены без пробелов: `</a><span>/</span>` вместо `</a> <span>/</span>`

Это косметические расхождения. Визуальный результат одинаковый.

---

### `certs/single.html` — страницы сертификаций

Только два сегмента — без ссылки на раздел:

```html
<div class="breadcrumb">
  <a href="{{ "/" | relURL }}">maks.top</a>
  <span>/</span>
  <span style="color:var(--text2)">{{ .Title }}</span>
</div>
```

`/certs/` пропускается, потому что страницы-индекса сертификаций не существует — клик по ней вызвал бы 404. Страницы сертификаций расположены напрямую под корнем в навигации, поэтому двухсегментный breadcrumb `maks.top / LPIC-2` корректен.

---

## Почему нет партиала для breadcrumbs?

Три шаблона — три немного разные структуры. Средний сегмент отличается в зависимости от контекста. `.Section` решает общий случай в `_default/single.html`, но `linux-namespaces.html` хардкодит его, а `certs/single.html` вовсе опускает.

Если breadcrumbs в будущем нужно будет расширить до большего количества уровней, стоит вынести в партиал:

```
themes/maks/layouts/partials/breadcrumb.html
```

```html
{{/*  Вызов: {{ partial "breadcrumb.html" . }}  */}}
<div class="breadcrumb">
  <a href="{{ "/" | relURL }}">maks.top</a>
  {{ with .Section }}
  <span>/</span>
  <a href="{{ . | relURL }}">{{ . }}</a>
  {{ end }}
  <span>/</span>
  <span style="color:var(--text2)">{{ .Title }}</span>
</div>
```

---

## Связанные страницы

- [Шаблоны](/docs/ru/templates/)
- [CSS](/docs/ru/css/)
