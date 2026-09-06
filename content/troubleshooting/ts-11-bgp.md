---
title: "BGP"
date: 2026-09-06
description: "Why a peer sits in Idle or flaps through Active, and why a prefix can be in the BGP table, valid, and still never reach the routing table or the neighbour."
tags: ["Troubleshooting", "BGP", "Routing", "Cisco"]
categories: ["Troubleshooting"]
unit: 4
---

BGP is unusual among routing protocols in that it does almost nothing automatically. It does not discover neighbours, it does not advertise a prefix because the interface is up, and it does not install a route because the route looks good. Every one of those things has to be configured explicitly, which means most BGP faults are omissions rather than errors — something that was never told to happen. That is worth holding in mind, because it changes what you look for.

Two commands separate the two halves of the problem. `show ip bgp summary` says whether the session is up. `show ip bgp` says whether the prefix arrived and whether it won. Neither answer implies the other.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| Peer stuck in **Idle** | no route to the peer address, or admin shutdown | `show ip route <peer>` |
| Peer cycling **Active/Idle** | TCP 179 blocked, wrong peer address, no listener | `telnet <peer> 179` |
| Peer flaps at Established | MD5 mismatch, duplicate router-ID, wrong AS | `show logging \| include BGP\|BADAUTH` |
| Loopback peering never comes up | missing `update-source`, missing `ebgp-multihop` | `show ip bgp neighbors \| include Local host` |
| `network` statement has no effect | no exact match in the routing table | `show ip route <prefix>` |
| Prefix in table with `*` but no `>` | **next hop unreachable** | `show ip route <next-hop>` |
| iBGP peer never learns a prefix | iBGP split horizon | `show ip bgp neighbors <peer> advertised-routes` |
| Prefix present at neighbour, absent locally | inbound filter, or own AS in the path | `show ip bgp neighbors <peer> received-routes` |
| Route in BGP, different route in RIB | administrative distance — `r` RIB-failure | `show ip bgp rib-failure` |

---

## The neighbour state machine

BGP peers over TCP 179, so the session has to survive two separate things: a TCP connection, and then a BGP negotiation on top of it. The state names tell you which of the two failed.

| State | Means | Read it as |
|---|---|---|
| **Idle** | not attempting a connection | no route to the peer, or shut down |
| **Connect** | waiting for the TCP handshake to finish | transient — a fraction of a second |
| **Active** | tried to open TCP, failed, will retry | **TCP is not getting through** |
| **OpenSent** | TCP up, OPEN sent, waiting for theirs | transient |
| **OpenConfirm** | OPEN accepted, waiting for the first keepalive | transient |
| **Established** | session up, prefixes exchanged | working |

Only Idle, Active and Established should ever be visible for more than a moment. Anything else that you can actually catch on screen means the session is cycling.

```
R1#show ip bgp summary
BGP router identifier 1.1.1.1, local AS number 100
BGP table version is 7, main routing table version 7

Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.0.12.2       4          200      64      66        7    0    0 00:41:19        3
10.0.13.3       4          200       0       0        1    0    0 never    Active
2.2.2.2         4          100       0       0        1    0    0 never    Idle
```

**A number in the last column instead of a state name means Established**, and the number is how many prefixes that peer sent. A `0` there is a working session that has advertised nothing, which is an entirely different problem from a session that is down — and one people regularly misread.

### Idle

Idle means BGP is not even trying, and the usual reason is that there is no route to the neighbour address. BGP will not open a TCP session to an address it cannot reach, and unlike an IGP it has no link-local discovery to fall back on.

```
R1#show ip route 2.2.2.2
% Network not in table
```

```
R1#debug ip bgp
*Sep  6 12:03:11.223: BGP: 2.2.2.2 open active, local address 0.0.0.0
*Sep  6 12:03:11.223: BGP: 2.2.2.2 Active open failed - no route to peer
```

For an iBGP peering to a loopback this almost always means the IGP is not carrying loopbacks — a very common gap, because the loopback is often left out of the `network` statements that were written for transit links. Fix the IGP rather than adding a static route, or the same fault recurs on every new peer.

Idle is also what you see after an administrative shutdown, so check `show ip bgp neighbors <peer> | include shut` before anything else.

### Active

Active is the state people find most misleading, because the word sounds healthy. It means the opposite: the router tried to open a TCP session, the attempt failed, and it is sitting in the retry cycle. There is a route to the peer — otherwise it would be Idle — and the TCP connection is not completing.

Test the transport directly. This is the single most useful BGP command that is not a BGP command:

```
R1#telnet 10.0.13.3 179
Trying 10.0.13.3, 179 ...
% Connection refused by remote host
```

`Connection refused` means the packet arrived and nothing was listening — the far end has no BGP configuration for this address, or is peering from a different source address than the one you configured. `Connection timed out` means the packet never got there at all, which points at an ACL or a firewall.

The session uses TCP 179 in both directions and only one side initiates, so a rule permitting 179 as a destination but not as a source blocks the return traffic:

```
R1(config-ext-nacl)#permit tcp host 10.0.13.3 host 10.0.13.1 eq 179
R1(config-ext-nacl)#permit tcp host 10.0.13.3 eq 179 host 10.0.13.1
```

### Wrong remote AS

The AS number is checked in the OPEN message, so TCP comes up and the session is torn down immediately afterwards — producing a peer that flaps between Idle and Active on a timer, which looks like an unstable link:

```
%BGP-3-NOTIFICATION: sent to neighbor 10.0.12.2 2/2 (peer in wrong AS) 2 bytes 00C8
```

The notification code says it plainly, and the trailing hex is the AS the peer actually claimed — `00C8` is 200. Compare against what is configured:

```
R1#show ip bgp neighbors 10.0.12.2 | include remote AS
BGP neighbor is 10.0.12.2,  remote AS 200, external link
```

Whether the peering is internal or external is derived from the AS numbers alone. Configure the same AS as your own and it becomes iBGP, with all of iBGP's rules — no TTL limit, no AS-path prepending, and split horizon — which produces a session that comes up and then behaves in ways that make no sense for an external link.

### Peering to a loopback

Loopback peering is standard for iBGP because a loopback does not go down when one of several links does. It requires two things, and eBGP requires a third.

`update-source` tells BGP to source the TCP session from the loopback. Without it, the session is sourced from the outgoing interface, and the far end — expecting the loopback address — rejects a connection from an address it has no neighbour statement for:

```
R1(config)#router bgp 100
R1(config-router)#neighbor 3.3.3.3 remote-as 100
R1(config-router)#neighbor 3.3.3.3 update-source Loopback0
```

The mismatch is visible in the connection details, and it is worth checking because it explains sessions that come up in one direction only:

```
R1#show ip bgp neighbors 3.3.3.3 | include host
Local host: 10.0.13.1, Local port: 25436
Foreign host: 3.3.3.3, Foreign port: 179
```

`Local host` should be the loopback. If it is the interface address, `update-source` is missing.

For **eBGP** there is a third requirement. eBGP sends its packets with **TTL 1** on the assumption that external peers are directly connected, so a session to a loopback — which is one hop further away — has its TTL expire before it arrives:

```
R1(config-router)#neighbor 2.2.2.2 remote-as 200
R1(config-router)#neighbor 2.2.2.2 update-source Loopback0
R1(config-router)#neighbor 2.2.2.2 ebgp-multihop 2    ! not needed for iBGP
```

**iBGP does not need `ebgp-multihop`** — it never had the TTL restriction. Adding it to an iBGP neighbour is harmless but signals a misunderstanding, and someone will eventually copy it somewhere it matters.

`ttl-security` is the safer alternative to `ebgp-multihop` where both ends support it. Instead of raising the TTL limit, it requires arriving packets to have a TTL *high enough*, which cannot be forged from further away:

```
R1(config-router)#neighbor 2.2.2.2 ttl-security hops 2
```

The two are mutually exclusive — configuring one removes the other.

### MD5 password mismatch

The password is part of the TCP session, not the BGP negotiation, so the failure appears as a TCP error rather than a BGP one. The peer never leaves Active, and the giveaway is in the log:

```
%TCP-6-BADAUTH: Invalid MD5 digest from 10.0.12.2(179) to 10.0.12.1(25601) tableid - 0
```

A password configured on one side only produces `No MD5 digest from ...` instead. Either way, `debug ip bgp` shows nothing useful — the session dies below BGP.

```
R1(config-router)#neighbor 10.0.12.2 password S3cretPeering
```

### Duplicate router-ID

Two routers using the same BGP identifier cannot peer with each other, and the OPEN is rejected with a specific subcode:

```
%BGP-3-NOTIFICATION: received from neighbor 2.2.2.2 2/3 (BGP identifier wrong) 4 bytes 01010101
```

The BGP router-ID follows the same selection rules as OSPF — explicit `bgp router-id`, else the highest loopback, else the highest active interface — and it is chosen once. Two routers with no loopbacks and the same numbering scheme on their first interface is how this happens in a lab, and after a template-driven deployment is how it happens in production.

---

## The session is up and the prefix is not there

Established with a prefix count of zero, or a prefix that arrived and never made it into the routing table, is a different investigation. Work outward from the originating router: is the prefix in its BGP table, is it being advertised, is it being received, and is it being selected.

```
R1#show ip bgp
BGP table version is 7, local router ID is 1.1.1.1
Status codes: s suppressed, d damped, h history, * valid, > best, i - internal,
              r RIB-failure
Origin codes: i - IGP, e - EGP, ? - incomplete

     Network          Next Hop            Metric LocPrf Weight Path
 *>  10.0.1.0/24      0.0.0.0                  0         32768 i
 *>  192.168.5.0      10.0.12.2                0             0 200 i
 *i  172.16.8.0/24    10.0.23.3                0    100      0 200 i
```

`*` is valid, `>` is best. **Only a route marked `>` is offered to the routing table.** A valid route without `>` either lost the best-path selection to another copy, or — far more often — has an unreachable next hop.

### `network` needs an exact match

In BGP, `network` does not enable an interface and does not create a route. It looks for an **exact match** in the routing table, prefix and mask both, and advertises it if found. No match, no advertisement, and no error message either.

```
R1(config)#router bgp 100
R1(config-router)#network 192.168.5.0 mask 255.255.255.0
```

Omitting `mask` makes the statement classful, so `network 192.168.5.0` looks for a /24 by luck of the class boundary, while `network 10.0.1.0` looks for **10.0.0.0/8** and does not find the /24 sitting in the table. That is the most common form of this fault:

```
R1#show ip route 10.0.1.0
Routing entry for 10.0.1.0/24
  Known via "connected", distance 0, metric 0 (connected, via interface)
```

```
R1(config-router)#network 10.0.1.0 mask 255.255.255.0    ! matches the /24
```

The corollary is that a `network` statement for a prefix learned dynamically stops advertising the moment the underlying route disappears. If a prefix should be advertised unconditionally, back it with a static route to Null0 so that something always matches:

```
R1(config)#ip route 10.0.0.0 255.0.0.0 Null0
```

### Next hop unreachable

BGP does not change the next-hop attribute when a route passes between iBGP peers. A prefix learned by R1 from an eBGP peer at 10.0.12.2 arrives at R3 inside the AS still carrying **10.0.12.2** as its next hop — an address on an external link that R3's IGP has no reason to know about.

```
R3#show ip bgp
     Network          Next Hop            Metric LocPrf Weight Path
 * i 192.168.5.0      10.0.12.2                0    100      0 200 i
```

Valid, not best, and the reason is one command away:

```
R3#show ip route 10.0.12.2
% Network not in table
```

The fix is applied on the router doing the iBGP advertising, telling it to rewrite the next hop to its own address — which the IGP does know:

```
R1(config)#router bgp 100
R1(config-router)#neighbor 3.3.3.3 next-hop-self
```

The alternative — carrying external transit subnets in the IGP — works but puts links you do not control into your own topology, and is the reason `next-hop-self` exists.

### iBGP split horizon

**A prefix learned from an iBGP peer is never advertised to another iBGP peer.** This is not a bug or a tunable; it is the loop prevention for iBGP, which has no AS-path hop to detect a loop with since every router inside the AS shares one AS number.

The consequence is that iBGP is not transitive. R1 → R2 → R3 does not work: R2 receives the prefix from R1 and refuses to pass it to R3. With three routers this is easy to spot; with eight it is a long afternoon.

```
R2#show ip bgp neighbors 3.3.3.3 advertised-routes
Total number of prefixes 0
```

The traditional answer is a **full mesh** — every iBGP router peered with every other — which needs n(n−1)/2 sessions and stops being reasonable somewhere around six or seven routers. A **route reflector** exempts one router from the rule, allowing it to reflect routes between its clients:

```
R2(config)#router bgp 100
R2(config-router)#neighbor 1.1.1.1 route-reflector-client
R2(config-router)#neighbor 3.3.3.3 route-reflector-client
```

Only the reflector needs the configuration. The clients are ordinary iBGP peers and do not know they are clients, which is why "we configured the route reflector" sometimes means it was configured on the wrong device.

### Synchronisation

The synchronisation rule said a router would not advertise an iBGP-learned route unless the IGP also had it. It has been **off by default since IOS 12.2(8)T**, `show ip protocols` reports `IGP synchronization is disabled`, and there is rarely a reason to change that. It is worth knowing only because it explains old configurations carrying an explicit `no synchronization`.

### Your own AS in the path

An eBGP router discards any update whose AS-path already contains its own AS number. That is the loop prevention working correctly, and it also breaks the legitimate case where two sites of the same organisation sit behind a provider and each has to accept the other's prefixes:

```
R3#debug ip bgp updates
*Sep  6 13:22:41.117: BGP(0): 10.0.34.4 rcv UPDATE about 10.0.1.0/24 -- DENIED due to: AS-PATH contains our own AS;
```

The prefix is dropped on receipt, so it appears in `show ip bgp neighbors <peer> received-routes` and nowhere else. Overriding it is a deliberate decision, not a fix to apply casually:

```
R3(config-router)#neighbor 10.0.34.4 allowas-in 1
```

### Filters that fail silently

A prefix-list or route-map applied to a neighbour produces no log entry and no error. The prefix is simply not there. Check both ends, because an outbound filter on the sender and an inbound filter on the receiver look identical from the receiver's side:

```
R1#show ip bgp neighbors 10.0.12.2 | include policy|filter|prefix list
 Outgoing update prefix filter list is CUSTOMER_OUT
 Route map for outgoing advertisements is SET_LOCALPREF
```

Compare `show ip bgp neighbors <peer> advertised-routes` on the sender with `show ip bgp neighbors <peer> received-routes` on the receiver. When those disagree, something in between is filtering; when they agree and the route still is not installed, the problem is local. Note that `received-routes` needs **soft reconfiguration inbound** configured, or it returns nothing and looks like a filtering problem in its own right:

```
R2(config-router)#neighbor 10.0.12.1 soft-reconfiguration inbound
```

And after changing any policy, the session must be refreshed before the change means anything. Use the soft form — a hard `clear ip bgp *` tears down every session on the router:

```
R2#clear ip bgp 10.0.12.1 soft in
```

### RIB failure

An `r` in the first column means BGP chose the route as best and the routing table declined it, because another protocol already has the same prefix with a lower administrative distance. Nothing is broken; the traffic follows the other protocol's copy.

```
R1#show ip bgp rib-failure
Network            Next Hop      RIB-failure           RIB-NH Matches
192.168.20.0/24    10.0.12.2     Higher admin distance             n/a
```

It matters because the route is still advertised onward to BGP peers even though the local router is not using it — which is exactly the setup for traffic taking a path you did not intend.

---

## Quick reference

| Command | Proves |
|---|---|
| `show ip bgp summary` | session state per peer; a number means Established and counts prefixes |
| `show ip bgp` | whether the prefix is in the table, valid, and best (`*>`) |
| `show ip bgp <prefix>` | every copy of one prefix, with next hop and why it won or lost |
| `show ip bgp neighbors <peer>` | AS, state, hold timers, local/foreign address, applied policy |
| `show ip bgp neighbors <peer> advertised-routes` | what we are actually sending |
| `show ip bgp neighbors <peer> received-routes` | what arrived before inbound policy — needs soft reconfiguration |
| `show ip bgp rib-failure` | best BGP routes the routing table refused, and why |
| `telnet <peer> 179` | whether TCP reaches the peer at all — refused vs timed out |
| `debug ip bgp` | open failures, notifications, wrong AS |
| `debug ip bgp updates` | per-prefix accept/deny decisions, including AS-path drops |
| `clear ip bgp <peer> soft in` | re-applies inbound policy without dropping the session |

---

*Based on the NetworkLessons troubleshooting series: BGP neighbor adjacency and BGP route advertisement on Cisco IOS.*
