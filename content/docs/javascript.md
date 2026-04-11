---
title: "JavaScript — Functions & Event Reference"
date: 2026-04-11
description: "All JavaScript functions, where they're defined, called from, and what they do"
page_lang: "en"
lang_pair: "/docs/ru/javascript/"
tags: ["docs"]
---

## Where JS lives

| File | Loaded | Purpose |
|---|---|---|
| Inline in `baseof.html` `<script>` | every page | Global functions (theme, menu) + restore from localStorage |
| `static/js/site.js` | **not loaded anywhere** | Duplicates functions from baseof (legacy) |
| Inline in `_default/single.html` `{{ block "scripts" }}` | article pages | Progress bar + ToC + copy buttons |
| Inline in `posts/list.html` `{{ block "scripts" }}` | `/posts/` | Pagefind search |
| Inline in `taxonomy/tag.html` `{{ block "scripts" }}` | `/tags/` | Pagefind search + tag filter |
| Inline in `certs/single.html` `{{ block "scripts" }}` | `/certs/*` | Accordion toggle |
| `static/js/ns.js` | `/posts/linux-namespaces/` | Namespace explorer (data + render) |

---

## baseof.html — global functions

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

### `setLang(lang, btn)`

```js
function setLang(lang, btn)
// Example call: setLang('ru', this)
```

**Called by:** `onclick` on `.lang-btn` buttons in desktop nav and mobile drawer.

**What it does:**
1. Saves `lang` to `localStorage.lang`
2. Removes `.active` from all `.lang-btn`
3. Adds `.active` to the button whose text equals `lang.toUpperCase()`
4. If the page is bilingual (has `<meta id="page-lang">`) and the selected language differs from the current one — redirects to the `data-lang-pair` URL

> **Note:** on non-bilingual pages the function only toggles the visual state of the buttons. No content translation — the `lang` variable is reserved for future use.

---

### `toggleMobMenu()`

```js
function toggleMobMenu()
```

**Called by:** `onclick` on `#burgerBtn`.

**What it does:** toggles `.open` class on three elements simultaneously:
- `#mobDrawer` — slides out the drawer
- `#mobOverlay` — shows the backdrop
- `#burgerBtn` — animates burger into an X

---

### `closeMobMenu()`

```js
function closeMobMenu()
```

**Called by:** `onclick` on `#mobOverlay` (clicking the overlay closes the menu).

**What it does:** removes `.open` from `#mobDrawer`, `#mobOverlay`, `#burgerBtn`.

---

### IIFE — restore state

```js
(function () {
  const t = localStorage.getItem('theme');
  if (t === 'light') { ... }
  const lang = localStorage.getItem('lang') || 'en';
  if (lang === 'ru') { ... }
})();
```

**Executes:** immediately on page load (Immediately Invoked Function Expression).

**What it does:**
- If `localStorage.theme === 'light'` → applies light theme and sets ☀️
- If `localStorage.lang === 'ru'` → sets `.active` on the RU button

> **Why IIFE and not plain code?** Isolates variables (`t`, `lang`) from the global scope.

---

## _default/single.html — inline scripts

### Reading progress bar

```js
const bar = document.createElement('div');
bar.style.cssText = 'position:fixed;top:0;left:0;height:2px;...';
document.body.appendChild(bar);
window.addEventListener('scroll', () => {
  const h = document.body.scrollHeight - window.innerHeight;
  bar.style.width = (h > 0 ? Math.round(window.scrollY / h * 100) : 0) + '%';
});
```

Creates a reading progress bar. Width = `scrollY / (scrollHeight - viewportHeight) * 100%`.

---

### ToC builder

```js
const heads = document.querySelectorAll('#articleBody h2, #articleBody h3');
if (heads.length > 2) { ... }
```

**Condition:** only if there are more than 2 headings.

**Algorithm:**
1. Generates an HTML link list from `h2`/`h3` (using `id` attribute and `textContent`)
2. Inserts into `#tocAside`
3. If `window.innerWidth >= 860` — adds `.has-toc` to `.page` (two-column grid)
4. `resize` listener — removes/adds `.has-toc` on width change
5. `IntersectionObserver` with `rootMargin: '-10% 0px -80% 0px'` — highlights the active heading

**Why `rootMargin: '-80%` at the bottom?** A heading is considered active when it's in the top 20% of the viewport — feels more natural while scrolling.

---

### Copy buttons for raw pre blocks

```js
document.querySelectorAll('pre').forEach(pre => {
  if (pre.closest('.code-block')) return; // skip shortcode blocks
  // wraps pre in .code-block and adds a copy button
});

function cpPre(btn) {
  navigator.clipboard.writeText(pre.innerText)
    .then(() => { btn.textContent = 'ok!'; ... });
}
```

Applied to plain ```` ```bash ``` ```` markdown blocks. The `{{</* code */>}}` shortcode handles copying itself via `cpCode()`.

---

## `posts/list.html` — Pagefind search

```js
let pf = null;
async function loadPagefind() {
  if (pf) return;
  pf = await import('/pagefind/pagefind.js');
  await pf.init();
}

searchInput.addEventListener('input', async function() { ... });
```

**Lazy loading:** `pagefind.js` loads only on first input (not when the page opens). Saves bandwidth.

**Flow:**
1. User types → `input` event
2. `loadPagefind()` — if not loaded yet, does `import()`
3. `pf.search(q)` — returns results
4. `await Promise.all(results.map(r => r.data()))` — asynchronously fetches each result's data
5. Renders into `#searchResults` (absolute div below input)

**Closing:** `document.addEventListener('click')` — a click outside `.search-wrap` hides results.

---

## taxonomy/tag.html — tag filter

```js
const POSTS = [ /* embedded by Hugo template */ ];
let activeTag = '';

function renderArticles() {
  const filtered = activeTag
    ? POSTS.filter(p => p.tags.includes(activeTag))
    : POSTS;
  // innerHTML render
}

document.querySelectorAll('.tag-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    activeTag = btn.dataset.tag;
    renderArticles();
  });
});
```

**Data from Hugo:** the `POSTS` array is generated at build time. Each post contains:
- `tags` — array of urlized names (for filtering)
- `tagLabels` — array of display names (for rendering)

**`btn.dataset.tag`** — read from the `data-tag=""` attribute on the button. The "All" button has `data-tag=""` → `activeTag = ''` → all posts are shown.

---

## certs/single.html — accordion

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

## ns.js — Namespace Explorer

**Path:** `static/js/ns.js`  
**Loaded:** only on `/posts/linux-namespaces/` via `<script src="{{ "js/ns.js" | relURL }}">`

Contains:
- `nsData` — array of objects with data for all namespaces (name, flag, icon, color, summary, desc...)
- `cheatData` — array of commands for the cheatsheet table
- Render functions: `buildNsGrid()`, `buildNsMap()`, `buildCheatTable()`
- `toggleCard(el)` — expands/collapses a namespace card
- `IntersectionObserver` — progress bar (how many namespaces have been read)
- `buildToc()` — builds the table of contents in aside

---

## Related pages

- [Project Overview](/docs/overview/)
- [Templates](/docs/templates/)
- [CSS](/docs/css/)
- [Frontmatter](/docs/frontmatter/)
