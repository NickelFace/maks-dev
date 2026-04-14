---
title: "Project Overview — Architecture & Pipeline"
date: 2026-04-11
description: "Hugo pipeline, directory structure, and deployment flow for maks.top"
page_lang: "en"
lang_pair: "/docs/ru/overview/"
tags: ["docs"]
---

## What is this project?

`maks.top` — a static site built with Hugo using a custom theme `maks`. No third-party themes or frameworks — everything is written from scratch.

---

## Hugo pipeline: how the site is built

```
content/ (markdown)  ──┐
layouts/ (templates) ──┼──► Hugo build ──► public/ ──► GitHub Pages
static/  (assets)    ──┘
```

1. Hugo reads `hugo.toml` — site configuration
2. For each `.md` file in `content/`, it finds a matching template from `layouts/`
3. The template inserts data from frontmatter + `.Content` (markdown body)
4. Static files from `static/` and `themes/maks/static/` are copied as-is
5. The result — a `public/` folder with clean HTML/CSS/JS

---

## Template lookup — priority order

Hugo searches for a template in this order (first match wins):

| Page | Template lookup (in order) |
|---|---|
| `/posts/lpic2-200-1/` | `layouts/posts/single.html` → `layouts/_default/single.html` |
| `/posts/linux-namespaces/` | `layouts/posts/linux-namespaces.html` → `layouts/posts/single.html` → `layouts/_default/single.html` |
| `/certs/lpic-2/` | `layouts/certs/single.html` → `layouts/_default/single.html` |
| `/about/` | `layouts/about/single.html` → `layouts/_default/single.html` |
| `/` | `layouts/index.html` |
| `/posts/` | `layouts/posts/list.html` → `layouts/_default/list.html` |
| `/tags/` | `layouts/taxonomy/tag.html` |

Key rule: **a more specific path always overrides the default**.

---

## Directory structure

```
maks.top/
│
├── hugo.toml                        # Site configuration
│
├── content/                         # Content (markdown)
│   ├── about.md                     # /about/ page
│   ├── posts/                       # /posts/ section (blog)
│   │   ├── lpic2-200-1-*.md         # LPIC-2 articles
│   │   └── linux-namespaces.md      # Interactive page
│   ├── certs/                       # /certs/ section
│   │   ├── lpic-1.md, lpic-2.md     # LPIC cert pages
│   │   ├── network-engineer.md      # OTUS course: 17 topics, 24 articles
│   │   ├── aws-saa.md
│   │   └── ccna.md
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
│   └── docs/                        # /docs/ section (this documentation)
│
├── static/                          # Global static files
│   └── CNAME                        # Custom domain for GitHub Pages
│
└── themes/maks/                     # Custom theme
    ├── theme.toml                   # Theme metadata
    │
    ├── layouts/                     # Hugo templates (Go templates)
    │   ├── index.html               # Home page /
    │   ├── _default/
    │   │   ├── baseof.html          # Base layout (wrapper for all pages)
    │   │   ├── single.html          # Article with ToC and progress bar
    │   │   └── list.html            # Page listing with pagination
    │   ├── posts/
    │   │   ├── list.html            # Blog listing + Pagefind search
    │   │   └── linux-namespaces.html # Interactive namespace explorer
    │   ├── about/
    │   │   └── single.html          # About page with certs-widget
    │   ├── certs/
    │   │   └── single.html          # Cert overview with accordion
    │   ├── taxonomy/
    │   │   └── tag.html             # Tags with interactive filtering
    │   ├── kb/
    │   │   └── list.html            # KB index grouped by Params.group
    │   ├── partials/                # Reusable fragments
    │   │   ├── certs-widget.html    # Cert cards (5: incl. Network Engineer)
    │   │   ├── pagination.html      # Pagination with ellipsis
    │   │   └── breadcrumb.html      # Breadcrumb navigation
    │   └── shortcodes/              # Shortcode components for markdown
    │       ├── ns-card.html         # Linux namespace card
    │       └── code.html            # Code block with Chroma highlighting
    │
    └── static/                      # Theme static files
        ├── js/
        │   ├── site.js              # Global functions (theme, menu)
        │   └── ns.js                # Namespace explorer logic
        └── styles/
            ├── global.css           # Variables, nav, common components
            ├── home.css             # Home page styles
            ├── prose.css            # Article typography and code blocks
            ├── cert.css             # Cert pages
            ├── chroma.css           # Syntax highlighting: Dracula (dark) / GitHub (light)
            ├── ns.css               # Namespace explorer
            └── mobile.css           # Mobile nav and breakpoints
```

---

## Build pipeline: from push to live site

```
git push origin hugo
        │
        ▼
GitHub Actions (.github/workflows/deploy.yml)
        │
        ├── actions/checkout@v4          # Clones repo with submodules
        ├── peaceiris/actions-hugo@v3    # Installs Hugo (latest, extended)
        ├── hugo --minify --gc           # Builds site into public/
        │   ├── --minify: compresses HTML/CSS/JS
        │   └── --gc: removes unused cache files
        ├── pagefind --site public        # Indexes content for search
        ├── actions/upload-pages-artifact # Uploads public/ as artifact
        └── actions/deploy-pages@v4       # Deploys to GitHub Pages
                │
                ▼
        https://maks.top/
        (Fastly CDN + Let's Encrypt TLS + gzip)
```

---

## hugo.toml — key parameters

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

Each template has access to `.` (dot) — the current page context:

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
| `.Section` | string | Section: "posts", "certs", "docs" |
| `.IsHome` | bool | true only for the home page |
| `.Site` | Site | Global site object |
| `.Site.Params` | map | Parameters from `[params]` in hugo.toml |
| `.Site.RegularPages` | []Page | All site pages |
| `.Site.Taxonomies.tags` | Taxonomy | All tags with post counts |
| `.Paginator` | Paginator | Pagination object (in list templates) |

---

## Related pages

- [Templates](/docs/templates/) — each layout file in detail
- [CSS](/docs/css/) — style architecture and class reference
- [Frontmatter](/docs/frontmatter/) — all fields by content type
- [JavaScript](/docs/javascript/) — functions and event listeners
