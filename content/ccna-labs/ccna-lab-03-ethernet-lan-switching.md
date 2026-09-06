---
title: "Lab 03 · Ethernet LAN Switching"
date: 2026-09-06
description: "Watch a switch learn: the MAC address table filling one frame at a time, unknown-unicast flooding, and where the collision and broadcast domain boundaries actually sit."
tags: ["CCNA", "Ethernet", "Switching", "Lab"]
categories: ["CCNA"]
domain: 1
tool: "Packet Tracer"
duration: "35 min"
sources: "Jeremy's IT Lab Day 3, 5, 6 · Flackbox 11"
aliases: ["/ccna-labs/ccna-lab-11-device-functions/"]
---

A switch has exactly one job and it does it with one table. Frames arrive, it records the source MAC against the port they came in on, and it forwards toward the destination MAC if it has seen that address before — or out of every other port if it has not. Everything else a switch does, VLANs and spanning tree included, is a modification of that loop.

This lab clears the table and watches it refill, frame by frame, so the flood-then-learn behaviour stops being a diagram.

## Topology

{{< topology cols="3" rows="3" caption="One switch, three hosts — enough to see learning, flooding and filtering separately" >}}
pc     PC1 "192.168.1.10 · Fa0/1" at 0,0
pc     PC2 "192.168.1.20 · Fa0/2" at 0,2
switch SW1 "" at 1,1
pc     PC3 "192.168.1.30 · Fa0/3" at 2,1

PC1 — SW1
PC2 — SW1
PC3 — SW1
{{< /topology >}}

| Host | IP | MAC (example) | Port |
|---|---|---|---|
| PC1 | 192.168.1.10/24 | 0001.6431.A201 | Fa0/1 |
| PC2 | 192.168.1.20/24 | 000A.F311.B4C2 | Fa0/2 |
| PC3 | 192.168.1.30/24 | 0090.2144.7E3B | Fa0/3 |

Read your own MACs from the PT desktop — `ipconfig /all` on each host — and substitute them.

## Objectives

- Empty the MAC address table and watch it repopulate one entry per transmitting host
- Distinguish the three switch actions: **learn**, **flood**, **forward**, and see the fourth, **filter**
- Prove that a switch never floods a *known* unicast back out the port it arrived on
- Count collision domains and broadcast domains for a given topology and say why a hub differs
- Add a static MAC entry and see it survive the aging timer

---

## Part 1 — Start from empty

{{< step num="1" dev="SW1" title="Clear the table and confirm it is empty" open="true" >}}
```
SW1#clear mac address-table dynamic
SW1#show mac address-table

          Mac Address Table
-------------------------------------------

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
   1    0060.5c2b.9401    STATIC      CPU
```

The only entry left is the switch's own CPU address — the switch itself is a host on VLAN 1 for management purposes. `clear` removes dynamic entries only; static ones stay.

The default aging timer is **300 seconds**. An entry not refreshed by a frame from that source is discarded, which is why a silent host disappears from the table after five minutes and its traffic starts being flooded again.

```
SW1#show mac address-table aging-time
Global Aging Time:  300
```
{{< /step >}}

{{< step num="2" dev="PC1" title="Send one frame and see exactly one entry appear" >}}
From PC1's command prompt:

```
PC> ping 192.168.1.20
```

The first packet will very likely time out. That is the lesson, not a fault — PC1 has to ARP for PC2's MAC first, and the ARP round trip plus the flood takes longer than the first ICMP timeout.

Now look at the table:

```
SW1#show mac address-table

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
   1    0001.6431.a201    DYNAMIC     Fa0/1
   1    000a.f311.b4c2    DYNAMIC     Fa0/2
```

Two entries from one ping, and the order matters:

1. PC1 sent an **ARP request** — a broadcast to `FFFF.FFFF.FFFF`. The switch learned `0001.6431.a201` on Fa0/1 from the *source* field, then flooded the frame out Fa0/2 and Fa0/3 because the destination was broadcast.
2. PC2 sent an **ARP reply** — a unicast back to PC1. The switch learned `000a.f311.b4c2` on Fa0/2, and this time it had PC1's address already, so it forwarded out Fa0/1 only.

**A switch learns from the source address and forwards on the destination address.** Those are two different fields and two different moments. Every piece of switch behaviour in the CCNA follows from keeping them separate.

PC3 never transmitted, so PC3 is not in the table — even though it received the flooded ARP request.
{{< /step >}}

{{< verify dev="SW1" cmd="show mac address-table dynamic" open="true" >}}
Ping from PC3 and watch the third entry appear:

```
SW1#show mac address-table dynamic

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
   1    0001.6431.a201    DYNAMIC     Fa0/1
   1    000a.f311.b4c2    DYNAMIC     Fa0/2
   1    0090.2144.7e3b    DYNAMIC     Fa0/3
```

Narrow it when the table is large — a production access switch holds thousands of entries:

```
SW1#show mac address-table interface FastEthernet0/1
SW1#show mac address-table address 0001.6431.a201
SW1#show mac address-table vlan 1
SW1#show mac address-table count
```
{{< /verify >}}

---

## Part 2 — Flooding versus forwarding

{{< step num="3" dev="SW1" title="Prove the difference with a packet capture" >}}
Switch Packet Tracer into **Simulation** mode, filter to ICMP and ARP only, and send a single ping from PC1 to PC2 twice.

**First ping, table empty.** The ARP request leaves Fa0/1 and appears simultaneously on Fa0/2 *and* Fa0/3. That is a **flood**: destination is broadcast, so every port in the VLAN except the ingress gets a copy.

**Second ping, table populated.** The ICMP echo leaves Fa0/1 and appears on Fa0/2 only. PC3 sees nothing at all. That is a **forward** — and simultaneously a **filter**, because the switch actively decided *not* to send it to Fa0/3.

The four actions, complete:

| Action | Trigger |
|---|---|
| **Learn** | every frame — source MAC recorded against ingress port |
| **Flood** | destination unknown, broadcast, or unknown multicast — out every port in the VLAN except ingress |
| **Forward** | destination known and on a *different* port |
| **Filter** | destination known and on the *same* port as the source — frame discarded |

That last one is why two PCs on a hub attached to one switch port can talk without the switch ever forwarding their traffic.
{{< /step >}}

{{< step num="4" dev="SW1" title="Force an unknown-unicast flood on purpose" >}}
Clear the table, then ping PC2 from PC1 while PC2's entry is missing but PC1's is present:

```
SW1#clear mac address-table dynamic
```

Immediately from PC1:

```
PC> ping 192.168.1.20
```

Because PC1's ARP cache still holds PC2's MAC, no ARP happens — PC1 sends a **unicast** to an address the switch has just forgotten. The switch floods it. This is **unknown unicast flooding**, and it is a real operational problem: a host that receives traffic constantly but transmits rarely (some storage arrays, some monitoring taps) ages out of the table and then has all of its inbound traffic flooded to every port in the VLAN.

Clear PC1's ARP cache instead and the first behaviour returns:

```
PC> arp -d
PC> arp -a
```
{{< /step >}}

---

## Part 3 — Static entries

{{< step num="5" dev="SW1" title="Pin an address to a port" >}}
```
SW1(config)#mac address-table static 000a.f311.b4c2 vlan 1 interface FastEthernet0/2
SW1(config)#end
```

A static entry never ages out and cannot be overwritten by a dynamic learn. If that MAC now appears on a different port, the switch will not follow it — frames to PC2 keep going to Fa0/2 regardless.

That immovability is the point and the danger. It is a crude defence against a MAC-flooding or MAC-spoofing attack, and it is also a guaranteed outage the day someone moves the server to a different port. Port security (Lab 32) does the same job with an operational escape hatch.

```
SW1#show mac address-table static

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
   1    000a.f311.b4c2    STATIC      Fa0/2
   1    0060.5c2b.9401    STATIC      CPU
```

Remove it with the `no` form:

```
SW1(config)#no mac address-table static 000a.f311.b4c2 vlan 1 interface FastEthernet0/2
```
{{< /step >}}

{{< verify dev="SW1" cmd="show mac address-table" >}}
After clearing dynamics, the static entry is still there and the dynamic ones are gone — which is the whole difference:

```
SW1#clear mac address-table dynamic
SW1#show mac address-table

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
   1    000a.f311.b4c2    STATIC      Fa0/2
   1    0060.5c2b.9401    STATIC      CPU
```
{{< /verify >}}

---

## Part 4 — Collision and broadcast domains

{{< step num="6" dev="—" title="Count them for this topology, then for one with a hub" >}}
Two definitions that get conflated and should not be:

A **collision domain** is a set of interfaces that can collide with each other — a shared-media segment. A **broadcast domain** is the set of interfaces a broadcast frame reaches.

The boundaries:

| Device | Collision domains | Broadcast domains |
|---|---|---|
| **Hub** | one, shared by all ports | one |
| **Switch** | **one per port** | one per VLAN |
| **Router** | one per interface | **one per interface** |

For this lab's topology — one switch, three PCs, no VLANs: **3 collision domains, 1 broadcast domain.**

Replace the switch with a hub: **1 collision domain, 1 broadcast domain**, and every host must run half duplex, because on shared media two stations transmitting at once genuinely collide. That is what CSMA/CD exists for: listen before transmitting, detect a collision, send a jam signal, back off a random interval, retry. Full duplex has separate transmit and receive paths, so collisions are *impossible* and CSMA/CD is disabled entirely.

Now hang a hub with two PCs off Fa0/3: **3 collision domains** (Fa0/1, Fa0/2, and the shared hub segment on Fa0/3), still **1 broadcast domain**.

Add a router between two switches: **2 broadcast domains**, because routers do not forward broadcasts.
{{< /step >}}

{{< verify dev="SW1" cmd="show interfaces FastEthernet0/1 | include duplex|collision" >}}
On a modern switch with everything at full duplex, the collision counter should be permanently zero:

```
SW1#show interfaces FastEthernet0/1 | include Full|collision
  Full-duplex, 100Mb/s, media type is 10/100BaseTX
     0 output errors, 0 collisions, 0 interface resets
     0 babbles, 0 late collision, 0 deferred
```

A non-zero collision count on a full-duplex port is not a collision. It is a duplex mismatch — see Lab 02.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| First ping always drops | ARP resolution + flood is slower than the ICMP timeout | normal — ping twice |
| A host's traffic reaches every port | unknown unicast flooding, host aged out | `show mac address-table address <mac>` |
| MAC table full, everything flooded | MAC flooding attack, or an actual loop | `show mac address-table count`; enable port security |
| Same MAC on two ports, flapping | Layer 2 loop, or a duplicated VM MAC | `show mac address-table address <mac>` repeatedly |
| Moved server unreachable | stale static MAC entry | `show mac address-table static` |
| Table empties every few minutes | aging time too low, or a topology change flushing it | `show mac address-table aging-time`, `show spanning-tree detail` |

## Exam notes

- Switch actions: **learn** from source MAC, **flood** on unknown/broadcast/unknown-multicast, **forward** on known unicast, **filter** when the destination is on the ingress port.
- Default aging time: **300 seconds**.
- Broadcast MAC is `FFFF.FFFF.FFFF`. Switches flood it; routers drop it.
- One collision domain **per switch port**; one broadcast domain **per VLAN** (or per router interface).
- Hubs: one collision domain total, half duplex only, CSMA/CD required.
- Full duplex makes collisions impossible and disables CSMA/CD.
- A frame's Ethernet header is source MAC + destination MAC + EtherType; the switch reads both MACs but acts on them at different times.

---

*Sources: Jeremy's IT Lab Day 3, 5 & 6 · Flackbox CCNA Lab Guide 11 · verified in Packet Tracer 8.2.*
