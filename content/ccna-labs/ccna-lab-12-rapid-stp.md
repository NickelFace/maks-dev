---
title: "Lab 12 · Rapid Spanning Tree"
date: 2026-09-06
description: "RSTP converges in under a second where 802.1D took fifty. The mechanism is proposal/agreement and link types — and both are visible from the CLI."
tags: ["CCNA", "RSTP", "Spanning Tree", "Lab"]
categories: ["CCNA"]
domain: 2
tool: "Packet Tracer"
duration: "35 min"
sources: "Jeremy's IT Lab Day 22 · Flackbox 25-2"
---

RSTP is not a different spanning tree. It computes the same topology, using the same bridge IDs and the same costs, and it interoperates with 802.1D. What changed is how a port decides it is safe to forward: instead of waiting out two fifteen-second timers and hoping, a switch **asks its neighbour and waits for an answer**.

The result is sub-second convergence on point-to-point links, and it is a one-line change.

## Topology

The same triangle as Lab 10 — DSW1, DSW2 and ASW1 — plus one host on ASW1 so convergence can be timed with a ping.

{{< topology cols="3" rows="3" caption="Same physical topology, different protocol, two orders of magnitude faster" >}}
switch DSW1 "root · pri 4096" at 0,0
switch DSW2 "pri 8192" at 2,0
switch ASW1 "access" at 1,2
pc     PC1 "" at 0,2

DSW1 — DSW2 label="Gi0/1"
DSW1 — ASW1 label="Gi0/2"
DSW2 — ASW1 label="Gi0/1"
ASW1 — PC1
{{< /topology >}}

## Objectives

- Switch to Rapid PVST+ and confirm it on every switch
- Map the RSTP port roles and states onto their 802.1D equivalents
- Read the link type (P2p / Shared / Edge) and understand why it decides the convergence speed
- Explain proposal/agreement and why it removes the need for forward delay
- Measure convergence before and after with a continuous ping

---

## Part 1 — Enable it

{{< step num="1" dev="DSW1, DSW2, ASW1" title="One command per switch" open="true" >}}
```
DSW1(config)#spanning-tree mode rapid-pvst
```

Repeat on DSW2 and ASW1. Bridge priorities, port costs, PortFast and the guards all carry over unchanged — RSTP reuses the entire 802.1D configuration model.

The three modes IOS offers:

| Mode | Standard | Instances |
|---|---|---|
| `pvst` | 802.1D + Cisco PVST+ | one per VLAN |
| `rapid-pvst` | 802.1w + Cisco | one per VLAN |
| `mst` | 802.1s | one per VLAN *group* |

`rapid-pvst` is the correct default for any Cisco network. There is no scenario where plain `pvst` is preferable, and Catalyst platforms have shipped supporting rapid-pvst for two decades.

Do it on **every** switch. RSTP falls back to 802.1D behaviour on any port where it detects a legacy neighbour, so a single un-migrated switch drags its neighbours' ports back to thirty-second convergence — and does so silently.
{{< /step >}}

{{< verify dev="ASW1" cmd="show spanning-tree summary | include mode" open="true" >}}
```
ASW1#show spanning-tree summary | include mode
Switch is in rapid-pvst mode
```

Then check for legacy stragglers — this is the command that finds the one switch someone forgot:

```
ASW1#show spanning-tree | include ieee|rstp
  Spanning tree enabled protocol rstp
```

`protocol rstp` on every VLAN. `protocol ieee` means that VLAN is still running classic 802.1D.
{{< /verify >}}

---

## Part 2 — Roles, states and link types

{{< step num="2" dev="—" title="What RSTP renamed, and what it actually added" >}}
**Port roles.** RSTP keeps root and designated, and splits the old "blocking" into two roles that behave differently:

| RSTP role | 802.1D equivalent | Meaning |
|---|---|---|
| Root | Root | best path to the root |
| Designated | Designated | best path for this segment |
| **Alternate** | Blocking | a backup path to the root **via another switch** — takes over immediately |
| **Backup** | Blocking | a backup for the same segment via the **same** switch — only on shared media |
| Disabled | Disabled | shut down |

The split matters because an **Alternate** port already knows a valid path to the root and can start forwarding the instant the root port fails — no listening, no learning, no timers. A **Backup** port only exists on a hub segment where a switch has two ports on the same collision domain, which in practice means almost never.

**Port states.** Five became three:

| RSTP state | Replaces |
|---|---|
| Discarding | blocking + listening + disabled |
| Learning | learning |
| Forwarding | forwarding |

**Link type** is the genuinely new field, and it is what governs speed:

| Type | Detected from | Fast transition |
|---|---|---|
| **Point-to-point** | full duplex | **yes** |
| **Shared** | half duplex | no — falls back to timers |
| **Edge** | PortFast configured | immediate |

RSTP infers point-to-point from **full duplex**, which is another reason a duplex mismatch (Lab 02) is so damaging: a port that negotiates half duplex is classified as Shared and loses rapid convergence entirely, with nothing to indicate why.

Override it when the inference is wrong:

```
ASW1(config-if)#spanning-tree link-type point-to-point
```
{{< /step >}}

{{< verify dev="ASW1" cmd="show spanning-tree vlan 1" open="true" >}}
```
ASW1#show spanning-tree vlan 1

VLAN0001
  Spanning tree enabled protocol rstp
  Root ID    Priority    4097
             Address     0001.0001.0A00
             Cost        4
             Port        2 (GigabitEthernet0/2)

  Bridge ID  Priority    32769  (priority 32768 sys-id-ext 1)

Interface        Role Sts Cost      Prio.Nbr Type
---------------- ---- --- --------- -------- ----
Gi0/1            Altn BLK 4         128.1    P2p
Gi0/2            Root FWD 4         128.2    P2p
Fa0/1            Desg FWD 19        128.3    P2p Edge
```

Three things confirm RSTP is doing its job:

- **`protocol rstp`** on the VLAN
- **`Altn`** rather than a bare blocking role — the port is a designated standby
- **`P2p`** on the uplinks and **`P2p Edge`** on the host port

If an uplink reads `Shared`, that port is half duplex. Fix the duplex, not the spanning tree.
{{< /verify >}}

---

## Part 3 — Proposal and agreement

{{< step num="3" dev="—" title="Why forward delay stopped being necessary" >}}
Classic STP waits fifteen seconds in listening and fifteen in learning because it has no way to ask whether forwarding is safe. It is a timeout standing in for a conversation.

RSTP has the conversation. When a point-to-point link comes up:

1. The upstream switch sends a BPDU with the **proposal** bit set: *"I intend to make this port designated and forwarding."*
2. The downstream switch performs a **sync**: it blocks every one of its own non-edge designated ports, guaranteeing that no loop can exist through it.
3. It replies with the **agreement** bit set.
4. The upstream port goes to forwarding **immediately**.
5. The downstream switch repeats the handshake with *its* neighbours, and the wave propagates outward.

Each hop costs one round trip — microseconds on a LAN. Convergence for the whole topology is bounded by its diameter, not by 2 × forward delay per hop.

Two more mechanisms worth knowing:

**BPDUs are now keepalives.** In 802.1D only the root originated BPDUs and everyone else relayed them. In RSTP every switch generates its own every hello interval, and **three missed hellos (6 seconds)** age the information out — rather than the 20-second max age. Failure detection is more than three times faster before any reconvergence even starts.

**Topology changes are handled differently.** 802.1D sent a TCN to the root, which set a flag in its BPDUs, which every switch obeyed by shortening its MAC aging time to 15 seconds — an indirect, slow flush. RSTP floods the TC itself and switches **immediately clear** the MAC entries for all ports except the one that received it. Edge ports do not generate topology changes at all, so a PC rebooting no longer flushes MAC tables across the campus.
{{< /step >}}

{{< verify dev="ASW1" cmd="measure convergence with a continuous ping" open="true" >}}
Start a long ping from PC1 to a host beyond DSW1, then break the root port:

```
ASW1(config)#interface GigabitEthernet0/2
ASW1(config-if)#shutdown
```

**With `pvst`** (Lab 10): roughly 30 dropped replies while Gi0/1 walks listening → learning → forwarding.

**With `rapid-pvst`**: zero or one dropped reply. The Alternate port already had a valid path and took over on the spot.

```
ASW1#show spanning-tree vlan 1 | begin Interface
Interface        Role Sts Cost      Prio.Nbr Type
---------------- ---- --- --------- -------- ----
Gi0/1            Root FWD 8         128.1    P2p
```

Gi0/1 went from Alternate/Discarding to Root/Forwarding with no intermediate state visible — there was none to see. Restore:

```
ASW1(config-if)#no shutdown
```

Reverting is slightly slower than failing over, because the returning port has to run proposal/agreement before it can take back the root role. Still under a second.
{{< /verify >}}

{{< verify dev="DSW1" cmd="show spanning-tree detail | include changes|topology" >}}
Topology change counters, which is where you find a flapping link:

```
DSW1#show spanning-tree vlan 1 detail | include occurred|changes
  Number of topology changes 4 last change occurred 00:02:11 ago
          from GigabitEthernet0/2
```

`from GigabitEthernet0/2` names the port that caused the most recent change. A counter climbing steadily, with a `last change` measured in seconds, is a link flapping — and that is worth far more than the number itself.

On a stable network the count should be low and the last change should be hours or days old.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Still 30 s convergence after enabling RSTP | one switch left in `pvst` mode | `show spanning-tree | include ieee` |
| An uplink shows `Shared` | port is half duplex | `show interfaces status`; fix duplex |
| Port takes 30 s despite RSTP | link type inferred as shared | `spanning-tree link-type point-to-point` |
| Topology change counter climbing | a link is flapping | `show spanning-tree detail`; check the named port |
| MAC tables flushing constantly | non-edge port flapping, or missing PortFast on hosts | `spanning-tree portfast` on access ports |
| RSTP falls back on one port | legacy 802.1D neighbour detected | migrate that switch |

## Exam notes

- Enable with **`spanning-tree mode rapid-pvst`**. It is backward compatible and falls back per port.
- Roles: root, designated, **alternate** (backup path to the root), **backup** (backup for the same segment, shared media only), disabled.
- States: **discarding, learning, forwarding** — three, not five.
- Link types: **point-to-point** (full duplex, fast), **shared** (half duplex, slow), **edge** (PortFast, immediate).
- Convergence uses **proposal/agreement** with a sync, not forward delay.
- Every switch originates BPDUs; **three missed hellos (6 s)** age out the information.
- A topology change immediately flushes MAC entries; edge ports do not generate topology changes.
- RSTP is 802.1w; MST is 802.1s; classic STP is 802.1D.

---

*Sources: Jeremy's IT Lab Day 22 · Flackbox CCNA Lab Guide 25-2 · verified in Packet Tracer 8.2.*
