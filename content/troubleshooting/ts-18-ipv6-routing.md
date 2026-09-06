---
title: "IPv6 Routing Protocols and Tunnels"
date: 2026-09-06
description: "RIPng that runs nowhere because there is no network command, OSPFv3 that will not start without a manual router-ID, redistribution that quietly omits connected prefixes, and a 6to4 tunnel that is up/up and carries nothing."
tags: ["Troubleshooting", "IPv6", "OSPFv3", "RIPng", "Tunnel", "Cisco"]
categories: ["Troubleshooting"]
unit: 6
---

Every IPv6 routing protocol moved activation from the routing process to the interface. There is no `network` statement in RIPng and none in OSPFv3 — an interface participates because you told that interface to participate, and for no other reason. Half the faults on this page are that change, met by an engineer with IPv4 habits. The other half are the things IPv6 does differently underneath: adjacencies over link-local addresses, connected prefixes that are not redistributed by default, and tunnels that cannot carry multicast.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| RIPng configured, no routes anywhere | **`ipv6 rip <name> enable` missing** on the interfaces | `show ipv6 protocols` |
| Some prefixes advertised, others not | RIPng not enabled on that specific interface | `show ipv6 protocols` — the Interfaces list |
| Two RIPng processes on one router | **process name typed with different case** | `show ipv6 rip` |
| OSPFv3 configured, no neighbours, no errors | **no router-ID** on a router with no IPv4 addresses | `show ipv6 ospf \| include ID` |
| Neighbour stuck in `EXSTART`/`EXCHANGE` | **MTU mismatch** | `show ipv6 ospf interface \| include MTU` |
| Neighbour never leaves `INIT` | one side is not hearing the other — timers or filtering | `show ipv6 ospf interface` both ends |
| Adjacency up, prefix absent | interface not enabled in OSPFv3, or wrong area | `show ipv6 ospf interface brief` |
| Redistribution done, connected prefixes missing | **`include-connected` not specified** | `show ipv6 route` on the receiver |
| Tunnel up/up, nothing crosses it | 6to4 addressing or the `2002::/16` route | `show ipv6 route 2002::/16` |
| Routing protocol will not form over a tunnel | 6to4 is **unicast only** — by design | `show interfaces tunnel 0` |

---

## RIPng: there is no network command

This is the whole story, and it is worth stating flatly because the configuration looks complete without it. `ipv6 router rip MYPROC` creates a process. It enables RIPng on exactly zero interfaces. Every interface that should run RIPng needs the command applied to it directly:

```
R1(config)#ipv6 router rip MYPROC
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ipv6 rip MYPROC enable
R1(config-if)#interface GigabitEthernet0/1
R1(config-if)#ipv6 rip MYPROC enable
```

The interface list is the diagnostic, and it is the first thing to look at when routes are missing:

```
R1#show ipv6 protocols
IPv6 Routing Protocol is "connected"
IPv6 Routing Protocol is "rip MYPROC"
  Interfaces:
    GigabitEthernet0/0
  Redistribution:
    None
```

One interface. `GigabitEthernet0/1` has an address, is up, and is invisible to RIPng — so neither does it send updates out of it, nor does it advertise its own connected prefix. **In RIPng the per-interface command does both jobs** that `network` did in RIPv2: it starts the adjacency and it advertises the prefix. Loopbacks are the usual casualty, because they never need to send anything and so people leave them out and then wonder why the loopback prefix is missing.

```
R1(config)#interface Loopback0
R1(config-if)#ipv6 rip MYPROC enable
```

### The process name is case-sensitive and purely local

The name is a local label. R1 running `MYPROC` and R2 running `RIPNG` will exchange routes without complaint — unlike an EIGRP AS number, the name never travels in a packet. What the name must match is **itself, on the same router**:

```
R1(config)#ipv6 router rip MYPROC
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ipv6 rip myproc enable    ! different name — creates a second process
```

IOS accepts this and silently instantiates a second RIPng process called `myproc`. Two processes, each with half the configuration, neither working:

```
R1#show ipv6 rip
RIP process "MYPROC", port 521, multicast-group FF02::9, pid 187
     Administrative distance is 120. Maximum paths is 16
     Updates every 30 seconds, expire after 180
     Holddown lasts 0 seconds, garbage collect after 120
     Split horizon is on; poison reverse is off
  Interfaces:
    None
RIP process "myproc", port 521, multicast-group FF02::9, pid 188
  Interfaces:
    GigabitEthernet0/0
```

`Interfaces: None` under the process you configured is the tell.

### What else stops RIPng

`ipv6 unicast-routing` is required before any of this matters — without it the router runs RIPng, learns routes, installs them, and does not forward a single packet. The transport is **UDP port 521 to `FF02::9`**, sourced from the interface's link-local address, so any ACL that filters ICMPv6 or high UDP on the segment stops updates dead while leaving the interfaces up.

Split horizon is on by default and correct for nearly everything. On a hub-and-spoke topology where the hub must re-advertise a spoke's routes back out the same interface, it has to go — and the command is applied per interface, not per process:

```
R1(config-if)#no ipv6 rip MYPROC split-horizon
```

---

## OSPFv3: the router-ID comes first

An OSPFv2 process on a router with no IPv4 address anywhere still finds a router-ID, because most routers have IPv4 addresses. **An OSPFv3 process on a pure IPv6 router has nothing to derive one from.** The router-ID is still a 32-bit value written in dotted-decimal, and there is no IPv6 fallback. The process does not start:

```
%OSPFv3-4-NORTRID: OSPFv3 process 1 could not pick a router-id,
                   please configure manually
```

```
R1#show ipv6 ospf | include ID
 Routing Process "ospfv3 1" with ID 0.0.0.0
```

`0.0.0.0` means the process is inert. It accepts configuration, it appears in `show running-config`, and it forms nothing.

```
R1(config)#ipv6 router ospf 1
R1(config-rtr)#router-id 1.1.1.1
```

Configure it explicitly on every router, IPv4 present or not — a router that picks up an ID from some interface address today will pick a different one after that interface is renumbered, and an OSPF process that changes router-ID resets every adjacency it has.

### Enabling it on the interfaces

```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ipv6 ospf 1 area 0
```

Same principle as RIPng: no `network`, one command per interface. Verify with the brief form rather than reading the running config:

```
R1#show ipv6 ospf interface brief
Interface    PID   Area            Intf ID    Cost  State Nbrs F/C
Gi0/0        1     0               2          1     DR    1/1
Lo0          1     0               4          1     LOOP  0/0
```

`Nbrs F/C` is full/count. `1/1` is healthy. `0/1` means a neighbour is known and the adjacency never completed, which is the MTU or timer case below.

### Neighbours are named by router-ID, addressed by link-local

```
R1#show ipv6 ospf neighbor

Neighbor ID     Pri   State           Dead Time   Interface ID    Interface
2.2.2.2           1   FULL/BDR        00:00:33    2               GigabitEthernet0/0
```

There is no IPv6 address in that output. Hellos are sent from the interface link-local address to `FF02::5`, next hops in the LSDB are link-local addresses, and the only identity in the neighbour table is the 32-bit router-ID. Two practical consequences: **duplicate router-IDs anywhere in the area break OSPF in ways the neighbour table cannot show you**, and a global address is not required on the interface at all — `ipv6 enable` is enough for an adjacency to form, even though nothing will be reachable across it.

The link-local address is one line further into the interface output:

```
R1#show ipv6 ospf interface GigabitEthernet0/0
GigabitEthernet0/0 is up, line protocol is up
  Link Local Address FE80::21A:2FFF:FEC1:5A01, Interface ID 2
  Area 0, Process ID 1, Instance ID 0, Router ID 1.1.1.1
  Network Type BROADCAST, Cost: 1
  Transmit Delay is 1 sec, State DR, Priority 1
  Designated Router (ID) 1.1.1.1, local address FE80::21A:2FFF:FEC1:5A01
  Backup Designated Router (ID) 2.2.2.2, local address FE80::21A:2FFF:FEC1:5B02
  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5
```

Four values in that block have to match the far end, and each fails differently:

| Value | Mismatch symptom | Where to look |
|---|---|---|
| **Area** | no adjacency at all; hellos ignored silently | `Area 0, Process ID 1` |
| **Instance ID** | no adjacency; hellos discarded before processing | `Instance ID 0` |
| **Hello / Dead** | no adjacency; both sides see nothing | `Timer intervals configured` |
| **Network type** | adjacency forms or does not, depending on the pair | `Network Type BROADCAST` |
| **MTU** | adjacency reaches `EXSTART`/`EXCHANGE` and stops there | `show interfaces` on both ends |

**Instance ID is the OSPFv3-only one**, and it is the hardest to spot because it defaults to 0 everywhere and appears in no error message. It exists so that several OSPFv3 instances can share one link — for address families, or for separate administrative domains — and a router only processes hellos whose instance ID matches the interface's. Set it on one side by accident and the two routers are deaf to each other while every other parameter reads identically:

```
R1(config-if)#ipv6 ospf 1 area 0 instance 1
```

**MTU mismatch is the one that gets partway.** OSPF carries the interface MTU in its Database Description packets and refuses to proceed if the values differ, so the neighbour appears in the table and never reaches `FULL`:

```
R1#show ipv6 ospf neighbor

Neighbor ID     Pri   State           Dead Time   Interface ID    Interface
2.2.2.2           1   EXSTART/DROTHER 00:00:36    2               GigabitEthernet0/0
```

Fix the MTU. Failing that, and understanding the risk of a link where the two ends genuinely disagree about frame size, suppress the check:

```
R1(config-if)#ipv6 ospf mtu-ignore
```

---

## Redistribution: connected prefixes are not included

This is the IPv6 behaviour that catches people who have done IPv4 redistribution for years. In IPv4, `redistribute ospf 1` carries the OSPF routes and `redistribute connected` carries the connected ones, and between them everything moves. In IPv6, **redistributing a protocol does not bring across the connected prefixes of that protocol's own interfaces** unless you say so:

```
R2(config)#ipv6 router eigrp 1
R2(config-rtr)#redistribute ospf 1 metric 10000 100 255 1 1500
```

The receiving router gets the OSPF-learned prefixes and does not get the subnet on the link between R1 and R2 — the one interface everything traverses. The symptom is partial reachability that looks like an ACL: remote LANs answer, the transit link does not.

```
R2(config-rtr)#redistribute ospf 1 metric 10000 100 255 1 1500 include-connected
```

Two smaller differences worth holding onto. **There is no `subnets` keyword in OSPFv3** — it existed in IPv4 OSPF only because of classful boundaries, and IPv6 has none, so all prefixes redistribute automatically. And the **seed metric rule is unchanged from IPv4**: redistributing into EIGRP without a metric produces routes with an infinite metric that are never advertised, while OSPF applies a default metric of 20 and works without one.

```
R2#show ipv6 protocols
IPv6 Routing Protocol is "eigrp 1"
  Interfaces:
    GigabitEthernet0/1
  Redistribution:
    Redistributing protocol ospf 1 (internal, external 1 & 2) include-connected
```

Read `Redistribution:` on the redistributing router, then `show ipv6 route` on the receiving one. If the source protocol has the prefix and the redistributing router's `Redistribution:` line looks right, the next suspect is a prefix-list on a distribute-list, not the redistribute statement.

---

## Automatic 6to4 tunnels

6to4 carries IPv6 across an IPv4-only path by encoding the IPv4 tunnel endpoint inside the IPv6 address. The prefix is `2002::/16`; the next 32 bits are the IPv4 address in hex; the result is a /48 belonging to that endpoint.

```
IPv4 203.0.113.1  →  CB . 00 . 71 . 01  →  2002:CB00:7101::/48
IPv4 192.0.2.1    →  C0 . 00 . 02 . 01  →  2002:C000:0201::/48
```

Because the destination address contains the far-end IPv4 address, the tunnel needs no destination configured — the router extracts it from each packet at forwarding time. That is what makes it "automatic", and it is also the source of every symptom below.

Hand conversion to hex is where most of these tunnels die. Let IOS do it:

```
R1(config)#ipv6 general-prefix MYPREFIX 6to4 GigabitEthernet0/0
```

```
R1#show ipv6 general-prefix
IPv6 Prefix MYPREFIX, acquired via 6to4
   2002:CB00:7101::/48
   Tunnel0 (Address command)
```

```
R1(config)#interface Tunnel0
R1(config-if)#ipv6 address MYPREFIX ::1/64
R1(config-if)#tunnel source GigabitEthernet0/0
R1(config-if)#tunnel mode ipv6ip 6to4
R1(config)#ipv6 route 2002::/16 Tunnel0
```

### Up/up and carrying nothing

A tunnel interface's line protocol reports on the tunnel source, not on the far end. **`Tunnel0 is up, line protocol is up` means the source interface is up and the router has a route to it — nothing more.** There is no keepalive on a 6to4 tunnel, no far end to negotiate with, and no state to lose. It will read up/up while the remote router is powered off.

```
R1#show interfaces Tunnel0
Tunnel0 is up, line protocol is up
  Hardware is Tunnel
  MTU 1480 bytes, BW 100 Kbit/sec, DLY 50000 usec
  Tunnel source 203.0.113.1 (GigabitEthernet0/0), destination UNKNOWN
  Tunnel protocol/transport IPv6 6to4
  Tunnel TTL 255, Fast tunneling enabled
```

`destination UNKNOWN` is correct and expected here — it is derived per packet. Two details in that output are worth noting: the **MTU is 1480**, because the 20-byte IPv4 header comes out of 1500, and the transport line confirms the mode actually applied.

Work the failure in this order, because each step depends on the one before it:

```
R1#ping 192.0.2.1                      ! IPv4 transport first — no IPv4, no tunnel
!!!!!
R1#show ipv6 interface Tunnel0 | include 2002
    2002:CB00:7101:1::1, subnet is 2002:CB00:7101:1::/64
R1#show ipv6 route 2002::/16
S   2002::/16 [1/0]
     via Tunnel0
R1#ping 2002:C000:0201:1::1
```

A missing or misdirected `2002::/16` static route is the most common fault after bad hex. Without it the router has a working tunnel and no reason to use it, and packets to 6to4 addresses follow the default route into the IPv4 world instead.

### Why 6to4 cannot run a routing protocol

A 6to4 tunnel is point-to-multipoint and **unicast only**. It has no destination, so there is nothing for a multicast or broadcast packet to be encapsulated towards — the router cannot resolve `FF02::5` or `FF02::9` into an IPv4 destination, because those addresses contain no IPv4 address to extract. OSPFv3 hellos and RIPng updates are silently not sent.

The consequence is architectural rather than a fault to fix: **routing across a 6to4 tunnel is static routing.** `ipv6 route 2002::/16 Tunnel0` covers all 6to4 destinations; a native IPv6 prefix reachable behind a 6to4 peer needs its own static route, pointed at the peer's 6to4 address rather than at the tunnel interface:

```
R1(config)#ipv6 route 2001:DB8:2::/64 2002:C000:0201:1::1
```

If a design requires a routing protocol over an IPv4 path, the answer is a manually configured tunnel (`tunnel mode ipv6ip` with an explicit `tunnel destination`) or GRE, both of which are point-to-point and carry multicast.

---

## Quick reference

| Command | Proves |
|---|---|
| `show ipv6 protocols` | which interfaces each protocol actually runs on, and the redistribution statements |
| `show ipv6 rip` | RIPng process names, timers, split horizon, and the interface list per process |
| `show ipv6 route rip` | whether RIPng routes reached the RIB |
| `show ipv6 ospf \| include ID` | the router-ID — **`0.0.0.0` means the process never started** |
| `show ipv6 ospf neighbor` | adjacency state by router-ID; `EXSTART` points at MTU |
| `show ipv6 ospf interface brief` | enabled interfaces, area, and full/known neighbour counts |
| `show ipv6 ospf interface <int>` | area, instance ID, timers, network type, link-local address |
| `show ipv6 route` | the result of everything above — what is actually installed |
| `show ipv6 general-prefix` | the 6to4 prefix IOS computed, so you need not trust hand-converted hex |
| `show interfaces tunnel 0` | tunnel mode, source, MTU 1480, and `destination UNKNOWN` for 6to4 |
| `show ipv6 route 2002::/16` | the static route without which the tunnel is never used |

---

*Based on the NetworkLessons troubleshooting series: IPv6 RIPng, OSPFv3 neighbor adjacencies, IPv6 redistribution, and automatic 6to4 tunnels.*
