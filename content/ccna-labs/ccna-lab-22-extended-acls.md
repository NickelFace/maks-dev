---
title: "Lab 22 · Extended ACLs"
date: 2026-09-06
description: "Filter on source, destination, protocol and port — then use `established` to allow the return traffic without opening the door in both directions."
tags: ["CCNA", "ACL", "Security", "Lab"]
categories: ["CCNA"]
domain: 5
tool: "Packet Tracer"
duration: "50 min"
sources: "Jeremy's IT Lab Day 35 · Flackbox 28-1"
---

An extended ACL sees the whole 5-tuple: protocol, source address, source port, destination address, destination port. That makes it a real policy tool rather than a blunt instrument, and it flips the placement rule — because it can see the destination, it can be applied at the source and drop unwanted traffic before it consumes any bandwidth.

## Topology

Same as Lab 21: Engineering and Sales behind R1, a server LAN behind R2.

{{< topology cols="4" rows="3" caption="Policy: web and DNS to the server for everyone, SSH for Engineering only" >}}
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

## The policy

Written in English before it is written in ACL syntax, because that is the order that produces a correct list:

1. Anyone may reach the server on **HTTP (80)** and **HTTPS (443)**
2. Anyone may use **DNS (53)** on the server
3. **Only Engineering** may reach the server on **SSH (22)**
4. **ICMP echo** to the server is allowed from Engineering only, for troubleshooting
5. Everything else to the server segment is denied
6. Everything not destined for the server segment is unaffected

## Objectives

- Write an extended ACL matching protocol, addresses and ports
- Use the operators `eq`, `gt`, `lt`, `neq` and `range` correctly
- Place an extended ACL near the source and explain why
- Use `established` to permit return traffic without permitting new sessions
- Log matches and read the resulting syslog

---

## Part 1 — Syntax

{{< step num="1" dev="—" title="The command, one field at a time" open="true" >}}
```
access-list <100-199> {permit|deny} <protocol> <src> <src-wc> [operator port]
                                                <dst> <dst-wc> [operator port] [established] [log]
```

Concretely:

```
access-list 100 permit tcp 10.0.10.0 0.0.0.255 host 10.0.30.10 eq 22
                └┬─┘ └─┬──┘ └────┬─────────────┘ └──────┬──────┘ └─┬──┘
             number  action    source + wildcard    destination   port
                  protocol
```

**Source comes before destination, always.** Reversing them is the single most common mistake, and the result is an ACL that compiles cleanly and matches nothing.

The protocol keyword decides which fields are even available:

| Protocol | Ports? | Notes |
|---|---|---|
| `ip` | no | matches everything — TCP, UDP, ICMP, OSPF, the lot |
| `tcp` | **yes** | `eq`, `range`, `established` |
| `udp` | **yes** | `eq`, `range` |
| `icmp` | no — **message types** | `echo`, `echo-reply`, `unreachable` |
| `ospf`, `eigrp`, `gre` | no | match the protocol number |

Port operators:

| Operator | Meaning | Example |
|---|---|---|
| `eq` | equal | `eq 80` |
| `neq` | not equal | `neq 23` |
| `gt` | greater than | `gt 1023` |
| `lt` | less than | `lt 1024` |
| `range` | inclusive range | `range 20 21` |

And the ports the exam expects you to know without looking up:

| Port | Service | Transport |
|---|---|---|
| 20 / 21 | FTP data / control | TCP |
| 22 | SSH | TCP |
| 23 | Telnet | TCP |
| 25 | SMTP | TCP |
| 53 | DNS | **UDP and TCP** |
| 67 / 68 | DHCP server / client | UDP |
| 69 | TFTP | UDP |
| 80 | HTTP | TCP |
| 110 | POP3 | TCP |
| 123 | NTP | UDP |
| 143 | IMAP | TCP |
| 161 / 162 | SNMP / SNMP trap | UDP |
| 443 | HTTPS | TCP |
| 514 | Syslog | UDP |

DNS is the one to watch: queries use UDP 53, zone transfers and large responses use TCP 53. An ACL permitting only UDP 53 works until a response exceeds 512 bytes.
{{< /step >}}

{{< step num="2" dev="R1" title="Write the policy as a named extended ACL" >}}
```
R1(config)#ip access-list extended SERVER-POLICY
R1(config-ext-nacl)#remark ## web + DNS open to all ##
R1(config-ext-nacl)#permit tcp any host 10.0.30.10 eq 80
R1(config-ext-nacl)#permit tcp any host 10.0.30.10 eq 443
R1(config-ext-nacl)#permit udp any host 10.0.30.10 eq 53
R1(config-ext-nacl)#permit tcp any host 10.0.30.10 eq 53
R1(config-ext-nacl)#remark ## SSH and ping: Engineering only ##
R1(config-ext-nacl)#permit tcp 10.0.10.0 0.0.0.255 host 10.0.30.10 eq 22
R1(config-ext-nacl)#permit icmp 10.0.10.0 0.0.0.255 host 10.0.30.10 echo
R1(config-ext-nacl)#remark ## nothing else reaches the server LAN ##
R1(config-ext-nacl)#deny ip any 10.0.30.0 0.0.0.255 log
R1(config-ext-nacl)#remark ## everything else is none of our business ##
R1(config-ext-nacl)#permit ip any any
R1(config-ext-nacl)#end
```

Two structural points.

**`deny ip any 10.0.30.0 0.0.0.255` before `permit ip any any`.** The order encodes the policy precisely: anything aimed at the server segment that has not already been permitted is dropped; anything aimed anywhere else passes untouched. Swap those two lines and the ACL permits everything.

**`log` on the deny.** Every match generates a syslog message naming the source, destination and port. That turns the ACL into a detection tool as well as a control — the log tells you what is being attempted, which is often more useful than knowing it was blocked.

The equivalent numbered form, for reference:

```
R1(config)#access-list 100 permit tcp any host 10.0.30.10 eq 80
R1(config)#access-list 100 permit tcp 10.0.10.0 0.0.0.255 host 10.0.30.10 eq 22
R1(config)#access-list 100 deny ip any 10.0.30.0 0.0.0.255
R1(config)#access-list 100 permit ip any any
```
{{< /step >}}

{{< step num="3" dev="R1" title="Apply it near the source" open="true" >}}
```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ip access-group SERVER-POLICY in
R1(config-if)#exit
R1(config)#interface GigabitEthernet0/1
R1(config-if)#ip access-group SERVER-POLICY in
R1(config-if)#end
```

**Extended ACLs go as close to the source as possible.** Because the ACL names the destination explicitly, filtering early cannot over-block — a packet from Sales to the internet does not match `10.0.30.0 0.0.0.255` and passes. Dropping unwanted traffic at the first router saves the bandwidth of carrying it across the WAN to be discarded at the far end.

Applied **inbound** on the LAN interfaces, the ACL is evaluated before any routing lookup. That is marginally cheaper and, more importantly, means traffic between the two LANs is also filtered — which an outbound ACL on the WAN link would have missed.

The two rules together, which is the pair the exam wants:

| | Matches on | Place it |
|---|---|---|
| **Standard** | source only | near the **destination** |
| **Extended** | source, destination, protocol, port | near the **source** |
{{< /step >}}

{{< verify dev="R1" cmd="show access-lists SERVER-POLICY" open="true" >}}
```
R1#show access-lists SERVER-POLICY
Extended IP access list SERVER-POLICY
    10 permit tcp any host 10.0.30.10 eq www (48 matches)
    20 permit tcp any host 10.0.30.10 eq 443 (12 matches)
    30 permit udp any host 10.0.30.10 eq domain (86 matches)
    40 permit tcp any host 10.0.30.10 eq domain (0 matches)
    50 permit tcp 10.0.10.0 0.0.0.255 host 10.0.30.10 eq 22 (6 matches)
    60 permit icmp 10.0.10.0 0.0.0.255 host 10.0.30.10 echo (20 matches)
    70 deny ip any 10.0.30.0 0.0.0.255 log (14 matches)
    80 permit ip any any (2104 matches)
```

IOS substitutes well-known port names for the numbers — `www` for 80, `domain` for 53 — which is helpful reading a config and confusing writing one. Both forms are accepted on input.

Every line has matches except 40 (TCP DNS), which is expected: no zone transfers have happened. A zero counter is only a problem when you expected traffic there.
{{< /verify >}}

{{< verify dev="PC-Sales, PC-Eng" cmd="test each rule in the policy" open="true" >}}
From **Sales** — web should work, SSH and ping should not:

```
PC> ping 10.0.30.10
Reply from 10.0.10.1: Destination host unreachable.
```

Blocked by line 70, and the unreachable comes from **R1's LAN interface** — the first router, exactly as designed. Compare with Lab 21, where the drop happened at R2 after crossing the WAN.

Web still works. From the PT web browser, `http://10.0.30.10` loads.

From **Engineering** — everything permitted:

```
PC> ping 10.0.30.10
Reply from 10.0.30.10: bytes=32 time=2ms TTL=126
```

And the log for the denied attempts:

```
R1#show logging | include SERVER-POLICY
%SEC-6-IPACCESSLOGDP: list SERVER-POLICY denied icmp 10.0.20.50 -> 10.0.30.10 (8/0), 4 packets
%SEC-6-IPACCESSLOGP: list SERVER-POLICY denied tcp 10.0.20.50(1042) -> 10.0.30.10(22), 1 packet
```

Source address, destination, protocol and port, with a packet count. `(8/0)` on the ICMP line is type 8 code 0 — echo request.

`log` costs CPU because matching packets are punted to the control plane. On a busy interface use `log` on the specific rules you care about, never on a line matching normal traffic.
{{< /verify >}}

---

## Part 2 — `established`

{{< step num="4" dev="R1" title="Let replies back in without opening the door" >}}
The problem: internal hosts must be able to browse the internet, and nothing on the internet may initiate a connection inward. An ACL that permits inbound TCP from anywhere would defeat the point; one that denies all inbound TCP breaks every reply.

```
R1(config)#ip access-list extended FROM-INTERNET
R1(config-ext-nacl)#permit tcp any 10.0.0.0 0.255.255.255 established
R1(config-ext-nacl)#deny ip any any log
R1(config-ext-nacl)#exit
R1(config)#interface GigabitEthernet0/2
R1(config-if)#ip access-group FROM-INTERNET in
R1(config-if)#end
```

**`established` matches TCP segments with the ACK or RST flag set.** The first packet of any new connection is a bare SYN — no ACK — so it does not match and is denied. Every subsequent packet in a session the inside started does carry ACK, so it passes.

The effect is one-way TCP: outbound connections work, inbound connections are refused, and no state is kept anywhere.

Its limits are worth stating plainly:

- **It is not stateful.** The router does not track sessions; it reads one flag on each packet independently. A crafted packet with ACK set will pass, which is why a real firewall (or `ip inspect` / ZBF) exists.
- **TCP only.** UDP has no flags, so DNS replies, NTP and anything else UDP need their own explicit permits.
- ICMP replies likewise need permitting individually:

```
R1(config-ext-nacl)#permit icmp any 10.0.0.0 0.255.255.255 echo-reply
R1(config-ext-nacl)#permit icmp any 10.0.0.0 0.255.255.255 unreachable
R1(config-ext-nacl)#permit icmp any 10.0.0.0 0.255.255.255 time-exceeded
```

Permitting `unreachable` and `time-exceeded` is not optional in practice: **path MTU discovery depends on ICMP unreachables**, and blocking them produces connections that establish and then hang on the first large packet. It is a genuinely nasty fault to diagnose, and blanket-blocking ICMP is how people create it.
{{< /step >}}

{{< verify dev="R1" cmd="show access-lists FROM-INTERNET" >}}
```
R1#show access-lists FROM-INTERNET
Extended IP access list FROM-INTERNET
    10 permit tcp any 10.0.0.0 0.255.255.255 established (1842 matches)
    20 permit icmp any 10.0.0.0 0.255.255.255 echo-reply (24 matches)
    30 permit icmp any 10.0.0.0 0.255.255.255 unreachable (2 matches)
    40 deny ip any any log (7 matches)
```

Line 10 matching heavily is normal — that is all the return traffic for outbound browsing. Line 40 matching is inbound connection attempts being refused, which on an internet-facing interface is constant background noise.
{{< /verify >}}

---

## Part 3 — Time-based ACLs

{{< step num="5" dev="R1" title="A rule that only applies during working hours" >}}
```
R1(config)#time-range WORK-HOURS
R1(config-time-range)#periodic weekdays 08:00 to 18:00
R1(config-time-range)#exit
R1(config)#ip access-list extended SERVER-POLICY
R1(config-ext-nacl)#5 permit tcp 10.0.20.0 0.0.0.255 host 10.0.30.10 eq 22 time-range WORK-HOURS
R1(config-ext-nacl)#end
```

Sales gets SSH access, but only on weekdays between 08:00 and 18:00. Outside that window the line is inert and evaluation falls through to the deny.

`periodic` recurs; `absolute` is a one-off window:

```
R1(config-time-range)#absolute start 09:00 1 October 2026 end 17:00 31 October 2026
```

Time-based ACLs depend entirely on the router's clock being right, which means **NTP is a prerequisite** (Lab 24). A router with a clock reset by a reboot will apply the wrong policy silently.

```
R1#show time-range
time-range entry: WORK-HOURS (active)
   periodic weekdays 8:00 to 18:00
   used in: IP ACL entry
```

`(active)` or `(inactive)` tells you whether the window is open right now.
{{< /step >}}

{{< verify dev="R1" cmd="show ip interface | include access list" >}}
```
R1#show ip interface GigabitEthernet0/0 | include access list
  Outgoing access list is not set
  Inbound  access list is SERVER-POLICY

R1#show ip interface GigabitEthernet0/2 | include access list
  Outgoing access list is not set
  Inbound  access list is FROM-INTERNET
```

Both ACLs applied inbound on the interfaces where the traffic originates. Audit the whole router in one go:

```
R1#show running-config | include ip access-group|interface
```
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| ACL compiles, matches nothing | source and destination reversed | `show access-lists` — zero counters |
| Everything blocked | implicit `deny any any`, no final permit | add `permit ip any any` |
| Web works, DNS fails | permitted TCP 53 but not UDP 53 | permit both |
| Large downloads hang mid-transfer | ICMP unreachable blocked — PMTUD broken | permit `unreachable` |
| Return traffic blocked | missing `established` | add it for TCP; permit UDP explicitly |
| Time-based rule applies at the wrong time | router clock wrong | `show clock`; configure NTP |
| Router CPU high after adding an ACL | `log` on a busy rule | log only the deny lines |
| A rule below never matches | an earlier line already caught it | reorder, or use tighter matches |

## Exam notes

- Extended ACL matches **protocol, source, source port, destination, destination port**. Ranges **100–199** and 2000–2699.
- **Source always precedes destination** in the syntax.
- Operators: `eq`, `neq`, `gt`, `lt`, `range`. ICMP uses **message types** (`echo`, `echo-reply`), not ports.
- **Place an extended ACL close to the source**; a standard ACL close to the destination.
- **`established`** matches TCP ACK/RST — it permits replies, not new sessions, and it is **not stateful**.
- Implicit **`deny ip any any`** ends every ACL.
- One ACL per interface, per direction, per protocol.
- `log` generates syslog per match and is CPU-expensive on busy rules.
- Time-based ACLs need an accurate clock — configure NTP first.

---

*Sources: Jeremy's IT Lab Day 35 · Flackbox CCNA Lab Guide 28-1 · verified in Packet Tracer 8.2.*
