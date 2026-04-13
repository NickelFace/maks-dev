---
title: "Breadcrumbs"
date: 2026-04-13
description: "How breadcrumbs are implemented across templates — markup, CSS, and differences by page type"
page_lang: "en"
lang_pair: "/docs/ru/breadcrumbs/"
tags: ["docs"]
---

## Overview

Breadcrumbs are plain HTML — no partial, no shortcode. Each template that needs them includes the `.breadcrumb` block directly. There is no shared breadcrumb partial.

**Pages that have breadcrumbs:**

| Page | Template | Breadcrumb |
|---|---|---|
| `/posts/lpic2-*/` | `_default/single.html` | `maks.top / posts / Page Title` |
| `/posts/linux-namespaces/` | `posts/linux-namespaces.html` | `maks.top / posts / Page Title` |
| `/certs/lpic-2/` | `certs/single.html` | `maks.top / Page Title` |

**Pages without breadcrumbs:** `/` (home), `/posts/` (list), `/tags/`, `/about/`.

---

## CSS (defined in `global.css`)

```css
.breadcrumb       { font-size: 11px; color: var(--text3); margin-bottom: 24px; }
.breadcrumb a     { color: var(--text3); text-decoration: none; }
.breadcrumb a:hover { color: var(--accent); }
.breadcrumb span  { margin: 0 6px; }   /* the "/" separator */
```

All breadcrumb links are `--text3` (muted) by default, turning `--accent` (cyan) on hover. The `/` separators are plain `<span>` elements with horizontal margin.

---

## Per-template implementation

### `_default/single.html` — prose articles

Used by all posts except `linux-namespaces`, and by `docs/` pages.

```html
<div class="breadcrumb">
  <a href="{{ "/" | relURL }}">maks.top</a>
  <span>/</span>
  <a href="{{ .Section | relURL }}">{{ .Section }}</a>
  <span>/</span>
  {{ .Title }}
</div>
```

**Dynamic middle segment** — uses `.Section` for both the URL and the label:

| Page | `.Section` value | Result |
|---|---|---|
| `/posts/lpic2-200-1/` | `posts` | `maks.top / posts / LPIC-2 200.1 ...` |
| `/docs/overview/` | `docs` | `maks.top / docs / Project Overview` |
| `/kb/some-topic/` | `kb` | `maks.top / kb / Topic Title` |

The last segment (current page) is plain text — not a link.

---

### `posts/linux-namespaces.html` — interactive article

Hardcoded instead of using `.Section` — functionally identical but with explicit path strings:

```html
<div class="breadcrumb">
  <a href="{{ "/" | relURL }}">maks.top</a><span>/</span>
  <a href="{{ "/posts/" | relURL }}">posts</a><span>/</span>
  <span style="color:var(--text2)">{{ .Title }}</span>
</div>
```

**Differences from `_default/single.html`:**
- Middle link is hardcoded as `"/posts/"` instead of `{{ .Section | relURL }}`
- Current page title wrapped in `<span style="color:var(--text2)">` instead of plain text — slightly brighter than `--text3`
- Separators placed inline without spaces: `</a><span>/</span>` vs `</a> <span>/</span>`

These are cosmetic inconsistencies. Both render the same visual result.

---

### `certs/single.html` — certification pages

Two segments only — no section link:

```html
<div class="breadcrumb">
  <a href="{{ "/" | relURL }}">maks.top</a>
  <span>/</span>
  <span style="color:var(--text2)">{{ .Title }}</span>
</div>
```

`/certs/` is skipped because there's no certs index page — clicking it would 404. The cert pages sit directly under root in the nav, so the two-segment breadcrumb `maks.top / LPIC-2` is accurate.

---

## Why no breadcrumb partial?

Three templates, three slightly different structures — the middle segment differs by context. Hugo's `.Section` handles the general case in `_default/single.html`, but `linux-namespaces.html` hardcodes it and `certs/single.html` omits it entirely.

If breadcrumbs need to expand to more levels in the future, extract into a partial:

```
themes/maks/layouts/partials/breadcrumb.html
```

```html
{{/*  Call: {{ partial "breadcrumb.html" . }}  */}}
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

## Related pages

- [Templates](/docs/templates/)
- [CSS](/docs/css/)
