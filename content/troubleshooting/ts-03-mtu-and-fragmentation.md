---
title: "MTU and Fragmentation"
date: 2026-09-06
description: "Why small packets cross a link that large ones cannot: finding the exact boundary with df-bit, the difference between interface MTU, ip mtu and ip tcp adjust-mss, and what breaks Path MTU Discovery."
tags: ["Troubleshooting", "MTU", "PMTUD", "PPPoE", "GRE", "Cisco"]
categories: ["Troubleshooting"]
unit: 2
---

An MTU fault does not present as a network fault. Ping succeeds, DNS resolves, the SSH banner appears — and then the session freezes at the first listing of a large directory. A web page returns its headers and hangs before the body. Every status command says the network is healthy, and it is carrying nothing useful.

That signature — **small things work, large things hang** — narrows the search to one mechanism and about five commands. The reason it is so often missed is that the standard test, a 100-byte ping, is specifically the test an MTU fault passes.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| Ping fine, HTTP/SFTP hangs mid-transfer | path MTU below 1500, PMTUD blocked | `ping <dst> size 1500 df-bit` |
| Large `df-bit` ping returns `M` | a router in the path announced the limit | read the size in the reply |
| Large `df-bit` ping returns `.` | the limiting device is silent or its ICMP is filtered | sweep to find the boundary |
| Works from one host, fails from another | the two hosts have different local MTUs | compare the host interface MTU |
| Tunnel comes up, traffic through it stalls | encapsulation overhead unaccounted for | `show ip interface Tunnel0` |
| OSPF stuck in `EXSTART`/`EXCHANGE` | interface MTU mismatch between neighbours | `debug ip ospf adj` |

---

## Three MTUs and one MSS

Four commands touch what looks like the same number, and they do different things. Getting this wrong is why an MTU fix sometimes appears not to take effect.

| Command | Sets | Applies to |
|---|---|---|
| `mtu 1400` | interface MTU, Layer 2 payload | **every** protocol on the interface |
| `ip mtu 1400` | IPv4 MTU only | IPv4 packets forwarded or originated |
| `ipv6 mtu 1400` | IPv6 MTU only | IPv6 packets |
| `ip tcp adjust-mss 1360` | Layer 4 | the MSS option inside TCP SYNs crossing the interface |

**`mtu` drags `ip mtu` down with it; `ip mtu` does not drag `mtu`.** Lower the interface MTU and the IP MTU follows automatically. Lower the IP MTU and the interface still accepts full-size frames for everything else.

The trap is in the verification:

```
R1(config)#interface Dialer1
R1(config-if)#ip mtu 1492
R1(config-if)#end
R1#show interfaces Dialer1 | include MTU
  MTU 1500 bytes, BW 100000 Kbit/sec, DLY 100 usec,
R1#show ip interface Dialer1 | include MTU
  MTU is 1492 bytes
```

`show interfaces` still reports 1500, because that is the **Layer 2** MTU and it was never changed. The command that proves an `ip mtu` change took effect is `show ip interface`. Engineers have re-applied the same configuration three times because they were reading the wrong line.

### Why adjust-mss is the fix that actually holds

An `ip mtu` value tells the router what it may forward. It does nothing to stop the endpoints from generating packets that are too large — it only changes what happens to them when they arrive.

`ip tcp adjust-mss` intercepts TCP SYN and SYN-ACK packets as they cross the interface and rewrites the MSS option downward. Both endpoints then negotiate a segment size that fits, and **the oversized packet is never built in the first place**. No fragmentation, no reassembly, no reliance on ICMP getting back to the sender.

```
R1(config)#interface Dialer1
R1(config-if)#ip mtu 1492
R1(config-if)#ip tcp adjust-mss 1452   ! 1492 - 20 IP - 20 TCP
```

Two things about it are worth knowing. It rewrites SYNs in **both** directions across that interface, so applying it once on the WAN-facing interface usually covers inbound and outbound sessions. And it only helps **TCP** — a UDP-based application, an IPsec tunnel or a DNS response over 1500 bytes is untouched by it and still needs a correct path MTU.

---

## Finding the boundary

The whole diagnosis is two pings. Set the DF bit so no router is allowed to fragment on your behalf, and compare a small packet with a large one.

```
R1#ping 8.8.8.8 size 1500 df-bit
Type escape sequence to abort.
Sending 5, 1500-byte ICMP Echos to 8.8.8.8, timeout is 2 seconds:
Packet sent with the DF bit set
MMMMM
Success rate is 0 percent (0/5)
```

```
R1#ping 8.8.8.8 size 1400 df-bit
Type escape sequence to abort.
Sending 5, 1400-byte ICMP Echos to 8.8.8.8, timeout is 2 seconds:
Packet sent with the DF bit set
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 12/16/24 ms
```

On Cisco IOS the `size` value is the **whole IP datagram**, header included. A `size 1500` ping is exactly what a 1500-byte MTU can carry and nothing more, which makes it the right number to test with.

### The M character

`M` is worth more than any other result, because it is a **reply**. A router in the path could not forward the packet, was forbidden to fragment it, and sent back ICMP type 3 code 4 — *fragmentation needed and DF set*. Something told you the truth about itself.

A row of dots means silence, and silence is ambiguous: the limiting device may be dropping without notifying, or its unreachables may be filtered on the way back, or the destination may be down entirely. **`M` identifies the fault; `.` merely fails to disprove it.**

### Sweep to the exact number

Once you have bracketed the boundary between a working and a failing size, the extended ping's sweep finds it precisely:

```
R1#ping
Protocol [ip]:
Target IP address: 8.8.8.8
Repeat count [5]: 1
Datagram size [100]: 1500
Timeout in seconds [2]:
Extended commands [n]: y
Source address or interface: GigabitEthernet0/0
Type of service [0]:
Set DF bit in IP header? [no]: yes
Validate reply data? [no]:
Data pattern [0xABCD]:
Loose, Strict, Record, Timestamp, Verbose[none]:
Sweep range of sizes [n]: y
Sweep min size [36]: 1480
Sweep max size [18024]: 1500
Sweep interval [1]: 1
Type escape sequence to abort.
Sending 21, [1480..1500]-byte ICMP Echos to 8.8.8.8, timeout is 2 seconds:
Packet sent with the DF bit set
!!!!!!!!!!!!!MMMMMMMM
Success rate is 61 percent (13/21), round-trip min/avg/max = 12/15/28 ms
```

Thirteen successes starting at 1480 means the last size that got through was **1492**. That number is not a coincidence, and the next section explains it.

### Testing from the host

The arithmetic changes on hosts, because `ping` there sizes the **ICMP payload**, not the datagram. Add 28 bytes — 20 IP plus 8 ICMP — to compare with a router test:

```
C:\>ping -f -l 1464 8.8.8.8
Packet needs to be fragmented but DF set.
```

```
$ ping -M do -s 1464 8.8.8.8
ping: local error: message too long, mtu=1492
```

1464 + 28 = 1492. A host reporting failure at 1464 and a router reporting failure at 1493 are describing the same limit.

---

## Why PMTUD does not save you

Path MTU Discovery is supposed to make all of this self-correcting. The sender sets DF on everything, a router that cannot forward returns ICMP fragmentation-needed **including the MTU it can accept**, and the sender caches a smaller path MTU for that destination and resends. The mechanism is sound and it works when the ICMP gets home.

It fails constantly, for one reason: **"block all ICMP" is still widespread firewall advice**, and it is usually implemented by an administrator who is not aware that TCP depends on one specific ICMP type to work over a reduced-MTU path.

The failure mode is nastier than a clean drop. The TCP session establishes normally — SYN, SYN-ACK and ACK are small. Data flows until the first full-size segment, which is silently discarded. TCP retransmits it, at the same size, and it is discarded again. The connection does not reset; it **hangs**, and eventually times out at the application layer. That is the "half-open, half-dead" session that gets reported as "the server is slow".

If you control the filtering, the two lines that let PMTUD function:

```
R1(config)#ip access-list extended INTERNET-IN
R1(config-ext-nacl)#permit icmp any any unreachable
R1(config-ext-nacl)#permit icmp any any time-exceeded
```

And confirm the router in the path is allowed to speak at all — `no ip unreachables` on an interface turns that router into one of the silent ones:

```
R1#show ip interface GigabitEthernet0/0 | include unreachable
  ICMP unreachables are never sent
```

**IPv6 has no fallback here.** IPv6 routers never fragment; only the source host may, so a blocked ICMPv6 Packet Too Big is not a performance problem but a hard failure. Filtering ICMPv6 type 2 breaks IPv6 in a way that filtering ICMP type 3 code 4 does not quite break IPv4.

---

## PPPoE and the 1492

PPPoE prepends 6 bytes of PPPoE header and 2 bytes of PPP protocol ID to every frame. Those 8 bytes come out of the same 1500-byte Ethernet payload the IP packet was going to use:

```
1500  Ethernet MTU
  -8  PPPoE (6) + PPP protocol ID (2)
----
1492  usable IP MTU
```

Every DSL and many fibre services in the world are delivered this way, which is why 1492 is a number you learn to recognise. The client PC still has a 1500-byte Ethernet MTU, still advertises MSS 1460 in its SYN, and still builds 1500-byte packets that cannot cross the access link.

The configuration that removes the problem for everything behind the router:

```
R1(config)#interface Dialer1
R1(config-if)#ip address negotiated
R1(config-if)#ip mtu 1492
R1(config-if)#ip tcp adjust-mss 1452
R1(config-if)#encapsulation ppp
R1(config-if)#dialer pool 1
R1(config-if)#ppp authentication chap callin
```

```
R1#show ip interface Dialer1 | include MTU|line protocol
Dialer1 is up, line protocol is up
  MTU is 1492 bytes
```

A third command, `ip tcp mss 1452`, is global and applies only to sessions the router itself originates — useful when management sessions from the router hang while user traffic is fine, and irrelevant to transit traffic.

---

## GRE and tunnel MTU

A GRE tunnel adds a 20-byte outer IP header and a 4-byte GRE header, so the payload a 1500-byte underlay can carry drops to **1476**. IOS knows this and sets it for you — which is exactly what makes the tunnel interface confusing to read:

```
R1#show interfaces Tunnel0 | include MTU
  MTU 17916 bytes, BW 100 Kbit/sec, DLY 50000 usec,
R1#show ip interface Tunnel0 | include MTU
  MTU is 1476 bytes
```

17916 is the tunnel interface's nominal Layer 2 MTU and it is meaningless for troubleshooting. **1476 is the number that matters**, and again it is `show ip interface` that reveals it.

The overheads stack, and each layer takes its bite out of the same 1500:

| Encapsulation | Overhead | Resulting IP MTU |
|---|---|---|
| Plain Ethernet | — | 1500 |
| 802.1Q tag | 4 | 1500 (frame grows to 1522) |
| PPPoE | 8 | 1492 |
| GRE over IPv4 | 24 | 1476 |
| GRE + IPsec ESP (transport) | ~52 | ~1424 |
| GRE + IPsec ESP (tunnel) | ~72 | ~1404 |

IPsec figures vary with the cipher and authentication algorithm, which is why tunnel MTUs are usually rounded down to a safe 1400 rather than calculated exactly.

The working configuration on a GRE tunnel that carries TCP:

```
R1(config)#interface Tunnel0
R1(config-if)#tunnel source GigabitEthernet0/0
R1(config-if)#tunnel destination 203.0.113.2
R1(config-if)#ip mtu 1400
R1(config-if)#ip tcp adjust-mss 1360   ! 1400 - 20 IP - 20 TCP
```

There is also a tunnel-specific mechanism that copies the DF bit from the inner packet to the outer one and participates in PMTUD on behalf of the encapsulated traffic:

```
R1(config-if)#tunnel path-mtu-discovery
```

```
R1#show interfaces Tunnel0 | include transport|path-mtu
  Tunnel transport MTU 1476 bytes
  Path MTU Discovery, ager 10 mins, min MTU 92
```

It is a good addition, but it depends on the same ICMP that gets filtered everywhere, so it complements `ip tcp adjust-mss` rather than replacing it.

---

## The MTU fault that has nothing to do with packet size

OSPF compares the interface MTU in its Database Description packets and refuses to build an adjacency if the two ends disagree. The symptom looks nothing like a size problem — the neighbour appears, sticks, and never reaches FULL:

```
R1#show ip ospf neighbor
Neighbor ID     Pri   State           Dead Time   Address         Interface
2.2.2.2           1   EXSTART/DR      00:00:36    10.0.12.2       GigabitEthernet0/1
```

```
R1#debug ip ospf adj
OSPF-1 ADJ   Gi0/1: Nbr 2.2.2.2 has larger interface MTU
```

Confirm on both ends and make them match:

```
R1#show ip ospf interface GigabitEthernet0/1 | include MTU|Internet
  Internet Address 10.0.12.1/24, Area 0, Attached via Network Statement
```

```
R1#show interfaces GigabitEthernet0/1 | include MTU
  MTU 1500 bytes, BW 1000000 Kbit/sec, DLY 10 usec,
```

Matching the MTUs is the correct fix. Suppressing the check is the fix people reach for, and it works only because the packets involved happen to be small enough — if the databases ever grow past the smaller MTU, the adjacency flaps with retransmission errors instead:

```
R1(config-if)#ip ospf mtu-ignore   ! hides the mismatch, does not resolve it
```

---

## Switches and jumbo frames

A Catalyst does not have `ip mtu` on an access port; it has a system-wide value, and changing it usually requires a reload:

```
SW1(config)#system mtu jumbo 9000
SW1(config)#end
SW1#show system mtu

System MTU size is 1500 bytes
System Jumbo MTU size is 9000 bytes
Routing MTU size is 1500 bytes
```

Jumbo frames must be enabled **end to end**. One switch in the path left at 1500 drops the oversized frames and counts them as giants, and the storage or backup application that asked for jumbos reports exactly the symptom this page opened with:

```
SW1#show interfaces GigabitEthernet0/1 | include giants
     0 runts, 4127 giants, 0 throttles
```

**Giants climbing on a link where jumbos were configured upstream** is that fault stating itself.

---

## Quick reference

| Command | What it proves |
|---|---|
| `ping <ip> size 1500 df-bit` | whether the path carries a full-size packet |
| `ping <ip> size 1400 df-bit` | that the path works at all, isolating size as the variable |
| extended `ping` with sweep | the exact byte where forwarding stops |
| `show ip interface <int> \| include MTU` | the **IPv4** MTU — the one `ip mtu` sets |
| `show interfaces <int> \| include MTU` | the **Layer 2** MTU — unchanged by `ip mtu` |
| `show interfaces <int> \| include giants` | frames arriving larger than the interface accepts |
| `show ip interface <int> \| include unreachable` | whether this router can report an MTU problem at all |
| `show interfaces Tunnel0 \| include transport` | the tunnel's real transport MTU |
| `debug ip ospf adj` | an MTU mismatch stalling an adjacency in EXSTART |
| `show system mtu` | the switch-wide and jumbo MTU values |

| Value | Number | Derivation |
|---|---|---|
| Ethernet IP MTU | 1500 | standard |
| TCP MSS on Ethernet | 1460 | 1500 − 20 IP − 20 TCP |
| PPPoE IP MTU | 1492 | 1500 − 8 |
| PPPoE adjust-mss | 1452 | 1492 − 40 |
| GRE IP MTU | 1476 | 1500 − 24 |
| Safe tunnel MTU | 1400 | rounded down for IPsec headroom |
| Safe tunnel adjust-mss | 1360 | 1400 − 40 |

---

*Based on the NetworkLessons troubleshooting series: PPPoE and MTU troubleshooting on Cisco IOS.*
