# maks.top — Project Guide for Claude

## Stack
- **Hugo** static site, custom theme `themes/maks/`
- **Deploy**: GitHub Pages, branch `hugo`
- **Build**: `cd /home/maks/Documents/site/maks.top && hugo`
- **Push**: `git push origin hugo`

## Key directories
```
content/
  posts/              ← EN blog posts (section type: posts)
  posts/ru/           ← RU translations (build: list: never, render: always)
  posts/neteng/       ← Network Engineer course (EN)
  posts/neteng/ru/    ← Network Engineer course (RU)
  certs/              ← Cert overview pages (type: certs)
  kb/                 ← Knowledge base (flat EN pages + subsections)
  kb/ru/              ← KB RU translations (build: list: never, render: always)
  ccna-quiz/          ← Quiz pages p01–p49 (type: ccna-quiz)
  about/

themes/maks/
  layouts/            ← Hugo templates per section
  assets/css/         ← critical.css (inlined at build time via resources.Get)
  static/styles/      ← CSS files (loaded as external <link>)
  static/fonts/       ← Self-hosted woff2 (JetBrains Mono, Unbounded)
  static/img/         ← Images

static/img/neteng/    ← Per-lab folders: 01/, 02/, … 17/
static/img/quiz/      ← 247 JPEG images extracted from CCNA PDF
```

## CSS files and what they cover
| File | Location | Scope |
|---|---|---|
| `critical.css` | `assets/css/` | Inlined in `<head>` via `resources.Get \| minify`. Dark/light `html,body` bg + `no-transition`. **Single source of truth for FOUC colors — update here when changing theme bg.** |
| `global.css` | `static/styles/` | Variables, reset, nav, page, KB cards (.kb-card, .kb-card-meta, .kb-card-section), tags, pagination, breadcrumb, sticky footer |
| `prose.css` | `static/styles/` | Article body typography, post-header/post-meta, `.intro-card`, `.ref-panel`, `.cheat-table`, `.tabs`, `.code-block`, `.sec` divider (used in KB and posts) |
| `cert.css` | `static/styles/` | Cert overview page (hero, accordion topics) |
| `quiz.css` | `static/styles/` | CCNA quiz cards, options, scoring badges |
| `ns.css` | `static/styles/` | linux-namespaces page only (ns-specific: `.ns-card`, `.ns-grid`, `.ns-map*`, `.stag*`) |
| `home.css` | `static/styles/` | Homepage layout |
| `mobile.css` | `static/styles/` | Mobile-specific overrides |
| `fonts.css` | `static/styles/` | @font-face for self-hosted fonts |
| `chroma.css` | `static/styles/` | Hugo syntax highlighting |

## CSS variables (defined in global.css)
```css
--accent   /* cyan highlight color */
--accent2, --accent3
--bg, --bg2, --bg3  /* background layers: dark=#13151f,#1c1f2e,#252840 */
--border, --border2  /* dark=#2d3356,#353a60 */
--text, --text2, --text3
--glow     /* subtle accent glow background */
--code-bg
```

## Tags — non-clickable everywhere except /tags/ page
Tags (`<span class="tag">`) are **decorative only** across the whole site — no hover effect, no links, `pointer-events: none`. The `/tags/` taxonomy page is the only place with interactive tag buttons.
- In `_default/single.html` and `kb/single.html`: tags rendered as `<span>`, not `<a>`
- In `kb/section.html`: `.kb-card-tags .tag` and section-level tags have `cursor:default; pointer-events:none`
- In `global.css`: `.kb-card-tags .tag:hover` resets border/color to non-accent

## FOUC prevention
`themes/maks/assets/css/critical.css` is inlined into `<head>` at build time via `{{ with resources.Get "css/critical.css" | minify }}<style>{{ .Content | safeCSS }}</style>{{ end }}`. It sets `html,body` background for both themes and the `no-transition` rule. This is the **single source of truth** — do not hardcode bg colors in `baseof.html` directly.

Inline `<script>` in `<head>` reads `localStorage('theme')`, applies `data-theme="light"` if needed, and removes `no-transition` after double `requestAnimationFrame`.

**`@view-transition { navigation: auto; }`** in `global.css` enables browser page transitions but the default cross-fade shows a white frame that bypasses all inline FOUC logic. The default animation is disabled via `::view-transition-old(root), ::view-transition-new(root) { animation: none; }` — do not remove this override.

## EN/RU translation system
Applies to both posts and KB pages.
- EN file: `page_lang: "en"` + `lang_pair: "/section/ru/slug/"`
- RU file: `page_lang: "ru"` + `lang_pair: "/section/slug/"` + `pagefind_ignore: true` + `build: {list: never, render: always}`
- Toggle in `baseof.html` calls `setLang()` which navigates to `lang_pair`
- KB RU pages live in `content/kb/ru/` — `_index.md` has `build: {render: never, list: never}`
- KB pages currently translated: bash, linux-network, text-processing, iptables-nftables

## Network Engineer course post format

Posts live in `content/posts/neteng/` (EN) and `content/posts/neteng/ru/` (RU).

### Frontmatter — EN
```yaml
title: "Network Engineer — NN. Title"
date: DD-MM-YYYY
description: "..."
tags: [...]
categories: ["Network Engineer"]
code_toggle: true
page_lang: "en"
lang_pair: "/posts/neteng/ru/neteng-NN-slug/"
```

### Frontmatter — RU
```yaml
title: "Network Engineer — NN. Title"
date: DD-MM-YYYY
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
```

### Content conventions
- Top heading is **`##`** (h2), never `#` (h1)
- CLI outputs go in `<details>` blocks — never bare fenced code blocks for long outputs:
  ```html
  <details>
  <summary>RouterName — command description</summary>
  <pre><code>
  ... output ...
  </code></pre>
  </details>
  ```
- Short config snippets (≤5 lines) can use plain ` ``` ` blocks
- Sections separated with `---`
- Footer on last line: `*Network Engineer Course | Lab NN*`
- No `<p class="ru-text">` — old bilingual inline format, fully phased out

### Images
- One folder per lab: `static/img/neteng/NN/`
- Files named sequentially: `1.png`, `2.png`, `3.png`
- Lab 09's topology image (`09/1.png`) is reused in lab 10 — reference it directly, do not copy
- Lab 11's full topology (`11/1.png`) is reused in labs 12–16 — same rule
- Before deleting any image, verify it is not referenced in any other post:
  `grep -r "img/neteng/NN" content/`

### Migration checklist (old → new format)
When rewriting an old bilingual EN post:
1. Add `page_lang: "en"` to frontmatter
2. Change `# Title` → `## Title`
3. Remove all `<p class="ru-text">...</p>` blocks
4. Wrap CLI outputs in `<details>` blocks
5. Add `---` section separators
6. Add footer `*Network Engineer Course | Lab NN*`
7. Rewrite or verify the matching RU post in `ru/` using same structure

## Tags page (`/tags/`)

Template: `themes/maks/layouts/taxonomy/tag.html`

- Tag grid and counts are built **client-side from the `POSTS[]` JS array** (EN posts only) — do not use Hugo `range .Site.Taxonomies.tags` for the grid, as it would include RU posts and inflate counts.
- `POSTS[]` is populated server-side but filtered: `{{ if ne .Params.page_lang "ru" }}`.
- Arriving at `/tags/<slug>/` pre-selects that tag: grid collapses, matching articles shown immediately.
- UI elements in `.tags-bar`:
  - Toggle button: `.tag.tag-lg` — shows/hides the tag grid, text updates to reflect count.
  - Active pill: `.tag.tag-lg.active` — shows current tag + count + `×`; clicking it clears the filter.
- No separate "clear" / "All posts" button — the pill itself is the clear action.
- CSS classes reused from global tag system (`.tag`, `.tag-lg`, `.tag.active`) — no custom button styles.

## Cert pages
- `content/certs/<name>.md` — frontmatter: `post_prefix`, `exams[].topics[]`
- Template matches posts by: `strings.HasPrefix .File.BaseFileName (printf "%s-%s-" $prefix $topic.num)`
- Articles show under their topic accordion in the cert page
- List view uses `_default/list.html` — zero dates (`0001-01-01`) are hidden via `{{ if not .Date.IsZero }}`

## CCNA Quiz
- 489 questions, 49 pages (p01–p49), 10 per page
- Questions parsed from `CCNA-200-301-dumps-v8.6.pdf` — community dump, not official
- Images: `static/img/quiz/img-NNN.jpg`, mapped to questions by PDF page range (131 questions have images)
- Image mapping may have errors — user will verify manually
- Layout: `themes/maks/layouts/ccna-quiz/single.html` and `list.html`

## KB section structure

### Groups
Six groups render on `/kb/` root: `"Linux Core"`, `"Networking"`, `"Cloud & DevOps"`, `"Security"`, `"Self Learning"`, `"Cases"`.

### Flat pages (directly in `content/kb/`)
Must have `group:` to appear in the correct KB section block:
```yaml
title: "..."
description: "..."
icon: "emoji"
group: "Linux Core"   # one of the five groups above
tags: [...]
date: DD-MM-YYYY
```

### Subsections (`content/kb/{name}/`)
`_index.md` has `group:` (same as flat pages). Child articles do **NOT** have `group:` — it's only on `_index.md`.
```yaml
# _index.md
title: "Section Title"
description: "..."
icon: "emoji"
group: "Networking"
tags: [...]
date: DD-MM-YYYY   # must be a past date — Hugo skips future/today dates by default
```

### KB template notes
- `layouts/kb/section.html` handles both root `/kb/` and sub-section landing pages (via `{{ if .Sections }}`)
- `layouts/kb/single.html` — KB article single pages (tags as non-clickable spans)
- `layouts/kb/list.html` — exists but **not active** (Hugo uses `section.html` first)
- `$kbPages` in the root template filters to **direct children only** (`.File.Dir == "kb/"`) — subsection articles do not appear in the root listing

### Self Learning section
Personal lab notes live in `content/kb/self-learning/`. EN only, no RU translations. Images remain at `static/img/neteng/sl-*/`.

## Breadcrumb partial

Shared partial at `themes/maks/layouts/partials/breadcrumb.html`. Called via `{{ partial "breadcrumb.html" . }}` in all templates.
- Handles: certs (2-segment), sections (current as plain text), KB sub-pages (links to parent section via `.Parent.Title`), regular pages (section link + title)
- `$certMap` maps post sub-folders (neteng, lpic1, lpic2…) to cert page URLs

## Sticky footer

`body { display: flex; flex-direction: column }` + `footer { margin-top: auto }`.
Footer is hidden on mobile (`display: none`) — replaced by `.mob-bottom-nav`.

## Contact info (phone / email)

`phone` and `email` in `hugo.toml` are set to `""`. Values are injected at build time via env vars:
- Locally: `.env` file (gitignored) with `HUGO_PARAMS_PHONE` and `HUGO_PARAMS_EMAIL`
- CI: GitHub Secrets `CONTACT_PHONE` / `CONTACT_EMAIL`, passed to hugo build step
- `dev.sh` loads `.env` automatically before running hugo

In `about/single.html` the values are rendered as base64 `data-v` attributes and decoded by inline JS — plain text never appears in HTML output.

## Git rules
- Branch: `hugo`
- **Never add Claude co-authorship to commits**
- Commit message: concise, what + why
- Always build (`hugo`) before committing to catch errors

## Fonts
Inter (body text, wt 400–600), JetBrains Mono (monospace/code), Unbounded (display headings).
All self-hosted woff2 in `static/fonts/`, loaded via `styles/fonts.css`.
Inter subsets: `Inter-latin.woff2`, `Inter-latin-ext.woff2`, `Inter-cyrillic.woff2`, `Inter-cyrillic-ext.woff2`.

## Pagefind
Search index built during `hugo`. RU pages excluded with `pagefind_ignore: true`.
