---
title: "Создание новых страниц"
date: 2026-04-13
description: "Пошаговое руководство по добавлению любого типа страницы: prose-статья, интерактивная страница, страница сертификации"
page_lang: "ru"
lang_pair: "/docs/new-page/"
pagefind_ignore: true
build:
  list: never
  render: always
tags: ["docs"]
---

## Выбор типа страницы

| Что создаём | Тип | Используемый layout |
|---|---|---|
| Обычная статья (тема LPIC-2, туториал) | prose | `_default/single.html` |
| Интерактивный эксплорер (карточки, вкладки, JS) | interactive | `layouts/posts/<slug>.html` |
| Страница обзора сертификации | cert | `layouts/certs/single.html` |
| Запись базы знаний | prose | `_default/single.html` |

---

## Тип 1 — Prose-статья

Простейший случай. Кастомный layout не нужен — Hugo автоматически выбирает `_default/single.html`.

### Шаг 1: создать файл

```bash
# Статья LPIC-2 — следовать соглашению по именованию
content/posts/lpic2-205-4-my-topic.md

# Обычная статья
content/posts/my-topic-title.md
```

### Шаг 2: написать frontmatter

```yaml
---
title: "LPIC-2 205.4 — Название темы"
date: 2026-04-13
description: "Одно-два предложения. Используется в meta-теге и превью карточки статьи."
tags: ["Linux", "LPIC-2", "Networking"]
categories: ["LPIC-2"]
---
```

**Поля:**

| Поле | Обязательно | Примечание |
|---|---|---|
| `title` | да | Отображается в h1, карточке, breadcrumb |
| `date` | да | Определяет порядок сортировки в листингах |
| `description` | рекомендуется | Отображается в карточке поста и `<meta description>` |
| `tags` | рекомендуется | Создаёт страницы `/tags/{tag}/` |
| `categories` | нет | Используется для группировки постов в аккордеоне сертификации |
| `readingtime` | нет | Целое число (минуты). Отображается в шапке поста |

### Шаг 3: написать контент

Стандартный Markdown. Используйте шорткоды для расширенных блоков:

```markdown
## Заголовок раздела

Обычный текст абзаца.

{{</* code lang="bash" */>}}
sudo systemctl status nginx
{{</* /code */>}}

{{</* code lang="bash" label="output" */>}}
● nginx.service - A high performance web server
   Loaded: loaded (/lib/systemd/system/nginx.service)
   Active: active (running)
{{</* /code */>}}
```

> **Примечание:** `{{</* code */>}}` добавляет кнопку копирования. Обычные ` ```bash ``` ` тоже работают — `single.html` автоматически оборачивает их в `.code-block` с кнопкой копирования.

### Шаг 4: проверить локально

```bash
hugo server -D
# → http://localhost:1313/posts/my-topic-title/
```

Страница автоматически получает:
- Боковой TOC (десктоп), построенный из заголовков `h2`/`h3` — требуется более 2 заголовков
- Полоску прогресса чтения вверху
- Кнопки копирования на всех блоках кода

### Всё — никаких других файлов не нужно.

---

## Тип 2 — Интерактивная страница

Используется когда страница содержит JS-интерфейс: раскрывающиеся карточки, фильтры, трекинг прогресса, данные из JS-массива. Пример: `/posts/linux-namespaces/`.

### Шаг 1: создать файл контента

```bash
content/posts/my-interactive-topic.md
```

Frontmatter — добавить `layout`, чтобы указать Hugo на конкретный шаблон:

```yaml
---
title: "Моя интерактивная тема"
date: 2026-04-13
description: "Описание для meta и карточки поста."
tags: ["Linux"]
layout: "my-interactive-topic"
---

<div class="intro-card">
  Вводный абзац, рендерится из markdown в layout через <code>{{ .Content }}</code>.
</div>
```

### Шаг 2: создать файл layout

```bash
themes/maks/layouts/posts/my-interactive-topic.html
```

Минимальная структура:

```html
{{ define "head" }}
<link rel="stylesheet" href="{{ "styles/ns.css" | relURL }}">
{{ end }}

{{ define "main" }}
<div class="ns-page-wrap">

  <!-- ОСНОВНАЯ КОЛОНКА -->
  <div class="ns-page-main">

    <div class="breadcrumb">
      <a href="{{ "/" | relURL }}">maks.top</a><span>/</span>
      <a href="{{ "/posts/" | relURL }}">posts</a><span>/</span>
      <span style="color:var(--text2)">{{ .Title }}</span>
    </div>

    <div class="post-h1">{{ .Title }}</div>
    <div class="post-meta">
      <span class="p-date">{{ .Date.Format "2006-01-02" }}</span>
      {{ range .Params.tags }}
        <a href="{{ "/tags/" | relURL }}{{ . | urlize }}/" class="ptag">{{ . }}</a>
      {{ end }}
    </div>

    {{ .Content }}

    <!-- ИНТЕРАКТИВНЫЙ КОНТЕНТ ЗДЕСЬ -->
    <div class="ns-grid" id="myGrid"></div>

    <div class="back-link"><a href="{{ "/posts/" | relURL }}">← Назад к постам</a></div>
  </div>

  <!-- ASIDE (опционально) -->
  <div class="ns-page-aside">
    <div class="toc-box">
      <div class="toc-head">Содержание</div>
      <div class="toc-body" id="tocBody"></div>
    </div>
  </div>

</div>
{{ end }}

{{ define "scripts" }}
<script src="{{ "js/ns.js" | relURL }}"></script>
<script>
  // Инициализация — ПОСЛЕ внешнего <script src> выше
  const MY_DATA = [
    { name: "Элемент 1", color: "#00d4ff" },
  ];
  buildCards(MY_DATA, 'myGrid');
</script>
{{ end }}
```

> **Важно:** инлайн-код инициализации должен находиться в `{{ define "scripts" }}`, после всех `<script src="...">`. Размещение до них вызывает `ReferenceError: buildCards is not defined`.

### Шаг 3: добавить CSS если нужно

Если `ns.css` не покрывает ваши компоненты, создайте новый файл:

```bash
themes/maks/static/styles/my-topic.css
```

Затем подключите его в блоке `{{ define "head" }}` layout вместо `ns.css` или вместе с ним.

### Шаг 4: данные и логика JS

Два подхода:

**А) Инлайн в `{{ define "scripts" }}`** — для небольших данных, без лишних файлов:

```html
{{ define "scripts" }}
<script>
const DATA = [ ... ];
function buildCards(data) { ... }
buildCards(DATA);
</script>
{{ end }}
```

**Б) Внешний JS-файл** — для больших скриптов, как `ns.js`:

```bash
# Создать файл
themes/maks/static/js/my-topic.js
```

```html
{{ define "scripts" }}
<script src="{{ "js/my-topic.js" | relURL }}"></script>
<script>
  // только инлайн-инит — вызывает функции из my-topic.js
  initMyTopic(DATA);
</script>
{{ end }}
```

---

## Тип 3 — Страница сертификации

Страницы сертификаций используют шаблон `certs/single.html`, который автоматически генерирует аккордеон тем экзаменов со ссылками на статьи. Кастомный layout не нужен — только файл контента с правильным frontmatter.

### Шаг 1: создать файл

```bash
content/certs/my-cert.md
```

### Шаг 2: написать frontmatter

```yaml
---
title: "CKA"
cert_badge: "⚙️"
cert_color: "#10b981"
description: "Certified Kubernetes Administrator"
post_prefix: "cka"
exams:
  - code: "CKA"
    title: "Certified Kubernetes Administrator"
    topics:
      - {num: "01", title: "Cluster Architecture"}
      - {num: "02", title: "Workloads & Scheduling"}
      - {num: "03", title: "Services & Networking"}
---
```

**Как `post_prefix` + `num` связывают статьи с темами:**

Шаблон строит паттерн `{post_prefix}-{num}-` и сопоставляет его со slug-ами файлов статей.

```
post_prefix = "cka"
topic.num   = "01"
паттерн     = "cka-01-"

Совпадает:  content/posts/cka-01-cluster-architecture.md  ✓
            content/posts/cka-01-etcd-backup.md            ✓
Нет совп.:  content/posts/cka-02-deployments.md            ✗
```

> **Важно:** значения `num` должны быть строками. YAML интерпретирует голые числа как целые, что ломает сопоставление строк в шаблоне. Используйте `"01"`, не `01`.

### Шаг 3: добавить сертификат в виджет

Откройте `themes/maks/layouts/partials/certs-widget.html` и добавьте карточку в grid:

```html
<a href="/certs/my-cert/" class="cert-card" style="--cert-color:#10b981">
  <div class="cert-top">
    <div class="cert-badge">⚙️</div>
    <div class="cert-name">CKA</div>
  </div>
  <div class="cert-sub">Certified Kubernetes Administrator</div>
  <div class="progress-bar">
    <div class="progress-fill" style="width:0%"></div>
  </div>
  <div class="progress-label">
    <span>Запланирован</span>
    <span class="pct">0%</span>
  </div>
</a>
```

> Процент прогресса задан хардкодом — обновляйте вручную по мере продвижения.

---

## Добавление двуязычной страницы

Чтобы страница переключалась между EN и RU:

### Английская версия

```yaml
---
title: "My Topic"
page_lang: "en"
lang_pair: "/docs/ru/my-topic/"
---
```

### Русская версия

```bash
content/docs/ru/my-topic.md
```

```yaml
---
title: "Моя тема"
page_lang: "ru"
lang_pair: "/docs/my-topic/"
---
```

Функция `setLang()` в `baseof.html` читает `lang_pair` из `<meta id="page-lang">` и делает редирект при переключении языка. Без этих полей кнопки языка только меняют визуальное состояние — редиректа нет.

---

## Чеклист перед публикацией

```bash
# 1. Сборка без ошибок
hugo

# 2. Проверить, что страница рендерится корректно
hugo server --disableFastRender
# Открыть http://localhost:1313/posts/my-topic/

# 3. Убедиться, что CSS загружается (нет 404 во вкладке Network DevTools)

# 4. Проверить переключение тёмной/светлой темы

# 5. Проверить на мобильном viewport (DevTools → Toggle device toolbar)

# 6. Если использован новый layout — убедиться, что имя файла layout
#    совпадает с полем `layout:` во frontmatter
```

---

## Связанные страницы

- [Обзор проекта](/docs/ru/overview/)
- [Frontmatter](/docs/ru/frontmatter/)
- [Шаблоны](/docs/ru/templates/)
- [CSS](/docs/ru/css/)
- [JavaScript](/docs/ru/javascript/)
