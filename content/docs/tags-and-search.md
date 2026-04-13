---
title: "Tags & Search"
date: 2026-04-13
description: "How tag filtering and Pagefind full-text search work — architecture, data flow, and implementation details"
page_lang: "en"
lang_pair: "/docs/ru/tags-and-search/"
tags: ["docs"]
---

## Two separate systems

The site has two independent search/filter mechanisms that coexist on the `/tags/` page:

| System | Where | What it does |
|---|---|---|
| **Tag filter** | `/tags/` | Client-side JS filter over a Hugo-generated array |
| **Pagefind search** | `/posts/` and `/tags/` | Full-text search over a pre-built index |

They don't interact — typing in the search box uses Pagefind, clicking a tag button uses the JS filter.

---

## Tag filter

### How tags become pages

Hugo processes `tags:` from frontmatter and auto-creates taxonomy pages:

```
tags: ["Linux", "LPIC-2", "Networking"]
         │
         ▼
/tags/linux/        ← lists all posts tagged "Linux"
/tags/lpic-2/       ← lists all posts tagged "LPIC-2"
/tags/networking/
```

The tag value is urlized: `"LPIC-2"` → `lpic-2`, `"Networking"` → `networking`. This urlized value is what's stored in `data-tag` attributes and the JS `POSTS` array.

### Template: `taxonomy/tag.html`

This single template renders **all** tag pages — both the tag index (`/tags/`) and individual tag pages.

#### Tag buttons (rendered by Hugo at build time)

```html
<!-- "All" button — data-tag="" means show everything -->
<button class="tag tag-lg tag-filter active" data-tag="">
  All <span class="count">{{ len .Site.RegularPages }}</span>
</button>

<!-- One button per tag, sorted by post count (most → least) -->
{{ range .Site.Taxonomies.tags.ByCount }}
<button class="tag tag-lg tag-filter" data-tag="{{ .Page.Title | urlize }}">
  {{ .Page.Title }} <span class="count">{{ .Count }}</span>
</button>
{{ end }}
```

`.Site.Taxonomies.tags.ByCount` — Hugo's built-in: returns all tags sorted by number of posts, descending.

#### `POSTS` array (embedded by Hugo at build time)

The entire post list is serialized into a JS array during the Hugo build:

```js
const POSTS = [
  {
    url:       "https://maks.top/posts/lpic2-200-1.../",
    title:     "LPIC-2 200.1 — Capacity Planning",
    date:      "2026-04-10",
    tags:      ["linux", "lpic-2", "monitoring"],    // urlized — for filtering
    tagLabels: ["Linux", "LPIC-2", "Monitoring"],    // original — for display
    summary:   "CPU, memory, disk I/O monitoring..."
  },
  // ... all posts
];
```

Two separate tag arrays per post:
- `tags` — urlized values used for `===` comparison in the filter
- `tagLabels` — original display values shown in the card

**Russian posts are excluded** — the template skips pages where `page_lang === "ru"`:
```
{{ range .Site.RegularPages }}{{ if ne .Params.page_lang "ru" }}
```

#### Client-side filter logic

```js
let activeTag = '';

function renderArticles() {
  const filtered = activeTag
    ? POSTS.filter(p => p.tags.includes(activeTag))
    : POSTS;

  document.getElementById('tagArticles').innerHTML = filtered.map(p => `
    <a href="${p.url}" class="post-card">
      <div class="post-card-meta">
        <span class="post-date">${p.date}</span>
        ${p.tagLabels.slice(0, 2).map(l => `<span class="tag">${l}</span>`).join('')}
      </div>
      <div class="post-card-title">${p.title}</div>
      ${p.summary ? `<div class="post-card-desc">${p.summary}</div>` : ''}
    </a>
  `).join('');
}

// Button click handler
document.querySelectorAll('.tag-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTag = btn.dataset.tag;   // "" for "All", urlized tag for others
    renderArticles();
  });
});

// Initial render on page load (shows all posts)
renderArticles();
```

**Filter flow:**
1. Page loads → `renderArticles()` runs with `activeTag = ''` → all posts shown
2. User clicks "Linux" button → `activeTag = 'linux'`
3. `renderArticles()` filters `POSTS` where `p.tags.includes('linux')`
4. `#tagArticles` innerHTML replaced with filtered results — no page reload

Note: only the first 2 tags per post are shown in the card (`tagLabels.slice(0, 2)`).

---

## Pagefind full-text search

### What Pagefind is

Pagefind is a static search library that:
1. Crawls the built `public/` HTML files after `hugo --minify`
2. Builds a binary search index into `public/pagefind/`
3. Provides a JS API (`pagefind.js`) that queries the index client-side

No server needed — the index is served as static files alongside the site.

### Build step

```bash
# In CI (deploy.yml):
pagefind --site public

# Locally (via dev.sh):
hugo && npx pagefind --site public && hugo server --disableFastRender
```

This creates:
```
public/
  pagefind/
    pagefind.js        ← client API
    pagefind-*.pclf    ← binary index shards
    pagefind.en.pclf   ← language-specific index
```

> **Pagefind is not available during `hugo server -D`** (without first running `hugo`). The search input will silently show no results if the index doesn't exist.

### Where Pagefind search appears

| Page | Template | Notes |
|---|---|---|
| `/posts/` | `posts/list.html` | Full-text search only |
| `/tags/` | `taxonomy/tag.html` | Full-text search + tag filter (independent) |

### Lazy loading

Pagefind is not loaded when the page opens — it loads on the first keypress:

```js
let pf = null;

async function loadPagefind() {
  if (pf) return;   // already loaded — do nothing
  try {
    pf = await import('/pagefind/pagefind.js');
    await pf.init();
  } catch(e) {
    console.warn('Pagefind not ready');
  }
}

searchInput.addEventListener('input', async function() {
  const q = this.value.trim();
  if (!q) { searchResults.style.display = 'none'; return; }
  await loadPagefind();   // loads on first keystroke only
  ...
});
```

This saves bandwidth — users who don't search don't download the index.

### Search flow

```
User types "nginx"
        │
        ▼
loadPagefind()        ← dynamic import('/pagefind/pagefind.js') if not loaded
        │
        ▼
pf.search("nginx")    ← returns array of result objects (lazy, no data yet)
        │
        ▼
Promise.all(results.slice(0, 8).map(r => r.data()))
                      ← fetches actual data for top 8 results (async, parallel)
        │
        ▼
Render into #searchResults
  - item.meta.title   ← page title
  - item.url          ← page URL
  - item.excerpt      ← context snippet with match highlighted
```

`.data()` is lazy — Pagefind doesn't fetch full result data until you call it. `slice(0, 8)` limits to 8 results before fetching, saving bandwidth.

### Result dropdown

The results container is created dynamically, not in the HTML template:

```js
const searchResults = document.createElement('div');
searchResults.id = 'searchResults';
searchResults.style.cssText = 'position:absolute;top:calc(100% + 8px);...';
document.querySelector('.search-wrap').appendChild(searchResults);
```

`.search-wrap` has `position: relative` — the dropdown positions itself relative to the input.

**Closing the dropdown:**
```js
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) searchResults.style.display = 'none';
});
```
Any click outside `.search-wrap` hides results.

### Excluding pages from the index

To prevent a page from being indexed by Pagefind, add to frontmatter:

```yaml
pagefind_ignore: true
```

The `baseof.html` template reads this and adds `data-pagefind-ignore="all"` to `<body>`:

```html
<body{{ if .Params.pagefind_ignore }} data-pagefind-ignore="all"{{ end }}>
```

---

## Data flow summary

```
Build time (Hugo):
  content/posts/*.md
    └── frontmatter.tags → Hugo taxonomy → /tags/{tag}/ pages
    └── all post data    → POSTS[] array embedded in tag.html JS

Build time (Pagefind):
  public/**/*.html → pagefind --site public → public/pagefind/ index

Runtime (browser):
  User clicks tag button
    → JS filter on POSTS[] → re-render #tagArticles (no network)

  User types in search box
    → dynamic import pagefind.js (first time only)
    → pf.search(query) → fetch top 8 results
    → render #searchResults dropdown
```

---

## Related pages

- [Project Overview](/docs/overview/)
- [Frontmatter](/docs/frontmatter/)
- [Templates](/docs/templates/)
- [JavaScript](/docs/javascript/)
- [Deploy & Local Dev](/docs/deploy/)
