---
title: "CCNA 3.2 Static Routing"
date: 2026-08-13
description: "Configuring static routes on Cisco IOS: ip route syntax, default route, floating static routes, IPv6 static routes and topology configuration examples."
tags: ["CCNA", "Cisco", "static routing", "ip route", "IPv6"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-3-02-static-routing/"
---

## Types of Static Routes

| Type | Description | Usage |
|---|---|---|
| Standard static | Specific destination network | Specific route |
| Default static | 0.0.0.0/0, any destination | Gateway of last resort |
| Summary static | Summarizes multiple networks | Reduces table size |
| Floating static | Backup route with higher AD | Failover |

---

## ip route Command Syntax

```bash
Router(config)# ip route [network] [mask] {next-hop | exit-interface} [AD] [permanent]
```

### Route Specification Options

**1. Next-hop, recommended for Ethernet:**
```bash
Router(config)# ip route 10.0.0.0 255.255.0.0 192.168.1.2
```

**2. Exit-interface; for point-to-point (serial):**
```bash
Router(config)# ip route 10.0.0.0 255.255.0.0 serial 0/0/0
```

**3. Fully specified (both), recommended for Ethernet to avoid proxy ARP:**
```bash
Router(config)# ip route 10.0.0.0 255.255.0.0 gigabitethernet 0/0 192.168.1.2
```

> **📌 Important:** On Ethernet interfaces, using exit-interface alone without a next-hop is **not recommended**; it causes recursive lookup and proxy ARP. Use fully-specified or next-hop.

### The permanent keyword

```bash
Router(config)# ip route 10.0.0.0 255.0.0.0 192.168.1.2 permanent
```
The route remains in the table even if the next-hop interface goes down.

---

## Default Route

```bash
# IPv4 default route
Router(config)# ip route 0.0.0.0 0.0.0.0 203.0.113.1           # next-hop
Router(config)# ip route 0.0.0.0 0.0.0.0 gigabitethernet 0/1   # exit-int

# Verification
Router# show ip route
# S*   0.0.0.0/0 [1/0] via 203.0.113.1
# Asterisk * = candidate for gateway of last resort
```

> **💡 Tip:** The default route is used when no more specific match exists in the routing table. `S*`, default static route (candidate for gateway of last resort).

---

## Floating Static Routes (Backup Routes)

A static route with a higher AD than the primary protocol, installed only when the primary route disappears.

```bash
# Primary route via OSPF (AD=110) takes preference
# Backup static (AD=200) activates when OSPF route is gone

Router(config)# ip route 10.0.0.0 255.255.0.0 192.168.2.1 200
# 200 = AD higher than OSPF (110), route will not appear while OSPF is active
```

| Primary Protocol | Primary AD | Floating Static AD |
|---|:---:|:---:|
| EIGRP | 90 | ≥ 91 |
| OSPF | 110 | ≥ 111 |
| RIP | 120 | ≥ 121 |

---

## IPv6 Static Routes

```bash
# Enable IPv6 routing
Router(config)# ipv6 unicast-routing

# IPv6 static (next-hop)
Router(config)# ipv6 route 2001:DB8:2::/64 2001:DB8:1::2

# IPv6 static (exit-interface)
Router(config)# ipv6 route 2001:DB8:2::/64 gigabitethernet 0/0

# IPv6 default
Router(config)# ipv6 route ::/0 2001:DB8:1::1

# IPv6 floating static
Router(config)# ipv6 route 2001:DB8:2::/64 2001:DB8:3::2 200

# Verification
Router# show ipv6 route
Router# show ipv6 route static
```

---

## Commands and Diagnostics

```bash
# View
Router# show ip route static
Router# show ip route 0.0.0.0                  # default route

# Remove route
Router(config)# no ip route 10.0.0.0 255.255.0.0 192.168.1.2

# Traceroute
Router# traceroute 10.0.0.1
Router# traceroute 10.0.0.1 source loopback0

# Extended ping
Router# ping 10.0.0.1 source 192.168.1.1 repeat 100

# Debug
Router# debug ip routing                        # routing table changes
# (disable: no debug ip routing / undebug all)
```

---

## Configuration Example

```
Topology: R1 -- R2 -- R3
           gi0/0    gi0/0  gi0/1   gi0/1
     .1         .2  .1         .2   .1
192.168.1.0/30    10.0.0.0/30    172.16.0.0/24
```

```bash
# R1 - route to 172.16.0.0 via R2
R1(config)# ip route 172.16.0.0 255.255.0.0 192.168.1.2
R1(config)# ip route 10.0.0.0 255.255.255.252 192.168.1.2  # transit R2-R3

# R3 - route back via R2
R3(config)# ip route 192.168.1.0 255.255.255.0 10.0.0.1

# R2 - routes for both ends (or default)
R2(config)# ip route 0.0.0.0 0.0.0.0 10.0.0.2   # toward R3
```

---

## Resources

| Resource | Description |
|---|---|
| [Static Routing (networklessons.com)](https://networklessons.com/ip-routing/how-to-configure-static-route-on-cisco-ios-router) | Static routes: next-hop, exit interface, recursive lookup |
| [Default Route (networklessons.com)](https://networklessons.com/cisco/ccna-routing-switching-icnd1-100-105/default-route) | Default route 0.0.0.0/0: configuration and usage |
| [Floating Static Routes (networklessons.com)](https://networklessons.com/ip-routing/floating-static-route) | Floating static routes as a backup path |
| [IPv6 Static Routes (networklessons.com)](https://networklessons.com/ipv6/how-to-configure-ipv6-static-route) | Static routes for IPv6 on Cisco IOS |
| [Jeremy's IT Lab: Static Routing (YouTube)](https://www.youtube.com/watch?v=3qKNNJvXGek) | Static routing from the Free CCNA series |
| [Cisco Static Route Configuration](https://www.cisco.com/c/en/us/support/docs/ip/ip-routing/116217-technote-ios-static-route.html) | Official Cisco documentation on static routes |
