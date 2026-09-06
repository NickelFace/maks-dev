---
title: "CCNA 1.4 TCP и UDP"
date: 2026-07-09
description: "Сравнение протоколов TCP и UDP, трёхэтапное рукопожатие, управление потоком, таблица общеизвестных портов и команды диагностики."
tags: ["CCNA", "Cisco", "TCP", "UDP", "транспортный уровень"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-1-04-tcp-udp/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## TCP vs UDP

| Характеристика | TCP | UDP |
|---|---|---|
| Надёжность | Да (подтверждения, повтор) | Нет |
| Установка соединения | Да (трёхэтапное рукопожатие) | Нет |
| Упорядочивание | Да (порядковые номера) | Нет |
| Управление потоком | Да (окно, windowing) | Нет |
| Скорость | Медленнее | Быстрее |
| Использование | HTTP, SSH, FTP, SMTP, Telnet | DNS, DHCP, TFTP, VoIP, SNMP |

---

## TCP — детали

### Трёхэтапное рукопожатие (Three-Way Handshake)

```
Клиент                    Сервер
  │──── SYN ────────────►│   Клиент предлагает ISN (Initial Seq. Number)
  │◄─── SYN-ACK ─────────│   Сервер подтверждает и предлагает свой ISN
  │──── ACK ────────────►│   Клиент подтверждает
  │                       │
  │    ДАННЫЕ             │
  │◄──────────────────────│
```

### Заголовок TCP (ключевые поля)

| Поле | Описание |
|---|---|
| Source Port | Порт отправителя (1–65535) |
| Destination Port | Порт получателя |
| Sequence Number | Порядковый номер байта |
| Acknowledgment Number | Следующий ожидаемый байт |
| Window Size | Размер окна приёма |
| Flags | SYN, ACK, FIN, RST, PSH, URG |

### Управление потоком

- **Windowing** — получатель сообщает размер буфера, отправитель не превышает его
- **Slow Start** — начинает с малого окна, увеличивает при успешной передаче
- **Congestion Avoidance** — снижает окно при потере пакетов

### Закрытие соединения (Four-Way)

```
Клиент ──── FIN ────────► Сервер
Клиент ◄─── ACK ───────── Сервер
Клиент ◄─── FIN ───────── Сервер
Клиент ──── ACK ────────► Сервер
```

---

## UDP — детали

### Заголовок UDP

| Поле | Размер |
|---|---|
| Source Port | 16 бит |
| Destination Port | 16 бит |
| Length | 16 бит |
| Checksum | 16 бит |

Всего 8 байт — минимальный заголовок.

> **💡 Совет:** UDP используют приложения, которые сами реализуют надёжность (DNS повторяет запрос при таймауте) или для которых задержка важнее доставки (VoIP, видео).

---

## Общеизвестные порты

| Порт | Протокол | Транспорт | Описание |
|:---:|---|:---:|---|
| 20 | FTP-data | TCP | Данные FTP |
| 21 | FTP | TCP | Управление FTP |
| 22 | SSH | TCP | Безопасный shell |
| 23 | Telnet | TCP | Удалённый shell (незащищённый) |
| 25 | SMTP | TCP | Электронная почта (отправка) |
| 53 | DNS | TCP/UDP | Разрешение имён |
| 67/68 | DHCP | UDP | 67 = сервер, 68 = клиент |
| 69 | TFTP | UDP | Простая передача файлов |
| 80 | HTTP | TCP | Веб (незашифрованный) |
| 110 | POP3 | TCP | Получение почты |
| 123 | NTP | UDP | Синхронизация времени |
| 143 | IMAP | TCP | Получение почты (IMAP) |
| 161/162 | SNMP | UDP | 161 = агент, 162 = трапы |
| 443 | HTTPS | TCP | Веб (HTTPS/TLS) |
| 514 | Syslog | UDP | Системные журналы |

> **📌 Обратите внимание:** Порты 0–1023 — **well-known** (зарезервированы для серверов)
> Порты 1024–49151 — **registered** (приложения)
> Порты 49152–65535 — **dynamic/ephemeral** (клиентские соединения)

---

## Команды диагностики

```bash
# На хосте (Linux/Windows)
netstat -an                  # активные соединения и порты
ss -tulnp                    # сокеты (Linux)

# На Cisco IOS
Router# show tcp brief       # активные TCP-соединения
Router# show udp             # активные UDP-сессии
Router# show ip socket       # все открытые сокеты

# Проверка связи
Router# ping 192.168.1.1               # ICMP echo
Router# ping 192.168.1.1 repeat 100    # 100 пакетов
Router# traceroute 8.8.8.8            # трассировка маршрута

# Расширенный ping (из Privileged EXEC)
Router# ping
Protocol [ip]:
Target IP address: 192.168.1.1
Repeat count [5]: 100
Datagram size [100]: 1500
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [RFC 793 — TCP](https://www.rfc-editor.org/rfc/rfc793) | Оригинальная спецификация TCP: 3-way handshake, flow control, windowing |
| [RFC 768 — UDP](https://www.rfc-editor.org/rfc/rfc768) | Оригинальная спецификация UDP |
| [TCP vs UDP — networklessons.com](https://networklessons.com/network-fundamentals/introduction-to-tcp-and-udp) | Сравнение TCP и UDP, когда использовать каждый |
| [TCP Three-Way Handshake — networklessons.com](https://networklessons.com/cisco/ccna-routing-switching-icnd1-100-105/tcp-three-way-handshake) | Детальное объяснение процесса установки соединения TCP |
| [Jeremy's IT Lab — OSI Model & TCP/IP Suite (YouTube)](https://www.youtube.com/watch?v=t-ai8JzhHuY) | TCP, UDP, порты и сокеты из серии Free CCNA |
| [Well-Known Port Numbers — IANA](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml) | Официальный реестр номеров портов IANA |
