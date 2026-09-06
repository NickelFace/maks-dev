---
title: "VLANs and Trunks"
date: 2026-09-06
description: "Why a host lands in the wrong broadcast domain or none at all: missing VLANs, wrong access assignment, trunks that never formed, allowed-list gaps, native VLAN mismatches and the VTP defaults that erase a database."
tags: ["Troubleshooting", "VLAN", "Trunk", "DTP", "VTP", "Cisco"]
categories: ["Troubleshooting"]
unit: 3
---

A VLAN fault almost always reports as an addressing fault. The user has a 169.254 address, or no address, or an address in a subnet nobody expected. Nothing on the switch is down, no counter is climbing, and the port is `connected`. The frame is being delivered — into the wrong broadcast domain, or into one that stops at the first uplink.

There are five places a VLAN can go missing between two hosts, and they are worth working in order, because each one is cheap to check and the later ones only matter once the earlier ones are clean: does the VLAN exist, is the port in it, is the port in the right *mode*, did the trunk form, and is the VLAN permitted on it.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| Host gets no DHCP address at all | VLAN missing from the database, or port inactive | `show vlan brief`, `show interfaces status` |
| Host gets an address from the wrong subnet | access port in the wrong VLAN | `show interfaces <int> switchport` |
| Works on one switch, not across the uplink | trunk did not form, or VLAN not allowed on it | `show interfaces trunk` |
| One VLAN works, another does not, same ports | VLAN missing from the allowed list | `show interfaces trunk` second section |
| All VLANs disappeared after a switch was added | VTP overwrote the database | `show vtp status` |
| CDP logs a native VLAN mismatch every minute | native VLANs differ across the trunk | `show interfaces trunk` |
| Port `connected` but VLAN column shows a number nobody uses | VLAN suspended or not in the database | `show vlan brief` status column |

---

## The VLAN is not in the database

The first check, and the one people skip because it feels too obvious:

```
SW1#show vlan brief

VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Gi0/3, Gi0/4, Gi0/5
10   USERS                            active    Gi0/6, Gi0/7
20   SERVERS                          active    Gi0/8
30   VOICE                            suspended
1002 fddi-default                     act/unsup
```

Two things in that output are load-bearing. VLAN 100 is not listed at all, so any port assigned to it is dead. And VLAN 30 is listed but **suspended**, which is a different fault with an identical symptom — the VLAN exists, `show running-config` shows the port assigned to it correctly, and no frame in it is forwarded.

The status column is worth reading properly:

| Status | Meaning |
|---|---|
| `active` | normal |
| `suspended` | somebody configured `state suspend` on the VLAN |
| `act/lshut` | active, but shut down locally with `shutdown` in VLAN config |
| `sus/lshut` | both |
| `act/unsup` | a legacy VLAN this platform does not support — ignore it |

A port assigned to a VLAN the switch does not have says so, though only if you ask the right command:

```
SW1#show interfaces GigabitEthernet0/9 switchport | include Access Mode
Access Mode VLAN: 100 (Inactive)
```

```
SW1#show interfaces status

Port      Name               Status       Vlan       Duplex  Speed Type
Gi0/9     ## desk 31 ##      inactive     100          full   1000 10/100/1000BaseTX
```

**`(Inactive)` and the `inactive` status are the marker.** The port has a link and a configuration; it has nowhere to put the frames.

Creating the VLAN fixes it — provided the switch is allowed to create VLANs, which is a VTP question addressed further down:

```
SW1(config)#vlan 100
SW1(config-vlan)#name MANAGEMENT
SW1(config-vlan)#no shutdown
SW1(config-vlan)#state active
```

---

## The access port is in the wrong VLAN

The single most common VLAN fault, and the one most likely to be misdiagnosed as a DHCP problem, because the host *does* get an address — from the wrong scope.

```
SW1#show interfaces GigabitEthernet0/6 switchport

Name: Gi0/6
Switchport: Enabled
Administrative Mode: static access
Operational Mode: static access
Administrative Trunking Encapsulation: dot1q
Negotiation of Trunking: Off
Access Mode VLAN: 1 (default)
Trunking Native Mode VLAN: 1 (native)
Voice VLAN: none
```

`Access Mode VLAN: 1 (default)` on a port that was supposed to be in VLAN 10. Somebody configured `switchport mode access` and never followed it with `switchport access vlan 10`, and the port silently defaulted.

```
SW1(config)#interface GigabitEthernet0/6
SW1(config-if)#switchport mode access
SW1(config-if)#switchport access vlan 10
```

Read `Administrative Mode` and `Operational Mode` as a pair. **Administrative is what was typed; operational is what the port actually became.** When they differ, DTP negotiated something other than what was intended, and that is the next section.

Confirm from the other direction as well — the MAC address table shows which VLAN the switch believes the host lives in, and it does not lie:

```
SW1#show mac address-table address 0011.2233.4455
          Mac Address Table
-------------------------------------------
Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
   1    0011.2233.4455    DYNAMIC     Gi0/6
```

---

## The trunk never formed

The classic DTP trap: two ports left at their defaults, both willing to become a trunk, neither prepared to ask.

```
SW1#show interfaces GigabitEthernet0/1 switchport | include Mode
Administrative Mode: dynamic auto
Operational Mode: static access
```

**`dynamic auto` responds to a trunking proposal but never sends one.** Two `dynamic auto` ports facing each other therefore both wait, both time out, and both settle into access mode in VLAN 1. The link is up, CDP works, ping between the switch management addresses works — and every VLAN except 1 stops at that link.

| Local mode | Remote mode | Result |
|---|---|---|
| `trunk` | `trunk` | trunk |
| `trunk` | `dynamic desirable` | trunk |
| `trunk` | `dynamic auto` | trunk |
| `dynamic desirable` | `dynamic desirable` | trunk |
| `dynamic desirable` | `dynamic auto` | trunk |
| **`dynamic auto`** | **`dynamic auto`** | **access — no trunk** |
| `trunk` | `access` | mismatch — frames leak between VLAN 1 and the access VLAN |
| `access` | anything | access |

The row that catches people twice is `trunk` opposite `access`. It is not a benign non-trunk: the trunking side tags everything except its native VLAN, the access side drops tagged frames it did not expect and accepts the untagged ones, and the result is a partial, one-directional path that looks like an intermittent fault.

`show interfaces trunk` is the fastest confirmation, because a port that is not trunking is absent from it entirely:

```
SW1#show interfaces trunk

Port        Mode         Encapsulation  Status        Native vlan
Gi0/2       on           802.1q         trunking      1
```

Gi0/1 was supposed to be there. It is not, so it is not a trunk, and no further trunk configuration on it will matter until that changes:

```
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#switchport trunk encapsulation dot1q
SW1(config-if)#switchport mode trunk
SW1(config-if)#switchport nonegotiate
```

`switchport nonegotiate` stops DTP frames entirely. Configure both ends statically and turn DTP off — a dynamic port facing an unmanaged device or a hostile host is an attack surface, and a trunk that negotiated itself into existence is a trunk that can negotiate itself back out.

### Encapsulation mismatch

On switches old enough to offer a choice, both ends must agree:

```
SW1#show interfaces trunk

Port        Mode         Encapsulation  Status        Native vlan
Gi0/1       on           isl            trunking      1
Gi0/2       on           802.1q         trunking      1
```

ISL is Cisco-proprietary, encapsulates the entire frame rather than inserting a tag, and is absent from every current platform. If `switchport trunk encapsulation` is rejected as an unknown command, the switch supports 802.1Q only and there is nothing to mismatch — go straight to `switchport mode trunk`.

The value to watch for is `n-802.1q` in that column: the `n-` prefix means **negotiated**, which tells you the port arrived at 802.1Q through DTP rather than configuration, and can therefore arrive somewhere else after a reload.

---

## The VLAN is not allowed on the trunk

The trunk is up, the VLAN exists on both switches, the access ports are correct, and one VLAN still does not cross. The allowed list is the answer, and `show interfaces trunk` prints three separate lists that answer three different questions:

```
SW1#show interfaces trunk

Port        Mode         Encapsulation  Status        Native vlan
Gi0/1       on           802.1q         trunking      99

Port        Vlans allowed on trunk
Gi0/1       1,10,20,99

Port        Vlans allowed and active in management domain
Gi0/1       1,10,99

Port        Vlans in spanning tree forwarding state and not pruned
Gi0/1       1,99
```

Reading downward is the diagnosis:

- **Allowed on trunk** — what the configuration permits. VLAN 100 is missing here, so no amount of work elsewhere will carry it.
- **Allowed and active** — of those, the ones that exist and are active in the VLAN database. VLAN 20 is configured as allowed but has dropped out, so it is not in the database on this switch or it is suspended.
- **Forwarding and not pruned** — of those, the ones spanning tree is actually forwarding. VLAN 10 has fallen out here, so it is either blocked by STP on this port or removed by VTP pruning.

Each list is a subset of the one above it, and the line where a VLAN disappears names the subsystem responsible.

```
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#switchport trunk allowed vlan add 100
```

**Use `add` and `remove`, never bare `switchport trunk allowed vlan 100`.** The bare form replaces the entire list with the single VLAN named. Typed on the uplink of a live distribution switch, it removes every other VLAN from the trunk in one keystroke, which is a memorable way to learn the difference.

---

## Native VLAN mismatch

The native VLAN is the one VLAN sent untagged across an 802.1Q trunk. When the two ends disagree about which one it is, traffic does not stop — it **crosses between two VLANs**, because the frames one side sends untagged in VLAN 1 are received by the other side as untagged and therefore VLAN 99.

CDP notices within a minute and says so plainly:

```
%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on
GigabitEthernet0/1 (1), with SW2 GigabitEthernet0/1 (99).
```

The number in the first bracket is the local native VLAN, the second is the neighbour's. This message is one of the strongest arguments for leaving CDP enabled on inter-switch links: without it, the fault is a silent merge of two broadcast domains.

PVST+ reacts more forcefully than CDP does. It carries the VLAN ID inside the BPDU, sees a BPDU arrive with the wrong PVID, and blocks the port rather than allow the merge:

```
%SPANTREE-2-RECV_PVID_ERR: Received BPDU with inconsistent peer vlan id 99
on GigabitEthernet0/1 VLAN1.
%SPANTREE-2-BLOCK_PVID_LOCAL: Blocking GigabitEthernet0/1 on VLAN0001.
Inconsistent local vlan.
```

```
SW1#show spanning-tree inconsistentports

Name                 Interface              Inconsistency
-------------------- ---------------------- ------------------
VLAN0001             GigabitEthernet0/1     PVID Inconsistent
VLAN0099             GigabitEthernet0/1     PVID Inconsistent
```

So the symptom of a native VLAN mismatch depends on what is running: with plain 802.1Q and no PVST+, two VLANs quietly merge; with PVST+, the trunk goes down for those VLANs and the fault is loud. The second outcome is the better one.

```
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#switchport trunk native vlan 99
```

Set the native VLAN to an unused VLAN on every trunk, and make it the same unused VLAN everywhere. Leaving it at 1 works but puts untagged traffic in the same VLAN as the default access assignment of every unconfigured port on the switch.

---

## VTP

VTP propagates the VLAN database between switches in the same domain, and it is responsible for two entirely different classes of surprise.

```
SW1#show vtp status
VTP Version capable             : 1 to 3
VTP version running             : 1
VTP Domain Name                 : CAMPUS
VTP Pruning Mode                : Enabled
VTP Operating Mode              : Server
Configuration Revision          : 47
Maximum VLANs supported locally : 1005
Number of existing VLANs        : 9
```

**Mode.** A switch in `client` mode cannot create, delete or rename a VLAN. Attempting to do so is rejected, and the message is easy to miss in a long paste of configuration:

```
SW2(config)#vlan 100
VTP VLAN configuration not allowed when device is in CLIENT mode.
```

That produces the first fault on this page — a port assigned to a VLAN that will never exist locally — with a cause nowhere near the port.

**Revision number.** This is the one that takes a campus down. A server or client joining the domain compares revision numbers and accepts the higher one, whatever it contains. A switch returned from a lab bench, still in server mode, still carrying the domain name, with a revision of 71 and three VLANs in it, will overwrite a production database sitting at 47. The VLANs vanish, every access port assigned to them goes inactive, and the trigger was plugging in a switch.

Two habits prevent it. **Set a new switch to `transparent` before it touches the network**, which resets its revision to 0 and stops it from participating:

```
SW2(config)#vtp mode transparent
```

And check the revision before connecting anything:

```
SW2#show vtp status | include Revision|Domain|Operating
VTP Domain Name                 : CAMPUS
VTP Operating Mode              : Transparent
Configuration Revision          : 0
```

A blank domain name is its own hazard: **a switch with a null VTP domain adopts the first domain name it hears** on a trunk, along with that domain's database.

**Pruning.** VTP pruning removes a VLAN from a trunk when no downstream port needs it, which saves bandwidth and confuses troubleshooting, because a correctly allowed VLAN shows up as missing from the third list of `show interfaces trunk`. That is pruning working as designed. It becomes a fault when a host is later moved into that VLAN and the switch has not yet re-advertised its need for it, or when the VLAN is required for a purpose the switch cannot see, such as a downstream device that is silent until it receives something.

```
SW1(config)#no vtp pruning
```

VLAN 1 is never pruned regardless of configuration.

---

## Quick reference

| Command | What it proves |
|---|---|
| `show vlan brief` | which VLANs exist, their status, and which access ports are in them |
| `show interfaces status` | `inactive` — the port's VLAN is missing or suspended |
| `show interfaces <int> switchport` | administrative vs operational mode, access VLAN, native VLAN |
| `show interfaces trunk` | which ports are trunking, and the three allowed/active/forwarding lists |
| `show interfaces <int> trunk` | the same three lists for one port |
| `show mac address-table address <mac>` | which VLAN the switch actually placed the host in |
| `show spanning-tree inconsistentports` | PVID inconsistency from a native VLAN mismatch |
| `show vtp status` | domain, mode, revision number and whether pruning is on |
| `show cdp neighbors detail` | the neighbour's native VLAN and port, for comparison |
| `show running-config interface <int>` | what was typed, when the operational state disagrees |

| Fault | One-line fix |
|---|---|
| VLAN absent | `vlan 100` on a server or transparent switch |
| VLAN suspended | `state active` inside VLAN configuration |
| Access port defaulted to VLAN 1 | `switchport access vlan 10` |
| Trunk did not form | `switchport mode trunk` plus `switchport nonegotiate` on both ends |
| VLAN not on the trunk | `switchport trunk allowed vlan add 100` |
| Native VLAN mismatch | `switchport trunk native vlan 99` on both ends |
| New switch wiped the database | `vtp mode transparent` before connecting it |

---

*Based on the NetworkLessons troubleshooting series: VLANs and trunks on Cisco IOS.*
