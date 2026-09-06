---
title: "CCNA 1.6 IPv6 Addressing"
date: 2026-07-16
description: "IPv6 address structure and types, abbreviation rules, SLAAC, EUI-64, DHCPv6 and Cisco IOS commands for IPv6 configuration and verification."
tags: ["CCNA", "Cisco", "IPv6", "SLAAC", "NDP"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-1-06-ipv6/"
---

## Why IPv6

- IPv4: ~4.3 billion addresses (2³²), exhausted
- IPv6: 340 undecillion addresses (2¹²⁸)
- No need for NAT
- Built-in security (IPsec)
- Autoconfiguration (SLAAC)

---

## IPv6 Address Structure

128 bits, written as 8 groups of 4 hexadecimal digits separated by colons:

```
2001:0DB8:0000:0001:0000:0000:0000:0001
```

Standard prefix length: **/64** (64 bits, network, 64 bits, interface ID)

---

## Abbreviation Rules

**Rule 1:** Remove leading zeros in each group:
```
2001:0DB8:0000:0001  →  2001:DB8:0:1
```

**Rule 2:** One consecutive run of all-zero groups is replaced by `::` (only once):
```
2001:DB8:0:0:0:0:0:1  →  2001:DB8::1
```

**Both rules together:**
```
2001:0DB8:0000:0000:0000:0000:0000:0001  →  2001:DB8::1
```

> **⚠️ Note:** `::` can only be used **once** in an address. Two `::` in the same address creates ambiguity.

---

## IPv6 Address Types

| Type | Prefix | Description |
|---|---|---|
| Global Unicast | 2000::/3 | Public routable addresses (analogous to public IPv4) |
| Unique Local | FC00::/7 | Private (analogous to RFC 1918, typically FD00::/8) |
| Link-Local | FE80::/10 | Within a single segment only; not routable |
| Loopback | ::1/128 | Loopback (analogous to 127.0.0.1) |
| Unspecified | ::/128 | "Any" source (analogous to 0.0.0.0) |
| Multicast | FF00::/8 | Group communication |
| Anycast | n/a | One address, multiple interfaces; packet goes to the nearest |

### Important Multicast Addresses

| Address | Group |
|---|---|
| FF02::1 | All nodes in segment |
| FF02::2 | All routers in segment |
| FF02::5 | All OSPF routers |
| FF02::6 | OSPF DR/BDR |
| FF02::9 | All RIP routers |

---

## Special Addresses

| Address | Purpose |
|---|---|
| ::1/128 | Loopback |
| ::/128 | Unspecified (source before address assignment) |
| FE80::/10 | Link-local (required on every IPv6 interface) |
| FF02::1 | All-nodes multicast |

---

## Address Assignment

### SLAAC (Stateless Address Autoconfiguration)

1. Device generates a Link-Local address: **FE80::** + EUI-64
2. Sends RS (Router Solicitation) to FF02::2
3. Router responds with RA (Router Advertisement) containing the network prefix
4. Device creates Global Unicast = prefix + EUI-64

### EUI-64 (Interface ID from MAC Address)

```
MAC: AA:BB:CC:DD:EE:FF
↓ Insert FF:FE in the middle
AA:BB:CC:FF:FE:DD:EE:FF
↓ Invert the 7th bit of the first byte (AA → A8 or 02→00)
A8:BB:CC:FF:FE:DD:EE:FF
```

### DHCPv6

- **Stateful DHCPv6**: server assigns address and parameters (analogous to DHCPv4)
- **Stateless DHCPv6**: SLAAC provides the address; DHCPv6 provides only DNS and other options

---

## IOS Commands

```bash
# Enable IPv6 routing
Router(config)# ipv6 unicast-routing

# Assign address to interface
Router(config)# interface gigabitethernet 0/0
Router(config-if)# ipv6 address 2001:DB8:1:1::1/64
Router(config-if)# ipv6 address FE80::1 link-local    # explicit link-local
Router(config-if)# ipv6 enable                         # link-local only (SLAAC)
Router(config-if)# no shutdown

# SLAAC on client interface
Router(config-if)# ipv6 address autoconfig

# IPv6 static route
Router(config)# ipv6 route ::/0 2001:DB8:1:1::2        # default

# Verification
Router# show ipv6 interface brief
Router# show ipv6 interface gigabitethernet 0/0
Router# show ipv6 route
Router# show ipv6 neighbors                             # equivalent of ARP table

# Diagnostics
Router# ping ipv6 2001:DB8::1
Router# traceroute ipv6 2001:DB8::1
```

> **💡 Tip:** IPv6 does not use ARP. Instead, it uses **NDP (Neighbor Discovery Protocol)** based on ICMPv6. Messages: NS (Neighbor Solicitation), NA (Neighbor Advertisement), RS, RA.

---

## Resources

| Resource | Description |
|---|---|
| [RFC 4291: IPv6 Addressing Architecture](https://www.rfc-editor.org/rfc/rfc4291) | Specification of IPv6 address types: unicast, multicast, anycast |
| [RFC 4861: NDP (Neighbor Discovery Protocol)](https://www.rfc-editor.org/rfc/rfc4861) | Neighbor Discovery Protocol, IPv6 replacement for ARP |
| [IPv6 Address Types (networklessons.com)](https://networklessons.com/ipv6/ipv6-address-types) | Global unicast, link-local, loopback, multicast, anycast |
| [EUI-64 (networklessons.com)](https://networklessons.com/ipv6/ipv6-eui-64-explained) | How EUI-64 generates an Interface ID from a MAC address |
| [Jeremy's IT Lab: IPv6 Addressing (YouTube)](https://www.youtube.com/watch?v=mJPO9W0tq_Q) | IPv6 address types, EUI-64, NDP from the Free CCNA series |
| [IPv6 Transition Mechanisms (Cisco)](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/configuration/xe-3s/ipv6-xe-3s-book/ip6-tunnel.html) | Dual-stack, tunneling (6to4, ISATAP), NAT64 |
