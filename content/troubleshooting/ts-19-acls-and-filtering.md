---
title: "ACLs and Filtering"
date: 2026-09-06
description: "The implicit deny and what it silently kills, shadowed entries, wildcard arithmetic, why an outbound ACL does not filter the router's own traffic, and reading hit counters to prove which line matched."
tags: ["Troubleshooting", "ACL", "Filtering", "Security", "Cisco"]
categories: ["Troubleshooting"]
unit: 7
---

An ACL is a list that is read top to bottom, stops at the first match, and ends with a rule you cannot see. Almost every ACL fault is one of those three properties biting: something matched earlier than you expected, or nothing matched and the invisible rule at the bottom took it. The protocols involved are rarely the interesting part — the ordering is.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| Applied an ACL, routing collapsed | **implicit `deny any`** dropped protocol hellos | `show ip ospf neighbor`, `show access-lists` |
| One rule appears to be ignored | **shadowed** by an earlier, broader entry | `show access-lists` — its counter is 0 |
| Ping works, application does not | ICMP permitted, the application's port is not | `show access-lists` counters per line |
| Large transfers hang, small ones work | ICMP unreachables denied — **PMTUD broken** | `ping size 1500 df-bit` |
| Hosts lost their addresses after the change | DHCP (UDP 67/68) not permitted | `show ip interface \| include access list` |
| ACL matches more than intended | wildcard mask off by one bit | recompute the range |
| ACL matches nothing at all | wrong direction, or wrong interface | `show ip interface <int>` |
| Traffic from the router itself is not filtered | **outbound ACLs do not see locally-originated traffic** | `show access-lists` — counter never moves |
| Port forward works from inside, not outside | ACL references the wrong side of **NAT** | `show ip nat translations` |
| Locked out of SSH after applying `access-class` | VTY ACL denies your own source | console access |

---

## The implicit deny

Every ACL ends with `deny ip any any`. It is not in the configuration, it does not appear in `show access-lists`, and its hit counter is not displayed. An ACL of one line is therefore two lines: your permit, and a deny of everything else.

This is what turns a narrowly scoped ACL into an outage. Consider a perfectly reasonable rule applied inbound on a WAN interface:

```
R1(config)#access-list 101 permit tcp any host 10.0.1.10 eq 80
R1(config)#interface GigabitEthernet0/1
R1(config-if)#ip access-group 101 in
```

Within forty seconds:

```
%OSPF-5-ADJCHG: Process 1, Nbr 2.2.2.2 on GigabitEthernet0/1 from FULL to DOWN,
                Neighbor Down: Dead timer expired
```

OSPF hellos go to `224.0.0.5`, they are not TCP port 80, and the invisible rule took them. The same list also killed the things below, and each of them fails in a way that does not look like an ACL:

| Traffic | Address / port | What breaks |
|---|---|---|
| OSPF | `224.0.0.5`, `224.0.0.6` | adjacency drops after the 40-second dead timer |
| EIGRP | `224.0.0.10` | adjacency drops after the 15-second hold timer |
| RIP | `224.0.0.9`, UDP 520 | routes age out after 180 seconds |
| HSRP | `224.0.0.2`, UDP 1985 | both routers become active — duplicate gateway |
| DHCP | UDP 67 / 68 | new hosts get 169.254 addresses; existing leases survive for hours |
| ICMP unreachable | type 3 code 4 | **PMTUD stops working — large packets vanish** |

The DHCP and PMTUD rows are the ones that make this hard. Neither fails immediately. DHCP breaks for the first host to renew, which may be the following morning, long after anyone connects the outage to the ACL. And a broken PMTUD produces the classic "ping works, HTTP hangs" — small packets pass, the ICMP that would have told the sender to reduce its packet size is denied, and the transfer stalls with no error anywhere.

Permit what infrastructure needs before you permit what users need:

```
R1(config)#ip access-list extended WAN_IN
R1(config-ext-nacl)#permit ospf any any
R1(config-ext-nacl)#permit icmp any any unreachable
R1(config-ext-nacl)#permit icmp any any time-exceeded
R1(config-ext-nacl)#permit udp any eq bootps any eq bootpc
R1(config-ext-nacl)#permit tcp any host 10.0.1.10 eq 80
R1(config-ext-nacl)#deny ip any any log
```

That last line changes nothing about the behaviour — it is the implicit deny written out — but it gives the drop a **visible counter and a log entry**, and that turns "something is being dropped somewhere" into a name and an address.

### The other invisible default

An `ip access-group` referring to an ACL that does not exist permits everything. IOS accepts the command against a non-existent list and applies no filtering at all. So a typo in the list name is not a lockout; it is a silently open interface, which is worse. Confirm what is actually bound:

```
R1#show ip interface GigabitEthernet0/1 | include access list
  Outgoing access list is not set
  Inbound  access list is WAN_IN
```

---

## Order, and the entry that never matches

The list stops at the first match. An entry placed after a broader entry that already covers its traffic will never be evaluated — it is shadowed, and IOS gives no warning:

```
R1#show access-lists 110
Extended IP access list 110
    10 permit ip 10.0.0.0 0.0.255.255 any (48213 matches)
    20 deny tcp host 10.0.5.99 any eq 22 (0 matches)
    30 permit tcp any any eq 443 (1204 matches)
```

Line 20 is intended to stop one host from using SSH. Line 10 already permitted every 10.0.x.x source for every protocol, so line 20 is dead. **The zero counter is the proof**, and it is the single most useful number in ACL troubleshooting: a rule that should be matching and shows 0 is either shadowed, in the wrong direction, or on the wrong interface.

The general rule is specific before general — deny the narrow exceptions above the broad permits.

```
R1#clear access-list counters 110
```

Clear the counters before a test, then run the test, then read them. Counters accumulated over three weeks tell you about three weeks; you want to know about the packet you sent a moment ago.

---

## Where to put it, and which way round

Two rules that follow from what each ACL type can see.

**A standard ACL matches on source address only.** It cannot tell a packet destined for the file server from one destined for the internet. Put it close to the destination, because placing it near the source would drop that host's traffic to everything, not only to the thing you meant to protect.

**An extended ACL matches source, destination, protocol and port.** It can be precise, so put it close to the source and stop the unwanted traffic before it consumes links across the network.

| Type | Numbers | Matches on | Place it |
|---|---|---|---|
| Standard | 1–99, 1300–1999 | **source only** | near the **destination** |
| Extended | 100–199, 2000–2699 | source, destination, protocol, port | near the **source** |

Direction is relative to the interface, not to the network:

```
R1(config-if)#ip access-group WAN_IN in     ! packets arriving on this interface
R1(config-if)#ip access-group WAN_OUT out   ! packets leaving through this interface
```

Inbound filtering is cheaper — the packet is evaluated before the routing lookup, so a denied packet never costs a lookup. Outbound is sometimes the only option, when traffic converges from several ingress interfaces onto one egress.

**And an outbound ACL does not filter traffic the router itself originates.** A ping, a syslog message, an SNMP trap, a routing update sourced by this router — none of them are subject to an outbound `ip access-group`, because locally-generated traffic does not traverse the outbound path in the same way transit traffic does. Two consequences follow. You cannot test an outbound ACL by pinging from the router; the ping succeeds regardless. And you cannot use an outbound ACL to stop the router talking to something — that requires filtering on the receiving device, or a control-plane mechanism.

---

## Wildcard masks

A wildcard mask is not a subnet mask. A `0` bit means "must match", a `1` bit means "ignore". For contiguous ranges it is the subnet mask inverted, which is where the arithmetic errors come from.

| Intended range | Subnet mask | Wildcard |
|---|---|---|
| one host | 255.255.255.255 | `0.0.0.0` (or the keyword `host`) |
| 10.0.1.0/24 | 255.255.255.0 | `0.0.0.255` |
| 10.0.0.0/22 — four /24s | 255.255.252.0 | `0.0.3.255` |
| 10.0.0.0/16 | 255.255.0.0 | `0.0.255.255` |
| everything | 0.0.0.0 | `255.255.255.255` (or the keyword `any`) |

The off-by-one that appears most often is the block-size one. Four consecutive /24 networks span addresses `.0` through `.3` in the third octet, so the wildcard is `0.0.3.255` — **the count minus one, not the count**:

```
R1(config)#access-list 20 permit 10.0.0.0 0.0.4.255    ! wrong
R1(config)#access-list 20 permit 10.0.0.0 0.0.3.255    ! four /24s: 10.0.0.0 - 10.0.3.255
```

`0.0.4.255` is not four networks. It ignores bit 2 of the third octet and the whole fourth octet, so it matches 10.0.0.x and 10.0.4.x and nothing between them — a legal, non-contiguous, entirely unintended pair.

The mask does not need to be contiguous, and occasionally that is useful: `10.0.0.0 0.0.254.255` matches every even third octet. It is also how an unintended mask produces a match pattern that looks random.

---

## `established` is not a firewall

`established` matches TCP segments with the **ACK or RST flag set** — that is, anything that is not the initial SYN. It is a bit test on a single packet, with no memory of any connection:

```
R1(config)#access-list 120 permit tcp any 10.0.1.0 0.0.0.255 established
```

The intent is "let replies back in, block new sessions from outside", and for casual traffic it does that. What it does not do is verify that a session exists. An attacker sending TCP segments with the ACK bit set is permitted straight through — no session, no state table, no check. It is also useless for UDP and ICMP, which have no flags to test.

A real stateful check on IOS is a reflexive ACL, or CBAC, or Zone-Based Firewall. `established` is a filter that resembles state from a distance, and it belongs in a discussion of ACL syntax rather than in a security design.

---

## ACLs and NAT: which address does the ACL see?

The router applies NAT at a fixed point in the forwarding path, so whether an ACL sees the translated or untranslated address depends on which interface it is on and which direction traffic is moving. Getting this wrong produces an ACL that matches nothing while looking entirely correct.

| ACL location | Direction of traffic | Addresses the ACL sees |
|---|---|---|
| Inbound on the **inside** interface | inside → outside | **inside local** — the private source |
| Outbound on the **outside** interface | inside → outside | **inside global** — the translated public source |
| Inbound on the **outside** interface | outside → inside | **inside global** — the public destination |
| Outbound on the **inside** interface | outside → inside | inside local — the private destination |

The row that catches people is the third. Traffic arriving from the internet towards a port-forwarded server is filtered **before** translation, so an inbound ACL on the outside interface must reference the public address:

```
R1(config)#ip nat inside source static tcp 10.0.1.10 80 203.0.113.10 80
```

```
R1(config)#ip access-list extended WAN_IN
R1(config-ext-nacl)#permit tcp any host 10.0.1.10 eq 80    ! never matches
R1(config-ext-nacl)#permit tcp any host 203.0.113.10 eq 80 ! correct
```

The private-address version is syntactically valid, sits in the list looking right, and shows a permanent zero counter. Meanwhile a separate ACL used by NAT itself — the one referenced by `ip nat inside source list` — is a selector, not a filter: `deny` there means "do not translate", which for internet-bound traffic means the packet leaves untranslated and never comes back.

---

## Locking yourself out

`access-class` on the VTY lines controls who may open a management session to the router. It is applied to the lines, not to an interface, and it is checked against the source address of the incoming session:

```
R1(config)#access-list 10 permit 10.0.99.0 0.0.0.255
R1(config)#line vty 0 15
R1(config-line)#access-class 10 in
```

Every management source has to be in that list — the jump host, the monitoring system, the backup collector, and **the address you are connected from right now**. The implicit deny applies here as everywhere else, and the failure mode is immediate and total: the session you are using survives, and the next one does not connect. Verify your own source address before applying it, and keep console access available.

`access-class 10 out` is the other direction and much less used — it restricts where the router may Telnet or SSH *to* from its own VTY sessions.

---

## Editing without breaking things

Named ACLs support sequence numbers, and this is the reason to use them over numbered lists:

```
R1#show access-lists WAN_IN
Extended IP access list WAN_IN
    10 permit ospf any any (1842 matches)
    20 permit tcp any host 203.0.113.10 eq 80 (95331 matches)
    30 deny ip any any log (17 matches)
```

```
R1(config)#ip access-list extended WAN_IN
R1(config-ext-nacl)#no 20                                   ! remove one line
R1(config-ext-nacl)#25 permit tcp any host 203.0.113.10 eq 443  ! insert between 20 and 30
```

Leave gaps of ten when you build a list, so there is room to insert later. When the gaps run out, resequence rather than rebuild:

```
R1(config)#ip access-list resequence WAN_IN 10 10
```

**The pre-12.3 trap, which still catches anyone working on old hardware:** without sequence-number support, a `no` on a single entry of a numbered ACL removes the entire list. `no access-list 101 permit tcp any any eq 80` deletes access-list 101 in its entirety, and since the list is still applied to the interface — now non-existent — the interface stops filtering rather than blocking everything. The safe method on such a device is to build the replacement list under a new number, swap the `ip access-group`, and then delete the old one.

Editing a live ACL is also worth thinking about in terms of the seconds between commands. Removing a permit and adding a corrected one leaves a window where the implicit deny governs. On anything production, build the new list separately and switch the interface over in one command.

---

## Proving which line matched

```
R1#clear access-list counters WAN_IN
R1#show ip access-lists WAN_IN
Extended IP access list WAN_IN
    10 permit ospf any any (0 matches)
    20 permit tcp any host 203.0.113.10 eq 80 (0 matches)
    30 deny ip any any log (0 matches)
```

Run the failing test, then read the list again. One of three things is true, and each points somewhere different:

- **A permit line incremented** — the ACL is not your problem; look further along the path.
- **The final deny incremented** — the ACL is your problem, and the log line names the addresses and ports so you can write the rule that was missing.
- **Nothing incremented at all** — the traffic never reached this ACL. Wrong interface, wrong direction, or the packet is being dropped before it gets here.

The `log` keyword makes the drop explicit:

```
%SEC-6-IPACCESSLOGP: list WAN_IN denied tcp 203.0.113.55(51230) ->
                     10.0.1.10(3389), 1 packet
```

`log-input` adds the ingress interface and source MAC, which matters on a switch where several sources share a subnet.

**Logging is not free.** A packet that matches a logging entry is punted from the hardware or CEF path to the process level so the router can generate the message. On a high-rate flow this raises CPU noticeably and can itself become the outage. Use it to find a fault, then take it off:

```
R1(config)#ip access-list logging interval 1000   ! milliseconds between messages
```

That rate-limits the messages, not the punting, so it reduces the syslog flood without removing the CPU cost. The real fix is to remove `log` once the answer is known.

---

## Quick reference

| Command | Proves |
|---|---|
| `show access-lists` | every ACL with per-line hit counters — **a zero counter is a diagnosis** |
| `show ip access-lists <name>` | the same, IP lists only, quieter on a router with many lists |
| `show ip interface <int>` | which ACL is bound to that interface, and in which direction |
| `show ip interface brief` | that the interface you are filtering is the one traffic actually uses |
| `clear access-list counters <name>` | resets the counters so the next test is measured on its own |
| `ip access-list resequence <name> 10 10` | renumbers a list so entries can be inserted again |
| `show ip nat translations` | which address an ACL near a NAT boundary should be matching |
| `show logging \| include IPACCESSLOG` | what the `log` keyword recorded — addresses and ports of denied traffic |
| `show running-config \| section access-list` | the list as configured, including entries with no hits |

---

*Based on standard Cisco IOS access-list behaviour, and the filtering faults that recur across the NetworkLessons troubleshooting series.*
