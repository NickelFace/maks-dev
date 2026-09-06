---
title: "CCNA 5.1 Концепции безопасности"
date: 2026-09-08
description: "Триада CIA, типы угроз (malware, DoS, MITM, phishing), L2-атаки и средства защиты, модели безопасности Defense in Depth и Zero Trust, компоненты сетевой безопасности."
tags: ["CCNA", "Cisco", "безопасность", "CIA", "угрозы"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-5-01-security-concepts/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Триада CIA

| Принцип | Название | Описание | Угрозы |
|---|---|---|---|
| C | Confidentiality (Конфиденциальность) | Данные доступны только авторизованным | Перехват, утечка |
| I | Integrity (Целостность) | Данные не изменялись несанкционированно | MITM, подмена |
| A | Availability (Доступность) | Сервисы доступны когда нужно | DoS, DDoS |

---

## Типы угроз и атак

### Вредоносное ПО (Malware)

| Тип | Описание |
|---|---|
| Вирус | Самовоспроизводящийся код, встраивается в программы |
| Червь | Распространяется сам по сети (без носителя) |
| Троян | Скрывается в легитимном ПО |
| Ransomware | Шифрует данные, требует выкуп |
| Spyware | Собирает информацию о пользователе |
| Adware | Показывает рекламу |
| Rootkit | Скрывает своё присутствие в системе |
| Botnet | Сеть заражённых машин (зомби) |

### Сетевые атаки

| Атака | Описание | Защита |
|---|---|---|
| DoS | Перегрузка ресурсов одним источником | Rate limiting, ACL |
| DDoS | Распределённая атака с ботнета | Anti-DDoS, ISP filtering |
| Phishing | Поддельные письма/сайты для кражи данных | Обучение, email filtering |
| Spear Phishing | Целевой фишинг (конкретный человек/компания) | Обучение |
| MITM | Перехват и изменение трафика | Шифрование (TLS), HTTPS |
| Replay Attack | Повторная отправка перехваченных пакетов | Временные метки, nonce |
| Reconnaissance | Сбор информации о цели | IPS, firewall |
| Password Attack | Brute force, словарь | Сложные пароли, lockout |
| Social Engineering | Манипуляция людьми | Обучение персонала |

### L2-атаки

| Атака | Описание | Защита |
|---|---|---|
| MAC Flooding | Заполнение CAM-таблицы → коммутатор работает как хаб | Port Security |
| VLAN Hopping | Обход изоляции VLAN через DTP | Отключить DTP, native VLAN ≠ 1 |
| DHCP Spoofing | Ложный DHCP-сервер | DHCP Snooping |
| ARP Spoofing | Поддельные ARP-ответы (MITM) | Dynamic ARP Inspection (DAI) |
| STP Attack | Стать Root Bridge → перехват трафика | BPDU Guard, Root Guard |

---

## Векторы атак

| Вектор | Описание |
|---|---|
| Email | Фишинг, вредоносные вложения |
| Web | Drive-by download, XSS, SQL injection |
| Сменные носители | USB-флешки с malware |
| Беспроводные сети | Evil twin AP, деаутентификация |
| Физический доступ | Подключение к незащищённому порту |
| Insider threat | Злонамеренный сотрудник |
| Supply chain | Компрометация на этапе поставки |

---

## Защита периметра

### Модели безопасности

| Модель | Описание |
|---|---|
| Defense in Depth | Несколько уровней защиты (периметр, сеть, хост, приложение) |
| Zero Trust | "Никому не доверяй" — каждый запрос аутентифицируется |
| DMZ | Демилитаризованная зона для публичных серверов |

### Компоненты сетевой безопасности

| Компонент | Описание |
|---|---|
| Firewall (межсетевой экран) | Фильтрует трафик по правилам |
| IDS (Intrusion Detection) | Обнаруживает атаки (пассивно) |
| IPS (Intrusion Prevention) | Обнаруживает и блокирует атаки |
| VPN | Зашифрованный туннель через публичную сеть |
| NAC | Network Access Control — проверка состояния хоста |
| SIEM | Security Information & Event Management |

### Парольная политика

| Требование | Рекомендация |
|---|---|
| Длина | Минимум 12–16 символов |
| Сложность | Буквы, цифры, спецсимволы |
| Обновление | Регулярная смена |
| Хранение | Только хэш (bcrypt, PBKDF2) |
| Многофакторность | Пароль + OTP/приложение/биометрия |

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [Cisco Security Concepts — Cisco Learning](https://learningnetwork.cisco.com/s/article/network-security-concepts) | Обзор концепций сетевой безопасности от Cisco |
| [CIA Triad — NIST](https://csrc.nist.gov/glossary/term/cia_triad) | Confidentiality, Integrity, Availability — базовые принципы ИБ |
| [Common Network Threats — networklessons.com](https://networklessons.com/cisco/ccna-200-301/network-security-threats-vulnerabilities-and-countermeasures) | Угрозы: DoS, DDoS, MITM, phishing, malware |
| [Jeremy's IT Lab — Security Concepts (YouTube)](https://www.youtube.com/watch?v=4_-JN1hqCmw) | CIA triad, угрозы, средства защиты из серии Free CCNA |
| [Cisco Cybersecurity Essentials](https://www.cisco.com/c/en/us/products/security/index.html) | Продукты и концепции безопасности Cisco |
| [David Bombal — Network Security Basics (YouTube)](https://www.youtube.com/watch?v=E03gh1PVUGM) | Основы сетевой безопасности: атаки и контрмеры |
