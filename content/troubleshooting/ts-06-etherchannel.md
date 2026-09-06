---
title: "EtherChannel"
date: 2026-09-06
description: "Why a bundle forms with fewer links than you configured, or does not form at all: the parameter-matching rule, LACP and PAgP mode combinations, the suspended and stand-alone states, and load balancing that leaves one link saturated."
tags: ["Troubleshooting", "EtherChannel", "LACP", "PAgP", "Port-channel", "Cisco"]
categories: ["Troubleshooting"]
unit: 3
---

EtherChannel faults are quiet. The links stay up, spanning tree stays happy, traffic keeps flowing — over one member instead of four, or over the wrong four out of eight. Nothing is down and nothing is logged unless you go looking, and the first sign is usually a capacity complaint rather than an outage.

The reason is that a port which fails to qualify for a bundle does not fail loudly; it operates on its own. That has one genuinely dangerous variant — an `on`-mode port operating independently at both ends of a redundant pair is a bridging loop — and one merely wasteful one, which is most of them.

## Symptom table

| Symptom | Likely cause | Confirm with |
|---|---|---|
| Bundle shows fewer members than configured | one port's parameters differ from the others | `show etherchannel summary` flags |
| Port shows `(I)` — stand-alone | the far end is not running a compatible protocol | `show etherchannel summary` on both ends |
| Port shows `(s)` — suspended | LACP formed, then a parameter mismatch was found | `show etherchannel <n> detail` |
| No port-channel at all | both ends passive (`auto`/`auto` or `passive`/`passive`) | `show running-config interface` |
| Channel up but throughput sits at one link's worth | load-balancing hash unsuited to the traffic | `show etherchannel load-balance` |
| Ports err-disabled with `channel-misconfig` | one side is `on`, the other negotiating | `show interfaces status err-disabled` |
| Bundle formed but VLANs missing across it | trunk allowed list applied to a member, not the Po | `show interfaces port-channel1 trunk` |

---

## Everything must match, or the port sits it out

An EtherChannel is one logical link, so the switch will not put a port into it unless that port is interchangeable with the ones already there. The comparison covers more than most people expect:

| Must be identical across members | Why |
|---|---|
| Speed | frames would arrive out of order across links of different rates |
| Duplex | same |
| Port mode — access or trunk | one logical link cannot be both |
| Access VLAN (on access ports) | a single logical port has one VLAN |
| Trunk allowed VLAN list | the bundle carries one list, not a union of lists |
| Native VLAN | untagged traffic must land in one VLAN |
| Trunk encapsulation | 802.1Q and ISL cannot be mixed in a bundle |
| STP cost and port priority | one logical port, one set of STP parameters |

**A port that fails the comparison is not rejected with an error at configuration time.** It is accepted into the channel group, evaluated, and then left out of the bundle — running as an ordinary independent switchport. The configuration reads as though four links are bundled; the operational state has three.

IOS does log it, and the message names the exact parameter, which makes it the single most useful line in the whole investigation:

```
%EC-5-CANNOT_BUNDLE2: Gi0/4 is not compatible with Gi0/1 and will be
suspended (trunk mode of Gi0/4 is access, Gi0/1 is trunk)
```

```
%EC-5-CANNOT_BUNDLE_LACP: Gi0/3 is not compatible with aggregators in
channel 1 and cannot attach to them (speed of Gi0/3 is 100M, Gi0/1 is 1000M)
```

If the log has rolled, the same conclusion comes from `show etherchannel <n> detail`:

```
SW1#show etherchannel 1 detail | include Probable
Probable reason: incompatible partner key
```

**Always read `Probable reason:`.** It is buried in a long output and it usually states the cause outright.

### Configure the port-channel, not the members

The habit that prevents most of these faults is to apply shared configuration to the logical interface. Changes made to `interface Port-channel1` are pushed down to every member automatically, which keeps them identical by construction:

```
SW1(config)#interface Port-channel1
SW1(config-if)#switchport trunk encapsulation dot1q
SW1(config-if)#switchport mode trunk
SW1(config-if)#switchport trunk allowed vlan 1,10,20,99
SW1(config-if)#switchport trunk native vlan 99
```

Configuring a member directly is what breaks the symmetry. And when comparing, compare the running configuration of the members rather than trusting memory — `show run interface` is the definitive answer to "are these two ports the same":

```
SW1#show running-config interface GigabitEthernet0/1
interface GigabitEthernet0/1
 switchport trunk encapsulation dot1q
 switchport trunk allowed vlan 1,10,20,99
 switchport mode trunk
 channel-group 1 mode active
end

SW1#show running-config interface GigabitEthernet0/4
interface GigabitEthernet0/4
 switchport trunk encapsulation dot1q
 switchport trunk allowed vlan 1,10,20
 switchport mode trunk
 channel-group 1 mode active
end
```

VLAN 99 is missing from Gi0/4. That is enough — the port will not bundle, and the reason is one number in a list nobody reads carefully.

---

## Reading show etherchannel summary

This is the first command and often the only one needed. The header explains itself, which is unusual and worth using:

```
SW1#show etherchannel summary
Flags:  D - down        P - bundled in port-channel
        I - stand-alone s - suspended
        H - Hot-standby (LACP only)
        R - Layer3      S - Layer2
        U - in use      N - not in use, no aggregation
        f - failed to allocate aggregator
        M - not in use, minimum links not met
        u - unsuitable for bundling
        w - waiting to be aggregated
        d - default port

Number of channel-groups in use: 1
Number of aggregators:           1

Group  Port-channel  Protocol    Ports
------+-------------+-----------+-----------------------------------------------
1      Po1(SU)         LACP      Gi0/1(P)  Gi0/2(P)  Gi0/3(I)  Gi0/4(s)
```

The flags on the port-channel itself and on each member answer different questions:

| Flag | On the port-channel | On a member |
|---|---|---|
| `S` | Layer 2 channel | — |
| `R` | Layer 3 (routed) channel | — |
| `U` | in use, at least one member bundled | — |
| `D` | the channel is down | the port is down |
| `M` | `port-channel min-links` not satisfied | — |
| `P` | — | **bundled — the only good state** |
| `I` | — | **stand-alone** — no compatible partner detected |
| `s` | — | **suspended** — a partner exists but rejected the port |
| `H` | — | hot standby, beyond LACP's eight active links |
| `w` | — | waiting to aggregate, transient |
| `u` | — | unsuitable — a local parameter disqualifies it |
| `d` | — | default port |

`Po1(SU)` with `Gi0/1(P)` and `Gi0/2(P)` is a healthy Layer 2 channel of two links. The other two ports in that output are two different faults sharing one line.

### `(I)` — stand-alone

Nothing on the far end is speaking the protocol this port expects. Either LACP was never configured over there, or it was configured with PAgP, or the far end is in `on` mode and sending nothing at all.

```
%EC-5-L3DONTBNDL2: Gi0/3 suspended: LACP currently not enabled on the
remote port.
```

**A stand-alone port still forwards traffic.** It is an ordinary switchport that happens to sit next to a bundle. On a pair of switches with two links, one bundled and one stand-alone, spanning tree sees two paths and blocks one — which is fine. In `on` mode there is no protocol and no way for the switch to know a port is stranded, so both ends forward and the result is a loop. That is the case worth being careful about.

### `(s)` — suspended

Suspended is more informative than stand-alone: a partner **was** found, the negotiation happened, and the port was rejected. That points at a parameter mismatch rather than a protocol mismatch — go back to `show run interface` on both ends and diff them.

LACP also suspends a port whose partner key does not match, which is the `incompatible partner key` message above and usually means the far end has the ports in a different channel group.

### `(H)` — hot standby

LACP supports 16 ports per channel with only **8 forwarding**; the rest wait as hot standby. PAgP supports 8. A ninth port showing `H` is not a fault. Which eight become active is decided by LACP port priority, lower winning:

```
SW1(config)#interface GigabitEthernet0/9
SW1(config-if)#lacp port-priority 100   ! lower value = preferred as active
```

---

## Which mode combinations form a channel

Three ways to build a bundle, and they do not mix.

| Protocol | Standard | Active mode | Passive mode |
|---|---|---|---|
| **LACP** | IEEE 802.3ad | `active` | `passive` |
| **PAgP** | Cisco proprietary | `desirable` | `auto` |
| **Static** | none | `on` | — |

The rule is that **at least one end must be active**, and both ends must use the same protocol:

| Local | Remote | Result |
|---|---|---|
| `active` | `active` | channel forms |
| `active` | `passive` | channel forms |
| **`passive`** | **`passive`** | **no channel** — both waiting |
| `desirable` | `desirable` | channel forms |
| `desirable` | `auto` | channel forms |
| **`auto`** | **`auto`** | **no channel** — both waiting |
| `on` | `on` | channel forms, with no negotiation |
| **`on`** | **`active` / `passive` / `desirable` / `auto`** | **no channel** |
| **`active`** | **`desirable`** | **no channel** — LACP against PAgP |

Two rows deserve emphasis. `passive`/`passive` and `auto`/`auto` fail for the same reason a `dynamic auto` trunk pair fails: both sides will answer a proposal and neither will make one.

And `on` at one end against anything negotiated at the other is the dangerous combination, because the `on` side bundles regardless. It has no protocol, no partner, and no way to discover that the far end never joined — so it starts load-balancing frames across links the far end treats as independent. Spanning tree's misconfiguration guard exists specifically for this:

```
SW1(config)#spanning-tree etherchannel guard misconfig
```

```
%PM-4-ERR_DISABLE: channel-misconfig (STP) error detected on Po1, putting
Gi0/1 in err-disable state
```

```
SW1#show interfaces status err-disabled

Port      Name               Status       Reason               Err-disabled Vlans
Gi0/1     ## uplink SW2 ##   err-disabled channel-misconfig (STP)
```

Set the protocol explicitly so a later `channel-group` typo cannot select the wrong one:

```
SW1(config)#interface range GigabitEthernet0/1 - 4
SW1(config-if-range)#channel-protocol lacp
SW1(config-if-range)#channel-group 1 mode active
```

```
SW2(config)#interface range GigabitEthernet0/1 - 4
SW2(config-if-range)#channel-protocol lacp
SW2(config-if-range)#channel-group 1 mode passive
```

`show etherchannel port-channel` confirms what the bundle actually agreed on, including which protocol won and which ports are carrying traffic:

```
SW1#show etherchannel port-channel

                Channel-group listing:
                ----------------------
Group: 1
----------
                Port-channels in the group:
                ---------------------------
Port-channel: Po1    (Primary Aggregator)
Age of the Port-channel   = 0d:04h:12m:33s
Logical slot/port         = 2/1          Number of ports = 2
GC                        = 0x00010001   HotStandBy port = null
Protocol                  =   LACP
Port security             = Disabled

Ports in the Port-channel:

Index   Load   Port     EC state        No of bits
------+------+------+------------------+-----------
  0     55     Gi0/1    Active             4
  1     AA     Gi0/2    Active             4
```

The `Load` column is a hexadecimal bitmask of which hash buckets each port serves, and `No of bits` is how many of the eight buckets it owns. Four and four across two ports is an even split. That column is the bridge to the next section.

---

## Load balancing that leaves one link idle

An EtherChannel does not spread packets across links. It hashes selected fields of each frame into one of **eight buckets** and pins that bucket to a member port. Every frame in a given conversation therefore takes the same link, which is deliberate — it preserves ordering — and it is also why a channel can be saturated on one member while the others idle.

Two independent things go wrong.

**The hash input suits the traffic badly.** The default on many platforms is `src-mac`. On an access switch with hundreds of hosts that distributes well. On the uplink from a distribution switch to a router, every frame has the *same* source MAC — the router's — so all traffic hashes to one bucket and one link. A four-link channel delivers one link's worth of throughput and the other three carry nothing.

```
SW1#show etherchannel load-balance
EtherChannel Load-Balancing Configuration:
        src-mac

EtherChannel Load-Balancing Addresses Used Per-Protocol:
Non-IP: Source MAC address
  IPv4: Source MAC address
  IPv6: Source MAC address
```

```
SW1(config)#port-channel load-balance src-dst-ip
```

Choose the field that actually varies on that link. Between switches carrying many hosts, `src-dst-mac` or `src-dst-ip`. Toward a router or a firewall, `src-dst-ip` at minimum. Toward a single server — a backup target, a database — even IP addresses are constant, and only `src-dst-port` distinguishes the sessions.

You can test the decision before committing to it:

```
SW1#test etherchannel load-balance interface Port-channel1 ip 10.0.10.50 10.0.30.10
Would select Gi0/1 of Po1
```

Run it with several representative address pairs. If they all return the same member, the hash is wrong for this traffic.

**The member count does not divide eight.** The eight buckets are shared as evenly as the arithmetic allows:

| Members | Buckets per link | Result |
|---|---|---|
| 2 | 4 + 4 | even |
| 4 | 2 each | even |
| 8 | 1 each | even |
| **3** | **3 + 3 + 2** | one link carries 25% less |
| **5** | **2 + 2 + 2 + 1 + 1** | two links carry half of the others |
| **6** | **2 + 2 + 2 + 1 + 1 + 1** | uneven |

**Build channels in powers of two.** A three-link channel is not 50% more capacity than a two-link one under a hash that assumes even distribution; it is an uneven bundle whose busiest member saturates first.

Finally, a load-balancing method is a **local** decision. Each switch hashes its own outbound traffic, so the two ends may legitimately be configured differently — and often should be, since the traffic patterns in each direction are not the same.

---

## Quick reference

| Command | What it proves |
|---|---|
| `show etherchannel summary` | which ports bundled (`P`) and which did not (`I`, `s`, `H`, `u`) |
| `show etherchannel <n> detail` | `Probable reason:` — the negotiation's own explanation |
| `show etherchannel port-channel` | the agreed protocol, active members, and hash bucket split |
| `show etherchannel load-balance` | the hash inputs in use, per protocol family |
| `test etherchannel load-balance interface Po1 ip <a> <b>` | which member a given flow would take |
| `show running-config interface <int>` | the definitive diff between two members |
| `show interfaces port-channel1 trunk` | the allowed VLAN list the bundle is actually using |
| `show interfaces status err-disabled` | ports shut by `channel-misconfig` |
| `show logging \| include EC-5` | the parameter that disqualified a port, named explicitly |

| Fault | Fix |
|---|---|
| One member missing from the bundle | diff `show run interface`; correct the differing parameter |
| Member shows `(I)` | configure the same protocol at the far end |
| Member shows `(s)` | parameter or partner-key mismatch — check the far end's channel group |
| No channel at all | one end must be `active` or `desirable` |
| `channel-misconfig` err-disable | one end is `on`; make both ends `on`, or both negotiate |
| Throughput stuck at one link | change `port-channel load-balance` to a field that varies |
| Uneven link utilisation | build the channel with 2, 4 or 8 members |

---

*Based on the NetworkLessons troubleshooting series: EtherChannel on Cisco IOS.*
