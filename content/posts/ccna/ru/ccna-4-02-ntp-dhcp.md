---
title: "CCNA 4.2 NTP и DHCP"
date: 2026-08-26
description: "Настройка DHCP-сервера на Cisco IOS, relay agent (ip helper-address), NTP stratum, синхронизация времени и аутентификация NTP."
tags: ["CCNA", "Cisco", "NTP", "DHCP", "IP-сервисы"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-4-02-ntp-dhcp/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## DHCP

### Принцип работы DHCP (DORA)

```
Клиент                          DHCP-сервер
  │──── DISCOVER (broadcast) ──►│  Клиент ищет сервер
  │◄─── OFFER ─────────────────│  Сервер предлагает IP
  │──── REQUEST (broadcast) ───►│  Клиент запрашивает предложенный IP
  │◄─── ACK ───────────────────│  Сервер подтверждает аренду
```

### Настройка DHCP-сервера на Cisco IOS

```bash
# Исключить адреса из пула (шлюзы, серверы, принтеры)
Router(config)# ip dhcp excluded-address 192.168.1.1 192.168.1.20

# Создать пул
Router(config)# ip dhcp pool LAN_POOL
Router(dhcp-config)# network 192.168.1.0 255.255.255.0
Router(dhcp-config)# default-router 192.168.1.1          # шлюз
Router(dhcp-config)# dns-server 8.8.8.8 8.8.4.4
Router(dhcp-config)# domain-name company.local
Router(dhcp-config)# lease 7                             # срок аренды: 7 дней
Router(dhcp-config)# lease 0 12                          # 0 дней 12 часов
Router(dhcp-config)# lease infinite                      # бессрочно

# Отключить DHCP
Router(config)# no service dhcp                          # отключить сервер
Router(config)# service dhcp                             # включить (по умолч.)
```

### DHCP для Cisco IP Phone

```bash
Router(dhcp-config)# option 150 ip 192.168.1.50          # TFTP-сервер для телефонов
```

### DHCP Relay Agent (Helper Address)

Когда DHCP-сервер в другой подсети — маршрутизатор пересылает DHCP broadcast:

```bash
Router(config)# interface gigabitethernet 0/0            # интерфейс к клиентам
Router(config-if)# ip helper-address 10.0.0.100          # IP DHCP-сервера
```

> **💡 Совет:** `ip helper-address` пересылает несколько UDP-широковещаний: DHCP (67/68), DNS (53), TFTP (69), NTP (37), NetBIOS (137/138). Только для DHCP: стандартный use case.

### DHCP-клиент на Cisco IOS

```bash
Router(config)# interface gigabitethernet 0/1
Router(config-if)# ip address dhcp                       # получить IP от DHCP

Switch(config)# ip default-gateway 192.168.1.1           # шлюз для коммутатора
```

### Проверка DHCP

```bash
Router# show ip dhcp pool                    # пулы и статистика
Router# show ip dhcp binding                 # выданные адреса (MAC → IP)
Router# show ip dhcp conflict               # конфликты адресов
Router# show ip dhcp server statistics      # статистика сервера
Router# debug ip dhcp server events         # отладка
```

---

## NTP

### Принцип работы NTP

- NTP (Network Time Protocol) синхронизирует время между устройствами
- **Stratum** — уровень точности: Stratum 0 = атомные часы, Stratum 1 = сервер напрямую, Stratum 2–15 = клиенты
- UDP порт 123

| Stratum | Описание |
|---|---|
| 0 | Эталонные часы (GPS, атомные) — не в сети |
| 1 | NTP-сервер, синхронизованный с Stratum 0 |
| 2 | Клиент Stratum 1 |
| 3–15 | Последовательные клиенты |

> **📌 Обратите внимание:** Синхронизация времени критична для: логов и отладки (временные метки), SSL/TLS-сертификатов, OSPF/BGP (аутентификация), Kerberos, NTP аутентификации.

### Настройка NTP

```bash
# Клиент NTP (синхронизироваться с сервером)
Router(config)# ntp server 216.239.35.0                  # Google NTP
Router(config)# ntp server 216.239.35.4 prefer           # предпочтительный
Router(config)# ntp server 192.168.1.100 version 2       # локальный сервер

# NTP-мастер (маршрутизатор сам является источником)
Router(config)# ntp master 3                             # stratum 3

# NTP-аутентификация
Router(config)# ntp authenticate
Router(config)# ntp authentication-key 1 md5 cisco123
Router(config)# ntp trusted-key 1
Router(config)# ntp server 192.168.1.100 key 1

# Установить время вручную
Router# clock set 14:30:00 05 May 2026

# Часовой пояс
Router(config)# clock timezone MSK 3                     # UTC+3
Router(config)# clock summer-time MSK recurring          # летнее время

# NTP для источника пакетов (интерфейс)
Router(config)# ntp source loopback 0
```

### Проверка NTP

```bash
Router# show ntp status                  # статус синхронизации
Router# show ntp associations            # список серверов/пиров
Router# show ntp associations detail     # подробно
Router# show clock                       # текущее время
Router# show clock detail                # с источником времени
```

Пример `show ntp status`:
```
Clock is synchronized, stratum 4, reference is 192.168.1.100
...
```
Ключевое слово: `synchronized` = норма; `unsynchronized` = проблема.

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [RFC 5905 — NTPv4](https://www.rfc-editor.org/rfc/rfc5905) | Network Time Protocol Version 4: спецификация stratum, синхронизация |
| [RFC 2131 — DHCP](https://www.rfc-editor.org/rfc/rfc2131) | Dynamic Host Configuration Protocol: DORA-процесс |
| [NTP — networklessons.com](https://networklessons.com/system-management/cisco-network-time-protocol-ntp) | NTP: stratum, master, клиент, аутентификация NTP |
| [DHCP — networklessons.com](https://networklessons.com/ip-services/introduction-to-dhcp) | DHCP: pool, lease, ip helper-address, relay agent |
| [Jeremy's IT Lab — NTP (YouTube)](https://www.youtube.com/watch?v=cNRVYoZ6PPYQ) | NTP stratum, настройка Cisco IOS NTP из серии Free CCNA |
| [Cisco DHCP Configuration Guide](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/xe-16/dhcp-xe-16-book/config-dhcp-server.html) | Официальная документация по DHCP server, relay, pool |
