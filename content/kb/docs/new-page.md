---
title: "New Page Guide"
date: 2026-04-13
description: "Step-by-step guide for adding any type of page: prose article, interactive page, cert overview"
page_lang: "en"
lang_pair: "/kb/docs/ru/new-page/"
tags: ["docs"]
---

## Choose your page type

| What you're making | Type | Layout used |
|---|---|---|
| Regular article (LPIC-2 topic, tutorial) | prose | `_default/single.html` |
| Interactive explorer (cards, tabs, JS) | interactive | `layouts/posts/<slug>.html` |
| Certification overview page | cert | `layouts/certs/single.html` |
| Knowledge base entry | prose | `_default/single.html` |
| Bilingual course post (Network Engineer) | bilingual | `_default/single.html` (EN + RU pair) |

---

## Type 1: Prose article

The simplest case. No custom layout needed, Hugo picks `_default/single.html` automatically.

### Step 1: create the file

```bash
# LPIC-2 article - follow the naming convention
content/posts/lpic2-205-4-my-topic.md

# General article
content/posts/my-topic-title.md
```

### Step 2: write frontmatter

```yaml
---
title: "LPIC-2 205.4 My Topic Title"
date: 2026-04-13
description: "One or two sentences. Used in meta tag and post card preview."
tags: ["Linux", "LPIC-2", "Networking"]
categories: ["LPIC-2"]
---
```

**Fields:**

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Shown in h1, card, breadcrumb |
| `date` | yes | Controls sort order in listings |
| `description` | recommended | Shown in post card and `<meta description>` |
| `tags` | recommended | Creates `/tags/{tag}/` pages |
| `categories` | no | Used to group posts inside cert accordion |
| `readingtime` | no | Integer (minutes). Shown in post header |

### Step 3: write content

Standard Markdown. Use shortcodes for enhanced blocks:

```markdown
## Section heading

Regular paragraph text.

{{</* code lang="bash" */>}}
sudo systemctl status nginx
{{</* /code */>}}

{{</* code lang="bash" label="output" */>}}
● nginx.service - A high performance web server
   Loaded: loaded (/lib/systemd/system/nginx.service)
   Active: active (running)
{{</* /code */>}}
```

> **Note:** `{{</* code */>}}` adds a copy button. Plain ` ```bash ``` ` markdown also works, `single.html` wraps it in `.code-block` with a copy button automatically.

### Step 4: verify locally

```bash
hugo server -D
# → http://localhost:1313/posts/my-topic-title/
```

The page automatically gets:
- TOC sidebar (desktop) built from `h2`/`h3` headings, requires more than 2 headings
- Reading progress bar at the top
- Copy buttons on all code blocks

### That's it: no other files needed.

---

## Type 2: Interactive page

Use when the page has JS-driven UI: expandable cards, filters, progress tracking, data rendered from a JS array. Example: `/posts/linux-namespaces/`.

### Step 1: create the content file

```bash
content/posts/my-interactive-topic.md
```

Frontmatter. Add `layout` to point Hugo at a specific template:

```yaml
---
title: "My Interactive Topic"
date: 2026-04-13
description: "Description for meta and post card."
tags: ["Linux"]
layout: "my-interactive-topic"
---

<div class="intro-card">
  Opening paragraph rendered from markdown into the layout via <code>{{ .Content }}</code>.
</div>
```

### Step 2: create the layout file

```bash
themes/maks/layouts/posts/my-interactive-topic.html
```

Minimal structure:

```html
{{ define "head" }}
<link rel="stylesheet" href="{{ "styles/ns.css" | relURL }}">
{{ end }}

{{ define "main" }}
<div class="ns-page-wrap">

  <!-- MAIN COLUMN -->
  <div class="ns-page-main">

    <div class="breadcrumb">
      <a href="{{ "/" | relURL }}">maks.top</a><span>/</span>
      <a href="{{ "/posts/" | relURL }}">posts</a><span>/</span>
      <span style="color:var(--text2)">{{ .Title }}</span>
    </div>

    <div class="post-h1">{{ .Title }}</div>
    <div class="post-meta">
      <span class="p-date">{{ .Date.Format "2006-01-02" }}</span>
      {{ range .Params.tags }}
        <a href="{{ "/tags/" | relURL }}{{ . | urlize }}/" class="ptag">{{ . }}</a>
      {{ end }}
    </div>

    {{ .Content }}

    <!-- YOUR INTERACTIVE CONTENT HERE -->
    <div class="ns-grid" id="myGrid"></div>

    <div class="back-link"><a href="{{ "/posts/" | relURL }}">← Back to posts</a></div>
  </div>

  <!-- ASIDE (optional) -->
  <div class="ns-page-aside">
    <div class="toc-box">
      <div class="toc-head">Contents</div>
      <div class="toc-body" id="tocBody"></div>
    </div>
  </div>

</div>
{{ end }}

{{ define "scripts" }}
<script src="{{ "js/ns.js" | relURL }}"></script>
<script>
  // Initialization goes here - AFTER the external <script src> above
  const MY_DATA = [
    { name: "Item 1", color: "#00d4ff" },
  ];
  buildCards(MY_DATA, 'myGrid');
</script>
{{ end }}
```

> **Critical:** inline initialization code must be in `{{ define "scripts" }}`, after any `<script src="...">` includes. Putting it before causes `ReferenceError: buildCards is not defined`.

### Step 3: add CSS if needed

If `ns.css` doesn't cover your components, create a new file:

```bash
themes/maks/static/styles/my-topic.css
```

Then load it in the layout's `{{ define "head" }}` block instead of or alongside `ns.css`.

### Step 4: JS data and logic

Two approaches:

**A) Inline in `{{ define "scripts" }}`**. For small datasets, no extra files:

```html
{{ define "scripts" }}
<script>
const DATA = [ ... ];
function buildCards(data) { ... }
buildCards(DATA);
</script>
{{ end }}
```

**B) External JS file**. For larger scripts like `ns.js`:

```bash
# Create the file
themes/maks/static/js/my-topic.js
```

```html
{{ define "scripts" }}
<script src="{{ "js/my-topic.js" | relURL }}"></script>
<script>
  // inline init only - references functions from my-topic.js
  initMyTopic(DATA);
</script>
{{ end }}
```

---

## Type 3: Certification page

Cert pages use a dedicated template `certs/single.html` that auto-generates an accordion of exam topics with linked articles. No custom layout needed, just the content file with the right frontmatter.

### Step 1: create the file

```bash
content/certs/my-cert.md
```

### Step 2: write frontmatter

```yaml
---
title: "CKA"
cert_badge: "⚙️"
cert_color: "#10b981"
description: "Certified Kubernetes Administrator"
post_prefix: "cka"
exams:
  - code: "CKA"
    title: "Certified Kubernetes Administrator"
    topics:
      - {num: "01", title: "Cluster Architecture"}
      - {num: "02", title: "Workloads & Scheduling"}
      - {num: "03", title: "Services & Networking"}
---
```

**How `post_prefix` + `num` links articles to topics:**

The template builds a pattern `{post_prefix}-{num}-` and matches it against article file slugs.

```
post_prefix = "cka"
topic.num   = "01"
pattern     = "cka-01-"

Matches:  content/posts/cka-01-cluster-architecture.md  ✓
          content/posts/cka-01-etcd-backup.md            ✓
No match: content/posts/cka-02-deployments.md            ✗
```

> **Important:** `num` values must be strings. YAML interprets bare numbers as integers, which breaks the string matching in the template. Use `"01"` not `01`.

### Step 3: add the cert to the widget

Open `themes/maks/layouts/partials/certs-widget.html` and add a card to the grid:

```html
<a href="/certs/my-cert/" class="cert-card" style="--cert-color:#10b981">
  <div class="cert-top">
    <div class="cert-badge">⚙️</div>
    <div class="cert-name">CKA</div>
  </div>
  <div class="cert-sub">Certified Kubernetes Administrator</div>
  <div class="progress-bar">
    <div class="progress-fill" style="width:0%"></div>
  </div>
  <div class="progress-label">
    <span>Planned</span>
    <span class="pct">0%</span>
  </div>
</a>
```

> The progress percentage is hardcoded, update it manually as you progress.

---

## Type 4: Network Engineer / bilingual course post

For Network Engineer labs and similar course posts. Uses the standard `_default/single.html` but requires paired EN/RU files and specific content conventions.

### Step 1: create the EN file

```bash
content/posts/neteng/neteng-NN-my-topic.md
```

```yaml
---
title: "Network Engineer NN. My Topic"
date: 2026-01-01
description: "..."
tags: ["Networking", "OSPF"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "en"
lang_pair: "/posts/neteng/ru/neteng-NN-my-topic/"
---
```

### Step 2: create the RU file

```bash
content/posts/neteng/ru/neteng-NN-my-topic.md
```

```yaml
---
title: "Network Engineer NN. Topic"
date: 2026-01-01
description: "..."
tags: ["Networking", "OSPF"]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "ru"
lang_pair: "/posts/neteng/neteng-NN-my-topic/"
pagefind_ignore: true
build:
  list: never
  render: always
---
```

### Content conventions

- Top heading is `##` (h2), never `#` (h1)
- Long CLI outputs go in `<details>` blocks, never bare fenced code blocks:

```html
<details>
<summary>RouterName - command description</summary>
<pre><code>
... output ...
</code></pre>
</details>
```

- Short config snippets (≤5 lines) can use plain ` ``` ` blocks
- Sections separated with `---`
- Last line: `*Network Engineer Course | Lab NN*`
- Images in `static/img/neteng/NN/`, named sequentially `1.png`, `2.png` …

---

## Using the topology shortcode

Network diagrams expressed as ASCII inside fenced code blocks are considered legacy. Use the `topology` shortcode instead.

```
{{</* topology cols="4" rows="3" caption="OSPF baseline" */>}}
  cloud  ISP    "AS 64512"   at 0,1
  router R1     "GW · BGP"   at 1,1
  switch CORE   "VLAN 10/20" at 2,1
  server srv-01 "10.0.10.4"  at 3,0
  server srv-02 "10.0.10.5"  at 3,2

  ISP  — R1
  R1   — CORE  label="trunk · 1G"
  CORE — srv-01
  CORE — srv-02
{{</* /topology */>}}
```

**Node kinds:** `router` `switch` `server` `cloud` `pc` `fw`

**Coordinates:** `at col,row` (0-indexed). **Links:** `A — B` or `A — B label="text"`.

Migration rule: when migrating an EN post that uses ASCII topology diagrams, migrate the `ru/` shadow in the same commit.

---

## Adding a bilingual page

To make a page switchable between EN and RU:

### English version

```yaml
---
title: "My Topic"
page_lang: "en"
lang_pair: "/kb/docs/ru/my-topic/"
---
```

### Russian version

```bash
content/kb/docs/ru/my-topic.md
```

```yaml
---
title: "My topic"
page_lang: "ru"
lang_pair: "/kb/docs/my-topic/"
pagefind_ignore: true
build:
  list: never
  render: always
---
```

The `setLang()` function in `baseof.html` reads `lang_pair` from `<meta id="page-lang">` and redirects when the user switches language. Without these fields the language buttons only toggle their visual state, no redirect happens.

> **Important:** always add `pagefind_ignore: true` and `build: {list: never, render: always}` to RU pages, without them the page appears in listings and the search index.

---

## Pre-flight checklist

Before pushing a new page:

```bash
# 1. Build without errors
hugo

# 2. Check the page renders correctly
hugo server --disableFastRender
# Open http://localhost:1313/posts/my-topic/

# 3. Verify CSS loads (no 404 in DevTools Network tab)

# 4. Test dark/light theme toggle

# 5. Test on mobile viewport (DevTools → Toggle device toolbar)

# 6. If you used a new layout - verify the layout file name
#    matches the `layout:` field in frontmatter exactly
```

---

## Related pages

- [Project Overview](/kb/docs/overview/)
- [Frontmatter](/kb/docs/frontmatter/)
- [Templates](/kb/docs/templates/)
- [CSS](/kb/docs/css/)
- [JavaScript](/kb/docs/javascript/)
