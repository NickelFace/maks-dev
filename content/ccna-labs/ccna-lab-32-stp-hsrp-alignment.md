---
title: "Lab 32 · Aligning STP and HSRP"
date: 2026-09-06
description: "When the spanning tree root and the HSRP active router are different switches, every packet takes an extra hop across the distribution link — here is how to see it and fix it."
tags: ["CCNA", "STP", "HSRP", "LAN Design", "Lab"]
categories: ["CCNA"]
domain: 2
tool: "Packet Tracer"
duration: "40 min"
sources: "Jeremy's IT Lab Day 52"
---

Spanning tree and HSRP are configured separately, by different commands, often on different days. Nothing forces them to agree — and when they disagree the network still works, which is why the fault survives for years.

The symptom is subtle: traffic leaving an access switch takes the STP path to one distribution switch, discovers the HSRP active gateway is the *other* one, and crosses the inter-distribution link to get there. Every packet, every flow, permanently. It is a design fault, not a failure, and this lab makes it visible.

## Topology

The standard two-tier campus block.

{{< topology cols="3" rows="3" caption="Two distribution switches, two access switches — root and active gateway must be the same box per VLAN" >}}
switch DSW1 "root + HSRP active" at 0,0
switch DSW2 "secondary + standby" at 2,0
switch ASW1 "" at 0,2
switch ASW2 "" at 2,2

DSW1 — DSW2 label="Po1 · trunk"
DSW1 — ASW1
DSW1 — ASW2
DSW2 — ASW1
DSW2 — ASW2
{{< /topology >}}

| VLAN | Subnet | HSRP VIP | Intended root + active |
|---|---|---|---|
| 10 | 10.0.10.0/24 | 10.0.10.1 | DSW1 |
| 20 | 10.0.20.0/24 | 10.0.20.1 | DSW2 |

## Objectives

- Explain why the STP root and the HSRP active router should be the same device
- Trace the extra hop that results when they are not
- Configure per-VLAN alignment so both VLANs use both uplinks
- Verify alignment with two commands and read the result
- Relate the design to the hierarchical access / distribution / core model

---

## Part 1 — The misalignment

{{< step num="1" dev="DSW1, DSW2" title="Configure them out of step, deliberately" open="true" >}}
STP: DSW1 is root for both VLANs.

```
DSW1(config)#spanning-tree mode rapid-pvst
DSW1(config)#spanning-tree vlan 10,20 priority 4096
```

```
DSW2(config)#spanning-tree mode rapid-pvst
DSW2(config)#spanning-tree vlan 10,20 priority 8192
```

HSRP: DSW2 is active for both VLANs.

```
DSW1(config)#interface Vlan10
DSW1(config-if)#ip address 10.0.10.2 255.255.255.0
DSW1(config-if)#standby version 2
DSW1(config-if)#standby 10 ip 10.0.10.1
DSW1(config-if)#standby 10 priority 100
DSW1(config-if)#standby 10 preempt
```

```
DSW2(config)#interface Vlan10
DSW2(config-if)#ip address 10.0.10.3 255.255.255.0
DSW2(config-if)#standby version 2
DSW2(config-if)#standby 10 ip 10.0.10.1
DSW2(config-if)#standby 10 priority 110
DSW2(config-if)#standby 10 preempt
```

Both configurations are individually correct. Together they are wrong.
{{< /step >}}

{{< step num="2" dev="—" title="Trace a packet and count the hops" >}}
A host on ASW1 in VLAN 10 sends a packet to the internet.

1. It goes to its default gateway, `10.0.10.1` — the HSRP virtual IP, owned by **DSW2**.
2. ASW1 looks up the virtual MAC in its VLAN 10 table. The frame must leave via a **forwarding** port.
3. ASW1's uplink to DSW2 is **blocked by spanning tree**, because DSW1 is the root and the DSW1 uplink is the root port.
4. So the frame goes **up to DSW1**.
5. DSW1 is not the HSRP active router. It forwards the frame **across the inter-distribution link** to DSW2.
6. DSW2 routes it.

**Three hops where two would do**, on every single packet in VLAN 10.

The consequences compound:

- The inter-distribution link carries all of VLAN 10's northbound traffic, which it was not sized for
- Latency is higher by one switch hop
- A failure of the DSW1–DSW2 link breaks VLAN 10 entirely, even though both distribution switches are healthy
- One of the two access uplinks is idle while the other is oversubscribed

None of this shows up as an error. Every `show` command reports a healthy network.
{{< /step >}}

{{< verify dev="ASW1" cmd="show spanning-tree vlan 10 and show standby brief" open="true" >}}
The two commands that expose it, run side by side:

```
ASW1#show spanning-tree vlan 10 | include Root ID|Address|Gi0
  Root ID    Priority    4106
             Address     0001.0001.0A00        ← DSW1
Gi0/1            Root FWD 4         128.1    P2p    ← toward DSW1
Gi0/2            Altn BLK 4         128.2    P2p    ← toward DSW2, blocked
```

```
DSW2#show standby brief
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Vl10        10   110 P Active  local           10.0.10.2       10.0.10.1
```

**Root is DSW1. HSRP active is DSW2.** Different boxes, and the forwarding path proves it: ASW1's only forwarding uplink goes to the switch that is *not* the gateway.

That is the whole diagnosis, in two commands. Run them for every VLAN on every access switch during a design review and the misalignment is either there or it is not.
{{< /verify >}}

---

## Part 2 — Align them

{{< step num="3" dev="DSW1" title="Root and active on the same switch, per VLAN" open="true" >}}
```
DSW1(config)#spanning-tree vlan 10 priority 4096
DSW1(config)#spanning-tree vlan 20 priority 8192
DSW1(config)#interface Vlan10
DSW1(config-if)#standby 10 priority 110
DSW1(config-if)#standby 10 preempt
DSW1(config-if)#exit
DSW1(config)#interface Vlan20
DSW1(config-if)#ip address 10.0.20.2 255.255.255.0
DSW1(config-if)#standby version 2
DSW1(config-if)#standby 20 ip 10.0.20.1
DSW1(config-if)#standby 20 priority 90
DSW1(config-if)#standby 20 preempt
DSW1(config-if)#end
```
{{< /step >}}

{{< step num="4" dev="DSW2" title="The mirror image" >}}
```
DSW2(config)#spanning-tree vlan 10 priority 8192
DSW2(config)#spanning-tree vlan 20 priority 4096
DSW2(config)#interface Vlan10
DSW2(config-if)#standby 10 priority 90
DSW2(config-if)#standby 10 preempt
DSW2(config-if)#exit
DSW2(config)#interface Vlan20
DSW2(config-if)#ip address 10.0.20.3 255.255.255.0
DSW2(config-if)#standby version 2
DSW2(config-if)#standby 20 ip 10.0.20.1
DSW2(config-if)#standby 20 priority 110
DSW2(config-if)#standby 20 preempt
DSW2(config-if)#end
```

The design in one table:

| VLAN | STP root | STP secondary | HSRP active | HSRP standby |
|---|---|---|---|---|
| **10** | **DSW1** (4096) | DSW2 (8192) | **DSW1** (110) | DSW2 (90) |
| **20** | **DSW2** (4096) | DSW1 (8192) | **DSW2** (110) | DSW1 (90) |

Read down the columns: **root and active are the same switch on every row.** That is the rule, and it is the only thing this lab is really about.

Splitting the VLANs across the two switches is the second half of the design. VLAN 10 uses the DSW1 uplink, VLAN 20 uses the DSW2 uplink, both are carrying production traffic, and either switch failing leaves the other holding both VLANs. Put both VLANs on DSW1 and one uplink is permanently idle.

Track the northbound uplink so the gateway follows the path out (Lab 18):

```
DSW1(config)#track 1 interface GigabitEthernet0/24 line-protocol
DSW1(config)#interface Vlan10
DSW1(config-if)#standby 10 track 1 decrement 30
```

Priority falls from 110 to 80, below DSW2's 90, so the gateway moves when DSW1 loses its path to the core. Without tracking, DSW1 stays the active gateway with nowhere to forward to.
{{< /step >}}

{{< verify dev="DSW1, DSW2" cmd="show spanning-tree root and show standby brief" open="true" >}}
```
DSW1#show spanning-tree root

                                        Root    Hello Max Fwd
Vlan                   Root ID          Cost    Time  Age Dly  Root Port
---------------- -------------------- --------- ----- --- ---  ----------
VLAN0010         4106 0001.0001.0A00           0    2   20  15
VLAN0020         4116 0002.0002.0B00           4    2   20  15  Po1
```

VLAN 10: cost 0, no root port — **DSW1 is the root**. VLAN 20: cost 4 via Po1 — DSW2 is the root.

```
DSW1#show standby brief
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Vl10        10   110 P Active  local           10.0.10.3       10.0.10.1
Vl20        20   90  P Standby 10.0.20.3       local           10.0.20.1
```

VLAN 10 **Active** on DSW1, VLAN 20 **Standby**. Compare against the STP output above: root and active match on both rows.

And on DSW2, the mirror:

```
DSW2#show standby brief
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Vl10        10   90  P Standby 10.0.10.2       local           10.0.10.1
Vl20        20   110 P Active  local           10.0.20.2       10.0.20.1
```

Two commands per switch, four lines to read. Make this part of every distribution-layer build check.
{{< /verify >}}

{{< verify dev="ASW1" cmd="show spanning-tree vlan 10 / vlan 20 — both uplinks in use" >}}
```
ASW1#show spanning-tree vlan 10 | include Gi0
Gi0/1            Root FWD 4         128.1    P2p    ← to DSW1
Gi0/2            Altn BLK 4         128.2    P2p

ASW1#show spanning-tree vlan 20 | include Gi0
Gi0/1            Altn BLK 4         128.1    P2p
Gi0/2            Root FWD 4         128.2    P2p    ← to DSW2
```

**VLAN 10 forwards up the left uplink, VLAN 20 up the right.** Both physical links carry traffic; neither is idle. And in each case the forwarding uplink terminates on the switch that is also the HSRP active gateway for that VLAN — no hop across the distribution link.

Prove it with a traceroute from a VLAN 10 host:

```
PC> tracert 8.8.8.8
  1   0 ms   0 ms   0 ms   10.0.10.1
  2   1 ms   1 ms   1 ms   10.0.99.1
```

Two hops out of the block. Before the fix there would have been the same two — the extra hop is at Layer 2 and invisible to traceroute, which is precisely why the fault is so persistent. `show spanning-tree` and `show standby` are the only tools that reveal it.
{{< /verify >}}

---

## Part 3 — The design this sits inside

{{< step num="5" dev="—" title="Access, distribution, core — and where each feature belongs" >}}
| Layer | Job | What runs here |
|---|---|---|
| **Access** | connect end devices | access ports, PortFast, BPDU Guard, port security, voice VLAN, PoE |
| **Distribution** | aggregate access, route between VLANs | **SVIs, HSRP, STP root**, ACLs, route summarisation |
| **Core** | fast transit between distribution blocks | Layer 3 only, no policy, no filtering |

**The distribution layer is the boundary between Layer 2 and Layer 3.** VLANs terminate there; the core is routed. That is why the STP root and the HSRP active gateway both belong on distribution switches, and why aligning them is a distribution-layer concern.

A **collapsed core** merges core and distribution into one pair, which is correct for anything smaller than a multi-building campus. The three-tier model earns its extra layer when you have enough distribution blocks that meshing them directly becomes unmanageable.

The modern alternatives to this whole arrangement:

**Routed access** pushes Layer 3 down to the access switch. Each access switch is its own routed island, VLANs do not span switches, and there is no spanning tree between access and distribution and no FHRP at all. Convergence is a routing protocol's, measured in hundreds of milliseconds, and this entire class of misalignment cannot occur.

**StackWise / VSS / vPC** makes the two distribution switches appear as one logical device. The access switch then has a single EtherChannel to what looks like one switch, spanning tree has nothing to block, and there is one gateway rather than an active/standby pair.

Both remove the problem rather than managing it. The CCNA blueprint tests the classic design, and it remains what you will find in most existing networks — which is where you will meet the misalignment.
{{< /step >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Inter-distribution link unexpectedly busy | root and HSRP active on different switches | `show spanning-tree root` + `show standby brief` |
| One access uplink idle, the other saturated | all VLANs rooted on one switch | `show spanning-tree vlan <n>` per VLAN |
| VLAN fails when the distribution link drops | traffic depended on that hop | align root and active |
| Gateway alive, no path to the core | HSRP not tracking the uplink | `show standby` — check for a track statement |
| Intended root is not root | a switch with a lower priority or older MAC | `show spanning-tree root` |
| Roles drift after a reboot | `preempt` missing | `show standby brief` — look for `P` |

## Exam notes

- **The STP root and the HSRP active router should be the same switch, per VLAN.** Misalignment adds a hop across the distribution link for every packet.
- Verify with **`show spanning-tree root`** and **`show standby brief`** together.
- Split VLANs across the two distribution switches so both uplinks carry traffic and either can take over.
- HSRP **`preempt`** is required for the intended switch to resume after a failure; **tracking** is required so a dead uplink moves the gateway.
- The **distribution layer** is the Layer 2 / Layer 3 boundary and hosts the SVIs, the FHRP and the STP root.
- **Collapsed core** merges core and distribution — correct below campus scale.
- **Routed access** removes STP and FHRP from the equation entirely by pushing Layer 3 to the access switch.

---

*Sources: Jeremy's IT Lab Day 52 · verified in Packet Tracer 8.2.*
