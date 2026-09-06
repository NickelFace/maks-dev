---
title: "Firewall Packet Drops"
date: 2026-09-06
description: "Reasoning about a device that drops without telling you: security levels, reading packet-tracer phase by phase, what each show asp drop reason means, and separating an ACL drop from a NAT drop from an inspection drop."
tags: ["Troubleshooting", "Firewall", "ASA", "NAT", "Security"]
categories: ["Troubleshooting"]
unit: 7
---

A router that cannot forward a packet tells you so — it returns an ICMP unreachable, and `U` appears in your ping. A firewall does not. Its entire design premise is that unwanted traffic disappears without acknowledgement, which is correct security behaviour and terrible diagnostic behaviour. When a path crosses a firewall, the usual tools stop producing evidence and you have to go and ask the device directly what it did.

The commands below are Cisco ASA, and ASA configuration is outside CCNA 200-301. **The reasoning is not.** A firewall in the path is something you will meet long before you meet an exam question about one, and knowing how to establish which stage dropped a packet — and how to tell that from a routing problem — is general knowledge that transfers to any stateful device.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| TCP works, ping does not | **ICMP is not inspected or permitted** — the default | `show run policy-map` |
| Traffic one direction only | security levels: **low to high needs an ACL** | `show run access-group`, `show nameif` |
| Two interfaces at the same level cannot talk | `same-security-traffic` not permitted | `show run same-security-traffic` |
| Connection starts, dies mid-session | idle timeout, or **asymmetric routing** | `show conn detail`, `show asp drop` |
| Works from one host, not another | NAT rule ordering | `show nat detail`, `show xlate` |
| Firewall does not appear in traceroute | ASA does not decrement TTL by default | expected — not a fault |
| No syslog for the dropped traffic | dropped in the accelerated path, before logging | `show asp drop` |
| Everything looks permitted and traffic still fails | inspection engine, not the ACL | `packet-tracer` |

---

## Security levels

Every ASA interface has a name and a security level from 0 to 100. `inside` conventionally gets 100, `outside` gets 0, a DMZ sits somewhere between.

```
ASA# show nameif
Interface                Name                   Security
GigabitEthernet0/0       outside                       0
GigabitEthernet0/1       inside                      100
GigabitEthernet0/2       dmz                          50
```

The default rule follows from those numbers: **traffic from a higher level to a lower level is permitted; traffic from a lower level to a higher level is denied.** Inside to outside needs no ACL. Outside to inside needs an explicit ACL entry, and so does DMZ to inside — a distinction people forget, because the DMZ feels like part of the internal network.

Two interfaces at the *same* level cannot communicate at all by default, which is the surprise when a second DMZ is added at level 50 to match the first:

```
ASA(config)# same-security-traffic permit inter-interface
```

And traffic that enters and leaves on the same interface — a VPN client reaching another VPN client, or two hosts behind the same leg being hairpinned — is dropped by default as well:

```
ASA(config)# same-security-traffic permit intra-interface
```

**ICMP is the one that surprises everyone.** An inside host pinging the internet is a high-to-low flow, so the echo request is permitted — and the echo reply is a low-to-high flow with no connection to associate it with, so it is dropped. Ping appears not to work through the firewall while TCP works perfectly. The fix is to let the inspection engine build state for ICMP:

```
ASA(config)# policy-map global_policy
ASA(config-pmap)# class inspection_default
ASA(config-pmap-c)# inspect icmp
```

Which is worth knowing for a different reason: **your ping test across a firewall may be failing for reasons that have nothing to do with the traffic you are actually troubleshooting.** Test with the real protocol and port.

---

## packet-tracer

If you take one thing from this page, take this command. `packet-tracer` builds a synthetic packet with the source and destination you specify, runs it through every stage of the firewall's policy in order, and prints what each stage decided. No client, no server, no traffic generator, no waiting for the user to retry.

```
ASA# packet-tracer input outside tcp 203.0.113.55 51230 203.0.113.10 443
```

The arguments are ingress interface, protocol, source address, source port, destination address, destination port. **The destination address is the one that appears on the wire at that ingress interface** — the public address, not the translated internal one. Getting that wrong produces a `no-route` result that reflects your typing rather than the firewall's configuration.

The output is a numbered sequence of phases:

```
Phase: 1
Type: ACCESS-LIST
Subtype:
Result: ALLOW
Config:
Implicit Rule

Phase: 2
Type: UN-NAT
Subtype: static
Result: ALLOW
Config:
object network WEB-SERVER
 nat (inside,outside) static 203.0.113.10
Additional Information:
NAT divert to egress interface inside
Untranslate 203.0.113.10/443 to 10.0.1.10/443

Phase: 3
Type: ACCESS-LIST
Subtype: log
Result: DROP
Config:
access-group OUTSIDE_IN in interface outside
access-list OUTSIDE_IN extended deny tcp any host 10.0.1.10

Result:
input-interface: outside
input-status: up
output-interface: inside
Action: drop
Drop-reason: (acl-drop) Flow is denied by configured rule
```

Read it from the bottom. `Action: drop` and a `Drop-reason` naming the stage. Then go up to the phase whose `Result` is `DROP` and read its `Config:` block — that is the actual configuration line responsible, quoted back at you.

Here the drop is at phase 3, and the `Config:` block quotes the exact entry that matched — a broad `deny` that someone left above the permit for this server. That is the value of the tool: it does not tell you the ACL denied the packet, it tells you **which line** denied it, which removes the entire step of reading the list and reasoning about order.

Phase 2 is worth reading closely even when it succeeds, because it establishes an ordering that is easy to get backwards. **Untranslation runs before the interface ACL.** By the time the ACL is evaluated the destination is already `10.0.1.10`, and on ASA 8.3 and later the ACL is written against that real address rather than the mapped one. This is the opposite of IOS, where an inbound ACL on the outside interface is checked before translation and must reference the public address — so an entry copied from a router to a firewall, or the reverse, matches nothing on the new platform while looking perfectly correct.

The phases you will see most, and what each means:

| Phase type | What it decides |
|---|---|
| `ACCESS-LIST` | the interface ACL, and the implicit rules for security levels |
| `UN-NAT` | destination translation on the way in — runs **before** the ACL |
| `ROUTE-LOOKUP` | which egress interface, according to the firewall's own routing table |
| `NAT` | source translation on the way out |
| `IP-OPTIONS` | packets with IP options, dropped by default |
| `INSPECT` | the protocol inspection engine for this flow |
| `VPN` | encryption / decryption decisions |
| `FLOW-CREATION` | the connection is built — reaching this phase means the packet passes |

**A trace that reaches `FLOW-CREATION` and reports `Action: allow` is proof that the firewall permits the traffic.** At that point the fault is elsewhere: server not listening, routing beyond the firewall, or a second device in the path. That negative result is as valuable as finding the drop, because it removes the firewall from the investigation with evidence rather than assertion.

---

## show asp drop

The Accelerated Security Path is the fast forwarding engine, and it keeps a counter for every reason it has ever discarded a frame. `show asp drop` is the aggregate view — it tells you what kind of drops are happening on this box, though not which flow.

```
ASA# show asp drop

Frame drop:
  Flow is denied by configured rule (acl-drop)                       12043
  First TCP packet not SYN (tcp-not-syn)                              4471
  NAT reverse path failed (nat-rpf-failed)                              88
  No route to host (no-route)                                           16
  Reverse-path verify failed (rpf-violated)                              4

Last clearing: 09:42:11 UTC Sep 6 2026 by admin
```

The counters only mean something relative to a baseline, so clear them, reproduce the fault, and read them again:

```
ASA# clear asp drop
```

What the common reasons actually mean — and several of them do not mean what their names suggest:

| Reason | What is really happening |
|---|---|
| `acl-drop` | an interface ACL denied it, **or** the implicit low-to-high rule did |
| `tcp-not-syn` | a TCP packet that is not a SYN arrived for a flow with no connection entry — **usually asymmetric routing or an expired connection**, not an attack |
| `nat-rpf-failed` | the packet's translation does not match the NAT rule for the interface it arrived on — typically two overlapping NAT statements |
| `no-route` | the firewall has no route to the destination in **its own** routing table; a firewall still needs routing |
| `rpf-violated` | unicast RPF is on and the source address is not reachable via the interface it arrived on |
| `inspect-*` | the inspection engine for that protocol rejected the payload as malformed |
| `flow-expiration` | the connection was torn down while packets were still arriving — idle timeout |
| `sp-security-failed` | a security check in the slow path; often IP spoofing or a bad TCP sequence |

Once you know the reason, capture exactly those packets. This is the feature that turns an aggregate counter into named addresses:

```
ASA# capture ASPDROPS type asp-drop acl-drop
ASA# show capture ASPDROPS

2 packets captured
   1: 14:22:08.113221  203.0.113.55.51230 > 203.0.113.10.3389: S 12345:12345(0)
   2: 14:22:11.221004  203.0.113.55.51231 > 203.0.113.10.3389: S 55670:55670(0)
```

Port 3389, not the 443 anyone was talking about. That is the whole diagnosis, and it took two commands.

```
ASA# no capture ASPDROPS
```

Remove captures when finished. They consume memory and they persist across the rest of your session quite happily.

---

## Connection table and translation table

Two separate tables, and knowing which one is missing an entry narrows the fault immediately.

**The connection table** holds active flows. A permitted session appears here for its lifetime:

```
ASA# show conn
6 in use, 41 most used

TCP outside 203.0.113.55:51230 inside 10.0.1.10:443, idle 0:00:03, bytes 84213, flags UIO
TCP outside 198.51.100.7:44120 inside 10.0.1.10:443, idle 0:04:52, bytes 1204, flags UfIO
```

The `flags` field is the state. `U` is up, `I` is inbound data, `O` is outbound data — `UIO` is a healthy established session with traffic in both directions. `f` means a FIN was seen from the inside; a connection sitting in a half-closed state with rising idle time is waiting to be reaped, not passing traffic.

**The translation table** holds NAT bindings:

```
ASA# show xlate
2 in use, 18 most used

NAT from inside:10.0.1.10 to outside:203.0.113.10
    flags s idle 0:00:04 timeout 0:00:00
```

Reading the pair together:

| `show conn` | `show xlate` | Interpretation |
|---|---|---|
| entry present | entry present | the firewall is passing this flow — look elsewhere |
| absent | present | translation exists, the connection was never built — **ACL or inspection** |
| absent | absent | nothing got this far — ACL on ingress, or the packet never arrived |
| present | absent | rare; a flow that needs no translation, or an identity NAT |

The second row is the informative one. A translation without a connection means NAT was willing and something after it said no.

---

## Asymmetric routing through a stateful device

A stateful firewall builds a connection entry from the first packet of a flow — the TCP SYN — and every subsequent packet is checked against that entry. If the return traffic comes back through a *different* firewall, or through the same firewall on a different interface, there is no matching entry and the packet is dropped.

The signature is unmistakable once you know it:

```
ASA# show asp drop | include tcp-not-syn
  First TCP packet not SYN (tcp-not-syn)                              4471
```

Thousands of them, alongside applications that connect and then hang, or sessions that work for some destinations and not others. **This is not a firewall misconfiguration.** The firewall is doing exactly what a stateful device must do; the routing around it is delivering half of each conversation somewhere else. Common causes are a redundant pair without state sharing, a routing change that made an alternative path shorter for the return direction, or a policy-based route applied on one side only.

Fix the routing. The symmetry is a design requirement of putting a stateful device in the path, not a preference.

### TCP state bypass is a diagnosis, not a fix

```
ASA(config)# policy-map ASYMMETRIC
ASA(config-pmap)# class TEST-TRAFFIC
ASA(config-pmap-c)# set connection advanced-options tcp-state-bypass
```

This tells the firewall to stop tracking TCP state for the matched traffic, and it makes the symptom disappear instantly. What it has done is turn a stateful firewall into a packet filter for that traffic — no sequence checking, no state validation, no protection.

It is genuinely useful for **one** purpose: applied narrowly to the flow under investigation, if the problem vanishes, asymmetry is confirmed and you can stop looking. Then remove it and fix the routing. Leaving it in place, especially applied broadly, removes the reason the firewall is there.

---

## Capture on the ASA

The ASA captures packets natively, with no span port and no external tool. Filter the capture, always — an unfiltered capture on a busy interface fills its buffer in seconds and captures nothing you wanted:

```
ASA# capture WEBTEST interface outside match tcp host 203.0.113.55 host 203.0.113.10 eq 443
ASA# show capture WEBTEST

4 packets captured
   1: 14:31:02.556781  203.0.113.55.51244 > 203.0.113.10.443: S 88213:88213(0) win 8192
   2: 14:31:05.559012  203.0.113.55.51244 > 203.0.113.10.443: S 88213:88213(0) win 8192
   3: 14:31:11.561337  203.0.113.55.51244 > 203.0.113.10.443: S 88213:88213(0) win 8192
```

Three SYNs, retransmitted at the standard doubling intervals, no SYN-ACK. The client is trying and nothing is answering.

Now capture on the inside interface at the same time. That single comparison splits the problem cleanly in two:

- **SYNs appear on the inside capture** — the firewall forwarded them. The server or the path beyond is at fault.
- **SYNs appear only on the outside capture** — the firewall consumed them. Go back to `packet-tracer` and `show asp drop`.

That is the whole method, and it applies to any device that can capture on both sides of itself.

```
ASA# no capture WEBTEST
```

---

## Telling an ACL drop from a NAT drop from an inspection drop

These three produce the same user-visible symptom — the connection does not establish — and each has a distinct fingerprint.

| | ACL drop | NAT drop | Inspection drop |
|---|---|---|---|
| `packet-tracer` phase | `ACCESS-LIST` | `UN-NAT` or `NAT` | `INSPECT` |
| Drop reason | `acl-drop` | `nat-rpf-failed`, `no-route` | `inspect-<protocol>-…` |
| Syslog | `106023` deny by ACL | `305005` no translation group | `4xxxxx` inspection messages |
| `show xlate` | translation may exist | **no translation** for the flow | translation exists |
| `show conn` | no connection | no connection | **connection exists, then dies** |
| Timing | fails on the first packet | fails on the first packet | connects, **fails mid-session** |

**The timing row is the fastest discriminator.** An ACL or NAT problem stops the very first packet — the session never opens at all. An inspection problem lets the connection establish and then drops it when a particular message inside the protocol arrives, so the user reports that it "connects and then freezes", or that it works for small transfers and not large ones. FTP with a broken data channel, SIP calls that connect with no audio, and DNS responses over a certain size are all inspection behaviour rather than filtering behaviour.

The syslog codes worth recognising when scanning a log:

```
ASA# show logging | include 106023
%ASA-4-106023: Deny tcp src outside:203.0.113.55/51230
               dst inside:10.0.1.10/3389 by access-group "OUTSIDE_IN"
```

| Code | Meaning |
|---|---|
| `106023` | denied by an ACL — the message names the access-group |
| `106001` | inbound TCP connection denied by the implicit security-level rule |
| `305005` | **no translation group found** — a NAT failure, not an ACL failure |
| `302013` / `302014` | TCP connection built / torn down, with the teardown reason |
| `733100` | threat detection rate limit — traffic dropped for volume, not content |

The teardown reason on `302014` is often the entire answer: `Teardown TCP connection … duration 0:00:30 bytes 0 SYN Timeout` says the SYN went through and nothing came back, which points past the firewall entirely.

---

## Quick reference

| Command | Proves |
|---|---|
| `packet-tracer input <ifc> tcp <src> <sport> <dst> <dport>` | **which phase drops the packet, and the config line responsible** |
| `show asp drop` | aggregate drop reasons since the last clear — clear, reproduce, re-read |
| `capture X type asp-drop <reason>` | the actual packets behind an ASP counter, with addresses and ports |
| `capture X interface <ifc> match …` | what arrives and what leaves — run one on each side |
| `show conn` | whether a flow exists in the state table, and its direction flags |
| `show xlate` | whether a translation was built — separates NAT faults from ACL faults |
| `show nameif` | interface security levels, which set the default permit direction |
| `show logging \| include 106023` | ACL denials with source, destination and the access-group name |
| `show service-policy` | inspection engines applied, with per-class packet and drop counts |
| `clear asp drop` | resets the baseline so the next test is measured on its own |

---

*Based on the NetworkLessons troubleshooting series: Cisco ASA packet drop troubleshooting.*
