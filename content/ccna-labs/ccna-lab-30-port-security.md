---
title: "Lab 30 · Port Security"
date: 2026-09-06
description: "Limit which MAC addresses may use a switch port, pick a violation mode that matches your appetite for outages, and recover the ports it shuts."
tags: ["CCNA", "Port Security", "Layer 2 Security", "Lab"]
categories: ["CCNA"]
domain: 5
tool: "Packet Tracer"
duration: "40 min"
sources: "Jeremy's IT Lab Day 49 · Flackbox 27-1"
aliases: ["/ccna-labs/ccna-lab-27-port-security/"]
---

Port security answers one question: which MAC addresses are allowed to send frames into this port? It is the most basic form of network access control, it is trivially defeated by anyone willing to spoof a MAC address, and it is still worth deploying — because it stops the accidental cases that actually happen, and because it is the only Layer 2 control available on a switch with no 802.1X infrastructure.

## Topology

{{< topology cols="3" rows="3" caption="Three access ports, three violation modes" >}}
pc     PC1 "Fa0/1 · shutdown mode" at 0,0
pc     PC2 "Fa0/2 · restrict mode" at 0,1
pc     PC3 "Fa0/3 · protect mode" at 0,2
switch SW1 "" at 1,1
router R1 "" at 2,1

PC1 — SW1
PC2 — SW1
PC3 — SW1
SW1 — R1
{{< /topology >}}

## Objectives

- Enable port security and set a maximum number of MAC addresses
- Compare the three violation modes on what each does to traffic, logging and the port
- Use sticky learning and understand where the learned addresses are stored
- Recover an err-disabled port manually and automatically
- Configure aging so a port does not lock out its next legitimate user

---

## Part 1 — The basics

{{< step num="1" dev="SW1" title="Port security requires an access port" open="true" >}}
```
SW1(config)#interface FastEthernet0/1
SW1(config-if)#switchport mode access
SW1(config-if)#switchport access vlan 10
SW1(config-if)#switchport port-security
SW1(config-if)#switchport port-security maximum 1
SW1(config-if)#switchport port-security violation shutdown
SW1(config-if)#end
```

**The port must be a static access port (or a static trunk) first.** On a port left in `dynamic auto` or `dynamic desirable`, IOS refuses:

```
SW1(config-if)#switchport port-security
Command rejected: FastEthernet0/1 is a dynamic port.
```

That is not an arbitrary restriction. A port that might become a trunk cannot have a meaningful MAC limit, because a trunk legitimately carries frames from every device behind the switch on the other end.

`maximum 1` is the default and is right for a bare PC. Two situations need more:

- **An IP phone with a PC behind it** needs at least 2 — one MAC in the voice VLAN, one in the data VLAN. Three is the usual figure to allow for the phone's own two addresses.
- **A port feeding a small unmanaged switch** needs as many as there are devices behind it, which is an argument for not doing that.

The maximum can also be set per VLAN on a multi-VLAN access port:

```
SW1(config-if)#switchport port-security maximum 3
SW1(config-if)#switchport port-security maximum 1 vlan voice
SW1(config-if)#switchport port-security maximum 2 vlan access
```
{{< /step >}}

{{< step num="2" dev="SW1" title="The three violation modes, and what each costs you" open="true" >}}
```
SW1(config)#interface FastEthernet0/2
SW1(config-if)#switchport mode access
SW1(config-if)#switchport port-security
SW1(config-if)#switchport port-security violation restrict
SW1(config-if)#exit
SW1(config)#interface FastEthernet0/3
SW1(config-if)#switchport mode access
SW1(config-if)#switchport port-security
SW1(config-if)#switchport port-security violation protect
SW1(config-if)#end
```

| Mode | Drops the frame | Syslog / SNMP trap | Counter | Port state |
|---|---|---|---|---|
| **protect** | yes | **no** | **no** | stays up |
| **restrict** | yes | **yes** | **yes** | stays up |
| **shutdown** (default) | yes | **yes** | **yes** | **err-disabled** |

**`protect` is the one to avoid.** It silently discards the offending frames and tells nobody. From the help desk's point of view a user simply has no network, with nothing in any log to explain it. There is no scenario where `restrict` is not the better choice — same traffic behaviour, plus a record.

**`shutdown` is the default** and the strictest: the port goes err-disabled and stays down until someone intervenes. It is correct where a violation should stop everything until it is investigated, and it is an outage generator in an office where people move desks.

**`restrict` is the practical middle.** The port stays up, the extra MAC is blocked, and a syslog message and SNMP trap are generated. Combine it with monitoring and you get detection without downtime.

The messages each mode produces:

```
! restrict
%PORT_SECURITY-2-PSECURE_VIOLATION: Security violation occurred, caused by
  MAC address 000a.f311.b4c2 on port FastEthernet0/2.

! shutdown
%PM-4-ERR_DISABLE: psecure-violation error detected on Fa0/1, putting Fa0/1 in err-disable state
%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/1, changed state to down
```
{{< /step >}}

---

## Part 2 — Sticky learning

{{< step num="3" dev="SW1" title="Learn the address once, then keep it" >}}
Three ways to populate the allowed list:

**Static** — type the address:

```
SW1(config-if)#switchport port-security mac-address 0001.6431.a201
```

Accurate, auditable, and unmaintainable at scale. Nobody is walking three hundred desks to read MAC labels.

**Dynamic** — the default. The switch learns whatever connects, up to the maximum, and **forgets it all on reload or link-down**. Reboot the switch and every port re-learns whatever happens to be plugged in, which means the security value is close to zero.

**Sticky** — learn dynamically, then write the learned address into the running configuration:

```
SW1(config)#interface range FastEthernet0/1 - 24
SW1(config-if-range)#switchport port-security mac-address sticky
SW1(config-if-range)#end
```

The address appears in `show run` as if you had typed it:

```
SW1#show running-config interface FastEthernet0/1
interface FastEthernet0/1
 switchport mode access
 switchport access vlan 10
 switchport port-security
 switchport port-security maximum 1
 switchport port-security mac-address sticky
 switchport port-security mac-address sticky 0001.6431.a201
```

Two lines: the `sticky` keyword enabling the behaviour, and the learned address it produced.

**Sticky addresses are in `running-config`, not `startup-config`, until you save.** A switch that learns fifty sticky addresses and then reboots without a `write memory` has learned nothing. That is the single most common mistake with this feature.

```
SW1#copy running-config startup-config
```

The workflow this is designed for: enable sticky on a Friday, let the switch learn the desks over a working week, save the configuration, and from then on the ports only accept the machines that were there. Moving a machine becomes a change request, which is either the point or the problem depending on your organisation.
{{< /step >}}

{{< verify dev="SW1" cmd="show port-security" open="true" >}}
The switch-wide summary:

```
SW1#show port-security
Secure Port  MaxSecureAddr  CurrentAddr  SecurityViolation  Security Action
                (Count)       (Count)          (Count)
---------------------------------------------------------------------------
      Fa0/1              1            1                  0         Shutdown
      Fa0/2              1            1                  3          Restrict
      Fa0/3              1            1                  0          Protect
---------------------------------------------------------------------------
Total Addresses in System (excluding one mac per port)     : 0
Max Addresses limit in System (excluding one mac per port) : 8192
```

**`SecurityViolation (Count)`** is the column to watch. Fa0/2 has seen three violations and is still up — `restrict` working as intended. A count climbing steadily on one port means either a genuine attempt or, far more often, someone who plugged a personal switch under their desk.

Per port:

```
SW1#show port-security interface FastEthernet0/1
Port Security              : Enabled
Port Status                : Secure-up
Violation Mode             : Shutdown
Aging Time                 : 0 mins
Aging Type                 : Absolute
SecureStatic Address Aging : Disabled
Maximum MAC Addresses      : 1
Total MAC Addresses        : 1
Configured MAC Addresses   : 0
Sticky MAC Addresses       : 1
Last Source Address:Vlan   : 0001.6431.a201:10
Security Violation Count   : 0
```

**`Port Status`** has three values: `Secure-up` (working), `Secure-down` (the port is down for an ordinary reason), and **`Secure-shutdown`** (err-disabled by a violation). The third is the one you are looking for when a user reports no network.

`Last Source Address` names the most recent MAC seen — after a violation, that is the offending address.

And the address table:

```
SW1#show port-security address
       Secure Mac Address Table
-----------------------------------------------------------------------------
Vlan    Mac Address       Type                     Ports   Remaining Age
                                                              (mins)
----    -----------       ----                     -----   -------------
  10    0001.6431.a201    SecureSticky             Fa0/1        -
  10    000a.f311.b4c2    SecureSticky             Fa0/2        -
  10    0090.2144.7e3b    SecureDynamic            Fa0/3        -
```

`SecureSticky` survives a save and reload; `SecureDynamic` does not. That column is how you audit whether the sticky rollout actually completed.
{{< /verify >}}

---

## Part 3 — Violations and recovery

{{< step num="4" dev="SW1" title="Trigger a violation and bring the port back" open="true" >}}
Move PC2's cable to Fa0/1, which has a different sticky MAC and `violation shutdown`:

```
%PM-4-ERR_DISABLE: psecure-violation error detected on Fa0/1, putting Fa0/1 in err-disable state
```

```
SW1#show interfaces status err-disabled

Port      Name               Status       Reason               Err-disabled Vlans
Fa0/1     ## desk 12 ##      err-disabled psecure-violation
```

Manual recovery, and the order matters:

```
SW1(config)#interface FastEthernet0/1
SW1(config-if)#shutdown
SW1(config-if)#no shutdown
```

**`no shutdown` on its own does nothing.** The `shutdown` is what clears the err-disabled state; without it the port stays down and the command appears to have been ignored.

If the sticky address is now wrong — the desk genuinely has a new machine — clear it first:

```
SW1#clear port-security sticky interface FastEthernet0/1
SW1#clear port-security all
```

Automatic recovery, which is what you want on an access layer with hundreds of ports:

```
SW1(config)#errdisable recovery cause psecure-violation
SW1(config)#errdisable recovery cause bpduguard
SW1(config)#errdisable recovery interval 300
```

The port comes back after five minutes. If the violating device is still attached, it errs again — so the offence stays visible in the logs while the outage is bounded at five minutes rather than "until someone opens a ticket".

```
SW1#show errdisable recovery
ErrDisable Reason          Timer Status
-----------------          --------------
psecure-violation          Enabled
bpduguard                  Enabled
link-flap                  Disabled

Timer interval: 300 seconds

Interfaces that will be enabled at the next timeout:

Interface      Errdisable reason      Time left(sec)
Fa0/1          psecure-violation           184
```

`Time left` counts down to the recovery, which is a useful thing to be able to tell a user.
{{< /step >}}

{{< step num="5" dev="SW1" title="Aging — so a port does not lock out its next user" >}}
```
SW1(config)#interface FastEthernet0/1
SW1(config-if)#switchport port-security aging time 60
SW1(config-if)#switchport port-security aging type inactivity
SW1(config-if)#switchport port-security aging static
SW1(config-if)#end
```

Without aging, a learned address occupies its slot forever. On a hot-desk or meeting-room port with `maximum 1`, the first laptop of the day permanently blocks every other one.

Two aging types, and the difference matters:

- **`absolute`** (default) — the address is removed after the timer regardless of activity. A machine still in use is dropped and immediately re-learned, which usually works and occasionally does not.
- **`inactivity`** — the timer resets on every frame, so the address is only removed after the device has been genuinely silent for the interval. **This is the one you want.**

`aging static` extends aging to statically configured and sticky addresses, which are otherwise exempt. Leave it off unless you specifically want sticky entries to expire.

Sixty minutes with `inactivity` is a reasonable default for a shared port: a laptop unplugged at the end of a meeting frees the slot an hour later, and a laptop in continuous use never loses it.
{{< /step >}}

{{< verify dev="SW1" cmd="show port-security interface — after recovery" >}}
```
SW1#show port-security interface FastEthernet0/1
Port Security              : Enabled
Port Status                : Secure-up
Violation Mode             : Shutdown
Aging Time                 : 60 mins
Aging Type                 : Inactivity
Maximum MAC Addresses      : 1
Total MAC Addresses        : 1
Sticky MAC Addresses       : 1
Last Source Address:Vlan   : 0001.6431.a201:10
Security Violation Count   : 1
```

`Secure-up` again, aging configured, and the violation count preserved at 1 — the counter is history, not current state, and it does not reset on recovery. Clear it deliberately:

```
SW1#clear port-security all
```

The full port hardening stack, which is what a real access port configuration looks like:

```
SW1(config)#interface range FastEthernet0/1 - 24
SW1(config-if-range)#switchport mode access
SW1(config-if-range)#switchport access vlan 10
SW1(config-if-range)#switchport nonegotiate
SW1(config-if-range)#switchport port-security
SW1(config-if-range)#switchport port-security maximum 2
SW1(config-if-range)#switchport port-security violation restrict
SW1(config-if-range)#switchport port-security mac-address sticky
SW1(config-if-range)#switchport port-security aging time 60
SW1(config-if-range)#switchport port-security aging type inactivity
SW1(config-if-range)#spanning-tree portfast
SW1(config-if-range)#spanning-tree bpduguard enable
SW1(config-if-range)#end
SW1#copy running-config startup-config
```

Eleven lines that between them cover VLAN hopping, MAC flooding, rogue switches and accidental loops.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| `Command rejected: dynamic port` | port is in a DTP mode | `switchport mode access` first |
| Port dead after a desk move | violation `shutdown` | `show interfaces status err-disabled` |
| `no shutdown` will not revive it | err-disabled needs `shutdown` first | shut, then no shut |
| User has no network, nothing logged | violation mode is `protect` | change to `restrict` |
| Sticky addresses gone after a reload | never saved | `copy running-config startup-config` |
| Phone works, PC behind it does not | `maximum 1` on a voice port | raise to 2 or 3 |
| Meeting-room port only serves one laptop | no aging | `aging type inactivity` |
| Violations on a port with one device | a small unmanaged switch under the desk | `show port-security address` |

## Exam notes

- Port security requires a **static access or static trunk** port. Dynamic ports are rejected.
- Default: **`maximum 1`**, violation **`shutdown`**, dynamic learning.
- **protect** = silent drop. **restrict** = drop + log + counter. **shutdown** = err-disable (default).
- **Sticky** addresses go into `running-config` — save, or they are lost on reload.
- Recovery is **`shutdown`** then **`no shutdown`**, or `errdisable recovery cause psecure-violation`.
- Aging **`inactivity`** resets on traffic; **`absolute`** does not. Default is absolute.
- A phone with a PC behind it needs `maximum` of at least 2.
- `Port Status: Secure-shutdown` means a violation err-disabled the port.

---

*Sources: Jeremy's IT Lab Day 49 · Flackbox CCNA Lab Guide 27-1 · verified in Packet Tracer 8.2.*
