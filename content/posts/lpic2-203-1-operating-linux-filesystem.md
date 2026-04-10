---
title: "LPIC-2 203.1 — Operating the Linux Filesystem"
date: 2026-04-10
description: "FHS directory layout, mkfs, mount/umount, /etc/fstab format, UUID and blkid, swap partitions and swap files, systemd mount units, and the sync command. LPIC-2 exam topic 203.1."
tags: ["Linux", "Filesystem", "LPIC-2", "fstab", "mount", "UUID", "swap"]
categories: ["LPIC-2"]
---

> **Exam topic 203.1** — Operating the Linux Filesystem. Covers the FHS hierarchy, creating and mounting filesystems, /etc/fstab configuration, UUID management, swap, and systemd mount units.

---

## Linux Filesystem Hierarchy (FHS)

Linux presents all filesystems as a single directory tree. The FHS (Filesystem Hierarchy Standard, current version 2.3) fixes the placement of files and utilities so that different distributions remain compatible. To attach a new device, it must be mounted to an existing empty directory called a **mount point**.

| Directory | Purpose |
|---|---|
| `/` | Root — should not contain extra files |
| `/bin/` | Binaries needed at boot |
| `/boot/` | Bootloader files and kernel images |
| `/dev/` | Device files |
| `/etc/` | System configuration files and scripts |
| `/home/` | User home directories |
| `/lib/` | Shared OS libraries and kernel modules |
| `/lost+found/` | Files recovered by fsck |
| `/media/` | Mount points for removable media (CD-ROM, USB) |
| `/mnt/` | Temporary mount points for administrators |
| `/opt/` | Large third-party applications |
| `/proc/` | Virtual kernel filesystem (processes, resources) |
| `/root/` | Root user home directory |
| `/sbin/` | System administration binaries |
| `/tmp/` | Temporary files |
| `/usr/` | Read-only data: user commands, C headers |
| `/var/` | Variable data: logs, mail, print queues |

> **Note:** If a mount point is not empty, the files in it do not disappear — they simply become invisible while the device is mounted. After `umount` they reappear.

---

## Filesystem Internal Structure

Before use, a partition must be initialized: service structures are written to disk. This process is called "making a filesystem."

Most UNIX-like filesystems are built around a few core concepts:

| Structure | Description |
|---|---|
| **Superblock** | Contains information about the filesystem as a whole: size, block count, type |
| **Inode** | Stores all file attributes (permissions, owner, size, timestamps) except the name |
| **Data block** | A block holding actual file data |
| **Directory block** | Stores filenames and corresponding inode numbers |
| **Indirect block** | Dynamically allocated block with pointers to data blocks, used when the inode's direct pointers are exhausted |

How it works: a filename is stored in a directory together with its inode number. The inode number leads to data blocks with the file's content. For large files the inode points to indirect blocks, which in turn point to data blocks.

> **Important:** An inode holds all file metadata **except the filename**. The name lives in the directory entry. This is exactly why hard links work: multiple names in a directory can point to the same inode.

---

## Creating a Filesystem (mkfs)

`mkfs` is a wrapper utility for creating a filesystem on a partition or device. Requires root privileges.

```bash
# General syntax
mkfs [-c] [-t fstype] <device> [blocks]

# Create ext4 on a partition
mkfs -t ext4 /dev/sdb1
# Short form
mkfs.ext4 /dev/sdb1

# Create ext2 (via mke2fs)
mkfs.ext2 /dev/sdb2
mke2fs /dev/sdb2         # mke2fs = mkfs.ext2

# Create a FAT filesystem
mkfs -t vfat /dev/sdc1
mkfs.vfat /dev/sdc1
mkdosfs /dev/sdc1        # another alias

# Check for bad blocks during creation
mkfs -c -t ext4 /dev/sdb1

# Inspect the created filesystem
parted -l
```

### Equivalent commands

| Long form | Short form | Aliases |
|---|---|---|
| `mkfs -t ext2 /dev/sdb1` | `mkfs.ext2 /dev/sdb1` | `mke2fs /dev/sdb1` |
| `mkfs -t ext3 /dev/sdb1` | `mkfs.ext3 /dev/sdb1` | `mke2fs -t ext3 /dev/sdb1` |
| `mkfs -t ext4 /dev/sdb1` | `mkfs.ext4 /dev/sdb1` | `mke2fs -t ext4 /dev/sdb1` |
| `mkfs -t vfat /dev/sdb1` | `mkfs.vfat /dev/sdb1` | `mkfs.msdos`, `mkdosfs` |

> **Warning:** Creating a filesystem on a partition that already has one **permanently destroys all data**. Double-check the device name before running `mkfs`.

> **Important:** `mkfs` is a front-end. Under the hood it calls the specialized utility for each type: `mkfs.ext4`, `mkfs.xfs`, `mkfs.btrfs`, etc. You can call them directly.

---

## Mounting Filesystems

### Temporary mounting

The `mount` command attaches a filesystem to the directory tree. The mount point must already exist and should preferably be empty.

```bash
# Basic form
mount /dev/sdb1 /mnt/data

# Specify filesystem type explicitly
mount -t ext4 /dev/sdb1 /mnt/data

# Mount read-only
mount -o ro /dev/sdb1 /mnt/data

# Mount by UUID
mount -U 652b786e-b87f-49d2-af23-8087ced0c828 /mnt/data

# Mount by label
mount -L MyData /mnt/data

# Mount everything from /etc/fstab (excluding noauto entries)
mount -a

# Simulate mounting without actually doing it
mount -f -v /dev/sdb1 /mnt/data
```

### Common -o options

| Option | Description |
|---|---|
| `ro` | Read-only |
| `rw` | Read-write |
| `exec` | Allow execution of binaries |
| `noexec` | Deny execution of binaries |
| `user` | Allow a specific user to mount |
| `users` | Allow all users to mount |
| `noauto` | Do not mount on `mount -a` |
| `sync` | Write directly to disk without buffering (slower) |
| `defaults` | rw, suid, dev, exec, auto, nouser, async |

### mount options

| Parameter | Description |
|---|---|
| `-a` | Mount everything from `/etc/fstab` |
| `-F` | Together with `-a`, mount in parallel |
| `-f` | Simulate without actually mounting |
| `-L label` | Mount by label |
| `-n` | Do not write to `/etc/mtab` |
| `-r` | Mount read-only |
| `-t fstype` | Specify filesystem type |
| `-U uuid` | Mount by UUID |
| `-v` | Verbose output |
| `-w` | Mount read-write |
| `-s` | Ignore unsupported options |

### Unmounting

```bash
# By device name
umount /dev/sdb1

# By mount point
umount /mnt/data
```

> **Warning:** You cannot unmount a device that is being used by a process or user. You also cannot unmount a device that has another device mounted on top of it.

---

## /etc/fstab Configuration

The file `/etc/fstab` (Filesystem Table) controls filesystem mounting at boot. On startup the system runs `mount -a`, which mounts everything in fstab that does not have the `noauto` flag.

### Record format

```
<device>  <mount-point>  <fs-type>  <options>  <dump>  <fsck>
```

Example configuration:

```
# /etc/fstab — sample real configuration

# Root partition by UUID
UUID=652b786e-b87f-49d2-af23-8087ced0c828  /          ext4    errors=remount-ro,noatime  0  1

# Home partition by label
LABEL=HomeDir                              /home      ext4    defaults                   0  2

# Partition by device name
/dev/sdb1                                  /mnt/data  xfs     defaults,noatime           0  2

# Swap partition
/dev/sda3                                  none       swap    sw                         0  0

# Swap file
/swapfile                                  none       swap    sw                         0  0

# NFS network filesystem
server:/export/share                       /mnt/nfs   nfs     defaults,_netdev           0  0
```

### /etc/fstab fields

| Field | Meaning |
|---|---|
| 1. Device | `/dev/sda1`, `UUID=...`, `LABEL=...`, or `server:/path` for NFS |
| 2. Mount point | Absolute path; `none` for swap |
| 3. Filesystem type | `ext4`, `xfs`, `btrfs`, `swap`, `nfs`, `vfat` |
| 4. Options | `defaults`, `ro`, `noauto`, `_netdev`, etc. comma-separated |
| 5. Dump | `0` — skip dump backup, `1` — include in dump |
| 6. fsck | `0` — skip, `1` — check first (root), `2` — check after root |

> **Important:** AutoFS filesystems must **not** have entries in `/etc/fstab`. If you add one, AutoFS cannot manage the mount.

> **Tip:** Use UUID instead of device names like `/dev/sda1`. If you move a disk to a different slot, the name may change but the UUID stays the same.

---

## /etc/mtab and /proc/mounts

`/etc/mtab` contains a list of currently mounted filesystems in fstab format. If a filesystem is mounted with the `-n` flag, the entry does not appear in `/etc/mtab`.

`/proc/mounts` is a virtual kernel file with the same information but more reliable. In practice `/proc/mounts` is more trustworthy because it is updated by the kernel directly.

```bash
# View mounted filesystems
cat /proc/mounts
mount
```

> **Note:** The difference between `/etc/mtab` and `/proc/mounts`: `/etc/mtab` is not updated when mounting with `-n`. `/proc/mounts` is always current because the kernel maintains it.

---

## UUID and blkid

UUID (Universal Unique Identifier) is a 128-bit number that uniquely identifies a filesystem. A UUID is assigned at format time by `mkfs` and does not change when a disk is moved between slots or machines — it only changes when the partition is reformatted.

Standard UUID format: 32 hex characters in groups `8-4-4-4-12`:

```
3297cded-69e9-4d35-b29f-c50cf263fb8b
```

### The blkid command

```bash
# Show UUID of all devices
blkid

# UUID of a specific device
blkid /dev/sda5

# Example output:
# /dev/sda5: UUID="24df5f2a-a23f-4130-ae45-90e1016031bc" TYPE="swap"
# /dev/sda1: UUID="652b786e-b87f-49d2-af23-8087ced0c828" TYPE="ext4"
```

### Working with UUIDs

```bash
# Generate a new UUID
uuidgen

# Assign a new UUID to an ext2/3/4 filesystem
tune2fs -U $(uuidgen) /dev/sda5

# Alternative UUID view
lsblk -f

# Mount by UUID temporarily
mount -U 652b786e-b87f-49d2-af23-8087ced0c828 /mnt/data
```

> **Warning:** After reformatting a partition the UUID changes. If you use UUIDs in `/etc/fstab`, update the entry — otherwise the system will not boot.

---

## Swap Partition and Swap File

Swap space is a partition or file that the kernel uses as an extension of RAM. When physical memory fills up, the kernel moves inactive pages to swap.

### Creating a swap partition

```bash
# 1. Create the partition (via fdisk/parted, type 82 for Linux swap)
fdisk /dev/sdd

# 2. Initialize the partition as swap
mkswap /dev/sdd1
# Output:
# Setting up swapspace version 1, size = 838652 KiB
# no label, UUID=3297cded-69e9-4d35-b29f-c50cf263fb8b

# 3. Activate swap
swapon /dev/sdd1

# 4. Check status
swapon -s
free -m
```

### Creating a swap file

```bash
# 1. Create a file of the desired size (512 MB)
dd if=/dev/zero of=/swapfile bs=1024 count=524288

# 2. Set permissions
chmod 600 /swapfile

# 3. Initialize as swap
mkswap /swapfile

# 4. Activate
swapon /swapfile
```

### Managing swap

```bash
# Deactivate a swap partition or file
swapoff /dev/sdd1
swapoff /swapfile

# Change swap priority (requires swapoff first)
swapoff /dev/sdd1
swapon -p 10 /dev/sdd1

# Activate all swap from /etc/fstab
swapon -a

# Monitor swap
swapon -s
cat /proc/swaps
free -m
```

### Swap priorities

With multiple swap spaces the kernel chooses by priority: higher number = higher priority. When set manually, priority is a positive number (0–32767). If not set, the kernel assigns a negative value automatically.

### /etc/fstab entries for swap

```
# Swap partition
/dev/sda3   none   swap   sw   0   0

# Swap by UUID
UUID=3297cded-69e9-4d35-b29f-c50cf263fb8b   none   swap   sw   0   0

# Swap file
/swapfile   none   swap   sw   0   0
```

> **Warning:** Do not run `swapoff` on the current swap until a new swap partition is ready — the system may hang due to insufficient virtual memory.

> **Tip:** A dedicated swap partition is faster than a swap file: no fragmentation, and it can be placed at the start of the disk (the fastest region on an HDD). A swap file is easier to resize without repartitioning.

---

## systemd Mount Units

On systemd systems, filesystems can be mounted via unit files instead of `/etc/fstab`. However, `/etc/fstab` remains the preferred method: systemd automatically converts fstab entries into native units via `systemd-fstab-generator` on boot.

### Naming convention

The filename reflects the mount point path:

- Remove the leading and trailing `/`
- Replace remaining `/` with `-`
- Add the `.mount` extension

Examples:

| Mount point | Unit filename |
|---|---|
| `/home/temp/` | `home-temp.mount` |
| `/home/user/data/` | `home-user-data.mount` |
| `/mnt/backup` | `mnt-backup.mount` |

### Mount unit file structure

```ini
# /etc/systemd/system/home-user-data.mount

[Unit]
Description=Data for User

[Mount]
What=/dev/sda2
Where=/home/user/data
Type=ext4
Options=defaults
SloppyOptions=on
TimeoutSec=4

[Install]
WantedBy=multi-user.target
```

`What` accepts a device name or UUID: `What=/dev/disk/by-uuid/UUID`.

`SloppyOptions=on` ignores mount options not supported by the filesystem type. Disabled by default.

`TimeoutSec` sets the timeout in seconds. If `mount` does not complete in time, systemd considers the operation failed.

### Managing mount units

```bash
# Reload systemd configuration
systemctl daemon-reload

# Start the mount manually
systemctl start home-user-data.mount

# Check status
systemctl status home-user-data.mount

# Make the mount permanent (enable at boot)
systemctl enable home-user-data.mount

# Verify it mounted
mount | grep /home/user/data
```

> **Note:** Even if you only use `/etc/fstab`, systemd still manages those filesystems: it automatically generates unit files via `systemd-fstab-generator`. This is standard and recommended behavior.

---

## The sync Command

Linux caches write operations in memory (RAM buffers) to improve performance. The `sync` command forces these buffers to be flushed to disk.

```bash
sync
```

`sync` is called automatically during system shutdown and reboot. Manual use is helpful before removing a USB drive when `umount` is not available for some reason. The command has no significant options — just run `sync` without arguments.

> **Warning:** The `sync` option in `/etc/fstab` (fourth field) forces every write to go straight to disk without buffering. This degrades performance. Do not confuse it with the standalone `sync` command.

---

## Exam Cheat Sheet

### Files and Paths

| File / Path | Purpose |
|---|---|
| `/etc/fstab` | Mount table, controls boot-time mounting |
| `/etc/mtab` | Current mount list (may be stale) |
| `/proc/mounts` | Authoritative current mount list from the kernel |
| `/proc/swaps` | Status of swap spaces |
| `/etc/systemd/system/*.mount` | systemd mount unit files |

### Commands

| Command | Action |
|---|---|
| `mkfs -t ext4 /dev/sdb1` | Create ext4 on a partition |
| `mkfs.ext4 /dev/sdb1` | Same, short form |
| `mkfs -c -t ext4 /dev/sdb1` | Create with bad block check |
| `mke2fs /dev/sdb1` | Create ext2 (alias for mkfs.ext2) |
| `mount -a` | Mount everything from `/etc/fstab` |
| `mount -t ext4 /dev/sdb1 /mnt` | Mount with explicit type |
| `mount -U UUID /mnt` | Mount by UUID |
| `umount /mnt/data` | Unmount |
| `blkid` | Show UUID of all devices |
| `blkid /dev/sda1` | UUID of a specific device |
| `lsblk -f` | UUID and filesystem type |
| `mkswap /dev/sdd1` | Initialize a swap partition |
| `swapon /dev/sdd1` | Activate swap |
| `swapoff /dev/sdd1` | Deactivate swap |
| `swapon -a` | Activate all swap from fstab |
| `swapon -s` | Swap statistics |
| `swapon -p 10 /dev/sdd1` | Set swap priority |
| `free -m` | Memory and swap usage in MB |
| `sync` | Flush buffers to disk |
| `uuidgen` | Generate a new UUID |
| `tune2fs -U UUID /dev/sda1` | Set UUID for an ext filesystem |
| `systemctl daemon-reload` | Reload systemd unit files |
| `systemctl enable home-tmp.mount` | Enable a mount unit at boot |

### Common Exam Traps

- `/etc/mtab` and `/proc/mounts` are nearly identical, but `/proc/mounts` is more current and unaffected by the `-n` flag
- `mkswap` only initializes; `swapon` activates
- UUID changes when a partition is reformatted
- To change swap priority: `swapoff` first, then `swapon -p`
- Mount unit filenames: strip outer `/`, replace inner `/` with `-`, add `.mount`
- fstab field 5 (dump): `0` or `1`. Field 6 (fsck): `0` = off, `1` = root, `2` = others
- `noauto` prevents mounting when running `mount -a`

---

## Practice Questions

**Q1.** Which file contains the most up-to-date list of mounted filesystems?

**Answer:** `/proc/mounts` — maintained directly by the kernel. `/etc/mtab` may not be updated when `mount -n` is used.

---

**Q2.** You need to temporarily mount a partition by UUID `abc123`. Which command is correct?

**Answer:** `mount -U abc123 /mnt` — the `-U` flag specifies a UUID for temporary mounting.

---

**Q3.** You created a new partition `/dev/sde3` and want to use it as swap. What is the correct command sequence?

**Answer:** `mkswap /dev/sde3` → `swapon /dev/sde3`. First `mkswap` initializes the partition as swap, then `swapon` activates it.

---

**Q4.** What should the unit file be named to mount the path `/home/user/data/`?

**Answer:** `home-user-data.mount` — strip outer `/`, replace inner `/` with `-`, add `.mount`.

---

**Q5.** What does the `sync` command do?

**Answer:** Forces write buffers to be flushed from RAM to disk.

---

**Q6.** In which field of `/etc/fstab` is the fsck priority specified?

**Answer:** **Field 6**: `0` = skip, `1` = check first (root), `2` = check after root.

---

**Q7.** How do you check the status of all active swap spaces?

**Answer:** `swapon -s` — shows name, type, size, usage, and priority of each swap space. `cat /proc/swaps` also works.

---

**Q8.** What does an inode store?

**Answer:** All file metadata — permissions, owner, size, timestamps, and pointers to data blocks — **except the filename**. The filename is stored in the directory entry along with the inode number.

---

**Q9.** You need to update the UUID of `/dev/sda2` (ext4) without losing data. Which command does this?

**Answer:** `tune2fs -U $(uuidgen) /dev/sda2` — changes the UUID without destroying data. Running `mkfs.ext4 -U new-uuid /dev/sda2` would reformat the disk and erase everything.

---

**Q10.** Are `mkfs.ext4 /dev/sdb1` and `mkfs -t ext4 /dev/sdb1` equivalent?

**Answer:** **Yes**, they are completely equivalent. `mkfs` is a wrapper that calls `mkfs.ext4` when `-t ext4` is specified.
