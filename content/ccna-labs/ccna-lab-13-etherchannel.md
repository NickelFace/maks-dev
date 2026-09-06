---
title: "Lab 13 · EtherChannel"
date: 2026-09-06
description: "Bundle four links into one logical port so spanning tree stops blocking three of them — with LACP, PAgP and static, and the parameter mismatches that break all three."
tags: ["CCNA", "EtherChannel", "LACP", "PAgP", "Lab"]
categories: ["CCNA"]
domain: 2
tool: "Packet Tracer"
duration: "40 min"
sources: "Jeremy's IT Lab Day 23 · Flackbox 26-1"
aliases: ["/ccna-labs/ccna-lab-26-etherchannel/"]
---

Run four cables between two switches and spanning tree will block three of them. That is correct behaviour — four parallel paths is four loops — and it is also a waste of three quarters of the copper you paid for.

EtherChannel fixes it by lying to spanning tree. The switches bundle the physical ports into one logical interface, STP sees a single link, nothing blocks, and all four links carry traffic. If one fails the bundle survives with less bandwidth and no reconvergence at all.

## Topology

{{< topology cols="2" rows="2" caption="Four physical links, one logical Port-channel" >}}
switch SW1 "Po1" at 0,0
switch SW2 "Po1" at 1,0

SW1 — SW2 label="Gi0/1-4 → Po1"
{{< /topology >}}

| Bundle | Member ports | Protocol | Mode SW1 | Mode SW2 |
|---|---|---|---|---|
| Po1 | Gi0/1 – Gi0/4 | LACP | active | passive |

## Objectives

- Bundle four ports into a Port-channel with LACP and verify STP sees one link
- Enumerate the LACP, PAgP and static modes and predict which combinations form a channel
- Configure the bundle as a trunk and understand that the config lives on the logical interface
- Break a channel with a parameter mismatch and read the `Probable reason` IOS gives you
- Change the load-balancing hash and explain why a single flow never uses more than one link

---

## Part 1 — The modes

{{< step num="1" dev="—" title="Three protocols, and which combinations actually form a channel" open="true" >}}
**LACP** (802.3ad) is the open standard and the only correct choice for anything new.

| SW1 | SW2 | Result |
|---|---|---|
| active | active | **channel** |
| active | passive | **channel** |
| passive | passive | no channel — neither initiates |
| active / passive | on | no channel — `on` does not speak LACP |

**PAgP** is Cisco-proprietary, and the mode names differ:

| SW1 | SW2 | Result |
|---|---|---|
| desirable | desirable | **channel** |
| desirable | auto | **channel** |
| auto | auto | no channel |

**Static (`on`)** forms the bundle unconditionally, with no negotiation at all. Both ends must be `on`; `on` with anything else fails.

The pattern to remember: `active`/`desirable` **initiate**, `passive`/`auto` only **respond**. Two responders never start a conversation — exactly like DTP's `auto`+`auto`.

Static mode deserves a warning. With no protocol, nothing verifies the far end agrees, so a miscabled port is bundled anyway and forwards into a loop that spanning tree cannot see, because STP believes the bundle is one link. **Use LACP.** The one place `on` is legitimate is connecting to a device that supports neither protocol.
{{< /step >}}

{{< step num="2" dev="SW1" title="Build the channel with LACP active" >}}
```
SW1(config)#interface range GigabitEthernet0/1 - 4
SW1(config-if-range)#shutdown
SW1(config-if-range)#switchport trunk encapsulation dot1q
SW1(config-if-range)#switchport mode trunk
SW1(config-if-range)#switchport trunk native vlan 99
SW1(config-if-range)#switchport trunk allowed vlan 10,20,99
SW1(config-if-range)#channel-group 1 mode active
Creating a port-channel interface Port-channel 1
SW1(config-if-range)#no shutdown
SW1(config-if-range)#end
```

The `shutdown` first is not superstition. Configuring member ports while they are live means the switches see four independent trunks for a moment before the bundle forms, and spanning tree reacts. Shutting them, configuring, then bringing them up together avoids the churn.

**Every member port must have identical configuration** before it will join. IOS compares speed, duplex, switchport mode, native VLAN, allowed VLAN list, and access VLAN. One mismatched port does not break the channel — it is simply refused entry, and the bundle comes up with three links instead of four while you wonder why the throughput is wrong.

`channel-group 1 mode active` creates `Port-channel1` automatically. The group number is locally significant: SW1 can use group 1 and SW2 group 5.
{{< /step >}}

{{< step num="3" dev="SW2" title="The passive end" >}}
```
SW2(config)#interface range GigabitEthernet0/1 - 4
SW2(config-if-range)#shutdown
SW2(config-if-range)#switchport trunk encapsulation dot1q
SW2(config-if-range)#switchport mode trunk
SW2(config-if-range)#switchport trunk native vlan 99
SW2(config-if-range)#switchport trunk allowed vlan 10,20,99
SW2(config-if-range)#channel-group 1 mode passive
SW2(config-if-range)#no shutdown
SW2(config-if-range)#end
```

Active + passive forms a channel. Once it is up, configure the *logical* interface, not the members:

```
SW1(config)#interface Port-channel1
SW1(config-if)#description ## uplink to SW2 — 4x1G LACP ##
SW1(config-if)#switchport trunk allowed vlan 10,20,30,99
SW1(config-if)#end
```

Changes applied to `Port-channel1` propagate to every member automatically. Changes applied to a single member cause a mismatch and eject it from the bundle. That is the rule: **after the channel exists, configure only the Port-channel.**
{{< /step >}}

---

## Part 2 — Verify

{{< verify dev="SW1" cmd="show etherchannel summary" open="true" >}}
The command to run first, every time:

```
SW1#show etherchannel summary
Flags:  D - down        P - bundled in port-channel
        I - stand-alone s - suspended
        H - Hot-standby (LACP only)
        R - Layer3      S - Layer2
        U - in use      f - failed to allocate aggregator
        M - not in use, minimum links not met
        u - unsuitable for bundling
        w - waiting to be aggregated
        d - default port

Number of channel-groups in use: 1
Number of aggregators:           1

Group  Port-channel  Protocol    Ports
------+-------------+-----------+-----------------------------------------------
1      Po1(SU)         LACP      Gi0/1(P) Gi0/2(P) Gi0/3(P) Gi0/4(P)
```

Everything you need is in those flags:

- **`Po1(SU)`** — **S**witched (Layer 2) and **U**p. `(SD)` means down.
- **`Gi0/1(P)`** — **P**ort is bundled. This is the flag you want on every member.
- **`(I)`** — stand-alone: the port did not join and is acting as an independent link. Almost always a configuration mismatch.
- **`(s)`** — suspended: the far end is not negotiating, or the LACP system IDs conflict.
- **`(D)`** — the physical port is down.

Four `(P)` flags and `(SU)` on the bundle is a healthy channel. Anything else, start comparing member configurations.
{{< /verify >}}

{{< verify dev="SW1" cmd="show etherchannel port-channel" >}}
The negotiation detail, including which end initiated:

```
SW1#show etherchannel 1 port-channel
                Port-channels in the group:
                ---------------------------
Port-channel: Po1    (Primary Aggregator)
------------
Age of the Port-channel   = 00:12:04
Logical slot/port         = 2/1          Number of ports = 4
GC                        = 0x00000000   HotStandBy port = null
Protocol                  =   LACP
Port security             = Disabled

Ports in the Port-channel:
Index   Load   Port     EC state        No of bits
------+------+--------+---------------+-----------
  0     00     Gi0/1    Active             0
  1     00     Gi0/2    Active             0
  2     00     Gi0/3    Active             0
  3     00     Gi0/4    Active             0
```

`EC state Active` on all four confirms LACP negotiated rather than falling back. `Protocol = LACP` — if this said `-` the channel is static, which is worth catching in an audit.
{{< /verify >}}

{{< verify dev="SW1" cmd="show spanning-tree vlan 10" open="true" >}}
The payoff. Spanning tree now sees one interface, not four:

```
SW1#show spanning-tree vlan 10 | begin Interface
Interface        Role Sts Cost      Prio.Nbr Type
---------------- ---- --- --------- -------- ----
Po1              Root FWD 3         128.65   P2p
```

One line. No blocked ports. And **cost 3, not 4** — EtherChannel reduces the STP cost to reflect the aggregate bandwidth, so a 4×1G bundle is treated as a fatter pipe than a single gigabit link:

| Aggregate | STP cost |
|---|---|
| 1 Gbps | 4 |
| 2 Gbps | 3 |
| 4 Gbps | 3 |
| 8 Gbps | 2 |

Compare with the four unbundled trunks from before: three would have been `Altn BLK`.

The other benefit is invisible here but larger: **a member link failing does not trigger spanning tree convergence at all.** The bundle stays up with less bandwidth, sub-second, no topology change, no MAC flush.
{{< /verify >}}

{{< verify dev="SW1" cmd="show interfaces Port-channel1" >}}
```
SW1#show interfaces Port-channel1
Port-channel1 is up, line protocol is up (connected)
  Hardware is EtherChannel, address is 0060.5c2b.9401
  MTU 1500 bytes, BW 4000000 Kbit, DLY 10 usec,
  Members in this channel: Gi0/1 Gi0/2 Gi0/3 Gi0/4
```

`BW 4000000 Kbit` — 4 Gbps, the sum of the members. That figure feeds STP cost, EIGRP metrics and QoS calculations, so it matters beyond the display.
{{< /verify >}}

---

## Part 3 — Break it

{{< step num="4" dev="SW1" title="Mismatch one member and read the diagnosis" >}}
```
SW1(config)#interface GigabitEthernet0/4
SW1(config-if)#switchport trunk allowed vlan 10,20
SW1(config-if)#end
```

Gi0/4's allowed VLAN list no longer matches the other three. Within seconds:

```
%EC-5-CANNOT_BUNDLE2: Gi0/4 is not compatible with Po1 and will be suspended
  (trunk vlans allowed list of Gi0/4 not equal to Po1)
```

IOS names the exact incompatibility in the log. `show etherchannel summary` shows the consequence:

```
1      Po1(SU)         LACP      Gi0/1(P) Gi0/2(P) Gi0/3(P) Gi0/4(s)
```

`(s)` — suspended. Three links carrying traffic, one idle, and no outage to alert anyone. This is why the throughput on a bundle is worth monitoring rather than assuming.

The full list of parameters that must match across members:

- speed and duplex
- switchport mode (access or trunk)
- native VLAN
- allowed VLAN list
- access VLAN (for a Layer 2 access channel)
- MTU
- spanning-tree cost and port priority

Fix it by removing the per-member override:

```
SW1(config)#interface GigabitEthernet0/4
SW1(config-if)#no switchport trunk allowed vlan
SW1(config-if)#end
```

And re-apply from the Port-channel if the list needs changing:

```
SW1(config)#interface Port-channel1
SW1(config-if)#switchport trunk allowed vlan 10,20,30,99
```
{{< /step >}}

{{< verify dev="SW1" cmd="show interfaces GigabitEthernet0/4 etherchannel" >}}
Per-port LACP state, including the far end's view:

```
SW1#show interfaces GigabitEthernet0/4 etherchannel
Port state    = Up Mstr Assoc In-Bndl
Channel group = 1           Mode = Active          Gcchange = -
Port-channel  = Po1         GC   =   -             Pseudo port-channel = Po1
Port index    = 3           Load = 0x00            Protocol =   LACP

Flags:  S - Device is sending Slow LACPDUs   F - Device is sending fast LACPDUs.
        A - Device is in active mode.        P - Device is in passive mode.

Local information:
                      LACP port   Admin    Oper    Port     Port
Port      Flags   State  Priority   Key      Key     Number   State
Gi0/4     SA      bndl   32768      0x1      0x1     0x104    0x3D

Partner's information:
                  LACP port                        Admin  Oper   Port    Port
Port      Flags   Priority  Dev ID          Age    key    Key    Number  State
Gi0/4     SP      32768     0002.0002.0b00  12s    0x0    0x1    0x104   0x3C
```

`In-Bndl` and `State bndl` mean bundled. Flags `SA` locally (Slow LACPDUs, Active) and `SP` on the partner (Slow, Passive) — exactly the active/passive pair configured. If the partner section is empty, LACP frames are not arriving at all: check the cabling and whether the far end has `channel-group` configured.
{{< /verify >}}

---

## Part 4 — Load balancing

{{< step num="5" dev="SW1" title="Why one big transfer only uses one link" >}}
```
SW1#show etherchannel load-balance
EtherChannel Load-Balancing Configuration:
        src-mac

EtherChannel Load-Balancing Addresses Used Per-Protocol:
Non-IP: Source MAC address
  IPv4: Source MAC address
  IPv6: Source MAC address
```

EtherChannel hashes selected header fields and uses the result to pick a member link. **A given flow always hashes to the same link**, which is essential — otherwise packets in one TCP stream would arrive out of order across links of slightly different latency.

The consequence: **a single flow can never exceed the bandwidth of one member.** A 4×1G bundle does not give one file transfer 4 Gbps. It gives four *different* transfers a gigabit each, if the hash distributes them well.

Change the input to the hash:

```
SW1(config)#port-channel load-balance src-dst-ip
```

| Method | Good for | Poor for |
|---|---|---|
| `src-mac` | many clients on the local segment | traffic all from one router |
| `dst-mac` | many destinations locally | traffic to one server |
| `src-dst-mac` | general Layer 2 | traffic between two routers |
| `src-ip` | many client subnets | one source |
| `dst-ip` | many destination subnets | one destination |
| `src-dst-ip` | **the general default worth using** | few IP pairs |

The classic failure: a bundle between two routers, load-balanced on MAC. Every frame has the same source and destination MAC, so every frame hashes identically and one link carries everything while three sit idle. The symptom is a bundle at 25% utilisation that reports congestion. Switching to `src-dst-ip` fixes it.

Load balancing is configured **globally per switch**, not per channel, and the two ends do not have to agree — each switch independently decides how to spread its own outbound traffic.
{{< /step >}}

{{< verify dev="SW1" cmd="show etherchannel load-balance and per-member counters" >}}
```
SW1#show interfaces Port-channel1 counters | include Gi0
```

Generate traffic from several hosts and compare the per-member byte counts. Reasonably even means the hash is working; everything on one member means the hash inputs are not varying, and the method needs changing.

Finally, confirm the bundle survives losing a member:

```
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#shutdown
```

```
SW1#show etherchannel summary | include Po1
1      Po1(SU)         LACP      Gi0/1(D) Gi0/2(P) Gi0/3(P) Gi0/4(P)
```

Still `(SU)`. Still one interface to spanning tree. No convergence event, no topology change, no dropped ping — just less bandwidth. That is the resilience argument for EtherChannel, and it is stronger than the bandwidth one.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Channel never forms | `passive`+`passive` or `auto`+`auto` | `show etherchannel summary` |
| One member `(s)` suspended | parameter mismatch | the `%EC-5-CANNOT_BUNDLE2` log names it |
| One member `(I)` stand-alone | far end has no `channel-group` | `show interfaces <int> etherchannel` |
| Bundle up but only one link used | hash inputs do not vary | `port-channel load-balance src-dst-ip` |
| Loop despite EtherChannel | static `on` mode over miscabled ports | use LACP |
| Config change ejected a member | configured on the member, not the Port-channel | configure `interface Port-channel1` |
| STP blocks the bundle | one end is not channelled — STP sees four links | `show etherchannel summary` on both |

## Exam notes

- **LACP** = 802.3ad, modes `active` / `passive`. **PAgP** = Cisco, modes `desirable` / `auto`. **Static** = `on`.
- `active`+`active`, `active`+`passive`, `desirable`+`desirable`, `desirable`+`auto` form channels. `passive`+`passive` and `auto`+`auto` do not. `on` works only with `on`.
- Members must match on **speed, duplex, switchport mode, native VLAN, allowed VLANs, access VLAN**.
- Configure the **Port-channel** interface; changes propagate to members.
- Up to **8 active** links per bundle (LACP allows 8 more in hot-standby).
- Load balancing is a **hash**, configured globally, and a single flow uses exactly one member.
- The channel group number is **locally significant**.
- STP sees the bundle as one link with a reduced cost — a member failure causes no reconvergence.

---

*Sources: Jeremy's IT Lab Day 23 · Flackbox CCNA Lab Guide 26-1 · verified in Packet Tracer 8.2.*
