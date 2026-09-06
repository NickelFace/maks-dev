---
title: "EIGRP"
date: 2026-09-06
description: "Adjacencies that never form or will not stay up, and routes that exist in the topology table but never reach the routing table — including why a perfectly good backup path is not a feasible successor."
tags: ["Troubleshooting", "EIGRP", "Routing", "DUAL", "Cisco"]
categories: ["Troubleshooting"]
unit: 4
---

EIGRP faults divide cleanly into two halves, and knowing which half you are in saves most of the work. Either the neighbour relationship never forms — in which case nothing else matters and `show ip eigrp neighbors` is empty — or the neighbours are up and a particular prefix is not where you expect it, which is a filtering, summarisation or feasibility question. The two halves share almost no causes, so establish which one you are looking at before doing anything else.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| Neighbour table empty, no log messages | AS number mismatch, or `network` covers neither interface | `show ip protocols` on both |
| `is down: K-value mismatch` in the log | metric weights differ | `show ip protocols` |
| `is down: not on common subnet` | addresses in different subnets, or a primary/secondary mix-up | `show ip interface brief` both ends |
| Neighbour comes up, then drops repeatedly | Layer 1/2 fault, or hold time shorter than the hello interval | `show interfaces`, `show ip eigrp neighbors` |
| Nothing at all on one interface only | `passive-interface`, or an ACL blocking protocol 88 | `show ip protocols`, `show ip interface` |
| Adjacency up, one prefix missing | wrong `network` wildcard on the originator | `show ip protocols` there |
| Specific subnets replaced by a classful route | `auto-summary` | `show ip route`, `show ip protocols` |
| More-specific routes vanished after a change | manual summarisation and its Null0 route | `show ip route \| include Null0` |
| Backup path exists but never used | it fails the feasibility condition | `show ip eigrp topology <net>` |
| Spokes see the hub but not each other | split horizon, or the spoke is a stub | `show ip protocols`, `show ip eigrp neighbors detail` |

---

## Adjacency

### AS number mismatch

The AS number is part of the hello packet and must match exactly. Routers in different autonomous systems ignore each other entirely — **and this is the one adjacency fault that produces no log message at all**, because from each router's point of view nothing happened. An empty neighbour table with a healthy interface is its signature.

```
R1#show ip protocols | include Routing Protocol
Routing Protocol is "eigrp 1"
R2#show ip protocols | include Routing Protocol
Routing Protocol is "eigrp 100"
```

The AS number is locally significant only in the sense that it need not match any other network's; between two routers that must peer, it is absolute.

```
R2(config)#no router eigrp 100
R2(config)#router eigrp 1
R2(config-router)#network 10.0.12.0 0.0.0.255
```

### K-value mismatch

EIGRP's composite metric is weighted by K1 through K5, defaulting to K1=1 and K3=1 with the rest zero — bandwidth and delay, nothing else. Both routers must agree, and unlike the AS mismatch this one announces itself:

```
%DUAL-5-NBRCHANGE: EIGRP-IPv4 1: Neighbor 10.0.12.2 (Gi0/0) is down: K-value mismatch
R1#show ip protocols | include Metric weight
    Metric weight K1=1, K2=0, K3=1, K4=0, K5=0
R2#show ip protocols | include Metric weight
    Metric weight K1=1, K2=0, K3=1, K4=1, K5=0
```

The offending router has K4 set, usually because somebody tried to make EIGRP account for reliability or load. **Do not.** K2, K4 and K5 bring load and reliability into the metric — values that change constantly — and a metric that changes constantly means a topology that recalculates constantly. Return both ends to the default with `metric weights 0 1 0 1 0 0`.

### Not on a common subnet

EIGRP forms adjacencies only between routers whose interfaces are in the same subnet, and it says so plainly:

```
%DUAL-5-NBRCHANGE: EIGRP-IPv4 1: Neighbor 10.0.12.6 (Gi0/0) is down: not on common subnet
```

Usually this is a mask typo — /24 on one end and /30 on the other, which puts two apparently adjacent addresses in different networks. The subtler version involves **secondary addresses**: EIGRP sources its hellos from the interface's *primary* address only, so a router whose primary is elsewhere and whose secondary happens to sit in the neighbour's subnet never forms an adjacency, even though the addressing appears to overlap.

```
R2#show running-config interface GigabitEthernet0/0
interface GigabitEthernet0/0
 ip address 192.168.99.2 255.255.255.0
 ip address 10.0.12.2 255.255.255.0 secondary
```

R1 at 10.0.12.1 hears hellos sourced from 192.168.99.2, discards them, and logs the message above. Swap the addresses so the shared subnet is primary on both ends.

### Authentication

EIGRP authentication is MD5 against a key chain, applied per interface. Three things must match between neighbours — the mode, the key **id**, and the key **string**; the key chain's name is local and irrelevant.

```
R1(config)#key chain EIGRP-KEYS
R1(config-keychain)#key 1
R1(config-keychain-key)#key-string Cisco123
R1(config-if)#ip authentication mode eigrp 1 md5
R1(config-if)#ip authentication key-chain eigrp 1 EIGRP-KEYS
```

A mismatch is visible in the debug and nowhere else:

```
R1#debug eigrp packets
EIGRP: Gi0/0: ignored packet from 10.0.12.2, opcode = 5 (invalid authentication)
EIGRP: pkt key id = 2, authentication mismatch
```

`pkt key id = 2` against a local key 1 is a key-**id** mismatch, not a string mismatch — worth reading carefully, because the fix is different.

**The trap is lifetimes.** A key chain can carry `send-lifetime` and `accept-lifetime` statements, and those are evaluated against the router's clock. A key that has expired, or has not yet become valid, is skipped as though it did not exist — and if it is the only key, authentication fails on a configuration that reads as correct.

```
R1#show key chain
Key-chain EIGRP-KEYS:
    key 1 -- text "Cisco123"
        accept lifetime (02:00:00 UTC Jan 1 2026) - (02:00:00 UTC Jan 1 2027) [valid now]
```

`[valid now]` is the phrase to look for. If it is absent, check `show clock` and `show ntp status` before touching the key chain — a router that lost NTP and reverted to 1993 reports every key as not yet valid. **An adjacency that broke at midnight, or immediately after a reload, is a clock problem until proven otherwise.**

### Passive-interface

`passive-interface` in EIGRP is absolute: the interface neither sends nor receives hellos, so no adjacency is possible over it. This differs from RIP, where a passive interface still listens — in EIGRP there is no half-working state, only silence. The network behind the interface is still advertised, which is exactly why the setting exists and exactly why it gets applied to the wrong port: the routes look fine and only the adjacency is missing.

```
R1#show ip protocols | begin Passive
  Passive Interface(s):
    GigabitEthernet0/1
R1(config)#router eigrp 1
R1(config-router)#no passive-interface GigabitEthernet0/1
```

### ACLs: protocol 88 and 224.0.0.10

EIGRP is **IP protocol 88** — not TCP, not UDP — and its hellos go to multicast **224.0.0.10**. An extended ACL on a transit interface that permits the application traffic and denies the rest takes the adjacency down while every connectivity test still passes:

```
R1#show access-lists 101
Extended IP access list 101
    10 permit tcp any any established (1204 matches)
    20 permit icmp any any (18 matches)
R1(config)#ip access-list extended 101
R1(config-ext-nacl)#5 permit eigrp any any     ! protocol 88, hellos and updates both
```

Before going through access lists, a multicast probe tells you whether the neighbour can hear you at all. No reply here, with the interface up and the neighbour configured, points at filtering or at Layer 2 — not at EIGRP:

```
R1#ping 224.0.0.10
Sending 1, 100-byte ICMP Echos to 224.0.0.10, timeout is 2 seconds:
Reply to request 0 from 10.0.12.2, 4 ms
```

### Flapping neighbours, and where they really come from

An adjacency that forms and drops repeatedly is rarely an EIGRP fault — the protocol is reporting a transport problem it did not cause.

```
%DUAL-5-NBRCHANGE: EIGRP-IPv4 1: Neighbor 10.0.12.2 (Gi0/0) is down: retry limit exceeded
%DUAL-5-NBRCHANGE: EIGRP-IPv4 1: Neighbor 10.0.12.2 (Gi0/0) is up: new adjacency
```

`retry limit exceeded` means reliable packets were sent sixteen times without acknowledgement — the neighbour hears multicast hellos but not unicast updates, or the return path is lossy. `holding time expired` means hellos stopped arriving. Both send you to the interface counters rather than the routing configuration, because a unidirectional link, a duplex mismatch or a failing transceiver all present as neighbour flap:

```
R1#show interfaces GigabitEthernet0/0 | include error|CRC|resets
     412 input errors, 412 CRC, 0 frame, 0 overrun, 0 ignored
     0 output errors, 0 collisions, 7 interface resets
```

The neighbour table says the same thing in two columns — `Uptime` under a minute on a link up for weeks is the flap stated as a number, and a `Q Cnt` that stays non-zero means packets are not being acknowledged:

```
R1#show ip eigrp neighbors
EIGRP-IPv4 Neighbors for AS(1)
H   Address        Interface     Hold Uptime   SRTT   RTO   Q  Seq
                                 (sec)         (ms)        Cnt Num
0   10.0.12.2      Gi0/0           13 00:00:24    8    200  3  47
```

### Timers

The defaults differ by interface bandwidth: **hello 5 s, hold 15 s** above T1, and **hello 60 s, hold 180 s** on T1-and-below or multipoint NBMA links.

**Mismatched hello and hold intervals do not break an EIGRP adjacency** — this is the counter-intuitive part, and it differs from OSPF. Each router advertises its own hold time inside its hellos and the neighbour uses that advertised value rather than its own, so the adjacency forms regardless.

What does break is a hold time left *shorter than the neighbour's hello interval*. Raise one side's hello to 30 seconds and forget the hold, and the neighbour expires the adjacency at 15 seconds, every time, forever. **Always change them as a pair**, keeping hold at roughly three times hello:

```
R1(config-if)#ip hello-interval eigrp 1 30
R1(config-if)#ip hold-time eigrp 1 90
```

---

## Route advertisement

Neighbours are up and a prefix is missing. The question is now which of four places it stopped: never advertised, filtered, summarised away, or it arrived and lost route selection.

### The `network` statement and its wildcard

EIGRP's `network` command takes an optional wildcard mask. Omit it and IOS applies the classful mask, exactly as RIP does — broader than intended, and usually harmless. The damaging error is the opposite one, a wildcard too specific to include the interface you meant:

```
R2(config-router)#network 172.16.5.0             ! becomes 172.16.0.0
R2(config-router)#network 172.16.5.0 0.0.0.3     ! covers .0 to .3 only
```

An interface at 172.16.5.1/24 is included; one at 172.16.5.10/24 is not, so its subnet is never advertised and no adjacency forms on it. The fault lives on the router that *should* be originating the prefix, not on the one missing it — check `show ip protocols` there first. The mental model that prevents the mistake: `network` does not advertise a network, it **selects interfaces**, and the connected subnet of each selected interface is what gets advertised, with its real mask rather than the one in the statement.

### Auto-summary

`auto-summary` is on by default on older IOS and off from 15.x onward — which is its own source of confusion when two routers in the same AS run different versions. Where it is on, the router replaces its specific subnets with a classful summary at a major network boundary.

```
R1#show ip route eigrp
D        10.0.0.0/8 [90/2172416] via 192.168.12.2, 00:04:11, GigabitEthernet0/0
```

You expected 10.0.20.0/24 and 10.0.30.0/24 and got one /8. If 10.0.0.0/8 exists on both sides of the 192.168.12.0/24 link — a discontiguous network — both routers advertise the same summary, each ignores it in favour of its own local subnets, and traffic between the halves lands wherever the last update put it.

```
R1(config-router)#no auto-summary
R1#show ip protocols | include summarization
  Automatic network summarization is not in effect
```

### Manual summarisation hides more-specifics

`ip summary-address` on an interface advertises one aggregate in place of the components. The router also installs a **local route to Null0** for the aggregate, with administrative distance 5, to prevent a loop.

```
R1(config-if)#ip summary-address eigrp 1 10.0.0.0 255.255.0.0
R1#show ip route | include Null0
D       10.0.0.0/16 is a summary, 00:02:14, Null0
```

That Null0 route is correct behaviour and is also the trap. It matches the whole summarised range on the summarising router itself, so any component subnet R1 has no more-specific route for is **discarded silently** rather than forwarded — summarise wider than what you actually own and you have built a black hole for the parts you do not. The second consequence is that the more-specifics are suppressed out that interface, so a neighbour that needed one will not get it and `show ip eigrp topology` there shows only the aggregate.

### Distribute-lists and offset-lists

A distribute-list applies an ACL or prefix-list to updates in either direction. It is one line in `show ip protocols` and easy to read past:

```
R1#show ip protocols
Routing Protocol is "eigrp 1"
  Outgoing update filter list for all interfaces is not set
  Incoming update filter list for all interfaces is 10
R1#show access-lists 10
Standard IP access list 10
    10 deny   192.168.3.0, wildcard bits 0.0.0.255 (14 matches)
    20 permit any
```

The match counter incrementing on the `deny` line is the confirmation, and the debug states it in words:

```
R1#debug ip eigrp
EIGRP-IPv4(1): 192.168.3.0/24 - denied by distribute list
```

An offset-list does not hide a route; it inflates the metric so another path wins. The symptom is a route that exists and is never chosen, which looks nothing like filtering — `show ip protocols` reports it as `Incoming routes will have 10 added to metric if on list 1`.

### Stub routers

A stub router advertises a restricted set of routes and is **never used as a transit path**. That is the point of the feature on hub-and-spoke, and also why a stub in the wrong place makes routes disappear.

```
R2(config)#router eigrp 1
R2(config-router)#eigrp stub connected summary
```

Bare `eigrp stub` means `connected summary`. Anything else the spoke has learned — routes from another protocol, redistributed statics, routes from a second spoke behind it — is not advertised. Make a router a stub while it has networks behind it that others need, and those networks go dark.

The hub sees the restriction without anyone logging into the spoke:

```
R1#show ip eigrp neighbors detail
H   Address        Interface     Hold Uptime   SRTT   RTO   Q  Seq
0   10.0.12.2      Gi0/0           12 01:14:02   12    100  0  31
   Version 23.0/2.0, Retrans: 0, Retries: 0, Prefixes: 2
   Stub Peer Advertising ( CONNECTED SUMMARY ) Routes
   Suppressing queries
```

`Suppressing queries` is the other half of the feature: the hub does not query a stub, which is what keeps a query storm bounded — useful, until you wonder why a spoke never replied.

### Split horizon on a multipoint interface

On a hub with one physical interface serving several spokes — Frame Relay multipoint, DMVPN, any NBMA arrangement — routes learned from one spoke cannot be advertised back out the same interface to another. The symptom is exact: **every spoke reaches the hub, no spoke reaches any other spoke**, and the hub's own routing table is complete, which makes the hub look innocent.

```
R1#show ip interface Serial0/0/0 | include split horizon
  Split horizon is enabled
R1(config)#interface Serial0/0/0
R1(config-if)#no ip split-horizon eigrp 1
```

Note the syntax: `no ip split-horizon eigrp <as>` is the EIGRP-specific form, separate from `no ip split-horizon`, which governs RIP — disabling one does not disable the other. Point-to-point subinterfaces avoid the problem altogether and are the better answer where the transport allows them.

### Feasible successors and why a good path is not one

This is the EIGRP behaviour most often reported as a bug: a second path to a destination exists, it is loop-free, it would work — and EIGRP will not install it as a backup.

```
R1#show ip eigrp topology
EIGRP-IPv4 Topology Table for AS(1)/ID(1.1.1.1)
Codes: P - Passive, A - Active, U - Update, Q - Query, R - Reply

P 10.0.30.0/24, 1 successors, FD is 3072
        via 10.0.12.2 (3072/2816), GigabitEthernet0/0
```

One successor, and the alternative via 10.0.13.3 is not shown at all. It appears only when you ask for everything:

```
R1#show ip eigrp topology all-links
P 10.0.30.0/24, 1 successors, FD is 3072, serno 14
        via 10.0.12.2 (3072/2816), GigabitEthernet0/0
        via 10.0.13.3 (5376/3328), GigabitEthernet0/1
```

The two numbers in brackets are **feasible distance** (this router's total cost) and **reported distance** (the neighbour's cost to the destination). The feasibility condition is strict: a path is a feasible successor only if its **reported distance is lower than the current feasible distance**. Here the alternative reports 3328 against an FD of 3072, so it fails — by 256, and completely.

The reasoning is worth understanding rather than memorising. A neighbour whose own cost to the destination is *lower* than mine cannot be routing through me, so using it cannot create a loop. A neighbour whose cost is higher *might* be, and EIGRP will not gamble on it. The path is very likely fine; EIGRP declines to assume so.

The practical consequence: on losing the successor, EIGRP has no backup ready and must go **active** — send queries and wait for replies — rather than switching over instantly. Convergence takes seconds instead of milliseconds, and in a badly designed network the queries travel far enough to produce a stuck-in-active event:

```
%DUAL-3-SIA: Route 10.0.30.0/24 stuck-in-active state in IP-EIGRP(0) 1. Cleaning up
```

Summarisation and stub routers are the standard fixes, because both bound how far a query travels.

---

## Quick reference

| Command | Proves |
|---|---|
| `show ip eigrp neighbors` | which adjacencies exist, their uptime, and whether the queue is stuck |
| `show ip eigrp neighbors detail` | stub status of a peer and whether queries are suppressed |
| `show ip eigrp topology` | successors and feasible successors — what EIGRP is willing to use |
| `show ip eigrp topology all-links` | every path received, including those failing the feasibility condition |
| `show ip protocols` | AS, K-values, `network` statements, passive, filters, summarisation |
| `show ip route eigrp` | what reached the routing table; `D` internal vs `D EX` external |
| `show ip route \| include Null0` | summary routes that may be black-holing more-specifics |
| `show key chain` | key ids, strings, and whether a lifetime says `[valid now]` |
| `debug eigrp packets` | hellos and the reason a packet was ignored, including auth mismatch |
| `debug ip eigrp` | route-level processing, including "denied by distribute list" |
| `ping 224.0.0.10` | whether EIGRP multicast reaches the neighbour at all |

---

*Based on the NetworkLessons troubleshooting series: EIGRP neighbor adjacency and EIGRP route advertisement on Cisco IOS.*
