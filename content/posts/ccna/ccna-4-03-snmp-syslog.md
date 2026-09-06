---
title: "CCNA 4.3 SNMP and Syslog"
date: 2026-08-28
description: "SNMP v1/v2c/v3: Get/Trap/Inform operations, community string configuration and SNMPv3 with encryption; Syslog: severity levels 0–7, message format and logging configuration on Cisco IOS."
tags: ["CCNA", "Cisco", "SNMP", "Syslog", "monitoring"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-4-03-snmp-syslog/"
---

## SNMP

### How It Works

**SNMP (Simple Network Management Protocol)**: protocol for monitoring and managing network devices.

| Component | Description |
|---|---|
| SNMP Manager (NMS) | Network management station (Cisco Prime, SolarWinds) |
| SNMP Agent | Software on the device (router, switch) |
| MIB | Management Information Base: object database |
| OID | Object Identifier: unique object identifier in MIB |

### SNMP Versions

| Version | Security | Authentication | Encryption |
|---|---|---|---|
| SNMPv1 | No | Community string (plaintext) | No |
| SNMPv2c | No | Community string (plaintext) | No |
| SNMPv3 | Yes | Users + MD5/SHA | AES/DES |

> **📌 Important:** For production; use **SNMPv3** with authentication and encryption only. SNMPv1/v2c send community strings in plaintext.

### SNMP Operations

| Operation | Description | Port |
|---|---|---|
| Get | NMS reads a value from agent | UDP 161 |
| GetNext | NMS reads next object | UDP 161 |
| GetBulk | Bulk read (SNMPv2/v3) | UDP 161 |
| Set | NMS sets a value on agent | UDP 161 |
| Trap | Agent sends unsolicited notification to NMS | UDP 162 |
| Inform | Like Trap, but with acknowledgment (SNMPv2/v3) | UDP 162 |

### Configuring SNMPv2c

```bash
# Read-only
Router(config)# snmp-server community PUBLIC ro                   # read-only
Router(config)# snmp-server community PRIVATE rw                  # read-write (use with caution!)

# Restricted by ACL
Router(config)# access-list 10 permit 192.168.1.100
Router(config)# snmp-server community PUBLIC ro 10

# Contact information
Router(config)# snmp-server location "Server Room, Rack 3"
Router(config)# snmp-server contact admin@company.com

# Traps (notifications)
Router(config)# snmp-server host 192.168.1.100 version 2c PUBLIC
Router(config)# snmp-server enable traps                          # all traps
Router(config)# snmp-server enable traps snmp linkdown linkup     # link events only
Router(config)# snmp-server enable traps ospf                     # OSPF events
```

### Configuring SNMPv3

```bash
# Create group
Router(config)# snmp-server group MGMT_GROUP v3 priv

# Create user
Router(config)# snmp-server user ADMIN MGMT_GROUP v3 auth sha cisco123 priv aes 128 cisco456

# Send traps
Router(config)# snmp-server host 192.168.1.100 version 3 priv ADMIN
```

### SNMP Verification

```bash
Router# show snmp                          # general status
Router# show snmp community               # community strings
Router# show snmp group                   # SNMPv3 groups
Router# show snmp user                    # SNMPv3 users
Router# show snmp host                    # trap receiver addresses
```

---

## Syslog

### How It Works

**Syslog**: standard for sending system messages to a log server. UDP port 514 (default), TCP 6514 (secure).

### Syslog Severity Levels

| Level | Name | Description |
|:---:|---|---|
| 0 | Emergencies | System is unusable |
| 1 | Alerts | Immediate action required |
| 2 | Critical | Critical conditions |
| 3 | Errors | Error conditions |
| 4 | Warnings | Warning conditions |
| 5 | Notifications | Normal but significant |
| 6 | Informational | Informational messages |
| 7 | Debugging | Debug messages |

> **💡 Tip:** Mnemonic: **E**very **A**wesome **C**isco **E**ngineer **W**ill **N**eed **I**ce **D**aily
> (Emergencies, Alerts, Critical, Errors, Warnings, Notifications, Informational, Debugging)

### Syslog Message Format

```
%FACILITY-SEVERITY-MNEMONIC: Message text
%OSPF-5-ADJCHG: Process 1, Nbr 2.2.2.2 on Gi0/0 from LOADING to FULL
```

| Field | Description |
|---|---|
| FACILITY | Component (OSPF, SYS, LINK) |
| SEVERITY | Severity level (0–7) |
| MNEMONIC | Event code |
| Message | Message text |

### Syslog Configuration

```bash
# Logging to console (default - all levels)
Router(config)# logging console debugging                  # levels 0-7 to console
Router(config)# no logging console                        # disable

# Logging to buffer (RAM)
Router(config)# logging buffered 64000                    # buffer size in bytes
Router(config)# logging buffered warnings                  # level and above

# Logging to Syslog server
Router(config)# logging host 192.168.1.200
Router(config)# logging trap informational                 # level 6 and above
Router(config)# logging source-interface loopback 0        # source interface

# Timestamps in logs
Router(config)# service timestamps log datetime msec       # milliseconds
Router(config)# service timestamps log datetime localtime  # local time

# Logging synchronous (don't interrupt command input)
Router(config)# line console 0
Router(config-line)# logging synchronous
```

### Viewing Logs

```bash
Router# show logging                      # log buffer + settings
Router# show logging | include OSPF       # filter by keyword
```

---

## Resources

| Resource | Description |
|---|---|
| [RFC 3411: SNMPv3 Framework](https://www.rfc-editor.org/rfc/rfc3411) | SNMP v3 architecture: USM, View-based Access Control |
| [RFC 5424: Syslog Protocol](https://www.rfc-editor.org/rfc/rfc5424) | Syslog standard: message formats, severity levels 0–7 |
| [SNMP (networklessons.com)](https://networklessons.com/system-management/introduction-to-snmp) | SNMP v1/v2c/v3: OID, MIB, trap, community strings |
| [Syslog (networklessons.com)](https://networklessons.com/system-management/cisco-ios-syslog-messages) | Syslog severity levels, logging configuration on Cisco IOS |
| [Jeremy's IT Lab: SNMP (YouTube)](https://www.youtube.com/watch?v=vDkBAdDFiYI) | SNMP v1/v2c/v3, MIB, OID, trap from the Free CCNA series |
| [Cisco SNMP Configuration Guide](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/snmp/configuration/xe-16/snmp-xe-16-book/nm-snmp-cfg-snmp-support.html) | Official Cisco documentation for SNMP configuration |
