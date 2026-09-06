---
title: "Lab 23 · DHCP and DNS"
date: 2026-09-06
description: "A DHCP server on the router, a relay for the subnet that has none, and the four-message exchange that a Wireshark capture shows in full."
tags: ["CCNA", "DHCP", "DNS", "IP Services", "Lab"]
categories: ["CCNA"]
domain: 4
tool: "Packet Tracer"
duration: "45 min"
sources: "Jeremy's IT Lab Day 38, 39 · Flackbox 23-1"
aliases: ["/ccna-labs/ccna-lab-23-dhcp/"]
---

DHCP is a broadcast protocol, and broadcasts do not cross routers. That one sentence explains both why a DHCP server works effortlessly on its own subnet and why every remote subnet needs a relay — and the relay configuration is a single command that is very easy to leave out.

## Topology

{{< topology cols="4" rows="3" caption="R1 is the DHCP server; the LAN behind R2 reaches it through a relay" >}}
pc     PC1 "LAN A · local" at 0,0
router R1 "DHCP server" at 1,0
router R2 "relay agent" at 2,0
pc     PC2 "LAN B · relayed" at 3,0
server DNS "10.0.10.10" at 1,2

PC1 — R1
R1 — R2 label="10.0.12.0/30"
R2 — PC2
R1 — DNS
{{< /topology >}}

| Segment | Prefix | Gateway | DHCP |
|---|---|---|---|
| LAN A | 10.0.10.0/24 | R1 G0/0 = 10.0.10.1 | local pool |
| LAN B | 10.0.20.0/24 | R2 G0/1 = 10.0.20.1 | relayed to 10.0.12.1 |
| WAN | 10.0.12.0/30 | R1 .1 / R2 .2 | — |

## Objectives

- Configure a DHCP pool on a router, with excluded addresses, gateway, DNS and lease time
- Configure `ip helper-address` and explain what it actually does to the packet
- Trace DORA and identify which messages are broadcast and which are unicast
- Read the binding table and clear a stale lease
- Configure a router as a DHCP client and as a DNS client

---

## Part 1 — The server

{{< step num="1" dev="R1" title="Exclude the static range first" open="true" >}}
```
R1(config)#ip dhcp excluded-address 10.0.10.1 10.0.10.50
R1(config)#ip dhcp excluded-address 10.0.10.250 10.0.10.254
```

**Configure exclusions before the pool.** They are global, not per-pool, and a pool created first will start handing out addresses from the bottom of its range immediately — including the gateway's own address, which produces a duplicate-address conflict and a very confusing outage.

The convention this reserves: `.1–.50` for infrastructure and statically addressed servers, `.250–.254` for management, and the middle for DHCP.
{{< /step >}}

{{< step num="2" dev="R1" title="The pool for the local LAN" >}}
```
R1(config)#ip dhcp pool LAN-A
R1(dhcp-config)#network 10.0.10.0 255.255.255.0
R1(dhcp-config)#default-router 10.0.10.1
R1(dhcp-config)#dns-server 10.0.10.10 8.8.8.8
R1(dhcp-config)#domain-name lab.local
R1(dhcp-config)#lease 7
R1(dhcp-config)#exit
```

The options, and which ones actually matter:

| Command | Option | Consequence if missing |
|---|---|---|
| `network` | — | no pool at all |
| `default-router` | **3** | host gets an address and cannot leave the subnet |
| `dns-server` | **6** | address works, nothing resolves |
| `domain-name` | 15 | short names do not resolve |
| `lease d h m` | 51 | defaults to 1 day |
| `option 150 ip` | 150 | Cisco IP phones cannot find their TFTP server |

The second row is the one that produces the classic support call: *"I have an IP address but no internet."* A missing `default-router` gives exactly that symptom.

`lease 7` is seven days. `lease infinite` never expires, and `lease 0 2` is two hours — short leases suit guest wifi where devices come and go, long leases suit a stable office.

The pool name is local and cosmetic; naming it after the VLAN or subnet is what makes a router with a dozen pools readable.
{{< /step >}}

{{< step num="3" dev="R2" title="The relay — one command, easy to forget" open="true" >}}
```
R2(config)#interface GigabitEthernet0/1
R2(config-if)#description ## LAN B ##
R2(config-if)#ip address 10.0.20.1 255.255.255.0
R2(config-if)#ip helper-address 10.0.12.1
R2(config-if)#no shutdown
R2(config-if)#end
```

And a matching pool on R1:

```
R1(config)#ip dhcp excluded-address 10.0.20.1 10.0.20.50
R1(config)#ip dhcp pool LAN-B
R1(dhcp-config)#network 10.0.20.0 255.255.255.0
R1(dhcp-config)#default-router 10.0.20.1
R1(dhcp-config)#dns-server 10.0.10.10
R1(dhcp-config)#domain-name lab.local
R1(dhcp-config)#exit
```

`ip helper-address` goes on the interface **facing the clients**, not the one facing the server. That is the direction people get backwards.

What it actually does to the packet is worth knowing precisely, because it explains how R1 picks the right pool:

1. R2 receives the broadcast DHCPDISCOVER on Gi0/1
2. It **changes the destination** from `255.255.255.255` to the unicast `10.0.12.1`
3. It **writes its own interface address into the `giaddr` field** — `10.0.20.1`
4. It forwards the now-unicast packet

**`giaddr` is how the server chooses the pool.** R1 sees `giaddr = 10.0.20.1`, matches it against its pool networks, finds `LAN-B`, and allocates from 10.0.20.0/24. Without a pool matching the giaddr, the server simply does not reply, and the symptom is a client that gets nothing while the relay is configured perfectly.

`ip helper-address` also forwards seven other UDP broadcast services by default, not just DHCP:

| Port | Service |
|---|---|
| 37 | TIME |
| 49 | TACACS |
| 53 | DNS |
| **67 / 68** | **DHCP / BOOTP** |
| 69 | TFTP |
| 137 / 138 | NetBIOS name / datagram |

Trim it to just DHCP on a segment where forwarding NetBIOS broadcasts is undesirable:

```
R2(config)#no ip forward-protocol udp 137
R2(config)#no ip forward-protocol udp 138
```
{{< /step >}}

---

## Part 2 — DORA

{{< step num="4" dev="—" title="The four messages, and which are broadcast" >}}
| # | Message | From | To | Notes |
|---|---|---|---|---|
| **D** | DISCOVER | client `0.0.0.0` | **broadcast** `255.255.255.255` | client has no address yet |
| **O** | OFFER | server | broadcast (usually) | carries a candidate address |
| **R** | REQUEST | client `0.0.0.0` | **broadcast** | accepts one offer — broadcast so other servers withdraw theirs |
| **A** | ACK | server | broadcast/unicast | lease confirmed |

Ports: client **68**, server **67**, both UDP.

The REQUEST being broadcast is the part that looks redundant and is not. With two DHCP servers on a segment, both send an OFFER. The client accepts one — and the broadcast REQUEST names which server it chose, so the other server sees it and releases the address it had tentatively reserved. A unicast REQUEST would leave that second address held until it timed out.

Renewal is different and unicast: at **50% of the lease** (T1) the client unicasts a REQUEST straight to its server. If that fails, at **87.5%** (T2) it broadcasts one to reach any server. At 100% it gives up the address entirely and restarts DISCOVER.

Two more messages worth recognising:

- **DHCPNAK** — the server refuses a renewal, usually because the client moved subnets. The client restarts from DISCOVER.
- **DHCPDECLINE** — the client found the offered address already in use (its ARP probe got a reply) and rejects it.

Watch it live:

```
R1#debug ip dhcp server packet
DHCPD: DHCPDISCOVER received from client 0100.1643.1a20.1 on interface GigabitEthernet0/0.
DHCPD: Sending DHCPOFFER to client 0100.1643.1a20.1 (10.0.10.51).
DHCPD: DHCPREQUEST received from client 0100.1643.1a20.1.
DHCPD: Sending DHCPACK to client 0100.1643.1a20.1 (10.0.10.51).
```

For the relayed subnet the same debug shows the giaddr in play:

```
DHCPD: DHCPDISCOVER received from client 0100.5079.6668.1 through relay 10.0.20.1.
DHCPD: Sending DHCPOFFER to client 0100.5079.6668.1 (10.0.20.51).
```

`through relay 10.0.20.1` — that is the giaddr, and its presence confirms the helper is working.
{{< /step >}}

{{< verify dev="R1" cmd="show ip dhcp binding" open="true" >}}
```
R1#show ip dhcp binding
Bindings from all pools not associated with VRF:
IP address      Client-ID/              Lease expiration        Type
                Hardware address/
                User name
10.0.10.51      0100.1643.1a20.1        Sep 13 2026 02:14 PM    Automatic
10.0.20.51      0100.5079.6668.1        Sep 13 2026 02:16 PM    Automatic
```

Both subnets allocated from one server — the relay working. The Client-ID is the MAC with a leading `01` (the hardware type for Ethernet).

Release a stale binding when a device has been replaced:

```
R1#clear ip dhcp binding 10.0.10.51
R1#clear ip dhcp binding *
```

And check the pool utilisation, which is the number that matters on a busy guest network:

```
R1#show ip dhcp pool

Pool LAN-A :
 Utilization mark (high/low)    : 100 / 0
 Subnet size (first/next)       : 0 / 0
 Total addresses                : 254
 Leased addresses               : 1
 Excluded addresses             : 55
 Pending event                  : none
```
{{< /verify >}}

{{< verify dev="R1" cmd="show ip dhcp conflict" >}}
```
R1#show ip dhcp conflict
IP address        Detection method   Detection time
10.0.10.60        Ping               Sep 06 2026 02:31 PM
```

A conflict means the server pinged an address before offering it and something answered — almost always a statically configured host inside the DHCP range. The address is quarantined and never offered again until cleared:

```
R1#clear ip dhcp conflict *
```

A growing conflict list is the signal that your exclusions do not match reality.
{{< /verify >}}

{{< verify dev="PC1, PC2" cmd="ipconfig /all" open="true" >}}
```
PC> ipconfig /all

   Physical Address................: 0001.6431.A201
   IP Address......................: 10.0.10.51
   Subnet Mask.....................: 255.255.255.0
   Default Gateway.................: 10.0.10.1
   DNS Servers.....................: 10.0.10.10
                                     8.8.8.8
   DHCP Servers....................: 10.0.10.1
   Lease Obtained..................: Sat Sep 06 2026 14:14
   Lease Expires...................: Sat Sep 13 2026 14:14
```

Check every field, especially the gateway and DNS — those are the two that produce "I have an address but nothing works".

An address in **169.254.x.x** means DHCP failed entirely and the host self-assigned an APIPA address. On the relayed LAN that points straight at the helper or a missing pool.

Force a renewal to test the whole path again:

```
PC> ipconfig /release
PC> ipconfig /renew
```
{{< /verify >}}

---

## Part 3 — DHCP client and DNS

{{< step num="5" dev="R2" title="A router that takes its own address from DHCP" >}}
```
R2(config)#interface GigabitEthernet0/2
R2(config-if)#ip address dhcp
R2(config-if)#no shutdown
R2(config-if)#end
```

This is how a branch router obtains its WAN address from an ISP. The router also installs a default route from DHCP option 3 automatically:

```
R2#show ip route static
S*    0.0.0.0/0 [254/0] via 203.0.113.1
```

AD **254**, not 1 — a DHCP-learned default is deliberately the least trusted route in the table, so anything you configure or learn dynamically overrides it.

```
R2#show dhcp lease
Temp IP addr: 203.0.113.24  for peer on Interface: GigabitEthernet0/2
Temp  sub net mask: 255.255.255.0
   DHCP Lease server: 203.0.113.1, state: 3 Bound
   Temp default-gateway addr: 203.0.113.1
```
{{< /step >}}

{{< step num="6" dev="R1" title="DNS: resolving names, and serving them" >}}
As a client:

```
R1(config)#ip domain-lookup
R1(config)#ip name-server 10.0.10.10 8.8.8.8
R1(config)#ip domain-name lab.local
```

Now `ping SW1` resolves. This is the one place where enabling `ip domain-lookup` is reasonable — with a working name server configured, a typo resolves and fails quickly instead of hanging. Lab 01's advice to disable it applies to devices with **no** name server, which is most lab routers.

Static entries, for the handful of names that matter and should not depend on DNS being up:

```
R1(config)#ip host SW1 10.0.10.2
R1(config)#ip host R2 10.0.12.2
```

```
R1#show hosts
Default domain is lab.local
Name/address lookup uses domain service
Name servers are 10.0.10.10, 8.8.8.8

Host                     Port  Flags      Age Type   Address(es)
SW1                      None  (perm, OK)  0   IP    10.0.10.2
R2                       None  (perm, OK)  0   IP    10.0.12.2
```

A router can also act as a small DNS server for a lab:

```
R1(config)#ip dns server
```

It answers from its `ip host` entries and forwards anything else to the configured name servers.

DNS uses **UDP 53** for queries and **TCP 53** for zone transfers and responses over 512 bytes — the detail that matters when you write the ACL in Lab 22.
{{< /step >}}

{{< verify dev="PC1" cmd="nslookup and ping by name" >}}
```
PC> nslookup server.lab.local
Server:  [10.0.10.10]
Address:  10.0.10.10

Name:      server.lab.local
Address:   10.0.30.10

PC> ping server.lab.local
Pinging 10.0.30.10 with 32 bytes of data:
Reply from 10.0.30.10: bytes=32 time=2ms TTL=126
```

If `nslookup` resolves but `ping <name>` does not, the problem is the host's DNS suffix, not the server. If neither resolves, check the DNS server address the client received from DHCP — which brings the whole lab back to `dns-server` in the pool.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Host has an address, no internet | `default-router` missing from the pool | `ipconfig /all` — no gateway |
| Remote subnet gets nothing | `ip helper-address` missing | `show run interface` on the client-side interface |
| Relay configured, still nothing | no pool matching the **giaddr** | `debug ip dhcp server packet` |
| Host gets 169.254.x.x | no DHCP reply at all — APIPA | check helper, pool, and Layer 2 |
| Duplicate address conflicts | gateway or servers not excluded | `show ip dhcp conflict` |
| Pool exhausted | lease too long, or the range is too small | `show ip dhcp pool` |
| Address works, names do not | `dns-server` missing or unreachable | `nslookup` from the host |
| Helper forwards unwanted broadcasts | `ip forward-protocol` defaults | disable UDP 137/138 |

## Exam notes

- **DORA**: Discover, Offer, Request, Ack. Ports **UDP 67 server / 68 client**.
- DISCOVER and REQUEST are **broadcast**; the broadcast REQUEST is what tells other servers to withdraw their offers.
- Renewal at **50% (T1)** unicast, **87.5% (T2)** broadcast.
- `ip dhcp excluded-address` is **global** and must be configured **before** the pool.
- `ip helper-address` goes on the **client-facing** interface and points at the server.
- The relay writes its interface address into **`giaddr`**, and the server uses that to select the pool.
- `ip helper-address` forwards 8 UDP services by default, not only DHCP.
- Key options: **3** default-router, **6** DNS, **15** domain-name, **51** lease, **150** TFTP.
- A DHCP-learned default route has AD **254**.
- DNS: **UDP 53** queries, **TCP 53** zone transfers and large responses.

---

*Sources: Jeremy's IT Lab Day 38 & 39 · Flackbox CCNA Lab Guide 23-1 · verified in Packet Tracer 8.2.*
