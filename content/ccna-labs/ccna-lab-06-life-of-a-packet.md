---
title: "Lab 06 · Life of a Packet"
date: 2026-09-06
description: "Follow one ping across two routers in simulation mode and watch the Layer 2 header get rewritten at every hop while the Layer 3 header never changes."
tags: ["CCNA", "ARP", "Encapsulation", "Lab"]
categories: ["CCNA"]
domain: 1
tool: "Packet Tracer"
duration: "40 min"
sources: "Jeremy's IT Lab Day 12 · Flackbox 12"
aliases: ["/ccna-labs/ccna-lab-12-life-of-packet/"]
---

There is one sentence that, once it is genuinely internalised, makes most of the CCNA fall into place: **the Layer 3 addresses stay the same end to end; the Layer 2 addresses are rewritten at every hop.** Everything about ARP, default gateways, TTL and inter-VLAN routing follows from it.

Packet Tracer's simulation mode lets you open the actual headers at each step, so this lab is mostly reading rather than typing. Do it slowly — it pays for itself in every later lab.

## Topology

{{< topology cols="5" rows="1" caption="Two hosts, two routers, three subnets — three Layer 2 rewrites for one packet" >}}
pc     PC1 "10.0.1.10" at 0,0
switch SW1 "" at 1,0
router R1 "10.0.1.1" at 2,0
router R2 "10.0.2.1" at 3,0
pc     PC2 "10.0.2.10" at 4,0

PC1 — SW1
SW1 — R1
R1 — R2 label="10.0.12.0/30"
R2 — PC2
{{< /topology >}}

| Device | Interface | IP | MAC (example) |
|---|---|---|---|
| PC1 | Fa0 | 10.0.1.10/24 | AAAA.1111.1111 |
| R1 | G0/0 | 10.0.1.1/24 | BBBB.2222.2222 |
| R1 | G0/1 | 10.0.12.1/30 | BBBB.3333.3333 |
| R2 | G0/0 | 10.0.12.2/30 | CCCC.4444.4444 |
| R2 | G0/1 | 10.0.2.1/24 | CCCC.5555.5555 |
| PC2 | Fa0 | 10.0.2.10/24 | DDDD.6666.6666 |

Static routes both ways, as in Lab 05:

```
R1(config)#ip route 10.0.2.0 255.255.255.0 10.0.12.2
R2(config)#ip route 10.0.1.0 255.255.255.0 10.0.12.1
```

## Objectives

- Watch a host decide "local or remote?" and see the mask do the deciding
- Trace an ARP request and reply, and read what ends up in the ARP cache
- Open the Ethernet and IP headers at each hop and record how they change
- Explain why the destination MAC is the gateway's, not the destination host's
- Watch TTL decrement and understand what happens when it reaches zero

---

## Part 1 — The decision every host makes

{{< step num="1" dev="PC1" title="Local or remote — the AND that decides" open="true" >}}
Before PC1 transmits anything, it answers one question: *is 10.0.2.10 on my subnet?*

It ANDs its **own** address with its mask to get its own network ID, then ANDs the **destination** with the **same** mask:

```
own:          10.0.1.10  = 00001010.00000000.00000001.00001010
mask:      255.255.255.0 = 11111111.11111111.11111111.00000000
AND:                       00001010.00000000.00000001.00000000  = 10.0.1.0

destination:  10.0.2.10  = 00001010.00000000.00000010.00001010
mask:      255.255.255.0 = 11111111.11111111.11111111.00000000
AND:                       00001010.00000000.00000010.00000000  = 10.0.2.0
```

`10.0.1.0` ≠ `10.0.2.0`, so the destination is **remote**, and PC1 must send the frame to its default gateway.

Note that the host uses its *own* mask for both calculations. It has no idea what mask the destination is configured with, and it does not need one. This is also why a wrong mask on the host breaks remote traffic specifically: the host computes the wrong boundary and either sends locally when it should route, or routes when it should send locally.

```
PC> ipconfig
   IP Address......................: 10.0.1.10
   Subnet Mask.....................: 255.255.255.0
   Default Gateway.................: 10.0.1.1
```

**No default gateway means no remote traffic, full stop.** A host with an address and a mask but no gateway can reach its own subnet perfectly and nothing else. It is the single most common end-host misconfiguration.
{{< /step >}}

{{< step num="2" dev="PC1" title="ARP for the gateway, not for the destination" >}}
PC1 needs a destination MAC for the frame. It needs the **gateway's** MAC — 10.0.1.1 — because that is where the frame is going. It never ARPs for 10.0.2.10; that address is not on its segment and an ARP broadcast would never reach it.

Clear the cache and watch:

```
PC> arp -d
PC> ping 10.0.2.10
```

In simulation mode, filtered to ARP and ICMP, you see:

**ARP request** — broadcast, so every device in the broadcast domain gets a copy:

```
Src MAC:  AAAA.1111.1111   (PC1)
Dst MAC:  FFFF.FFFF.FFFF   (broadcast)
Sender IP: 10.0.1.10       Target IP: 10.0.1.1
```

**ARP reply** — unicast, from R1 only:

```
Src MAC:  BBBB.2222.2222   (R1 G0/0)
Dst MAC:  AAAA.1111.1111   (PC1)
Sender IP: 10.0.1.1        Target IP: 10.0.1.10
```

The cache afterwards holds exactly one entry, and it is the gateway:

```
PC> arp -a
  Internet Address      Physical Address      Type
  10.0.1.1              bbbb.2222.2222        dynamic
```

**One entry, for one host, to reach an entire internet.** That is what a default gateway buys you.
{{< /step >}}

---

## Part 2 — Three hops, three rewrites

{{< step num="3" dev="—" title="Hop 1: PC1 → R1" >}}
```
Ethernet:  Src AAAA.1111.1111 (PC1)      Dst BBBB.2222.2222 (R1 G0/0)
IP:        Src 10.0.1.10                 Dst 10.0.2.10        TTL 128
```

The destination MAC is R1, the destination IP is PC2. Those two disagreeing is not a fault — it is the whole design. Layer 2 addresses the **next device**; Layer 3 addresses the **final device**.
{{< /step >}}

{{< step num="4" dev="—" title="Hop 2: R1 → R2, after R1 rewrites the frame" >}}
R1 receives the frame, sees its own MAC as the destination, and de-encapsulates. Then:

1. Reads the destination IP, 10.0.2.10
2. Looks it up: `10.0.2.0/24 via 10.0.12.2, G0/1`
3. **Decrements TTL** from 128 to 127 and recomputes the IP header checksum
4. ARPs for 10.0.12.2 if it has no cache entry
5. Builds a **brand new Ethernet frame** — the old one is discarded, not modified

```
Ethernet:  Src BBBB.3333.3333 (R1 G0/1)  Dst CCCC.4444.4444 (R2 G0/0)
IP:        Src 10.0.1.10                 Dst 10.0.2.10        TTL 127
```

Both MACs are different from hop 1. Both IPs are identical. The only field of the IP header that changed is TTL (and the checksum that covers it).

Check R1's ARP cache — it holds the neighbours it needs to reach, on both sides:

```
R1#show ip arp
Protocol  Address       Age (min)  Hardware Addr   Type   Interface
Internet  10.0.1.1              -  bbbb.2222.2222  ARPA   GigabitEthernet0/0
Internet  10.0.1.10             3  aaaa.1111.1111  ARPA   GigabitEthernet0/0
Internet  10.0.12.1             -  bbbb.3333.3333  ARPA   GigabitEthernet0/1
Internet  10.0.12.2             1  cccc.4444.4444  ARPA   GigabitEthernet0/1
```

Age `-` means the router's own interface. Cisco's ARP entries age out after **4 hours** by default; a Windows host uses a couple of minutes.
{{< /step >}}

{{< step num="5" dev="—" title="Hop 3: R2 → PC2, the last rewrite" >}}
R2 does the same work again. This time the destination is on a directly connected subnet, so the next hop *is* the destination and R2 ARPs for 10.0.2.10 itself.

```
Ethernet:  Src CCCC.5555.5555 (R2 G0/1)  Dst DDDD.6666.6666 (PC2)
IP:        Src 10.0.1.10                 Dst 10.0.2.10        TTL 126
```

The full journey in one table:

| Hop | Src MAC | Dst MAC | Src IP | Dst IP | TTL |
|---|---|---|---|---|---|
| PC1 → R1 | AAAA.1111.1111 | BBBB.2222.2222 | 10.0.1.10 | 10.0.2.10 | 128 |
| R1 → R2 | BBBB.3333.3333 | CCCC.4444.4444 | 10.0.1.10 | 10.0.2.10 | 127 |
| R2 → PC2 | CCCC.5555.5555 | DDDD.6666.6666 | 10.0.1.10 | 10.0.2.10 | 126 |

**Two identical columns and four that change on every line.** If you can reproduce this table from memory for an arbitrary topology, you understand routing.

The reply runs the same process in reverse: PC2 ANDs, finds 10.0.1.10 remote, ARPs for *its* gateway 10.0.2.1, and the frame is rewritten twice on the way back.
{{< /step >}}

---

## Part 3 — TTL

{{< verify dev="PC1" cmd="ping 10.0.2.10 — read the returned TTL" open="true" >}}
```
PC> ping 10.0.2.10

Reply from 10.0.2.10: bytes=32 time=1ms TTL=126
```

126 = 128 − 2, and there were exactly two routers in the path. The starting TTL identifies the sending OS:

| Start | OS |
|---|---|
| 64 | Linux, macOS |
| 128 | Windows |
| 255 | Cisco IOS, most network gear |

So a reply with TTL 62 is a Linux host two hops away; TTL 253 is a Cisco device two hops away.

TTL exists to kill routing loops. Each router decrements it; at zero the packet is discarded and an **ICMP Time Exceeded** is returned to the source. Traceroute weaponises this deliberately — it sends TTL 1, then 2, then 3, and collects the Time Exceeded message from each router in turn:

```
PC> tracert 10.0.2.10

  1   0 ms   0 ms   0 ms   10.0.1.1
  2   1 ms   0 ms   1 ms   10.0.12.2
  3   1 ms   1 ms   1 ms   10.0.2.10
```

Hop 2 shows `10.0.12.2` — R2's **ingress** interface, because the Time Exceeded is sourced from the interface the packet arrived on. That is why a traceroute through a router shows the near-side address, and why the addresses in a trace do not always look like the ones in your diagram.
{{< /verify >}}

{{< verify dev="R1" cmd="debug ip packet — watch one packet be processed" >}}
Use this on a lab device only. On a busy router it will produce enough console output to make the box unusable.

```
R1#debug ip packet detail
IP packet debugging is on (detailed)

IP: s=10.0.1.10 (GigabitEthernet0/0), d=10.0.2.10 (GigabitEthernet0/1), g=10.0.12.2, len 100, forward
    ICMP type=8, code=0
IP: s=10.0.2.10 (GigabitEthernet0/1), d=10.0.1.10 (GigabitEthernet0/0), g=10.0.1.10, len 100, forward
    ICMP type=0, code=0
```

`s=` source, `d=` destination with the **egress** interface in brackets, `g=` the gateway it resolved to. ICMP type 8 is echo request, type 0 is echo reply.

Turn it off immediately:

```
R1#undebug all
```
{{< /verify >}}

{{< verify dev="SW1" cmd="show mac address-table" >}}
The switch in the middle saw only the first hop, so it learned only the two MACs on its own segment:

```
SW1#show mac address-table

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
   1    aaaa.1111.1111    DYNAMIC     Fa0/1
   1    bbbb.2222.2222    DYNAMIC     Fa0/24
```

PC2's MAC never appears. The switch is in a different broadcast domain from PC2 and will never see a frame carrying that address — which is exactly why the Layer 2 rewrite at each router is necessary in the first place.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Local ping works, remote fails | no default gateway on the host | `ipconfig` |
| Remote ping works, local fails | wrong mask — host thinks local is remote | compare masks |
| ARP entry `incomplete` | target not responding — down, wrong VLAN, ACL | `show ip arp` |
| Ping out, no reply | missing return route on the far router | `show ip route <source>` there |
| TTL expired in transit | routing loop | `traceroute` — look for repeating hops |
| Two hosts, same IP | duplicate address; ARP cache flaps | `show ip arp` repeatedly, `arp -a` on hosts |

## Exam notes

- **Source and destination IP never change** end to end (barring NAT). **Source and destination MAC change at every Layer 3 hop.**
- A host ARPs for its **default gateway** when the destination is remote, and for the **destination** when it is local.
- The local/remote decision is `own IP AND own mask` versus `destination IP AND own mask`.
- The router decrements TTL and recomputes the IP checksum; at TTL 0 it sends ICMP Time Exceeded.
- Default starting TTL: Windows 128, Linux/macOS 64, Cisco IOS 255.
- Cisco ARP cache ages at **4 hours**; the MAC address table ages at **300 seconds**. Different timers, different tables.
- A traceroute hop shows the router's **ingress** interface address.

---

*Sources: Jeremy's IT Lab Day 12 · Flackbox CCNA Lab Guide 12 · verified in Packet Tracer 8.2.*
