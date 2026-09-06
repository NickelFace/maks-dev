---
title: "CCNA 5.4 AAA и Wireless Security"
date: 2026-09-15
description: "AAA (Authentication, Authorization, Accounting): RADIUS vs TACACS+, настройка на Cisco IOS, 802.1X port-based access control и стандарты беспроводной безопасности WPA2/WPA3."
tags: ["CCNA", "Cisco", "AAA", "RADIUS", "безопасность"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-5-04-aaa-wireless/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## AAA — концепция

**AAA** = Authentication + Authorization + Accounting

| Компонент | Описание |
|---|---|
| Authentication (Аутентификация) | Кто ты? Проверка личности (логин/пароль, сертификат, OTP) |
| Authorization (Авторизация) | Что тебе разрешено? Права и привилегии |
| Accounting (Учёт) | Что ты делал? Журнал действий |

### Источники аутентификации

| Источник | Описание |
|---|---|
| Local | Локальная база пользователей (`username` в IOS) |
| RADIUS | Внешний сервер (RFC 2865) |
| TACACS+ | Внешний сервер (Cisco) |

---

## RADIUS vs TACACS+

| Параметр | RADIUS | TACACS+ |
|---|---|---|
| Стандарт | RFC 2865/2866 (открытый) | Cisco (проприетарный) |
| Транспорт | UDP 1812 (auth), 1813 (acct) | TCP 49 |
| Шифрование | Только пароль | Весь payload |
| A/A/A разделение | Нет (Authentication + Authorization совместно) | Да (раздельно) |
| Применение | WLAN, VPN, 802.1X (network access) | Управление устройствами (device administration) |

> **💡 Совет:** **RADIUS** — для аутентификации пользователей в сеть (Wi-Fi, VPN). **TACACS+** — для управления сетевыми устройствами (SSH, привилегии в IOS). На экзамене это важно!

---

## Настройка AAA

### Базовая настройка с RADIUS

```bash
# Включить AAA
Router(config)# aaa new-model                              # включить AAA фреймворк

# Настроить RADIUS-сервер
Router(config)# radius server ISE
Router(config-radius-server)# address ipv4 192.168.1.100 auth-port 1812 acct-port 1813
Router(config-radius-server)# key cisco123                # общий ключ

# Или старый синтаксис
Router(config)# radius-server host 192.168.1.100 auth-port 1812 key cisco123

# Политика аутентификации для логина
Router(config)# aaa authentication login default group radius local
# Порядок: сначала RADIUS, при недоступности — local database

# Политика для enable
Router(config)# aaa authentication enable default group radius enable

# Авторизация команд
Router(config)# aaa authorization exec default group radius local
Router(config)# aaa authorization commands 15 default group radius local

# Учёт (Accounting)
Router(config)# aaa accounting exec default start-stop group radius
Router(config)# aaa accounting commands 15 default start-stop group radius
```

### Настройка с TACACS+

```bash
Router(config)# aaa new-model

Router(config)# tacacs server ISE_TACACS
Router(config-server-tacacs)# address ipv4 192.168.1.101
Router(config-server-tacacs)# key tacacs_secret

Router(config)# aaa authentication login default group tacacs+ local
Router(config)# aaa authorization exec default group tacacs+ local
Router(config)# aaa authorization commands 15 default group tacacs+ none
Router(config)# aaa accounting commands 15 default start-stop group tacacs+
```

---

## 802.1X (Port-Based Access Control)

**IEEE 802.1X** — стандарт аутентификации на уровне порта. Запрещает доступ к сети до успешной аутентификации.

### Компоненты 802.1X

| Роль | Описание |
|---|---|
| Supplicant | Клиентское устройство (ПК, телефон) |
| Authenticator | Коммутатор или AP — посредник |
| Authentication Server | RADIUS-сервер (Cisco ISE, FreeRADIUS) |

### Процесс аутентификации

```
Клиент ──── EAPOL Start ────────► Коммутатор
Клиент ◄─── EAP Request/Identity── Коммутатор
Клиент ──── EAP Response ────────► Коммутатор ──► RADIUS
Клиент ◄──────────────────── EAP Success/Failure ─── RADIUS
Клиент ──── Полный доступ ───────► Коммутатор (если Success)
```

### Методы EAP

| Метод | Описание |
|---|---|
| EAP-TLS | Взаимные сертификаты — максимальная безопасность |
| PEAP | Protected EAP — только сертификат сервера; клиент — пароль |
| EAP-FAST | Cisco — без сертификатов (PAC) |
| EAP-TTLS | Аналог PEAP |

### Настройка 802.1X на коммутаторе

```bash
Router(config)# aaa new-model
Router(config)# radius server AUTH_SRV
Router(config-radius-server)# address ipv4 192.168.1.100 auth-port 1812
Router(config-radius-server)# key cisco123

Router(config)# aaa authentication dot1x default group radius
Router(config)# dot1x system-auth-control              # включить 802.1X глобально

Router(config)# interface fastethernet 0/1
Router(config-if)# switchport mode access
Router(config-if)# dot1x port-control auto             # auto = 802.1X
# force-authorized = всегда открыт (по умолч.)
# force-unauthorized = всегда закрыт
# auto = требует аутентификации

Switch# show dot1x all                                 # статус 802.1X
Switch# show dot1x interface fa0/1
```

---

## Безопасность беспроводных сетей

### Стандарты шифрования

| Стандарт | Алгоритм | Статус |
|---|---|---|
| WEP | RC4 (40/104 бит) | Взломан — не использовать |
| WPA | TKIP (RC4) | Устарел |
| WPA2 Personal | AES-CCMP + PSK | Рекомендуется для дома |
| WPA2 Enterprise | AES-CCMP + 802.1X/EAP | Рекомендуется для корпоративных |
| WPA3 Personal | SAE (Simultaneous Authentication of Equals) | Текущий стандарт |
| WPA3 Enterprise | AES-256-GCMP + 802.1X | Текущий стандарт |

### WPA2 Enterprise на WLC

Настраивается через GUI WLC (Cisco 3504/5520):

1. Создать RADIUS server profile (Security → AAA → RADIUS Auth Servers)
2. Создать WLAN: Security → Layer 2 → WPA+WPA2; Auth Key Mgmt = 802.1X
3. WLAN → AAA Servers → выбрать RADIUS server

```bash
# Пример на CLI WLC
config radius auth add 1 192.168.1.100 1812 ascii cisco123
config radius auth enable 1
config wlan security wpa akm 802.1x enable 1
config wlan radius_server auth add 1 1                  # wlan 1 → radius server 1
config wlan enable 1
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [RFC 2865 — RADIUS](https://www.rfc-editor.org/rfc/rfc2865) | Remote Authentication Dial In User Service — стандарт RADIUS |
| [TACACS+ vs RADIUS — networklessons.com](https://networklessons.com/cisco/ccna-routing-switching-icnd2-200-105/tacacs-and-radius) | Сравнение TACACS+ и RADIUS: шифрование, порты, применение |
| [AAA — networklessons.com](https://networklessons.com/system-management/aaa-authentication-on-cisco-ios) | Authentication, Authorization, Accounting на Cisco IOS |
| [WPA3 — Wi-Fi Alliance](https://www.wi-fi.org/discover-wi-fi/security) | WPA3: SAE, Enhanced Open, 192-bit Enterprise Mode |
| [Jeremy's IT Lab — AAA and RADIUS (YouTube)](https://www.youtube.com/watch?v=RLQbFYt58sY) | AAA, TACACS+, RADIUS из серии Free CCNA |
| [Cisco ISE — Identity Services Engine](https://www.cisco.com/c/en/us/products/security/identity-services-engine/index.html) | Cisco ISE: 802.1X, RADIUS, политики доступа |
