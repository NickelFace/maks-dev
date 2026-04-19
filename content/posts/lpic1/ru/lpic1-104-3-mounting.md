---
title: "LPIC-1 104.3 — Управление монтированием файловых систем"
date: 2026-04-19
description: "mount, umount, /etc/fstab, UUID, LABEL, blkid, lsblk, systemd mount units и automount. Тема 104.3 экзамена LPIC-1."
tags: ["Linux", "LPIC-1", "mount", "umount", "fstab", "UUID", "blkid", "systemd", "монтирование"]
categories: ["LPIC-1"]
page_lang: "ru"
lang_pair: "/posts/lpic1/lpic1-104-3-mounting/"
pagefind_ignore: true
build:
  list: never
  render: always
---

> **Вес на экзамене: 3** — LPIC-1 v5, Экзамен 101

## Что нужно знать

- Монтировать и отмонтировать файловые системы вручную.
- Настраивать автоматическое монтирование при загрузке через `/etc/fstab`.
- Использовать метки и UUID для идентификации разделов.
- Работать с unit-файлами монтирования systemd.

Утилиты из objectives: `/etc/fstab`, `/media/`, `mount`, `umount`, `blkid`, `lsblk`.

---

## Что такое монтирование

Файловую систему в Linux нельзя использовать напрямую. Сначала её нужно прикрепить к точке в дереве каталогов — это точка монтирования. После монтирования содержимое раздела доступно через указанный каталог.

Монтировать можно вручную командой `mount` или автоматически: через `/etc/fstab` при загрузке либо через unit-файлы systemd.

---

## Команда mount

### Базовый синтаксис

```
mount -t TYPE DEVICE MOUNTPOINT
```

- `TYPE` — тип файловой системы (`ext4`, `btrfs`, `exfat`, `ntfs` и т.д.)
- `DEVICE` — раздел с файловой системой, например `/dev/sdb1`
- `MOUNTPOINT` — каталог для подключения; должен существовать

```bash
mount -t exfat /dev/sdb1 ~/flash/
```

Если в точке монтирования уже были файлы, они становятся недоступны пока поверх примонтирована другая ФС.

### Просмотр смонтированных систем

`mount` без аргументов — все смонтированные ФС. Параметр `-t` фильтрует по типу:

```bash
mount -t ext4
# /dev/sda1 on / type ext4 (rw,noatime,errors=remount-ro)

mount -t ext4,fuseblk    # несколько типов через запятую
```

Формат каждой строки: `SOURCE on TARGET type TYPE OPTIONS`.

Альтернативные способы: `cat /proc/self/mounts`, `cat /proc/mounts`, `findmnt`.

### Ключевые параметры

| Параметр | Что делает |
|---|---|
| `-t TYPE` | указать тип ФС |
| `-o OPTS` | передать опции через запятую |
| `-r` / `-ro` | только для чтения |
| `-w` / `-rw` | с правом записи |
| `-a` | смонтировать всё из `/etc/fstab` |
| `--bind` | содержимое каталога доступно в другом каталоге |

**Перемонтирование** уже подключённой ФС — через `remount`. Тип указывать не нужно:

```bash
mount -o remount,ro /dev/sdb1
mount -o remount,ro /mnt/data    # по точке монтирования
```

**`mount --bind`** делает содержимое одного каталога видимым в другом без копирования:

```bash
mount --bind /src /dst
```

---

## Команда umount

Принимает имя устройства или точку монтирования — оба варианта эквивалентны:

```bash
umount /dev/sdb1
umount ~/flash
```

| Параметр | Что делает |
|---|---|
| `-a` | отмонтировать всё из `/etc/fstab` |
| `-f` | принудительное отмонтирование (для недоступных сетевых ФС) |
| `-r` | если отмонтировать не получается — перевести в read-only |

Параметры комбинируются: `umount -fr /mnt/server`.

### Открытые файлы: lsof

При ошибке `target is busy` — кто-то держит файлы на ФС. Найти их:

```bash
lsof /dev/sdb1
# COMMAND  PID  USER  FD  TYPE  DEVICE  SIZE/OFF  NODE  NAME
# evince   3135 carol 16r REG   8,17    21881768  5195  /media/carol/.../file.pdf
```

После закрытия программы файл освободится и ФС можно отмонтировать.

---

## Где монтировать: /mnt и /media

- **`/mnt`** — для ручного временного монтирования.
- **`/media`** — стандарт для съёмных носителей. Современные дистрибутивы монтируют туда автоматически: `/media/USER/LABEL`.

---

## Файл /etc/fstab

Содержит описания ФС для монтирования. Каждая строка — ровно **6 полей**:

```
FILESYSTEM  MOUNTPOINT  TYPE  OPTIONS  DUMP  PASS
```

| Поле | Описание |
|---|---|
| `FILESYSTEM` | устройство, UUID или метка |
| `MOUNTPOINT` | точка монтирования |
| `TYPE` | тип ФС |
| `OPTIONS` | опции через запятую |
| `DUMP` | учитывать ли `dump` для бэкапа (обычно `0`) |
| `PASS` | порядок проверки при загрузке; `0` — не проверять |

Пример:

```
/dev/sda1  /  ext4  noatime,errors=remount-ro  0  1
```

### Опции монтирования

| Опция | Что делает |
|---|---|
| `defaults` | = `rw,suid,dev,exec,auto,nouser,async` |
| `atime` / `noatime` | обновлять время доступа при чтении |
| `auto` / `noauto` | монтировать ли по `mount -a` |
| `exec` / `noexec` | разрешить выполнение бинарников |
| `user` / `nouser` | разрешить монтирование обычным пользователям |
| `group` | монтирование пользователям из группы-владельца устройства |
| `owner` | монтирование владельцем устройства |
| `suid` / `nosuid` | учитывать биты SUID/SGID |
| `ro` / `rw` | только чтение / с записью |
| `sync` / `async` | синхронный / асинхронный ввод-вывод |
| `dev` / `nodev` | интерпретировать блочные и символьные устройства |
| `remount` | перемонтировать (только для `mount -o`, не для fstab) |

**`sync` на флеш-накопителях** сокращает срок службы из-за ограниченного числа циклов записи.

---

## UUID и метки

Имя устройства нестабильно: `/dev/sdb1` после переподключения может стать `/dev/sdc1`. UUID и LABEL не меняются при переподключении.

### lsblk -f

```bash
lsblk -f /dev/sda1
# NAME  FSTYPE  LABEL  UUID                                  FSAVAIL  FSUSE%  MOUNTPOINT
# sda1  ext4           6e2c12e3-472d-4bac-a257-c49ac07f3761  64.9G    33%     /
```

### blkid

```bash
blkid
blkid /dev/sda1
# /dev/sda1: UUID="6e2c12e3-..." TYPE="ext4" PARTUUID="..."
```

Обе утилиты входят в objectives 104.3.

### Использование в /etc/fstab и mount

```
UUID=6e2c12e3-472d-4bac-a257-c49ac07f3761  /      ext4  noatime,errors=remount-ro  0  1
LABEL=homedisk                              /home  ext4  defaults                   0  2
```

В командной строке:

```bash
mount UUID=56C11DCC5D2E1334 /mnt/external
mount LABEL=Backup /mnt/backup
```

---

## Монтирование через systemd

systemd управляет монтированием через unit-файлы в `/etc/systemd/system/`.

Если смонтировать ФС вручную без записи в fstab и mount unit — systemd автоматически создаст временный mount unit и будет отслеживать точку монтирования.

### Структура mount unit (.mount)

```ini
[Unit]
Description=External data disk

[Mount]
What=/dev/disk/by-uuid/56C11DCC5D2E1334
Where=/mnt/external
Type=ntfs
Options=defaults

[Install]
WantedBy=multi-user.target
```

| Поле | Описание |
|---|---|
| `What=` | устройство (обычно по UUID через `/dev/disk/by-uuid/`) |
| `Where=` | полный путь к точке монтирования |
| `Type=` | тип ФС |
| `Options=` | опции монтирования |
| `WantedBy=` | цель запуска (`multi-user.target` для обычной загрузки) |

### Именование файла

Имя файла = точка монтирования, где `/` заменены на `-`, плюс расширение `.mount`:

- `/mnt/external` → `mnt-external.mount`
- `/var/log/db` → `var-log-db.mount`
- `/` → `-.mount`

Файл кладётся в `/etc/systemd/system/`.

### Управление

```bash
systemctl daemon-reload
systemctl start  mnt-external.mount
systemctl status mnt-external.mount
systemctl enable mnt-external.mount    # монтировать при каждой загрузке
```

### Automount unit (.automount)

Для монтирования по требованию — при первом обращении к точке монтирования:

```ini
[Unit]
Description=Automount for the external data disk

[Automount]
Where=/mnt/external

[Install]
WantedBy=multi-user.target
```

Имя файла: `mnt-external.automount`. То же правило именования.

```bash
systemctl daemon-reload
systemctl start  mnt-external.automount
systemctl enable mnt-external.automount
```

---

## Шпаргалка

```bash
# Просмотр смонтированных ФС
mount
mount -t ext4,ntfs
cat /proc/self/mounts
findmnt

# Монтирование
mount -t ext4 /dev/sdb1 /mnt/data
mount -o ro,noatime /dev/sdb1 /mnt/data
mount -o remount,ro /mnt/data
mount UUID=... /mnt/data
mount LABEL=Backup /mnt/backup
mount -a                             # всё из /etc/fstab
mount --bind /src /dst

# Отмонтирование
umount /dev/sdb1
umount /mnt/data
umount -fr /mnt/server               # force + fallback ro
umount -a

# Информация об устройствах
lsblk -f /dev/sdb1
blkid /dev/sda1

# Открытые файлы
lsof /dev/sdb1

# systemd
systemctl daemon-reload
systemctl start  mnt-external.mount
systemctl enable mnt-external.mount
systemctl start  mnt-external.automount
```

---

## Типичные вопросы экзамена

1. Сколько полей в строке `/etc/fstab`? → **6**: FILESYSTEM, MOUNTPOINT, TYPE, OPTIONS, DUMP, PASS.
2. Два способа, кроме имени устройства, идентифицировать раздел в fstab? → **`UUID=`** и **`LABEL=`**.
3. Что делает `mount --bind`? → Делает содержимое одного каталога доступным в другом.
4. Что происходит при ручном монтировании без записи в fstab/unit? → systemd автоматически создаёт временный mount unit.
5. Какие команды показывают все смонтированные ФС? → `mount`, `cat /proc/self/mounts`, `cat /proc/mounts`, `findmnt`.
6. Что означает `noauto` в fstab? → Запись пропускается по `mount -a`, монтировать только вручную.
7. Что означает `nouser`? → Обычные пользователи не могут монтировать эту ФС, только root.
8. Как принудительно отмонтировать недоступную сетевую ФС? → `umount -f -r /mnt/server`.
9. Где лежит mount unit и как называется? → `/etc/systemd/system/`, имя = точка монтирования со слэшами→дефисами + `.mount`.
10. Нужно ли указывать тип при `remount`? → Нет, достаточно устройства или точки монтирования.
11. Что входит в `defaults`? → `rw, suid, dev, exec, auto, nouser, async`.
12. Как запретить выполнение бинарников при `defaults`? → Добавить `noexec`: `defaults,noexec`.
13. Чем `lsblk -f` отличается от `blkid`? → `lsblk -f` выводит таблицей с размером и точкой монтирования; `blkid` компактнее, удобен для скриптов.
14. Как найти процессы, держащие файлы на занятой ФС? → `lsof /dev/sdXN`.
15. Что делает опция `sync` и почему её не рекомендуют для флеш-накопителей? → Запись выполняется синхронно; на флеш сокращает срок службы из-за ограниченного числа циклов записи.

---

## Упражнения

### Упражнение 1 — Монтирование ext4 как read-only с опциями

Смонтировать ext4 на `/dev/sdc1` в `/mnt/external` только для чтения, с опциями `noatime` и `async`.

<details>
<summary>Ответ</summary>

```bash
mount -t ext4 -o noatime,async,ro /dev/sdc1 /mnt/external
```

</details>

---

### Упражнение 2 — Что держит занятую ФС

При попытке отмонтировать `/dev/sdd2` появляется `target is busy`. Как узнать, какие файлы открыты?

<details>
<summary>Ответ</summary>

```bash
lsof /dev/sdd2
```

Вывод покажет: имя процесса, PID, пользователя и открытый файл. После закрытия программы ФС можно отмонтировать.

</details>

---

### Упражнение 3 — noauto и mount -a

В `/etc/fstab` есть запись:

```
/dev/sdb1  /data  ext4  noatime,noauto,async
```

Будет ли эта ФС смонтирована командой `mount -a`?

<details>
<summary>Ответ</summary>

Нет. Параметр `noauto` заставляет `mount -a` пропускать эту запись. Монтировать нужно вручную.

</details>

---

### Упражнение 4 — UUID файловой системы

Как узнать UUID файловой системы на `/dev/sdb1`?

<details>
<summary>Ответ</summary>

```bash
lsblk -f /dev/sdb1
# или
blkid /dev/sdb1
```

`lsblk -f` выводит таблицей с типом, меткой, UUID, свободным местом и точкой монтирования. `blkid` даёт компактный вывод, удобный для скриптов.

</details>

---

### Упражнение 5 — Перемонтирование в read-only

ФС exFAT смонтирована в `/mnt/data`. Как перемонтировать только для чтения?

<details>
<summary>Ответ</summary>

При `remount` указывать тип и UUID не нужно — достаточно точки монтирования:

```bash
mount -o remount,ro /mnt/data
```

</details>

---

### Упражнение 6 — Список ext3 и ntfs монтирований

Как получить список всех смонтированных ФС типа ext3 и ntfs?

<details>
<summary>Ответ</summary>

```bash
mount -t ext3,ntfs
```

</details>

---

### Упражнение 7 — nouser и обычный пользователь

В `/etc/fstab`:

```
/dev/sdc1  /backup  ext4  noatime,nouser,async
```

Может ли обычный пользователь смонтировать эту ФС командой `mount /backup`?

<details>
<summary>Ответ</summary>

Нет. Опция `nouser` запрещает монтирование обычными пользователями — только root.

Для разрешения пользователям используется `user` (любой пользователь) или `group` (пользователи из группы-владельца устройства).

</details>

---

### Упражнение 8 — Принудительное отмонтирование сетевой ФС

Сетевая ФС на `/mnt/server` стала недоступна из-за потери связи. Как принудительно отмонтировать её, или перевести в read-only если не получится?

<details>
<summary>Ответ</summary>

```bash
umount -fr /mnt/server
```

`-f` — принудительное отмонтирование. `-r` — если не удалось, перевести в режим только для чтения.

</details>

---

### Упражнение 9 — Запись /etc/fstab для btrfs Backup

Написать строку fstab, которая монтирует btrfs с меткой `Backup` в `/mnt/backup` с настройками по умолчанию и без права выполнения бинарных файлов.

<details>
<summary>Ответ</summary>

```
LABEL=Backup  /mnt/backup  btrfs  defaults,noexec  0  0
```

`defaults` включает `exec`. Добавление `noexec` отменяет его — последний параметр побеждает.

DUMP и PASS: `0 0` — не использовать `dump`, не проверять при загрузке.

</details>

---

### Упражнение 10 — Эквивалент mount unit в /etc/fstab

Дан systemd mount unit:

```ini
[Unit]
Description=External data disk

[Mount]
What=/dev/disk/by-uuid/56C11DCC5D2E1334
Where=/mnt/external
Type=ntfs
Options=defaults

[Install]
WantedBy=multi-user.target
```

Какой будет эквивалентная строка в `/etc/fstab`? Как должен называться unit-файл и куда его положить?

<details>
<summary>Ответ</summary>

Эквивалент в fstab:

```
UUID=56C11DCC5D2E1334  /mnt/external  ntfs  defaults  0  0
```

`What=/dev/disk/by-uuid/UUID` — путь к симлинку, созданному udev. В fstab тот же UUID записывается через `UUID=`.

Имя файла: `mnt-external.mount` в каталоге `/etc/systemd/system/`.

Правило именования: символы `/` в пути точки монтирования заменяются на `-`:

| Точка монтирования | Имя файла |
|---|---|
| `/mnt/external` | `mnt-external.mount` |
| `/var/log/db` | `var-log-db.mount` |
| `/` | `-.mount` |

</details>

---

*LPIC-1 Study Notes | Topic 104: Devices, Linux Filesystems, Filesystem Hierarchy Standard*
