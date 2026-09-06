---
title: "CCNA 4.3 SNMP и Syslog"
date: 2026-08-28
description: "SNMP v1/v2c/v3: операции Get/Trap/Inform, настройка community strings и SNMPv3 с шифрованием; Syslog: уровни severity 0–7, формат сообщений и настройка логирования на Cisco IOS."
tags: ["CCNA", "Cisco", "SNMP", "Syslog", "мониторинг"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-4-03-snmp-syslog/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## SNMP

### Принцип работы

**SNMP (Simple Network Management Protocol)** — протокол мониторинга и управления сетевыми устройствами.

| Компонент | Описание |
|---|---|
| SNMP Manager (NMS) | Станция управления сетью (Cisco Prime, SolarWinds) |
| SNMP Agent | Программа на устройстве (маршрутизатор, коммутатор) |
| MIB | Management Information Base — база данных объектов |
| OID | Object Identifier — уникальный идентификатор объекта в MIB |

### Версии SNMP

| Версия | Безопасность | Аутентификация | Шифрование |
|---|---|---|---|
| SNMPv1 | Нет | Community string (открытый текст) | Нет |
| SNMPv2c | Нет | Community string (открытый текст) | Нет |
| SNMPv3 | Да | Пользователи + MD5/SHA | AES/DES |

> **📌 Обратите внимание:** Для production — только **SNMPv3** с аутентификацией и шифрованием. SNMPv1/v2c передают community string открытым текстом.

### Операции SNMP

| Операция | Описание | Порт |
|---|---|---|
| Get | NMS читает значение у агента | UDP 161 |
| GetNext | NMS читает следующий объект | UDP 161 |
| GetBulk | Массовое чтение (SNMPv2/v3) | UDP 161 |
| Set | NMS устанавливает значение у агента | UDP 161 |
| Trap | Агент отправляет уведомление NMS (unsolicited) | UDP 162 |
| Inform | Как Trap, но с подтверждением (SNMPv2/v3) | UDP 162 |

### Настройка SNMPv2c

```bash
# Только чтение (read-only)
Router(config)# snmp-server community PUBLIC ro                   # read-only
Router(config)# snmp-server community PRIVATE rw                  # read-write (осторожно!)

# С ограничением по ACL
Router(config)# access-list 10 permit 192.168.1.100
Router(config)# snmp-server community PUBLIC ro 10

# Контактная информация
Router(config)# snmp-server location "Server Room, Rack 3"
Router(config)# snmp-server contact admin@company.com

# Traps (уведомления)
Router(config)# snmp-server host 192.168.1.100 version 2c PUBLIC
Router(config)# snmp-server enable traps                          # все traps
Router(config)# snmp-server enable traps snmp linkdown linkup     # только link
Router(config)# snmp-server enable traps ospf                     # OSPF события
```

### Настройка SNMPv3

```bash
# Создать группу
Router(config)# snmp-server group MGMT_GROUP v3 priv

# Создать пользователя
Router(config)# snmp-server user ADMIN MGMT_GROUP v3 auth sha cisco123 priv aes 128 cisco456

# Отправка трапов
Router(config)# snmp-server host 192.168.1.100 version 3 priv ADMIN
```

### Проверка SNMP

```bash
Router# show snmp                          # общий статус
Router# show snmp community               # community strings
Router# show snmp group                   # SNMPv3 группы
Router# show snmp user                    # SNMPv3 пользователи
Router# show snmp host                    # адреса trap-получателей
```

---

## Syslog

### Принцип работы

**Syslog** — стандарт для отправки системных сообщений на сервер журналов. UDP порт 514 (по умолчанию), TCP 6514 (защищённый).

### Уровни серьёзности Syslog

| Уровень | Название | Описание |
|:---:|---|---|
| 0 | Emergencies | Система непригодна к работе |
| 1 | Alerts | Требуется немедленное действие |
| 2 | Critical | Критические условия |
| 3 | Errors | Ошибки |
| 4 | Warnings | Предупреждения |
| 5 | Notifications | Нормальное, но значимое |
| 6 | Informational | Информационные сообщения |
| 7 | Debugging | Отладка |

> **💡 Совет:** Мнемоника: **E**very **A**wesome **C**isco **E**ngineer **W**ill **N**eed **I**ce **D**aily
> (Emergencies, Alerts, Critical, Errors, Warnings, Notifications, Informational, Debugging)

### Формат Syslog-сообщения

```
%FACILITY-SEVERITY-MNEMONIC: Message text
%OSPF-5-ADJCHG: Process 1, Nbr 2.2.2.2 on Gi0/0 from LOADING to FULL
```

| Поле | Описание |
|---|---|
| FACILITY | Компонент (OSPF, SYS, LINK) |
| SEVERITY | Уровень серьёзности (0–7) |
| MNEMONIC | Код события |
| Message | Текст сообщения |

### Настройка Syslog

```bash
# Логирование на консоль (по умолчанию — все уровни)
Router(config)# logging console debugging                  # 0-7 на консоль
Router(config)# no logging console                        # отключить

# Логирование в буфер (RAM)
Router(config)# logging buffered 64000                    # размер буфера в байтах
Router(config)# logging buffered warnings                  # уровень и выше

# Логирование на Syslog-сервер
Router(config)# logging host 192.168.1.200
Router(config)# logging trap informational                 # уровень 6 и выше
Router(config)# logging source-interface loopback 0        # исходный интерфейс

# Временные метки в логах
Router(config)# service timestamps log datetime msec       # миллисекунды
Router(config)# service timestamps log datetime localtime  # локальное время

# Logging synchronous (не прерывать ввод команд)
Router(config)# line console 0
Router(config-line)# logging synchronous
```

### Просмотр логов

```bash
Router# show logging                      # буфер логов + настройки
Router# show logging | include OSPF       # фильтрация по слову
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [RFC 3411 — SNMPv3 Framework](https://www.rfc-editor.org/rfc/rfc3411) | Архитектура SNMP v3: USM, View-based Access Control |
| [RFC 5424 — Syslog Protocol](https://www.rfc-editor.org/rfc/rfc5424) | Стандарт Syslog: форматы сообщений, уровни severity 0–7 |
| [SNMP — networklessons.com](https://networklessons.com/system-management/introduction-to-snmp) | SNMP v1/v2c/v3: OID, MIB, trap, community strings |
| [Syslog — networklessons.com](https://networklessons.com/system-management/cisco-ios-syslog-messages) | Syslog severity levels, настройка logging на Cisco IOS |
| [Jeremy's IT Lab — SNMP (YouTube)](https://www.youtube.com/watch?v=vDkBAdDFiYI) | SNMP v1/v2c/v3, MIB, OID, trap из серии Free CCNA |
| [Cisco SNMP Configuration Guide](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/configuration/xe-16/snmp-xe-16-book/nm-snmp-cfg-snmp-support.html) | Официальная документация по настройке SNMP на Cisco IOS |
