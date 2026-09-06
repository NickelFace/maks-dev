---
title: "CCNA 5.2 ACL"
date: 2026-09-10
description: "Access Control Lists on Cisco IOS: Standard and Extended ACL, wildcard masks, named ACLs, applying to interfaces and VTY lines, IPv6 ACL and troubleshooting."
tags: ["CCNA", "Cisco", "ACL", "traffic filtering", "security"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-5-02-acl/"
---

## How ACLs Work

An ACL is a list of rules (permit/deny) for filtering traffic.

**Processing rules:**
1. Lines are checked **top to bottom**
2. On the first match: the action is applied, remaining lines are not checked
3. At the end of every ACL: **implicit `deny any`** (invisible)
4. An empty ACL (only `deny any`) blocks everything

> **⚠️ Note:** There is an implicit `deny any` at the end of every ACL! If no explicit `permit` is added, all traffic will be blocked. Always add `permit ip any any` at the end if remaining traffic should be allowed.

---

## ACL Types

| Type | Numbers | Filters by | Placement |
|---|---|---|---|
| Standard | 1–99, 1300–1999 | Source IP only | Close to destination |
| Extended | 100–199, 2000–2699 | Source/Dest IP, protocol, ports | Close to source |
| Named | Any name | Depends on type | Depends on type |

---

## Wildcard Masks

A wildcard mask is the inverse of a subnet mask:
- **0** = bit must match
- **1** = bit is ignored

```
Mask:     255.255.255.0
Wildcard:   0.  0.  0.255

Network 192.168.1.0/24 → wildcard 0.0.0.255
Network 10.0.0.0/8     → wildcard 0.255.255.255
```

Special keywords:
- `host X.X.X.X` = `X.X.X.X 0.0.0.0` (specific host)
- `any` = `0.0.0.0 255.255.255.255` (any address)

---

## Standard ACL

Filters by **source IP only**. Numbers: 1–99 or 1300–1999.

```bash
# Numbered Standard ACL
Router(config)# access-list 10 permit 192.168.1.0 0.0.0.255
Router(config)# access-list 10 permit host 192.168.1.50
Router(config)# access-list 10 deny any                     # explicit deny

# Apply to interface (in = inbound, out = outbound)
Router(config)# interface gigabitethernet 0/1
Router(config-if)# ip access-group 10 out

# For VTY lines (management access protection)
Router(config)# line vty 0 15
Router(config-line)# access-class 10 in
```

> **💡 Tip:** Place Standard ACLs **close to the destination** (where traffic should be blocked), otherwise you may also block access to other resources.

---

## Extended ACL

Filters by source/dest IP, protocol (TCP, UDP, ICMP, IP), and ports. Numbers: 100–199, 2000–2699.

```bash
# Syntax
access-list [number] {permit|deny} [protocol] [src] [src-wildcard] [dst] [dst-wildcard] [options]

# Examples
Router(config)# access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 80    # HTTP
Router(config)# access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 443   # HTTPS
Router(config)# access-list 100 permit tcp 192.168.1.0 0.0.0.255 any eq 22    # SSH
Router(config)# access-list 100 deny ip any any                                # rest

# ICMP
Router(config)# access-list 100 permit icmp 192.168.1.0 0.0.0.255 any

# Port keywords
# eq = equal; gt = greater than; lt = less than; neq = not equal; range = range
Router(config)# access-list 100 permit tcp any any range 1024 65535 established

# established keyword (TCP connections already established only)
Router(config)# access-list 110 permit tcp any 192.168.1.0 0.0.0.255 established

# Apply
Router(config)# interface gigabitethernet 0/0
Router(config-if)# ip access-group 100 in
```

> **💡 Tip:** Place Extended ACLs **close to the source**, to filter as early as possible and reduce unnecessary traffic on the network.

---

## Named ACL

Named ACLs are easier to read and allow deletion of individual lines.

```bash
# Standard Named ACL
Router(config)# ip access-list standard PERMIT_LAN
Router(config-std-nacl)# permit 192.168.1.0 0.0.0.255
Router(config-std-nacl)# deny any

# Extended Named ACL
Router(config)# ip access-list extended BLOCK_TELNET
Router(config-ext-nacl)# deny tcp any any eq 23
Router(config-ext-nacl)# permit ip any any

# Apply
Router(config)# interface gi0/0
Router(config-if)# ip access-group BLOCK_TELNET in

# View with sequence numbers
Router# show access-lists BLOCK_TELNET
# Extended IP access list BLOCK_TELNET
#     10 deny tcp any any eq telnet
#     20 permit ip any any

# Delete a specific line
Router(config)# ip access-list extended BLOCK_TELNET
Router(config-ext-nacl)# no 10                           # delete line 10

# Insert a line with a sequence number
Router(config-ext-nacl)# 15 permit udp any any eq 53    # insert between 10 and 20
```

---

## Applying ACL to an Interface

| Direction | Description | When to use |
|---|---|---|
| `in` | Checks traffic **entering** the interface | Filter inbound traffic |
| `out` | Checks traffic **leaving** the interface | Filter outbound traffic |

> **📌 Important:** Only **one ACL per direction** per interface: one `in` and one `out`. You cannot apply two ACLs in the same direction on one interface.

---

## IPv6 ACL

```bash
Router(config)# ipv6 access-list BLOCK_HTTP6
Router(config-ipv6-acl)# deny tcp any any eq 80
Router(config-ipv6-acl)# permit ipv6 any any

Router(config)# interface gi0/0
Router(config-if)# ipv6 traffic-filter BLOCK_HTTP6 in

Router# show ipv6 access-list
```

> **💡 Tip:** IPv6 ACLs are always named (no numbered form). The implicit end is `deny ipv6 any any`, same behavior as IPv4.

---

## Verification and Troubleshooting

```bash
Router# show access-lists                        # all ACLs with counters
Router# show access-lists 100                    # specific ACL
Router# show ip access-lists                     # IPv4 only
Router# show ipv6 access-list                    # IPv6 only
Router# show ip interface gi0/0                  # ACLs applied to interface
Router# show running-config | section access-list

# Reset counters
Router# clear ip access-list counters 100
Router# clear ip access-list counters
```

---

## Resources

| Resource | Description |
|---|---|
| [ACL (networklessons.com)](https://networklessons.com/network-fundamentals/introduction-to-access-lists-on-cisco-ios-router) | Standard vs Extended ACL: syntax, wildcard masks, direction |
| [Named ACL (networklessons.com)](https://networklessons.com/cisco/ccna-routing-switching-icnd2-200-105/named-access-list) | Named ACL: creation, editing, sequence numbers |
| [ACL Troubleshooting (Cisco)](https://www.cisco.com/c/en/us/support/docs/security/ios-firewall/23602-confaccesslists.html) | Cisco guide for ACL troubleshooting and creation |
| [Extended ACL (networklessons.com)](https://networklessons.com/network-fundamentals/extended-access-list-example-on-cisco-router) | Extended ACL: filtering by IP, port, and protocol |
| [Jeremy's IT Lab: Standard ACL (YouTube)](https://www.youtube.com/watch?v=gvJ10sBbmVA) | Standard ACLs from the Free CCNA series |
| [Jeremy's IT Lab: Extended ACL (YouTube)](https://www.youtube.com/watch?v=UGCuetJ6Fdo) | Extended ACLs from the Free CCNA series |
