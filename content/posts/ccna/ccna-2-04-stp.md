---
title: "CCNA 2.4 Spanning Tree Protocol"
date: 2026-08-06
description: "STP and RSTP: Root Bridge election, port roles, port states, protective features PortFast/BPDU Guard/Root Guard and configuring Rapid-PVST+ on Cisco switches."
tags: ["CCNA", "Cisco", "STP", "RSTP", "Spanning Tree"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-2-04-stp/"
---

## Why STP is Needed

Without STP, redundant links between switches create **loops**:

- **Broadcast storm**: broadcast frames copy endlessly
- **MAC table instability**: one MAC appears on different ports
- **Unicast duplication**: unicast frames are received multiple times

STP blocks redundant ports, leaving a single active path. When the primary path fails, it automatically activates the backup path.

---

## STP Variants

| Protocol | Standard | Convergence | Description |
|---|---|---|---|
| STP | IEEE 802.1D | 30–50 sec | Original; single instance for all VLANs |
| PVST+ | Cisco | 30–50 sec | Per-VLAN STP: separate instance per VLAN |
| RSTP | IEEE 802.1w | 1–2 sec | Rapid STP |
| Rapid-PVST+ | Cisco | 1–2 sec | Per-VLAN RSTP **(recommended)** |
| MSTP | IEEE 802.1s | 1–2 sec | Multiple STP: groups of VLANs mapped to instances |

---

## STP Election Process

### Step 1: Root Bridge Election

The Root Bridge is the switch with the lowest **Bridge ID**.

```
Bridge ID = Priority (2 bytes) + MAC (6 bytes)
Priority = Base (multiple of 4096) + VLAN ID
```

| Parameter | Default | Range |
|---|---|---|
| Priority | 32768 | 0–61440 (multiples of 4096) |
| Bridge ID | 32768 + MAC | n/a |

> **💡 Tip:** To force a Root Bridge election: set a priority lower than 32768 (e.g. 24576 or use `spanning-tree vlan X root primary`).

### Step 2: Root Port (RP) Election

On each **non-Root** switch, the port with the lowest path cost to the Root Bridge.

| Speed | Cost (default) |
|---|:---:|
| 10 Mbps | 100 |
| 100 Mbps | 19 |
| 1 Gbps | 4 |
| 10 Gbps | 2 |

If costs are equal: lower **Sender Bridge ID** → lower **Port ID**.

### Step 3: Designated Port (DP) Election

On each segment, the port with the lowest path cost to the Root Bridge (typically all Root Bridge ports are Designated).

### Step 4: Non-Designated Port (NDP)

All remaining ports are blocked (Blocking state).

---

## STP Port States (802.1D)

| State | Forwarding | Learning MAC | Listening for BPDU | Time |
|---|:---:|:---:|:---:|---|
| Blocking | No | No | Yes | n/a |
| Listening | No | No | Yes | 15 sec (Forward Delay) |
| Learning | No | Yes | Yes | 15 sec (Forward Delay) |
| Forwarding | Yes | Yes | Yes | n/a |
| Disabled | No | No | No | n/a |

> **📌 Important:** Total STP 802.1D convergence time: up to **50 sec** (20 sec Max Age + 15 sec Listening + 15 sec Learning). RSTP reduces this to 1–2 sec.

---

## RSTP: Rapid STP (802.1w)

### RSTP Port States

| State | Description |
|---|---|
| Discarding | Combination of Blocking + Listening (no forwarding, no learning) |
| Learning | Learns MAC addresses, does not forward |
| Forwarding | Fully active |

### RSTP Port Roles

| Role | Description |
|---|---|
| Root Port | Best path to Root Bridge |
| Designated Port | Best port in segment toward Root |
| Alternate Port | Backup path to Root (replaces Blocking) |
| Backup Port | Backup port in same segment |
| Edge Port | Connected to end device (similar to PortFast) |

> **💡 Tip:** RSTP uses a **Proposal/Agreement** mechanism (handshake) for immediate transition to Forwarding without waiting for timers.

---

## STP Configuration

```bash
# Select STP mode
Switch(config)# spanning-tree mode pvst           # PVST+
Switch(config)# spanning-tree mode rapid-pvst      # Rapid-PVST+ (recommended)
Switch(config)# spanning-tree mode mst             # MSTP

# Set Root Bridge (primary = priority 24576)
Switch(config)# spanning-tree vlan 10 root primary
Switch(config)# spanning-tree vlan 10 root secondary  # priority 28672

# Set priority manually (multiples of 4096)
Switch(config)# spanning-tree vlan 10 priority 4096

# Port cost
Switch(config)# interface gigabitethernet 0/1
Switch(config-if)# spanning-tree vlan 10 cost 10

# Port priority (0–240, multiples of 16; lower = preferred)
Switch(config-if)# spanning-tree vlan 10 port-priority 64

# Timers (Root Bridge only!)
Switch(config)# spanning-tree vlan 10 hello-time 2      # default 2 sec
Switch(config)# spanning-tree vlan 10 forward-time 15   # default 15 sec
Switch(config)# spanning-tree vlan 10 max-age 20        # default 20 sec
```

---

## Protective Features

### PortFast

Immediate transition to Forwarding (skips Listening/Learning). For access ports with end devices only.

```bash
Switch(config-if)# spanning-tree portfast          # on a specific port
Switch(config)# spanning-tree portfast default     # on all access ports
```

### BPDU Guard

Disables the port (err-disable) upon receiving a BPDU. Used with PortFast.

```bash
Switch(config-if)# spanning-tree bpduguard enable
Switch(config)# spanning-tree portfast bpduguard default  # globally
```

### BPDU Filter

Prevents sending and receiving BPDUs on a port.

```bash
Switch(config-if)# spanning-tree bpdufilter enable
```

### Root Guard

Prevents a port from becoming a Root Port (protects against an unwanted Root Bridge).

```bash
Switch(config-if)# spanning-tree guard root
```

### Loop Guard

Puts a port in loop-inconsistent state when BPDUs stop arriving (instead of transitioning to Forwarding).

```bash
Switch(config-if)# spanning-tree guard loop
Switch(config)# spanning-tree loopguard default    # globally
```

---

## Verification and Diagnostics

```bash
Switch# show spanning-tree                          # all VLANs
Switch# show spanning-tree vlan 10                  # specific VLAN
Switch# show spanning-tree vlan 10 detail           # detailed
Switch# show spanning-tree summary                  # mode summary
Switch# show spanning-tree interface gi0/1          # specific port
Switch# show spanning-tree interface gi0/1 detail

# Sample output of show spanning-tree vlan 10:
# Root ID, Bridge ID, timers
# Interface: role (Root/Desg/Altn), status, cost, priority
```

---

## Resources

| Resource | Description |
|---|---|
| [IEEE 802.1D: STP Standard](https://standards.ieee.org/ieee/802.1D/3399/) | Original Spanning Tree Protocol standard |
| [IEEE 802.1w: RSTP Standard](https://standards.ieee.org/ieee/802.1w/2935/) | Rapid Spanning Tree Protocol: faster convergence |
| [STP (networklessons.com)](https://networklessons.com/spanning-tree/introduction-to-spanning-tree) | Full STP breakdown: Root Bridge, port roles, states |
| [RSTP (networklessons.com)](https://networklessons.com/spanning-tree/rapid-spanning-tree-rstp) | RSTP: differences from STP, proposal/agreement, edge ports |
| [Jeremy's IT Lab: Spanning Tree Protocol (YouTube)](https://www.youtube.com/watch?v=mLi-xDPGpHw) | STP, RSTP, PVST+, PortFast, BPDU Guard from the Free CCNA series |
| [PortFast and BPDU Guard (Cisco)](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-3/configuration_guide/lyr2/b_173_lyr2_9300_cg/configuring_optional_spanning_tree_features.html) | Official Cisco documentation for PortFast, BPDU Guard, Root Guard |
