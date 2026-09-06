---
title: "CCNA 5.3 Безопасность Layer 2"
date: 2026-09-13
description: "Port Security (shutdown/restrict/protect, sticky MAC), DHCP Snooping (trusted/untrusted порты), Dynamic ARP Inspection и защита от VLAN Hopping и STP-атак."
tags: ["CCNA", "Cisco", "Port Security", "DHCP Snooping", "безопасность"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-5-03-layer2-security/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Port Security

**Port Security** — ограничивает MAC-адреса, которые могут использовать порт коммутатора.

### Режимы нарушения (Violation)

| Режим | Действие при нарушении | Сообщение в Syslog | Счётчик |
|---|---|:---:|:---:|
| Shutdown (по умолч.) | Порт → err-disabled | Да | Да |
| Restrict | Блокирует нарушителя, порт работает для остальных | Да | Да |
| Protect | Блокирует нарушителя, без уведомления | Нет | Нет |

> **💡 Совет:** `shutdown` — наиболее безопасный. `restrict` — блокирует, но продолжает работать. `protect` — самый мягкий, не рекомендуется для production.

### Настройка Port Security

```bash
# Только на access-портах!
Switch(config)# interface fastethernet 0/1
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10

# Включить port security
Switch(config-if)# switchport port-security

# Максимальное количество MAC-адресов (по умолч. 1)
Switch(config-if)# switchport port-security maximum 3

# Статический MAC (внести вручную)
Switch(config-if)# switchport port-security mac-address AABB.CC11.2233

# Sticky MAC (автоматически запомнить подключённые MAC и сохранить в конфиг)
Switch(config-if)# switchport port-security mac-address sticky

# Режим нарушения
Switch(config-if)# switchport port-security violation shutdown    # по умолч.
Switch(config-if)# switchport port-security violation restrict
Switch(config-if)# switchport port-security violation protect
```

### Восстановление err-disabled порта

```bash
# Ручное восстановление
Switch(config)# interface fastethernet 0/1
Switch(config-if)# shutdown
Switch(config-if)# no shutdown

# Автоматическое восстановление
Switch(config)# errdisable recovery cause psecure-violation
Switch(config)# errdisable recovery interval 300                  # через 300 сек
Switch# show errdisable recovery                                   # статус
```

### Проверка Port Security

```bash
Switch# show port-security                           # все порты
Switch# show port-security interface fa0/1          # конкретный порт
Switch# show port-security address                   # изученные MAC
Switch# show mac address-table                       # MAC-таблица
```

---

## DHCP Snooping

**DHCP Snooping** — функция коммутатора, предотвращающая атаки с поддельным DHCP-сервером.

Порты делятся на:
- **Trusted** — доверенный (к DHCP-серверу, uplink)
- **Untrusted** — недоверенный (клиентские порты, по умолчанию)

На untrusted портах блокируются DHCP OFFER и ACK (ответы сервера).

```bash
# Включить DHCP Snooping глобально
Switch(config)# ip dhcp snooping

# Включить для конкретного VLAN
Switch(config)# ip dhcp snooping vlan 10
Switch(config)# ip dhcp snooping vlan 10,20,30

# Отключить вставку Option 82 (часто нужно при проблемах с DHCP)
Switch(config)# no ip dhcp snooping information option

# Пометить uplink/серверный порт как trusted
Switch(config)# interface gigabitethernet 0/1              # uplink к маршрутизатору/серверу
Switch(config-if)# ip dhcp snooping trust

# Ограничение скорости DHCP на untrusted-порту
Switch(config)# interface fastethernet 0/1                 # клиентский порт
Switch(config-if)# ip dhcp snooping limit rate 15          # макс. 15 пакетов/сек

# Проверка
Switch# show ip dhcp snooping                              # глобальные настройки
Switch# show ip dhcp snooping binding                      # таблица привязок MAC→IP→VLAN→порт
Switch# show ip dhcp snooping statistics
```

> **📌 Обратите внимание:** DHCP Snooping строит **таблицу привязок** (binding table): MAC-адрес → IP → VLAN → порт. Эта таблица используется DAI и IP Source Guard.

---

## Dynamic ARP Inspection (DAI)

**DAI** предотвращает ARP-спуфинг, проверяя ARP-пакеты по таблице DHCP Snooping.

```bash
# Требует DHCP Snooping (для таблицы привязок)
Switch(config)# ip dhcp snooping
Switch(config)# ip dhcp snooping vlan 10

# Включить DAI для VLAN
Switch(config)# ip arp inspection vlan 10
Switch(config)# ip arp inspection vlan 10,20

# Trusted-порт для DAI (uplink к маршрутизатору, другому коммутатору)
Switch(config)# interface gigabitethernet 0/1
Switch(config-if)# ip arp inspection trust

# Дополнительные проверки DAI
Switch(config)# ip arp inspection validate src-mac   # проверить src MAC в Ethernet = ARP
Switch(config)# ip arp inspection validate dst-mac   # проверить dst MAC
Switch(config)# ip arp inspection validate ip        # проверить IP в ARP

# Ограничение скорости ARP на порту
Switch(config)# interface fastethernet 0/1
Switch(config-if)# ip arp inspection limit rate 100

# Проверка
Switch# show ip arp inspection                        # статус и VLAN
Switch# show ip arp inspection vlan 10
Switch# show ip arp inspection interfaces
Switch# show ip arp inspection statistics
```

---

## Дополнительные меры защиты L2

### Отключение неиспользуемых портов

```bash
Switch(config)# interface range fastethernet 0/5-24
Switch(config-if-range)# shutdown
Switch(config-if-range)# switchport access vlan 999       # blackhole VLAN
```

### Защита от VLAN Hopping

```bash
# Отключить DTP на access-портах
Switch(config-if)# switchport mode access
Switch(config-if)# switchport nonegotiate

# Сменить Native VLAN (не VLAN 1)
Switch(config-if)# switchport trunk native vlan 999       # неиспользуемый VLAN

# Запретить VLAN 1 на trunk
Switch(config-if)# switchport trunk allowed vlan remove 1
```

### Защита STP

```bash
# PortFast + BPDU Guard на access-портах
Switch(config-if)# spanning-tree portfast
Switch(config-if)# spanning-tree bpduguard enable

# Root Guard на портах, где не должно быть Root Bridge
Switch(config-if)# spanning-tree guard root
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [Port Security — networklessons.com](https://networklessons.com/switching/how-to-configure-port-security-on-cisco-switch) | Port Security: restrict, protect, shutdown, sticky MAC |
| [DHCP Snooping — networklessons.com](https://networklessons.com/switching/dhcp-snooping) | DHCP Snooping: trusted/untrusted порты, защита от rogue DHCP |
| [Dynamic ARP Inspection — networklessons.com](https://networklessons.com/switching/dai-dynamic-arp-inspection) | DAI: защита от ARP spoofing, привязка к DHCP Snooping |
| [802.1X — networklessons.com](https://networklessons.com/switching/aaa-802-1x-authentication) | Port-based NAC: authenticator, supplicant, auth server |
| [Jeremy's IT Lab — Layer 2 Security (YouTube)](https://www.youtube.com/watch?v=lMI2Q8Ke1p0) | Port Security, DHCP Snooping, DAI из серии Free CCNA |
| [Cisco Port Security Configuration](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-3/configuration_guide/sec/b_173_sec_9300_cg/configuring_port_security.html) | Официальное руководство Cisco по Port Security |
