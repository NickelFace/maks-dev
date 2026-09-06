---
title: "Method and the Diagnostic Toolkit"
date: 2026-09-06
description: "Five structured approaches, and what ping, traceroute and conditional debug each actually prove — including the cases where a successful test means nothing."
tags: ["Troubleshooting", "Methodology", "Ping", "Traceroute", "Cisco"]
categories: ["Troubleshooting"]
unit: 1
---

Every fault in the rest of this section is easier once you have decided *where* to look. That decision is the method, and it is worth being deliberate about — because the alternative is trying things, and trying things is how a two-command fix becomes a two-hour outage with six unexplained configuration changes left behind.

## Five approaches

| Approach | How it works | Use it when |
|---|---|---|
| **Bottom-up** | start at Layer 1 and climb | a physical fault is likely; a new installation; "it has never worked" |
| **Top-down** | start at Layer 7 and descend | **one application** is broken and everything else is fine |
| **Divide and conquer** | start in the middle, usually Layer 3 | you have no strong hypothesis — **the default** |
| **Follow the path** | trace the packet hop by hop | the topology is known and the fault is somewhere along it |
| **Spot the difference** | compare a working device with a broken one | it works *here* and not *there* |

**Divide and conquer is the right default**, and Layer 3 is the right entry point because a single `ping` tests everything beneath it. A reply proves Layers 1, 2 and 3 in one command; no reply halves the search space immediately.

**Spot the difference is the most under-used.** If one of two identically-built switches misbehaves, the answer is in the diff. `show running-config interface` on both, side by side, usually finds it faster than any amount of reasoning about protocols.

The two steps people skip are the first and the last: **define the problem precisely**, and **write down what it was**. An undefined problem cannot be confirmed fixed, and an undocumented fix is investigated again in six months by someone who was not there.

And the rule that saves the most time: **one change at a time, and revert anything that did not help.**

---

## Ping

Ping proves Layers 1 through 3 and nothing above them. That limitation is the source of a great deal of wasted effort — an ACL that permits ICMP for troubleshooting makes ping succeed while every application is blocked.

```
R1#ping 10.0.30.10 source 10.0.10.1 repeat 100 size 1400 df-bit
```

The response characters, each of which means something specific:

| Char | Meaning | What it tells you |
|---|---|---|
| `!` | reply received | success |
| `.` | timed out | no reply, or the reply was lost — ambiguous |
| **`U`** | **destination unreachable** | a router in the path had no route, or an ACL dropped it |
| **`M`** | **fragmentation needed, DF set** | an **MTU problem** somewhere in the path |
| `Q` | source quench | the destination is congested |
| `&` | TTL exceeded | a routing loop |
| `?` | unknown packet type | rare; malformed reply |

`U` and `M` are worth far more than a timeout, because they are *replies* — some device in the path told you why. A wall of dots tells you nothing except that something, somewhere, is silent.

### Two habits that make ping useful

**Always specify the source when pinging from a router.** Without it, the ping is sourced from the outgoing interface — which is in a subnet the far end certainly knows about. It will succeed while the LAN behind the router is completely unreachable, because the far end has no return route for it. This is the single most misleading test in networking:

```
R1#ping 10.0.30.10                      ! sourced from the WAN interface — proves little
R1#ping 10.0.30.10 source 10.0.10.1     ! sourced from the LAN — proves the return path
```

**Vary the size.** A default 100-byte ping proves almost nothing about a link that carries 1500-byte frames. If small pings work and large ones do not, the problem is MTU or a physical fault, and you have found it in two commands:

```
R1#ping 10.0.30.10 size 100 repeat 100 df-bit
R1#ping 10.0.30.10 size 1400 repeat 100 df-bit
```

### Extended ping

The interactive form exposes options the single-line version does not:

```
R1#ping
Protocol [ip]:
Target IP address: 10.0.30.10
Repeat count [5]: 100
Datagram size [100]: 1400
Timeout in seconds [2]:
Extended commands [n]: y
Source address or interface: Loopback0
Type of service [0]:
Set DF bit in IP header? [no]: yes
Validate reply data? [no]:
Data pattern [0xABCD]:
Sweep range of sizes [n]: y
Sweep min size [36]: 1400
Sweep max size [18024]: 1550
Sweep interval [1]: 10
```

**Sweep** is the MTU finder: it sends progressively larger packets and shows exactly where they stop getting through. On a path with a tunnel or a carrier with a reduced MTU, this identifies the boundary in one command.

---

## Traceroute

Traceroute exploits TTL. It sends a packet with TTL 1, collects the **ICMP Time Exceeded** from the first router, then TTL 2, and so on — building the path one hop at a time.

```
R1#traceroute 10.0.30.10 source 10.0.10.1
  1  10.0.12.2  4 msec  0 msec  0 msec
  2   *  *  *
  3   *  *  *
```

The last responding hop is the last router that could return a Time Exceeded. The fault is at that hop or the next one.

**Stars do not necessarily mean failure.** Three things produce them and only one is a problem:

- The router has `no ip unreachables` configured — common hardening, and it silences traceroute entirely
- An ACL blocks ICMP somewhere in the path
- The packet genuinely stopped there

So: **trust a traceroute that completes; treat one that does not as a hint.** Confirm with something else before acting on it.

Two more details worth knowing. A traceroute hop shows the router's **ingress** interface address, because the Time Exceeded is sourced from the interface the packet arrived on — which is why the addresses in a trace do not always match the ones in your diagram. And the implementations differ:

| Platform | Probe | Notes |
|---|---|---|
| **Cisco IOS** | UDP, ports 33434+ | `traceroute` |
| **Linux / macOS** | UDP by default, `-I` for ICMP | `traceroute` |
| **Windows** | **ICMP echo** | `tracert` |

That difference matters when a firewall permits ICMP and blocks high UDP: `tracert` from Windows works and `traceroute` from a router does not, on the identical path.

---

## Conditional debug

`debug` is the last resort, and on a production router an unfiltered debug can generate enough output to make the device unresponsive. Conditional debugging fixes that by restricting the output to traffic you care about.

```
R1#debug condition interface GigabitEthernet0/1
Condition 1 set

R1#debug ip packet detail
```

Conditions can be set on several attributes, and they are **AND**ed together:

```
R1#debug condition interface GigabitEthernet0/1
R1#debug condition ip 10.0.10.50
R1#debug condition mac-address 0001.6431.a201
R1#debug condition vlan 10
R1#debug condition username admin
```

Or filter `debug ip packet` with an ACL, which is the form to reach for first:

```
R1(config)#access-list 100 permit ip host 10.0.10.50 host 10.0.30.10
R1#debug ip packet 100 detail
```

**Always plan the exit before you start.** Removing conditions and stopping debugs are separate operations:

```
R1#show debug condition
R1#no debug condition interface GigabitEthernet0/1
R1#undebug condition all
R1#undebug all
```

`undebug all` stops the debugs. `undebug condition all` clears the conditions. Clearing conditions while a debug is still running turns a filtered debug into an unfiltered one — which is the opposite of what you wanted.

Send the output to the buffer rather than the console, so a flood cannot lock you out:

```
R1(config)#logging console warnings
R1(config)#logging buffered 65536 debugging
R1#show logging
```

---

## The eight commands

The set that answers most connectivity questions, and what each one actually proves:

| Command | Proves |
|---|---|
| `ping ... source ... size ... df-bit` | Layers 1–3, in both directions, at a given packet size |
| `traceroute ... source ...` | where the path stops — subject to ICMP filtering |
| `show ip interface brief` | address present, interface up/up |
| `show ip route <destination>` | the actual longest-prefix lookup result |
| `show interfaces <int>` | errors, drops, duplex, collisions |
| `show mac address-table address <mac>` | whether the switch has ever heard from the host |
| `show ip arp <ip>` | Layer 2 to Layer 3 resolution — `Incomplete` means no answer |
| `show logging \| include CONFIG_I` | **what changed** |

That last one deserves emphasis. **"What changed?" is the highest-yield question in troubleshooting**, and answering it requires that changes were recorded:

```
R1(config)#service timestamps log datetime msec localtime show-timezone
R1(config)#archive
R1(config-archive)#log config
R1(config-archive-log-cfg)#logging enable
R1(config-archive-log-cfg)#notify syslog
```

```
R1#show archive log config all
 idx   sess           user@line      Logged command
   12     3        admin@vty0        | interface GigabitEthernet0/0.20
   13     3        admin@vty0        |  shutdown
```

Two commands instead of an hour of configuration comparison — but only if it was configured before the outage.

---

## Symptom to starting point

| Symptom | Start at | First command |
|---|---|---|
| No IP address (169.254.x.x) | Layer 2 | `show vlan brief`, check the DHCP helper |
| Local works, remote fails | Layer 3 | `ipconfig` — is there a default gateway? |
| Remote works, local fails | Layer 3 | subnet mask mismatch on the host |
| Ping works, application does not | Layer 4+ | `show access-lists`, `telnet <ip> <port>` |
| Small packets work, large fail | Layer 1 / MTU | `ping size 1400 df-bit`; CRC counters |
| Works one way only | Layer 3 | `ping source <lan-ip>`; check the return route |
| Slow only under load | Layer 1/2 | duplex, CRC, late collisions |
| Intermittent and cyclical | Layer 2 | STP — `show spanning-tree detail` |
| Everything on one switch | Layer 1/2 | uplink, trunk — `show interfaces trunk` |
| Broke after a change | any | `show logging \| include CONFIG_I` |
| Worked before a reload | any | the configuration was never saved |

---

*Based on the NetworkLessons troubleshooting series: methodology, ping on Cisco IOS, traceroute, and conditional debug.*
