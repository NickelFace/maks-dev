---
title: "NTP"
date: 2026-09-06
description: "Reading show ntp status and show ntp associations field by field, the stratum-16 dead end, and the ACL, source-interface and key mismatches that leave a client politely never synchronising."
tags: ["Troubleshooting", "NTP", "Logging", "Cisco"]
categories: ["Troubleshooting"]
unit: 5
---

NTP is invisible until something else fails, and then it is the reason the failure cannot be investigated. Correlating a syslog entry on a switch with an authentication log on a server requires both clocks to agree; a certificate that expired last night looks valid to a device whose clock says it is still Tuesday; a routing protocol key chain with a `send-lifetime` becomes unusable the moment the router disagrees with the calendar. Time is not a service you notice working — it is a dependency of every diagnosis you will make.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| `Clock is unsynchronized, stratum 16` | no usable source at all | `show ntp associations` |
| Association present, `reach 0` | packets are not getting through — ACL, routing, wrong address | `debug ntp packets` |
| `reach 377`, still no `*` | the server itself is stratum 16, or authentication failed | `show ntp associations detail` |
| Never syncs, no errors anywhere | it has not been long enough | wait five polls, then look again |
| Syncs from some routers, not others | server filters by source address; client sources from the wrong interface | `show run \| include ntp source` |
| `%NTP-4-...` authentication failures | key ID or key string mismatch, or key not trusted | `debug ntp validity` |
| Clients refuse a router configured as a source | `ntp master` on a router that is itself unsynchronised | `show ntp status` on that router |
| Logs are hours out but "NTP is fine" | time zone configured on some devices and not others | `show clock detail` |
| Log entries have no useful timestamp | `service timestamps` set to uptime | `show run \| include service timestamps` |

---

## Stratum, and why 16 is a wall

Stratum is distance from a real clock, counted in hops.

| Stratum | What it is |
|---|---|
| 0 | the reference itself — atomic clock, GPS receiver. Not on the network |
| 1 | a server directly attached to a stratum-0 device |
| 2 | synchronised to a stratum-1 server |
| n | synchronised to a stratum n−1 server |
| **16** | **not synchronised** — the value that means "I have no time" |

A device increments the stratum by one when it passes time on, so the number tells you how many devices are between you and something authoritative. It is also a loop-prevention mechanism, which is why the count is capped.

**Stratum 16 is not a bad source, it is not a source.** A client will not synchronise to a stratum-16 server, and the failure is silent — the association appears, packets flow, `reach` climbs to 377, and no `*` ever appears. Everything looks healthy except the one field that matters.

This produces a cascade that is worth recognising. If the hub router loses its upstream, it goes to stratum 16; every branch that pointed at it goes to stratum 16 a few minutes later; and the whole estate loses time from a single failure that nobody was alerted about. Two servers configured on every client is cheap insurance.

---

## `show ntp status`

The first command, and one line of it answers the question:

```
R1#show ntp status
Clock is synchronized, stratum 3, reference is 10.99.0.1
nominal freq is 250.0000 Hz, actual freq is 250.0001 Hz, precision is 2**18
reference time is EC7A1B40.7C3F2A1B (09:14:24.485 UTC Sat Sep 6 2026)
clock offset is 1.4210 msec, root delay is 12.3400 msec
root dispersion is 21.4300 msec, peer dispersion is 3.1250 msec
loopfilter state is 'CTRL' (Normal Controlled Loop)
```

| Field | Reading it |
|---|---|
| `Clock is synchronized` | the router is locked to a source. `unsynchronized` means it is not |
| `stratum 3` | two devices between this router and a stratum-1 server |
| `reference is` | **which** server it locked to — often not the one you assumed |
| `clock offset` | how far the local clock is from the server, in milliseconds |
| `root delay` | round-trip delay to the stratum-1 source, accumulated over the path |
| `root dispersion` | accumulated error bound. Large values mean an unstable path |
| `loopfilter state` | `CTRL` is normal steering; `FSET`/`SPIK` appear during startup or after a step |

"Clock is unsynchronised" is more specific than it sounds. It does not mean the time is wrong — it means the router **knows** it cannot vouch for the time, and it will refuse to serve time to anyone else while in that state. The router may well be showing an accurate time it got from `clock set` or from its hardware calendar, and still report unsynchronised.

`show clock` encodes the same thing in a single character, which is faster:

```
R1#show clock
*09:14:26.113 UTC Sat Sep 6 2026
```

| Prefix | Meaning |
|---|---|
| `*` | the time is **not authoritative** — no NTP sync |
| ` ` (space) | authoritative, synchronised |
| `.` | authoritative, but NTP is not currently synchronised |

A leading asterisk on a device you believe is synchronised is the whole answer.

---

## `show ntp associations`

This is where you find out which source failed and how.

```
R1#show ntp associations

  address         ref clock       st   when   poll reach  delay  offset    disp
*~10.99.0.1       .GPS.            2     34     64   377  12.340   1.421   3.125
+~10.99.0.2       .GPS.            2     51     64   377  14.100   1.882   3.940
 ~10.99.0.9       .STEP.          16      -     64     0   0.000   0.000  16000.
 * master (synced), # master (unsynced), + selected, - candidate, ~ configured
```

The leading characters are the verdict:

| Char | Meaning |
|---|---|
| **`*`** | **this is the source the router is actually synchronised to** — the sys.peer |
| `#` | the router selected this master but is not synchronised to it |
| **`+`** | selected as a usable candidate — the standby, ready to take over |
| `-` | considered and rejected by the selection algorithm |
| **`~`** | **statically configured**, as opposed to learned from broadcast or multicast |

Exactly one line should carry `*`. None means no synchronisation. The `~` is worth noticing because its absence tells you the association came from `ntp broadcast client` or a multicast peer rather than from a `ntp server` line — which matters when the configuration you are reading does not appear to explain the associations you are seeing.

The columns:

| Column | Reading it |
|---|---|
| `ref clock` | the source's own reference. `.STEP.`, `.INIT.` or `.LOCL.` mean it has nothing real |
| `st` | the source's stratum. **16 makes the row useless** regardless of everything else |
| `when` | seconds since the last reply. Should be less than `poll` |
| `poll` | current polling interval in seconds — starts at 64, widens to 1024 as stability improves |
| `reach` | eight-bit shift register, **shown in octal** |
| `delay` | round-trip time in milliseconds |
| `offset` | how far this source says the local clock is out |
| `disp` | dispersion — the error bound. A value near 16000 means completely unusable |

### The reachability register

`reach` is the field people misread most often, because it is octal and it looks like a percentage.

It is an eight-bit register. Each poll shifts it left one position and puts a 1 in the low bit if a reply arrived, a 0 if it did not. So:

| Value | Binary | Meaning |
|---|---|---|
| `0` | `00000000` | nothing has ever been heard from this source |
| `1` | `00000001` | exactly one reply, the most recent — a new association starting up |
| `377` | `11111111` | all of the last eight polls answered — healthy |
| `376` | `11111110` | seven good, and the **most recent one failed** — it is going down now |
| `177` | `01111111` | seven good and the oldest lost — it is coming *up* |

`0` and `377` are the two you act on. Zero means the packets are not making the round trip — that is an ACL, a route, or a wrong address, and it is a connectivity problem rather than an NTP problem. 377 with no `*` means the packets arrive fine and the router is rejecting the source for a reason inside NTP: stratum 16, failed authentication, or an offset large enough to be treated as a falseticker.

`show ntp associations detail` gives the reason directly:

```
R1#show ntp associations detail
10.99.0.9 configured, insane, invalid, stratum 16
ref ID .STEP., time 00000000.00000000 (00:00:00.000 UTC Mon Jan 1 1900)
our master, sync dist 16.000
```

`insane`/`invalid` on a source with `reach 377` is the algorithm telling you it received the packets and refused them.

---

## An ACL is blocking UDP 123

`reach 0` on a source you can ping is almost always a filter. NTP is UDP port 123, and it is symmetric — the client sources *from* 123 and sends *to* 123, which is unusual and catches ACLs written on the assumption of an ephemeral source port.

```
R1#show ip interface GigabitEthernet0/1 | include access list
  Outgoing access list is not set
  Inbound  access list is WAN_IN
```

```
R1#show access-lists WAN_IN
Extended IP access list WAN_IN
    10 permit tcp any any established (81422 matches)
    20 permit udp any any eq domain (3140 matches)
    30 deny   ip any any (1288 matches)
```

The replies are landing on that final deny. An ACE permitting UDP 123 in both directions fixes it:

```
R1(config)#ip access-list extended WAN_IN
R1(config-ext-nacl)#15 permit udp host 10.99.0.1 eq ntp any eq ntp
```

`debug ntp packets` distinguishes "nothing is being sent" from "sent, nothing came back", which is worth knowing before you go looking at ACLs:

```
R1#debug ntp packets
NTP: xmit packet to 10.99.0.1:
 leap 0, mode 3, version 4, stratum 3, ppoll 64
NTP: rcv packet from 10.99.0.1 to 10.1.1.1 on GigabitEthernet0/0:
 leap 0, mode 4, version 4, stratum 2, ppoll 64
```

Transmit lines with no receive lines is the filter. No transmit lines at all means the association is not being polled — usually a typo in the server address, or the association was configured under a VRF the router cannot reach.

### The other filter is on the server

`ntp access-group` restricts who may ask. A client that is denied gets no reply, which looks identical to an ACL drop from the client side:

```
NTP_SRV#show running-config | include ntp access-group
ntp access-group serve-only 21
```

```
NTP_SRV#show access-lists 21
Standard IP access list 21
    10 permit 10.1.0.0, wildcard bits 0.0.255.255 (992 matches)
```

If the new branch is 10.4.0.0/16, it is not in that ACL, and no amount of work on the client will help.

---

## Source-interface mismatch

A router sources NTP packets from the interface the packet leaves by. When the server filters by address, or is behind a firewall with a rule per device, that address has to be predictable — which is what `ntp source` is for.

The failure mode is specific and confusing: the client works from one path and stops after a routing change or a failover, because the egress interface changed and the source address changed with it. Nothing in the NTP configuration was touched.

```
R1(config)#ntp source Loopback0
```

Two things to check when this is in play. The loopback address must be advertised into the routing protocol, or the server's replies have nowhere to go — a permitted source with no return route fails exactly like a denied one. And `ntp source` is global while `ntp server ... source` is per-server; a global source line can be silently overridden per association, so read the whole configuration rather than the first matching line:

```
R1#show running-config | include ntp
ntp authentication-key 1 md5 071B245F5A 7
ntp authenticate
ntp trusted-key 1
ntp source Loopback0
ntp server 10.99.0.1 key 1
ntp server 10.99.0.2 key 1 source GigabitEthernet0/1
```

---

## Authentication

Three pieces have to agree, and the third is the one that gets missed.

```
R1(config)#ntp authentication-key 1 md5 T1meK3y     ! key number and string
R1(config)#ntp authenticate                          ! enable authentication
R1(config)#ntp trusted-key 1                         ! this key is permitted for sync
R1(config)#ntp server 10.99.0.1 key 1                ! use key 1 with this server
```

`ntp trusted-key` is a separate allow-list. A key can be defined, referenced on the server line, and still rejected because it was never added to the trusted list. The configuration reads as complete and the client never synchronises.

The key **number** must match as well as the string. Key 1 on the client and key 10 on the server, with an identical passphrase, fails — the packets carry the key ID and the server looks up the wrong key.

```
R1#debug ntp validity
NTP: packet from 10.99.0.1 failed validity tests 10
NTP: Authentication key mismatch
```

Because keys are stored encrypted (`service password-encryption` turns them into type 7 strings) you cannot compare them by eye across two configurations. Re-enter the key on both ends rather than trying to read it.

---

## It has not been long enough

The most common "fault" is not a fault. NTP does not step the clock and declare victory — it collects samples across several polling intervals, discards outliers, and only then selects a source. With a 64-second poll and a minimum of about five exchanges, **first synchronisation typically takes five to ten minutes**, and longer if the initial offset is large.

The observable progression is `reach` filling up in octal — 1, 3, 7, 17, 37, 77, 177, 377 — with the `*` appearing somewhere along the way. If `reach` is climbing, the configuration is correct and the answer is to wait.

Where it genuinely does not converge is when the initial offset is enormous. NTP refuses to accept a correction beyond about **1000 seconds**, on the reasonable assumption that something that far out is a fault rather than drift. A router that has been powered off for a year, or one whose hardware clock was never set, sits there forever with a healthy association and no sync.

```
R1#clock set 09:14:00 6 September 2026
```

Set the clock roughly by hand, and NTP takes it from there. This is also the reason to configure the time zone and let NTP run *before* deploying anything that depends on certificates.

---

## `ntp master` on a router with a bad clock

`ntp master` makes the router an authoritative source using its own hardware clock. It is the right answer for an isolated lab or a site with no internet path, and a poor one everywhere else, because it declares a router's free-running oscillator to be a reference standard.

```
R1(config)#ntp master 5      ! serve time at stratum 5
```

Two failure modes follow it around. **A router that is itself unsynchronised and also configured as master** will happily serve its wrong time to everything downstream, and every client will trust it — the whole site converges neatly on the wrong hour. And **`ntp master` on a device that also has upstream servers** creates a competing internal source; if the upstream is briefly unreachable the router falls back to its own clock, at whatever stratum you configured, and may prefer it afterwards.

Choose a stratum number deliberately. `ntp master` with no argument defaults to **stratum 8**; a value lower than your real upstream servers means the fallback outranks the real thing.

---

## Time zones, and logs that do not line up

Two devices can both be perfectly synchronised and still produce logs an hour apart, because NTP distributes UTC and nothing else. The time zone is local configuration, and if half the estate has it and half does not, the log correlation you were trying to do is broken by the fix.

```
R1#show clock detail
09:14:31.442 UTC Sat Sep 6 2026
Time source is NTP
```

```
R1(config)#clock timezone AEST 10
R1(config)#clock summer-time AEDT recurring
```

The defensible convention is to leave every network device on UTC and convert at the log collector. The alternative is to set the same zone everywhere, which works until a device is added by someone who did not know.

Either way, the timestamps have to be worth reading. The IOS default stamps log messages with **uptime**, which is useless for correlating anything:

```
R1(config)#service timestamps log datetime msec localtime show-timezone
R1(config)#service timestamps debug datetime msec localtime show-timezone
```

`msec` matters more than it looks: a spanning-tree topology change and the interface flap that caused it can be inside the same second, and without milliseconds you cannot tell which came first. `show-timezone` puts the offset in every line, which removes the ambiguity above at the cost of a few characters.

```
Sep  6 19:14:31.442 AEST: %LINK-3-UPDOWN: Interface GigabitEthernet0/1, changed state to down
```

---

## Quick reference

| Command | Proves |
|---|---|
| `show ntp status` | synchronised or not, the stratum, and **which** source was chosen |
| `show clock` | the `*` prefix — authoritative or not, at a glance |
| `show clock detail` | the time source and the configured time zone |
| `show ntp associations` | every configured source, its stratum, `reach` and the `*`/`+` selection |
| `show ntp associations detail` | why a reachable source was rejected — `insane`, `invalid`, stratum |
| `debug ntp packets` | whether requests are being sent and whether replies arrive |
| `debug ntp validity` | authentication failures, with the key mismatch named |
| `show ip interface <int> \| include access list` | an ACL on the path that may be dropping UDP 123 |
| `show run \| include ntp` | keys, trusted-key list, source interface, per-server overrides |
| `show run \| include service timestamps` | whether logs are stamped with real time or with uptime |

---

*Based on the NetworkLessons troubleshooting series: NTP on Cisco IOS.*
