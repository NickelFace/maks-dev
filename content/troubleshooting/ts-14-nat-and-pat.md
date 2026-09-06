---
title: "NAT and PAT"
date: 2026-09-06
description: "Reading a translation table properly, the inside/outside designation that causes most NAT outages, and the order-of-operations rule that decides which address an ACL actually sees."
tags: ["Troubleshooting", "NAT", "PAT", "ACL", "Cisco"]
categories: ["Troubleshooting"]
unit: 5
---

NAT fails in two distinctly different ways, and telling them apart takes one command. Either the translation was never created — in which case the configuration is wrong — or the translation exists and traffic still does not flow, in which case the problem is routing, an ACL, or the protocol itself. `show ip nat translations` sorts the two in a couple of seconds, and almost everything on this page follows from which answer you get.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| No translations at all | `ip nat inside`/`outside` missing or reversed | `show ip nat statistics` |
| Translations for the wrong hosts | ACL matches the wrong source | `show access-lists` |
| VPN or WAN traffic broken since NAT was added | permit-any ACL translating traffic that should be untouched | `show ip nat translations` |
| Some hosts translate, others do not | dynamic pool exhausted, no `overload` | `show ip nat statistics` — pool misses |
| Translation exists, no return traffic | the outside has no route to the inside global address | `show ip route` on the upstream device |
| Inbound static NAT never hits | ACL on the outside interface denies the **global** address | `show access-lists`, hit counters |
| Works, then fails under load | PAT port exhaustion | `show ip nat statistics` — active translations |
| FTP, SIP or IPsec broken, everything else fine | the protocol embeds addresses in its payload | `debug ip nat` |
| Stale entry after a configuration change | old translation still cached | `clear ip nat translation *` |

---

## The four addresses

The terminology is unhelpful until you notice that it is two independent axes. **Inside/outside** says which side of the router the *host* lives on. **Local/global** says which side of the router you are *standing on* when you look at the address.

| Term | Meaning | Typical value |
|---|---|---|
| **Inside local** | the inside host, as the inside sees it | `10.1.1.10` |
| **Inside global** | the inside host, as the outside sees it | `203.0.113.1` |
| **Outside global** | the outside host, as the outside sees it | `8.8.8.8` |
| **Outside local** | the outside host, as the inside sees it | `8.8.8.8` |

With plain source NAT, outside local and outside global are the same address — the destination is not being translated, so both views of it agree. They diverge only when you also translate the outside address, which is rare enough that seeing them differ is itself informative.

Now the table reads as a sentence:

```
R1#show ip nat translations
Pro Inside global         Inside local          Outside local         Outside global
tcp 203.0.113.1:14238     10.1.1.10:14238       8.8.8.8:443           8.8.8.8:443
tcp 203.0.113.1:14239     10.1.1.11:52104       8.8.8.8:443           8.8.8.8:443
udp 203.0.113.1:53        10.1.1.10:53          ---                   ---
--- 203.0.113.5           10.1.1.50             ---                   ---
```

The first two rows are PAT: two different inside hosts sharing one inside global address, distinguished by port. Notice the second row's port changed (52104 → 14239) and the first row's did not — IOS preserves the original port when it can and rewrites it only on collision.

The last row is a **static NAT** entry, identifiable by the `---` protocol and the absence of ports and outside addresses. Static entries exist permanently, whether or not any traffic has used them.

**An empty table is the diagnosis.** If a host is generating traffic and no row appears for it, no translation is being attempted, and the cause is in the next two sections.

---

## Inside and outside

Nothing else matters until this is right, and it is the single most common cause of a NAT outage. NAT does not infer direction from addresses or from routing. It acts only on packets that cross from an interface marked `ip nat inside` to one marked `ip nat outside`, or the reverse.

Miss one and NAT is inert. Reverse the two and NAT is worse than inert — it tries to translate returning traffic as though it were originating, and the table stays empty while the router burns CPU.

```
R1#show ip nat statistics
Total active translations: 0 (0 static, 0 dynamic; 0 extended)
Peak translations: 0
Outside interfaces:
  GigabitEthernet0/1
Inside interfaces:
Hits: 0  Misses: 0
```

`Inside interfaces:` with nothing beneath it, and `Hits: 0`, is the whole story. The LAN interface was never marked.

```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ip nat inside              ! faces the clients
R1(config)#interface GigabitEthernet0/1
R1(config-if)#ip nat outside             ! faces the internet
```

Two variations to watch for. On a router-on-a-stick, `ip nat inside` belongs on the **subinterfaces**, not the physical interface — configuring it on `Gi0/0` alone does nothing for `Gi0/0.20`. And on a router with two WAN links, both need `ip nat outside`, or traffic that fails over to the backup link stops being translated at the moment of failover, which is a wonderfully confusing outage.

---

## The ACL selects the traffic

The ACL referenced by `ip nat inside source list` decides what gets translated. It is a selector, not a filter — a `permit` means *translate this*, a `deny` means *leave this alone*. Nothing is dropped either way.

`show ip nat statistics` names the ACL, which saves reading the whole configuration:

```
R1#show ip nat statistics
Total active translations: 6 (1 static, 5 dynamic; 5 extended)
Outside interfaces:
  GigabitEthernet0/1
Inside interfaces:
  GigabitEthernet0/0
Hits: 4192  Misses: 118
Dynamic mappings:
-- Inside Source
[Id: 1] access-list NAT_HOSTS interface GigabitEthernet0/1 refcount 5
```

```
R1#show access-lists NAT_HOSTS
Standard IP access list NAT_HOSTS
    10 permit 10.1.0.0, wildcard bits 0.0.255.255 (4192 matches)
```

A match counter that stays at zero while hosts are actively trying is conclusive: the ACL does not cover them. The usual causes are a wildcard mask that is too tight after a subnet was renumbered, or an ACL written for the old addressing before a merge.

### The permit-any ACL

The more damaging mistake is the opposite one. `permit any` in a NAT ACL works fine on the day it is written, and then breaks the first thing that needs to reach an internal destination through the same outside interface — a site-to-site VPN, an MPLS circuit, a branch subnet reachable over the WAN.

Traffic destined for 10.2.0.0/16 across the tunnel gets its source rewritten to a public address, arrives at the far end as an unknown internet host, and is discarded. The symptom is that internet access works and the VPN does not, which sends people to look at the tunnel.

The fix is an extended ACL that excludes the internal destinations before permitting the rest — order matters, the deny must come first:

```
R1(config)#ip access-list extended NAT_HOSTS
R1(config-ext-nacl)#deny   ip 10.1.0.0 0.0.255.255 10.2.0.0 0.0.255.255   ! VPN traffic, do not translate
R1(config-ext-nacl)#deny   ip 10.1.0.0 0.0.255.255 10.3.0.0 0.0.255.255
R1(config-ext-nacl)#permit ip 10.1.0.0 0.0.255.255 any
```

After changing a NAT ACL, clear the table. Existing translations were built under the old rules and will keep being used:

```
R1#clear ip nat translation *
```

---

## Pools, overload and static entries

A dynamic pool without `overload` is a one-to-one mapping. Fifteen addresses in the pool means the sixteenth host gets nothing — its packets are dropped, and the drop is recorded as a miss.

```
R1#show ip nat statistics | begin Dynamic
Dynamic mappings:
-- Inside Source
[Id: 1] access-list NAT_HOSTS pool PUBLIC refcount 15
 pool PUBLIC: netmask 255.255.255.240
        start 203.0.113.10 end 203.0.113.24
        type generic, total addresses 15, allocated 15 (100%), misses 431
```

`allocated 15 (100%)` with a climbing miss counter is exhaustion. The symptom on the floor is that the first fifteen people in the office have internet and everyone after them does not, and it fixes itself overnight when the entries time out.

Add `overload` and one address serves everyone:

```
R1(config)#ip nat inside source list NAT_HOSTS pool PUBLIC overload
```

**Static entries win over dynamic ones.** A `ip nat inside source static` mapping is installed at configuration time and takes precedence for that host. The conflict to watch for is a static global address that also falls inside a dynamic pool range — the router will refuse the overlap or produce unpredictable allocation, depending on version. Keep the statics outside the pool:

```
R1(config)#ip nat inside source static 10.1.1.50 203.0.113.5
R1(config)#ip nat pool PUBLIC 203.0.113.10 203.0.113.24 netmask 255.255.255.240
```

---

## The translation exists and traffic still does not flow

This is where NAT stops being the problem and starts being the thing people blame.

**No route back to the inside global address.** With PAT onto the outside interface address this cannot happen — the interface address is by definition routable, which is a good reason to prefer it. With a pool, the upstream device has to know that 203.0.113.10–24 lives behind your router. If it does not, translations appear in the table, packets leave, and replies go somewhere else entirely.

The test is asymmetric on purpose: from an inside host the traffic dies, and from the router itself everything works, because the router sources from the interface address which *is* routed.

**No route to the inside local address on the return.** For an inbound static NAT, the router translates the destination and then routes it. If the inside network is reachable only through a routing protocol that has not converged, the translated packet is dropped after translation. `debug ip nat` shows the translation happening and nothing after it:

```
R1#debug ip nat
NAT*: s=198.51.100.7, d=203.0.113.5->10.1.1.50 [4471]
```

One arrow, then silence. The translation worked; the forwarding did not.

---

## Order of operations

This trips people constantly, and it is worth memorising in the reduced form rather than the full fifteen-step list.

**Inside to outside: route first, then translate.** The router performs the routing lookup on the *original* packet, then rewrites the source. Two consequences: the router must already have a route to the outside destination or NAT never happens at all, and an ACL applied **inbound on the inside interface** sees the untranslated private source.

**Outside to inside: translate first, then route.** The destination is rewritten to the inside local address before the routing lookup runs. Consequence: an ACL applied **inbound on the outside interface** is checked *before* translation, so it sees the **inside global** address as the destination.

| Direction | ACL location | Sees which address |
|---|---|---|
| Inside → outside | inbound on inside interface | inside **local** (private) |
| Inside → outside | outbound on outside interface | inside **global** (public) |
| Outside → inside | inbound on outside interface | inside **global** (public) |
| Outside → inside | outbound on inside interface | inside **local** (private) |

The line that matters in practice is the third one. An inbound ACL on the WAN interface protecting a statically-translated web server must permit traffic to **203.0.113.5**, the public address — not to 10.1.1.50. Written the intuitive way, with the private address, the ACL never matches, the implicit deny applies, and the static NAT looks broken while it is working perfectly:

```
R1(config)#ip access-list extended WAN_IN
R1(config-ext-nacl)#permit tcp any host 203.0.113.5 eq 443   ! the global address, not 10.1.1.50
R1(config)#interface GigabitEthernet0/1
R1(config-if)#ip access-group WAN_IN in
```

Hit counters settle the argument. An ACE at zero while traffic is arriving means it is matching the wrong address:

```
R1#show access-lists WAN_IN
Extended IP access list WAN_IN
    10 permit tcp any host 203.0.113.5 eq 443 (0 matches)
```

---

## PAT port exhaustion

One global address, one port space. In theory that is tens of thousands of simultaneous flows; in practice a single misbehaving host — a scanner, a torrent client, a broken application opening a connection per request — can consume the whole range and take the site off the internet.

```
R1#show ip nat statistics | include Total active|Peak
Total active translations: 38412 (1 static, 38411 dynamic; 38411 extended)
Peak translations: 41003, occurred 00:14:22 ago
```

The characteristic symptom is that everything works for a while after a reload or a clear, degrades over hours, and recovers on its own overnight. Find the source of the entries before adding addresses:

```
R1#show ip nat translations | include 10.1.1.
```

Timeouts control how long dead entries linger. The default TCP timeout of 24 hours is far too long when the table is under pressure, and half-open TCP sessions default to 10 seconds:

```
R1(config)#ip nat translation timeout 3600
R1(config)#ip nat translation tcp-timeout 3600
R1(config)#ip nat translation udp-timeout 300
```

---

## Protocols that carry addresses in the payload

NAT rewrites the IP header. Protocols that also put addresses inside the data are not covered by that, and they break in ways that look nothing like a NAT fault.

| Protocol | What breaks |
|---|---|
| **FTP active mode** | the `PORT` command carries the client's private address; the server's data connection goes nowhere |
| **SIP / H.323** | the SDP body advertises a private address; signalling works, audio is one-way or silent |
| **IPsec ESP** | no port numbers to translate — PAT cannot distinguish two tunnels; needs NAT-T over UDP 4500 |
| **PPTP / GRE** | no ports; a single session may work, a second one will not |

IOS handles several of these with application-layer gateways that inspect and rewrite the payload. They are on by default and are occasionally disabled during hardening, which produces exactly these symptoms:

```
R1#show running-config | include no ip nat service
no ip nat service sip udp port 5060
```

**One-way audio on VoIP through a NAT router is the classic.** The call connects because signalling is TCP or UDP that translates cleanly, and the media stream fails in one direction because the address inside the SDP was never rewritten.

---

## Clearing translations

Configuration changes do not affect existing entries. Any time you change an ACL, a pool, or an interface designation, clear the table or you will be testing the old behaviour:

```
R1#clear ip nat translation *                                  ! all dynamic entries
R1#clear ip nat translation inside 203.0.113.1 10.1.1.10       ! one entry
```

`clear ip nat translation *` removes dynamic entries only. Static mappings are part of the configuration and survive; removing one requires `no ip nat inside source static`. And on a busy router the clear is disruptive — every established session loses its translation and has to rebuild — so it is a maintenance-window command, not a first move.

---

## Quick reference

| Command | Proves |
|---|---|
| `show ip nat translations` | whether translations are being created, and for which hosts |
| `show ip nat translations verbose` | age and timeout of each entry — finds what is filling the table |
| `show ip nat statistics` | inside/outside interface assignment, the ACL in use, hits and misses |
| `show ip nat statistics \| begin Dynamic` | pool allocation and misses — exhaustion |
| `show access-lists <name>` | hit counters; a zero counter means the ACL does not match |
| `debug ip nat` | each translation as it happens; silence after the arrow means a routing failure |
| `clear ip nat translation *` | discards dynamic entries so a configuration change takes effect |
| `show ip route <inside global>` | on the upstream device — whether replies can find their way back |
| `show run \| include no ip nat service` | an application-layer gateway that was disabled |

---

*Based on the NetworkLessons troubleshooting series: NAT and PAT on Cisco IOS.*
