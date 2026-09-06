---
title: "Lab 36 · Troubleshooting Methodology"
date: 2026-09-06
description: "A structured method, the eight commands that answer most questions, and five broken scenarios to work through — including one where the fault is two layers below where it looks."
tags: ["CCNA", "Troubleshooting", "Lab"]
categories: ["CCNA"]
domain: 1
tool: "Packet Tracer"
duration: "60 min"
sources: "Flackbox 13, 18 · Jeremy's IT Lab Day 11 (Troubleshooting Static Routes)"
aliases: ["/ccna-labs/ccna-lab-13-troubleshooting-methodology/", "/ccna-labs/ccna-lab-18-connectivity-troubleshooting/"]
---

Most people troubleshoot by pattern matching: they have seen something like this before, they try the thing that worked last time, and often it works. When it does not, they try the next thing, and the next, and two hours later the network has been changed in six ways and nobody can say which change helped.

A method is what stops that. It is slower for the first ten minutes and faster for everything after.

## Topology

{{< topology cols="4" rows="3" caption="Two sites, VLANs, routing, NAT — enough moving parts to break in interesting ways" >}}
pc     PC1 "VLAN 10" at 0,0
pc     PC2 "VLAN 20" at 0,2
switch SW1 "" at 1,1
router R1 "" at 2,1
router R2 "" at 3,1
server SRV "10.0.30.10" at 3,0

PC1 — SW1
PC2 — SW1
SW1 — R1 label="trunk"
R1 — R2 label="10.0.12.0/30"
R2 — SRV
{{< /topology >}}

## Objectives

- Apply a structured method rather than guessing
- Choose between top-down, bottom-up and divide-and-conquer for a given symptom
- Use the eight commands that answer most connectivity questions
- Work through five broken scenarios and identify the layer each fault lives at
- Document a fix so the next person does not repeat the investigation

---

## Part 1 — The method

{{< step num="1" dev="—" title="Seven steps, and the two everybody skips" open="true" >}}
1. **Define the problem.** Precisely. "The internet is down" is not a problem statement. "PC1 in VLAN 10 cannot reach 10.0.30.10 on TCP 443, since 09:15, while PC2 in VLAN 20 can" is.
2. **Gather information.** What changed? Who else is affected? Does it fail from everywhere or from one place?
3. **Analyse.** Which layers could produce *this specific* symptom? Rule out what the evidence excludes.
4. **Eliminate.** Narrow to one or two candidates before touching anything.
5. **Propose a hypothesis.** State it out loud: "I think the ACL on R2 is dropping it."
6. **Test the hypothesis.** **One change at a time.** If it does not fix it, **put it back.**
7. **Solve and document.** Fix it, verify it, write down what it was.

**Step 1 and step 7 are the ones people skip**, and skipping either costs more than the rest combined. An undefined problem cannot be confirmed fixed; an undocumented fix is investigated again in six months by someone who was not there.

The rule that saves the most time is in step 6: **one change at a time, and revert anything that did not help.** Three simultaneous changes that fix the problem leave you not knowing which one mattered, and two of them are now permanent unexplained deviations from your standard.
{{< /step >}}

{{< step num="2" dev="—" title="Which approach for which symptom" >}}
| Approach | How | Best when |
|---|---|---|
| **Bottom-up** | start at Layer 1, work up | a **hardware** or physical fault is likely; a new install |
| **Top-down** | start at Layer 7, work down | **one application** is broken and everything else works |
| **Divide and conquer** | start in the middle, usually Layer 3 | **you have no idea** — the default |
| **Follow the path** | trace the packet hop by hop | the topology is known and the fault is somewhere along it |
| **Spot the difference** | compare a working device with a broken one | it works **here** and not **there** |
| **Swap components** | substitute a known-good part | physical layer, and you have a spare |

**Divide and conquer is the right default**, and Layer 3 is the right place to start because `ping` is a single command that tests everything below it. A successful ping eliminates Layers 1, 2 and 3 in one go; a failed one tells you the fault is at or below Layer 3, which halves the search space immediately.

**Spot the difference** is the most under-used and often the fastest. If PC2 works and PC1 does not, on the same switch, the answer is in the difference between them — and `show running-config interface` on both, side by side, usually shows it in seconds.

The layer-by-layer checklist:

| Layer | Check | Command |
|---|---|---|
| **1 Physical** | link, cable, SFP, power | `show interfaces status`, `show interfaces` counters |
| **2 Data link** | VLAN, trunk, STP, MAC, duplex | `show vlan brief`, `show interfaces trunk`, `show mac address-table` |
| **3 Network** | address, mask, gateway, route, ACL | `show ip interface brief`, `show ip route`, `show access-lists` |
| **4 Transport** | port reachable, firewall | `telnet <ip> <port>` |
| **7 Application** | DNS, service running | `nslookup`, service logs |
{{< /step >}}

---

## Part 2 — The eight commands

{{< step num="3" dev="—" title="What each one proves, and what it does not" open="true" >}}
**1. `ping`** — Layers 1 through 3 in one step.

```
R1#ping 10.0.30.10 source 10.0.10.1 repeat 100 size 1400 df-bit
```

The response characters each mean something specific:

| Char | Meaning |
|---|---|
| `!` | reply received |
| `.` | timed out — no reply, or the reply was lost |
| `U` | **destination unreachable** — a router had no route |
| **`M`** | **fragmentation needed but DF set** — an MTU problem |
| `Q` | source quench |
| `?` | unknown packet type |
| `&` | TTL exceeded |

`U` and `M` are the valuable ones. `U` means a router in the path told you it could not route the packet — that is far more information than a timeout. `M` means MTU, which is the fault that makes small packets work and large ones fail (Lab 33).

**Always specify the source** when pinging from a router. Without it the ping is sourced from the outgoing interface, which can succeed while the LAN prefix has no return route.

**2. `traceroute`** — where it stops.

```
R1#traceroute 10.0.30.10 source 10.0.10.1
  1  10.0.12.2  4 msec  0 msec  0 msec
  2   *  *  *
  3   *  *  *
```

The last responding hop is the last router that could return an ICMP Time Exceeded. The fault is at that hop or the next one — but be careful: **stars do not always mean failure.** A router configured with `no ip unreachables`, or an ACL blocking ICMP, produces stars while forwarding traffic perfectly. Trust a traceroute that completes; treat one that does not as a hint rather than a conclusion.

**3. `show ip interface brief`** — the first command on any router.

```
R1#show ip interface brief | exclude unassigned
```

Address present, `up/up`. Two failures found instantly: an interface that is administratively down, and an address that is not what you thought.

**4. `show ip route <destination>`** — runs the actual lookup.

```
R1#show ip route 10.0.30.10
Routing entry for 10.0.30.0/24
  Known via "ospf 1", distance 110, metric 3
  Routing Descriptor Blocks:
  * 10.0.12.2, from 2.2.2.2, 00:14:22 ago, via GigabitEthernet0/1
```

Better than reading the whole table, because it applies longest-prefix match for you. `% Network not in table` is a complete answer.

**5. `show interfaces <int>`** — the counters.

```
R1#show interfaces GigabitEthernet0/1 | include error|drop|collision|duplex
```

CRC, input errors, late collisions, output drops. A link that is `up/up` and dropping frames is only visible here.

**6. `show mac address-table address <mac>`** — is the host even connected?

```
SW1#show mac address-table address 0001.6431.a201
```

Nothing returned means the switch has never seen a frame from that host — which is a Layer 1 or Layer 2 problem, not the routing problem it was reported as.

**7. `show ip arp`** — Layer 2 to Layer 3 resolution.

```
R1#show ip arp 10.0.10.50
```

`Incomplete` means the ARP went out and nothing answered: wrong VLAN, host down, or an ACL.

**8. `debug`** — last resort, and always with a plan to turn it off.

```
R1#debug ip packet detail
R1#undebug all
```

On a production router, `debug ip packet` without an ACL filter can generate enough output to make the device unresponsive. Filter it:

```
R1(config)#access-list 100 permit ip host 10.0.10.50 host 10.0.30.10
R1#debug ip packet 100
```
{{< /step >}}

---

## Part 3 — Five broken scenarios

{{< step num="4" dev="—" title="Scenario 1 — PC1 cannot reach anything, PC2 is fine" open="true" >}}
**Symptom.** PC1 in VLAN 10 has no connectivity at all. PC2 in VLAN 20, same switch, works.

**Approach.** Spot the difference — same switch, same uplink, one works.

```
PC1> ipconfig
   IP Address......................: 169.254.14.201
```

**169.254.x.x is APIPA** — the host asked for DHCP and got nothing. That single line moves the investigation from "no connectivity" to "DHCP", which is a much smaller problem.

```
SW1#show vlan brief | include Fa0/1
10   ENGINEERING     active    Fa0/2, Fa0/3
```

Fa0/1 is **not in VLAN 10**. Check it:

```
SW1#show interfaces FastEthernet0/1 switchport | include Access Mode
Access Mode VLAN: 1 (default)
```

**The port is in VLAN 1.** Somebody reset it, or it was never configured. There is no DHCP relay for VLAN 1, so no address.

```
SW1(config)#interface FastEthernet0/1
SW1(config-if)#switchport mode access
SW1(config-if)#switchport access vlan 10
```

**The lesson:** the reported symptom was Layer 3 ("no internet"). The fault was Layer 2. Starting at Layer 3 and working down found it in three commands; starting by checking routes would have found nothing.
{{< /step >}}

{{< step num="5" dev="—" title="Scenario 2 — ping works, HTTP does not" >}}
**Symptom.** PC1 can ping 10.0.30.10. A browser to `http://10.0.30.10` times out.

**Approach.** Top-down. Ping succeeded, so Layers 1 to 3 are proven. The fault is at 4 or above.

Test Layer 4 directly — `telnet` to a port is the poor man's port scanner and is available everywhere:

```
PC> telnet 10.0.30.10 80
Trying 10.0.30.10 ...
% Connection refused by remote host
```

Refused, not timed out. Those are different: **refused** means something answered with a TCP RST — the host is up and nothing is listening, or a device sent the reset. **Timed out** means nothing came back at all, which points at a filter that drops silently.

```
R2#show access-lists
Extended IP access list SERVER-POLICY
    10 permit tcp any host 10.0.30.10 eq 443 (12 matches)
    20 permit icmp any host 10.0.30.10 echo (48 matches)
    30 deny ip any 10.0.30.0 0.0.0.255 log (24 matches)
    40 permit ip any any (2104 matches)
```

The ACL permits **443 and ICMP** and nothing else. Port 80 falls through to the deny at line 30 — and the 24 matches on that line are the proof.

**The lesson:** *ping working is not evidence that anything else works.* ICMP was explicitly permitted; TCP 80 was not. An ACL that permits ICMP for troubleshooting is a common and useful thing to do, and it makes ping a misleading test.
{{< /step >}}

{{< step num="6" dev="—" title="Scenario 3 — intermittent, only under load" >}}
**Symptom.** File transfers between sites are slow and occasionally fail. Ping is 100% and latency is normal.

**Approach.** Bottom-up. "Works small, fails large" is a Layer 1 or MTU signature.

```
R1#ping 10.0.30.10 size 100 repeat 100
!!!!!!!!!!!!!!!!!!!!  Success rate is 100 percent

R1#ping 10.0.30.10 size 1400 repeat 100
!!!!!!.!!!!!!.!!!!!.  Success rate is 94 percent
```

Small packets fine, large packets dropping. Now the counters:

```
R1#show interfaces GigabitEthernet0/1 | include error|CRC|collision
     1842 input errors, 1842 CRC, 0 frame, 0 overrun, 0 ignored
     0 output errors, 0 collisions, 0 interface resets
```

**CRC errors with no collisions.** Frames are arriving corrupted. Large frames are statistically more likely to be hit, which is exactly why size matters.

CRC with **no** collisions means a physical problem — a bad cable, a failing SFP, or interference. CRC **with** late collisions would mean a duplex mismatch (Lab 02), which is a different fix entirely.

```
R1#clear counters GigabitEthernet0/1
```

Then re-test after replacing the cable. Clearing first is what makes the retest meaningful.

**The lesson:** ping with the default 100-byte packet proves almost nothing about a link. Vary the size, and read the counters.
{{< /step >}}

{{< step num="7" dev="—" title="Scenario 4 — it works one way" >}}
**Symptom.** R1 can ping the server. The server cannot ping R1's LAN.

**Approach.** Follow the path — in both directions, separately.

```
R1#ping 10.0.30.10 source 10.0.10.1
.....
Success rate is 0 percent
```

The unsourced ping worked and the sourced one does not. That is the whole diagnosis in one line: the **outbound** path is fine and the **return** path for 10.0.10.0/24 is not.

```
R2#show ip route 10.0.10.1
% Network not in table
```

R2 has no route back. Traffic reaches the server; the reply is dropped by R2 for want of a route.

```
R2(config)#ip route 10.0.10.0 255.255.255.0 10.0.12.1
```

**The lesson:** **always ping with `source`.** An unsourced ping from a router uses the outgoing interface address, which is in a subnet the far end certainly knows about — so it succeeds while the LAN behind the router is unreachable. It is the single most misleading test in networking, and specifying the source removes the ambiguity entirely.
{{< /step >}}

{{< step num="8" dev="—" title="Scenario 5 — worked yesterday, not today" >}}
**Symptom.** Everything worked on Friday. On Monday, VLAN 20 cannot reach anything.

**Approach.** What changed? That is the first question and it is often the only one needed.

```
R1#show logging | include CONFIG_I
Sep  5 16:42:11 AEST: %SYS-5-CONFIG_I: Configured from console by admin on vty0 (10.0.10.55)
```

Somebody configured the router on Friday afternoon at 16:42. And:

```
R1#show archive log config all
 idx   sess           user@line      Logged command
   12     3        admin@vty0        | interface GigabitEthernet0/0.20
   13     3        admin@vty0        |  shutdown
```

A sub-interface was shut. Nothing else about the configuration is wrong.

```
R1(config)#interface GigabitEthernet0/0.20
R1(config-if)#no shutdown
```

**The lesson:** **"what changed?" is the highest-yield question in troubleshooting**, and answering it requires that the change was recorded. That is why Lab 24's `service timestamps` and Lab 26's `archive log config` are worth configuring before you need them. Without them this scenario is an hour of comparing configurations; with them it is two commands.
{{< /step >}}

---

## Part 4 — Document it

{{< step num="9" dev="—" title="Four lines, written while it is fresh" >}}
```
Date:      2026-09-06 14:30 AEST
Symptom:   PC1 (VLAN 10, SW1 Fa0/1) had no connectivity. PC2 (VLAN 20) unaffected.
Diagnosis: Fa0/1 was in VLAN 1, not VLAN 10, so no DHCP relay applied
           and the host self-assigned 169.254.14.201.
           Found with: show interfaces Fa0/1 switchport
Fix:       switchport access vlan 10 on SW1 Fa0/1. Saved.
Prevent:   Add Fa0/1-24 to the standard access-port template; audit
           for ports still in VLAN 1 across the access layer.
```

Four fields — symptom, diagnosis, fix, prevention — and the last one is the one that stops the ticket recurring.

The habit worth building: **write the diagnosis line as soon as you find the cause, before you apply the fix.** Once it is fixed, the detail evaporates from memory within the hour, and what gets written down is "port was in the wrong VLAN" without the command that found it — which is the part the next person needs.
{{< /step >}}

---

## The symptom-to-cause table

| Symptom | Likely layer | First command |
|---|---|---|
| No IP address (169.254.x.x) | 2/3 | `show vlan brief`, check DHCP helper |
| Local works, remote fails | 3 | `ipconfig` — default gateway |
| Remote works, local fails | 3 | mask mismatch |
| Ping works, application does not | 4+ | `show access-lists`, `telnet <ip> <port>` |
| Small packets work, large fail | 1 / MTU | `ping size 1400 df-bit`, CRC counters |
| Works one way only | 3 | `ping source <lan-ip>`, check the return route |
| Slow only under load | 1/2 | duplex, CRC, late collisions |
| Intermittent, cyclical | 2 | STP flapping, `show spanning-tree detail` |
| Everything on one switch | 1/2 | uplink, trunk, `show interfaces trunk` |
| Broke after a change | any | `show logging \| include CONFIG_I` |
| One VLAN leaks into another | 2 | native VLAN mismatch |
| Worked before a reload | any | config not saved |

## Exam notes

- **Define the problem precisely first**, and **document the fix last**. Both are testable steps.
- **One change at a time**, and revert anything that did not help.
- **Divide and conquer at Layer 3** is the default; **top-down** when one application is broken; **bottom-up** for physical faults.
- Ping characters: `!` reply, `.` timeout, **`U` unreachable**, **`M` fragmentation needed / DF set**.
- **Always use `source` when pinging from a router** — an unsourced ping hides missing return routes.
- `show ip route <address>` performs the real longest-prefix lookup.
- Stars in a traceroute may mean filtered ICMP, not a failure.
- **CRC without collisions** = physical. **CRC with late collisions** = duplex mismatch.
- **169.254.x.x** = DHCP failed. **Connection refused** ≠ **timed out**.
- `%SYS-5-CONFIG_I` in the log answers "what changed?".

---

*Sources: Flackbox CCNA Lab Guide 13 & 18 · Jeremy's IT Lab Day 11 · verified in Packet Tracer 8.2.*
