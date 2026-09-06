---
title: "Templates: Layout Reference"
date: 2026-04-11
description: "Every Hugo template file: what it renders, data context, block structure"
page_lang: "en"
lang_pair: "/kb/docs/ru/templates/"
tags: ["docs"]
---

## How Hugo templates work

Hugo uses the Go template language. All templates live in `themes/maks/layouts/`.

**Key concepts:**
- `{{ .Field }}`: output a field value
- `{{ range .Items }}...{{ end }}`: loop over a collection
- `{{ if .Condition }}...{{ end }}`: conditional block
- `{{ partial "name.html" . }}`: include a partial, passing current context
- `{{ block "name" . }}...{{ end }}`, define a named block (in baseof)
- `{{ define "name" }}...{{ end }}`: override a block (in child templates)
- `{{ "path" | relURL }}`: convert path to relative URL
- `{{ .Value | funcName }}`, pipe: pass value into a function

---

## baseof.html: master template

**Path:** `themes/maks/layouts/_default/baseof.html`  
**Rendered for:** every page on the site (acts as a wrapper)

This is the foundation of the entire site. Every other template extends `baseof` via `define` blocks.

### Blocks that can be overridden

| Block | Location in baseof | Purpose |
|---|---|---|
| `{{ block "head" . }}` | inside `<head>` | Additional `<link>` or `<meta>` tags |
| `{{ block "main" . }}` | main content area | Page content |
| `{{ block "scripts" . }}` | before `</body>` | Inline JS specific to the page |

### What always renders (cannot be overridden)

- **Desktop nav** `.desk-nav`: logo + links + lang-toggle + theme-toggle
- **Mobile nav** `.mob-nav`: logo + burger
- **Mobile drawer** `.mob-drawer`: slide-out menu
- **Mobile bottom nav** `.mob-bottom-nav`: bottom bar with icons
- **Footer**: logo + stack + location + year
- **`<script>`**, inline: `toggleTheme()`, `setLang()`, `toggleMobMenu()`, `closeMobMenu()`, restore from localStorage

> **Note:** there is no `site.js`. The theme toggle, nav and search-overlay handlers are inlined directly in `baseof.html` so their execution order is guaranteed against the anti-flash script in `<head>`. Earlier revisions of these docs described a legacy `site.js` alongside them; no such file exists in the tree.

### How theme switching works

```html
<html data-theme="dark">   ← attribute on <html>
```

CSS reads the attribute via `[data-theme="light"]` and switches variables. The value is stored in `localStorage.theme`.

---

## index.html: home page

**Path:** `themes/maks/layouts/index.html`  
**Rendered for:** `/`  
**Defines block:** `main`

### Home page sections

| CSS class | Content | Data source |
|---|---|---|
| `.hero` | Heading + description + buttons | Hardcoded in template |
| `.panel .recent-posts` | Last 5 posts | `{{ range first 5 .Site.RegularPages }}` |
| `.panel .kb-section` | KB quick links | Hardcoded links |
| `.panel .certs-section` | Cert widget | `{{ partial "certs-widget.html" . }}` |
| `.cert-grid` | cert cards | `{{ partial "certs-widget.html" . }}`: counts computed dynamically |

---

## _default/single.html: article page

**Path:** `themes/maks/layouts/_default/single.html`  
**Rendered for:** any `single` page without a specific template  
**Used by:** all articles `/posts/*/`, `/kb/*/`, `/kb/docs/*/` (when no own template exists)  
**Defines blocks:** `head` (JSON-LD for EN pages), `main`, `scripts`

### `main` structure

```
.page.prose-page
  breadcrumb.html      ← partial: maks.top / {section} / {title}
  article
    .post-header
      h1               ← .Title
      .post-meta
        .post-date     ← .Date.Format "02/01/2006"  (dd/mm/yyyy)
        .post-meta-tags
          .tag × N     ← range .Params.tags → links to /tags/{tag}/
    .prose             ← {{ .Content }} (markdown body → HTML)
    .back-link         ← ← Back to {section}
  .toc-aside           ← empty div, populated by JS
```

### `head` block: JSON-LD structured data

Injects `<script type="application/ld+json">` with Schema.org `Article` for all EN pages (`page_lang: "en"`). Fields: headline, description, url, datePublished, dateModified, author, publisher.

### `scripts` block

Loads `assets/js/article.js` (reading bar, ToC, copy buttons, lightbox). If `code_toggle: true` in frontmatter, sets `document.body.dataset.codeToggle = 'true'` before the script loads.

---

## _default/list.html: page listing

**Path:** `themes/maks/layouts/_default/list.html`  
**Rendered for:** any section without a specific template (`/kb/docs/`, `/certs/` if no own template)  
**Defines block:** `main`

```
.page
  .sec-title           ← .Title | default .Section
  .posts-list
    .post-card × N     ← range .Paginator.Pages
      .post-card-meta  ← date + first 2 tags
      .post-card-title ← .Title
      .post-card-desc  ← .Description or .Summary (truncated to 120 chars)
  pagination.html      ← {{ partial "pagination.html" . }}
```

---

## posts/list.html: blog listing

**Path:** `themes/maks/layouts/posts/list.html`  
**Rendered for:** `/posts/`  
**Overrides:** `_default/list.html`  
**Adds:** Pagefind search

**Difference from `_default/list.html`:** explicit `page_lang ne ru` filter, adds `.tags-header` via `search-box.html` partial, loads `pagefind-search.js`.

**How Pagefind works:**
1. GitHub Actions runs `pagefind --site public` after `hugo build`
2. Pagefind crawls `public/` and creates an index in `public/pagefind/`
3. On the client, `pagefind.js` loads lazily (only on first search input)
4. Results appear in an absolutely positioned div below the input

---

## posts/linux-namespaces.html: interactive page

**Path:** `themes/maks/layouts/posts/linux-namespaces.html`  
**Rendered for:** `/posts/linux-namespaces/`  
**Loads:** `styles/ns.css` via `head` block, `js/ns.js` via `scripts` block

Fully custom layout with a two-column structure:
- Left column: markdown content + namespace map + grid + cheatsheet
- Right column: ToC + progress bar

Namespace data (`nsData`, `cheatData`) is defined in `ns.js`.

---

## about/single.html

**Path:** `themes/maks/layouts/about/single.html`  
**Rendered for:** `/about/`

Renders a profile card `.about-strip` with data from `hugo.toml [params]`:

| HTML | Source |
|---|---|
| `.about-name` | `.Site.Params.author` |
| GitHub / LinkedIn / Telegram links | `.Site.Params.github` / `.Site.Params.linkedin` / `.Site.Params.telegram` |
| `.prose` | `.Content` (body of `about.md`) |

Then inserts `{{ partial "certs-widget.html" . }}`, the same cards as on the home page.

---

## certs/single.html: cert overview page

**Path:** `themes/maks/layouts/certs/single.html`  
**Rendered for:** `/certs/lpic-2/`, `/certs/lpic-1/`, etc.  
**Loads:** `styles/cert.css` via `head` block

### Accordion build algorithm

```
1. $allPosts = all pages in the "posts" section
2. $prefix   = .Params.post_prefix (e.g. "lpic2")
3. For each exam in .Params.exams:
   For each topic in exam.topics:
     $topicPattern = "{prefix}-{topic.num}-"
     $topicPosts   = filter: pages whose BaseFileName starts with $topicPattern
     → if $topicPosts is not empty → render accordion with links
```

**Function `toggleTopic(btn)`:** toggles `.open` class on `.cert-topic`, animates `max-height` on `.cert-topic-body`.

---

## kb/section.html: KB index and sub-sections

**Path:** `themes/maks/layouts/kb/section.html`  
**Rendered for:** `/kb/` (root index) and `/kb/{sub-section}/` (sub-section landing pages)  
**Note:** `kb/single.html` and `kb/list.html` were deleted, KB articles fall through to `_default/single.html`.

Uses `{{ if .Sections }}` to branch between two layouts:

**Root `/kb/` (has child sections):**
```
.page
  breadcrumb.html
  h1 "Knowledge Base"
  .kb-section-title "Site Documentation"
  .kb-cards  ← docs pages
  .kb-section-title {group}  ← for each group: "Linux Core", "Networking", etc.
  .kb-cards
    .kb-card.kb-card-section × N  ← sub-sections (from .Sections)
    .kb-card × N                  ← regular kb pages with Params.group
```

**Sub-section `/kb/{name}/` (no child sections):**
```
.page
  breadcrumb.html
  h1 ← .Title
  p.sec-desc ← .Description
  .kb-cards
    .kb-card × N  ← .Pages.ByTitle
```

---

## taxonomy/tag.html: tags page

**Path:** `themes/maks/layouts/taxonomy/tag.html`  
**Rendered for:** `/tags/`

Embeds `POSTS[]` array and `currentTag` inline (Hugo-generated, EN only), then loads `assets/js/taxonomy.js` which handles all filter/render logic. Clicking a tag button filters the array and re-renders `.posts-list` via `innerHTML`.

---

## partials/

### certs-widget.html

Included on the home page (`index.html`) and about (`about/single.html`). Article counts and progress % are computed dynamically from `post_category` + `expected_articles` / `progress_pct` in each cert's frontmatter. See [Frontmatter](/kb/docs/frontmatter/) for cert fields.

### search-box.html

Renders the search input UI. Accepts `.placeholder` param. Used in `index.html`, `posts/list.html`, `taxonomy/tag.html`.

### pagination.html

Accepts a context with `.Paginator`. Always shows first/last page, `cur-1`, `cur`, `cur+1`, inserts `···` for gaps.

---

## 404.html: not found page

**Path:** `themes/maks/layouts/404.html`

Two-column layout:
- **Left:** eyebrow `§ Error 404` → Fraunces "Lost" + italic amber "packet." → mono `TTL EXPIRED · NO ROUTE TO HOST` → description → nav buttons
- **Right:** eyebrow `§ Diagnostic` → fake traceroute terminal → search input

`window.location.pathname` is injected into the traceroute output via JS. The search input redirects to `/posts/?q=<term>` on submit. Pressing `/` focuses the search input.

CSS classes: `.e404-page`, `.e404-left`, `.e404-right`, `.e404-terminal`, `.e404-search`, all in `global.css`.

---

## Mermaid render hook

**Path:** `themes/maks/layouts/_default/_markup/render-codeblock-mermaid.html`

Wraps ` ```mermaid ` code blocks in `<pre class="mermaid">` and sets a `hasMermaid` flag in page store. `_default/single.html` uses the flag to conditionally load Mermaid ESM from CDN only on pages that need it.

---

## shortcodes/

### `code`

```markdown
{{</* code lang="bash" label="example" */>}}
command
{{</* /code */>}}
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `lang` | string | `"bash"` | Language shown in block header |
| `label` | string | n/a | Additional label (small text) |

Renders `.code-block` with a copy button. `.Inner`, body between tags, passed through `htmlEscape`.

### `topology`

Declarative SVG network diagram. Replaces ASCII art topology in posts and labs.

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

| Parameter | Required | Description |
|---|---|---|
| `cols` | yes | Number of grid columns |
| `rows` | yes | Number of grid rows |
| `caption` | no | Caption below the diagram |

Node line format: `{kind} {id} "{label}" at {col},{row}`  
Link line format: `{id} — {id}` or `{id} — {id} label="{text}"`

**Node kinds:** `router` `switch` `server` `cloud` `pc` `fw` (and fallback generic rect).

`cols` and `rows` are a floor, not a limit: the canvas is sized from the nodes
actually placed, so a node past the declared grid widens the diagram instead of
being cropped off the edge.

**Where labels go.** A link label is not simply dropped at the midpoint of its
line — that midpoint sits exactly on the upper node's caption whenever the link
is vertical. The shortcode places it by orientation:

| Link shape | Label position |
|---|---|
| level (same row), label fits the gap between the icons | midpoint, 6px above the line |
| level, label wider than the gap | midpoint, 30px above — clear of the icons |
| vertical or diagonal | 72% of the way down from the upper node |

Node captions and link labels are both drawn on an opaque `--bg2` plate — the
figure's own surface — so a line passing behind either is cut off rather than
drawn through the text. Labels render in a layer after the nodes, so a long one
is never painted over by an icon. A caption longer than 20 runes scales down to
fit its cell.

Styles are in `topology.css`. Loaded on `posts`, `kb`, `ccna-labs` and `troubleshooting` single pages.

### `step` and `verify`

The two halves of a lab task. Used throughout `content/ccna-labs/`.

```markdown
{{</* step num="3" dev="R1" title="Enable OSPF on the LAN side" */>}}
Body is markdown. Code fences inside keep IOS tokenisation and the
copy-config button — the render hook still fires through `markdownify`.
{{</* /step */>}}

{{</* verify dev="R1" cmd="show ip ospf neighbor" */>}}
What the output should say, and what it means if it does not.
{{</* /verify */>}}
```

| Parameter | Used by | Description |
|---|---|---|
| `num` | `step` | Step number shown in the badge |
| `dev` | both | Device the step belongs to, shown right-aligned |
| `title` | `step` | Step heading |
| `cmd` | `verify` | The command, rendered as `<code>` in the header |
| `open` | both | `"true"` renders the block already expanded |

Both render a `<details class="lab-step">`. `article.js` adds an
expand-all/collapse-all bar above the first one on the page, and opens the
ancestors of whatever a `#hash` points at — a link into a collapsed step
otherwise scrolls to nothing.

Styles live in `prose.css`, which also has to suppress the theme's generic
`details summary::before` marker or every step header carries a stray chevron.

### `rawhtml`

```markdown
{{</* rawhtml */>}}
<div id="widget">…</div>
<style>…</style>
<script>…</script>
{{</* /rawhtml */>}}
```

Passes the body through with `safeHTML` and nothing else. It exists because
Goldmark ends a raw-HTML block at the first blank line, so a self-contained
widget with blank lines in it would have had everything after the first one
re-parsed as markdown. Shortcode bodies are never template-parsed either, so JS
containing `{{` is safe inside.

Used by every page in `content/trainers/`. The only rule: the body must not
contain the closing tag itself.

### `session`, `file`, `diff`

The three explicit code block types — a terminal session, a source file with a
path and line numbers, and a unified diff. See `code.css`, and `/dev/code/` for
one of each rendered live.

### `ns-card`

```markdown
{{</* ns-card name="PID" flag="CLONE_NEWPID" icon="⚙️" color="#7c3aed"
    summary="Process ID isolation"
    desc="Detailed description..."
    host="PID 84521 on host"
    ns_view="PID 1 inside"
*/>}}
{{</* /ns-card */>}}
```

| Parameter | Required | Description |
|---|---|---|
| `name` | yes | Namespace name (PID, NET, UTS...) |
| `flag` | yes | Kernel flag (CLONE_NEWPID) |
| `icon` | yes | Emoji icon |
| `color` | yes | CSS color (hex), used for `--card-color` |
| `summary` | yes | Short description in the header |
| `desc` | yes | Full description in the expanded body |
| `host` | no | Value on the host side (visual block) |
| `ns_view` | no | Value inside the namespace (visual block) |

`.Inner`: arbitrary markdown inside the tags (e.g. code block).

---

## Related pages

- [Project Overview](/kb/docs/overview/)
- [CSS](/kb/docs/css/)
- [Frontmatter](/kb/docs/frontmatter/)
- [JavaScript](/kb/docs/javascript/)
- [Tags & Search](/kb/docs/tags-and-search/)
