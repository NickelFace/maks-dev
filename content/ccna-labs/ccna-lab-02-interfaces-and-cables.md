---
title: "Lab 02 · Interfaces, Cables and Duplex"
date: 2026-09-06
description: "Copper and fibre, straight-through and crossover, autonegotiation — and the duplex mismatch that halves your throughput without ever bringing the link down."
tags: ["CCNA", "Ethernet", "Cabling", "Lab"]
categories: ["CCNA"]
domain: 1
tool: "Packet Tracer"
duration: "35 min"
sources: "Jeremy's IT Lab Day 2, 9 · Flackbox 14"
aliases: ["/ccna-labs/ccna-lab-14-router-switch-basics/"]
---

A duplex mismatch is the most instructive fault in networking. The link comes up. `show ip interface brief` says `up/up`. Ping works. Everything looks correct — and throughput collapses under load while the error counters climb. It is the canonical example of a fault that only the counters reveal, and this lab produces one deliberately.

## Topology

{{< topology cols="3" rows="2" caption="Two switches trunked, each with a PC — enough to see autonegotiation succeed and then be broken" >}}
pc     PC1 "192.168.1.10" at 0,0
switch SW1 "access" at 1,0
switch SW2 "access" at 1,1
pc     PC2 "192.168.1.20" at 0,1
router R1  "192.168.1.1" at 2,0

PC1 — SW1
PC2 — SW2
SW1 — SW2 label="Gi0/1 ↔ Gi0/1"
SW1 — R1 label="Fa0/24"
{{< /topology >}}

## Objectives

- Pick the right cable for each device pair and explain the MDI/MDI-X rule that makes Auto-MDIX unnecessary
- Read `show interfaces` and identify the speed, duplex, and error counters
- Configure speed and duplex manually, and see what autonegotiation does when only one side is manual
- Create a duplex mismatch, find it in the counters, and fix it
- Use `show interfaces status` and `show interfaces description` to audit a switch at a glance

---

## Part 1 — Cabling

{{< step num="1" dev="—" title="Which cable, and why" open="true" >}}
Ethernet over copper sends on one pair and receives on another. A **straight-through** cable connects pin 1 to pin 1; a **crossover** swaps the transmit and receive pairs. Which you need depends on whether the two devices transmit on the same pins.

| Device pair | Cable |
|---|---|
| PC ↔ switch | straight-through |
| Router ↔ switch | straight-through |
| Switch ↔ switch | **crossover** |
| Router ↔ router (Ethernet) | **crossover** |
| PC ↔ router | **crossover** |
| PC ↔ switch console port | rollover (console) |

The rule underneath the table: **like devices need a crossover.** PCs and routers are both "MDI" — they transmit on pins 1/2. Switches and hubs are "MDI-X" — they transmit on 3/6. Connect two MDI devices, or two MDI-X devices, and both sides transmit into each other's transmitter.

Every switch built in the last twenty years implements **Auto-MDIX**, which detects the mismatch and flips its own pinout, so in practice a straight-through works everywhere. Two caveats that make the rule still worth knowing: Auto-MDIX requires autonegotiation to be running — hardcode speed *and* duplex on both ends and it is disabled — and CCNA exam questions ignore it entirely.

Fibre has no crossover question, but it does have a distance and cost question:

| Type | Core | Source | Reach |
|---|---|---|---|
| Multimode (MMF) | 50 or 62.5 µm | LED / VCSEL | ~300–550 m |
| Single-mode (SMF) | ~9 µm | laser | 10–100 km |

Multimode is cheaper and is what you find inside a building; single-mode is what leaves it. The two are not interchangeable and a mismatched pair will produce a link that comes up and then errors continuously.
{{< /step >}}

---

## Part 2 — Reading an interface

{{< step num="2" dev="SW1" title="Label the ports before you need to" >}}
```
SW1(config)#interface FastEthernet0/1
SW1(config-if)#description ## PC1 — accounting ##
SW1(config-if)#exit
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#description ## uplink to SW2 Gi0/1 ##
SW1(config-if)#exit
SW1(config)#interface FastEthernet0/24
SW1(config-if)#description ## R1 Gi0/0 — default gateway ##
SW1(config-if)#end
```

Descriptions cost nothing and are the difference between a five-minute and a two-hour outage. `interface range` sets many at once:

```
SW1(config)#interface range FastEthernet0/2 - 23
SW1(config-if-range)#description ## unused — shut ##
SW1(config-if-range)#shutdown
```

Shutting unused ports is a real security control, not tidiness — an unpatched live port is an unauthenticated way onto the LAN.
{{< /step >}}

{{< verify dev="SW1" cmd="show interfaces status" open="true" >}}
The single most useful switch command. One line per port: description, VLAN, duplex, speed, and media type.

```
SW1#show interfaces status

Port      Name                 Status       Vlan       Duplex  Speed Type
Fa0/1     ## PC1 — accounting  connected    1          a-full  a-100 10/100BaseTX
Fa0/2     ## unused — shut ##  disabled     1            auto   auto 10/100BaseTX
Fa0/24    ## R1 Gi0/0 — defau  connected    1          a-full  a-100 10/100BaseTX
Gi0/1     ## uplink to SW2 Gi  connected    trunk      a-full  a-1000 10/100/1000BaseTX
```

The `a-` prefix means **autonegotiated**. `a-full` was agreed with the far end; a bare `full` was configured by hand. That one character is how you tell, at a glance, which ports still have autonegotiation running.

`Status` values: `connected` (up/up), `notconnect` (no link — cable or far end down), `disabled` (`shutdown`), `err-disabled` (the switch shut it itself — port security, BPDU guard, or a detected mismatch).
{{< /verify >}}

{{< verify dev="SW1" cmd="show interfaces FastEthernet0/1" >}}
The full picture for one port, with the counters that matter.

```
SW1#show interfaces FastEthernet0/1
FastEthernet0/1 is up, line protocol is up (connected)
  Hardware is Lance, address is 0060.5c2b.9401 (bia 0060.5c2b.9401)
  Description: ## PC1 — accounting ##
  MTU 1500 bytes, BW 100000 Kbit, DLY 100 usec,
     reliability 255/255, txload 1/255, rxload 1/255
  Encapsulation ARPA, loopback not set
  Full-duplex, 100Mb/s, media type is 10/100BaseTX
  input flow-control is off, output flow-control is off
     956 packets input, 193351 bytes, 0 no buffer
     Received 956 broadcasts (0 multicasts)
     0 runts, 0 giants, 0 throttles
     0 input errors, 0 CRC, 0 frame, 0 overrun, 0 ignored
     0 watchdog, 0 multicast, 0 pause input
     1240 packets output, 189302 bytes, 0 underruns
     0 output errors, 0 collisions, 1 interface resets
     0 babbles, 0 late collision, 0 deferred
```

Six counters, each pointing somewhere different:

| Counter | Means |
|---|---|
| **CRC** | frame arrived corrupted — bad cable, EMI, or a duplex mismatch |
| **runts** | frame under 64 bytes — usually a collision on a half-duplex segment |
| **giants** | frame over MTU — often an unexpected 802.1Q tag |
| **collisions** | normal on half duplex, **should be zero on full duplex** |
| **late collision** | collision after the first 64 bytes — **duplex mismatch or a segment that is too long** |
| **input errors** | the sum; look at the specific counters underneath it |

`reliability 255/255` is a perfect score. Anything lower means the interface is dropping frames.

Reset the counters before a test so you are measuring the test and not the last three weeks:

```
SW1#clear counters FastEthernet0/1
```
{{< /verify >}}

---

## Part 3 — Autonegotiation, and breaking it

{{< step num="3" dev="SW1, SW2" title="Hardcode one end of the uplink" >}}
```
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#speed 100
SW1(config-if)#duplex full
SW1(config-if)#end
```

Leave SW2's Gi0/1 on `auto`. This is the classic field mistake: someone hardcodes one switch during a troubleshooting session and never reverts it.

What happens next is defined behaviour, not a bug. Autonegotiation works by exchanging Fast Link Pulses. When SW1 is hardcoded it **stops sending them**. SW2 hears no negotiation partner, so it falls back to parallel detection: it can sense the *speed* off the electrical signal, but duplex is not detectable that way, so it applies the IEEE default — **half duplex** for anything under 1 Gbps.

Result: SW1 full, SW2 half. The link stays up.
{{< /step >}}

{{< verify dev="SW1, SW2" cmd="show interfaces status" open="true" >}}
```
SW1#show interfaces status | include Gi0/1
Gi0/1     ## uplink to SW2 Gi  connected    trunk        full    100 10/100/1000BaseTX

SW2#show interfaces status | include Gi0/1
Gi0/1     ## uplink to SW1 Gi  connected    trunk      a-half   a-100 10/100/1000BaseTX
```

There it is: `full` on one side, `a-half` on the other, and both ports say `connected`. Nothing in a status check flags this.

Now generate traffic — a long ping from PC1 to PC2 — and look at the counters:

```
SW2#show interfaces GigabitEthernet0/1 | include collision|error|CRC
     212 input errors, 212 CRC, 0 frame, 0 overrun, 0 ignored
     0 output errors, 843 collisions, 0 interface resets
     0 babbles, 194 late collision, 0 deferred
```

**Late collisions on the half-duplex side and CRC errors on the full-duplex side.** That pair is the signature. The full-duplex end transmits whenever it likes; the half-duplex end sees that as a collision, aborts its own frame mid-transmission, and the fragment arrives at the far end as a CRC error.

Under a ping it looks fine. Under a file copy, throughput drops by an order of magnitude.

CDP will also tell you outright, if it is running:

```
SW2#show cdp neighbors detail | include Duplex
%CDP-4-DUPLEX_MISMATCH: duplex mismatch discovered on GigabitEthernet0/1
```
{{< /verify >}}

{{< step num="4" dev="SW1" title="Fix it — and pick a policy" >}}
```
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#no speed
SW1(config-if)#no duplex
SW1(config-if)#end
```

Both ends back to auto, both negotiate `a-full` / `a-1000`.

The policy question is worth settling once: **autonegotiate everywhere, on both ends.** The 1990s advice to hardcode server and uplink ports came from genuinely broken early implementations that no longer exist. Modern autonegotiation is reliable, and it is mandatory above 1 Gbps — 1000BASE-T and everything faster cannot run without it. Hardcoding is now the *cause* of mismatches rather than the cure.

If you must hardcode, hardcode **both ends**, and put it in the interface description so the next engineer knows it was deliberate.
{{< /step >}}

{{< verify dev="SW1" cmd="show interfaces GigabitEthernet0/1 | include duplex|Full|Half" >}}
```
SW1#show interfaces GigabitEthernet0/1 | include Full|Half
  Full-duplex, 1000Mb/s, media type is 10/100/1000BaseTX
```

Then confirm the counters stay clean under load. Clear them, run 100 pings, and check again:

```
SW1#clear counters GigabitEthernet0/1
SW1#show interfaces GigabitEthernet0/1 | include error|collision
     0 input errors, 0 CRC, 0 frame, 0 overrun, 0 ignored
     0 output errors, 0 collisions, 0 interface resets
```
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Link up, throughput terrible | duplex mismatch | `show interfaces` — late collisions one side, CRC the other |
| `notconnect` on both ends | cable, or wrong cable type | `show interfaces status`; swap the cable |
| CRC errors, no collisions | bad cable, EMI, failing SFP | `show interfaces` — reseat or replace |
| `err-disabled` | port security, BPDU guard, or link-flap | `show interfaces status err-disabled` |
| Giants counter climbing | 802.1Q tag on a port not expecting one | check trunk/access config on both ends |
| 1 Gbps port negotiates 100 Mbps | only two pairs usable — damaged cable | replace; 1000BASE-T needs all four pairs |

## Exam notes

- Crossover between **like** devices: switch–switch, router–router, PC–PC, PC–router. Straight-through otherwise.
- Auto-MDIX removes the need in practice but **requires autonegotiation**; hardcoding speed and duplex disables it.
- Parallel detection can sense speed but not duplex; the fallback is **half duplex**.
- Late collisions = duplex mismatch (or an over-long segment). Collisions on a full-duplex port should be zero.
- 1000BASE-T and above **require** autonegotiation — it cannot be turned off meaningfully.
- MMF ~300–550 m, SMF 10–100 km. Multimode inside a building, single-mode between them.
- `show interfaces status` for the sweep, `show interfaces <int>` for the counters.

---

*Sources: Jeremy's IT Lab Day 2 & 9 · Flackbox CCNA Lab Guide 14 · verified in Packet Tracer 8.2.*
