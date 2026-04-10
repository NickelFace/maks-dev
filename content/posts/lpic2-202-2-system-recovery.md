---
title: "LPIC-2 202.2 — System Recovery"
date: 2026-04-10
description: "Linux boot process, GRUB Legacy and GRUB 2, initrd/initramfs, UEFI/NVMe, fsck recovery scenarios, SysV init. LPIC-2 exam topic 202.2."
tags: ["Linux", "GRUB", "Boot", "LPIC-2", "Recovery", "UEFI"]
categories: ["LPIC-2"]
---

## Linux Boot Process

```
BIOS/UEFI  →  GRUB (MBR/ESP)  →  Kernel  →  initramfs  →  init/systemd
```

| Phase | Description |
|---|---|
| 1 | Firmware (BIOS/UEFI) runs POST and locates the bootloader |
| 2 | Bootloader (GRUB) loads from MBR or ESP, shows menu, hands control to the kernel |
| 3 | Kernel decompresses into memory, initialises hardware, mounts the root filesystem |
| 4 | initrd/initramfs provides a minimal environment to load modules before mounting `/` |
| 5 | init/systemd starts user services and targets |

> **Exam tip:** Know the exact sequence and which tool is responsible for each phase.

---

## MBR and Bootloader Placement

**MBR (Master Boot Record)** is the first 512-byte sector of the first disk. Only 446 bytes are available for bootloader code; the rest holds the partition table and signature.

Because of this limit, GRUB uses a two-stage approach:

- **Stage 1** (446 bytes in MBR) — points to Stage 1.5 / Stage 2
- **Stage 1.5 / core.img** — stored in the DOS Compatibility Region (first disk cylinder); contains filesystem code
- **Stage 2** — main bootloader logic, stored in `/boot/grub/`

```bash
# Install GRUB to the MBR of the first disk
grub-install /dev/sda

# Install to MBR in GRUB Legacy format
grub-install '(hd0)'

# Install to a partition boot sector (chain-loading)
grub-install /dev/sda1
```

> **Warning:** `grub-install /dev/sda` installs to the whole-disk MBR. `grub-install /dev/sda1` installs to a partition boot sector. Confuse them and you break the boot.

---

## GRUB Legacy

GRUB Legacy was developed in 1999 and is frozen. It still appears on older systems.

### Configuration

Config file: `/boot/grub/menu.lst` (or symlink `/boot/grub/grub.conf`).

```bash
# /boot/grub/menu.lst — example
default 0          # boot first entry by default
timeout 10         # wait 10 seconds
color white/blue yellow/blue

title CentOS Linux
root (hd1,0)       # second disk, first partition (0-based!)
kernel (hd1,0)/boot/vmlinuz root=/dev/sdb1
initrd /boot/initrd

title Windows
rootnoverify (hd0,0)
chainloader +1
```

> **Important:** In GRUB Legacy, **both** disks and partitions are numbered from 0. First disk, first partition: `(hd0,0)`. In GRUB 2, disks are 0-based but partitions are 1-based: `(hd0,1)`.

### Key GRUB Legacy directives

| Directive | Purpose |
|---|---|
| `default N` | Boot the Nth entry by default |
| `timeout N` | Timeout in seconds |
| `title` | Start of a menu entry |
| `root (hdX,Y)` | Partition containing `/boot` |
| `kernel` | Path to kernel and parameters |
| `initrd` | Path to the initrd image |
| `rootnoverify` | Non-Linux partition (Windows) |
| `chainloader +1` | Hand control to the next bootloader |

### Interactive GRUB Legacy

At the menu:

- Arrow keys to select an entry
- `e` — edit the selected entry
- `b` — boot after editing
- `c` — open the GRUB shell CLI

To boot into single-user mode, append `single` to the `kernel` line:

```
kernel /boot/vmlinuz root=/dev/sda1 single
```

### GRUB Shell (Legacy)

The GRUB Legacy shell is launched with `grub` from a running system. It emulates bootloader behaviour: inspect configuration, install the bootloader, and manually boot the system.

```bash
grub
grub> root (hd0,0)
grub> kernel /boot/vmlinuz root=/dev/sda1
grub> initrd /boot/initrd
grub> boot
```

Selected GRUB Legacy shell commands:

| Command | Purpose |
|---|---|
| `boot` | Boot the system |
| `cat FILE` | Print file contents |
| `chainloader FILE` | Load another bootloader |
| `configfile FILE` | Load a configuration file |
| `find FILENAME` | Search for a file across all partitions |
| `halt` | Shut down |
| `initrd FILE` | Load an initrd image |
| `kernel FILE` | Load the kernel |
| `reboot` | Reboot |
| `root [DEVICE]` | Select the root device |
| `rootnoverify [DEVICE]` | Select a device without mounting (for Windows) |
| `setup (hd0)` | Install GRUB to MBR |
| `quit` | Exit the GRUB shell |

> **Note:** The `grub` shell command is only available in GRUB Legacy. There is no equivalent standalone tool for GRUB 2 — use the interactive CLI in the boot menu instead.

---

## GRUB 2

GRUB 2 was developed around 2011. It is modular: filesystem support (ext4, btrfs, zfs, NTFS), LVM, and software RAID are loaded as separate modules.

### Configuration

| File | Purpose |
|---|---|
| `/boot/grub/grub.cfg` | Main config (do not edit manually!) |
| `/etc/default/grub` | Global settings (GRUB_TIMEOUT, etc.) |
| `/etc/grub.d/` | Scripts for generating grub.cfg |

```bash
# Regenerate grub.cfg from scripts in /etc/grub.d/
grub-mkconfig -o /boot/grub/grub.cfg

# update-grub — Debian/Ubuntu wrapper around grub-mkconfig
update-grub
```

The scripts in `/etc/grub.d/` control menu entries. `/etc/grub.d/30_os_prober` auto-detects installed OSes including Windows. Add custom entries in `/etc/grub.d/40_custom`.

Example `grub.cfg` entry:

```bash
menuentry "CentOS Linux" {
    set root=(hd1,1)       # second disk, first partition (GRUB 2: partitions from 1!)
    linux /boot/vmlinuz root=/dev/sdb1 ro quiet
    initrd /boot/initramfs.img
}

menuentry "Windows" {
    set root=(hd0,1)
    chainloader +1
}
```

### GRUB Legacy vs GRUB 2 comparison

| Parameter | GRUB Legacy | GRUB 2 |
|---|---|---|
| Config file | `/boot/grub/menu.lst` | `/boot/grub/grub.cfg` |
| Editing | Directly | Only via `/etc/grub.d/` + `grub-mkconfig` |
| Partition numbering | From 0: `(hd0,0)` | Disks from 0, partitions from 1: `(hd0,1)` |
| Load kernel | `kernel` | `linux` |
| Set root | `root (hd0,0)` | `set root=(hd0,1)` |
| Load module | `module` | `insmod` |
| Shell | `grub` (standalone) | Interactive CLI in boot menu only |

### device.map

GRUB uses the BIOS to discover disks but cannot always map BIOS names to Linux device names. This mapping is stored in `/boot/grub/device.map`:

```bash
(fd0)  /dev/fd0
(hd0)  /dev/sda
(hd1)  /dev/sdb
```

> **Warning:** With software RAID-1 (mirroring), install GRUB on **both** disks. At boot time, software RAID is not yet active, so the system reads only one physical disk. If GRUB is only on the first disk and it fails, the system will not boot.
> ```bash
> grub-install /dev/sda
> grub-install /dev/sdb
> ```

### Interactive GRUB 2

At the boot menu:

- `e` — edit the entry (append `single` or other parameters to the `linux` line)
- `Ctrl+x` — boot after editing
- `c` — enter the GRUB 2 CLI

If the distro hides the GRUB menu, press `Shift` immediately after BIOS/UEFI initialisation.

```bash
# Manual boot from GRUB 2 CLI
grub> set root=(hd0,1)
grub> linux /boot/vmlinuz root=/dev/sda1 ro
grub> initrd /boot/initramfs.img
grub> boot
```

### GRUB 2 shell commands

| Command | Purpose |
|---|---|
| `ls` | List devices and files |
| `set root=(hdX,Y)` | Select root partition |
| `linux /path/vmlinuz` | Load the kernel |
| `initrd /path/initramfs` | Load initramfs |
| `boot` | Boot the system |
| `insmod ext2` | Load a filesystem module |
| `search --label myroot` | Find a partition by label |
| `search --fs-uuid UUID` | Find a partition by UUID |
| `chainloader +1` | Chain-load another bootloader |
| `configfile /boot/grub/grub.cfg` | Load a configuration file |
| `reboot` / `halt` | Reboot / shut down |

> **Important:** Devices in GRUB are written in parentheses: `(fd0)` = floppy, `(hd0,1)` = first disk, first partition (GRUB 2). Without parentheses the command fails.

---

## initrd and initramfs

**initrd** (initial RAM disk) and **initramfs** (initial RAM filesystem) are temporary root filesystems that the kernel mounts before switching to the real `/`.

Required to load modules (drivers) needed to access the real root filesystem (e.g. ext4, LVM, RAID, encryption drivers).

| | initrd | initramfs |
|---|---|---|
| Format | Block device image (ext2) | cpio archive compressed with gzip |
| Mounting | As a block device | Unpacked directly into tmpfs |
| Status | Old approach | Current standard |

```bash
# Create initramfs (Debian/Ubuntu)
update-initramfs -u

# Create initramfs (Red Hat/CentOS)
dracut --force /boot/initramfs-$(uname -r).img $(uname -r)

# Create with mkinitrd (RPM-based distros, older tool)
mkinitrd /boot/initrd-$(uname -r).img $(uname -r)
```

> **Note:** On Debian-based systems the file is named `initrd.img-VERSION`; on Red Hat-based systems it is `initramfs-VERSION.img`. Both GRUB Legacy and GRUB 2 use the `initrd` directive to load the image.

---

## UEFI and NVMe

### UEFI vs BIOS

BIOS limitations: stores the bootloader in the MBR (446 bytes), cannot handle disks larger than 2 TB, no native GPT support. Intel developed EFI in 1998; in 2005 manufacturers adopted the standard as UEFI.

| Parameter | BIOS | UEFI |
|---|---|---|
| Bootloader location | MBR (446 bytes) | ESP partition (FAT, any size) |
| Partition table | MBR (max 2 TB, 4 partitions) | GPT (up to 9.4 ZB, 128 partitions) |
| Security | None | Secure Boot |
| Network boot | None | IPv4/IPv6, TFTP, HTTP (UEFI 2.5+) |
| ESP mount point | — | `/boot/efi` |

**ESP (EFI System Partition)** is a special FAT-formatted partition. Boot files have the `.efi` extension and reside in `/boot/efi/EFI/`.

```
/boot/efi/EFI/BOOT/BOOTX64.EFI      # universal fallback bootloader
/boot/efi/EFI/fedora/shim.efi       # first-stage loader for Secure Boot
/boot/efi/EFI/fedora/MokManager.efi # Secure Boot key management
/boot/efi/EFI/fedora/fwupx64.efi    # firmware update
```

Use `efibootmgr` to manage UEFI boot entries.

> **Important:** Linux kernel 3.15+ supports UEFI. The exam may ask where ESP is mounted: the answer is `/boot/efi`.

### NVMe

NVMe (Non-Volatile Memory Express) is a protocol for SSDs connected via PCIe. It replaces the legacy AHCI (1 queue, 32 commands) with NVMHCI (65,000 queues, 65,000 commands each).

NVMe device naming in Linux:

```
/dev/nvme0        # first NVMe controller
/dev/nvme0n1      # first namespace on the first controller
/dev/nvme0n1p1    # first partition of the first namespace
```

> **Important:** NVMe numbering: controller starts at 0, but namespace and partition start at 1. `/dev/nvme0n1p1` = first partition of the first disk. This is a frequent exam question.

---

## System Recovery Scenarios

### Scenario 1: kernel does not boot

Use arrow keys to select an entry in the GRUB menu and press Enter. If the new kernel fails, select the previous one from the list.

### Booting into single-user mode via GRUB

**GRUB 2:**
1. Press `e` on the desired entry.
2. Find the line starting with `linux`.
3. Append `single` to the end of the line.
4. Press `Ctrl+x` to boot.

**GRUB Legacy:**
1. Press `e` on the desired entry.
2. Select the line starting with `kernel`.
3. Append `single` to the end.
4. Press `Enter`, then `b` to boot.

### Passing kernel parameters via GRUB

If a device is not detected at boot, you can pass parameters to the kernel driver manually. This only works if device support is **compiled into the kernel**, not loaded as a module.

Example: two network cards compiled into the kernel. The kernel finds only one by default. Append to the `linux` / `kernel` line:

```
ether=5,0x300,eth0 ether=11,0x340,eth1
```

### Scenario 2: corrupted root filesystem

```bash
# 1. Boot from a rescue disk (CD/USB) — system runs entirely in RAM

# 2. Check the filesystem on /dev/sda2
fsck -y /dev/sda2
# -y automatically answers "yes" to all fsck prompts

# 3. Mount the repaired partition
mount /dev/sda2 /target

# 4. Verify contents
ls /target

# 5. Unmount before rebooting
umount /target

# 6. Reboot
reboot
```

> **Warning:** Always run `umount` on all mounted partitions before rebooting. Otherwise the kernel will see uncleanly unmounted volumes and run fsck again on the next boot.

### fsck return codes

| Code | Meaning |
|---|---|
| 0 | No errors |
| 1 | Errors found and corrected |
| 2 | Reboot recommended |
| 4 | Errors found but not corrected |
| 8 | Operational error |
| 16 | Syntax or usage error |
| 128 | Shared library error |

> **Important:** Never run fsck on a mounted filesystem. To check `/` — boot from a rescue disk or switch to single-user mode first.

### Scenario 3: boot failure (fsck did not pass)

On Debian, filesystems are checked by `/etc/rcS.d/S30check.fs` using `/etc/fstab`. If `fsck` returns a code greater than 1, boot stops and the system displays:

```
fsck failed. Please repair manually

"CONTROL-D" will exit from this shell and
continue system startup.
```

Two options:

- Press `Ctrl+D` — system continues booting without repairs (dangerous if the FS is seriously damaged)
- Enter the root password — `/sbin/sulogin` starts and gives you a repair shell

The root filesystem is mounted **read-only** at this point — that is correct and expected for running fsck on the root partition.

```bash
fsck -y /dev/sda1
reboot
```

### Scenario 4: recovering GRUB

```bash
# Reinstall GRUB to MBR (from a rescue disk)
grub-install /dev/sda

# Regenerate grub.cfg (GRUB 2)
grub-mkconfig -o /boot/grub/grub.cfg

# On Debian/Ubuntu
update-grub
```

---

## /boot/ and /boot/grub/ Layout

```
/boot/
├── vmlinuz-5.15.0-91-generic    # compressed kernel image
├── System.map-5.15.0-91-generic # kernel symbol table
├── initrd.img-5.15.0-91-generic # initramfs image
├── config-5.15.0-91-generic     # kernel build configuration
├── grub/
│   ├── grub.cfg                 # GRUB 2 config (do not edit manually)
│   ├── menu.lst                 # GRUB Legacy config
│   ├── device.map               # BIOS disk to Linux device mapping
│   └── i386-pc/                 # GRUB 2 modules for BIOS
└── efi/                         # UEFI systems only
    └── EFI/
        ├── BOOT/
        │   └── BOOTX64.EFI      # universal fallback
        └── fedora/
            ├── shim.efi
            ├── MokManager.efi
            └── fwupx64.efi
```

> **Important:** `/boot/grub/grub.cfg` is auto-generated by `grub-mkconfig`. Editing it directly is dangerous — the next `update-grub` will overwrite all changes. Edit `/etc/default/grub` and files in `/etc/grub.d/` instead.

---

## Exam Cheat Sheet

### Files and Paths

| File / Path | Purpose |
|---|---|
| `/boot/grub/menu.lst` | GRUB Legacy config |
| `/boot/grub/grub.cfg` | GRUB 2 config (auto-generated) |
| `/etc/default/grub` | GRUB 2 global settings |
| `/etc/grub.d/` | Scripts for generating grub.cfg |
| `/boot/efi/EFI/` | UEFI boot files (.efi) |
| `/etc/inittab` | SysV init configuration |
| `/etc/fstab` | Filesystem table (fsck reads this at boot) |
| `/sbin/telinit` | Runlevel switch (symlink to init) |

### Key Commands

```bash
grub-install /dev/sda                          # install GRUB to MBR
grub-mkconfig -o /boot/grub/grub.cfg           # regenerate grub.cfg
update-grub                                    # Debian/Ubuntu: same as above
fsck -y /dev/sda1                              # check and repair filesystem
mount /dev/sda1 /mnt                           # mount a partition
umount /dev/sda1                               # unmount before rebooting
telinit 1                                      # switch to single-user mode
init q                                         # re-read /etc/inittab
```

### Common Exam Traps

1. GRUB Legacy: partitions from 0 (`hd0,0`). GRUB 2: disks from 0, partitions from 1 (`hd0,1`).
2. `grub.cfg` must not be edited manually — only via `grub-mkconfig`.
3. Never run fsck on a mounted filesystem.
4. After fsck and mount in rescue mode, always `umount` before rebooting.
5. `telinit` is usually a symlink to `init`, not a separate binary.
6. NVMe: `/dev/nvme0n1p1` = first partition. Controller from 0, namespace and partition from 1.
7. ESP is mounted at `/boot/efi`; boot files have the `.efi` extension.
8. The `grub` shell command is only available in GRUB Legacy. GRUB 2 only has an interactive CLI in the boot menu.

---

## Practice Questions

**Q1.** An admin wants to install GRUB 2 to the MBR of the first disk. Which command does this?

A. `grub-install /dev/sda1` B. `grub-install /dev/sda` C. `grub-mkconfig /dev/sda` D. `update-grub /dev/sda`

**Answer:** B. `grub-install /dev/sda` installs Stage 1 to the MBR of `/dev/sda`. Option A installs to a partition boot sector (for chain-loading). `grub-mkconfig` only generates the config file.

---

**Q2.** In GRUB 2, you need to specify the first partition of the second disk as root. How is this written?

A. `root (hd1,0)` B. `set root=(hd2,1)` C. `set root=(hd1,1)` D. `root (hd2,0)`

**Answer:** C. In GRUB 2, disks are 0-based (second disk = hd1), partitions are 1-based (first partition = 1). Options A and D use GRUB Legacy syntax.

---

**Q3.** After replacing a disk, the system won't boot. An admin boots from a rescue USB and wants to repair the filesystem on `/dev/sdb2`. Which command is correct?

A. `fsck /dev/sdb2` (partition mounted at `/mnt`)
B. `fsck -y /dev/sdb2` (partition not mounted)
C. `mount -o remount,rw /dev/sdb2`
D. `e2fsck -n /dev/sdb2`

**Answer:** B. fsck must not run on a mounted partition. The `-y` flag automatically approves all repairs.

---

**Q4.** Which file does `grub-mkconfig` read for global GRUB 2 settings?

A. `/boot/grub/grub.cfg` B. `/etc/grub.d/00_header` C. `/etc/default/grub` D. `/boot/grub/menu.lst`

**Answer:** C. `/etc/default/grub` contains global settings like `GRUB_TIMEOUT` and `GRUB_CMDLINE_LINUX`. `/etc/grub.d/` contains scripts for each menu entry.

---

**Q5.** An admin wants to switch a running SysV init system to single-user mode without rebooting. Which command does this?

A. `init 0` B. `telinit 1` C. `systemctl rescue` D. `shutdown -s`

**Answer:** B. `telinit 1` switches the system to runlevel 1 (single-user mode) without rebooting. `init 0` shuts the system down.

---

**Q6.** Where are UEFI boot files located on a Linux system?

A. `/boot/grub/` B. `/etc/grub.d/` C. `/boot/efi/EFI/` D. `/var/lib/efi/`

**Answer:** C. ESP is mounted at `/boot/efi`; boot files with the `.efi` extension are stored in `/boot/efi/EFI/`.

---

**Q7.** What is the name of the first partition of the first namespace of the first NVMe disk in Linux?

A. `/dev/nvme0n0p0` B. `/dev/nvme1n1p1` C. `/dev/nvme0n1p1` D. `/dev/nvme0p1`

**Answer:** C. The controller is numbered from 0 (`nvme0`), namespace and partition from 1 (`n1p1`).

---

**Q8.** An admin edited `/etc/inittab`. How do they apply the changes without rebooting?

A. `telinit q` B. `init reload` C. `init q` D. `systemctl daemon-reload`

**Answer:** C (also A, since telinit is a symlink to init). `init q` or `telinit q` tells init to re-read `/etc/inittab`.
