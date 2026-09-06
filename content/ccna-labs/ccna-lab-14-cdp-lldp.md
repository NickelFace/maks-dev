---
title: "Lab 14 · CDP and LLDP"
date: 2026-09-06
description: "Discover the topology from the CLI when nobody kept the diagram up to date — and understand why the same protocol is both indispensable and a security finding."
tags: ["CCNA", "CDP", "LLDP", "Discovery", "Lab"]
categories: ["CCNA"]
domain: 2
tool: "Packet Tracer"
duration: "30 min"
sources: "Jeremy's IT Lab Day 36 · Flackbox 14"
---

Every network you inherit has a diagram, and the diagram is wrong. CDP and LLDP let you rebuild the real one from the devices themselves: what is plugged into which port, what platform it is, what software it runs, and which VLAN it thinks it is in.

The same information is exactly what an attacker wants, which is why the second half of this lab is about turning it off in the right places.

## Topology

{{< topology cols="3" rows="2" caption="Two switches, a router and a non-Cisco device — CDP sees three of them, LLDP sees all four" >}}
router R1 "" at 1,0
switch SW1 "" at 0,1
switch SW2 "" at 1,1
server SRV "third-party" at 2,1

R1 — SW1
R1 — SW2
SW2 — SRV
{{< /topology >}}

## Objectives

- Map an unknown topology using `show cdp neighbors` alone
- Read every field of `show cdp neighbors detail` and say what it is useful for
- Enable LLDP and explain when it is required rather than optional
- Compare the two protocols on standardisation, timers and TLVs
- Disable discovery on untrusted ports and justify the decision

---

## Part 1 — CDP

{{< step num="1" dev="R1" title="CDP is on by default — confirm rather than assume" open="true" >}}
```
R1#show cdp
Global CDP information:
        Sending CDP packets every 60 seconds
        Sending a holdtime value of 180 seconds
        Sending CDPv2 advertisements is enabled
```

Cisco Discovery Protocol is **Layer 2**, Cisco-proprietary, and enabled by default on every Cisco device. Being Layer 2 means it works with no IP addressing whatsoever — which is precisely when you need it most, on a device you have consoled into that has no working network configuration.

Advertisements go to multicast `0100.0CCC.CCCC` every **60 seconds**, with a **180-second holdtime**. A neighbour that stops advertising disappears from the table three minutes later, so a table entry can be up to three minutes stale.

Turn it on or off globally, or per interface:

```
R1(config)#cdp run                        ! global on (default)
R1(config)#no cdp run                     ! global off
R1(config)#interface GigabitEthernet0/2
R1(config-if)#no cdp enable               ! this interface only
```

`no cdp run` and `no cdp enable` are frequently confused. **`run` is global, `enable` is per-interface.** The same pairing exists for LLDP with different verbs, which does not help.
{{< /step >}}

{{< verify dev="R1" cmd="show cdp neighbors" open="true" >}}
```
R1#show cdp neighbors
Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge
                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone

Device ID    Local Intrfce     Holdtme    Capability   Platform    Port ID
SW1          Gig 0/0            141          S I       WS-C2960    Fas 0/24
SW2          Gig 0/1            167          S I       WS-C2960    Fas 0/24
```

Five columns, and together they are enough to draw the diagram:

- **Device ID** — the neighbour's hostname
- **Local Intrfce** — **my** port
- **Holdtme** — seconds until this entry expires; counting down from 180 means it is live
- **Capability** — R router, S switch, H host, P phone
- **Port ID** — **their** port

Local Intrfce and Port ID together give you both ends of the cable. Run this on every device and you have the physical topology, verified against reality rather than against a Visio file.

A neighbour that should be there and is not means: the link is down, CDP is disabled on one end, or there is a non-Cisco device in between that does not forward CDP frames.
{{< /verify >}}

{{< verify dev="R1" cmd="show cdp neighbors detail" >}}
Everything CDP knows about one neighbour:

```
R1#show cdp neighbors detail
-------------------------
Device ID: SW1
Entry address(es):
  IP address : 10.0.1.2
Platform: cisco WS-C2960-24TT-L,  Capabilities: Switch IGMP
Interface: GigabitEthernet0/0,  Port ID (outgoing port): FastEthernet0/24
Holdtime : 141 sec

Version :
Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.0(2)SE4,
RELEASE SOFTWARE (fc1)

advertisement version: 2
Duplex: full
Native VLAN: 99
Management address(es):
  IP address : 10.0.1.2
```

The extra fields are what make CDP an operational tool rather than a curiosity:

- **IP address** — you can now SSH to a device you had never heard of thirty seconds ago
- **Version** — the full IOS string, for a vulnerability check across the estate
- **Duplex** — mismatch detection; CDP is what generates `%CDP-4-DUPLEX_MISMATCH`
- **Native VLAN** — mismatch detection; source of `%CDP-4-NATIVE_VLAN_MISMATCH`

And it is also a complete inventory hand-out to anyone who plugs into a port: platform, software version, management IP, VLAN layout. That is the security argument, and it is why CDP on a port facing users or a partner network is a legitimate audit finding.
{{< /verify >}}

{{< step num="2" dev="R1" title="Two more CDP commands worth knowing" >}}
```
R1#show cdp interface GigabitEthernet0/0
GigabitEthernet0/0 is up, line protocol is up
  Encapsulation ARPA
  Sending CDP packets every 60 seconds
  Holdtime is 180 seconds
```

Confirms CDP is actually enabled on a specific port — useful when a neighbour is missing and you are not sure which side disabled it.

```
R1#show cdp traffic
CDP counters :
        Total packets output: 245, Input: 238
        Hdr syntax: 0, Chksum error: 0, Encapsulation failed: 0
        No memory: 0, Invalid packet: 0
```

`Input: 0` with a healthy `output` count means you are advertising and hearing nothing — the far end has CDP off, or the link is not what you think it is.

Tune the timers if the default three-minute staleness is too slow for your troubleshooting:

```
R1(config)#cdp timer 30
R1(config)#cdp holdtime 90
```
{{< /step >}}

---

## Part 2 — LLDP

{{< step num="3" dev="R1, SW1, SW2" title="Enable the standard, because CDP will not see everything" >}}
```
R1(config)#lldp run
R1(config)#interface GigabitEthernet0/0
R1(config-if)#lldp transmit
R1(config-if)#lldp receive
R1(config-if)#end
```

LLDP (802.1AB) is the vendor-neutral equivalent and is **disabled by default** on Cisco gear. In any network with more than one vendor — and that includes servers, IP phones, wireless APs and printers — LLDP is the only protocol that sees everything.

Note the asymmetry in the command names. Global is `lldp run` (matching `cdp run`), but per-interface splits into two independent directions:

```
R1(config-if)#no lldp transmit    ! stop advertising, keep listening
```

That is genuinely useful and CDP cannot do it. On a port facing an untrusted network, `no lldp transmit` with `lldp receive` left on gives you visibility without giving any away.

The comparison:

| | CDP | LLDP |
|---|---|---|
| Standard | Cisco proprietary | **IEEE 802.1AB** |
| Default on Cisco | **enabled** | disabled |
| Layer | 2 | 2 |
| Advertise interval | 60 s | **30 s** |
| Holdtime | 180 s | **120 s** |
| Reinit delay | — | 2 s |
| Global enable | `cdp run` | `lldp run` |
| Per-interface | `cdp enable` | `lldp transmit` / `lldp receive` |
| Directional control | no | **yes** |
| Multicast | 0100.0CCC.CCCC | 0180.C200.000E |
| Extension for phones | CDP carries voice VLAN | **LLDP-MED** |

**LLDP-MED** is the extension that matters in practice: it is how an IP phone learns its voice VLAN and negotiates PoE budget. A non-Cisco phone on a Cisco switch needs LLDP-MED, because it cannot read CDP.

Running both is normal and correct. They do not interfere.
{{< /step >}}

{{< verify dev="R1" cmd="show lldp neighbors" open="true" >}}
```
R1#show lldp neighbors
Capability codes:
    (R) Router, (B) Bridge, (T) Telephone, (C) DOCSIS Cable Device
    (W) WLAN Access Point, (P) Repeater, (S) Station, (O) Other

Device ID           Local Intf     Hold-time  Capability      Port ID
SW1                 Gi0/0          120        B               Fa0/24
SW2                 Gi0/1          120        B               Fa0/24

Total entries displayed: 2
```

Same shape as CDP. The capability letters differ — `B` for Bridge where CDP says `S` for Switch — because they come from different standards.

The detail view carries a superset of CDP's fields:

```
R1#show lldp neighbors detail
------------------------------------------------
Local Intf: Gi0/0
Chassis id: 0060.5c2b.9400
Port id: Fa0/24
Port Description: FastEthernet0/24
System Name: SW1

System Description:
Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.0(2)SE4

Time remaining: 97 seconds
System Capabilities: B
Enabled Capabilities: B
Management Addresses:
    IP: 10.0.1.2
Auto Negotiation - supported, enabled
Physical media capabilities:
    100base-TX(FD)
    1000base-T(FD)
Media Attachment Unit type: 30
Vlan ID: 99
```

`Port Description` and the physical media list are LLDP-only. The `Vlan ID` here is the native VLAN, and it does the same mismatch-detection job as CDP's.
{{< /verify >}}

---

## Part 3 — Turning it off

{{< step num="4" dev="SW2" title="Where discovery should not run" >}}
Three categories of port, three answers.

**User access ports** — no reason for a PC to receive an inventory of your network:

```
SW2(config)#interface range FastEthernet0/1 - 20
SW2(config-if-range)#no cdp enable
SW2(config-if-range)#no lldp transmit
SW2(config-if-range)#end
```

Note `lldp receive` is deliberately left on. You still learn what is out there; you just stop announcing yourself.

The exception is a port with an IP phone on it. Phones depend on CDP or LLDP-MED to learn the voice VLAN, so those ports keep discovery and rely on port security and 802.1X instead.

**Links to another organisation** — turn both off completely:

```
SW2(config)#interface GigabitEthernet0/2
SW2(config-if)#no cdp enable
SW2(config-if)#no lldp transmit
SW2(config-if)#no lldp receive
SW2(config-if)#end
```

**Infrastructure links between your own devices** — leave both on. This is where discovery earns its keep and the risk is negligible.

The blunt instrument, for a device in a hostile position:

```
SW2(config)#no cdp run
SW2(config)#no lldp run
```

That removes your own troubleshooting tool along with the exposure, so prefer the per-interface approach.
{{< /step >}}

{{< verify dev="SW2" cmd="show cdp interface | include is up|CDP" >}}
Audit which ports still advertise:

```
SW2#show cdp interface | include GigabitEthernet|FastEthernet0/2[1-4]
GigabitEthernet0/1 is up, line protocol is up
FastEthernet0/21 is up, line protocol is up
```

Only the interfaces listed here have CDP enabled — user ports Fa0/1–20 are absent, which is the intended result.

And from the far side, confirm the neighbour genuinely vanished:

```
R1#show cdp neighbors | include SW2
```

No output. Wait out the 180-second holdtime if the entry is still cached, or clear it:

```
R1#clear cdp table
```
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Neighbour missing from CDP | disabled one end, link down, or non-Cisco in path | `show cdp interface` both ends |
| Nothing in LLDP at all | LLDP is off by default on Cisco | `lldp run` |
| Non-Cisco device invisible | it does not speak CDP | enable LLDP |
| IP phone gets no voice VLAN | CDP/LLDP-MED disabled on that port | re-enable on phone ports |
| Stale neighbour after a recable | 180 s holdtime not expired | `clear cdp table` |
| `%CDP-4-NATIVE_VLAN_MISMATCH` | trunk native VLANs differ | `show interfaces trunk` both ends |
| `%CDP-4-DUPLEX_MISMATCH` | duplex differs across the link | `show interfaces status` both ends |
| Audit flags topology disclosure | CDP on user or partner ports | `no cdp enable` there |

## Exam notes

- CDP: **Cisco proprietary**, Layer 2, **enabled by default**, 60 s timer, 180 s holdtime.
- LLDP: **802.1AB**, Layer 2, **disabled by default** on Cisco, 30 s timer, 120 s holdtime.
- Global: `cdp run` / `lldp run`. Per-interface: `cdp enable` / `lldp transmit` and `lldp receive`.
- LLDP separates transmit and receive; CDP does not.
- `show cdp neighbors` gives **local** interface and **remote** Port ID — both ends of the cable.
- `show cdp neighbors detail` adds IP address, IOS version, duplex and native VLAN.
- Both detect duplex and native VLAN mismatches and log them.
- **LLDP-MED** carries voice VLAN and PoE information to IP phones.

---

*Sources: Jeremy's IT Lab Day 36 · Flackbox CCNA Lab Guide 14 · verified in Packet Tracer 8.2.*
