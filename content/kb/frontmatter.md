---
title: "Frontmatter — Fields Reference"
date: 2026-04-11
description: "All frontmatter fields by content type with types, required status, and descriptions"
page_lang: "en"
lang_pair: "/kb/ru/frontmatter/"
tags: ["docs"]
---

## What is frontmatter?

Frontmatter is a YAML block at the top of each `.md` file between `---`. Hugo reads it and makes it available in templates via `.Params` and built-in fields.

```yaml
---
title: "Title"           # built-in field → .Title
date: 2026-04-11         # built-in field → .Date
my_param: "value"        # custom → .Params.my_param
---
```

---

## Built-in Hugo fields (all content types)

| Field | Type | Template access | Description |
|---|---|---|---|
| `title` | string | `.Title` | Page title. Used in `<title>`, h1, breadcrumb, cards |
| `date` | date | `.Date` | Publication date. Format: `2026-04-11`. Affects sorting |
| `description` | string | `.Description` | Meta description. Used in `<meta description>` and card previews |
| `draft` | bool | `.Draft` | `true` — page not published with `hugo` (only with `hugo -D`) |
| `tags` | []string | `.Params.tags` | Tags. Create pages at `/tags/{tag-name}/` |
| `categories` | []string | `.Params.categories` | Categories. Create pages at `/categories/{name}/` |
| `weight` | int | `.Weight` | Manual sort order (lower = higher) |

---

## Fields for posts (`content/posts/*.md`)

### Used in templates

| Field | Type | Required | Used in | Description |
|---|---|---|---|---|
| `title` | string | **yes** | h1, card, ToC | Article title |
| `date` | date | **yes** | card, sorting | Publication date |
| `description` | string | recommended | meta, card, cert-page | Short description (1-2 sentences) |
| `tags` | []string | recommended | post-meta, filters, /tags/ | Article tags |
| `categories` | []string | no | filter in `certs/single.html` | Category (e.g. "LPIC-2") |
| `readingtime` | int | no | `.post-meta` in single.html | Reading time in minutes |

### Example for an LPIC-2 article

```yaml
---
title: "LPIC-2 200.1 — Measuring and Diagnosing Resource Usage"
date: 2026-04-10
description: "CPU, memory, disk I/O monitoring: top, vmstat, iostat, sar. LPIC-2 topic 200.1."
tags: ["Linux", "Performance", "LPIC-2", "Monitoring"]
categories: ["LPIC-2"]
---
```

### How `description` is used in different places

| Location | Template | Behavior |
|---|---|---|
| Page meta tag | `baseof.html` | `.Description` or `.Site.Params.description` |
| Card in listing | `list.html` | `.Description` → if absent, `.Summary` (first 120 chars) |
| Link in cert accordion | `certs/single.html` | `.Description` below the title |
| Pagefind search result | Pagefind | excerpt from page content |

---

## Fields for cert pages (`content/certs/*.md`)

These are custom fields, read via `.Params.*` in `certs/single.html`.

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | **yes** | Cert name (e.g. "LPIC-2") |
| `cert_badge` | string | **yes** | Emoji icon (e.g. "🖥️") |
| `cert_color` | string | **yes** | CSS color (hex). Used for `--cert-color` and border |
| `description` | string | **yes** | Subtitle in hero block |
| `post_prefix` | string | **yes** | Prefix for matching posts by slug (e.g. `"lpic2"`) |
| `exams` | []Exam | no | List of exams with topics. Without it — "coming soon" page |

### `exams` structure

```yaml
exams:
  - code: "201"              # Exam code (string)
    title: "Advanced Linux"  # Exam name
    topics:
      - num: "200"           # Topic number (string!)
        title: "Capacity Planning"
      - num: "201"
        title: "Linux Kernel"
```

> **Important:** `num` must be a string (without quotes YAML may interpret it as int). In the template it is used to build a pattern: `"{post_prefix}-{num}-"`.

### How `post_prefix` links posts to topics

```
post_prefix = "lpic2"
topic.num   = "200"
──────────────────────────────────────────────
Pattern: "lpic2-200-"

Matches:     lpic2-200-1-capacity-planning.md  ✓
             lpic2-200-2-predict-future.md      ✓
No match:    lpic2-201-1-kernel.md             ✗
```

This means **the article file's slug determines which topic it belongs to**.

---

## Fields for the About page (`content/about.md`)

`about.md` uses no custom frontmatter fields — profile data (name, links) comes from `hugo.toml [params]`.

```yaml
---
title: "About"
date: 2026-04-01
---
```

The `.md` body is rendered into `.prose` in `about/single.html`.

---

## Fields for documentation (`content/docs/*.md`)

```yaml
---
title: "Page title"
date: 2026-04-11
description: "Description for meta"
page_lang: "en"
lang_pair: "/kb/ru/frontmatter/"
tags: ["docs"]
---
```

Uses the standard `_default/single.html` with ToC sidebar.

---

## Global site parameters (`hugo.toml [params]`)

Available in templates as `.Site.Params.*`:

| Parameter | Access | Used in |
|---|---|---|
| `author` | `.Site.Params.author` | `about/single.html` → `.about-name` |
| `description` | `.Site.Params.description` | `baseof.html` → `<meta description>` fallback |
| `location` | `.Site.Params.location` | `about/single.html`, `footer` |
| `github` | `.Site.Params.github` | `about/single.html` → GH link |
| `linkedin` | `.Site.Params.linkedin` | `about/single.html` → LinkedIn link |
| `telegram` | `.Site.Params.telegram` | `about/single.html` → Telegram link |

---

## Related pages

- [Project Overview](/kb/overview/)
- [Templates](/kb/templates/)
- [CSS](/kb/css/)
- [JavaScript](/kb/javascript/)
