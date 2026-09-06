---
title: "Spanning Tree"
date: 2026-09-06
description: "Reading an STP failure from the outside in: what a broadcast storm looks like on the console, why the wrong switch became root, why a port you wanted forwarding is blocked, and what BPDU guard, root guard and loop guard each actually protect against."
tags: ["Troubleshooting", "STP", "RSTP", "PVST+", "BPDU", "Cisco"]
categories: ["Troubleshooting"]
unit: 3
---

Spanning tree fails in two directions, and they need opposite responses. Either it is blocking a port you wanted forwarding — annoying, contained, diagnosable at leisure — or it has stopped blocking a port it should have blocked, in which case the switch is melting and you have minutes.

Recognising which one you are in is the first decision, and it is usually obvious: a blocked port is a connectivity complaint from one part of the network; a loop is everything at once.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| Total loss, switch CPU pinned, console unresponsive | broadcast storm — a loop is forwarding | `show processes cpu sorted`, port LEDs |
| MAC flap messages in the log | the same MAC arriving on two ports — a loop | `show logging \| include MACFLAP` |
| One switch or VLAN unreachable, rest fine | a port is blocking where you wanted forwarding | `show spanning-tree vlan <n>` |
| Traffic takes an obviously wrong path | an unintended switch became root | `show spanning-tree root` |
| 30-second outage every time a PC boots | PortFast missing on an access port | `show spanning-tree summary` |
| Port err-disabled the moment a device was plugged in | BPDU guard fired on a PortFast port | `show interfaces status err-disabled` |
| Port stuck in `BKN` with an inconsistency | root guard, loop guard or a PVID mismatch | `show spanning-tree inconsistentports` |
| Convergence takes 30–50 s despite RSTP | a neighbour is running classic 802.1D | Type column shows `P2p Peer(STP)` |

---

## A broadcast storm

A loop does not degrade the network; it removes it. A single broadcast frame entering a loop is replicated at every switch, forever, at line rate. Within seconds the CPU is saturated processing frames it must flood, the MAC address table is being rewritten thousands of times a second, and management access is gone — including the SSH session you would use to fix it.

Three things identify it, and only one of them requires a working login.

**The port LEDs.** Every uplink on every switch in the loop is solid rather than blinking — visible from the doorway, and often the fastest diagnosis available.

**MAC flapping in the log.** The same source MAC is arriving on two different ports, because the frame is coming back around:

```
%SW_MATM-4-MACFLAP_NOTIF: Host 0011.2233.4455 in vlan 10 is flapping between
port Gi0/1 and port Gi0/2
```

That message is close to definitive. A host cannot be on two ports at once; a loop is the only common explanation.

**CPU.** If you can still get a prompt:

```
SW1#show processes cpu sorted | exclude 0.00
CPU utilization for five seconds: 99%/86%; one minute: 97%; five minutes: 91%
```

The number that matters is the second — **86% is interrupt-level CPU**, meaning packet forwarding rather than the control plane. High interrupt CPU alongside high total CPU is a flood, not a busy process.

The recovery is physical: shut the redundant links until the network settles, then find out why STP was not blocking one of them. The usual answers are a BPDU filter on an uplink, an unmanaged switch bridging two access ports, a unidirectional link, or STP disabled outright:

```
SW1#show running-config | include no spanning-tree
no spanning-tree vlan 10
```

**`no spanning-tree vlan 10` disables loop prevention for that VLAN only**, which is why a storm can be confined to one VLAN while the rest of the switch works. It is almost never configured deliberately.

---

## The wrong switch is root

Traffic works, but it takes a path nobody designed — through an access switch, or across a 100 Mbps link when a 10 Gbps link exists. The root bridge election explains it.

```
SW1#show spanning-tree vlan 10

VLAN0010
  Spanning tree enabled protocol ieee
  Root ID    Priority    32778
             Address     0011.2233.aaaa
             Cost        19
             Port        1 (FastEthernet0/1)
             Hello Time  2 sec  Max Age 20 sec  Forward Delay 15 sec

  Bridge ID  Priority    32778  (priority 32768 sys-id-ext 10)
             Address     0022.3344.bbbb

Interface        Role Sts Cost      Prio.Nbr Type
---------------- ---- --- --------- -------- --------------------------------
Fa0/1            Root FWD 19        128.1    P2p
Gi0/1            Altn BLK 4         128.2    P2p
```

**The default priority is 32768, and every switch in the network has it.** The sys-id-ext field adds the VLAN ID, which is why VLAN 10 shows 32778 rather than 32768 — that is normal and not a configured value.

With every priority identical, the election falls through to the tiebreaker: **the lowest MAC address wins**. MAC addresses are assigned at manufacture, and older equipment tends to have lower ones. The switch that becomes root by default is therefore frequently the oldest, slowest, least central device in the building — a nine-year-old access switch in a cupboard, elected because nobody set a priority.

The output above shows exactly that. The root is reached through `Fa0/1` at cost 19, while `Gi0/1` — a gigabit link at cost 4 — is blocking. Traffic is being pushed through the slower path because the root is in the wrong place.

`show spanning-tree root` prints the same conclusion for every VLAN at once, which is the faster way to see that one switch has quietly taken the whole network.

Fix it by deciding where the root belongs and configuring it, on the distribution switch, for every VLAN:

```
SW1(config)#spanning-tree vlan 1-100 priority 4096
SW1(config)#spanning-tree vlan 1-100 root primary   ! macro: sets 24576, or lower if needed
```

Both forms work. The explicit priority is preferable because it is deterministic — `root primary` calculates a value from the *current* root's priority at the moment it is typed, and does not re-evaluate later. Configure a secondary too, so a failure of the primary is also planned:

```
SW2(config)#spanning-tree vlan 1-100 priority 8192
```

Priorities must be multiples of 4096. The switch rejects anything else.

---

## A port blocking where you wanted it forwarding

Once the root is where it should be, the remaining path decisions come from cost. Every non-root switch picks the port with the lowest **cumulative** cost to the root as its root port, and each segment picks a designated port the same way.

| Link speed | Cost (short mode, default) | Cost (long mode) |
|---|---|---|
| 10 Mbps | 100 | 2,000,000 |
| 100 Mbps | 19 | 200,000 |
| 1 Gbps | 4 | 20,000 |
| 10 Gbps | 2 | 2,000 |

Short mode saturates above 10 Gbps — 20 Gbps and 100 Gbps both cost 1 — which is why `spanning-tree pathcost method long` exists on modern platforms.

A manually configured cost is the usual cause of a surprising blocked port, and it stands out because it is not one of the values in that table:

```
SW2#show spanning-tree vlan 1

Interface        Role Sts Cost      Prio.Nbr Type
---------------- ---- --- --------- -------- ----
Fa0/1            Root FWD 100       128.1    P2p
Gi0/1            Altn BLK 4         128.2    P2p
```

Cost 100 on a FastEthernet port that should be 19 was typed by somebody, most likely during a lab or a temporary workaround that outlived its purpose:

```
SW2(config)#interface FastEthernet0/1
SW2(config-if)#no spanning-tree cost
```

When both paths have equal cost, the tiebreakers run in order: **lowest sender bridge ID, then lowest sender port priority, then lowest sender port number**. The critical word is *sender* — the port priority that decides the outcome is configured on the **upstream** switch, not on the one doing the blocking, so `spanning-tree vlan 10 port-priority 64` applied to the blocking port has no effect at all.

---

## PVST+ and per-VLAN divergence

PVST+ runs an independent spanning tree instance for every VLAN. That is a feature — it allows VLAN 10 to use one uplink and VLAN 20 the other, doubling usable bandwidth — and it is also why "the network is fine but VLAN 30 is broken" is a sentence that makes sense.

```
SW1#show spanning-tree vlan 30

VLAN0030
  Spanning tree enabled protocol ieee
  Root ID    Priority    32798
             Address     00aa.bbcc.dd00
             Cost        38
             Port        2 (FastEthernet0/2)
```

A different root, a different cost and a different root port from every other VLAN on the same switch. Either a per-VLAN priority was set for VLAN 30 alone, or — more often — the VLAN range in a `spanning-tree vlan` command did not include it:

`show running-config | include spanning-tree vlan` shows `spanning-tree vlan 1-20 priority 4096` — VLAN 30 was created after that line was written and nobody revisited it. Compare all VLANs at once rather than examining them one by one:

```
SW1#show spanning-tree summary

Switch is in pvst mode
Root bridge for: VLAN0001, VLAN0010, VLAN0020
PortFast BPDU Guard Default  is disabled
Loopguard Default            is disabled

Name                   Blocking Listening Learning Forwarding STP Active
---------------------- -------- --------- -------- ---------- ----------
VLAN0001                      1         0        0          3          4
VLAN0010                      1         0        0          3          4
VLAN0030                      0         0        0          4          4
```

Two things stand out. VLAN 30 is missing from the "Root bridge for" list. And VLAN 30 has **zero blocking ports** where every other VLAN blocks one — on a topology with a physical loop, that is not a preference, it is a loop with nothing stopping it.

---

## PortFast and BPDU guard

PortFast skips listening and learning, taking an access port straight to forwarding on link-up. Without it, a PC that boots gets no link-layer service for **30 seconds** — 15 in listening, 15 in learning — which is long enough that DHCP gives up and the user gets an APIPA address. That is the fault PortFast exists to solve.

```
SW1(config)#interface range GigabitEthernet0/6 - 24
SW1(config-if-range)#spanning-tree portfast
%Warning: portfast should only be enabled on ports connected to a single
host. Connecting hubs, concentrators, switches, bridges, etc... to this
interface when portfast is enabled, can cause temporary bridging loops.
```

The warning is not decoration. A PortFast port forwards immediately, so plugging a switch into one creates a forwarding loop for the several seconds it takes STP to notice and re-converge. On a busy VLAN, several seconds is a storm.

BPDU guard is the countermeasure, and it is not optional on any port a user can reach. Prefer the global forms — they cover every access port, including ones configured later:

```
SW1(config)#spanning-tree portfast default
SW1(config)#spanning-tree portfast bpduguard default
``` When a switch appears on such a port:

```
%SPANTREE-2-BLOCK_BPDUGUARD: Received BPDU on port GigabitEthernet0/14 with
BPDU Guard enabled. Disabling port.
%PM-4-ERR_DISABLE: bpduguard error detected on Gi0/14, putting Gi0/14 in
err-disable state
```

Recovery needs `shutdown` then `no shutdown`, or an errdisable recovery timer. **Do not clear it without finding out what was plugged in** — the port was shut precisely because something that generates BPDUs appeared on a port that was promised not to have any.

A related trap is `spanning-tree bpdufilter`, which suppresses BPDUs in both directions and makes the port behave as though STP does not exist. On an uplink it removes the only mechanism that would have caught a loop:

```
SW1#show spanning-tree interface GigabitEthernet0/1 detail | include filter
  Bpdu filter is enabled
SW1(config-if)#no spanning-tree bpdufilter enable
```

---

## Root guard and loop guard

Two protections for two different failures, and they are not interchangeable.

**Root guard** protects the topology. Applied to a downstream port, it accepts BPDUs but refuses to let that neighbour become root — a superior BPDU puts the port into `root-inconsistent` until the BPDUs stop. It prevents somebody attaching a low-priority switch, deliberately or from a lab bench, and pulling the root of the network into a wiring closet.

```
SW1(config)#interface GigabitEthernet0/14
SW1(config-if)#spanning-tree guard root
%SPANTREE-2-ROOTGUARD_BLOCK: Root guard blocking port Gi0/14 on VLAN0010.
```

**Loop guard** protects against silence. A non-designated port that stops receiving BPDUs normally assumes the block is no longer necessary and transitions to forwarding after max age plus the forward delays. If the BPDUs stopped because of a fault rather than a topology change, that transition creates a loop. Loop guard puts the port into `loop-inconsistent` instead:

```
SW1(config)#spanning-tree loopguard default
%SPANTREE-2-LOOPGUARD_BLOCK: Loop guard blocking port Gi0/2 on VLAN0010.
```

Both show up in one place, along with the PVID inconsistency a native VLAN mismatch produces:

```
SW1#show spanning-tree inconsistentports

Name                 Interface              Inconsistency
-------------------- ---------------------- ------------------
VLAN0010             GigabitEthernet0/14    Root Inconsistent
VLAN0010             GigabitEthernet0/2     Loop Inconsistent

Number of inconsistent ports (segments) in the system : 2
```

Neither needs manual clearing. The port recovers by itself once the condition ends — root guard when the superior BPDUs stop, loop guard when BPDUs resume.

### Loop guard against UDLD

Both address unidirectional links, from different layers, and the difference decides which to deploy.

| | Loop guard | UDLD |
|---|---|---|
| Detects | BPDUs stopped arriving | the neighbour cannot hear us |
| Layer | STP, per VLAN | its own Layer 2 protocol, per port |
| On an EtherChannel | acts on the whole bundle | acts on each member link |
| Action | block, auto-recovering | `normal`: warn. `aggressive`: err-disable |
| Blind spot | shared-media segments | needs UDLD running on both ends |

```
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#udld port aggressive
%UDLD-4-UDLD_PORT_DISABLED: UDLD disabled interface Gi0/1, unidirectional
link detected
```

UDLD catches the physical fault directly — a broken fibre strand, a miswired patch — but only if both ends run it. Loop guard needs no cooperation but is blind to anything that does not manifest as missing BPDUs. Fibre links deserve both.

---

## RSTP that does not converge quickly

Rapid PVST+ converges in under a second by handshaking with its neighbour rather than waiting out timers. It only does so when the neighbour can handshake back.

```
SW1#show spanning-tree vlan 10

Interface        Role Sts Cost      Prio.Nbr Type
---------------- ---- --- --------- -------- --------------------------------
Gi0/1            Desg FWD 4         128.1    P2p
Gi0/2            Desg FWD 4         128.2    P2p Peer(STP)
Fa0/5            Desg FWD 19        128.5    Shr
```

Two problems in that Type column.

**`P2p Peer(STP)`** means the neighbour on Gi0/2 sent 802.1D BPDUs, so RSTP fell back to classic behaviour **on that port only**. It will use 15-second forward delays there while converging in milliseconds everywhere else, which is why "RSTP is slow" is usually "RSTP is slow through one link". Set the neighbour to `rapid-pvst`:

```
SW2(config)#spanning-tree mode rapid-pvst
```

**`Shr`** means shared, which RSTP infers from half duplex. The rapid proposal/agreement handshake runs only on point-to-point links, so a half-duplex port — usually a duplex mismatch rather than a genuine hub — silently loses rapid convergence. Fix the duplex; `spanning-tree link-type point-to-point` overrides the inference and hides the real fault.

If the topology is changing and you need to watch it rather than infer it, the events debug is the least noisy of the STP debugs, and the detail counter names the culprit:

```
SW1#debug spanning-tree events
STP: VLAN0010 Topology Change rcvd on Gi0/2
STP: VLAN0010 sent Topology Change Notice on Gi0/1

SW1#show spanning-tree vlan 10 detail | include change|from
  Number of topology changes 1847 last change occurred 00:00:06 ago
          from GigabitEthernet0/2
```

**1847 topology changes is not a spanning tree problem** — it is a physical problem that spanning tree is reporting. Every change flushes MAC tables across the domain, which is why the network feels slow rather than broken.

---

## Quick reference

| Command | What it proves |
|---|---|
| `show spanning-tree vlan <n>` | root ID, local bridge ID, every port's role, state and cost |
| `show spanning-tree root` | the root bridge and root port for every VLAN, in one table |
| `show spanning-tree summary` | VLANs this switch roots, blocking counts, global defaults |
| `show spanning-tree inconsistentports` | root guard, loop guard and PVID inconsistencies |
| `show spanning-tree vlan <n> detail` | topology change count and the port that caused the last |
| `show spanning-tree interface <int> detail` | PortFast, BPDU guard and filter state on one port |
| `show interfaces status err-disabled` | ports shut by BPDU guard |
| `show processes cpu sorted` | interrupt-level CPU, the signature of a flood |
| `show logging \| include MACFLAP` | the same MAC on two ports — a loop |
| `debug spanning-tree events` | live role and state transitions during a flap |

| State | Meaning |
|---|---|
| `FWD` / `BLK` | forwarding / blocking |
| `LRN` / `LIS` | learning / listening — transient in 802.1D |
| `BKN` | broken — see `show spanning-tree inconsistentports` |
| Role `Root` / `Desg` | leads to the root bridge / designated for its segment |
| Role `Altn` / `Back` | blocked alternate to the root / backup on the same segment |

---

*Based on the NetworkLessons troubleshooting series: spanning tree on Cisco IOS.*
