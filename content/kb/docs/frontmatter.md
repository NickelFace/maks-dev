---
title: "Frontmatter: Fields Reference"
date: 2026-04-11
description: "All frontmatter fields by content type with types, required status, and descriptions"
page_lang: "en"
lang_pair: "/kb/docs/ru/frontmatter/"
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
| `draft` | bool | `.Draft` | `true`: page not published with `hugo` (only with `hugo -D`) |
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
title: "LPIC-2 200.1 Measuring and Diagnosing Resource Usage"
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
| `post_category` | string | **yes** | Hugo category used in course posts (e.g. `"LPIC-2"`). Used by `certs-widget.html` to count articles |
| `expected_articles` | int | no | Planned total article count: enables auto-calculated progress % in the widget |
| `progress_pct` | int | no | Manual fallback % when `expected_articles` is not set (e.g. early-stage courses with no articles yet) |
| `credly_badge_id` | string | no | Credly badge ID: marks the cert as **passed** (overrides progress logic) |
| `cert_url` | string | no | Alternative to `credly_badge_id`: any URL marks cert as passed |
| `cert_labs_done` | int | no | Number of completed labs, shown in the certs index `Articles` column |
| `exams` | []Exam | no | List of exams with topics. Without it: "coming soon" page |

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

## Bilingual content fields

All EN pages with a RU counterpart use these fields. Applies to posts, KB, docs, ccna-labs.

| Field | Type | Page | Description |
|---|---|---|---|
| `page_lang` | string | EN + RU | `"en"` or `"ru"`: identifies the page language |
| `lang_pair` | string | EN + RU | URL of the paired page in the other language |
| `pagefind_ignore` | bool | **RU only** | `true`: excludes the page from Pagefind search index |
| `build.list` | string | **RU only** | `never`: hides the page from section listings |
| `build.render` | string | **RU only** | `always`: ensures Hugo renders the page even when unlisted |

### EN page example
```yaml
page_lang: "en"
lang_pair: "/posts/neteng/ru/neteng-07-ipv4-ipv6/"
```

### RU page example
```yaml
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-07-ipv4-ipv6/"
pagefind_ignore: true
build:
  list: never
  render: always
```

> **Without `build: {list: never}`** the RU page appears in `/posts/` listing and inflates post count. Without `pagefind_ignore: true` it pollutes search with duplicate Russian content.

---

## Fields for KB pages (`content/kb/*.md`)

### Flat pages (directly in `content/kb/`)

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | **yes** | Page title |
| `description` | string | **yes** | Shown in the KB card on `/kb/` |
| `icon` | string | no | Emoji icon shown in the card |
| `group` | string | **yes** | KB section group. One of: `"Linux Core"`, `"Networking"`, `"Cloud & DevOps"`, `"Security"`, `"Cases"` |
| `tags` | []string | recommended | Tag filtering |
| `date` | date | **yes** | Must be a past date: Hugo skips future/today dates |

### Subsection `_index.md` (`content/kb/{name}/_index.md`)

Same fields as flat pages. Child articles do **not** need `group:`, only `_index.md` carries it.

---

## Fields for Network Engineer course posts

Network Engineer posts are bilingual course posts with a specific format. Files live in `content/posts/neteng/` (EN) and `content/posts/neteng/ru/` (RU).

### EN post
```yaml
---
title: "Network Engineer NN. Title"
date: 2026-01-01
description: "..."
tags: [...]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "en"
lang_pair: "/posts/neteng/ru/neteng-NN-slug/"
---
```

### RU post
```yaml
---
title: "Network Engineer NN. Title"
date: 2026-01-01
description: "..."
tags: [...]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-NN-slug/"
pagefind_ignore: true
build:
  list: never
  render: always
---
```

| Field | Notes |
|---|---|
| `code_toggle` | `true`: enables JS-collapsible `<details>` blocks for long CLI output |
| `categories` | Must match `post_category` in the cert frontmatter for article counting |

---

## Fields for CCNA theory articles

Theory articles: `content/posts/ccna/ccna-{domain}-{num}-{slug}.md` (EN), `content/posts/ccna/ru/` (RU).

Naming example: `ccna-1-01-network-components.md` → domain 1, topic 01.

```yaml
# EN
---
title: "CCNA 200-301 Title"
date: 2026-01-01
tags: [...]
categories: ["CCNA 200-301"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-1-01-network-components/"
---

# RU shadow
---
title: "CCNA 200-301 Title"
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-1-01-network-components/"
pagefind_ignore: true
build:
  list: never
  render: always
---
```

The `content/posts/ccna/_index.md` has `build: {render: never, list: never}`; the section itself does not render.

---

## Fields for CCNA lab solutions

Lab solutions: `content/ccna-labs/ccna-lab-NN-slug.md` (EN), `content/ccna-labs/ru/` (RU).

```yaml
# EN
---
title: "CCNA Lab NN: Title"
date: 2026-01-01
description: "..."
tags: [...]
page_lang: "en"
lang_pair: "/ccna-labs/ru/ccna-lab-NN-slug/"
tool: "Packet Tracer"
duration: "30 min"
---

# RU shadow
---
title: "CCNA Lab NN: Title"
page_lang: "ru"
lang_pair: "/ccna-labs/ccna-lab-NN-slug/"
pagefind_ignore: true
build:
  list: never
  render: always
---
```

| Field | Default | Notes |
|---|---|---|
| `tool` | `"Packet Tracer"` | Software used, shown in the `/ccna-labs/` grid |
| `duration` | `"n/a"` | Estimated time, shown in the grid |

---

## Fields for troubleshooting pages (`content/troubleshooting/*.md`)

Symptom-first reference pages, filed `ts-NN-slug.md`. English only — the section
was created after the site went English-only, so there are no RU shadows.

```yaml
---
title: "VLANs and Trunks"
date: 2026-09-06
description: "One sentence naming the fault classes the page covers."
tags: ["Troubleshooting", "VLAN", "Trunk", "Cisco"]
categories: ["Troubleshooting"]
unit: 3
---
```

| Field | Required | Notes |
|---|---|---|
| `unit` | yes | Integer 1–7. Drives grouping on `/troubleshooting/`; a page without it does not appear in the index |

Units, in order: 1 method and tools, 2 physical and data link, 3 switching,
4 routing, 5 IP services, 6 IPv6, 7 security and filtering. The titles live in
`layouts/troubleshooting/list.html`, so adding a unit means editing that slice
as well as the front matter.

Ordering inside a unit is by filename, which is why the `NN` prefix matters.

---

## Fields for trainers (`content/trainers/*.md`)

Interactive drills and animations. Each page is front matter plus one
`{{</* rawhtml */>}}` block; the widget carries its own markup, style and script.

```yaml
---
title: "Subnetting"
date: 2026-09-06
description: "Shown as the tile text on /trainers/ — say what the drill asks."
group: "drill"
order: 1
topic: "1.5 · IPv4 addressing"
keys: "<kbd>Enter</kbd> check · <kbd>Space</kbd> reveal · <kbd>&rarr;</kbd> next"
---
```

| Field | Required | Notes |
|---|---|---|
| `group` | yes | `drill`, `animation` or `tool`. Section on `/trainers/` |
| `order` | yes | Sort position inside the group |
| `topic` | no | Blueprint reference, shown small on the tile |
| `keys` | no | Keyboard hints, rendered above the widget as raw HTML. Must match what the script actually binds — omit it when there are none |

**Do not call this field `kind`.** `kind` is reserved by Hugo as a page-kind
override. It is a deprecation warning on 0.154 and a hard build failure on
0.147, which is what the deploy runs — the error is `unknown kind "drill" in
front matter` and it does not appear locally.

---

## Fields for the About page (`content/about.md`)

`about.md` uses no custom frontmatter fields, profile data (name, links) comes from `hugo.toml [params]`.

```yaml
---
title: "About"
date: 2026-04-01
---
```

The `.md` body is rendered into `.prose` in `about/single.html`.

---

## Fields for documentation (`content/kb/docs/*.md`)

```yaml
---
title: "Page title"
date: 2026-04-11
description: "Description for meta"
page_lang: "en"
lang_pair: "/kb/docs/ru/frontmatter/"
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

- [Project Overview](/kb/docs/overview/)
- [Templates](/kb/docs/templates/)
- [CSS](/kb/docs/css/)
- [JavaScript](/kb/docs/javascript/)
