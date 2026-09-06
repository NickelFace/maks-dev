---
title: "Lab 01 · The IOS CLI"
date: 2026-09-06
description: "Modes, context help, abbreviation, the two configuration files, and why an unsaved reload is the most common way to lose an afternoon."
tags: ["CCNA", "Cisco IOS", "CLI", "Lab"]
categories: ["CCNA"]
domain: 1
tool: "Packet Tracer"
duration: "30 min"
sources: "Jeremy's IT Lab Day 1, 4 · Flackbox 04"
aliases: ["/ccna-labs/ccna-lab-04-ios/"]
---

Everything in the rest of these labs is typed into the same command line, so it is worth half an hour getting fluent in it. The IOS CLI is not a shell — there is no history expansion, no pipes into other programs, no scripting. What it has instead is a strict mode hierarchy and a context-sensitive parser that will tell you exactly what it is willing to accept next, if you ask it.

This lab builds one router and one switch from a blank configuration, then deliberately loses the config to a reload so the difference between the running and startup files stops being an abstraction.

## Topology

{{< topology cols="3" rows="1" caption="One router, one switch, one PC — the smallest useful lab" >}}
pc   PC1 "192.168.1.10" at 0,0
switch SW1 "access" at 1,0
router R1 "192.168.1.1" at 2,0

PC1 — SW1
SW1 — R1 label="G0/0"
{{< /topology >}}

## Objectives

- Move between user EXEC, privileged EXEC, global config and interface config, and read the prompt to know where you are
- Use `?`, Tab completion and command abbreviation to stop typing full commands
- Set a hostname, banner, and console/VTY/enable passwords
- Understand `running-config` vs `startup-config`, and prove the difference by reloading
- Read `show version` and say what image, uptime and configuration register the box is using

---

## Part 1 — The three modes

{{< step num="1" dev="R1" title="Walk the mode hierarchy and watch the prompt change" open="true" >}}
```
Router>
Router>enable
Router#
Router#configure terminal
Enter configuration commands, one per line.  End with CNTL/Z.
Router(config)#interface GigabitEthernet0/0
Router(config-if)#exit
Router(config)#exit
Router#
```

The prompt is the mode indicator, and it is the only one you get:

| Prompt | Mode | What you can do |
|---|---|---|
| `Router>` | user EXEC | a handful of `show` commands, `ping`, `telnet` |
| `Router#` | privileged EXEC | every `show`, `debug`, `copy`, `reload`, `configure` |
| `Router(config)#` | global config | device-wide settings |
| `Router(config-if)#` | interface config | one interface |
| `Router(config-line)#` | line config | console, aux, VTY |
| `Router(config-router)#` | router config | one routing process |

Three ways back up: `exit` goes one level, `end` (or **Ctrl-Z**) jumps straight to privileged EXEC from anywhere in config mode.

The one shortcut worth memorising is `do`, which runs a privileged EXEC command without leaving config mode:

```
R1(config)#do show ip interface brief
```
{{< /step >}}

{{< step num="2" dev="R1" title="Make the parser do the typing" >}}
Context help — `?` on its own lists what is valid here:

```
R1#show ip ?
  access-lists   List access lists
  arp            IP ARP table
  interface      IP interface status and configuration
  ospf           OSPF information
  protocols      IP routing protocol process parameters and statistics
  route          IP routing table
```

`?` attached to a partial word lists completions:

```
R1#show ip int?
interface  interfaces
```

Tab completes an unambiguous prefix. And any prefix that is unique can simply be *used*:

```
R1#sh ip int br
R1#conf t
R1(config)#int g0/0
```

Two error messages, and they mean different things:

```
R1#show ip rout
% Invalid input detected at '^' marker.

R1#show ip r
% Ambiguous command:  "show ip r"
```

**Invalid input** — the parser reached a word it does not recognise, and the `^` sits under the first bad character. **Ambiguous** — what you typed matches more than one keyword (`route`, `rip`, `rpf`...). Add letters until it is unique.
{{< /step >}}

{{< step num="3" dev="R1" title="Two habits that make the console usable" >}}
```
R1(config)#no ip domain-lookup
R1(config)#line console 0
R1(config-line)#logging synchronous
R1(config-line)#exec-timeout 30 0
R1(config-line)#exit
```

`no ip domain-lookup` stops IOS from treating a typo as a hostname and trying to resolve it — which, with no DNS server configured, hangs the console for about a minute. On a lab device this is the single most valuable line of configuration there is.

`logging synchronous` reprints your half-typed command after a syslog message interrupts it, instead of leaving you to guess what you had typed.

`exec-timeout 30 0` is thirty minutes and zero seconds. `exec-timeout 0 0` disables the timeout entirely — convenient in a lab, unacceptable in production.

If a lookup does start, **Ctrl-Shift-6** aborts it.
{{< /step >}}

---

## Part 2 — Baseline device configuration

{{< step num="4" dev="R1" title="Identity, passwords and banner" >}}
```
R1>enable
R1#configure terminal
R1(config)#hostname R1
R1(config)#enable secret Cisc0Lab!
R1(config)#service password-encryption
R1(config)#banner motd #
Authorized access only. Activity is logged.
#
R1(config)#line console 0
R1(config-line)#password Con5ole!
R1(config-line)#login
R1(config-line)#exit
R1(config)#line vty 0 4
R1(config-line)#password Vty!2026
R1(config-line)#login
R1(config-line)#transport input telnet
R1(config-line)#exit
R1(config)#end
```

`enable secret` and `enable password` are not two flavours of the same thing. `enable secret` is hashed (MD5 by default, type 8/9 with `algorithm-type sha256|scrypt` on modern IOS) and takes precedence. `enable password` is plaintext, obsolete, and should not appear in a config you write in 2026.

`service password-encryption` applies type-7 encryption to the *other* passwords — console, VTY, `enable password`. Type 7 is a reversible cipher with published decoders. It defends against someone reading over your shoulder and nothing else. Configure it, and do not trust it.

The banner delimiter is whatever character follows `banner motd`. Here it is `#`, so the banner text may not contain `#`.
{{< /step >}}

{{< step num="5" dev="SW1" title="The same baseline on a switch, plus a management address" >}}
```
Switch>enable
Switch#configure terminal
Switch(config)#hostname SW1
SW1(config)#no ip domain-lookup
SW1(config)#enable secret Cisc0Lab!
SW1(config)#interface Vlan1
SW1(config-if)#ip address 192.168.1.2 255.255.255.0
SW1(config-if)#no shutdown
SW1(config-if)#exit
SW1(config)#ip default-gateway 192.168.1.1
SW1(config)#line console 0
SW1(config-line)#logging synchronous
SW1(config-line)#end
```

Two things differ from the router:

A Layer 2 switch has **no routable interfaces**. Its IP address lives on an SVI — a virtual interface for a VLAN — and exists purely so you can manage the box. Traffic through the switch is not affected by it in any way.

Because the switch does not route, it needs `ip default-gateway` to reply to management traffic from another subnet. A router, which does route, uses `ip route 0.0.0.0 0.0.0.0` instead. Configuring `ip default-gateway` on a router, or on a switch that has `ip routing` enabled, does nothing.

Switch interfaces are also `no shutdown` by default; router interfaces are not.
{{< /step >}}

---

## Part 3 — running-config and startup-config

This is the part that costs people real work, so do it properly once.

{{< step num="6" dev="R1" title="See the difference before saving" >}}
```
R1#show running-config | begin line con
line con 0
 exec-timeout 30 0
 password 7 08221D5D0A16544541
 logging synchronous
 login
!
R1#show startup-config
startup-config is not present
```

`running-config` lives in RAM and is what the device is doing *right now* — every command takes effect the instant you press Enter. `startup-config` lives in NVRAM and is what the device will load at the next boot. Nothing moves between them by itself.

`| begin`, `| include`, `| exclude` and `| section` are the four filters worth knowing. `| section` is the best of them:

```
R1#show running-config | section interface GigabitEthernet0/0
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 duplex auto
 speed auto
```
{{< /step >}}

{{< step num="7" dev="R1" title="Lose the configuration on purpose" >}}
Reload without saving:

```
R1#reload
System configuration has been modified. Save? [yes/no]: no
Proceed with reload? [confirm]
```

The box comes back as `Router>` with none of your work. This is not a Packet Tracer quirk — it is what a real 2911 does after a power cut.

Now do it correctly:

```
R1#copy running-config startup-config
Destination filename [startup-config]?
Building configuration...
[OK]
```

`write memory` (`wr`) is the older synonym and still works everywhere. `copy running-config startup-config` is the one to learn, because it makes the direction explicit — and `copy startup-config running-config` is a very different, and occasionally useful, operation that **merges** rather than replaces.

To genuinely wipe a device back to factory:

```
R1#erase startup-config
Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]
R1#delete vlan.dat          ! switches only — VLANs do not live in startup-config
R1#reload
```
{{< /step >}}

{{< verify dev="R1" cmd="show version" open="true" >}}
```
R1#show version
Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.1(4)M4
ROM: System Bootstrap, Version 15.1(4)M4, RELEASE SOFTWARE (fc1)

R1 uptime is 12 minutes
System returned to ROM by power-on
System image file is "flash0:c2900-universalk9-mz.SPA.151-4.M4.bin"

Cisco CISCO2911/K9 (revision 1.0) with 491520K/32768K bytes of memory.
Processor board ID FTX152400KS
3 Gigabit Ethernet interfaces
255K bytes of non-volatile configuration memory.
249856K bytes of ATA System CompactFlash 0 (Read/Write)

Configuration register is 0x2102
```

Four things to read off it:

- **Version** — the IOS release, for bug and feature checks
- **System image file** — which file in flash actually booted; a device can hold several
- **Uptime** and **System returned to ROM by** — was the last restart a `reload` or a power cut?
- **Configuration register `0x2102`** — normal operation, load startup-config at boot. `0x2142` skips startup-config, which is the entire mechanism behind password recovery (Lab 29).
{{< /verify >}}

{{< verify dev="SW1" cmd="show ip interface brief" >}}
```
SW1#show ip interface brief
Interface              IP-Address      OK? Method Status                Protocol
FastEthernet0/1        unassigned      YES manual up                    up
FastEthernet0/2        unassigned      YES manual down                  down
Vlan1                  192.168.1.2     YES manual up                    up
```

`Status` is Layer 1 (is there a signal on the wire), `Protocol` is Layer 2 (is the line protocol up). The four combinations each mean something specific:

| Status | Protocol | Meaning |
|---|---|---|
| up | up | working |
| up | down | Layer 2 problem — encapsulation or keepalive mismatch |
| down | down | no cable, far end shut, or speed mismatch |
| administratively down | down | someone typed `shutdown` |

Finish by proving reachability both ways:

```
SW1#ping 192.168.1.1
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 0/1/2 ms
```
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Fix |
|---|---|---|
| Console hangs ~60 s after a typo | `ip domain-lookup` on, no DNS | `no ip domain-lookup`; Ctrl-Shift-6 to abort |
| Config gone after a reload | never saved | `copy running-config startup-config` |
| VLANs gone but config intact | VLANs live in `vlan.dat`, not startup-config | `delete vlan.dat` is what wipes them |
| `% Ambiguous command` | prefix matches several keywords | add characters |
| Cannot Telnet in, console works | no VTY password, or no `login` | set both, or use `login local` with a username |
| Switch pingable locally, not remotely | missing `ip default-gateway` | add it |

## Exam notes

- `enable secret` beats `enable password` when both exist; secret is hashed, password is not.
- `service password-encryption` is type 7 — reversible, not a security control.
- VTY lines with `login` and no `password` refuse all logins with "password required, but none set".
- `running-config` = RAM = now. `startup-config` = NVRAM = next boot. Nothing syncs automatically.
- `copy startup-config running-config` merges; it does not remove commands the running config has and the startup config lacks.
- Config register `0x2102` = normal, `0x2142` = ignore startup-config.
- Router interfaces default to `shutdown`; switch interfaces do not.

---

*Sources: Jeremy's IT Lab Day 1 & 4 · Flackbox CCNA Lab Guide 04 · verified in Packet Tracer 8.2.*
