---
title: "CCNA 3.3 OSPFv2"
date: 2026-08-16
description: "OSPFv2: процесс установки соседства, выбор DR/BDR, вычисление стоимости (Cost), настройка с командами network и ip ospf, аутентификация и диагностика."
tags: ["CCNA", "Cisco", "OSPF", "динамическая маршрутизация", "DR/BDR"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-3-03-ospf/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Характеристики OSPF

| Характеристика | Значение |
|---|---|
| Протокол | Link-State (состояние каналов) |
| AD | 110 |
| Метрика | Cost (10⁸ / bandwidth) |
| Алгоритм | Dijkstra (SPF) |
| Обновления | Triggered (при изменении), не периодические |
| Multicast | 224.0.0.5 (все OSPF), 224.0.0.6 (DR/BDR) |
| Порт | IP протокол 89 (не TCP/UDP) |
| Аутентификация | MD5, SHA, Null |
| Поддержка VLSM | Да |
| Масштаб | Неограничен (иерархия зон) |

---

## Процесс установки соседства

```
1. Down → маршрутизатор не получал Hello от соседа
2. Init → получен Hello, но свой Router ID не в нём
3. 2-Way → оба видят Router ID друг друга (выбор DR/BDR на broadcast)
4. ExStart → определяется Master/Slave для обмена DBD
5. Exchange → обмен Database Description (DBD) пакетами
6. Loading → запросы LSR/LSU для недостающих LSA
7. Full → синхронизированные базы данных (LSDB), полное соседство
```

> **📌 Обратите внимание:** Для установки соседства OSPF должны совпадать:
> - Hello/Dead интервалы
> - Area ID
> - Subnet (сеть и маска)
> - MTU (на некоторых платформах)
> - Stub Area флаги
> - Аутентификация

---

## Типы OSPF-сетей

| Тип | Описание | DR/BDR | Hello/Dead |
|---|---|:---:|---|
| Broadcast | Ethernet — DR/BDR выбираются | Да | 10/40 сек |
| Point-to-Point | Serial, GRE, HDLC — нет DR/BDR | Нет | 10/40 сек |
| Non-Broadcast (NBMA) | Frame Relay — ручное соседство | Да | 30/120 сек |
| Point-to-Multipoint | Один хаб, много спиц | Нет | 30/120 сек |
| Loopback | Всегда /32 в OSPF | Нет | — |

---

## Router ID и DR/BDR

### Router ID (RID)

Выбирается в порядке убывания приоритета:
1. Вручную: `router-id X.X.X.X`
2. Наибольший IP на loopback-интерфейсе
3. Наибольший IP на активном физическом интерфейсе

### DR/BDR (Designated/Backup Designated Router)

На broadcast-сегментах для уменьшения количества соседств:

| Роль | Описание |
|---|---|
| DR | Собирает LSU от всех и рассылает на 224.0.0.5 |
| BDR | Резервный DR, слушает все обновления |
| DROther | Устанавливает Full только с DR и BDR |

Выбор DR/BDR:
1. Наибольший приоритет интерфейса (по умолчанию 1; 0 = никогда не DR)
2. При равном приоритете — наибольший Router ID

> **⚠️ Важно:** DR/BDR выбираются **один раз** при поднятии сегмента и не пересматриваются без перезагрузки (`clear ip ospf process`). Preemption не работает для DR/BDR.

---

## Стоимость (Cost)

```
Cost = Reference Bandwidth / Interface Bandwidth
Default Reference Bandwidth = 100 Mbps = 100,000,000 bps
```

| Интерфейс | Скорость | Cost (по умолч.) |
|---|---|:---:|
| Serial | 1,544 Мбит/с | 64 |
| FastEthernet | 100 Мбит/с | 1 |
| GigabitEthernet | 1 Гбит/с | 1 |
| 10 GigabitEthernet | 10 Гбит/с | 1 |

> **⚠️ Важно:** GigabitEthernet и FastEthernet имеют одинаковый cost=1 при reference bandwidth 100 Мбит/с. Рекомендуется изменить reference bandwidth: `auto-cost reference-bandwidth 1000` (для Gig) или `10000` (для 10GbE). **Изменить на всех маршрутизаторах!**

---

## Настройка OSPFv2

### Базовая настройка

```bash
Router(config)# router ospf 1                  # process-id локальный (1-65535)
Router(config-router)# router-id 1.1.1.1       # рекомендуется задать явно

# Объявление сетей (wildcard mask = инверт. маска)
Router(config-router)# network 192.168.1.0 0.0.0.255 area 0
Router(config-router)# network 10.0.0.0 0.255.255.255 area 0

# Пассивный интерфейс (не отправляет Hello — для LAN/клиентских интерфейсов)
Router(config-router)# passive-interface gigabitethernet 0/1
Router(config-router)# passive-interface default      # все пассивные по умолчанию
Router(config-router)# no passive-interface gi0/0     # активировать конкретный

# Маршрут по умолчанию в OSPF
Router(config-router)# default-information originate  # только если есть default route
Router(config-router)# default-information originate always  # всегда

# Reference bandwidth
Router(config-router)# auto-cost reference-bandwidth 1000   # Мбит/с
```

### Настройка на интерфейсе

```bash
Router(config)# interface gigabitethernet 0/0
Router(config-if)# ip ospf 1 area 0              # альтернатива network команде
Router(config-if)# ip ospf cost 10              # ручная стоимость
Router(config-if)# ip ospf priority 100         # приоритет DR (0-255)
Router(config-if)# ip ospf hello-interval 5     # Hello каждые 5 сек
Router(config-if)# ip ospf dead-interval 20     # Dead = 4x Hello
Router(config-if)# ip ospf network point-to-point  # тип сети
```

### Аутентификация OSPF

```bash
# MD5 аутентификация на интерфейсе
Router(config-if)# ip ospf authentication message-digest
Router(config-if)# ip ospf message-digest-key 1 md5 cisco123

# Аутентификация на всю зону
Router(config-router)# area 0 authentication message-digest
```

---

## Проверка и диагностика

```bash
# Соседи
Router# show ip ospf neighbor               # список соседей (State: FULL = норм.)
Router# show ip ospf neighbor detail        # подробно (Dead timer, DR/BDR)

# Маршруты
Router# show ip route ospf                  # только OSPF-маршруты
Router# show ip route                       # вся таблица (O = OSPF)

# База данных
Router# show ip ospf database              # LSDB — все LSA
Router# show ip ospf database router       # Router LSA (Type 1)
Router# show ip ospf database network      # Network LSA (Type 2)
Router# show ip ospf database summary      # Summary LSA (Type 3)

# Интерфейсы OSPF
Router# show ip ospf interface             # все OSPF-интерфейсы
Router# show ip ospf interface gi0/0       # конкретный
Router# show ip ospf interface brief       # краткая сводка

# Статистика OSPF
Router# show ip ospf                        # общая информация о процессе

# Отладка (осторожно на production!)
Router# debug ip ospf adj                  # процесс установки соседства
Router# debug ip ospf events               # события OSPF
# Выключить: undebug all
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [RFC 2328 — OSPFv2](https://www.rfc-editor.org/rfc/rfc2328) | Официальная спецификация OSPFv2 (IPv4) |
| [OSPF — networklessons.com](https://networklessons.com/ospf/ospf-packets-and-neighbor-discovery) | OSPF: процесс установки соседства, DR/BDR выборы |
| [OSPF Areas and LSA Types — networklessons.com](https://networklessons.com/cisco/ccna-routing-switching-icnd2-200-105/ospf-areas-explained) | Области OSPF, типы LSA 1–7, backbone area 0 |
| [OSPF Cost Calculation — networklessons.com](https://networklessons.com/ospf/ospf-reference-bandwidth) | Вычисление стоимости OSPF: reference bandwidth, команды |
| [Jeremy's IT Lab — OSPF (YouTube)](https://www.youtube.com/watch?v=kfvJ8QVJscc) | OSPF: neighbor states, DR/BDR, areas из серии Free CCNA |
| [Cisco OSPFv2 Configuration Guide](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/configuration/xe-16/iro-xe-16-book/iro-cfg.html) | Официальное руководство Cisco по настройке OSPF |
