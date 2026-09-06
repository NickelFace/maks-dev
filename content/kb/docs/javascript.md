---
title: "JavaScript: Functions & Event Reference"
date: 2026-04-11
description: "All JavaScript functions, where they're defined, called from, and what they do"
page_lang: "en"
lang_pair: "/kb/docs/ru/javascript/"
tags: ["docs"]
---

## Where JS lives

| File | Loaded | Purpose |
|---|---|---|
| Inline in `baseof.html` `<script>` | every page | Global functions (theme, menu) |
| `assets/js/article.js` | article pages via `_default/single.html` scripts block | Reading progress bar, ToC, copy buttons, image lightbox |
| `assets/js/pagefind-search.js` | `/posts/` and `/tags/` | Pagefind search UI |
| `assets/js/taxonomy.js` | `/tags/` (after inline POSTS[] data) | Tag filter logic + article grid |
| Inline in `certs/single.html` `{{ block "scripts" }}` | `/certs/*` | Accordion toggle |
| `assets/js/ns.js` | `/posts/linux-namespaces/` | Namespace explorer (data + render) |

---

## baseof.html: global functions

### `toggleTheme()`

```js
function toggleTheme()
```

**Called by:** `onclick` on `#themeBtn` (desktop) and `#themeBtnMob` (mobile).

**What it does:**
1. Reads the current `data-theme` attribute from `<html>`
2. Switches to the opposite (`dark` ↔ `light`)
3. Saves to `localStorage.theme`
4. Updates the icon on all `#themeBtn`, `#themeBtnMob` buttons

**CSS link:** `document.documentElement.setAttribute('data-theme', next)` triggers CSS variables `[data-theme="light"]`.

---

### `setLang(lang)`

```js
function setLang(lang)
// Example call: setLang('ru')
```

**Called by:** `onclick` on `.lang-btn` buttons in desktop nav and mobile drawer.

**What it does:** if the page is bilingual (has `<meta id="page-lang">`) and the selected language differs from the current one, redirects to the `data-lang-pair` URL. On non-bilingual pages does nothing.

---

### `toggleMobMenu()`

```js
function toggleMobMenu()
```

**Called by:** `onclick` on `#burgerBtn`.

**What it does:** toggles `.open` class on three elements simultaneously:
- `#mobDrawer`: slides out the drawer
- `#mobOverlay`: shows the backdrop
- `#burgerBtn`: animates burger into an X

---

### `closeMobMenu()`

```js
function closeMobMenu()
```

**Called by:** `onclick` on `#mobOverlay` (clicking the overlay closes the menu).

**What it does:** removes `.open` from `#mobDrawer`, `#mobOverlay`, `#burgerBtn`.

---

### `applyTheme(t, isAuto)`

```js
function applyTheme(t, isAuto)
```

**Single source of truth for theme state.** Called on page load and by `toggleTheme()`.

**What it does:**
1. Sets `data-theme` attribute on `<html>` (`"dark"` or `"light"`)
2. Updates icon on all `.theme-btn`
3. Sets `aria-pressed` on theme buttons
4. Sets `data-auto="true"` on buttons when `isAuto` is true (CSS shows dashed border)

**Auto-detect logic:** if `localStorage('theme')` is absent or `'auto'`, the init code checks local hour:
- 7–20 → `"light"`, otherwise → `"dark"`
- If auto mode is active, a `setInterval` (10 min) re-evaluates the hour and switches if needed

To reset to auto: `localStorage.removeItem('theme')` in browser console.

---

## article.js: article page functions

**Path:** `assets/js/article.js`, loaded on all single article pages via `_default/single.html` scripts block.

### Reading progress bar

Creates `<div id="readingBar">` fixed at top of viewport. Width updated on `scroll` event: `scrollY / (scrollHeight - viewportHeight) * 100%`.

### ToC builder

Finds all `h2`, `h3` inside `#articleBody`. Only activates if more than 2 headings exist. Inserts links into `#tocAside`, adds `.has-toc` to `.page` at width ≥ 860px. `IntersectionObserver` with `rootMargin: '-10% 0px -80% 0px'` highlights the active heading, considers a heading active when it's in the top 20% of viewport.

### Copy buttons

For each `<pre>` not inside `.code-block`, wraps it in `.code-block` and adds a copy button. The `{{</* code */>}}` shortcode handles its own copy button separately via `cpCode()`.

### Code toggle

Activated via `document.body.dataset.codeToggle === 'true'`. Set in the page scripts block when `code_toggle: true` in frontmatter. Adds expand/collapse UI to `<details>` blocks in the article body.

### Image lightbox

Wraps `<img>` tags inside `.prose` with a click handler that opens the image full-screen in a lightbox overlay. Clicking the overlay or pressing Escape closes it.

---

## pagefind-search.js: Pagefind search UI

**Path:** `assets/js/pagefind-search.js`, loaded on `/posts/` and `/tags/`.

Lazy-loads `/pagefind/pagefind.js` on first keypress. Renders results into `#searchResults` (CSS-positioned below `.search-wrap`). Closes on click outside `.search-wrap`.

---

## taxonomy.js: tag filter logic

**Path:** `assets/js/taxonomy.js`, loaded on `/tags/` after an inline `<script>` that defines `POSTS[]` and `currentTag`.

Reads `POSTS[]` (Hugo-generated, EN only) and `currentTag` (current tag slug from Hugo) from the page. Builds the tag grid, filters articles, manages the active pill UI.

**Data contract (set inline in tag.html before this script):**
```js
const POSTS = [{ url, title, date, tags, tagLabels, summary }, ...];
const currentTag = "linux"; // or "" if on /tags/ root
```

---

---

## Mermaid diagrams: lazy loading

Mermaid diagrams are supported via a render hook at `themes/maks/layouts/_default/_markup/render-codeblock-mermaid.html`. It wraps ` ```mermaid ` blocks in `<pre class="mermaid">` and sets a `hasMermaid` page store flag.

In `_default/single.html` scripts block:

```js
{{ if .Store.Get "hasMermaid" }}
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, theme: 'dark' });
</script>
{{ end }}
```

Mermaid JS is loaded from CDN **only on pages that actually contain a mermaid block**, not globally.

---

## certs/single.html: accordion

```js
function toggleTopic(btn) {
  const topic = btn.closest('.cert-topic');
  const body  = topic.querySelector('.cert-topic-body');
  if (!body) return;                              // topics without posts don't expand
  const open = topic.classList.toggle('open');
  body.style.maxHeight = open ? body.scrollHeight + 'px' : '0';
}
```

**Animation via `max-height`:** CSS animation `max-height: 0 → scrollHeight`. `scrollHeight` = actual content height.

**Why not `height: auto`?** CSS cannot animate `auto`. `max-height` is the standard workaround.

---

## ns.js: Namespace Explorer

**Path:** `assets/js/ns.js`  
**Loaded:** only on `/posts/linux-namespaces/` via `<script src="{{ partial "asset.html" "js/ns.js" }}">`

Contains:
- `nsData`: array of objects with data for all namespaces (name, flag, icon, color, summary, desc...)
- `cheatData`: array of commands for the cheatsheet table
- Render functions: `buildNsGrid()`, `buildNsMap()`, `buildCheatTable()`
- `nsToggleCard(el)`: expands/collapses a namespace card
- `IntersectionObserver`: progress bar (how many namespaces have been read)
- `buildToc()`: builds the table of contents in aside

---

## Related pages

- [Project Overview](/kb/docs/overview/)
- [Templates](/kb/docs/templates/)
- [CSS](/kb/docs/css/)
- [Frontmatter](/kb/docs/frontmatter/)
- [Tags & Search](/kb/docs/tags-and-search/)
