---
title: "Frontmatter — Справочник Полей"
date: 2026-04-11
description: "Все поля frontmatter по типам контента с типами, обязательностью и описаниями"
page_lang: "ru"
lang_pair: "/docs/frontmatter/"
pagefind_ignore: true
tags: ["docs"]
---

## Что такое frontmatter

Frontmatter — блок YAML в начале каждого `.md` файла между `---`. Hugo читает его и делает доступным в шаблонах через `.Params` и встроенные поля.

```yaml
---
title: "Название"        # встроенное поле → .Title
date: 2026-04-11         # встроенное поле → .Date
my_param: "value"        # кастомное → .Params.my_param
---
```

---

## Встроенные поля Hugo (все типы контента)

| Поле | Тип | Доступ в шаблоне | Описание |
|---|---|---|---|
| `title` | string | `.Title` | Заголовок страницы. Используется в `<title>`, h1, breadcrumb, карточках |
| `date` | date | `.Date` | Дата публикации. Формат: `2026-04-11`. Влияет на сортировку |
| `description` | string | `.Description` | Мета-описание. Используется в `<meta description>` и превью карточек |
| `draft` | bool | `.Draft` | `true` — страница не публикуется при `hugo` (только при `hugo -D`) |
| `tags` | []string | `.Params.tags` | Теги. Создают страницы `/tags/{tag-name}/` |
| `categories` | []string | `.Params.categories` | Категории. Создают страницы `/categories/{name}/` |
| `weight` | int | `.Weight` | Ручная сортировка (меньше = выше) |

---

## Поля для постов (`content/posts/*.md`)

### Используемые в шаблонах

| Поле | Тип | Обязательный | Используется в | Описание |
|---|---|---|---|---|
| `title` | string | **да** | h1, карточка, ToC | Название статьи |
| `date` | date | **да** | карточка, сортировка | Дата публикации |
| `description` | string | рекомендуется | meta, карточка, cert-page | Краткое описание (1-2 предложения) |
| `tags` | []string | рекомендуется | post-meta, фильтры, /tags/ | Теги статьи |
| `categories` | []string | нет | фильтр в `certs/single.html` | Категория (напр. "LPIC-2") |
| `readingtime` | int | нет | `.post-meta` в single.html | Время чтения в минутах |

### Пример для статьи LPIC-2

```yaml
---
title: "LPIC-2 200.1 — Measuring and Diagnosing Resource Usage"
date: 2026-04-10
description: "CPU, memory, disk I/O monitoring: top, vmstat, iostat, sar. LPIC-2 topic 200.1."
tags: ["Linux", "Performance", "LPIC-2", "Monitoring"]
categories: ["LPIC-2"]
---
```

### Как `description` используется в разных местах

| Место | Шаблон | Поведение |
|---|---|---|
| Мета-тег страницы | `baseof.html` | `.Description` или `.Site.Params.description` |
| Карточка в листинге | `list.html` | `.Description` → если нет, то `.Summary` (первые 120 символов) |
| Ссылка в cert-accordion | `certs/single.html` | `.Description` под заголовком |
| Результат поиска Pagefind | Pagefind | excerpt из контента страницы |

---

## Поля для страниц сертификатов (`content/certs/*.md`)

Эти поля — кастомные, читаются через `.Params.*` в `certs/single.html`.

| Поле | Тип | Обязательный | Описание |
|---|---|---|---|
| `title` | string | **да** | Название сертификата (напр. "LPIC-2") |
| `cert_badge` | string | **да** | Emoji-иконка (напр. "🖥️") |
| `cert_color` | string | **да** | CSS-цвет (hex). Используется для `--cert-color` и border |
| `description` | string | **да** | Подзаголовок в hero-блоке |
| `post_prefix` | string | **да** | Префикс для поиска постов по slug (напр. `"lpic2"`) |
| `exams` | []Exam | нет | Список экзаменов с темами. Без него — страница "coming soon" |

### Структура `exams`

```yaml
exams:
  - code: "201"              # Код экзамена (строка)
    title: "Advanced Linux"  # Название экзамена
    topics:
      - num: "200"           # Номер темы (строка!)
        title: "Capacity Planning"
      - num: "201"
        title: "Linux Kernel"
```

> **Важно:** `num` должен быть строкой (без кавычек YAML может интерпретировать как int). В шаблоне он используется для формирования паттерна: `"{post_prefix}-{num}-"`.

### Как `post_prefix` связывает посты с темами

```
post_prefix = "lpic2"
topic.num   = "200"
──────────────────────────────────────────────
Паттерн: "lpic2-200-"

Совпадёт:  lpic2-200-1-capacity-planning.md  ✓
           lpic2-200-2-predict-future.md      ✓
Не совпадёт: lpic2-201-1-kernel.md           ✗
```

Таким образом, **slug файла статьи определяет к какой теме она принадлежит**.

---

## Поля для страницы About (`content/about.md`)

`about.md` не использует кастомных полей frontmatter — данные профиля (имя, ссылки) берутся из `hugo.toml [params]`.

```yaml
---
title: "About"
date: 2026-04-01
---
```

Тело `.md` рендерится в `.prose` в `about/single.html`.

---

## Поля для документации (`content/docs/*.md`)

```yaml
---
title: "Название страницы"
date: 2026-04-11
description: "Описание для meta"
page_lang: "en"
lang_pair: "/docs/ru/frontmatter/"
tags: ["docs"]
---
```

Используют стандартный `_default/single.html` с ToC sidebar.

---

## Глобальные параметры сайта (`hugo.toml [params]`)

Доступны в шаблонах как `.Site.Params.*`:

| Параметр | Доступ | Используется в |
|---|---|---|
| `author` | `.Site.Params.author` | `about/single.html` → `.about-name` |
| `description` | `.Site.Params.description` | `baseof.html` → `<meta description>` fallback |
| `location` | `.Site.Params.location` | `about/single.html`, `footer` |
| `github` | `.Site.Params.github` | `about/single.html` → ссылка GH |
| `linkedin` | `.Site.Params.linkedin` | `about/single.html` → ссылка in |
| `telegram` | `.Site.Params.telegram` | `about/single.html` → ссылка ✈ |

---

## Связанные страницы

- [Обзор проекта](/docs/ru/overview/)
- [Шаблоны](/docs/ru/templates/)
- [CSS](/docs/ru/css/)
- [JavaScript](/docs/ru/javascript/)
