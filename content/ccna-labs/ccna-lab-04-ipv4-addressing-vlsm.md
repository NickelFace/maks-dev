---
title: "Lab 04 · IPv4 Addressing and VLSM"
date: 2026-09-06
description: "Turn a requirements table into a subnet plan without wasting half the address space, then configure it and prove every boundary with a ping that should fail."
tags: ["CCNA", "IPv4", "Subnetting", "VLSM", "Lab"]
categories: ["CCNA"]
domain: 1
tool: "Packet Tracer"
duration: "50 min"
sources: "Jeremy's IT Lab Day 7, 8, 13, 14, 15"
---

Subnetting is the one CCNA topic that is pure arithmetic, and the exam tests it under time pressure. The way to get fast is not to memorise a chart — it is to internalise one number, the **block size**, and let everything else fall out of it.

This lab builds a real addressing plan for a four-site network with wildly different host counts, which is exactly the situation where fixed-length subnetting wastes most of your space and VLSM does not.

## Topology

{{< topology cols="4" rows="3" caption="Three LANs of very different sizes plus two point-to-point WAN links" >}}
switch SW-A "Sales · 100 hosts" at 0,0
switch SW-B "Eng · 50 hosts" at 0,2
router R1 "" at 1,1
router R2 "" at 2,1
switch SW-C "Ops · 25 hosts" at 3,1

SW-A — R1
SW-B — R1
R1 — R2 label="WAN /30"
R2 — SW-C
{{< /topology >}}

## The requirement

You are given **192.168.10.0/24** and this table. Nothing else.

| Segment | Hosts needed |
|---|---|
| Sales LAN | 100 |
| Engineering LAN | 50 |
| Operations LAN | 25 |
| R1 ↔ R2 WAN link | 2 |

A /24 holds 254 usable addresses. Naively splitting it into four equal /26s gives 62 usable each — which fails Sales immediately and wastes 60 addresses on a link that needs two.

## Objectives

- Compute a VLSM plan from a requirements table, largest block first
- Configure the plan on both routers and verify every subnet boundary
- Prove the boundaries by pinging across them and by pinging a broadcast address
- Read a routing table and identify which entry a given destination will match

---

## Part 1 — The arithmetic

{{< step num="1" dev="—" title="Block size: the only number you need to memorise" open="true" >}}
For a mask, the **block size** is `256 − (the interesting octet of the mask)`. Subnets start at multiples of the block size.

| Prefix | Mask | Block | Total addrs | Usable hosts |
|---|---|---|---|---|
| /25 | 255.255.255.**128** | 128 | 128 | 126 |
| /26 | 255.255.255.**192** | 64 | 64 | 62 |
| /27 | 255.255.255.**224** | 32 | 32 | 30 |
| /28 | 255.255.255.**240** | 16 | 16 | 14 |
| /29 | 255.255.255.**248** | 8 | 8 | 6 |
| /30 | 255.255.255.**252** | 4 | 4 | 2 |

Usable = total − 2: one address is the network ID (all host bits 0), one is the directed broadcast (all host bits 1). Neither can be assigned to an interface.

Two formulas, and they use different bit counts:

- **hosts per subnet = 2^h − 2**, where *h* = host bits
- **subnets created = 2^n**, where *n* = bits borrowed from the host portion

Note the −2 appears in one and not the other. Subnets are not reduced by two; hosts are.
{{< /step >}}

{{< step num="2" dev="—" title="Allocate largest first — this is the whole VLSM technique" >}}
Sort by size, descending, and carve blocks off the front. Allocating smallest-first fragments the space and you will run out.

**Sales — 100 hosts.** 2^7 − 2 = 126 ≥ 100, so 7 host bits → **/25**, block 128.
`192.168.10.0/25` → hosts .1–.126, broadcast .127

**Engineering — 50 hosts.** 2^6 − 2 = 62 ≥ 50 → **/26**, block 64. Next free address is .128.
`192.168.10.128/26` → hosts .129–.190, broadcast .191

**Operations — 25 hosts.** 2^5 − 2 = 30 ≥ 25 → **/27**, block 32. Next free is .192.
`192.168.10.192/27` → hosts .193–.222, broadcast .223

**WAN link — 2 hosts.** 2^2 − 2 = 2 → **/30**, block 4. Next free is .224.
`192.168.10.224/30` → hosts .225–.226, broadcast .227

The final plan:

| Segment | Subnet | Mask | Usable range | Broadcast | Spare |
|---|---|---|---|---|---|
| Sales | 192.168.10.0/25 | 255.255.255.128 | .1 – .126 | .127 | 26 |
| Engineering | 192.168.10.128/26 | 255.255.255.192 | .129 – .190 | .191 | 12 |
| Operations | 192.168.10.192/27 | 255.255.255.224 | .193 – .222 | .223 | 5 |
| WAN | 192.168.10.224/30 | 255.255.255.252 | .225 – .226 | .227 | 0 |

`192.168.10.228` – `.255` is untouched — 28 addresses left for growth. Fixed-length /26 subnetting would have left none *and* failed the Sales requirement.

A /31 (RFC 3021) is also legal on point-to-point links and gives you two usable addresses out of two, but the CCNA blueprint expects /30 for WAN links.
{{< /step >}}

---

## Part 2 — Configure it

{{< step num="3" dev="R1" title="R1 — two LANs and the WAN link" >}}
```
R1>enable
R1#configure terminal
R1(config)#hostname R1
R1(config)#no ip domain-lookup
R1(config)#interface GigabitEthernet0/0
R1(config-if)#description ## Sales LAN — 192.168.10.0/25 ##
R1(config-if)#ip address 192.168.10.1 255.255.255.128
R1(config-if)#no shutdown
R1(config-if)#exit
R1(config)#interface GigabitEthernet0/1
R1(config-if)#description ## Engineering LAN — 192.168.10.128/26 ##
R1(config-if)#ip address 192.168.10.129 255.255.255.192
R1(config-if)#no shutdown
R1(config-if)#exit
R1(config)#interface GigabitEthernet0/2
R1(config-if)#description ## WAN to R2 — 192.168.10.224/30 ##
R1(config-if)#ip address 192.168.10.225 255.255.255.252
R1(config-if)#no shutdown
R1(config-if)#end
R1#write memory
```

Convention: the router takes the **first** usable address in each subnet. It is arbitrary but it must be consistent, because every DHCP scope and every statically addressed server will encode the assumption.

Notice each interface has a *different* mask. That is VLSM — the "variable length" is precisely this.
{{< /step >}}

{{< step num="4" dev="R2" title="R2 — the far end of the WAN and the Operations LAN" >}}
```
R2>enable
R2#configure terminal
R2(config)#hostname R2
R2(config)#no ip domain-lookup
R2(config)#interface GigabitEthernet0/0
R2(config-if)#description ## WAN to R1 — 192.168.10.224/30 ##
R2(config-if)#ip address 192.168.10.226 255.255.255.252
R2(config-if)#no shutdown
R2(config-if)#exit
R2(config)#interface GigabitEthernet0/1
R2(config-if)#description ## Operations LAN — 192.168.10.192/27 ##
R2(config-if)#ip address 192.168.10.193 255.255.255.224
R2(config-if)#no shutdown
R2(config-if)#end
R2#write memory
```

Static routes so the two halves can reach each other — routing protocols come in Lab 05 onward:

```
R1(config)#ip route 192.168.10.192 255.255.255.224 192.168.10.226
R2(config)#ip route 192.168.10.0 255.255.255.128 192.168.10.225
R2(config)#ip route 192.168.10.128 255.255.255.192 192.168.10.225
```
{{< /step >}}

{{< step num="5" dev="PC1, PC2, PC3" title="Address one host per segment" >}}
On each PC's **Desktop → IP Configuration**, or from the PT command line:

| Host | IP | Mask | Gateway |
|---|---|---|---|
| PC1 (Sales) | 192.168.10.10 | 255.255.255.128 | 192.168.10.1 |
| PC2 (Engineering) | 192.168.10.140 | 255.255.255.192 | 192.168.10.129 |
| PC3 (Operations) | 192.168.10.200 | 255.255.255.224 | 192.168.10.193 |

The mask on the host must match the mask on the router interface. A host with the right address and the wrong mask is the most common addressing fault there is, because it works for local traffic and fails for remote — the host computes the wrong network boundary and never sends the frame to its gateway.
{{< /step >}}

---

## Part 3 — Prove the boundaries

{{< verify dev="R1" cmd="show ip interface brief" open="true" >}}
```
R1#show ip interface brief
Interface              IP-Address        OK? Method Status    Protocol
GigabitEthernet0/0     192.168.10.1      YES manual up        up
GigabitEthernet0/1     192.168.10.129    YES manual up        up
GigabitEthernet0/2     192.168.10.225    YES manual up        up
```

Then the connected routes, which is where the masks become visible:

```
R1#show ip route connected
      192.168.10.0/24 is variably subnetted, 6 subnets, 4 masks
C        192.168.10.0/25 is directly connected, GigabitEthernet0/0
L        192.168.10.1/32 is directly connected, GigabitEthernet0/0
C        192.168.10.128/26 is directly connected, GigabitEthernet0/1
L        192.168.10.129/32 is directly connected, GigabitEthernet0/1
C        192.168.10.224/30 is directly connected, GigabitEthernet0/2
L        192.168.10.225/32 is directly connected, GigabitEthernet0/2
```

**"variably subnetted, 6 subnets, 4 masks"** is the routing table stating outright that VLSM is in use.

`C` is the connected subnet. `L` is the **local** route — a /32 for the router's own interface address, present so the router can distinguish traffic *to* itself from traffic *through* itself. Every configured interface produces one of each.
{{< /verify >}}

{{< verify dev="PC1" cmd="ping — inside and across the boundary" open="true" >}}
Inside the Sales subnet, to the gateway:

```
PC> ping 192.168.10.1
Reply from 192.168.10.1: bytes=32 time<1ms TTL=255
```

Across a boundary, to the Operations host:

```
PC> ping 192.168.10.200
Reply from 192.168.10.200: bytes=32 time=1ms TTL=126
```

**TTL 126, not 128.** Windows starts at 128 and each router decrements by one — two hops, two decrements. The returned TTL is a free hop count, and it is genuinely useful: an unexpected value means the path is not what you think it is.

Now the test that proves the mask, by failing:

```
PC> ping 192.168.10.127
Request timed out.
```

`.127` is the Sales **broadcast address**, not a host. Nothing answers it. If it *does* answer, your mask is wrong somewhere — someone has configured /24 and .127 has become an ordinary host address.

The same check at the other end of the block:

```
PC> ping 192.168.10.128
Request timed out.
```

`.128` is the Engineering **network ID**. Also not a host.
{{< /verify >}}

{{< verify dev="R2" cmd="show ip route" >}}
```
R2#show ip route
Gateway of last resort is not set

      192.168.10.0/24 is variably subnetted, 7 subnets, 5 masks
S        192.168.10.0/25 [1/0] via 192.168.10.225
S        192.168.10.128/26 [1/0] via 192.168.10.225
C        192.168.10.192/27 is directly connected, GigabitEthernet0/1
L        192.168.10.193/32 is directly connected, GigabitEthernet0/1
C        192.168.10.224/30 is directly connected, GigabitEthernet0/0
L        192.168.10.226/32 is directly connected, GigabitEthernet0/0
```

Trace one lookup by hand. R2 receives a packet for `192.168.10.140`:

- vs `192.168.10.0/25` → range .0–.127 → **no**
- vs `192.168.10.128/26` → range .128–.191 → **yes**
- vs `192.168.10.192/27` → range .192–.223 → no

One match, so that is the route. When more than one matches, the **longest prefix wins** — the most specific mask, regardless of protocol or metric. Lab 05 exercises that directly.
{{< /verify >}}

---

## Practice set

Work these without a calculator. Answers are the arithmetic above.

1. `172.16.45.200/21` — network ID, broadcast, usable range?
2. How many /29 subnets fit in a /24, and how many usable hosts does each hold?
3. `10.5.192.0/18` — what is the next subnet after it?
4. A segment needs 300 hosts. Smallest prefix that works?
5. Is `192.168.4.63/26` a valid host address?

<details>
<summary>Answers</summary>

1. /21 → mask 255.255.**248**.0, block 8 in the third octet. Multiples: 40, 48 — so 45 falls in **172.16.40.0/21**, broadcast **172.16.47.255**, usable **172.16.40.1 – 172.16.47.254**.
2. /24 → /29 borrows 5 bits → 2^5 = **32 subnets**, each with 2^3 − 2 = **6 usable hosts**.
3. /18 → block 64 in the third octet → next subnet is **10.5.256.0**, which does not exist, so it rolls into **10.6.0.0/18**.
4. 2^8 − 2 = 254 (too small), 2^9 − 2 = 510 ≥ 300 → 9 host bits → **/23**.
5. /26 → block 64 → the subnet is 192.168.4.0–.63, so **.63 is the broadcast address**. Not valid for a host.

</details>

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Local traffic fine, remote fails | wrong mask on the host | `ipconfig` — compare with the router interface |
| `% Inconsistent address and mask` | address is the network ID or broadcast | recompute the block |
| Two interfaces refuse to coexist | overlapping subnets | `show ip route connected` — look for containment |
| Some hosts unreachable, others fine | plan overlaps at a block boundary | draw the ranges on paper |
| Ping to `.255` gets replies | mask is wider than you think | compare host and router masks |
| Routing table shows "1 masks" | classful thinking — every subnet the same size | that is FLSM, not VLSM |

## Exam notes

- **Hosts = 2^h − 2** (h = host bits). **Subnets = 2^n** (n = borrowed bits). Only the host formula subtracts two.
- Block size = 256 − interesting mask octet. Subnets begin at multiples of the block size.
- VLSM allocation order is **largest first**. Smallest-first fragments the space.
- `/30` = 2 usable, the standard for point-to-point WAN links. `/31` (RFC 3021) gives 2 out of 2 but is outside the CCNA default answer.
- `C` = connected subnet, `L` = local /32 for the interface's own address.
- Private ranges: **10.0.0.0/8**, **172.16.0.0/12** (172.16–172.31), **192.168.0.0/16**.
- Special: `127.0.0.0/8` loopback, `169.254.0.0/16` APIPA (a host with one of these failed to get DHCP).

---

*Sources: Jeremy's IT Lab Day 7, 8, 13, 14 & 15 · verified in Packet Tracer 8.2.*
