---
title: "CCNA 3.4 HSRP и FHRP"
date: 2026-08-18
description: "Протоколы отказоустойчивости первого хопа HSRP (v1/v2), VRRP и GLBP: виртуальный IP, выбор Active/Standby, preempt, interface tracking и команды настройки."
tags: ["CCNA", "Cisco", "HSRP", "FHRP", "отказоустойчивость"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-3-04-fhrp/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Проблема одного шлюза

Конечные устройства настраиваются на один шлюз по умолчанию. При отказе маршрутизатора-шлюза устройства теряют связь до ручного вмешательства.

**FHRP (First Hop Redundancy Protocol)** — группа протоколов, создающих виртуальный шлюз с высокой доступностью.

---

## Протоколы FHRP

| Протокол | Стандарт | Балансировка | Роли |
|---|---|:---:|---|
| HSRP v1 | Cisco | Нет | Active / Standby |
| HSRP v2 | Cisco | Нет (per-group) | Active / Standby |
| VRRP | IEEE 802.11 (RFC 5798) | Нет | Master / Backup |
| GLBP | Cisco | Да | AVG + AVF |

---

## HSRP — детали

**HSRP (Hot Standby Router Protocol)** — виртуальный IP и MAC распределяются между Active и Standby маршрутизаторами.

### Роли HSRP

| Роль | Описание |
|---|---|
| Active | Пересылает трафик для виртуального IP |
| Standby | Готов взять роль Active при отказе |
| Listen | Остальные маршрутизаторы в группе |

### Выбор Active/Standby

1. Наибольший **приоритет** (по умолчанию 100; диапазон 0–255)
2. При равном приоритете — наибольший IP-адрес интерфейса

### Преемптивность (Preempt)

По умолчанию, если Active восстанавливается после отказа — он не забирает роль обратно. С `preempt` — забирает при наибольшем приоритете.

### HSRP Версии

| Версия | Группы | Multicast | Virtual MAC |
|---|---|---|---|
| HSRPv1 | 0–255 | 224.0.0.2 | 0000.0C07.ACxx (xx = номер группы hex) |
| HSRPv2 | 0–4095 | 224.0.0.102 | 0000.0C9F.Fxxx (xxx = группа hex) |

### Таймеры HSRP

| Таймер | По умолчанию | Описание |
|---|---|---|
| Hello | 3 сек | Интервал отправки Hello |
| Hold | 10 сек | Таймер признания Active недоступным |

### Состояния HSRP

```
Initial → Learn → Listen → Speak → Standby → Active
```

---

## Настройка HSRP

```bash
# Базовая настройка HSRP (Active — приоритет выше)
Router1(config)# interface gigabitethernet 0/0
Router1(config-if)# ip address 192.168.1.2 255.255.255.0
Router1(config-if)# standby version 2                    # рекомендуется v2
Router1(config-if)# standby 1 ip 192.168.1.1             # виртуальный IP
Router1(config-if)# standby 1 priority 110               # выше 100 → Active
Router1(config-if)# standby 1 preempt                    # вернуть роль при восстановлении
Router1(config-if)# standby 1 authentication md5 key-string cisco123
Router1(config-if)# standby 1 timers 1 3                 # hello=1, hold=3 сек

# Standby маршрутизатор (приоритет ниже — остаётся Standby)
Router2(config)# interface gigabitethernet 0/0
Router2(config-if)# ip address 192.168.1.3 255.255.255.0
Router2(config-if)# standby version 2
Router2(config-if)# standby 1 ip 192.168.1.1             # тот же виртуальный IP
Router2(config-if)# standby 1 priority 90                # ниже 100 → Standby
Router2(config-if)# standby 1 preempt

# Отслеживание интерфейса (Interface Tracking)
Router1(config-if)# standby 1 track gigabitethernet 0/1 20
# Если gi0/1 упадёт — приоритет снизится на 20 (110-20=90 < 100 у R2 → R2 станет Active)
```

---

## VRRP

**VRRP (Virtual Router Redundancy Protocol)** — IEEE-стандарт, аналог HSRP.

| Параметр | HSRP | VRRP |
|---|---|---|
| Стандарт | Cisco | IEEE |
| Роли | Active/Standby | Master/Backup |
| Приоритет по умолч. | 100 | 100 |
| Виртуальный IP | Отдельный | Может совпадать с IP интерфейса |
| Preempt | Опционально | По умолчанию включён |

```bash
Router(config-if)# vrrp 1 ip 192.168.1.1
Router(config-if)# vrrp 1 priority 110
Router(config-if)# vrrp 1 preempt
Router(config-if)# vrrp 1 authentication md5 key-string cisco123
Router# show vrrp
Router# show vrrp brief
```

---

## GLBP

**GLBP (Gateway Load Balancing Protocol)** — Cisco, поддерживает балансировку нагрузки.

| Роль | Описание |
|---|---|
| AVG (Active Virtual Gateway) | Один, управляет группой, отвечает на ARP |
| AVF (Active Virtual Forwarder) | Все активные маршрутизаторы пересылают трафик |

- Клиенты получают разные виртуальные MAC от AVG → трафик балансируется
- До 4 AVF в одной группе

```bash
Router(config-if)# glbp 1 ip 192.168.1.1
Router(config-if)# glbp 1 priority 110
Router(config-if)# glbp 1 preempt
Router(config-if)# glbp 1 load-balancing round-robin   # метод балансировки
Router# show glbp
```

---

## Проверка

```bash
# HSRP
Router# show standby                    # состояние всех HSRP групп
Router# show standby brief              # краткая сводка
Router# show standby gigabitethernet 0/0  # конкретный интерфейс

# Пример вывода show standby brief:
# Interface   Grp  Pri P State    Active          Standby         Virtual IP
# Gi0/0       1    110 P Active   local           192.168.1.3     192.168.1.1

# VRRP
Router# show vrrp
Router# show vrrp brief

# GLBP
Router# show glbp
Router# show glbp brief
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [RFC 2281 — HSRP](https://www.rfc-editor.org/rfc/rfc2281) | Оригинальная спецификация Hot Standby Router Protocol |
| [RFC 5798 — VRRP](https://www.rfc-editor.org/rfc/rfc5798) | Virtual Router Redundancy Protocol v3 (IPv4 и IPv6) |
| [HSRP — networklessons.com](https://networklessons.com/ip-services/hot-standby-router-protocol-hsrp) | HSRP: active/standby, виртуальный IP, preempt, версии |
| [GLBP — networklessons.com](https://networklessons.com/ip-services/glbp-gateway-load-balancing-protocol) | Gateway Load Balancing Protocol: балансировка нагрузки на шлюз |
| [Jeremy's IT Lab — FHRP: HSRP, VRRP, GLBP (YouTube)](https://www.youtube.com/watch?v=JNT3kBOGC8s) | HSRP, VRRP, GLBP из серии Free CCNA |
| [Cisco HSRP Configuration Guide](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipapp_fhrp/configuration/xe-16/fhp-xe-16-book/fhp-hsrp-v1-v2.html) | Официальная документация Cisco по HSRP v1 и v2 |
