---
title: "JavaScript — Функции и Справочник Событий"
date: 2026-04-11
description: "Все JavaScript функции: где определены, откуда вызываются и что делают"
page_lang: "ru"
lang_pair: "/docs/javascript/"
pagefind_ignore: true
_build:
  list: never
  render: always
tags: ["docs"]
---

## Где живёт JS

| Файл | Загружается | Назначение |
|---|---|---|
| Inline в `baseof.html` `<script>` | каждая страница | Глобальные функции (тема, меню) + restore из localStorage |
| `static/js/site.js` | **нигде не подключён** | Дублирует функции из baseof (устаревший) |
| Inline в `_default/single.html` `{{ block "scripts" }}` | страницы статей | Progress bar + ToC + copy buttons |
| Inline в `posts/list.html` `{{ block "scripts" }}` | `/posts/` | Pagefind поиск |
| Inline в `taxonomy/tag.html` `{{ block "scripts" }}` | `/tags/` | Pagefind поиск + tag filter |
| Inline в `certs/single.html` `{{ block "scripts" }}` | `/certs/*` | Accordion toggle |
| `static/js/ns.js` | `/posts/linux-namespaces/` | Namespace explorer (данные + рендер) |

---

## baseof.html — глобальные функции

### `toggleTheme()`

```js
function toggleTheme()
```

**Вызывается:** `onclick` на `#themeBtn` (desktop) и `#themeBtnMob` (mobile).

**Что делает:**
1. Читает текущий атрибут `data-theme` с `<html>`
2. Переключает на противоположный (`dark` ↔ `light`)
3. Сохраняет в `localStorage.theme`
4. Меняет иконку на всех кнопках `#themeBtn`, `#themeBtnMob`

**CSS-связь:** `document.documentElement.setAttribute('data-theme', next)` триггерит CSS-переменные `[data-theme="light"]`.

---

### `setLang(lang, btn)`

```js
function setLang(lang, btn)
// Пример вызова: setLang('ru', this)
```

**Вызывается:** `onclick` на кнопках `.lang-btn` в desktop nav и mobile drawer.

**Что делает:**
1. Сохраняет `lang` в `localStorage.lang`
2. Убирает `.active` со всех `.lang-btn`
3. Добавляет `.active` кнопке с текстом = `lang.toUpperCase()`
4. Если страница билингвальная (есть `<meta id="page-lang">`) и выбранный язык отличается от текущего — перенаправляет на `data-lang-pair` URL

> **Билингвальные страницы:** страницы документации имеют `lang: "en"` и `lang_pair: "/docs/ru/..."` во frontmatter. baseof вставляет `<meta id="page-lang">` с этими значениями. При переключении языка `setLang()` делает `window.location.href` на парную страницу.

---

### `toggleMobMenu()`

```js
function toggleMobMenu()
```

**Вызывается:** `onclick` на `#burgerBtn`.

**Что делает:** toggle класса `.open` на трёх элементах одновременно:
- `#mobDrawer` — выдвигает drawer
- `#mobOverlay` — показывает затемнение
- `#burgerBtn` — анимирует бургер в крестик

---

### `closeMobMenu()`

```js
function closeMobMenu()
```

**Вызывается:** `onclick` на `#mobOverlay` (клик по overlay закрывает меню).

**Что делает:** убирает `.open` у `#mobDrawer`, `#mobOverlay`, `#burgerBtn`.

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

**Выполняется:** сразу при загрузке страницы (Immediately Invoked Function Expression).

**Что делает:**
- Если `localStorage.theme === 'light'` → применяет светлую тему и ставит ☀️
- Если `localStorage.lang === 'ru'` → ставит `.active` на кнопку RU

> **Зачем IIFE, а не просто код?** Изоляция переменных (`t`, `lang`) от глобального scope.

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

Создаёт полоску прогресса чтения. Ширина = `scrollY / (scrollHeight - viewportHeight) * 100%`.

---

### ToC builder

```js
const heads = document.querySelectorAll('#articleBody h2, #articleBody h3');
if (heads.length > 2) { ... }
```

**Условие:** только если заголовков `> 2`.

**Алгоритм:**
1. Генерирует HTML списка ссылок из `h2`/`h3` (по атрибуту `id` и `textContent`)
2. Вставляет в `#tocAside`
3. Если `window.innerWidth >= 860` — добавляет `.has-toc` на `.page` (двухколоночный grid)
4. `resize` listener — убирает/добавляет `.has-toc` при изменении ширины
5. `IntersectionObserver` с `rootMargin: '-10% 0px -80% 0px'` — подсвечивает активный заголовок

**Почему `rootMargin: '-80%` снизу?** Заголовок считается активным когда он в верхних 20% viewport — более естественное ощущение при скролле.

---

### Copy buttons для сырых pre-блоков

```js
document.querySelectorAll('pre').forEach(pre => {
  if (pre.closest('.code-block')) return; // пропускаем shortcode-блоки
  // оборачивает pre в .code-block и добавляет кнопку copy
});

function cpPre(btn) {
  navigator.clipboard.writeText(pre.innerText)
    .then(() => { btn.textContent = 'ok!'; ... });
}
```

Применяется к обычным ```` ```bash ``` ```` блокам markdown. Shortcode `{{</* code */>}}` обрабатывает копирование сам через `cpCode()`.

---

## `posts/list.html` — Pagefind поиск

```js
let pf = null;
async function loadPagefind() {
  if (pf) return;
  pf = await import('/pagefind/pagefind.js');
  await pf.init();
}

searchInput.addEventListener('input', async function() { ... });
```

**Ленивая загрузка:** `pagefind.js` загружается только при первом вводе (не при открытии страницы). Экономит трафик.

**Поток:**
1. Пользователь вводит текст → `input` event
2. `loadPagefind()` — если ещё не загружен, делает `import()`
3. `pf.search(q)` — возвращает результаты
4. `await Promise.all(results.map(r => r.data()))` — асинхронно получает данные каждого результата
5. Рендерит в `#searchResults` (absolute div под input)

**Закрытие:** `document.addEventListener('click')` — клик вне `.search-wrap` скрывает результаты.

---

## taxonomy/tag.html — tag filter

```js
const POSTS = [ /* встроен Hugo-шаблоном */ ];
let activeTag = '';

function renderArticles() {
  const filtered = activeTag
    ? POSTS.filter(p => p.tags.includes(activeTag))
    : POSTS;
  // innerHTML рендер
}

document.querySelectorAll('.tag-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    activeTag = btn.dataset.tag;
    renderArticles();
  });
});
```

**Данные из Hugo:** массив `POSTS` генерируется в момент сборки. Каждый пост содержит:
- `tags` — массив urlized-имён (для фильтрации)
- `tagLabels` — массив display-имён (для рендера)

**`btn.dataset.tag`** — читается из `data-tag=""` атрибута кнопки. Кнопка "All" имеет `data-tag=""` → `activeTag = ''` → показываются все посты.

---

## certs/single.html — accordion

```js
function toggleTopic(btn) {
  const topic = btn.closest('.cert-topic');
  const body  = topic.querySelector('.cert-topic-body');
  if (!body) return;                              // топики без постов не раскрываются
  const open = topic.classList.toggle('open');
  body.style.maxHeight = open ? body.scrollHeight + 'px' : '0';
}
```

**Анимация через `max-height`:** CSS-анимация `max-height: 0 → scrollHeight`. `scrollHeight` = реальная высота содержимого.

**Почему не `height: auto`?** CSS не умеет анимировать `auto`. `max-height` — стандартный обходной путь.

---

## ns.js — Namespace Explorer

**Путь:** `static/js/ns.js`  
**Загружается:** только на `/posts/linux-namespaces/` через `<script src="{{ "js/ns.js" | relURL }}">`

Содержит:
- `nsData` — массив объектов с данными по всем namespace'ам (name, flag, icon, color, summary, desc...)
- `cheatData` — массив команд для cheatsheet таблицы
- Функции рендера: `buildNsGrid()`, `buildNsMap()`, `buildCheatTable()`
- `toggleCard(el)` — раскрывает/закрывает namespace карточку
- `IntersectionObserver` — progress bar (сколько namespace'ов прочитано)
- `buildToc()` — строит содержание в aside

---

## Связанные страницы

- [Обзор проекта](/docs/ru/overview/)
- [Шаблоны](/docs/ru/templates/)
- [CSS](/docs/ru/css/)
- [Frontmatter](/docs/ru/frontmatter/)
