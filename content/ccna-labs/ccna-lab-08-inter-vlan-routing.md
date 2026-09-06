---
title: "Lab 08 · Inter-VLAN Routing"
date: 2026-09-06
description: "Three ways to route between VLANs — a router per VLAN, router-on-a-stick, and SVIs on a Layer 3 switch — built side by side so the trade-offs are visible."
tags: ["CCNA", "VLAN", "Inter-VLAN Routing", "SVI", "Lab"]
categories: ["CCNA"]
domain: 2
tool: "Packet Tracer"
duration: "50 min"
sources: "Jeremy's IT Lab Day 18 · Flackbox 22-1"
aliases: ["/ccna-labs/ccna-lab-22-vlan-intervlan/"]
---

Lab 07 ended with two VLANs that could not talk to each other, which is what VLANs are for. Now we make them talk — selectively, through a Layer 3 device. There are three ways to do it and each has been the standard answer at some point in the last thirty years. Building all three makes the reason for the modern default obvious.

## Topology

{{< topology cols="3" rows="3" caption="Router-on-a-stick first, then the same VLANs routed by SVIs on a multilayer switch" >}}
pc     PC1 "VLAN 10 · 10.0.10.11" at 0,0
pc     PC2 "VLAN 20 · 10.0.20.11" at 0,2
switch SW1 "" at 1,1
router R1 "sub-interfaces" at 2,0
switch MLS "L3 switch · SVIs" at 2,2

PC1 — SW1
PC2 — SW1
SW1 — R1 label="trunk Gi0/0"
SW1 — MLS label="trunk Gi0/2"
{{< /topology >}}

| VLAN | Subnet | Gateway (ROAS) | Gateway (SVI) |
|---|---|---|---|
| 10 ENGINEERING | 10.0.10.0/24 | 10.0.10.1 (R1 G0/0.10) | 10.0.10.1 (MLS Vlan10) |
| 20 SALES | 10.0.20.0/24 | 10.0.20.1 (R1 G0/0.20) | 10.0.20.1 (MLS Vlan20) |
| 99 NATIVE | — | — | — |

## Objectives

- Explain why legacy inter-VLAN routing does not scale
- Configure router-on-a-stick with 802.1Q sub-interfaces, including the native VLAN case
- Configure SVIs on a Layer 3 switch and enable `ip routing`
- Verify each with the right command and know which one catches which fault
- Compare the three approaches on cost, throughput and port count

---

## Part 1 — Method 1: legacy, one router interface per VLAN

{{< step num="1" dev="R1" title="The approach that does not scale" open="true" >}}
Give the router one physical interface per VLAN, each connected to an access port in that VLAN:

```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#description ## VLAN 10 access ##
R1(config-if)#ip address 10.0.10.1 255.255.255.0
R1(config-if)#no shutdown
R1(config-if)#exit
R1(config)#interface GigabitEthernet0/1
R1(config-if)#description ## VLAN 20 access ##
R1(config-if)#ip address 10.0.20.1 255.255.255.0
R1(config-if)#no shutdown
R1(config-if)#end
```

And on the switch, two access ports:

```
SW1(config)#interface FastEthernet0/23
SW1(config-if)#switchport mode access
SW1(config-if)#switchport access vlan 10
SW1(config-if)#exit
SW1(config)#interface FastEthernet0/24
SW1(config-if)#switchport mode access
SW1(config-if)#switchport access vlan 20
SW1(config-if)#end
```

It works, and it is the fastest of the three — each VLAN gets a dedicated interface at full line rate. It also consumes **one router port and one switch port per VLAN**. A router with four Ethernet interfaces supports four VLANs, and then you buy another router. Ten VLANs is already impossible on typical hardware.

Included here because the exam expects you to recognise it and explain the limitation. Nobody deploys it.
{{< /step >}}

---

## Part 2 — Method 2: router-on-a-stick

{{< step num="2" dev="SW1" title="One trunk to the router" >}}
```
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#description ## trunk to R1 — ROAS ##
SW1(config-if)#switchport trunk encapsulation dot1q
SW1(config-if)#switchport mode trunk
SW1(config-if)#switchport trunk native vlan 99
SW1(config-if)#switchport trunk allowed vlan 10,20,99
SW1(config-if)#end
```

The switch side is an ordinary trunk. The router side is where the interesting part is.
{{< /step >}}

{{< step num="3" dev="R1" title="Sub-interfaces — one per VLAN on one physical port" >}}
```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#no ip address
R1(config-if)#no shutdown
R1(config-if)#exit
R1(config)#interface GigabitEthernet0/0.10
R1(config-subif)#description ## VLAN 10 gateway ##
R1(config-subif)#encapsulation dot1Q 10
R1(config-subif)#ip address 10.0.10.1 255.255.255.0
R1(config-subif)#exit
R1(config)#interface GigabitEthernet0/0.20
R1(config-subif)#description ## VLAN 20 gateway ##
R1(config-subif)#encapsulation dot1Q 20
R1(config-subif)#ip address 10.0.20.1 255.255.255.0
R1(config-subif)#exit
R1(config)#interface GigabitEthernet0/0.99
R1(config-subif)#description ## native VLAN ##
R1(config-subif)#encapsulation dot1Q 99 native
R1(config-subif)#end
```

Four rules that account for nearly every ROAS failure:

**1. The physical interface must be `no shutdown` and must have no IP address.** Sub-interfaces inherit the physical link state — if `Gi0/0` is down, every sub-interface is down. Forgetting `no shutdown` on the parent is the number one cause of "I configured everything and nothing works".

**2. The sub-interface number and the VLAN ID are unrelated.** `Gi0/0.10` could carry VLAN 20; only `encapsulation dot1Q` decides. Making them match is a convention that exists purely so humans can read the config, and you should follow it.

**3. `encapsulation dot1Q` must come before `ip address`.** IOS rejects the address otherwise, because it does not yet know what the sub-interface is for.

**4. The native VLAN sub-interface needs the `native` keyword**, because frames in the native VLAN arrive **untagged** — the router has no VID to match on and will drop them otherwise. If VLAN 99 carries no traffic you can omit this sub-interface entirely; if the native VLAN needs routing, the keyword is mandatory.

The trade-off: every packet from VLAN 10 to VLAN 20 goes **up** the trunk to the router and **back down** it. The trunk carries the traffic twice, which halves effective bandwidth for inter-VLAN flows. That is the "stick" in router-on-a-stick, and it is why the method loses to Layer 3 switching at any real scale.
{{< /step >}}

{{< verify dev="R1" cmd="show ip interface brief" open="true" >}}
```
R1#show ip interface brief
Interface                  IP-Address      OK? Method Status    Protocol
GigabitEthernet0/0         unassigned      YES manual up        up
GigabitEthernet0/0.10      10.0.10.1       YES manual up        up
GigabitEthernet0/0.20      10.0.20.1       YES manual up        up
GigabitEthernet0/0.99      unassigned      YES unset  up        up
```

Physical interface `up/up` with **no address**; sub-interfaces `up/up` with addresses. If the sub-interfaces show `down/down`, look at the parent — that is the only thing that can cause it.

Then the routing table, which is what actually enables the routing:

```
R1#show ip route connected
      10.0.0.0/8 is variably subnetted, 4 subnets, 2 masks
C        10.0.10.0/24 is directly connected, GigabitEthernet0/0.10
L        10.0.10.1/32 is directly connected, GigabitEthernet0/0.10
C        10.0.20.0/24 is directly connected, GigabitEthernet0/0.20
L        10.0.20.1/32 is directly connected, GigabitEthernet0/0.20
```

Both subnets connected on the same physical port. No static routes needed — a router routes between its own connected networks by default.
{{< /verify >}}

{{< verify dev="PC1" cmd="ping 10.0.20.11" open="true" >}}
Set each PC's default gateway to the sub-interface address in its own VLAN, then:

```
PC> ping 10.0.20.11

Reply from 10.0.20.11: bytes=32 time=3ms TTL=127
```

**TTL 127** — one router in the path, exactly as expected. If you see 128, the two hosts are in the same VLAN and you have made an addressing mistake rather than a routing one.

Check the ARP cache to confirm the frame really did go to the gateway:

```
PC> arp -a
  Internet Address      Physical Address      Type
  10.0.10.1             0060.4711.2c01        dynamic
```

One entry, the gateway. PC2's MAC is not there and never will be — PC1 has no way to learn it.
{{< /verify >}}

{{< verify dev="R1" cmd="show vlans" >}}
The ROAS-specific command. Per-VLAN packet counters on the sub-interfaces:

```
R1#show vlans

Virtual LAN ID:  10 (IEEE 802.1Q Encapsulation)

   vLAN Trunk Interface:   GigabitEthernet0/0.10

   Protocols Configured:   Address:            Received:     Transmitted:
           IP              10.0.10.1                 214             198

Virtual LAN ID:  99 (IEEE 802.1Q Encapsulation)

   vLAN Trunk Interface:   GigabitEthernet0/0.99  (Native)
```

If `Received` stays at zero for a VLAN, the router is not getting tagged frames for it — the VLAN is missing from the trunk's allowed list, or the encapsulation VID is wrong. That distinction is exactly what this command is for.
{{< /verify >}}

---

## Part 3 — Method 3: SVIs on a Layer 3 switch

{{< step num="4" dev="MLS" title="Turn the switch into a router" >}}
```
MLS(config)#ip routing
MLS(config)#vlan 10
MLS(config-vlan)#name ENGINEERING
MLS(config-vlan)#exit
MLS(config)#vlan 20
MLS(config-vlan)#name SALES
MLS(config-vlan)#exit
MLS(config)#interface Vlan10
MLS(config-if)#description ## VLAN 10 gateway ##
MLS(config-if)#ip address 10.0.10.1 255.255.255.0
MLS(config-if)#no shutdown
MLS(config-if)#exit
MLS(config)#interface Vlan20
MLS(config-if)#description ## VLAN 20 gateway ##
MLS(config-if)#ip address 10.0.20.1 255.255.255.0
MLS(config-if)#no shutdown
MLS(config-if)#end
```

**`ip routing` is the whole trick, and forgetting it is the classic failure.** Without it, a multilayer switch has SVIs with addresses that respond to ping and route nothing. Each VLAN can reach its own gateway; nothing crosses between VLANs. The symptom is maddening because everything looks configured.

Check it first, every time:

```
MLS#show ip route
Default gateway is not set
Host               Gateway           Last Use    Total Uses  Interface
ICMP redirect cache is empty
```

That output — no routing table at all, just a gateway line — means `ip routing` is **off**. A router with routing enabled prints codes and routes.

An SVI comes up only when **both** conditions hold: the VLAN exists and is active, and at least one access port in that VLAN is up (or the VLAN is allowed and forwarding on a trunk). An SVI for a VLAN with no live ports stays `down/down` no matter how correct the address is.
{{< /step >}}

{{< step num="5" dev="MLS" title="Routed ports — the other half of a Layer 3 switch" >}}
A multilayer switch port can also leave Layer 2 entirely and behave like a router interface:

```
MLS(config)#interface GigabitEthernet0/1
MLS(config-if)#description ## routed uplink to core ##
MLS(config-if)#no switchport
MLS(config-if)#ip address 10.0.99.1 255.255.255.252
MLS(config-if)#no shutdown
MLS(config-if)#end
```

`no switchport` converts it. The port now has no VLAN membership, no MAC learning, no spanning tree — it is a router port on a switch chassis.

The distinction is worth being able to state precisely:

| | SVI (`interface Vlan10`) | Routed port (`no switchport`) |
|---|---|---|
| Belongs to | a VLAN | nothing |
| Spanning tree | participates via member ports | not involved |
| Up when | VLAN active + a member port up | the physical link is up |
| Typical use | user VLAN gateway | point-to-point uplink between switches |
{{< /step >}}

{{< verify dev="MLS" cmd="show ip route" open="true" >}}
```
MLS#show ip route
Codes: L - local, C - connected, S - static

      10.0.0.0/8 is variably subnetted, 4 subnets, 2 masks
C        10.0.10.0/24 is directly connected, Vlan10
L        10.0.10.1/32 is directly connected, Vlan10
C        10.0.20.0/24 is directly connected, Vlan20
L        10.0.20.1/32 is directly connected, Vlan20
```

Routing codes and connected routes — `ip routing` is on and the SVIs are up.

Confirm the SVI state directly:

```
MLS#show ip interface brief | include Vlan
Vlan1                  unassigned      YES manual administratively down down
Vlan10                 10.0.10.1       YES manual up                    up
Vlan20                 10.0.20.1       YES manual up                    up
```

An SVI showing `up/down` means the VLAN exists but has no active member port. Shut every access port in VLAN 10 and watch `Vlan10` follow them down — that is the behaviour, not a bug.
{{< /verify >}}

{{< verify dev="PC1" cmd="ping and traceroute through the SVI gateway" >}}
Repoint PC1 and PC2 at the MLS as their gateway (same addresses, different device) and retest:

```
PC> ping 10.0.20.11
Reply from 10.0.20.11: bytes=32 time<1ms TTL=127

PC> tracert 10.0.20.11
  1   0 ms   0 ms   0 ms   10.0.10.1
  2   0 ms   0 ms   0 ms   10.0.20.11
```

Same TTL, same hop count, noticeably lower latency — the switching ASIC forwards in hardware rather than punting to a CPU, and the traffic never leaves the chassis.
{{< /verify >}}

---

## Choosing between them

| | Legacy (port per VLAN) | Router-on-a-stick | Layer 3 switch |
|---|---|---|---|
| Ports used | 2 per VLAN | 1 trunk total | 0 extra |
| Scales to | 3–4 VLANs | ~20 before the trunk hurts | hundreds |
| Throughput | line rate per VLAN | trunk bandwidth, **halved** for inter-VLAN | hardware line rate |
| Forwarding | router CPU/ASIC | router CPU | switch ASIC |
| Cost | one router port per VLAN | cheap router | more expensive switch |
| Where you find it | museums and exam questions | small branch offices | every campus built since ~2005 |

Modern default: **SVIs on a Layer 3 switch** for campus, **router-on-a-stick** where the branch already has a router and only a handful of VLANs.

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| SVIs have addresses, nothing routes | `ip routing` missing | `show ip route` — "Default gateway is not set" means off |
| SVI stuck `up/down` | VLAN has no active member port | `show vlan brief`, `show ip interface brief` |
| All ROAS sub-interfaces down | parent physical interface is `shutdown` | `show ip interface brief` |
| One VLAN routes, another does not | VLAN missing from the trunk allowed list | `show interfaces trunk` |
| Native VLAN hosts cannot reach the gateway | sub-interface missing the `native` keyword | `show vlans` — zero received |
| `% Configuring IP routing on a LAN subinterface is only allowed if that subinterface is already configured as part of an IEEE 802.10, IEEE 802.1Q, or ISL vLAN` | `ip address` typed before `encapsulation dot1Q` | reorder |
| Inter-VLAN throughput half of expected | ROAS hairpin on the trunk | design limitation — move to L3 switching |

## Exam notes

- ROAS: parent interface `no shutdown` and **no IP address**; sub-interfaces carry the addresses.
- `encapsulation dot1Q <vlan>` must precede `ip address` on a sub-interface.
- The native VLAN sub-interface needs `encapsulation dot1Q <vlan> native` because those frames arrive untagged.
- Sub-interface number and VLAN ID are independent; matching them is convention only.
- A Layer 3 switch needs **`ip routing`** — it is off by default on most platforms.
- An SVI is up only when the VLAN exists **and** has an active port in it.
- `no switchport` makes a routed port: no VLAN, no STP, up with the physical link.
- Inter-VLAN traffic through ROAS crosses the trunk twice.

---

*Sources: Jeremy's IT Lab Day 18 · Flackbox CCNA Lab Guide 22-1 · verified in Packet Tracer 8.2.*
