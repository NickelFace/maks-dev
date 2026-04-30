---
title: "LPIC-1 101.2 — Boot the System"
date: 2025-07-05
description: "Boot sequence, BIOS vs UEFI, GRUB 2, kernel parameters, initramfs, SysVinit, systemd, dmesg and journalctl. LPIC-1 exam topic 101.2."
tags: ["Linux", "LPIC-1", "Boot", "systemd", "GRUB"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-101-2-boot-the-system/"
page_lang: "en"
---

> **Exam weight: 3** — LPIC-1 v5, Exam 101

## What you need to know

- Pass parameters to the bootloader and kernel at system start
- Describe the boot sequence from BIOS/UEFI to a fully running system
- Understand SysVinit and systemd
- Know what Upstart is
- Inspect boot logs with `dmesg` and `journalctl`

---

## Boot sequence

Linux boot passes through several distinct stages. Know their order — the exam frequently tests exactly this.

```
Power on
      |
      v
BIOS / UEFI  (POST, hardware initialisation)
      |
      v
Bootloader (GRUB 2)
      |
      v
Linux kernel (vmlinuz)
      |
      v
initramfs (temporary root filesystem)
      |
      v
init / systemd (PID 1)
      |
      v
Runlevels / targets
```

---

## BIOS vs UEFI

### BIOS (Basic Input/Output System)

BIOS is stored in a non-volatile chip on the motherboard and runs every time the machine powers on. It is firmware — physically separate from ordinary storage devices.

Exact BIOS boot sequence:

1. POST (Power-On Self Test) checks hardware immediately at power-on
2. BIOS activates basic components: video output, keyboard, storage
3. BIOS reads the **first 440 bytes** of the first storage device (per boot order settings) — that is the first-stage bootloader
4. The first-stage bootloader invokes the second stage, which shows a menu and loads the kernel

About MBR: the first **512 bytes** of a disk using the DOS partition scheme are called the MBR (Master Boot Record). The MBR contains the first-stage bootloader (first 440 bytes) and the partition table. A corrupted MBR means the system will not boot.

Exam note: BIOS **initiates** the boot process after power-on, and some boot parameters are configured through it. BIOS does **not** load from a hard disk — it is embedded in a chip on the motherboard.

### UEFI (Unified Extensible Firmware Interface)

UEFI is also firmware, but works fundamentally differently. Key differences:

- Can read partition tables and work with filesystems directly
- **Does not use MBR** — reads settings from NVRAM on the motherboard
- NVRAM stores paths to EFI applications that run automatically or from a boot menu
- Supports Secure Boot: only runs signed EFI applications authorised by the manufacturer

EFI applications (bootloader, diagnostics, OS selector) live on the **EFI System Partition (ESP)**. ESP is not shared with the root filesystem or user data. Compatible filesystems for ESP: FAT12, FAT16, FAT32 for block devices; ISO-9660 for optical media.

Exact UEFI boot sequence:

1. POST checks hardware
2. UEFI activates basic components: video output, keyboard, storage
3. UEFI reads NVRAM and launches the specified EFI application from ESP — usually the bootloader
4. The bootloader loads the kernel and starts the operating system

ESP is typically mounted at `/boot/efi`. It holds a `.efi` file such as `grubx64.efi`. The `/EFI` directory on ESP contains applications referenced by NVRAM entries.

Exam note: on a UEFI system the bootloader is stored **on ESP**, not in the MBR. UEFI **can** read partition tables and work with FAT filesystems. UEFI configuration is stored in NVRAM, not in `/boot`.

---

## GRUB 2

GRUB (Grand Unified Bootloader) is the most common bootloader for Linux on x86. BIOS or UEFI hands control to GRUB, which then shows a list of available operating systems.

If the menu doesn't appear automatically: on BIOS systems hold `Shift` during GRUB boot; on UEFI systems press `Esc`.

### Key files

```
/etc/default/grub            — user settings (edit here)
/etc/grub.d/                 — scripts that generate grub.cfg
/boot/grub/grub.cfg          — final config (do not edit directly)
/boot/grub/i386-pc/          — GRUB modules for BIOS systems (e.g. lvm.mod)
```

`grub.cfg` must be regenerated every time `/etc/default/grub` is changed:

```bash
grub-mkconfig -o /boot/grub/grub.cfg
```

On Debian/Ubuntu there is a convenient alias:

```bash
update-grub
```

### Installing GRUB

```bash
# Install GRUB to MBR of the first disk
grub-install /dev/sda

# Install to MBR of the third disk
grub-install /dev/sdc
```

### Passing kernel parameters through GRUB

At the GRUB menu, press `e` to edit an entry. Find the line starting with `linux` and append parameters to the end. For example:

```
linux /boot/vmlinuz-5.15.0 root=/dev/sda1 ro quiet splash
```

Press `Ctrl+X` or `F10` to boot with the modified parameters. Changes are **temporary** — they do not survive a reboot.

To make parameters permanent, add them to `/etc/default/grub` in the `GRUB_CMDLINE_LINUX` line, then regenerate the config with `grub-mkconfig`.

### Kernel parameters

Most parameters use the format `option=value`. Full list from the LPI exam objectives:

| Parameter | Description |
|---|---|
| `acpi=off` | Disable ACPI support |
| `init=/bin/bash` | Set an alternative initialiser (e.g. launch bash instead of init) |
| `systemd.unit=graphical.target` | Set the systemd target at boot |
| `1` or `S` | Boot into runlevel 1 (single-user mode) |
| `mem=512M` | Limit available RAM (useful in VMs) |
| `maxcpus=2` | Limit visible CPU cores |
| `maxcpus=0` | Disable SMP support (same as `nosmp`) |
| `quiet` | Suppress most boot messages |
| `vga=ask` | Show a list of available video modes for selection |
| `root=/dev/sda3` | Set a root partition different from the one in the bootloader config |
| `rootflags=` | Root filesystem mount options |
| `ro` | Mount root read-only during initial boot |
| `rw` | Allow writes to root filesystem during initial boot |

The `init=/bin/bash` parameter is useful for recovery: bash starts immediately after the kernel, bypassing init and all services. Note that the root filesystem is mounted read-only, so run `mount -o remount,rw /` right away.

---

## Kernel and initramfs

### Linux kernel

The kernel loads as a compressed file, typically `vmlinuz` or `vmlinuz-<version>`, located in `/boot/`. After decompression the kernel initialises hardware, mounts initramfs and starts the first process.

Parameters passed to the kernel at boot are available in the running system:

```bash
cat /proc/cmdline
```

### initramfs

initramfs (initial RAM filesystem) is a temporary root filesystem in RAM. The kernel mounts it before switching to the real root partition.

Why it is needed: the real root partition may be on LVM, RAID, an encrypted device or the network. Mounting all of that requires drivers the kernel does not yet have. initramfs contains a minimal set of tools and modules that locate and mount the real root.

Exam facts:
- initramfs is a **compressed cpio archive** — it can be unpacked and inspected
- the kernel uses initramfs **temporarily**, then switches to the real root
- after a successful boot, initramfs contents are available at `/run/initramfs/`
- initramfs is **tied to a specific kernel version**

Inspect initramfs contents:

```bash
# For cpio format
lsinitramfs /boot/initrd.img-$(uname -r)

# Manually
mkdir /tmp/initramfs_test
cd /tmp/initramfs_test
zcat /boot/initrd.img-$(uname -r) | cpio -idmv
```

---

## Init systems

After the kernel finishes, it unpacks initramfs, mounts filesystems from `/etc/fstab`, then launches the first program — `init`. This `init` process (PID 1) starts all initialisation scripts and system daemons. Once init is running, initramfs is released from memory.

Init scripts run short tasks and exit. Daemons (services) run continuously. Any init system can at minimum start, stop and restart a service.

Historically Linux used three different init systems.

---

## SysVinit

SysVinit comes from Unix System V and still appears on legacy systems — that is why the exam covers it.

SysVinit manages daemons through the concept of **runlevels**, numbered 0–6, defined by the distribution. The only runlevels with a consistent meaning across all distributions are 0, 1 and 6.

First process: `/sbin/init` with PID 1.

### Runlevels

| Runlevel | Description |
|----------|-------------|
| 0 | Halt |
| 1 | Single-user mode |
| 2 | Multi-user without NFS (Debian) |
| 3 | Multi-user with network |
| 4 | Unused (user-defined) |
| 5 | Multi-user with GUI |
| 6 | Reboot |

### Init scripts

```
/etc/inittab            — main config (defines default runlevel)
/etc/rc.d/              — rc script directories (RHEL)
/etc/init.d/            — service scripts
/etc/rc0.d/ ... /etc/rc6.d/  — symlinks to scripts per runlevel
```

Scripts in `/etc/rcN.d/` are named: `S20apache2` (S = Start, 20 = order) or `K80apache2` (K = Kill). The number sets start or stop order.

```bash
# Switch runlevel
telinit 3

# Show current runlevel
runlevel

# Manage a service
/etc/init.d/apache2 start
/etc/init.d/apache2 stop
```

---

## Upstart

Upstart was developed by Canonical for Ubuntu. Its main goal was faster boot through parallel service startup. Ubuntu used Upstart in older releases before switching to systemd. For the exam: know that Upstart existed and how it differed from SysVinit.

Upstart used an event-driven model: services started and stopped in response to events (e.g. "a network interface appeared"). Configuration files lived in `/etc/init/` with the `.conf` extension. Services were managed with `initctl`.

---

## systemd

systemd is a modern system and service manager with a SysV compatibility layer. From the LPI learning material: systemd has a concurrent architecture, uses sockets and D-Bus for service activation, supports on-demand daemon startup, process monitoring via cgroups, state snapshots, session recovery, mount point management and dependency handling. Most major distributions switched to systemd in recent years.

All current major distributions use systemd: Ubuntu 15.04+, Debian 8+, RHEL/CentOS 7+, Arch, Fedora.

First process: `/sbin/init` (symlink to `/lib/systemd/systemd`) with PID 1.

### Targets

Targets in systemd replace SysVinit runlevels.

| Target | Runlevel equivalent | Description |
|--------|---------------------|-------------|
| poweroff.target | 0 | Shutdown |
| rescue.target | 1 | Single-user |
| multi-user.target | 3 | Multi-user without GUI |
| graphical.target | 5 | Multi-user with GUI |
| reboot.target | 6 | Reboot |
| emergency.target | — | Emergency shell |

### Key commands

```bash
# Set default target
systemctl set-default multi-user.target

# Switch to a target immediately
systemctl isolate rescue.target

# Show current default target
systemctl get-default

# Service management
systemctl start nginx
systemctl stop nginx
systemctl restart nginx
systemctl enable nginx      # start at boot
systemctl disable nginx     # remove from autostart
systemctl status nginx

# Show all dependencies of a target
systemctl list-dependencies multi-user.target
```

### Units

systemd works with units of different types:
- `.service` — services
- `.target` — groups of services
- `.mount` — mount points
- `.socket` — sockets for socket activation
- `.timer` — cron replacement

System units: `/lib/systemd/system/`
User-defined and overrides: `/etc/systemd/system/`

```bash
# List all units
systemctl list-units

# List all targets
systemctl list-units --type=target
```

---

## Boot logs

Boot errors are not always critical but can affect system behaviour. They are all captured in logs with timestamps. Even without errors, boot logs are useful for tuning and diagnostics.

### dmesg

The kernel stores its messages, including boot messages, in a **ring buffer**. Messages stay there even if a boot animation was shown instead. The buffer is lost at shutdown and when explicitly cleared with `dmesg --clear`.

The numbers at the start of each line are seconds since the kernel started booting.

```bash
# Show full buffer
dmesg

# With human-readable timestamps
dmesg -T

# Errors and critical messages only
dmesg --level=err,crit

# Clear the buffer
dmesg --clear

# Follow new messages in real time
dmesg -w

# Paginated output (built-in pager, no pipe needed)
dmesg -H
```

The buffer is cleared only by explicit `dmesg --clear` and at shutdown or reboot. Simply reading with `dmesg` does **not** clear it.

### journalctl

On systemd systems, `journalctl` shows initialisation messages. The systemd journal is not stored as plain text, so `journalctl` is required — `cat` won't work.

```bash
# Current boot (both are equivalent)
journalctl -b
journalctl -b 0

# Previous boot
journalctl -b -1

# List all saved boots with hashes and timestamps
journalctl --list-boots

# Kernel messages only (like dmesg)
journalctl -k
journalctl --dmesg

# Errors only
journalctl -p err

# Follow in real time
journalctl -f

# Specific service
journalctl -u nginx.service

# Last 30 minutes
journalctl --since "30 min ago"

# Read journal from a non-default directory
journalctl -D /path/to/directory
journalctl --directory=/path/to/directory
```

By default the systemd journal lives in `/var/log/journal/`. If persistent storage is not configured, it is stored in `/run/log/journal/` (RAM, does not survive reboot).

The `-b`, `--boot`, `-k` and `--dmesg` flags show boot messages. The `-D` and `--directory` flags let you read journals from another filesystem, for example after booting from a rescue disk.

### Files in /var/log/

```
/var/log/boot.log      — boot messages
/var/log/messages      — general system log (RHEL)
/var/log/syslog        — general system log (Debian/Ubuntu)
/var/log/dmesg         — dmesg output saved at boot
```

---

## Exam command reference

| Command / file | Purpose |
|---|---|
| `dmesg` | Kernel ring buffer |
| `journalctl` | systemd journal including boot |
| `grub-install /dev/sdX` | Install GRUB to disk MBR |
| `update-grub` | Regenerate grub.cfg |
| `systemctl set-default` | Set default target |
| `systemctl isolate` | Switch to a target immediately |
| `systemctl get-default` | Show current default target |
| `runlevel` | Current runlevel (SysVinit) |
| `telinit N` | Switch runlevel (SysVinit) |
| `/proc/cmdline` | Parameters passed to the kernel |
| `/boot/grub/grub.cfg` | GRUB 2 config file |

---

## Typical exam questions

**Q: What is true about the BIOS boot sequence?**
BIOS initiates the boot process after power-on, and some boot parameters are configured through it. BIOS does **not** load from a hard disk — it is embedded in a chip.

**Q: What is true about UEFI?**
UEFI can read partition tables and work with certain filesystems. Configuration is stored in NVRAM, not on the `/boot` partition.

**Q: Where is the bootloader stored on a UEFI system?**
On the EFI System Partition (ESP). Not in the MBR, not in the EBR.

**Q: What does the EFI System Partition contain?**
The first-stage bootloader (a `.efi` application file).

**Q: When is the kernel ring buffer cleared?**
At explicit `dmesg --clear` and at reboot or shutdown. Reading with `dmesg` does not clear it.

**Q: What is the first process launched by the kernel under SysVinit?**
`/sbin/init` with PID 1.

**Q: How do you set the default systemd target?**
`systemctl set-default multi-user.target`

**Q: What is true about initramfs?**
initramfs is a compressed cpio archive that can be unpacked and inspected. The kernel uses it temporarily, then switches to the real root. After boot, contents are available at `/run/initramfs/`.

**Q: How do you install GRUB to the MBR of the third hard disk?**
`grub-install /dev/sdc`

**Q: What is found in the /boot/ filesystem?**
Linux kernel images and initial ramdisk (initramfs) images. systemd units are not stored there.

---

## Related topics

- [101.1 Determine and Configure Hardware Settings](/posts/lpic1-101-1-hardware-settings/) — BIOS, UEFI, hardware resources
- 101.3 Change Runlevels and Boot Targets — managing runlevels and targets
- 102.6 Linux as a Virtualization Guest — booting in virtual machines

---

## Exercises

### Exercise 1 — Bootstrap location on a BIOS machine

On a machine with BIOS: where is the initial bootstrap binary located?

<details>
<summary>Answer</summary>

In the MBR of the first storage device, as configured in the BIOS boot order settings.

</details>

---

### Exercise 2 — EFI application location

UEFI supports external programs called EFI applications. Where are these applications stored on the system?

<details>
<summary>Answer</summary>

On the EFI System Partition (ESP), on any available block device with a compatible filesystem — typically FAT32.

</details>

---

### Exercise 3 — Passing the root parameter to the kernel

Bootloaders allow passing parameters to the kernel before it loads. A system fails to boot because the root filesystem location is incorrectly specified. How do you pass the correct root partition `/dev/sda3` to the kernel?

<details>
<summary>Answer</summary>

Use the `root` parameter:

```
root=/dev/sda3
```

In the GRUB menu press `e`, find the line starting with `linux` and append the parameter at the end. To persist across reboots, add it to `GRUB_CMDLINE_LINUX` in `/etc/default/grub`, then run:

```bash
grub-mkconfig -o /boot/grub/grub.cfg
```

</details>

---

### Exercise 4 — Device not found at boot

The boot process ends with:

```
ALERT! /dev/sda3 does not exist. Dropping to a shell!
```

What is the likely cause?

<details>
<summary>Answer</summary>

The kernel could not find the device `/dev/sda3` specified as the root filesystem.

This most commonly happens when the initramfs is missing a module for the disk controller or filesystem. A second possibility is an incorrect `root=` parameter in the bootloader configuration.

</details>

---

### Exercise 5 — UEFI and MBR overwrite

A bootloader shows a list of operating systems when multiple are installed. However, a new OS may overwrite the MBR, erasing the first-stage bootloader and making other OSes inaccessible. Why does this not happen on a UEFI machine?

<details>
<summary>Answer</summary>

UEFI machines do not use the disk MBR to store the first-stage bootloader.

Each OS places its `.efi` file in its own directory on ESP (e.g. `/EFI/ubuntu/` or `/EFI/windows/`) and adds its own entry to NVRAM. Other entries are not affected, so all installed systems remain accessible.

</details>

---

### Exercise 6 — New kernel without initramfs

What are the typical consequences of installing a new kernel without a matching initramfs image?

<details>
<summary>Answer</summary>

The root filesystem may be inaccessible if its type is compiled as an external kernel module. Without initramfs, that module will not load and the kernel cannot mount the root.

This is especially relevant when the root is on LVM, RAID or an encrypted partition. The system will drop to an emergency shell with a message like `ALERT! /dev/... does not exist`.

</details>

---

### Exercise 7 — Paginated dmesg output

The output of `dmesg` spans hundreds of lines and is often piped to a pager like `less`. Which `dmesg` flag paginates output automatically, without an explicit pipe?

<details>
<summary>Answer</summary>

```bash
dmesg -H
```

Or in long form:

```bash
dmesg --human
```

The `-H` flag enables human-readable mode, which launches a built-in pager automatically.

</details>

---

### Exercise 8 — Reading journals from another disk

A hard disk with a complete filesystem from a powered-off machine has been removed and connected to a working machine as a second disk, mounted at `/mnt/hd`. How do you use `journalctl` to read the journals from `/mnt/hd/var/log/journal/`?

<details>
<summary>Answer</summary>

```bash
journalctl -D /mnt/hd/var/log/journal
```

Or in long form:

```bash
journalctl --directory=/mnt/hd/var/log/journal
```

The `-D` / `--directory` flag tells `journalctl` to read journals from an arbitrary directory instead of the default `/var/log/journal/`. The systemd journal is stored in binary format, so `cat` cannot be used to read it.

</details>

---

*LPIC-1 Study Notes | Topic 101: System Architecture*
