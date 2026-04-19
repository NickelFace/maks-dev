---
title: "LPIC-1 105.1 — Переменные оболочки и окружение (часть 2)"
date: 2026-04-19
description: "Локальные и глобальные переменные, export, env, распространённые переменные окружения, псевдонимы, функции, /etc/skel. Тема 105.1 экзамена LPIC-1."
tags: ["Linux", "LPIC-1", "bash", "оболочка", "окружение", "export", "alias", "PATH"]
categories: ["LPIC-1"]
page_lang: "ru"
lang_pair: "/posts/lpic1/lpic1-105-1-shell-variables/"
pagefind_ignore: true
build:
  list: never
  render: always
---

> **Вес на экзамене: 4** — LPIC-1 v5, Экзамен 102 | Часть 2 темы 105.1

## Типы оболочек — кратко

Bash читает разные файлы инициализации в зависимости от двух признаков: интерактивная/неинтерактивная и login/non-login.

Проверить интерактивность через `$-` — буква `i` означает интерактивную оболочку:

```bash
$ echo $-
himBHs
```

Проверить login-статус:

```bash
$ echo $0          # начинается с дефиса (-bash) = login
$ shopt login_shell  # on = login, off = non-login
```

| Способ запуска | Login | Интерактивная |
|---|---|---|
| `ssh user@host` | да | да |
| `Ctrl+Alt+F2` (вход на tty) | да | да |
| `su -` / `sudo -i` | да | да |
| `gnome-terminal`, `sakura` | нет | да |
| `bash` внутри оболочки | нет | да |
| `./script.sh` | нет | нет |
| `bash -c 'команда'` | нет | нет |

---

## Файлы инициализации

### Глобальные файлы (для всех пользователей)

`/etc/profile` — читается любой login-оболочкой. Обычно подгружает `/etc/profile.d/*.sh`.

`/etc/bash.bashrc` — Debian/Ubuntu. Читается интерактивными оболочками.

`/etc/bashrc` — RHEL/CentOS. Аналог `/etc/bash.bashrc`.

### Пользовательские файлы

`~/.bash_profile` — личный login-файл, наивысший приоритет.

`~/.bash_login` — читается только при отсутствии `~/.bash_profile`.

`~/.profile` — запасной вариант. Совместим с другими POSIX-оболочками. Читается, если нет ни `~/.bash_profile`, ни `~/.bash_login`.

`~/.bashrc` — для интерактивных non-login оболочек. Часто подгружается из `~/.bash_profile`:

```bash
if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi
```

`~/.bash_logout` — выполняется при выходе из login-оболочки.

### Порядок чтения

| Тип оболочки | Читаемые файлы |
|---|---|
| Login + интерактивная | `/etc/profile` → `/etc/profile.d/*.sh` → первый из `~/.bash_profile`, `~/.bash_login`, `~/.profile` (подгружает `~/.bashrc`) |
| Non-login + интерактивная | `/etc/bash.bashrc` (если есть), `~/.bashrc` |
| Non-login + неинтерактивная (скрипт) | Только файл из `BASH_ENV`, если задана |
| При выходе из login | `~/.bash_logout` |

### Команды source и точка

Применить изменения `~/.bashrc` без перезапуска:

```bash
source ~/.bashrc
. ~/.bashrc          # эквивалент
```

Обе команды выполняют файл в **текущей** оболочке. Запуск через `bash file` создаёт дочернюю — изменения исчезнут при её завершении.

Полная замена текущего процесса оболочки: `exec bash` или `exec $SHELL`.

---

## Переменные оболочки

### Присваивание и ссылка

```bash
$ distro=zorinos     # присваивание — пробелы вокруг = запрещены
$ echo $distro       # ссылка — нужен знак доллара
zorinos
```

Пробелы вокруг `=` ломают команду:

```bash
$ distro =zorinos
-bash: distro: command not found
$ distro= zorinos
-bash: zorinos: command not found
```

### Правила имён

- Буквы (`a-z`, `A-Z`), цифры (`0-9`), подчёркивание (`_`)
- Первый символ: буква или `_`, но не цифра
- Пробелы в имени запрещены

```bash
$ distro_1=zorinos    # OK
$ _distro=zorinos     # OK
$ 1distro=zorinos     # ошибка
```

### Правила значений

Значения с **пробелами** нужно брать в кавычки:

```bash
$ distro="zorin 12.4"
```

Символы перенаправления и конвейера без кавычек интерпретируются буквально:

```bash
$ distro=>zorin      # создаст пустой файл zorin
$ distro=">zorin"    # теперь это значение переменной
```

Обратный слеш нужно экранировать ещё одним:

```bash
$ win_path=C:\\path\\to\\dir\\
$ echo $win_path
C:\path\to\dir\
```

### Кавычки при присваивании

Одинарные — буквально, без подстановки:

```bash
$ lizard=uromastyx
$ animal='My $lizard'
$ echo $animal
My $lizard
```

Двойные — разрешают подстановку переменных:

```bash
$ animal="My $lizard"
$ echo $animal
My uromastyx
```

При выводе переменной со значением, содержащим пробелы, двойные кавычки обязательны:

```bash
$ lizard="    genus    |    uromastyx"
$ echo $lizard          # field splitting съедает пробелы
genus | uromastyx
$ echo "$lizard"        # пробелы сохранены
    genus    |    uromastyx
```

---

## Локальные переменные оболочки

По соглашению: имена **строчными** буквами.

### readonly — неизменяемая переменная

```bash
$ readonly reptile=tortoise
```

Или двумя шагами:

```bash
$ reptile=tortoise
$ readonly reptile
```

Попытка изменить:

```bash
$ reptile=lizard
-bash: reptile: readonly variable
```

Список readonly-переменных:

```bash
$ readonly
$ readonly -p
```

### set — список всех переменных

`set` без аргументов выводит все переменные и функции (включая неэкспортированные):

```bash
$ set | less
$ set | grep reptile
reptile=tortoise
```

### Дочерние оболочки и видимость

Локальная переменная в дочернюю оболочку не передаётся:

```bash
$ reptile=tortoise
$ bash
$ echo $reptile
                     # пусто
$ exit
```

### unset — удаление переменной

```bash
$ unset reptile
$ echo $reptile
                     # пусто
```

Знак доллара перед именем не ставится. Работает и для локальных, и для глобальных.

---

## Глобальные переменные окружения

Видны в текущей оболочке и во всех порождённых процессах. По соглашению: имена **ЗАГЛАВНЫМИ** буквами.

```bash
$ echo $SHELL
/bin/bash
```

### Передача значения между переменными

```bash
$ my_shell=$SHELL
$ your_shell=$my_shell
$ echo $your_shell
/bin/bash
```

### export — сделать переменную глобальной

```bash
$ export reptile          # экспортировать существующую
$ export amphibian=frog   # создать и экспортировать сразу
```

После экспорта переменная видна в дочерних оболочках:

```bash
$ bash
$ echo $amphibian
frog
```

### export -n — отменить экспорт

```bash
$ export -n reptile       # снова локальная
```

### env, printenv, declare -x

Все три перечисляют переменные окружения.

`export` без аргументов (эквивалент `declare -x`):

```bash
$ export
declare -x HOME="/home/user2"
declare -x PATH="/usr/local/bin:/usr/bin:/bin"
declare -x SHELL="/bin/bash"
```

`env` и `printenv` — более простой список:

```bash
$ env
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
HOME=/home/user2
```

`printenv` умеет показать одну переменную **без** знака доллара:

```bash
$ printenv PWD
/home/user2
```

Различие для экзамена: `set` показывает всё, включая локальные переменные и функции. `env`/`printenv` — только экспортированные.

---

## Запуск программы в изменённом окружении

### env -i — пустое окружение

```bash
$ env -i bash
$ echo $USER
                     # пусто
```

Полезно для проверки, что скрипт не зависит от случайных пользовательских переменных.

### env VAR=value command

Запустить команду с временно изменённой переменной — окружение оболочки не меняется:

```bash
$ env LANG=es_ES.UTF-8 date
```

### BASH_ENV для скриптов

Неинтерактивный скрипт не читает startup-файлов, но проверяет `BASH_ENV`. Если задана, Bash читает указанный файл перед выполнением скрипта:

```bash
# ~/.startup_script
CROCODILIAN=caiman
```

```bash
$ BASH_ENV=/home/user2/.startup_script ./test_env.sh
caiman
```

---

## Распространённые переменные окружения

### DISPLAY

Адрес X-сервера: `[хост]:дисплей[:экран]`. Пустой хост — localhost:

```bash
$ printenv DISPLAY
:0
```

`reptilium:0:2` — X-сервер на хосте `reptilium`, дисплей 0, экран 2.

### Переменные истории

| Переменная | Назначение |
|---|---|
| `HISTCONTROL` | `ignorespace` (не сохранять команды с пробелом в начале), `ignoredups` (не сохранять дубликаты подряд), `ignoreboth` (оба) |
| `HISTSIZE` | Команд в памяти за сессию (по умолчанию 1000) |
| `HISTFILESIZE` | Команд в файле истории (по умолчанию 2000) |
| `HISTFILE` | Путь к файлу истории (по умолчанию `~/.bash_history`) |

### HOME и тильда

`HOME` — абсолютный путь к домашнему каталогу. Тильда `~` это синоним:

```bash
$ echo ~; echo $HOME
/home/carol
/home/carol
```

Стандартная проверка в `~/.profile`:

```bash
if [ -f "$HOME/.bashrc" ]; then
    . "$HOME/.bashrc"
fi
```

Проверка равенства:

```bash
$ if [ ~ == "$HOME" ]; then echo "true"; fi
true
```

### HOSTNAME и HOSTTYPE

```bash
$ echo $HOSTNAME      # TCP/IP-имя хоста
debian
$ echo $HOSTTYPE      # архитектура процессора
x86_64
```

### LANG

Локаль системы:

```bash
$ echo $LANG
en_UK.UTF-8
```

### LD_LIBRARY_PATH

Каталоги с разделяемыми библиотеками через двоеточие:

```bash
$ echo $LD_LIBRARY_PATH
/usr/local/lib
```

### MAIL и MAILCHECK

```bash
$ echo $MAIL          # путь к почтовому ящику
/var/mail/carol
$ echo $MAILCHECK     # интервал проверки почты в секундах
60
```

### PATH

Список каталогов через двоеточие. Типичный блок из `/etc/profile`:

```bash
if [ "`id -u`" -eq 0 ]; then
    PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
else
    PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games"
fi
export PATH
```

`id -u` возвращает UID — 0 у root.

Добавить каталог:

```bash
$ PATH=/новый:$PATH     # в начало (ищется первым)
$ PATH=$PATH:/новый     # в конец (ищется последним)
```

### Переменные приглашения PS1–PS4

`PS1` — основное приглашение (`# ` у root, `$ ` у обычных).

`PS2` — продолжение многострочной команды (по умолчанию `> `).

`PS3` — приглашение для конструкции `select`.

`PS4` — отладочный префикс для `set -x` (по умолчанию `+ `).

### SHELL и USER

```bash
$ echo $SHELL        # абсолютный путь к текущей оболочке
/bin/bash
$ echo $USER         # имя текущего пользователя
carol
```

---

## Псевдонимы и функции

### Псевдонимы

```bash
alias ll='ls -lah'
alias ..='cd ..'
alias grep='grep --color=auto'

alias             # список всех
unalias ll        # удалить один
unalias -a        # удалить все
```

### Функции Bash

Принимают позиционные аргументы через `$1`, `$2`, `$@`. Функция сильнее псевдонима при совпадении имён.

```bash
greet() {
    echo "Привет, $1!"
}

greet Мир
# Привет, Мир!
```

Список всех функций:

```bash
$ declare -f
```

### Сохранение

Прописать в `~/.bashrc`. Многие дистрибутивы используют `~/.bash_aliases`, который подгружается из `~/.bashrc`:

```bash
if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
fi
```

---

## Skeleton-каталог /etc/skel

Шаблон домашнего каталога. Содержимое копируется в домашний каталог каждого нового пользователя при создании через `useradd -m` или `adduser`.

```bash
$ ls -la /etc/skel
.bash_logout  .bashrc  .profile
```

Добавить строку в любой файл здесь — все **будущие** пользователи получат её автоматически. Существующих не затрагивает.

Изменить путь: параметр `SKEL=` в `/etc/default/useradd` или флаг `useradd -k /другой/skel`.

---

## Шпаргалка

```bash
# Проверка типа оболочки
echo $0              # -bash = login
shopt login_shell    # on = login, off = non-login
echo $-              # 'i' = интерактивная

# Применить конфигурацию без перезапуска
source ~/.bashrc
. ~/.bashrc
exec bash            # заменить процесс оболочки

# Переменные
var=value            # локальная
export var=value     # создать и экспортировать
export var           # экспортировать существующую
export -n var        # отменить экспорт
readonly var=value   # неизменяемая
readonly             # список readonly
unset var            # удалить
echo $var            # показать значение
printenv var         # показать значение (без $)

# Списки переменных
set                  # все переменные и функции
env                  # только окружение
printenv             # то же что env
export               # окружение с declare -x
declare -x           # синоним export

# Изменённое окружение
env -i bash                          # пустое окружение
env LANG=es_ES.UTF-8 date            # одна переменная для команды
BASH_ENV=~/.startup ./script.sh      # стартовый файл для скрипта

# Псевдонимы и функции
alias ll='ls -lah'
unalias ll
alias
declare -f

# PATH
PATH=/новый:$PATH    # в начало (приоритет)
PATH=$PATH:/новый    # в конец

# Skel
ls -la /etc/skel
useradd -m newuser   # домашний каталог из /etc/skel
```

---

## Типичные вопросы экзамена

1. Чем `~/.bash_profile` отличается от `~/.bashrc`? → `bash_profile` читается login-оболочкой один раз при входе. `bashrc` — каждой интерактивной non-login оболочкой.
2. Есть и `~/.bash_profile`, и `~/.profile` — что прочитается? → `~/.bash_profile`; `~/.profile` игнорируется.
3. Где живёт системный `PATH`? → `/etc/profile` и фрагменты в `/etc/profile.d/`.
4. Разница `source file` и `bash file`? → `source` выполняет в текущей оболочке; `bash file` — в дочерней, изменения теряются.
5. Какая команда делает локальную переменную глобальной? → `export VAR`.
6. Что делает `export -n VAR`? → Отменяет экспорт; переменная снова локальная.
7. Одинарные и двойные кавычки при присваивании? → Двойные разрешают подстановку `$переменной`; одинарные берут всё буквально.
8. Какая переменная задаёт стартовый файл для неинтерактивного скрипта? → `BASH_ENV`.
9. Какая команда показывает только переменные окружения? → `env`, `printenv` или `export -p`.
10. Какая команда показывает все переменные, включая локальные? → `set`.
11. Как сделать псевдоним по умолчанию для новых пользователей? → Добавить `alias` в нужный файл в `/etc/skel`.
12. Как создать неизменяемую переменную? → `readonly VAR=value`.
13. Что такое `~/.bash_logout`? → Скрипт, выполняемый при выходе из login-оболочки.
14. Разница `unset VAR` и `VAR=`? → `unset` полностью удаляет переменную; `VAR=` оставляет с пустым значением.
15. Какие символы запрещены в начале имени переменной? → Цифры. Имя начинается с буквы или `_`.
16. Что такое `declare -x`? → Синоним `export`; показывает или помечает переменные как экспортированные.
17. Что делает `env -i`? → Запускает команду с почти пустым окружением без унаследованных переменных.
18. Что означает `HISTCONTROL=ignoreboth`? → Не сохранять команды с пробелом в начале и дубликаты подряд.
19. Что означает `DISPLAY=reptilium:0:2`? → X-сервер на хосте `reptilium`, дисплей 0, экран 2.

---

## Упражнения

### Упражнение 1 — Тип оболочки по способу запуска

Для каждого способа запуска укажи, login-оболочка или нет, интерактивная или нет.

| Способ запуска | Login | Интерактивная |
|---|---|---|
| `ssh user@host` | ? | ? |
| `Ctrl+Alt+F2` (вход на tty2) | ? | ? |
| `su -` | ? | ? |
| `gnome-terminal` | ? | ? |
| `sakura` из `konsole` | ? | ? |
| Запуск `./script.sh` | ? | ? |

<details>
<summary>Ответ</summary>

| Способ запуска | Login | Интерактивная |
|---|---|---|
| `ssh user@host` | да | да |
| `Ctrl+Alt+F2` | да | да |
| `su -` | да | да |
| `gnome-terminal` | нет | да |
| `sakura` из `konsole` | нет | да |
| `./script.sh` | нет | нет |

SSH, вход на tty и `su -` создают login-оболочку (явный вход). Терминалы в графической сессии и оболочки внутри других оболочек — non-login. Скрипт — неинтерактивная.

</details>

---

### Упражнение 2 — su и sudo для четырёх типов оболочки

Записать команду для переключения в оболочку пользователя `bob` каждого из четырёх типов.

| Тип оболочки | Команда |
|---|---|
| Login + интерактивная | ? |
| Non-login + интерактивная | ? |
| Login + неинтерактивная | ? |
| Non-login + неинтерактивная | ? |

<details>
<summary>Ответ</summary>

| Тип оболочки | Команда |
|---|---|
| Login + интерактивная | `su - bob` или `sudo -i -u bob` |
| Non-login + интерактивная | `su bob` или `sudo -u bob bash` |
| Login + неинтерактивная | `su - bob -c 'cmd'` или `sudo -i -u bob 'cmd'` |
| Non-login + неинтерактивная | `su bob -c 'cmd'` или `sudo -u bob 'cmd'` |

Дефис в `su -` или ключ `-i` у `sudo` — маркер login-оболочки. Аргумент `-c 'cmd'` запускает команду без интерактивного режима.

</details>

---

### Упражнение 3 — Startup-файлы для каждого типа оболочки

Какие файлы инициализации прочитает каждый тип оболочки? Считай, что у пользователя есть `~/.bash_profile`, `~/.bashrc`, `~/.bash_logout`, и в `~/.bash_profile` есть стандартная конструкция для подгрузки `~/.bashrc`.

| Тип оболочки | Читаемые файлы |
|---|---|
| Login + интерактивная | ? |
| Non-login + интерактивная | ? |
| Login + неинтерактивная | ? |
| Non-login + неинтерактивная | ? |

<details>
<summary>Ответ</summary>

| Тип оболочки | Читаемые файлы |
|---|---|
| Login + интерактивная | `/etc/profile`, `/etc/profile.d/*.sh`, `~/.bash_profile` (подгружает `~/.bashrc`), при выходе `~/.bash_logout` |
| Non-login + интерактивная | `/etc/bash.bashrc` (Debian) или `/etc/bashrc` (RHEL), `~/.bashrc` |
| Login + неинтерактивная | Редкая комбинация (`bash --login script.sh`) — читает то же, что login+интерактивная |
| Non-login + неинтерактивная | Только файл из `BASH_ENV`, если задана |

</details>

---

### Упражнение 4 — Локальная или глобальная переменная?

| Команды | Локальная | Глобальная |
|---|---|---|
| `debian=mother` | ? | ? |
| `ubuntu=deb-based` | ? | ? |
| `mint=ubuntu-based; export mint` | ? | ? |
| `export suse=rpm-based` | ? | ? |
| `zorin=ubuntu-based` | ? | ? |

<details>
<summary>Ответ</summary>

| Команды | Локальная | Глобальная |
|---|---|---|
| `debian=mother` | да | нет |
| `ubuntu=deb-based` | да | нет |
| `mint=ubuntu-based; export mint` | нет | да |
| `export suse=rpm-based` | нет | да |
| `zorin=ubuntu-based` | да | нет |

Простое присваивание создаёт локальную переменную. `export`, явный или совмещённый с присваиванием, превращает её в переменную окружения.

</details>

---

### Упражнение 5 — Расшифровка значений переменных

| Команда | Вывод |
|---|---|
| `echo $HISTCONTROL` | `ignoreboth` |
| `echo ~` | `/home/carol` |
| `echo $DISPLAY` | `reptilium:0:2` |
| `echo $MAILCHECK` | `60` |
| `echo $HISTFILE` | `/home/carol/.bash_history` |

<details>
<summary>Ответ</summary>

`HISTCONTROL=ignoreboth` — в историю не попадают ни команды с пробелом в начале, ни дубликаты подряд.

`~ = /home/carol` — тильда раскрывается в `$HOME`, домашний каталог пользователя `carol`.

`DISPLAY=reptilium:0:2` — X-сервер на хосте `reptilium`, дисплей 0, экран 2.

`MAILCHECK=60` — Bash проверяет почту раз в 60 секунд.

`HISTFILE=/home/carol/.bash_history` — история сохраняется в этот файл при выходе из сессии.

</details>

---

### Упражнение 6 — Исправление неверных присваиваний

| Неверное присваивание | Ожидаемый вывод |
|---|---|
| `lizard =chameleon` | `chameleon` |
| `cool lizard=chameleon` | `chameleon` |
| `lizard=cha\|me\|leon` | `cha\|me\|leon` |
| `lizard=/** chameleon **/` | `/** chameleon **/` |
| `win_path=C:\path\to\dir\` | `C:\path\to\dir\` |

<details>
<summary>Ответ</summary>

| Правильная команда | Обращение |
|---|---|
| `lizard=chameleon` | `echo $lizard` |
| `cool_lizard=chameleon` | `echo $cool_lizard` |
| `lizard="cha\|me\|leon"` | `echo $lizard` |
| `lizard="/** chameleon **/"` | `echo "$lizard"` |
| `win_path=C:\\path\\to\\dir\\` | `echo $win_path` |

Строка 1: пробелы вокруг `=` запрещены. Строка 2: пробел в имени запрещён — заменяем на `_`. Строки 3–4: спецсимволы `|` и `*` нужно экранировать кавычками. Строка 4: двойные кавычки в `echo` сохраняют внутренние пробелы. Строка 5: каждый обратный слеш экранируется ещё одним.

</details>

---

### Упражнение 7 — Назначение и команда

| Задача | Команда |
|---|---|
| Установить язык текущей оболочки на испанский UTF-8 | ? |
| Вывести текущий рабочий каталог | ? |
| Обратиться к переменной с информацией об SSH-подключении | ? |
| Добавить `/home/carol/scripts` в PATH последним | ? |
| Присвоить `my_path` буквальное значение `PATH` | ? |
| Присвоить `my_path` значение переменной `$PATH` | ? |

<details>
<summary>Ответ</summary>

| Задача | Команда |
|---|---|
| Установить язык | `LANG=es_ES.UTF-8` |
| Текущий каталог | `echo $PWD` или `pwd` |
| Информация об SSH | `echo $SSH_CONNECTION` |
| Добавить scripts в конец PATH | `PATH=$PATH:/home/carol/scripts` |
| Буквальная строка `PATH` в `my_path` | `my_path=PATH` |
| Значение `$PATH` в `my_path` | `my_path=$PATH` |

Без знака доллара `PATH` — просто четыре буквы. Со знаком доллара происходит подстановка значения.

</details>

---

### Упражнение 8 — Локальная переменная mammal

Создай локальную переменную `mammal` со значением `gnu`.

<details>
<summary>Ответ</summary>

```bash
mammal=gnu
```

</details>

---

### Упражнение 9 — Подстановка переменной в значение

Создай `var_sub` так, чтобы `echo $var_sub` выводил `The value of mammal is gnu`.

<details>
<summary>Ответ</summary>

```bash
var_sub="The value of mammal is $mammal"
```

Двойные кавычки разрешают подстановку `$mammal`. С одинарными вывод был бы буквальным.

</details>

---

### Упражнение 10 — Превращение mammal в переменную окружения

Сделай `mammal` глобальной переменной окружения.

<details>
<summary>Ответ</summary>

```bash
export mammal
```

</details>

---

### Упражнение 11 — Поиск через set и grep

<details>
<summary>Ответ</summary>

```bash
set | grep mammal
```

</details>

---

### Упражнение 12 — Поиск через env и grep

<details>
<summary>Ответ</summary>

```bash
env | grep mammal
```

После `export mammal` переменная видна и через `set`, и через `env`. До экспорта `env` её не показывал.

</details>

---

### Упражнение 13 — BIRD двумя командами

Создай переменную окружения `BIRD` со значением `penguin` двумя командами.

<details>
<summary>Ответ</summary>

```bash
BIRD=penguin; export BIRD
```

</details>

---

### Упражнение 14 — NEW_BIRD одной командой

Создай переменную окружения `NEW_BIRD` со значением `yellow-eyed penguin` одной командой.

<details>
<summary>Ответ</summary>

```bash
export NEW_BIRD="yellow-eyed penguin"
```

Кавычки обязательны из-за пробела в значении.

</details>

---

### Упражнение 15 — Создание ~/bin

Создай каталог `bin` в своём домашнем каталоге.

<details>
<summary>Ответ</summary>

```bash
mkdir ~/bin
```

</details>

---

### Упражнение 16 — Добавление ~/bin в PATH первым

<details>
<summary>Ответ</summary>

```bash
PATH="$HOME/bin:$PATH"
```

Свой каталог идёт перед `$PATH` — Bash проверит его до системных.

</details>

---

### Упражнение 17 — Сохранение PATH через ~/.profile

Какой `if`-блок положить в `~/.profile`, чтобы `~/bin` добавлялся в `PATH` постоянно?

<details>
<summary>Ответ</summary>

```bash
if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi
```

Проверка `[ -d "$HOME/bin" ]` подтверждает существование каталога перед добавлением.

</details>

---

### Упражнение 18 — Функция hello world и куда её положить

Напиши функцию `hello`, выводящую `Hello, world!`. Как загрузить её через `source`? В какой файл положить для user2 в X Window? В какой файл для root в любой интерактивной оболочке?

<details>
<summary>Ответ</summary>

```bash
hello() {
    echo "Hello, world!"
}
```

Загрузить:

```bash
$ source ~/myfuncs.sh
$ hello
Hello, world!
```

Для user2 в X Window (non-login интерактивная): `~/.bashrc`.

Для root в любой интерактивной оболочке: `/root/.bashrc`. Если у root бывают login-сессии, добавить `source ~/.bashrc` в `/root/.bash_profile`, или положить функцию в `/etc/bash.bashrc` для охвата всех пользователей.

</details>

---

### Упражнение 19 — Интерактивен ли простой echo-скрипт?

```bash
#!/bin/bash
echo "Hi"
```

Интерактивен ли? Что делает скрипт интерактивным?

<details>
<summary>Ответ</summary>

Нет. Скрипт запускается как non-login неинтерактивная оболочка — команды из файла, а не с клавиатуры.

Скрипт становится интерактивным, когда явно запрашивает ввод через `read`:

```bash
#!/bin/bash
read -p "Как тебя зовут? " name
echo "Привет, $name!"
```

</details>

---

### Упражнение 20 — Применить ~/.bashrc без перезапуска

<details>
<summary>Ответ</summary>

```bash
source ~/.bashrc
```

```bash
. ~/.bashrc
```

Для полного перезапуска процесса оболочки: `exec bash` или `exec $SHELL`.

</details>

---

### Упражнение 21 — Переход в tty при зависании GUI

GUI завис, переходишь на tty2 через Ctrl+Alt+F2. Какие файлы прочитает Bash?

<details>
<summary>Ответ</summary>

Вход на tty2 создаёт login-интерактивную оболочку:

1. `/etc/profile` → `/etc/profile.d/*.sh`
2. Первый найденный из `~/.bash_profile`, `~/.bash_login`, `~/.profile`

Если `~/.bash_profile` подгружает `~/.bashrc`, он тоже читается. На Debian `/etc/profile` обычно тянет `/etc/bash.bashrc`.

При выходе выполняется `~/.bash_logout`.

</details>

---

### Упражнение 22 — Автоматизация ~/.bash_login через /etc/skel

Как сделать так, чтобы каждый новый пользователь получал `~/.bash_login` автоматически?

<details>
<summary>Ответ</summary>

Положить файл в `/etc/skel`:

```bash
$ sudo nano /etc/skel/.bash_login
```

При создании пользователя через `useradd -m` или `adduser` файл скопируется в домашний каталог.

Важно: `~/.bash_login` читается только если нет `~/.bash_profile`. Существующих пользователей `/etc/skel` не затрагивает.

</details>

---

### Упражнение 23 — let и арифметика

Создай `my_val = 5 + 5`, затем `your_val = my_val / 2`.

<details>
<summary>Ответ</summary>

```bash
let "my_val = 5 + 5"
let "your_val = $my_val / 2"
```

Синонимы: `((my_val = 5 + 5))` или `my_val=$((5 + 5))`. Только целые числа.

</details>

---

### Упражнение 24 — Синтаксис подстановки команд

Правильный современный вариант для:

```bash
latest_music=`ls -l1t ~/Music | head -n 6`
```

<details>
<summary>Ответ</summary>

**A:**

```bash
latest_music=$(ls -l1t ~/Music | head -n 6)
```

Два эквивалентных синтаксиса: обратные кавычки `` `cmd` `` и `$(cmd)`. Современный стиль — `$(cmd)`, удобен для вложения.

Вариант B — буквальная строка. Вариант C — арифметическая подстановка, не выполняет команды.

</details>

---

*LPIC-1 Study Notes | Topic 105: Shells and Shell Scripting*
