---
title: "Redistribution, Metrics and Administrative Distance"
date: 2026-09-06
description: "Why redistributed routes vanish without a seed metric, why every external OSPF route has cost 20, and how administrative distance turns mutual redistribution into a routing loop."
tags: ["Troubleshooting", "Redistribution", "OSPF", "EIGRP", "Cisco"]
categories: ["Troubleshooting"]
unit: 4
---

Redistribution takes routes that one protocol knows about and hands them to another, and it fails in two characteristic ways. Either nothing arrives, because the receiving protocol had no metric to give the route and discarded it without saying so — or too much arrives, and the route comes back around into the protocol it started in, wins on administrative distance, and produces a loop. The first failure is silent. The second is loud but points at the wrong device, because the router that flaps is rarely the router that is misconfigured.

Both are consequences of the same fact: a route crossing between protocols loses everything except its prefix. Metric, path, origin, all of it is discarded, and the receiving protocol invents a replacement.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| Nothing appears after `redistribute` into EIGRP or RIP | **no seed metric** | `show ip protocols` |
| Only classful networks appear in OSPF | `redistribute` without `subnets` | `show ip ospf database external` |
| All external OSPF routes have cost 20 | E2 metric — expected behaviour | `show ip route ospf` |
| Routes flap, appearing and disappearing | AD loop at a mutual redistribution point | `debug ip routing` |
| The ASBR's own LANs are not redistributed | no `redistribute connected` | `show ip protocols` |
| Traffic takes a long way round | the redistributed copy won on AD | `show ip route <prefix>` |
| Route present on one ASBR, absent on the other | a route-map or tag filter | `show route-map` |
| Prefix in the source protocol, absent everywhere else | the source route is not in the RIB | `show ip route <prefix>` |

---

## Administrative distance decides who wins

Administrative distance is not a metric and does not describe a path. It is a statement of trust between protocols, consulted only when two different protocols offer the same prefix, and applied before either metric is looked at. The lower number wins outright, and the losing protocol's route is not installed at all — it stays in that protocol's own database, invisible in `show ip route`.

| Source | AD |
|---|---|
| Connected | 0 |
| Static | 1 |
| **eBGP** | **20** |
| **EIGRP internal** | **90** |
| IGRP | 100 |
| **OSPF** (all types, internal and external) | **110** |
| IS-IS | 115 |
| **RIP** | **120** |
| **EIGRP external** | **170** |
| **iBGP** | **200** |
| Unreachable / never installed | 255 |

Two entries in that table exist specifically because of redistribution. **EIGRP external is 170** — deliberately worse than RIP, so that an EIGRP router receiving its own routes back from a redistribution point prefers the original. **iBGP is 200** — worse than any IGP, so that a route learned internally by BGP does not displace the IGP route it came from.

OSPF is the protocol without that protection. **OSPF external routes have AD 110, exactly the same as internal ones**, and that single design decision causes most of the loops on this page.

`show ip route <prefix>` names the winner and the distance in the first two lines, and is the command that settles the argument:

```
R1#show ip route 172.16.5.0
Routing entry for 172.16.5.0/24
  Known via "ospf 1", distance 110, metric 20, type extern 2, forward metric 2
  Redistributing via rip
  Last update from 10.0.12.2 on GigabitEthernet0/0, 00:00:14 ago
  Routing Descriptor Blocks:
  * 10.0.12.2, from 2.2.2.2, 00:00:14 ago, via GigabitEthernet0/0
      Route metric is 20, traffic share count is 1
```

`Known via "ospf 1", distance 110` on a router that should be learning this prefix from RIP is the whole diagnosis.

---

## The redistributed route that comes back

Take the smallest topology that shows it: R1 speaks both RIP and OSPF and redistributes RIP into OSPF; R2 and R3 speak OSPF.

1. R1 learns `172.16.5.0/24` from RIP with AD 120 and installs it.
2. R1 redistributes it into OSPF as a type 5 external LSA.
3. R2 floods it back through the area, and it reaches R1 again — this time as an OSPF route.
4. OSPF external is **AD 110**, better than RIP's 120.
5. R1 removes its RIP route and installs the OSPF one, whose next hop points *into the OSPF cloud* — back towards R2.
6. R1 is now forwarding traffic for a RIP-side prefix away from the RIP side.

Traffic loops between R1 and R2 until the TTL runs out. Then, because R1 has stopped using RIP for the prefix, it may stop redistributing it, the LSA ages out, the RIP route returns, and the whole cycle repeats. The route flaps on a timer with no configuration change anywhere.

```
R1#debug ip routing
*Sep  6 14:02:11.117: RT: add 172.16.5.0/24 via 10.0.12.2, ospf metric [110/20]
*Sep  6 14:02:11.117: RT: delete route to 172.16.5.0/24 via 10.0.23.3, rip metric [120/2]
*Sep  6 14:03:41.902: RT: del 172.16.5.0/24 via 10.0.12.2, ospf metric [110/20]
*Sep  6 14:03:41.902: RT: add 172.16.5.0/24 via 10.0.23.3, rip metric [120/2]
```

A prefix being added and deleted repeatedly, alternating between two protocols, is the signature. `debug ip routing` is safe enough on a small router and gives the answer in seconds; leave it running longer than one flap interval so you see the alternation rather than a single event.

The vulnerable combinations, all of them a case of the external copy being trusted more than the original:

| Redistribution | Why it loops |
|---|---|
| **RIP → OSPF** | OSPF external 110 beats RIP 120 |
| **iBGP → OSPF** | OSPF 110 beats iBGP 200 |
| EIGRP → RIP | safe in one direction: EIGRP external 170 loses to RIP 120 |
| **OSPF → EIGRP** | safe: EIGRP external 170 loses to OSPF 110 |

### Fixing it with distance, and why that is the second choice

The direct repair is to make the external copy less attractive than the original:

```
R1(config)#router ospf 1
R1(config-router)#distance ospf external 180
```

Now OSPF external is 180, RIP's 120 wins, and R1 keeps using RIP for RIP's prefixes. The equivalent from the other side lowers RIP below OSPF external:

```
R1(config)#router rip
R1(config-router)#distance 100
```

Both work, and both are blunt. `distance ospf external 180` applies to **every** external route in the OSPF process, including ones that have nothing to do with this redistribution point and that you did want to prefer. On a router with a single redistribution boundary that is acceptable. On a network with several, changing distance at one boundary shifts the problem to another, and the version of this fault where two engineers each "fixed" a different router with a different distance value is genuinely hard to unpick.

### Fixing it with tags, which is the answer that scales

Tag the route on the way out, and refuse anything carrying that tag on the way back in. The tag travels with the route through the second protocol, so the filter is a single rule that covers every prefix — including ones added next year.

On the router redistributing RIP into OSPF:

```
R1(config)#route-map RIP_TO_OSPF permit 10
R1(config-route-map)#set tag 110
R1(config-route-map)#exit
R1(config)#router ospf 1
R1(config-router)#redistribute rip subnets route-map RIP_TO_OSPF
```

On the router redistributing OSPF back into RIP — which may be the same router or the second one of a redundant pair:

```
R1(config)#route-map OSPF_TO_RIP deny 10
R1(config-route-map)#match tag 110
R1(config-route-map)#exit
R1(config)#route-map OSPF_TO_RIP permit 20
R1(config-route-map)#exit
R1(config)#router rip
R1(config-router)#redistribute ospf 1 metric 5 route-map OSPF_TO_RIP
```

The `permit 20` with no match statement is not optional. A route-map ends with an implicit deny, so a map containing only the deny clause blocks everything, and the symptom of forgetting it is that redistribution stops entirely in that direction.

Tags are visible in the LSA and in the routing table, which makes the scheme auditable rather than a thing you have to remember:

```
R2#show ip ospf database external 172.16.5.0

  Link State ID: 172.16.5.0 (External Network Number)
  Advertising Router: 1.1.1.1
        Metric Type: 2 (Larger than any link state path)
        Metric: 20
        Forward Address: 0.0.0.0
        External Route Tag: 110
```

The convention of using the protocol's AD as the tag value — 110 for "this came from OSPF", 120 for "this came from RIP" — costs nothing and makes the intent readable a year later.

A distribute-list with an ACL does the same job for a handful of prefixes and is quicker to write, but it has to be edited every time a subnet is added, which is the kind of maintenance that gets forgotten precisely once.

---

## The seed metric, and routes that vanish

**This is the most common redistribution fault, and it produces no error message at all.** A route entering EIGRP or RIP needs a metric expressed in that protocol's own terms, and neither protocol can invent one. EIGRP cannot guess a bandwidth and delay for a path it did not measure; RIP cannot guess a hop count. Without a seed metric the route is treated as **unreachable** and dropped.

The configuration looks correct, `show run` shows the `redistribute` line, and nothing arrives:

```
R1(config)#router eigrp 100
R1(config-router)#redistribute ospf 1
```

```
R2#show ip route eigrp
! nothing
```

Supply the metric either on the statement or once for the whole process. The five-value form is bandwidth in Kbps, delay in tens of microseconds, reliability out of 255, load out of 255, and MTU:

```
R1(config-router)#redistribute ospf 1 metric 100000 100 255 1 1500
```

```
R1(config-router)#default-metric 100000 100 255 1 1500
```

RIP needs a hop count, and the number matters because RIP's maximum is 15 — 16 means unreachable. A seed of 1 makes redistributed routes look directly connected, which is fine until the same prefix arrives from two directions; a mid-range value leaves room for the real hop count to be compared:

```
R1(config)#router rip
R1(config-router)#redistribute ospf 1 metric 5
```

Confirm it took effect:

```
R1#show ip protocols
Routing Protocol is "eigrp 100"
  Redistributing: eigrp 100, ospf 1
  Default redistribution metric is 100000 100 255 1 1500
```

No `Default redistribution metric` line, and no `metric` on the redistribute statement, means the routes are being discarded.

The exception that misleads people: redistributing **between two EIGRP processes** works with no seed metric, because the metric components carry across unchanged. Having seen it work there, it is natural to assume it works everywhere, and it does not.

**OSPF and BGP do not have this problem.** OSPF assigns a default metric of 20 to anything redistributed into it — 1 for routes from BGP — so redistribution into OSPF works without a seed metric, and that asymmetry is exactly why the EIGRP direction of a mutual redistribution is the one that silently fails.

---

## OSPF specifics

### The `subnets` keyword

Redistributing into OSPF without `subnets` advertises **only classful networks**. Every subnet — every /25, /26, /30, and every /24 that is not on a class boundary — is dropped. Since a modern network has essentially no classful routes, the visible effect is that redistribution did nothing:

```
R1(config)#router ospf 1
R1(config-router)#redistribute eigrp 100 subnets
```

IOS warns about the omission on newer releases and silently accepts it on older ones. Check the result rather than the intent:

```
R1#show ip ospf database external | include Link State ID
  Link State ID: 172.16.5.0 (External Network Number)
  Link State ID: 172.16.6.0 (External Network Number)
```

An empty output after a redistribution you believe is configured means either the missing `subnets`, or that the source routes are not in the routing table to begin with. **Only routes actually installed in the RIB are redistributed** — a prefix that lost the AD comparison to another protocol is not eligible, which is how a route can disappear from redistribution because of a change made somewhere else entirely.

### E1 against E2, and why everything has cost 20

External routes come in two flavours and the default is the surprising one.

**E2 is the default.** Its metric is the seed metric and nothing else — the internal cost of reaching the ASBR is not added as the route crosses the OSPF domain. So every external route shows cost 20 at every router in the network, no matter how far from the ASBR it is:

```
R3#show ip route ospf | include E2
O E2     172.16.5.0/24 [110/20] via 10.0.34.4, 00:06:22, GigabitEthernet0/0
O E2     172.16.6.0/24 [110/20] via 10.0.34.4, 00:06:22, GigabitEthernet0/0
```

That is not a fault, but it has a real consequence: with two ASBRs advertising the same external prefix, every router sees cost 20 from both and the tie is broken by the **forward metric** — the internal cost to the ASBR — which is why the behaviour is usually acceptable but occasionally sends traffic to the further ASBR when the two internal costs are equal.

**E1 adds the internal cost to the seed metric**, so the metric grows with distance and each router picks the genuinely closer ASBR. When there are two ways into the external network and you want traffic to use the near one, E1 is what you want:

```
R1(config-router)#redistribute eigrp 100 subnets metric-type 1
```

```
R3#show ip route ospf | include E1
O E1     172.16.5.0/24 [110/84] via 10.0.34.4, 00:00:41, GigabitEthernet0/0
```

An OSPF router prefers intra-area over inter-area over external regardless of metric, so an E1 route with a very low cost still loses to any internal route for the same prefix. The preference order is checked before the metric, which is a second, quieter reason redistributed routes do not always win.

---

## Connected routes are not included

`redistribute ospf 1` moves routes that OSPF knows. It does not move the redistributing router's own connected interfaces, because those are connected routes, not OSPF routes. If the ASBR has a LAN that is not enabled in the source protocol, that LAN is invisible on the far side of the boundary — while every other subnet crosses correctly, which makes it look like a filtering problem rather than an omission.

```
R1(config)#router eigrp 100
R1(config-router)#redistribute connected metric 100000 100 255 1 1500
```

Do it with a route-map. `redistribute connected` with no filter includes every connected interface on the router — management VLANs, point-to-point link subnets, anything that happens to be up — and those prefixes then propagate across the whole network:

```
R1(config)#ip prefix-list LANS seq 5 permit 10.0.50.0/24
R1(config)#route-map CONN_OUT permit 10
R1(config-route-map)#match ip address prefix-list LANS
R1(config-route-map)#exit
R1(config-router)#redistribute connected metric 100000 100 255 1 1500 route-map CONN_OUT
```

---

## Suboptimal routing without a loop

The quieter outcome of redistribution is a network where everything works and some traffic takes a path nobody chose. A prefix reachable directly through EIGRP as an internal route (AD 90) and also arriving as an OSPF external (AD 110) resolves in EIGRP's favour, which is usually right. Reverse the protocols — an EIGRP **external** at 170 competing with an OSPF route at 110 — and OSPF wins even when the EIGRP path is one hop and the OSPF path is five.

Nothing flaps, no alarm fires, and the only evidence is a traceroute that does not match the diagram:

```
R4#traceroute 172.16.5.10 source 10.0.40.1
  1  10.0.34.3  1 msec  0 msec  0 msec
  2  10.0.23.2  1 msec  1 msec  0 msec
  3  10.0.12.1  2 msec  1 msec  1 msec
```

Confirm with `show ip route <prefix>` on each hop and compare `Known via` against what you expected. The fix is a per-prefix distance statement rather than a process-wide one, so the change is contained:

```
R4(config)#access-list 20 permit 172.16.5.0 0.0.0.255
R4(config)#router ospf 1
R4(config-router)#distance 175 0.0.0.0 255.255.255.255 20
```

The AD 255 form of the same command marks a route completely unusable, which is occasionally the cleanest way to stop one specific protocol's copy of one specific prefix from ever being installed:

```
R4(config-router)#distance 255 0.0.0.0 255.255.255.255 20
```

Use it knowingly. A route at distance 255 is not in the routing table, is not advertised onward, and leaves no trace in `show ip route` explaining why.

---

## The order to work a redistribution fault

1. Is the prefix in the **source router's routing table**, from the protocol you think it is? If not, nothing downstream can be right.
2. Does the redistributing router have a **seed metric** for the target protocol? `show ip protocols`.
3. For OSPF, is `subnets` present? `show ip ospf database external`.
4. Is a route-map or distribute-list dropping it? `show route-map`, `show ip protocols`.
5. Does the prefix arrive downstream, and does it **win the AD comparison**? `show ip route <prefix>`.
6. Does it come back to the redistribution point and displace the original? `debug ip routing`.

---

## Quick reference

| Command | Proves |
|---|---|
| `show ip route <prefix>` | which protocol won, its AD, its metric, and the next hop |
| `show ip route ospf` | external routes and their E1/E2 type and cost |
| `show ip protocols` | redistribution statements, seed metrics, filters, distance |
| `show ip ospf database external` | which prefixes became type 5 LSAs, with metric type and tag |
| `show route-map` | the clauses and their match counts — a zero count means it never matched |
| `debug ip routing` | routes being added and deleted in real time — the AD-loop signature |
| `show ip eigrp topology` | whether EIGRP accepted the redistributed prefix at all |
| `traceroute <dest> source <src>` | the path actually taken, against the one intended |

---

*Based on the NetworkLessons troubleshooting series: administrative distance in redistribution and metric problems in redistribution on Cisco IOS.*
