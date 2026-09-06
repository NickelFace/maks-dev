---
title: "Lab 27 · IOS File Management, FTP and TFTP"
date: 2026-09-06
description: "Back up a configuration, upgrade an image, and recover a device whose password nobody wrote down — the three operations that are only ever done under pressure."
tags: ["CCNA", "TFTP", "FTP", "IOS", "Lab"]
categories: ["CCNA"]
domain: 4
tool: "Packet Tracer"
duration: "40 min"
sources: "Jeremy's IT Lab Day 43 · Flackbox 15, 34"
aliases: ["/ccna-labs/ccna-lab-15-device-management/"]
---

Every operation in this lab is one you will perform for the first time in an outage, at 2 a.m., on a device you have never seen. That is an argument for practising them now, in a lab, where a mistake costs nothing.

## Topology

{{< topology cols="3" rows="1" caption="A router, a switch and a file server running both TFTP and FTP" >}}
router R1 "10.0.10.1" at 0,0
switch SW1 "10.0.10.2" at 1,0
server SRV "10.0.10.100 · TFTP/FTP" at 2,0

R1 — SW1
SW1 — SRV
{{< /topology >}}

## Objectives

- Navigate the IOS filesystem and read `show flash` and `dir`
- Back up and restore a configuration over TFTP and over FTP
- Copy a new IOS image into flash and set the boot order
- Verify an image before booting it
- Recover a router and a switch whose enable password is unknown

---

## Part 1 — The filesystem

{{< step num="1" dev="R1" title="What is actually in flash" open="true" >}}
```
R1#show flash:

-#- --length-- -----date/time------ path
1    33591768   Sep 06 2026 09:12:04  c2900-universalk9-mz.SPA.151-4.M4.bin
2    1638       Sep 06 2026 14:22:11  config.text.backup
3    3064       Sep 06 2026 09:14:33  cpconfig-2900.cfg

228679680 bytes available (33595392 bytes used)
```

The number that matters is **bytes available**. A failed upgrade because there was not room for the new image alongside the old one is a common and entirely avoidable outage.

```
R1#dir flash:
R1#dir nvram:
R1#show file systems

File Systems:

     Size(b)     Free(b)      Type  Flags  Prefixes
           -           -    opaque     rw   archive:
           -           -    opaque     rw   system:
       262136      258808     nvram     rw   nvram:
*  262275072   228679680      disk     rw   flash0: flash:
           -           -   network     rw   tftp:
           -           -   network     rw   ftp:
           -           -   network     rw   scp:
```

The `*` marks the current default filesystem. The `network` entries are what make `copy tftp: flash:` work — TFTP, FTP and SCP are addressed exactly like local storage.

The prefixes worth knowing:

| Prefix | Contents |
|---|---|
| `flash:` / `flash0:` | IOS images, backups |
| `nvram:` | `startup-config`, `vlan.dat` on some platforms |
| `system:` | `running-config` lives at `system:running-config` |
| `tftp:` `ftp:` `scp:` | network destinations |
{{< /step >}}

{{< step num="2" dev="R1" title="Back up the configuration — two ways" >}}
Over TFTP:

```
R1#copy running-config tftp:
Address or name of remote host []? 10.0.10.100
Destination filename [r1-confg]? R1-2026-09-06.cfg
!!
1638 bytes copied in 0.412 secs (3976 bytes/sec)
```

**TFTP is UDP 69, has no authentication, and sends everything in cleartext.** A running-config contains hashed passwords, SNMP community strings and pre-shared keys. On a management network it is acceptable; anywhere else it is a data leak.

Over FTP, which at least has credentials:

```
R1(config)#ip ftp username backup
R1(config)#ip ftp password B@ckupP@ss
R1(config)#end
R1#copy running-config ftp:
Address or name of remote host []? 10.0.10.100
Destination filename [r1-confg]? R1-2026-09-06.cfg
Writing R1-2026-09-06.cfg !
1638 bytes copied in 0.288 secs (5687 bytes/sec)
```

FTP is **TCP 20 (data) and 21 (control)**, and it is also cleartext — including the credentials. The genuinely secure option is **SCP**, which runs over SSH and needs no new protocol on the network:

```
R1(config)#ip scp server enable
```

```
R1#copy running-config scp:
Address or name of remote host []? 10.0.10.100
Destination username [admin]? backup
Destination filename [r1-confg]? R1-2026-09-06.cfg
Password:
```

**Use SCP where the device supports it.** TFTP survives because it is simple enough to run from ROMMON on a bricked device, which is the one case where nothing else works.

Restoring is the same command reversed, and the direction matters:

```
R1#copy tftp: running-config      ! MERGES into the running config
R1#copy tftp: startup-config      ! REPLACES the startup config
```

**`copy tftp: running-config` merges.** It adds and overwrites the commands in the file and removes nothing. A restore of a config that had fewer ACL lines than the running one leaves the extra lines in place. To genuinely replace:

```
R1#configure replace flash:config.text.backup
```

Or copy to `startup-config` and reload.
{{< /step >}}

{{< verify dev="R1" cmd="verify the backup landed" open="true" >}}
```
R1#more tftp://10.0.10.100/R1-2026-09-06.cfg | include hostname|interface
hostname R1
interface GigabitEthernet0/0
interface GigabitEthernet0/1
```

Reading the file back off the server is the only way to be sure the copy succeeded — the `!!` progress marks say the transfer completed, not that the content is right.

Keep a copy locally too, so a recovery does not depend on the network:

```
R1#copy running-config flash:config.text.backup
```
{{< /verify >}}

---

## Part 2 — IOS upgrade

{{< step num="3" dev="R1" title="Copy the image, check the space first" >}}
```
R1#show flash: | include available
228679680 bytes available (33595392 bytes used)
```

The new image must fit **alongside** the old one. Deleting the running image before the new one is verified is how a router becomes a doorstop.

```
R1#copy tftp: flash:
Address or name of remote host []? 10.0.10.100
Source filename []? c2900-universalk9-mz.SPA.157-3.M5.bin
Destination filename [c2900-universalk9-mz.SPA.157-3.M5.bin]?
Accessing tftp://10.0.10.100/c2900-universalk9-mz.SPA.157-3.M5.bin...
Loading c2900-universalk9-mz.SPA.157-3.M5.bin from 10.0.10.100:
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
[OK - 41236492 bytes]

41236492 bytes copied in 184.328 secs (223716 bytes/sec)
```

Then **verify before you boot it.** A truncated or corrupted image produces a device that reboots into ROMMON, and at that point you are on-site with a console cable:

```
R1#verify /md5 flash:c2900-universalk9-mz.SPA.157-3.M5.bin
.....................MD5 of flash:c2900-universalk9-mz.SPA.157-3.M5.bin Done!
verify /md5 (flash:c2900-universalk9-mz.SPA.157-3.M5.bin) = 4c6a1f8e9d2b7a3c5e1f0d8b6a4c2e90
```

Compare that against the MD5 Cisco publishes on the download page. If it does not match, delete the file and copy it again — do not boot it.
{{< /step >}}

{{< step num="4" dev="R1" title="Set the boot order with a fallback" >}}
```
R1(config)#boot system flash:c2900-universalk9-mz.SPA.157-3.M5.bin
R1(config)#boot system flash:c2900-universalk9-mz.SPA.151-4.M4.bin
R1(config)#end
R1#copy running-config startup-config
```

**Two `boot system` lines, in order, new first.** IOS tries them top to bottom, so if the new image fails to load the router falls back to the old one automatically instead of dropping to ROMMON. Leaving the old image in flash and listing it second costs 33 MB and buys an unattended recovery.

With no `boot system` statement at all, the router boots the **first valid image it finds in flash** — alphabetical order, which is not a property you want to depend on.

```
R1#show boot
BOOT variable = flash:c2900-universalk9-mz.SPA.157-3.M5.bin,12;
                flash:c2900-universalk9-mz.SPA.151-4.M4.bin,12;
Configuration register is 0x2102
```

After the reload, confirm what actually booted:

```
R1#show version | include System image|Version
Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.7(3)M5
System image file is "flash:c2900-universalk9-mz.SPA.157-3.M5.bin"
```

Only once that is confirmed and the device has been in service for a while should the old image be removed:

```
R1#delete flash:c2900-universalk9-mz.SPA.151-4.M4.bin
```
{{< /step >}}

---

## Part 3 — Password recovery

{{< step num="5" dev="R1" title="Router: the config register procedure" open="true" >}}
Physical console access is required. That is not a limitation of the procedure — it is the security model. Anyone with the console cable owns the device, which is why routers live in locked rooms.

1. **Power-cycle** the router and send a **Break** within the first 60 seconds (Ctrl-Break in PuTTY, Ctrl-] in some terminals). You land in ROMMON:

```
rommon 1 >
```

2. **Set the config register to skip startup-config:**

```
rommon 1 > confreg 0x2142
rommon 2 > reset
```

`0x2142` differs from the normal `0x2102` in exactly one bit — bit 6, "ignore NVRAM contents". The router boots with an empty running config and never reads the startup config, so the password never applies.

3. The router boots to setup mode. Decline it, then **copy the startup config into the running config**:

```
Would you like to enter the initial configuration dialog? [yes/no]: no

Router>enable
Router#copy startup-config running-config
```

**This direction, not the other.** `copy startup-config running-config` recovers the entire existing configuration. Typing them the wrong way round writes the empty running config over the startup config and destroys everything the device was doing.

4. **Change the password and restore the register:**

```
R1#configure terminal
R1(config)#enable secret NewP@ssw0rd
R1(config)#username admin privilege 15 secret NewAdm1n!
```

Every interface will be `shutdown`, because that is the default state and they were brought up from the startup config that was skipped:

```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#no shutdown
R1(config-if)#exit
R1(config)#config-register 0x2102
R1(config)#end
R1#copy running-config startup-config
R1#reload
```

Forgetting `config-register 0x2102` means the router ignores its startup config on **every** future boot — it works now and fails at the next power cut, which is the worst possible time to discover it.
{{< /step >}}

{{< step num="6" dev="SW1" title="Switch: hold MODE and rename the config" >}}
Catalyst switches have no config register. The procedure is different and platform-specific:

1. Power off. Hold the **MODE** button, power on, release when the SYST LED flashes.
2. You land in the switch bootloader:

```
switch:
```

3. Initialise flash and **rename** the config file so the boot process cannot find it:

```
switch: flash_init
switch: dir flash:
switch: rename flash:config.text flash:config.old
switch: boot
```

4. The switch boots with no configuration. **Rename it back and load it:**

```
Switch>enable
Switch#rename flash:config.old flash:config.text
Switch#copy flash:config.text running-config
SW1#configure terminal
SW1(config)#enable secret NewP@ssw0rd
SW1(config)#end
SW1#copy running-config startup-config
```

The principle is identical to the router — prevent the saved configuration from loading, then recover it manually — but the mechanism is renaming a file rather than flipping a register bit.

`no service password-recovery` (Lab 26) disables both procedures. On a device in a public space that is correct hardening; the cost is that a forgotten password means a full wipe.
{{< /step >}}

{{< verify dev="R1" cmd="show version | include register" >}}
```
R1#show version | include register
Configuration register is 0x2102
```

The check to run after any recovery, and worth adding to a build audit. `0x2142` here means the next reboot will come up unconfigured.

`Configuration register is 0x2142 (will be 0x2102 at next reload)` means the change is staged but not yet active — the register value only takes effect at boot.
{{< /verify >}}

{{< verify dev="R1" cmd="show flash: and verify" >}}
Final state — both images present, the new one booting, a config backup on disk:

```
R1#show flash:
-#- --length-- -----date/time------ path
1    33591768   Sep 06 2026 09:12:04  c2900-universalk9-mz.SPA.151-4.M4.bin
2    41236492   Sep 06 2026 15:31:22  c2900-universalk9-mz.SPA.157-3.M5.bin
3    1638       Sep 06 2026 14:22:11  config.text.backup

187443188 bytes available (74829888 bytes used)
```
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Fix |
|---|---|---|
| TFTP copy hangs | UDP 69 blocked, or the server directory is not writable | check the ACL and the server |
| Restore did not remove old commands | `copy tftp: running-config` **merges** | use `configure replace` |
| Router boots into ROMMON | corrupt or missing image | `verify /md5` before booting; keep a fallback `boot system` |
| No room for the new image | flash full | check `show flash:` first |
| Device comes up unconfigured after a reload | config register left at `0x2142` | `config-register 0x2102` |
| Recovery wiped the configuration | typed `copy running-config startup-config` at step 3 | it is `copy startup-config running-config` |
| Interfaces down after recovery | default state — startup config was skipped | `no shutdown` each one |
| MODE button procedure does nothing | `no service password-recovery` | the device must be wiped |

## Exam notes

- **TFTP: UDP 69**, no authentication, cleartext. **FTP: TCP 20/21**, credentials in cleartext. **SCP: TCP 22**, over SSH.
- `copy tftp: running-config` **merges**; `copy tftp: startup-config` replaces. `configure replace` does a true replace.
- `verify /md5 flash:<image>` before booting a new image.
- Multiple **`boot system`** lines are tried in order — list the fallback second.
- **`0x2102`** = normal boot. **`0x2142`** = ignore startup-config (password recovery).
- Router recovery: Break → ROMMON → `confreg 0x2142` → `reset` → **`copy startup-config running-config`** → change password → `config-register 0x2102` → save → reload.
- Switch recovery: MODE button → `flash_init` → `rename flash:config.text flash:config.old` → `boot` → rename back → copy to running.
- After recovery, interfaces are in their default state — routers come up `shutdown`.

---

*Sources: Jeremy's IT Lab Day 43 · Flackbox CCNA Lab Guide 15, 34 · verified in Packet Tracer 8.2.*
