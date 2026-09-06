---
title: "CCNA 1.2 Топологии и типы сетей"
date: 2026-07-04
description: "Типы сетей по масштабу (LAN, WAN, WLAN), физические и логические топологии, трёхуровневая модель Cisco, широковещательные и коллизионные домены."
tags: ["CCNA", "Cisco", "топологии", "LAN", "WAN"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-1-02-topologies/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Типы сетей по масштабу

| Тип | Название | Охват |
|---|---|---|
| PAN | Personal Area Network | Несколько метров (Bluetooth) |
| LAN | Local Area Network | Здание, офис |
| MAN | Metropolitan Area Network | Город |
| WAN | Wide Area Network | Страна, мир |
| WLAN | Wireless LAN | Беспроводная локальная |
| SAN | Storage Area Network | Сеть хранения данных |

---

## Физические топологии

| Топология | Описание | Плюсы | Минусы |
|---|---|---|---|
| Шина (Bus) | Все узлы на одном кабеле | Дёшево | Один обрыв — вся сеть |
| Звезда (Star) | Все узлы подключены к центральному коммутатору | Надёжность, масштабируемость | Зависимость от центра |
| Кольцо (Ring) | Узлы соединены в кольцо | Предсказуемо | Сложный сбой |
| Сетка (Mesh) | Каждый узел связан с несколькими | Высокая отказоустойчивость | Дорого |
| Гибридная | Комбинация топологий | Гибкость | Сложность |

> **💡 Совет:** Современные корпоративные сети строятся на топологии **звезда** (физически) — все устройства подключены к коммутаторам доступа.

---

## Логические топологии

Логическая топология описывает, как данные фактически передаются в сети, независимо от физической разводки.

- **Ethernet** — логическая шина (CSMA/CD в старых версиях), сейчас работает в режиме point-to-point через коммутаторы
- **Wi-Fi (802.11)** — логическая шина (CSMA/CA)
- **Token Ring** — логическое кольцо (устарело)

---

## Характеристики сетей

| Характеристика | Описание |
|---|---|
| Пропускная способность (Bandwidth) | Максимальный объём данных за единицу времени |
| Пропускная способность реальная (Throughput) | Фактически переданные данные |
| Задержка (Latency) | Время от отправки до получения |
| Джиттер (Jitter) | Вариация задержки (критично для VoIP) |
| Потери пакетов (Packet loss) | % пакетов не достигших цели |

---

## Трёхуровневая иерархическая модель Cisco

```mermaid
graph TD
    Core["Core Layer<br/>Быстрая коммутация · без политик"]
    D1["Distribution<br/>Маршрутизация · ACL · QoS"]
    D2["Distribution<br/>Маршрутизация · ACL · QoS"]
    A1["Access Layer<br/>Подключение конечных устройств"]
    A2["Access Layer<br/>Подключение конечных устройств"]

    Core --> D1 & D2
    D1 --> A1
    D2 --> A2
```

| Уровень | Функции |
|---|---|
| Core (ядро) | Высокоскоростная коммутация, минимальные задержки, без политик |
| Distribution (распределение) | Маршрутизация, ACL, суммаризация маршрутов, QoS |
| Access (доступ) | Подключение конечных устройств, PoE, Port Security, VLANs |

---

## Широковещательные и коллизионные домены

| Понятие | Определяется | Разделяется |
|---|---|---|
| Коллизионный домен | Сегмент общей среды | Коммутатором (каждый порт — отдельный) |
| Широковещательный домен | Набор устройств, получающих broadcast | Маршрутизатором или VLAN |

> **📌 Обратите внимание:** Коммутатор разделяет коллизионные домены (по одному на порт), но **не** разделяет широковещательный домен. Маршрутизатор разделяет оба типа доменов.

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [Network Topologies — networklessons.com](https://networklessons.com/network-fundamentals/network-topologies) | Обзор физических и логических топологий сети |
| [Three-Tier Network Architecture — Cisco](https://www.cisco.com/c/en/us/td/docs/solutions/Enterprise/Campus/campover.html) | Cisco Campus Network Design: Access, Distribution, Core |
| [Jeremy's IT Lab — Network Topology Architectures (YouTube)](https://www.youtube.com/watch?v=Wm2rOA2Vrv0) | Урок по топологиям и трёхуровневой модели из серии Free CCNA |
| [Collision vs Broadcast Domain — networklessons.com](https://networklessons.com/cisco/ccna-routing-switching-icnd1-100-105/collision-broadcast-domain) | Разница между коллизионным и широковещательным доменом |
| [Spine-Leaf Architecture — Cisco](https://www.cisco.com/c/en/us/solutions/data-center-virtualization/what-is-a-spine-and-leaf-architecture.html) | Объяснение Spine-Leaf топологии для ЦОД |
