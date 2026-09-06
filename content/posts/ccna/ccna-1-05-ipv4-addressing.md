---
title: "CCNA 1.5 IPv4 Addressing and Subnetting"
date: 2026-07-11
description: "IPv4 address structure, address classes, RFC 1918 private addresses, CIDR subnet mask table, subnetting formulas and VLSM with calculation examples."
tags: ["CCNA", "Cisco", "IPv4", "subnetting", "VLSM"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-1-05-ipv4-addressing/"
---

## IPv4 Address Structure

An IPv4 address is a 32-bit number written as four decimal octets:

```
192    .   168    .    1    .    1
11000000.10101000.00000001.00000001
```

The address is divided into two parts:
- **Network portion (N)**: bits covered by ones in the mask
- **Host portion (H)**: bits covered by zeros in the mask

In an address:
- All H bits = 0 → **network address**
- All H bits = 1 → **broadcast address**
- H bits = combination → **host address**

---

## Address Classes

| Class | 1st Octet Range | Default Mask | Number of Networks | Hosts/Network |
|---|---|---|---|---|
| A | 1–126 | /8 (255.0.0.0) | 126 | 16,777,214 |
| B | 128–191 | /16 (255.255.0.0) | 16,384 | 65,534 |
| C | 192–223 | /24 (255.255.255.0) | 2,097,152 | 254 |
| D | 224–239 | n/a | Multicast | n/a |
| E | 240–255 | n/a | Reserved | n/a |

> **📌 Important:** 127.x.x.x, loopback; 0.0.0.0 and 255.x.x.x; cannot be assigned to hosts.

---

## RFC 1918 Private Addresses

| Class | Range | Prefix |
|---|---|---|
| A | 10.0.0.0 – 10.255.255.255 | /8 |
| B | 172.16.0.0 – 172.31.255.255 | /12 |
| C | 192.168.0.0 – 192.168.255.255 | /16 |

Other important special addresses:

| Address/Range | Purpose |
|---|---|
| 127.0.0.1 | Loopback |
| 169.254.0.0/16 | APIPA (automatic address without DHCP) |
| 0.0.0.0 | "Any" source / default route |
| 255.255.255.255 | Limited broadcast |

---

## Subnet Masks

Three ways to write the same mask:

| Notation | Example |
|---|---|
| Binary | 11111111.11111111.11111111.00000000 |
| Dotted decimal | 255.255.255.0 |
| Prefix (CIDR) | /24 |

### CIDR Subnet Mask Table

| Prefix | Mask | Hosts |
|:---:|---|:---:|
| /8 | 255.0.0.0 | 16,777,214 |
| /16 | 255.255.0.0 | 65,534 |
| /24 | 255.255.255.0 | 254 |
| /25 | 255.255.255.128 | 126 |
| /26 | 255.255.255.192 | 62 |
| /27 | 255.255.255.224 | 30 |
| /28 | 255.255.255.240 | 14 |
| /29 | 255.255.255.248 | 6 |
| /30 | 255.255.255.252 | 2 |
| /31 | 255.255.255.254 | 0* |
| /32 | 255.255.255.255 | 1 (host) |

> **💡 Tip:** /30 (2 hosts), standard for WAN point-to-point links. /31: per RFC 3021 for p2p without network and broadcast addresses. /32, loopback or host route.

---

## Subnetting Formulas

| Task | Formula | Example (/26) |
|---|---|---|
| Number of subnets | 2ˢ | 2² = 4 (if 2 bits borrowed from Class C) |
| Total addresses | 2ʰ | 2⁶ = 64 |
| Usable hosts | 2ʰ − 2 | 64 − 2 = 62 |
| Block size (step) | 256 − (last octet of mask) | 256 − 192 = 64 |

---

## Step-by-Step Subnet Calculation

**Given:** address 192.168.100.70/26. Determine the network, broadcast, and host range.

**Step 1**: Mask /26 = 255.255.255.192, block size = 256 − 192 = **64**

**Step 2**: Networks: .0, .64, .128, .192

**Step 3**: 70 falls in subnet **.64** (64 ≤ 70 < 128)

| Network address | 192.168.100.64 |
|---|---|
| First host | 192.168.100.65 |
| Last host | 192.168.100.126 |
| Broadcast | 192.168.100.127 |
| Mask | 255.255.255.192 / /26 |

---

## VLSM: Variable Length Subnet Masking

VLSM allows using different prefix lengths within a single address space.

**Principle:** allocate subnets from largest to smallest.

**Example:** network 10.0.0.0/24, requirements:
- Network A: 50 hosts → /26 (62 hosts) → 10.0.0.0/26
- Network B: 25 hosts → /27 (30 hosts) → 10.0.0.64/27
- Network C: 10 hosts → /28 (14 hosts) → 10.0.0.96/28
- WAN link → /30 → 10.0.0.112/30

---

## IOS Commands

```bash
# Assign IP address to router
Router(config)# interface gigabitethernet 0/0
Router(config-if)# ip address 192.168.1.1 255.255.255.0
Router(config-if)# no shutdown

# Assign management IP to switch
Switch(config)# interface vlan 1
Switch(config-if)# ip address 192.168.1.2 255.255.255.0
Switch(config-if)# no shutdown
Switch(config)# ip default-gateway 192.168.1.1

# Verification
Router# show ip interface brief
Router# show interfaces gigabitethernet 0/0
Router# show ip route

# Diagnostics
Router# ping 192.168.1.1
Router# ping 192.168.1.1 source loopback 0
Router# traceroute 10.0.0.1
```

---

## Resources

| Resource | Description |
|---|---|
| [RFC 1918: Private Address Space](https://www.rfc-editor.org/rfc/rfc1918) | RFC standard for private IPv4 ranges: 10.x, 172.16-31.x, 192.168.x |
| [Subnetting (networklessons.com)](https://networklessons.com/subnetting/subnetting-in-binary) | Complete subnetting course with examples |
| [VLSM (networklessons.com)](https://networklessons.com/subnetting/variable-length-subnet-mask-vlsm) | Variable Length Subnet Masking: principles and practice |
| [Jeremy's IT Lab: IPv4 Addressing (YouTube)](https://www.youtube.com/watch?v=i3WKlVdFhJc) | IPv4 addressing and subnetting from the Free CCNA series |
| [Wildcard Masks (networklessons.com)](https://networklessons.com/network-fundamentals/wildcard-bits-explained) | Wildcard masks: difference from subnet mask, use in ACL and OSPF |
| [Subnet Calculator (Cisco)](https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13788-3.html) | Cisco guide on IP subnetting with calculation examples |
