---
title: "LPIC-1 105.1 — Псевдонимы, функции и специальные переменные (часть 3)"
date: 2026-04-19
description: "Кавычки в псевдонимах, динамическое и статическое раскрытие, функции Bash, специальные переменные $? $$ $!, функции в скриптах, функция внутри псевдонима. Тема 105.1 LPIC-1."
tags: ["Linux", "LPIC-1", "bash", "alias", "function", "оболочка", "окружение"]
categories: ["LPIC-1"]
page_lang: "ru"
lang_pair: "/posts/lpic1/lpic1-105-1-3-aliases-functions/"
pagefind_ignore: true
build:
  list: never
  render: always
---

> **Вес на экзамене: 4** — LPIC-1 v5, Экзамен 102 | Часть 3 темы 105.1

## Псевдонимы — расширенное использование

### Кавычки и переменные внутри псевдонима

Команды с пробелами, опциями или цепочками нужно брать в кавычки. Иначе Bash примет первый пробел за конец определения.

```bash
$ alias ll='ls -al'
$ alias greet='echo Hello world!'
```

В псевдоним можно подставить значение переменной:

```bash
$ reptile=uromastyx
$ alias greet='echo Hello $reptile!'
$ greet
Hello uromastyx!
```

Переменную можно завести прямо внутри псевдонима, через точку с запятой:

```bash
$ alias greet='reptile=tortoise; echo Hello $reptile!'
$ greet
Hello tortoise!
```

### Динамическое и статическое раскрытие

Тип кавычек определяет **момент** подстановки переменной.

**Одинарные кавычки** — откладывают раскрытие до вызова псевдонима:

```bash
$ alias where?='echo $PWD'
$ where?
/home/user2
$ cd Music
$ where?
/home/user2/Music          # каждый раз текущий каталог
```

**Двойные кавычки** — раскрывают переменную сразу при создании псевдонима, фиксируя значение:

```bash
$ alias where?="echo $PWD"
$ where?
/home/user2
$ cd Music
$ where?
/home/user2                # старый каталог, зафиксирован
```

Простое правило: **одинарные = динамика, двойные = статика**.

### Псевдоним внутри псевдонима

Псевдоним можно вложить в другой по имени:

```bash
$ alias where?='echo $PWD'
$ alias my_home=where?
$ my_home
/home/user2
```

### Цепочка команд через точку с запятой

Псевдоним умеет объединять несколько команд:

```bash
$ alias git_info='which git; git --version'
$ git_info
/usr/bin/git
git version 2.7.4
```

---

## Функции Bash — расширенное использование

### Однострочное определение функции

Функцию можно записать в одну строку. Точка с запятой нужна и после **последней команды** перед закрывающей скобкой:

```bash
$ greet() { greeting="Hello world!"; echo $greeting; }
$ greet
Hello world!
```

При построчном вводе Bash показывает приглашение `>` (PS2) до закрытия блока:

```bash
$ greet() {
> greeting="Hello world!"
> echo $greeting
> }
```

### Переменные внутри функций

Функция работает и с локальными, и с переменными окружения. Файл `funed`:

```bash
editors() {
    editor=emacs
    echo "My editor is: $editor. $editor is a fun text editor."
}
```

Подгружаем и вызываем:

```bash
$ . funed
$ editors
My editor is: emacs. emacs is a fun text editor.
```

Переменная `editor`, заведённая внутри функции, остаётся в текущей оболочке после вызова:

```bash
$ echo $editor
emacs
```

Можно использовать и переменные окружения, например `$USER`:

```bash
editors() {
    editor=emacs
    echo "The text editor of $USER is: $editor."
}
editors
```

Если вызов функции стоит последней строкой файла, `source` сразу её и выполнит.

### Позиционные параметры в функциях

Передача из файла:

```bash
editors() {
    editor=emacs
    echo "The text editor of $USER is: $editor."
    echo "Bash is not a $1 shell."
}
editors tortoise
```

Передача из командной строки (убрать вызов из файла, подгрузить только определение, затем вызвать с аргументом):

```bash
$ . funed
$ editors tortoise
The text editor of user2 is: emacs.
Bash is not a tortoise shell.
```

### Псевдонимы и позиционные параметры

Технически передать аргумент псевдониму можно, но все аргументы всегда уходят в **конец** итоговой строки, даже если в определении стоит `$1`:

```bash
$ alias great_editor='echo $1 is a great text editor'
$ great_editor emacs
is a great text editor emacs
```

Для работы с позиционными параметрами нужны **функции**, не псевдонимы.

---

## Специальные встроенные переменные Bash

Только для чтения — присвоить им значение нельзя.

### $? — код возврата последней команды

Ноль означает успех:

```bash
$ ps aux | grep bash
user2  420  ... -bash
$ echo $?
0
```

Ненулевое значение — ошибка:

```bash
$ ps aux | rep bash
-bash: rep: command not found
$ echo $?
127
```

### $$ — PID текущей оболочки

```bash
$ echo $$
420
```

### $! — PID последней фоновой задачи

```bash
$ ps aux | grep bash &
[1] 663
$ echo $!
663
```

### Позиционные параметры $0..$9

`$0` — имя скрипта или оболочки. `$1`–`$9` — аргументы:

```bash
$ special_vars() {
> echo $0
> echo $1
> echo $2
> echo $3
> }
$ special_vars debian ubuntu zorin
-bash
debian
ubuntu
zorin
```

### Прочие специальные переменные

| Переменная | Значение |
|---|---|
| `$#` | Количество переданных аргументов |
| `$@` / `$*` | Все аргументы |
| `$_` | Последний параметр предыдущей команды (или имя скрипта при старте) |

Полный список: `man bash`, раздел SPECIAL PARAMETERS.

---

## Функции в скриптах

Превращение файла `funed` в скрипт `funed.sh` — добавить шебанг и вызов функции:

```bash
#!/bin/bash
editors() {
    editor=emacs
    echo "The text editor of $USER is: $editor."
    echo "Bash is not a $1 shell."
}
editors tortoise
```

Шебанг `#!/bin/bash` в первой строке указывает интерпретатор. Без вызова функции в конце скрипт только определит её и завершится.

Сделать исполняемым и запустить:

```bash
$ chmod +x funed.sh
$ ./funed.sh
The text editor of user2 is: emacs.
Bash is not a tortoise shell.
```

---

## Функция внутри псевдонима

В псевдоним можно положить определение функции вместе с вызовом и очисткой:

```bash
$ alias great_editor='gr8_ed() { echo $1 is a great text editor; unset -f gr8_ed; }; gr8_ed'
```

Как это работает:

1. `gr8_ed() { ... }` определяет функцию.
2. `unset -f gr8_ed` внутри функции удаляет её после отработки.
3. `; gr8_ed` в конце вызывает функцию.

Проверка:

```bash
$ great_editor emacs
emacs is a great text editor
```

Опции `unset`:

| Опция | Действие |
|---|---|
| `unset -v ИМЯ` | Удалить переменную |
| `unset -f ИМЯ` | Удалить функцию |
| `unset ИМЯ` | Сначала переменную, потом функцию |

---

## Функция внутри функции

Одна функция может вызывать другую. Кладём в `~/.bashrc` две функции для приветствия при входе.

`check_vids` — проверяет наличие mkv-файлов:

```bash
check_vids() {
    ls -1 ~/Video/*.mkv > /dev/null 2>&1
    if [ "$?" = "0" ]; then
        echo -e "Remember, you must not keep more than 5 video files in your Video folder.\nThanks."
    else
        echo -e "You do not have any videos in the Video folder. You can keep up to 5.\nThanks."
    fi
}
```

По шагам:
- `> /dev/null 2>&1` перенаправляет stdout и stderr в /dev/null.
- `[ "$?" = "0" ]` проверяет код возврата предыдущей команды.

`editors` — приветствует и вызывает `check_vids`:

```bash
editors() {
    editor=emacs
    echo "Hi, $USER!"
    echo "$editor is more than a text editor!"
    check_vids
}

editors
```

Последняя строка файла вызывает `editors`, которая в свою очередь вызывает `check_vids`.

Проверка заходом под пользователя:

```bash
# su - user2
Hi, user2!
emacs is more than a text editor!
Remember, you must not keep more than 5 video files in your Video folder.
Thanks.
```

---

## Шпаргалка — дополнения

```bash
# Специальные переменные
echo $?      # код возврата последней команды (0 = успех)
echo $$      # PID текущей оболочки
echo $!      # PID последней фоновой задачи
echo $0      # имя скрипта или оболочки
echo $1      # первый позиционный аргумент
echo $#      # количество аргументов
echo $@      # все аргументы

# unset
unset -v ИМЯ   # удалить переменную
unset -f ИМЯ   # удалить функцию

# Цепочка в псевдониме
alias git_info='which git; git --version'

# Однострочная функция (точка с запятой после последней команды)
greet() { greeting="Hello world!"; echo $greeting; }

# Шебанг
#!/bin/bash

# Сделать исполняемым и запустить
chmod +x script.sh
./script.sh

# Функция только для чтения
readonly -f my_fun     # сделать read-only
readonly -f            # список всех read-only функций
```

---

## Типичные вопросы экзамена

1. Разница одинарных и двойных кавычек в определении псевдонима? → Одинарные откладывают раскрытие переменной до вызова. Двойные раскрывают значение при создании псевдонима.
2. Что хранит `$?` после успешной команды? → Ноль.
3. Чем `$$` отличается от `$!`? → `$$` — PID текущей оболочки. `$!` — PID последнего фонового процесса.
4. Почему позиционные параметры не работают в псевдонимах? → Аргументы всегда уходят в конец итоговой строки, не на место `$1`. Для аргументов нужны функции.
5. Какие два флага у `unset` отвечают за тип удаляемой сущности? → `-v` для переменной, `-f` для функции.
6. Что должна содержать первая строка Bash-скрипта? → Шебанг с абсолютным путём к интерпретатору: `#!/bin/bash`.
7. Как сделать функцию внутри псевдонима, чтобы она не оставалась в сессии? → Добавить `unset -f имя_функции` последней командой внутри функции, и тут же вызвать функцию в псевдониме.
8. Что делает `readonly -f`? → Делает функцию read-only; её нельзя переопределить или удалить через `unset -f`.
9. Что хранит `$#`? → Количество переданных аргументов.
10. Во что раскрывается `$@`? → Все позиционные аргументы списком.
11. Что такое `$_`? → Последний аргумент предыдущей команды (или имя скрипта при старте).

---

## Упражнения

### Упражнение 1 — Сравнение псевдонимов и функций

Заполнить таблицу «Да» или «Нет».

| Возможность | Псевдонимы | Функции |
|---|:---:|:---:|
| Можно использовать локальные переменные | ? | ? |
| Можно использовать переменные окружения | ? | ? |
| Можно экранировать через `\` | ? | ? |
| Поддерживают рекурсию | ? | ? |
| Хорошо работают с позиционными параметрами | ? | ? |

<details>
<summary>Ответ</summary>

| Возможность | Псевдонимы | Функции |
|---|:---:|:---:|
| Можно использовать локальные переменные | Да | Да |
| Можно использовать переменные окружения | Да | Да |
| Можно экранировать через `\` | Да | Нет |
| Поддерживают рекурсию | Да | Да |
| Хорошо работают с позиционными параметрами | Нет | Да |

Экранирование через `\` касается псевдонимов: они могут затенять встроенные команды на этапе разбора. У функций такой коллизии нет.

Позиционные параметры в псевдонимах всегда уходят в конец итоговой строки, а не подставляются на место `$1`. Для аргументов нужны функции.

</details>

---

### Упражнение 2 — Список всех псевдонимов

<details>
<summary>Ответ</summary>

```bash
alias
```

</details>

---

### Упражнение 3 — Псевдоним logg для ogg-файлов

Создать псевдоним `logg`, который перечисляет все ogg-файлы в `~/Music` по одному на строку.

<details>
<summary>Ответ</summary>

```bash
alias logg='ls -1 ~/Music/*ogg'
```

Опция `-1` (цифра один) форсирует вывод по одному имени на строку. Шаблон `*ogg` совпадает с любыми именами, заканчивающимися на `ogg`.

</details>

---

### Упражнение 4 — Вызов псевдонима

<details>
<summary>Ответ</summary>

```bash
logg
```

</details>

---

### Упражнение 5 — Доработка logg с приветствием пользователя

Изменить `logg`: сначала вывести имя текущего пользователя и двоеточие, потом список.

<details>
<summary>Ответ</summary>

```bash
alias logg='echo $USER:; ls -1 ~/Music/*ogg'
```

Команды соединены точкой с запятой. Одинарные кавычки откладывают подстановку `$USER` до вызова.

</details>

---

### Упражнение 6 — Повторный вызов

<details>
<summary>Ответ</summary>

```bash
logg
```

</details>

---

### Упражнение 7 — Проверить наличие в списке

<details>
<summary>Ответ</summary>

```bash
alias
```

</details>

---

### Упражнение 8 — Удаление псевдонима

<details>
<summary>Ответ</summary>

```bash
unalias logg
```

</details>

---

### Упражнение 9 — Сопоставление псевдонимов и команд

Записать корректные определения.

| Имя | Команда |
|---|---|
| `b` | `bash` |
| `bash_info` | вывести путь к bash и версию |
| `kernel_info` | вывести версию ядра |
| `greet` | вывести `Hi, $USER` |
| `computer` | задать `pc=slimbook`, вывести `My computer is a $pc` |

<details>
<summary>Ответ</summary>

```bash
alias b=bash
alias bash_info='which bash; echo "$BASH_VERSION"'
alias kernel_info='uname -r'
alias greet='echo Hi, $USER'
alias computer='pc=slimbook; echo My computer is a $pc'
```

Одинарные кавычки откладывают подстановку `$USER`, `$BASH_VERSION` и `$pc` до момента вызова. Для `b=bash` кавычки не нужны.

</details>

---

### Упражнение 10 — Функция my_fun в /etc/bash.bashrc

От имени root написать функцию `my_fun`, которая здоровается с пользователем и сообщает его `PATH`. Функция должна вызываться при каждом входе.

<details>
<summary>Ответ</summary>

Вариант A (синтаксис со скобками):

```bash
my_fun() {
    echo Hello, $USER!
    echo Your path is: $PATH
}
my_fun
```

Вариант B (синтаксис с ключевым словом `function`):

```bash
function my_fun {
    echo Hello, $USER!
    echo Your path is: $PATH
}
my_fun
```

Вызов функции (последняя строка) обязателен — без него функция только определится.

`/etc/bash.bashrc` подгружается для интерактивных non-login оболочек. Для login-сессий нужно или добавить `source /etc/bash.bashrc` в `/etc/profile`, или дублировать код в оба файла.

</details>

---

### Упражнение 11 — Вход под user2 для проверки

<details>
<summary>Ответ</summary>

```bash
su - user2
```

Дефис запускает login-оболочку с полным набором startup-файлов.

</details>

---

### Упражнение 12 — Та же функция в одну строку

<details>
<summary>Ответ</summary>

Вариант A:

```bash
my_fun() { echo "Hello, $USER!"; echo "Your path is: $PATH"; }
```

Вариант B:

```bash
function my_fun { echo "Hello, $USER!"; echo "Your path is: $PATH"; }
```

Точка с запятой нужна и после последней команды, перед закрывающей скобкой.

</details>

---

### Упражнение 13 — Вызов функции

<details>
<summary>Ответ</summary>

```bash
my_fun
```

</details>

---

### Упражнение 14 — Удаление функции

<details>
<summary>Ответ</summary>

```bash
unset -f my_fun
```

Флаг `-f` явно указывает на функцию. Без флага `unset` сначала пробует удалить переменную.

</details>

---

### Упражнение 15 — Угадать вывод special_vars2

Функция:

```bash
special_vars2() {
    echo $#
    echo $_
    echo $1
    echo $4
    echo $6
    echo $7
    echo $_
    echo $@
    echo $?
}
```

Вызов: `special_vars2 crying cockles and mussels alive alive oh`

<details>
<summary>Ответ</summary>

| Строка | Вывод |
|---|---|
| `echo $#` | `7` |
| `echo $_` | `7` |
| `echo $1` | `crying` |
| `echo $4` | `mussels` |
| `echo $6` | `alive` |
| `echo $7` | `oh` |
| `echo $_` | `oh` |
| `echo $@` | `crying cockles and mussels alive alive oh` |
| `echo $?` | `0` |

Передано 7 аргументов. `$_` хранит последний аргумент предыдущей команды: после `echo $#` (вывел `7`) `$_=7`; после `echo $7` (вывел `oh`) `$_=oh`. `$?` равен 0 — `echo $@` отработал успешно.

</details>

---

### Упражнение 16 — Параметризованная функция check_music

На базе `check_vids` написать функцию `check_music` для стартового скрипта. Принимать позиционные параметры: каталог, расширение, лимит, название типа файла.

<details>
<summary>Ответ</summary>

```bash
check_music() {
    ls -1 ~/$1/*.$2 > /dev/null 2>&1
    if [ "$?" = "0" ]; then
        echo -e "Remember, you must not keep more than $3 $4 files in your $1 folder.\nThanks."
    else
        echo -e "You do not have any $4 files in the $1 folder. You can keep up to $3.\nThanks."
    fi
}
check_music Music ogg 7 music
```

Параметры: `$1=Music` (каталог), `$2=ogg` (расширение), `$3=7` (лимит), `$4=music` (название в сообщении).

`ls ... > /dev/null 2>&1` скрывает вывод. Код возврата через `$?` определяет, какое сообщение напечатать.

</details>

---

### Упражнение 17 — Функции только для чтения

Как сделать функцию read-only? Как вывести список всех read-only функций?

<details>
<summary>Ответ</summary>

```bash
readonly -f my_fun    # сделать read-only
readonly -f           # список всех read-only функций
```

Read-only функцию нельзя переопределить или удалить через `unset -f`. Для отмены нужен новый сеанс оболочки.

</details>

---

### Упражнение 18 — Функция fyi с системной сводкой

Написать функцию `fyi` для стартового скрипта: вывести имя пользователя, домашний каталог, хост, тип ОС, PATH, каталог почты, интервал проверки почты, глубину вложенности оболочек; изменить приглашение на `<user>@<host-date>`.

<details>
<summary>Ответ</summary>

```bash
fyi() {
    echo -e "For your Information:\n
    Username: $USER
    Home directory: $HOME
    Host: $HOSTNAME
    Operating System: $OSTYPE
    Path for executable files: $PATH
    Your mail directory is $MAIL and is searched every $MAILCHECK seconds.
    The current level of your shell is: $SHLVL"
    PS1="\u@\h-\d "
}
fyi
```

Используемые переменные: `$USER`, `$HOME`, `$HOSTNAME`, `$OSTYPE`, `$PATH`, `$MAIL`, `$MAILCHECK`, `$SHLVL`.

В строке `PS1`: `\u` — имя пользователя, `\h` — хост до первой точки, `\d` — дата. Полный список: `man bash`, раздел PROMPTING.

Опция `-e` у `echo` включает интерпретацию `\n` и других escape-последовательностей.

</details>

---

*LPIC-1 Study Notes | Topic 105: Shells and Shell Scripting*
