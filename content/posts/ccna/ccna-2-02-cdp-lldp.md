---
title: "CCNA 2.2 CDP and LLDP"
date: 2026-08-01
description: "Comparison of Cisco Discovery Protocol and Link Layer Discovery Protocol (802.1AB): operation principles, timers, collected information and configuration commands."
tags: ["CCNA", "Cisco", "CDP", "LLDP", "neighbor discovery"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-2-02-cdp-lldp/"
---

## CDP: Cisco Discovery Protocol

**CDP** is a Cisco proprietary Layer 2 protocol that allows neighboring Cisco devices to discover each other and exchange device information.

- Operates at the Data Link layer (L2)
- Independent of the network layer (works without IP)
- **Enabled** by default on all Cisco devices
- Uses multicast: `01:00:0C:CC:CC:CC`
- Send interval: 60 sec; hold timer: 180 sec

**Collected information:**
- Hostname, Device ID
- IOS version, Platform (model)
- Interface IP addresses
- Interface type (port)
- Device capabilities (Router, Switch, Bridge)
- Duplex

---

## LLDP: Link Layer Discovery Protocol

**LLDP** (IEEE 802.1AB) is an open standard, analogous to CDP. Works between devices from different vendors.

- **Disabled** by default on Cisco devices (must be enabled manually)
- Send interval: 30 sec; hold timer: 120 sec
- Supports LLDP-MED (Media Endpoint Discovery) for VoIP

---

## CDP vs LLDP Comparison

| Characteristic | CDP | LLDP |
|---|---|---|
| Standard | Cisco | IEEE 802.1AB |
| Default state | Enabled | Disabled |
| Devices | Cisco only | Any vendor |
| Layer | L2 | L2 |
| Send timer | 60 sec | 30 sec |
| Hold timer | 180 sec | 120 sec |
| VoIP support | Limited | LLDP-MED |

> **⚠️ Note:** CDP reveals device information (model, IOS version). It is recommended to disable it on external interfaces: `(config-if)# no cdp enable`

---

## Commands

### CDP

```bash
# Enable/disable CDP globally
Router(config)# cdp run                   # enable (default)
Router(config)# no cdp run               # disable globally

# Disable CDP on a specific interface
Router(config)# interface gigabitethernet 0/0
Router(config-if)# no cdp enable

# CDP timers
Router(config)# cdp timer 30             # send interval (sec)
Router(config)# cdp holdtime 90          # hold timer (sec)

# View CDP information
Router# show cdp                          # global CDP settings
Router# show cdp neighbors               # brief neighbor summary
Router# show cdp neighbors detail        # detailed (IP, IOS version, etc.)
Router# show cdp entry *                 # all neighbors (same as detail)
Router# show cdp entry R1                # specific neighbor
Router# show cdp interface               # interfaces with CDP
Router# show cdp traffic                 # packet statistics
```

### LLDP

```bash
# Enable LLDP globally
Router(config)# lldp run

# Per-interface control
Router(config)# interface gigabitethernet 0/0
Router(config-if)# lldp transmit         # allow LLDP transmission
Router(config-if)# lldp receive          # allow LLDP reception
Router(config-if)# no lldp transmit     # disable transmission

# LLDP timers
Router(config)# lldp timer 15            # send interval (sec)
Router(config)# lldp holdtime 60         # hold timer (sec)
Router(config)# lldp reinit 3           # reinit delay after reboot (sec)

# View LLDP information
Router# show lldp                         # global settings
Router# show lldp neighbors              # brief summary
Router# show lldp neighbors detail       # detailed
Router# show lldp entry *
Router# show lldp interface              # per-interface status
Router# show lldp traffic                # statistics
```

---

## Resources

| Resource | Description |
|---|---|
| [CDP (Cisco Documentation)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/cdp/configuration/xe-16/cdp-xe-16-book/nm-cdp-discover.html) | Official Cisco Discovery Protocol documentation |
| [IEEE 802.1AB: LLDP Standard](https://standards.ieee.org/ieee/802.1AB/6047/) | Link Layer Discovery Protocol standard |
| [CDP vs LLDP (networklessons.com)](https://networklessons.com/system-management/introduction-to-cdp-cisco-discovery-protocol) | CDP and LLDP comparison, commands, output examples |
| [Jeremy's IT Lab: CDP and LLDP (YouTube)](https://www.youtube.com/watch?v=8bQB2eBElzM) | CDP and LLDP from the Free CCNA series: configuration and verification |
| [LLDP-MED (networklessons.com)](https://networklessons.com/system-management/link-layer-discovery-protocol-lldp) | LLDP Media Endpoint Discovery, LLDP extensions |
