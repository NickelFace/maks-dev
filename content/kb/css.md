---
title: "CSS — Architecture & Class Reference"
date: 2026-04-11
description: "CSS file structure, theme variables, and full class reference for maks.top"
page_lang: "en"
lang_pair: "/kb/ru/css/"
tags: ["docs"]
---

## CSS architecture

Styles are split into 6 files by **scope** (area of application):

| File | Size | Loaded | Purpose |
|---|---|---|---|
| `global.css` | 757 lines | everywhere | Variables, nav, base components |
| `mobile.css` | 440 lines | everywhere | Mobile nav, breakpoints |
| `home.css` | 110 lines | `/` only | Hero, recent posts, KB, cert-grid |
| `prose.css` | 164 lines | posts, about | Article typography, ns-card in markdown |
| `cert.css` | 189 lines | `/certs/*` | Accordion, cert-hero, exam blocks |
| `ns.css` | 258 lines | `/posts/linux-namespaces/` | Namespace explorer |

Loading in `baseof.html`:
```html
<link rel="stylesheet" href="/styles/global.css">   <!-- always -->
{{ if .IsHome }}<link href="/styles/home.css">{{ end }}
{{ if or (eq .Type "posts") (eq .Type "about") }}<link href="/styles/prose.css">{{ end }}
<link rel="stylesheet" href="/styles/mobile.css">   <!-- always -->
{{ block "head" . }}{{ end }}  <!-- child template can add cert.css or ns.css -->
```

---

## CSS variables — themes

Variables are declared on `[data-theme="dark"]` and `[data-theme="light"]`:

| Variable | Dark | Light | Purpose |
|---|---|---|---|
| `--accent` | `#00d4ff` | `#00d4ff` | Primary accent (cyan) |
| `--accent2` | `#7c3aed` | `#7c3aed` | Secondary accent (purple) |
| `--accent3` | `#10b981` | `#10b981` | Third accent (green) |
| `--warn` | `#f59e0b` | `#f59e0b` | Warning (amber) |
| `--bg` | `#0a0e17` | `#f5f7fa` | Main background |
| `--bg2` | `#111827` | `#ffffff` | Cards, panels |
| `--bg3` | `#1a2235` | `#eef2f8` | Hover states |
| `--border` | `#1e2d45` | `#d1dbe8` | Borders |
| `--border2` | `#263347` | `#c2cfe0` | Borders (darker) |
| `--text` | `#e2e8f0` | `#1a2235` | Primary text |
| `--text2` | `#94a3b8` | `#475569` | Secondary text |
| `--text3` | `#64748b` | `#94a3b8` | Muted text (date, meta) |
| `--glow` | `rgba(0,212,255,0.08)` | `rgba(0,150,180,0.08)` | Hover highlight with accent |
| `--shadow` | `0 4px 24px rgba(0,0,0,0.4)` | `0 4px 24px rgba(0,0,0,0.08)` | Element shadow |
| `--nav-blur` | `rgba(10,14,23,0.85)` | `rgba(245,247,250,0.85)` | Nav background with transparency |
| `--tag-bg` | `rgba(0,212,255,0.08)` | `rgba(0,150,180,0.08)` | Tag background |

**How theme switching works technically:**
1. JS sets `document.documentElement.setAttribute('data-theme', 'light')`
2. CSS `[data-theme="light"]` overrides all variables
3. All components use `var(--bg)` etc. — automatically recolored

---

## global.css — class reference

### Reset and base styles

| Class / Selector | Description |
|---|---|
| `*, *::before, *::after` | `box-sizing: border-box`, margin/padding reset |
| `body` | `background: var(--bg)`, `color: var(--text)`, JetBrains Mono font |
| `a` | `color: inherit`, `text-decoration: none` |

### Navigation (desktop)

| Class | Description |
|---|---|
| `.desk-nav` | Flex container: logo + links + right panel. `position: sticky; top: 0; z-index: 100` |
| `.nav-logo` | Logo with gradient text (`--accent` → `--accent2`) |
| `.nav-links` | List of nav links |
| `.nav-links a.active` | Active link: `color: var(--accent)` |
| `.nav-right` | Lang-toggle + theme button |
| `.lang-btn` | EN/RU buttons. `localStorage.lang` stores the choice |
| `.lang-btn.active` | Active language: border-color accent |
| `.theme-btn` | 🌙/☀️ theme toggle button |

### Breadcrumbs

| Class | Description |
|---|---|
| `.breadcrumb` | Flex row with `/` separators. Rendered in `single.html` and `certs/single.html` |

### Panels

| Class | Description |
|---|---|
| `.panel` | Card: `background: var(--bg2)`, `border`, `border-radius: 10px`, `padding: 20px` |
| `.panel-head` | Flex panel header: `.panel-title` + `.panel-more` |
| `.panel-title` | Panel heading (uppercase, small font) |
| `.panel-more` | "all →" link on the right in the header |
| `.sec-title` | H2 section heading (Unbounded font, gradient) |

### Articles (post-card)

| Class | Description |
|---|---|
| `.posts-list` | Flex column with gap |
| `.post-card` | Article card: `background: var(--bg2)`, lifts 2px on hover |
| `.post-card-meta` | Row: date + tags |
| `.post-card-title` | Article title in card |
| `.post-card-desc` | Short description (`color: var(--text3)`) |
| `.post-date` | Date in YYYY-MM-DD format |

### Tags

| Class | Description |
|---|---|
| `.tag` | `display: inline-flex`, `background: var(--tag-bg)`, `border`, `border-radius: 4px` |
| `.tag:hover` | `border-color: var(--accent)`, `color: var(--accent)` |
| `.tag.active` | Same as hover — for active filter on `/tags/` |
| `button.tag` | Button style reset when using `<button>` with `.tag` class |
| `.tag-lg` | Larger tag (on `/tags/` page): `font-size: 12px`, `padding: 6px 14px` |
| `.tag .count` | Count inside tag: `color: var(--text3)` |
| `.tags-header` | Tags page heading: sec-title + search-wrap |
| `.tags-grid` | `display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 48px` |
| `.tag-filter` | Tag button on `/tags/` page |

### Pagination

| Class | Description |
|---|---|
| `.pagination` | Flex container of pagination buttons |
| `.pg-btn` | Page button/link |
| `.pg-btn.pg-active` | Current page: `background: var(--accent)`, white text |
| `.pg-btn.pg-disabled` | Inactive arrow |
| `.pg-arrow` | Arrow button (prev/next) |
| `.pg-ellipsis` | `···` between pages |
| `.pg-info` | `N / Total` counter |

### Search

| Class | Description |
|---|---|
| `.search-wrap` | `position: relative` — container for absolutely positioned results |
| `.search-input` | Search input: `background: var(--bg2)`, `border`, Mono font |
| `.search-icon` | ⌕ icon — absolutely positioned to the right inside input |
| `#searchResults` | Created by JS dynamically. Absolute, `z-index: 50`, max-height 400px |

### Code blocks

| Class | Description |
|---|---|
| `.code-block` | Wrapper: border + border-radius |
| `.code-label` | Block header: language + label + copy button |
| `.copy-btn` | "copy" → "ok!" button, reverts after 1.5s |
| `.copy-btn.copied` | State after copying: `color: var(--accent3)` |

### Certifications (cert-grid)

| Class | Description |
|---|---|
| `.cert-grid` | 4-column grid (with breakpoints) |
| `.cert-card` | Cert card: `--cert-color` custom variable for color |
| `.cert-top` | Flex: badge + name |
| `.cert-badge` | Emoji icon |
| `.cert-name` | Name (Unbounded font, `color: var(--cert-color)`) |
| `.cert-sub` | Subtitle (small, gray) |
| `.progress-bar` | Gray progress bar |
| `.progress-fill` | Fill (width in % set via inline style) |
| `.progress-label` | Flex: status text + percentage |
| `.pct` | Percentage on the right |

---

## mobile.css — class reference

### Mobile navigation

| Class | Description |
|---|---|
| `.mob-nav` | `display: none` on desktop, flex on mobile. Sticky, blur-background |
| `.mob-nav-right` | Flex: theme-btn + burger |
| `.burger` | Hamburger menu button (3 lines) |
| `.burger span` | Burger lines, animated on open |
| `.burger.open span:nth-child(1)` | Top line: `rotate(45deg)` |
| `.burger.open span:nth-child(3)` | Bottom line: `rotate(-45deg)` |
| `.mob-drawer` | Slide-out menu: `position: fixed`, transforms on slide-in |
| `.mob-drawer.open` | Visible state |
| `.mob-overlay` | Semi-transparent overlay behind drawer |
| `.mob-bottom-nav` | Bottom navigation bar (Home, Blog, Certs, KB) |
| `.mob-bnav-item` | Bottom bar item: icon + label |
| `.mob-bnav-item.active` | Active item: `color: var(--accent)` |

### Responsive breakpoints

| Breakpoint | What changes |
|---|---|
| `max-width: 860px` | `.desk-nav` hidden, `.mob-nav` + `.mob-bottom-nav` visible; `.has-toc` not applied |
| `max-width: 560px` | Reduced padding, font-size; `.cert-grid` → 2 columns |

---

## prose.css — article typography

Applied to `.prose` (article body). Styles standard HTML elements from markdown:

| Selector | Description |
|---|---|
| `.prose h2, .prose h3` | Headings with `border-bottom: 1px solid var(--border)` |
| `.prose code` | Inline code: `background: var(--bg3)`, monospace |
| `.prose pre` | Code block: `overflow-x: auto`, padding |
| `.prose blockquote` | Quote: `border-left: 3px solid var(--accent)`, indent |
| `.prose table` | Table: `border-collapse: collapse`, full width |
| `.prose th` | Table header: `background: var(--bg3)` |
| `.prose td, .prose th` | Cells: `border: 1px solid var(--border)`, padding |
| `.prose a` | Links: `color: var(--accent)` with underline |
| `.prose strong` | Bold: `color: var(--text)` |
| `.prose ul, .prose ol` | Lists with indentation |

### ToC sidebar (in single.html)

| Class | Description |
|---|---|
| `.prose-page` | Page container, switches to grid with `.has-toc` |
| `.prose-page.has-toc` | `display: grid; grid-template-columns: 1fr 240px` |
| `.toc-aside` | Right ToC column, sticky |
| `.toc-inner` | ToC card |
| `.toc-title` | "Contents" heading |
| `.toc-item` | Link to a heading |
| `.toc-item.toc-h3` | H3 — shifted left by 12px |
| `.toc-item.cur` | Active heading: `color: var(--accent)` |

---

## cert.css — certification pages

| Class | Description |
|---|---|
| `.cert-hero` | Hero block with badge, name, description. `--cert-color` sets border color |
| `.cert-stats` | Stats row (exams · topics · articles) |
| `.exam-block` | Group of topics for one exam |
| `.exam-label` | Exam heading (uppercase, `color: var(--text3)`) |
| `.cert-topic` | One accordion item |
| `.cert-topic.has-posts` | Topic with posts (others are not clickable) |
| `.cert-topic.open` | Expanded state: border-color → accent |
| `.cert-topic-head` | Accordion header button |
| `.topic-num` | Topic number (e.g. "200"): `color: var(--accent)` |
| `.topic-title` | Topic name: `color: var(--text)` |
| `.topic-meta` | Article count or "no articles yet" |
| `.topic-chevron` | `›`, rotates 90° with `.open` |
| `.cert-topic-body` | Accordion body: `max-height: 0` → `scrollHeight` via JS |
| `.cert-post-link` | Link to an article inside a topic |
| `.cert-post-title` | Article title: `color: var(--accent)` |
| `.cert-post-desc` | Article description: `color: var(--text2)` |
| `.cert-coming-soon` | Placeholder for pages without content |

---

## Related pages

- [Project Overview](/kb/overview/)
- [Templates](/kb/templates/)
- [Frontmatter](/kb/frontmatter/)
- [JavaScript](/kb/javascript/)
