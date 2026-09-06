---
title: "IPv6 Addressing and SLAAC"
date: 2026-09-06
description: "Why a host ends up with nothing but a link-local address, how the A, M and O flags decide between SLAAC and DHCPv6, and reading NDP neighbour states when the link looks fine and routing is not."
tags: ["Troubleshooting", "IPv6", "SLAAC", "NDP", "Cisco"]
categories: ["Troubleshooting"]
unit: 6
---

The complaint is always the same shape: the host has an IPv6 address, it can reach its neighbour on the segment, and it cannot reach anything else. That combination is not a routing fault. It is a host that autoconfigured a link-local address on its own — which requires no router at all — and never received the Router Advertisement that would have given it a global prefix and a default gateway.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| Only `FE80::` on the host, no global address | **`ipv6 unicast-routing` not enabled** — the router sends no RAs | `show running-config \| include unicast-routing` |
| Global address present, no default route | RA received but router lifetime is 0 | `show ipv6 interface` on the router |
| Address appears after 2–3 minutes, not immediately | host missed the RS window; waiting for the periodic RA | `debug ipv6 nd` |
| Host gets a prefix but no address | **prefix is not /64** — EUI-64 cannot run | `show ipv6 interface \| include subnet` |
| Host asks DHCPv6 instead of autoconfiguring | **M-flag set** in the RA | `show ipv6 interface \| include DHCP` |
| One host has no address, the rest are fine | **DAD failure** — duplicate address on the link | `show logging \| include DUPLICATE` |
| Neighbour reachable, everything else is not | no default gateway learned from the RA | `show ipv6 route ::/0` on the host |
| `show ipv6 neighbors` stuck in `INCMP` | no Neighbor Advertisement returned — L2 problem or filtering | `show ipv6 neighbors` |

---

## The single most common cause

An IPv6 interface with an address configured is not a router. Cisco IOS forwards IPv6 and sends Router Advertisements only after `ipv6 unicast-routing` is enabled globally. Without it the interface still has its address, still answers pings from the segment, and still shows a perfectly healthy `show ipv6 interface brief` — and it silently sends no RAs at all. Hosts on the segment autoconfigure their link-local addresses, discover each other, and go no further.

```
R1#show running-config | include unicast-routing
R1#
```

Empty output. That is the fault.

The router's own interface tells you the same thing from a different angle — look at the multicast groups it has joined:

```
R1#show ipv6 interface GigabitEthernet0/0
GigabitEthernet0/0 is up, line protocol is up
  IPv6 is enabled, link-local address is FE80::21A:2FFF:FEC1:5A01
  Global unicast address(es):
    2001:DB8:1::1, subnet is 2001:DB8:1::/64
  Joined group address(es):
    FF02::1
    FF02::1:FF00:1
    FF02::1:FFC1:5A01
```

`FF02::1` is all-nodes — every IPv6 interface joins it. **`FF02::2` is all-routers, and it is missing.** A router that has not joined all-routers is not listening for Router Solicitations and will never answer one. After the fix the group appears:

```
R1(config)#ipv6 unicast-routing
```

```
R1#show ipv6 interface GigabitEthernet0/0 | include FF02
    FF02::1
    FF02::2
    FF02::1:FF00:1
```

Hosts do not wait for the next periodic RA after this — the router sends unsolicited RAs immediately when the function is enabled, and any host that sends an RS gets an answer within a second.

---

## RA timing, and the host that fixes itself after three minutes

A host that boots sends up to three Router Solicitations to `FF02::2`, roughly four seconds apart, and then stops. If no router answers those three, the host waits for the router's **periodic** RA — and on Cisco IOS the default interval is **200 seconds**, with a router lifetime of 1800 seconds.

```
R1#show ipv6 interface GigabitEthernet0/0 | include advertis
  ND advertised reachable time is 0 (unspecified)
  ND advertised retransmit interval is 0 (unspecified)
  ND router advertisements are sent every 200 seconds
  ND router advertisements live for 1800 seconds
```

That produces one of the more misleading reports in IPv6: "it works, but it takes three minutes." It is not slow — the host's solicitations were lost or arrived before the router was ready, and it is now sitting out the rest of the 200-second cycle. The cause is usually upstream of IPv6 entirely: a switch port without PortFast spending 30 seconds in listening and learning, or an access point that finished associating after the host had already given up soliciting.

Lowering the interval treats the symptom and is legitimate on a segment with a lot of client churn:

```
R1(config-if)#ipv6 nd ra interval 30    ! default is 200 seconds
```

**Router lifetime 0 is a distinct and nastier case.** An RA with lifetime 0 is a valid RA — it carries the prefix, so hosts autoconfigure a global address — but it explicitly says "do not use me as a default router". The host ends up with a correct global address and no default route, which looks exactly like a routing failure:

```
R1(config-if)#ipv6 nd ra lifetime 0     ! prefix yes, default gateway no
```

Check `ND router advertisements live for` before you go looking at the routing table.

---

## The three flags

Three bits in the Router Advertisement decide how a host gets its address, and every combination is a valid design that produces a different set of symptoms when it does not match the deployed servers.

| A | M | O | Host behaviour | Cisco IOS command |
|---|---|---|---|---|
| 1 | 0 | 0 | **pure SLAAC** — address from the prefix, no DHCPv6 | default |
| 1 | 0 | 1 | SLAAC address, **DHCPv6 for DNS only** (stateless DHCPv6) | `ipv6 nd other-config-flag` |
| 0 | 1 | — | **stateful DHCPv6** — server assigns the address | `ipv6 nd managed-config-flag` |
| 0 | 0 | 0 | no address at all — prefix is on-link only | `ipv6 nd prefix ... no-autoconfig` |

The **A-flag (Autonomous)** is per-prefix and set by default; it is what authorises the host to build an address from that prefix. The **M-flag (Managed)** and **O-flag (Other)** are per-RA and clear by default.

The failure worth recognising: **M-flag set, no DHCPv6 server on the segment.** The host obediently stops autoconfiguring, sends a DHCPv6 Solicit to `FF02::1:2`, gets nothing, and ends with a link-local address only. The router looks perfect, the RA is being sent, and the host has no address — because the RA told it not to build one.

```
R1#show ipv6 interface GigabitEthernet0/0 | include DHCP
  Hosts use DHCP to obtain routable addresses.
```

That line is the M-flag in prose. `Hosts use DHCP to obtain other configuration.` is the O-flag. Neither line present means both bits are clear and hosts should be doing plain SLAAC.

```
R1(config-if)#no ipv6 nd managed-config-flag
```

---

## Prefix length: SLAAC needs /64

EUI-64 takes a 48-bit MAC address, splits it in the middle, inserts `FFFE`, and flips the seventh bit of the first byte — producing a 64-bit interface identifier. That identifier occupies the lower half of the address, so **the prefix must be exactly 64 bits or there is nowhere to put it.**

```
R1(config-if)#ipv6 address 2001:DB8:1::1/48
```

The router accepts this without complaint. It routes correctly. It advertises the prefix in its RA. And no host on that segment will ever autoconfigure an address from it, because a /48 leaves 80 bits of host portion and the host has 64 bits of identifier to insert. Hosts either ignore the prefix or produce something the router does not consider on-link.

```
R1#show ipv6 interface GigabitEthernet0/0 | include subnet
    2001:DB8:1::1, subnet is 2001:DB8:1::/48    ! not /64 — SLAAC will not work here
```

This is a design rule, not a Cisco quirk. Point-to-point links between routers are commonly configured /127 and that is fine — no hosts autoconfigure there. Any segment with hosts on it gets a /64.

---

## The prefix that is advertised but not usable

By default the router advertises every prefix configured on the interface. `ipv6 nd prefix` overrides that per prefix, and the two forms produce very different symptoms.

```
R1(config-if)#ipv6 nd prefix 2001:DB8:1::/64 no-advertise
```

The prefix vanishes from the RA entirely. Hosts get the RA, learn a default gateway from it, and have no global address — connectivity to the gateway's link-local works, everything else fails.

```
R1(config-if)#ipv6 nd prefix 2001:DB8:1::/64 2592000 604800 no-autoconfig
```

The prefix is still advertised, still marked on-link, and the **A-flag is cleared** — so hosts know the prefix is on this segment but are not permitted to build an address from it. Same visible result, different bit. The two numbers are the valid and preferred lifetimes in seconds, and the IOS defaults are 2592000 (30 days) and 604800 (7 days).

Read the advertised prefixes directly rather than inferring them from the interface addresses:

```
R1#show ipv6 interface GigabitEthernet0/0 prefix
IPv6 Prefix Advertisements GigabitEthernet0/0
Codes: A - Address, P - Prefix-Advertisement, O - Pool
       U - Per-user prefix, D - Default
       N - Not advertised, C - Calendar

 AD   2001:DB8:1::/64 [LA] Valid lifetime 2592000, preferred lifetime 604800
```

**`[LA]` is the pair that matters** — `L` is the on-link flag, `A` is the autonomous flag. `[L]` alone means the A-flag is off and SLAAC will not happen.

---

## Link-local: why the neighbour is up and routing is not

Every IPv6 interface has a link-local address, formed without any router, valid only on that segment, and never routed. That means a great many tests succeed on a broken segment:

```
R1#ping FE80::21A:2FFF:FEC1:5B02
Output Interface: GigabitEthernet0/0
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms
```

Five exclamation marks proving Layers 1, 2 and part of 3 — on a link where global addressing is entirely absent. Note that the ping demanded an output interface: `FE80::/10` is ambiguous by definition, because the same link-local address can exist on every interface of the router, so an unqualified ping to one cannot be routed.

The counter-intuitive half of this: **the default gateway a host installs from an RA is the RA's source link-local address, not the router's global address.** Look at a host's IPv6 routing table and the default route points at `FE80::` something:

```
PC#show ipv6 route ::/0
S   ::/0 [2/0]
     via FE80::21A:2FFF:FEC1:5A01, GigabitEthernet0/0
```

Two consequences follow, and both bite in production. Renumbering the router's global address does not disturb the hosts at all — their gateway is the link-local, which did not change. And configuring a static route on a host or a router towards a link-local next hop **must** name the exit interface, because the address alone does not identify a link:

```
R2(config)#ipv6 route 2001:DB8:1::/64 GigabitEthernet0/0 FE80::21A:2FFF:FEC1:5A01
```

---

## Duplicate Address Detection

Before an interface uses any address — link-local included — it sends a Neighbor Solicitation for that address to the solicited-node multicast group, sourced from `::`. If anything answers, the address is not used.

```
R1#show ipv6 interface GigabitEthernet0/0 | include DAD
  ND DAD is enabled, number of DAD attempts: 1
```

A failure is loud and specific:

```
%IPV6-4-DUPLICATE: Duplicate address 2001:DB8:1::1 on GigabitEthernet0/0
```

```
R1#show ipv6 interface GigabitEthernet0/0
  Global unicast address(es):
    2001:DB8:1::1, subnet is 2001:DB8:1::/64 [DUPLICATE]
```

`[DUPLICATE]` means the address is configured and not in use. The interface keeps forwarding on its other addresses, so partial connectivity is normal here and makes the fault hard to see.

**When the duplicate is the link-local address, the whole interface is disabled for IPv6.** That is the one case where DAD takes everything down rather than one address, and the usual cause is a hand-configured `FE80::1` reused on two routers on the same segment — a common convention that works fine until two routers on the same VLAN both adopt it.

Recovery requires a bounce; clearing the duplicate is not enough on its own:

```
R1(config-if)#shutdown
R1(config-if)#no shutdown
```

---

## NDP replaces ARP

IPv6 has no ARP. Address resolution is Neighbor Solicitation and Neighbor Advertisement — ICMPv6 types 135 and 136 — sent to the solicited-node multicast address rather than broadcast. The table is read the same way an ARP cache is:

```
R1#show ipv6 neighbors
IPv6 Address                              Age Link-layer Addr State Interface
2001:DB8:1::10                              0 0050.5601.1a30  REACH Gi0/0
2001:DB8:1::11                             12 0050.5601.1a31  STALE Gi0/0
2001:DB8:1::12                              -  -              INCMP Gi0/0
FE80::21A:2FFF:FEC1:5B02                    3 001a.2fc1.5b02  REACH Gi0/0
```

| State | Meaning | Diagnostic value |
|---|---|---|
| `INCMP` | solicitation sent, **no advertisement received** | the equivalent of an `Incomplete` ARP entry — the host is not there, or is filtered |
| `REACH` | confirmed reachable within the last 30 seconds | working, right now |
| `STALE` | was reachable; no confirmation recently | **normal, not a fault** — nothing has needed to talk to it |
| `DELAY` | traffic sent to a stale entry, waiting before probing | transient |
| `PROBE` | actively re-soliciting | transient; becomes `INCMP` or `REACH` |

**`STALE` is the entry people misread.** It is not a problem — it means the neighbour has been quiet, and the entry will be verified the moment something sends to it. `INCMP` is the one to act on.

The reachable timer that governs the transition is visible on the interface, and its default is 30 seconds:

```
R1#show ipv6 interface GigabitEthernet0/0 | include reachable
  ND reachable time is 30000 milliseconds (using 30000)
```

Because NDP is ICMPv6, **an ACL that blocks ICMPv6 breaks address resolution entirely** — not only ping. That mistake has no IPv4 equivalent, since IPv4 resolution runs on ARP below the IP layer and survives any amount of ICMP filtering. Blocking ICMPv6 on an IPv6 segment stops the segment working.

---

## Watching the exchange

When the static output does not explain it, watch the packets. `debug ipv6 nd` is low-volume on a quiet lab segment and should be used with care on a populated VLAN:

```
R1#debug ipv6 nd
ICMP Neighbor Discovery events debugging is on

ICMPv6-ND: Received RS on GigabitEthernet0/0 from FE80::250:56FF:FE01:1A30
ICMPv6-ND: Sending solicited RA on GigabitEthernet0/0
ICMPv6-ND: Request to send RA for FE80::21A:2FFF:FEC1:5A01
ICMPv6-ND: prefix = 2001:DB8:1::/64 onlink autoconfig
```

That is a healthy exchange, and it names the two flags in plain text: `onlink autoconfig`. A solicitation received with no RA sent afterwards points back at `ipv6 unicast-routing`. RAs being sent with `onlink` but not `autoconfig` is the A-flag cleared. And no RS arriving at all, when a host is definitely booting on that segment, moves the investigation down to Layer 2 — wrong VLAN, trunk not carrying it, or a port still in STP listening state.

---

## Quick reference

| Command | Proves |
|---|---|
| `show running-config \| include unicast-routing` | whether the router will send RAs at all — **check this first** |
| `show ipv6 interface brief` | which interfaces have IPv6 enabled and what addresses they hold |
| `show ipv6 interface <int>` | RA interval and lifetime, M/O flags, DAD state, joined groups |
| `show ipv6 interface <int> \| include FF02::2` | whether the router joined all-routers — a proxy for RA capability |
| `show ipv6 interface <int> prefix` | advertised prefixes with their `[LA]` on-link/autonomous flags |
| `show ipv6 neighbors` | NDP resolution — `INCMP` is the failure, `STALE` is not |
| `show ipv6 route ::/0` | the default route, and that its next hop is a link-local address |
| `show logging \| include DUPLICATE` | DAD failure and which address lost |
| `debug ipv6 nd` | the live RS/RA and NS/NA exchange, with prefix flags spelled out |
| `ping FE80::… ` + output interface | Layer 2 reachability without any global addressing in play |

---

*Based on the NetworkLessons troubleshooting series: IPv6 stateless autoconfiguration on Cisco IOS.*
