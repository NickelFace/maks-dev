# maks.top — Hugo site

Personal Linux & DevOps knowledge base.
Stack: **Hugo** + **GitHub Pages** + **Cloudflare DNS** + **Pagefind**

---

## Quick start (local)

```bash
# 1. Clone
git clone https://github.com/NickelFace/maks-top.git
cd maks-top

# 2. Run dev server
hugo server -D
# → http://localhost:1313
```

## Project structure

```
maks-top/
├── hugo.toml                   ← site config (baseURL, params)
├── content/
│   ├── posts/                  ← blog articles (.md)
│   ├── kb/                     ← quick references (.md)
│   └── certs/                  ← certification notes (.md)
├── static/
│   └── CNAME                   ← custom domain (maks.top)
├── themes/maks/
│   ├── theme.toml
│   ├── layouts/
│   │   ├── index.html          ← homepage
│   │   ├── _default/
│   │   │   ├── baseof.html     ← master layout (nav, footer, scripts)
│   │   │   ├── single.html     ← article page
│   │   │   └── list.html       ← listing page (blog/kb/certs)
│   │   ├── shortcodes/
│   │   │   ├── ns-card.html    ← interactive namespace card
│   │   │   └── code.html       ← code block with copy button
│   │   └── partials/
│   │       └── search.html
│   └── static/styles/
│       ├── global.css          ← variables, nav, panels, certs, about
│       ├── home.css            ← homepage-specific styles
│       ├── prose.css           ← article typography + interactive components
│       └── mobile.css          ← responsive breakpoints + mobile nav
└── .github/workflows/
    └── deploy.yml              ← auto-deploy on push to main
```

## Writing a new post

```bash
hugo new posts/my-post-title.md
```

Frontmatter fields:

```yaml
---
title: "iptables vs nftables"
date: 2026-04-08
description: "Comparison of Linux firewall frameworks"
tags: ["Linux", "Networking", "iptables"]
views: 0        # used for Popular panel sorting
icon: "🔥"      # shown in KB quick references
---
```

## Interactive components in Markdown

### Namespace card

```markdown
{{< ns-card
  name="PID"
  flag="CLONE_NEWPID"
  icon="⚙️"
  color="#7c3aed"
  summary="Process ID isolation"
  desc="First process gets PID 1..."
  host="PID 84521 on host"
  ns_view="PID 1 inside"
>}}
{{< /ns-card >}}
```

### Code block with copy button

```markdown
{{< code lang="bash" label="example" >}}
sudo unshare --pid --fork --mount-proc bash
{{< /code >}}
```

## Deploy: GitHub Pages setup

1. Create repo `NickelFace/maks-top` (or `NickelFace/NickelFace.github.io`)
2. Push this project to `main` branch
3. **Settings → Pages → Source: GitHub Actions**
4. GitHub Actions runs on every push → builds Hugo → deploys `public/`

The workflow also runs `pagefind` after build, indexing all content for search.

## Cloudflare DNS setup

After adding your site to Cloudflare (Free plan):

| Type  | Name | Value                  | Proxy |
|-------|------|------------------------|-------|
| A     | @    | 185.199.108.153        | ON    |
| A     | @    | 185.199.109.153        | ON    |
| A     | @    | 185.199.110.153        | ON    |
| A     | @    | 185.199.111.153        | ON    |
| CNAME | www  | nickelface.github.io   | ON    |

Then: **GitHub repo → Settings → Pages → Custom domain → `maks.top`**

GitHub auto-issues Let's Encrypt TLS. Cloudflare SSL/TLS → set to **Full** (not Flexible).

## Multilingual (EN/RU)

Pages are organized manually via `en/` and `ru/` subfolders in content.
The language toggle in the nav saves preference to `localStorage`.
No Hugo i18n module — intentionally simple.
