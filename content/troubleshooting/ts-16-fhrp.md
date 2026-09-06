---
title: "HSRP and VRRP"
date: 2026-09-06
description: "Split brain, the wrong router holding the active role, tracking that decrements too little, and the HSRP-to-STP misalignment that costs you half your uplink bandwidth without ever showing up as a fault."
tags: ["Troubleshooting", "HSRP", "VRRP", "FHRP", "STP", "Cisco"]
categories: ["Troubleshooting"]
unit: 5
---

A first-hop redundancy protocol has one job, and it fails in three shapes. Both routers think they are in charge, which loses roughly half the traffic and looks like a flaky cable. The wrong router is in charge, which works perfectly until the day the primary path matters. Or the right router is in charge and the traffic still takes a bad path, which never registers as a fault at all — it just costs you bandwidth quietly for years.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| ~50% packet loss to the gateway | both routers Active — split brain | `show standby brief` on **both** |
| Both Active, hellos never seen | the L2 path between the routers is down | `show interfaces trunk`, `show vlan brief` |
| Both Active, both configured identically | group number, version or authentication mismatch | `show standby` on both |
| Group stuck in `Init` | virtual IP outside the interface subnet, or interface down | `show standby` |
| Higher-priority router stays Standby | `preempt` never configured — **the classic** | `show standby brief` — the `P` column |
| Uplink down, router still Active | tracking not configured, or decrement too small | `show standby \| include Priority\|Track` |
| Some hosts fail over, some do not | hosts configured with a physical address as gateway | `ipconfig /all`, `arp -a` |
| Failover works, throughput is poor | HSRP active router is not the STP root | `show spanning-tree vlan <n>` |
| VRRP fails over, HSRP does not | VRRP preempts by default, HSRP does not | `show vrrp brief` `Pre` column |

---

## Both routers Active

Split brain is the loudest FHRP failure and the easiest to confirm. Two routers, each convinced it owns the virtual IP, each answering ARP for the virtual MAC. The switches learn the virtual MAC on whichever port sent the most recent frame, so it flaps between two ports and the traffic follows it.

The symptom on a host is a ping that alternates in a rough pattern rather than failing outright:

```
C:\>ping 10.1.1.1 -t
Reply from 10.1.1.1: bytes=32 time=1ms TTL=255
Request timed out.
Reply from 10.1.1.1: bytes=32 time=1ms TTL=255
Request timed out.
```

Confirmation takes one command on each router:

```
R1#show standby brief
                     P indicates configured to preempt.
                     |
Interface   Grp  Pri P State    Active          Standby         Virtual IP
Gi0/1       1    110 P Active   local           unknown         10.1.1.1

R2#show standby brief
Gi0/1       1    100 P Active   local           unknown         10.1.1.1
```

Both say `Active`, both say `local`, and the crucial detail is `Standby: unknown` on both. Neither router has ever heard the other. **That is not a negotiation failure — it is a communication failure**, and the causes divide into "the hellos never arrived" and "the hellos arrived and were rejected".

Occasionally the router says so outright: `%HSRP-4-DUPADDR: Duplicate address 10.1.1.1 on GigabitEthernet0/1`.

### The Layer 2 path between them is broken

HSRP and VRRP hellos are multicast frames on the local segment. They are not routed, they are not relayed, and they depend entirely on there being a working Layer 2 path between the two routers in that VLAN. Break it and both routers correctly conclude the other is gone.

This is the cause people look at last and should look at first, because it is not an FHRP misconfiguration at all — it is a trunk that lost a VLAN, an access port in the wrong VLAN, or a switch uplink that went down.

```
SW1#show interfaces trunk
Port        Vlans allowed and active in management domain
Gi0/23      1,10,20

SW1(config-if)#switchport trunk allowed vlan add 30
```

VLAN 30 is missing from the allowed list, and HSRP group 30 on the VLAN 30 SVIs has split. Everything else works, which is why the report arrives as "the finance VLAN is slow".

Before touching anything, confirm the direction of the fault: if each router can ping the other's physical interface address, the L2 path is fine and the cause is one of the mismatches below.

### Group number mismatch

The group number is part of the hello. Two routers in different groups do not see each other's hellos as relevant, and each becomes Active in its own group of one. The virtual IP being identical does not help — the group is the identifier, not the address.

```
R1#show standby | include Group
GigabitEthernet0/1 - Group 1
R2#show standby | include Group
GigabitEthernet0/1 - Group 2      ! same virtual IP, different group — two groups of one
```

The group number also determines the virtual MAC, so a mismatch means two different virtual MACs are answering for the same IP — which is what makes the switch MAC table flap.

### Authentication mismatch

HSRP's default is plain-text authentication with the string `cisco`, which means a router with authentication configured and one without will not agree. The rejected hellos are discarded silently unless you are debugging.

```
R1(config-if)#standby 1 authentication md5 key-string F1rstHop
R2(config-if)#standby 1 authentication md5 key-string F1rstH0p
```

One character apart, and both routers go Active. `debug standby` names it:

```
R1#debug standby
HSRP: Gi0/1 Grp 1 Hello  in  10.1.1.3 Active pri 100 vIP 10.1.1.1
HSRP: Gi0/1 Grp 1 Auth failed for Hello pkt from 10.1.1.3
```

The same applies to VRRP (`vrrp 1 authentication md5 key-string F1rstHop`) where the platform supports it. Note that RFC 3768 removed authentication from VRRP entirely and VRRPv3 has none, so this is a version- and platform-dependent feature — check that both ends support what you configured before assuming a mismatch.

### HSRP version mismatch

Version 1 and version 2 do not interoperate. They use different multicast addresses, so a v1 router and a v2 router on the same segment are not even listening to the same destination.

| | HSRPv1 | HSRPv2 |
|---|---|---|
| Multicast | **224.0.0.2** | **224.0.0.102** |
| Group range | 0–255 | **0–4095** |
| Virtual MAC | `0000.0c07.ac`**xx** | `0000.0c9f.f`**xxx** |
| Hello in packet | seconds | milliseconds |
| IPv6 | no | yes |

```
R1#show standby | include version
  Group 1 version 2

R1(config-if)#standby version 2
```

The version is per-interface, not per-group, and changing it resets every group on that interface. Set it on both ends in the same maintenance window.

A related trap: HSRPv1 caps the group number at 255. Configure `standby 300 ip ...` under version 1 and the command is rejected; people then configure group 44 on one router, someone else fixes the other router by moving it to version 2 and using 300, and the result is split brain with two different-looking configurations that both appear reasonable.

### An ACL blocking the multicast

An inbound ACL on the SVI or the routed interface that does not permit the FHRP control traffic drops the hellos and produces split brain with a perfectly healthy Layer 2 path.

| Protocol | Destination | Transport |
|---|---|---|
| HSRPv1 | 224.0.0.2 | UDP 1985 |
| HSRPv2 | 224.0.0.102 | UDP 1985 |
| **VRRP** | **224.0.0.18** | **IP protocol 112** — not UDP |

VRRP is the one that catches people, because an ACL written with `permit udp` clauses for HSRP does nothing for VRRP at all:

```
R1(config)#ip access-list extended VLAN10_IN
R1(config-ext-nacl)#permit udp any host 224.0.0.102 eq 1985    ! HSRPv2
R1(config-ext-nacl)#permit 112 any host 224.0.0.18             ! VRRP
```

Hit counters on the deny at the bottom of the ACL, climbing at the hello rate, are the confirmation.

---

## The wrong router is Active

Everything is healthy, the two routers see each other, and the one you wanted as primary is sitting in Standby with the higher priority. This is the most common FHRP configuration error, and there is nothing subtle about it.

```
R1#show standby brief
                     P indicates configured to preempt.
                     |
Interface   Grp  Pri P State    Active          Standby         Virtual IP
Gi0/1       1    110   Standby  10.1.1.3        local           10.1.1.1
```

Priority 110, state Standby, and **the `P` column is empty**.

**HSRP does not preempt by default.** Priority decides the election only when an election is held. A router that comes up second joins as Standby and stays there for as long as the current Active router keeps sending hellos, regardless of priority. Reload the routers in the wrong order — or fix a cable in the wrong order — and the roles land backwards and stay backwards.

```
R1(config)#interface GigabitEthernet0/1
R1(config-if)#standby 1 preempt
```

The `P` appears, an election is held immediately, and R1 takes the role.

**VRRP preempts by default**, which is the single most useful difference between the two protocols when you are troubleshooting. If a VRRP pair has the wrong master, preemption is not the cause — look at priority, at the address owner, or at tracking:

```
R1#show vrrp brief
Interface          Grp Pri Time  Own Pre State   Master addr     Group addr
Gi0/1                1 110 3003      Y  Master  10.1.1.2        10.1.1.1
```

The `Own` column is VRRP-only and has no HSRP equivalent. If the virtual IP is the same as a router's real interface address, that router is the **address owner**, runs at priority **255**, and cannot be beaten. Configuring a priority on an owner is accepted and ignored, which makes for a memorable half-hour. HSRP has no concept of ownership — the virtual IP is always a separate address.

Preemption with a delay — `standby 1 preempt delay minimum 120` — is worth configuring on the primary of any pair whose uplink runs a routing protocol. Without it the router takes the active role the instant its interface comes up and starts forwarding into a routing table that has not converged.

---

## The group is stuck in Init

`Init` means the group is configured and not participating. Two causes account for nearly all of it.

The parenthetical after the state names the cause. `(interface down)` is exactly that — fix the interface. The other one is more interesting:

**The virtual IP is not in the interface subnet.** IOS accepts `standby 1 ip 10.1.2.1` on an interface addressed 10.1.1.2/24 without complaint, and then refuses to run the group, because a virtual IP outside the connected subnet cannot be ARPed for by any host on that segment.

```
R1#show standby
GigabitEthernet0/1 - Group 1
  State is Init (virtual IP not in HSRP subnet)
  Virtual IP address is 10.1.2.1
```

The typo is usually a transposed octet copied between VLANs. VRRP behaves the same way and `show vrrp` reports it the same way.

---

## Tracking that does not change the outcome

Tracking exists so that a router whose uplink has failed gives up the gateway role rather than becoming a black hole. It only works if the decrement is large enough to actually lose the election, and if preemption is enabled on the other router so an election happens at all.

```
R1(config-if)#standby 1 priority 110
R1(config-if)#standby 1 track GigabitEthernet0/0 5
```

R1 at 110, R2 at 100. The uplink fails, R1 drops to 105 — still higher than R2. Nothing moves. Tracking is configured, it is working exactly as written, and it is useless.

```
R1#show standby | include Priority|Track
  Priority 105 (configured 110)
    Track interface GigabitEthernet0/0 state Down decrement 5

R1(config-if)#standby 1 track GigabitEthernet0/0 20    ! 110 - 20 = 90, below R2's 100
```

`Priority 105 (configured 110)` is the tell: the decrement fired and the number is still winning. The rule is that **the decrement must exceed the gap between the two priorities**, with margin.

Two more failures in the same family. **Tracking without preempt on the peer** does nothing, because R2 never challenges for the role even once R1's priority drops below its own — the same defect as the previous section, arriving by a different route. And **tracking the wrong thing**: `standby 1 track Gi0/0` follows line protocol only, so a WAN interface that stays up while the circuit behind it is dead never triggers. Track a route or an SLA instead:

```
R1(config)#track 10 ip route 0.0.0.0 0.0.0.0 reachability
R1(config)#interface GigabitEthernet0/1
R1(config-if)#standby 1 track 10 decrement 20

R1#show track 10
Track 10
  IP route 0.0.0.0 0.0.0.0 reachability
  Reachability is Down (no ip route)
  Tracked by:
    HSRP GigabitEthernet0/1 1
```

VRRP uses the same tracked-object infrastructure, with `decrement` spelled out: `vrrp 1 track 10 decrement 20`.

---

## Hosts pointing at a physical address

The redundancy is perfect and some hosts fail anyway, because their default gateway is 10.1.1.2 — a router's real interface address — rather than 10.1.1.1, the virtual one. When that router reboots, those hosts lose their gateway and no failover can help them, because nothing else answers for that address.

This survives for years in the corners of a network: statically-addressed servers, printers, an out-of-band management host, a DHCP scope that was written before HSRP was deployed. The DHCP pool is the first place to check, because it fixes the majority in one line:

```
R1#show run | section ip dhcp pool VLAN10
ip dhcp pool VLAN10
 network 10.1.1.0 255.255.255.0
 default-router 10.1.1.2          ! should be the virtual IP, 10.1.1.1
```

For the statics, compare each host's gateway against the virtual MAC. That MAC is recognisable on sight — `0000.0c07.ac01` is HSRPv1 group 1, `0000.5e00.0101` is VRRP group 1 — and a host whose `arp -a` resolves the gateway to a burned-in address instead is one to fix.

---

## HSRP and STP misalignment

This one produces no error, no log message and no alarm. It costs bandwidth, and it is found by drawing the path rather than by running a command.

The default gateway for VLAN 10 is on R1/SW1, and the STP root for VLAN 10 is SW2. A host on SW1 sends a frame to the virtual MAC; SW1's only forwarding path toward the root is the uplink to SW2; the frame goes to SW2, discovers the active gateway is back on SW1, and returns. **Every packet crosses the inter-switch link twice**, and the link that was sized for east-west traffic is now carrying all the northbound traffic as well, in both directions.

Nothing is broken. Throughput is simply half what the diagram promises, and it degrades under load in a way that looks like a capacity problem.

Check the two together, per VLAN:

```
SW1#show spanning-tree vlan 10 | include This bridge
             This bridge is the root

SW1#show standby brief
Interface   Grp  Pri P State    Active          Standby         Virtual IP
Vl10        10   110 P Active   local           10.1.10.3       10.1.10.1
```

Root and Active on the same device — correct. The fix when they disagree is to move one to match the other, and the convention that scales is to alternate by VLAN so both uplinks carry traffic:

```
SW1(config)#spanning-tree vlan 10 root primary
SW1(config)#spanning-tree vlan 20 root secondary
SW1(config-if)#standby 10 priority 110    ! Vlan10 — SW1 is STP root, so be HSRP active
SW1(config-if)#standby 20 priority 90

SW2(config)#spanning-tree vlan 20 root primary
SW2(config)#spanning-tree vlan 10 root secondary
SW2(config-if)#standby 20 priority 110    ! Vlan20 — SW2 is STP root, so be HSRP active
SW2(config-if)#standby 10 priority 90
```

That is HSRP load balancing done correctly: two groups, opposite priorities, aligned with the spanning-tree topology per VLAN. Doing it without the STP alignment is the misconfiguration this section is about.

---

## HSRP against VRRP, where it matters

Most of the differences are trivia. These are the ones that change what you look at:

| | HSRP | VRRP |
|---|---|---|
| Standard | Cisco proprietary | RFC — interoperates with other vendors |
| States | Active / Standby | Master / Backup |
| **Preemption default** | **disabled** | **enabled** |
| Hello / hold | **3 s / 10 s** | advertisement **1 s**, master down **~3.003 s** |
| Virtual MAC | `0000.0c07.ac`xx (v1), `0000.0c9f.f`xxx (v2) | `0000.5e00.01`xx |
| Transport | UDP 1985 to 224.0.0.2 / 224.0.0.102 | **IP protocol 112** to 224.0.0.18 |
| Groups | 0–255 (v1), 0–4095 (v2) | 1–255 |
| Address ownership | none — virtual IP is always separate | **owner runs at priority 255** |
| Default priority | 100 | 100 |

Three practical consequences. **VRRP fails over faster** out of the box — roughly three seconds against ten — so a pair that takes ten seconds to recover is HSRP with default timers, not a fault. **A VRRP pair with the wrong master is never a preemption problem**, which removes the most common HSRP cause from consideration immediately. And **the virtual MAC prefix identifies the protocol from a switch MAC table alone**, which is useful when you are working on the access layer and cannot see the router configuration.

Timers can be tightened on either (`standby 1 timers msec 250 msec 800`, `vrrp 1 timers advertise msec 250`) and must match on every member of the group. Sub-second timers on a platform that processes hellos in software cause spurious failovers under CPU load, which presents as an FHRP that flaps for no visible reason. `show standby` counts the state changes, and a large number with no corresponding interface events points straight at it:

```
R1#show standby | include state change
    118 state changes, last state change 00:00:31
```

---

## Quick reference

| Command | Proves |
|---|---|
| `show standby brief` | state, priority, and the **`P` preempt column** — one line per group |
| `show standby` | virtual and active MAC, timers, tracking, state-change count, Init reason |
| `show standby \| include Priority` | `Priority n (configured m)` — whether a tracked object has fired |
| `show vrrp brief` | state, priority, the `Pre` and **`Own`** columns |
| `show vrrp` | master down interval, authentication, tracked objects |
| `debug standby` | hellos in and out, and authentication failures by name |
| `debug standby events` | state transitions only — safe on a production box |
| `show track <n>` | the tracked object's state and which FHRP group consumes it |
| `show spanning-tree vlan <n>` | whether the STP root and the active gateway are the same device |
| `show interfaces trunk` | the VLAN carrying the hellos is allowed on the path between the routers |
| `show mac address-table address <vmac>` | which port the virtual MAC is learned on — flapping means split brain |

---

*Based on the NetworkLessons troubleshooting series: HSRP and VRRP on Cisco IOS.*
