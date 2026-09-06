---
title: "DHCP"
date: 2026-09-06
description: "Why a client ends up on 169.254.x.x, where each of the four DORA messages can die, and the relay, pool and snooping faults that let a lease succeed while the host still cannot reach anything."
tags: ["Troubleshooting", "DHCP", "Relay", "Snooping", "Cisco"]
categories: ["Troubleshooting"]
unit: 5
---

A DHCP fault is one of two things: the client got no address at all, or it got an address and the address is useless. The first has a short list of causes and a very loud symptom. The second is harder, because every counter on every device says the exchange succeeded — and it did. The lease is fine; what was inside it was wrong.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| Client on **169.254.x.x** | no DHCP reply reached it at all | `debug ip dhcp server events` on the server |
| Only one VLAN affected | `ip helper-address` missing on that SVI | `show run interface Vlan<n>` |
| Helper configured, still nothing | helper on the **wrong** interface, or no route back to `giaddr` | `show ip route <relay-subnet>` on the server |
| Server logs Discover, sends nothing | no pool matches the receiving subnet | `show ip dhcp pool` |
| Some clients get addresses, some do not | pool exhausted | `show ip dhcp pool` — leased vs total |
| Duplicate address on the LAN | static address not excluded | `show ip dhcp conflict` |
| Bindings exist but stop growing | conflicts consuming the pool | `show ip dhcp conflict` |
| Address obtained, nothing reachable | wrong `default-router` or `dns-server` | `ipconfig /all` on the host |
| Works on one switchport, not another | DHCP snooping dropping the Offer | `show ip dhcp snooping` |

---

## DORA, and where each step dies

Four messages, and all four must complete. The useful part of knowing them is that each one fails in a different place.

| Step | Message | Source | Destination | Fails when |
|---|---|---|---|---|
| **D** | Discover | `0.0.0.0:68` | `255.255.255.255:67` | no server on the segment and no relay |
| **O** | Offer | server:67 | client, broadcast or unicast :68 | no matching pool, pool empty, snooping drop |
| **R** | Request | `0.0.0.0:68` | `255.255.255.255:67` | broadcast, so it reaches every server that offered |
| **A** | Ack | server:67 | client :68 | the offered address was taken in the meantime → **Nak** |

The client sources the Discover from `0.0.0.0` because it has no address yet, and broadcasts it because it does not know where the server is. That single fact causes most of the faults on this page: **a broadcast does not cross a router**, so unless something forwards it, the server never hears the client.

Note that the Request is also a broadcast, deliberately. When two servers offer, the client's Request names the one it accepted, and the broadcast tells the other server to release its reservation. If you have accidentally built two overlapping pools, this is why the symptom is intermittent rather than constant.

---

## The 169.254 address is a complete diagnosis

When a Windows or Linux client falls back to **169.254.x.x**, it means the client sent Discovers, waited, and heard nothing. That is not a partial failure — it is proof that **no DHCP reply reached the client's NIC**.

That narrows the search immediately, because it eliminates everything about the content of the lease. The address, the mask, the gateway, the DNS servers — none of it is in play. What is in play is the path between the client and the server, in both directions.

```
C:\>ipconfig
   Autoconfiguration IPv4 Address. . : 169.254.18.203
   Subnet Mask . . . . . . . . . . . : 255.255.0.0
   Default Gateway . . . . . . . . . :
```

Two hosts with APIPA addresses on the same VLAN can ping each other, which occasionally sends people down a Layer 2 rabbit hole. They can ping each other because 169.254.0.0/16 is a link-local subnet and they are both on it. It proves the switching is fine and tells you nothing about DHCP.

Start on the server. If the server never logged a Discover, the problem is on the way in:

```
R1#debug ip dhcp server events
DHCPD: DHCPDISCOVER received from client 0100.5079.6668.11 on interface Vlan20.
DHCPD: Sending DHCPOFFER to client 0100.5079.6668.11 (10.20.0.11).
```

Silence here means the Discover is not arriving, and the next section is why.

---

## The broadcast does not cross the router

When the server is not on the client's segment, the router in between has to convert the broadcast into something routable. `ip helper-address` does that: it takes the received broadcast, rewrites the destination to the configured server address, and — this is the part that matters for troubleshooting — **writes its own interface address into the `giaddr` field**.

```
Client ---broadcast---> SVI Vlan20 (10.20.0.1)
                        giaddr = 10.20.0.1, dst = 10.99.0.10
                        --------unicast--------> DHCP server
                        <---reply to 10.20.0.1---
```

`giaddr` does two jobs at once, and both of them break things when they are wrong.

**It is the return address.** The server unicasts its Offer back to `giaddr`, not to the client. If the server has no route to 10.20.0.1, the Offer is generated and then dropped on the server's own outbound lookup. On the server side the debug looks like a success. On the client side, nothing arrives.

```
DHCP_SRV(config)#ip route 10.20.0.0 255.255.255.0 10.99.0.1
```

**It is the pool selector.** The server picks a pool by matching `giaddr` against the `network` statement of each configured pool. No match, no Offer — which is the next section.

### The helper goes on the interface facing the client

This is worth stating flatly because it is inverted about as often as it is done correctly. **`ip helper-address` is configured on the interface where the broadcast arrives**, which is the interface facing the *client*, and its argument is the address of the *server*.

```
R1(config)#interface Vlan20
R1(config-if)#ip helper-address 10.99.0.10   ! on the client-facing SVI, pointing at the server
```

Putting it on the interface facing the server does nothing at all, because no DHCP broadcast is ever received on that interface. The configuration is accepted, `show run` looks plausible, and the symptom is unchanged.

If clients live on several SVIs, every one of them needs its own helper. A single missing line produces the classic "everything works except VLAN 30" report.

### What the helper actually relays

`ip helper-address` is not a DHCP feature. It is a UDP broadcast forwarder, and DHCP is one of eight services it forwards by default:

| Port | Service |
|---|---|
| 37 | Time |
| 49 | TACACS |
| 53 | DNS |
| **67** | **BOOTP/DHCP server** |
| **68** | **BOOTP/DHCP client** |
| 69 | TFTP |
| 137 | NetBIOS name service |
| 138 | NetBIOS datagram service |

That default list is a side effect nobody asks for. A helper added to fix DHCP quietly starts relaying NetBIOS and DNS broadcasts across the routed boundary too. Trim it when the environment is noisy:

```
R1(config)#no ip forward-protocol udp 137
R1(config)#no ip forward-protocol udp 138
R1(config)#no ip forward-protocol udp 69
```

And the reverse case: somebody previously ran `no ip forward-protocol udp 67` to stop unrelated flooding, and DHCP relay stops working across the whole router while every `ip helper-address` line remains in the configuration.

```
R1#show ip forward-protocol | include 67|68
```

---

## The server has nothing to offer

The Discover arrives, the server sees it, and no Offer is sent. Three causes, all visible in the same two commands.

### The pool does not match the receiving subnet

The server matches the pool to the subnet of the interface the request arrived on — or to `giaddr` when it came through a relay. A pool for 10.20.0.0/24 is invisible to a request that arrived with `giaddr` 10.30.0.1, no matter how much address space is free in it.

```
R1#show ip dhcp pool

Pool VLAN20 :
 Utilization mark (high/low)    : 100 / 0
 Subnet size (first/next)       : 0 / 0
 Total addresses                : 254
 Leased addresses               : 0
 Pending event                  : none
 1 subnet is currently in the pool :
 Current index        IP address range                    Leased addresses
 10.20.0.1            10.20.0.1        - 10.20.0.254       0
```

`Leased addresses: 0` with clients actively complaining means either the requests are not arriving or they are arriving with a `giaddr` this pool does not cover. The debug tells you which.

### The pool is exhausted

```
R1#show ip dhcp pool

Pool VLAN20 :
 Total addresses                : 254
 Leased addresses               : 254
 Pending event                  : none
```

The obvious fix is a larger pool. The more useful question is why a /24 with sixty users has 254 leases — usually a lease time measured in days on a network of transient wireless clients. Shorten the lease before widening the subnet:

```
R1(config)#ip dhcp pool VLAN20
R1(dhcp-config)#lease 0 8            ! 0 days, 8 hours
```

The symptom of exhaustion is distinctive: existing clients keep working, because renewals of an address the client already holds succeed. Only new clients fail. That combination — "nothing changed and half the office is fine" — is exhaustion almost every time.

### Static addresses were never excluded

The pool covers the whole subnet including the printers, the servers and the router's own address, because nobody added the exclusions.

```
R1(config)#ip dhcp excluded-address 10.20.0.1 10.20.0.20
R1(config)#ip dhcp excluded-address 10.20.0.250 10.20.0.254
```

Without them, the server will eventually hand out an address that a statically-configured device is already using, and the result lands in the conflict table.

---

## Conflicts

The IOS DHCP server does not trust its own bindings. Before it offers an address it **pings** it, and the client is expected to send a **gratuitous ARP** for the address it has been given. Either mechanism detecting an existing user of the address logs a conflict, and the address is pulled out of the pool.

```
R1#show ip dhcp conflict
IP address        Detection method   Detection time
10.20.0.31        Ping               Sep 06 2026 09:14 AM
10.20.0.42        Gratuitous ARP     Sep 06 2026 09:31 AM
```

**The detection method names the culprit.** `Ping` means the server itself found the address in use before offering it — a static device sitting inside the pool range. `Gratuitous ARP` means the client took the address, announced it, and something else answered — two servers with overlapping pools, or a rogue server.

Conflicts are permanent until cleared, so a subnet with a handful of unexcluded statics slowly bleeds addresses out of the pool and looks like exhaustion months later. Fix the exclusion first, then clear:

```
R1#clear ip dhcp conflict *
```

The ping test costs time on every offer. Its defaults are two packets with a 500 ms timeout, which adds up on a large pool; they can be tuned, but turning detection off entirely (`ip dhcp ping packets 0`) removes the only warning you get about duplicate addressing.

---

## `service dhcp`

`service dhcp` is on by default, so this looks unlikely until you inherit a device from someone who was hardening it. With it disabled the router neither serves DHCP **nor relays it** — the helper addresses stay in the configuration and do nothing.

```
R1#show running-config | include service dhcp
no service dhcp
```

The clean confirmation is the socket. UDP 67 is either being listened on or it is not:

```
R1#show ip sockets
Proto    Remote      Port      Local       Port  In Out  Stat TTY OutputIF
 17   --listen--      --      0.0.0.0        67   0   0   211   0
```

```
R1(config)#service dhcp
```

---

## DHCP snooping drops the Offer

DHCP snooping classifies every port as trusted or untrusted, and on an untrusted port it drops **server-sourced messages** — Offer, Ack, Nak — while allowing client-sourced Discover and Request through. All ports are untrusted the moment snooping is enabled for a VLAN, so the uplink toward the real server has to be trusted explicitly.

The symptom is exact: the server sees the Discover and logs an Offer, and the client stays on APIPA. The Offer is dying on a switch in the middle.

```
SW1#show ip dhcp snooping
Switch DHCP snooping is enabled
DHCP snooping is configured on following VLANs:
20,30
Insertion of option 82 is enabled
Interface                  Trusted    Rate limit (pps)
------------------------   -------    ----------------
GigabitEthernet0/1         no         unlimited
```

```
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#ip dhcp snooping trust      ! uplink toward the DHCP server
```

Two more snooping-specific faults worth knowing. The rate limit err-disables a port that sends too many DHCP packets, so a client stuck in a Discover loop takes its own port down. And **option 82** insertion on a switch whose uplink is a Layer 3 relay produces a relayed packet with `giaddr` 0.0.0.0 and an option-82 field, which many servers reject outright; `ip dhcp relay information trust-all` on the router, or disabling insertion on the switch, resolves it.

```
SW1(config)#no ip dhcp snooping information option
```

---

## The lease succeeded and nothing works

The hardest DHCP fault, because DHCP is working perfectly. The binding is there, the address is correct, and the host cannot reach anything.

```
R1#show ip dhcp binding
IP address       Client-ID/              Lease expiration        Type
                 Hardware address
10.20.0.11       0100.5079.6668.11       Sep 07 2026 09:14 AM    Automatic
```

The binding proves the exchange completed. It says nothing about the options carried inside it.

**Wrong `default-router`.** The host can reach its own subnet and nothing else — the exact signature of a bad gateway, and identical to the signature of no gateway at all. This happens most often after an SVI is renumbered and the pool is not updated.

**Wrong or unreachable `dns-server`.** Ping by address works, ping by name does not, and the user reports "the internet is down". Every diagnostic you run from the router succeeds.

Check the pool against reality rather than against the diagram:

```
R1#show running-config | section ip dhcp pool VLAN20
ip dhcp pool VLAN20
 network 10.20.0.0 255.255.255.0
 default-router 10.20.0.1
 dns-server 10.99.0.53 10.99.0.54
 domain-name corp.example.com
 lease 0 8
```

Then check what the host actually received, because a second DHCP server — a home router someone brought in, a hypervisor with NAT networking enabled — will answer faster than yours and hand out its own gateway:

```
C:\>ipconfig /all
   DHCP Server . . . . . . . . . . . : 192.168.1.1
```

A `DHCP Server` field that is not your server is the whole answer. That is what DHCP snooping exists to prevent, and it is the reason to enable it before you need it.

---

## Quick reference

| Command | Proves |
|---|---|
| `show ip dhcp binding` | the exchange completed — **not** that the options were right |
| `show ip dhcp pool` | which subnets have pools, and leased vs total addresses |
| `show ip dhcp conflict` | duplicate addresses, and by which method they were found |
| `show ip dhcp server statistics` | counts of each message type the server processed |
| `debug ip dhcp server events` | whether the Discover arrived and whether an Offer was generated |
| `debug ip dhcp server packet` | the full DORA exchange, including `giaddr` |
| `show ip sockets` | UDP 67 is being listened on — `service dhcp` is enabled |
| `show ip forward-protocol` | which UDP ports the helper relays |
| `show run interface Vlan<n>` | the helper is on the client-facing interface, pointing at the server |
| `show ip dhcp snooping` | which ports are trusted; an untrusted uplink drops Offers |
| `clear ip dhcp conflict *` | releases conflicted addresses back into the pool |
| `ipconfig /all` on the host | which server answered, and what it handed out |

---

*Based on the NetworkLessons troubleshooting series: DHCP on Cisco IOS.*
