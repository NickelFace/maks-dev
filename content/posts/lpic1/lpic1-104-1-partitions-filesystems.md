---
title: "LPIC-1 104.1 — Create Partitions and Filesystems"
date: 2026-04-19
description: "MBR and GPT partition tables, fdisk, gdisk, parted, mkfs (ext2/3/4, XFS, VFAT, exFAT, Btrfs), swap. LPIC-1 exam topic 104.1."
tags: ["Linux", "LPIC-1", "fdisk", "gdisk", "parted", "mkfs", "Btrfs", "XFS", "swap", "partitions"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-104-1-partitions-filesystems/"
---

> **Exam weight: 2** — LPIC-1 v5, Exam 101

## What You Need to Know

- Manage MBR and GPT partition tables.
- Create filesystems with `mkfs`: ext2, ext3, ext4, XFS, VFAT, exFAT.
- Basic understanding of Btrfs: multi-device, compression, subvolumes.

Key utilities: `fdisk`, `gdisk`, `parted`, `mkfs`, `mkswap`.

---

## Partitions and Partition Tables

A partition is a logical slice of a physical disk described by an entry in the partition table. Each partition appears to the OS as a separate disk. In Linux partitions become device files: `/dev/sda1`, `/dev/sda2`.

All disk management operations require root privileges.

---

## MBR vs GPT

### MBR

MBR (Master Boot Record) dates from PC-DOS 2.0 in 1983. The partition table lives in the first sector of the disk alongside the bootloader (usually GRUB on Linux).

Limitations:
- Maximum disk size: 2 TB.
- No more than 4 primary partitions.

### GPT

GPT (GUID Partition Table) removes MBR's limits. Disk size is practically unlimited. Up to 128 partitions by default. Used on modern UEFI machines.

Each GPT disk gets a 128-bit GUID. GPT stores a backup header and partition table at the end of the disk for recovery.

### Comparison

| Parameter | MBR | GPT |
|---|---|---|
| Year | 1983 | late 1990s |
| Max disk size | 2 TB (often cited as 2.2 TB) | up to 9.4 ZB |
| Max partitions | 4 primary | 128 by default |
| Firmware | BIOS | UEFI |
| Backup table | no | yes, at disk end |
| Disk identifier | 32-bit | 128-bit GUID |

---

## fdisk — MBR Partition Editor

```bash
fdisk /dev/sda
```

Changes are held in memory until you write with `w`. Exit without saving: `q`.

### Key Commands

| Command | Action |
|---|---|
| `p` | print partition table |
| `n` | create new partition |
| `d` | delete partition |
| `t` | change partition type |
| `l` | list known partition types |
| `F` | show free (unpartitioned) space |
| `w` | write changes and exit |
| `q` | quit without saving |

### Primary vs Extended Partitions

MBR supports at most 4 primary partitions. To have more, create one extended partition as a container for logical partitions inside.

### Creating a Partition

```
Command (m for help): n
Select (default p): p
Partition number (1-4, default 1): 1
First sector (2048-3903577, default 2048): 2048
Last sector or +size{K,M,G,T,P}: +1G
```

### Free Space and Contiguity

**Key point:** the maximum size of a new partition is limited by the largest *contiguous* free block, not the total free space. Two 512 MB gaps do not allow a 1 GB partition.

### Changing Partition Type

Command `t` → partition number → hex code. Common codes:

- `83`: Linux
- `82`: Linux swap

---

## gdisk — GPT Partition Editor

`gdisk` mirrors `fdisk` for GPT disks.

```bash
gdisk /dev/sdb
```

Command `p` shows the disk GUID and total free space in the header. Type codes are four-digit hex:

- `8300`: Linux filesystem
- `8200`: Linux swap

Command `s` renumbers partitions after a deletion. Recovery menu (`r`) provides tools to rebuild headers, convert MBR↔GPT.

**GPT advantage:** a new partition can use any free space regardless of physical location — no contiguity requirement.

---

## Creating Filesystems

`mkfs` without a type flag creates **ext2** by default.

### ext2 / ext3 / ext4

`mkfs.ext2`, `mkfs.ext3`, `mkfs.ext4` are all symlinks to `mke2fs`.

```bash
mkfs.ext4 /dev/sdb1
mke2fs -t ext4 /dev/sdb1   # equivalent
```

Key options:

| Option | Description |
|---|---|
| `-b SIZE` | block size: 1024, 2048, or 4096 |
| `-c` | check for bad blocks |
| `-c -c` | thorough (slow) bad block check |
| `-L LABEL` | volume label (≤16 chars) |
| `-U ID` | UUID: literal, `clear`, `random`, or `time` |
| `-n` | dry run — no writes |
| `-d DIR` | pre-populate filesystem from directory |
| `-F` | force creation |
| `-q` | quiet |

### XFS

High-performance journaling filesystem from SGI (1993). Default on RHEL 7+. Package: `xfsprogs`.

```bash
mkfs.xfs /dev/sda1
```

Key options:

| Option | Description |
|---|---|
| `-b size=N` | block size (512–65536, default 4096) |
| `-m crc=0/1` | CRC32c metadata checksums (default on) |
| `-f` | force (overwrite existing filesystem) |
| `-l logdev=DEV` | external log device |
| `-L LABEL` | label (≤12 chars) |
| `-N` | dry run |

### VFAT / FAT

`mkfs.fat` (alias `mkfs.vfat`). Used for small flash drives and legacy devices.

- FAT16: volume ≤ 4 GB, file ≤ 2 GB
- FAT32: volume ≤ 2 PB, file ≤ 4 GB

```bash
mkfs.fat /dev/sdc1
```

Options: `-F SIZE` (FAT size: 12, 16, 32), `-n NAME` (label ≤11 chars), `-c` (bad blocks).

### exFAT

Microsoft exFAT (2006). Max file: 16 EB. Max volume: 128 PB. Standard for SDXC cards > 32 GB.

```bash
mkfs.exfat /dev/sdb2
```

Options: `-n NAME` (label ≤15 chars), `-i VOL_ID` (32-bit volume ID).

### Btrfs

B-Tree Filesystem, developed since 2007. Default on SUSE.

Features: multi-device RAID (0/1/5/6/10), transparent compression, snapshots, subvolumes, deduplication, copy-on-write.

```bash
mkfs.btrfs /dev/sdb1
mkfs.btrfs -d raid1 -m raid1 /dev/sdb /dev/sdc   # mirror
```

**Subvolumes** share free space with the parent filesystem (unlike partitions which reserve space upfront):

```bash
btrfs subvolume create /mnt/disk/BKP
btrfs subvolume snapshot /mnt/disk /mnt/disk/snap
btrfs subvolume snapshot -r /mnt/disk /mnt/disk/snap   # read-only
mount -t btrfs -o subvol=BKP /dev/sdb1 /mnt/bkp
```

Compression algorithms: ZLIB, LZO, ZSTD.

```bash
mount -o compress /dev/sdb1 /mnt/disk
```

---

## GNU Parted

Works with both MBR and GPT.

**Warning: parted applies changes immediately — there is no `w` command.**

```bash
parted /dev/sdb
```

### Key Commands

| Command | Action |
|---|---|
| `mklabel TYPE` | create partition table (`msdos` or `gpt`) |
| `mkpart PARTTYPE FSTYPE START END` | create partition |
| `rm N` | delete partition N |
| `rescue START END` | recover a deleted partition |
| `resizepart N END` | move end of partition N |
| `print free` | show free space |

### mkpart

```
(parted) mkpart primary ext4 1m 100m
(parted) mkpart primary linux-swap 301m 800m
```

`FSTYPE` is a hint only — parted does **not** create the filesystem. Always run `mkfs` afterward.

### Rescue

Scans the disk between START and END for filesystem signatures. Only finds partitions that had a filesystem.

```
(parted) rescue 90m 210m
```

### Resizing

**Shrink** (order matters — reversing it destroys data):
1. Shrink filesystem: `resize2fs /dev/sdb3 88m`
2. Move partition end: `resizepart 3 300m`

**Grow:**
1. Move partition end: `resizepart N NEW_END`
2. Grow filesystem: `resize2fs /dev/sdbN`

`resize2fs -M` shrinks the filesystem to the minimum size needed for the current data.

---

## Swap

### Setup

Change type in fdisk: `t` → `82`; in gdisk: `t` → `8200`; in parted: specify `linux-swap` as FSTYPE.

Always run `mkswap` before `swapon` — without it you get `read swap header failed`.

```bash
mkswap /dev/sda2
swapon /dev/sda2
swapoff /dev/sda2
swapon -s            # list active swap
cat /proc/swaps
```

### Swap File

```bash
dd if=/dev/zero of=myswap bs=1M count=1024
mkswap myswap
swapon myswap
```

Add to `/etc/fstab` to persist across reboots. Recommended permissions: `0600`, owner root.

---

## Quick Reference

### Partition Type Codes

| Type | fdisk (MBR) | gdisk (GPT) |
|---|---|---|
| Linux filesystem | `83` | `8300` |
| Linux swap | `82` | `8200` |

### Filesystem Commands

| Command | Filesystem |
|---|---|
| `mkfs DEV` | ext2 (default) |
| `mkfs.ext2/3/4 DEV` | ext2/3/4 |
| `mke2fs -t TYPE DEV` | ext alternative |
| `mkfs.xfs DEV` | XFS |
| `mkfs.fat / mkfs.vfat DEV` | FAT/VFAT |
| `mkfs.exfat DEV` | exFAT |
| `mkfs.btrfs DEV [DEV2...]` | Btrfs |

---

## Exam Questions

1. Max partitions in MBR? → **4 primary**.
2. Max disk size in MBR? → **2 TB** (often cited as 2.2 TB).
3. Max partitions in GPT by default? → **128**.
4. Linux swap type code in fdisk? → **82**.
5. Linux swap type code in gdisk? → **8200**.
6. Command to change type in fdisk? → **`t`**.
7. parted command for MBR table? → **`mklabel msdos`**.
8. Default filesystem created by `mkfs` alone? → **ext2**.
9. Does `mkpart` in parted create the filesystem? → **No**, only sets a type flag.
10. XFS utility package? → **xfsprogs**.
11. Btrfs compression algorithms? → **ZLIB, LZO, ZSTD**.
12. mke2fs option for bad block check? → **`-c`**.
13. Difference between `mkfs.fat` and `mkfs.vfat`? → **Same utility**, vfat is an alias.
14. Max file size on FAT32? → **4 GB**.
15. Correct order to shrink an ext4 partition? → **`resize2fs` first, then `resizepart`**.
16. What does `resize2fs -M` do? → Shrinks filesystem to minimum size for current data.
17. Error `read swap header failed` — cause? → **`mkswap` was not run** before `swapon`.
18. What does parted `rescue` find? → Partitions that **had a filesystem** — empty partitions are not found.
19. Difference between Btrfs subvolume and a partition? → Subvolume shares free space with parent; partition reserves space upfront.
20. How to find UUID and label of a filesystem? → **`lsblk -f`**.

---

## Exercises

### Exercise 1 — Partition table for a 3 TB disk

A 3 TB disk needs three 1 GB partitions. Which partition table type should you use, and why?

<details>
<summary>Answer</summary>

GPT. MBR is limited to 2 TB disks, so a 3 TB disk cannot be fully addressed by MBR.

</details>

---

### Exercise 2 — Free space in gdisk

How do you see how much free space remains on a disk in gdisk?

<details>
<summary>Answer</summary>

Command `p` (print). The header above the partition list shows total free space:

```
Total free space is 1282071 sectors (626.0 MiB)
```

</details>

---

### Exercise 3 — Create ext3 with bad block check, label, and random UUID

Create ext3 on `/dev/sdc1` with bad block check, label `MyDisk`, and a random UUID.

<details>
<summary>Answer</summary>

```bash
mkfs.ext3 -c -L MyDisk -U random /dev/sdc1
```

Alternative via `mke2fs`:

```bash
mke2fs -t ext3 -c -L MyDisk -U random /dev/sdc1
```

</details>

---

### Exercise 4 — Create partition in parted

In parted, create a 300 MB ext4 partition starting at 500 MB.

<details>
<summary>Answer</summary>

```
(parted) mkpart primary ext4 500m 800m
```

Remember: parted only sets a type flag — it does **not** create the filesystem. After exiting parted, run `mkfs.ext4 /dev/sdXN` separately.

</details>

---

### Exercise 5 — Btrfs RAID1 on two 20 GB partitions

Two 20 GB partitions. Combine them into one Btrfs with mirroring. What is the usable size?

<details>
<summary>Answer</summary>

```bash
mkfs.btrfs -d raid1 -m raid1 /dev/sda1 /dev/sdb1
```

Usable size: **20 GB** — one partition mirrors the other.

</details>

---

### Exercise 6 — 600 MB partition on a fragmented MBR disk

An MBR disk (1.9 GB) has two existing partitions: `/dev/sdb1` (512 MB) and `/dev/sdb3` (512 MB), with free space in the gaps between them. Can you create a new 600 MB partition?

<details>
<summary>Answer</summary>

No. Total free space is about 1 GB, but the largest *contiguous* free block is only 512 MB. A partition cannot span a gap — fdisk rejects it with `Value out of range`.

Use `F` in fdisk to inspect the free space layout.

</details>

---

### Exercise 7 — Shrink partition to minimum size

The first partition on `/dev/sdc` is 1 GB with ext4, containing about 256 MB of files. Shrink it to the minimum needed size.

<details>
<summary>Answer</summary>

Two-step operation — filesystem first, then partition boundary.

Step 1 — shrink the filesystem to fit actual data:

```bash
resize2fs -M /dev/sdc1
```

Step 2 — move the partition end in parted:

```
(parted) resizepart 1 241M
```

Order is critical: always shrink the filesystem before moving the partition boundary. Reversing the order destroys data.

</details>

---

### Exercise 8 — swapon fails with "read swap header failed"

A partition was created with `mkpart primary linux-swap 0 1024M`, then `swapon /dev/sdb1` fails with `read swap header failed`. What is wrong and how do you fix it?

<details>
<summary>Answer</summary>

`mkpart` creates the partition but does **not** write the swap header. Always run `mkswap` before `swapon`:

```bash
mkswap /dev/sdb1
swapon /dev/sdb1
```

</details>

---

### Exercise 9 — Recover accidentally deleted partition in parted

A disk had an EFI partition (250 MB), swap (4 GB), and a third partition (10 GB). The third was accidentally deleted. How do you recover it?

<details>
<summary>Answer</summary>

Use `rescue` with estimated boundaries.

Calculate: 250 MB (EFI) + 4×1024 MB (swap) = 4346 MB — start. End: 4346 + 10×1024 = 14 586 MB.

```
(parted) rescue 4346m 14586m
```

Give a small margin in both directions — disk geometry can shift boundaries slightly. `rescue` only finds partitions that had a filesystem.

</details>

---

### Exercise 10 — Activate /dev/sda3 as swap using fdisk

Turn an unused 4 GB partition `/dev/sda3` into active swap.

<details>
<summary>Answer</summary>

Step 1 — change partition type to Linux Swap in fdisk:

```
Command (m for help): t
Partition number (1-3, default 3): 3
Hex code (type L to list all codes): 82

Changed type of partition 'Linux' to 'Linux swap / Solaris'.

Command (m for help): w
```

Step 2 — write the swap header:

```bash
mkswap /dev/sda3
```

Step 3 — activate swap:

```bash
swapon /dev/sda3
```

</details>

---

*LPIC-1 Study Notes | Topic 104: Devices, Linux Filesystems, Filesystem Hierarchy Standard*
