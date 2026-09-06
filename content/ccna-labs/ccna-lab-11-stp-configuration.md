---
title: "Lab 11 · Configuring Spanning Tree"
date: 2026-09-06
description: "Put the root bridge where you want it, steer traffic with port cost, and add the four protection features that keep an access port from taking down the campus."
tags: ["CCNA", "STP", "PortFast", "BPDU Guard", "Lab"]
categories: ["CCNA"]
domain: 2
tool: "Packet Tracer"
duration: "45 min"
sources: "Jeremy's IT Lab Day 21 · Flackbox 25-2"
aliases: ["/ccna-labs/ccna-lab-25b-stp-config/"]
---

Lab 10 let spanning tree elect a root on its own and it picked the oldest switch in the room. That is the default behaviour and it is never the right answer: the root should be the device with the most bandwidth and the best position in the topology, chosen by you and written down.

This lab sets the root deliberately, biases a path with port cost, and then adds the protection features — because a correctly built spanning tree is still one unplugged cable and one cheap desk switch away from an outage.

## Topology

{{< topology cols="3" rows="3" caption="Two distribution switches and an access switch — root and secondary root by design" >}}
switch DSW1 "primary root" at 0,0
switch DSW2 "secondary root" at 2,0
switch ASW1 "access" at 1,2
pc     PC1 "" at 0,2

DSW1 — DSW2 label="Gi0/1"
DSW1 — ASW1 label="Gi0/2"
DSW2 — ASW1 label="Gi0/2"
ASW1 — PC1
{{< /topology >}}

## Objectives

- Set the root bridge with `spanning-tree vlan ... root primary` and with an explicit priority, and know what each really does
- Configure a secondary root and verify it takes over
- Influence a path with port cost and with port priority, and know which applies where
- Configure PortFast, BPDU Guard, Root Guard and Loop Guard, and say which threat each answers
- Recover a port from err-disabled, manually and automatically

---

## Part 1 — Choosing the root

{{< step num="1" dev="DSW1" title="Two ways to become root, and the difference between them" open="true" >}}
The macro:

```
DSW1(config)#spanning-tree vlan 1,10,20 root primary
```

The explicit form:

```
DSW1(config)#spanning-tree vlan 1,10,20 priority 4096
```

They are not the same command in disguise. `root primary` is a **one-shot macro**: IOS looks at the current root's priority and writes a value low enough to beat it — 24576 if the current root is at the default 32768, or `current − 4096` if it is already lower. What lands in `running-config` is a plain `priority` statement:

```
DSW1#show running-config | include spanning-tree vlan
spanning-tree vlan 1,10,20 priority 24576
```

The macro does not re-evaluate later. Add a switch tomorrow with priority 8192 and DSW1 quietly stops being root, with nothing in the configuration to explain why.

**Set the priority explicitly.** A convention that survives contact with reality:

| Role | Priority |
|---|---|
| Primary root | 4096 |
| Secondary root | 8192 |
| Everything else | 32768 (default) |

Priority must be a multiple of **4096** — the low 12 bits of the bridge ID belong to the extended system ID:

```
DSW1(config)#spanning-tree vlan 1 priority 4097
% Bridge Priority must be in increments of 4096.
```
{{< /step >}}

{{< step num="2" dev="DSW2" title="Secondary root — the one that takes over" >}}
```
DSW2(config)#spanning-tree vlan 1,10,20 priority 8192
DSW2(config)#end
```

Lower than the default 32768, higher than DSW1's 4096. While DSW1 is alive it loses; when DSW1 fails it wins the re-election immediately, and the new topology is the one you planned rather than whichever switch happened to have the lowest MAC.

In a multi-VLAN network you can also split the load — make DSW1 root for the odd VLANs and DSW2 root for the even ones, so both uplinks carry traffic instead of one sitting blocked:

```
DSW1(config)#spanning-tree vlan 10 priority 4096
DSW1(config)#spanning-tree vlan 20 priority 8192
DSW2(config)#spanning-tree vlan 10 priority 8192
DSW2(config)#spanning-tree vlan 20 priority 4096
```

This is the standard PVST+ load-sharing design and it is only possible because PVST+ runs an independent spanning tree per VLAN.
{{< /step >}}

{{< verify dev="DSW1" cmd="show spanning-tree root" open="true" >}}
The fastest check — one line per VLAN, showing who the root is and how to get there:

```
DSW1#show spanning-tree root

                                        Root    Hello Max Fwd
Vlan                   Root ID          Cost    Time  Age Dly  Root Port
---------------- -------------------- --------- ----- --- ---  ----------
VLAN0001         4097 0001.0001.0A00           0    2   20  15
VLAN0010         4106 0001.0001.0A00           0    2   20  15
VLAN0020         8212 0002.0002.0B00           4    2   20  15  Gi0/1
```

Root cost **0** and no root port means *this switch is the root*. VLAN 20 shows cost 4 and a root port, so DSW2 is root there — the load-sharing design working as intended.

Read the priorities back out of the Root ID: `4097` = 4096 + 1 (VLAN 1), `4106` = 4096 + 10, `8212` = 8192 + 20. The extended system ID is always the VLAN number.
{{< /verify >}}

---

## Part 2 — Steering a path

{{< step num="3" dev="ASW1" title="Port cost changes which port is the root port" >}}
ASW1 has two equal-cost paths to the root. Cost 4 via Gi0/2 to DSW1, cost 4+4=8 via DSW2 — so Gi0/2 wins on cost already. To force the other path:

```
ASW1(config)#interface GigabitEthernet0/2
ASW1(config-if)#spanning-tree vlan 1 cost 100
ASW1(config-if)#end
```

Now Gi0/2 costs 100 and the DSW2 path costs 8, so the root port moves. `spanning-tree cost` without `vlan` applies to every VLAN; with it, only that one.

The rule for which lever to reach for:

- **Port cost** decides a port's own path to the root. It affects **this** switch's root port choice. Use it when two paths from one switch have equal cost.
- **Port priority** breaks a tie between two ports on the **same neighbour** — most commonly two parallel links between the same pair of switches. It is read by the *downstream* switch, so it must be set on the **upstream** one.

```
DSW1(config)#interface GigabitEthernet0/2
DSW1(config-if)#spanning-tree vlan 1 port-priority 64
```

Port priority defaults to 128 and moves in increments of 16. Setting it on ASW1 would do nothing for ASW1's own root port choice — that is the part people get wrong.

Undo the cost change before moving on:

```
ASW1(config)#interface GigabitEthernet0/2
ASW1(config-if)#no spanning-tree vlan 1 cost
```
{{< /step >}}

{{< verify dev="ASW1" cmd="show spanning-tree vlan 1" >}}
```
ASW1#show spanning-tree vlan 1 | begin Interface
Interface        Role Sts Cost      Prio.Nbr Type
---------------- ---- --- --------- -------- ----
Gi0/1            Altn BLK 4         128.1    P2p
Gi0/2            Root FWD 4         128.2    P2p
Fa0/1            Desg FWD 19        128.3    P2p Edge
```

Gi0/2 is the root port toward DSW1, Gi0/1 blocks toward DSW2, and the host port is designated. `Edge` on Fa0/1 is PortFast, configured next.
{{< /verify >}}

---

## Part 3 — Protection

{{< step num="4" dev="ASW1" title="PortFast and BPDU Guard — always together" open="true" >}}
```
ASW1(config)#interface range FastEthernet0/1 - 24
ASW1(config-if-range)#switchport mode access
ASW1(config-if-range)#spanning-tree portfast
ASW1(config-if-range)#spanning-tree bpduguard enable
ASW1(config-if-range)#end
```

**PortFast** takes an access port straight to forwarding, skipping listening and learning. A host saves thirty seconds, which matters because DHCP and PXE both time out inside that window.

The warning IOS prints is the important part:

```
%Warning: portfast should only be enabled on ports connected to a single
host. Connecting hubs, concentrators, switches, bridges, etc... to this
interface when portfast is enabled, can cause temporary bridging loops.
```

A PortFast port forwards immediately. Plug a switch into it and you have a loop that forwards for the thirty seconds STP would otherwise have used to prevent it.

**BPDU Guard** is the answer. If a BPDU ever arrives on a PortFast port — which it should not, since hosts do not send BPDUs — the port goes straight to **err-disabled**:

```
%SPANTREE-2-BLOCK_BPDUGUARD: Received BPDU on port FastEthernet0/5 with BPDU Guard enabled. Disabling port.
%PM-4-ERR_DISABLE: bpduguard error detected on Fa0/5, putting Fa0/5 in err-disable state
```

The port is shut and stays shut. Loud, immediate, and vastly preferable to a silent loop.

Set both as switch-wide defaults so a new port is protected without anyone remembering:

```
ASW1(config)#spanning-tree portfast default
ASW1(config)#spanning-tree portfast bpduguard default
```

These apply to access ports only; a trunk is unaffected.
{{< /step >}}

{{< step num="5" dev="ASW1" title="Recovering an err-disabled port" >}}
Find it:

```
ASW1#show interfaces status err-disabled

Port      Name               Status       Reason               Err-disabled Vlans
Fa0/5     ## desk 14 ##      err-disabled bpduguard
```

Manual recovery — shut and no shut, in that order:

```
ASW1(config)#interface FastEthernet0/5
ASW1(config-if)#shutdown
ASW1(config-if)#no shutdown
```

`no shutdown` alone does nothing on an err-disabled port. The `shutdown` is what clears the error state.

Automatic recovery, which you want on a large access layer:

```
ASW1(config)#errdisable recovery cause bpduguard
ASW1(config)#errdisable recovery cause psecure-violation
ASW1(config)#errdisable recovery interval 300
```

The port is re-enabled after five minutes, and if the cause is still present it errs again. That turns a permanent outage into a five-minute one while still making the problem visible.

```
ASW1#show errdisable recovery
ErrDisable Reason          Timer Status
-----------------          --------------
bpduguard                  Enabled
psecure-violation          Enabled
link-flap                  Disabled

Timer interval: 300 seconds
```
{{< /step >}}

{{< step num="6" dev="DSW1" title="Root Guard and Loop Guard — the two subtler ones" >}}
**Root Guard** protects the *topology*. On a designated port facing the access layer, it says "a root bridge may not appear over there". If a superior BPDU arrives, the port goes to `root-inconsistent` and stops forwarding until the BPDUs stop:

```
DSW1(config)#interface GigabitEthernet0/2
DSW1(config-if)#spanning-tree guard root
DSW1(config-if)#end
```

```
%SPANTREE-2-ROOTGUARD_BLOCK: Root guard blocking port GigabitEthernet0/2 on VLAN0001.
```

The threat it answers: someone plugs a switch with priority 0 into an access port — deliberately or because it came out of a lab — and the root moves to a desk under a stairwell, dragging the whole campus's traffic with it. Root Guard makes that impossible without disabling the port entirely, and it recovers on its own once the superior BPDUs stop.

**Loop Guard** protects against the opposite failure: BPDUs *stopping* when they should not. A blocking port that stops hearing BPDUs assumes the far end is gone and transitions to forwarding — creating the loop STP exists to prevent. That happens with unidirectional fibre faults and with software bugs.

```
DSW1(config)#spanning-tree loopguard default
```

Instead of forwarding, a loop-guard port goes `loop-inconsistent` and stays blocked. It recovers automatically when BPDUs return.

The four features, side by side:

| Feature | Where | Trigger | Result | Recovery |
|---|---|---|---|---|
| **PortFast** | access ports | — | skip listening/learning | — |
| **BPDU Guard** | PortFast ports | any BPDU received | err-disabled | manual or timer |
| **Root Guard** | designated ports facing downstream | **superior** BPDU | root-inconsistent | automatic |
| **Loop Guard** | root and alternate ports | BPDUs **stop** arriving | loop-inconsistent | automatic |

BPDU Guard and Root Guard are mutually exclusive on a port and answer opposite questions: BPDU Guard says "no BPDUs at all here", Root Guard says "BPDUs are fine, but not *better* ones".
{{< /step >}}

{{< verify dev="ASW1" cmd="show spanning-tree interface FastEthernet0/1 portfast" open="true" >}}
```
ASW1#show spanning-tree interface FastEthernet0/1 portfast
VLAN0010            enabled
```

And the switch-wide summary, which is where you audit all of it at once:

```
ASW1#show spanning-tree summary
Switch is in pvst mode
Root bridge for: none
Extended system ID           is enabled
Portfast Default             is enabled
PortFast BPDU Guard Default  is enabled
Loopguard Default            is disabled
UplinkFast                   is disabled

Name                   Blocking Listening Learning Forwarding STP Active
---------------------- -------- --------- -------- ---------- ----------
VLAN0001                      1         0        0          2          3
```

Check for inconsistent ports explicitly — they do not show up as errors anywhere else:

```
DSW1#show spanning-tree inconsistentports

Name                 Interface                Inconsistency
-------------------- ------------------------ ------------------
VLAN0001             GigabitEthernet0/2       Root Inconsistent

Number of inconsistent ports (segments) in the system : 1
```
{{< /verify >}}

{{< verify dev="ASW1" cmd="PortFast timing test" >}}
The measurable result. Shut a host port, start a continuous ping from the PC, and bring it back:

```
ASW1(config)#interface FastEthernet0/1
ASW1(config-if)#shutdown
ASW1(config-if)#no shutdown
```

**Without PortFast:** roughly 30 seconds of `Request timed out` before the first reply.
**With PortFast:** one or two drops.

That is the entire justification for the feature, and it is why a user complaining that "the network takes ages after I reboot" is usually a missing PortFast rather than anything to do with DHCP.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Root moved unexpectedly | a switch with a lower priority joined | `show spanning-tree root`; add Root Guard |
| `% Bridge Priority must be in increments of 4096` | priority not a multiple of 4096 | round it |
| Port err-disabled after plugging in a switch | BPDU Guard fired | `show interfaces status err-disabled` |
| `no shutdown` will not revive a port | err-disabled needs `shutdown` first | shut, then no shut |
| Port shows `root-inconsistent` | Root Guard saw a superior BPDU | `show spanning-tree inconsistentports` |
| Loop after a fibre fault | unidirectional link, BPDUs stopped | enable Loop Guard (and UDLD) |
| Host waits 30 s for an address | no PortFast | `show spanning-tree interface <int> portfast` |
| `root primary` stopped working | it is a one-shot macro, not a policy | set `priority` explicitly |

## Exam notes

- Priority must be a **multiple of 4096**; default 32768. Convention: root 4096, secondary 8192.
- `root primary` / `root secondary` are **macros** that write a priority once and never re-evaluate.
- **Port cost** influences this switch's root port. **Port priority** breaks ties between parallel links and is read by the **downstream** switch, so set it upstream.
- PortFast skips listening and learning; **always pair it with BPDU Guard**.
- BPDU Guard → err-disabled on any BPDU. Root Guard → root-inconsistent on a **superior** BPDU. Loop Guard → loop-inconsistent when BPDUs **stop**.
- Root Guard and Loop Guard recover automatically; BPDU Guard needs `shutdown`/`no shutdown` or `errdisable recovery`.
- PVST+ per-VLAN roots allow load sharing across redundant uplinks.

---

*Sources: Jeremy's IT Lab Day 21 · Flackbox CCNA Lab Guide 25-2 · verified in Packet Tracer 8.2.*
