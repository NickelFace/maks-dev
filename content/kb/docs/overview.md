---
title: "Project Overview: Architecture & Pipeline"
date: 2026-04-15
description: "Hugo pipeline, directory structure, and deployment flow for maks.top"
page_lang: "en"
lang_pair: "/kb/docs/ru/overview/"
tags: ["docs"]
---

## What is this project?

`maks.top`: a static site built with Hugo using a custom theme `maks`. No third-party themes or frameworks; everything is written from scratch.

---

## Hugo pipeline: how the site is built

```
content/ (markdown)  ──┐
layouts/ (templates) ──┼──► Hugo build ──► public/ ──► GitHub Pages
static/  (assets)    ──┘
```

1. Hugo reads `hugo.toml`: site configuration
2. For each `.md` file in `content/`, it finds a matching template from `layouts/`
3. The template inserts data from frontmatter + `.Content` (markdown body)
4. Static files from `static/` and `themes/maks/static/` are copied as-is
5. The result: a `public/` folder with clean HTML/CSS/JS

---

## Template lookup: priority order

Hugo searches for a template in this order (first match wins):

| Page | Template lookup (in order) |
|---|---|
| `/posts/ccna-1-01-slug/` | `layouts/posts/single.html` → `layouts/_default/single.html` |
| `/posts/linux-namespaces/` | `layouts/posts/linux-namespaces.html` → `layouts/posts/single.html` |
| `/certs/` | `layouts/certs/list.html` |
| `/certs/ccna/` | `layouts/certs/single.html` → `layouts/_default/single.html` |
| `/ccna-labs/` | `layouts/ccna-labs/list.html` |
| `/ccna-labs/ccna-lab-NN/` | `layouts/ccna-labs/single.html` → `layouts/_default/single.html` |
| `/troubleshooting/` | `layouts/troubleshooting/list.html` |
| `/troubleshooting/ts-NN-slug/` | `layouts/_default/single.html` |
| `/trainers/` | `layouts/trainers/list.html` |
| `/trainers/slug/` | `layouts/trainers/single.html` |
| `/about/` | `layouts/about/single.html` → `layouts/_default/single.html` |
| `/` | `layouts/index.html` |
| `/posts/` | `layouts/posts/list.html` → `layouts/_default/list.html` |
| `/tags/` | `layouts/taxonomy/tag.html` |

Key rule: **a more specific path always overrides the default**.

---

## Directory structure

```ascii
maks.top/
│
├── hugo.toml                        # Site configuration
│
├── content/                         # Content (markdown)
│   ├── about.md                     # /about/ page
│   ├── posts/                       # /posts/ section (blog)
│   │   ├── ccna/                    # 36 CCNA 200-301 theory articles (ccna-N-NN-slug.md)
│   │   │   └── ru/                  # RU translations (build: list: never)
│   │   ├── lpic1/                   # LPIC-1 articles
│   │   │   └── ru/
│   │   ├── lpic2/                   # LPIC-2 articles
│   │   │   └── ru/
│   │   ├── neteng/                  # Network Engineer course
│   │   │   └── ru/
│   │   ├── netarch/                 # Network Architect articles
│   │   └── misc/                    # Miscellaneous (linux-namespaces, etc.)
│   ├── ccna-labs/                   # /ccna-labs/ section - 36 lab solutions
│   │   └── ru/                      # RU translations
│   ├── troubleshooting/             # /troubleshooting/ section - 20 symptom-first pages
│   ├── trainers/                    # /trainers/ section - interactive drills and animations
│   ├── certs/                       # /certs/ section
│   │   ├── ccna.md                  # CCNA cert page (accordion + resource tiles)
│   │   ├── lpic-1.md, lpic-2.md     # LPIC cert pages
│   │   ├── network-engineer.md      # OTUS course
│   │   ├── network-architect.md     # OTUS Network Architect course
│   │   └── aws-saa.md
│   ├── kb/                          # /kb/ section (quick references)
│   │   ├── linux-network.md         # ip, ss, tcpdump, nmcli, iptables
│   │   ├── bash.md                  # Variables, arrays, loops, functions
│   │   ├── text-processing.md       # grep, awk, sed, cut, sort, xargs
│   │   ├── filesystem.md            # find, du/df, lsof, chmod, LVM
│   │   ├── processes.md             # ps, systemd, cron, journald
│   │   ├── cisco-routing.md         # OSPF/EIGRP/BGP IOS commands
│   │   ├── cisco-switching.md       # VLAN/STP/EtherChannel IOS commands
│   │   ├── docker.md                # run/build/compose/volumes
│   │   ├── git.md                   # commit/rebase/stash/cherry-pick
│   │   ├── aws-cli.md               # EC2/S3/IAM/VPC commands
│   │   ├── iptables-nftables.md     # Firewall rules deep-dive
│   │   └── ssh.md                   # Keys/tunnels/config/rsync
│   └── docs/                        # /kb/docs/ section (this documentation)
│
├── static/                          # Global static files
│   ├── img/neteng/                  # Per-lab images (01/, 02/, … 17/)
│   ├── roadmap/                     # Static roadmap pages
│   │   ├── index.html               # Main roadmap (/roadmap/)
│   │   ├── ccna/index.html          # CCNA 200-301 sub-roadmap
│   │   ├── aws/index.html           # AWS SAA-C03 sub-roadmap
│   │   └── lpic/index.html          # LPIC-1 + LPIC-2 combined sub-roadmap
│   └── CNAME                        # Custom domain for GitHub Pages
│
└── themes/maks/                     # Custom theme
    ├── theme.toml                   # Theme metadata
    │
    ├── layouts/                     # Hugo templates (Go templates)
    │   ├── index.html               # Home page /
    │   ├── 404.html                 # Custom 404 page
    │   ├── _default/
    │   │   ├── baseof.html          # Base layout (wrapper for all pages)
    │   │   ├── single.html          # Article with ToC, progress bar, Mermaid
    │   │   ├── list.html            # Page listing with pagination
    │   │   └── _markup/
    │   │       └── render-codeblock-mermaid.html  # Mermaid render hook
    │   ├── posts/
    │   │   ├── list.html            # Blog listing + Pagefind search
    │   │   └── linux-namespaces.html # Interactive namespace explorer
    │   ├── ccna-labs/
    │   │   └── list.html            # Labs list: flat grid (number, title, tool, duration)
    │   ├── about/
    │   │   └── single.html          # About page with certs-widget
    │   ├── certs/
    │   │   ├── list.html            # Certs index /certs/: track table with progress
    │   │   └── single.html          # Cert overview: hero, resource tiles, accordion
    │   ├── taxonomy/
    │   │   └── tag.html             # Tags with interactive filtering
    │   ├── kb/
    │   │   └── section.html         # KB index grouped by Params.group
    │   ├── partials/                # Reusable fragments
    │   │   ├── certs-widget.html    # Cert cards for About page
    │   │   ├── pagination.html      # Dot-grid pagination (shared CSS in global.css)
    │   │   ├── search-box.html      # Search input UI
    │   │   └── breadcrumb.html      # Breadcrumb navigation
    │   └── shortcodes/              # Shortcode components for markdown
    │       ├── ns-card.html         # Linux namespace card (uses --c variable)
    │       ├── topology.html        # Declarative SVG network diagram
    │       └── code.html            # Code block with Chroma highlighting
    │
    └── static/                      # Theme static files
        ├── js/
        │   ├── article.js           # Reading progress, ToC, copy buttons, lightbox
        │   ├── pagefind-search.js   # Pagefind search UI for /posts/ and /tags/
        │   ├── taxonomy.js          # Tag filter logic + article grid on /tags/
        │   └── ns.js                # Namespace explorer logic
        └── styles/
            ├── global.css           # Variables, nav, common components, pagination
            ├── home.css             # Home page styles
            ├── prose.css            # Article typography, NS cards, tabs, ref-panel
            ├── cert.css             # Cert pages (hero, resource tiles, accordion, certs index)
            ├── ns.css               # linux-namespaces page layout only
            ├── chroma.css           # Syntax highlighting (dark/light)
            ├── topology.css         # .topology SVG diagram figure styles
            ├── fonts.css            # @font-face: Inter (body), JetBrains Mono
            └── mobile.css           # Mobile nav and breakpoints
```

---

## Build pipeline: from push to live site

```ascii
git push origin hugo
        │
        ▼
GitHub Actions (.github/workflows/deploy.yml)
        │
        ├── actions/checkout@v4          # Clones repo with submodules
        ├── wget hugo_extended .deb       # Installs Hugo (version pinned in workflow)
        ├── hugo --minify --gc           # Builds site into public/
        │   ├── --minify: compresses HTML/CSS/JS
        │   └── --gc: removes unused cache files
        ├── pagefind --site public        # Indexes content for search
        ├── actions/upload-pages-artifact@v5 # Uploads public/ as artifact
        └── actions/deploy-pages@v5       # Deploys to GitHub Pages
                │
                ▼
        https://maks.top/
        (Fastly CDN + Let's Encrypt TLS + gzip)
```

---

## hugo.toml: key parameters

```toml
baseURL = "https://maks.top/"   # Used for absolute links
languageCode = "en"
title = "maks.top"
theme = "maks"                  # References themes/maks/
paginate = 10                   # Posts per page in listings

[params]                        # Available in templates as .Site.Params.*
  author      = "Maks"
  description = "..."
  location    = "Sydney, AU"
  github      = "https://github.com/NickelFace"
  linkedin    = "..."
  telegram    = "..."

[taxonomies]
  tag      = "tags"             # Tags: /tags/{tag-name}/
  category = "categories"      # Categories: /categories/{name}/

[outputs]
  home    = ["HTML"]            # HTML only (no RSS, JSON)
  section = ["HTML"]
  page    = ["HTML"]

[markup.goldmark.renderer]
  unsafe = true                 # Allows raw HTML inside markdown

[markup.highlight]
  noClasses   = false           # Class-based Chroma (CSS in chroma.css)
  codeFences  = true            # Syntax highlight fenced code blocks
  guessSyntax = true            # Auto-detect language if not specified
  lineNos     = false
  tabWidth    = 2
```

---

## How Hugo passes data to templates

Each template has access to `.` (dot), the current page context:

| Variable | Type | Description |
|---|---|---|
| `.Title` | string | From frontmatter `title:` |
| `.Date` | time.Time | From frontmatter `date:` |
| `.Content` | template.HTML | Markdown body converted to HTML |
| `.Description` | string | From frontmatter `description:` |
| `.Params` | map | All custom frontmatter fields |
| `.Params.tags` | []string | From frontmatter `tags:` |
| `.Permalink` | string | Full page URL |
| `.RelPermalink` | string | Relative URL |
| `.Section` | string | Section: "posts", "certs", "ccna-labs", "troubleshooting", "trainers", "kb" |
| `.IsHome` | bool | true only for the home page |
| `.Site` | Site | Global site object |
| `.Site.Params` | map | Parameters from `[params]` in hugo.toml |
| `.Site.RegularPages` | []Page | All site pages |
| `.Site.Taxonomies.tags` | Taxonomy | All tags with post counts |
| `.Paginator` | Paginator | Pagination object (in list templates) |

---

## Related pages

- [Templates](/kb/docs/templates/): each layout file in detail
- [CSS](/kb/docs/css/): style architecture and class reference
- [Frontmatter](/kb/docs/frontmatter/): all fields by content type
- [JavaScript](/kb/docs/javascript/): functions and event listeners
