---
title: "Lab 24 · NTP"
date: 2026-09-06
description: "Synchronise the clocks, because every log entry, certificate check and time-based ACL on the network is worthless without it."
tags: ["CCNA", "NTP", "IP Services", "Lab"]
categories: ["CCNA"]
domain: 4
tool: "Packet Tracer"
duration: "30 min"
sources: "Jeremy's IT Lab Day 37 · Flackbox 34"
---

Time synchronisation is invisible until the moment you need it, and then it is the only thing that matters. Correlating a firewall log with a switch log with an application log across three devices whose clocks disagree by minutes is not troubleshooting — it is guesswork. Certificates fail validation, Kerberos refuses tickets, and time-based ACLs apply the wrong policy.

Two commands fix it.

## Topology

{{< topology cols="3" rows="2" caption="R1 as the site's NTP server, everything else a client" >}}
router R1 "NTP master · stratum 2" at 1,0
router R2 "client" at 0,1
switch SW1 "client" at 2,1
cloud NTP "public NTP" at 1,1

R1 — NTP label="upstream"
R1 — R2
R1 — SW1
{{< /topology >}}

## Objectives

- Set the clock and timezone manually and understand why `show clock` prints a leading asterisk
- Configure a router as an NTP client and confirm synchronisation
- Configure a router as an NTP master for devices with no internet path
- Read stratum values and explain what they mean
- Add NTP authentication and timestamp the logs

---

## Part 1 — The clock

{{< step num="1" dev="R1" title="Set the time, then the timezone — in that order" open="true" >}}
```
R1#clock set 14:30:00 6 September 2026
R1#configure terminal
R1(config)#clock timezone AEST 10 0
R1(config)#clock summer-time AEDT recurring first Sun Oct 2:00 first Sun Apr 3:00
R1(config)#end
```

`clock set` is a **privileged EXEC** command, not a configuration command — it does not appear in `show run` and does not survive a reload on a device without a battery-backed clock. `clock timezone` and `clock summer-time` are configuration and do persist.

**Set the hardware clock to UTC and let the timezone command do the offset.** That is the convention worth adopting: `clock timezone AEST 10 0` means "the hardware clock is UTC, display it +10:00". Storing local time in the hardware clock and then also applying an offset double-counts it, and the error only becomes visible twice a year.

```
R1#show clock
14:30:12.482 AEST Sat Sep 6 2026
```

```
R1#show clock detail
14:30:19.221 AEST Sat Sep 6 2026
Time source is user configuration
Summer time starts 02:00:00 AEST Sun Oct 4 2026
Summer time ends 03:00:00 AEDT Sun Apr 5 2027
```

`Time source is user configuration` means somebody typed it and it will drift. After NTP synchronises this reads `Time source is NTP`, which is the line you actually want to see.
{{< /step >}}

{{< step num="2" dev="R1" title="Point at an upstream server" >}}
```
R1(config)#ntp server 203.0.113.100 prefer
R1(config)#ntp server 203.0.113.101
R1(config)#ntp update-calendar
R1(config)#end
```

Two servers so a single failure does not leave the site unsynchronised; `prefer` names which one wins when both are healthy.

`ntp update-calendar` copies the software clock to the **hardware calendar** periodically, so the time survives a reload on platforms that have one. Without it, a router that reboots while its NTP source is unreachable comes up in 1993 and every log entry it writes is useless.

Synchronisation is not instant. NTP deliberately steps slowly to avoid jumping the clock — expect **several minutes** before `show ntp status` reports synchronised, and do not conclude it is broken at the two-minute mark.
{{< /step >}}

{{< verify dev="R1" cmd="show ntp status" open="true" >}}
```
R1#show ntp status
Clock is synchronized, stratum 3, reference is 203.0.113.100
nominal freq is 250.0000 Hz, actual freq is 249.9990 Hz, precision is 2**18
reference time is EB3A2C4F.7A3B2C1D (14:35:11.478 AEST Sat Sep 6 2026)
clock offset is 2.4512 msec, root delay is 18.32 msec
root dispersion is 41.28 msec, peer dispersion is 1.94 msec
loopstatus = 'CTRL', drift is 0.000004000 s/s
```

Three fields matter:

**`Clock is synchronized`** — the whole point. `Clock is unsynchronized` means NTP is configured and not working.

**`stratum 3`** — distance from the reference clock:

| Stratum | Source |
|---|---|
| 0 | the reference itself — atomic clock, GPS receiver |
| 1 | a server directly attached to a stratum 0 device |
| 2 | a server synchronised to a stratum 1 |
| n | one more hop than its source |
| **16** | **unsynchronised** |

A device always reports **one higher** than its source. Stratum 16 means "I have no time"; a client that shows 16 has not synchronised regardless of what the configuration says.

**`clock offset`** — how far this clock is from the server's, in milliseconds. Single-digit milliseconds on a LAN is healthy. Hundreds of milliseconds means a congested or asymmetric path, and NTP will correct more slowly.
{{< /verify >}}

---

## Part 2 — Clients, and an internal master

{{< step num="3" dev="R2, SW1" title="Point the rest of the site at R1" >}}
```
R2(config)#ntp server 10.0.12.1
R2(config)#clock timezone AEST 10 0
R2(config)#clock summer-time AEDT recurring first Sun Oct 2:00 first Sun Apr 3:00
R2(config)#end
```

```
SW1(config)#ntp server 10.0.10.1
SW1(config)#clock timezone AEST 10 0
SW1(config)#end
```

**Every device gets the timezone**, even though NTP carries UTC. NTP transports UTC and nothing else; the local display is entirely the device's own business. Miss it on one switch and its logs are ten hours out from everything else — which is exactly the failure NTP was meant to prevent.
{{< /step >}}

{{< step num="4" dev="R1" title="ntp master — for a site with no upstream" open="true" >}}
```
R1(config)#ntp master 3
```

`ntp master` makes the router an authoritative time source at the stratum you specify, using its own clock as the reference. Clients synchronise to it and report stratum 4.

This is what you use on an isolated network — a lab, an air-gapped site, or an OT segment with no internet path. It is also what you use as a fallback: with both `ntp server` and `ntp master` configured, the router prefers the real upstream and falls back to being authoritative if it becomes unreachable. Devices stay synchronised **with each other** even when nobody is synchronised with reality, which is what matters for log correlation.

Pick a stratum in the middle of the range — 3 to 5. Choose 1 and every genuine stratum-1 source in the world is now less trusted than a router with a drifting crystal.

Two other NTP roles, both rarer:

```
R1(config)#ntp peer 10.0.12.2         ! symmetric — two servers keeping each other honest
R1(config)#ntp broadcast              ! push time to a segment; clients need "ntp broadcast client"
```
{{< /step >}}

{{< verify dev="R2" cmd="show ntp associations" open="true" >}}
```
R2#show ntp associations

  address         ref clock       st   when   poll reach  delay  offset   disp
*~10.0.12.1       203.0.113.100    3     24     64   377  1.021   0.412  0.185
 ~10.0.12.5       .INIT.          16      -     64     0  0.000   0.000 15937.
 * sys.peer, # selected, + candidate, - outlyer, x falseticker, ~ configured
```

The character in column one is the whole story:

| Symbol | Meaning |
|---|---|
| **`*`** | **sys.peer** — this is the source currently in use |
| `#` | selected but not the chosen one |
| `+` | a viable candidate |
| `-` | rejected by the selection algorithm |
| `x` | falseticker — its time disagrees with the consensus |
| (blank) | discarded |

**`reach 377`** is an octal bitmask of the last eight polls. `377` is `11111111` — eight consecutive successes, which is a healthy association. `0` means nothing has ever been heard. Anything between shows intermittent loss: `376` means the most recent poll failed, `177` means the oldest of the eight did.

The second line shows an unreachable server: reference clock `.INIT.`, stratum 16, reach 0, dispersion enormous. That is what a misconfigured or blocked NTP peer looks like.

Confirm the source is now NTP rather than a human:

```
R2#show clock detail
14:41:03.112 AEST Sat Sep 6 2026
Time source is NTP
```
{{< /verify >}}

---

## Part 3 — Authentication and log timestamps

{{< step num="5" dev="R1, R2" title="Stop the clients trusting any server that answers" >}}
An unauthenticated NTP client accepts time from whatever replies first. Skewing a target's clock is a real attack: it invalidates certificates, breaks Kerberos, and can flip a time-based ACL into its permissive window.

On the server:

```
R1(config)#ntp authentication-key 1 md5 Nt9K3y!Lab
R1(config)#ntp trusted-key 1
R1(config)#ntp authenticate
```

On the client:

```
R2(config)#ntp authentication-key 1 md5 Nt9K3y!Lab
R2(config)#ntp trusted-key 1
R2(config)#ntp authenticate
R2(config)#ntp server 10.0.12.1 key 1
```

All three commands are needed on each side, and the `key 1` on the `ntp server` line is the one people leave off — without it the client sends unauthenticated requests and the authenticating server ignores them. The symptom is a silent failure to synchronise with no log message.

Restrict who may ask, as a second control:

```
R1(config)#access-list 20 permit 10.0.0.0 0.255.255.255
R1(config)#ntp access-group serve-only 20
```
{{< /step >}}

{{< step num="6" dev="R1, R2, SW1" title="Make the logs carry the time" >}}
```
R1(config)#service timestamps log datetime msec localtime show-timezone
R1(config)#service timestamps debug datetime msec localtime show-timezone
```

Without this, log entries are stamped with **uptime** rather than a date — `*Mar 1 00:04:12.334` on a router that has been up for years, which correlates with nothing.

The keywords, each earning its place:

- `datetime` — an actual date and time rather than uptime
- `msec` — millisecond precision, which is what you need to order events across devices
- `localtime` — display in the configured timezone rather than UTC
- `show-timezone` — print the zone name, so a log shipped elsewhere is unambiguous

Before and after:

```
*Mar  1 00:04:12.334: %LINK-3-UPDOWN: Interface GigabitEthernet0/1, changed state to up

Sep  6 14:44:09.221 AEST: %LINK-3-UPDOWN: Interface GigabitEthernet0/1, changed state to up
```

The second one can be correlated with a firewall log. The first cannot.

This is the pairing that makes NTP worth configuring at all: **synchronised clocks plus timestamped logs**. Either alone is close to useless.
{{< /step >}}

{{< verify dev="SW1" cmd="show ntp status and show clock" >}}
```
SW1#show ntp status
Clock is synchronized, stratum 4, reference is 10.0.10.1

SW1#show clock
14:45:22.109 AEST Sat Sep 6 2026
```

**Stratum 4** — one more than R1's 3, exactly as expected. Then compare `show clock` across all three devices; they should agree to within milliseconds.

The final proof is in the logs. Shut an interface on R1 and the corresponding link-down on SW1, and check that the two timestamps are within a second of each other:

```
SW1#show logging | include LINK-3
Sep  6 14:46:02.887 AEST: %LINK-3-UPDOWN: Interface FastEthernet0/1, changed state to down
```
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| `Clock is unsynchronized`, stratum 16 | server unreachable, or not synchronised itself | `show ntp associations` — check `reach` |
| `reach 0` | UDP 123 blocked, or wrong address | ACL on the path; ping the server |
| Synchronised but the time is wrong | timezone not configured | `show clock detail` |
| Time jumps twice a year | DST not configured, or offset double-counted | `clock summer-time` |
| Router boots in 1993 | no `ntp update-calendar`, no battery clock | add it |
| Logs stamped with uptime | `service timestamps` missing | add `datetime msec localtime` |
| Client will not sync to an authenticating server | `key` missing on the `ntp server` line | add `key <n>` |
| One device's logs are hours out | timezone missing on that device only | `clock timezone` there |

## Exam notes

- NTP is **UDP port 123**.
- **Stratum**: 0 = reference clock, 1 = directly attached, each hop +1, **16 = unsynchronised**. A device reports one higher than its source.
- `ntp server <ip>` = client. `ntp master <stratum>` = authoritative source. `ntp peer` = symmetric.
- `show ntp status` for synchronisation and stratum; `show ntp associations` for per-server detail.
- **`reach 377`** (octal) = the last eight polls all succeeded. **`*`** marks the selected sys.peer.
- NTP carries **UTC**; the timezone is a local display setting and must be set on every device.
- Authentication needs `ntp authentication-key`, `ntp trusted-key`, `ntp authenticate` **and** `key <n>` on the server line.
- `service timestamps log datetime msec localtime show-timezone` is what makes the logs usable.

---

*Sources: Jeremy's IT Lab Day 37 · Flackbox CCNA Lab Guide 34 · verified in Packet Tracer 8.2.*
