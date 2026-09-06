---
title: "Lab 15 · Dynamic Routing: RIPv2 and EIGRP"
date: 2026-09-06
description: "Two distance-vector protocols side by side — one counting hops with a 30-second timer, one tracking feasible successors and converging instantly."
tags: ["CCNA", "RIP", "EIGRP", "Routing", "Lab"]
categories: ["CCNA"]
domain: 3
tool: "Packet Tracer"
duration: "50 min"
sources: "Jeremy's IT Lab Day 24, 25 · Flackbox 17, 19-1"
aliases: ["/ccna-labs/ccna-lab-17-dynamic-routing/", "/ccna-labs/ccna-lab-19-igp-fundamentals/"]
---

Static routes do not scale and they do not react. A dynamic protocol solves both, and the CCNA blueprint asks you to *understand* RIP and EIGRP even though it only asks you to *configure* OSPF. Building both is still worth an hour: RIP shows you what distance vector looks like when it goes wrong, and EIGRP's topology table is the clearest illustration in the whole syllabus of the difference between "a route" and "a route I am prepared to use".

## Topology

{{< topology cols="3" rows="3" caption="Three routers in a triangle with a LAN on each — redundant paths, so the protocol has to choose" >}}
router R1 "10.1.1.0/24" at 0,1
router R2 "10.2.2.0/24" at 1,0
router R3 "10.3.3.0/24" at 2,1

R1 — R2 label="10.0.12.0/30"
R2 — R3 label="10.0.23.0/30"
R1 — R3 label="10.0.13.0/30"
{{< /topology >}}

| Router | LAN | Links |
|---|---|---|
| R1 | 10.1.1.1/24 | 10.0.12.1/30, 10.0.13.1/30 |
| R2 | 10.2.2.1/24 | 10.0.12.2/30, 10.0.23.1/30 |
| R3 | 10.3.3.1/24 | 10.0.13.2/30, 10.0.23.2/30 |

## Objectives

- Configure RIPv2, disable auto-summary, and see why that matters with discontiguous networks
- Read the RIP timers and explain what each one prevents
- Configure EIGRP and read the neighbour, topology and routing tables as three distinct things
- Identify a successor and a feasible successor, and apply the feasibility condition by hand
- Compare convergence by breaking the same link under each protocol

---

## Part 1 — RIPv2

{{< step num="1" dev="R1" title="Enable RIP and turn off the 1988 defaults" open="true" >}}
```
R1(config)#router rip
R1(config-router)#version 2
R1(config-router)#no auto-summary
R1(config-router)#network 10.0.0.0
R1(config-router)#passive-interface GigabitEthernet0/0
R1(config-router)#end
```

Four lines, three of which exist to undo a default.

**`version 2`** is mandatory. RIPv1 is classful — it does not carry subnet masks in its updates at all, so every subnet of a major network is assumed to have the same mask as the receiving interface. With a VLSM design it produces silently wrong routing.

**`no auto-summary`** stops RIP summarising to the classful boundary when advertising across it. Without it, R1 advertises `10.0.0.0/8` instead of `10.1.1.0/24`, and if 10.x subnets exist on more than one side of a non-10.x network — a discontiguous network — each router advertises the same /8 and the traffic goes to whichever it heard from first. The result is a routing black hole that appears intermittently.

**`network 10.0.0.0`** is classful in RIP no matter what you type. Enter `network 10.0.12.0` and IOS silently rewrites it to `10.0.0.0`:

```
R1#show running-config | section router rip
router rip
 version 2
 network 10.0.0.0
 no auto-summary
```

So one statement covers every 10.x interface on the router. That is convenient and imprecise, which is why `passive-interface` matters more here than elsewhere.

**`passive-interface`** stops RIP sending updates out of the LAN interface while still advertising the LAN's prefix. There is no router on that segment, so the updates are pure waste — and an unauthenticated routing update broadcast onto a user LAN is an invitation.
{{< /step >}}

{{< step num="2" dev="R2, R3" title="The same on the other two" >}}
```
R2(config)#router rip
R2(config-router)#version 2
R2(config-router)#no auto-summary
R2(config-router)#network 10.0.0.0
R2(config-router)#passive-interface GigabitEthernet0/0
R2(config-router)#end
```

```
R3(config)#router rip
R3(config-router)#version 2
R3(config-router)#no auto-summary
R3(config-router)#network 10.0.0.0
R3(config-router)#passive-interface GigabitEthernet0/0
R3(config-router)#end
```

A cleaner habit on a router with many LANs is to invert the default:

```
R2(config-router)#passive-interface default
R2(config-router)#no passive-interface GigabitEthernet0/1
R2(config-router)#no passive-interface GigabitEthernet0/2
```
{{< /step >}}

{{< verify dev="R1" cmd="show ip route rip" open="true" >}}
```
R1#show ip route rip
      10.0.0.0/8 is variably subnetted, 8 subnets, 2 masks
R        10.2.2.0/24 [120/1] via 10.0.12.2, 00:00:11, GigabitEthernet0/1
R        10.3.3.0/24 [120/1] via 10.0.13.2, 00:00:04, GigabitEthernet0/2
R        10.0.23.0/30 [120/1] via 10.0.12.2, 00:00:11, GigabitEthernet0/1
                      [120/1] via 10.0.13.2, 00:00:04, GigabitEthernet0/2
```

`[120/1]` — AD 120, metric 1. **RIP's metric is hop count and nothing else.** A 10 Gbps path three hops long loses to a 64 kbps path two hops long, every time. That single fact is why RIP is not deployed.

The maximum usable metric is **15**; **16 means unreachable** and is how RIP poisons a route. That caps the network diameter at fifteen routers.

Note `10.0.23.0/30` has two equal entries — RIP load-balances across up to four equal-cost paths by default.

The timestamp is the age of the update. It should reset every 30 seconds; if it climbs past 180 the route is about to be marked invalid.
{{< /verify >}}

{{< verify dev="R1" cmd="show ip protocols" >}}
```
R1#show ip protocols
Routing Protocol is "rip"
  Sending updates every 30 seconds, next due in 12 seconds
  Invalid after 180 seconds, hold down 180, flushed after 240
  Redistributing: rip
  Default version control: send version 2, receive version 2
    Interface             Send  Recv  Triggered RIP  Key-chain
    GigabitEthernet0/1    2     2
    GigabitEthernet0/2    2     2
  Automatic network summarization is not in effect
  Maximum path: 4
  Routing for Networks:
    10.0.0.0
  Passive Interface(s):
    GigabitEthernet0/0
  Routing Information Sources:
    Gateway         Distance      Last Update
    10.0.12.2            120      00:00:18
    10.0.13.2            120      00:00:07
  Distance: (default is 120)
```

The four timers, and what each one is for:

| Timer | Default | Purpose |
|---|---|---|
| **Update** | 30 s | how often the full table is broadcast |
| **Invalid** | 180 s | no update in this long → mark the route unusable |
| **Hold-down** | 180 s | ignore *worse* information about this route for this long |
| **Flush** | 240 s | remove it from the table entirely |

Hold-down is the one worth understanding. It exists to stop a router believing a stale advertisement of a route that has just gone down — the count-to-infinity problem. It also means RIP can take **three minutes or more** to converge after a failure, during which traffic is black-holed.

`Automatic network summarization is not in effect` confirms `no auto-summary` took.

RIPv2 also fixes RIPv1's other defect: it uses multicast `224.0.0.9` instead of broadcast, so hosts on the segment are not interrupted.
{{< /verify >}}

---

## Part 2 — EIGRP

{{< step num="3" dev="R1, R2, R3" title="Replace RIP with EIGRP" >}}
```
R1(config)#no router rip
R1(config)#router eigrp 100
R1(config-router)#no auto-summary
R1(config-router)#eigrp router-id 1.1.1.1
R1(config-router)#network 10.1.1.0 0.0.0.255
R1(config-router)#network 10.0.12.0 0.0.0.3
R1(config-router)#network 10.0.13.0 0.0.0.3
R1(config-router)#passive-interface GigabitEthernet0/0
R1(config-router)#end
```

```
R2(config)#router eigrp 100
R2(config-router)#no auto-summary
R2(config-router)#eigrp router-id 2.2.2.2
R2(config-router)#network 10.2.2.0 0.0.0.255
R2(config-router)#network 10.0.12.0 0.0.0.3
R2(config-router)#network 10.0.23.0 0.0.0.3
R2(config-router)#passive-interface GigabitEthernet0/0
R2(config-router)#end
```

```
R3(config)#router eigrp 100
R3(config-router)#no auto-summary
R3(config-router)#eigrp router-id 3.3.3.3
R3(config-router)#network 10.3.3.0 0.0.0.255
R3(config-router)#network 10.0.13.0 0.0.0.3
R3(config-router)#network 10.0.23.0 0.0.0.3
R3(config-router)#passive-interface GigabitEthernet0/0
R3(config-router)#end
```

Two differences from RIP that matter immediately.

**`100` is the autonomous system number and it must match on every router.** Unlike an OSPF process ID, it is not locally significant — a mismatch means no adjacency, silently.

**EIGRP `network` statements accept a wildcard mask**, so you can be specific about which interfaces are enabled. `network 10.0.0.0` without a wildcard would enable EIGRP on every 10.x interface, exactly like RIP.

Neighbours must also agree on the **K values** (the metric weights) and be on a **common subnet**. Those two, plus the AS number, account for nearly every "adjacency will not form" case.
{{< /step >}}

{{< verify dev="R1" cmd="show ip eigrp neighbors" open="true" >}}
EIGRP maintains three tables and they answer three different questions. Read them in this order.

**Table 1 — who am I talking to?**

```
R1#show ip eigrp neighbors
EIGRP-IPv4 Neighbors for AS(100)
H   Address      Interface   Hold Uptime   SRTT   RTO  Q  Seq
                             (sec)         (ms)       Cnt Num
0   10.0.12.2    Gi0/1         12 00:04:33    40   240  0  14
1   10.0.13.2    Gi0/2         11 00:04:29    35   210  0  12
```

- **Hold** counting down from 15 and resetting means hellos are arriving. Hello is 5 s and hold is 15 s on high-bandwidth links (60/180 on low-speed multipoint).
- **Q Cnt** is the queue of unacknowledged packets. It should be **0**. A persistently non-zero Q Cnt means packets are being lost and the adjacency is unstable.
- **SRTT / RTO** are the smoothed round-trip time and the retransmission timeout, in milliseconds.

EIGRP uses multicast **224.0.0.10** and protocol number **88**.
{{< /verify >}}

{{< verify dev="R1" cmd="show ip eigrp topology" open="true" >}}
**Table 2 — every loop-free path I know about, used or not.** This is the table that makes EIGRP interesting.

```
R1#show ip eigrp topology
EIGRP-IPv4 Topology Table for AS(100)/ID(1.1.1.1)

Codes: P - Passive, A - Active, U - Update, Q - Query, R - Reply,
       r - reply Status, s - sia Status

P 10.3.3.0/24, 1 successors, FD is 3072
        via 10.0.13.2 (3072/2816), GigabitEthernet0/2
        via 10.0.12.2 (5376/3072), GigabitEthernet0/1
P 10.2.2.0/24, 1 successors, FD is 3072
        via 10.0.12.2 (3072/2816), GigabitEthernet0/1
        via 10.0.13.2 (5376/3072), GigabitEthernet0/2
```

Take `10.3.3.0/24`:

- **FD (Feasible Distance) = 3072** — my own best metric to reach it.
- **`via 10.0.13.2 (3072/2816)`** — the pair is `(my metric via this neighbour / the neighbour's own metric)`. That second number is the **Reported Distance**. 3072 is the lowest, so this path is the **successor** and it is what appears in the routing table.
- **`via 10.0.12.2 (5376/3072)`** — a second, worse path. Whether it is usable as a hot standby depends on one test.

**The feasibility condition: RD < FD.** The neighbour's own distance to the destination must be strictly less than my current best distance. If it is, that neighbour cannot possibly be routing through me, so using it cannot create a loop.

Here: RD via 10.0.12.2 is 3072, FD is 3072. **3072 is not less than 3072**, so the condition fails and this is *not* a feasible successor — even though the path is perfectly good. EIGRP is being conservative, and it will have to run a query (go Active) if the successor fails.

`P` means Passive: the route is stable. `A` means Active: EIGRP is querying neighbours because it lost the successor and had no feasible successor to fall back on. **Routes stuck Active (SIA — Stuck In Active) are the classic EIGRP failure**, and the cause is usually a neighbour that never replies because of a unidirectional link.

To see every path including the infeasible ones:

```
R1#show ip eigrp topology all-links
```
{{< /verify >}}

{{< verify dev="R1" cmd="show ip route eigrp" >}}
**Table 3 — the paths I am actually using.** Successors only.

```
R1#show ip route eigrp
      10.0.0.0/8 is variably subnetted, 9 subnets, 2 masks
D        10.2.2.0/24 [90/3072] via 10.0.12.2, 00:06:12, GigabitEthernet0/1
D        10.3.3.0/24 [90/3072] via 10.0.13.2, 00:06:08, GigabitEthernet0/2
D        10.0.23.0/30 [90/3072] via 10.0.12.2, 00:06:12, GigabitEthernet0/1
                                [90/3072] via 10.0.13.2, 00:06:08, GigabitEthernet0/2
```

`D` for EIGRP (`E` was already taken by EGP). **AD 90 for internal** routes, **170 for external** ones learned by redistribution — the gap exists so a route redistributed from elsewhere never beats a native one.

The metric 3072 is composed by default from **bandwidth and delay** only:

```
metric = 256 × (10^7 / least-bandwidth-in-Kbps + total-delay-in-tens-of-µs)
```

The K values weight five possible inputs — K1 bandwidth, K2 load, K3 delay, K4 reliability, K5 MTU — and default to K1=K3=1 with the rest zero. **Never change them.** Load and reliability vary with traffic, so enabling them makes the metric unstable and the topology oscillate.

Confirm the values match across neighbours:

```
R1#show ip protocols | include K value
  EIGRP metric weight K1=1, K2=0, K3=1, K4=0, K5=0
```
{{< /verify >}}

---

## Part 3 — Convergence, compared

{{< step num="4" dev="R1" title="Break the same link under each protocol" >}}
```
R1(config)#interface GigabitEthernet0/2
R1(config-if)#shutdown
```

**Under RIP:** the route via Gi0/2 stays in the table, aging, until the invalid timer fires at 180 seconds. Then hold-down begins. Traffic is black-holed for up to three minutes. Triggered updates help when the router *notices* the failure locally, but a failure two hops away is invisible until the timers expire.

**Under EIGRP:** the interface going down removes the neighbour instantly. If a feasible successor existed, it is promoted with **no query at all** — convergence in milliseconds. If not, EIGRP marks the route Active and queries its remaining neighbours, which takes a round trip or two but is still under a second on a LAN.

Watch it happen:

```
R1#debug eigrp fsm
```

```
%DUAL-5-NBRCHANGE: EIGRP-IPv4 100: Neighbor 10.0.13.2 (GigabitEthernet0/2)
  is down: interface down
DUAL: Destination 10.3.3.0/24; entering active state
DUAL: rcvreply: 10.3.3.0/24 via 10.0.12.2 metric (5376/3072)
DUAL: Find FS for dest 10.3.3.0/24. FD is 3072, RD is 3072
DUAL: Removing dest 10.3.3.0/24, nexthop 10.0.13.2
DUAL: Freeing memory for destination 10.3.3.0/24
```

`entering active state` because there was no feasible successor, then a reply, then the new successor installs. Turn the debug off immediately:

```
R1#undebug all
R1(config)#interface GigabitEthernet0/2
R1(config-if)#no shutdown
```
{{< /step >}}

{{< verify dev="R1" cmd="show ip protocols — EIGRP" >}}
```
R1#show ip protocols
Routing Protocol is "eigrp 100"
  Outgoing update filter list for all interfaces is not set
  Default networks accepted from incoming updates
  EIGRP-IPv4 Protocol for AS(100)
    Metric weight K1=1, K2=0, K3=1, K4=0, K5=0
    NSF-aware route hold timer is 240
    Router-ID: 1.1.1.1
    Topology : 0 (base)
      Active Timer: 3 min
      Distance: internal 90 external 170
      Maximum path: 4
      Maximum hopcount 100
      Maximum metric variance 1

  Automatic Summarization: disabled
  Maximum path: 4
  Routing for Networks:
    10.0.12.0/30
    10.0.13.0/30
    10.1.1.0/24
  Passive Interface(s):
    GigabitEthernet0/0
```

`Maximum metric variance 1` is the knob for **unequal-cost load balancing**, which is EIGRP's genuinely unique feature. Set variance to 2 and EIGRP will also install any feasible successor whose metric is up to twice the successor's — and will share traffic across them **in proportion to their metrics**, not evenly. No other IGP does this.

```
R1(config-router)#variance 2
```

Only **feasible successors** qualify. A path that failed the feasibility condition is never installed regardless of variance, because it might loop.
{{< /verify >}}

---

## Side by side

| | RIPv2 | EIGRP | OSPF (Lab 16) |
|---|---|---|---|
| Type | distance vector | advanced distance vector | link state |
| Metric | hop count | bandwidth + delay | cost (bandwidth) |
| AD | 120 | **90** internal / 170 external | 110 |
| Max diameter | **15 hops** | 100 (default) | unlimited |
| Multicast | 224.0.0.9 | 224.0.0.10 | 224.0.0.5 / .6 |
| Protocol number | UDP 520 | **88** | 89 |
| Convergence | up to 3 minutes | **sub-second with a FS** | seconds |
| Unequal-cost LB | no | **yes (variance)** | no |
| Standard | open (RFC 2453) | Cisco, opened as RFC 7868 | open (RFC 2328) |

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| RIP routes with the wrong mask | RIPv1, or auto-summary on | `show ip protocols` |
| Discontiguous network black-holes | auto-summary at the classful boundary | `no auto-summary` everywhere |
| Three-minute outage after a link fails | RIP hold-down | expected — use EIGRP or OSPF |
| EIGRP neighbours never form | AS number mismatch | `show ip protocols` on both |
| EIGRP adjacency flaps | K value mismatch, or MTU | `show ip protocols \| include K value` |
| Route stuck Active (SIA) | a neighbour never replied to a query | `show ip eigrp topology active` |
| Backup path exists but is not used | it failed the feasibility condition | `show ip eigrp topology all-links` |
| Q Cnt non-zero and climbing | packet loss on the link | `show ip eigrp neighbors` |

## Exam notes

- RIP: metric **hop count**, max **15**, **16 = infinity**. AD **120**. Timers 30 / 180 / 180 / 240.
- RIPv2 adds masks in updates and uses multicast 224.0.0.9. **Always `version 2` and `no auto-summary`.**
- RIP `network` statements are **always classful**, whatever you type.
- EIGRP: AD **90 internal / 170 external**, protocol **88**, multicast **224.0.0.10**, hello 5 s / hold 15 s.
- EIGRP AS number **must match**; OSPF process ID need not.
- **Successor** = best path. **Feasible successor** = a backup that satisfies **RD < FD**.
- Default K values: **K1=1, K3=1**, others 0 — bandwidth and delay. Do not change them.
- **Variance** enables unequal-cost load balancing across feasible successors only.
- Three tables: **neighbour**, **topology**, **routing**. Only successors reach the routing table.

---

*Sources: Jeremy's IT Lab Day 24 & 25 · Flackbox CCNA Lab Guide 17, 19-1 · verified in Packet Tracer 8.2.*
