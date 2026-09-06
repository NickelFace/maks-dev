---
title: "CCNA 4.4 SSH и управление устройствами"
date: 2026-08-31
description: "Настройка SSH v2 на Cisco IOS: генерация RSA-ключей, VTY-линии, управление конфигурацией через TFTP, banner messages и hardening устройств."
tags: ["CCNA", "Cisco", "SSH", "управление", "безопасность"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-4-04-ssh-management/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Telnet vs SSH

| Характеристика | Telnet | SSH |
|---|---|---|
| Порт | TCP 23 | TCP 22 |
| Шифрование | Нет (открытый текст!) | Да (AES и др.) |
| Аутентификация | Пароль | Пароль или ключ |
| Безопасность | Небезопасен | Безопасен |
| Применение | Только в изолированных lab-средах | Production |

> **⚠️ Важно:** Telnet передаёт все данные включая пароли в открытом виде. Никогда не используйте Telnet на production-оборудовании.

---

## Настройка SSH

```bash
# Шаг 1: Установить hostname (не default)
Router(config)# hostname R1

# Шаг 2: Установить domain-name (нужно для генерации ключа)
R1(config)# ip domain-name company.local

# Шаг 3: Создать RSA ключ (минимум 1024, рекомендуется 2048)
R1(config)# crypto key generate rsa general-keys modulus 2048
# или
R1(config)# crypto key generate rsa modulus 2048

# Шаг 4: Создать локальных пользователей
R1(config)# username admin privilege 15 secret cisco123
R1(config)# username operator privilege 1 secret op_pass

# Шаг 5: Настроить VTY-линии
R1(config)# line vty 0 15
R1(config-line)# transport input ssh              # только SSH (блокирует Telnet)
R1(config-line)# login local                      # аутентификация по локальным пользователям
R1(config-line)# exec-timeout 5 0               # отключение при бездействии 5 минут

# Опционально: только SSH версии 2
R1(config)# ip ssh version 2

# Параметры SSH
R1(config)# ip ssh time-out 60                   # таймаут аутентификации (сек)
R1(config)# ip ssh authentication-retries 3      # попыток аутентификации

# Удаление ключей RSA (при смене hostname/domain)
R1(config)# crypto key zeroize rsa
```

---

## Локальные пользователи и пароли

```bash
# Пароль enable (незашифрованный — не использовать)
Router(config)# enable password cisco

# Зашифрованный пароль enable (предпочтительный)
Router(config)# enable secret cisco123

# Шифрование всех паролей в конфигурации
Router(config)# service password-encryption        # тип 7 (слабое шифрование)

# Локальные пользователи
Router(config)# username admin privilege 15 secret cisco123     # полный доступ
Router(config)# username viewer privilege 1 secret view123      # read-only

# Пароль на консоль
Router(config)# line console 0
Router(config-line)# login local                   # или: login + password
Router(config-line)# exec-timeout 10 0            # 10 минут бездействия

# Пароль на VTY (SSH/Telnet)
Router(config)# line vty 0 15
Router(config-line)# login local
Router(config-line)# transport input ssh
Router(config-line)# exec-timeout 5 0
```

---

## Управление конфигурацией

```bash
# Сохранение конфигурации
Router# copy running-config startup-config
Router# write                                      # краткая версия
Router# write memory                               # то же

# Просмотр
Router# show running-config
Router# show startup-config
Router# show version                               # IOS, модель, время работы

# Резервная копия на TFTP
Router# copy running-config tftp
# Адрес TFTP-сервера: 192.168.1.100
# Имя файла: router-backup.cfg

# Восстановление с TFTP
Router# copy tftp running-config

# Сброс конфигурации
Router# erase startup-config                       # очистить NVRAM
Router# reload                                     # перезагрузить

# Работа с Flash
Router# show flash:                                # содержимое flash
Router# dir flash:                                 # то же
Router# show file systems                          # все файловые системы
```

### Banner Messages

```bash
# Banner of the Day (отображается при подключении)
Router(config)# banner motd # Authorized Access Only! #

# Banner Login (перед приглашением логина)
Router(config)# banner login # Company R1. Unauthorized access is prohibited. #

# Banner Exec (после успешного входа)
Router(config)# banner exec # Welcome to R1. Have a nice day. #
```

---

## Отключение ненужных сервисов

```bash
# Отключить ненужные сервисы (hardening)
Router(config)# no ip http server                   # HTTP GUI (небезопасен)
Router(config)# no ip http secure-server            # HTTPS GUI
Router(config)# no service finger
Router(config)# no service tcp-small-servers
Router(config)# no service udp-small-servers
Router(config)# no cdp run                          # CDP (если не нужен)
Router(config)# no ip source-route
Router(config)# no ip proxy-arp
Router(config)# no ip directed-broadcast
```

---

## Проверка

```bash
# SSH
Router# show ip ssh                        # версия SSH, настройки
Router# show ssh                           # активные SSH-сессии
Router# show users                         # все активные пользователи

# Конфигурация линий
Router# show line                          # все линии
Router# show line vty 0 4                  # VTY линии

# Проверка подключения (с другого устройства)
PC> ssh -l admin 192.168.1.1
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [RFC 4251 — SSH Protocol Architecture](https://www.rfc-editor.org/rfc/rfc4251) | Архитектура протокола SSH 2.0 |
| [SSH Configuration on Cisco — Cisco](https://www.cisco.com/c/en/us/support/docs/security-vpn/secure-shell-ssh/4145-ssh.html) | Официальная инструкция по настройке SSH v2 на Cisco IOS |
| [SSH — networklessons.com](https://networklessons.com/system-management/configure-ssh-cisco-ios) | SSH v2: RSA ключи, VTY, настройка и диагностика |
| [TFTP vs FTP vs SCP — networklessons.com](https://networklessons.com/cisco/ccna-routing-switching-icnd2-200-105/tftp-and-ftp) | Сравнение методов управления файлами: TFTP, FTP, SCP |
| [Jeremy's IT Lab — SSH Management (YouTube)](https://www.youtube.com/watch?v=jT5jdqkbqsc) | SSH, управление устройствами, резервное копирование IOS |
| [Cisco IOS File System](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/configuration/xe-16/fundamentals-xe-16-book/cf-file-mgmt.html) | Файловая система IOS: flash, TFTP, копирование конфигурации |
