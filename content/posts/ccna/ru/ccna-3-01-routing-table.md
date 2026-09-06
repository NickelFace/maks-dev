---
title: "CCNA 3.1 Таблица маршрутизации"
date: 2026-08-11
description: "Принципы IP-маршрутизации: Longest Prefix Match, структура таблицы маршрутизации, административное расстояние (AD), метрики протоколов и команды show ip route."
tags: ["CCNA", "Cisco", "маршрутизация", "OSPF", "административное расстояние"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-3-01-routing-table/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Принцип маршрутизации

Маршрутизатор:
1. Получает пакет на входящий интерфейс
2. Смотрит IP-адрес назначения
3. Ищет в таблице маршрутизации наиболее конкретный (longest prefix match) маршрут
4. Пересылает пакет на следующий хоп (next-hop) или выходной интерфейс

> **📌 Обратите внимание:** **Longest Prefix Match** — выбирается маршрут с наибольшим префиксом (наименьшей сетью). /28 предпочтительнее /24, которая предпочтительнее /0.

---

## Структура таблицы маршрутизации

```
Router# show ip route
Codes: C - connected, S - static, R - RIP, D - EIGRP,
       O - OSPF, B - BGP, i - IS-IS, ...

Gateway of last resort is 192.168.1.1 to network 0.0.0.0

O     10.0.0.0/8 [110/2] via 192.168.1.2, 00:01:00, GigabitEthernet0/0
C     192.168.1.0/24 is directly connected, GigabitEthernet0/0
S*    0.0.0.0/0 [1/0] via 203.0.113.1
```

Формат строки маршрута:
```
[код] [сеть/префикс] [AD/метрика] via [next-hop], [время], [интерфейс]
```

| Поле | Описание |
|---|---|
| Код | Источник маршрута (C/S/O/D/R...) |
| Сеть/префикс | Адрес сети назначения |
| AD | Административное расстояние |
| Метрика | Стоимость пути (hop count, cost, bandwidth...) |
| via | Адрес следующего хопа |
| Интерфейс | Выходной интерфейс |

---

## Административное расстояние (AD)

AD — предпочтительность источника маршрутной информации. **Меньше = лучше.**

| Источник маршрута | AD |
|---|:---:|
| Connected (напрямую подключённый) | 0 |
| Static route | 1 |
| EIGRP Summary | 5 |
| BGP (external) | 20 |
| EIGRP (internal) | 90 |
| OSPF | 110 |
| IS-IS | 115 |
| RIP | 120 |
| EIGRP (external) | 170 |
| BGP (internal/iBGP) | 200 |
| Floating static (нестандартный) | > 1 |

> **💡 Совет:** Если одна и та же сеть изучается от OSPF и RIP одновременно — установится маршрут OSPF (AD=110 < 120). Для резервного статического маршрута можно задать `ip route ... 200` (floating static).

---

## Метрики протоколов

| Протокол | Метрика | Описание |
|---|---|---|
| RIP | Hop count | Количество хопов (макс. 15) |
| OSPF | Cost | 10⁸ / bandwidth |
| EIGRP | Composite | Bandwidth + Delay (+ Load, Reliability опционально) |
| BGP | Path attributes | AS-PATH, LOCAL_PREF, MED и др. |

---

## Выбор маршрута

Процесс выбора маршрута:

1. **Longest Prefix Match** — наиболее конкретный маршрут
2. При равной длине префикса — **наименьшее AD**
3. При равном AD — **наименьшая метрика**
4. При равной метрике — **load balancing** (ECMP — Equal-Cost Multi-Path)

### Пример выбора

```
Назначение: 10.1.1.5

Маршруты:
  O  10.0.0.0/8 [110/2]    — длина /8
  S  10.1.0.0/16 [1/0]     — длина /16
  O  10.1.1.0/24 [110/4]   — длина /24  ← ВЫБИРАЕТСЯ (longest match)
```

---

## Команды IOS

```bash
# Просмотр таблицы маршрутизации
Router# show ip route                           # вся таблица
Router# show ip route 10.1.1.0                 # конкретный префикс
Router# show ip route 10.1.1.0 255.255.255.0
Router# show ip route ospf                     # только OSPF-маршруты
Router# show ip route static                   # только статические
Router# show ip route connected                # только connected
Router# show ip route summary                  # сводка

# IPv6 маршрутизация
Router# show ipv6 route
Router# show ipv6 route ospf

# Включить IP-маршрутизацию (L3-коммутатор)
Switch(config)# ip routing
Switch(config)# ipv6 unicast-routing           # для IPv6

# Диагностика
Router# show ip interface brief                # статус интерфейсов
Router# show ip arp                            # ARP-таблица
Router# ping 10.1.1.1 source gi0/0            # ping с конкретного интерфейса
Router# traceroute 10.1.1.1
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [IP Routing — networklessons.com](https://networklessons.com/ip-routing/ip-routing-explained) | Как работает IP routing: таблица, longest prefix match, AD |
| [Administrative Distance — networklessons.com](https://networklessons.com/ip-routing/introduction-to-administrative-distance) | AD для разных протоколов: static, OSPF, EIGRP, RIP |
| [CEF — Cisco Express Forwarding](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipswitch_cef/configuration/xe-16/isw-cef-xe-16-book/isw-cef-overview.html) | Официальная документация по Cisco Express Forwarding |
| [Jeremy's IT Lab — Routing Fundamentals (YouTube)](https://www.youtube.com/watch?v=rSqQk33FSVA) | Таблица маршрутизации, longest match, AD из серии Free CCNA |
| [show ip route — Cisco IOS Command](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/configuration/xe-16/iri-xe-16-book/iri-ip-route-tab.html) | Официальная справка по команде show ip route |
| [Longest Prefix Match — networklessons.com](https://networklessons.com/ip-routing/longest-prefix-match-routing) | Принцип выбора наиболее специфичного маршрута |
