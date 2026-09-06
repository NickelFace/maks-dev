---
title: "Lab 16 · OSPF Single-Area"
date: 2026-09-06
description: "Bring up OSPFv2 across three routers, watch the adjacency form state by state, and read the LSDB that produced the routing table."
tags: ["CCNA", "OSPF", "Routing", "Lab"]
categories: ["CCNA"]
domain: 3
tool: "Packet Tracer"
duration: "45 min"
sources: "Jeremy's IT Lab Day 26 · Flackbox 20-1"
aliases: ["/ccna-labs/ccna-lab-20-ospf/"]
---

OSPF is the first protocol in the CCNA where the router stops taking your word for it. A static route exists because you typed it; an OSPF route exists because two routers agreed on a hello interval, an area, a subnet mask and an MTU, flooded link-state advertisements at each other, and independently ran Dijkstra over the result. When an OSPF route is missing, one of those agreements broke — and the whole point of this lab is to learn where to look.

We build a three-router single area, verify it at every layer, then deliberately break the adjacency two ways and watch which `show` command tells the truth.

## Topology

{{< topology cols="3" rows="3" caption="Single area 0 — R1 and R2 share a broadcast segment, R2 and R3 a point-to-point link" >}}
router R1 "1.1.1.1" at 0,1
router R2 "2.2.2.2" at 1,1
router R3 "3.3.3.3" at 2,1

R1 — R2 label="10.10.10.0/24"
R2 — R3 label="10.10.20.0/24"
{{< /topology >}}

## Addressing

| Device | Interface | Address | Role |
|---|---|---|---|
| R1 | G0/0 | 10.10.10.1/24 | link to R2 |
| R1 | Lo0 | 1.1.1.1/32 | router-ID + advertised prefix |
| R2 | G0/0 | 10.10.10.2/24 | link to R1 |
| R2 | G0/1 | 10.10.20.1/24 | link to R3 |
| R2 | Lo0 | 2.2.2.2/32 | router-ID + advertised prefix |
| R3 | G0/0 | 10.10.20.2/24 | link to R2 |
| R3 | Lo0 | 3.3.3.3/32 | router-ID + advertised prefix |

Every router is in **area 0**, process ID 1. The process ID is locally significant — R1 could run `router ospf 47` and still peer with R2's `router ospf 1`. The area number is not.

## Objectives

- Address the links and loopbacks, and prove Layer 3 works before OSPF is involved at all
- Enable OSPFv2 with an explicit router-ID and watch the adjacency reach FULL
- Read `show ip ospf neighbor`, `show ip ospf interface` and `show ip ospf database` and say what each one proves
- Influence path selection with interface cost and reference bandwidth
- Stop OSPF leaking hellos where no neighbour lives, with `passive-interface`
- Break the adjacency on purpose (area mismatch, hello-timer mismatch) and diagnose it from the CLI

---

## Part 1 — Underlay first

Nothing about OSPF can work until two interfaces on the same subnet can ping each other. Configure addressing, then verify it, then move on. Skipping this step is the single most common reason a lab "doesn't work".

{{< step num="1" dev="R1" title="Address R1 and bring the interfaces up" >}}
```
R1>enable
R1#configure terminal
R1(config)#hostname R1
R1(config)#interface Loopback0
R1(config-if)#ip address 1.1.1.1 255.255.255.255
R1(config-if)#exit
R1(config)#interface GigabitEthernet0/0
R1(config-if)#description ## to R2 G0/0 ##
R1(config-if)#ip address 10.10.10.1 255.255.255.0
R1(config-if)#no shutdown
R1(config-if)#end
R1#write memory
```

`no shutdown` matters on a router and not on a switch: router interfaces are administratively down out of the box. A loopback needs no `no shutdown` — it is up the moment it exists, which is exactly why it makes a stable router-ID.
{{< /step >}}

{{< step num="2" dev="R2" title="Address R2 — the transit router with two OSPF links" >}}
```
R2>enable
R2#configure terminal
R2(config)#hostname R2
R2(config)#interface Loopback0
R2(config-if)#ip address 2.2.2.2 255.255.255.255
R2(config-if)#exit
R2(config)#interface GigabitEthernet0/0
R2(config-if)#description ## to R1 G0/0 ##
R2(config-if)#ip address 10.10.10.2 255.255.255.0
R2(config-if)#no shutdown
R2(config-if)#exit
R2(config)#interface GigabitEthernet0/1
R2(config-if)#description ## to R3 G0/0 ##
R2(config-if)#ip address 10.10.20.1 255.255.255.0
R2(config-if)#no shutdown
R2(config-if)#end
R2#write memory
```
{{< /step >}}

{{< step num="3" dev="R3" title="Address R3" >}}
```
R3>enable
R3#configure terminal
R3(config)#hostname R3
R3(config)#interface Loopback0
R3(config-if)#ip address 3.3.3.3 255.255.255.255
R3(config-if)#exit
R3(config)#interface GigabitEthernet0/0
R3(config-if)#description ## to R2 G0/1 ##
R3(config-if)#ip address 10.10.20.2 255.255.255.0
R3(config-if)#no shutdown
R3(config-if)#end
R3#write memory
```
{{< /step >}}

{{< verify dev="R1, R3" cmd="show ip interface brief" open="true" >}}
Both physical links and both loopbacks must read `up / up` before you type a single OSPF command.

```
R1#show ip interface brief
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     10.10.10.1      YES manual up                    up
GigabitEthernet0/1     unassigned      YES unset  administratively down down
Loopback0              1.1.1.1         YES manual up                    up
```

Then prove the wire, not the protocol:

```
R1#ping 10.10.10.2
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 10.10.10.2, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/8 ms
```

If this ping fails, stop. OSPF will not fix a cable, a shutdown interface or a wrong mask.
{{< /verify >}}

---

## Part 2 — Enable OSPFv2

Three decisions go into every OSPF interface: which process, which area, and what the router calls itself.

Set the router-ID explicitly. Left alone, IOS picks the highest loopback address, or the highest active interface address if no loopback exists — and it keeps that value until the process is cleared, so a router that boots before its loopback is configured will hold a surprising ID for the rest of its uptime.

{{< step num="4" dev="R1" title="Start the OSPF process and advertise both interfaces" >}}
```
R1(config)#router ospf 1
R1(config-router)#router-id 1.1.1.1
R1(config-router)#network 10.10.10.0 0.0.0.255 area 0
R1(config-router)#network 1.1.1.1 0.0.0.0 area 0
R1(config-router)#end
```

`network` under OSPF does not mean "advertise this prefix". It means **"find my interfaces whose address falls inside this range, put them in this area, and start sending hellos out of them"** — and the prefix that then gets advertised is the interface's own, with the interface's own mask. That is why `network 1.1.1.1 0.0.0.0 area 0` advertises a /32 even though the wildcard says nothing about masks.

The mask is a *wildcard*, the bitwise inverse of a subnet mask: `0.0.0.255` = "match the first three octets", `0.0.0.0` = "match this exact address".

The modern alternative, which is worth knowing because it removes the wildcard-arithmetic class of mistakes entirely:

```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ip ospf 1 area 0
```
{{< /step >}}

{{< step num="5" dev="R2" title="Enable OSPF on R2 — both links plus the loopback" >}}
```
R2(config)#router ospf 1
R2(config-router)#router-id 2.2.2.2
R2(config-router)#network 10.10.10.0 0.0.0.255 area 0
R2(config-router)#network 10.10.20.0 0.0.0.255 area 0
R2(config-router)#network 2.2.2.2 0.0.0.0 area 0
R2(config-router)#end
```

Watch the console. Enabling the second network should produce the adjacency log immediately:

```
%OSPF-5-ADJCHG: Process 1, Nbr 1.1.1.1 on GigabitEthernet0/0 from LOADING to FULL, Loading Done
```

A single wildcard would have covered both links — `network 10.10.0.0 0.0.255.255 area 0` — but writing them out one line per link is what you want in a lab: it makes the intent auditable in `show run`.
{{< /step >}}

{{< step num="6" dev="R3" title="Enable OSPF on R3" >}}
```
R3(config)#router ospf 1
R3(config-router)#router-id 3.3.3.3
R3(config-router)#network 10.10.20.0 0.0.0.255 area 0
R3(config-router)#network 3.3.3.3 0.0.0.0 area 0
R3(config-router)#end
```
{{< /step >}}

---

## Part 3 — Verification, in the order a network engineer actually uses it

Four commands, each answering a different question. Run them in this order; each one only makes sense if the previous passed.

{{< verify dev="R2" cmd="show ip ospf neighbor" open="true" >}}
**Question: did the adjacency form?**

```
R2#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
1.1.1.1           1   FULL/BDR        00:00:36    10.10.10.1      GigabitEthernet0/0
3.3.3.3           1   FULL/BDR        00:00:33    10.10.20.2      GigabitEthernet0/1
```

`FULL` is the only state you want to see sitting still. The others are transient and each tells you where it stalled:

| State | Meaning | Stuck here means |
|---|---|---|
| DOWN | no hello received | wrong subnet, interface down, `passive-interface` on the wrong side |
| INIT | I hear them, they do not hear me | one-way hellos — ACL, or a unidirectional fault |
| 2-WAY | mutual hellos, no database exchange | normal and permanent between two DROTHERs |
| EXSTART / EXCHANGE | negotiating master/slave | **MTU mismatch** — the classic |
| LOADING | requesting LSAs | usually momentary |
| FULL | databases identical | done |

Dead Time counting down from 40 and resetting is a live adjacency. Dead Time frozen means hellos stopped arriving; you have roughly 40 seconds before the neighbour drops.
{{< /verify >}}

{{< verify dev="R2" cmd="show ip ospf interface brief" >}}
**Question: which interfaces is OSPF actually running on, and in which area?**

```
R2#show ip ospf interface brief
Interface    PID   Area   IP Address/Mask     Cost  State Nbrs F/C
Lo0          1     0      2.2.2.2/32          1     LOOP  0/0
Gi0/0        1     0      10.10.10.2/24       1     BDR   1/1
Gi0/1        1     0      10.10.20.1/24       1     BDR   1/1
```

This is the command that catches a `network` statement whose wildcard did not match what you thought it matched. If an interface you expected is missing from this list, OSPF was never enabled on it — no amount of staring at the neighbour table will show you that.

`Nbrs F/C` is Full / Count: two numbers that should match.
{{< /verify >}}

{{< verify dev="R1" cmd="show ip route ospf" >}}
**Question: did the SPF result reach the routing table?**

```
R1#show ip route ospf
      2.0.0.0/32 is subnetted, 1 subnets
O        2.2.2.2 [110/2] via 10.10.10.2, 00:04:11, GigabitEthernet0/0
      3.0.0.0/32 is subnetted, 1 subnets
O        3.3.3.3 [110/3] via 10.10.10.2, 00:03:58, GigabitEthernet0/0
      10.0.0.0/8 is variably subnetted, 3 subnets, 2 masks
O        10.10.20.0/24 [110/2] via 10.10.10.2, 00:04:11, GigabitEthernet0/0
```

`[110/2]` is `[administrative distance / metric]`. 110 is OSPF's AD — the tiebreak used when two different protocols offer the same prefix. 2 is the cost: the sum of the outgoing-interface costs along the path.

Note the loopbacks arrive as `/32` even though they were configured as `/32`. OSPF advertises a loopback as a host route by default regardless of its configured mask, unless the interface is set to `ip ospf network point-to-point`.
{{< /verify >}}

{{< verify dev="R1" cmd="show ip ospf database" >}}
**Question: what did the routers actually tell each other?**

```
R1#show ip ospf database

            OSPF Router with ID (1.1.1.1) (Process ID 1)

                Router Link States (Area 0)

Link ID         ADV Router      Age         Seq#       Checksum Link count
1.1.1.1         1.1.1.1         421         0x80000004 0x00A1B2 3
2.2.2.2         2.2.2.2         418         0x80000005 0x0043C1 5
3.3.3.3         3.3.3.3         402         0x80000003 0x009F2E 3

                Net Link States (Area 0)

Link ID         ADV Router      Age         Seq#       Checksum
10.10.10.2      2.2.2.2         418         0x80000001 0x00D410
```

Three Type-1 Router LSAs — one per router, each describing that router's own links. One Type-2 Network LSA, generated by the DR for the multi-access segment, describing who is attached to it.

Inside a single area every router holds an **identical** copy of this database. If R1 and R3 disagree here, you have a flooding problem, not a routing problem. `Age` climbing past 3600 without a refresh means the LSA is stale and about to be flushed.
{{< /verify >}}

---

## Part 4 — DR/BDR on the broadcast segment

Ethernet is multi-access, so OSPF elects a Designated Router to avoid every router adjacency-ing with every other one. On a segment with *n* routers that turns n(n−1)/2 adjacencies into n−1.

{{< step num="7" dev="R1" title="Read the current election result" >}}
```
R1#show ip ospf interface GigabitEthernet0/0
GigabitEthernet0/0 is up, line protocol is up
  Internet Address 10.10.10.1/24, Area 0, Attached via Network Statement
  Process ID 1, Router ID 1.1.1.1, Network Type BROADCAST, Cost: 1
  Transmit Delay is 1 sec, State DR, Priority 1
  Designated Router (ID) 1.1.1.1, Interface address 10.10.10.1
  Backup Designated router (ID) 2.2.2.2, Interface address 10.10.10.2
  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5
```

R1 won with an equal priority of 1 because its router-ID is higher — no, lower. Read that line again: the tiebreak is the **highest** router-ID, so R2 (2.2.2.2) should have won. If your output shows R1 as DR anyway, that is the rule that trips people up in production: **the election is non-preemptive**. R1 came up first, claimed DR, and a better candidate arriving later does not displace it.
{{< /step >}}

{{< step num="8" dev="R2" title="Force R2 to become DR" >}}
```
R2(config)#interface GigabitEthernet0/0
R2(config-if)#ip ospf priority 100
R2(config-if)#end
```

Setting the priority alone changes nothing, precisely because of non-preemption. Clear the process on the *current* DR to trigger a fresh election:

```
R1#clear ip ospf process
Reset ALL OSPF processes? [no]: yes
```

Priority `0` is the other useful value: it removes the router from the election entirely. Set it on any router that must never be DR — a low-powered branch box, or one you plan to reload often.
{{< /step >}}

{{< verify dev="R2" cmd="show ip ospf neighbor" >}}
After the election, R2 should hold DR and R1 should have dropped to BDR or DROTHER:

```
R2#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
1.1.1.1           1   FULL/BDR        00:00:38    10.10.10.1      GigabitEthernet0/0
```

The state string reads `FULL/BDR` on R2 — that is *the neighbour's* role, not R2's. To read your own role, use `show ip ospf interface`.
{{< /verify >}}

---

## Part 5 — Cost, and why the default is wrong

OSPF cost is `reference-bandwidth / interface-bandwidth`, with a floor of 1. The reference bandwidth defaults to 100 Mbps, which was a reasonable choice in 1998 and is nonsense now: FastEthernet, GigabitEthernet and TenGig all round down to cost 1, so OSPF cannot tell them apart.

{{< step num="9" dev="R1, R2, R3" title="Raise the reference bandwidth everywhere" >}}
```
R1(config)#router ospf 1
R1(config-router)#auto-cost reference-bandwidth 10000
% OSPF: Reference bandwidth is changed.
        Please ensure reference bandwidth is consistent across all routers.
```

Repeat on **every** router in the domain. The warning is not decorative: a router using 100 and a router using 10000 will compute different costs for the same link and pick asymmetric, sometimes looping-looking paths. 10000 (10 Gbps) gives headroom above Gigabit access links.
{{< /step >}}

{{< step num="10" dev="R1" title="Override the cost on a single interface" >}}
```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ip ospf cost 100
R1(config-if)#end
```

An explicit `ip ospf cost` wins over anything the reference-bandwidth formula produces, and over `bandwidth` on the interface. Use it when you want a link demoted to a backup path without touching the rest of the design — it is deterministic and it shows up plainly in `show run interface`.
{{< /step >}}

{{< verify dev="R1" cmd="show ip ospf interface GigabitEthernet0/0 | include Cost" >}}
```
R1#show ip ospf interface GigabitEthernet0/0 | include Cost
  Process ID 1, Router ID 1.1.1.1, Network Type BROADCAST, Cost: 100
```

Then confirm the metric moved in the routing table — cost only matters if it changed a decision:

```
R1#show ip route ospf | include 10.10.20.0
O        10.10.20.0/24 [110/101] via 10.10.10.2, 00:00:14, GigabitEthernet0/0
```

101 = 100 (R1's outbound Gi0/0) + 1 (R2's outbound Gi0/1). Cost accumulates on **outgoing** interfaces along the path; the cost of the interface you receive on is never counted.
{{< /verify >}}

---

## Part 6 — passive-interface

A loopback has no neighbour. Neither does a LAN full of PCs. Sending hellos there wastes CPU and, more importantly, offers an attacker a free adjacency.

{{< step num="11" dev="R1" title="Silence OSPF on the loopback, keep advertising the prefix" >}}
```
R1(config)#router ospf 1
R1(config-router)#passive-interface Loopback0
R1(config-router)#end
```

`passive-interface` stops hellos **out** of the interface while keeping the prefix in the LSDB. That distinction is the whole point: the network is still reachable, it just no longer invites peers.

On a router with many user-facing LANs, invert the default instead:

```
R1(config-router)#passive-interface default
R1(config-router)#no passive-interface GigabitEthernet0/0
```

Safe by default, explicit about the handful of links that carry real neighbours.
{{< /step >}}

{{< verify dev="R1" cmd="show ip protocols" >}}
```
R1#show ip protocols
Routing Protocol is "ospf 1"
  Router ID 1.1.1.1
  Number of areas in this router is 1. 1 normal 0 stub 0 nssa
  Maximum path: 4
  Routing for Networks:
    10.10.10.0 0.0.0.255 area 0
    1.1.1.1 0.0.0.0 area 0
  Passive Interface(s):
    Loopback0
  Routing Information Sources:
    Gateway         Distance      Last Update
    2.2.2.2              110      00:06:22
  Distance: (default is 110)
```

One screen holding the router-ID, the network statements, the passive list, the AD and who you are learning from. When a lab "doesn't work", this is the fastest single command to run.
{{< /verify >}}

---

## Part 7 — Break it on purpose

Two routers must agree on area ID, hello and dead intervals, authentication, stub flags and MTU before an adjacency forms. Two of those are worth breaking by hand, because the symptoms are so different.

{{< step num="12" dev="R3" title="Break 1 — area mismatch" >}}
```
R3(config)#router ospf 1
R3(config-router)#no network 10.10.20.0 0.0.0.255 area 0
R3(config-router)#network 10.10.20.0 0.0.0.255 area 1
R3(config-router)#end
```

R2 and R3 now claim different areas for the same wire. Watch R2's console:

```
%OSPF-4-ERRRCV: Received invalid packet: mismatch area ID, from backbone area
  must be virtual-link but not found from 10.10.20.2, GigabitEthernet0/1
```

**The lesson: an area mismatch tells you outright.** IOS names the fault in the log. The neighbour simply vanishes from `show ip ospf neighbor`, and the routes it contributed age out.

Fix it:

```
R3(config)#router ospf 1
R3(config-router)#no network 10.10.20.0 0.0.0.255 area 1
R3(config-router)#network 10.10.20.0 0.0.0.255 area 0
```
{{< /step >}}

{{< step num="13" dev="R3" title="Break 2 — hello/dead timer mismatch" >}}
```
R3(config)#interface GigabitEthernet0/0
R3(config-if)#ip ospf hello-interval 5
R3(config-if)#end
```

Changing the hello interval silently changes the dead interval to 4× it, so R3 now advertises hello 5 / dead 20 while R2 advertises 10 / 40. The adjacency drops and — this is the cruel part — **nothing is logged**. The hellos are valid OSPF packets; they simply describe an incompatible neighbour, so each side ignores the other.

Diagnose it by comparing the two sides:

```
R3#show ip ospf interface GigabitEthernet0/0 | include Timer
  Timer intervals configured, Hello 5, Dead 20, Wait 20, Retransmit 5

R2#show ip ospf interface GigabitEthernet0/1 | include Timer
  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5
```

Or watch the hellos arrive and be discarded:

```
R2#debug ip ospf hello
```

Restore:

```
R3(config-if)#no ip ospf hello-interval
```
{{< /step >}}

{{< verify dev="R2" cmd="show ip ospf neighbor" >}}
Both neighbours back to FULL, and R1 sees all three loopbacks again:

```
R1#ping 3.3.3.3 source Loopback0
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 3.3.3.3, timeout is 2 seconds:
Packet sent with a source address of 1.1.1.1
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 2/8/24 ms
```

`source Loopback0` is not decoration. A ping without it sources from the outgoing interface, which proves less: it can succeed while the loopback prefix is missing from the far end's table.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Most likely cause | Command that proves it |
|---|---|---|
| Neighbour never appears | interface not in OSPF, or `passive-interface` set | `show ip ospf interface brief` |
| Stuck in EXSTART/EXCHANGE | MTU mismatch | `show interface \| include MTU` on both ends |
| Stuck in INIT | hellos one-way — ACL or physical fault | `debug ip ospf hello` |
| Adjacency flaps every ~40 s | duplicate router-ID | `show ip ospf` on both, compare IDs |
| Neighbour FULL, no routes | prefix advertised in another area, or filtered | `show ip ospf database` |
| Traffic takes the slow link | reference bandwidth inconsistent | `show ip ospf \| include Reference` |
| Two DRs on one segment | segment split at Layer 2 | `show ip ospf neighbor` on every router |

## Exam notes

- OSPF administrative distance is **110**, metric is **cost**, protocol number **89**, multicast **224.0.0.5** (all routers) and **224.0.0.6** (DR/BDR).
- Router-ID selection order: explicit `router-id` → highest loopback → highest active interface. It is chosen once at process start and does not update on its own.
- DR/BDR is elected on **broadcast** and **non-broadcast** networks only — never on point-to-point.
- Election tiebreak: highest priority, then highest router-ID. Priority 0 opts out. **Non-preemptive.**
- `network A.B.C.D wildcard area N` enables OSPF on matching *interfaces*; it does not advertise the prefix in the statement.
- Default cost formula: 100 Mbps ÷ interface bandwidth, minimum 1. Change with `auto-cost reference-bandwidth` — consistently, domain-wide.
- Must match for adjacency: **area ID, hello/dead intervals, authentication, stub flags, MTU**. Router-ID must *not* match — duplicates break it.
- Process ID is locally significant. Area ID is not.

---

*Sources: Flackbox CCNA Lab Guide 20-1 · Jeremy's IT Lab Day 26–28 · verified in Packet Tracer 8.2.*
