---
title: "Lab 19 · IPv6 Addressing"
date: 2026-09-06
description: "Global unicast, link-local, EUI-64 and SLAAC — plus the compression rules the exam tests and the NDP messages that replaced ARP."
tags: ["CCNA", "IPv6", "SLAAC", "NDP", "Lab"]
categories: ["CCNA"]
domain: 1
tool: "Packet Tracer"
duration: "50 min"
sources: "Jeremy's IT Lab Day 31, 32 · Flackbox 30-1"
aliases: ["/ccna-labs/ccna-lab-30-ipv6/"]
---

IPv6 is not IPv4 with more digits. Broadcast is gone entirely, ARP is replaced by a multicast protocol, every interface has at least two addresses, and hosts can configure themselves without a DHCP server. The CCNA tests the address formats hard and the mechanics lightly — so this lab spends its first part on compression arithmetic and its second on watching NDP work.

## Topology

{{< topology cols="4" rows="2" caption="Two routers, two LANs, dual-stack — IPv6 alongside the existing IPv4" >}}
pc     PC1 "SLAAC" at 0,0
switch SW1 "" at 1,0
router R1 "2001:db8:0:1::1" at 2,0
router R2 "2001:db8:0:2::1" at 3,0
pc     PC2 "static" at 3,1

PC1 — SW1
SW1 — R1
R1 — R2 label="2001:db8:0:12::/64"
R2 — PC2
{{< /topology >}}

| Segment | Prefix | R1 | R2 |
|---|---|---|---|
| LAN A | 2001:db8:0:1::/64 | ::1 | — |
| WAN | 2001:db8:0:12::/64 | ::1 | ::2 |
| LAN B | 2001:db8:0:2::/64 | — | ::1 |

## Objectives

- Compress and expand IPv6 addresses correctly under both rules
- Classify an address as GUA, LLA, ULA or multicast from its first digits
- Configure static IPv6, EUI-64 and link-local addresses
- Enable SLAAC and watch a host build its own address from a Router Advertisement
- Read the neighbour table and identify the NDP messages that replaced ARP

---

## Part 1 — The address format

{{< step num="1" dev="—" title="Two compression rules, applied in order" open="true" >}}
An IPv6 address is **128 bits**, written as eight groups of four hex digits.

**Rule 1 — drop leading zeros in any group.** Trailing zeros stay.

```
2001:0db8:0000:0001:0000:0000:0000:0001
2001:db8:0:1:0:0:0:1
```

**Rule 2 — replace one run of consecutive all-zero groups with `::`.** Once, and only once.

```
2001:db8:0:1::1
```

Only once, because the expansion is arithmetic: count the groups present, subtract from eight, and that is how many zero groups the `::` stands for. Two of them would be ambiguous.

Practise both directions:

| Full | Compressed |
|---|---|
| `2001:0db8:0000:0000:0000:0000:0000:0001` | `2001:db8::1` |
| `fe80:0000:0000:0000:0204:61ff:fe9d:f156` | `fe80::204:61ff:fe9d:f156` |
| `2001:0db8:0001:0000:0000:0ab9:C0A8:0102` | `2001:db8:1::ab9:c0a8:102` |
| `0000:0000:0000:0000:0000:0000:0000:0001` | `::1` (loopback) |
| `0000:0000:0000:0000:0000:0000:0000:0000` | `::` (unspecified) |

And the trap that appears on every exam: **`2001:db8::1:0:0:1`** cannot compress further. There are two separate runs of zeros and only one may become `::`. Choosing the longer run is the convention; where they are equal, the leftmost wins.
{{< /step >}}

{{< step num="2" dev="—" title="Address types, identified by their first digits" >}}
| Type | Prefix | Scope | Notes |
|---|---|---|---|
| **Global unicast (GUA)** | **2000::/3** | internet-routable | in practice you see `2001:`, `2002:`, `3ffe:` |
| **Unique local (ULA)** | **fc00::/7** | site | the RFC 1918 equivalent; `fd00::/8` in practice |
| **Link-local (LLA)** | **fe80::/10** | one link only | **mandatory on every interface** |
| **Multicast** | **ff00::/8** | varies | replaces broadcast entirely |
| Loopback | `::1/128` | host | equals 127.0.0.1 |
| Unspecified | `::/128` | — | equals 0.0.0.0 |
| IPv4-mapped | `::ffff:0:0/96` | — | dual-stack sockets |

**`2000::/3` covers 2000:: through 3fff::** — the first three bits are `001`. That is the range worth being able to recognise instantly.

The multicast addresses you must know:

| Address | Group |
|---|---|
| `ff02::1` | all nodes on the link (the closest thing to broadcast) |
| `ff02::2` | all routers on the link |
| `ff02::5` / `ff02::6` | OSPFv3 all-routers / DR-BDR |
| `ff02::9` | RIPng |
| `ff02::a` | EIGRPv6 |
| `ff02::1:ffxx:xxxx` | **solicited-node** — the one NDP uses |

**IPv6 has no broadcast address at all.** Anything IPv4 would have broadcast, IPv6 multicasts to a specific group — which is why an IPv6 network generates far less noise on a host NIC.
{{< /step >}}

---

## Part 2 — Configuration

{{< step num="3" dev="R1" title="Enable IPv6 routing and address the interfaces three ways" open="true" >}}
```
R1(config)#ipv6 unicast-routing
R1(config)#interface GigabitEthernet0/0
R1(config-if)#description ## LAN A ##
R1(config-if)#ipv6 address 2001:db8:0:1::1/64
R1(config-if)#ipv6 address fe80::1 link-local
R1(config-if)#no shutdown
R1(config-if)#exit
R1(config)#interface GigabitEthernet0/1
R1(config-if)#description ## WAN to R2 ##
R1(config-if)#ipv6 address 2001:db8:0:12::1/64
R1(config-if)#ipv6 address fe80::1 link-local
R1(config-if)#no shutdown
R1(config-if)#end
```

**`ipv6 unicast-routing` is mandatory and it is the step everyone forgets.** Without it the router configures addresses, replies to pings, and routes nothing — and, just as importantly, **does not send Router Advertisements**, so every SLAAC host on its LANs fails to configure itself. If hosts are not getting addresses, check this first.

**Setting the link-local address manually is worth doing.** IOS generates one automatically from the MAC, which produces something like `fe80::2d0:97ff:fe44:2c19` — correct, unmemorable, and what you will be typing into static routes and BGP neighbour statements. `fe80::1` on every interface of R1 and `fe80::2` on R2 makes the configuration readable.

Note the same link-local address is used on both interfaces. That is legal: link-local addresses only need to be unique **per link**, not per device. It is also why any command referencing one needs the interface too:

```
R1(config)#ipv6 route 2001:db8:0:2::/64 GigabitEthernet0/1 fe80::2
```
{{< /step >}}

{{< step num="4" dev="R2" title="EUI-64 — let the router build the host portion" >}}
```
R2(config)#ipv6 unicast-routing
R2(config)#interface GigabitEthernet0/0
R2(config-if)#ipv6 address 2001:db8:0:12::2/64
R2(config-if)#ipv6 address fe80::2 link-local
R2(config-if)#no shutdown
R2(config-if)#exit
R2(config)#interface GigabitEthernet0/1
R2(config-if)#ipv6 address 2001:db8:0:2::/64 eui-64
R2(config-if)#no shutdown
R2(config-if)#end
```

`eui-64` tells the router to derive the 64-bit interface identifier from its own MAC address. The algorithm, which is a guaranteed exam question:

```
MAC:            00D0.9744.2C19
1. split in half:        00D097 | 442C19
2. insert FFFE:          00D097 | FFFE | 442C19
3. flip bit 7 of byte 1: 00 = 0000 0000 → 0000 0010 = 02
result:                  02D0:97FF:FE44:2C19
```

Full address: `2001:db8:0:2:2d0:97ff:fe44:2c19/64`

Step 3 is the one people miss. Bit 7 of the first byte is the **Universal/Local** bit, and IPv6 inverts its meaning relative to Ethernet: 0 means universal in EUI-64 and locally-administered in a MAC. Flipping it means a burned-in MAC (U/L = 0) produces an EUI-64 with the bit set to 1.

The shortcut for the exam: **`FFFE` in the middle of the host portion means EUI-64**, and the two hex digits at the start of it will usually be the MAC's first byte with 2 added — `00`→`02`, `04`→`06`, `0C`→`0E`.

EUI-64 has a privacy problem: the address embeds the MAC, so a device is trackable across networks. Modern hosts use RFC 4941 privacy extensions or RFC 7217 stable-but-opaque identifiers instead. Routers still use EUI-64 and the exam still tests it.
{{< /step >}}

{{< verify dev="R2" cmd="show ipv6 interface brief" open="true" >}}
```
R2#show ipv6 interface brief
GigabitEthernet0/0     [up/up]
    FE80::2
    2001:DB8:0:12::2
GigabitEthernet0/1     [up/up]
    FE80::2D0:97FF:FE44:2C19
    2001:DB8:0:2:2D0:97FF:FE44:2C19
```

**Every interface has at least two addresses**, and the link-local is always listed first because it is always present. Gi0/1 shows the auto-generated link-local and the EUI-64 global, both containing `FFFE` and both derived from the same MAC.

The detailed view shows the multicast groups the interface has joined:

```
R2#show ipv6 interface GigabitEthernet0/1
GigabitEthernet0/1 is up, line protocol is up
  IPv6 is enabled, link-local address is FE80::2D0:97FF:FE44:2C19
  Global unicast address(es):
    2001:DB8:0:2:2D0:97FF:FE44:2C19, subnet is 2001:DB8:0:2::/64 [EUI]
  Joined group address(es):
    FF02::1
    FF02::2
    FF02::1:FF44:2C19
  MTU is 1500 bytes
  ND DAD is enabled, number of DAD attempts: 1
  ND reachable time is 30000 milliseconds
  ND advertised default router preference is Medium
  Hosts use stateless autoconfig for addresses.
```

`FF02::1` all-nodes and `FF02::2` all-routers, because this is a router. `FF02::1:FF44:2C19` is the **solicited-node multicast** — built from `FF02::1:FF00:0/104` plus the last 24 bits of the interface address. Every unicast address has one, and NDP uses it instead of a broadcast, so only the handful of hosts sharing those last 24 bits are ever interrupted.

`[EUI]` confirms the address was generated rather than typed.
{{< /verify >}}

---

## Part 3 — SLAAC and NDP

{{< step num="5" dev="PC1" title="A host that configures itself" open="true" >}}
Set PC1's IPv6 configuration to **Automatic**. Within a few seconds:

```
PC> ipv6config
   Link-local IPv6 Address...........: FE80::201:64FF:FE31:A201
   IPv6 Address......................: 2001:DB8:0:1:201:64FF:FE31:A201/64
   Default Gateway...................: FE80::1
```

No DHCP server, no configuration. The sequence:

1. The host builds a **link-local** address from its own MAC via EUI-64 — always, on every interface, unconditionally.
2. It runs **Duplicate Address Detection**: a Neighbour Solicitation to its own solicited-node multicast group. Silence means the address is free.
3. It sends a **Router Solicitation** to `ff02::2` (all routers).
4. R1 replies with a **Router Advertisement** carrying the prefix `2001:db8:0:1::/64` and a prefix length.
5. The host appends its own EUI-64 interface identifier to that prefix.

**The default gateway is the router's link-local address**, never its global one. That is a design decision with a practical benefit: renumbering the site's global prefix does not change any host's gateway.

The router advertises every 200 seconds by default, and immediately in response to a solicitation:

```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ipv6 nd ra interval 30
```

Suppress advertisements on a link with no hosts:

```
R1(config-if)#ipv6 nd ra suppress
```

The three ways a host can get an address:

| Method | Address from | Other options (DNS, domain) | Server state |
|---|---|---|---|
| **SLAAC** | prefix in the RA + own EUI-64 | none (or RDNSS in the RA) | none |
| **Stateless DHCPv6** | prefix in the RA + own EUI-64 | **from DHCPv6** | none |
| **Stateful DHCPv6** | **from DHCPv6** | from DHCPv6 | full lease table |

Two flags in the Router Advertisement steer the host between them: **M** (managed — use stateful DHCPv6 for the address) and **O** (other — use DHCPv6 for the remaining options).
{{< /step >}}

{{< verify dev="R1" cmd="show ipv6 neighbors" open="true" >}}
The IPv6 equivalent of `show ip arp`:

```
R1#show ipv6 neighbors
IPv6 Address                              Age Link-layer Addr State Interface
2001:DB8:0:1:201:64FF:FE31:A201             0 0001.6431.a201  REACH Gi0/0
FE80::201:64FF:FE31:A201                    0 0001.6431.a201  REACH Gi0/0
2001:DB8:0:12::2                            3 00d0.9744.2c19  STALE Gi0/1
```

The same host appears twice — once by global address and once by link-local — because they are genuinely different addresses that happen to share a MAC.

The **state** column has no IPv4 equivalent and is genuinely useful:

| State | Meaning |
|---|---|
| INCMP | solicitation sent, no answer yet |
| **REACH** | confirmed reachable in the last 30 seconds |
| **STALE** | was reachable; not confirmed recently |
| DELAY | stale, traffic pending, waiting before probing |
| PROBE | actively re-soliciting |

ARP tells you an address-to-MAC mapping. NDP tells you that **and** whether the neighbour is currently answering. STALE is not an error — it just means nothing has been sent that way lately.

The four NDP message types, all ICMPv6:

| Message | Type | Replaces / does |
|---|---|---|
| **Router Solicitation (RS)** | 133 | "any routers here?" → `ff02::2` |
| **Router Advertisement (RA)** | 134 | prefix, gateway, M/O flags → `ff02::1` |
| **Neighbour Solicitation (NS)** | 135 | **ARP request** → solicited-node multicast |
| **Neighbour Advertisement (NA)** | 136 | **ARP reply** |

NS and NA also do **Duplicate Address Detection** and **Neighbour Unreachability Detection** — two jobs ARP never had.
{{< /verify >}}

{{< verify dev="PC1" cmd="ping and traceroute over IPv6" >}}
```
PC> ping 2001:db8:0:2:2d0:97ff:fe44:2c19

Reply from 2001:DB8:0:2:2D0:97FF:FE44:2C19: bytes=32 time=2ms TTL=63
```

`TTL=63` — the IPv6 header calls it **Hop Limit** rather than TTL, and it starts at 64 on most hosts. Two hops, so 62 would be expected here; the exact starting value varies by OS.

The link-local ping, which needs the interface specified because `fe80::1` is ambiguous across interfaces:

```
R2#ping FE80::1
Output Interface: GigabitEthernet0/0
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to FE80::1, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5)
```

IOS prompts for the interface. That prompt is the clearest illustration of what "link scope" means: the address is only meaningful in the context of one link.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Hosts get no IPv6 address | `ipv6 unicast-routing` missing — no RAs sent | `show running-config \| include unicast-routing` |
| Router pings but does not route IPv6 | same cause | as above |
| Duplicate address detected | DAD found a conflict | `show ipv6 interface` — address marked DUPLICATE |
| Ping to `fe80::` fails | no interface specified | supply the output interface |
| Neighbour stuck INCMP | NS unanswered — down, filtered, wrong link | `show ipv6 neighbors` |
| Host has an address but no gateway | RAs suppressed, or router link-local missing | `show ipv6 interface` on the router |
| Address contains `FFFE` unexpectedly | EUI-64 generation | expected — configure statically if unwanted |
| `% Invalid input` on `ipv6 address` | IPv6 not enabled on the platform image | check the feature set |

## Exam notes

- **128 bits**, eight hextets. Drop leading zeros; **`::` may appear only once**.
- GUA **2000::/3**, ULA **fc00::/7**, link-local **fe80::/10**, multicast **ff00::/8**. Loopback `::1`, unspecified `::`.
- **No broadcast in IPv6.** `ff02::1` all-nodes, `ff02::2` all-routers.
- EUI-64: split the MAC, insert **FFFE**, **flip bit 7** of the first byte.
- **`ipv6 unicast-routing`** is required for routing *and* for sending Router Advertisements.
- Every interface has a **link-local** address; it is the default gateway hosts actually use.
- NDP: **RS 133, RA 134, NS 135, NA 136** — all ICMPv6. NS/NA replace ARP and also do DAD and NUD.
- SLAAC = prefix from the RA + own interface ID. **M flag** → stateful DHCPv6, **O flag** → other options from DHCPv6.
- The **solicited-node multicast** `ff02::1:ffxx:xxxx` uses the last 24 bits of the unicast address.

---

*Sources: Jeremy's IT Lab Day 31 & 32 · Flackbox CCNA Lab Guide 30-1 · verified in Packet Tracer 8.2.*
