---
title: "Lab 21 · Standard ACLs"
date: 2026-09-06
description: "Filter on source address alone — and learn the two rules that decide where a standard ACL goes and why putting it in the obvious place breaks everything."
tags: ["CCNA", "ACL", "Security", "Lab"]
categories: ["CCNA"]
domain: 5
tool: "Packet Tracer"
duration: "40 min"
sources: "Jeremy's IT Lab Day 34 · Flackbox 28-1"
aliases: ["/ccna-labs/ccna-lab-28-acl/"]
---

A standard ACL can see one thing: the **source IP address**. It cannot see the destination, the protocol or the port. That single limitation drives the whole placement rule — put a standard ACL near the source and you block that source from reaching everything, not just the thing you meant to protect.

## Topology

{{< topology cols="4" rows="3" caption="Two client LANs, one server LAN — only Engineering may reach the server" >}}
switch SW-A "Eng 10.0.10.0/24" at 0,0
switch SW-B "Sales 10.0.20.0/24" at 0,2
router R1 "" at 1,1
router R2 "" at 2,1
server SRV "10.0.30.10" at 3,1

SW-A — R1
SW-B — R1
R1 — R2 label="10.0.12.0/30"
R2 — SRV
{{< /topology >}}

| Segment | Prefix | Gateway |
|---|---|---|
| Engineering | 10.0.10.0/24 | R1 G0/0 = 10.0.10.1 |
| Sales | 10.0.20.0/24 | R1 G0/1 = 10.0.20.1 |
| Servers | 10.0.30.0/24 | R2 G0/1 = 10.0.30.1 |
| WAN | 10.0.12.0/30 | R1 .1 / R2 .2 |

## Objectives

- Write numbered and named standard ACLs and apply them in the right direction
- Compute wildcard masks and use the `host` and `any` shorthands
- Place a standard ACL correctly and explain why the obvious placement is wrong
- Observe the implicit `deny any` and the top-down first-match evaluation
- Edit a named ACL in place using sequence numbers

---

## Part 1 — Wildcard masks

{{< step num="1" dev="—" title="The inverse of a subnet mask, and the two shorthands" open="true" >}}
An ACL wildcard mask is the **bitwise inverse** of a subnet mask. **0 means "must match"**, **1 means "don't care"** — the opposite of a subnet mask, which is why they are so easy to get backwards.

| Intent | Subnet mask | Wildcard |
|---|---|---|
| one host (/32) | 255.255.255.255 | **0.0.0.0** |
| a /24 | 255.255.255.0 | **0.0.0.255** |
| a /27 | 255.255.255.224 | **0.0.0.31** |
| a /16 | 255.255.0.0 | **0.0.255.255** |
| anything | 0.0.0.0 | **255.255.255.255** |

The arithmetic: subtract each octet of the subnet mask from 255.

```
255.255.255.192  (/26)
255.255.255.255
-  -   -   -
  0.  0.  0. 63     →  wildcard 0.0.0.63
```

The two shorthands, which IOS also rewrites your input into:

```
R1(config)#access-list 10 permit 10.0.10.5 0.0.0.0     → shown as: permit host 10.0.10.5
R1(config)#access-list 10 permit 0.0.0.0 255.255.255.255 → shown as: permit any
```

A standard ACL with **no wildcard at all** defaults to `0.0.0.0` — a single host:

```
R1(config)#access-list 10 permit 10.0.10.5
R1(config)#do show access-lists 10
Standard IP access list 10
    10 permit 10.0.10.5
```

Wildcards need not be contiguous, unlike subnet masks. `0.0.0.254` matches every even-numbered host in a /24 — legal, occasionally useful, and never on the exam.
{{< /step >}}

---

## Part 2 — A numbered standard ACL

{{< step num="2" dev="R2" title="Permit Engineering, deny Sales" >}}
```
R2(config)#access-list 10 remark ## Server LAN access policy ##
R2(config)#access-list 10 permit 10.0.10.0 0.0.0.255
R2(config)#access-list 10 deny 10.0.20.0 0.0.0.255
R2(config)#access-list 10 permit any
R2(config)#end
```

ACL number ranges — worth memorising because the number itself declares the type:

| Range | Type |
|---|---|
| **1–99**, 1300–1999 | standard IP |
| **100–199**, 2000–2699 | extended IP |
| 200–299 | Ethernet type code |
| 800–899 | IPX standard |

The third line is not optional. **Every ACL ends with an invisible `deny any`**, so an ACL consisting only of the first two lines would block every source on earth except Engineering — including the WAN link, the management stations and the routing protocol adjacencies. The explicit `permit any` restores everything else.

Order matters absolutely. Evaluation is **top-down, first match wins, and processing stops**. Reverse the first two lines here and nothing changes, because the two sources are disjoint — but write `permit any` first and the rest of the list is dead code.

`remark` lines are free and they are the difference between an ACL you can maintain and one nobody will ever dare touch.
{{< /step >}}

{{< step num="3" dev="R2" title="Apply it — and here is the rule that matters" open="true" >}}
```
R2(config)#interface GigabitEthernet0/1
R2(config-if)#ip access-group 10 out
R2(config-if)#end
```

**Standard ACLs go as close to the destination as possible.**

That is counterintuitive, so reason it through. A standard ACL matches on source only. Put this one inbound on R1's Gi0/1 — right next to the Sales LAN, which feels efficient — and it drops every packet from 10.0.20.0/24 regardless of where it was going. Sales loses the internet, DNS, its own file server, everything. The rule was "Sales may not reach the server LAN", and applying it early enforces "Sales may not reach anything".

Placing it outbound on R2's Gi0/1 — the last interface before the servers — means it only sees traffic already destined for that segment. The policy matches the intent.

The trade-off is that denied traffic crosses the entire network before being dropped, which wastes bandwidth. That is precisely what extended ACLs (Lab 22) fix, and it is why the two placement rules are opposites:

- **Standard ACL → near the destination**, because it cannot see the destination.
- **Extended ACL → near the source**, because it can.

**Direction is from the router's point of view.** `in` is traffic arriving at the interface; `out` is traffic leaving through it. And an ACL applied `out` never filters traffic the router itself generates.

One ACL per interface, per direction, per protocol — three inbound IPv4 ACLs on one interface is not possible.
{{< /step >}}

{{< verify dev="R2" cmd="show access-lists" open="true" >}}
```
R2#show access-lists
Standard IP access list 10
    10 permit 10.0.10.0, wildcard bits 0.0.0.255 (24 matches)
    20 deny   10.0.20.0, wildcard bits 0.0.0.255 (8 matches)
    30 permit any (112 matches)
```

The **sequence numbers** (10, 20, 30) are assigned automatically in steps of ten so there is room to insert lines later. The **match counters** are the most useful part of the output: a rule with zero matches is either dead code or evidence that traffic is not arriving where you think it is.

Reset them before a test so you are measuring the test:

```
R2#clear access-list counters 10
```

Confirm where it is applied:

```
R2#show ip interface GigabitEthernet0/1 | include access list
  Outgoing access list is 10
  Inbound  access list is not set
```

Two lines, both worth reading. An ACL that exists but is applied nowhere filters nothing, and `show access-lists` will not tell you that.
{{< /verify >}}

{{< verify dev="PC-Eng, PC-Sales" cmd="ping 10.0.30.10" open="true" >}}
From Engineering:

```
PC> ping 10.0.30.10
Reply from 10.0.30.10: bytes=32 time=2ms TTL=126
```

From Sales:

```
PC> ping 10.0.30.10
Reply from 10.0.12.2: Destination host unreachable.
```

**The reply comes from 10.0.12.2 — R2 — not from the server.** That is the signature of an ACL drop: the router sends back **ICMP type 3 code 13, Administratively Prohibited**, and the source address of that message names the router doing the filtering. A timeout means something else entirely (no route, host down); an unreachable *from a router in the path* means a filter.

Suppress it if you would rather the drop be silent:

```
R2(config-if)#no ip unreachables
```

Attackers use the unreachable to map your filters, so this is standard hardening on an internet edge. In a lab, leave it on — it is the fastest diagnosis you have.

And confirm Sales still reaches everything else:

```
PC> ping 10.0.12.2
Reply from 10.0.12.2: bytes=32 time=1ms TTL=254
```

Reachable. The ACL only guards the server segment, which was the requirement.
{{< /verify >}}

---

## Part 3 — Named ACLs and editing

{{< step num="4" dev="R2" title="Named ACLs — use these instead" >}}
```
R2(config)#no access-list 10
R2(config)#ip access-list standard SERVER-ACCESS
R2(config-std-nacl)#remark ## Engineering only ##
R2(config-std-nacl)#10 permit 10.0.10.0 0.0.0.255
R2(config-std-nacl)#20 deny 10.0.20.0 0.0.0.255
R2(config-std-nacl)#30 permit any
R2(config-std-nacl)#exit
R2(config)#interface GigabitEthernet0/1
R2(config-if)#ip access-group SERVER-ACCESS out
R2(config-if)#end
```

Named ACLs are better in every respect and there is no reason to write numbered ones in new configuration:

- The name says what the ACL is for
- Individual lines can be **deleted** without destroying the list
- Lines can be **inserted** at a chosen sequence number
- There is no numbering range to run out of

The editing difference is not cosmetic. On a numbered ACL, `no access-list 10 deny 10.0.20.0 0.0.0.255` deletes **the entire ACL**, not that one line. Do that on a production router with the ACL applied to an interface, and for the moment between deleting and retyping there is no ACL at all — or, worse, an empty one, which is an implicit `deny any` and a total outage.
{{< /step >}}

{{< step num="5" dev="R2" title="Insert and delete individual lines" >}}
Permit one specific Sales host as an exception. It has to go **before** the deny, so pick a sequence number in the gap:

```
R2(config)#ip access-list standard SERVER-ACCESS
R2(config-std-nacl)#15 permit host 10.0.20.50
R2(config-std-nacl)#end
```

```
R2#show access-lists SERVER-ACCESS
Standard IP access list SERVER-ACCESS
    10 permit 10.0.10.0, wildcard bits 0.0.0.255 (24 matches)
    15 permit 10.0.20.50 (0 matches)
    20 deny   10.0.20.0, wildcard bits 0.0.0.255 (8 matches)
    30 permit any (112 matches)
```

Line 15 sits between 10 and 20, so the exception is evaluated before the deny that would otherwise catch it. **That is the entire reason sequence numbers step by ten.**

Remove a single line:

```
R2(config)#ip access-list standard SERVER-ACCESS
R2(config-std-nacl)#no 15
```

Renumber the whole list when the gaps run out:

```
R2(config)#ip access-list resequence SERVER-ACCESS 10 10
```

Start at 10, step by 10.

One more standard-ACL use that is not filtering at all — restricting VTY access:

```
R2(config)#ip access-list standard MGMT-HOSTS
R2(config-std-nacl)#permit 10.0.10.0 0.0.0.255
R2(config-std-nacl)#exit
R2(config)#line vty 0 4
R2(config-line)#access-class MGMT-HOSTS in
R2(config-line)#transport input ssh
```

**`access-class`, not `ip access-group`** — that is the command for a line rather than an interface, and it is a favourite exam distractor. Applied to VTY lines, a standard ACL restricting by source address is exactly the right tool: you are filtering *who may connect*, and the destination is the router itself.
{{< /step >}}

{{< verify dev="R2" cmd="show ip interface | include access list" >}}
```
R2#show ip interface GigabitEthernet0/1 | include access list
  Outgoing access list is SERVER-ACCESS
  Inbound  access list is not set
```

And the VTY restriction:

```
R2#show running-config | section line vty
line vty 0 4
 access-class MGMT-HOSTS in
 transport input ssh
 login local
```

Test it: SSH from an Engineering host succeeds, from a Sales host the connection is refused immediately rather than timing out.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Everything blocked after applying an ACL | implicit `deny any` and no explicit permit | add `permit any` as the last line |
| A source loses all connectivity, not just one destination | standard ACL placed near the source | move it near the destination |
| A rule never matches | an earlier line already matched | `show access-lists` — read the counters |
| Deleting one line removed the whole ACL | numbered ACL semantics | use named ACLs |
| ACL configured, no effect | never applied to an interface | `show ip interface \| include access list` |
| `Destination host unreachable` from a router | ICMP admin-prohibited — an ACL dropped it | the source address names the filtering router |
| VTY ACL rejected | wrong command | `access-class` on lines, `ip access-group` on interfaces |
| Locked yourself out | VTY ACL applied without your own address | console access, or plan the change |

## Exam notes

- Standard ACL matches **source IP only**. Ranges **1–99** and 1300–1999.
- Wildcard mask: **0 = must match, 1 = don't care**. Compute as 255 minus each subnet-mask octet.
- `host x.x.x.x` = wildcard `0.0.0.0`. `any` = `0.0.0.0 255.255.255.255`.
- Evaluation is **top-down, first match wins**, and there is an **implicit `deny any`** at the end.
- **Place a standard ACL close to the destination.** Extended ACLs go close to the source.
- One ACL per **interface, per direction, per protocol**.
- Named ACLs allow per-line insertion and deletion; numbered ones do not.
- **`access-class`** applies an ACL to VTY lines; **`ip access-group`** applies it to an interface.
- An ACL applied `out` does not filter traffic originated by the router itself.

---

*Sources: Jeremy's IT Lab Day 34 · Flackbox CCNA Lab Guide 28-1 · verified in Packet Tracer 8.2.*
