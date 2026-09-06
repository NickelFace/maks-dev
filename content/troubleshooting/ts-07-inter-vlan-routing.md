---
title: "Inter-VLAN Routing"
date: 2026-09-06
description: "Why a host can ping its own gateway but nothing beyond it — router-on-a-stick encapsulation faults, SVIs that stay down, and the single command a multilayer switch is usually missing."
tags: ["Troubleshooting", "Inter-VLAN Routing", "SVI", "Router-on-a-Stick", "Cisco"]
categories: ["Troubleshooting"]
unit: 4
---

The characteristic inter-VLAN symptom is narrow and very consistent: a host reaches everything inside its own VLAN, reaches its own default gateway, and reaches nothing else. Layer 2 is fine — that is precisely what the successful gateway ping proved — so the fault is in the one device that is supposed to carry traffic between the VLANs, and it is almost always a configuration omission rather than a failure.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| Gateway pings, other VLANs do not | `ip routing` not enabled on the L3 switch | `show ip route` — no connected routes |
| One VLAN unreachable, others fine | SVI `down/down`, or the VLAN missing from the database | `show ip interface brief`, `show vlan brief` |
| No VLAN works, router-on-a-stick | physical interface `shutdown` | `show ip interface brief` |
| One VLAN works, the rest do not | wrong `encapsulation dot1q` VLAN ID | `show interfaces <int>.<sub>` |
| Only the untagged VLAN fails | native VLAN subinterface missing the `native` keyword | `show interfaces trunk` on the switch |
| One host broken, its neighbours fine | wrong or missing default gateway on the host | `ipconfig /all`, `show ip arp` |
| Router pings both VLANs, hosts cannot | return path or host mask problem | `ping source` from the router's LAN address |

---

## Router-on-a-stick

One physical interface, one subinterface per VLAN, and an 802.1Q trunk to the switch. The router's interface holds no IP address of its own; every address lives on a subinterface, and every subinterface is bound to a VLAN ID by its `encapsulation` command.

```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#no ip address
R1(config-if)#no shutdown
R1(config-if)#interface GigabitEthernet0/0.10
R1(config-subif)#encapsulation dot1Q 10
R1(config-subif)#ip address 10.0.10.1 255.255.255.0
R1(config-subif)#interface GigabitEthernet0/0.20
R1(config-subif)#encapsulation dot1Q 20
R1(config-subif)#ip address 10.0.20.1 255.255.255.0
```

### The physical interface is administratively down

This is the fault that produces the most alarming symptom for the least interesting reason: **nothing** routes, all VLANs at once, and every subinterface reports itself as down without any subinterface having been touched.

```
R1#show ip interface brief
Interface                  IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0         unassigned      YES unset  administratively down down
GigabitEthernet0/0.10      10.0.10.1       YES manual administratively down down
GigabitEthernet0/0.20      10.0.20.1       YES manual administratively down down
```

A subinterface is a logical construct on top of the physical port and has no independent line state. It cannot come up while its parent is down, and `no shutdown` on the subinterface will not raise it. **Check the parent first** — it costs one line of output and rules out every subinterface fault at once.

```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#no shutdown
```

### Wrong or missing encapsulation VLAN

The subinterface number and the VLAN ID are conventionally the same, and nothing enforces that. `interface Gi0/0.20` with `encapsulation dot1Q 200` is accepted without complaint, and the interface comes up cleanly — it is tagging into a VLAN that carries no hosts.

```
R1#show interfaces GigabitEthernet0/0.20 | include Encapsulation|Internet
  Internet address is 10.0.20.1/24
  Encapsulation 802.1Q Virtual LAN, Vlan ID  200.
```

The subinterface is `up/up`, the address is correct, and the VLAN ID is wrong. Hosts in VLAN 20 have a gateway address configured that nothing on the wire answers for, so their ARP for 10.0.20.1 goes unanswered and every off-subnet packet dies at the host.

```
PC2> arp -a
  Internet Address      Physical Address      Type
  10.0.20.1             00-00-00-00-00-00     invalid
```

Correcting it requires no removal of the subinterface — the encapsulation command overwrites:

```
R1(config)#interface GigabitEthernet0/0.20
R1(config-subif)#encapsulation dot1Q 20
```

The same fault appears in a subtler form when the subinterface has no encapsulation at all. IOS accepts the IP address, but the subinterface never comes up, because it has no VLAN to belong to.

### The native VLAN subinterface

The native VLAN crosses an 802.1Q trunk **untagged**. A subinterface configured with plain `encapsulation dot1Q 1` expects a tag that will never arrive, so the router silently discards every frame from that VLAN while the interface reports itself perfectly healthy.

```
R1(config)#interface GigabitEthernet0/0.1
R1(config-subif)#encapsulation dot1Q 1 native
R1(config-subif)#ip address 10.0.1.1 255.255.255.0
```

Two things about this are worth holding on to. First, the symptom is **selective**: every tagged VLAN routes correctly and only the native one is broken, which is a pattern that points nowhere else. Second, the native VLAN is a property of the trunk, so the two ends must agree on which VLAN it is — check what the switch actually thinks:

```
SW1#show interfaces trunk
Port        Mode         Encapsulation  Status        Native vlan
Gi0/1       on           802.1q         trunking      99

Port        Vlans allowed and active in management domain
Gi0/1       1,10,20,99
```

Native VLAN 99 on the switch and `encapsulation dot1Q 1 native` on the router is a mismatch, and on a Cisco switch CDP will say so directly:

```
%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on GigabitEthernet0/1 (99), with R1 GigabitEthernet0/0 (1).
```

### The switch side is not a trunk

A router subinterface configuration is meaningless if the switch port feeding it is an access port. DTP will not save you here: a router does not speak DTP, so a port left in `dynamic auto` never negotiates and settles as an access port in VLAN 1.

```
SW1#show interfaces GigabitEthernet0/1 switchport | include Administrative Mode|Operational Mode
Administrative Mode: dynamic auto
Operational Mode: static access
```

```
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#switchport trunk encapsulation dot1q   ! only on switches supporting ISL
SW1(config-if)#switchport mode trunk
```

Then confirm that the VLANs you route are actually allowed and active on that trunk — `show interfaces trunk` prints two separate lists, and a VLAN can be allowed while being pruned or absent from the database.

---

## SVIs on a multilayer switch

The switch does the routing itself. Each VLAN gets a Switch Virtual Interface holding the gateway address, and packets move between VLANs in hardware. There is no trunk to a router and no encapsulation to get wrong — which means the fault classes are entirely different.

### `ip routing` is not enabled

**This is the most common multilayer-switch fault by a wide margin**, and its symptom is exactly the one described at the top of this page. A Layer 3 switch ships with routing disabled; it is a switch until you tell it otherwise. Every SVI still comes up, still answers ping on its own address, and still refuses to move a packet from one VLAN to another.

```
SW1#show ip interface brief
Interface              IP-Address      OK? Method Status                Protocol
Vlan10                 10.0.10.1       YES NVRAM  up                    up
Vlan20                 10.0.20.1       YES NVRAM  up                    up
```

Interfaces up, addresses correct, and the routing table gives it away:

```
SW1#show ip route
Default gateway is not set

Host               Gateway           Last Use    Total Uses  Interface
ICMP redirect cache is empty
```

That output is not an empty routing table — it is the output of a device that **has no IP routing table at all**. A Layer 2 switch with `no ip routing` reports its default gateway, not its routes, and the shape of the output alone identifies the fault.

```
SW1#show running-config | include ip routing
no ip routing
```

```
SW1(config)#ip routing
```

Connected routes appear immediately, one network route and one local host route per SVI:

```
SW1#show ip route
      10.0.0.0/8 is variably subnetted, 4 subnets, 2 masks
C        10.0.10.0/24 is directly connected, Vlan10
L        10.0.10.1/32 is directly connected, Vlan10
C        10.0.20.0/24 is directly connected, Vlan20
L        10.0.20.1/32 is directly connected, Vlan20
```

### An SVI that stays down/down

An SVI is a virtual interface, but its line state is not virtual. It comes up only when **both** conditions hold: the VLAN exists in the VLAN database and is active, and at least one physical port in that VLAN is up — an access port with a live host, or a trunk carrying the VLAN.

```
SW1#show ip interface brief
Interface              IP-Address      OK? Method Status                Protocol
Vlan10                 10.0.10.1       YES NVRAM  up                    up
Vlan20                 10.0.20.1       YES NVRAM  down                  down
```

Two different causes produce this identical output, and the next command separates them:

```
SW1#show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Gi0/2, Gi0/3
10   USERS                            active    Fa0/1, Fa0/2
```

VLAN 20 is not listed at all. Configuring `interface Vlan20` does not create VLAN 20 — the SVI and the VLAN are separate objects, and the SVI will sit there indefinitely waiting for a VLAN that was never defined.

```
SW1(config)#vlan 20
SW1(config-vlan)#name SERVERS
```

If the VLAN does exist and is `active` but its port list is empty, the other cause applies: no member port is up. Assign one, or verify that the uplink trunk carries the VLAN.

```
SW1(config)#interface FastEthernet0/7
SW1(config-if)#switchport mode access
SW1(config-if)#switchport access vlan 20
```

An SVI whose VLAN exists but is `act/unsup` — a VLAN suspended or unsupported — behaves the same way, and only `show vlan brief` will tell you.

### Routed port versus switchport

On a multilayer switch, a physical port that needs its own IP address must first stop being a switchport. Applying `ip address` to a port still in switching mode either fails outright or is silently ignored, depending on platform.

```
SW1(config)#interface GigabitEthernet0/24
SW1(config-if)#no switchport
SW1(config-if)#ip address 192.168.1.1 255.255.255.252
```

`no switchport` removes the port from every VLAN and turns it into a routed interface — the switch equivalent of a router interface. Two consequences follow that catch people out. The port disappears from `show vlan brief`, so a port you were looking for and cannot find may have become routed. And spanning tree no longer runs on it, because there is no longer a VLAN for it to participate in.

Confirm which mode a port is in before drawing conclusions from it:

```
SW1#show interfaces GigabitEthernet0/24 switchport | include Switchport
Switchport: Disabled
```

### The switch needs its own way out

An SVI-routing switch knows only its directly connected VLANs. Traffic destined anywhere else — the internet, another site — needs a route, and its absence looks exactly like an inter-VLAN failure to a user who was trying to reach a remote server.

```
SW1(config)#ip route 0.0.0.0 0.0.0.0 192.168.1.2
```

**And the router on the far side needs return routes for every VLAN**, or you get the asymmetric case: outbound packets leave correctly and nothing comes back.

---

## The host is the problem

Before rebuilding a router configuration, spend one command on the host. A missing or wrong default gateway produces an inter-VLAN symptom without any network device being at fault, and it is far more common than any of the above on a network that was working yesterday.

```
PC1> ipconfig /all
   IPv4 Address. . . . . . . . . . . : 10.0.10.50
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . :
```

Two variants, with different symptoms:

| Host fault | What breaks | What still works |
|---|---|---|
| No default gateway | everything off-subnet | everything on-subnet |
| Wrong gateway address | everything off-subnet | on-subnet, including ping to the real gateway |
| **Wrong subnet mask** | some destinations only | the ones the wrong mask happens to include |

The mask case is the nasty one. A host with /16 where it should have /24 believes 10.0.20.50 is a local neighbour, ARPs for it instead of sending to the gateway, and gets no answer — while everything outside 10.0.0.0/16 routes perfectly, because those destinations are still recognised as remote. **Selective failure that correlates with address ranges rather than with VLANs is a mask problem, not a routing problem.**

The switch's own view confirms whether the host is even talking:

```
SW1#show mac address-table address 0050.7966.6801
          Mac Address Table
Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
  10    0050.7966.6801    DYNAMIC     Fa0/1
```

```
SW1#show ip arp 10.0.10.50
Protocol  Address          Age (min)  Hardware Addr   Type   Interface
Internet  10.0.10.50             2    0050.7966.6801  ARPA   Vlan10
```

An `Incomplete` entry there means the gateway asked and nothing answered — the host is in a different VLAN from the one you think, or is not on the network at all.

---

## Working it in order

The sequence below resolves the great majority of inter-VLAN faults, and each step eliminates a whole class rather than a single cause.

1. **From the host, ping the gateway.** Success proves Layer 2 and the VLAN assignment, and moves the search to Layer 3. Failure means the VLAN, the access port or the SVI — not routing.
2. **From the router or switch, `show ip route`.** Connected routes for every VLAN must be present. Their absence on a switch means `ip routing`; on a router it means an interface is down.
3. **`show ip interface brief`.** Any subinterface or SVI not `up/up` is the fault. On a router, look at the parent interface before the subinterfaces.
4. **`show vlan brief` on the switch.** The VLAN must exist, be `active`, and have at least one member port.
5. **`show interfaces trunk`.** For router-on-a-stick, the uplink must be trunking, must carry the VLAN, and the native VLAN must match both ends.
6. **Ping from the router sourced from the LAN address.** This tests the return path, which is the half nobody checks:

```
R1#ping 10.0.20.50 source 10.0.10.1
```

---

## Quick reference

| Command | Proves |
|---|---|
| `show ip interface brief` | SVI and subinterface line state; whether the parent is down |
| `show ip route` | that routing is on and connected routes exist per VLAN |
| `show vlan brief` | the VLAN exists, is active, and has member ports |
| `show interfaces trunk` | trunk status, allowed VLANs, and the native VLAN on each end |
| `show interfaces <int>.<sub>` | the encapsulation VLAN ID actually bound to the subinterface |
| `show interfaces <int> switchport` | access vs trunk vs routed port; administrative vs operational mode |
| `show running-config \| include ip routing` | whether the multilayer switch will route at all |
| `show ip arp <ip>` | whether the gateway can resolve the host — `Incomplete` means silence |
| `show mac address-table address <mac>` | which VLAN and port the host is really in |
| `ping <remote> source <lan-ip>` | the return path, which the default-sourced ping does not test |

---

*Based on the NetworkLessons troubleshooting series: inter-VLAN routing on Cisco IOS.*
