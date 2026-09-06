---
title: "Lab 05 · Static Routing"
date: 2026-09-06
description: "Next-hop, exit-interface and fully-specified static routes, the default route, and a longest-prefix-match walkthrough that explains why the specific route wins."
tags: ["CCNA", "Routing", "Static Routes", "Lab"]
categories: ["CCNA"]
domain: 3
tool: "Packet Tracer"
duration: "45 min"
sources: "Jeremy's IT Lab Day 11 · Flackbox 16"
aliases: ["/ccna-labs/ccna-lab-16-routing-fundamentals/"]
---

A router forwards a packet by finding the single best match for its destination in the routing table, and "best" has a precise definition that trips people up: it is **not** the lowest metric, and it is **not** the most trusted protocol. It is the **longest prefix** — the most specific mask. Administrative distance and metric are tiebreakers used only *within* a given prefix length.

This lab configures the three forms of static route, adds a default route, then builds an overlapping set of prefixes and traces a lookup by hand.

## Topology

{{< topology cols="4" rows="2" caption="Three routers in a chain, LAN at each end, plus a simulated internet" >}}
switch SW1 "10.0.1.0/24" at 0,0
router R1 "" at 1,0
router R2 "" at 2,0
router R3 "" at 3,0
switch SW2 "10.0.3.0/24" at 3,1
cloud ISP "0.0.0.0/0" at 1,1

SW1 — R1
R1 — R2 label="10.0.12.0/30"
R2 — R3 label="10.0.23.0/30"
R3 — SW2
R1 — ISP label="203.0.113.0/30"
{{< /topology >}}

## Addressing

| Device | Interface | Address |
|---|---|---|
| R1 | G0/0 | 10.0.1.1/24 (LAN) |
| R1 | G0/1 | 10.0.12.1/30 (to R2) |
| R1 | G0/2 | 203.0.113.2/30 (to ISP) |
| R2 | G0/0 | 10.0.12.2/30 |
| R2 | G0/1 | 10.0.23.1/30 |
| R2 | Lo0 | 2.2.2.2/32 |
| R3 | G0/0 | 10.0.23.2/30 |
| R3 | G0/1 | 10.0.3.1/24 (LAN) |

## Objectives

- Configure static routes in all three forms and explain when each is appropriate
- Add a default route and see it appear as the gateway of last resort
- Read `show ip route` fluently: codes, AD, metric, next hop, age
- Trace a longest-prefix-match decision through overlapping routes
- Build a floating static route and watch it install only when the primary dies

---

## Part 1 — The three forms

{{< step num="1" dev="R1" title="Next-hop static route — the normal one" open="true" >}}
```
R1(config)#ip route 10.0.3.0 255.255.255.0 10.0.12.2
```

Read as: *to reach network 10.0.3.0/24, send the packet to 10.0.12.2.*

The router still has to work out which interface 10.0.12.2 is out of, which means a **recursive lookup**: find 10.0.3.0/24 → next hop 10.0.12.2 → look that up → directly connected on G0/1 → resolve ARP for 10.0.12.2 → build the frame. Two lookups per packet in the control plane, though CEF collapses this in hardware.

The important consequence: **if the next hop is not reachable, the route is not installed.** That is a feature. A next-hop route validates itself.
{{< /step >}}

{{< step num="2" dev="R1" title="Exit-interface and fully-specified forms" >}}
```
R1(config)#ip route 2.2.2.2 255.255.255.255 GigabitEthernet0/1
```

Exit-interface form: *to reach 2.2.2.2/32, send it out G0/1.* No recursion, but on a **multi-access** segment like Ethernet the router has no idea which of the neighbours on that wire owns the destination — so it ARPs for the destination address itself and relies on proxy ARP to answer. That works, badly, and generates an ARP entry per destination.

**Use exit-interface form only on point-to-point links** (serial, or a /30 you control), where there is exactly one possible receiver. On Ethernet, do not.

The fully-specified form gives both and is unambiguous:

```
R1(config)#ip route 10.0.23.0 255.255.255.252 GigabitEthernet0/1 10.0.12.2
```

*Out of G0/1, to 10.0.12.2.* No recursion, no proxy ARP guessing. This is the form to use when you want the determinism of an exit interface on an Ethernet link.

| Form | Recursion | Safe on Ethernet | Use when |
|---|---|---|---|
| `ip route P M next-hop` | yes | **yes** | the default choice |
| `ip route P M interface` | no | no — proxy ARP | point-to-point links only |
| `ip route P M interface next-hop` | no | **yes** | you need both determinism and Ethernet |
{{< /step >}}

{{< step num="3" dev="R2, R3" title="Complete the path in both directions" >}}
A route in one direction is half a path. Return traffic needs its own route, and "it pings out but not back" is almost always a missing reverse route.

```
R2(config)#ip route 10.0.1.0 255.255.255.0 10.0.12.1
R2(config)#ip route 10.0.3.0 255.255.255.0 10.0.23.2
```

```
R3(config)#ip route 10.0.1.0 255.255.255.0 10.0.23.1
R3(config)#ip route 10.0.12.0 255.255.255.252 10.0.23.1
R3(config)#ip route 2.2.2.2 255.255.255.255 10.0.23.1
```
{{< /step >}}

---

## Part 2 — The default route

{{< step num="4" dev="R1" title="0.0.0.0/0 — the route that matches everything" >}}
```
R1(config)#ip route 0.0.0.0 0.0.0.0 203.0.113.1
```

A mask of all zeros matches every destination — which makes it, by definition, the **shortest** prefix in the table and therefore the last one to win a longest-prefix comparison. That is exactly the behaviour you want: use a specific route if you have one, otherwise send it to the internet.

R3, which has only one way out, should have a default rather than a route per internal prefix:

```
R3(config)#no ip route 10.0.1.0 255.255.255.0 10.0.23.1
R3(config)#no ip route 10.0.12.0 255.255.255.252 10.0.23.1
R3(config)#no ip route 2.2.2.2 255.255.255.255 10.0.23.1
R3(config)#ip route 0.0.0.0 0.0.0.0 10.0.23.1
```

Three routes replaced by one. A router with exactly one upstream is a **stub**, and a stub should carry a default route, not a copy of the topology.
{{< /step >}}

{{< verify dev="R1" cmd="show ip route" open="true" >}}
```
R1#show ip route
Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP
       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area
       * - candidate default, U - per-user static route

Gateway of last resort is 203.0.113.1 to network 0.0.0.0

S*    0.0.0.0/0 [1/0] via 203.0.113.1
      2.0.0.0/32 is subnetted, 1 subnets
S        2.2.2.2 is directly connected, GigabitEthernet0/1
      10.0.0.0/8 is variably subnetted, 5 subnets, 3 masks
C        10.0.1.0/24 is directly connected, GigabitEthernet0/0
L        10.0.1.1/32 is directly connected, GigabitEthernet0/0
C        10.0.12.0/30 is directly connected, GigabitEthernet0/1
L        10.0.12.1/32 is directly connected, GigabitEthernet0/1
S        10.0.3.0/24 [1/0] via 10.0.12.2
```

Line by line:

- **`S*`** — static, and the `*` marks it as the candidate default. `Gateway of last resort` names it explicitly at the top.
- **`[1/0]`** — `[administrative distance / metric]`. Static routes are AD 1 and metric 0. Connected is AD 0 — nothing beats a directly attached network.
- **`2.2.2.2 is directly connected, GigabitEthernet0/1`** — an exit-interface static route prints as "directly connected" even though it is not. Misleading, and a known source of confusion when auditing a table.
- **`10.0.0.0/8 is variably subnetted, 5 subnets, 3 masks`** — the header for a parent block, listing how many children and how many distinct masks.

Administrative distance, for reference:

| Source | AD |
|---|---|
| Connected | 0 |
| Static | 1 |
| eBGP | 20 |
| EIGRP internal | 90 |
| OSPF | 110 |
| RIP | 120 |
| EIGRP external | 170 |
| Unusable | 255 |
{{< /verify >}}

---

## Part 3 — Longest prefix match, traced by hand

{{< step num="5" dev="R2" title="Build three overlapping routes on purpose" >}}
```
R2(config)#ip route 10.0.0.0 255.255.0.0 10.0.12.1
R2(config)#ip route 10.0.3.0 255.255.255.0 10.0.23.2
R2(config)#ip route 10.0.3.128 255.255.255.192 10.0.12.1
```

Three routes, all of which contain the address `10.0.3.130`. Only one will be used.
{{< /step >}}

{{< verify dev="R2" cmd="show ip route 10.0.3.130" open="true" >}}
Work it out before running the command.

- `10.0.0.0/16` → covers 10.0.0.0 – 10.0.255.255 → **matches**, 16 bits
- `10.0.3.0/24` → covers 10.0.3.0 – 10.0.3.255 → **matches**, 24 bits
- `10.0.3.128/26` → covers 10.0.3.128 – 10.0.3.191 → **matches**, 26 bits

All three match. The longest prefix is /26, so the packet goes to 10.0.12.1 — even though the /24 and /16 have identical administrative distance and metric. Prefix length is compared **first, and alone**; AD and metric never enter the comparison unless two routes have the *same* prefix length.

```
R2#show ip route 10.0.3.130
Routing entry for 10.0.3.128/26
  Known via "static", distance 1, metric 0
  Routing Descriptor Blocks:
  * 10.0.12.1
      Route metric is 0, traffic share count is 1
```

`show ip route <address>` runs the actual lookup and shows you the winner. It is far more reliable than reading the table and reasoning about it, and it is the first command to reach for when traffic is going somewhere unexpected.

Change one digit and the answer changes:

```
R2#show ip route 10.0.3.10
Routing entry for 10.0.3.0/24
  Known via "static", distance 1, metric 0
  Routing Descriptor Blocks:
  * 10.0.23.2
```

`.10` is outside the /26, so the /24 wins and the packet goes the other way. Two addresses in the same /24, two different next hops. That is longest prefix match doing exactly what it is supposed to.

Clean up before continuing:

```
R2(config)#no ip route 10.0.0.0 255.255.0.0 10.0.12.1
R2(config)#no ip route 10.0.3.128 255.255.255.192 10.0.12.1
```
{{< /verify >}}

---

## Part 4 — Floating static routes

{{< step num="6" dev="R1" title="A backup path that stays out of the way" >}}
```
R1(config)#ip route 10.0.3.0 255.255.255.0 203.0.113.1 200
```

The trailing `200` is the administrative distance. The primary route via 10.0.12.2 has AD 1, so while it exists this one is not installed at all — it sits in the RIB as a candidate. Kill the primary and it appears within seconds.

This is the mechanism behind every "backup link" design in the CCNA: same prefix, worse AD. It is called a **floating** static route because it floats above the preferred route and settles only when that route sinks.

The AD value is arbitrary as long as it is higher than the primary's. Pick something above any routing protocol you might later run — 200 is conventional because it is above every protocol's default except "unusable".
{{< /step >}}

{{< verify dev="R1" cmd="show ip route 10.0.3.0 — before and after the failure" >}}
While the primary is healthy, only the AD 1 route is installed:

```
R1#show ip route static | include 10.0.3.0
S        10.0.3.0/24 [1/0] via 10.0.12.2
```

Now break the primary path:

```
R1(config)#interface GigabitEthernet0/1
R1(config-if)#shutdown
```

The connected route for 10.0.12.0/30 disappears, so the next hop 10.0.12.2 becomes unresolvable, so the AD 1 route is withdrawn — and the floating route installs:

```
R1#show ip route static | include 10.0.3.0
S        10.0.3.0/24 [200/0] via 203.0.113.1
```

`[200/0]` — the AD in the table is the proof it is the backup. Restore and watch it flip back:

```
R1(config-if)#no shutdown
```

This only works because the next hop became unreachable. If the far end fails while the local interface stays up — a common failure on a switched WAN — nothing withdraws the route and traffic blackholes. That is what IP SLA object tracking exists for, and it is beyond CCNA scope but worth knowing the gap is there.
{{< /verify >}}

{{< verify dev="PC1" cmd="tracert 10.0.3.10" >}}
End to end, and the hop list should match the topology:

```
PC> tracert 10.0.3.10

Tracing route to 10.0.3.10 over a maximum of 30 hops:

  1   0 ms      0 ms      0 ms      10.0.1.1
  2   1 ms      0 ms      1 ms      10.0.12.2
  3   1 ms      1 ms      0 ms      10.0.23.2
  4   2 ms      1 ms      1 ms      10.0.3.10

Trace complete.
```

Four lines: the local gateway, R2, R3, and the destination. A trace that stops at hop 2 means R2 has no route onward — or, more often, no route *back*.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Route configured but absent from the table | next hop unreachable | `show ip route <next-hop>` |
| Ping out works, replies never arrive | missing reverse route | `show ip route <source>` on the far router |
| Traffic takes a route you did not intend | a longer prefix matches | `show ip route <destination>` |
| Static route to an Ethernet interface behaves oddly | proxy ARP resolving each destination | use next-hop or fully-specified form |
| Backup route never activates | primary next hop still resolvable | `show ip route` — check the connected route survived |
| `%Inconsistent address and mask` | network/mask pair is not a valid subnet | recompute |

## Exam notes

- Route selection order: **longest prefix match first**, then lowest AD, then lowest metric.
- Static AD is **1**; connected is **0**; a trailing number on `ip route` overrides the AD and creates a floating static.
- `0.0.0.0/0` is the default route and appears as `S*` with `Gateway of last resort`.
- Next-hop form recurses and self-validates. Exit-interface form does not recurse and relies on proxy ARP on multi-access media.
- A route is only installed if its next hop resolves.
- `show ip route <address>` performs the real lookup — use it instead of eyeballing the table.

---

*Sources: Jeremy's IT Lab Day 11 (Routing Fundamentals + Static Routing) · Flackbox CCNA Lab Guide 16 · verified in Packet Tracer 8.2.*
