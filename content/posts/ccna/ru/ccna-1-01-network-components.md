---
title: "CCNA 1.1 Сетевые компоненты и роли"
date: 2026-07-01
description: "Обзор сетевых устройств (коммутатор, маршрутизатор, AP, Firewall), моделей OSI и TCP/IP, режимов Cisco IOS CLI и основных команд управления."
tags: ["CCNA", "Cisco", "OSI", "CLI", "сетевые устройства"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-1-01-network-components/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Сетевые устройства

| Устройство | Уровень OSI | Описание |
|---|:---:|---|
| Концентратор (Hub) | L1 | Повторитель сигнала, все порты — одна область коллизий |
| Коммутатор (Switch) | L2 | Фильтрует трафик по MAC-адресам, отдельная область коллизий на порт |
| Маршрутизатор (Router) | L3 | Маршрутизирует пакеты между сетями по IP |
| Точка доступа (AP) | L2 | Беспроводной доступ к проводной сети |
| Межсетевой экран (Firewall) | L3–L7 | Фильтрует трафик по правилам |
| IDS/IPS | L3–L7 | Обнаруживает/предотвращает вторжения |

### Роли в сети

| Роль | Описание |
|---|---|
| Клиент (Client) | Инициирует запросы к серверу |
| Сервер (Server) | Обрабатывает запросы клиентов |
| Peer | Одновременно клиент и сервер (P2P) |

> **💡 Совет:** На экзамене CCNA маршрутизатор разделяет широковещательные домены; коммутатор разделяет домены коллизий, но не широковещательные (если не настроены VLAN).

---

## Модель OSI

| # | Уровень | PDU | Устройства | Примеры протоколов |
|:---:|---|---|---|---|
| 7 | Application | Данные | — | HTTP, HTTPS, FTP, DNS, DHCP, SMTP |
| 6 | Presentation | Данные | — | SSL/TLS, JPEG, ASCII |
| 5 | Session | Данные | — | NetBIOS, RPC, SQL |
| 4 | Transport | Сегмент | — | TCP, UDP |
| 3 | Network | Пакет | Маршрутизатор, L3-коммутатор | IPv4, IPv6, ICMP, OSPF |
| 2 | Data Link | Фрейм | Коммутатор, мост | Ethernet, 802.11, PPP, ARP |
| 1 | Physical | Биты | Концентратор, повторитель | Кабели, сигналы |

> **📌 Обратите внимание:** Инкапсуляция данных: на отправителе данные движутся сверху вниз (7→1), добавляются заголовки. На получателе — снизу вверх (1→7), заголовки снимаются (декапсуляция).

---

## Модель TCP/IP

| Уровень TCP/IP | Уровни OSI | Протоколы |
|---|---|---|
| Application | 5, 6, 7 | HTTP, DNS, DHCP, FTP, SMTP, Telnet, SSH |
| Transport | 4 | TCP, UDP |
| Internet | 3 | IPv4, IPv6, ICMP, ARP |
| Network Access | 1, 2 | Ethernet, Wi-Fi, PPP |

---

## Режимы CLI Cisco IOS

| Режим | Приглашение | Вход | Выход |
|---|---|---|---|
| User EXEC | `Router>` | подключение | `exit` / `logout` |
| Privileged EXEC | `Router#` | `enable` | `disable` |
| Global Config | `Router(config)#` | `configure terminal` | `exit` / `end` |
| Interface Config | `Router(config-if)#` | `interface <тип> <номер>` | `exit` |
| Line Config | `Router(config-line)#` | `line console 0` / `line vty 0 15` | `exit` |

> **⚠️ Важно:** Команды `end` и `Ctrl+Z` сразу возвращают в Privileged EXEC из любого режима конфигурации. `exit` выходит на один уровень вверх.

---

## Основные команды CLI

```bash
# Переход между режимами
Router> enable
Router# configure terminal
Router(config)# interface gigabitethernet 0/0
Router(config-if)# exit
Router(config)# end
Router#

# Справка
Router# ?                       # все команды текущего режима
Router# show ?                  # все варианты show
Router# show ver?               # команды, начинающиеся с "ver"

# Горячие клавиши
Ctrl+A      # начало строки
Ctrl+E      # конец строки
Ctrl+Z      # → Privileged EXEC
Ctrl+C      # прервать процесс
Tab         # дополнить команду
↑ / Ctrl+P  # предыдущая команда
↓ / Ctrl+N  # следующая команда

# Просмотр конфигурации
Router# show version            # IOS, модель, время работы
Router# show running-config     # текущая конфигурация (DRAM)
Router# show startup-config     # сохранённая конфигурация (NVRAM)
Router# show history            # история команд

# Сохранение / сброс
Router# copy running-config startup-config   # сохранить
Router# write                                # то же (сокращение)
Router# erase startup-config                 # очистить NVRAM
Router# reload                              # перезагрузить

# Фильтрация вывода
Router# show running-config | include hostname
Router# show running-config | section interface
Router# show running-config | begin line
Router# show running-config | exclude !
```

> **💡 Совет:** Сокращения работают, если они однозначны: `en` = `enable`, `conf t` = `configure terminal`, `sh run` = `show running-config`.

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [Cisco IOS CLI Reference](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/configuration/xe-16/fundamentals-xe-16-book.html) | Официальная документация по CLI Cisco IOS |
| [Network Devices — networklessons.com](https://networklessons.com/cisco/ccna-routing-switching-icnd1-100-105/network-devices) | Подробный разбор сетевых устройств: router, switch, hub, firewall |
| [OSI Model — networklessons.com](https://networklessons.com/network-fundamentals/introduction-to-the-osi-model) | Объяснение модели OSI по уровням |
| [Jeremy's IT Lab — Network Devices (YouTube)](https://www.youtube.com/watch?v=H8W9oMZGWdA) | CCNA: сетевые компоненты, роли устройств — серия Free CCNA |
| [Cisco IOS CLI Modes — Cisco Learning Network](https://learningnetwork.cisco.com) | Режимы CLI: User EXEC, Privileged EXEC, Global Config |
| [IDS vs IPS — Cisco](https://www.cisco.com/c/en/us/products/security/intrusion-prevention-system-ips/index.html) | Объяснение разницы между IDS и IPS от Cisco |
