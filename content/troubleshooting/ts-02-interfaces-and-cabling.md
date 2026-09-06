---
title: "Interfaces, Duplex and MTU"
date: 2026-09-06
description: "Reading the counters that reveal a fault a status check cannot: duplex mismatch, err-disabled causes, serial encapsulation, and the MTU problem that only appears on large packets."
tags: ["Troubleshooting", "Interfaces", "Duplex", "MTU", "Cisco"]
categories: ["Troubleshooting"]
unit: 2
---

An interface can be `up/up`, pass ping, and still be broken. That is not a paradox — it is what a duplex mismatch looks like, and it is why the counters matter more than the status.

## Reading the state

```
R1#show ip interface brief
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     10.0.1.1        YES manual up                    up
GigabitEthernet0/1     unassigned      YES unset  administratively down down
Serial0/0/0            10.0.12.1       YES manual up                    down
```

**Status is Layer 1** — is there a signal on the wire. **Protocol is Layer 2** — is the line protocol up. The four combinations each point somewhere different:

| Status | Protocol | Cause |
|---|---|---|
| up | up | working |
| **up** | **down** | Layer 2 — **encapsulation mismatch, keepalive failure, or no clock rate on a serial DCE** |
| down | down | no cable, far end shut down, speed mismatch, failed transceiver |
| administratively down | down | somebody typed `shutdown` |

`up/down` is the interesting one, because Layer 1 is healthy and Layer 2 is not. On Ethernet it usually means keepalives are not being returned; on serial it is almost always an encapsulation mismatch or a missing clock.

---

## Duplex mismatch

The most instructive fault in networking, because everything looks correct:

```
SW1#show interfaces status
Port      Name                 Status       Vlan       Duplex  Speed Type
Gi0/1     ## uplink to SW2 ##  connected    trunk        full    100 10/100/1000BaseTX

SW2#show interfaces status
Port      Name                 Status       Vlan       Duplex  Speed Type
Gi0/1     ## uplink to SW1 ##  connected    trunk      a-half   a-100 10/100/1000BaseTX
```

The **`a-` prefix means autonegotiated**. `full` without it was configured by hand; `a-half` was negotiated — or rather, was not, and fell back to the IEEE default.

That is the mechanism. Autonegotiation works by exchanging Fast Link Pulses. Hardcode speed and duplex on one side and it **stops sending them**. The other side hears no negotiation partner, falls back to parallel detection — which can sense speed off the electrical signal but **cannot sense duplex** — and applies the default: **half duplex** for anything below 1 Gbps.

The counters are where it becomes visible:

```
SW2#show interfaces GigabitEthernet0/1 | include error|CRC|collision
     212 input errors, 212 CRC, 0 frame, 0 overrun, 0 ignored
     0 output errors, 843 collisions, 0 interface resets
     0 babbles, 194 late collision, 0 deferred
```

**Late collisions on the half-duplex side and CRC errors on the full-duplex side.** That pairing is the signature. The full-duplex end transmits whenever it likes; the half-duplex end reads that as a collision, aborts its own frame mid-transmission, and the fragment arrives at the far end as a CRC error.

Under a ping it looks fine. Under a file copy, throughput drops by an order of magnitude.

CDP detects it too, if it is running:

```
%CDP-4-DUPLEX_MISMATCH: duplex mismatch discovered on GigabitEthernet0/1
```

**The fix is to autonegotiate on both ends**, not to hardcode both ends. Modern autonegotiation is reliable, and it is mandatory above 1 Gbps — 1000BASE-T cannot run without it. Hardcoding is now the cause of mismatches rather than the cure.

```
SW1(config-if)#no speed
SW1(config-if)#no duplex
```

---

## The counters, and what each points at

```
SW1#show interfaces FastEthernet0/1 | include error|CRC|runt|giant|collision|reliability
     reliability 255/255, txload 1/255, rxload 1/255
     0 runts, 0 giants, 0 throttles
     0 input errors, 0 CRC, 0 frame, 0 overrun, 0 ignored
     0 output errors, 0 collisions, 1 interface resets
     0 babbles, 0 late collision, 0 deferred
```

| Counter | Cause |
|---|---|
| **CRC** | frame arrived corrupted — bad cable, EMI, failing SFP, or duplex mismatch |
| **runts** | frame under 64 bytes — usually a collision on a half-duplex segment |
| **giants** | frame over MTU — often an unexpected 802.1Q tag on a port not expecting one |
| **collisions** | normal on half duplex; **should be zero on full duplex** |
| **late collision** | collision after the first 64 bytes — **duplex mismatch**, or an over-long segment |
| **input errors** | the sum of the above; read the specific counters underneath |
| **interface resets** | the interface was reset — flapping, or a hardware fault |
| **reliability** | 255/255 is perfect; lower means frames are being dropped |

The distinction worth internalising: **CRC without collisions is physical** — replace the cable or the transceiver. **CRC with late collisions is a duplex mismatch** — fix the configuration.

Always clear the counters before a test, so you are measuring the test and not the last three weeks:

```
SW1#clear counters GigabitEthernet0/1
```

---

## err-disabled

The switch shut the port itself. Find out why:

```
SW1#show interfaces status err-disabled

Port      Name               Status       Reason               Err-disabled Vlans
Fa0/5     ## desk 14 ##      err-disabled psecure-violation
Fa0/9     ## desk 22 ##      err-disabled bpduguard
```

The common causes:

| Reason | Trigger |
|---|---|
| `psecure-violation` | port security saw an unauthorised MAC |
| `bpduguard` | a BPDU arrived on a PortFast port — someone plugged in a switch |
| `link-flap` | the link went up and down too many times |
| `dtp-flap` | DTP negotiation kept changing |
| `dhcp-rate-limit` | DHCP snooping rate limit exceeded |
| `channel-misconfig` | EtherChannel members did not match |
| `udld` | a unidirectional link was detected |

**Recovery requires `shutdown` first.** `no shutdown` alone does nothing on an err-disabled port, and the command appears to be ignored:

```
SW1(config)#interface FastEthernet0/5
SW1(config-if)#shutdown
SW1(config-if)#no shutdown
```

Automatic recovery bounds the outage while keeping the event in the logs:

```
SW1(config)#errdisable recovery cause psecure-violation
SW1(config)#errdisable recovery cause bpduguard
SW1(config)#errdisable recovery interval 300
```

```
SW1#show errdisable recovery
ErrDisable Reason          Timer Status
-----------------          --------------
bpduguard                  Enabled
psecure-violation          Enabled

Interfaces that will be enabled at the next timeout:

Interface      Errdisable reason      Time left(sec)
Fa0/5          psecure-violation           184
```

---

## Serial encapsulation

On serial links, `up/down` almost always means the two ends disagree about Layer 2:

```
R1#show interfaces Serial0/0/0
Serial0/0/0 is up, line protocol is down
  Hardware is WIC MBRD Serial
  Internet address is 10.0.12.1/30
  Encapsulation HDLC, loopback not set
  Keepalive set (10 sec)
```

```
R2#show interfaces Serial0/0/0 | include Encapsulation
  Encapsulation PPP, LCP Closed
```

HDLC on one end, PPP on the other. Cisco's HDLC is proprietary — it adds a protocol type field the standard does not have — so it only interoperates with itself. PPP is the standard and the correct choice for any link to non-Cisco equipment.

```
R1(config)#interface Serial0/0/0
R1(config-if)#encapsulation ppp
```

Two more serial-specific faults:

**No clock rate on the DCE end.** A back-to-back serial cable has a DCE side and a DTE side, and the DCE must provide clocking:

```
R1#show controllers Serial0/0/0 | include DCE|DTE
DCE V.35, clock rate 2000000
```

```
R1(config-if)#clock rate 64000
```

**PPP authentication failure**, which shows as `LCP Open, CHAP closed`:

```
R1#debug ppp authentication
```

---

## MTU and PPPoE

The symptom: **ping works, HTTP hangs.** Small packets cross the link and large ones vanish.

Standard Ethernet MTU is 1500 bytes. PPPoE adds an 8-byte header, so the usable payload drops to **1492**. GRE adds 24 bytes, giving 1476. IPsec adds more. Each encapsulation eats into the same 1500.

A TCP session negotiates its maximum segment size from the MTU of the *local* interface, so a host on plain Ethernet advertises MSS 1460 (1500 − 20 IP − 20 TCP) and then sends 1500-byte packets into a path that cannot carry them.

Path MTU Discovery is supposed to fix this: the router that cannot forward the packet returns **ICMP type 3 code 4, fragmentation needed**, and the sender reduces its packet size. It fails whenever something in the path blocks ICMP — which is very often, because "block all ICMP" remains common firewall advice.

Find the boundary:

```
R1#ping 8.8.8.8 size 1500 df-bit
Packet sent with the DF bit set
M.M.M
Success rate is 0 percent (0/5)
```

**`M` means fragmentation needed with DF set** — that is the MTU problem stating itself outright.

```
R1#ping 8.8.8.8 size 1492 df-bit
!!!!!
Success rate is 100 percent (5/5)
```

The fix, on the interface facing the constrained path:

```
R1(config)#interface Dialer1
R1(config-if)#ip mtu 1492
R1(config-if)#ip tcp adjust-mss 1452
```

**`ip tcp adjust-mss` is the important one.** It rewrites the MSS option in passing TCP SYN packets, so both endpoints negotiate a smaller segment and **never generate an oversized packet at all** — no fragmentation, no reassembly, no dependence on PMTUD.

The arithmetic: 1492 (IP MTU) − 20 (IP header) − 20 (TCP header) = **1452**.

And if you control the firewalls, permit the ICMP that PMTUD needs:

```
R1(config-ext-nacl)#permit icmp any any unreachable
R1(config-ext-nacl)#permit icmp any any time-exceeded
```

---

## Symptom table

| Symptom | Cause | Command |
|---|---|---|
| `up/down` on Ethernet | keepalive or Layer 2 fault | `show interfaces` |
| `up/down` on serial | encapsulation mismatch, no clock | `show interfaces \| include Encap`, `show controllers` |
| `down/down` | cable, far end shut, speed mismatch | `show interfaces status` both ends |
| Throughput terrible, link up | duplex mismatch | late collisions one side, CRC the other |
| CRC, no collisions | physical — cable, EMI, SFP | replace and re-test after `clear counters` |
| Giants climbing | unexpected 802.1Q tag | check trunk/access on both ends |
| `err-disabled` | the switch shut it | `show interfaces status err-disabled` |
| `no shutdown` has no effect | err-disabled needs `shutdown` first | shut, then no shut |
| Ping works, HTTP hangs | MTU — PMTUD blocked | `ping size 1500 df-bit`; `ip tcp adjust-mss` |
| 1 Gbps port negotiates 100 | damaged pairs — 1000BASE-T needs all four | replace the cable |

---

*Based on the NetworkLessons troubleshooting series: interfaces, and MTU/PPPoE on Cisco IOS.*
