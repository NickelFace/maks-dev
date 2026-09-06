---
title: "CCNA 2.4 Spanning Tree Protocol"
date: 2026-08-06
description: "STP и RSTP: выбор Root Bridge, роли портов, состояния, защитные функции PortFast/BPDU Guard/Root Guard и настройка Rapid-PVST+ на коммутаторах Cisco."
tags: ["CCNA", "Cisco", "STP", "RSTP", "Spanning Tree"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-2-04-stp/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Зачем нужен STP

Без STP избыточные линки между коммутаторами создают **петли**:

- **Broadcast storm** — широковещательные фреймы бесконечно копируются
- **Нестабильность MAC-таблицы** — один MAC появляется на разных портах
- **Дублирование unicast** — одноадресные фреймы получаются несколько раз

STP блокирует избыточные порты, оставляя единственный активный путь. При отказе основного пути автоматически активирует резервный.

---

## Варианты STP

| Протокол | Стандарт | Сходимость | Описание |
|---|---|---|---|
| STP | IEEE 802.1D | 30–50 сек | Оригинальный, один экземпляр для всех VLAN |
| PVST+ | Cisco | 30–50 сек | Per-VLAN STP — отдельный экземпляр на каждый VLAN |
| RSTP | IEEE 802.1w | 1–2 сек | Быстрый STP |
| Rapid-PVST+ | Cisco | 1–2 сек | Per-VLAN RSTP **(рекомендуется)** |
| MSTP | IEEE 802.1s | 1–2 сек | Multiple STP — группы VLAN в экземпляры |

---

## Процесс выбора STP

### Шаг 1: Выбор Root Bridge

Root Bridge (корневой коммутатор) — коммутатор с наименьшим **Bridge ID**.

```
Bridge ID = Priority (2 байта) + MAC (6 байт)
Priority = Base (кратно 4096) + VLAN ID
```

| Параметр | По умолчанию | Диапазон |
|---|---|---|
| Priority | 32768 | 0–61440 (кратно 4096) |
| Bridge ID | 32768 + MAC | — |

> **💡 Совет:** Для принудительного назначения Root Bridge: установить приоритет ниже 32768 (например 24576 или использовать `spanning-tree vlan X root primary`).

### Шаг 2: Выбор Root Port (RP)

На каждом **не-Root** коммутаторе — порт с наименьшей стоимостью пути до Root Bridge.

| Скорость | Стоимость (по умолч.) |
|---|:---:|
| 10 Мбит/с | 100 |
| 100 Мбит/с | 19 |
| 1 Гбит/с | 4 |
| 10 Гбит/с | 2 |

При одинаковой стоимости: меньший **Sender Bridge ID** → меньший **Port ID**.

### Шаг 3: Выбор Designated Port (DP)

На каждом сегменте — порт с наименьшей стоимостью пути до Root Bridge (обычно на Root Bridge все порты Designated).

### Шаг 4: Non-Designated Port (NDP)

Все остальные порты — блокируются (Blocking).

---

## Состояния портов STP (802.1D)

| Состояние | Пересылка данных | Изучение MAC | Прослушивание BPDU | Время |
|---|:---:|:---:|:---:|---|
| Blocking | Нет | Нет | Да | — |
| Listening | Нет | Нет | Да | 15 сек (Forward Delay) |
| Learning | Нет | Да | Да | 15 сек (Forward Delay) |
| Forwarding | Да | Да | Да | — |
| Disabled | Нет | Нет | Нет | — |

> **📌 Обратите внимание:** Общее время сходимости STP 802.1D: до **50 сек** (20 сек Max Age + 15 сек Listening + 15 сек Learning). RSTP сокращает до 1–2 сек.

---

## RSTP — Rapid STP (802.1w)

### Состояния портов RSTP

| Состояние | Описание |
|---|---|
| Discarding | Комбинация Blocking + Listening (не пересылает, не учит) |
| Learning | Учит MAC-адреса, не пересылает |
| Forwarding | Полностью активен |

### Роли портов RSTP

| Роль | Описание |
|---|---|
| Root Port | Лучший путь к Root Bridge |
| Designated Port | Лучший порт в сегменте для отправки к Root |
| Alternate Port | Резервный путь к Root (заменяет Blocking) |
| Backup Port | Резервный порт в том же сегменте |
| Edge Port | Подключен к конечному устройству (аналог PortFast) |

> **💡 Совет:** RSTP использует механизм **Proposal/Agreement** (рукопожатие) для немедленного перехода в Forwarding без ожидания таймеров.

---

## Настройка STP

```bash
# Выбор режима STP
Switch(config)# spanning-tree mode pvst           # PVST+
Switch(config)# spanning-tree mode rapid-pvst      # Rapid-PVST+ (рекомендуется)
Switch(config)# spanning-tree mode mst             # MSTP

# Установить Root Bridge (primary = priority 24576)
Switch(config)# spanning-tree vlan 10 root primary
Switch(config)# spanning-tree vlan 10 root secondary  # priority 28672

# Установить приоритет вручную (кратно 4096)
Switch(config)# spanning-tree vlan 10 priority 4096

# Стоимость порта
Switch(config)# interface gigabitethernet 0/1
Switch(config-if)# spanning-tree vlan 10 cost 10

# Приоритет порта (0–240, кратно 16; меньше = предпочтительнее)
Switch(config-if)# spanning-tree vlan 10 port-priority 64

# Таймеры (только на Root Bridge!)
Switch(config)# spanning-tree vlan 10 hello-time 2      # по умолч. 2 сек
Switch(config)# spanning-tree vlan 10 forward-time 15   # по умолч. 15 сек
Switch(config)# spanning-tree vlan 10 max-age 20        # по умолч. 20 сек
```

---

## Защитные функции

### PortFast

Немедленный переход в Forwarding (минуя Listening/Learning). Только для access-портов с конечными устройствами.

```bash
Switch(config-if)# spanning-tree portfast          # на конкретном порту
Switch(config)# spanning-tree portfast default     # на всех access-портах
```

### BPDU Guard

Отключает порт (err-disable) при получении BPDU. Используется с PortFast.

```bash
Switch(config-if)# spanning-tree bpduguard enable
Switch(config)# spanning-tree portfast bpduguard default  # глобально
```

### BPDU Filter

Запрещает отправку и приём BPDU на порту.

```bash
Switch(config-if)# spanning-tree bpdufilter enable
```

### Root Guard

Запрещает порту становиться Root Port (защита от нежелательного Root Bridge).

```bash
Switch(config-if)# spanning-tree guard root
```

### Loop Guard

Переводит порт в loop-inconsistent состояние при прекращении приёма BPDU (вместо перехода в Forwarding).

```bash
Switch(config-if)# spanning-tree guard loop
Switch(config)# spanning-tree loopguard default    # глобально
```

---

## Проверка и диагностика

```bash
Switch# show spanning-tree                          # все VLAN
Switch# show spanning-tree vlan 10                  # конкретный VLAN
Switch# show spanning-tree vlan 10 detail           # подробно
Switch# show spanning-tree summary                  # сводка режимов
Switch# show spanning-tree interface gi0/1          # конкретный порт
Switch# show spanning-tree interface gi0/1 detail

# Пример вывода show spanning-tree vlan 10:
# Root ID, Bridge ID, таймеры
# Интерфейс: роль (Root/Desg/Altn), статус, стоимость, приоритет
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [IEEE 802.1D — STP Standard](https://standards.ieee.org/ieee/802.1D/3399/) | Оригинальный стандарт Spanning Tree Protocol |
| [IEEE 802.1w — RSTP Standard](https://standards.ieee.org/ieee/802.1w/2935/) | Rapid Spanning Tree Protocol: ускоренная сходимость |
| [STP — networklessons.com](https://networklessons.com/spanning-tree/introduction-to-spanning-tree) | Полный разбор STP: Root Bridge, port roles, состояния |
| [RSTP — networklessons.com](https://networklessons.com/spanning-tree/rapid-spanning-tree-rstp) | RSTP: отличия от STP, proposal/agreement, edge ports |
| [Jeremy's IT Lab — Spanning Tree Protocol (YouTube)](https://www.youtube.com/watch?v=mLi-xDPGpHw) | STP, RSTP, PVST+, PortFast, BPDU Guard из серии Free CCNA |
| [PortFast and BPDU Guard — Cisco](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-3/configuration_guide/lyr2/b_173_lyr2_9300_cg/configuring_optional_spanning_tree_features.html) | Официальная документация по PortFast, BPDU Guard, Root Guard |
