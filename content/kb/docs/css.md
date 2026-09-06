---
title: "CSS: Architecture & Class Reference"
date: 2026-04-15
description: "CSS file structure, theme variables, and full class reference for maks.top"
page_lang: "en"
lang_pair: "/kb/docs/ru/css/"
tags: ["docs"]
---

## CSS architecture

Styles are split into 11 files by **scope** (area of application):

| File | Location | Loaded | Purpose |
|---|---|---|---|
| `critical.css` | `themes/maks/assets/css/` | inlined in `<head>` | FOUC prevention: dark/light `html,body` bg + `no-transition` rule |
| `global.css` | `themes/maks/static/styles/` | everywhere | Variables, nav, base components, dot-grid pagination |
| `mobile.css` | `themes/maks/static/styles/` | everywhere | Mobile nav, breakpoints |
| `fonts.css` | `themes/maks/static/styles/` | everywhere | `@font-face` for Inter (body), JetBrains Mono (code). Fraunces loaded via Google Fonts `<link>` in `baseof.html` |
| `prose.css` | `themes/maks/static/styles/` | posts, about, kb, ccna-labs singles | Article typography, NS cards/tabs/ref-panel, section divider, mobile overflow containment |
| `home.css` | `themes/maks/static/styles/` | `/` only | Hero, recent posts, KB grid, cert-grid |
| `cert.css` | `themes/maks/static/styles/` | `/certs/*` | Cert hero, resource tiles, accordion topics, certs index page |
| `ns.css` | `themes/maks/static/styles/` | `/kb/linux-namespaces/` | Two-column page layout, TOC sidebar, reading progress, cheatsheet filter row |
| `topology.css` | `themes/maks/static/styles/` | posts, kb, ccna-labs + troubleshooting singles | `.topology` figure + SVG diagram styles |
| `trainers.css` | `themes/maks/static/styles/` | trainers list + singles | Section chrome, and a re-mapping of the ported drills' own tokens (`--surface`, `--muted`, `--ok`/`--bad`) onto the site palette so they follow the theme switch |
| `chroma.css` | `themes/maks/static/styles/` | posts, kb, ccna-labs + troubleshooting singles | Syntax highlighting. Also **declares the `--code-*` token palette**, per theme, that `prose.css`, `code.css` and `ns.css` read |

Fenced code blocks are rendered by `themes/maks/layouts/_default/_markup/render-codeblock.html`.
`render-codeblock-mermaid.html` sits beside it and wins for ```` ```mermaid ````, since Hugo
prefers a language-specific hook over the generic one.

Loading in `baseof.html`:
```html
<!-- Inlined via Hugo asset pipeline - single source of truth for FOUC colors -->
{{ with resources.Get "css/critical.css" | minify }}<style>{{ .Content | safeCSS }}</style>{{ end }}

<link rel="stylesheet" href="/styles/fonts.css">    <!-- always -->
<link rel="stylesheet" href="/styles/global.css">   <!-- always -->
{{ if or (eq .Type "posts") (eq .Type "kb") (and (or (eq .Type "ccna-labs") (eq .Type "troubleshooting")) .IsPage) }}
  <link rel="stylesheet" href="/styles/chroma.css">{{ end }}
{{ if .IsHome }}<link rel="stylesheet" href="/styles/home.css">{{ end }}
{{ if or (eq .Type "posts") (eq .Type "about") (eq .Type "kb") (and (or (eq .Type "ccna-labs") (eq .Type "troubleshooting")) .IsPage) }}
  <link rel="stylesheet" href="/styles/prose.css">{{ end }}
{{ if or (eq .Type "posts") (eq .Type "kb") (and (or (eq .Type "ccna-labs") (eq .Type "troubleshooting")) .IsPage) }}
  <link rel="stylesheet" href="/styles/topology.css">{{ end }}
<link rel="stylesheet" href="/styles/mobile.css">   <!-- always -->
{{ block "head" . }}{{ end }}  <!-- cert.css / ns.css added here -->
```

> **Why `critical.css` is inlined:** Dark/light background colors must be applied before any external CSS loads to prevent a white flash on navigation. `critical.css` lives in `assets/` so Hugo can read and inline it at build time via `resources.Get`. **When changing theme colors, update `critical.css` AND `global.css` `:root`; they must stay in sync.**

---

## CSS variables: themes

The palette is **Slate** — a cold blue-grey base with a single blue accent. Dark is the
default and is declared on `:root`; light overrides it on `[data-theme="light"]`. Both
themes share the same hue family (accent hue 232), so the site does not change
personality when the auto day/night switch flips.

| Variable | Dark (`:root`) | Light | Purpose |
|---|---|---|---|
| `--accent` | `oklch(0.75 0.10 232)` | `oklch(0.51 0.12 232)` | Links, focus, progress, **in-progress** status |
| `--accent2` | `oklch(0.74 0.09 168)` | `oklch(0.52 0.09 168)` | **passed** status only |
| `--accent3` | `#838F9C` | `#616E78` | **planned** status — an alias of `--text3`, not a hue of its own |
| `--warn` | `#f59e0b` | `#f59e0b` | Warning (amber) |
| `--danger` | `#ef4444` | `#ef4444` | Danger / error (red) |
| `--bg` | `#0E1319` | `#F7F9FB` | Page background |
| `--bg2` | `#141B23` | `#EFF3F7` | Surfaces, panels, nav blur base, writing band |
| `--bg3` | `#1C242E` | `#E4EAF1` | Raised: inline code, hover rows |
| `--border` | `#242D38` | `#D8E0E9` | Hairlines, grid gaps |
| `--border2` | `#33404E` | `#BFCAD6` | Inputs, pill outlines |
| `--text` | `#E6EBF1` | `#131A21` | Primary text |
| `--text2` | `#A2AEBB` | `#48555F` | Body copy, leads |
| `--text3` | `#838F9C` | `#616E78` | Meta, mono labels, card descriptions |
| `--glow` | `oklch(0.75 0.10 232 / 0.14)` | `oklch(0.51 0.12 232 / 0.14)` | Focus ring, tag hover |
| `--tag-bg` | `oklch(0.75 0.10 232 / 0.10)` | `oklch(0.51 0.12 232 / 0.10)` | Tag background |
| `--shadow` | `0 1px 0 rgba(0,0,0,0.4), 0 16px 40px -20px rgba(0,0,0,0.5)` | `0 1px 0 rgba(19,26,33,0.04), 0 12px 32px -16px rgba(19,26,33,0.18)` | Box shadow |
| `--nav-blur` | `rgba(14,19,25,0.90)` | `rgba(247,249,251,0.92)` | Nav backdrop blur color |
| `--code-bg` | `#0A0E13` | `#EDF1F7` | Code block well — light since the light code palette landed |
| `--grid-line` | `transparent` | `transparent` | Reserved |
| `--radius` | `6px` | `6px` | Border-radius base |

`--h1-hero`, `--h1-page` and `--h1-article` are also declared on `:root` and are not
theme-dependent — see the type scale in [Templates](/kb/docs/templates/).

> **Contrast is measured, not eyeballed.** `--text3` colours card descriptions at 12.5 px,
> cert sub-lines and post dates, so it is body text and has to clear WCAG AA on all three
> surfaces. Dark `#838F9C` measures 5.6 / 5.2 / 4.7:1 on `--bg` / `--bg2` / `--bg3`; light
> `#616E78` measures 4.96 / 4.70. The light `--accent` sits at L 0.51 rather than the
> dark theme's L 0.75 because `prose.css` renders inline `code` as accent-on-`--bg3`, which
> is the binding case at 4.55:1. Do not "tidy" these values.

**Per-component variables** (set via inline `style=""`):

| Variable | Set by | Description |
|---|---|---|
| `--cert-color` | `certs/single.html`, `partials/certs-widget.html` | **Status** colour for one cert track, never a per-track brand hue. Resolves to `var(--accent2)` (passed), `var(--accent)` (in progress) or `var(--text3)` (planned) via the `$stateFor` dict |

The old `--c` variable — a per-card hue on NS cards, map buttons, tabs and filter buttons —
was removed along with the nine `--ns-*` namespace colours. Those components now colour by
**state** off `--accent`; see [NS components](#shared-components) below.

`cert_color` still exists in `content/certs/*.md` frontmatter but no template resolves it.

---

## Code token palette (`chroma.css`)

Each theme has its own set. Only the properties are redeclared — there is no second set of
`.chroma` rules — so a token added here reaches both themes at once, and the hue roles hold
across them: cyan is always the command, purple always the keyword. `prose.css`, `code.css`
and `ns.css` read the same variables instead of hard-coding hex. Tuned for Bash, which is
3 400+ of the site's fenced blocks.

| Variable | Dark | Light | Role | Dark / light contrast |
|---|---|---|---|---|
| `--code-fg` | `#D6DEE8` | `#263140` | Plain text, paths, flags | 19.0 / 12.4 |
| `--code-cmd` | `#7FD1DE` | `#0A6B7C` | Commands, builtins, functions | 11.0 / 5.5 |
| `--code-str` | `#D5C08A` | `#8A5B12` | Strings, heredocs | 10.7 / 5.0 |
| `--code-kw` | `#B49BE8` | `#6A3FBF` | Keywords, operators, pipes | 8.1 / 6.0 |
| `--code-var` | `#9DC1F0` | `#2E5FA8` | `$VAR`, `${expansion}` | 10.3 / 5.6 |
| `--code-num` | `#8FD6B4` | `#16714F` | Numbers, added lines | 11.4 / 5.3 |
| `--code-out` | `#94A3B4` | `#4E5A6B` | Program output, prompts | 7.4 / 6.3 |
| `--code-cmt` | `#7E8C9E` | `#576475` | Comments — the contrast floor | 5.5 / 5.3 |
| `--code-err` | `#F08C8C` | `#B3261E` | Errors, removed lines | 9.5 / 5.8 |
| `--code-gut` | `#4C596A` | `#667485` | Line numbers | — / 5.4 |
| `--code-hl` | `#16202D` | `#DCE6F5` | Highlighted line background | — |
| `--diff-add-bg` | `#101E19` | `#DFF0E6` | Added diff row | — |
| `--diff-del-bg` | `#211416` | `#F8E3E1` | Removed diff row | — |

Everything except strings is cool. Strings stay warm deliberately — one warm hue inside a
code block is the cheapest way to break up a quoted argument, and it is the only place
warmth survives in the Slate palette.

**The light set is hand-tuned, not derived.** It sits in a narrow 5.0–6.3 band; inverting
the dark values algorithmically puts cyan and green below AA. If you retune a hue,
re-measure it.

**Diff tints are properties, not alphas.** The dark rows used to tint with a 10% alpha of
the row colour, but a 10% alpha of `#16714F` over `#EDF1F7` is invisible, so both themes
now take a solid value. The 2px rail and the literal `+`/`-` stay — three signals, so the
block still reads for a red-green colourblind reader.

Making the tints solid exposed a bug they had been hiding: the row spans are
`display:block` and were joined with `\n`, so inside a `<pre>` every diff line was followed
by an empty one. `shortcodes/diff.html` now joins the rows with nothing.

**Chrome is separate from syntax.** `--code-chrome-bg`, `--code-chrome-fg`, `--code-border`,
`--code-inline-bg` and `--code-inline-fg` are page surfaces rather than token colours, so
they live in `global.css` next to the other theme variables. Inline `<code>` never sits on
`--code-bg`: a chip matching the block well reads as a broken block.

`/dev/code/` renders one of every block type through the real shortcodes and is `noindex`.
It is the regression test — open it, toggle the theme, and a palette change is checked in
about ten seconds.

### `.cmd` — the command name

Chroma tags shell builtins (`.nb`) and keywords (`.k`) but never a bare command name, so a
line like `systemctl status postgresql` came out of the highlighter with no tokens at all
and rendered flat. `render-codeblock.html` wraps the leading word of each shell line in
`.cmd`, which takes `--code-cmd`.

The regex only fires when the word sits flush against the start of the line span, so an
indented continuation is left alone, and a line that already opens with a token span — a
comment, keyword or builtin — never matches. It also requires a trailing space, tab,
newline or tag, so `FOO=bar` is not mistaken for a command.

### Commands and output are different objects

A fence with no language is **output**, not "some language we should guess at".
`hugo.toml` sets `guessSyntax = false`: with it on, Chroma labelled bare blocks
`fallback`, `gdscript` or worse and coloured them from an unrelated grammar. Output blocks
are not highlighted at all — they are the machine talking back, so they sit on a raised
surface in muted `--code-out`. Telling a command from its output at a glance is the point;
the two must never look alike.

> **Load-order caveat:** `--code-*` is declared in `chroma.css`, which loads only for
> `posts`, `kb`, `ccna-labs` and `troubleshooting` single pages. `prose.css` also loads on `about`, where
> `chroma.css` does **not**. A code block on `/about/` would therefore resolve
> `var(--code-fg)` to nothing and fall back to the inherited colour. There are no code
> blocks there today; if one is ever added, move the `--code-*` block into `global.css`.

---

## global.css: class reference

### Reset and base styles

| Class / Selector | Description |
|---|---|
| `*, *::before, *::after` | `box-sizing: border-box`, margin/padding reset |
| `body` | `background: var(--bg)`, `color: var(--text)`, `font-family: 'Inter', system-ui, sans-serif` |
| `a` | `color: inherit`, `text-decoration: none` |

### Navigation (desktop)

| Class | Description |
|---|---|
| `.desk-nav` | Flex container: logo + links + right panel. Sticky, `z-index: 100` |
| `.nav-logo` | Logo with gradient text |
| `.nav-links a.active` | Active link: `background: var(--text)`, `color: var(--bg)` (ink pill). `white-space: nowrap` keeps "Knowledge Base" on one line |
| `.lang-btn` | EN/RU buttons |
| `.theme-btn` | 28 px round theme toggle. Holds an inline `<svg><use href="/img/icons.svg#power">` power glyph in `currentColor`, so it works unchanged on both themes. Dashed border when `[data-auto="true"]`, accent ring when active |

### Breadcrumbs

| Class | Description |
|---|---|
| `.breadcrumb` | Flex row with `/` separators. Rendered site-wide via `partial "breadcrumb.html"` |
| `.breadcrumb a` | `color: var(--text3)`, hover → accent |

### Panels

| Class | Description |
|---|---|
| `.panel` | Card: `background: var(--bg2)`, border, `border-radius: 10px`, `padding: 20px` |
| `.panel-head` | Flex panel header: `.panel-title` + `.panel-more` |
| `.sec-title` | H2 section heading (gradient) |

### Articles (post-card: blog list)

| Class | Description |
|---|---|
| `.posts-list` | Flex column with gap |
| `.post-card` | Article card: lifts 2px on hover |
| `.post-card-meta` | Row: date + tags |
| `.post-card-title` | Article title in card |
| `.post-card-desc` | Short description |

### Article header (single page)

Defined in `prose.css`. Used in `_default/single.html` for all article pages.

| Class | Description |
|---|---|
| `.post-header` | Wraps `h1` + `.post-meta`. `border-bottom` separator, `margin-bottom: 28px` |
| `.post-meta` | Flex column: date on top, tags row below |
| `.post-meta .post-date` | Date in `dd/mm/yyyy` format. `color: var(--text3)` |
| `.post-meta-tags` | Flex-wrap row of tag links |

### Tags

| Class | Description |
|---|---|
| `.tag` | `display: inline-flex`, `background: var(--tag-bg)`, `border-radius: 4px` |
| `.tag:hover` | `border-color: var(--accent)`, `color: var(--accent)` |
| `.tag.active` | Active filter on `/tags/` |
| `.tag-lg` | Larger tag on `/tags/` page |

### Knowledge Base cards

Defined in a `{{ define "head" }}` style block inside `themes/maks/layouts/kb/section.html`,
not in `global.css`. The grid is a hairline grid (`gap: 1px` over a `--border` background),
not a set of floating cards.

| Class | Description |
|---|---|
| `.kb-pg-header` / `.kb-pg-header-inner` | Page header band, `max-width: 1200px`, hairline bottom |
| `.kb-pg-body` / `.kb-pg-body-inner` | Page body wrapper |
| `.kb-group` | One domain group (e.g. "Linux Core") |
| `.kb-group-hd` | Group header row: name + count, `border-bottom: 1px solid var(--text)` |
| `.kb-group-name` | Fraunces 24px group heading |
| `.kb-group-count` | JetBrains Mono 11px page count, `var(--text3)` |
| `.kb-edit-grid` | 4-column hairline grid → 3 at ≤1024px, 2 at ≤640px, 1 at ≤400px |
| `.kb-edit-card` | Cell: `background: var(--bg)`, hover → `var(--bg2)` |
| `.kb-edit-mark` | Brand mark: `<svg><use href="/img/icons.svg#…">`, `height: 26px`, `var(--text3)` → `var(--accent)` on card hover. Driven by the `mark:` frontmatter field via `partials/kb-mark.html` |
| `.kb-edit-letter` | Fallback when a page has no `mark:` — first title character in Fraunces 30px, `line-height: 0.86`, `height: 26px` so it optically matches the 26px marks and mixed rows stay level |
| `.kb-edit-title` | 15px semi-bold title |
| `.kb-edit-desc` | 12.5px description, `var(--text3)` |
| `.kb-edit-tags` / `.kb-edit-tag` | Mono 10px tag row |
| `.kb-edit-meta` | Mono 10px page count, `var(--accent)` |
| `.kb-sub-header` / `.kb-sub-body` / `.kb-sub-h1` | Sub-section landing page wrappers |

The home page has its own, separate KB block in `home.css`: `.home-kb-grid`,
`.home-kb-col`, `.home-kb-col-hd`, `.home-kb-num`, `.home-kb-count`, `.home-kb-colname`,
`.home-kb-list`, `.home-kb-more`.

> Brand marks are Simple Icons (CC0); trademarks remain their owners'. The sprite lives at
> `themes/maks/static/img/icons.svg` and is referenced externally (`/img/icons.svg#docker`)
> so it is one cached request rather than ~20 KB inlined on every page. Pages with no mark
> in the sprite — AWS CLI, SSH, Filesystem, Cheat Sheets, Processes, Network Labs,
> IP Calculator — keep the Fraunces letter.

### 404 page

| Class | Description |
|---|---|
| `.e404-page` | Two-column grid wrapper (`1fr 1fr`) |
| `.e404-left` | Left column: title, description, nav buttons |
| `.e404-right` | Right column: traceroute terminal, search input |
| `.e404-terminal` | Dark terminal block with fake traceroute output |
| `.e404-search` | Search input: submits to `/posts/?q=<term>` |

### Sticky footer

`body` uses `display: flex; flex-direction: column` + `min-height: 100vh`.  
`footer` has `margin-top: auto`; always pushed to bottom of viewport on short pages.

### Pagination (dot-grid)

Used by the blog (`pagination.html` partial).

| Class | Description |
|---|---|
| `.pg-dot-nav` | Flex container: Prev button + dot grid + Next button |
| `.pg-dot-grid` | Flex-wrap row of page number links |
| `.pg-dot` | Individual page link: small square tile |
| `.pg-dot.pg-active` | Current page: `background: var(--accent)`, `color: var(--bg)`. **Not** `#000` — that was written for the old amber accent and is unreadable on a mid-lightness blue |
| `.pg-active` | Same treatment on the Prev/Next button variant |
| `.pg-btn` | Prev / Next arrow button |
| `.pg-btn.disabled` | Inactive arrow (first/last page) |

### Search

| Class | Description |
|---|---|
| `.search-wrap` | Container for absolutely positioned results |
| `.search-input` | Search input: `background: var(--bg2)` |
| `#searchResults` | Created by JS dynamically |

### Certifications grid (home / about)

| Class | Description |
|---|---|
| `.cert-grid` | 4-column grid |
| `.cert-card` | Card carrying `--cert-color`, which holds the **status** colour |
| `.cert-badge` | Emoji icon |
| `.cert-name` | Name (`color: var(--cert-color, var(--accent))`) |
| `.cert-sub` | Subtitle |

---

## mobile.css: class reference

| Class | Description |
|---|---|
| `.mob-nav` | Mobile top nav (hidden on desktop) |
| `.burger` | Hamburger menu button (3 lines → X on open) |
| `.mob-drawer` | Slide-out menu |
| `.mob-bottom-nav` | Bottom navigation bar |
| `.mob-bnav-item.active` | `color: var(--accent)` |

| Breakpoint | What changes |
|---|---|
| `max-width: 860px` | Desktop nav hidden, mobile nav + bottom bar visible; `footer` hidden |
| `max-width: 560px` | Reduced padding; `.cert-grid` → 2 columns |

---

## prose.css: article content + shared components

Applied to `.prose` (article body) and available in any post, KB, or docs page.

### Article body

| Selector | Description |
|---|---|
| `.prose h2, .prose h3` | Headings with `border-bottom` |
| `.prose code` | Inline code: `background: var(--bg3)` |
| `.prose blockquote` | Quote: `border-left: 3px solid var(--accent)` |
| `.prose table` | Full-width, collapsed borders |
| `.prose a` | `color: var(--accent)` with underline |

### Shared components

| Class | Description |
|---|---|
| `.intro-card` | Highlighted intro block: `border-left: 3px solid var(--accent)` |
| `.sec` | Section divider: uppercase label + full-width line after |
| `.code-block` | Code wrapper: label bar + content. Emitted server-side by `layouts/_default/_markup/render-codeblock.html`, so the label is there before JS runs |
| `.code-block[data-kind="command"]` | A shell fence. Recessed `--code-bg` well, syntax highlighted |
| `.code-block[data-kind="output"]` | A fence with no language. Raised `--bg2` surface, 3px `--border2` rule down the left, text in `--code-out`, not highlighted |
| `.code-block[data-kind="code"]` | Any other language. Same well as `command`, no `.cmd` marking |
| `.code-label` | Bar: language + copy button |
| `.copy-btn` | "copy" → "ok!" (resets after 1.5s) |
| `.out-pre` | The `<pre>` inside an output block |
| `.ns-grid` | Card grid for NS cards |
| `.ns-card` | Expandable card. Animated via `@keyframes fadeUp`. No per-card colour |
| `.ns-card.active` | Expanded: `border-color: var(--accent)`; the icon and name go accent too |
| `.ns-header` | Card header: icon + name + flag + toggle chevron |
| `.ns-icon` | 38px tile holding a sprite mark: `var(--bg3)` + `var(--border)`, `var(--text3)` → `var(--text2)` on hover → `var(--accent)` when active |
| `.ns-body` | Hidden body, shown when `.active` |
| `.ns-map` | Namespace map widget |
| `.ns-map-btn` | Map tile: flex-column, icon + name + flag. Hover → `--border2` / `--text2`; `.sel` → accent |
| `.tabs` | Tab button row |
| `.tab-btn` | Tab button. Hover → `--border2` / `--text2`; `.active` → accent. Hover and active are deliberately **different** so hovering an inactive tab does not look selected |
| `.tab-content.active` | Visible tab panel |
| `.ref-panel` | Reference table wrapper |
| `.ref-panel-head` | Uppercase panel heading |
| `.ref-panel-body` | Scrollable table area |
| `.cheat-table` | Data table inside `.ref-panel` |
| `.cheat-table .mono` | `color: var(--accent)` |
| `.stag` | Inline namespace type badge: one neutral mono uppercase pill on `var(--bg3)`. The category is spelled out in the tag, so it does not also need a hue |
| `.stag-general` | The catch-all — transparent background at 75% opacity, one step back from the eight real namespace types |
| `.back-link` | "← Back to posts" link at page bottom |

### Mobile overflow containment (≤ 640 px)

Wide content inside articles never overflows the page. Single source of truth under the `MOBILE OVERFLOW CONTAINMENT` heading at the bottom of `prose.css`.

| Selector | Rule |
|---|---|
| `.prose table` | `display: block; overflow-x: auto`. Cells use `white-space: nowrap`. Header/body still align via `display: table; width: max-content` |
| `.prose pre` | `overflow-x: auto`, tighter font, thin scrollbar hint |
| `.prose pre.ascii-art` / `.ascii-art-wrap pre` | Opt-in class for non-network ASCII (trees, LDAP DITs). Disables ligatures, shrinks font on mobile, scrolls horizontally |
| `.topology` | Horizontal scroller wrapper. SVG has `min-width: 480px` so labels stay legible |
| `.prose p > code, .prose li > code` | `overflow-wrap: anywhere` for long inline code |

Page guard: `html, body { overflow-x: clip; }` in `global.css`. `min-width: 0` set on `main, .post, .prose, .kb-section, .cert-pg-header-inner`.

### ToC sidebar (in `_default/single.html`)

| Class | Description |
|---|---|
| `.prose-page.has-toc` | `display: grid; grid-template-columns: 1fr 240px` |
| `.toc-aside` | Right ToC column, sticky |
| `.toc-item` | Link to a heading |
| `.toc-item.hl` | Active heading: `color: var(--text2)`, `background: var(--bg3)`; its `.toc-dot` turns `var(--accent)` |

---

## cert.css: certification pages

| Class | Description |
|---|---|
| `.cert-hero` | Hero block. `--cert-color` sets border and text color |
| `.cert-hero-badge` | Emoji icon |
| `.cert-hero-name` | Cert name |
| `.cert-hero-desc` | Description text |
| `.cert-resources` | Flex row of resource tiles |
| `.cert-resource-card` | Tile: flex-column, icon + title + desc. Hover uses `color-mix(--cert-color)` |
| `.cert-resource-icon` | Emoji icon at top of tile |
| `.cert-resource-body` | Flex-column wrapper for title + desc |
| `.cert-resource-title` | Tile title (JetBrains Mono, bold) |
| `.cert-resource-desc` | Tile description |
| `.cert-stats` | Stats row: N exams · N topics · N articles |
| `.exam-block` | Group of topics for one exam code |
| `.exam-label` | Exam heading (uppercase) |
| `.cert-topic` | One accordion item |
| `.cert-topic.open` | Expanded: `border-color: var(--accent)` |
| `.cert-topic-head` | Accordion header button |
| `.topic-num` | Topic number: `color: var(--accent)` |
| `.topic-chevron` | `›`, rotates 90° with `.open` |
| `.cert-topic-body` | Accordion body: `max-height: 0` → `scrollHeight` via JS |
| `.cert-post-link` | Link to an article inside a topic |
| `.cert-post-title` | Article title: `color: var(--accent)` |

---

## ns.css: linux-namespaces page layout

Loads only for `/kb/linux-namespaces/`, via the `head` block in
`themes/maks/layouts/kb/linux-namespaces.html`. All shared components (NS cards, tabs, map
buttons, ref-panel, stags) are in `prose.css`.

The page follows one rule: **colour marks state, the icon marks type.** One accent, and it
only appears on the open card, the selected map button, the active tab, the active filter
and the highlighted TOC dot. At rest everything is `--text2` / `--text3`.

| Class | Description |
|---|---|
| `.ns-page-wrap` | Two-column grid: `1fr 240px` |
| `.ns-page-main` | Left content column |
| `.ns-page-aside` | Right sidebar (sticky, hidden on mobile) |
| `.toc-box` | Contents panel in sidebar |
| `.toc-item` | Heading link in TOC |
| `.toc-item.hl` | Active heading; `.toc-dot` inside turns accent |
| `.toc-dot` | Rail dot, `var(--border)` at rest |
| `.progress-box` | Reading progress panel |
| `.progress-fill` | Animated fill bar |
| `.filter-row` | Filter buttons row for cheatsheet |
| `.f-btn` | Filter button. Hover → `--border2` / `--text2` |
| `.f-btn.on` | Active filter: accent |
| `.ns-pre` | Hand-marked code block. `ns.css` no longer styles it — it inherits from `.code-block pre:not(.chroma)`; its `.cm` / `.out` spans use `--code-cmt` / `--code-out` |

---

## Related pages

- [Project Overview](/kb/docs/overview/)
- [Templates](/kb/docs/templates/)
- [Frontmatter](/kb/docs/frontmatter/)
- [JavaScript](/kb/docs/javascript/)
