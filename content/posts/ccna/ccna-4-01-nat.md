---
title: "CCNA 4.1 NAT"
date: 2026-08-23
description: "Network Address Translation with Static NAT, Dynamic NAT and PAT (Overload): Inside/Outside terminology, Cisco IOS configuration, verification and troubleshooting translations."
tags: ["CCNA", "Cisco", "NAT", "PAT", "IP services"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-4-01-nat/"
---

## NAT Types

| Type | Ratio | Description |
|---|---|---|
| Static NAT | 1:1 (permanent) | One private IP ↔ one public IP |
| Dynamic NAT | 1:1 (from pool) | Private IP → any available address from public pool |
| PAT (Overload) | N:1 | Many private → one public (different ports) |

---

## NAT Terminology

| Term | Description |
|---|---|
| Inside Local | Private IP of a host inside the network |
| Inside Global | Public IP of the host (after NAT) |
| Outside Local | IP of external host as seen from inside |
| Outside Global | Real IP of the external host |
| Inside interface | Interface facing the internal network |
| Outside interface | Interface facing the internet/external network |

> **💡 Tip:** On the exam: **Inside Local** = host's private IP (what the router sees from the LAN side). **Inside Global** = public IP (what the internet sees). Typically Inside Local and Inside Global are what NAT changes.

---

## Static NAT

Permanent mapping of one private address to one public address.

```bash
# Configure Static NAT
Router(config)# ip nat inside source static 192.168.1.10 203.0.113.10

# Mark interfaces
Router(config)# interface gigabitethernet 0/0          # LAN
Router(config-if)# ip nat inside

Router(config)# interface gigabitethernet 0/1          # WAN
Router(config-if)# ip nat outside

# Static NAT for a port (Port Forwarding)
Router(config)# ip nat inside source static tcp 192.168.1.10 80 203.0.113.1 80
```

---

## Dynamic NAT

Private IP → available address from public pool.

```bash
# 1. Create pool of public addresses
Router(config)# ip nat pool PUBLIC_POOL 203.0.113.10 203.0.113.20 netmask 255.255.255.0

# 2. Create ACL with internal hosts
Router(config)# access-list 1 permit 192.168.1.0 0.0.0.255

# 3. Bind ACL to pool
Router(config)# ip nat inside source list 1 pool PUBLIC_POOL

# 4. Interfaces
Router(config)# interface gi0/0
Router(config-if)# ip nat inside
Router(config)# interface gi0/1
Router(config-if)# ip nat outside
```

> **⚠️ Note:** Dynamic NAT: if all pool addresses are in use, new connections are dropped. Use PAT to conserve addresses.

---

## PAT (NAT Overload)

All internal hosts are translated through a single public IP, distinguished by port number.

```bash
# Option 1: use the address of the outside interface
Router(config)# access-list 1 permit 192.168.1.0 0.0.0.255
Router(config)# ip nat inside source list 1 interface gigabitethernet 0/1 overload

# Option 2: use pool + overload
Router(config)# ip nat pool PUBLIC 203.0.113.1 203.0.113.1 netmask 255.255.255.0
Router(config)# ip nat inside source list 1 pool PUBLIC overload

# Interfaces
Router(config)# interface gi0/0
Router(config-if)# ip nat inside
Router(config)# interface gi0/1
Router(config-if)# ip nat outside
```

---

## Verification and Diagnostics

```bash
# Translation table
Router# show ip nat translations                  # all entries
Router# show ip nat translations verbose          # detailed
Router# show ip nat translations tcp             # TCP only

# Statistics
Router# show ip nat statistics

# Clear table (for troubleshooting)
Router# clear ip nat translation *               # all dynamic entries
Router# clear ip nat translation inside 192.168.1.10 outside 203.0.113.10

# Debug (use with caution!)
Router# debug ip nat                             # all NAT events
Router# debug ip nat detailed
# Disable: undebug all
```

Sample `show ip nat translations` output:
```
Pro Inside global      Inside local       Outside local      Outside global
tcp 203.0.113.1:1025  192.168.1.10:1025  8.8.8.8:53        8.8.8.8:53
--- 203.0.113.10      192.168.1.10       ---                ---
```

---

## Resources

| Resource | Description |
|---|---|
| [RFC 3022: NAT](https://www.rfc-editor.org/rfc/rfc3022) | Traditional IP Network Address Translator |
| [NAT (networklessons.com)](https://networklessons.com/ip-services/introduction-to-nat-and-pat) | Static NAT, Dynamic NAT, PAT: principles and configuration |
| [PAT (NAT Overload) (networklessons.com)](https://networklessons.com/ip-services/how-to-configure-pat-on-cisco-ios-router) | Port Address Translation: how many hosts share one IP |
| [NAT Troubleshooting (Cisco)](https://www.cisco.com/c/en/us/support/docs/ip/network-address-translation-nat/8605-13.html) | NAT diagnostics: debug ip nat, show ip nat translations |
| [Jeremy's IT Lab: NAT (YouTube)](https://www.youtube.com/watch?v=nLbB0fYQdYY) | Static NAT, Dynamic NAT, PAT from the Free CCNA series |
| [Cisco NAT Configuration Guide](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_nat/configuration/xe-16/nat-xe-16-book/iadnat-addr-consv.html) | Official Cisco NAT configuration guide |
