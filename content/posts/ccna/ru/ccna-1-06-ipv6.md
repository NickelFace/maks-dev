---
title: "CCNA 1.6 IPv6 адресация"
date: 2026-07-16
description: "Структура и типы IPv6-адресов, правила сокращения, SLAAC, EUI-64, DHCPv6 и команды Cisco IOS для настройки и диагностики IPv6."
tags: ["CCNA", "Cisco", "IPv6", "SLAAC", "NDP"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-1-06-ipv6/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Зачем IPv6

- IPv4: ~4,3 млрд адресов (2³²) — исчерпаны
- IPv6: 340 ундециллионов адресов (2¹²⁸)
- Нет необходимости в NAT
- Встроенная безопасность (IPsec)
- Автоконфигурация (SLAAC)

---

## Структура IPv6-адреса

128 бит, записываются в виде 8 групп по 4 шестнадцатеричных символа, разделённых двоеточиями:

```
2001:0DB8:0000:0001:0000:0000:0000:0001
```

Стандартная длина префикса: **/64** (64 бита — сеть, 64 бита — интерфейс)

---

## Правила сокращения

**Правило 1:** убрать ведущие нули в каждой группе:
```
2001:0DB8:0000:0001  →  2001:DB8:0:1
```

**Правило 2:** одна непрерывная группа нулей заменяется `::` (только один раз):
```
2001:DB8:0:0:0:0:0:1  →  2001:DB8::1
```

**Оба правила вместе:**
```
2001:0DB8:0000:0000:0000:0000:0000:0001  →  2001:DB8::1
```

> **⚠️ Важно:** `::` можно использовать только **один раз** в адресе. Два `::` в одном адресе создадут неоднозначность.

---

## Типы IPv6-адресов

| Тип | Префикс | Описание |
|---|---|---|
| Global Unicast | 2000::/3 | Публичные маршрутизируемые адреса (аналог публичных IPv4) |
| Unique Local | FC00::/7 | Приватные (аналог RFC 1918, обычно FD00::/8) |
| Link-Local | FE80::/10 | Только в пределах одного сегмента, не маршрутизируются |
| Loopback | ::1/128 | Петля обратной связи (аналог 127.0.0.1) |
| Unspecified | ::/128 | Источник «любой» (аналог 0.0.0.0) |
| Multicast | FF00::/8 | Групповая рассылка |
| Anycast | — | Один адрес, несколько интерфейсов; пакет идёт к ближайшему |

### Важные Multicast-адреса

| Адрес | Группа |
|---|---|
| FF02::1 | Все узлы в сегменте |
| FF02::2 | Все маршрутизаторы в сегменте |
| FF02::5 | Все OSPF-маршрутизаторы |
| FF02::6 | OSPF DR/BDR |
| FF02::9 | Все RIP-маршрутизаторы |

---

## Специальные адреса

| Адрес | Назначение |
|---|---|
| ::1/128 | Loopback |
| ::/128 | Unspecified (источник до получения адреса) |
| FE80::/10 | Link-local (обязателен на каждом IPv6-интерфейсе) |
| FF02::1 | All-nodes multicast |

---

## Назначение адресов

### SLAAC (Stateless Address Autoconfiguration)

1. Устройство генерирует Link-Local адрес: **FE80::** + EUI-64
2. Отправляет RS (Router Solicitation) на FF02::2
3. Маршрутизатор отвечает RA (Router Advertisement) с префиксом сети
4. Устройство создаёт Global Unicast = префикс + EUI-64

### EUI-64 (Interface ID из MAC-адреса)

```
MAC: AA:BB:CC:DD:EE:FF
↓ Вставить FF:FE в середину
AA:BB:CC:FF:FE:DD:EE:FF
↓ Инвертировать 7-й бит первого байта (AA → A8 или 02→00)
A8:BB:CC:FF:FE:DD:EE:FF
```

### DHCPv6

- **Stateful DHCPv6** — сервер выдаёт адрес и параметры (аналог DHCPv4)
- **Stateless DHCPv6** — SLAAC выдаёт адрес, DHCPv6 только DNS и другие параметры

---

## Команды IOS

```bash
# Включить IPv6 маршрутизацию
Router(config)# ipv6 unicast-routing

# Назначить адрес на интерфейс
Router(config)# interface gigabitethernet 0/0
Router(config-if)# ipv6 address 2001:DB8:1:1::1/64
Router(config-if)# ipv6 address FE80::1 link-local    # явный link-local
Router(config-if)# ipv6 enable                         # только link-local (SLAAC)
Router(config-if)# no shutdown

# SLAAC на клиентском интерфейсе
Router(config-if)# ipv6 address autoconfig

# Статический маршрут IPv6
Router(config)# ipv6 route ::/0 2001:DB8:1:1::2        # default

# Проверка
Router# show ipv6 interface brief
Router# show ipv6 interface gigabitethernet 0/0
Router# show ipv6 route
Router# show ipv6 neighbors                             # аналог ARP-таблицы

# Диагностика
Router# ping ipv6 2001:DB8::1
Router# traceroute ipv6 2001:DB8::1
```

> **💡 Совет:** IPv6 не использует ARP. Вместо него — **NDP (Neighbor Discovery Protocol)** на базе ICMPv6. Команды: NS (Neighbor Solicitation), NA (Neighbor Advertisement), RS, RA.

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [RFC 4291 — IPv6 Addressing Architecture](https://www.rfc-editor.org/rfc/rfc4291) | Спецификация типов IPv6-адресов: unicast, multicast, anycast |
| [RFC 4861 — NDP (Neighbor Discovery Protocol)](https://www.rfc-editor.org/rfc/rfc4861) | Протокол обнаружения соседей NDP, замена ARP в IPv6 |
| [IPv6 Address Types — networklessons.com](https://networklessons.com/ipv6/ipv6-address-types) | Global unicast, link-local, loopback, multicast, anycast |
| [EUI-64 — networklessons.com](https://networklessons.com/ipv6/ipv6-eui-64-explained) | Как EUI-64 формирует Interface ID из MAC-адреса |
| [Jeremy's IT Lab — IPv6 Addressing (YouTube)](https://www.youtube.com/watch?v=mJPO9W0tq_Q) | IPv6 типы адресов, EUI-64, NDP из серии Free CCNA |
| [IPv6 Transition Mechanisms — Cisco](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/xe-3s/ipv6-xe-3s-book/ip6-tunnel.html) | Dual-stack, tunneling (6to4, ISATAP), NAT64 |
