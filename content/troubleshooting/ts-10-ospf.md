---
title: "OSPF"
date: 2026-09-06
description: "What an adjacency stuck in INIT, 2-WAY or EXSTART is telling you, which hello parameters must match, and the area and LSA rules that keep a route out of the database."
tags: ["Troubleshooting", "OSPF", "Routing", "Cisco"]
categories: ["Troubleshooting"]
unit: 4
---

OSPF faults divide cleanly in two, and the neighbour table decides which half you are in. Either the adjacency never reaches FULL — in which case the answer is a mismatched parameter, and the state it stopped in tells you roughly where to look — or the adjacency is fine and the route still does not appear, which is an area, filtering or LSA-type problem. Working the second case before confirming the first wastes the most time, so `show ip ospf neighbor` is always the first command.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| Neighbour absent entirely | area, timer, mask or auth mismatch; passive interface | `debug ip ospf adj` |
| Stuck in **INIT** | the neighbour is not hearing *us* — ACL, unidirectional link | `show ip ospf neighbor` both ends |
| Stuck in **2-WAY** | **normal** between two DROTHERs; a fault only if all are priority 0 | `show ip ospf interface \| include State` |
| Stuck in **EXSTART/EXCHANGE** | **MTU mismatch** | `show ip ospf interface \| include MTU` |
| Stuck in **LOADING** | an LSA request never satisfied — MTU or a corrupt LSA | `debug ip ospf adj` |
| Neighbour flaps every 40 s | duplicate router-ID, or the dead timer expiring | `show logging \| include OSPF` |
| FULL but no routes | wrong area, filtering, stub area | `show ip ospf database` |
| External routes missing | `redistribute` without `subnets`, or a stub area | `show ip ospf database external` |
| Default route missing | `default-information originate` without `always` | `show ip protocols` |

---

## The state machine, and what each stall means

An adjacency climbs DOWN → INIT → 2-WAY → EXSTART → EXCHANGE → LOADING → FULL, and should pass through the middle states in under a second. Anything you can actually *see* for more than a moment is stuck, and where it stuck narrows the cause considerably.

```
R1#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
2.2.2.2           1   FULL/BDR        00:00:33    10.0.12.2       GigabitEthernet0/0
3.3.3.3           1   EXSTART/DROTHER 00:00:31    10.0.13.3       GigabitEthernet0/1
```

### Stuck in INIT

INIT means **we are receiving the neighbour's hellos and it is not receiving ours.** The mechanism is precise: a router lists every neighbour it can hear inside its own hello. When R1 sees R2's hello but does not find its own router-ID in it, R1 knows the conversation is one-way and holds at INIT.

The fault is therefore in the direction *away* from the router displaying the problem — the broken device is the quiet one. Check the far end first, where the neighbour table will be empty, then look for what is silencing it: an inbound ACL dropping multicast to 224.0.0.5, `passive-interface` on that end, or one broken strand of a fibre pair.

```
R2#show ip interface GigabitEthernet0/0 | include access list
  Inbound  access list is EDGE_IN
```

```
R2#show access-lists EDGE_IN
Extended IP access list EDGE_IN
    10 permit icmp any any
    20 deny ip any host 224.0.0.5
    30 permit ip any any
```

An ACL that permits ICMP but not protocol 89 gives exactly this: ping across the segment works perfectly and OSPF never forms.

### Stuck in 2-WAY

This is **the most misdiagnosed fault on the list, because usually it is not a fault.** On a broadcast segment only the DR and BDR build full adjacencies. Two DROTHERs deliberately stop at 2-WAY — they have seen each other, agreed neither will exchange databases with the other, and synchronised with the DR instead. Three routers on one Ethernet segment will always show one 2-WAY/DROTHER pairing, and "fixing" it is wasted effort.

```
R3#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
1.1.1.1           1   FULL/DR         00:00:36    10.0.10.1       GigabitEthernet0/0
2.2.2.2           1   FULL/BDR        00:00:31    10.0.10.2       GigabitEthernet0/0
4.4.4.4           1   2WAY/DROTHER    00:00:38    10.0.10.4       GigabitEthernet0/0
```

The genuine fault looks different: **2-WAY with no DR on the segment at all**, which happens when every router on it has priority 0. Nobody is eligible, no election completes, and no database is ever exchanged.

```
R1#show ip ospf interface GigabitEthernet0/0 | include State|designated
  Transmit Delay is 1 sec, State DROTHER, Priority 0
  No designated router on this network
  No backup designated router on this network
```

`No designated router on this network` is the confirmation. Give at least one router a non-zero priority with `ip ospf priority 1` on the interface.

### Stuck in EXSTART or EXCHANGE

This is an **MTU mismatch**, effectively always. It is the one adjacency check not carried in the hello, so the routers agree on everything, elect a DR, get as far as exchanging database description packets, and then stop.

The mechanism: the DBD carries the sending interface's IP MTU. A router receiving a DBD that advertises an MTU *larger* than its own rejects it, because it cannot be sure it will be able to receive the LSAs that follow. The rejecting side sits in EXSTART; the other side, still retransmitting its DBD, shows EXCHANGE. Two different states for one fault, which is why the ends appear to disagree about what is wrong.

```
R1#debug ip ospf adj
*Sep  6 11:04:22.417: OSPF-1 ADJ   Gi0/1: Nbr 3.3.3.3 has larger interface MTU
*Sep  6 11:04:32.417: OSPF-1 ADJ   Gi0/1: Nbr 3.3.3.3 has larger interface MTU
```

Compare the ends with `show ip ospf interface <int> | include MTU`, and make them match — an MTU difference on a link is a real problem whether or not OSPF complains about it:

```
R3(config)#interface GigabitEthernet0/1
R3(config-if)#ip mtu 1500      ! this is the L3 MTU, not the L2 one
```

`ip ospf mtu-ignore` suppresses the check instead. It is the right answer when the mismatch is deliberate and unavoidable — a tunnel, or a carrier Ethernet service you do not control. It is the wrong answer as a reflex, because it forms an adjacency across a link where large LSAs may still be dropped, converting a clean failure into an intermittent one.

### Stuck in LOADING

The router has sent Link State Requests and is waiting for updates that never arrive or arrive malformed. In practice this is the same MTU problem showing up one state later — a large LSU dropped where the small DBD got through — or a genuinely corrupt LSA being retransmitted.

```
R1#debug ip ospf adj
*Sep  6 11:19:03.882: OSPF-1 ADJ   Gi0/1: Retransmitting Request to 3.3.3.3
```

### ATTEMPT

Only ever appears on a non-broadcast network type, and means a statically configured `neighbor` was unicast a hello and did not answer. ATTEMPT on Ethernet means someone has set `ip ospf network non-broadcast` on the interface.

---

## What the hello has to agree on

A single mismatch in the list below means the hello is discarded and the adjacency never leaves DOWN — the neighbour does not appear at all, which is a *less* informative symptom than any of the stuck states. `debug ip ospf adj` names the mismatch directly and is far quicker than comparing configurations:

```
R1#debug ip ospf adj
*Sep  6 09:41:18.223: OSPF-1 ADJ   Gi0/0: Rcv pkt from 10.0.12.2, Gi0/0 : Mismatched hello parameters
*Sep  6 09:41:18.223: OSPF-1 ADJ   Gi0/0: Dead R 120 C 40, Hello R 30 C 10  Mask R 255.255.255.0 C 255.255.255.252
```

`R` is what was received, `C` is what is configured locally — three mismatches on one line.

| Must match | Where to check | Notes |
|---|---|---|
| Area ID | `show ip ospf interface` | area 0 and area 0.0.0.0 are the same thing |
| Hello and dead intervals | `show ip ospf interface \| include Timer` | setting hello resets dead to 4× |
| Subnet and mask | `show ip interface brief` | **not checked on point-to-point** |
| Network type | `show ip ospf interface \| include Network Type` | drives the timers and DR behaviour |
| Stub flag | `show ip ospf \| include stub` | every router in the area, not only the ABR |
| Authentication type and key | `debug ip ospf adj` | type *and* key, both |
| MTU | `show ip ospf interface \| include MTU` | checked in the DBD, not the hello |

Router-ID must be **unique**, which is the one requirement that is the opposite of "must match".

A few of these are worth expanding. An interface's area comes from whichever `network` statement matched it, so an area mismatch is usually really a wildcard mistake. Setting `ip ospf hello-interval 5` implicitly sets the dead interval to 20 as well, so one command produces two mismatches. And on a broadcast network both routers must share the same subnet *and* mask — a /24 facing a /30 does not form an adjacency — while **on point-to-point OSPF does not check the mask at all**, which is why the identical misconfiguration works on a serial link and fails on Ethernet.

Authentication fails in two distinguishable ways, and both name themselves:

```
*Sep  6 10:11:52.774: OSPF-1 ADJ   Gi0/0: Rcv pkt from 10.0.12.2 : Mismatch Authentication type. Input packet specified type 0, we use type 2
*Sep  6 10:12:14.008: OSPF-1 ADJ   Gi0/0: Rcv pkt from 10.0.12.2 : Mismatch Authentication Key - No message digest key 1 on interface
```

Authentication can be configured per-area or per-interface, and mixing the two is a reliable way to leave one interface unprotected while believing the whole area is covered.

### Network types and their defaults

The network type is not carried in the hello, but it decides the timers and DR behaviour that are, so a mismatch normally surfaces as a timer mismatch:

| Network type | DR/BDR | Hello / Dead | Neighbours | Default on |
|---|---|---|---|---|
| **broadcast** | yes | **10 / 40** | multicast 224.0.0.5 | Ethernet |
| **point-to-point** | no | **10 / 40** | multicast 224.0.0.5 | serial, p2p subinterfaces |
| **non-broadcast** | yes | **30 / 120** | manual, unicast | Frame Relay multipoint |
| **point-to-multipoint** | no | **30 / 120** | multicast 224.0.0.5 | configured only |
| point-to-multipoint non-broadcast | no | 30 / 120 | manual, unicast | configured only |

Broadcast against point-to-point is the interesting case: the timers happen to match, so hellos are accepted and the adjacency reaches FULL. What breaks instead is the database. The broadcast side builds a type 2 network LSA describing a DR and the point-to-point side never does, leaving the two routers describing the same segment differently — routes then appear and disappear as SPF runs on an inconsistent topology.

The non-broadcast types need neighbours configured by hand, because there is no multicast to discover them with:

```
R1(config)#router ospf 1
R1(config-router)#neighbor 10.0.12.2
```

### Duplicate router-ID

Two routers claiming the same ID produce a flapping adjacency rather than a clean failure, because each keeps invalidating the other's LSAs:

```
%OSPF-4-DUP_RTRID_NBR: OSPF detected duplicate router-id 2.2.2.2 from 10.0.12.2 on interface GigabitEthernet0/0
```

The router-ID is chosen once, at process start: an explicit `router-id`, else the highest loopback address, else the highest active interface address. **Changing it does not take effect until the process is cleared**, which surprises people who fix the configuration and see nothing change:

```
R2#clear ip ospf process
Reset ALL OSPF processes? [no]: yes
```

### Passive interface

A passive interface still has its subnet advertised into OSPF but stops sending and processing hellos, so no neighbour forms on it. That is exactly what you want on a LAN facing users and exactly what you do not want on a transit link, and it is easy to miss because the network appears correctly in the database. Watch for `passive-interface default`, where the list you need to read is the *non*-passive one:

```
R1#show ip protocols | begin Passive
  Passive Interface(s):
    GigabitEthernet0/2
    GigabitEthernet0/0
```

---

## DR/BDR election

Highest priority wins; a tie is broken by the highest router-ID; priority 0 makes a router permanently ineligible. The rule that causes confusion is that **the election is not preemptive.** A router that boots first becomes DR and stays DR, even after a router with a much higher priority joins the segment. So the "wrong" router being DR is almost never a misconfiguration — it is a record of the order things were last powered on. If it genuinely matters, force a re-election by clearing the process on the current DR rather than raising priorities and waiting.

```
R1#show ip ospf interface GigabitEthernet0/0 | include State|Designated
  Transmit Delay is 1 sec, State DR, Priority 1
  Designated Router (ID) 1.1.1.1, Interface address 10.0.10.1
  Backup Designated router (ID) 2.2.2.2, Interface address 10.0.10.2
```

DR and BDR matter only on broadcast and non-broadcast networks. On point-to-point there is no election at all, which is one good reason to configure `ip ospf network point-to-point` on a two-router Ethernet segment.

---

## The adjacency is FULL and the route is missing

Now the question is whether the prefix is absent from the database, or present in the database and not selected into the routing table. If it is nowhere in `show ip ospf database`, it was never advertised. If it is in the database and not in `show ip route`, either SPF rejected it, or another protocol won on administrative distance.

### The network statement and its wildcard

`network` does not advertise a network. It selects **interfaces**: any interface whose primary address falls inside the statement is enabled for OSPF, placed in the named area, and has its *actual* connected prefix advertised. That distinction explains both classic errors.

The mask is a wildcard, and the two are inverted:

```
R1(config-router)#network 10.0.12.0 255.255.255.252 area 0    ! wrong — subnet mask
R1(config-router)#network 10.0.12.0 0.0.0.3 area 0            ! right — wildcard
```

A statement that is too broad quietly puts interfaces into an area they do not belong in. `network 10.0.0.0 0.255.255.255 area 0` enables every 10.x interface in area 0, including the one that was meant to be in area 1 — whose adjacency then fails with an area mismatch while the configuration still looks correct. Check what OSPF actually did with the statements rather than reading them:

```
R1#show ip ospf interface brief
Interface    PID   Area            IP Address/Mask    Cost  State Nbrs F/C
Gi0/2        1     0               10.0.20.1/24       1     DR    0/0
Gi0/1        1     0               10.0.13.1/30       1     BDR   1/1
Gi0/0        1     0               10.0.12.1/30       1     DR    1/1
```

### Stub and totally-stubby areas suppress what you expect

The area type decides which LSA types are allowed in, and each restriction removes routes you may be hunting for:

| Area type | Blocks | You will not see |
|---|---|---|
| **Stub** | types 5 and 4 | any `O E1`/`O E2` external route |
| **Totally stubby** | types 3, 4, 5 | inter-area routes too — only a default |
| **NSSA** | type 5, allows type 7 | externals from elsewhere; locally originated ones work |
| Totally NSSA | types 3, 4, 5, allows 7 | as totally stubby, plus local externals |

The ABR injects a default route in place of what it filtered, so connectivity usually still works and only *specific* prefixes are missing. That is the trap: the area looks healthy, the internet is reachable, and one redistributed prefix is unreachable because it was a type 5 LSA arriving at a stub area border. If an area needs to originate external routes without receiving them, `area 1 nssa` is the answer.

### Discontiguous area 0

Every non-backbone area must touch area 0, and area 0 must be contiguous. Split it — usually by adding a second path that was meant to be a shortcut — and inter-area routing stops in ways that look like filtering. The repair is a virtual link across a non-stub transit area, and the command takes the **router-ID** of the far ABR, not an interface address on it. Using the interface address is the most common way to build a virtual link that never comes up:

```
R1(config)#router ospf 1
R1(config-router)#area 1 virtual-link 2.2.2.2    ! router-ID of the far ABR
```

```
R1#show ip ospf virtual-links
Virtual Link OSPF_VL0 to router 2.2.2.2 is up
  Transit area 1, via interface GigabitEthernet0/1
```

### Filtering

Two different mechanisms, in two different places. An ABR can be told not to leak specific inter-area prefixes with `area 1 filter-list prefix NO_LEAK in`, and that filter lives on the ABR rather than anywhere near the router missing the route. A plain distribute-list in OSPF filters what enters the **routing table** without touching the database — so the prefix is visible in `show ip ospf database` and absent from `show ip route`, on the same router:

```
R1#show ip protocols | include filter
  Outgoing update filter list for all interfaces is not set
  Incoming update filter list for all interfaces is 10
```

### The default route needs `always`

`default-information originate` advertises a default only if the router already has one in its own routing table. Lose the static default — because the upstream interface went down — and the ASBR withdraws the default from OSPF, and the whole network loses its way out.

```
R1(config-router)#default-information originate always
```

`always` advertises regardless. That is the right choice on a router that genuinely is the way out, and a dangerous one on a router whose own default has failed, since it will now attract traffic it cannot forward.

### Redistribution, `subnets`, and E1 against E2

Redistributing into OSPF without `subnets` advertises **only classful networks** and silently discards every subnet. Since almost nothing is classful now, the usual result is that redistribution appears to do nothing at all:

```
R1(config-router)#redistribute eigrp 100 subnets
```

By default redistributed routes arrive as **E2 with a fixed cost of 20**, and an E2 metric does not increase as the route crosses the OSPF domain. That is why every external route shows cost 20 everywhere, and why two paths to the same external prefix tie — the internal cost to reach the ASBR is not counted. E1 adds it:

```
R1#show ip route ospf | include E1|E2
O E2     172.16.5.0/24 [110/20] via 10.0.12.1, 00:03:11, GigabitEthernet0/0
O E1     172.16.6.0/24 [110/84] via 10.0.12.1, 00:00:52, GigabitEthernet0/0
```

### Summarisation uses two different commands

Summarising with the wrong one is a no-op, and IOS accepts both without complaint:

| Command | Configured on | Summarises |
|---|---|---|
| `area 1 range 10.1.0.0 255.255.0.0` | the **ABR** | inter-area (type 3) routes |
| `summary-address 172.16.0.0 255.255.0.0` | the **ASBR** | external (type 5/7) routes |

Both create a discard route to Null0 for the summary, which is deliberate — it stops traffic for a non-existent component prefix from looping back.

---

## Quick reference

| Command | Proves |
|---|---|
| `show ip ospf neighbor` | which state each adjacency reached — the first command, always |
| `show ip ospf interface brief` | every OSPF-enabled interface, its area and state, in one screen |
| `show ip ospf interface <int>` | timers, network type, MTU, priority, DR/BDR for one link |
| `show ip ospf` | router-ID, area types, ABR/ASBR role, SPF counts |
| `show ip ospf database` | whether the prefix was ever advertised |
| `show ip ospf database external` | type 5 LSAs, their metric type and tag — redistribution results |
| `show ip ospf virtual-links` | whether a virtual link is actually up |
| `show ip protocols` | passive interfaces, distribute-lists, redistribution, distance |
| `debug ip ospf adj` | names the mismatch: area, timers, mask, authentication, MTU |
| `clear ip ospf process` | applies a new router-ID, forces a DR re-election |

---

*Based on the NetworkLessons troubleshooting series: OSPF neighbor adjacency and OSPF route advertisement on Cisco IOS.*
