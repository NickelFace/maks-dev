---
title: "Lab 10 · Analysing Spanning Tree"
date: 2026-09-06
description: "Build a triangle of switches, let STP block a port on its own, and work out from the BPDU fields exactly why it chose that port and not another."
tags: ["CCNA", "STP", "Spanning Tree", "Lab"]
categories: ["CCNA"]
domain: 2
tool: "Packet Tracer"
duration: "45 min"
sources: "Jeremy's IT Lab Day 20 · Flackbox 25-1"
aliases: ["/ccna-labs/ccna-lab-25-stp-troubleshooting/"]
---

Without spanning tree, a single redundant link between two switches destroys the network. Broadcast frames have no TTL, so a loop at Layer 2 means a broadcast circulates forever, is duplicated at every switch, and saturates every link within seconds. The MAC address table flaps as the same source appears on multiple ports, and the switches stop forwarding anything useful.

STP prevents that by blocking ports until the topology is a tree. This lab does not configure anything — it lets STP run and then reverse-engineers its decision, which is the skill the exam actually tests.

## Topology

{{< topology cols="3" rows="3" caption="Three switches in a triangle — one port must block" >}}
switch SW1 "MAC ...0A00" at 1,0
switch SW2 "MAC ...0B00" at 0,2
switch SW3 "MAC ...0C00" at 2,2

SW1 — SW2 label="Gi0/1"
SW1 — SW3 label="Gi0/2"
SW2 — SW3 label="Gi0/3"
{{< /topology >}}

Set the MAC addresses so the outcome is predictable. In Packet Tracer, read them with `show version | include MAC` and substitute yours; the relative order is what matters.

| Switch | Base MAC | Priority (default) |
|---|---|---|
| SW1 | 0001.0001.0A00 | 32768 |
| SW2 | 0002.0002.0B00 | 32768 |
| SW3 | 0003.0003.0C00 | 32768 |

## Objectives

- Identify the root bridge and explain the election from the bridge ID
- Classify every port as root, designated or non-designated, and justify each
- Read `show spanning-tree` and map each field to the election rule that produced it
- Walk the four tiebreakers in order and apply them to a specific port
- Watch a link failure trigger reconvergence and time it

---

## Part 1 — The root election

{{< verify dev="SW1" cmd="show spanning-tree vlan 1" open="true" >}}
```
SW1#show spanning-tree vlan 1

VLAN0001
  Spanning tree enabled protocol ieee
  Root ID    Priority    32769
             Address     0001.0001.0A00
             This bridge is the root
             Hello Time  2 sec  Max Age 20 sec  Forward Delay 15 sec

  Bridge ID  Priority    32769  (priority 32768 sys-id-ext 1)
             Address     0001.0001.0A00
             Hello Time  2 sec  Max Age 20 sec  Forward Delay 15 sec
             Aging Time  300

Interface        Role Sts Cost      Prio.Nbr Type
---------------- ---- --- --------- -------- ----
Gi0/1            Desg FWD 4         128.1    P2p
Gi0/2            Desg FWD 4         128.2    P2p
```

Two blocks, and the difference between them is the whole election:

**Root ID** is who the switch believes the root is. **Bridge ID** is who this switch is. When they are identical — as here — `This bridge is the root` appears and every port is Designated and Forwarding. A root bridge never blocks anything.

The **Bridge ID** is 8 bytes: 4-bit priority, 12-bit extended system ID, 6-byte MAC.

```
  Priority 32769 = 32768 (configured priority) + 1 (sys-id-ext = VLAN 1)
```

The extended system ID is the VLAN number, added because PVST+ runs a separate spanning tree per VLAN and each needs a distinct bridge ID. That is why priorities must be set in multiples of **4096** — the low 12 bits are not yours to use.

The election: **lowest bridge ID wins.** Priority is compared first; if equal, the lowest MAC address wins. All three switches are at 32768, so SW1 wins on `0001.0001.0A00`.

**Lowest MAC means oldest switch.** Left to itself, STP elects the most decrepit box in the building as the root of your network, and routes traffic through it. That is why Lab 11 sets the priority explicitly.
{{< /verify >}}

{{< verify dev="SW2" cmd="show spanning-tree vlan 1" >}}
```
SW2#show spanning-tree vlan 1

VLAN0001
  Root ID    Priority    32769
             Address     0001.0001.0A00
             Cost        4
             Port        1 (GigabitEthernet0/1)
             Hello Time  2 sec  Max Age 20 sec  Forward Delay 15 sec

  Bridge ID  Priority    32769  (priority 32768 sys-id-ext 1)
             Address     0002.0002.0B00

Interface        Role Sts Cost      Prio.Nbr Type
---------------- ---- --- --------- -------- ----
Gi0/1            Root FWD 4         128.1    P2p
Gi0/3            Desg FWD 4         128.3    P2p
```

Root ID and Bridge ID now differ — SW2 is not the root. Two new fields appear:

**Cost 4** — the total cost of the path from here to the root. **Port 1 (Gi0/1)** — the port that path leaves through, which is this switch's **root port**.

STP costs, revised in 802.1D-2004:

| Speed | Cost |
|---|---|
| 10 Mbps | 100 |
| 100 Mbps | 19 |
| 1 Gbps | **4** |
| 10 Gbps | 2 |

Cost accumulates on **received** BPDUs — a switch adds the cost of the port a BPDU arrives on. This is the opposite of OSPF, which sums outgoing interface costs, and the two are easy to confuse.
{{< /verify >}}

---

## Part 2 — Port roles

{{< step num="1" dev="—" title="The three roles, and the order they are decided in" open="true" >}}
STP assigns roles in a fixed sequence, and every port ends up with exactly one:

**1. Root port.** Every non-root switch elects exactly one — the port with the lowest cost to the root. The root bridge has none.

**2. Designated port.** Every *segment* elects exactly one, on whichever switch has the lowest cost to the root on that segment. All ports on the root bridge are designated by definition, since their cost is zero.

**3. Non-designated (blocking).** Everything left over. It receives BPDUs but forwards no data.

When cost alone does not decide it, four tiebreakers apply **in this order**:

1. Lowest **root path cost**
2. Lowest **sender bridge ID**
3. Lowest **sender port priority** (default 128)
4. Lowest **sender port ID** (the port number)

Note that tiebreakers 3 and 4 look at the **neighbour's** values, not the local ones. That catches people out — a port blocks because of a setting on the switch at the other end of the wire.
{{< /step >}}

{{< verify dev="SW3" cmd="show spanning-tree vlan 1 — the blocked port" open="true" >}}
```
SW3#show spanning-tree vlan 1

VLAN0001
  Root ID    Priority    32769
             Address     0001.0001.0A00
             Cost        4
             Port        2 (GigabitEthernet0/2)

  Bridge ID  Priority    32769  (priority 32768 sys-id-ext 1)
             Address     0003.0003.0C00

Interface        Role Sts Cost      Prio.Nbr Type
---------------- ---- --- --------- -------- ----
Gi0/2            Root FWD 4         128.2    P2p
Gi0/3            Altn BLK 4         128.3    P2p
```

`Gi0/3` is `Altn BLK` — alternate, blocking. Reason it out:

- **SW3's root port** is Gi0/2, direct to SW1, cost 4. Gi0/3 reaches the root via SW2 at cost 8. Higher, so Gi0/3 is not the root port.
- **The SW2–SW3 segment** needs one designated port. Both switches have root path cost 4, so cost does not decide. Tiebreaker 2: lowest sender bridge ID. SW2 is `0002.0002.0B00`, SW3 is `0003.0003.0C00`. **SW2 wins**, so SW2's Gi0/3 is designated.
- SW3's Gi0/3 is neither root nor designated, so it **blocks**.

The triangle is now a tree: SW1 at the top, SW2 and SW3 hanging off it, and the SW2–SW3 link idle until something fails.

Confirm the whole picture in one command from any switch:

```
SW3#show spanning-tree vlan 1 detail | include from|BPDU
   Port path cost 4, Port priority 128, Port Identifier 128.3
   Designated bridge has priority 32769, address 0002.0002.0B00
   BPDU: sent 1, received 842
```

`Designated bridge has priority ... address 0002.0002.0B00` — the port is telling you outright that SW2 won this segment. `BPDU: sent 1, received 842` is the signature of a blocking port: it listens and does not speak.
{{< /verify >}}

---

## Part 3 — Convergence

{{< step num="2" dev="—" title="The port states and what they cost you" >}}
Classic 802.1D moves a port through four states before it forwards:

| State | Duration | Learns MACs | Forwards | Purpose |
|---|---|---|---|---|
| Blocking | — | no | no | receives BPDUs only |
| Listening | 15 s (forward delay) | no | no | works out roles |
| Learning | 15 s (forward delay) | **yes** | no | populates the MAC table |
| Forwarding | — | yes | yes | normal |
| Disabled | — | no | no | shut down |

**30 seconds** from blocking to forwarding on a direct link, and up to **50 seconds** (20 s max age + 15 + 15) when the failure is indirect and the switch has to wait for the current root information to expire.

Fifty seconds is an eternity. It is the entire reason Rapid STP exists (Lab 12), and the reason PortFast exists for host ports — a PC does not need thirty seconds of loop prevention.

The three timers, all set on the **root bridge** and propagated in its BPDUs:

- **Hello** 2 s — how often the root originates BPDUs
- **Max Age** 20 s — how long to keep root information without a refresh
- **Forward Delay** 15 s — the length of listening, and of learning
{{< /step >}}

{{< verify dev="SW3" cmd="watch a failover" open="true" >}}
Break SW3's root port and watch the blocked port take over:

```
SW3(config)#interface GigabitEthernet0/2
SW3(config-if)#shutdown
```

Immediately:

```
SW3#show spanning-tree vlan 1 | begin Interface
Interface        Role Sts Cost      Prio.Nbr Type
---------------- ---- --- --------- -------- ----
Gi0/3            Root LSN 4         128.3    P2p
```

`LSN` — listening. Wait fifteen seconds:

```
Gi0/3            Root LRN 4         128.3    P2p
```

`LRN` — learning. Fifteen more:

```
Gi0/3            Root FWD 8         128.3    P2p
```

Forwarding, and note the **cost is now 8** — the path is SW3 → SW2 → SW1, two gigabit hops. The root port moved and the cost went up, which is exactly what a correct failover looks like.

Time it with a continuous ping from a host on SW3 to one on SW1 and count the dropped replies. Roughly thirty of them. Restore:

```
SW3(config-if)#no shutdown
```

And watch the reverse: the port comes back, cost drops to 4, and Gi0/3 returns to blocking.
{{< /verify >}}

{{< verify dev="SW1" cmd="show spanning-tree summary" >}}
The whole-switch overview, useful when there are many VLANs:

```
SW1#show spanning-tree summary
Switch is in pvst mode
Root bridge for: VLAN0001, VLAN0010, VLAN0020
Extended system ID           is enabled
Portfast Default             is disabled
PortFast BPDU Guard Default  is disabled
Loopguard Default            is disabled
UplinkFast                   is disabled
BackboneFast                 is disabled

Name                   Blocking Listening Learning Forwarding STP Active
---------------------- -------- --------- -------- ---------- ----------
VLAN0001                      0         0        0          2          2
VLAN0010                      0         0        0          2          2
VLAN0020                      0         0        0          2          2
---------------------- -------- --------- -------- ---------- ----------
3 vlans                       0         0        0          6          6
```

`Root bridge for:` on the switch you *intended* to be root, and zero ports in Blocking on that switch. A column of ports stuck in Listening or Learning for more than thirty seconds means the topology is still churning — usually a flapping link.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Network saturated, switches unresponsive | Layer 2 loop — STP disabled or BPDUs filtered | console in; `show spanning-tree` |
| Traffic takes an odd path | the oldest switch won the root election | `show spanning-tree root` |
| 30–50 s outage on every topology change | classic 802.1D timers | move to RSTP (Lab 12) |
| Host waits 30 s for DHCP | no PortFast on the access port | `show spanning-tree interface <int> portfast` |
| MAC table flapping between ports | loop, or a duplicated MAC | `show mac address-table address <mac>` |
| Port blocks and you cannot see why | tiebreaker on the **neighbour's** bridge/port ID | `show spanning-tree detail` — read "Designated bridge" |

## Exam notes

- Bridge ID = 4-bit **priority** + 12-bit **extended system ID (VLAN)** + 6-byte **MAC**. Priority default 32768, so VLAN 1 shows 32769.
- Election: **lowest bridge ID**. Priority first, then lowest MAC.
- Costs (802.1D-2004): 10M = 100, 100M = 19, 1G = **4**, 10G = 2. Cost accumulates on **incoming** BPDUs.
- One **root port per non-root switch**; one **designated port per segment**; the rest block. The root bridge has only designated ports.
- Tiebreakers in order: root path cost → sender bridge ID → sender port priority → sender port ID.
- States: blocking → listening (15 s) → learning (15 s) → forwarding. Up to **50 s** total after an indirect failure.
- Timers are configured on the **root** and carried in its BPDUs.
- PVST+ runs one instance per VLAN, which is why the extended system ID exists.

---

*Sources: Jeremy's IT Lab Day 20 · Flackbox CCNA Lab Guide 25-1 · verified in Packet Tracer 8.2.*
