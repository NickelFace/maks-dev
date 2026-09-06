---
title: "CCNA 6.2 REST API"
date: 2026-09-23
description: "REST API: architectural principles, HTTP methods (CRUD), response codes, JSON/XML/YAML data formats, authentication methods, and example requests to Cisco Catalyst Center and IOS-XE RESTCONF."
tags: ["CCNA", "Cisco", "REST API", "JSON", "automation"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-6-02-rest-api/"
---

## What is an API

**API (Application Programming Interface)** is an interface that allows programs to communicate with each other.

**REST API** (RESTful API) is an HTTP-based architectural style for APIs, the standard for interacting with network controllers (Cisco Catalyst Center, APIC, IOS-XE).

---

## REST Principles

| Principle | Description |
|---|---|
| Client-Server | Client and server are separated, communicating through the API |
| Stateless | Each request is independent; the server stores no session state |
| Cacheable | Responses can be cached |
| Uniform Interface | Consistent interface (URI, HTTP methods) |
| Layered System | The client does not know which server it is talking to (may be a proxy) |
| Code on Demand | The server can send executable code (optional) |

---

## HTTP Methods (CRUD)

| HTTP Method | CRUD Operation | Description |
|---|---|---|
| GET | Read | Retrieve a resource (no modification) |
| POST | Create | Create a new resource |
| PUT | Update | Replace a resource entirely |
| PATCH | Update | Partially update a resource |
| DELETE | Delete | Delete a resource |

### HTTP Response Codes

| Range | Meaning |
|:---:|---|
| 2xx | Success (200 OK, 201 Created, 204 No Content) |
| 3xx | Redirection |
| 4xx | Client error (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found) |
| 5xx | Server error (500 Internal Server Error) |

---

## Data Formats

### JSON (JavaScript Object Notation)

Most widely used in REST APIs. Human-readable and compact.

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

Used in NETCONF and older APIs.

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

Used in Ansible playbooks and configuration files.

```yaml
hostname: R1
interfaces:
  - name: GigabitEthernet0/0
    ip: 192.168.1.1
    mask: 255.255.255.0
ospf_enabled: true
```

---

## JSON: Syntax

| Data type | Example |
|---|---|
| String | `"value"` |
| Number | `42` or `3.14` |
| Boolean | `true` or `false` |
| Null | `null` |
| Array | `["a", "b", "c"]` |
| Object | `{"key": "value"}` |

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

## API Authentication

| Method | Description |
|---|---|
| Basic Auth | Base64(username:password) in the header |
| Token | Obtain a token → include in every request |
| API Key | Static key in the header or URL |
| OAuth 2.0 | Delegated authorization |

---

## Example: Cisco Catalyst Center API

```python
import requests
import json

# Base URL
BASE_URL = "https://sandboxdnac.cisco.com"

# 1. Get token (Authentication)
auth_url = f"{BASE_URL}/dna/system/api/v1/auth/token"
response = requests.post(
    auth_url,
    auth=("devnetuser", "Cisco123!"),
    headers={"Content-Type": "application/json"}
)
token = response.json()["Token"]

# 2. Get device list (GET)
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
# GET interface (curl)
curl -X GET \
  "https://192.168.1.1/restconf/data/ietf-interfaces:interfaces" \
  -H "Accept: application/yang-data+json" \
  -u "admin:cisco123" \
  --insecure

# PUT - change hostname
curl -X PUT \
  "https://192.168.1.1/restconf/data/Cisco-IOS-XE-native:native/hostname" \
  -H "Content-Type: application/yang-data+json" \
  -u "admin:cisco123" \
  -d '{"Cisco-IOS-XE-native:hostname": "NewRouter"}' \
  --insecure
```

---

## Resources

| Resource | Description |
|---|---|
| [REST API: Cisco DevNet Learning](https://developer.cisco.com/learning/tracks/netprog-eng/netprog-eng-rest-api/) | Official Cisco DevNet REST API course |
| [HTTP Methods: MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) | GET, POST, PUT, PATCH, DELETE: descriptions and usage |
| [JSON (json.org)](https://www.json.org/json-en.html) | Official JSON format standard |
| [REST API (networklessons.com)](https://networklessons.com/network-automation/introduction-to-rest-api) | REST: principles, HTTP methods, CRUD, status codes |
| [Jeremy's IT Lab: REST APIs (YouTube)](https://www.youtube.com/watch?v=G0RM7eS0vw8) | REST API, JSON, Postman from the Free CCNA series |
| [Cisco Catalyst Center API Reference](https://developer.cisco.com/docs/dna-center/#!api-quick-start) | Intent API and REST endpoints reference for Catalyst Center |
