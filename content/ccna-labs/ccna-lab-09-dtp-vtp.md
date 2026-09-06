---
title: "Lab 09 · DTP and VTP"
date: 2026-09-06
description: "The two protocols that configure your switches for you — one a security hole, the other capable of erasing a VLAN database across an entire campus."
tags: ["CCNA", "DTP", "VTP", "VLAN", "Lab"]
categories: ["CCNA"]
domain: 2
tool: "Packet Tracer"
duration: "40 min"
sources: "Jeremy's IT Lab Day 19"
---

DTP and VTP are both automation, both enabled by default, and both things you will spend your career switching off. They are on the exam because you have to recognise them in a configuration you inherited, and because the failure modes are spectacular.

## Topology

{{< topology cols="3" rows="2" caption="Three switches: VTP server, client and transparent" >}}
switch SW1 "VTP server" at 0,0
switch SW2 "VTP client" at 1,0
switch SW3 "VTP transparent" at 2,0

SW1 — SW2 label="trunk"
SW2 — SW3 label="trunk"
{{< /topology >}}

## Objectives

- Enumerate the DTP modes and predict the outcome of every combination
- Explain the VLAN-hopping attack that `dynamic auto` enables, and shut it down
- Configure a VTP domain with a server and a client, and watch a VLAN propagate
- Understand the revision-number mechanism and the "new switch wipes the campus" incident
- Choose transparent mode and say why it is the sane default

---

## Part 1 — DTP

{{< step num="1" dev="SW1" title="The five switchport modes and what they negotiate" open="true" >}}
```
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#switchport mode ?
  access        Set trunking mode to ACCESS unconditionally
  dynamic       Set trunking mode to dynamically negotiate
  trunk         Set trunking mode to TRUNK unconditionally
```

The outcome matrix — memorise this, it is a guaranteed exam question:

| | access | dynamic auto | dynamic desirable | trunk |
|---|---|---|---|---|
| **access** | access | access | access | ⚠ mismatch |
| **dynamic auto** | access | **access** | trunk | trunk |
| **dynamic desirable** | access | trunk | trunk | trunk |
| **trunk** | ⚠ mismatch | trunk | trunk | trunk |

Two rows deserve attention.

**auto + auto = access.** Neither side asks, so neither side answers. This is the "I configured a trunk on both switches and got an access port" case — except neither side was actually configured, both were left at the platform default.

**trunk + access is a genuine mismatch** and the link will misbehave rather than fail cleanly: one side tags, the other does not.

The platform default varies. Older Catalysts default to `dynamic desirable`; most modern ones to `dynamic auto`. Check rather than assume:

```
SW1#show interfaces GigabitEthernet0/1 switchport | include Administrative Mode|Negotiation
Administrative Mode: dynamic auto
Negotiation of Trunking: On
```
{{< /step >}}

{{< step num="2" dev="SW1" title="Why dynamic auto is a security problem" >}}
An access port left in `dynamic auto` will form a trunk with anything that sends a DTP `desirable` frame — including a laptop running Yersinia or a cheap managed switch someone plugged into a wall port.

Once it is a trunk, the attacker's machine receives **every VLAN allowed on that trunk**. VLAN segmentation is gone: the guest wifi port now sees the server VLAN.

The fix is two commands on every user-facing port:

```
SW1(config)#interface range FastEthernet0/1 - 22
SW1(config-if-range)#switchport mode access
SW1(config-if-range)#switchport access vlan 10
SW1(config-if-range)#switchport nonegotiate
SW1(config-if-range)#spanning-tree portfast
SW1(config-if-range)#spanning-tree bpduguard enable
SW1(config-if-range)#end
```

`switchport mode access` alone stops the port becoming a trunk. `switchport nonegotiate` additionally stops it *sending* DTP frames at all, which removes the information leak. On a hardcoded trunk, `nonegotiate` is also correct — it is only invalid in the dynamic modes.

The second half of the same attack is **double tagging**, which needs no DTP at all: the attacker sends a frame with two 802.1Q tags, the first matching the trunk's native VLAN. The first switch strips the native tag (because native is untagged), forwards the frame over the trunk, and the second switch reads the inner tag and delivers it into the victim VLAN. It is one-directional and it is defeated by never using VLAN 1 as native and never putting hosts in the native VLAN.
{{< /step >}}

{{< verify dev="SW1" cmd="show interfaces switchport" open="true" >}}
```
SW1#show interfaces FastEthernet0/1 switchport
Name: Fa0/1
Switchport: Enabled
Administrative Mode: static access
Operational Mode: static access
Administrative Trunking Encapsulation: dot1q
Negotiation of Trunking: Off
Access Mode VLAN: 10 (ENGINEERING)
Trunking Native Mode VLAN: 1 (default)
Voice VLAN: none
```

**Administrative** is what you configured. **Operational** is what the port actually became. When those two differ, DTP negotiated something you did not intend, and this is the command that shows it.

`Negotiation of Trunking: Off` is `nonegotiate` in effect. On a hardened access port, that line and the two matching `static access` lines are what you want to see.
{{< /verify >}}

---

## Part 2 — VTP

{{< step num="3" dev="SW1" title="Set up a VTP server" >}}
```
SW1(config)#vtp domain LAB
Changing VTP domain name from NULL to LAB
SW1(config)#vtp mode server
Device mode already VTP SERVER.
SW1(config)#vtp password Vtp$ecret
Setting device VTP password to Vtp$ecret
SW1(config)#vtp version 2
SW1(config)#end
```

VTP propagates the **VLAN database** — VLAN IDs and names — over trunk links so you create a VLAN once instead of on thirty switches. It does **not** propagate port assignments, so every access port still has to be configured individually. That limitation is why VTP saves much less work than it appears to.

Three conditions must all hold for an update to be accepted: same **domain name**, same **password** (or none on both), and the link must be a **trunk**. A domain name of NULL means the switch adopts the first domain it hears — which is convenient and is exactly how accidents happen.
{{< /step >}}

{{< step num="4" dev="SW2" title="A client, and the VLAN appearing by itself" >}}
```
SW2(config)#vtp domain LAB
SW2(config)#vtp mode client
Setting device to VTP CLIENT mode.
SW2(config)#vtp password Vtp$ecret
SW2(config)#end
```

Now create a VLAN on the server only:

```
SW1(config)#vlan 30
SW1(config-vlan)#name MARKETING
SW1(config-vlan)#end
```

And within a few seconds, on SW2:

```
SW2#show vlan brief | include MARKETING
30   MARKETING                        active
```

A client cannot create, modify or delete VLANs locally:

```
SW2(config)#vlan 40
VTP VLAN configuration not allowed when device is in CLIENT mode.
```

The three modes:

| Mode | Creates VLANs locally | Forwards VTP ads | Stores VLANs in |
|---|---|---|---|
| **Server** | yes | yes | `vlan.dat` |
| **Client** | **no** | yes | `vlan.dat` (RAM only in v1/v2) |
| **Transparent** | yes | **forwards but ignores** | `running-config` |

Transparent is the useful one: it passes VTP advertisements along to downstream switches without applying them, and it keeps its own VLANs in `running-config` where you can see them in a diff.
{{< /step >}}

{{< verify dev="SW1, SW2" cmd="show vtp status" open="true" >}}
```
SW1#show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 2
VTP Domain Name                 : LAB
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Device ID                       : 0060.5c2b.9400
Configuration last modified by 0.0.0.0 at 9-6-26 14:12:07
Local updater ID is 0.0.0.0

Feature VLAN:
--------------
VTP Operating Mode              : Server
Maximum VLANs supported locally : 255
Number of existing VLANs        : 8
Configuration Revision          : 4
MD5 digest                      : 0x2A 0x4C 0x1E ...
```

**Configuration Revision is the field that matters.** Every change on a server increments it. Any switch receiving an advertisement with a *higher* revision number and a matching domain and password overwrites its own database with it — regardless of mode, regardless of which switch is "supposed" to be authoritative.

That is the mechanism behind the incident everyone in networking has heard about: a switch is taken from a lab, where it accumulated a high revision number, and plugged into production. Its revision beats the production server's. Every switch in the domain adopts the lab's VLAN database. Every VLAN that existed in production and not in the lab is deleted, every port assigned to one goes inactive, and the campus is down.

The defence is a habit, not a command. **Before connecting any switch to a production VTP domain, reset its revision to zero** — set it to transparent mode and back, or clear the domain name:

```
SW2(config)#vtp mode transparent
SW2(config)#vtp mode client
SW2#show vtp status | include Revision
Configuration Revision          : 0
```
{{< /verify >}}

{{< step num="5" dev="SW3" title="Transparent mode — the recommended setting" >}}
```
SW3(config)#vtp mode transparent
Setting device to VTP TRANSPARENT mode.
SW3(config)#vlan 40
SW3(config-vlan)#name LOCAL-ONLY
SW3(config-vlan)#end
```

SW3 keeps its own VLANs, ignores everything the server says, and still relays advertisements to anything downstream. Its VLANs appear in `running-config`:

```
SW3#show running-config | include ^vlan|^ name
vlan 40
 name LOCAL-ONLY
```

Which is the real argument for transparent mode: **the VLAN database becomes visible in the configuration file**, so it is captured by your backups, visible in a diff, and reviewable in change control. In server or client mode, `vlan.dat` is a binary blob that no configuration management system sees.

The modern position, and the one to give in an interview: **run VTP transparent everywhere**, or VTPv3 if you genuinely need propagation across a large campus. VTPv3 fixes the revision problem properly by requiring an explicitly designated primary server before any database change is accepted.
{{< /step >}}

{{< verify dev="SW3" cmd="show vtp status | include Mode|Revision" >}}
```
SW3#show vtp status | include Operating Mode|Revision
VTP Operating Mode              : Transparent
Configuration Revision          : 0
```

A transparent switch always reports revision 0 — it has no database to version. Confirm it is genuinely isolated by creating a VLAN on SW1 and checking it does *not* appear on SW3, while still reaching anything beyond SW3.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Trunk expected, access port appeared | both ends `dynamic auto` | `show interfaces switchport` — compare admin vs operational |
| A user port became a trunk | `dynamic auto` + a DTP-speaking device | `switchport mode access` + `nonegotiate` |
| Every VLAN in the campus disappeared | a switch joined with a higher VTP revision | `show vtp status` — check Revision on all switches |
| VTP updates not propagating | domain, password or trunk mismatch | `show vtp status`, `show interfaces trunk` |
| Cannot create a VLAN | switch is a VTP client | `show vtp status` |
| VLANs missing from config backups | server/client mode keeps them in `vlan.dat` | switch to transparent |

## Exam notes

- DTP outcomes: `auto`+`auto` = **access**. `desirable` with anything except `access` = trunk. `trunk`+`access` = mismatch.
- `switchport nonegotiate` stops DTP frames; it is invalid in the dynamic modes.
- VTP needs matching **domain name**, matching **password**, and a **trunk** link.
- VTP propagates the VLAN database only — **never port assignments**.
- Highest **configuration revision** wins, irrespective of mode. Reset it via transparent before adding a switch.
- Transparent mode: creates VLANs locally, stores them in `running-config`, forwards ads without applying them.
- VTP **pruning** limits broadcast flooding on trunks to VLANs that have active ports downstream; it is off by default and unavailable in transparent mode.

---

*Sources: Jeremy's IT Lab Day 19 · verified in Packet Tracer 8.2.*
