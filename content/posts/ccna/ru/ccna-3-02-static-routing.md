---
title: "CCNA 3.2 Статическая маршрутизация"
date: 2026-08-13
description: "Настройка статических маршрутов на Cisco IOS: синтаксис ip route, маршрут по умолчанию, floating static routes, IPv6-маршруты и примеры конфигурации топологий."
tags: ["CCNA", "Cisco", "статическая маршрутизация", "ip route", "IPv6"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-3-02-static-routing/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Типы статических маршрутов

| Тип | Описание | Применение |
|---|---|---|
| Standard static | Конкретная сеть назначения | Конкретный маршрут |
| Default static | 0.0.0.0/0 — любое назначение | Шлюз последней инстанции |
| Summary static | Суммирует несколько сетей | Уменьшение таблицы |
| Floating static | Резервный маршрут с высоким AD | Failover |

---

## Синтаксис команды ip route

```bash
Router(config)# ip route [сеть] [маска] {next-hop | exit-interface} [AD] [permanent]
```

### Варианты задания маршрута

**1. Next-hop (следующий хоп) — рекомендуется для Ethernet:**
```bash
Router(config)# ip route 10.0.0.0 255.255.0.0 192.168.1.2
```

**2. Exit-interface (выходной интерфейс) — для point-to-point (серийные):**
```bash
Router(config)# ip route 10.0.0.0 255.255.0.0 serial 0/0/0
```

**3. Fully specified (оба) — рекомендуется для Ethernet во избежание proxy ARP:**
```bash
Router(config)# ip route 10.0.0.0 255.255.0.0 gigabitethernet 0/0 192.168.1.2
```

> **📌 Обратите внимание:** На Ethernet-интерфейсах **не рекомендуется** использовать только exit-interface без next-hop — это создаёт рекурсивный поиск и proxy ARP. Используйте fully-specified или next-hop.

### Ключевое слово permanent

```bash
Router(config)# ip route 10.0.0.0 255.0.0.0 192.168.1.2 permanent
```
Маршрут остаётся в таблице даже если интерфейс next-hop опустился.

---

## Маршрут по умолчанию

```bash
# IPv4 default route
Router(config)# ip route 0.0.0.0 0.0.0.0 203.0.113.1           # next-hop
Router(config)# ip route 0.0.0.0 0.0.0.0 gigabitethernet 0/1   # exit-int

# Проверка
Router# show ip route
# S*   0.0.0.0/0 [1/0] via 203.0.113.1
# Звёздочка * = маршрут-кандидат на gateway of last resort
```

> **💡 Совет:** Маршрут по умолчанию используется, когда нет более конкретного совпадения в таблице маршрутизации. `S*` — default static route (кандидат на gateway of last resort).

---

## Floating Static Routes (резервные маршруты)

Статический маршрут с AD выше, чем у основного протокола — устанавливается только при исчезновении основного маршрута.

```bash
# Основной маршрут через OSPF (AD=110) будет предпочтительным
# Резервный статический (AD=200) активируется при отказе OSPF

Router(config)# ip route 10.0.0.0 255.255.0.0 192.168.2.1 200
# 200 = AD выше OSPF (110), маршрут не появится в таблице пока есть OSPF
```

| Основной протокол | AD основного | AD floating static |
|---|:---:|:---:|
| EIGRP | 90 | ≥ 91 |
| OSPF | 110 | ≥ 111 |
| RIP | 120 | ≥ 121 |

---

## IPv6 статические маршруты

```bash
# Включить IPv6 маршрутизацию
Router(config)# ipv6 unicast-routing

# IPv6 static (next-hop)
Router(config)# ipv6 route 2001:DB8:2::/64 2001:DB8:1::2

# IPv6 static (exit-interface)
Router(config)# ipv6 route 2001:DB8:2::/64 gigabitethernet 0/0

# IPv6 default
Router(config)# ipv6 route ::/0 2001:DB8:1::1

# IPv6 floating static
Router(config)# ipv6 route 2001:DB8:2::/64 2001:DB8:3::2 200

# Проверка
Router# show ipv6 route
Router# show ipv6 route static
```

---

## Команды и диагностика

```bash
# Просмотр
Router# show ip route static
Router# show ip route 0.0.0.0                  # маршрут по умолчанию

# Удаление маршрута
Router(config)# no ip route 10.0.0.0 255.255.0.0 192.168.1.2

# Трассировка
Router# traceroute 10.0.0.1
Router# traceroute 10.0.0.1 source loopback0

# Расширенный ping
Router# ping 10.0.0.1 source 192.168.1.1 repeat 100

# Отладка
Router# debug ip routing                        # изменения в таблице
# (выключить: no debug ip routing / undebug all)
```

---

## Пример конфигурации

```
Топология: R1 —— R2 —— R3
           gi0/0    gi0/0  gi0/1   gi0/1
     .1         .2  .1         .2   .1
192.168.1.0/30    10.0.0.0/30    172.16.0.0/24
```

```bash
# R1 — маршрут до сети 172.16.0.0 через R2
R1(config)# ip route 172.16.0.0 255.255.0.0 192.168.1.2
R1(config)# ip route 10.0.0.0 255.255.255.252 192.168.1.2  # транзит R2-R3

# R3 — маршрут обратно через R2
R3(config)# ip route 192.168.1.0 255.255.255.0 10.0.0.1

# R2 — маршрут для обоих концов (или default)
R2(config)# ip route 0.0.0.0 0.0.0.0 10.0.0.2   # к R3
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [Static Routing — networklessons.com](https://networklessons.com/ip-routing/how-to-configure-static-route-on-cisco-ios-router) | Статические маршруты: next-hop, exit interface, рекурсивный lookup |
| [Default Route — networklessons.com](https://networklessons.com/cisco/ccna-routing-switching-icnd1-100-105/default-route) | Маршрут по умолчанию 0.0.0.0/0: настройка и применение |
| [Floating Static Routes — networklessons.com](https://networklessons.com/ip-routing/floating-static-route) | Плавающие статические маршруты как backup-путь |
| [IPv6 Static Routes — networklessons.com](https://networklessons.com/ipv6/how-to-configure-ipv6-static-route) | Статические маршруты для IPv6 на Cisco IOS |
| [Jeremy's IT Lab — Static Routing (YouTube)](https://www.youtube.com/watch?v=3qKNNJvXGek) | Статическая маршрутизация из серии Free CCNA |
| [Cisco Static Route Configuration](https://www.cisco.com/c/en/us/support/docs/ip/ip-routing/116217-technote-ios-static-route.html) | Официальная документация Cisco по статическим маршрутам |
