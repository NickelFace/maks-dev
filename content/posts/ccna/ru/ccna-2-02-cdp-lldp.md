---
title: "CCNA 2.2 CDP и LLDP"
date: 2026-08-01
description: "Сравнение Cisco Discovery Protocol и Link Layer Discovery Protocol (802.1AB): принципы работы, таймеры, собираемая информация и команды настройки."
tags: ["CCNA", "Cisco", "CDP", "LLDP", "обнаружение соседей"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-2-02-cdp-lldp/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## CDP — Cisco Discovery Protocol

**CDP** — проприетарный протокол Cisco уровня 2, позволяющий соседним устройствам Cisco обнаруживать друг друга и обмениваться информацией об устройствах.

- Работает на уровне Data Link (L2)
- Не зависит от сетевого уровня (работает без IP)
- По умолчанию **включён** на всех Cisco-устройствах
- Использует multicast: `01:00:0C:CC:CC:CC`
- Интервал отправки: 60 сек; таймер удержания: 180 сек

**Собираемая информация:**
- Hostname, Device ID
- IOS version, Platform (модель)
- IP-адреса интерфейсов
- Тип интерфейса (порт)
- Возможности устройства (Router, Switch, Bridge)
- Duplex

---

## LLDP — Link Layer Discovery Protocol

**LLDP** (IEEE 802.1AB) — открытый стандарт, аналог CDP. Работает между устройствами разных производителей.

- По умолчанию **отключён** на Cisco-устройствах (нужно включить вручную)
- Интервал отправки: 30 сек; таймер удержания: 120 сек
- Поддерживает LLDP-MED (Media Endpoint Discovery) для VoIP

---

## Сравнение CDP и LLDP

| Характеристика | CDP | LLDP |
|---|---|---|
| Стандарт | Cisco | IEEE 802.1AB |
| По умолчанию | Включён | Отключён |
| Устройства | Только Cisco | Любые |
| Уровень | L2 | L2 |
| Таймер отправки | 60 сек | 30 сек |
| Таймер удержания | 180 сек | 120 сек |
| Поддержка VoIP | Ограниченная | LLDP-MED |

> **⚠️ Важно:** CDP раскрывает информацию об устройстве (модель, IOS). На внешних интерфейсах рекомендуется отключать: `(config-if)# no cdp enable`

---

## Команды

### CDP

```bash
# Глобальное включение/отключение CDP
Router(config)# cdp run                   # включить (по умолчанию)
Router(config)# no cdp run               # отключить глобально

# Отключить CDP на конкретном интерфейсе
Router(config)# interface gigabitethernet 0/0
Router(config-if)# no cdp enable

# Таймеры CDP
Router(config)# cdp timer 30             # интервал отправки (сек)
Router(config)# cdp holdtime 90          # таймер удержания (сек)

# Просмотр CDP
Router# show cdp                          # глобальные настройки CDP
Router# show cdp neighbors               # краткая сводка соседей
Router# show cdp neighbors detail        # подробно (IP, IOS версия и т.д.)
Router# show cdp entry *                 # все соседи (аналог detail)
Router# show cdp entry R1                # конкретный сосед
Router# show cdp interface               # интерфейсы с CDP
Router# show cdp traffic                 # статистика пакетов
```

### LLDP

```bash
# Глобальное включение LLDP
Router(config)# lldp run

# Управление по интерфейсу
Router(config)# interface gigabitethernet 0/0
Router(config-if)# lldp transmit         # разрешить отправку LLDP
Router(config-if)# lldp receive          # разрешить приём LLDP
Router(config-if)# no lldp transmit     # запретить отправку

# Таймеры LLDP
Router(config)# lldp timer 15            # интервал (сек)
Router(config)# lldp holdtime 60         # удержание (сек)
Router(config)# lldp reinit 3           # задержка после перезагрузки (сек)

# Просмотр LLDP
Router# show lldp                         # глобальные настройки
Router# show lldp neighbors              # краткая сводка
Router# show lldp neighbors detail       # подробно
Router# show lldp entry *
Router# show lldp interface              # состояние по интерфейсам
Router# show lldp traffic                # статистика
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [CDP — Cisco Documentation](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/cdp/configuration/xe-16/cdp-xe-16-book/nm-cdp-discover.html) | Официальная документация Cisco Discovery Protocol |
| [IEEE 802.1AB — LLDP Standard](https://standards.ieee.org/ieee/802.1AB/6047/) | Стандарт Link Layer Discovery Protocol |
| [CDP vs LLDP — networklessons.com](https://networklessons.com/system-management/introduction-to-cdp-cisco-discovery-protocol) | Сравнение CDP и LLDP, команды, примеры вывода |
| [Jeremy's IT Lab — CDP and LLDP (YouTube)](https://www.youtube.com/watch?v=8bQB2eBElzM) | CDP и LLDP из серии Free CCNA: настройка и диагностика |
| [LLDP-MED — networklessons.com](https://networklessons.com/system-management/link-layer-discovery-protocol-lldp) | LLDP Media Endpoint Discovery, расширения LLDP |
