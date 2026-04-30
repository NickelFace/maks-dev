---
title: "LPIC-1 102.1 — Design Hard Disk Layout"
date: 2026-04-16
description: "Disk partitions, mount points, /boot, EFI System Partition, /home, /var, swap and LVM basics. LPIC-1 exam topic 102.1."
tags: ["Linux", "LPIC-1", "Disks", "LVM", "Filesystems"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-102-1-hard-disk-layout/"
page_lang: "en"
---

> **Exam weight: 2** — LPIC-1 v5, Exam 101

## What you need to know

- Allocate filesystems and swap across separate partitions or disks.
- Adapt the partition layout to the specific purpose of the system.
- Know the requirements for the `/boot` partition depending on the boot architecture.
- Understand the basic capabilities of LVM.

---

## Disks, partitions and filesystems

A disk, or block storage device, must be partitioned before it can be used. A partition is a logical region of a physical disk. Partition information is stored in a partition table, which holds the start and end sectors of each partition and its type.

Each partition contains a filesystem. The filesystem defines how data is physically stored: directory structure, relationships between directories, and file locations.

Partitions cannot span multiple disks. This limitation is removed by LVM, which allows combining partitions — including from different physical disks — into a single logical volume.

---

## Mount points

Before a filesystem becomes accessible, it must be mounted. Mounting means binding a filesystem to a specific directory in the tree, called a mount point.

The mount point must exist before mounting. If it already contains files, those files become inaccessible while the partition is mounted — the listing will show the contents of the partition, not the original directory files.

A few notes on traditional mount points:

- `/mnt` was historically used for manually mounting any external device.
- `/media` replaced `/mnt` and became the standard for removable media (USB drives, optical discs, memory cards). Modern distributions mount them automatically under `/media/USER/LABEL`.
- For manual mounting, `/mnt` is the convention, though technically you can mount anywhere.

---

## Why separate partitions

Storing different parts of the system on separate partitions is useful for several reasons: fault isolation, easier administration, and performance. If `/var` fills up under the root filesystem, the kernel may panic. If `/var` is on its own partition, the root filesystem remains intact.

There are also performance arguments: keep the root filesystem on a fast SSD while putting large `/home` and `/var` on regular HDDs, which are cheaper at high capacity.

### Boot partition /boot

Contains the bootloader files, the Linux kernel and the initial RAM disk image. GRUB2 files are stored in `/boot/grub`.

A separate `/boot` is not technically required — GRUB can mount the root filesystem and read files from there. But a dedicated partition guarantees the system can boot even if the root filesystem is damaged, and it allows using an encrypted or non-standard filesystem on root that the bootloader cannot handle.

For historical reasons `/boot` is usually the first partition on the disk and must end before cylinder 1024. This limit is inherited from the IBM PC BIOS addressing scheme (CHS: 1024 cylinders, 256 heads, 63 sectors, totalling 528 MB). To ensure booting regardless of the addressing scheme used, the boot partition must fit entirely within the first 528 MB.

300 MB for `/boot` is plenty today.

### EFI System Partition (ESP)

ESP is used on UEFI machines to store bootloaders and kernel images. It is formatted as a FAT-like filesystem.

ESP identifiers:
- On a GPT disk: GUID `C12A7328-F81F-11D2-BA4B-00A0C93EC93B`
- On an MBR disk: ID `0xEF`

On Windows systems the ESP is usually the first partition on the disk, though it does not have to be. On Linux it is mounted at `/boot/efi`.

### Home directories /home

Most user home directories live in `/home`. User `john` gets `/home/john`. Exceptions: root lives in `/root`; some system services have directories elsewhere.

The size of the `/home` partition depends on the number of users and the nature of their work — video editors need an order of magnitude more space than those who work with text and a browser.

Moving `/home` to a separate partition means a system reinstall will not touch user data.

### Variable data /var

`/var` holds data the system writes during operation: system logs (`/var/log`), temporary files (`/var/tmp`), application caches (`/var/cache`). For Apache web server this is `/var/www/html`; for MySQL it is `/var/lib/mysql`.

The main reason to put `/var` on its own partition is stability. A poorly written process can fill `/var` to capacity. If `/var` is under root, this risks a kernel panic and filesystem corruption. A separate partition protects root.

On a server running a database or web server it is worth putting `/var` on a separate physical disk, adding another layer of protection against hardware failure.

The size of the `/var` partition varies: a couple of gigabytes is enough for a home machine; a production server may need an order of magnitude more.

---

## Swap

A swap partition is used to page memory from RAM to disk as needed. It must be prepared with the `mkswap` utility before use. It cannot be mounted as a regular directory and its contents are not directly accessible.

A system can have multiple swap partitions. Besides partitions, Linux supports swap files, which is convenient for quickly expanding swap capacity without repartitioning.

Red Hat swap size recommendations:

| RAM | Recommended swap | With hibernation |
|---|---|---|
| < 2 GB | Double the RAM | Triple the RAM |
| 2–8 GB | Equal to RAM | Double the RAM |
| 8–64 GB | At least 4 GB | 1.5× RAM |
| > 64 GB | At least 4 GB | Not recommended |

The old "twice the RAM" rule does not apply in all cases. If the machine runs a critical service (database, SAP), consult that product's documentation.

---

## LVM

Traditional partitioning requires deciding upfront how much space to allocate to each partition. If a partition fills up, resizing is difficult, sometimes impossible without free adjacent space. LVM (Logical Volume Manager) solves this through storage virtualisation.

### Basic LVM concepts

- **Physical Volume (PV)** — a block device on the system: a disk partition or RAID array. The building block of LVM.
- **Volume Group (VG)** — a group of one or more PVs. Abstracts the physical devices and appears as a single logical device with the combined capacity of all PVs.
- **Logical Volume (LV)** — a sub-volume inside a VG, analogous to a traditional partition but with a flexible, resizable size.

A Volume Group is divided into fixed-size blocks called extents. At the PV level they are called Physical Extents (PE); at the LV level, Logical Extents (LE). By default each LE maps to one PE.

### How LV works

The size of a Logical Volume is the size of the physical extent (4 MB by default) multiplied by the number of extents allocated to the volume. To grow an LV, add extents from the VG pool; to shrink it, remove them.

Once created, an LV becomes an ordinary block device. Its path is `/dev/VGNAME/LVNAME`. It is formatted with standard utilities (e.g. `mkfs.ext4`) and mounted manually or via `/etc/fstab`.

LVM allows combining partitions from different physical disks into a single volume, which is impossible with classic partitioning.

---

## Exam command reference

```bash
# Check mounted filesystems
mount
cat /proc/mounts

# Mount a filesystem
mount /dev/sdb1 /mnt

# Unmount a filesystem
umount /mnt

# Prepare a swap partition
mkswap /dev/sda2

# Enable swap
swapon /dev/sda2

# Disable swap
swapoff /dev/sda2

# Create a swap file (alternative to a partition)
dd if=/dev/zero of=/swapfile bs=1M count=1024
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# LVM: create a physical volume
pvcreate /dev/sdb1

# LVM: create a volume group
vgcreate my_vg /dev/sdb1

# LVM: create a logical volume
lvcreate -L 10G -n my_lv my_vg

# LVM: extend a logical volume
lvextend -L +5G /dev/my_vg/my_lv
```

---

## Typical exam questions

**Where are the GRUB bootloader files stored?**
In `/boot/grub`.

**Before which cylinder must `/boot` end to guarantee booting?**
Cylinder 1024.

**Where is the EFI System Partition mounted?**
At `/boot/efi`.

**Where is it conventional to manually mount a partition?**
In `/mnt`, though technically any directory works.

**What is the EFI partition ID on an MBR disk?**
`0xEF`.

**What is the smallest block inside a Volume Group?**
An extent.

**How is the size of a Logical Volume determined?**
The size of the physical extent multiplied by the number of extents.

**How do you quickly increase swap without repartitioning?**
Create a swap file.

---

## Exercises

### Guided Exercises

**1. Where in Linux are the GRUB bootloader files stored?**

<details>
<summary>Answer</summary>

In `/boot/grub`.

</details>

---

**2. Before which limit must the boot partition end to guarantee the PC boots the kernel?**

<details>
<summary>Answer</summary>

Before cylinder 1024. This limit is inherited from the IBM PC BIOS addressing scheme (CHS), under which the maximum addressable disk size is 528 MB. Everything beyond that mark was inaccessible on legacy systems without LBA addressing.

</details>

---

**3. Where is the EFI partition typically mounted?**

<details>
<summary>Answer</summary>

At `/boot/efi`.

</details>

---

**4. Where is it conventional to mount a filesystem manually?**

<details>
<summary>Answer</summary>

In `/mnt`. This is a convention, not a hard rule — you can mount to any existing directory.

</details>

---

### Explorational Exercises

**1. What is the smallest block inside a Volume Group?**

<details>
<summary>Answer</summary>

An extent. A Volume Group is divided into Physical Extents (PE) of a fixed size, and Logical Volumes are built from these blocks.

</details>

---

**2. How is the size of a Logical Volume determined?**

<details>
<summary>Answer</summary>

By the physical extent size (4 MB by default) multiplied by the number of extents allocated to the volume. To grow an LV, simply add extents from the Volume Group pool without moving data.

</details>

---

**3. What is the ID of the EFI System Partition on an MBR-partitioned disk?**

<details>
<summary>Answer</summary>

`0xEF`.

</details>

---

**4. Besides a swap partition, how can you quickly add swap space in Linux?**

<details>
<summary>Answer</summary>

Create a swap file. The file is prepared with `mkswap` and activated with `swapon`, and the system treats it identically to a swap partition.

> Details: `dd if=/dev/zero of=/swapfile bs=1M count=1024`, then `chmod 600 /swapfile`, `mkswap /swapfile`, `swapon /swapfile`. Add an entry to `/etc/fstab` for persistence.

</details>

---

## Related topics

- [101.2 Boot the System](/posts/lpic1-101-2-boot-the-system/) — boot process, role of `/boot`
- 102.2 Boot Manager — GRUB installation and configuration
- 104.1 Create Partitions and Filesystems — fdisk, gdisk, parted
- 104.3 Mount and Unmount Filesystems — mounting, `/etc/fstab`

---

*LPIC-1 Study Notes | Topic 101: System Architecture*
