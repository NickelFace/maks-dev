---
title: "Lab 31 · DHCP Snooping and Dynamic ARP Inspection"
date: 2026-09-06
description: "Stop a rogue DHCP server handing out gateways, then use the binding table it builds to stop ARP poisoning — two features where one depends entirely on the other."
tags: ["CCNA", "DHCP Snooping", "DAI", "Layer 2 Security", "Lab"]
categories: ["CCNA"]
domain: 5
tool: "Packet Tracer"
duration: "45 min"
sources: "Jeremy's IT Lab Day 50, 51"
---

A rogue DHCP server does not need to be malicious to cause an outage — a home router plugged in backwards will do it, and it will win the race against your real server for every host on the segment. If it *is* malicious, it hands out itself as the default gateway and reads everything.

DHCP snooping fixes that, and in doing so it builds a table of which IP address belongs to which MAC on which port. Dynamic ARP Inspection then uses that table to stop ARP poisoning. The dependency is one-directional and absolute: **DAI without DHCP snooping has nothing to check against.**

## Topology

{{< topology cols="3" rows="3" caption="One trusted uplink to the real DHCP server, everything else untrusted" >}}
router R1 "DHCP server" at 2,1
switch SW1 "" at 1,1
pc     PC1 "legitimate" at 0,0
pc     ROGUE "rogue DHCP + ARP" at 0,2

SW1 — R1 label="Gi0/1 · TRUSTED"
PC1 — SW1
ROGUE — SW1
{{< /topology >}}

## Objectives

- Enable DHCP snooping per VLAN and set the trust boundary correctly
- Watch a rogue DHCPOFFER be dropped on an untrusted port
- Read the binding table and understand what each column is used for
- Enable DAI using that table and add static entries for non-DHCP hosts
- Configure rate limiting and know why the uplink must be exempt

---

## Part 1 — DHCP snooping

{{< step num="1" dev="SW1" title="Enable it, and trust exactly one port" open="true" >}}
```
SW1(config)#ip dhcp snooping
SW1(config)#ip dhcp snooping vlan 10,20
SW1(config)#no ip dhcp snooping information option
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#description ## uplink to R1 — DHCP server ##
SW1(config-if)#ip dhcp snooping trust
SW1(config-if)#end
```

The model is simple and the defaults are the safe way round: **every port is untrusted until you say otherwise.**

| Port type | Trust | Allowed to send |
|---|---|---|
| **Untrusted** (default) | no | DISCOVER, REQUEST, RELEASE — **client messages only** |
| **Trusted** | yes | everything, including **OFFER and ACK** |

A DHCPOFFER or DHCPACK arriving on an untrusted port is dropped and logged. That is the entire rogue-server defence, in one sentence.

**Trust only the ports that lead to a legitimate DHCP server** — the uplink toward the server, and trunk links to other switches that carry DHCP traffic. Trust nothing that faces a user.

**`no ip dhcp snooping information option`** deserves its own paragraph, because leaving it on is the most common way to break DHCP while trying to secure it. Option 82 inserts the switch's port and VLAN into the relayed packet. A **switch acting as a relay** may legitimately do that; a Layer 2 switch that inserts option 82 while leaving `giaddr` at 0.0.0.0 produces a packet that Cisco IOS DHCP servers reject outright. The symptom is that DHCP stops working entirely the moment snooping is enabled, which people naturally blame on snooping in general.

If you do need option 82, the server side must accept it:

```
R1(config)#ip dhcp relay information trust-all
```
{{< /step >}}

{{< step num="2" dev="SW1" title="Rate limiting — and the port that must be exempt" >}}
```
SW1(config)#interface range FastEthernet0/1 - 24
SW1(config-if-range)#ip dhcp snooping limit rate 10
SW1(config-if-range)#end
```

Ten DHCP packets per second per access port. A client needs perhaps four in a burst; anything sustained above ten is a **DHCP starvation attack** — flooding DISCOVERs with spoofed MACs to exhaust the pool so the attacker's own server can take over.

Exceeding the rate puts the port in err-disabled, so pair it with automatic recovery:

```
SW1(config)#errdisable recovery cause dhcp-rate-limit
SW1(config)#errdisable recovery interval 300
```

**Do not rate-limit the trusted uplink**, or set it far higher. Every DHCP packet for the entire switch crosses that port, so a limit sized for one client will err-disable the uplink the first time a floor of PCs boots after a power cut — turning a security control into the outage it was meant to prevent.
{{< /step >}}

{{< verify dev="SW1" cmd="show ip dhcp snooping" open="true" >}}
```
SW1#show ip dhcp snooping
Switch DHCP snooping is enabled
DHCP snooping is configured on following VLANs:
10,20
DHCP snooping is operational on following VLANs:
10,20
DHCP snooping is configured on the following L3 Interfaces:

Insertion of option 82 is disabled
   circuit-id default format: vlan-mod-port
   remote-id: 0060.5c2b.9400 (MAC)
Option 82 on untrusted port is not allowed
Verification of hwaddr field is enabled

Interface                  Trusted    Allow option    Rate limit (pps)
------------------------   -------    ------------    ----------------
GigabitEthernet0/1         yes        yes             unlimited
FastEthernet0/1            no         no              10
FastEthernet0/2            no         no              10
```

Three things to check: **configured and operational** VLANs match, **option 82 insertion is disabled**, and exactly one interface says `Trusted: yes`.

`Verification of hwaddr field is enabled` is a second check — the switch compares the source MAC of the Ethernet frame with the `chaddr` field inside the DHCP payload. A starvation tool that spoofs `chaddr` without changing the frame's source MAC is caught by this.
{{< /verify >}}

{{< verify dev="SW1" cmd="show ip dhcp snooping binding" open="true" >}}
**This is the table that everything else depends on.**

```
SW1#show ip dhcp snooping binding
MacAddress          IpAddress        Lease(sec)  Type           VLAN  Interface
------------------  ---------------  ----------  -------------  ----  ---------------
00:01:64:31:A2:01   10.0.10.51       604212      dhcp-snooping    10  FastEthernet0/1
00:0A:F3:11:B4:C2   10.0.10.52       604198      dhcp-snooping    10  FastEthernet0/2
Total number of bindings: 2
```

Every column earns its place. The switch has watched a complete DHCP exchange and recorded **which MAC got which IP, in which VLAN, on which physical port, and for how long**. That is a verified identity binding, obtained without any agent on the host and without trusting anything the host says about itself.

DAI, IP Source Guard and several other features all read this table.

**The table lives in RAM and is lost on reload.** Every client would then have to re-DHCP before it could pass ARP inspection — which, after a switch reboot, means the whole floor fails DAI at once. Persist it:

```
SW1(config)#ip dhcp snooping database flash:dhcp-snooping.db
SW1(config)#ip dhcp snooping database write-delay 60
```

Now trigger the rogue. Configure a DHCP server on the ROGUE host and watch:

```
%DHCP_SNOOPING-5-DHCP_SNOOPING_UNTRUSTED_PORT: DHCP_SNOOPING drop message on
  untrusted port, message type: DHCPOFFER, MAC sa: 00d0.9744.2c19
```

Dropped, logged, and named — message type, source MAC and the fact the port was untrusted. The legitimate server keeps working throughout; clients never see the rogue's offer at all.
{{< /verify >}}

---

## Part 2 — Dynamic ARP Inspection

{{< step num="3" dev="—" title="What ARP poisoning actually does" open="true" >}}
ARP has no authentication whatsoever. Any host may send an ARP reply for any address, at any time, unsolicited — and every host that receives it updates its cache.

The attack:

1. The attacker sends a gratuitous ARP to PC1: *"10.0.10.1 (the gateway) is at my MAC."*
2. It sends another to the gateway: *"10.0.10.51 (PC1) is at my MAC."*
3. Both caches are now poisoned. Every packet between PC1 and the internet passes through the attacker.
4. The attacker forwards them on, so **nothing appears broken** — this is a man-in-the-middle, not a denial of service.

The only visible symptom on PC1:

```
PC> arp -a
  Internet Address      Physical Address      Type
  10.0.10.1             00d0.9744.2c19        dynamic     ← attacker's MAC
```

Nobody checks their ARP cache.
{{< /step >}}

{{< step num="4" dev="SW1" title="Enable DAI against the snooping table" >}}
```
SW1(config)#ip arp inspection vlan 10,20
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#ip arp inspection trust
SW1(config-if)#end
```

**DAI reads the DHCP snooping binding table.** Every ARP packet on an untrusted port is checked against it: does this sender MAC/IP pair, on this port, in this VLAN, appear in the table? If not, the packet is dropped and logged.

The attacker's forged ARP claims to be 10.0.10.1 while sending from a MAC and port bound to 10.0.10.53. No match, dropped.

The same trust model as snooping, and the same rule: **trust the uplink and inter-switch links, nothing else.** Untrusted is the default and is correct for every access port.

**Order matters.** Enable DHCP snooping, let the binding table populate, *then* enable DAI. Turn DAI on first and every host with an existing lease — which is all of them — fails inspection immediately, because their bindings were never recorded. That is a complete floor outage, and it is entirely self-inflicted.
{{< /step >}}

{{< step num="5" dev="SW1" title="Static hosts, which have no binding" >}}
A statically addressed server never runs DHCP, so it has no binding and DAI will drop its ARP. Two ways to fix it.

**An ARP ACL** — the explicit approach:

```
SW1(config)#arp access-list STATIC-HOSTS
SW1(config-arp-nacl)#permit ip host 10.0.10.100 mac host 000c.8511.7d41
SW1(config-arp-nacl)#permit ip host 10.0.10.101 mac host 000c.8511.7d42
SW1(config-arp-nacl)#exit
SW1(config)#ip arp inspection filter STATIC-HOSTS vlan 10
```

**Trusting the port** — simpler and weaker:

```
SW1(config)#interface FastEthernet0/20
SW1(config-if)#ip arp inspection trust
```

Prefer the ARP ACL. Trusting a port disables inspection for anything plugged into it, which is exactly the exemption an attacker would like.

Additional validation, off by default and worth enabling:

```
SW1(config)#ip arp inspection validate src-mac dst-mac ip
```

- **`src-mac`** — the Ethernet source MAC must match the sender MAC inside the ARP body
- **`dst-mac`** — the Ethernet destination must match the target MAC in the body
- **`ip`** — reject invalid addresses (0.0.0.0, 255.255.255.255, multicast)

All three must be given in **one command**; issuing them separately replaces rather than accumulates.

And rate limiting, which DAI applies by default at 15 pps on untrusted ports:

```
SW1(config)#interface range FastEthernet0/1 - 24
SW1(config-if-range)#ip arp inspection limit rate 15 burst interval 1
SW1(config-if-range)#exit
SW1(config)#interface GigabitEthernet0/1
SW1(config-if)#ip arp inspection limit none
```

**`limit none` on the trusted uplink**, for the same reason as DHCP snooping: all ARP for the switch crosses it, and a limit sized for one host will err-disable it.
{{< /step >}}

{{< verify dev="SW1" cmd="show ip arp inspection" open="true" >}}
```
SW1#show ip arp inspection

Source Mac Validation      : Enabled
Destination Mac Validation : Enabled
IP Address Validation      : Enabled

 Vlan     Configuration    Operation   ACL Match          Static ACL
 ----     -------------    ---------   ---------          ----------
   10     Enabled          Active      STATIC-HOSTS       No
   20     Enabled          Active

 Vlan     ACL Logging      DHCP Logging      Probe Logging
 ----     -----------      ------------      -------------
   10     Deny             Deny              Off
   20     Deny             Deny              Off

 Vlan     Forwarded        Dropped     DHCP Drops      ACL Drops
 ----     ---------        -------     ----------      ---------
   10          4218             12             12              0
   20           842              0              0              0
```

**`Operation: Active`** per VLAN, all three validations enabled, and a **Dropped** count.

`DHCP Drops: 12` means twelve ARP packets failed the binding-table check — that is the poisoning attempt being blocked. `ACL Drops` would count packets rejected by the ARP ACL instead.

A **Dropped** count that grows steadily on a normal working day usually means a legitimate static host with no binding and no ACL entry, not an attack. Check `show ip arp inspection log` before assuming the worst:

```
SW1#show ip arp inspection log
Total Log Buffer Size : 32
Syslog rate : 5 entries per 1 seconds.

Interface   Vlan  Sender MAC     Sender IP    Num Pkts  Reason         Time
---------   ----  -------------  -----------  --------  -------------  ----
Fa0/3       10    00d0.9744.2c19 10.0.10.1          12  DHCP Deny      15:42:11 AEST
```

Sender MAC `00d0.9744.2c19` claiming to be `10.0.10.1`, on Fa0/3, twelve times. That names the port and the attacker in one line — which is why DAI is as valuable for detection as it is for prevention.

The corresponding syslog:

```
%SW_DAI-4-DHCP_SNOOPING_DENY: 1 Invalid ARPs (Res) on Fa0/3, vlan 10.
  ([00d0.9744.2c19/10.0.10.1/0000.0000.0000/10.0.10.51/15:42:11 AEST Sat Sep 6 2026])
```
{{< /verify >}}

{{< verify dev="PC1" cmd="arp -a — the poisoning that no longer works" >}}
Run the attack again with DAI active, then check PC1:

```
PC> arp -a
  Internet Address      Physical Address      Type
  10.0.10.1             0060.4711.2c01        dynamic
```

`0060.4711.2c01` is the router's real MAC. The forged reply never reached PC1 — it was dropped at the switch port it entered on, which is the only place it can be stopped reliably.

Confirm the counter moved:

```
SW1#show ip arp inspection statistics vlan 10

 Vlan      Forwarded        Dropped     DHCP Drops      ACL Drops
 ----      ---------        -------     ----------      ---------
   10           4290             24             24              0
```
{{< /verify >}}

---

## The Layer 2 security stack

These features are designed to be deployed together, and each closes a gap the others leave:

| Feature | Attack it stops | Depends on |
|---|---|---|
| **Port security** | MAC flooding, unauthorised devices | — |
| **BPDU Guard** | rogue switch becoming root | PortFast |
| **DHCP snooping** | rogue DHCP server, starvation | — |
| **DAI** | ARP poisoning / MITM | **DHCP snooping** |
| **IP Source Guard** | IP spoofing | **DHCP snooping** |
| **802.1X** | unauthenticated devices | RADIUS |

The order of deployment matters: port security and BPDU Guard first, then DHCP snooping, then DAI and IP Source Guard once the binding table is populated.

IP Source Guard is the third consumer of that table and is one line:

```
SW1(config)#interface range FastEthernet0/1 - 24
SW1(config-if-range)#ip verify source port-security
```

It drops any IP packet whose source address does not match the port's binding — stopping a host from spoofing another's address even after it has passed ARP inspection.

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| DHCP stops entirely after enabling snooping | option 82 inserted with giaddr 0.0.0.0 | `no ip dhcp snooping information option` |
| Clients get no address | the server-facing port is untrusted | `show ip dhcp snooping` — check Trusted |
| Whole floor offline after enabling DAI | bindings never populated | enable snooping first, wait, then DAI |
| One static server unreachable | no binding and no ARP ACL | add an ARP ACL entry |
| Uplink err-disabled | rate limit applied to the trusted port | `ip arp inspection limit none` there |
| Bindings gone after a reload | table is in RAM | `ip dhcp snooping database flash:` |
| DAI drops climbing on a normal day | static hosts, not an attack | `show ip arp inspection log` |
| Snooping configured but not operational | VLAN not listed, or DHCP relay conflict | compare configured vs operational VLANs |

## Exam notes

- DHCP snooping: **all ports untrusted by default**. Untrusted ports may send **DISCOVER, REQUEST, RELEASE**; **OFFER and ACK are dropped**.
- Trust only ports leading to a legitimate DHCP server or another switch.
- **`no ip dhcp snooping information option`** on a Layer 2 switch, or DHCP breaks.
- The **binding table** records MAC / IP / VLAN / port / lease and is the basis for **DAI** and **IP Source Guard**.
- The table is in RAM — persist it with `ip dhcp snooping database`.
- **DAI requires DHCP snooping.** Enable snooping first and let bindings populate.
- Static hosts need an **ARP ACL** (`ip arp inspection filter`) or a trusted port.
- `ip arp inspection validate src-mac dst-mac ip` — all keywords in **one** command.
- Do **not** rate-limit trusted uplinks: `ip arp inspection limit none`.

---

*Sources: Jeremy's IT Lab Day 50 & 51 · verified in Packet Tracer 8.2.*
