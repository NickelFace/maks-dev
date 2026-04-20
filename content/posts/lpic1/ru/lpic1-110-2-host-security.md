---
title: "LPIC-1 110.2 — Настройка безопасности хоста"
date: 2026-04-20
description: "Теневые пароли, /etc/passwd и /etc/shadow, /etc/nologin, супердемон xinetd, systemd.socket, отключение ненужных служб, TCP wrappers с /etc/hosts.allow и /etc/hosts.deny. LPIC-1 тема 110.2."
tags: ["Linux", "LPIC-1", "security", "xinetd", "TCP wrappers", "shadow"]
categories: ["LPIC-1"]
page_lang: "ru"
lang_pair: "/posts/lpic1/lpic1-110-2-host-security/"
pagefind_ignore: true
build:
  list: never
  render: always
---

> **Вес на экзамене: 3** — LPIC-1 v5, Exam 102

## Что нужно знать

Согласно официальным целям LPIC-1:

- Понимать теневые пароли и принцип их работы.
- Отключать неиспользуемые сетевые службы.
- Понимать назначение TCP wrappers.
- Знать о `xinetd` и `systemd.socket`.

Ключевые файлы и команды: `/etc/nologin`, `/etc/passwd`, `/etc/shadow`, `/etc/xinetd.d/`, `/etc/xinetd.conf`, `systemd.socket`, `/etc/hosts.allow`, `/etc/hosts.deny`.

---

## Теневые пароли

### /etc/passwd

Доступен на чтение всем (`-rw-r--r--`). Содержит семь полей, разделённых двоеточиями:

```
имя_пользователя:x:UID:GID:GECOS:домашний_каталог:оболочка
```

| Поле | Описание |
|---|---|
| `имя_пользователя` | Имя для входа |
| `x` | Заглушка пароля — фактический хеш хранится в `/etc/shadow` |
| `UID` | Числовой идентификатор пользователя |
| `GID` | Идентификатор основной группы |
| `GECOS` | Полное имя и комментарий |
| `домашний_каталог` | Путь к домашнему каталогу |
| `оболочка` | Командная оболочка при входе |

Символ `x` в поле пароля означает, что используются теневые пароли.

### /etc/shadow

Недоступен на чтение обычным пользователям (`-rw-r-----` или `----------`). Содержит фактические хеши паролей и параметры срока действия. Читать этот файл может только root (и группа `shadow` в некоторых дистрибутивах). Команды `passwd` и `chage` изменяют именно этот файл.

```
emma:$6$abc123...:18000:7:90:14:30::
```

Поля: имя, хеш, дата последней смены (дни с эпохи), мин., макс., предупреждение, неактивность, истечение, зарезервировано.

---

## /etc/nologin

Пока этот файл существует, все попытки входа от непривилегированных пользователей отклоняются. Файл может содержать сообщение, которое отображается пользователям.

```bash
echo "Ведётся техническое обслуживание." > /etc/nologin
```

Root не подчиняется ограничению `/etc/nologin`.

Команда `nologin` устанавливается как оболочка конкретного пользователя, блокируя его вход:

```bash
usermod -s /sbin/nologin emma
```

Файл `/etc/nologin` блокирует все входы непривилегированных пользователей, включая беспарольные входы по SSH-ключам.

---

## Супердемон: xinetd

Супердемон слушает сразу на нескольких портах и запускает нужную службу по требованию, оставляя её неактивной до поступления соединения.

### /etc/xinetd.conf — основной конфигурационный файл

```
defaults
{
    # log_type = SYSLOG daemon info
}

includedir /etc/xinetd.d
```

Единственная значимая директива — `includedir`, указывающая на каталог с конфигурациями отдельных служб.

### /etc/xinetd.d/ — конфигурации служб

Каждый файл управляет одной службой. Пример `/etc/xinetd.d/ssh`:

```
service ssh
{
    disable       = no
    socket_type   = stream
    protocol      = tcp
    wait          = no
    user          = root
    server        = /usr/sbin/sshd
    server_args   = -i
    flags         = IPv4
    interface     = 192.168.1.1
}
```

| Директива | Описание |
|---|---|
| `service` | Имя службы (из `/etc/services` или номер порта) |
| `disable` | `no` = активна, `yes` = отключена |
| `socket_type` | `stream` для TCP, `dgram` для UDP |
| `protocol` | `tcp` или `udp` |
| `wait` | Обычно `no` для TCP |
| `user` | Пользователь, от имени которого запускается служба |
| `server` | Полный путь к исполняемому файлу службы |
| `server_args` | Аргументы, передаваемые исполняемому файлу |
| `flags` | `IPv4`, `IPv6` и другие |
| `interface` / `bind` | IP-адрес сетевого интерфейса для прослушивания |

Шаблонные файлы в `/etc/xinetd.d/` (например, `daytime`, `echo`, `chargen`) содержат директиву `disable = yes` и служат примерами для устаревших служб.

После внесения изменений необходимо перезапустить xinetd:

```bash
sudo systemctl restart xinetd.service
```

---

## systemd.socket

Современный аналог `xinetd`. Сокет-юнит активирует службу по требованию при поступлении соединения.

```bash
sudo systemctl start ssh.socket      # SSH по требованию через systemd
sudo lsof -i :22 -P                  # проверить, кто слушает порт
```

При активном `ssh.socket` в качестве слушателя отображается `systemd` (PID 1), который при каждом входящем соединении запускает `sshd`.

---

## Отключение ненужных служб

Неиспользуемые службы расходуют ресурсы и увеличивают поверхность атаки.

### Системы с SysV-init

```bash
sudo service --status-all            # список всех служб
sudo update-rc.d SERVICE remove      # отключить в Debian/Ubuntu
sudo chkconfig SERVICE off           # отключить в RHEL/CentOS
```

### Системы с systemd

```bash
systemctl list-units --state active --type service   # список активных служб
sudo systemctl disable UNIT --now    # остановить немедленно и запретить автозапуск
```

### Проверка отсутствия слушателей

```bash
netstat -ltu                         # устаревшие системы (net-tools)
ss -ltu                              # современный аналог
```

---

## TCP Wrappers

TCP wrappers обеспечивают простой контроль доступа по хосту для служб, собранных с поддержкой `libwrap`. Из многих современных дистрибутивов (например, Fedora 29+) эта возможность удалена, однако знание её остаётся актуальным для устаревших систем.

### Проверка поддержки libwrap

```bash
ldd /usr/sbin/sshd | grep "libwrap"
```

Если в выводе присутствует `libwrap.so`, демон поддерживает TCP wrappers.

### /etc/hosts.allow и /etc/hosts.deny

Порядок обработки:
1. Сначала проверяется `/etc/hosts.allow` — при совпадении доступ разрешается.
2. Затем проверяется `/etc/hosts.deny` — при совпадении доступ запрещается.
3. При отсутствии совпадений в обоих файлах доступ разрешается (поведение по умолчанию).

Формат: `ДЕМОН: СПИСОК_КЛИЕНТОВ`

```
# /etc/hosts.deny
sshd: ALL

# /etc/hosts.allow
sshd: LOCAL
sshd: 192.168.1.
```

Часто используемые шаблоны клиентов:

| Шаблон | Значение |
|---|---|
| `ALL` | Все хосты |
| `LOCAL` | Хосты локального домена (без точки в имени) |
| `192.168.1.` | Префикс IP (подсеть) |
| `KNOWN` | Хосты с разрешаемыми именами |

Изменения вступают в силу немедленно — перезапуск служб не требуется.

---

## Полезные команды для экзамена

```
/etc/passwd:     имя:x:UID:GID:GECOS:home:shell
  x = используются теневые пароли; читается всеми

/etc/shadow:     хеши паролей + параметры; недоступен обычным пользователям
  изменяется командами passwd и chage

/etc/nologin:    блокирует вход всех непривилегированных пользователей (включая SSH)
  usermod -s /sbin/nologin ПОЛЬЗОВАТЕЛЬ   блокировать конкретный аккаунт

xinetd:
  /etc/xinetd.conf             основной конфиг (includedir /etc/xinetd.d)
  /etc/xinetd.d/СЛУЖБА         файл службы
    disable = no/yes
    socket_type = stream/dgram
    server = /путь/к/бинарному/файлу
    server_args = -i
    interface = IP
  systemctl restart xinetd.service

systemd.socket:
  systemctl start ssh.socket

Отключение служб:
  systemctl disable UNIT --now
  update-rc.d SERVICE remove   (Debian SysV)
  chkconfig SERVICE off        (RHEL SysV)
  systemctl list-units --state active --type service

TCP wrappers:
  ldd /usr/sbin/ДЕМОН | grep libwrap   проверить поддержку
  /etc/hosts.allow проверяется первым
  /etc/hosts.deny проверяется вторым
  по умолчанию — разрешить при отсутствии совпадений
  sshd: ALL          запретить всем
  sshd: LOCAL        разрешить локальной сети
  изменения мгновенные, перезапуск не нужен
```

---

## Типичные вопросы экзамена

1. Что означает символ `x` в поле пароля `/etc/passwd`? → Используются теневые пароли; фактический хеш хранится в `/etc/shadow`.
2. Сколько полей содержит `/etc/passwd`? → 7 (имя, заглушка пароля, UID, GID, GECOS, домашний каталог, оболочка).
3. В каком файле хранятся фактические хеши паролей? → `/etc/shadow`
4. Кто может читать `/etc/shadow`? → Только root (и группа `shadow` в некоторых дистрибутивах).
5. Что происходит при наличии файла `/etc/nologin`? → Все попытки входа непривилегированных пользователей отклоняются; содержимое файла выводится как сообщение.
6. Блокирует ли `/etc/nologin` беспарольные входы по SSH-ключам? → Да, блокирует любые входы непривилегированных пользователей независимо от метода аутентификации.
7. Какая команда устанавливает `/sbin/nologin` как оболочку пользователя? → `usermod -s /sbin/nologin ИМЯ_ПОЛЬЗОВАТЕЛЯ`
8. Каков основной конфигурационный файл xinetd? → `/etc/xinetd.conf`
9. Где хранятся конфигурационные файлы служб xinetd? → `/etc/xinetd.d/`
10. Какая директива xinetd активирует или деактивирует службу? → `disable = no` (активна) или `disable = yes` (неактивна).
11. Какое значение `socket_type` используется для TCP-служб в xinetd? → `stream`
12. Каков современный аналог xinetd в systemd? → Юниты `systemd.socket` (например, `ssh.socket`).
13. Какая команда systemd останавливает службу и запрещает её автозапуск? → `systemctl disable UNIT --now`
14. Как проверить, поддерживает ли демон TCP wrappers? → `ldd /путь/к/демону | grep "libwrap"`
15. В каком порядке проверяются `/etc/hosts.allow` и `/etc/hosts.deny`? → Сначала `hosts.allow`, затем `hosts.deny`; при отсутствии совпадений — разрешить.
16. Какое правило TCP wrappers запрещает все SSH-соединения? → Добавить `sshd: ALL` в `/etc/hosts.deny`.
17. Требуется ли перезапуск службы после изменений в TCP wrappers? → Нет, изменения вступают в силу немедленно.
18. Какая команда выводит список всех активных systemd-юнитов типа service? → `systemctl list-units --state active --type service`

---

## Упражнения

### Практическое упражнение 1 — Теневые пароли

Убедитесь, что теневые пароли настроены, и попробуйте прочитать `/etc/shadow` от имени непривилегированного пользователя.

<details>
<summary>Ответ</summary>

```bash
grep root /etc/passwd      # в поле пароля должен быть 'x'
grep root /etc/shadow      # для непривилегированного пользователя — отказ в доступе
```

`/etc/passwd` доступен на чтение всем; `/etc/shadow` — нет.

</details>

---

### Практическое упражнение 2 — Отключение службы

Отключите службу печати `cups` на системе с systemd и проверьте, что порт 631 больше не прослушивается.

<details>
<summary>Ответ</summary>

```bash
sudo systemctl disable cups.service --now
netstat -l | grep ":ipp"
# или
ss -l | grep ":ipp"
```

</details>

---

### Практическое упражнение 3 — Конфигурация xinetd

Включите устаревшую службу `daytime` в xinetd для тестирования.

<details>
<summary>Ответ</summary>

Отредактируйте `/etc/xinetd.d/daytime`, изменив:

```
disable = yes
```

на:

```
disable = no
```

Затем перезапустите xinetd:

```bash
sudo systemctl restart xinetd.service
```

Проверьте:

```bash
nc localhost daytime
```

</details>

---

### Исследовательское упражнение 1 — TCP Wrappers

Настройте TCP wrappers так, чтобы `sshd` принимал подключения только из локальной сети.

<details>
<summary>Ответ</summary>

Добавьте в `/etc/hosts.deny`:

```
sshd: ALL
```

Добавьте в `/etc/hosts.allow`:

```
sshd: LOCAL
```

Перезапуск не требуется. Предварительно убедитесь, что sshd поддерживает libwrap: `ldd /usr/sbin/sshd | grep libwrap`.

</details>

---

### Исследовательское упражнение 2 — /etc/nologin

Заблокируйте вход всех непривилегированных пользователей на время обслуживания.

<details>
<summary>Ответ</summary>

```bash
echo "Ведётся техническое обслуживание. Повторите попытку через 30 минут." > /etc/nologin
```

По завершении:

```bash
rm /etc/nologin
```

</details>

---

*LPIC-1 Study Notes | Topic 110: Security*
