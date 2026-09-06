---
title: "CCNA 1.7 Беспроводные сети"
date: 2026-07-19
description: "Стандарты 802.11 (Wi-Fi 4/5/6), частотные диапазоны и каналы, компоненты WLAN (AP, WLC, CAPWAP), методы доступа CSMA/CA и стандарты безопасности WPA2/WPA3."
tags: ["CCNA", "Cisco", "Wi-Fi", "802.11", "WLAN"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-1-07-wireless/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Стандарты 802.11

| Стандарт | Частота | Макс. скорость | Диапазон | Примечание |
|---|---|---|---|---|
| 802.11b | 2,4 ГГц | 11 Мбит/с | ~35 м (в помещении) | Устарел |
| 802.11a | 5 ГГц | 54 Мбит/с | ~35 м | Устарел |
| 802.11g | 2,4 ГГц | 54 Мбит/с | ~38 м | Обратная совместимость с b |
| 802.11n | 2,4/5 ГГц | 600 Мбит/с | ~70 м | Wi-Fi 4, MIMO |
| 802.11ac | 5 ГГц | 3,5 Гбит/с | ~35 м | Wi-Fi 5, MU-MIMO |
| 802.11ax | 2,4/5 ГГц | 9,6 Гбит/с | ~30 м | **Wi-Fi 6**, OFDMA, MU-MIMO |
| 802.11ax | 6 ГГц | 9,6 Гбит/с | ~20 м | **Wi-Fi 6E**, только 6 ГГц, меньше помех |

> **💡 Совет:** На экзамене часто спрашивают: 802.11n — первый с двухдиапазонной поддержкой 2,4 и 5 ГГц. Wi-Fi 6E = 802.11ax в диапазоне 6 ГГц (та же технология, новый спектр).

---

## Частотные диапазоны и каналы

### 2,4 ГГц

- Каналы 1–14 (в США 1–11, в России 1–13)
- Ширина канала: 20 МГц
- **Неперекрывающиеся каналы: 1, 6, 11** (используйте именно их для соседних AP)

### 5 ГГц

- Больше каналов (до 25 в США)
- Ширина канала: 20, 40, 80, 160 МГц
- Меньше помех, меньше радиус действия

### 6 ГГц (Wi-Fi 6E)

- Доступен только на устройствах с Wi-Fi 6E (802.11ax)
- ~60 каналов по 20 МГц (США) — значительно больше ёмкость
- Нет устаревших устройств → минимальные помехи
- Меньше радиус действия, чем 5 ГГц; лучший выбор для плотных indoor-сред

> **⚠️ Важно:** Диапазон 2,4 ГГц перегружен (Bluetooth, микроволновки, другие AP). Если возможно — используйте 5 ГГц. Для максимальной пропускной способности в плотных сетях — 6 ГГц (Wi-Fi 6E).

---

## Режимы работы

| Режим | Описание |
|---|---|
| Infrastructure | Клиенты подключаются через точку доступа (AP) |
| Ad-hoc (IBSS) | Устройства подключаются напрямую без AP |
| Mesh | AP соединены по беспроводной сети между собой |

### BSS и ESS

| Термин | Расшифровка | Описание |
|---|---|---|
| BSS | Basic Service Set | Одна точка доступа + её клиенты |
| BSSID | BSS Identifier | MAC-адрес AP |
| SSID | Service Set Identifier | Имя сети (до 32 символов) |
| ESS | Extended Service Set | Несколько BSS с одним SSID |
| DS | Distribution System | Проводная инфраструктура, соединяющая AP |

---

## Компоненты WLAN

| Компонент | Описание |
|---|---|
| AP (Access Point) | Точка доступа — мост между проводной и беспроводной сетью |
| WLC (Wireless LAN Controller) | Централизованное управление AP; AP = Lightweight |
| CAPWAP | Протокол туннелирования между Lightweight AP и WLC (UDP 5246/5247) |
| Autonomous AP | Самостоятельная AP, не требует WLC |
| Lightweight AP | AP под управлением WLC (thin AP) |

> **💡 Совет:** CAPWAP (Control And Provisioning of Wireless Access Points) — заменил LWAPP. Управляющий трафик = UDP 5246, данные = UDP 5247.

---

## Методы доступа к среде

- **CSMA/CA** (Collision Avoidance) — прослушать перед отправкой + случайная задержка
- **ACK** — каждый пакет подтверждается
- **RTS/CTS** — Request to Send / Clear to Send для предотвращения «скрытого узла»

> **📌 Обратите внимание:** Wi-Fi использует **CSMA/CA** (Avoidance), не **CSMA/CD** (Detection) как проводной Ethernet. В беспроводной среде нельзя одновременно передавать и слушать коллизии.

---

## Безопасность беспроводных сетей

| Стандарт | Шифрование | Аутентификация | Статус |
|---|---|---|---|
| WEP | RC4 (40 бит) | Открытый ключ/PSK | Взломан, не использовать |
| WPA | TKIP (RC4) | PSK / 802.1X | Устарел |
| WPA2 | AES-CCMP | PSK / 802.1X (EAP) | Рекомендуется |
| WPA3 | AES-GCMP | SAE / 802.1X | Текущий стандарт |

### Режимы WPA2

| Режим | Применение | Аутентификация |
|---|---|---|
| Personal (PSK) | Дом, малый бизнес | Pre-Shared Key |
| Enterprise | Корпоративные | RADIUS + 802.1X/EAP |

> **⚠️ Важно:** На экзамене: WEP — устарел и небезопасен. Для корпоративных сетей — WPA2 Enterprise с RADIUS.

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [IEEE 802.11 Standards — IEEE](https://standards.ieee.org/ieee/802.11/7028/) | Официальные стандарты 802.11a/b/g/n/ac/ax |
| [Wireless Standards — networklessons.com](https://networklessons.com/wireless/introduction-wireless-lan) | Обзор WLAN: стандарты, частоты, каналы, SSID |
| [Wi-Fi 6 (802.11ax) — Cisco](https://www.cisco.com/c/en/us/solutions/enterprise-networks/802-11ax-solution/index.html) | Cisco о Wi-Fi 6: OFDMA, MU-MIMO, улучшения vs 802.11ac |
| [Jeremy's IT Lab — Wireless Fundamentals (YouTube)](https://www.youtube.com/watch?v=bPfELUx1BoI) | Основы беспроводных сетей: стандарты, частоты, BSS/ESS |
| [Channel Planning 2.4 GHz vs 5 GHz — Cisco](https://www.cisco.com/c/en/us/support/docs/wireless-mobility/wireless-lan-wlan/212016-Best-Practices-for-Wireless-Channel-Pl.html) | Лучшие практики планирования каналов 2.4/5 ГГц |
| [David Bombal — Wireless Networking (YouTube)](https://www.youtube.com/watch?v=pnBqmEFKUHk) | Беспроводные сети CCNA: стандарты, SSID, безопасность |
