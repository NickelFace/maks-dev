---
title: "Deploy & Local Dev"
date: 2026-04-13
description: "CI/CD pipeline, local development workflow, Pagefind, and known deployment pitfalls"
page_lang: "en"
lang_pair: "/docs/ru/deploy/"
tags: ["docs"]
---

## Local development

### Quick start

```bash
# Clone with submodules (theme is a submodule)
git clone --recurse-submodules https://github.com/NickelFace/maks.top.git
cd maks.top

# Switch to working branch
git checkout hugo
```

### Running the dev server

Three options depending on what you need:

```bash
# Option 1 — full cycle (like CI): build + index + serve
./dev.sh
# = hugo && npx pagefind --site public && hugo server --disableFastRender

# Option 2 — fast iteration (no Pagefind, search won't work)
hugo server -D

# Option 3 — different port if 1313 is busy
hugo server -D --port 1314
```

> **`--disableFastRender`** forces Hugo to rebuild the full page on each change instead of patching only the changed part. Slower, but prevents stale state in the browser.

> **`-D`** includes draft pages (`draft: true` in frontmatter). Without it, drafts are skipped.

### Why run Pagefind locally?

`hugo server` serves from memory — `public/` is not written to disk. But Pagefind needs the built HTML files. That's why `dev.sh` first runs `hugo` (writes to `public/`), indexes it with Pagefind, then starts the server with `--disableFastRender`.

Without this step the search box on `/posts/` returns no results locally.

### Checking for CSS issues

Browser cache often masks CSS changes during local development:

```bash
# Always verify CSS changes in:
# — Incognito window, or
# — DevTools → Network tab → check "Disable cache" → reload
```

---

## CI/CD pipeline

Deploys automatically on every push to the **`hugo`** branch.

```
git push origin hugo
        │
        ▼
GitHub Actions (.github/workflows/deploy.yml)
        │
        ├── 1. actions/checkout@v4
        │      submodules: recursive   ← required! theme is a submodule
        │      fetch-depth: 0          ← full history for .GitInfo
        │
        ├── 2. peaceiris/actions-hugo@v3
        │      hugo-version: "latest"
        │      extended: true          ← required for SASS support
        │
        ├── 3. hugo --minify --gc
        │      --minify  compresses HTML/CSS/JS
        │      --gc      removes unused cache files
        │
        ├── 4. grep stylesheet check   ← debug step, verifies CSS paths in public/index.html
        │
        ├── 5. pagefind --site public  ← builds search index into public/pagefind/
        │
        ├── 6. actions/upload-pages-artifact@v3
        │
        └── 7. actions/deploy-pages@v4
                    │
                    ▼
            https://maks.top/
```

### Branch setup

| Branch | Purpose |
|---|---|
| `hugo` | Working branch — all commits go here, CI runs from here |
| `main` | Unused / legacy |
| `gh-pages` | Auto-created by GitHub Actions, do not touch |

> **Never push directly to `gh-pages`** — it's overwritten on every deploy.

### Why `submodules: recursive` is required

The theme `themes/maks/` is a git submodule. Without `submodules: recursive` in checkout, Hugo finds an empty `themes/maks/` directory and fails with:

```
Error: module "maks" not found; ...
```

### GitHub Pages setup (one-time)

1. **Settings → Pages → Source: GitHub Actions** (not "Deploy from branch")
2. Add custom domain: `maks.top`
3. GitHub auto-issues Let's Encrypt TLS and serves via Fastly CDN

DNS records at Cloudflare:

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | nickelface.github.io |

---

## Known deployment pitfalls

### `actions/configure-pages@v4` — do not use

This action is commonly seen in Hugo deployment examples but **must not be used here**.

**Why it breaks things:** `configure-pages@v4` reads the GitHub Pages URL and overwrites `baseURL` in the Hugo config. For a custom domain (`maks.top`) it sets the wrong value, which breaks all relative CSS/JS paths:

```html
<!-- broken result: -->
<link rel="stylesheet" href="https://nickelface.github.io/styles/global.css">

<!-- correct result (without configure-pages): -->
<link rel="stylesheet" href="/styles/global.css">
```

The current `deploy.yml` does **not** include this step. Don't add it.

### `hugo-version: "latest"` may break on major updates

`peaceiris/actions-hugo@v3` with `hugo-version: "latest"` always installs the newest version. If Hugo releases a breaking change, the build may fail unexpectedly.

**Fix if this happens:** pin to a specific version:

```yaml
- uses: peaceiris/actions-hugo@v3
  with:
    hugo-version: "0.145.0"   # pin to last known good version
    extended: true
```

### `public/` edited manually

`public/` is fully regenerated on every `hugo` run. Any manual changes are overwritten.

**Never edit files in `public/` directly.**

### Theme submodule not updated

If `themes/maks/` shows as an empty directory locally:

```bash
# Initialize and pull submodule
git submodule update --init --recursive
```

If the submodule is behind:

```bash
cd themes/maks
git pull origin main
cd ../..
git add themes/maks
git commit -m "chore: update theme submodule"
```

### `markup.goldmark.renderer.unsafe = false`

Raw HTML and `<script>` tags in Markdown files are silently stripped unless `unsafe = true` is set in `hugo.toml`. This is already configured correctly, but if you ever reset the config — make sure it stays:

```toml
[markup.goldmark.renderer]
  unsafe = true
```

---

## Checking a failed build

GitHub Actions logs are the primary source. Common failure points:

```bash
# 1. Hugo build failed — check for template errors
#    Look for: "Error: ... template"

# 2. Pagefind failed — check npm/node availability
#    Look for: "pagefind: command not found"

# 3. Deploy failed — check Pages permissions
#    Look for: "HttpError: Not Found" or permissions errors
#    Fix: Settings → Pages → Source must be "GitHub Actions"
```

The debug step in `deploy.yml` prints CSS link tags from `public/index.html` — useful for confirming that CSS paths are correct after a build:

```yaml
- name: Check generated HTML
  run: grep -r "stylesheet" public/index.html | head -20
```

---

## Related pages

- [Project Overview](/docs/overview/)
- [Templates](/docs/templates/)
- [New Page Guide](/docs/new-page/)
