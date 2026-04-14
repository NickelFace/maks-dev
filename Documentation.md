# maks.top — Project Documentation

> Personal Linux/DevOps site. Architecture, conventions, deployment, patterns.
> **Start here.** For deep-dive references, follow the links in the [Detailed docs](#detailed-docs) section.

**Live site:** https://maks.top  
**Repository:** https://github.com/NickelFace/maks.top  
**Working branch:** `hugo` (not `main` — deploy runs from here)

---

## Navigation

| Section | What's inside |
|---|---|
| [Project](#project) | Goals, stack, live links |
| [Repository structure](#repository-structure) | Full file tree |
| [Hugo config](#hugo-config) | `hugo.toml` explained |
| [CSS architecture](#css-architecture) | Load order, tokens, fonts |
| [Templates & routing](#templates--routing) | How Hugo picks layouts |
| [Shortcodes](#shortcodes) | `{{< code >}}`, `{{< ns-card >}}` |
| [JavaScript](#javascript) | Global functions, ns.js, prose |
| [Multilingual](#multilingual) | Manual EN/RU implementation |
| [CI/CD & local dev](#cicd--local-dev) | Deploy pipeline, dev server |
| [Content inventory](#content-inventory) | Posts and certs status |
| [Patterns](#patterns) | How to add a new article |
| [Known pitfalls](#known-pitfalls) | Common gotchas |
| [Detailed docs](#detailed-docs) | Links to deep-dive references |

---

## Project

**maks.top** — personal site of a Linux sysadmin / DevOps engineer (Maks, Sydney AU).

Goals:
- Interactive Linux & DevOps knowledge base
- Blog with technical articles (LPIC-2, networking, containers)
- Portfolio + certification tracker
- Learning resource combined with hands-on practice

### Stack

| Component | Technology |
|---|---|
| Generator | Hugo extended (required for SASS; min version 0.120.0) |
| Theme | Custom `themes/maks/` (git submodule) |
| Hosting | GitHub Pages (apex domain `maks.top`) |
| DNS | Cloudflare |
| Search | Pagefind (indexed after `hugo --minify`) |
| Server | Hetzner (separate, subdomain `hetzner.maks.top`) |
| CI/CD | GitHub Actions → `.github/workflows/deploy.yml` |

[↑ Navigation](#navigation)

---

## Repository structure

```
maks.top/                              ← repo root (branch: hugo)
├── hugo.toml                          # Hugo config
├── Documentation.md                   # ← this file
├── README.md                          # Quick start
├── dev.sh                             # hugo + pagefind + hugo server locally
├── .gitignore
├── .github/workflows/deploy.yml       # CI/CD pipeline
├── static/
│   ├── CNAME                          # maks.top
│   └── favicon.svg
├── content/
│   ├── about.md                       # /about/ — type: about
│   ├── posts/                         # /posts/ — 43 articles
│   │   ├── linux-namespaces.md        # Interactive (layout: linux-namespaces)
│   │   ├── lpic2-200-1-*.md           # LPIC-2 articles (standard prose layout)
│   │   └── phpldapadmin-practice.md
│   ├── certs/
│   │   ├── lpic-1.md                  # LPIC-1 (passed)
│   │   ├── lpic-2.md                  # LPIC-2 (in progress, 62%)
│   │   ├── aws-saa.md                 # AWS SAA (planned, 18%)
│   │   └── ccna.md                    # CCNA (queued, 5%)
│   ├── kb/
│   │   └── _index.md
│   └── docs/                          # Internal project documentation (also served on site)
│       ├── overview.md                # Architecture & pipeline
│       ├── css.md                     # CSS reference
│       ├── javascript.md              # JS reference
│       ├── frontmatter.md             # Frontmatter fields
│       ├── templates.md               # Layout reference
│       └── ru/                        # Russian versions of docs
└── themes/maks/                       # Theme as git submodule
    ├── theme.toml
    ├── layouts/
    │   ├── _default/
    │   │   ├── baseof.html            # Base template (nav, footer, global JS)
    │   │   ├── single.html            # Prose article (TOC + reading progress)
    │   │   └── list.html
    │   ├── index.html                 # Homepage
    │   ├── posts/
    │   │   ├── list.html              # Post list + Pagefind search
    │   │   └── linux-namespaces.html  # Interactive layout (ns.css + ns.js)
    │   ├── certs/
    │   │   └── single.html            # Cert page (cert.css)
    │   ├── about/
    │   │   └── single.html
    │   ├── kb/
    │   │   └── list.html
    │   ├── taxonomy/
    │   │   └── tag.html               # Tag page with filtering
    │   ├── partials/
    │   │   ├── pagination.html        # Custom pagination
    │   │   └── certs-widget.html      # Certs widget (homepage + about)
    │   └── shortcodes/
    │       ├── code.html              # {{< code lang="bash" >}}...{{< /code >}}
    │       └── ns-card.html           # {{< ns-card name="PID" ... >}}
    └── static/
        ├── styles/
        │   ├── global.css             # Tokens, reset, nav, footer, base components
        │   ├── home.css               # Homepage only
        │   ├── prose.css              # Prose articles (posts, about, docs)
        │   ├── ns.css                 # Interactive pages with ns-cards
        │   ├── cert.css               # Certification pages
        │   └── mobile.css             # Responsive (640px, 860px breakpoints)
        └── js/
            └── ns.js                  # JS for linux-namespaces page
```

[↑ Navigation](#navigation)

---

## Hugo config

```toml
baseURL = "https://maks.top"
languageCode = "en"
title = "maks.top"
theme = "maks"
paginate = 10

[params]
  author   = "Maks"
  location = "Sydney, AU"
  github   = "https://github.com/NickelFace"
  linkedin = "https://www.linkedin.com/in/lopunov/"
  telegram = "https://t.me/nickelface"

[markup.goldmark.renderer]
  unsafe = true   # REQUIRED — otherwise HTML/JS in markdown won't render
```

[↑ Navigation](#navigation)

---

## CSS architecture

### Load order (in `baseof.html`)

```
global.css
→ home.css        (only if .IsHome)
→ prose.css       (if type: posts, about, or docs)
→ mobile.css      (always, last)
→ {{ block "head" }}  (page-specific: ns.css for namespaces, cert.css for certs)
```

### File responsibilities

| File | When loaded | Contents |
|---|---|---|
| `global.css` | Always | CSS variables, reset, nav, footer, `.panel`, `.tag`, `.cert-card`, `.sec-title`, `.post-item`, `.kb-item`, `.about-strip`, `.search-input`, animations |
| `home.css` | `.IsHome` | Hero, tag cloud, `.main-grid`, filetree panel |
| `prose.css` | posts / about / docs | `.prose`, `.code-block`, `.copy-btn`, `.ns-card`, `.tabs`, `.ref-panel`, `.back-link` |
| `ns.css` | `{{ block "head" }}` in linux-namespaces layout | `.ns-page-wrap`, `.ns-map`, `.ns-map-btn`, `.ns-pre`, `.filter-row`, progress |
| `cert.css` | `{{ block "head" }}` in certs layout | `.cert-hero`, `.cert-page`, `.cert-topic-list` |
| `mobile.css` | Always (last) | Breakpoints 860px and 640px, mob-nav, mob-drawer, mob-bottom-nav, safe-area |

### Design tokens

```css
/* Accents */
--accent:  #00d4ff;   /* Cyan — primary */
--accent2: #7c3aed;   /* Purple */
--accent3: #10b981;   /* Green */
--warn:    #f59e0b;   /* Yellow */
--danger:  #ef4444;   /* Red */

/* Backgrounds (dark) */
--bg:   #0a0e17;   /* Page */
--bg2:  #111827;   /* Cards/panels */
--bg3:  #1a2235;   /* Nested/hover */

/* Text */
--text:  #e2e8f0;   /* Primary */
--text2: #94a3b8;   /* Secondary */
--text3: #64748b;   /* Labels/captions */

/* Utility */
--border:    #1e2d45;
--glow:      rgba(0,212,255,0.08);
--code-bg:   #0d1520;
--nav-blur:  rgba(10,14,23,0.85);
--radius:    10px;
```

Light theme overrides all variables via `[data-theme="light"]`.  
Toggle: `localStorage('theme')` → `toggleTheme()` in `baseof.html`.

### Fonts

| Font | Usage |
|---|---|
| `JetBrains Mono` | Body, code, nav |
| `Unbounded` | H1, panel headers, logo, `.sec-title` |

> Deep dive: [content/docs/css.md](content/docs/css.md)

[↑ Navigation](#navigation)

---

## Templates & routing

Hugo picks the most specific matching template:

| URL | Layout (first match) |
|---|---|
| `/` | `layouts/index.html` |
| `/posts/` | `layouts/posts/list.html` |
| `/posts/linux-namespaces/` | `layouts/posts/linux-namespaces.html` (specific) |
| `/posts/lpic2-200-1/` | `layouts/_default/single.html` (generic prose) |
| `/certs/lpic-2/` | `layouts/certs/single.html` |
| `/about/` | `layouts/about/single.html` |
| `/tags/linux/` | `layouts/taxonomy/tag.html` |

### Template blocks (`baseof.html`)

Every layout inherits `baseof.html` and can override three blocks:

```html
{{ define "head" }}
  <!-- Extra CSS/meta for the specific page -->
  <link rel="stylesheet" href="{{ "styles/ns.css" | relURL }}">
{{ end }}

{{ define "main" }}
  <!-- Page content -->
{{ end }}

{{ define "scripts" }}
  <!-- JS at end of body, AFTER external <script src="..."> tags -->
  <script src="{{ "js/ns.js" | relURL }}"></script>
  <script>
    // Initialization goes here, not before
    buildCards(NS_DATA);
  </script>
{{ end }}
```

> Deep dive: [content/docs/templates.md](content/docs/templates.md)

[↑ Navigation](#navigation)

---

## Shortcodes

### `{{< code >}}` — code block with copy button

```markdown
{{< code lang="bash" label="example" >}}
sudo unshare --pid --fork --mount-proc bash
{{< /code >}}
```

### `{{< ns-card >}}` — interactive expandable card

```markdown
{{< ns-card name="PID" flag="CLONE_NEWPID" icon="⚙️" color="#7c3aed"
    summary="Process ID isolation"
    desc="First process gets PID 1 inside the namespace..."
    host="PID 84521 on host"
    ns_view="PID 1 inside"
>}}
{{< code lang="bash" >}}
sudo unshare --pid --fork bash
{{< /code >}}
{{< /ns-card >}}
```

> Frontmatter for all content types: [content/docs/frontmatter.md](content/docs/frontmatter.md)

[↑ Navigation](#navigation)

---

## JavaScript

### Global functions (`baseof.html`)

| Function | What it does |
|---|---|
| `toggleTheme()` | Toggles `data-theme`, saves to `localStorage` |
| `setLang(lang)` | If page has `lang_pair` — redirect. Otherwise only `localStorage` |
| `toggleMobMenu()` | Opens/closes mobile drawer |
| `closeMobMenu()` | Closes drawer |

**Note:** `setLang` redirects via `<meta id="page-lang" data-lang-pair="...">` — this is the live implementation.

### `ns.js` functions (linux-namespaces page)

| Function | What it does |
|---|---|
| `buildCards(data)` | Generates `.ns-card` elements from data array |
| `toggleCard(card)` | Opens/closes a card |
| `jumpTo(i)` | Scroll to card + open |
| `switchTab(e, id)` | Tab switching |
| `cpCode(e, btn)` | Copy code to clipboard |
| `buildCheatTable(filter, bodyId)` | Builds/filters cheatsheet table |

### `single.html` inline functions (prose articles)

- Dynamic TOC from `h2/h3` via `IntersectionObserver`
- Reading progress bar (fixed 2px strip at top)
- Auto-wraps bare `<pre>` in `.code-block` with copy button

> Deep dive: [content/docs/javascript.md](content/docs/javascript.md)

[↑ Navigation](#navigation)

---

## Multilingual

Implemented manually, **without** Hugo i18n system:

```
content/
  docs/
    overview.md        # /docs/overview/ — EN
    ru/
      overview.md      # /docs/ru/overview/ — RU
```

- Language switch via `page_lang` and `lang_pair` frontmatter fields
- `setLang()` redirects to `lang_pair` URL
- Each language version is created separately

[↑ Navigation](#navigation)

---

## CI/CD & local dev

**Working branch: `hugo`** — deploy triggers on every push to this branch.

| Step | What runs |
|---|---|
| 1 | `actions/checkout@v4` — `submodules: recursive` (theme is a submodule) |
| 2 | `peaceiris/actions-hugo@v3` — `extended: true`, `hugo-version: latest` |
| 3 | `hugo --minify --gc` |
| 4 | grep CSS paths check (debug) |
| 5 | `pagefind --site public` — builds search index |
| 6–7 | upload + deploy to GitHub Pages |

```bash
# Local: full cycle (like CI)
./dev.sh
# = hugo && npx pagefind --site public && hugo server --disableFastRender

# Local: fast iteration (search won't work)
hugo server -D
```

> Full pipeline details, pitfalls, DNS setup, submodule troubleshooting: [content/docs/deploy.md](content/docs/deploy.md)

[↑ Navigation](#navigation)

---

## Content inventory

### Posts — 43 files

| Type | Count | Notes |
|---|---|---|
| `linux-namespaces` | 1 | Interactive article, custom layout |
| `lpic2-*` | 41 | Topics 200–212, standard prose layout |
| `phpldapadmin-practice` | 1 | Hands-on practice |

### Certifications

| Cert | Status | Progress |
|---|---|---|
| LPIC-1 | ✅ Passed | 100% |
| LPIC-2 | 🔄 In progress | 62% |
| AWS SAA | 📋 Planned | 18% |
| CCNA | ⏳ Queued | 5% |

[↑ Navigation](#navigation)

---

## Patterns

| Page type | Files to create | Key requirement |
|---|---|---|
| Prose article | `content/posts/<slug>.md` | No layout needed — Hugo picks `_default/single.html` |
| Interactive page | `content/posts/<slug>.md` + `layouts/posts/<slug>.html` | `layout:` in frontmatter must match layout filename |
| Certification page | `content/certs/<slug>.md` + widget entry in `certs-widget.html` | `num:` values must be strings, not integers |

> Full step-by-step guide for all three types: [content/docs/new-page.md](content/docs/new-page.md) — also at `/docs/new-page/`

[↑ Navigation](#navigation)

---

## Known pitfalls

| Problem | Cause | Fix |
|---|---|---|
| `position: sticky` doesn't work | `overflow: hidden` on parent | Replace with `overflow: visible` |
| CSS not updating locally | Browser cache | Incognito or DevTools → Disable cache |
| HTML/JS in Markdown not rendered | `unsafe = false` by default | `markup.goldmark.renderer.unsafe = true` |
| `{{ partial }}` doesn't work in `.md` | Hugo limitation | Move to layout template |
| Client-side TOC broken | Raw `<` in markdown heading | Escape angle brackets |
| CSS paths broken after deploy | `configure-pages@v4` overrides baseURL | Remove that step from `deploy.yml` |
| `NSLib is not defined` | Init before script loads | Init code → `{{ define "scripts" }}` after `<script src>` |
| `public/` contains stale files | Manual edits | `public/` is build artifact only — never edit directly |

[↑ Navigation](#navigation)

---

## Detailed docs

These files are part of the site content (`/docs/` section) and also readable directly:

| File | Covers | On site |
|---|---|---|
| [content/docs/overview.md](content/docs/overview.md) | Architecture, Hugo pipeline, deployment flow | `/docs/overview/` |
| [content/docs/css.md](content/docs/css.md) | Full CSS class reference, variables, specificity rules | `/docs/css/` |
| [content/docs/javascript.md](content/docs/javascript.md) | All JS functions, where defined, where called | `/docs/javascript/` |
| [content/docs/templates.md](content/docs/templates.md) | Every layout file, data context, block structure | `/docs/templates/` |
| [content/docs/frontmatter.md](content/docs/frontmatter.md) | All frontmatter fields by content type | `/docs/frontmatter/` |
| [content/docs/new-page.md](content/docs/new-page.md) | Step-by-step: add prose, interactive, or cert page | `/docs/new-page/` |
| [content/docs/deploy.md](content/docs/deploy.md) | CI/CD pipeline, local dev, Pagefind, deployment pitfalls | `/docs/deploy/` |
| [content/docs/breadcrumbs.md](content/docs/breadcrumbs.md) | Breadcrumb markup, CSS, per-template differences | `/docs/breadcrumbs/` |
| [content/docs/tags-and-search.md](content/docs/tags-and-search.md) | Tag filter + Pagefind: architecture, data flow, JS implementation | `/docs/tags-and-search/` |

Russian versions: [content/docs/ru/](content/docs/ru/)

[↑ Navigation](#navigation)

---

*Updated: April 2026*
