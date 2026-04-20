---
title: "LPIC-1 108.2 — Системное журналирование"
date: 2026-04-20
description: "Настройка rsyslog: категории и приоритеты, logrotate, dmesg, systemd-journald с фильтрацией journalctl и управлением журналом, systemd-cat, ForwardToSyslog. LPIC-1 тема 108.2."
tags: ["Linux", "LPIC-1", "logging", "rsyslog", "journald", "journalctl", "syslog", "admin"]
categories: ["LPIC-1"]
page_lang: "ru"
lang_pair: "/posts/lpic1/lpic1-108-2-logging/"
pagefind_ignore: true
build:
  list: never
  render: always
---

> **Вес на экзамене: 4** — LPIC-1 v5, Exam 102

## Что нужно знать

Согласно официальным целям LPIC-1:

- Настраивать демон syslog.
- Разбираться в стандартных категориях, приоритетах и действиях.
- Настраивать ротацию журналов.
- Общее представление о журнале systemd.
- Фильтровать данные журнала systemd.
- Удалять старые данные журнала systemd.
- Получать данные журнала из системы восстановления.
- Понимать взаимодействие rsyslog с systemd-journald.

Ключевые файлы и команды: `/etc/rsyslog.conf`, `/var/log/`, `syslog`, `rsyslogd`, `logger`, `/etc/logrotate.conf`, `/etc/logrotate.d/`, `logrotate`, `/var/log/journal/`, `/etc/systemd/journald.conf`, `journalctl`, `systemd-cat`.

---

## Файлы журналов

### Основные файлы в /var/log/

| Файл | Содержимое |
|---|---|
| `auth.log` | События аутентификации, использование sudo |
| `syslog` | Общие системные сообщения (Debian/Ubuntu) |
| `messages` | Общие системные сообщения (RHEL/CentOS) |
| `kern.log` | Сообщения ядра |
| `debug` | Отладочные сообщения |
| `daemon.log` | Сообщения фоновых служб |
| `mail.log` | Активность почтового сервера |
| `Xorg.0.log` | Журнал X-сервера |
| `wtmp` | Бинарный: история успешных входов (читать через `who` или `w`) |
| `btmp` | Бинарный: неудачные попытки входа (читать через `utmpdump` или `last -f /var/log/btmp`) |
| `faillog` | Бинарный: счётчик неудачных входов по пользователям (читать через `faillog -a`) |
| `lastlog` | Бинарный: время последнего входа по пользователям (читать через `lastlog`) |

### Формат записи журнала

```
Oct 20 10:00:34 hostname program[PID]: текст сообщения
```

Поля: метка времени, имя хоста, имя программы с PID в скобках, текст сообщения.

---

## rsyslog

`rsyslog` — стандартный демон syslog в большинстве дистрибутивов Linux. Конфигурация находится в `/etc/rsyslog.conf`, дополнительные файлы — в `/etc/rsyslog.d/`.

Файл конфигурации состоит из трёх разделов:

```
#### MODULES ####
# Загрузка модулей ввода/вывода
module(load="imuxsock")   # ввод через локальный сокет
module(load="imklog")     # ввод сообщений ядра

#### GLOBAL DIRECTIVES ####
# Глобальные настройки
$FileOwner syslog
$FileGroup adm

#### RULES ####
# Категория.Приоритет  Действие
auth,authpriv.*      /var/log/auth.log
*.*;auth,authpriv.none  /var/log/syslog
```

### Категории (Facilities)

Категории определяют источник или тип сообщения:

| Категория | Номер | Описание |
|---|---|---|
| `kern` | 0 | Сообщения ядра |
| `user` | 1 | Сообщения пользовательского уровня |
| `mail` | 2 | Почтовая система |
| `daemon` | 3 | Системные службы |
| `auth` / `authpriv` | 4 | Безопасность и аутентификация |
| `syslog` | 5 | Внутренние сообщения syslog |
| `lpr` | 6 | Принтер |
| `news` | 7 | Сетевые новости |
| `uucp` | 8 | Система UUCP |
| `cron` | 9 | Задания cron/at |
| `ftp` | 11 | FTP-демон |
| `ntp` | 12 | Подсистема NTP |
| `local0`–`local7` | 16–23 | Локального назначения |

### Приоритеты

Приоритеты (уровни серьёзности) от высшего к низшему:

| Приоритет | Номер | Описание |
|---|---|---|
| `emerg` | 0 | Система неработоспособна |
| `alert` | 1 | Требуются немедленные действия |
| `crit` | 2 | Критические условия |
| `err` | 3 | Ошибки |
| `warn` | 4 | Предупреждения |
| `notice` | 5 | Нормальное, но значимое событие |
| `info` | 6 | Информационные сообщения |
| `debug` | 7 | Отладочные сообщения |

Правило с указанным приоритетом соответствует этому уровню **и всем более серьёзным** (с меньшим номером). Используйте `=приоритет` для точного соответствия, `!приоритет` — для исключения.

### Формат правил

```
категория.приоритет   действие
```

Примеры:

```
# Все сообщения auth в auth.log
auth,authpriv.*          /var/log/auth.log

# Все сообщения кроме auth/authpriv в syslog
*.*;auth,authpriv.none   /var/log/syslog

# Сообщения mail от info и выше (но не debug) в mail.log
mail.info;mail.!debug    /var/log/mail.log

# Сообщения emerg всем вошедшим пользователям
*.emerg                  :omusrmsg:*

# Отправить на удалённый syslog-сервер
*.info                   @192.168.1.1
```

### logger — отправка сообщений в syslog

`logger` записывает сообщение в syslog из командной строки или скрипта:

```bash
logger "Резервное копирование завершено"
logger -p auth.warn "Подозрительная попытка входа с 10.0.0.5"
logger -t backup "Запуск резервного копирования"
```

---

## logrotate

`logrotate` управляет ротацией файлов журналов. Запускается из cron (обычно ежедневно).

- Глобальная конфигурация: `/etc/logrotate.conf`
- Конфигурации приложений: `/etc/logrotate.d/`

### Директивы logrotate.conf

| Директива | Описание |
|---|---|
| `rotate N` | Хранить N старых файлов после ротации |
| `weekly` / `daily` / `monthly` | Частота ротации |
| `missingok` | Не выдавать ошибку, если файл журнала отсутствует |
| `notifempty` | Не ротировать пустой файл журнала |
| `compress` | Сжимать ротированные журналы (gzip) |
| `delaycompress` | Отложить сжатие до следующей ротации (один файл остаётся несжатым) |
| `sharedscripts` | Выполнять pre/postrotate-скрипты один раз для нескольких файлов |
| `postrotate` / `endscript` | Выполнить команду после ротации |

Пример `/etc/logrotate.d/nginx`:

```
/var/log/nginx/*.log {
    weekly
    rotate 4
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        nginx -s reopen
    endscript
}
```

Ротированные файлы переименовываются: `logfile.1`, `logfile.2.gz` и т.д.

---

## dmesg

`dmesg` выводит кольцевой буфер ядра — сообщения ядра с момента загрузки и события оборудования:

```bash
dmesg
dmesg | tail
dmesg | grep -i error
```

Буфер имеет ограниченный размер; старые сообщения перезаписываются первыми.

---

## systemd-journald

`systemd-journald` — служба журналирования, собирающая данные от ядра, initrd и всех служб. Хранит журналы в структурированном бинарном формате.

Конфигурация: `/etc/systemd/journald.conf`

### journalctl — просмотр журнала

| Параметр | Описание |
|---|---|
| `-r` | Показать новейшие записи первыми (в обратном порядке) |
| `-f` | Следить за журналом в реальном времени (аналог `tail -f`) |
| `-e` | Перейти к концу журнала |
| `-n N` | Показать последние N строк |
| `-k` / `--dmesg` | Только сообщения ядра |

### Параметры фильтрации

| Параметр | Описание |
|---|---|
| `--list-boots` | Список идентификаторов загрузок |
| `-b N` | Сообщения загрузки N (0 = текущая, -1 = предыдущая) |
| `-p ПРИОРИТЕТ` | Фильтр по приоритету (число или имя, например `-p err`) |
| `--since "ДАТА-ВРЕМЯ"` | Сообщения начиная с указанного момента |
| `--until "ДАТА-ВРЕМЯ"` | Сообщения до указанного момента |
| `/путь/к/исполняемому` | Сообщения от конкретного исполняемого файла |
| `-u ЮНИТ` | Сообщения конкретного юнита systemd |

Фильтры объединяются через `+` как логическое ИЛИ:

```bash
journalctl -p err + -u ssh
```

### Поля журнала

Структурированные поля можно использовать в фильтрах:

```bash
journalctl PRIORITY=3
journalctl SYSLOG_FACILITY=4
journalctl _PID=1234
journalctl _BOOT_ID=XXXX
journalctl _TRANSPORT=kernel
```

### systemd-cat — запись в журнал

`systemd-cat` передаёт вывод команды или конвейера в журнал:

```bash
echo "Резервное копирование завершено" | systemd-cat
systemd-cat -p warning echo "Мало места на диске"
./script.sh | systemd-cat -t myscript
```

| Параметр | Описание |
|---|---|
| `-p ПРИОРИТЕТ` | Установить приоритет (например `info`, `warning`, `err`) |
| `-t ИДЕНТИФИКАТОР` | Установить идентификатор syslog (тег) |

---

## Хранение журнала

Директива `Storage=` в `/etc/systemd/journald.conf` управляет расположением журнала:

| Значение | Описание |
|---|---|
| `auto` | Постоянное хранение, если существует `/var/log/journal/`; иначе временное (по умолчанию) |
| `persistent` | Всегда в `/var/log/journal/` (каталог создаётся при отсутствии) |
| `volatile` | Только в `/run/log/journal/` (теряется при перезагрузке) |
| `none` | Отбросить все данные журнала |

Постоянный журнал: `/var/log/journal/`
Временный журнал: `/run/log/journal/`

### Ограничения размера журнала

Директивы в `journald.conf`:

| Директива | Описание |
|---|---|
| `SystemMaxUse=` | Максимальное место для постоянного журнала |
| `RuntimeMaxUse=` | Максимальное место для временного журнала |
| `SystemKeepFree=` | Минимум свободного места на диске постоянного журнала |
| `RuntimeKeepFree=` | Минимум свободного места на диске временного журнала |
| `SystemMaxFileSize=` | Максимальный размер одного файла постоянного журнала |
| `RuntimeMaxFileSize=` | Максимальный размер одного файла временного журнала |
| `SystemMaxFiles=` | Максимальное число файлов постоянного журнала |
| `RuntimeMaxFiles=` | Максимальное число файлов временного журнала |

### Команды обслуживания журнала

```bash
journalctl --disk-usage          # общее использование диска журналом
journalctl --vacuum-time=1month  # удалить записи старше 1 месяца
journalctl --vacuum-size=500M    # уменьшить журнал до 500 МБ
journalctl --vacuum-files=5      # оставить только 5 файлов журнала
journalctl --rotate              # ротировать файлы журнала
journalctl --flush               # перенести временный журнал в постоянный
journalctl --sync                # синхронизировать журнал на диск
```

### Доступ к журналу из системы восстановления

```bash
journalctl -D /mnt/var/log/journal     # указать каталог журнала
journalctl --file /path/to/file.journal
journalctl --root /mnt                 # указать альтернативный корень
journalctl -m                          # объединить журналы всех хостов
```

### Передача в syslog

Для пересылки записей журнала в rsyslog добавьте в `/etc/systemd/journald.conf`:

```
ForwardToSyslog=yes
```

---

## Полезные команды для экзамена

```
Файлы журналов:
  /var/log/auth.log     события аутентификации
  /var/log/syslog       общий (Debian/Ubuntu)
  /var/log/messages     общий (RHEL)
  /var/log/kern.log     ядро
  /var/log/wtmp         история входов (who, w)
  /var/log/btmp         неудачные входы (utmpdump, last -f)
  /var/log/faillog      счётчик неудачных входов (faillog -a)
  /var/log/lastlog      время последнего входа (lastlog)

rsyslog:
  /etc/rsyslog.conf     основная конфигурация (MODULES / GLOBAL DIRECTIVES / RULES)
  /etc/rsyslog.d/       дополнительные конфигурации
  Формат правила: категория.приоритет  действие
  Категории: kern(0) user(1) mail(2) daemon(3) auth(4) syslog(5)
              lpr(6) news(7) uucp(8) cron(9) ftp(11) ntp(12) local0-7(16-23)
  Приоритеты (высокий к низкому): emerg(0) alert(1) crit(2) err(3)
                                   warn(4) notice(5) info(6) debug(7)
  *  = все  none = исключить  = = точно  ! = не

logger:
  logger "сообщение"
  logger -p категория.приоритет "сообщение"
  logger -t тег "сообщение"

logrotate:
  /etc/logrotate.conf   глобальная конфигурация
  /etc/logrotate.d/     конфигурации приложений
  Директивы: rotate N, weekly/daily/monthly, compress, delaycompress,
              missingok, notifempty, sharedscripts, postrotate/endscript

dmesg:
  dmesg                 кольцевой буфер ядра

journalctl:
  -r  обратный порядок    -f  следить    -e  перейти к концу    -n N  последние N строк
  -k/--dmesg     только ядро
  --list-boots   список загрузок
  -b N           загрузка N (0=текущая, -1=предыдущая)
  -p ПРИОРИТЕТ   фильтр по серьёзности
  --since/--until "ДАТА-ВРЕМЯ"
  -u ЮНИТ        сообщения юнита
  /путь          сообщения исполняемого файла
  + между фильтрами = ИЛИ

Обслуживание журнала:
  --disk-usage        общий размер журнала
  --vacuum-time=      удалить старше указанного срока
  --vacuum-size=      уменьшить до размера
  --vacuum-files=     оставить N файлов
  --rotate            ротировать файлы
  --flush             временный -> постоянный
  --sync              синхронизировать на диск

Хранение journald:
  Storage=auto        /var/log/journal/ если существует, иначе /run/
  Storage=persistent  всегда /var/log/journal/
  Storage=volatile    всегда /run/log/journal/
  Storage=none        отбросить всё

systemd-cat:
  echo "msg" | systemd-cat
  systemd-cat -p warning echo "msg"
  systemd-cat -t ТЕГ команда

Пересылка в syslog: ForwardToSyslog=yes в journald.conf
```

---

## Типичные вопросы экзамена

1. Какой формат у записи в syslog? → `Метка_времени Хост Программа[PID]: Сообщение`
2. В каком файле записываются неудачные попытки входа? → `/var/log/btmp` (читать через `last -f /var/log/btmp` или `utmpdump`)
3. Какая команда читает бинарный файл `faillog`? → `faillog -a`
4. Какой номер категории rsyslog у `cron`? → 9
5. Какой номер приоритета у `err`? → 3
6. Что делает `*.emerg :omusrmsg:*` в rsyslog? → Отправляет все сообщения уровня emerg всем вошедшим в систему пользователям.
7. Что означает `auth,authpriv.none` в правиле rsyslog? → Исключить категории `auth` и `authpriv` из этого правила.
8. Какая команда отправляет произвольное сообщение в syslog? → `logger "сообщение"` или `logger -p категория.приоритет "сообщение"`
9. Что делает `delaycompress` в logrotate? → Оставляет последний ротированный файл несжатым; сжимает его при следующей ротации.
10. Что делает `notifempty` в logrotate? → Пропускает ротацию, если файл журнала пустой.
11. Что делает `postrotate / endscript` в logrotate? → Выполняет команду после ротации (например, перезагрузку демона журналирования).
12. Как показать только сообщения ядра в журнале? → `journalctl -k` или `journalctl --dmesg`
13. Как следить за новыми записями журнала в реальном времени? → `journalctl -f`
14. Как показать записи журнала предыдущей загрузки? → `journalctl -b -1`
15. Как фильтровать записи журнала по приоритету `err` и выше? → `journalctl -p err`
16. Что делает `journalctl --vacuum-time=2weeks`? → Удаляет записи журнала старше 2 недель.
17. Что такое `Storage=volatile` в `journald.conf`? → Журнал хранится только в `/run/log/journal/` и теряется при перезагрузке.
18. Как настроить пересылку записей журнала в rsyslog? → Установить `ForwardToSyslog=yes` в `/etc/systemd/journald.conf`.

---

## Упражнения

### Практическое упражнение 1 — Правило rsyslog

Напишите правило rsyslog, которое направляет все сообщения категории `mail` с приоритетом `info` и выше в `/var/log/mail.log`, а все сообщения категории `kern` — в `/var/log/kern.log`.

<details>
<summary>Ответ</summary>

```
mail.info     /var/log/mail.log
kern.*        /var/log/kern.log
```

</details>

---

### Практическое упражнение 2 — Фильтрация journalctl

Показать все записи журнала текущей загрузки с приоритетом `warning` и выше, в обратном порядке.

<details>
<summary>Ответ</summary>

```bash
journalctl -b 0 -p warning -r
```

</details>

---

### Практическое упражнение 3 — Настройка logrotate

Напишите секцию logrotate для `/var/log/myapp.log`: ротация еженедельно, хранить 8 старых файлов, сжимать (с задержкой на один цикл), сигнализировать приложению после ротации.

<details>
<summary>Ответ</summary>

```
/var/log/myapp.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        kill -HUP $(cat /var/run/myapp.pid)
    endscript
}
```

</details>

---

### Исследовательское упражнение 1 — Чтение журнала из системы восстановления

Система не загружается. Корень неисправной системы смонтирован в `/mnt`. Как прочитать её журнал?

<details>
<summary>Ответ</summary>

```bash
journalctl --root /mnt
```

Или напрямую указав каталог журнала:

```bash
journalctl -D /mnt/var/log/journal
```

</details>

---

### Исследовательское упражнение 2 — Использование диска журналом

Как проверить, сколько места занимает журнал, и уменьшить его до не более 200 МБ?

<details>
<summary>Ответ</summary>

```bash
journalctl --disk-usage
journalctl --vacuum-size=200M
```

</details>

---

*LPIC-1 Study Notes | Topic 108: Essential System Services*
