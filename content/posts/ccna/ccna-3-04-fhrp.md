---
title: "CCNA 3.4 HSRP and FHRP"
date: 2026-08-18
description: "First Hop Redundancy Protocols HSRP (v1/v2), VRRP and GLBP: virtual IP, Active/Standby election, preempt, interface tracking and configuration commands."
tags: ["CCNA", "Cisco", "HSRP", "FHRP", "high availability"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-3-04-fhrp/"
---

## The Single Gateway Problem

End devices are configured with a single default gateway. If that gateway router fails, devices lose connectivity until manual intervention.

**FHRP (First Hop Redundancy Protocol)**: a group of protocols that create a virtual gateway with high availability.

---

## FHRP Protocols

| Protocol | Standard | Load Balancing | Roles |
|---|---|:---:|---|
| HSRP v1 | Cisco | No | Active / Standby |
| HSRP v2 | Cisco | No (per-group) | Active / Standby |
| VRRP | IEEE 802.11 (RFC 5798) | No | Master / Backup |
| GLBP | Cisco | Yes | AVG + AVF |

---

## HSRP: Details

**HSRP (Hot Standby Router Protocol)**: virtual IP and MAC are shared between Active and Standby routers.

### HSRP Roles

| Role | Description |
|---|---|
| Active | Forwards traffic for the virtual IP |
| Standby | Ready to take the Active role on failure |
| Listen | Other routers in the group |

### Active/Standby Election

1. Highest **priority** (default 100; range 0–255)
2. Highest interface IP address at equal priority

### Preemption

By default, if the Active router recovers after a failure, it does not reclaim the Active role. With `preempt`; it reclaims it when it has the highest priority.

### HSRP Versions

| Version | Groups | Multicast | Virtual MAC |
|---|---|---|---|
| HSRPv1 | 0–255 | 224.0.0.2 | 0000.0C07.ACxx (xx = group number hex) |
| HSRPv2 | 0–4095 | 224.0.0.102 | 0000.0C9F.Fxxx (xxx = group hex) |

### HSRP Timers

| Timer | Default | Description |
|---|---|---|
| Hello | 3 sec | Hello send interval |
| Hold | 10 sec | Timer for declaring Active unreachable |

### HSRP States

```
Initial → Learn → Listen → Speak → Standby → Active
```

---

## HSRP Configuration

```bash
# Basic HSRP configuration (Active - higher priority)
Router1(config)# interface gigabitethernet 0/0
Router1(config-if)# ip address 192.168.1.2 255.255.255.0
Router1(config-if)# standby version 2                    # recommended v2
Router1(config-if)# standby 1 ip 192.168.1.1             # virtual IP
Router1(config-if)# standby 1 priority 110               # above 100 → Active
Router1(config-if)# standby 1 preempt                    # reclaim role on recovery
Router1(config-if)# standby 1 authentication md5 key-string cisco123
Router1(config-if)# standby 1 timers 1 3                 # hello=1, hold=3 sec

# Standby router (lower priority - stays Standby)
Router2(config)# interface gigabitethernet 0/0
Router2(config-if)# ip address 192.168.1.3 255.255.255.0
Router2(config-if)# standby version 2
Router2(config-if)# standby 1 ip 192.168.1.1             # same virtual IP
Router2(config-if)# standby 1 priority 90                # below 100 → Standby
Router2(config-if)# standby 1 preempt

# Interface Tracking
Router1(config-if)# standby 1 track gigabitethernet 0/1 20
# If gi0/1 goes down - priority decreases by 20 (110-20=90 < R2's 100 → R2 becomes Active)
```

---

## VRRP

**VRRP (Virtual Router Redundancy Protocol)**: IEEE standard, analogous to HSRP.

| Parameter | HSRP | VRRP |
|---|---|---|
| Standard | Cisco | IEEE |
| Roles | Active/Standby | Master/Backup |
| Default priority | 100 | 100 |
| Virtual IP | Separate | Can match interface IP |
| Preempt | Optional | Enabled by default |

```bash
Router(config-if)# vrrp 1 ip 192.168.1.1
Router(config-if)# vrrp 1 priority 110
Router(config-if)# vrrp 1 preempt
Router(config-if)# vrrp 1 authentication md5 key-string cisco123
Router# show vrrp
Router# show vrrp brief
```

---

## GLBP

**GLBP (Gateway Load Balancing Protocol)**: Cisco proprietary; supports load balancing.

| Role | Description |
|---|---|
| AVG (Active Virtual Gateway) | One per group; manages the group and responds to ARP |
| AVF (Active Virtual Forwarder) | All active routers forward traffic |

- Clients receive different virtual MACs from AVG → traffic is load-balanced
- Up to 4 AVFs per group

```bash
Router(config-if)# glbp 1 ip 192.168.1.1
Router(config-if)# glbp 1 priority 110
Router(config-if)# glbp 1 preempt
Router(config-if)# glbp 1 load-balancing round-robin   # load balancing method
Router# show glbp
```

---

## Verification

```bash
# HSRP
Router# show standby                    # status of all HSRP groups
Router# show standby brief              # brief summary
Router# show standby gigabitethernet 0/0  # specific interface

# Sample output of show standby brief:
# Interface   Grp  Pri P State    Active          Standby         Virtual IP
# Gi0/0       1    110 P Active   local           192.168.1.3     192.168.1.1

# VRRP
Router# show vrrp
Router# show vrrp brief

# GLBP
Router# show glbp
Router# show glbp brief
```

---

## Resources

| Resource | Description |
|---|---|
| [RFC 2281: HSRP](https://www.rfc-editor.org/rfc/rfc2281) | Original Hot Standby Router Protocol specification |
| [RFC 5798: VRRP](https://www.rfc-editor.org/rfc/rfc5798) | Virtual Router Redundancy Protocol v3 (IPv4 and IPv6) |
| [HSRP (networklessons.com)](https://networklessons.com/ip-services/hot-standby-router-protocol-hsrp) | HSRP: active/standby, virtual IP, preempt, versions |
| [GLBP (networklessons.com)](https://networklessons.com/ip-services/glbp-gateway-load-balancing-protocol) | Gateway Load Balancing Protocol: load balancing across gateways |
| [Jeremy's IT Lab: FHRP: HSRP, VRRP, GLBP (YouTube)](https://www.youtube.com/watch?v=JNT3kBOGC8s) | HSRP, VRRP, GLBP from the Free CCNA series |
| [Cisco HSRP Configuration Guide](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipapp_fhrp/configuration/xe-16/fhp-xe-16-book/fhp-hsrp-v1-v2.html) | Official Cisco documentation for HSRP v1 and v2 |
