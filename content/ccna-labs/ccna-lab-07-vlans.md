---
title: "Lab 07 · VLANs and Trunking"
date: 2026-09-06
description: "Split one switch into two broadcast domains, carry both over a single trunk, and find out what the native VLAN really does to an untagged frame."
tags: ["CCNA", "VLAN", "Trunking", "802.1Q", "Lab"]
categories: ["CCNA"]
domain: 2
tool: "Packet Tracer"
duration: "45 min"
sources: "Jeremy's IT Lab Day 16, 17 · Flackbox 22-1"
---

A VLAN is a broadcast domain drawn in software instead of copper. Two hosts on the same switch, in different VLANs, are as isolated from each other as two hosts in different buildings — they cannot ARP for each other, and no amount of correct IP configuration will change that until a router is involved.

This lab builds two VLANs across two switches, carries them on one trunk, and then breaks the native VLAN on purpose because the resulting symptom is so specific and so confusing the first time you meet it.

## Topology

{{< topology cols="3" rows="4" caption="Two VLANs spanning two switches over a single 802.1Q trunk" >}}
pc     PC1 "VLAN 10 · 10.0.10.11" at 0,0
pc     PC2 "VLAN 20 · 10.0.20.11" at 0,1
switch SW1 "" at 1,0
switch SW2 "" at 1,3
pc     PC3 "VLAN 10 · 10.0.10.12" at 0,2
pc     PC4 "VLAN 20 · 10.0.20.12" at 0,3

PC1 — SW1
PC2 — SW1
PC3 — SW2
PC4 — SW2
SW1 — SW2 label="trunk Gi0/1"
{{< /topology >}}

| VLAN | Name | Subnet | Ports SW1 | Ports SW2 |
|---|---|---|---|---|
| 10 | ENGINEERING | 10.0.10.0/24 | Fa0/1 | Fa0/1 |
| 20 | SALES | 10.0.20.0/24 | Fa0/2 | Fa0/2 |
| 99 | NATIVE | — | trunk native | trunk native |

## Objectives

- Create and name VLANs, assign access ports, and read `show vlan brief`
- Configure a static 802.1Q trunk and control which VLANs it carries
- Prove that same-VLAN traffic crosses the trunk and cross-VLAN traffic does not
- Move the native VLAN off VLAN 1 and observe a native VLAN mismatch
- Understand where the 802.1Q tag is inserted and which frames never get one

---

## Part 1 — Create the VLANs

{{< step num="1" dev="SW1" title="Define VLAN 10, 20 and 99" open="true" >}}
```
SW1>enable
SW1#configure terminal
SW1(config)#vlan 10
SW1(config-vlan)#name ENGINEERING
SW1(config-vlan)#exit
SW1(config)#vlan 20
SW1(config-vlan)#name SALES
SW1(config-vlan)#exit
SW1(config)#vlan 99
SW1(config-vlan)#name NATIVE
SW1(config-vlan)#end
```

VLAN IDs run 1–4094, split into two ranges that behave differently:

| Range | Name | Stored in | Notes |
|---|---|---|---|
| 1–1005 | normal | `vlan.dat` in flash | 1002–1005 reserved for legacy FDDI/Token Ring |
| 1006–4094 | extended | `running-config` | requires VTP transparent mode or VTPv3 |

**VLANs in the normal range do not live in `startup-config`.** They live in a separate file, `vlan.dat`. This catches people out constantly: `erase startup-config` and reload, and the VLANs are still there. To genuinely reset a switch you need both:

```
SW1#erase startup-config
SW1#delete flash:vlan.dat
SW1#reload
```
{{< /step >}}

{{< step num="2" dev="SW1" title="Assign the access ports" >}}
```
SW1(config)#interface FastEthernet0/1
SW1(config-if)#description ## PC1 — Engineering ##
SW1(config-if)#switchport mode access
SW1(config-if)#switchport access vlan 10
SW1(config-if)#spanning-tree portfast
SW1(config-if)#exit
SW1(config)#interface FastEthernet0/2
SW1(config-if)#description ## PC2 — Sales ##
SW1(config-if)#switchport mode access
SW1(config-if)#switchport access vlan 20
SW1(config-if)#spanning-tree portfast
SW1(config-if)#end
```

Three things worth noticing:

`switchport mode access` is not optional in production even though it appears to work without it. Without it the port is in `dynamic auto` and will negotiate a trunk if the far end asks — which is exactly the VLAN-hopping attack. Hardcoding `access` disables DTP on that port.

`switchport access vlan 10` on a VLAN that does not exist **creates it automatically** on a modern IOS, with the default name `VLAN0010`. Convenient, and a good way to end up with an unnamed VLAN nobody remembers creating.

`spanning-tree portfast` skips listening and learning on an access port so a host gets link in about a second instead of thirty. It is safe on a port that will only ever have a host on it, and dangerous anywhere else — pair it with BPDU Guard (Lab 11).
{{< /step >}}

{{< step num="3" dev="SW2" title="Mirror the configuration on SW2" >}}
```
SW2(config)#vlan 10
SW2(config-vlan)#name ENGINEERING
SW2(config-vlan)#exit
SW2(config)#vlan 20
SW2(config-vlan)#name SALES
SW2(config-vlan)#exit
SW2(config)#vlan 99
SW2(config-vlan)#name NATIVE
SW2(config-vlan)#exit
SW2(config)#interface FastEthernet0/1
SW2(config-if)#switchport mode access
SW2(config-if)#switchport access vlan 10
SW2(config-if)#spanning-tree portfast
SW2(config-if)#exit
SW2(config)#interface FastEthernet0/2
SW2(config-if)#switchport mode access
SW2(config-if)#switchport access vlan 20
SW2(config-if)#spanning-tree portfast
SW2(config-if)#end
```

The VLANs must exist on **both** switches. A trunk carrying VLAN 10 to a switch that has no VLAN 10 will drop the traffic silently.
{{< /step >}}

{{< verify dev="SW1" cmd="show vlan brief" open="true" >}}
```
SW1#show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Fa0/3, Fa0/4, Fa0/5, Fa0/6
                                                Fa0/7, ... Gi0/2
10   ENGINEERING                      active    Fa0/1
20   SALES                            active    Fa0/2
99   NATIVE                           active
1002 fddi-default                     act/unsup
1003 token-ring-default               act/unsup
1004 fddinet-default                  act/unsup
1005 trnet-default                    act/unsup
```

Every unconfigured port sits in VLAN 1. That is why "plug it in and it works" is true out of the box and why VLAN 1 should never carry production traffic.

**Trunk ports do not appear in this output at all.** A trunk is not a member of a VLAN — it carries all of them. If a port you configured as an access port is missing from the list, it has become a trunk.
{{< /verify >}}

---

## Part 2 — The trunk

{{< step num="4" dev="SW1, SW2" title="Configure a static 802.1Q trunk with a non-default native VLAN" >}}
```
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#description ## trunk to SW2 ##
SW1(config-if)#switchport trunk encapsulation dot1q
SW1(config-if)#switchport mode trunk
SW1(config-if)#switchport trunk native vlan 99
SW1(config-if)#switchport trunk allowed vlan 10,20,99
SW1(config-if)#end
```

Identically on SW2:

```
SW2(config)#interface GigabitEthernet0/1
SW2(config-if)#description ## trunk to SW1 ##
SW2(config-if)#switchport trunk encapsulation dot1q
SW2(config-if)#switchport mode trunk
SW2(config-if)#switchport trunk native vlan 99
SW2(config-if)#switchport trunk allowed vlan 10,20,99
SW2(config-if)#end
```

Line by line:

`switchport trunk encapsulation dot1q` is only needed on switches that also support ISL. Most modern platforms are 802.1Q-only and reject the command — if IOS says `% Invalid input`, skip it, the port is already dot1q.

`switchport mode trunk` forces trunk and stops negotiating. `switchport nonegotiate` additionally suppresses DTP frames entirely, which is the hardened form.

`switchport trunk allowed vlan 10,20,99` is a whitelist. Without it a trunk carries **all 4094 VLANs**, which means every broadcast in every VLAN crosses every trunk. Pruning is both a performance and a security control. Note the syntax traps:

```
SW1(config-if)#switchport trunk allowed vlan 30          ! REPLACES the list with just 30
SW1(config-if)#switchport trunk allowed vlan add 30      ! appends 30
SW1(config-if)#switchport trunk allowed vlan remove 20   ! removes 20
```

Typing the first form on a production trunk removes every other VLAN instantly. It is a classic outage.

`switchport trunk native vlan 99` sets which VLAN travels **untagged**. More on that next.
{{< /step >}}

{{< step num="5" dev="—" title="What 802.1Q actually does to a frame" >}}
An 802.1Q trunk inserts a **4-byte tag** into the Ethernet header, between the source MAC and the EtherType:

```
Untagged:  [ Dst MAC ][ Src MAC ][ EtherType ][ payload ][ FCS ]
Tagged:    [ Dst MAC ][ Src MAC ][ TPID 0x8100 | PCP | DEI | VID ][ EtherType ][ payload ][ FCS ]
                                  └──────────── 4 bytes ─────────┘
```

- **TPID** `0x8100` — marks the frame as tagged
- **PCP** 3 bits — Class of Service, 0–7, the Layer 2 QoS marking (Lab 31)
- **DEI** 1 bit — drop eligible
- **VID** 12 bits — the VLAN ID, hence the 4094 limit

Because 4 bytes are inserted, a tagged frame can reach **1522 bytes** rather than 1518. Switches that do not expect that count them as **giants**. The FCS is recalculated after insertion.

**The native VLAN is the exception: its frames cross the trunk with no tag at all.** That is a backward-compatibility feature from the era of hubs and unmanaged switches on trunk links, and it is the source of both the mismatch symptom below and the VLAN-hopping attack. Best practice is an unused, empty VLAN as native — VLAN 99 here — and never VLAN 1.
{{< /step >}}

{{< verify dev="SW1" cmd="show interfaces trunk" open="true" >}}
The single most useful trunk command. Four sections, each answering a different question.

```
SW1#show interfaces trunk

Port        Mode         Encapsulation  Status        Native vlan
Gi0/1       on           802.1q         trunking      99

Port        Vlans allowed on trunk
Gi0/1       10,20,99

Port        Vlans allowed and active in management domain
Gi0/1       10,20,99

Port        Vlans in spanning tree forwarding state and not pruned
Gi0/1       10,20,99
```

Read them in order:

1. **allowed on trunk** — what you configured
2. **allowed and active** — of those, which actually exist on this switch. A VLAN listed above but missing here was never created locally.
3. **forwarding and not pruned** — of those, which spanning tree is letting through. A VLAN that drops out here is blocked by STP, and that is a spanning tree problem, not a VLAN problem.

Three separate reasons a VLAN can fail to cross a trunk, and this one command distinguishes them.
{{< /verify >}}

---

## Part 3 — Prove the isolation

{{< verify dev="PC1" cmd="ping — same VLAN across the trunk, then across VLANs" open="true" >}}
PC1 (VLAN 10, SW1) to PC3 (VLAN 10, SW2) — same VLAN, different switch:

```
PC> ping 10.0.10.12
Reply from 10.0.10.12: bytes=32 time=2ms TTL=128
```

Works. The frame was tagged VID 10 by SW1, carried over the trunk, untagged by SW2, delivered.

PC1 (VLAN 10) to PC2 (VLAN 20) — same switch, different VLAN:

```
PC> ping 10.0.20.11
Request timed out.
Request timed out.
```

Fails, and it fails at Layer 2 before IP is even considered. PC1 ANDs and finds 10.0.20.11 remote, so it ARPs for its default gateway — which does not exist yet. There is no router in this topology. Two VLANs without a router are two separate networks.

Confirm the diagnosis rather than assuming it:

```
PC> arp -a
No ARP Entries Found.
```

Empty cache, because the ARP request went out and nothing answered. Lab 08 adds the router.
{{< /verify >}}

{{< verify dev="SW1" cmd="show mac address-table vlan 10" >}}
The MAC table is per-VLAN, and that is the mechanism behind the isolation:

```
SW1#show mac address-table vlan 10

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
  10    0001.6431.a201    DYNAMIC     Fa0/1
  10    000c.8511.7d41    DYNAMIC     Gi0/1

SW1#show mac address-table vlan 20

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
  20    000a.f311.b4c2    DYNAMIC     Fa0/2
  20    00d0.9744.2c19    DYNAMIC     Gi0/1
```

PC3's MAC appears in VLAN 10 on Gi0/1 (the trunk). PC4's appears in VLAN 20, also on Gi0/1. Same physical port, two VLANs, two independent tables — a lookup in VLAN 10 can never return a VLAN 20 port.
{{< /verify >}}

---

## Part 4 — Break the native VLAN

{{< step num="6" dev="SW2" title="Set a different native VLAN on one end" >}}
```
SW2(config)#interface GigabitEthernet0/1
SW2(config-if)#switchport trunk native vlan 1
SW2(config-if)#end
```

SW1 now says native 99, SW2 says native 1. Within about a minute, CDP notices:

```
%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on
  GigabitEthernet0/1 (99), with SW2 GigabitEthernet0/1 (1).
```

The syslog message is the good case. The bad case is what happens to traffic while nobody is reading the console.

**VLAN 99 and VLAN 1 are now merged.** An untagged frame leaving SW1 was in VLAN 99; SW2 receives it untagged and places it in VLAN 1. Traffic leaks between two VLANs that are supposed to be separate, in both directions, with no routing and no ACL able to see it. This is the mechanism behind the double-tagging VLAN hopping attack.

Meanwhile VLAN 10 and VLAN 20 keep working perfectly, because tagged frames carry their VID explicitly. **The symptom is that exactly one VLAN misbehaves and the rest are fine** — which is why the fault is so hard to spot if you are not looking at the native VLAN.

Fix it:

```
SW2(config)#interface GigabitEthernet0/1
SW2(config-if)#switchport trunk native vlan 99
```
{{< /step >}}

{{< verify dev="SW1, SW2" cmd="show interfaces trunk | include Native" >}}
```
SW1#show interfaces trunk | include Native|Gi0/1
Port        Mode         Encapsulation  Status        Native vlan
Gi0/1       on           802.1q         trunking      99

SW2#show interfaces trunk | include Native|Gi0/1
Port        Mode         Encapsulation  Status        Native vlan
Gi0/1       on           802.1q         trunking      99
```

Both 99. Also confirm CDP agrees about the neighbour:

```
SW1#show cdp neighbors detail | include Native
Native VLAN: 99
```
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| One VLAN leaks into another, others fine | native VLAN mismatch | `show interfaces trunk` on both ends |
| VLAN traffic does not cross the trunk | VLAN not in `allowed`, or not created locally | `show interfaces trunk` — compare rows 1, 2, 3 |
| Access port vanished from `show vlan brief` | it negotiated into a trunk | `show interfaces switchport` |
| VLANs survive `erase startup-config` | they live in `vlan.dat` | `delete flash:vlan.dat` |
| Giants counter on a trunk | 1522-byte tagged frames, far end not expecting them | `show interfaces` |
| Trunk shows `trunking` one side, `access` the other | DTP mismatch — one side hardcoded | hardcode both ends |
| Whole trunk drops all but one VLAN | someone typed `allowed vlan X` without `add` | reconfigure the full list |

## Exam notes

- 802.1Q inserts a **4-byte** tag; the max frame becomes **1522** bytes. ISL encapsulates and is Cisco-proprietary and obsolete.
- The **native VLAN is untagged** on the trunk. It must match on both ends. Default is VLAN 1; move it to an unused VLAN.
- VLAN ranges: **1–1005 normal** (in `vlan.dat`), **1006–4094 extended** (in `running-config`). 1002–1005 reserved.
- `switchport trunk allowed vlan X` **replaces** the list. Use `add` / `remove` to modify it.
- A trunk port is not a member of any VLAN and does not appear in `show vlan brief`.
- MAC address tables are per-VLAN — that is how the isolation is enforced.
- `switchport mode access` disables DTP on the port and is the correct hardening for host ports.

---

*Sources: Jeremy's IT Lab Day 16 & 17 · Flackbox CCNA Lab Guide 22-1 · verified in Packet Tracer 8.2.*
