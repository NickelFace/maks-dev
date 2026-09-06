---
title: "CCNA 3.1 Routing Table"
date: 2026-08-11
description: "IP routing principles: Longest Prefix Match, routing table structure, Administrative Distance (AD), protocol metrics and show ip route commands."
tags: ["CCNA", "Cisco", "routing", "OSPF", "administrative distance"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-3-01-routing-table/"
---

## Routing Principles

The router:
1. Receives a packet on an incoming interface
2. Looks at the destination IP address
3. Searches the routing table for the most specific (longest prefix match) route
4. Forwards the packet to the next hop or out the exit interface

> **📌 Important:** **Longest Prefix Match**, the route with the longest prefix (smallest network) is selected. /28 is preferred over /24, which is preferred over /0.

---

## Routing Table Structure

```
Router# show ip route
Codes: C - connected, S - static, R - RIP, D - EIGRP,
       O - OSPF, B - BGP, i - IS-IS, ...

Gateway of last resort is 192.168.1.1 to network 0.0.0.0

O     10.0.0.0/8 [110/2] via 192.168.1.2, 00:01:00, GigabitEthernet0/0
C     192.168.1.0/24 is directly connected, GigabitEthernet0/0
S*    0.0.0.0/0 [1/0] via 203.0.113.1
```

Route entry format:
```
[code] [network/prefix] [AD/metric] via [next-hop], [age], [interface]
```

| Field | Description |
|---|---|
| Code | Route source (C/S/O/D/R...) |
| Network/prefix | Destination network address |
| AD | Administrative Distance |
| Metric | Path cost (hop count, cost, bandwidth...) |
| via | Next-hop address |
| Interface | Exit interface |

---

## Administrative Distance (AD)

AD: preference of a routing information source. **Lower = better.**

| Route Source | AD |
|---|:---:|
| Connected (directly connected) | 0 |
| Static route | 1 |
| EIGRP Summary | 5 |
| BGP (external) | 20 |
| EIGRP (internal) | 90 |
| OSPF | 110 |
| IS-IS | 115 |
| RIP | 120 |
| EIGRP (external) | 170 |
| BGP (internal/iBGP) | 200 |
| Floating static (non-standard) | > 1 |

> **💡 Tip:** If the same network is learned from both OSPF and RIP, the OSPF route wins (AD=110 < 120). For a backup static route, use `ip route ... 200` (floating static).

---

## Protocol Metrics

| Protocol | Metric | Description |
|---|---|---|
| RIP | Hop count | Number of hops (max 15) |
| OSPF | Cost | 10⁸ / bandwidth |
| EIGRP | Composite | Bandwidth + Delay (+ Load, Reliability optional) |
| BGP | Path attributes | AS-PATH, LOCAL_PREF, MED, etc. |

---

## Route Selection

Route selection process:

1. **Longest Prefix Match**: most specific route
2. Equal prefix length → **lowest AD**
3. Equal AD → **lowest metric**
4. Equal metric → **load balancing** (ECMP: Equal-Cost Multi-Path)

### Selection Example

```
Destination: 10.1.1.5

Routes:
  O  10.0.0.0/8 [110/2]    - prefix /8
  S  10.1.0.0/16 [1/0]     - prefix /16
  O  10.1.1.0/24 [110/4]   - prefix /24  ← SELECTED (longest match)
```

---

## IOS Commands

```bash
# View routing table
Router# show ip route                           # entire table
Router# show ip route 10.1.1.0                 # specific prefix
Router# show ip route 10.1.1.0 255.255.255.0
Router# show ip route ospf                     # OSPF routes only
Router# show ip route static                   # static routes only
Router# show ip route connected                # connected routes only
Router# show ip route summary                  # summary

# IPv6 routing
Router# show ipv6 route
Router# show ipv6 route ospf

# Enable IP routing (L3 switch)
Switch(config)# ip routing
Switch(config)# ipv6 unicast-routing           # for IPv6

# Diagnostics
Router# show ip interface brief                # interface status
Router# show ip arp                            # ARP table
Router# ping 10.1.1.1 source gi0/0            # ping from specific interface
Router# traceroute 10.1.1.1
```

---

## Resources

| Resource | Description |
|---|---|
| [IP Routing (networklessons.com)](https://networklessons.com/ip-routing/ip-routing-explained) | How IP routing works: table, longest prefix match, AD |
| [Administrative Distance (networklessons.com)](https://networklessons.com/ip-routing/introduction-to-administrative-distance) | AD for different protocols: static, OSPF, EIGRP, RIP |
| [CEF: Cisco Express Forwarding](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipswitch_cef/configuration/xe-16/isw-cef-xe-16-book/isw-cef-overview.html) | Official documentation on Cisco Express Forwarding |
| [Jeremy's IT Lab: Routing Fundamentals (YouTube)](https://www.youtube.com/watch?v=rSqQk33FSVA) | Routing table, longest match, AD from the Free CCNA series |
| [show ip route: Cisco IOS Command](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_pi/configuration/xe-16/iri-xe-16-book/iri-ip-route-tab.html) | Official reference for the show ip route command |
| [Longest Prefix Match (networklessons.com)](https://networklessons.com/ip-routing/longest-prefix-match-routing) | Selecting the most specific route |
