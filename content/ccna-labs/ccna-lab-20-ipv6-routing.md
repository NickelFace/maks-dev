---
title: "Lab 20 · IPv6 Routing"
date: 2026-09-06
description: "Static IPv6 routes in all three forms, the default route, and why a link-local next hop always needs an interface to go with it."
tags: ["CCNA", "IPv6", "Routing", "Lab"]
categories: ["CCNA"]
domain: 3
tool: "Packet Tracer"
duration: "35 min"
sources: "Jeremy's IT Lab Day 33 · Flackbox 30-1"
---

IPv6 routing is IPv4 routing with different syntax and one genuine difference: the next hop is usually a **link-local** address, and a link-local address is only meaningful on one link. That single fact accounts for most of the syntax that looks unfamiliar.

## Topology

The Lab 19 topology, now with routes.

{{< topology cols="4" rows="2" caption="Three routers, dual-stack, static IPv6 routing" >}}
pc     PC1 "2001:db8:0:1::/64" at 0,0
router R1 "fe80::1" at 1,0
router R2 "fe80::2" at 2,0
router R3 "fe80::3" at 3,0
pc     PC2 "2001:db8:0:3::/64" at 3,1

PC1 — R1
R1 — R2 label="2001:db8:0:12::/64"
R2 — R3 label="2001:db8:0:23::/64"
R3 — PC2
{{< /topology >}}

| Router | LAN | Links | Link-local |
|---|---|---|---|
| R1 | 2001:db8:0:1::1/64 | 2001:db8:0:12::1/64 | fe80::1 |
| R2 | — | 2001:db8:0:12::2/64, 2001:db8:0:23::1/64 | fe80::2 |
| R3 | 2001:db8:0:3::1/64 | 2001:db8:0:23::2/64 | fe80::3 |

## Objectives

- Configure static IPv6 routes with a global next hop, an exit interface, and both together
- Explain why a link-local next hop is invalid without an interface
- Configure an IPv6 default route and verify the gateway of last resort
- Read `show ipv6 route` and identify the code for each entry
- Confirm end-to-end reachability with a sourced ping

---

## Part 1 — The three forms, again

{{< step num="1" dev="R1" title="Global next hop — the safe default" open="true" >}}
```
R1(config)#ipv6 unicast-routing
R1(config)#ipv6 route 2001:DB8:0:3::/64 2001:DB8:0:12::2
R1(config)#ipv6 route 2001:DB8:0:23::/64 2001:DB8:0:12::2
```

Same shape as IPv4: `ipv6 route <prefix>/<len> <next-hop>`. The next hop is a **global** address on the shared link, so the router can resolve it recursively exactly as it would in IPv4.

This form is the easiest to read and the easiest to audit. Its weakness is that it depends on the neighbour's global address never changing — and in IPv6, renumbering the global prefix is a routine operation.
{{< /step >}}

{{< step num="2" dev="R1" title="Link-local next hop — and why the interface is mandatory" >}}
```
R1(config)#ipv6 route 2001:DB8:0:3::/64 GigabitEthernet0/1 FE80::2
```

The exit interface is **not optional** here. R2's link-local address `fe80::2` exists on every one of R2's interfaces, and R1 itself may have several links. Without naming the interface the router cannot know which link `fe80::2` refers to.

IOS refuses the shorter form outright:

```
R1(config)#ipv6 route 2001:DB8:0:3::/64 FE80::2
% Interface has to be specified for a link-local nexthop
```

The error message is unambiguous, which is more than can be said for most IOS errors.

**Use link-local next hops for infrastructure routing.** The link-local address is derived from the hardware and never changes when the site is renumbered, so the route survives a global prefix change that would break the previous form. It is the same reasoning that makes hosts use a link-local default gateway.
{{< /step >}}

{{< step num="3" dev="R2, R3" title="Complete the topology, and add a default at the stub" >}}
R2 is transit and needs both directions:

```
R2(config)#ipv6 unicast-routing
R2(config)#ipv6 route 2001:DB8:0:1::/64 GigabitEthernet0/0 FE80::1
R2(config)#ipv6 route 2001:DB8:0:3::/64 GigabitEthernet0/1 FE80::3
```

R3 has exactly one way out, so it gets a default rather than a list:

```
R3(config)#ipv6 unicast-routing
R3(config)#ipv6 route ::/0 GigabitEthernet0/0 FE80::2
```

**`::/0` is the IPv6 default route** — the direct equivalent of `0.0.0.0/0`, and it wins a longest-prefix comparison against nothing.

The exit-interface-only form also exists and carries the same caveat as IPv4:

```
R3(config)#ipv6 route ::/0 GigabitEthernet0/0
```

On a point-to-point link this is fine. On Ethernet the router has to resolve the destination itself via NDP and hope something answers, which is the IPv6 version of relying on proxy ARP. Name the next hop.

Floating static routes work identically — a trailing administrative distance:

```
R3(config)#ipv6 route ::/0 GigabitEthernet0/1 FE80::9 200
```
{{< /step >}}

{{< verify dev="R1" cmd="show ipv6 route" open="true" >}}
```
R1#show ipv6 route
IPv6 Routing Table - default - 7 entries
Codes: C - Connected, L - Local, S - Static, U - Per-user Static route
       B - BGP, R - RIP, H - NHRP, I1 - ISIS L1, I2 - ISIS L2
       O - OSPF Intra, OI - OSPF Inter, OE1 - OSPF ext 1, OE2 - OSPF ext 2
       ND - ND Default, NDp - ND Prefix, DCE - Destination, NDr - Redirect

C   2001:DB8:0:1::/64 [0/0]
     via GigabitEthernet0/0, directly connected
L   2001:DB8:0:1::1/128 [0/0]
     via GigabitEthernet0/0, receive
C   2001:DB8:0:12::/64 [0/0]
     via GigabitEthernet0/1, directly connected
L   2001:DB8:0:12::1/128 [0/0]
     via GigabitEthernet0/1, receive
S   2001:DB8:0:3::/64 [1/0]
     via FE80::2, GigabitEthernet0/1
S   2001:DB8:0:23::/64 [1/0]
     via 2001:DB8:0:12::2
L   FF00::/8 [0/0]
     via Null0, receive
```

Differences from an IPv4 table worth noting:

- **`L` entries are /128**, not /32 — same idea, different address length.
- **`L FF00::/8 via Null0, receive`** is always present. It is how the router accepts multicast destined for itself, and it appears on every IPv6-enabled router.
- The **`ND`** codes have no IPv4 equivalent: `NDp` is a prefix learned from a Router Advertisement, `ND` a default route learned the same way. A router configured with `ipv6 address autoconfig` picks up routes this way.
- Administrative distances are identical to IPv4 — static 1, OSPFv3 110, EIGRPv6 90.

Query a single destination the same way as IPv4:

```
R1#show ipv6 route 2001:DB8:0:3::5
Routing entry for 2001:DB8:0:3::/64
  Known via "static", distance 1, metric 0
  Route count is 1/1, share count 0
  Routing paths:
    FE80::2, GigabitEthernet0/1
```
{{< /verify >}}

{{< verify dev="R3" cmd="show ipv6 route ::/0" >}}
```
R3#show ipv6 route ::/0
Routing entry for ::/0
  Known via "static", distance 1, metric 0, type static
  Route count is 1/1, share count 0
  Routing paths:
    FE80::2, GigabitEthernet0/0
      Last updated 00:03:41 ago
```

And the summary line, which names the gateway of last resort:

```
R3#show ipv6 route | include ::/0
S   ::/0 [1/0]
```
{{< /verify >}}

---

## Part 2 — Prove it end to end

{{< verify dev="R1" cmd="ping and traceroute over IPv6" open="true" >}}
```
R1#ping 2001:DB8:0:3::1 source 2001:DB8:0:1::1
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 2001:DB8:0:3::1, timeout is 2 seconds:
Packet sent with a source address of 2001:DB8:0:1::1
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 1/4/12 ms
```

The `source` keyword matters more in IPv6 than in IPv4, because a router has several addresses per interface and will otherwise pick one you did not intend. Sourcing from the LAN address is the test that actually proves the LAN prefix is reachable in both directions.

```
R1#traceroute 2001:DB8:0:3::1

Type escape sequence to abort.
Tracing the route to 2001:DB8:0:3::1

  1 2001:DB8:0:12::2  0 msec  0 msec  0 msec
  2 2001:DB8:0:3::1   1 msec  0 msec  1 msec
```

Traceroute reports **global** addresses even though the routes use link-local next hops, because the ICMPv6 Time Exceeded is sourced from a routable address. That mismatch between what is in the config and what is in the trace is normal and worth expecting.

From the host:

```
PC> ping 2001:db8:0:3::1
Reply from 2001:DB8:0:3::1: bytes=32 time=3ms TTL=62
```
{{< /verify >}}

{{< verify dev="R2" cmd="show ipv6 neighbors and show ipv6 interface" >}}
Confirm NDP resolved the next hops the routes depend on:

```
R2#show ipv6 neighbors
IPv6 Address                              Age Link-layer Addr State Interface
FE80::1                                     0 0060.4711.2c01  REACH Gi0/0
FE80::3                                     1 00d0.9744.2c19  REACH Gi0/1
```

A static route whose link-local next hop shows `INCMP` here will never forward anything. That is the IPv6 equivalent of an incomplete ARP entry, and it is the first thing to check when a route exists but traffic does not flow.

And the interface-level counters:

```
R2#show ipv6 interface GigabitEthernet0/0 | include ND|MTU
  MTU is 1500 bytes
  ND DAD is enabled, number of DAD attempts: 1
  ND reachable time is 30000 milliseconds
```
{{< /verify >}}

---

## Part 3 — What OSPFv3 changes

{{< step num="4" dev="R1, R2, R3" title="A dynamic protocol, for contrast" >}}
The CCNA blueprint covers OSPFv2 for IPv4 in depth and OSPFv3 only conceptually, but a two-minute look is worth it because the differences are instructive.

```
R1(config)#ipv6 router ospf 1
R1(config-rtr)#router-id 1.1.1.1
R1(config-rtr)#exit
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ipv6 ospf 1 area 0
R1(config-if)#exit
R1(config)#interface GigabitEthernet0/1
R1(config-if)#ipv6 ospf 1 area 0
```

Four differences from OSPFv2:

**There are no `network` statements.** OSPFv3 is enabled per interface, full stop. That removes the entire wildcard-mask class of mistakes.

**The router-ID is still a 32-bit dotted-quad** and must be configured manually, because an IPv6-only router has no IPv4 address to derive one from. Omit it and the process refuses to start.

**Adjacencies form over link-local addresses.** The neighbour table shows link-local next hops, and the LSAs carry them.

**Authentication uses IPsec**, not the protocol's own MD5 — IPv6 has AH and ESP built into the header chain, so OSPFv3 delegates to them.

Verification is the same shape with `ipv6` in front:

```
R1#show ipv6 ospf neighbor
R1#show ipv6 ospf interface brief
R1#show ipv6 route ospf
```
{{< /step >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| `% Interface has to be specified for a link-local nexthop` | link-local next hop with no interface | add the exit interface |
| Route in the table, traffic dropped | next hop unresolved | `show ipv6 neighbors` — look for INCMP |
| Router will not route IPv6 at all | `ipv6 unicast-routing` missing | `show run \| include unicast-routing` |
| Route disappeared after renumbering | global next hop changed | use a link-local next hop |
| Hosts have addresses, no default route | RAs suppressed or no link-local on the router | `show ipv6 interface` |
| OSPFv3 process will not start | no router-ID and no IPv4 address to derive one | configure `router-id` |
| Ping works from the router, not from the host | asymmetric routing — no return route for the LAN prefix | `show ipv6 route <lan>` on the far router |

## Exam notes

- `ipv6 route <prefix>/<len> [interface] <next-hop> [AD]`. Default route is **`::/0`**.
- A **link-local next hop always requires an exit interface**. A global next hop does not.
- `ipv6 unicast-routing` is required for routing and for Router Advertisements.
- Administrative distances match IPv4: static 1, EIGRPv6 90, OSPFv3 110.
- `L` local routes are **/128**. `L FF00::/8 via Null0` is always present.
- `NDp` = prefix learned from an RA; `ND` = default route learned from an RA.
- OSPFv3: **no `network` statements** (enabled per interface), **32-bit router-ID required**, adjacencies over link-local, authentication via IPsec.
- Hop Limit replaces TTL; the field does the same job.

---

*Sources: Jeremy's IT Lab Day 33 · Flackbox CCNA Lab Guide 30-1 · verified in Packet Tracer 8.2.*
