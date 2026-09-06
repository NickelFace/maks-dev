---
title: "CCNA 6.2 REST API"
date: 2026-09-23
description: "REST API: принципы архитектуры, HTTP-методы (CRUD), коды ответов, форматы данных JSON/XML/YAML, методы аутентификации и примеры запросов к Cisco Catalyst Center и IOS-XE RESTCONF."
tags: ["CCNA", "Cisco", "REST API", "JSON", "автоматизация"]
categories: ["CCNA"]
page_lang: "ru"
lang_pair: "/posts/ccna/ccna-6-02-rest-api/"
pagefind_ignore: true
build:
  list: never
  render: always
---

## Что такое API

**API (Application Programming Interface)** — интерфейс, позволяющий программам взаимодействовать друг с другом.

**REST API** (RESTful API) — архитектурный стиль API на базе HTTP, стандарт взаимодействия с сетевыми контроллерами (Cisco Catalyst Center, APIC, IOS-XE).

---

## REST принципы

| Принцип | Описание |
|---|---|
| Client-Server | Клиент и сервер разделены, взаимодействуют через API |
| Stateless | Каждый запрос независим, сервер не хранит состояние сессии |
| Cacheable | Ответы могут кэшироваться |
| Uniform Interface | Единообразный интерфейс (URI, HTTP методы) |
| Layered System | Клиент не знает, с каким сервером общается (может быть прокси) |
| Code on Demand | Сервер может передавать исполняемый код (опционально) |

---

## HTTP методы (CRUD)

| HTTP Метод | CRUD операция | Описание |
|---|---|---|
| GET | Read | Получить ресурс (не изменяет) |
| POST | Create | Создать новый ресурс |
| PUT | Update | Заменить ресурс целиком |
| PATCH | Update | Частично обновить ресурс |
| DELETE | Delete | Удалить ресурс |

### Коды ответов HTTP

| Диапазон | Значение |
|:---:|---|
| 2xx | Успех (200 OK, 201 Created, 204 No Content) |
| 3xx | Перенаправление |
| 4xx | Ошибка клиента (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found) |
| 5xx | Ошибка сервера (500 Internal Server Error) |

---

## Форматы данных

### JSON (JavaScript Object Notation)

Наиболее распространён в REST API. Читаем, компактен.

```json
{
  "hostname": "R1",
  "interfaces": [
    {
      "name": "GigabitEthernet0/0",
      "ip": "192.168.1.1",
      "mask": "255.255.255.0",
      "status": "up"
    },
    {
      "name": "GigabitEthernet0/1",
      "ip": "10.0.0.1",
      "mask": "255.255.255.252",
      "status": "up"
    }
  ],
  "ospf_enabled": true,
  "description": null
}
```

### XML (Extensible Markup Language)

Используется в NETCONF, старых API.

```xml
<device>
  <hostname>R1</hostname>
  <interface>
    <name>GigabitEthernet0/0</name>
    <ip>192.168.1.1</ip>
  </interface>
</device>
```

### YAML (YAML Ain't Markup Language)

Используется в Ansible playbooks, конфигурационных файлах.

```yaml
hostname: R1
interfaces:
  - name: GigabitEthernet0/0
    ip: 192.168.1.1
    mask: 255.255.255.0
ospf_enabled: true
```

---

## JSON — синтаксис

| Тип данных | Пример |
|---|---|
| Строка | `"value"` |
| Число | `42` или `3.14` |
| Булево | `true` или `false` |
| Null | `null` |
| Массив | `["a", "b", "c"]` |
| Объект | `{"key": "value"}` |

```json
{
  "string": "hello",
  "number": 42,
  "float": 3.14,
  "boolean": true,
  "null_value": null,
  "array": [1, 2, 3],
  "nested": {
    "key": "value"
  }
}
```

---

## Аутентификация API

| Метод | Описание |
|---|---|
| Basic Auth | Base64(username:password) в заголовке |
| Token | Получить токен → использовать в каждом запросе |
| API Key | Статический ключ в заголовке или URL |
| OAuth 2.0 | Делегированная авторизация |

---

## Пример: Cisco Catalyst Center API

```python
import requests
import json

# Базовый URL
BASE_URL = "https://sandboxdnac.cisco.com"

# 1. Получить токен (Authentication)
auth_url = f"{BASE_URL}/dna/system/api/v1/auth/token"
response = requests.post(
    auth_url,
    auth=("devnetuser", "Cisco123!"),
    headers={"Content-Type": "application/json"}
)
token = response.json()["Token"]

# 2. Получить список устройств (GET)
devices_url = f"{BASE_URL}/dna/intent/api/v1/network-device"
headers = {
    "x-auth-token": token,
    "Content-Type": "application/json"
}
devices = requests.get(devices_url, headers=headers)
print(json.dumps(devices.json(), indent=2))
```

### Cisco IOS-XE RESTCONF

```bash
# GET интерфейс (curl)
curl -X GET \
  "https://192.168.1.1/restconf/data/ietf-interfaces:interfaces" \
  -H "Accept: application/yang-data+json" \
  -u "admin:cisco123" \
  --insecure

# PUT — изменить hostname
curl -X PUT \
  "https://192.168.1.1/restconf/data/Cisco-IOS-XE-native:native/hostname" \
  -H "Content-Type: application/yang-data+json" \
  -u "admin:cisco123" \
  -d '{"Cisco-IOS-XE-native:hostname": "NewRouter"}' \
  --insecure
```

---

## Ресурсы

| Ресурс | Описание |
|---|---|
| [REST API — Cisco DevNet Learning](https://developer.cisco.com/learning/tracks/netprog-eng/netprog-eng-rest-api/) | Официальный курс Cisco DevNet по REST API |
| [HTTP Methods — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) | GET, POST, PUT, PATCH, DELETE: описание и применение |
| [JSON — json.org](https://www.json.org/json-en.html) | Официальный стандарт формата JSON |
| [REST API — networklessons.com](https://networklessons.com/network-automation/introduction-to-rest-api) | REST: принципы, HTTP методы, CRUD, статус-коды |
| [Jeremy's IT Lab — REST APIs (YouTube)](https://www.youtube.com/watch?v=G0RM7eS0vw8) | REST API, JSON, Postman из серии Free CCNA |
| [Cisco Catalyst Center API Reference](https://developer.cisco.com/docs/dna-center/#!api-quick-start) | Справочник по Intent API и REST endpoints Catalyst Center |
