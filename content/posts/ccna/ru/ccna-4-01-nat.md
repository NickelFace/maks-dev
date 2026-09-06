---
title: "CCNA 4.1 NAT"
date: 2026-08-23
description: "Network Address Translation на базе Static NAT, Dynamic NAT и PAT (Overload): терминология Inside/Outside, настройка на Cisco IOS, проверка и диагностика трансляций."
tags: ["CCNA", "Cisco", "NAT", "PAT", "IP-сервисы"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-4-01-nat/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Типы NAT

| Тип | Соотношение | Описание |
|---|---|---|
| Static NAT | 1:1 (постоянное) | Один приватный IP ↔ один публичный IP |
| Dynamic NAT | 1:1 (из пула) | Приватный IP → свободный из пула публичных |
| PAT (Overload) | N:1 | Много приватных → один публичный (разные порты) |

---

## Терминология NAT

| Термин | Описание |
|---|---|
| Inside Local | Приватный IP хоста внутри сети |
| Inside Global | Публичный IP хоста (после NAT) |
| Outside Local | IP внешнего хоста, видимый изнутри |
| Outside Global | Реальный IP внешнего хоста |
| Inside interface | Интерфейс, смотрящий во внутреннюю сеть |
| Outside interface | Интерфейс, смотрящий в интернет/внешнюю сеть |

> **💡 Совет:** На экзамене: **Inside Local** = приватный IP хоста (что видит маршрутизатор со стороны LAN). **Inside Global** = публичный IP (что видит интернет). Обычно это Inside Local и Inside Global — что меняет NAT.

---

## Static NAT

Постоянное соответствие одного приватного адреса одному публичному.

```bash
# Настройка Static NAT
Router(config)# ip nat inside source static 192.168.1.10 203.0.113.10

# Обозначить интерфейсы
Router(config)# interface gigabitethernet 0/0          # LAN
Router(config-if)# ip nat inside

Router(config)# interface gigabitethernet 0/1          # WAN
Router(config-if)# ip nat outside

# Static NAT для порта (Port Forwarding)
Router(config)# ip nat inside source static tcp 192.168.1.10 80 203.0.113.1 80
```

---

## Dynamic NAT

Приватный IP → свободный адрес из пула публичных.

```bash
# 1. Создать пул публичных адресов
Router(config)# ip nat pool PUBLIC_POOL 203.0.113.10 203.0.113.20 netmask 255.255.255.0

# 2. Создать ACL с внутренними хостами
Router(config)# access-list 1 permit 192.168.1.0 0.0.0.255

# 3. Связать ACL с пулом
Router(config)# ip nat inside source list 1 pool PUBLIC_POOL

# 4. Интерфейсы
Router(config)# interface gi0/0
Router(config-if)# ip nat inside
Router(config)# interface gi0/1
Router(config-if)# ip nat outside
```

> **⚠️ Важно:** Dynamic NAT: если все адреса пула заняты — новые соединения отбрасываются. Используйте PAT для экономии адресов.

---

## PAT (NAT Overload)

Все внутренние хосты транслируются через один публичный IP, различаемые по номеру порта.

```bash
# Вариант 1: использовать адрес outside-интерфейса
Router(config)# access-list 1 permit 192.168.1.0 0.0.0.255
Router(config)# ip nat inside source list 1 interface gigabitethernet 0/1 overload

# Вариант 2: использовать пул + overload
Router(config)# ip nat pool PUBLIC 203.0.113.1 203.0.113.1 netmask 255.255.255.0
Router(config)# ip nat inside source list 1 pool PUBLIC overload

# Интерфейсы
Router(config)# interface gi0/0
Router(config-if)# ip nat inside
Router(config)# interface gi0/1
Router(config-if)# ip nat outside
```

---

## Проверка и диагностика

```bash
# Таблица трансляций
Router# show ip nat translations                  # все записи
Router# show ip nat translations verbose          # подробно
Router# show ip nat translations tcp             # только TCP

# Статистика
Router# show ip nat statistics

# Очистить таблицу (при диагностике)
Router# clear ip nat translation *               # все динамические
Router# clear ip nat translation inside 192.168.1.10 outside 203.0.113.10

# Отладка (осторожно!)
Router# debug ip nat                             # все NAT-события
Router# debug ip nat detailed
# Выключить: undebug all
```

Пример вывода `show ip nat translations`:
```
Pro Inside global      Inside local       Outside local      Outside global
tcp 203.0.113.1:1025  192.168.1.10:1025  8.8.8.8:53        8.8.8.8:53
--- 203.0.113.10      192.168.1.10       ---                ---
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [RFC 3022 — NAT](https://www.rfc-editor.org/rfc/rfc3022) | Traditional IP Network Address Translator |
| [NAT — networklessons.com](https://networklessons.com/ip-services/introduction-to-nat-and-pat) | Static NAT, Dynamic NAT, PAT: принципы и настройка |
| [PAT (NAT Overload) — networklessons.com](https://networklessons.com/ip-services/how-to-configure-pat-on-cisco-ios-router) | Port Address Translation: как множество хостов используют один IP |
| [NAT Troubleshooting — Cisco](https://www.cisco.com/c/en/us/support/docs/ip/network-address-translation-nat/8605-13.html) | Диагностика NAT: debug ip nat, show ip nat translations |
| [Jeremy's IT Lab — NAT (YouTube)](https://www.youtube.com/watch?v=nLbB0fYQdYY) | Static NAT, Dynamic NAT, PAT из серии Free CCNA |
| [Cisco NAT Configuration Guide](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nat/configuration/xe-16/nat-xe-16-book/iadnat-addr-consv.html) | Официальное руководство Cisco по настройке NAT |
