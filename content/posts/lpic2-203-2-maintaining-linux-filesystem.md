---
title: "LPIC-2 203.2 — Maintaining a Linux Filesystem"
date: 2026-04-10
description: "fsck/e2fsck, tune2fs, dumpe2fs, debugfs, Btrfs subvolumes and snapshots, XFS utilities (xfs_repair/xfs_dump), ZFS overview, and SMART disk monitoring with smartctl/smartd. LPIC-2 exam topic 203.2."
tags: ["Linux", "Filesystem", "LPIC-2", "btrfs", "xfs", "ZFS", "SMART", "fsck"]
categories: ["LPIC-2"]
---

> **Exam topic 203.2** — Maintaining a Linux Filesystem. Covers ext2/3/4 tools, Btrfs subvolumes and snapshots, XFS utilities, ZFS awareness, and SMART disk monitoring.

---

## fsck — Checking and Repairing Filesystems

`fsck` is a front-end for all filesystem checkers. The real work is done by `fsck.fstype` — where `fstype` is `ext4`, `btrfs`, `xfs`, etc.

> **Warning — critical for the exam:** `fsck.xfs` and `fsck.btrfs` are **empty stubs**. They do nothing. For XFS use `xfs_repair`; for Btrfs use `btrfs check`.

`fsck` runs automatically at startup if a filesystem is marked "not clean," the maximum mount count has been exceeded, or the check interval has elapsed.

### Commonly used fsck options

| Option | Description |
|---|---|
| `-s` | Serialize operations (run checkers sequentially) |
| `-A` | Check all filesystems from `/etc/fstab` in one pass |
| `-R` | When used with `-A`, skip the root filesystem |
| `-n` | No changes, check only (dry run) |

### Check order via /etc/fstab

Filesystems with `fs_passno` equal to `0` are not checked at all. Root `/` is checked first; others are checked in ascending `fs_passno` order. Filesystems with the same `fs_passno` value may be checked in parallel, but not if they share the same physical disk.

### e2fsck — checker for ext filesystems

`e2fsck` is the real checker for ext2/3/4; `fsck` simply calls it.

```bash
# Force check even if the filesystem is clean
e2fsck -f /dev/sda1

# Automatic repair without prompting
e2fsck -p /dev/sda1

# Answer "yes" to all questions
e2fsck -y /dev/sda1

# Answer "no" to everything (read-only)
e2fsck -n /dev/sda1

# Find and mark bad blocks
e2fsck -c /dev/sda1
```

> **Note — lost+found:** When `fsck` finds files without directory entries (inode exists but no name in a directory), it places them in the `lost+found` directory of the affected filesystem. Check this directory periodically.

---

## mkfs — Creating Filesystems

`mkfs` is a front-end analogous to `fsck`. The real work is done by `mkfs.fstype`.

```bash
# Create ext4 on a partition
mkfs -t ext4 /dev/sdb1
# Or directly:
mkfs.ext4 /dev/sdb1

# Create Btrfs spanning multiple devices
mkfs.btrfs /dev/sdb /dev/sdc

# Create XFS
mkfs.xfs /dev/sdb1

# Btrfs with RAID0 for data
mkfs.btrfs -d raid0 /dev/sdb /dev/sdc

# Btrfs with RAID10 for both data and metadata
mkfs.btrfs -m raid10 -d raid10 /dev/sdb /dev/sdc /dev/sdd /dev/sde
```

---

## tune2fs — Tuning ext Filesystems

`tune2fs` is a multi-purpose tool for fine-tuning ext2/3/4 filesystems. Most commonly used to manage check frequency and UUIDs.

### Managing check intervals

```bash
# Show current superblock parameters
tune2fs -l /dev/sda1

# Set maximum mount count before a forced check
tune2fs -c 10 /dev/sda1

# Set interval between checks (in seconds; 0 = disable)
tune2fs -i 30d /dev/sda1

# Set current mount counter (to stagger checks)
tune2fs -C 15 /dev/sda1
```

> **Tip — staggering mount counters:** If you have 5 partitions and the system reboots once a month, assign different counter values to each partition. This prevents all of them from being checked simultaneously on the 20th reboot, reducing startup time.

### Changing UUID and label

```bash
# Generate a new UUID
uuidgen

# Assign a new UUID to a partition
tune2fs /dev/sdc1 -U b77a195a-e5a8-4810-932e-5d9adb97adc6

# Set a filesystem label
tune2fs -L "my_data" /dev/sda1
```

> **Warning:** After changing a UUID, update `/etc/fstab` and `/boot/grub/grub.cfg` if the partition is bootable — otherwise the system will not boot.

---

## dumpe2fs — Superblock Information

`dumpe2fs` prints detailed information about ext2/3/4 filesystem parameters stored in the superblock.

```bash
# Show all filesystem information
dumpe2fs /dev/sda1

# Show only superblock info (without block group descriptions)
dumpe2fs -h /dev/sda1
```

Output includes: UUID, label, block size, inode count, time of last check, maximum mount count, and more.

---

## badblocks — Surface Scan

`badblocks` locates damaged sectors and marks them so the filesystem no longer uses them for data storage.

> **Warning:** Do not run `badblocks` directly. The official recommendation is to invoke it via the `-c` option of `e2fsck` or `mke2fs`. A direct run can conflict with an existing bad-block inode list.

```bash
# Correct way: via e2fsck
e2fsck -c /dev/sda1

# Save the bad block list to a file
badblocks -o /tmp/bad_blocks.txt /dev/sda1

# Non-destructive read test (safe for mounted disks)
badblocks -n /dev/sda1

# Destructive write test (unmounted partitions only!)
badblocks -w /dev/sda1
```

---

## debugfs — Surgery on ext Filesystems

`debugfs` is an interactive tool for low-level operations on ext filesystems. It opens the filesystem read-only by default; write mode requires the `-w` flag.

```bash
# Open filesystem read-only
debugfs /dev/sda1

# Open in write mode (use with caution!)
debugfs -w /dev/sda1

# Use a backup superblock when the primary is damaged
debugfs -b 1024 -s 8193 /dev/sda1
# (-b = block size, -s = backup superblock number)
# Find backup superblock locations with dumpe2fs
```

### Useful commands inside debugfs

```
params              # show current mode and filesystem
open /dev/sdb1      # switch to another filesystem without exiting
close               # close the current filesystem
stats               # superblock statistics by block group
testb <block>       # check whether a block is in use
icheck <block>      # get inode number for a block
ncheck <inode>      # get filename for an inode
stat <inode>        # show inode information
ls /                # list files in a directory
dump <inode> /tmp/recovered_file   # extract a file from a damaged FS
?                   # list all available commands
```

> **Tip — bad block workflow with debugfs:** Locate the bad block with `testb`. Get the inode with `icheck`, then the filename with `ncheck`. Best course: mark the block bad and restore the file from backup.

> **Warning:** Use `-w` only if you know exactly what you are doing. Incorrect metadata changes can render the filesystem unusable.

---

## Btrfs — Subvolumes, Snapshots, and Conversion

Btrfs is a modern filesystem with Copy-on-Write (COW), built-in checksums, RAID, and snapshots.

> **Note:** A Btrfs subvolume is not a block device (unlike an LVM logical volume). It is a POSIX namespace that can be mounted separately via the `subvol=` option.

### Working with subvolumes

```bash
# Create a subvolume
btrfs subvolume create /home

# List all subvolumes
btrfs subvolume list /mnt/btrfs-test/

# Mount a specific subvolume
mount -o subvol=subvol_z /dev/sdb /mnt/point
```

### Working with snapshots

```bash
# Create a snapshot of /home
btrfs subvolume snapshot /home/ /home-snap

# Create a read-only snapshot
btrfs subvolume snapshot -r /home/ /home-snap-ro

# Delete a snapshot
btrfs subvolume delete /home-snap/
```

> **Tip:** After deleting a snapshot, Btrfs cleans up the file tree in the background. You may see I/O activity on an apparently idle system — this is normal.

### Btrfs check and repair utilities

| Utility | Description |
|---|---|
| `btrfs check` | Check and optionally repair an unmounted filesystem |
| `btrfs rescue` | Recover a damaged filesystem |
| `btrfs restore` | Recover files from a damaged filesystem (most powerful) |
| `btrfs scrub` | Read all data from disk and verify checksums |
| `btrfsck` | Deprecated alias for `btrfs check` |

```bash
# Run a scrub (integrity check)
btrfs scrub start /mnt/data

# Check scrub status
btrfs scrub status /mnt/data

# Filesystem information
btrfs filesystem show
btrfs filesystem df /mnt/data
```

> **Warning:** `btrfs scrub` reads the entire disk sequentially. On busy servers run it at night or throttle it with `btrfs scrub start -B -d`.

### Converting ext → Btrfs

```bash
# Convert ext4 to Btrfs (partition must be unmounted)
btrfs-convert /dev/sdb1

# Convert back to ext4
btrfs-convert -r /dev/sdb1
```

> **Important:** `btrfs-convert` saves the original ext filesystem image as a subvolume named `ext2_subvol` (by default). As long as you have not deleted it, you can roll back with `btrfs-convert -r`. Once the subvolume is deleted, the rollback is gone.

---

## XFS — Utilities

XFS is a journaling filesystem used by default on RHEL/CentOS. It has its own set of utilities.

### Information and checking

```bash
# Show filesystem geometry
xfs_info /dev/sda1
# Equivalent:
xfs_growfs -n /dev/sda1

# Check integrity (dry run, no repairs)
xfs_check /dev/sda1

# Repair a damaged filesystem (must be unmounted)
xfs_repair /dev/sda1

# Dry run of xfs_repair (when xfs_check is not available)
xfs_repair -n /dev/sda1
```

> **Warning:** `xfs_check` is absent from many modern distributions. Use `xfs_repair -n` for a dry run instead.

### Backup and restore for XFS

```bash
# Create a filesystem dump
xfs_dump -f /backup/sda1.dump /dev/sda1

# Restore from dump
xfs_restore -f /backup/sda1.dump /mnt/restore

# Incremental dump (level 1)
xfs_dump -l 1 -f /backup/sda1-inc.dump /dev/sda1
```

> **Note:** `xfs_dump` preserves extended attributes, ACLs, and other XFS-specific metadata. Regular `tar` does not.

### XFS utilities summary

| Utility | Purpose |
|---|---|
| `xfs_info` | Show filesystem geometry |
| `xfs_check` | Check without repair (deprecated) |
| `xfs_repair` | Check and repair |
| `xfs_dump` | Backup |
| `xfs_restore` | Restore from dump |
| `xfs_admin` | Tune filesystem attributes (UUID, label) |
| `xfs_fsr` | File defragmentation |
| `xfs_growfs` | Expand the filesystem |
| `xfs_metadump` | Copy metadata to a file |

---

## ZFS — Overview

ZFS was developed by Sun Microsystems and is now owned by Oracle. On Linux, native kernel support exists only on Ubuntu; other distributions use ZFS via FUSE in userspace.

> **Note for LPIC-2:** Only a general understanding of ZFS is required. No deep command knowledge is tested — just concepts and pool architecture.

### Key ZFS features

- 128-bit addressing (virtually unlimited storage)
- Copy-on-Write with transactional writes: the **ueberblock** is updated only when a full transaction succeeds
- 128 previous ueberblock copies stored in a ring buffer
- **Vdev labels** — disk labels in the pool, stored in 4 copies: 2 at the start and 2 at the end of each disk
- Built-in RAID-Z (RAID5 equivalent) and RAID-Z2 (RAID6 equivalent)
- Snapshots and clones (instantaneous creation, consume no space until data changes)
- Data compression and deduplication (configurable per filesystem)
- Checksums for all data and metadata
- Volume provisioning (zvols — block devices inside ZFS)
- Separate devices for cache (L2ARC) and journal (ZIL/SLOG)

> **Why ZFS has no fsck:** ZFS operates transactionally. The ueberblock is updated only if everything was written successfully. The system stores 128 previous ueberblocks in a ring buffer. For integrity checking and repair use `zpool scrub`, which fixes errors on the fly if multiple disks are in the pool.

### zpool — managing storage pools

A pool in ZFS is analogous to a logical volume manager. A pool can consist of one or more disks.

```bash
# Create a simple single-disk pool
zpool create tank /dev/sdb

# Create a mirrored pool
zpool create tank mirror /dev/sdb /dev/sdc

# Show pool list with details
zpool list -v

# Show pool status
zpool status -v tank

# Run an integrity check
zpool scrub tank

# Show pool operation history
zpool history tank
```

### zfs — managing filesystems inside a pool

By default, creating a pool also creates one filesystem with the same name inside it.

```bash
# Show all ZFS filesystems
zfs list

# Create a filesystem with compression enabled
zfs create -o compression=on tank/documents

# Enable compression on an existing filesystem
zfs set compression=on tank/documents

# Check compression ratio
zfs get compressratio tank/documents

# Show all filesystem attributes
zfs get all tank/documents

# Create a snapshot (instantaneous, consumes no space)
zfs snap tank/documents@backup

# List snapshots
zfs list -t snapshot

# Access snapshot contents via a special directory
ls /tank/documents/.zfs/snapshot/backup/
```

> **Tip:** A ZFS snapshot is created instantly and initially occupies 0 bytes. Space is consumed only as the original data changes. If data is unchanged, the snapshot is free.

---

## SMART — Disk Health Monitoring

SMART (Self-Monitoring, Analysis and Reporting Technology) is a self-diagnostics technology built into most modern HDDs and SSDs. Linux support comes from the `smartmontools` package.

### smartctl — direct SMART interaction

```bash
# Show device information
smartctl -i /dev/sda

# Enable SMART on the device
smartctl -s on /dev/sda

# Quick health check (PASSED / FAILED verdict)
smartctl -H /dev/sda

# Full device information and attributes
smartctl -a /dev/sda

# Run a short self-test
smartctl -t short /dev/sda

# Run a long extended self-test
smartctl -t long /dev/sda

# Abort a running test
smartctl -X /dev/sda

# View error log
smartctl -l error /dev/sda

# Show supported device types
smartctl -P showall | less
```

> **Important:** The result `SMART overall-health self-assessment test result: PASSED` means the disk is healthy. `FAILED` means the disk has already failed or is about to fail.

> **Warning:** SMART does not guarantee advance warning. A device can show PASSED right up until failure. Unusual attribute values (high `Reallocated_Sector_Ct`, non-zero `Current_Pending_Sector`) may indicate an impending failure even with a PASSED status.

### smartd — monitoring daemon

`smartd` runs as a system service and automatically enables SMART monitoring on all connected devices. By default it checks every **30 minutes**.

Configuration files (path depends on distribution):
- `/etc/smartd.conf`
- `/etc/smartmontools/smartd.conf`
- `/usr/local/etc/smartd.conf`

Log files:
- `/var/log/smartd.log`
- `/var/log/messages`
- `/var/log/syslog`

```bash
# Send USR1 to trigger an immediate check of all disks
kill -USR1 $(pidof smartd)
```

### smartd.conf configuration

```
# Monitor all SMART devices; long test every Sunday between 1 and 2 AM
DEVICESCAN -s L/../../7/01

# Monitor a specific disk and send email on error
/dev/sda -m admin@example.com -M exec /usr/bin/my_alert_script
```

> **Note — DEVICESCAN:** Only the first uncommented line beginning with `DEVICESCAN` is applied. All subsequent `DEVICESCAN` lines are ignored.

---

## Exam Cheat Sheet

### Key Paths and Files

| Path | Description |
|---|---|
| `/etc/fstab` | Mount settings; `fs_passno` field controls fsck order |
| `/etc/smartd.conf` | smartd daemon config (primary path) |
| `/etc/smartmontools/smartd.conf` | Alternative smartd config path |
| `/usr/local/etc/smartd.conf` | Another possible smartd config path |
| `/var/log/smartd.log` | smartd log |
| `lost+found/` | Directory for recovered nameless files |

### Important Commands

```bash
fsck -A                          # check all filesystems from fstab
e2fsck -f /dev/sda1              # force check ext4
tune2fs -l /dev/sda1             # show ext4 parameters
tune2fs -c 10 /dev/sda1          # set max mount count
btrfs subvolume snapshot /home/ /home-snap   # create Btrfs snapshot
btrfs-convert /dev/sdb1          # convert ext4 to Btrfs
xfs_info /dev/sda1               # XFS filesystem info
xfs_repair /dev/sda1             # repair XFS (must be unmounted)
smartctl -H /dev/sda             # disk health verdict
smartctl -a /dev/sda             # full SMART info
```

### Filesystem Tool Mapping

| Utility | ext2/3/4 | Btrfs | XFS | ZFS |
|---|---|---|---|---|
| `fsck` | Yes (via e2fsck) | Stub | Stub | No |
| `tune2fs` | Yes | No | No | No |
| `dumpe2fs` | Yes | No | No | No |
| `debugfs` | Yes | No | No | No |
| `btrfs check` | No | Yes | No | No |
| `xfs_repair` | No | No | Yes | No |
| `zpool scrub` | No | No | No | Yes |

### Common Exam Traps

- `fsck.xfs` and `fsck.btrfs` are stubs — they do nothing. Use `xfs_repair` and `btrfs check`.
- `xfs_repair` and `e2fsck` must not be run on mounted partitions.
- `tune2fs -c 0` disables mount-count-based checks — risky, errors can accumulate silently.
- `btrfs-convert` stores the old ext filesystem as subvolume `ext2_subvol`. Delete it explicitly to free space.
- `xfs_check` is missing from many modern distros; use `xfs_repair -n` instead.
- `smartctl -H` gives only the overall verdict. Use `smartctl -a` for the full picture.

---

## Practice Questions

**Q1.** You run `fsck.xfs /dev/sdb1`. What happens?

**Answer:** **Nothing** — `fsck.xfs` is an empty stub. For real XFS repair, use `xfs_repair`.

---

**Q2.** How do you change the maximum mount count for ext4 partition `/dev/sda2` to 15?

**Answer:** `tune2fs -c 15 /dev/sda2` — sets the maximum mount count before a forced check.

---

**Q3.** You want to snapshot Btrfs subvolume `/data` as `/data-backup`. What is the correct command?

**Answer:** `btrfs subvolume snapshot /data /data-backup`

---

**Q4.** Which command shows the overall SMART health verdict (PASSED/FAILED) for `/dev/sda`?

**Answer:** `smartctl -H /dev/sda` — outputs the overall self-assessment test result. `-a` gives the full picture; `-i` shows only device info; `-t` runs a test.

---

**Q5.** You converted an ext4 partition to Btrfs with `btrfs-convert`. What is the subvolume that holds the old ext4 image called?

**Answer:** `ext2_subvol` — the default name used by `btrfs-convert`. The rollback (`btrfs-convert -r`) is only possible while this subvolume exists.

---

**Q6.** How do you run a dry-run check of an XFS filesystem on a system where `xfs_check` is not installed?

**Answer:** `xfs_repair -n /dev/sda1` — performs the check without making any changes.

---

**Q7.** Which `fs_passno` value in `/etc/fstab` causes `fsck -A` to skip that filesystem?

**Answer:** **`0`** — the filesystem is not checked.

---

**Q8.** At what interval does `smartd` poll SMART devices by default?

**Answer:** Every **30 minutes**. This can be changed in the configuration file.
