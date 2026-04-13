---
title: "Теги и поиск"
date: 2026-04-13
description: "Как работают фильтрация по тегам и полнотекстовый поиск Pagefind — архитектура, поток данных и детали реализации"
page_lang: "ru"
lang_pair: "/docs/tags-and-search/"
pagefind_ignore: true
build:
  list: never
  render: always
tags: ["docs"]
---

## Две независимые системы

На сайте есть два независимых механизма поиска/фильтрации, сосуществующих на странице `/tags/`:

| Система | Где | Что делает |
|---|---|---|
| **Фильтр по тегам** | `/tags/` | Клиентская JS-фильтрация по массиву, сгенерированному Hugo |
| **Поиск Pagefind** | `/posts/` и `/tags/` | Полнотекстовый поиск по предварительно собранному индексу |

Они не взаимодействуют друг с другом — ввод в строку поиска использует Pagefind, клик по кнопке тега использует JS-фильтр.

---

## Фильтр по тегам

### Как теги превращаются в страницы

Hugo обрабатывает `tags:` из frontmatter и автоматически создаёт страницы таксономии:

```
tags: ["Linux", "LPIC-2", "Networking"]
         │
         ▼
/tags/linux/        ← список всех постов с тегом "Linux"
/tags/lpic-2/       ← список всех постов с тегом "LPIC-2"
/tags/networking/
```

Значение тега urlize-ится: `"LPIC-2"` → `lpic-2`, `"Networking"` → `networking`. Это urlized-значение хранится в атрибутах `data-tag` и массиве `POSTS`.

### Шаблон: `taxonomy/tag.html`

Один шаблон рендерит **все** страницы тегов — как индекс тегов (`/tags/`), так и страницы отдельных тегов.

#### Кнопки тегов (рендерятся Hugo во время сборки)

```html
<!-- Кнопка "All" — data-tag="" означает показать всё -->
<button class="tag tag-lg tag-filter active" data-tag="">
  All <span class="count">{{ len .Site.RegularPages }}</span>
</button>

<!-- По одной кнопке на тег, отсортированных по количеству постов (убывание) -->
{{ range .Site.Taxonomies.tags.ByCount }}
<button class="tag tag-lg tag-filter" data-tag="{{ .Page.Title | urlize }}">
  {{ .Page.Title }} <span class="count">{{ .Count }}</span>
</button>
{{ end }}
```

`.Site.Taxonomies.tags.ByCount` — встроенная функция Hugo: возвращает все теги, отсортированные по количеству постов по убыванию.

#### Массив `POSTS` (встраивается Hugo во время сборки)

Весь список постов сериализуется в JS-массив в процессе сборки Hugo:

```js
const POSTS = [
  {
    url:       "https://maks.top/posts/lpic2-200-1.../",
    title:     "LPIC-2 200.1 — Capacity Planning",
    date:      "2026-04-10",
    tags:      ["linux", "lpic-2", "monitoring"],    // urlized — для фильтрации
    tagLabels: ["Linux", "LPIC-2", "Monitoring"],    // оригинал — для отображения
    summary:   "CPU, memory, disk I/O monitoring..."
  },
  // ... все посты
];
```

Два отдельных массива тегов на пост:
- `tags` — urlized-значения для сравнения `===` в фильтре
- `tagLabels` — оригинальные значения для отображения в карточке

**Русские посты исключены** — шаблон пропускает страницы где `page_lang === "ru"`:
```
{{ range .Site.RegularPages }}{{ if ne .Params.page_lang "ru" }}
```

#### Логика клиентского фильтра

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

// Обработчик клика по кнопке
document.querySelectorAll('.tag-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tag-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTag = btn.dataset.tag;   // "" для "All", urlized-тег для остальных
    renderArticles();
  });
});

// Начальный рендер при загрузке страницы (показывает все посты)
renderArticles();
```

**Поток фильтрации:**
1. Страница загружается → `renderArticles()` запускается с `activeTag = ''` → показываются все посты
2. Пользователь кликает кнопку "Linux" → `activeTag = 'linux'`
3. `renderArticles()` фильтрует `POSTS`, где `p.tags.includes('linux')`
4. innerHTML `#tagArticles` заменяется отфильтрованными результатами — без перезагрузки страницы

Примечание: в карточке показываются только первые 2 тега поста (`tagLabels.slice(0, 2)`).

---

## Полнотекстовый поиск Pagefind

### Что такое Pagefind

Pagefind — статическая библиотека поиска, которая:
1. Обходит собранные HTML-файлы `public/` после `hugo --minify`
2. Строит бинарный поисковый индекс в `public/pagefind/`
3. Предоставляет JS API (`pagefind.js`) для клиентских запросов к индексу

Сервер не нужен — индекс раздаётся как статические файлы вместе с сайтом.

### Шаг сборки

```bash
# В CI (deploy.yml):
pagefind --site public

# Локально (через dev.sh):
hugo && npx pagefind --site public && hugo server --disableFastRender
```

Создаётся следующая структура:
```
public/
  pagefind/
    pagefind.js        ← клиентский API
    pagefind-*.pclf    ← бинарные шарды индекса
    pagefind.en.pclf   ← индекс для конкретного языка
```

> **Pagefind недоступен при `hugo server -D`** (без предварительного запуска `hugo`). Строка поиска молча вернёт пустой результат, если индекс не существует.

### Где отображается поиск Pagefind

| Страница | Шаблон | Примечание |
|---|---|---|
| `/posts/` | `posts/list.html` | Только полнотекстовый поиск |
| `/tags/` | `taxonomy/tag.html` | Полнотекстовый поиск + фильтр по тегам (независимо) |

### Ленивая загрузка

Pagefind не загружается при открытии страницы — загружается при первом нажатии клавиши:

```js
let pf = null;

async function loadPagefind() {
  if (pf) return;   // уже загружен — ничего не делать
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
  await loadPagefind();   // загружается только при первом нажатии
  ...
});
```

Экономит трафик — пользователи, не использующие поиск, не скачивают индекс.

### Поток поиска

```
Пользователь вводит "nginx"
        │
        ▼
loadPagefind()        ← dynamic import('/pagefind/pagefind.js') если не загружен
        │
        ▼
pf.search("nginx")    ← возвращает массив объектов результатов (ленивых, без данных)
        │
        ▼
Promise.all(results.slice(0, 8).map(r => r.data()))
                      ← загружает данные топ-8 результатов (асинхронно, параллельно)
        │
        ▼
Рендер в #searchResults
  - item.meta.title   ← заголовок страницы
  - item.url          ← URL страницы
  - item.excerpt      ← контекстный сниппет с выделением совпадения
```

`.data()` ленивый — Pagefind не загружает полные данные результата, пока вы его не вызовете. `slice(0, 8)` ограничивает 8 результатами до загрузки данных, экономя трафик.

### Выпадающий список результатов

Контейнер результатов создаётся динамически, а не в HTML-шаблоне:

```js
const searchResults = document.createElement('div');
searchResults.id = 'searchResults';
searchResults.style.cssText = 'position:absolute;top:calc(100% + 8px);...';
document.querySelector('.search-wrap').appendChild(searchResults);
```

`.search-wrap` имеет `position: relative` — выпадающий список позиционируется относительно поля ввода.

**Закрытие выпадающего списка:**
```js
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) searchResults.style.display = 'none';
});
```
Любой клик за пределами `.search-wrap` скрывает результаты.

### Исключение страниц из индекса

Чтобы страница не индексировалась Pagefind, добавьте во frontmatter:

```yaml
pagefind_ignore: true
```

Шаблон `baseof.html` читает это и добавляет `data-pagefind-ignore="all"` к `<body>`:

```html
<body{{ if .Params.pagefind_ignore }} data-pagefind-ignore="all"{{ end }}>
```

---

## Общий поток данных

```
Время сборки (Hugo):
  content/posts/*.md
    └── frontmatter.tags → таксономия Hugo → страницы /tags/{tag}/
    └── данные всех постов → массив POSTS[] встраивается в JS tag.html

Время сборки (Pagefind):
  public/**/*.html → pagefind --site public → индекс public/pagefind/

Runtime (браузер):
  Пользователь кликает кнопку тега
    → JS-фильтр по POSTS[] → перерендер #tagArticles (без сети)

  Пользователь вводит в строку поиска
    → dynamic import pagefind.js (только первый раз)
    → pf.search(query) → загрузить топ-8 результатов
    → рендер выпадающего списка #searchResults
```

---

## Связанные страницы

- [Обзор проекта](/docs/ru/overview/)
- [Frontmatter](/docs/ru/frontmatter/)
- [Шаблоны](/docs/ru/templates/)
- [JavaScript](/docs/ru/javascript/)
- [Деплой и локальная разработка](/docs/ru/deploy/)
