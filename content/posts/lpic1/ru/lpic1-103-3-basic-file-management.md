---
title: "LPIC-1 103.3 — Базовое управление файлами"
date: 2026-04-16
description: "Копирование, перемещение, удаление файлов, глобинг, find, tar, cpio, dd и сжатие. Тема 103.3 экзамена LPIC-1."
tags: ["Linux", "LPIC-1", "файлы", "find", "tar", "cp", "mv", "rm"]
categories: ["LPIC-1"]
page_lang: "ru"
lang_pair: "/posts/lpic1/lpic1-103-3-basic-file-management/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Что нужно знать

- Копировать, перемещать и удалять файлы и каталоги по одному.
- Рекурсивно копировать и удалять несколько файлов и каталогов.
- Использовать простые и расширенные шаблоны (wildcards) в командах.
- Искать файлы командой `find` по типу, размеру и времени.
- Работать с `tar`, `cpio` и `dd`.

---

## Копирование файлов и каталогов

### cp

`cp` копирует файлы и каталоги.

```bash
cp source dest          # скопировать файл
cp file1 file2 dir/     # скопировать несколько файлов в каталог
cp -r dir1/ dir2/       # рекурсивно скопировать каталог
cp -p file dest         # сохранить права, владельца, временные метки
cp -a dir1/ dir2/       # архивный режим: рекурсия + сохранение атрибутов (= -dR --preserve=all)
cp -i file dest         # запросить подтверждение перезаписи
cp -u file dest         # копировать только если source новее dest
cp -v file dest         # подробный вывод
cp -l file dest         # создать жёсткую ссылку вместо копии
cp -s file dest         # создать символическую ссылку вместо копии
```

Флаг `-r` (или `-R`) копирует каталоги рекурсивно. Без него `cp` на каталог выдаст ошибку.

Флаг `-a` объединяет `-dR --preserve=all`: сохраняет символические ссылки, права, временные метки и владельца. Используй его для полного резервного копирования.

---

## Перемещение и переименование

### mv

`mv` перемещает файлы и каталоги, а также переименовывает их.

```bash
mv file newname         # переименовать файл
mv file dir/            # переместить файл в каталог
mv dir1/ dir2/          # переместить или переименовать каталог
mv -i file dest         # запросить подтверждение перезаписи
mv -u file dest         # переместить только если source новее dest
mv -v file dest         # подробный вывод
```

`mv` работает атомарно в пределах одной файловой системы: файл просто получает новое имя в дереве каталогов. Между разными файловыми системами `mv` скопирует файл и удалит исходный.

---

## Удаление файлов и каталогов

### rm

```bash
rm file                 # удалить файл
rm file1 file2          # удалить несколько файлов
rm -r dir/              # рекурсивно удалить каталог со всем содержимым
rm -f file              # принудительно удалить без запроса (игнорирует несуществующие файлы)
rm -rf dir/             # рекурсивно и принудительно (осторожно!)
rm -i file              # запросить подтверждение на каждый файл
rm -v file              # подробный вывод
```

### rmdir

`rmdir` удаляет только пустые каталоги.

```bash
rmdir dir/              # удалить пустой каталог
rmdir -p a/b/c          # удалить цепочку пустых каталогов
```

Если каталог содержит хоть один файл, `rmdir` выдаст ошибку. Для непустых каталогов нужен `rm -r`.

---

## Создание файлов и каталогов

### mkdir

```bash
mkdir dir               # создать каталог
mkdir -p a/b/c          # создать всю цепочку каталогов (-p не ругается на уже существующие)
mkdir -m 755 dir        # создать каталог с заданными правами
```

### touch

`touch` создаёт пустой файл или обновляет временные метки существующего.

```bash
touch file              # создать файл или обновить atime/mtime до текущего времени
touch -t 202312311230 file  # задать конкретное время (YYYYMMDDhhmm)
touch -d "2023-12-31" file  # задать дату в читаемом формате
touch -a file           # обновить только atime
touch -m file           # обновить только mtime
```

---

## Просмотр содержимого каталогов

### ls

```bash
ls                      # список файлов текущего каталога
ls -l                   # подробный список
ls -a                   # показать скрытые файлы (начинающиеся с .)
ls -la                  # подробный список со скрытыми
ls -lh                  # размеры в читаемом формате (K, M, G)
ls -lt                  # сортировка по времени изменения
ls -lr                  # обратный порядок сортировки
ls -R                   # рекурсивный вывод
ls -i                   # показать номера inode
ls -d dir/              # показать информацию о самом каталоге, не его содержимом
```

---

## Глобинг и шаблоны

File globbing — это раскрытие шаблонов оболочкой перед передачей аргументов команде.

### Основные символы

| Символ | Значение |
|--------|----------|
| `*` | любая последовательность символов (включая пустую) |
| `?` | ровно один любой символ |
| `[abc]` | один символ из набора |
| `[a-z]` | один символ из диапазона |
| `[!abc]` | один символ, не входящий в набор |
| `[^abc]` | то же самое (зависит от оболочки) |

### Примеры

```bash
ls *.txt            # все файлы с расширением .txt
ls file?.log        # file1.log, file2.log, но не file10.log
ls report[0-9].pdf  # report0.pdf ... report9.pdf
ls [!.]* 2>/dev/null # файлы, не начинающиеся с точки (аналог ls без -a)
cp *.conf /etc/bak/ # скопировать все .conf файлы
rm temp*            # удалить всё начинающееся с temp
```

### Расширенный глобинг (extglob)

В bash расширенный глобинг включается командой `shopt -s extglob`:

| Шаблон | Значение |
|--------|----------|
| `?(pattern)` | ноль или одно совпадение |
| `*(pattern)` | ноль или больше совпадений |
| `+(pattern)` | одно или больше совпадений |
| `@(pattern)` | ровно одно совпадение |
| `!(pattern)` | всё, кроме совпадения |

```bash
shopt -s extglob
ls !(*.bak)         # все файлы, кроме .bak
```

---

## Поиск файлов командой find

`find` ищет файлы в иерархии каталогов по различным критериям.

### Синтаксис

```
find [путь] [критерии] [действие]
```

### По имени и типу

```bash
find / -name "*.log"          # по имени (с учётом регистра)
find / -iname "*.log"         # по имени (без учёта регистра)
find / -type f                # только обычные файлы
find / -type d                # только каталоги
find / -type l                # только символические ссылки
find / -name "*.conf" -type f # имя + тип
```

### По размеру

```bash
find / -size +100M            # больше 100 мегабайт
find / -size -10k             # меньше 10 килобайт
find / -size 1G               # ровно 1 гигабайт
find / -size 100b             # ровно 100 байт
find . -size 0b               # пустые файлы (0 байт)
find . -empty                 # пустые файлы и каталоги (короче)
```

Суффиксы размера: `c` (байты), `k` (килобайты), `M` (мегабайты), `G` (гигабайты).

### По времени

```bash
find / -mtime -7              # изменён менее 7 дней назад
find / -mtime +30             # изменён более 30 дней назад
find / -atime -1              # доступен менее суток назад
find / -ctime -2              # статус менялся менее 2 дней назад
find / -mmin -60              # изменён менее 60 минут назад
find / -newer /etc/passwd     # новее указанного файла
```

### По правам и владельцу

```bash
find / -perm 755              # точные права 755
find / -perm -644             # минимум права 644 (все указанные биты установлены)
find / -perm /111             # хотя бы один бит из указанных установлен
find / -user username         # файлы пользователя
find / -group groupname       # файлы группы
find / -nouser                # файлы без владельца в системе
```

### Действия

```bash
find / -name "*.tmp" -delete                    # удалить найденные файлы
find / -name "*.sh" -exec chmod +x {} \;        # выполнить команду для каждого файла
find / -name "*.log" -exec cp {} /backup/ \;    # скопировать каждый файл
find / -name "core" -exec rm -f {} +            # + группирует файлы (эффективнее \;)
find / -name "*.txt" | xargs grep "pattern"     # передать результаты в xargs
```

Конструкция `{}` заменяется именем найденного файла. `\;` завершает `-exec`. `+` в конце группирует аргументы, как `xargs`, и работает быстрее.

### Логические операторы

```bash
find / -name "*.log" -and -size +10M    # оба условия (AND по умолчанию)
find / -name "*.bak" -or -name "*.tmp"  # одно из условий
find / -not -name "*.conf"              # отрицание
find / \( -name "a" -or -name "b" \)    # группировка
```

---

## Определение типа файла

### file

`file` определяет тип файла, анализируя его содержимое, а не расширение.

```bash
file document.pdf       # PDF document, version 1.4
file script.sh          # POSIX shell script
file /bin/ls            # ELF 64-bit LSB executable
file image.jpg          # JPEG image data
file archive.tar.gz     # gzip compressed data
```

`file` читает сигнатуры из базы `/etc/magic` и `/usr/share/misc/magic`.

---

## Архивирование: tar и cpio

### tar

`tar` (Tape ARchive) создаёт архивы из файлов и каталогов.

#### Создание архива

```bash
tar -cf archive.tar dir/        # создать архив
tar -czf archive.tar.gz dir/    # создать + сжать через gzip
tar -cjf archive.tar.bz2 dir/   # создать + сжать через bzip2
tar -cJf archive.tar.xz dir/    # создать + сжать через xz
tar -cvf archive.tar dir/       # создать с подробным выводом
```

#### Просмотр содержимого

```bash
tar -tf archive.tar             # список файлов в архиве
tar -tvf archive.tar            # подробный список
```

#### Извлечение

```bash
tar -xf archive.tar             # распаковать в текущий каталог
tar -xzf archive.tar.gz         # распаковать .tar.gz
tar -xjf archive.tar.bz2        # распаковать .tar.bz2
tar -xf archive.tar -C /dest/   # распаковать в указанный каталог
tar -xf archive.tar file.txt    # извлечь только один файл
```

#### Ключи tar (запомни)

| Ключ | Значение |
|------|----------|
| `-c` | create (создать) |
| `-x` | extract (распаковать) |
| `-t` | list (список) |
| `-f` | file (имя архива) |
| `-z` | gzip |
| `-j` | bzip2 |
| `-J` | xz |
| `-v` | verbose (подробный вывод) |
| `-C` | change directory (куда распаковывать) |
| `-p` | сохранить права доступа |
| `--exclude` | исключить файл/каталог |

Флаг `-f` почти всегда нужен. Имя файла после `-f` идёт сразу за этим флагом.

### cpio

`cpio` (copy in/out) работает со списком файлов из stdin.

```bash
# Создание архива
find . -name "*.conf" | cpio -ov > backup.cpio

# Просмотр содержимого
cpio -tv < backup.cpio

# Извлечение
cpio -idv < backup.cpio

# Извлечение в другой каталог
(mkdir -p /dest && cd /dest && cpio -idv < /path/backup.cpio)
```

Режимы `cpio`:
- `-o` (out) — создание архива
- `-i` (in) — извлечение
- `-p` (pass-through) — копирование без создания архива

---

## Копирование данных: dd

`dd` копирует данные побайтово. Работает с блочными устройствами и файлами.

```bash
# Создать образ диска
dd if=/dev/sda of=/backup/disk.img

# Восстановить образ
dd if=/backup/disk.img of=/dev/sda

# Создать образ раздела
dd if=/dev/sda1 of=partition.img

# Создать файл заданного размера (заполненный нулями)
dd if=/dev/zero of=test.img bs=1M count=100

# Создать файл случайными данными
dd if=/dev/urandom of=random.bin bs=1M count=10

# Создать загрузочный USB
dd if=linux.iso of=/dev/sdb bs=4M status=progress

# Конвертировать регистр
dd if=input.txt of=output.txt conv=ucase
```

Параметры `dd`:

| Параметр | Значение |
|----------|----------|
| `if=` | input file (источник) |
| `of=` | output file (назначение) |
| `bs=` | block size (размер блока) |
| `count=` | количество блоков |
| `skip=` | пропустить блоков в начале входного файла |
| `seek=` | пропустить блоков в начале выходного файла |
| `conv=` | конвертация (ucase, lcase, notrunc, sync...) |
| `status=progress` | показывать прогресс |

---

## Сжатие файлов

### gzip и gunzip

`gzip` сжимает файлы, заменяя оригинал на `.gz`.

```bash
gzip file.txt           # создаёт file.txt.gz, удаляет file.txt
gzip -k file.txt        # сохранить исходный файл
gzip -d file.txt.gz     # распаковать (= gunzip)
gzip -1 file.txt        # быстрое сжатие (слабое)
gzip -9 file.txt        # максимальное сжатие (медленное)
gzip -l file.txt.gz     # показать информацию об архиве
gunzip file.txt.gz      # распаковать
zcat file.txt.gz        # прочитать без распаковки
```

### bzip2 и bunzip2

`bzip2` даёт лучшее сжатие, чем gzip, но работает медленнее.

```bash
bzip2 file.txt          # создаёт file.txt.bz2, удаляет file.txt
bzip2 -k file.txt       # сохранить исходный файл
bzip2 -d file.txt.bz2   # распаковать (= bunzip2)
bzip2 -1 file.txt       # быстрое сжатие
bzip2 -9 file.txt       # максимальное сжатие
bunzip2 file.txt.bz2    # распаковать
bzcat file.txt.bz2      # прочитать без распаковки
```

### xz

`xz` обеспечивает наилучшее сжатие из трёх, но медленнее всех.

```bash
xz file.txt             # создаёт file.txt.xz
xz -d file.txt.xz       # распаковать
xz -k file.txt          # сохранить оригинал
xzcat file.txt.xz       # прочитать без распаковки
```

---

## Шпаргалка для экзамена

```bash
# cp
cp -r src/ dst/                          # рекурсивное копирование каталога
cp -a src/ dst/                          # архивный режим (сохраняет всё)
cp -i *.txt /backup/                     # копировать с подтверждением

# find - самые частые паттерны
find /home -name "*.txt" -type f
find /var -size +50M -mtime -7
find / -perm -4000 -type f               # найти SUID-файлы
find . -name "*.tmp" -delete
find . -name "*.sh" -exec chmod +x {} \;

# tar - запомни порядок флагов: операция, затем модификаторы, затем -f
tar -czf backup.tar.gz /home/user/
tar -xzf backup.tar.gz -C /restore/
tar -tf archive.tar

# dd - копирование диска
dd if=/dev/sda of=disk.img bs=4M status=progress

# gzip/bzip2
gzip -k largefile.log        # сжать, оставив оригинал
tar -czf backup.tar.gz dir/  # чаще используют через tar
```

---

## Типичные вопросы экзамена

**Рекурсивное удаление каталога:** `rm -rf dir/` (не `rmdir`).

**Сохранить права при копировании:** `cp -a` или `cp -p`.

**Найти файлы больше 1 ГБ:** `find / -size +1G`.

**Найти файлы изменённые за последние 2 дня:** `find / -mtime -2`.

**Создать архив и сжать через bzip2:** `tar -cjf arch.tar.bz2 dir/`.

**Распаковать .tar.gz в /tmp:** `tar -xzf arch.tar.gz -C /tmp/`.

**Просмотреть содержимое архива без распаковки:** `tar -tf arch.tar`.

**Отличие mtime, atime, ctime:**
- `mtime` — время последнего изменения содержимого файла.
- `atime` — время последнего доступа к файлу.
- `ctime` — время последнего изменения метаданных (прав, владельца).

**Что делает `touch` с существующим файлом:** обновляет временные метки до текущего времени.

**Отличие `cpio` от `tar`:** `cpio` принимает список файлов через stdin, `tar` принимает имена файлов напрямую.

**`dd conv=notrunc`:** не усекать выходной файл при записи.

---

## Упражнения

### Практические упражнения (Guided Exercises)

#### 1. Анализ вывода ls -lh

Дан вывод команды `ls -lh`:

```
total 60K
drwxr-xr-x  2  frank  frank  4.0K  Apr 1  2018  Desktop
drwxr-xr-x  2  frank  frank  4.0K  Apr 1  2018  Documents
-rw-r--r--  1  frank  frank  21    Sep 7  12:59  emp_name
-rw-r--r--  1  frank  frank  20    Sep 7  13:03  emp_salary
-rw-r--r--  1  frank  frank  8.8K  Apr 1  2018  examples.desktop
-rw-r--r--  1  frank  frank  10    Sep 1  2018  file1
```

**Что означает символ `d` в начале строки?**

<details><summary>Ответ</summary>

`d` обозначает каталог (directory). Обычный файл обозначается `-`, специальный файл — `c`.

</details>

**Почему размеры отображаются в человекочитаемом формате?**

<details><summary>Ответ</summary>

Из-за флага `-h`. Без него размеры были бы в байтах.

</details>

**Чем отличался бы вывод команды `ls` без аргументов?**

<details><summary>Ответ</summary>

Выводились бы только имена файлов и каталогов, без дополнительных деталей (прав, владельца, размера, даты).

</details>

---

#### 2. Копирование и перемещение

Дана команда:

```bash
cp /home/frank/emp_name /home/frank/backup
```

**Что произойдёт с файлом `emp_name` при успешном выполнении?**

<details><summary>Ответ</summary>

Файл `emp_name` будет скопирован в каталог `backup`. Исходный файл останется на месте.

</details>

**Если бы `emp_name` был каталогом, какой флаг нужно добавить к `cp`?**

<details><summary>Ответ</summary>

`-r` (рекурсивно). Без него `cp` откажется копировать каталог с сообщением `omitting directory`.

</details>

**Если заменить `cp` на `mv`, что изменится?**

<details><summary>Ответ</summary>

`emp_name` переместится в `backup`. В домашнем каталоге пользователя frank его больше не будет.

</details>

---

#### 3. Удаление с помощью wildcard

Дан каталог:

```
file1.txt  file2.txt  file3.txt  file4.txt
```

**Какой wildcard удалит всё содержимое каталога одной командой?**

<details><summary>Ответ</summary>

Звёздочка `*`:

```bash
rm *
```

`*` совпадает с любым количеством любых символов, включая пустую строку, то есть захватит все файлы.

</details>

---

#### 4. ls с wildcard

**Какие файлы выведет команда `ls file*.txt` из того же каталога?**

<details><summary>Ответ</summary>

Все четыре: `file1.txt`, `file2.txt`, `file3.txt`, `file4.txt`. Звёздочка заменяет любое количество символов, в том числе одну цифру.

</details>

---

#### 5. Скобочный глобинг

**Дополни команду, чтобы вывести все четыре файла (`file1.txt`...`file4.txt`):**

```bash
ls file[].txt
```

<details><summary>Ответ</summary>

```bash
ls file[0-9].txt
```

`[0-9]` — диапазон, совпадающий с одной цифрой от 0 до 9. Подойдут и другие варианты: `[1-4]` или `[1234]`.

</details>

---

#### 6. Анализ вывода find -type d

Дан вывод:

```bash
$ find /home/frank/Documents/ -type d
/home/frank/Documents/
/home/frank/Documents/animal
/home/frank/Documents/animal/domestic
/home/frank/Documents/animal/wild
```

**Какой тип файлов выводит эта команда?**

<details><summary>Ответ</summary>

Только каталоги (directories). Флаг `-type d` ограничивает поиск каталогами.

</details>

**В каком каталоге начинается поиск?**

<details><summary>Ответ</summary>

`/home/frank/Documents`.

</details>

---

#### 7. Недостающий флаг tar

Пользователь хочет создать сжатый архив:

```bash
tar cvf /home/frank/backup.tar.gz /home/frank/dir1
```

**Какой флаг пропущен для сжатия через gzip?**

<details><summary>Ответ</summary>

`-z`. Без него `tar` создаёт обычный несжатый архив, несмотря на расширение `.gz`. Правильная команда:

```bash
tar -czvf /home/frank/backup.tar.gz /home/frank/dir1
```

</details>

---

### Исследовательские упражнения (Explorational Exercises)

#### 1. Создать файлы dog и cat

**Задание:** В домашнем каталоге создай файлы `dog` и `cat`.

<details><summary>Ответ</summary>

```bash
touch dog cat
```

`touch` создаёт пустые файлы с текущими временными метками. Несколько имён можно передать одной командой.

</details>

---

#### 2. Создать каталог и переместить файлы

**Задание:** Там же создай каталог `animal` и перемести в него `dog` и `cat`.

<details><summary>Ответ</summary>

```bash
mkdir animal
mv dog cat -t animal/
```

Флаг `-t` задаёт целевой каталог явно. Это удобно, когда перемещаешь несколько файлов. Вариант без `-t` тоже работает: `mv dog cat animal/`.

</details>

---

#### 3. Создать backup внутри Documents

**Задание:** Перейди в `~/Documents` и создай там каталог `backup`.

<details><summary>Ответ</summary>

```bash
cd ~/Documents
mkdir backup
```

</details>

---

#### 4. Рекурсивное копирование

**Задание:** Скопируй `animal` вместе с содержимым в `backup`.

<details><summary>Ответ</summary>

```bash
cp -r animal ~/Documents/backup
```

`-r` копирует каталог рекурсивно. Без этого флага `cp` выдаст ошибку `omitting directory`.

</details>

---

#### 5. Переименование в backup

**Задание:** Переименуй `animal` внутри `backup` в `animal.bkup`.

<details><summary>Ответ</summary>

```bash
mv animal/ animal.bkup
```

Команда выполняется внутри каталога `backup`. `mv` переименовывает каталог так же, как и файл.

</details>

---

#### 6. Список конкретных архивов

**Задание:** Каталог `/home/lpi/databases` содержит много файлов, среди которых есть `db-1.tar.gz`, `db-2.tar.gz` и `db-3.tar.gz`. Какой одной командой вывести только их?

<details><summary>Ответ</summary>

```bash
ls db-[1-3].tar.gz
```

`[1-3]` совпадает ровно с одним символом из диапазона 1-3, что точно отсекает лишние файлы.

</details>

---

#### 7. Удалить только pdf

**Задание:** Дан каталог:

```
cne1222223.pdf  cne12349.txt  cne1234.pdf
```

Удали только `.pdf` файлы, используя один глобинг-символ.

<details><summary>Ответ</summary>

```bash
rm *.pdf
```

`*` совпадает с любым именем перед `.pdf`. Файл `.txt` не затронут.

</details>

---

#### 8. Поиск и удаление объёмных backup-файлов

**Задание:** В каталоге `/var` нужно найти файлы с расширением `.backup`.

<details><summary>Ответ</summary>

```bash
find /var -name "*.backup"
```

</details>

**Задание:** Уточни поиск: найти только те `.backup` файлы, размер которых от 100M до 1000M.

<details><summary>Ответ</summary>

```bash
find /var -name "*.backup" -size +100M -size -1000M
```

Два условия `-size` объединяются как AND: файл должен быть строго больше 100M и строго меньше 1000M.

</details>

**Задание:** Добавь к предыдущей команде удаление найденных файлов.

<details><summary>Ответ</summary>

```bash
find /var -name "*.backup" -size +100M -size -1000M -delete
```

`-delete` удаляет каждый найденный файл напрямую, без запуска внешнего процесса. Используй это только убедившись, что результаты поиска именно те файлы, которые нужно удалить.

</details>

---

#### 9. Архивирование нескольких файлов

В каталоге `/var` лежат четыре файла:
```
db-jan-2018.backup
db-feb-2018.backup
db-march-2018.backup
db-apr-2018.backup
```

**Задание:** Создай архив `db-first-quarter-2018.backup.tar` из всех четырёх файлов.

<details><summary>Ответ</summary>

```bash
tar -cvf db-first-quarter-2018.backup.tar db-jan-2018.backup db-feb-2018.backup db-march-2018.backup db-apr-2018.backup
```

`tar` принимает несколько файлов через пробел. Все они войдут в один архив.

</details>

**Задание:** Создай тот же архив, но сжатый через gzip. Имя файла должно оканчиваться на `.gz`.

<details><summary>Ответ</summary>

```bash
tar -zcvf db-first-quarter-2018.backup.tar.gz db-jan-2018.backup db-feb-2018.backup db-march-2018.backup db-apr-2018.backup
```

Добавляется флаг `-z` для gzip-сжатия. Расширение `.tar.gz` указывает, что это tar-архив, сжатый через gzip.

</details>

---

*Тема 103: Команды GNU и Unix*
