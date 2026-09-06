---
title: "CCNA 2.3 EtherChannel"
date: 2026-08-03
description: "EtherChannel link aggregation: LACP and PAgP protocols, mode compatibility table, Layer 2/3 EtherChannel configuration and load balancing algorithms."
tags: ["CCNA", "Cisco", "EtherChannel", "LACP", "PAgP"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-2-03-etherchannel/"
---

## What is EtherChannel

**EtherChannel** (Port-Channel). Aggregates multiple physical switch ports into a single logical link. It provides:

- **Increased bandwidth** (2, 4 or 8 links)
- **Fault tolerance** (traffic moves to remaining links if one fails)
- **STP sees one port**: does not block parallel links

Supported: 2 to 8 physical interfaces per group.

---

## Negotiation Protocols

| Protocol | Standard | Modes | Description |
|---|---|---|---|
| LACP | IEEE 802.3ad | `active` / `passive` | Open standard; active initiates, passive waits |
| PAgP | Cisco | `desirable` / `auto` | Cisco proprietary; desirable initiates, auto waits |
| Static | n/a | `on` | No negotiation (both ends must be `on`) |

### Mode Compatibility

| Side A | Side B | Result |
|---|---|---|
| active | active | EtherChannel (LACP) |
| active | passive | EtherChannel (LACP) |
| passive | passive | **No** EtherChannel |
| desirable | desirable | EtherChannel (PAgP) |
| desirable | auto | EtherChannel (PAgP) |
| auto | auto | **No** EtherChannel |
| on | on | EtherChannel (static) |
| on | active/passive | **No** EtherChannel |

> **📌 Important:** The `on` mode (static) does not exchange LACP/PAgP packets. Both ends must be `on`. A mismatch causes traffic loss without warning. Use LACP where possible.

---

## EtherChannel Requirements

All interfaces in the group must have **identical** parameters:

- Speed and duplex
- Port type (access or trunk)
- VLAN (for access: same VLAN; for trunk: native VLAN, allowed VLANs)
- MTU

> **⚠️ Note:** Parameter mismatches will cause errors or unstable EtherChannel behavior. Always verify with `show etherchannel summary`.

---

## EtherChannel Configuration

### Layer 2 EtherChannel (LACP)

```bash
# Switch 1
Switch1(config)# interface range gigabitethernet 0/1-2
Switch1(config-if-range)# switchport mode trunk
Switch1(config-if-range)# switchport trunk native vlan 99
Switch1(config-if-range)# switchport trunk allowed vlan 10,20,30
Switch1(config-if-range)# channel-group 1 mode active
Switch1(config-if-range)# exit

# Port-channel interface is created automatically
Switch1(config)# interface port-channel 1
Switch1(config-if)# switchport mode trunk
Switch1(config-if)# switchport trunk native vlan 99
Switch1(config-if)# switchport trunk allowed vlan 10,20,30

# Switch 2
Switch2(config)# interface range gigabitethernet 0/1-2
Switch2(config-if-range)# switchport mode trunk
Switch2(config-if-range)# channel-group 1 mode passive     # or active
Switch2(config-if-range)# exit
```

### Layer 3 EtherChannel

```bash
Switch(config)# interface range gigabitethernet 0/1-2
Switch(config-if-range)# no switchport
Switch(config-if-range)# channel-group 1 mode active
Switch(config-if-range)# exit

Switch(config)# interface port-channel 1
Switch(config-if)# no switchport
Switch(config-if)# ip address 10.0.0.1 255.255.255.252
```

### PAgP

```bash
Switch(config)# interface range gigabitethernet 0/1-2
Switch(config-if-range)# channel-group 1 mode desirable   # or auto
```

### Static (no protocol)

```bash
Switch(config)# interface range gigabitethernet 0/1-2
Switch(config-if-range)# channel-group 1 mode on
```

---

## Load Balancing

EtherChannel distributes traffic across physical links using a hashing algorithm:

```bash
Switch(config)# port-channel load-balance src-dst-mac     # by MAC addresses (default)
Switch(config)# port-channel load-balance src-dst-ip      # by IP
Switch(config)# port-channel load-balance src-mac
Switch(config)# port-channel load-balance dst-mac

Switch# show etherchannel load-balance    # current method
```

| Method | Description |
|---|---|
| src-mac | Source MAC |
| dst-mac | Destination MAC |
| src-dst-mac | XOR of both MACs (default) |
| src-ip | Source IP |
| dst-ip | Destination IP |
| src-dst-ip | XOR of both IPs |

---

## Verification and Diagnostics

```bash
Switch# show etherchannel summary          # overview of all EtherChannels
Switch# show etherchannel detail           # detailed
Switch# show etherchannel 1 summary        # group 1
Switch# show etherchannel 1 port-channel   # port-channel interface
Switch# show interfaces port-channel 1     # status of aggregated interface
Switch# show lacp neighbor                 # LACP partners
Switch# show lacp internal                 # local LACP parameters
Switch# show pagp neighbor                 # PAgP partners
Switch# show pagp internal

# Flags in show etherchannel summary:
# P = in port-channel
# D = down
# S = Layer 2 / R = Layer 3
# U = in use
```

---

## Resources

| Resource | Description |
|---|---|
| [IEEE 802.3ad: LACP Standard](https://standards.ieee.org/ieee/802.3ad/1042/) | Link Aggregation Control Protocol (LACP) standard |
| [EtherChannel (networklessons.com)](https://networklessons.com/switching/etherchannel-cisco-ios-catalyst-switch) | Full EtherChannel breakdown: LACP, PAgP, static mode |
| [LACP vs PAgP (networklessons.com)](https://networklessons.com/cisco/ccna-routing-switching-icnd2-200-105/lacp-and-pagp) | Protocol comparison: active/passive, desirable/auto modes |
| [EtherChannel Load Balancing (Cisco)](https://www.cisco.com/c/en/us/support/docs/lan-switching/etherchannel/12023-4.html) | EtherChannel load balancing algorithms |
| [Jeremy's IT Lab: EtherChannel (YouTube)](https://www.youtube.com/watch?v=sMSKFPjSLZE) | EtherChannel: LACP, PAgP, configuration and verification |
| [EtherChannel Configuration Guide: Cisco Catalyst](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-3/configuration_guide/lyr2/b_173_lyr2_9300_cg/configuring_etherchannel.html) | Official Cisco EtherChannel configuration guide |
