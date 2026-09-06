---
title: "CCNA 3.3 OSPFv2"
date: 2026-08-16
description: "OSPFv2: neighbor adjacency process, DR/BDR election, cost calculation, configuration with network and ip ospf commands, authentication and diagnostics."
tags: ["CCNA", "Cisco", "OSPF", "dynamic routing", "DR/BDR"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-3-03-ospf/"
---

## OSPF Characteristics

| Characteristic | Value |
|---|---|
| Protocol type | Link-State |
| AD | 110 |
| Metric | Cost (10⁸ / bandwidth) |
| Algorithm | Dijkstra (SPF) |
| Updates | Triggered (on change), not periodic |
| Multicast | 224.0.0.5 (all OSPF), 224.0.0.6 (DR/BDR) |
| Port | IP protocol 89 (not TCP/UDP) |
| Authentication | MD5, SHA, Null |
| VLSM support | Yes |
| Scalability | Unlimited (area hierarchy) |

---

## Neighbor Adjacency Process

```
1. Down → router has not received Hello from neighbor
2. Init → Hello received, but own Router ID is not listed in it
3. 2-Way → both see each other's Router ID (DR/BDR election on broadcast)
4. ExStart → Master/Slave determined for DBD exchange
5. Exchange → Database Description (DBD) packets exchanged
6. Loading → LSR/LSU requests for missing LSAs
7. Full → synchronized databases (LSDB), full adjacency
```

> **📌 Important:** For OSPF adjacency to form, the following must match:
> - Hello/Dead intervals
> - Area ID
> - Subnet (network and mask)
> - MTU (on some platforms)
> - Stub Area flags
> - Authentication

---

## OSPF Network Types

| Type | Description | DR/BDR | Hello/Dead |
|---|---|:---:|---|
| Broadcast | Ethernet: DR/BDR elected | Yes | 10/40 sec |
| Point-to-Point | Serial, GRE, HDLC: no DR/BDR | No | 10/40 sec |
| Non-Broadcast (NBMA) | Frame Relay: manual neighbors | Yes | 30/120 sec |
| Point-to-Multipoint | One hub, many spokes | No | 30/120 sec |
| Loopback | Always /32 in OSPF | No | n/a |

---

## Router ID and DR/BDR

### Router ID (RID)

Selected in descending priority:
1. Manual: `router-id X.X.X.X`
2. Highest IP on loopback interface
3. Highest IP on active physical interface

### DR/BDR (Designated/Backup Designated Router)

On broadcast segments to reduce the number of adjacencies:

| Role | Description |
|---|---|
| DR | Collects LSUs from all and floods on 224.0.0.5 |
| BDR | Backup DR; listens to all updates |
| DROther | Forms Full adjacency only with DR and BDR |

DR/BDR election:
1. Highest interface priority (default 1; 0 = never DR)
2. Highest Router ID at equal priority

> **⚠️ Note:** DR/BDR are elected **once** when the segment comes up and are not re-elected without a restart (`clear ip ospf process`). Preemption does not apply to DR/BDR.

---

## Cost

```
Cost = Reference Bandwidth / Interface Bandwidth
Default Reference Bandwidth = 100 Mbps = 100,000,000 bps
```

| Interface | Speed | Cost (default) |
|---|---|:---:|
| Serial | 1.544 Mbps | 64 |
| FastEthernet | 100 Mbps | 1 |
| GigabitEthernet | 1 Gbps | 1 |
| 10 GigabitEthernet | 10 Gbps | 1 |

> **⚠️ Note:** GigabitEthernet and FastEthernet both have cost=1 with a 100 Mbps reference bandwidth. It is recommended to change the reference bandwidth: `auto-cost reference-bandwidth 1000` (for Gig) or `10000` (for 10GbE). **Change on all routers!**

---

## OSPFv2 Configuration

### Basic Configuration

```bash
Router(config)# router ospf 1                  # process-id is local (1-65535)
Router(config-router)# router-id 1.1.1.1       # recommended to set explicitly

# Advertise networks (wildcard mask = inverted mask)
Router(config-router)# network 192.168.1.0 0.0.0.255 area 0
Router(config-router)# network 10.0.0.0 0.255.255.255 area 0

# Passive interface (does not send Hello - for LAN/client interfaces)
Router(config-router)# passive-interface gigabitethernet 0/1
Router(config-router)# passive-interface default      # all passive by default
Router(config-router)# no passive-interface gi0/0     # activate specific interface

# Redistribute default route into OSPF
Router(config-router)# default-information originate  # only if default route exists
Router(config-router)# default-information originate always  # always

# Reference bandwidth
Router(config-router)# auto-cost reference-bandwidth 1000   # Mbps
```

### Interface-Level Configuration

```bash
Router(config)# interface gigabitethernet 0/0
Router(config-if)# ip ospf 1 area 0              # alternative to network command
Router(config-if)# ip ospf cost 10              # manual cost
Router(config-if)# ip ospf priority 100         # DR priority (0-255)
Router(config-if)# ip ospf hello-interval 5     # Hello every 5 sec
Router(config-if)# ip ospf dead-interval 20     # Dead = 4x Hello
Router(config-if)# ip ospf network point-to-point  # network type
```

### OSPF Authentication

```bash
# MD5 authentication on interface
Router(config-if)# ip ospf authentication message-digest
Router(config-if)# ip ospf message-digest-key 1 md5 cisco123

# Authentication for entire area
Router(config-router)# area 0 authentication message-digest
```

---

## Verification and Diagnostics

```bash
# Neighbors
Router# show ip ospf neighbor               # neighbor list (State: FULL = good)
Router# show ip ospf neighbor detail        # detailed (Dead timer, DR/BDR)

# Routes
Router# show ip route ospf                  # OSPF routes only
Router# show ip route                       # entire table (O = OSPF)

# Database
Router# show ip ospf database              # LSDB - all LSAs
Router# show ip ospf database router       # Router LSA (Type 1)
Router# show ip ospf database network      # Network LSA (Type 2)
Router# show ip ospf database summary      # Summary LSA (Type 3)

# OSPF interfaces
Router# show ip ospf interface             # all OSPF interfaces
Router# show ip ospf interface gi0/0       # specific interface
Router# show ip ospf interface brief       # brief summary

# OSPF statistics
Router# show ip ospf                        # general process information

# Debug (use with caution on production!)
Router# debug ip ospf adj                  # adjacency process
Router# debug ip ospf events               # OSPF events
# Disable: undebug all
```

---

## Resources

| Resource | Description |
|---|---|
| [RFC 2328: OSPFv2](https://www.rfc-editor.org/rfc/rfc2328) | Official OSPFv2 (IPv4) specification |
| [OSPF (networklessons.com)](https://networklessons.com/ospf/ospf-packets-and-neighbor-discovery) | OSPF: adjacency process, DR/BDR election |
| [OSPF Areas and LSA Types (networklessons.com)](https://networklessons.com/cisco/ccna-routing-switching-icnd2-200-105/ospf-areas-explained) | OSPF areas, LSA types 1–7, backbone area 0 |
| [OSPF Cost Calculation (networklessons.com)](https://networklessons.com/ospf/ospf-reference-bandwidth) | OSPF cost calculation: reference bandwidth, commands |
| [Jeremy's IT Lab: OSPF (YouTube)](https://www.youtube.com/watch?v=kfvJ8QVJscc) | OSPF: neighbor states, DR/BDR, areas from the Free CCNA series |
| [Cisco OSPFv2 Configuration Guide](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/configuration/xe-16/iro-xe-16-book/iro-cfg.html) | Official Cisco OSPF configuration guide |
