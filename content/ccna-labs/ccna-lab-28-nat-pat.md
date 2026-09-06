---
title: "Lab 28 · NAT and PAT"
date: 2026-09-06
description: "Static NAT, dynamic NAT and PAT on one router — with the inside/outside terminology sorted out once, because that is what the exam actually tests."
tags: ["CCNA", "NAT", "PAT", "IP Services", "Lab"]
categories: ["CCNA"]
domain: 4
tool: "Packet Tracer"
duration: "50 min"
sources: "Jeremy's IT Lab Day 44, 45 · Flackbox 29-1"
aliases: ["/ccna-labs/ccna-lab-29-nat/"]
---

NAT itself is straightforward. The terminology is not, and the exam knows it: **inside local, inside global, outside local, outside global** are four terms that describe two addresses seen from two perspectives, and getting them backwards is the most common way to lose marks on an otherwise easy question.

Get the vocabulary right first, then the configuration is three variations on one command.

## Topology

{{< topology cols="4" rows="3" caption="Private LAN behind R1, translated to a public pool on the way out" >}}
pc     PC1 "192.168.1.10" at 0,0
server WEB "192.168.1.100" at 0,2
switch SW1 "" at 1,1
router R1 "NAT border" at 2,1
cloud ISP "203.0.113.0/29" at 3,1

PC1 — SW1
WEB — SW1
SW1 — R1 label="inside"
R1 — ISP label="outside"
{{< /topology >}}

| Role | Address |
|---|---|
| Inside network | 192.168.1.0/24 |
| R1 inside (G0/0) | 192.168.1.1/24 |
| R1 outside (G0/1) | 203.0.113.2/29 |
| ISP | 203.0.113.1/29 |
| Public pool | 203.0.113.3 – 203.0.113.6 |
| Internet host | 198.51.100.10 |

## Objectives

- Define inside local, inside global, outside local and outside global for a specific packet
- Configure static NAT for an inbound-reachable server, including port forwarding
- Configure dynamic NAT from a pool and observe pool exhaustion
- Configure PAT and read the port numbers in the translation table
- Debug a translation and clear the table

---

## Part 1 — The four terms

{{< step num="1" dev="—" title="Two axes: whose address, and which side you are standing on" open="true" >}}
The terms combine two independent questions:

- **Inside / Outside** — whose address is it? A host on my network, or a host on theirs?
- **Local / Global** — which side of the NAT router am I looking from? Local means as seen on the inside; global means as seen on the outside.

| Term | Whose | Seen from | In this lab |
|---|---|---|---|
| **Inside local** | my host | inside | `192.168.1.10` |
| **Inside global** | my host | outside | `203.0.113.3` |
| **Outside local** | their host | inside | `198.51.100.10` |
| **Outside global** | their host | outside | `198.51.100.10` |

**Inside local and inside global are the two you care about**, and they are the pair NAT actually swaps. Outside local and outside global are usually identical, because nothing is translating the far end's address — they differ only with destination NAT, which is outside the CCNA blueprint.

The sentence to remember: **"Local is what the inside sees, global is what the outside sees."** Then "inside" and "outside" simply say whose address is being described.

Trace one packet:

```
PC1 → internet, before translation:   src 192.168.1.10   dst 198.51.100.10
                                          inside local       outside local

PC1 → internet, after translation:    src 203.0.113.3    dst 198.51.100.10
                                          inside global      outside global
```

The destination did not change. The source changed from inside local to inside global. That is all NAT did.
{{< /step >}}

{{< step num="2" dev="R1" title="Mark the interfaces — nothing works without this" >}}
```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#description ## inside — LAN ##
R1(config-if)#ip address 192.168.1.1 255.255.255.0
R1(config-if)#ip nat inside
R1(config-if)#no shutdown
R1(config-if)#exit
R1(config)#interface GigabitEthernet0/1
R1(config-if)#description ## outside — ISP ##
R1(config-if)#ip address 203.0.113.2 255.255.255.248
R1(config-if)#ip nat outside
R1(config-if)#no shutdown
R1(config-if)#end
```

**`ip nat inside` and `ip nat outside` are the step people forget**, and the failure is silent: translations are configured, the ACL matches, and `show ip nat translations` is empty because the router has no idea which direction is which.

NAT only translates traffic crossing **between** an inside and an outside interface. Traffic between two inside interfaces is never touched.
{{< /step >}}

---

## Part 2 — Static NAT

{{< step num="3" dev="R1" title="A permanent one-to-one mapping for an inbound server" >}}
```
R1(config)#ip nat inside source static 192.168.1.100 203.0.113.4
```

A fixed, bidirectional mapping. The web server is reachable from the internet at `203.0.113.4`, and its outbound traffic always appears as that address.

Static NAT is what you use for anything that must be reachable **from** the internet, because dynamic translations only exist after the inside host sends something.

Port forwarding — one public address, several internal servers:

```
R1(config)#ip nat inside source static tcp 192.168.1.100 80 203.0.113.2 80
R1(config)#ip nat inside source static tcp 192.168.1.101 443 203.0.113.2 443
R1(config)#ip nat inside source static tcp 192.168.1.102 22 203.0.113.2 2222
```

This is **static PAT**, and it is what a home router does for every port-forward rule. Note the third line maps external port 2222 to internal 22 — the ports need not match, and moving SSH off its well-known port cuts the automated scanning noise substantially.

Verify at once:

```
R1#show ip nat translations
Pro  Inside global      Inside local       Outside local      Outside global
---  203.0.113.4        192.168.1.100      ---                ---
tcp  203.0.113.2:80     192.168.1.100:80   ---                ---
```

The static entries are present **before any traffic has flowed**. That is the defining property of static NAT and the reason it works for inbound connections.
{{< /step >}}

---

## Part 3 — Dynamic NAT

{{< step num="4" dev="R1" title="A pool, and what happens when it runs out" open="true" >}}
```
R1(config)#ip nat pool PUBLIC-POOL 203.0.113.5 203.0.113.6 netmask 255.255.255.248
R1(config)#access-list 1 permit 192.168.1.0 0.0.0.255
R1(config)#ip nat inside source list 1 pool PUBLIC-POOL
R1(config)#end
```

Three components, and they must agree:

1. **A pool** of public addresses
2. **An ACL** selecting which inside hosts may be translated — this ACL **matches traffic, it does not filter it**
3. **The binding** that ties them together

A deliberately small pool here — two addresses — to make exhaustion easy to demonstrate.

The ACL is a common confusion. `access-list 1 permit 192.168.1.0 0.0.0.255` does not permit anything through a filter; it selects which source addresses are eligible for translation. Traffic from a source the ACL does not match is routed **untranslated**, which on a private-addressed LAN means it is dropped by the first upstream router — a fault that looks like a routing problem and is not.

Now generate traffic from three hosts:

```
R1#show ip nat translations
Pro  Inside global      Inside local       Outside local      Outside global
---  203.0.113.5        192.168.1.10       ---                ---
---  203.0.113.6        192.168.1.11       ---                ---
```

Two entries, pool full. The third host gets nothing:

```
R1#debug ip nat
%NAT: translation failed (A), dropping packet
```

**Dynamic NAT drops traffic when the pool is exhausted.** No queue, no fallback, no log unless you are debugging. The user's experience is that the internet is down for them and fine for everyone else, intermittently, depending on who happens to hold an address.

Translations time out after **24 hours** by default, which is far too long for a small pool:

```
R1(config)#ip nat translation timeout 3600
```

The pool must be large enough for the peak number of *concurrent* inside hosts. That requirement is exactly why dynamic NAT is rare and PAT is universal.
{{< /step >}}

---

## Part 4 — PAT

{{< step num="5" dev="R1" title="One public address, thousands of sessions" open="true" >}}
```
R1(config)#no ip nat inside source list 1 pool PUBLIC-POOL
R1(config)#ip nat inside source list 1 interface GigabitEthernet0/1 overload
R1(config)#end
```

**`overload`** is the keyword that turns NAT into PAT. It adds the **source port** to the translation, so many inside hosts share one outside address, distinguished by port number.

`interface GigabitEthernet0/1` uses whatever address that interface currently holds — essential when the ISP assigns it by DHCP. The pool form also works and is what you use with several public addresses:

```
R1(config)#ip nat inside source list 1 pool PUBLIC-POOL overload
```

The theoretical ceiling is about **65,000 sessions per public address**, because there are 65,535 ports. In practice a few thousand hosts per address is comfortable; the limit is reached far sooner by memory and by applications that open many parallel connections.
{{< /step >}}

{{< verify dev="R1" cmd="show ip nat translations" open="true" >}}
```
R1#show ip nat translations
Pro  Inside global         Inside local          Outside local        Outside global
tcp  203.0.113.2:1024      192.168.1.10:1024     198.51.100.10:80     198.51.100.10:80
tcp  203.0.113.2:1025      192.168.1.11:1024     198.51.100.10:80     198.51.100.10:80
tcp  203.0.113.2:1026      192.168.1.10:1025     198.51.100.20:443    198.51.100.20:443
icmp 203.0.113.2:12        192.168.1.10:12       198.51.100.10:12     198.51.100.10:12
```

Read row two carefully. The inside host used source port **1024**, and so did the host in row one — a collision. R1 rewrote the second one to **1025** on the way out, and rewrites it back to 1024 on the way in. That rewriting is the "port address" half of Port Address Translation, and it is why one public address can serve a whole site.

All four rows share `203.0.113.2` as the inside global. The **port** disambiguates them.

The ICMP row shows the protocol's identifier field being used the same way — ICMP has no ports, so PAT translates the query identifier instead.

```
R1#show ip nat statistics
Total active translations: 4 (1 static, 3 dynamic; 3 extended)
Peak translations: 47, occurred 00:12:41 ago
Outside interfaces:
  GigabitEthernet0/1
Inside interfaces:
  GigabitEthernet0/0
Hits: 1842  Misses: 12
CEF Translated packets: 1842, CEF Punted packets: 24
Expired translations: 108
Dynamic mappings:
-- Inside Source
[Id: 1] access-list 1 interface GigabitEthernet0/1 refcount 3
```

`extended` means the entry includes a port — that is a PAT entry as opposed to a plain NAT one. **`Misses`** counts packets that needed a translation and could not get one; a rising miss count on a PAT configuration means something is wrong, because PAT should not run out.

`Peak translations` is the number to size against.
{{< /verify >}}

{{< verify dev="R1" cmd="debug ip nat — watch one packet translate" >}}
On a lab device only:

```
R1#debug ip nat
IP NAT debugging is on

NAT*: s=192.168.1.10->203.0.113.2, d=198.51.100.10 [4521]
NAT*: s=198.51.100.10, d=203.0.113.2->192.168.1.10 [4521]
```

Two lines, one round trip. The arrow shows which address was rewritten: on the way out the **source** changes, on the way back the **destination** changes. The number in brackets is the IP identification field, which lets you pair the two lines.

```
R1#undebug all
```

And clearing the table, which is often the fastest way to resolve a stuck translation:

```
R1#clear ip nat translation *
R1#clear ip nat translation inside 203.0.113.2 192.168.1.10
```

Static entries cannot be cleared this way — they are configuration, and `clear` only removes dynamic state.
{{< /verify >}}

{{< verify dev="PC1, WEB" cmd="test both directions" >}}
Outbound, from a client:

```
PC> ping 198.51.100.10
Reply from 198.51.100.10: bytes=32 time=14ms TTL=253
```

Inbound, to the statically mapped server — from a host on the ISP side:

```
> ping 203.0.113.4
Reply from 203.0.113.4: bytes=32 time=15ms TTL=127
```

Inbound works **only** for the statically mapped address. Try to reach a PAT-translated client from outside and there is nothing to reach: no translation entry exists until that client sends something first, and even then the entry is bound to a specific outside address and port.

That asymmetry is a genuine security property, and it is also the reason NAT is so often mistaken for a firewall. It is not one — it blocks unsolicited inbound connections as a side effect of having nothing to translate them to, and it inspects nothing at all.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Translation table empty | `ip nat inside` / `ip nat outside` missing | `show ip nat statistics` — check the interface lists |
| Some hosts translate, others do not | the ACL does not match them | `show access-lists` |
| Intermittent outage for random users | dynamic NAT pool exhausted | `show ip nat statistics` — rising `Misses` |
| Inbound connections fail | no static mapping — dynamic entries are outbound-only | add `ip nat inside source static` |
| Works, then stops after hours | translation timeout with a small pool | lower `ip nat translation timeout` |
| High CPU | `debug ip nat` left running, or CEF punting | `undebug all` |
| Traffic leaves untranslated | source not matched by the NAT ACL | `debug ip nat` |
| Return traffic to a forwarded port fails | port mapped on the wrong protocol | check `tcp` vs `udp` in the static line |

## Exam notes

- **Inside local** = my host as the inside sees it. **Inside global** = my host as the outside sees it. **Outside local / global** = their host from each side.
- **"Local is what the inside sees; global is what the outside sees."**
- `ip nat inside` and `ip nat outside` on the interfaces are mandatory.
- **Static NAT** = permanent 1:1, works for **inbound** connections, exists before any traffic.
- **Dynamic NAT** = pool, 1:1 while allocated, **drops traffic when exhausted**, default timeout 24 hours.
- **PAT** = `overload`, many-to-one using ports, roughly **65,000 sessions per address**.
- The NAT ACL **selects** traffic for translation; it does not filter.
- `extended` translations in `show ip nat statistics` are PAT entries.
- NAT is **not a firewall** — it inspects nothing.

---

*Sources: Jeremy's IT Lab Day 44 & 45 · Flackbox CCNA Lab Guide 29-1 · verified in Packet Tracer 8.2.*
