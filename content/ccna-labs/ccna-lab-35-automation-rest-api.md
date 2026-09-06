---
title: "Lab 35 · Automation, REST APIs and Controllers"
date: 2026-09-06
description: "JSON, REST verbs, a token-authenticated API call against DNA Center, and where Ansible, Puppet and Chef differ — the 10% of the blueprint that is nothing like the other 90%."
tags: ["CCNA", "Automation", "REST API", "JSON", "SDN", "Lab"]
categories: ["CCNA"]
domain: 6
tool: "Packet Tracer / Postman"
duration: "45 min"
sources: "Jeremy's IT Lab Day 59–63"
---

Domain 6 is worth 10% of the exam and looks nothing like the rest of it. There is very little to configure — the questions are about reading a JSON payload, knowing which HTTP verb does what, and being able to say why a controller-based network differs from a box-by-box one.

This lab is therefore more reading than typing, and it is the cheapest 10% on the blueprint if you spend an hour on it.

## Objectives

- Read and validate JSON, and distinguish it from XML and YAML at a glance
- Map the four CRUD operations onto HTTP verbs and recognise the common status codes
- Authenticate against a REST API and make an authenticated call
- Separate the control plane from the data plane and explain what SDN moves
- Compare Ansible, Puppet and Chef on agent, push/pull and language

---

## Part 1 — Data formats

{{< step num="1" dev="—" title="JSON, and the four things that break it" open="true" >}}
```json
{
  "device": {
    "hostname": "R1",
    "platform": "ISR4331",
    "uptime_days": 412,
    "managed": true,
    "location": null,
    "interfaces": [
      { "name": "GigabitEthernet0/0/0", "ip": "10.0.1.1", "enabled": true },
      { "name": "GigabitEthernet0/0/1", "ip": "10.0.12.1", "enabled": false }
    ]
  }
}
```

Six data types, and only six:

| Type | Syntax |
|---|---|
| string | `"R1"` — **double quotes, always** |
| number | `412` — no quotes |
| boolean | `true` / `false` — **lowercase, no quotes** |
| null | `null` — lowercase |
| **object** | `{ }` — unordered key/value pairs |
| **array** | `[ ]` — ordered list |

The exam tests structure recognition. `{` opens an **object**, `[` opens an **array** — and questions routinely ask how many of each a snippet contains, or what type a particular value is.

The four ways to break it:

1. **A trailing comma** after the last element. Legal in JavaScript, invalid in JSON.
2. **Single quotes.** JSON requires double quotes on both keys and string values.
3. **Unquoted keys.** `{device: "R1"}` is JavaScript, not JSON.
4. **`True` instead of `true`.** Python's capitalisation is not JSON's.

Validate before sending:

```bash
echo '{"hostname":"R1","uptime":412}' | python3 -m json.tool
```
{{< /step >}}

{{< step num="2" dev="—" title="The same data in XML and YAML" >}}
**XML** — verbose, tag-based, and what NETCONF uses:

```xml
<device>
  <hostname>R1</hostname>
  <platform>ISR4331</platform>
  <uptime_days>412</uptime_days>
  <managed>true</managed>
  <interfaces>
    <interface>
      <name>GigabitEthernet0/0/0</name>
      <ip>10.0.1.1</ip>
    </interface>
  </interfaces>
</device>
```

Every element needs an opening and a closing tag, which is roughly double the bytes of the equivalent JSON. It supports attributes, namespaces and schema validation, which is why NETCONF chose it.

**YAML** — whitespace-significant, and what Ansible playbooks are written in:

```yaml
device:
  hostname: R1
  platform: ISR4331
  uptime_days: 412
  managed: true
  location: null
  interfaces:
    - name: GigabitEthernet0/0/0
      ip: 10.0.1.1
      enabled: true
    - name: GigabitEthernet0/0/1
      ip: 10.0.12.1
      enabled: false
```

**`- ` starts a list item; indentation defines nesting; tabs are illegal.** YAML is a superset of JSON, so any valid JSON is valid YAML.

Recognising them at a glance is the actual exam skill:

| Format | Tell |
|---|---|
| JSON | `{` `}` `[` `]` and `"quoted keys":` |
| XML | `<tags>` `</tags>` |
| YAML | indentation, `key: value`, `- ` for lists |

| | JSON | XML | YAML |
|---|---|---|---|
| Human-readable | good | poor | **best** |
| Verbose | medium | **high** | low |
| Comments | **no** | yes | **yes (`#`)** |
| Used by | **REST APIs** | **NETCONF** | **Ansible** |
{{< /step >}}

---

## Part 2 — REST

{{< step num="3" dev="—" title="Six constraints, four verbs, five status classes" open="true" >}}
A REST API is one that satisfies six architectural constraints, of which two are worth remembering:

**Stateless** — every request carries everything needed to serve it. The server keeps no session, which is why an authentication token is sent on every single call.

**Client–server** — the two evolve independently behind a stable interface.

The others are uniform interface, cacheable, layered system, and code-on-demand (optional).

The verbs, mapped to CRUD:

| Verb | CRUD | Idempotent | Typical use |
|---|---|---|---|
| **GET** | Read | **yes** | fetch a device list |
| **POST** | Create | **no** | create a new object |
| **PUT** | Update (replace) | **yes** | replace an object wholesale |
| **PATCH** | Update (partial) | no | change one field |
| **DELETE** | Delete | **yes** | remove an object |

**Idempotent** means running it repeatedly has the same effect as running it once. GET, PUT and DELETE are; POST is not — five identical POSTs create five objects. That is why a retry after a timeout is safe for PUT and dangerous for POST.

Status codes, by first digit:

| Class | Meaning | The ones to know |
|---|---|---|
| **2xx** | success | **200 OK**, **201 Created**, 204 No Content |
| 3xx | redirection | 301 Moved, 304 Not Modified |
| **4xx** | **client error — your fault** | **400** Bad Request, **401** Unauthorized, **403** Forbidden, **404** Not Found |
| **5xx** | **server error — their fault** | **500** Internal Server Error, 503 Service Unavailable |

The distinction the exam tests is **4xx versus 5xx**: a 4xx means fix your request, a 5xx means the request was fine and the server failed.

And **401 versus 403**: 401 means "I do not know who you are" — the token is missing or expired. 403 means "I know exactly who you are and you may not do this".
{{< /step >}}

{{< step num="4" dev="—" title="Authenticate, then call" >}}
Almost every network API uses the same two-step pattern: exchange credentials for a token, then present the token on every subsequent request.

**Step 1 — get a token.** DNA Center's sandbox:

```bash
curl -k -X POST \
  -u "devnetuser:Cisco123!" \
  https://sandboxdnac.cisco.com/dna/system/api/v1/auth/token
```

```json
{
  "Token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1ZTh..."
}
```

**Step 2 — use it.**

```bash
curl -k -X GET \
  -H "X-Auth-Token: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  https://sandboxdnac.cisco.com/dna/intent/api/v1/network-device
```

```json
{
  "response": [
    {
      "hostname": "leaf1.abc.inc",
      "managementIpAddress": "10.10.20.81",
      "platformId": "C9300-24U",
      "softwareVersion": "16.9.3",
      "reachabilityStatus": "Reachable",
      "id": "6bc9e3e6-7ba0-4e2a-93b0-e4e1a4c1e123"
    }
  ],
  "version": "1.0"
}
```

Anatomy of the URL:

```
https://sandboxdnac.cisco.com/dna/intent/api/v1/network-device?family=Switches
└─┬─┘   └────────┬──────────┘└──────────┬──────────────────┘ └───────┬──────┘
scheme        host                    path                     query string
```

The headers that matter:

| Header | Purpose |
|---|---|
| `Content-Type` | the format of the body you are **sending** |
| `Accept` | the format you want **back** |
| `Authorization` / `X-Auth-Token` | credentials |

**Always HTTPS.** An API token sent over HTTP is a credential in cleartext, and it usually grants more than one user's password would.

The same thing in Python, which is what an actual script looks like:

```python
import requests
from requests.auth import HTTPBasicAuth

BASE = "https://sandboxdnac.cisco.com"

token = requests.post(
    f"{BASE}/dna/system/api/v1/auth/token",
    auth=HTTPBasicAuth("devnetuser", "Cisco123!"),
    verify=False,
).json()["Token"]

devices = requests.get(
    f"{BASE}/dna/intent/api/v1/network-device",
    headers={"X-Auth-Token": token},
    verify=False,
).json()

for d in devices["response"]:
    print(f"{d['hostname']:<28} {d['managementIpAddress']:<16} {d['softwareVersion']}")
```

`verify=False` disables certificate checking and is acceptable against a sandbox with a self-signed certificate. It is not acceptable anywhere else.
{{< /step >}}

---

## Part 3 — SDN and controllers

{{< step num="5" dev="—" title="Which plane does what, and what SDN moves" open="true" >}}
Every network device has three logical planes:

| Plane | Job | Examples |
|---|---|---|
| **Management** | how you configure and monitor it | SSH, SNMP, syslog, NETCONF |
| **Control** | **decides** where traffic should go | OSPF, BGP, STP, ARP — builds the tables |
| **Data (forwarding)** | **moves** the packets | ASIC lookups against those tables |

Traditionally all three live on every device: each router runs its own OSPF, builds its own table, forwards its own packets.

**SDN centralises the control plane.** A controller computes the forwarding state for the whole network and pushes it down; devices become forwarding engines executing someone else's decisions.

The two interfaces you must be able to name and place:

| Interface | Direction | Between | Protocols |
|---|---|---|---|
| **Northbound (NBI)** | **up** | controller ↔ applications | **REST APIs** — JSON over HTTPS |
| **Southbound (SBI)** | **down** | controller ↔ devices | **NETCONF, RESTCONF, OpenFlow, SNMP, CLI** |

**Northbound is where your automation script talks.** Southbound is how the controller talks to the boxes. The direction is from the controller's point of view, which is the mnemonic worth holding on to: applications are "above" the controller, devices are "below" it.

The three management protocols:

| | NETCONF | RESTCONF | SNMP |
|---|---|---|---|
| Transport | **SSH (830)** | **HTTPS (443)** | UDP 161/162 |
| Encoding | **XML** | **JSON or XML** | BER |
| Data model | **YANG** | **YANG** | MIB |
| Config changes | **yes, transactional** | yes | rarely used |
| Rollback | **yes** | limited | no |

**NETCONF's transactional model is the real advance.** A configuration change is validated, applied and committed as a unit — and rolled back entirely if any part fails. That is not possible over the CLI, where a script that dies halfway leaves the device in a state nobody designed.

**YANG** is the modelling language both use to define what a valid configuration looks like — the schema against which NETCONF and RESTCONF payloads are validated.

Cisco's controller products, and which domain each covers:

| Product | Domain |
|---|---|
| **DNA Center** | campus LAN and wireless — SD-Access |
| **vManage** | WAN — SD-WAN (Viptela) |
| **ACI / APIC** | data centre |
| **Meraki Dashboard** | cloud-managed everything |
{{< /step >}}

{{< step num="6" dev="—" title="Ansible, Puppet and Chef" >}}
| | **Ansible** | **Puppet** | **Chef** |
|---|---|---|---|
| Agent on the device | **no — agentless** | **yes** | **yes** |
| Transport | **SSH / NETCONF** | TCP 8140 | TCP 10002 |
| Model | **push** | **pull** | **pull** |
| Language | **YAML** | Puppet DSL | **Ruby** |
| Files called | **playbooks** | manifests | recipes / cookbooks |
| Network gear | **the practical choice** | limited | limited |

**Ansible is the one used on network equipment, and the reason is the first row.** Network devices generally cannot run a third-party agent — there is nowhere to install it and no supported way to do so. Ansible needs nothing on the device beyond SSH, which every switch already has.

A playbook is readable even if you have never written one, which is the other half of the argument:

```yaml
---
- name: Configure loopbacks and OSPF
  hosts: routers
  gather_facts: no
  connection: network_cli

  tasks:
    - name: Set the loopback address
      ios_config:
        lines:
          - ip address {{ loopback_ip }} 255.255.255.255
        parents: interface Loopback0

    - name: Advertise it in OSPF area 0
      ios_config:
        lines:
          - network {{ loopback_ip }} 0.0.0.0 area 0
        parents: router ospf 1

    - name: Save
      ios_command:
        commands: write memory
```

`{{ loopback_ip }}` is a variable from the inventory, so one playbook configures every router with its own address.

The property that makes this safe is **idempotency**: `ios_config` compares the intended lines against the running configuration and only sends what differs. Running the playbook twice changes nothing the second time — which means it is safe to run on a schedule to enforce a standard, not just once to apply it.

**Configuration drift** is what all of this is for. Thirty switches configured by hand over three years are thirty slightly different switches, and the differences are invisible until one of them behaves oddly at 3 a.m. A playbook run nightly makes the intended state the actual state, and reports on anything that has moved.
{{< /step >}}

---

## What to expect on the exam

Domain 6 questions cluster into four shapes:

**Read a JSON snippet.** How many objects, how many arrays, what type is this value, is this valid.

**Match a verb to an action.** "Which HTTP method retrieves data without modifying it?" — GET.

**Interpret a status code.** 401 versus 403, 4xx versus 5xx.

**Place a component.** Northbound or southbound; control plane or data plane; agent-based or agentless.

There is almost no configuration. The syllabus asks you to **recognise and interpret**, not to build — which is exactly why an hour spent on the tables above is the best-value hour on the whole blueprint.

---

## Exam notes

- JSON types: **string, number, boolean, null, object `{}`, array `[]`**. Double quotes only, no trailing commas, lowercase `true`/`false`/`null`.
- **XML** = tags, used by NETCONF. **YAML** = indentation and `- `, used by Ansible. YAML is a superset of JSON.
- REST is **stateless** — every request carries its own credentials.
- **GET** read, **POST** create, **PUT** replace, **PATCH** modify, **DELETE** remove. GET, PUT and DELETE are **idempotent**; POST is not.
- **2xx** success (200 OK, 201 Created), **4xx** client error (**401** unauthenticated, **403** forbidden, 404 not found), **5xx** server error.
- Planes: **management** (configure), **control** (decide), **data** (forward). SDN centralises the **control** plane.
- **Northbound = REST, controller to applications. Southbound = NETCONF/RESTCONF/OpenFlow, controller to devices.**
- **NETCONF**: SSH **830**, XML, YANG, transactional. **RESTCONF**: HTTPS **443**, JSON or XML, YANG.
- **Ansible is agentless, push-based, YAML** — the practical choice for network devices. Puppet and Chef are agent-based and pull-based.
- Playbooks are **idempotent**: safe to run repeatedly, which is what makes them useful against configuration drift.

---

*Sources: Jeremy's IT Lab Day 59–63 · Cisco DevNet Sandbox · verified against the DNA Center Always-On sandbox.*
