---
title: "Lab 25 · Syslog and SNMP"
date: 2026-09-06
description: "Eight severity levels, one logging destination that survives a reboot, and the difference between SNMP v2c community strings and v3 authenticated users."
tags: ["CCNA", "Syslog", "SNMP", "Monitoring", "Lab"]
categories: ["CCNA"]
domain: 4
tool: "Packet Tracer"
duration: "40 min"
sources: "Jeremy's IT Lab Day 40, 41 · Flackbox 34"
aliases: ["/ccna-labs/ccna-lab-34-device-mgmt/"]
---

Syslog tells you what happened. SNMP tells you what is happening. Both are configured in a couple of lines and both are useless if you get the severity level or the community string wrong — so this lab spends its time on the two tables that decide that.

## Topology

{{< topology cols="3" rows="2" caption="Two managed devices reporting to a syslog collector and an SNMP manager" >}}
router R1 "" at 0,0
switch SW1 "" at 0,1
server LOG "10.0.10.100 · syslog + SNMP" at 2,0

R1 — LOG
SW1 — LOG
{{< /topology >}}

## Objectives

- Enumerate the eight syslog severity levels and predict what a given level captures
- Send logs to a remote collector, to the buffer and to the console, each at a different level
- Configure SNMPv2c read-only access restricted by ACL
- Configure SNMPv3 with authentication and encryption and explain the security models
- Enable traps and identify which events generate them

---

## Part 1 — Syslog

{{< step num="1" dev="—" title="The eight levels — memorise these" open="true" >}}
| Level | Keyword | Meaning | Example |
|---|---|---|---|
| **0** | emergencies | system unusable | thermal shutdown imminent |
| **1** | alerts | immediate action required | power supply failed |
| **2** | critical | critical condition | memory allocation failure |
| **3** | errors | error condition | interface reset, ACL config error |
| **4** | warnings | warning | duplex mismatch, native VLAN mismatch |
| **5** | notifications | normal but significant | **interface up/down**, config change |
| **6** | informational | informational | ACL match logs, packet-level events |
| **7** | debugging | debug output | `debug` command output |

The mnemonic: **E**very **A**wesome **C**isco **E**ngineer **W**ill **N**eed **I**ce cream **D**aily.

Two facts that follow from the ordering and are tested constantly:

**Configuring a level captures that level *and everything more severe*.** `logging trap 5` sends levels 0 through 5. It does **not** send only level 5.

**Level 5 is where the useful operational noise lives.** Interface up/down and configuration changes are notifications, not errors. Set the trap level to 4 and you stop seeing links flap.

The anatomy of a message:

```
Sep  6 14:52:19.334 AEST: %LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up
└────── timestamp ──────┘  └─ facility ─┘│ └mnemonic┘  └──────────── description ───────────┘
                                      severity
```

`%LINEPROTO-5-UPDOWN` — facility `LINEPROTO`, severity **5**, mnemonic `UPDOWN`. The number in the middle is the severity, and reading it off the message is faster than looking anything up.
{{< /step >}}

{{< step num="2" dev="R1" title="Four destinations, four levels" >}}
```
R1(config)#logging host 10.0.10.100
R1(config)#logging trap notifications
R1(config)#logging buffered 8192 informational
R1(config)#logging console warnings
R1(config)#logging monitor informational
R1(config)#logging source-interface Loopback0
R1(config)#service timestamps log datetime msec localtime show-timezone
R1(config)#end
```

Each destination gets its own level, and the choices are deliberate:

| Destination | Command | Level here | Why |
|---|---|---|---|
| Remote collector | `logging host` + `logging trap` | 5 | the permanent record — link state and config changes |
| Local buffer | `logging buffered` | 6 | RAM, survives until reload, cheap |
| Console | `logging console` | **4** | anything noisier makes the console unusable |
| VTY sessions | `logging monitor` | 6 | needs `terminal monitor` per session |

**`logging console` at level 6 or 7 on a busy router is a genuine outage risk.** Console output is synchronous and unbuffered — a flood of debug messages can consume enough CPU to make the device unresponsive. Keep it at 4 or lower, and read the buffer instead.

`logging source-interface Loopback0` makes every message arrive at the collector from the same address regardless of which interface it left by. Without it, a router with four uplinks appears in the log as four different devices.

To see logs over SSH, the session must opt in:

```
R1#terminal monitor
R1#terminal no monitor
```

Syslog is **UDP 514**. There is no acknowledgement, so a message lost in transit is simply gone — which is why the local buffer matters as a second copy.
{{< /step >}}

{{< verify dev="R1" cmd="show logging" open="true" >}}
```
R1#show logging
Syslog logging: enabled (0 messages dropped, 2 messages rate-limited,
                0 flushes, 0 overruns, xml disabled, filtering disabled)

No Active Message Discriminator.

    Console logging: level warnings, 24 messages logged, xml disabled,
                     filtering disabled
    Monitor logging: level informational, 0 messages logged
    Buffer logging:  level informational, 142 messages logged
    Exception Logging: size (4096 bytes)
    Count and timestamp logging messages: disabled
    Persistent logging: disabled

    Trap logging: level notifications, 148 message lines logged
        Logging to 10.0.10.100  (udp port 514, audit disabled,
              link up), 148 message lines logged, 0 message lines rate-limited

Log Buffer (8192 bytes):
Sep  6 14:52:19.334 AEST: %LINEPROTO-5-UPDOWN: Line protocol on Interface Gi0/1, changed state to up
Sep  6 14:53:02.118 AEST: %SYS-5-CONFIG_I: Configured from console by admin on vty0 (10.0.10.50)
```

The header confirms each destination and its level, and `link up` next to the collector address means the router believes it can reach it.

`%SYS-5-CONFIG_I` is the message worth knowing by name: **someone changed the configuration**, and it names the user, the line and the source address. On a change-controlled network it is the first thing you grep for.

Filter the buffer:

```
R1#show logging | include %LINK|%LINEPROTO
R1#show logging | include CONFIG_I
R1#clear logging
```
{{< /verify >}}

---

## Part 2 — SNMPv2c

{{< step num="3" dev="R1" title="Read-only, and locked to the manager" >}}
```
R1(config)#access-list 20 remark ## SNMP managers ##
R1(config)#access-list 20 permit host 10.0.10.100
R1(config)#snmp-server community R3ad0nly!Str RO 20
R1(config)#snmp-server location "Sydney DC — Rack 12"
R1(config)#snmp-server contact "netops@example.com"
R1(config)#snmp-server chassis-id R1-EDGE
R1(config)#end
```

**The community string is a password sent in cleartext.** SNMPv2c has no encryption and no real authentication — anything that can capture a packet has the string. Two consequences follow:

**Never configure `RW`.** Read-write over v2c hands anyone on the path the ability to reconfigure the device. If you need write access, use v3.

**Always attach an ACL.** The `20` on the end of the community line restricts which sources may query at all. It is not a substitute for encryption, but it turns a trivial attack into one requiring a foothold on the right subnet.

And never use `public` or `private`. Every scanner on the internet tries those first, and they are the default in far too many deployments.

`location` and `contact` are not decoration. They appear in the manager's inventory, and on a network with three hundred devices they are the difference between a ticket that reaches the right team and one that does not.
{{< /step >}}

{{< step num="4" dev="R1" title="Traps — the device telling you, instead of being asked" >}}
```
R1(config)#snmp-server host 10.0.10.100 version 2c R3ad0nly!Str
R1(config)#snmp-server enable traps snmp linkdown linkup coldstart warmstart
R1(config)#snmp-server enable traps config
R1(config)#snmp-server enable traps syslog
R1(config)#snmp-server enable traps cpu threshold
R1(config)#end
```

Polling asks "what is the state?" every few minutes. A trap is the device saying "this just happened" — the difference between finding out about a link failure now and finding out at the next poll interval.

`snmp-server enable traps` with no keywords enables **everything**, which will bury the manager. Name the categories you want.

The mechanism, and the vocabulary the exam uses:

| Term | Meaning |
|---|---|
| **Manager (NMS)** | the system polling and receiving |
| **Agent** | the software on the managed device |
| **MIB** | the hierarchical database of objects |
| **OID** | the numeric address of one object |
| **GET / GETNEXT / GETBULK** | manager reads |
| **SET** | manager writes — requires RW |
| **TRAP** | agent notifies, **unacknowledged** |
| **INFORM** | agent notifies, **acknowledged and retried** |

Ports: agent listens on **UDP 161**, manager receives traps on **UDP 162**.

**Informs** are the reliable variant — the manager acknowledges and the agent retries until it does. They cost memory on the agent (it holds the message pending acknowledgement) and are worth it for events that must not be lost:

```
R1(config)#snmp-server host 10.0.10.100 informs version 2c R3ad0nly!Str
```
{{< /step >}}

{{< verify dev="R1" cmd="show snmp" open="true" >}}
```
R1#show snmp
Chassis: R1-EDGE
Contact: netops@example.com
Location: Sydney DC — Rack 12
1842 SNMP packets input
    0 Bad SNMP version errors
    4 Unknown community name
    0 Illegal operation for community name supplied
    0 Encoding errors
1838 SNMP packets output
    0 Too big errors
    12 No such name errors
    0 Bad values errors
SNMP logging: enabled
    Logging to 10.0.10.100.162, 0/10, 24 sent, 0 dropped.
```

**`Unknown community name`** climbing is the one to watch. A handful means a misconfigured manager; a steadily rising count means somebody is guessing community strings, and it is one of the more reliable early indicators of a network scan.

`Logging to 10.0.10.100.162` confirms the trap destination and port, with a sent/dropped count.

```
R1#show snmp community
Community name: R3ad0nly!Str
Community Index: R3ad0nly!Str
Community SecurityName: R3ad0nly!Str
storage-type: nonvolatile        active        access-list: 20

R1#show snmp host
Notification host: 10.0.10.100  udp-port: 162   type: trap
user: R3ad0nly!Str  security model: v2c
```

`access-list: 20` on the community confirms the restriction is applied — a community line without it would show nothing there.
{{< /verify >}}

---

## Part 3 — SNMPv3

{{< step num="5" dev="R1" title="Authentication and encryption, properly" >}}
```
R1(config)#snmp-server view OPS-VIEW iso included
R1(config)#snmp-server group OPS-GROUP v3 priv read OPS-VIEW access 20
R1(config)#snmp-server user nms-monitor OPS-GROUP v3 auth sha Auth3nt!Key priv aes 128 Pr1v@cyKey
R1(config)#snmp-server host 10.0.10.100 version 3 priv nms-monitor
R1(config)#end
```

Four objects, built in order — each references the one before it:

1. **View** — which part of the MIB tree is visible. `iso included` is everything; narrow it in production.
2. **Group** — a security level plus the views it may read and write.
3. **User** — credentials, mapped into a group.
4. **Host** — where traps go, and as which user.

The three security levels, and the exam's favourite table:

| Level | Keyword | Authentication | Encryption |
|---|---|---|---|
| noAuthNoPriv | `noauth` | username only | none |
| authNoPriv | `auth` | **MD5 or SHA** | none |
| **authPriv** | **`priv`** | **MD5 or SHA** | **DES, 3DES or AES** |

Use **`priv` with SHA and AES**. MD5 and DES are present for compatibility with equipment that should have been replaced.

The comparison that matters:

| | v1 | v2c | **v3** |
|---|---|---|---|
| Authentication | community | community | **username + hash** |
| Encryption | none | none | **yes** |
| Bulk retrieval | no | **GETBULK** | GETBULK |
| Informs | no | **yes** | yes |
| 64-bit counters | no | **yes** | yes |

v2c added bulk transfers and 64-bit counters — which matter because a 32-bit interface counter wraps in about 34 seconds on a 10 Gbps link. v3 added the security. **There is no v2 in general use**; the "c" in v2c stands for "community-based", which is v2 with v1's insecure authentication bolted back on because the real v2 security model was unusable.
{{< /step >}}

{{< verify dev="R1" cmd="show snmp user and show snmp group" >}}
```
R1#show snmp user

User name: nms-monitor
Engine ID: 800000090300005079666801
storage-type: nonvolatile        active
Authentication Protocol: SHA
Privacy Protocol: AES128
Group-name: OPS-GROUP
```

`Authentication Protocol: SHA` and `Privacy Protocol: AES128` — both present, which is what `priv` means.

```
R1#show snmp group
groupname: OPS-GROUP                       security model:v3 priv
readview : OPS-VIEW                        writeview: <no writeview specified>
notifyview: <no notifyview specified>
row status: active     access-list: 20
```

`security model:v3 priv`, a read view, **no write view**, and an ACL. That is the shape of a correctly configured monitoring account: it can read what it needs, cannot change anything, and only from the management subnet.
{{< /verify >}}

{{< verify dev="R1" cmd="trigger a trap and confirm it was sent" >}}
```
R1(config)#interface GigabitEthernet0/1
R1(config-if)#shutdown
R1(config-if)#no shutdown
```

```
R1#show logging | include LINK-3|LINEPROTO-5
Sep  6 15:02:41.882 AEST: %LINK-3-UPDOWN: Interface GigabitEthernet0/1, changed state to down
Sep  6 15:02:44.117 AEST: %LINEPROTO-5-UPDOWN: Line protocol on Interface Gi0/1, changed state to up
```

Two messages for one event: `%LINK-3` is the physical layer (severity 3, error) and `%LINEPROTO-5` is the line protocol (severity 5, notification). Both are normal for an interface bounce; seeing only one of them means the fault is at that layer specifically.

And the trap counter should have moved:

```
R1#show snmp host
Notification host: 10.0.10.100  udp-port: 162   type: trap
```

```
R1#show snmp | include Logging to
    Logging to 10.0.10.100.162, 0/10, 28 sent, 0 dropped.
```

`sent` incremented, `dropped` still zero.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| No logs at the collector | wrong host, UDP 514 filtered, or trap level too low | `show logging` — check the Trap section |
| Interface flaps not logged | `logging trap` set to 4 or lower | set it to **5** — up/down is severity 5 |
| Console unusable | `logging console` at debugging | set it to 4; use `show logging` |
| Logs have no date | `service timestamps` missing | add `datetime msec localtime` |
| Device appears under several addresses | no `logging source-interface` | set it to a loopback |
| SNMP polls fail | community mismatch or ACL | `show snmp` — `Unknown community name` |
| `Unknown community name` climbing | someone is guessing strings | tighten the ACL; move to v3 |
| No traps received | `snmp-server enable traps` missing | `show snmp host` |
| Counters wrap on a fast link | 32-bit counters — SNMPv1 | use v2c or v3 for 64-bit |

## Exam notes

- Severity **0 emergencies → 7 debugging**. Setting level *n* captures **0 through n**.
- **Interface up/down and config changes are level 5 (notifications).**
- Syslog is **UDP 514**. SNMP agent **UDP 161**, traps **UDP 162**.
- Destinations: `logging host` + `logging trap` (remote), `logging buffered`, `logging console`, `logging monitor` (+ `terminal monitor`).
- `%FACILITY-severity-MNEMONIC` — the number in the middle is the severity.
- SNMPv2c community strings are **cleartext**. Never `RW`, always with an ACL.
- **TRAP** is unacknowledged; **INFORM** is acknowledged and retried.
- SNMPv3 levels: **noAuthNoPriv, authNoPriv, authPriv**. Build view → group → user → host.
- v2c added GETBULK, informs and 64-bit counters; v3 added authentication and encryption.

---

*Sources: Jeremy's IT Lab Day 40 & 41 · Flackbox CCNA Lab Guide 34 · verified in Packet Tracer 8.2.*
