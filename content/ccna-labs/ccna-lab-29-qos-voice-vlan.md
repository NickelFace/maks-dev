---
title: "Lab 29 · QoS and Voice VLANs"
date: 2026-09-06
description: "Two VLANs down one cable to an IP phone, trust boundaries at the access port, and the queueing that decides which packet is dropped when the link is full."
tags: ["CCNA", "QoS", "Voice VLAN", "DSCP", "Lab"]
categories: ["CCNA"]
domain: 4
tool: "Packet Tracer"
duration: "45 min"
sources: "Jeremy's IT Lab Day 46, 47"
---

QoS does nothing until a link is congested. On an uncongested link every packet is forwarded immediately and the most elaborate policy in the world has no observable effect. What QoS decides is **which packet is dropped and which packet waits** when there is more traffic than bandwidth — and for voice, where 150 ms of one-way delay is the limit of acceptability, that decision is the whole service.

## Topology

{{< topology cols="3" rows="2" caption="A PC behind an IP phone on one cable, two VLANs, one trust boundary" >}}
pc     PC1 "VLAN 10 · data" at 0,0
phone  PHONE "VLAN 110 · voice" at 0,1
switch SW1 "trust boundary" at 1,0
router R1 "WAN edge" at 2,0

PC1 — PHONE
PHONE — SW1 label="Fa0/1"
SW1 — R1 label="trunk"
{{< /topology >}}

| VLAN | Purpose | Subnet |
|---|---|---|
| 10 | data | 10.0.10.0/24 |
| 110 | voice | 10.0.110.0/24 |

## Objectives

- Configure a voice VLAN and explain how one port carries two VLANs to an access device
- Identify the trust boundary and configure it correctly
- Read CoS and DSCP values and convert between the common ones
- Classify and mark traffic with a class-map and policy-map
- Explain the difference between policing and shaping, and between LLQ and CBWFQ

---

## Part 1 — Voice VLAN

{{< step num="1" dev="SW1" title="One cable, two VLANs, no trunk" open="true" >}}
```
SW1(config)#vlan 10
SW1(config-vlan)#name DATA
SW1(config-vlan)#exit
SW1(config)#vlan 110
SW1(config-vlan)#name VOICE
SW1(config-vlan)#exit
SW1(config)#interface FastEthernet0/1
SW1(config-if)#description ## phone + PC ##
SW1(config-if)#switchport mode access
SW1(config-if)#switchport access vlan 10
SW1(config-if)#switchport voice vlan 110
SW1(config-if)#spanning-tree portfast
SW1(config-if)#end
```

The port is an **access port** — `switchport mode access` — and yet it carries two VLANs. That looks contradictory and is not.

The switch tells the phone, over CDP or LLDP-MED, that the voice VLAN is 110. The phone then tags its own traffic with VLAN 110 and forwards the PC's frames untagged. The switch receives untagged frames and puts them in the access VLAN (10); it receives 802.1Q-tagged VLAN 110 frames and puts them in the voice VLAN.

Cisco documentation calls this a **multi-VLAN access port**. It is not a trunk: DTP does not run, and only those two specific VLANs are carried.

**The phone must be able to learn the voice VLAN**, which means CDP or LLDP-MED must be enabled on that port. If Lab 14's hardening disabled discovery on all access ports, phone ports have to be exempted — and the symptom of getting that wrong is a phone that boots, gets a data-VLAN address, and never registers.

Two other forms of the command:

```
SW1(config-if)#switchport voice vlan dot1p    ! phone tags with VLAN 0 — priority only, no separate VLAN
SW1(config-if)#switchport voice vlan none     ! phone sends untagged, in the data VLAN
```

`dot1p` is the option for a network with no separate voice subnet: the phone still marks its frames with a CoS value but does not use a distinct VLAN.
{{< /step >}}

{{< verify dev="SW1" cmd="show interfaces FastEthernet0/1 switchport" open="true" >}}
```
SW1#show interfaces FastEthernet0/1 switchport
Name: Fa0/1
Switchport: Enabled
Administrative Mode: static access
Operational Mode: static access
Access Mode VLAN: 10 (DATA)
Trunking Native Mode VLAN: 1 (default)
Voice VLAN: 110 (VOICE)
```

`Operational Mode: static access` with **`Voice VLAN: 110`** underneath — an access port carrying a second VLAN, exactly as designed.

Confirm the phone actually learned it:

```
SW1#show cdp neighbors FastEthernet0/1 detail | include VLAN|Platform
Platform: Cisco IP Phone 7960,  Capabilities: Host Phone
VTP Management Domain: ''
Native VLAN: 10
Voice VLAN: 110
```

And check the MAC table — both VLANs on the same physical port:

```
SW1#show mac address-table interface FastEthernet0/1

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
  10    0001.6431.a201    DYNAMIC     Fa0/1
 110    000d.bd12.9f40    DYNAMIC     Fa0/1
```
{{< /verify >}}

---

## Part 2 — Marking and the trust boundary

{{< step num="2" dev="—" title="CoS and DSCP — two markings at two layers" >}}
**CoS (Class of Service)** is 3 bits in the 802.1Q tag, values 0–7. It exists only on a trunk, because an untagged frame has no tag to carry it. **CoS is lost the moment a frame crosses a router.**

**DSCP (Differentiated Services Code Point)** is 6 bits in the IP header's ToS byte, values 0–63. It survives end to end, which is why it is what actually matters.

The values you must know:

| Traffic | CoS | DSCP name | DSCP value |
|---|---|---|---|
| Best effort | 0 | **DF** (default) | **0** |
| Scavenger | 1 | CS1 | 8 |
| Transactional data | 2 | AF21 | 18 |
| Call signalling | 3 | **CS3** | **24** |
| Video | 4 | AF41 | 34 |
| **Voice** | **5** | **EF** (Expedited Forwarding) | **46** |
| Network control | 6/7 | CS6/CS7 | 48/56 |

**EF = 46 for voice** and **CS3 = 24 for call signalling** are the two to memorise; they appear in every QoS question.

The naming scheme is systematic once you see it:

- **CSx** (Class Selector) = x × 8. CS3 = 24, CS6 = 48. These are backward-compatible with the old three-bit IP Precedence field.
- **AFxy** (Assured Forwarding) = x is the class (1–4), y is the drop precedence (1–3, higher drops first). AF41 = 34, AF11 = 10.
- **EF** = 46, a single value reserved for the lowest-latency queue.
{{< /step >}}

{{< step num="3" dev="SW1" title="The trust boundary — where marking becomes credible" open="true" >}}
```
SW1(config)#mls qos
SW1(config)#interface FastEthernet0/1
SW1(config-if)#mls qos trust device cisco-phone
SW1(config-if)#mls qos trust cos
SW1(config-if)#end
```

A marking is only meaningful if you believe whoever set it. A PC can mark every packet it sends as EF — and then a user's file transfer is scheduled ahead of a phone call.

The **trust boundary** is the point where markings start being believed. The correct place is **as close to the source as possible, but only for devices you control.**

`mls qos trust device cisco-phone` is conditional trust: the switch trusts CoS on this port **only while CDP confirms a Cisco phone is attached**. Unplug the phone and plug in a laptop, and the port stops trusting immediately.

That handles the phone. The PC behind it is handled by the phone itself:

```
SW1(config-if)#switchport priority extend cos 0
```

This tells the phone to **rewrite the PC's CoS to 0** before forwarding its frames. The phone becomes the enforcement point for the device behind it — the PC cannot mark its own traffic as priority no matter what it sets.

Untrusted ports — every ordinary user port — should mark down to zero:

```
SW1(config)#interface range FastEthernet0/2 - 24
SW1(config-if-range)#mls qos cos 0
SW1(config-if-range)#no mls qos trust
```

`mls qos` must be enabled globally first. Without it, the switch has one queue per port and every trust setting is inert.
{{< /step >}}

{{< verify dev="SW1" cmd="show mls qos interface" >}}
```
SW1#show mls qos interface FastEthernet0/1
FastEthernet0/1
trust state: trust cos
trust mode: trust cos
trust enabled flag: ena
COS override: dis
default COS: 0
DSCP Mutation Map: Default DSCP Mutation Map
Trust device: cisco-phone
qos mode: port-based
```

`trust state: trust cos` and `Trust device: cisco-phone` — conditional trust active. Unplug the phone and `trust state` falls back to `not trusted` within a CDP interval, which is the behaviour that makes conditional trust worth configuring over plain `mls qos trust cos`.

```
SW1#show mls qos
QoS is enabled
QoS ip packet dscp rewrite is enabled
```
{{< /verify >}}

---

## Part 3 — Classify, mark, queue

{{< step num="4" dev="R1" title="MQC: class-map, policy-map, service-policy" open="true" >}}
Cisco's Modular QoS CLI is three objects, always in the same order.

**1. Class-map — what traffic is this?**

```
R1(config)#class-map match-all VOICE
R1(config-cmap)#match ip dscp ef
R1(config-cmap)#exit
R1(config)#class-map match-all CALL-SIGNALLING
R1(config-cmap)#match ip dscp cs3
R1(config-cmap)#exit
R1(config)#class-map match-any BUSINESS-CRITICAL
R1(config-cmap)#match protocol citrix
R1(config-cmap)#match access-group name ERP-SERVERS
R1(config-cmap)#exit
```

`match-all` requires every condition; `match-any` requires one. The default is `match-all`, which is the wrong choice for a class listing alternatives — a class-map with two `match` lines and `match-all` will match nothing.

**2. Policy-map — what do I do with it?**

```
R1(config)#policy-map WAN-EDGE
R1(config-pmap)#class VOICE
R1(config-pmap-c)#priority percent 10
R1(config-pmap-c)#exit
R1(config-pmap)#class CALL-SIGNALLING
R1(config-pmap-c)#bandwidth percent 5
R1(config-pmap-c)#exit
R1(config-pmap)#class BUSINESS-CRITICAL
R1(config-pmap-c)#bandwidth percent 35
R1(config-pmap-c)#set ip dscp af21
R1(config-pmap-c)#exit
R1(config-pmap)#class class-default
R1(config-pmap-c)#fair-queue
R1(config-pmap-c)#random-detect
R1(config-pmap-c)#end
```

**3. Service-policy — where does it apply?**

```
R1(config)#interface GigabitEthernet0/1
R1(config-if)#service-policy output WAN-EDGE
R1(config-if)#end
```

**Almost always `output`.** Queueing decides what to send next on a congested link, and congestion happens on the way out. An inbound policy can police and mark but it cannot queue — the packet has already arrived.

The two bandwidth commands are genuinely different:

**`priority`** creates the **Low Latency Queue**. It is serviced before everything else, and it is **policed** at the stated rate — voice above 10% here is dropped, not queued. That policing is essential: an unpoliced priority queue can starve every other class.

**`bandwidth`** creates a **CBWFQ** class with a guaranteed minimum. It is a floor, not a ceiling — the class may use more when the link is idle.

Voice gets `priority`. Everything else gets `bandwidth`. That single rule covers most designs.

`class-default` catches everything unmatched. `fair-queue` shares it among flows; `random-detect` (WRED) starts dropping *before* the queue is full, which prevents **TCP global synchronisation** — the pathology where a tail-drop makes every TCP flow back off simultaneously and the link oscillates between full and empty.
{{< /step >}}

{{< step num="5" dev="R1" title="Policing versus shaping" >}}
Both limit a rate. What they do with the excess is opposite.

**Policing drops** (or re-marks) anything above the rate. Bursty by nature, no delay added, no buffer needed.

```
R1(config-pmap-c)#police 2000000 conform-action transmit exceed-action drop
```

**Shaping buffers** the excess and sends it later, smoothing the traffic to the configured rate. It adds delay and needs memory.

```
R1(config-pmap-c)#shape average 2000000
```

| | Policing | Shaping |
|---|---|---|
| Excess traffic | **dropped** or re-marked | **buffered** |
| Adds delay | no | **yes** |
| Needs buffers | no | **yes** |
| Direction | inbound or outbound | **outbound only** |
| Typical use | enforce a contract on **ingress** | match a carrier's rate on **egress** |

The classic deployment: a site with a 100 Mbps physical handoff and a 20 Mbps contracted rate. **Shape outbound to 20 Mbps** so your own router queues the excess in an order you control; if you do not, the carrier **polices** it and drops packets in an order you do not control — which for voice means dropped calls rather than delayed data.

Never shape or police voice. It is inelastic: a delayed voice packet is as useless as a dropped one, and there is no retransmission.
{{< /step >}}

{{< verify dev="R1" cmd="show policy-map interface" open="true" >}}
```
R1#show policy-map interface GigabitEthernet0/1

 GigabitEthernet0/1

  Service-policy output: WAN-EDGE

    Class-map: VOICE (match-all)
      48210 packets, 8194100 bytes
      5 minute offered rate 84000 bps, drop rate 0000 bps
      Match: ip dscp ef (46)
      Priority: 10% (100 kbps), burst bytes 2500, b/w exceed drops: 0

    Class-map: CALL-SIGNALLING (match-all)
      1204 packets, 192640 bytes
      5 minute offered rate 2000 bps, drop rate 0000 bps
      Match: ip dscp cs3 (24)
      Queueing
        bandwidth 5% (50 kbps)
        (pkts output/bytes output) 1204/192640

    Class-map: class-default (match-any)
      284102 packets, 41284100 bytes
      5 minute offered rate 684000 bps, drop rate 12000 bps
      Match: any
      Queueing
        Flow Based Fair Queueing
        (total drops/no-buffer drops) 1842/0
```

The command that tells you whether QoS is doing anything at all. Four things to read:

- **Packets matched per class.** Zero in a class means the classification is wrong, not that the traffic is absent.
- **`b/w exceed drops: 0`** in the priority class — voice is inside its allocation. Non-zero means calls are being clipped and the allocation is too small.
- **`drop rate 12000 bps`** in class-default — best-effort traffic is being dropped, which is QoS working correctly: the link is congested and the right class is absorbing it.
- **Offered rate** per class, which is the input to any capacity conversation.

Reset the counters before a test:

```
R1#clear counters GigabitEthernet0/1
```
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Phone boots into the data VLAN | CDP/LLDP disabled on that port | `show cdp neighbors <int> detail` |
| Voice quality poor only under load | no LLQ, or the policy is inbound | `show policy-map interface` |
| A class matches zero packets | wrong DSCP, or `match-all` with alternatives | check the class-map |
| Everything marked EF | trust boundary too far out | `mls qos trust device cisco-phone` |
| Markings vanish after a router hop | CoS is Layer 2 only | mark with DSCP instead |
| Carrier drops your traffic | not shaping to the contracted rate | `shape average` on egress |
| Link oscillates full/empty | TCP global synchronisation from tail drop | `random-detect` on class-default |
| QoS configured, no effect | `mls qos` not enabled globally on the switch | `show mls qos` |

## Exam notes

- Voice VLAN: `switchport voice vlan <id>` on an **access** port. The phone learns it via **CDP or LLDP-MED** and tags its own traffic.
- **CoS** = 3 bits in the 802.1Q tag (0–7), trunk only, **lost at a router**. **DSCP** = 6 bits in the IP header (0–63), end to end.
- **Voice = CoS 5 = DSCP EF = 46.** **Call signalling = CoS 3 = DSCP CS3 = 24.**
- CSx = x × 8. AFxy: x = class, y = drop precedence.
- The **trust boundary** goes as close to the source as possible, on devices you control. `mls qos trust device cisco-phone` is conditional.
- MQC order: **class-map → policy-map → service-policy**, applied **output** for queueing.
- **`priority`** = LLQ, serviced first and **policed**. **`bandwidth`** = CBWFQ, a guaranteed **minimum**.
- **Policing drops** the excess; **shaping buffers** it. Shaping is egress only and adds delay.
- Voice targets: **< 150 ms one-way latency, < 30 ms jitter, < 1% loss.**

---

*Sources: Jeremy's IT Lab Day 46 & 47 · verified in Packet Tracer 8.2.*
