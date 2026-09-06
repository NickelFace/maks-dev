---
title: "Static Routes and RIP"
date: 2026-09-06
description: "Static routes that refuse to install, the missing return route that makes a network half-work, and the RIP faults — version mismatch, auto-summary, classful network statements — that hide in plain sight."
tags: ["Troubleshooting", "Static Routing", "RIP", "Routing", "Cisco"]
categories: ["Troubleshooting"]
unit: 4
---

Static routes and RIP fail in opposite ways. A static route is inert — it does exactly what you typed, and when it does not work the configuration is usually correct and the assumption behind it is wrong. RIP is chatty and full of defaults that were sensible in 1988, so its faults are almost always something you did not configure rather than something you did. Both share one symptom that wastes more time than any other: **traffic works in one direction only**.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| Static route not in the routing table | next hop not reachable | `show ip route <next-hop>` |
| Route installs, traffic dies | recursive lookup resolves to nothing usable | `show ip route <destination>` |
| Ping from the router works, from the LAN does not | missing return route | `ping <dest> source <lan-ip>` |
| Backup path never takes over | floating static AD too low, or primary never withdrawn | `show ip route`, `show ip route <net>` |
| ARP table full of one MAC | static route out a multi-access interface, no next hop | `show ip arp` |
| RIP routes learned one way only | version mismatch, or passive on one side | `show ip protocols`, `debug ip rip` |
| Classful summaries where you expect /24s | `auto-summary` and discontiguous networks | `show ip route`, `show ip protocols` |
| No RIP updates at all on a link | passive-interface, ACL on UDP 520, or missing `network` | `debug ip rip`, `show ip protocols` |

---

## Static routes

### The next hop must be reachable

A static route with a next-hop address is not installed into the routing table unless the router already knows how to reach that next hop. IOS accepts the command, stores it in the configuration, and quietly declines to use it.

```
R1(config)#ip route 10.0.30.0 255.255.255.0 10.0.12.2
R1#show ip route static
R1#
```

Nothing. The route is in `show running-config` and absent from `show ip route`, which is the signature of a next hop the router cannot resolve. Check it directly:

```
R1#show ip route 10.0.12.2
% Network not in table
```

The usual reasons are prosaic: a typo in the next-hop address, an interface in the next hop's subnet that is down, or a next hop that lives on the wrong side of the network entirely. **The route reappears on its own the moment the next hop becomes reachable**, which makes this fault look intermittent when the underlying link is flapping.

### Recursive lookup

A next-hop address means the router must perform a second lookup to find how to reach that address. That is recursion, and it can succeed at the first level and fail at the second.

```
R1(config)#ip route 10.0.30.0 255.255.255.0 10.0.23.3
```

Here 10.0.23.3 is not directly connected — it is reachable via another static route. The router resolves 10.0.30.0/24 to 10.0.23.3, then resolves 10.0.23.3 to something else, and only then finds an outgoing interface. Break any link in that chain and the whole route goes:

```
R1#show ip route 10.0.30.0
Routing entry for 10.0.30.0/24
  Known via "static", distance 1, metric 0
  Routing Descriptor Blocks:
  * 10.0.23.3
      Route metric is 0, traffic share count is 1
```

The absence of an `Interface` line is the clue: the route resolved to an address and never got as far as a physical exit. The other recursion trap is a **default route pointing at an address only reachable through the default route itself** — the router detects the loop and refuses to install it, while the configuration reads as entirely reasonable.

### Static routes out a multi-access interface

`ip route 10.0.30.0 255.255.255.0 GigabitEthernet0/0` with no next hop tells the router "everything for this network goes out that port". On a point-to-point serial link that is fine — there is exactly one device at the other end. **On Ethernet it is a mistake**, because Ethernet needs a MAC address and the router has no idea whose.

What actually happens is that the router treats the destination as directly attached and ARPs for **every host address in that network**, one by one:

```
R1#show ip arp
Protocol  Address          Age (min)  Hardware Addr   Type   Interface
Internet  10.0.30.10             0    0011.2233.4455  ARPA   GigabitEthernet0/0
Internet  10.0.30.11             0    0011.2233.4455  ARPA   GigabitEthernet0/0
Internet  10.0.30.12             0    0011.2233.4455  ARPA   GigabitEthernet0/0
```

Every entry resolves to the same MAC — the neighbouring router's, answering by proxy ARP. It works, right up until proxy ARP is disabled (it is off by default on many modern platforms) or the cache fills with thousands of entries. The correct form names both, giving an exit interface without a recursive lookup **and** a specific address to resolve:

```
R1(config)#ip route 10.0.30.0 255.255.255.0 GigabitEthernet0/0 10.0.12.2
```

### Floating statics and administrative distance

A floating static is a backup route given an AD higher than the protocol it backs up, so it sits dormant until the primary disappears. The defaults it has to beat: connected 0, static 1, EIGRP internal 90, OSPF 110, RIP 120, EIGRP external 170.

```
R1(config)#ip route 0.0.0.0 0.0.0.0 10.0.12.2
R1(config)#ip route 0.0.0.0 0.0.0.0 172.16.1.2 130   ! floats above RIP's 120
```

Two failure modes, and they look nothing alike.

**The AD is too low.** A "backup" with AD 1 competes with nothing — it wins, permanently, and traffic takes the backup path even while the primary is healthy. The symptom is a working network that is inexplicably slow, and `show ip route` names the wrong interface.

**The primary never goes away.** A floating static only takes over when the primary route is withdrawn from the table, and a route via a next hop that is still pingable is not withdrawn merely because the far end of the path broke. This is the classic "the backup link never activated" post-mortem: the primary interface stayed `up/up` because the fault was three hops away. Object tracking with an IP SLA is the fix, not a lower AD.

### The missing return route

**The single most common static-routing fault, and the one whose symptom is most misleading.** The forward path is configured, the reverse is not, and the network works for exactly the tests you are likely to run.

```
R1#ping 10.0.30.10
!!!!!
Success rate is 100 percent (5/5)
```

```
R1#ping 10.0.30.10 source 10.0.10.1
.....
Success rate is 0 percent (0/5)
```

The first ping is sourced from R1's outgoing interface, which sits in a subnet the far router certainly knows — it is directly connected to it. The reply comes back without needing any route at all. The second is sourced from the LAN behind R1, and the far router has no route for 10.0.10.0/24, so the echo arrives and the reply is dropped. From the LAN's point of view the network is entirely broken; from the router's it is perfect.

**Always source your ping from the subnet that actually needs to work**, then confirm on the far router that the return route exists:

```
R3#show ip route 10.0.10.0
% Subnet not in table
R3(config)#ip route 10.0.10.0 255.255.255.0 10.0.23.2
```

---

## RIP

Everything about RIP's default behaviour dates from a classful internet, and every one of those defaults is now a fault waiting to happen.

### Version 1 and version 2

The two versions are not interchangeable, and the default is worse than either:

| | RIPv1 | RIPv2 |
|---|---|---|
| Addressing | classful — **no mask in the update** | classless, carries the mask |
| Destination | broadcast 255.255.255.255 | multicast **224.0.0.9** |
| Authentication | none | plaintext or MD5 |
| VLSM | not supported | supported |

Left alone, IOS **sends version 1 and receives both**. Configure `version 2` on one router and not the other, and updates flow in one direction: the v2 router hears the v1 router's broadcasts, and the v1 router discards the v2 multicasts it cannot parse.

```
R1#show ip protocols
Routing Protocol is "rip"
  Sending updates every 30 seconds, next due in 12 seconds
  Invalid after 180 seconds, hold down 180, flushed after 240
  Default version control: send version 2, receive version 2
    Interface             Send  Recv  Triggered RIP  Key-chain
    GigabitEthernet0/0    2     2
```

The neighbour reporting `send version 1, receive any` is the other half of the mismatch, and `debug ip rip` states it outright rather than leaving you to infer it:

```
R1#debug ip rip
RIP: ignored v1 packet from 10.0.12.2 (illegal version)
```

```
R1(config)#router rip
R1(config-router)#version 2
```

Set it explicitly on every router. Relying on "receive any" is how a network ends up half-classful without anyone noticing.

### The `network` statement is classful

This surprises people every time. The `network` command under `router rip` takes a **classful** network, and IOS rewrites whatever you type into its class boundary:

```
R1(config-router)#network 10.0.12.0
```

```
R1#show running-config | section router rip
router rip
 version 2
 network 10.0.0.0
```

You typed a /24 and got a /8. The consequence is broader than it looks: that one statement enables RIP on **every interface whose address falls anywhere in 10.0.0.0/8**, including ones you had no intention of running RIP on. Conversely, the reason a network is not being advertised is often that its `network` statement covers a different classful block entirely.

The `network` command does two things at once, and separating them mentally helps: it **advertises** the connected subnets of that classful network, and it **enables RIP on the interfaces** in it. A network missing from `show ip route rip` on a neighbour is usually missing its `network` statement here — check `show ip protocols` on the originating router, not on the one that cannot see it.

### Auto-summary and discontiguous networks

RIPv2 has `auto-summary` on by default. At a classful boundary the router replaces the specific subnets it knows with a single classful summary — 10.0.10.0/24, 10.0.20.0/24 and 10.0.30.0/24 all become 10.0.0.0/8.

That is harmless while a major network lives in one place. It is destructive when the network is **discontiguous** — the same major network present in two parts of the topology separated by a different one:

```
R1#show ip route rip
R        10.0.0.0/8 [120/1] via 192.168.12.2, 00:00:08, GigabitEthernet0/0
```

Both routers advertise 10.0.0.0/8 across the 192.168.12.0/24 link between them. Each receives a summary for a network it also owns locally, the specific subnets never cross, and traffic goes to whichever advertiser won — arbitrarily, and often in a loop. The result is intermittent reachability that varies by destination for no visible reason.

```
R1(config)#router rip
R1(config-router)#no auto-summary
```

**`no auto-summary` belongs in every RIPv2 configuration.** Its absence is a fault even when the topology is currently contiguous, because it becomes one the day someone adds a subnet elsewhere.

### Passive-interface on the wrong side

A passive interface **sends no updates but still receives them**. That asymmetry is the whole point on a LAN facing hosts, and it is exactly wrong on a link facing another router.

```
R1#show ip protocols | begin Passive
  Passive Interface(s):
    GigabitEthernet0/1
```

The symptom is one-way route learning: R1 knows all of R2's networks, R2 knows none of R1's. Anyone testing from R1 concludes RIP is working. The reverse mistake is worth naming too — `passive-interface default` followed by selective `no passive-interface` is good practice, and forgetting the second half silences the router completely.

```
R1(config)#router rip
R1(config-router)#no passive-interface GigabitEthernet0/1
```

### Split horizon on hub-and-spoke

Split horizon forbids advertising a route back out the interface it was learned on. On point-to-point links it prevents loops at no cost. On a hub-and-spoke multipoint interface — one physical serial at the hub serving several spokes — it also blocks routes learned from one spoke from reaching another, because they arrive and would leave on the same interface. The symptom is precise: **spokes reach the hub, spokes cannot reach each other**, and the hub's own routing table is complete.

```
R1#show ip interface Serial0/0/0 | include split horizon
  Split horizon is enabled
R1(config)#interface Serial0/0/0
R1(config-if)#no ip split-horizon
```

Disable it only on the hub, and only on the multipoint interface. The alternative — and the better design — is point-to-point subinterfaces, one per spoke, where split horizon causes no problem because each spoke has its own interface.

### Fifteen hops

RIP's metric is a hop count and 16 means unreachable. Networks farther than 15 hops away do not exist as far as RIP is concerned, and nothing in the routing table hints at why.

```
R1#show ip route rip
R       192.168.9.0/24 [120/15] via 10.0.12.2, 00:00:14, GigabitEthernet0/0
```

A metric of 15 is one hop from disappearing. Real topologies rarely reach that depth, so when you see a large hop count the cause is usually an **offset-list** adding to the metric artificially — sometimes deliberately for path selection, sometimes left over from a change nobody documented:

```
R1#show ip protocols | include Offset
  Incoming routes will have 10 added to metric if on list 1
```

```
R1(config-router)#no offset-list 1 in 10 GigabitEthernet0/0
```

### ACLs, and the port RIP uses

RIP rides on **UDP port 520**. An access list applied to a transit interface that permits the traffic everyone thought about and denies everything else will kill the routing protocol along with it — and the symptom appears minutes later, when the routes age out, long enough after the change to obscure the connection.

```
R1#show access-lists 101
Extended IP access list 101
    10 permit tcp any any established (482 matches)
    20 permit icmp any any (36 matches)
```

```
R1(config)#ip access-list extended 101
R1(config-ext-nacl)#5 permit udp any any eq 520
```

For RIPv2 the multicast destination matters as well — an ACL that denies 224.0.0.9 blocks updates while unicast traffic passes normally, so ping and traceroute both succeed while routing quietly starves.

### Authentication mismatch

RIPv2 authentication is configured per interface against a key chain. The key-chain *name* is local and need not match; the key **id** and the key **string** must, and so must the mode.

```
R1(config)#key chain RIP-KEYS
R1(config-keychain)#key 1
R1(config-keychain-key)#key-string Cisco123
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ip rip authentication mode md5
R1(config-if)#ip rip authentication key-chain RIP-KEYS
```

A mismatch produces silence in `show ip route` and a clear statement in the debug:

```
R1#debug ip rip
RIP: ignored v2 packet from 10.0.12.2 (invalid authentication)
```

Plaintext (`mode text`) on one side and `md5` on the other fails the same way, and one side authenticating while the other does not is a mismatch, not a partial success.

---

## Reading `show ip protocols`

For RIP this one command answers most of the questions above at once, which is why it comes before `debug`:

```
R1#show ip protocols
Routing Protocol is "rip"
  Outgoing update filter list for all interfaces is not set
  Incoming update filter list for all interfaces is 10
  Sending updates every 30 seconds, next due in 7 seconds
  Invalid after 180 seconds, hold down 180, flushed after 240
  Default version control: send version 2, receive version 2
  Automatic network summarization is not in effect
  Maximum path: 4
  Routing for Networks:
    10.0.0.0
  Passive Interface(s):
    GigabitEthernet0/1
  Routing Information Sources:
    Gateway         Distance      Last Update
    10.0.12.2            120      00:00:09
  Distance: (default is 120)
```

Read it top to bottom: filters, timers, version, summarisation, which networks, which interfaces are muted, and **which neighbours have actually been heard from and how recently**. That last block is the closest thing RIP has to a neighbour table — a gateway whose last update is older than 180 seconds is gone, and one that never appears was never heard. The distribute-list on the second line is the easiest thing on the page to read past; follow it through to `show access-lists 10` before assuming the neighbour is at fault.

---

## Quick reference

| Command | Proves |
|---|---|
| `show ip route` | which routes are actually installed, and via which interface |
| `show ip route <destination>` | the longest-prefix result, the AD, and whether recursion resolved |
| `show ip route <next-hop>` | whether a static route's next hop is reachable at all |
| `show ip route static` | that a configured static route did or did not install |
| `show ip protocols` | version, `network` statements, auto-summary, passive, filters, neighbours heard |
| `show ip rip database` | what RIP itself holds, before route selection |
| `debug ip rip` | updates sent and received, and the reason a packet was ignored |
| `show ip interface <int> \| include split horizon` | whether split horizon is suppressing spoke-to-spoke routes |
| `show ip arp` | the many-entries-one-MAC signature of a next-hopless Ethernet static |
| `ping <dest> source <lan-ip>` | the return route — the half a default-sourced ping cannot test |

---

*Based on the NetworkLessons troubleshooting series: RIP on Cisco IOS, and static routing.*
