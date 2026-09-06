---
title: "Lab 33 · WAN Architectures and GRE Tunnels"
date: 2026-09-06
description: "Build a GRE tunnel across an untrusted transit network, run a routing protocol over it, and work out why the MTU makes large packets disappear."
tags: ["CCNA", "WAN", "GRE", "VPN", "Lab"]
categories: ["CCNA"]
domain: 3
tool: "Packet Tracer"
duration: "40 min"
sources: "Jeremy's IT Lab Day 53"
---

A GRE tunnel makes two routers separated by an entire internet behave as if they were connected by a cable. Once the tunnel is up, a routing protocol runs over it, private addresses cross it, and multicast works — none of which the underlying internet would carry.

What GRE does not do is encrypt anything. That distinction, and the MTU arithmetic, are what this lab is about.

## Topology

{{< topology cols="4" rows="3" caption="Two sites, private addressing, connected across a public transit network" >}}
switch SW1 "HQ 10.1.1.0/24" at 0,1
router R1 "203.0.113.1" at 1,1
cloud NET "public transit" at 2,0
router R2 "198.51.100.1" at 3,1
switch SW2 "Branch 10.2.2.0/24" at 4,1

SW1 — R1
R1 — NET
NET — R2
R2 — SW2
{{< /topology >}}

| Device | LAN | Public address | Tunnel address |
|---|---|---|---|
| R1 | 10.1.1.1/24 | 203.0.113.1 | 172.16.0.1/30 |
| R2 | 10.2.2.1/24 | 198.51.100.1 | 172.16.0.2/30 |

## Objectives

- Compare the WAN options in the CCNA blueprint and say what each is for
- Build a GRE tunnel and understand which addresses go where
- Run OSPF across the tunnel and see private routes exchanged over a public path
- Calculate the GRE overhead and fix the MTU problem it creates
- Explain what GRE does not provide, and what you add to get it

---

## Part 1 — WAN options

{{< step num="1" dev="—" title="What the blueprint expects you to recognise" open="true" >}}
| Technology | How it works | Trade-off |
|---|---|---|
| **Leased line** | dedicated point-to-point circuit | guaranteed bandwidth, expensive, one link per site pair |
| **MPLS L3VPN** | carrier routes for you; you peer with the provider edge | any-to-any, carrier SLA, carrier sees your routes |
| **MPLS L2VPN / VPLS** | carrier bridges Ethernet between sites | your own routing, looks like one LAN |
| **Metro Ethernet** | Ethernet handoff over a metro fibre ring | cheap bandwidth, geographically limited |
| **Broadband + VPN** | any internet connection, tunnel on top | cheapest, best-effort, needs encryption |
| **Cellular (4G/5G)** | wireless WAN | fast to deploy, usually a backup path |

The direction of travel is unambiguous: expensive leased lines and MPLS are being replaced by **broadband with a VPN overlay**, managed by **SD-WAN**, which selects paths dynamically across several transports and applies policy centrally. That is a Cisco Viptela / DNA topic and appears in the CCNA only as a concept.

For this lab the transport is a plain internet connection, and GRE builds the overlay.
{{< /step >}}

{{< step num="2" dev="R1" title="Build the tunnel — four addresses, two of them public" >}}
```
R1(config)#interface Tunnel0
R1(config-if)#description ## GRE to Branch ##
R1(config-if)#ip address 172.16.0.1 255.255.255.252
R1(config-if)#tunnel source GigabitEthernet0/1
R1(config-if)#tunnel destination 198.51.100.1
R1(config-if)#tunnel mode gre ip
R1(config-if)#end
```

Four addresses are in play and confusing them is the usual failure:

| Address | Role |
|---|---|
| `172.16.0.1/30` | the tunnel interface's own address — the **overlay** |
| `GigabitEthernet0/1` | the **source** of the outer packet, R1's public interface |
| `198.51.100.1` | the **destination** of the outer packet, R2's public address |
| `10.1.1.0/24` | what actually travels **inside** |

**`tunnel destination` is the far router's public address, not its tunnel address.** That is the one people get wrong, and the tunnel then comes up (interfaces are up as soon as they are configured) and passes nothing.

`tunnel source` may be an interface or an address. An interface is better: it follows the address if DHCP changes it.

`tunnel mode gre ip` is the default and can be omitted. Spelling it out makes the config self-documenting next to a config that uses `ipsec ipv4` or `ipv6ip`.
{{< /step >}}

{{< step num="3" dev="R2" title="The mirror image" >}}
```
R2(config)#interface Tunnel0
R2(config-if)#description ## GRE to HQ ##
R2(config-if)#ip address 172.16.0.2 255.255.255.252
R2(config-if)#tunnel source GigabitEthernet0/1
R2(config-if)#tunnel destination 203.0.113.1
R2(config-if)#tunnel mode gre ip
R2(config-if)#end
```

Source and destination are swapped; everything else mirrors. A tunnel where both ends name the same destination is a surprisingly common typo and produces a tunnel that is up at both ends and connects neither.

The prerequisite, easy to overlook: **each router must be able to reach the other's public address before the tunnel can work.**

```
R1#ping 198.51.100.1
!!!!!
```

If that fails, nothing about the tunnel configuration matters.
{{< /step >}}

{{< verify dev="R1" cmd="show interfaces Tunnel0" open="true" >}}
```
R1#show interfaces Tunnel0
Tunnel0 is up, line protocol is up
  Hardware is Tunnel
  Internet address is 172.16.0.1/30
  MTU 17916 bytes, BW 100 Kbit/sec, DLY 50000 usec,
     reliability 255/255, txload 1/255, rxload 1/255
  Encapsulation TUNNEL, loopback not set
  Keepalive not set
  Tunnel source 203.0.113.1 (GigabitEthernet0/1), destination 198.51.100.1
  Tunnel Subblocks:
     src-track:
        Tunnel0 source tracking subblock associated with GigabitEthernet0/1
  Tunnel protocol/transport GRE/IP
  Tunnel TTL 255, Fast tunneling enabled
  Tunnel transport MTU 1476 bytes
```

Two figures matter and they contradict each other, which is the point:

**`Tunnel transport MTU 1476 bytes`** — 1500 minus 24 bytes of GRE overhead (20-byte outer IP header + 4-byte GRE header). That is the largest inner packet that fits without fragmentation.

**`MTU 17916 bytes`** is the tunnel interface's own advertised MTU, and it is a lie of sorts — it is the theoretical maximum, not what will actually get through. Ignore it; the transport MTU is the real number.

**`line protocol is up` does not mean the tunnel works.** A GRE tunnel interface comes up as soon as it has a source and a resolvable destination route. It stays up when the far end is switched off. To make the interface state mean something, add keepalives:

```
R1(config-if)#keepalive 10 3
```

Ten-second interval, three retries. Now the tunnel goes down when the far end stops answering, which is what any routing protocol running over it needs.
{{< /verify >}}

{{< verify dev="R1" cmd="ping across the tunnel" >}}
```
R1#ping 172.16.0.2
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 172.16.0.2, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 12/18/32 ms
```

Tunnel endpoints reachable. Latency reflects the real internet path underneath — GRE adds encapsulation, not distance.
{{< /verify >}}

---

## Part 2 — Routing over the tunnel

{{< step num="4" dev="R1, R2" title="OSPF across the overlay" open="true" >}}
```
R1(config)#router ospf 1
R1(config-router)#router-id 1.1.1.1
R1(config-router)#network 172.16.0.0 0.0.0.3 area 0
R1(config-router)#network 10.1.1.0 0.0.0.255 area 0
R1(config-router)#passive-interface GigabitEthernet0/0
R1(config-router)#end
```

```
R2(config)#router ospf 1
R2(config-router)#router-id 2.2.2.2
R2(config-router)#network 172.16.0.0 0.0.0.3 area 0
R2(config-router)#network 10.2.2.0 0.0.0.255 area 0
R2(config-router)#passive-interface GigabitEthernet0/0
R2(config-router)#end
```

**Advertise the tunnel subnet, never the public addresses.** Putting `203.0.113.0/30` into OSPF creates a recursive routing loop: the tunnel's destination becomes reachable *through the tunnel*, the tunnel goes down, the route disappears, the tunnel comes back, and the cycle repeats every few seconds. IOS usually catches it:

```
%TUN-5-RECURDOWN: Tunnel0 temporarily disabled due to recursive routing
```

That message means exactly one thing: the tunnel destination is being learned over the tunnel. Take the public prefix out of the routing protocol.

This is why GRE is used with routing protocols at all — **a plain IPsec tunnel carries only unicast IP and cannot carry OSPF or EIGRP**, both of which rely on multicast. GRE carries multicast, so `GRE over IPsec` is the standard combination: GRE provides the transport for routing, IPsec provides the encryption.
{{< /step >}}

{{< verify dev="R1" cmd="show ip ospf neighbor and show ip route ospf" open="true" >}}
```
R1#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
2.2.2.2           0   FULL/  -        00:00:34    172.16.0.2      Tunnel0
```

An OSPF adjacency **over a tunnel interface**, and `FULL/  -` with no DR/BDR role because a tunnel is point-to-point by default — no election, exactly as in Lab 17.

```
R1#show ip route ospf
      10.0.0.0/8 is variably subnetted, 4 subnets, 2 masks
O        10.2.2.0/24 [110/1001] via 172.16.0.2, 00:04:12, Tunnel0
```

**A private branch subnet, learned dynamically, over the public internet.** That is the whole point of the overlay: `10.2.2.0/24` is not routable on the internet and never appears there — it travels inside the GRE payload.

The metric 1001 comes from the tunnel's default bandwidth of 100 Kbit/s. Set it to something realistic so OSPF costs mean something:

```
R1(config-if)#bandwidth 100000
```

End to end:

```
R1#ping 10.2.2.1 source 10.1.1.1
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 14/21/38 ms
```
{{< /verify >}}

---

## Part 3 — MTU

{{< step num="5" dev="R1" title="The fault where small packets work and large ones do not" open="true" >}}
GRE adds **24 bytes**: a 20-byte outer IP header and a 4-byte GRE header. A 1500-byte inner packet becomes 1524 bytes on the wire, which exceeds the 1500-byte Ethernet MTU and must be fragmented — or dropped, if the Don't Fragment bit is set.

Reproduce it precisely:

```
R1#ping 10.2.2.1 source 10.1.1.1 size 1400 df-bit
!!!!!
Success rate is 100 percent (5/5)

R1#ping 10.2.2.1 source 10.1.1.1 size 1500 df-bit
Packet sent with the DF bit set
.....
Success rate is 0 percent (0/5)
```

**Small pings work, large pings fail.** In production the symptom is worse than that, because most traffic is small: SSH sessions establish fine, ping works, DNS works — and then a file transfer or an HTTPS page with a large certificate hangs indefinitely. It looks like an application fault.

Two fixes, and you want both.

**Lower the tunnel MTU** so the router fragments before encapsulating:

```
R1(config)#interface Tunnel0
R1(config-if)#ip mtu 1400
```

1400 rather than 1476 leaves headroom for IPsec if it is added later, and for any additional encapsulation in the path.

**Clamp the TCP MSS**, which is the more important one:

```
R1(config-if)#ip tcp adjust-mss 1360
```

This rewrites the MSS option in passing TCP SYN packets, so **both endpoints negotiate a smaller segment size and never generate an oversized packet at all**. No fragmentation, no reassembly, no reliance on PMTUD.

The arithmetic: 1400 (IP MTU) − 20 (IP header) − 20 (TCP header) = 1360.

And PMTUD is not a reliable substitute, because it depends on ICMP unreachables getting back to the sender — and a great many firewalls block ICMP wholesale (Lab 22). When PMTUD is broken, the sender never learns to send smaller packets and the connection simply stalls.

```
R1#show interfaces Tunnel0 | include MTU
  MTU 17916 bytes, BW 100000 Kbit/sec, DLY 50000 usec,
  Tunnel transport MTU 1476 bytes
```
{{< /step >}}

{{< step num="6" dev="—" title="What GRE does not do" >}}
**GRE provides no confidentiality, no integrity and no authentication.** Everything inside the tunnel travels in cleartext across the transit network. Anyone who can capture a packet can read the inner payload — the encapsulation is a wrapper, not a lock.

| | GRE | IPsec | GRE over IPsec |
|---|---|---|---|
| Encryption | **no** | **yes** | **yes** |
| Multicast / routing protocols | **yes** | **no** | **yes** |
| Non-IP protocols | **yes** | no | yes |
| Overhead | 24 bytes | ~50–60 bytes | ~74–84 bytes |

**GRE over IPsec** is the standard site-to-site design and the combination exists because each covers the other's gap: GRE carries the routing protocols, IPsec provides the security.

The CCNA blueprint asks you to recognise the IPsec vocabulary rather than configure it:

- **IKE Phase 1** — establishes a secure management channel, authenticating with a pre-shared key or certificates
- **IKE Phase 2** — negotiates the IPsec SAs that protect the actual data
- **AH** — authentication and integrity, **no encryption**, and it breaks through NAT
- **ESP** — **encryption plus authentication**; the one actually used
- **Transport mode** — protects the payload, keeps the original IP header
- **Tunnel mode** — protects the whole original packet inside a new one; the site-to-site default

`DMVPN` is the scaling answer: hub-and-spoke GRE tunnels that build spoke-to-spoke tunnels dynamically as traffic requires, instead of a full mesh of static tunnels.
{{< /step >}}

{{< verify dev="R1" cmd="final end-to-end verification" >}}
```
R1#show ip interface brief | include Tunnel
Tunnel0                172.16.0.1      YES manual up                    up

R1#show ip ospf neighbor | include Tunnel
2.2.2.2           0   FULL/  -        00:00:36    172.16.0.2      Tunnel0

R1#ping 10.2.2.1 source 10.1.1.1 size 1400 df-bit
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 14/22/41 ms
```

Tunnel up, adjacency full, and a large packet with DF set crossing successfully. That third test is the one that would have failed before the MSS clamp, and it is the one worth adding to any tunnel build checklist.

From a host at HQ:

```
PC> tracert 10.2.2.10

  1   0 ms   0 ms   0 ms   10.1.1.1
  2  14 ms  12 ms  15 ms   172.16.0.2
  3  15 ms  14 ms  16 ms   10.2.2.10
```

**Three hops.** The entire public internet between the two sites appears as a single hop, because the transit routers never see the inner packet — they only forward the outer one. That collapsing of the underlay into one logical hop is exactly what an overlay is.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Tunnel up, no traffic passes | `tunnel destination` is the far **tunnel** address | it must be the far **public** address |
| `%TUN-5-RECURDOWN` | tunnel destination learned via the tunnel | remove the public prefix from the routing protocol |
| Tunnel stays up with the far end off | GRE has no keepalive by default | `keepalive 10 3` |
| Ping works, file transfers hang | MTU — oversized packets dropped | `ping ... size 1500 df-bit` |
| PMTUD does not help | ICMP unreachables filtered somewhere | `ip tcp adjust-mss 1360` |
| OSPF will not form over the tunnel | tunnel subnet not in the OSPF network statement | `show ip ospf interface brief` |
| Traffic readable in transit | GRE does not encrypt | add IPsec |
| Odd path selection over the tunnel | default tunnel bandwidth is 100 Kbit | set `bandwidth` |

## Exam notes

- GRE overhead is **24 bytes** (20 IP + 4 GRE); transport MTU becomes **1476**.
- `tunnel source` = local public interface/address. **`tunnel destination` = the far end's public address**, never its tunnel address.
- A GRE tunnel interface is **up whenever it is configured** — add `keepalive` to make the state meaningful.
- Never advertise the tunnel **destination** prefix through the tunnel: `%TUN-5-RECURDOWN`.
- **GRE carries multicast and routing protocols; IPsec does not.** GRE over IPsec combines both.
- **AH** = integrity only, breaks NAT. **ESP** = encryption + integrity. **Tunnel mode** for site-to-site.
- **IKE Phase 1** builds the management channel; **Phase 2** builds the data SAs.
- Fix MTU with `ip mtu 1400` **and** `ip tcp adjust-mss 1360`.

---

*Sources: Jeremy's IT Lab Day 53 · verified in Packet Tracer 8.2.*
