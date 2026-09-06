---
title: "CCNA 2.3 EtherChannel"
date: 2026-08-03
description: "Агрегация каналов EtherChannel: протоколы LACP и PAgP, таблица совместимости режимов, настройка Layer 2/3 EtherChannel и алгоритмы балансировки нагрузки."
tags: ["CCNA", "Cisco", "EtherChannel", "LACP", "PAgP"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-2-03-etherchannel/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Что такое EtherChannel

**EtherChannel** (Port-Channel) — агрегация нескольких физических портов коммутатора в один логический канал. Обеспечивает:

- **Увеличение пропускной способности** (2, 4 или 8 линков)
- **Отказоустойчивость** (при отказе одного линка трафик переходит на остальные)
- **STP видит один порт** — не блокирует параллельные линки

Поддерживается: от 2 до 8 физических интерфейсов в группе.

---

## Протоколы согласования

| Протокол | Стандарт | Режимы | Описание |
|---|---|---|---|
| LACP | IEEE 802.3ad | `active` / `passive` | Открытый; active инициирует, passive ждёт |
| PAgP | Cisco | `desirable` / `auto` | Cisco; desirable инициирует, auto ждёт |
| Статический | — | `on` | Без согласования (оба конца должны быть `on`) |

### Совместимость режимов

| Сторона A | Сторона B | Результат |
|---|---|---|
| active | active | EtherChannel (LACP) |
| active | passive | EtherChannel (LACP) |
| passive | passive | **Нет** EtherChannel |
| desirable | desirable | EtherChannel (PAgP) |
| desirable | auto | EtherChannel (PAgP) |
| auto | auto | **Нет** EtherChannel |
| on | on | EtherChannel (статический) |
| on | active/passive | **Нет** EtherChannel |

> **📌 Обратите внимание:** Режим `on` (статический) не обменивается LACP/PAgP пакетами. Оба конца должны быть `on`. При несоответствии — потеря трафика без предупреждения. Используйте LACP там, где возможно.

---

## Требования для EtherChannel

Все интерфейсы в группе должны иметь **одинаковые** параметры:

- Скорость и дуплекс
- Тип порта (access или trunk)
- VLAN (для access: один и тот же VLAN; для trunk: native VLAN, allowed VLANs)
- MTU

> **⚠️ Важно:** Несоответствие параметров приведёт к ошибке или нестабильной работе EtherChannel. Всегда проверяйте `show etherchannel summary`.

---

## Настройка EtherChannel

### Layer 2 EtherChannel (LACP)

```bash
# Коммутатор 1
Switch1(config)# interface range gigabitethernet 0/1-2
Switch1(config-if-range)# switchport mode trunk
Switch1(config-if-range)# switchport trunk native vlan 99
Switch1(config-if-range)# switchport trunk allowed vlan 10,20,30
Switch1(config-if-range)# channel-group 1 mode active
Switch1(config-if-range)# exit

# Интерфейс port-channel автоматически создаётся
Switch1(config)# interface port-channel 1
Switch1(config-if)# switchport mode trunk
Switch1(config-if)# switchport trunk native vlan 99
Switch1(config-if)# switchport trunk allowed vlan 10,20,30

# Коммутатор 2
Switch2(config)# interface range gigabitethernet 0/1-2
Switch2(config-if-range)# switchport mode trunk
Switch2(config-if-range)# channel-group 1 mode passive     # или active
Switch2(config-if-range)# exit
```

### Layer 3 EtherChannel

```bash
Switch(config)# interface range gigabitethernet 0/1-2
Switch(config-if-range)# no switchport
Switch(config-if-range)# channel-group 1 mode active
Switch(config-if-range)# exit

Switch(config)# interface port-channel 1
Switch(config-if)# no switchport
Switch(config-if)# ip address 10.0.0.1 255.255.255.252
```

### PAgP

```bash
Switch(config)# interface range gigabitethernet 0/1-2
Switch(config-if-range)# channel-group 1 mode desirable   # или auto
```

### Статический (без протокола)

```bash
Switch(config)# interface range gigabitethernet 0/1-2
Switch(config-if-range)# channel-group 1 mode on
```

---

## Балансировка нагрузки

EtherChannel распределяет трафик по физическим линкам на основе алгоритма хэширования:

```bash
Switch(config)# port-channel load-balance src-dst-mac     # по MAC-адресам (по умолчанию)
Switch(config)# port-channel load-balance src-dst-ip      # по IP
Switch(config)# port-channel load-balance src-mac
Switch(config)# port-channel load-balance dst-mac

Switch# show etherchannel load-balance    # текущий метод
```

| Метод | Описание |
|---|---|
| src-mac | Исходный MAC |
| dst-mac | Целевой MAC |
| src-dst-mac | XOR обоих MAC (по умолчанию) |
| src-ip | Исходный IP |
| dst-ip | Целевой IP |
| src-dst-ip | XOR обоих IP |

---

## Проверка и диагностика

```bash
Switch# show etherchannel summary          # обзор всех EtherChannel
Switch# show etherchannel detail           # подробно
Switch# show etherchannel 1 summary        # группа 1
Switch# show etherchannel 1 port-channel   # интерфейс port-channel
Switch# show interfaces port-channel 1     # статус агрегированного интерфейса
Switch# show lacp neighbor                 # LACP-партнёры
Switch# show lacp internal                 # локальные LACP-параметры
Switch# show pagp neighbor                 # PAgP-партнёры
Switch# show pagp internal

# Флаги в show etherchannel summary:
# P = в port-channel
# D = down
# S = Layer 2 / R = Layer 3
# U = в использовании
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [IEEE 802.3ad — LACP Standard](https://standards.ieee.org/ieee/802.3ad/1042/) | Стандарт Link Aggregation Control Protocol (LACP) |
| [EtherChannel — networklessons.com](https://networklessons.com/switching/etherchannel-cisco-ios-catalyst-switch) | Полный разбор EtherChannel: LACP, PAgP, статический режим |
| [LACP vs PAgP — networklessons.com](https://networklessons.com/cisco/ccna-routing-switching-icnd2-200-105/lacp-and-pagp) | Сравнение протоколов: режимы active/passive, desirable/auto |
| [EtherChannel Load Balancing — Cisco](https://www.cisco.com/c/en/us/support/docs/lan-switching/etherchannel/12023-4.html) | Алгоритмы балансировки нагрузки в EtherChannel |
| [Jeremy's IT Lab — EtherChannel (YouTube)](https://www.youtube.com/watch?v=sMSKFPjSLZE) | EtherChannel: LACP, PAgP, настройка и диагностика |
| [EtherChannel Configuration Guide — Cisco Catalyst](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-3/configuration_guide/lyr2/b_173_lyr2_9300_cg/configuring_etherchannel.html) | Официальное руководство по настройке EtherChannel |
