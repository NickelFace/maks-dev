---
title: "LPIC-1 109.2 — Постоянная сетевая конфигурация"
date: 2026-04-20
description: "Именование сетевых интерфейсов, /etc/network/interfaces, ifup/ifdown, настройка имени хоста, /etc/hosts, /etc/resolv.conf, NetworkManager/nmcli, systemd-networkd. LPIC-1 тема 109.2."
tags: ["Linux", "LPIC-1", "networking", "NetworkManager", "nmcli", "systemd-networkd"]
categories: ["LPIC-1"]
page_lang: "ru"
lang_pair: "/posts/lpic1/lpic1-109-2-network-config/"
pagefind_ignore: true
build:
  list: never
  render: always
---

> **Вес на экзамене: 4** — LPIC-1 v5, Exam 102

## Что нужно знать

Согласно официальным целям LPIC-1:

- Понимать базовую конфигурацию TCP/IP хоста.
- Настраивать Ethernet и Wi-Fi с помощью NetworkManager.
- Знать о `systemd-networkd`.

Ключевые файлы и команды: `/etc/hostname`, `/etc/hosts`, `/etc/nsswitch.conf`, `/etc/resolv.conf`, `/etc/network/interfaces`, `ifup`, `ifdown`, `ip`, `ifconfig`, `route`, `nmcli`, `hostnamectl`.

---

## Именование сетевых интерфейсов

### Префиксы имён

| Префикс | Тип интерфейса |
|---|---|
| `en` | Ethernet |
| `ib` | InfiniBand |
| `sl` | Последовательная линия (SLIP) |
| `wl` | Беспроводная локальная сеть |
| `ww` | Беспроводная глобальная сеть (WWAN) |

### Политика именования (предсказуемые имена)

Ядро назначает имена в порядке приоритета:

1. **Индекс встроенного устройства BIOS** — `eno1`, `eno2`
2. **Номер слота PCI** — `ens1`, `ens3`
3. **Топология шины** (шина/слот/функция PCI) — `enp2s0`
4. **MAC-адрес** — `enx001122334455`
5. **Устаревшее** — `eth0`, `eth1` (резервный вариант)

### Просмотр интерфейсов

```bash
ip link show          # современный вариант
ifconfig -a           # все интерфейсы, включая неактивные
nmcli device          # список устройств NetworkManager
```

---

## /etc/network/interfaces (Debian/Ubuntu)

Традиционный файл конфигурации сети, используемый совместно с `ifupdown`.

```
# Петлевой интерфейс
auto lo
iface lo inet loopback

# DHCP
auto eth0
iface eth0 inet dhcp

# Статический адрес
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    dns-nameservers 8.8.8.8 8.8.4.4
```

Основные директивы:

| Директива | Описание |
|---|---|
| `auto ИНТЕРФЕЙС` | Поднять интерфейс при загрузке |
| `iface ИНТЕРФЕЙС inet dhcp` | Настройка через DHCP |
| `iface ИНТЕРФЕЙС inet static` | Статическая настройка |
| `address` | IP-адрес |
| `netmask` | Маска подсети |
| `gateway` | Шлюз по умолчанию |
| `dns-nameservers` | DNS-серверы (требует `resolvconf`) |

### ifup / ifdown

```bash
ifup eth0      # поднять интерфейс
ifdown eth0    # опустить интерфейс
```

---

## Настройка имени хоста

### /etc/hostname

Содержит статическое имя хоста одной строкой:

```
myserver
```

### hostnamectl

```bash
hostnamectl                               # показать сведения об имени хоста
hostnamectl set-hostname myserver         # установить статическое имя
hostnamectl set-hostname "Мой сервер" --pretty    # установить красивое имя
hostnamectl set-hostname "" --transient            # установить временное имя
hostnamectl status                        # показать все типы имён
```

Три типа имён хоста:

| Тип | Описание |
|---|---|
| Статическое | Хранится в `/etc/hostname`; сохраняется после перезагрузки |
| Временное (transient) | Устанавливается ядром или DHCP; теряется при перезагрузке |
| Красивое (pretty) | Произвольная читаемая метка |

---

## Файлы разрешения имён

### /etc/nsswitch.conf

Управляет порядком и источниками разрешения имён. Строка `hosts` определяет способ разрешения имён хостов:

```
hosts:    files dns
```

Сначала проверяется `/etc/hosts`, затем DNS.

### /etc/hosts

Локальное сопоставление IP-адресов с именами хостов, минуя DNS:

```
127.0.0.1       localhost
127.0.1.1       myserver
::1             localhost ip6-localhost ip6-loopback
192.168.1.10    fileserver fs
```

Формат: `IP-АДРЕС имя-хоста [псевдоним ...]`

### /etc/resolv.conf

Настройка DNS-серверов и поисковых доменов:

```
nameserver 8.8.8.8
nameserver 8.8.4.4
search example.com
```

| Директива | Описание |
|---|---|
| `nameserver IP` | DNS-сервер (не более 3 записей) |
| `search ДОМЕН` | Суффикс для коротких имён (не более 6) |
| `domain ДОМЕН` | Локальный домен (несовместим с `search`) |

Этот файл может перезаписываться NetworkManager и другими инструментами.

---

## NetworkManager и nmcli

NetworkManager — стандартный демон управления сетью в большинстве дистрибутивов. `nmcli` — его интерфейс командной строки.

### Объекты nmcli

| Объект | Описание |
|---|---|
| `general` | Общий статус NetworkManager |
| `networking` | Включение/отключение сети |
| `radio` | Переключатели радиомодулей Wi-Fi и WWAN |
| `connection` | Управление сохранёнными соединениями |
| `device` | Управление сетевыми интерфейсами |
| `agent` | Агенты секретов |
| `monitor` | Мониторинг сетевой активности |

### Основные команды nmcli

```bash
# Статус
nmcli general status
nmcli device status
nmcli device show eth0

# Соединения
nmcli connection show
nmcli connection up myconn
nmcli connection down myconn
nmcli connection delete myconn

# Добавить статическое Ethernet-соединение
nmcli connection add type ethernet ifname eth0 con-name myconn \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns 8.8.8.8 \
  ipv4.method manual

# Изменить соединение
nmcli connection modify myconn ipv4.dns 1.1.1.1

# Сеть вкл/выкл
nmcli networking on
nmcli networking off

# Wi-Fi
nmcli radio wifi on
nmcli device wifi list
nmcli device wifi connect "Сеть" password "пароль"
```

---

## systemd-networkd

`systemd-networkd` — демон настройки сети на основе systemd.

### Каталоги конфигурации

| Путь | Описание |
|---|---|
| `/lib/systemd/network/` | Поставляется пакетами |
| `/run/systemd/network/` | Временная (генерируемая) |
| `/etc/systemd/network/` | Конфигурация администратора (высший приоритет) |

### Формат файла .network

Файл должен иметь расширение `.network`. Секция `[Match]` выбирает интерфейс; `[Network]` задаёт конфигурацию.

```ini
# DHCP: /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
DHCP=yes
```

```ini
# Статический адрес
[Match]
Name=eth0

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8
```

---

## Полезные команды для экзамена

```
Префиксы интерфейсов: en (Ethernet)  wl (Wi-Fi)  ww (WWAN)
  eno1 (встроенный)  ens1 (слот PCI)  enp2s0 (шина)  enx... (MAC)

ip link show         список интерфейсов
ifconfig -a          все интерфейсы (устаревшее)
nmcli device         список устройств NM

/etc/network/interfaces:
  auto ИНТЕРФЕЙС                 поднять при загрузке
  iface ИНТЕРФЕЙС inet dhcp/static/loopback
  address / netmask / gateway / dns-nameservers
  ifup ИНТЕРФЕЙС / ifdown ИНТЕРФЕЙС

Имя хоста:
  /etc/hostname              файл статического имени
  hostnamectl set-hostname ИМЯ    установить статическое
  hostnamectl status              показать все типы

Разрешение имён:
  /etc/nsswitch.conf    hosts: files dns
  /etc/hosts            IP имя-хоста [псевдоним]
  /etc/resolv.conf      nameserver / search / domain

nmcli:
  nmcli general status
  nmcli connection show/add/modify/up/down/delete
  nmcli device status/show/wifi list
  nmcli device wifi connect SSID password ПАРОЛЬ

Файл .network для systemd-networkd:
  [Match] Name=eth0
  [Network] DHCP=yes  или  Address=.../24  Gateway=...  DNS=...
  Каталог: /etc/systemd/network/
```

---

## Типичные вопросы экзамена

1. Какой префикс обозначает интерфейс беспроводной сети? → `wl`
2. Какое соглашение об именовании порождает имена вида `enp2s0`? → Топология PCI-шины (шина/слот/функция)
3. Какая директива в `/etc/network/interfaces` поднимает интерфейс автоматически при загрузке? → `auto ИНТЕРФЕЙС`
4. Какая команда опускает интерфейс `eth0` в системе `ifupdown`? → `ifdown eth0`
5. Где хранится статическое имя хоста? → `/etc/hostname`
6. Какая команда `hostnamectl` устанавливает имя хоста `webserver`? → `hostnamectl set-hostname webserver`
7. Какие три типа имён хоста управляет `hostnamectl`? → Статическое, временное (transient) и красивое (pretty).
8. Какой файл управляет порядком обращения к источникам разрешения имён? → `/etc/nsswitch.conf`
9. Каков формат записи в `/etc/hosts`? → `IP-АДРЕС имя-хоста [псевдоним ...]`
10. Сколько записей `nameserver` может быть в `/etc/resolv.conf`? → До 3.
11. В чём разница между `search` и `domain` в `/etc/resolv.conf`? → Они несовместимы; если указаны оба, действует последний.
12. Какая команда `nmcli` показывает все сохранённые соединения? → `nmcli connection show`
13. Какой командой `nmcli` подключиться к Wi-Fi сети `Office`? → `nmcli device wifi connect "Office" password "пароль"`
14. Какой объект `nmcli` используется для управления сетевыми интерфейсами? → `device`
15. В какой каталог администратор помещает конфигурации `systemd-networkd`? → `/etc/systemd/network/`
16. Какая секция файла `.network` выбирает настраиваемый интерфейс? → `[Match]`
17. Какая команда `nmcli` отключает всю сеть? → `nmcli networking off`
18. Какой инструмент может автоматически перезаписывать `/etc/resolv.conf`? → NetworkManager (в файле будет комментарий `# Generated by NetworkManager`).

---

## Упражнения

### Практическое упражнение 1 — Статическая конфигурация интерфейса

Напишите запись в `/etc/network/interfaces` для статической настройки `eth1` с адресом `10.0.0.50/24`, шлюзом `10.0.0.1` и DNS `10.0.0.53`.

<details>
<summary>Ответ</summary>

```
auto eth1
iface eth1 inet static
    address 10.0.0.50
    netmask 255.255.255.0
    gateway 10.0.0.1
    dns-nameservers 10.0.0.53
```

</details>

---

### Практическое упражнение 2 — Смена имени хоста

Установите статическое имя хоста `dbserver` с помощью `hostnamectl` и проверьте результат.

<details>
<summary>Ответ</summary>

```bash
hostnamectl set-hostname dbserver
hostnamectl status
```

</details>

---

### Практическое упражнение 3 — Статическое соединение через nmcli

Создайте статическое Ethernet-соединение `corp` для `eth0` с адресом `192.168.10.20/24`, шлюзом `192.168.10.1` и DNS `192.168.10.5`.

<details>
<summary>Ответ</summary>

```bash
nmcli connection add type ethernet ifname eth0 con-name corp \
  ipv4.addresses 192.168.10.20/24 \
  ipv4.gateway 192.168.10.1 \
  ipv4.dns 192.168.10.5 \
  ipv4.method manual
nmcli connection up corp
```

</details>

---

### Исследовательское упражнение 1 — systemd-networkd

Напишите файл конфигурации `systemd-networkd` для включения DHCP на интерфейсе `ens3`.

<details>
<summary>Ответ</summary>

Создайте файл `/etc/systemd/network/10-ens3.network`:

```ini
[Match]
Name=ens3

[Network]
DHCP=yes
```

</details>

---

### Исследовательское упражнение 2 — nsswitch.conf

Измените строку `hosts` в `/etc/nsswitch.conf` так, чтобы сначала проверялся `/etc/hosts`, а DNS запрашивался только при отсутствии записи.

<details>
<summary>Ответ</summary>

```
hosts:    files dns
```

При `files` на первом месте `/etc/hosts` проверяется раньше DNS. Если запись найдена, DNS не запрашивается.

</details>

---

*LPIC-1 Study Notes | Topic 109: Networking Fundamentals*
