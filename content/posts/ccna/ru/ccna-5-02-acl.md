---
title: "CCNA 5.2 ACL"
date: 2026-09-10
description: "Access Control Lists на Cisco IOS: Standard и Extended ACL, wildcard маски, именованные ACL, применение к интерфейсам и VTY-линиям, IPv6 ACL и диагностика."
tags: ["CCNA", "Cisco", "ACL", "фильтрация трафика", "безопасность"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-5-02-acl/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Принцип работы ACL

ACL — список правил (permit/deny) для фильтрации трафика.

**Правила обработки:**
1. Строки проверяются **сверху вниз**
2. При первом совпадении — применяется действие, остальные строки не проверяются
3. В конце каждого ACL — **неявный `deny any`** (invisible)
4. Пустой ACL (только `deny any`) блокирует всё

> **⚠️ Важно:** Неявный `deny any` в конце ACL! Если не добавить явный `permit`, весь трафик будет заблокирован. Всегда добавляйте `permit ip any any` в конец, если нужно разрешить остальное.

---

## Типы ACL

| Тип | Номера | Фильтрует по | Размещение |
|---|---|---|---|
| Standard | 1–99, 1300–1999 | Source IP только | Близко к destination |
| Extended | 100–199, 2000–2699 | Source/Dest IP, протокол, порты | Близко к source |
| Named | Любое имя | Зависит от типа | Зависит от типа |

---

## Wildcard маски

Wildcard маска — инверсия обычной маски подсети:
- **0** = бит должен совпасть
- **1** = бит игнорируется

```
Маска:    255.255.255.0
Wildcard:   0.  0.  0.255

Сеть 192.168.1.0/24 → wildcard 0.0.0.255
Сеть 10.0.0.0/8     → wildcard 0.255.255.255
```

Специальные значения:
- `host X.X.X.X` = `X.X.X.X 0.0.0.0` (конкретный хост)
- `any` = `0.0.0.0 255.255.255.255` (любой адрес)

---

## Standard ACL

Фильтрует только по **source IP**. Номера: 1–99 или 1300–1999.

```bash
# Числовой Standard ACL
Router(config)# access-list 10 permit 192.168.1.0 0.0.0.255
Router(config)# access-list 10 permit host 192.168.1.50
Router(config)# access-list 10 deny any                     # явный deny

# Применение к интерфейсу (in = входящий, out = исходящий)
Router(config)# interface gigabitethernet 0/1
Router(config-if)# ip access-group 10 out

# Для VTY-линий (защита управления)
Router(config)# line vty 0 15
Router(config-line)# access-class 10 in
```

> **💡 Совет:** Standard ACL размещать **близко к destination** (там, где трафик должен быть заблокирован), иначе заблокируете доступ к другим ресурсам тоже.

---

## Extended ACL

Фильтрует по source/dest IP, протоколу (TCP, UDP, ICMP, IP), портам. Номера: 100–199, 2000–2699.

```bash
# Синтаксис
access-list [номер] {permit|deny} [протокол] [src] [src-wildcard] [dst] [dst-wildcard] [опции]

# Примеры
Router(config)# access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 80    # HTTP
Router(config)# access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 443   # HTTPS
Router(config)# access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 22    # SSH
Router(config)# access-list 100 deny ip any any                                # остальное

# ICMP
Router(config)# access-list 100 permit icmp 192.168.1.0 0.0.0.255 any

# Ключевые слова для портов
# eq = равно; gt = больше; lt = меньше; neq = не равно; range = диапазон
Router(config)# access-list 100 permit tcp any any range 1024 65535 established

# Ключевое слово established (только TCP с установленным соединением)
Router(config)# access-list 110 permit tcp any 192.168.1.0 0.0.0.255 established

# Применение
Router(config)# interface gigabitethernet 0/0
Router(config-if)# ip access-group 100 in
```

> **💡 Совет:** Extended ACL размещать **близко к source** — чтобы отфильтровать как можно раньше и не нагружать сеть.

---

## Named ACL

Именованные ACL — легче читать, можно удалять отдельные строки.

```bash
# Standard Named ACL
Router(config)# ip access-list standard PERMIT_LAN
Router(config-std-nacl)# permit 192.168.1.0 0.0.0.255
Router(config-std-nacl)# deny any

# Extended Named ACL
Router(config)# ip access-list extended BLOCK_TELNET
Router(config-ext-nacl)# deny tcp any any eq 23
Router(config-ext-nacl)# permit ip any any

# Применение
Router(config)# interface gi0/0
Router(config-if)# ip access-group BLOCK_TELNET in

# Просмотр с номерами строк
Router# show access-lists BLOCK_TELNET
# Extended IP access list BLOCK_TELNET
#     10 deny tcp any any eq telnet
#     20 permit ip any any

# Удаление конкретной строки
Router(config)# ip access-list extended BLOCK_TELNET
Router(config-ext-nacl)# no 10                           # удалить строку 10

# Вставка строки с номером
Router(config-ext-nacl)# 15 permit udp any any eq 53    # вставить между 10 и 20
```

---

## Применение ACL к интерфейсу

| Направление | Описание | Когда использовать |
|---|---|---|
| `in` | Проверяет трафик, **входящий** на интерфейс | Фильтрация входящего трафика |
| `out` | Проверяет трафик, **выходящий** с интерфейса | Фильтрация исходящего |

> **📌 Обратите внимание:** На один интерфейс — **один ACL на направление**: один `in` и один `out`. Нельзя применить два ACL `in` к одному интерфейсу.

---

## IPv6 ACL

```bash
Router(config)# ipv6 access-list BLOCK_HTTP6
Router(config-ipv6-acl)# deny tcp any any eq 80
Router(config-ipv6-acl)# permit ipv6 any any

Router(config)# interface gi0/0
Router(config-if)# ipv6 traffic-filter BLOCK_HTTP6 in

Router# show ipv6 access-list
```

> **💡 Совет:** IPv6 ACL всегда именованные (нет числовых). По умолчанию в конце — `deny ipv6 any any` (как и в IPv4).

---

## Проверка и диагностика

```bash
Router# show access-lists                        # все ACL с счётчиками
Router# show access-lists 100                    # конкретный ACL
Router# show ip access-lists                     # только IPv4
Router# show ipv6 access-list                    # только IPv6
Router# show ip interface gi0/0                  # ACL, применённые к интерфейсу
Router# show running-config | section access-list

# Сброс счётчиков
Router# clear ip access-list counters 100
Router# clear ip access-list counters
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [ACL — networklessons.com](https://networklessons.com/network-fundamentals/introduction-to-access-lists-on-cisco-ios-router) | Standard vs Extended ACL: синтаксис, wildcard, направление |
| [Named ACL — networklessons.com](https://networklessons.com/cisco/ccna-routing-switching-icnd2-200-105/named-access-list) | Named ACL: создание, редактирование, последовательные номера |
| [ACL Troubleshooting — Cisco](https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html) | Cisco guide по диагностике и созданию ACL |
| [Extended ACL — networklessons.com](https://networklessons.com/network-fundamentals/extended-access-list-example-on-cisco-router) | Extended ACL: фильтрация по IP, порту, протоколу |
| [Jeremy's IT Lab — Standard ACL (YouTube)](https://www.youtube.com/watch?v=gvJ10sBbmVA) | Стандартные ACL из серии Free CCNA |
| [Jeremy's IT Lab — Extended ACL (YouTube)](https://www.youtube.com/watch?v=UGCuetJ6Fdo) | Расширенные ACL из серии Free CCNA |
