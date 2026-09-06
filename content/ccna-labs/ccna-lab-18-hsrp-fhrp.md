---
title: "Lab 18 · HSRP and First Hop Redundancy"
date: 2026-09-06
description: "One virtual IP, two routers, and a failover the hosts never notice — plus the interface tracking that stops the active router keeping a gateway it can no longer reach."
tags: ["CCNA", "HSRP", "FHRP", "Redundancy", "Lab"]
categories: ["CCNA"]
domain: 3
tool: "Packet Tracer"
duration: "45 min"
sources: "Jeremy's IT Lab Day 29 · Flackbox 24-1"
aliases: ["/ccna-labs/ccna-lab-24-hsrp/"]
---

A host knows exactly one way off its subnet: the single IP address configured as its default gateway. Every routing protocol, every redundant uplink, every EtherChannel in the building is irrelevant to a PC whose gateway has stopped answering.

First Hop Redundancy Protocols close that gap by putting a **virtual IP and a virtual MAC** on the segment, owned by whichever router is currently healthy. The host is configured once and never learns that anything moved.

## Topology

{{< topology cols="3" rows="4" caption="Two gateways sharing 10.0.10.1 — hosts point at the virtual address" >}}
cloud  ISP "" at 1,0
router R1 "10.0.10.2 · active" at 0,1
router R2 "10.0.10.3 · standby" at 2,1
switch SW1 "" at 1,2
pc     PC1 "GW 10.0.10.1" at 1,3

R1 — SW1
R2 — SW1
SW1 — PC1
R1 — ISP label="uplink"
R2 — ISP label="uplink"
{{< /topology >}}

| Device | Real IP | HSRP VIP | Priority |
|---|---|---|---|
| R1 | 10.0.10.2/24 | 10.0.10.1 | 110 (preempt) |
| R2 | 10.0.10.3/24 | 10.0.10.1 | 100 (default) |
| PC1 | 10.0.10.50/24 | gateway 10.0.10.1 | — |

## Objectives

- Configure HSRPv2 on two routers sharing a virtual IP and MAC
- Set priority and preemption so the intended router is active and takes back over after a failure
- Read the virtual MAC and explain how the failover is invisible to the hosts
- Configure interface tracking so a dead uplink triggers a failover
- Compare HSRP, VRRP and GLBP and know which numbers belong to which

---

## Part 1 — Basic HSRP

{{< step num="1" dev="R1" title="The intended active router" open="true" >}}
```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#description ## LAN 10.0.10.0/24 ##
R1(config-if)#ip address 10.0.10.2 255.255.255.0
R1(config-if)#no shutdown
R1(config-if)#standby version 2
R1(config-if)#standby 10 ip 10.0.10.1
R1(config-if)#standby 10 priority 110
R1(config-if)#standby 10 preempt
R1(config-if)#standby 10 name LAN10-GW
R1(config-if)#end
```

Line by line:

**`standby version 2`** — configure this **first**, before anything else in the group. Changing the version resets the group, so setting it afterwards drops the adjacency. Version 2 supports group numbers 0–4095 (v1 stops at 255), uses multicast 224.0.0.102 instead of 224.0.0.2, and includes the router's IPv6 capability. Use v2 unless something forces otherwise.

**`standby 10 ip 10.0.10.1`** — group 10, virtual IP 10.0.10.1. The VIP must be in the same subnet as the interface and must not be assigned to any real interface. **Match the group number to the VLAN number** — it is not required, but on a switch with twenty SVIs it is the difference between a readable config and a puzzle.

**`standby 10 priority 110`** — highest priority wins the election. Default is 100; if all routers are equal, the **highest interface IP address** breaks the tie.

**`standby 10 preempt`** — without this, a router that comes back after a failure stays standby forever. HSRP is non-preemptive by default, exactly like the OSPF DR election. Whether you want preemption is a design decision: with it, the intended router always resumes and you get one extra failover event as it does; without it, the roles drift and nobody can predict which router is active.

**`standby 10 name`** is cosmetic and worth having in the output.
{{< /step >}}

{{< step num="2" dev="R2" title="The standby router — same VIP, lower priority" >}}
```
R2(config)#interface GigabitEthernet0/0
R2(config-if)#description ## LAN 10.0.10.0/24 ##
R2(config-if)#ip address 10.0.10.3 255.255.255.0
R2(config-if)#no shutdown
R2(config-if)#standby version 2
R2(config-if)#standby 10 ip 10.0.10.1
R2(config-if)#standby 10 priority 100
R2(config-if)#standby 10 preempt
R2(config-if)#standby 10 name LAN10-GW
R2(config-if)#end
```

Identical except the priority. The group number, the virtual IP and the version must all match — a mismatch means two routers both believe they are active, both answer ARP for the VIP, and the segment gets an intermittent, direction-dependent fault that is genuinely hard to diagnose.

Watch the election on the console:

```
%HSRP-5-STATECHANGE: GigabitEthernet0/0 Grp 10 state Speak -> Standby
%HSRP-5-STATECHANGE: GigabitEthernet0/0 Grp 10 state Standby -> Active
```

The state machine, in order: **Initial → Learn → Listen → Speak → Standby → Active**. A router stuck in Speak is not hearing its peer; a router stuck in Listen has a higher-priority peer and no preempt.
{{< /step >}}

{{< verify dev="R1" cmd="show standby" open="true" >}}
```
R1#show standby
GigabitEthernet0/0 - Group 10 (version 2)
  State is Active
    2 state changes, last state change 00:04:12
  Virtual IP address is 10.0.10.1
  Active virtual MAC address is 0000.0C9F.F00A
    Local virtual MAC address is 0000.0C9F.F00A (v2 default)
  Hello time 3 sec, hold time 10 sec
    Next hello sent in 1.216 secs
  Preemption enabled
  Active router is local
  Standby router is 10.0.10.3, priority 100 (expires in 8.912 sec)
  Priority 110 (configured 110)
  Group name is "LAN10-GW" (cfgd)
```

The single most important field is the **virtual MAC**, and it is worth decoding:

```
0000.0C9F.F00A
└──── ────┘└┘
  Cisco OUI  group 10 in hex (0x00A)
```

- **HSRPv1**: `0000.0C07.ACxx` where xx is the group in hex
- **HSRPv2**: `0000.0C9F.Fxxx` where xxx is the group in hex

This is the whole trick. The host ARPs for 10.0.10.1 **once**, caches `0000.0C9F.F00A`, and keeps using it. When R1 fails, R2 starts answering to that same MAC — the host's ARP cache is still correct, so no re-ARP, no timeout, no reconfiguration. The failover is invisible above Layer 2.

**Hello 3 s, hold 10 s** are the defaults. Failure detection therefore takes up to 10 seconds, which is a long outage for a voice call. Tune it if you need to:

```
R1(config-if)#standby 10 timers msec 250 msec 750
```

Sub-second, at the cost of more hellos and more sensitivity to transient loss. Both routers must agree, or use `standby 10 timers` on the active only and let it advertise them.
{{< /verify >}}

{{< verify dev="R2" cmd="show standby brief" >}}
The one-line-per-group form, which is what you actually use on a switch with many SVIs:

```
R2#show standby brief
                     P indicates configured to preempt.
                     |
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Gi0/0       10   100 P Standby 10.0.10.2       local           10.0.10.1
```

`P` for preempt, `Standby` for the state, and the addresses of both peers. On a distribution switch this is the daily health check — every group should show one Active and one Standby, and the Active column should hold the address you designed for.
{{< /verify >}}

{{< verify dev="PC1" cmd="arp -a — the virtual MAC in the host cache" open="true" >}}
```
PC> ping 10.0.10.1
Reply from 10.0.10.1: bytes=32 time<1ms TTL=255

PC> arp -a
  Internet Address      Physical Address      Type
  10.0.10.1             0000.0c9f.f00a        dynamic
```

The host has the **virtual** MAC, not R1's burned-in address. That is the confirmation that HSRP is doing its job — if the cache shows R1's real MAC, the host is pointed at R1 directly and will not survive a failover.

Check the switch too. The virtual MAC appears on whichever port leads to the active router:

```
SW1#show mac address-table address 0000.0c9f.f00a

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
  10    0000.0c9f.f00a    DYNAMIC     Gi0/1
```

On failover this entry moves to Gi0/2, because the new active router sends a **gratuitous ARP** the instant it takes over — which is what updates the switch's table without waiting for aging.
{{< /verify >}}

---

## Part 2 — Failover

{{< step num="3" dev="R1" title="Kill the active router and time the gap" >}}
Start a continuous ping from PC1 to something beyond the gateway, then:

```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#shutdown
```

R2's console:

```
%HSRP-5-STATECHANGE: GigabitEthernet0/0 Grp 10 state Standby -> Active
```

The ping drops for **up to 10 seconds** (the hold time), then resumes. The host never re-ARPed and its configuration never changed.

Bring R1 back:

```
R1(config-if)#no shutdown
```

```
%HSRP-5-STATECHANGE: GigabitEthernet0/0 Grp 10 state Listen -> Active
```

R1 preempts and reclaims Active because its priority is higher and `preempt` is configured. **Without `preempt`, R1 would sit in Listen indefinitely** while the lower-priority R2 stayed active — functional, but not the topology you designed, and nobody would notice until the second failure.

Add a delay so R1 does not grab the role before its routing protocols have converged:

```
R1(config-if)#standby 10 preempt delay minimum 60
```

Sixty seconds after the interface comes up before preemption is attempted. Without it, R1 becomes the active gateway while its OSPF adjacency is still forming and its routing table is empty — a textbook black hole that lasts exactly as long as convergence does.
{{< /step >}}

---

## Part 3 — Interface tracking

{{< step num="4" dev="R1" title="The failure HSRP does not see by itself" open="true" >}}
HSRP watches the **LAN** interface. If R1's LAN side is healthy but its **uplink** dies, R1 happily stays active — and forwards every packet from the LAN into a hole.

Tracking fixes it by decrementing the priority when a tracked interface goes down:

```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#standby 10 track GigabitEthernet0/1 20
R1(config-if)#end
```

R1's priority is 110. Lose Gi0/1 and it drops to **90**, below R2's 100, so R2 preempts and becomes active. The decrement value must be **large enough to cross the peer's priority** — that is the arithmetic people get wrong. Track with a decrement of 5 here and the priority falls to 105, still above 100, and nothing happens.

The modern form tracks an object rather than an interface, which lets you track reachability rather than link state:

```
R1(config)#track 1 interface GigabitEthernet0/1 line-protocol
R1(config)#interface GigabitEthernet0/0
R1(config-if)#standby 10 track 1 decrement 20
```

Objects can also track an IP SLA probe — pinging a target beyond the uplink — which catches the failure where the link stays up and the path beyond it does not. That is outside the CCNA blueprint but it is the reason tracked objects exist.
{{< /step >}}

{{< verify dev="R1" cmd="show standby — with tracking active" open="true" >}}
Break the uplink:

```
R1(config)#interface GigabitEthernet0/1
R1(config-if)#shutdown
```

```
R1#show standby GigabitEthernet0/0 10
GigabitEthernet0/0 - Group 10 (version 2)
  State is Standby
  Virtual IP address is 10.0.10.1
  Active router is 10.0.10.3, priority 100 (expires in 9.104 sec)
  Standby router is local
  Priority 90 (configured 110)
    Track interface GigabitEthernet0/1 state Down decrement 20
  Group name is "LAN10-GW" (cfgd)
```

**`Priority 90 (configured 110)`** — the parenthetical is the configured value and the bare number is the effective one. Underneath, the tracking line names the interface, its state and the decrement. R1 has demoted itself and R2 has taken over.

Restore, and the priority climbs back to 110 and R1 preempts:

```
R1(config-if)#no shutdown
```

```
R1#show standby brief
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Gi0/0       10   110 P Active  local           10.0.10.3       10.0.10.1
```
{{< /verify >}}

---

## Part 4 — Load sharing, and the alternatives

{{< step num="5" dev="R1, R2" title="Two groups so both routers carry traffic" >}}
With one HSRP group, one router forwards everything and the other idles. Run **two groups** on the same segment with opposite priorities and split the hosts between two virtual IPs — half pointed at each.

```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#standby 10 ip 10.0.10.1
R1(config-if)#standby 10 priority 110
R1(config-if)#standby 10 preempt
R1(config-if)#standby 20 ip 10.0.10.4
R1(config-if)#standby 20 priority 90
R1(config-if)#standby 20 preempt
```

```
R2(config)#interface GigabitEthernet0/0
R2(config-if)#standby 10 ip 10.0.10.1
R2(config-if)#standby 10 priority 90
R2(config-if)#standby 10 preempt
R2(config-if)#standby 20 ip 10.0.10.4
R2(config-if)#standby 20 priority 110
R2(config-if)#standby 20 preempt
```

R1 is active for group 10, R2 for group 20. Two DHCP scopes, or an even/odd split of static gateways, and both uplinks carry traffic. Either router failing means the other picks up both groups.

It works and it is the standard HSRP answer, but it requires managing two gateway addresses and splitting the hosts — which is why GLBP exists.

The three FHRPs:

| | HSRP | VRRP | GLBP |
|---|---|---|---|
| Standard | **Cisco** | **RFC 5798** | **Cisco** |
| Roles | Active / Standby | Master / Backup | AVG / AVF |
| Priority default | 100 | 100 | 100 |
| Preempt default | **disabled** | **enabled** | enabled |
| Timers | hello 3 / hold 10 | advert 1 / down 3 | hello 3 / hold 10 |
| Multicast | 224.0.0.2 (v1) / **224.0.0.102** (v2) | **224.0.0.18** | **224.0.0.102** |
| Virtual MAC | 0000.0C07.ACxx (v1) / 0000.0C9F.Fxxx (v2) | 0000.5E00.01xx | 0007.B400.xxyy |
| Can use a real IP as VIP | no | **yes** | no |
| Native load balancing | no — use multiple groups | no | **yes** |

Two differences worth remembering because they are exam bait: **VRRP preempts by default and HSRP does not**, and **VRRP can use a router's real interface address as the virtual IP** (that router is then the permanent master, since it owns the address).

GLBP is the only one that load-balances natively: a single virtual IP, but the Active Virtual Gateway hands out **different virtual MACs** to different hosts as they ARP, so the traffic splits without splitting the addressing.
{{< /step >}}

{{< verify dev="R1" cmd="show standby brief — both groups" >}}
```
R1#show standby brief
Interface   Grp  Pri P State   Active          Standby         Virtual IP
Gi0/0       10   110 P Active  local           10.0.10.3       10.0.10.1
Gi0/0       20   90  P Standby 10.0.10.3       local           10.0.10.4
```

One Active and one Standby on the same interface — the load-sharing design confirmed in a single command. Both uplinks are now carrying production traffic instead of one sitting idle.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Both routers report Active | group number, VIP or version mismatch | `show standby` on both |
| Intended router never resumes after a failure | `preempt` missing | `show standby brief` — no `P` |
| Uplink down, LAN traffic black-holes | no interface tracking | add `standby N track` |
| Tracking configured, no failover | decrement too small to cross the peer | check the arithmetic |
| Brief outage after the active router reboots | preempted before routing converged | `standby N preempt delay minimum 60` |
| Host has the router's real MAC cached | gateway points at the real IP, not the VIP | `arp -a` on the host |
| Voice calls drop on failover | 10-second hold time | `standby N timers msec 250 msec 750` |
| One router carries everything | single group | second group with reversed priorities, or GLBP |

## Exam notes

- HSRP virtual MAC: **v1 `0000.0C07.ACxx`**, **v2 `0000.0C9F.Fxxx`** (group number in hex).
- HSRP is **non-preemptive by default**; VRRP **preempts by default**.
- HSRP default timers **hello 3 / hold 10**; priority default **100**, highest wins, then highest interface IP.
- HSRPv2: groups 0–4095, multicast **224.0.0.102**. v1: groups 0–255, multicast 224.0.0.2. Set the version first.
- Tracking **decrements** the priority; the decrement must be big enough to fall below the peer.
- VRRP: **RFC 5798**, master/backup, multicast **224.0.0.18**, virtual MAC `0000.5E00.01xx`, and it **can use a real interface address** as the VIP.
- GLBP: Cisco, **AVG/AVF**, load-balances by handing out different virtual MACs from one virtual IP.
- Load sharing with HSRP or VRRP means **multiple groups** with reversed priorities.

---

*Sources: Jeremy's IT Lab Day 29 · Flackbox CCNA Lab Guide 24-1 · verified in Packet Tracer 8.2.*
