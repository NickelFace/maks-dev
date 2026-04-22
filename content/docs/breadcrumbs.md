---
title: "Breadcrumbs"
date: 2026-04-22
description: "How breadcrumbs are implemented across templates — partial, CSS, and KB sub-section support"
page_lang: "en"
lang_pair: "/docs/ru/breadcrumbs/"
tags: ["docs"]
---

## Overview

Breadcrumbs are implemented as a **shared partial** at `themes/maks/layouts/partials/breadcrumb.html`.

Every template that needs them calls:
```html
{{ partial "breadcrumb.html" . }}
```

**Templates using the partial:**

| Template | Pages |
|---|---|
| `_default/single.html` | All posts, docs, KB pages |
| `kb/section.html` | KB index and sub-section landing pages |
| `certs/single.html` | Cert overview pages |
| `posts/linux-namespaces.html` | Linux namespaces article |

---

## Partial logic

```
themes/maks/layouts/partials/breadcrumb.html
```

The partial renders different segments depending on page type:

| Case | Output |
|---|---|
| `eq .Section "certs"` | `maks.top / Page Title` (no section link — no certs index) |
| `.IsSection` | `maks.top / section-name` (section index — current page as plain text) |
| KB sub-page (`Section=kb`, depth=2) | `maks.top / kb / Parent Section Title / Page Title` |
| Other regular pages | `maks.top / section / Page Title` |

---

## KB sub-section support

For pages like `/kb/cisco-services/nat-dhcp/`, the partial detects a second path segment from `.File.Dir` and checks if it's a known cert section (`$certMap`) or a KB page:

```go
{{ if eq $.Section "kb" }}
  <a href="{{ (printf "/%s/%s/" $.Section $sub) | relURL }}">{{ $.Parent.Title | default $sub }}</a>
{{ end }}
```

This makes the middle crumb (`Cisco — Network Services`) a clickable link to the sub-section index.

---

## CSS (defined in `global.css`)

```css
.breadcrumb       { font-size: 11px; color: var(--text3); margin-bottom: 24px; }
.breadcrumb a     { color: var(--text3); text-decoration: none; }
.breadcrumb a:hover { color: var(--accent); }
.breadcrumb span  { margin: 0 6px; }
```

All breadcrumb links are `--text3` (muted) by default, turning `--accent` on hover.

---

## Cert section map

The partial has a `$certMap` dict mapping sub-folder names to cert page URLs:

```go
{{ $certMap := dict
    "neteng"  "/certs/network-engineer/"
    "netarch" "/certs/network-architect/"
    "lpic1"   "/certs/lpic-1/"
    "lpic2"   "/certs/lpic-2/"
}}
```

Used for posts in `/posts/neteng/`, `/posts/lpic1/` etc. — their middle breadcrumb segment links to the corresponding cert page instead of the posts sub-folder.

---

## Related pages

- [Templates](/docs/templates/)
- [CSS](/docs/css/)
