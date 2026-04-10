---
title: "LPIC-2 204.1 — Configuring RAID"
date: 2026-04-10
description: "RAID levels (0/1/4/5/Linear), hardware vs software RAID, mdadm create/assemble/manage, /proc/mdstat, mdadm.conf, spare disks, and disk replacement procedure. LPIC-2 exam topic 204.1."
tags: ["Linux", "RAID", "LPIC-2", "mdadm", "storage"]
categories: ["LPIC-2"]
---

> **Exam topic 204.1** — Configuring RAID. Covers RAID levels, software RAID with mdadm, /proc/mdstat, mdadm.conf, and complete deployment and disk replacement procedures.

---

## What is RAID

RAID stands for Redundant Array of Independent (or Inexpensive) Disks. Multiple physical disks are combined into a single logical block device. The OS sees it as one disk and interacts with it via standard interfaces.

**Why use it?** First, speed — parallel reads and writes across multiple disks increase throughput. Second, reliability — some RAID levels survive a single disk failure without data loss. Third, capacity — several small disks combine into one large pool.

Key concepts:

**Parity** — a mathematically computed check value stored alongside data. If a disk dies, the missing bits are reconstructed from the remaining data plus parity.

**Chunk** — the minimum piece of data written to one disk in the array. Typically 32K or 64K; configurable. `mdadm` defaults to 512 KiB.

**I/O transaction** — one I/O operation. Depending on RAID level, one transaction to the array generates multiple transactions to member disks, affecting performance.

> **Important:** Software RAID in Linux is implemented through the `md` (Multiple Devices) driver. The primary management tool is `mdadm`. Array devices are named `/dev/md0`, `/dev/md1`, etc. and have **major number 9**.

---

## RAID Levels

### RAID 0 — Striping

Data is split into chunks and written alternately to all disks. Disk A gets chunk 1, disk B gets chunk 2, disk A gets chunk 3, and so on.

**Pros:** Maximum read/write speed; full capacity of all disks is used for data.

**Cons:** Zero fault tolerance. If any disk dies, the entire array is lost. Typical use: swap partition or graphics work where data loss is acceptable.

Minimum disks: 2. Capacity = sum of all disks.

```
Disk A         Disk B
Chunk 1        Chunk 2
Chunk 3        Chunk 4
Chunk 5        Chunk 6
```

### RAID 1 — Mirroring

The same data is written simultaneously to all disks. Each disk contains a complete copy. Reads can parallelize across disks, giving high throughput for read-heavy workloads.

**Pros:** Excellent fault tolerance; immediate access to data when a disk fails; simple recovery.

**Cons:** High cost — for every working disk you need another for the mirror. Capacity = size of the smallest disk.

Minimum disks: 2.

### RAID 4

Parity is stored on a dedicated disk; data is distributed across the remaining disks in blocks. Better for transactional operations than large file transfers. The dedicated parity disk creates a constant write bottleneck, so RAID 4 is rarely used without write-back caching.

Capacity = (N-1) disks. Minimum disks: 3.

### RAID 5 — Striping with Parity

Data and parity are interleaved across all disks. Unlike RAID 3/4, parity in RAID 5 is distributed evenly, eliminating the write bottleneck.

```
Disk A          Disk B          Disk C
Data Chunk 1    Data Chunk 2    Parity Alpha
Data Chunk 3    Parity Beta     Data Chunk 4
Parity Gamma    Data Chunk 5    Data Chunk 6
```

**Pros:** Good read speed; decent fault tolerance at moderate cost.

**Cons:** Writes are slower than reads due to parity computation. After a disk failure, the array runs in degraded mode and any second failure destroys all data.

Minimum disks: 3. Capacity = (N-1) disks.

> **Warning:** During a RAID 5 rebuild after one disk failure, load on remaining disks spikes. A second failure at this point means total data loss. Large deployments often prefer RAID 6 or RAID 10 for this reason.

### Linear RAID

Disks are joined end-to-end: data fills the first disk, then overflows to the second. No striping, no redundancy. If one disk fails the entire array becomes unavailable. Disks can be different sizes (unlike striping, which requires roughly equal sizes).

A single writing process works on only one disk at a time — no speed gain. However, multiple reading processes can access different disks in parallel if both are populated. Capacity = sum of all disks.

---

## Hardware vs Software RAID

**Hardware RAID** is managed by a dedicated controller. The OS sees only one block device per array and has no knowledge of the member disks. The controller may be a SCSI card, an external disk module, or an onboard chip. Detecting hardware RAID from inside Linux is non-trivial; it looks like a regular single SCSI disk, and diagnostics often require vendor software.

**Software RAID** is implemented directly in the kernel via the `md` driver. No special hardware is required; it works with ordinary SATA and SCSI disks. On modern CPUs, software RAID performance is fully comparable to hardware. Devices are named `/dev/md0`, `/dev/md1`, etc. with **major number 9** — the easiest way to identify software RAID.

> **Note:** `mdadm` is also used for block-device-level multipathing, not just RAID. However, multipathing across paths to the same physical drive only creates the illusion of redundancy and is suitable for testing only.

### RAID Level Comparison

| Level | Min disks | Capacity | Fault tolerance | Read speed | Write speed |
|---|---|---|---|---|---|
| RAID 0 | 2 | 100% of all disks | None | High | High |
| RAID 1 | 2 | Smallest disk | 1 disk | High | Medium |
| RAID 4 | 3 | (N-1) disks | 1 disk | High | Low (bottleneck) |
| RAID 5 | 3 | (N-1) disks | 1 disk | High | Medium |
| RAID 6 | 4 | (N-2) disks | 2 disks | High | Below RAID 5 |
| RAID 10 | 4 | 50% of all disks | 1 disk per pair | High | High |
| Linear | 2 | 100% of all disks | None | No gain | No gain |

---

## Full RAID Deployment Process

### Step 1 — Partition preparation

Before creating an array, partition the disks with `fdisk` or `parted`. Set partition type `fd` (Linux RAID autodetect) on each RAID partition; otherwise the array will not assemble automatically at boot.

```bash
lsblk
fdisk -l /dev/sdb
fdisk /dev/sdb
# Inside fdisk:
# n — new partition
# t — change partition type
# fd — Linux RAID autodetect
# w — write and exit
```

> **Warning:** For `fdisk` to write the updated partition table, all partitions on that physical disk must be unmounted. If the disk has both local and RAID partitions, changing the type requires downtime.

> **Note:** All partitions in one array must be the same size. If disks are unequal, the `md` driver uses the smallest size and ignores the remainder.

### Step 2 — Create the array with mdadm

The device `/dev/md0` is created automatically when `mdadm --create` runs. It can also be created manually with `mknod` as a block device with major number 9 (found in `/proc/devices`).

```bash
# Create RAID 5 from three partitions
mdadm -C /dev/md0 -l raid5 -n 3 /dev/sdb1 /dev/sdc1 /dev/sdd1

# Create RAID 1 from two partitions
mdadm -C /dev/md0 -l 1 -n 2 /dev/sdb1 /dev/sdc1

# Create RAID 0 with 64K chunk
mdadm -C /dev/md0 -l 0 -n 2 --chunk=64 /dev/sdb1 /dev/sdc1

# Create RAID 5 with one spare disk
mdadm -C /dev/md0 -l 5 -n 3 --spare-devices=1 /dev/sdb1 /dev/sdc1 /dev/sdd1 /dev/sde1
```

> **Note — Superblock:** On creation, `mdadm` writes a superblock (default version 1.2) to each member disk. It stores array metadata: UUID, RAID level, disk count, state. If a superblock already exists, use `--assemble` not `--create`.

### Step 3 — Check via /proc/mdstat

Immediately after creation, verify the state via `/proc/mdstat`. This is the fastest way to confirm all disks joined and the rebuild is progressing normally.

```bash
cat /proc/mdstat
```

### Step 4 — Format the array

A created `md` array behaves like any ordinary block device.

```bash
mkfs.ext3 /dev/md0
mkfs.ext4 /dev/md0
```

### Step 5 — Save configuration and update /etc/fstab

`mdadm.conf` is not created automatically. Generate it manually.

```bash
mdadm --detail --scan --verbose > /etc/mdadm.conf
cat /etc/mdadm.conf
```

Then add an entry to `/etc/fstab`. If the member partitions were previously listed separately in `fstab`, remove those entries.

```
/dev/md0   /mnt/raid   ext4   defaults   0   2
```

### Step 6 — Mount

If the array was created without a reboot, mount it manually.

```bash
mount /dev/md0 /mnt/raid
mount -a
```

On the next boot the system assembles the array from `mdadm.conf` and mounts it via `fstab`.

---

## Auto-start RAID at Boot

To assemble the array automatically after reboot, add `mdadm --assemble` to a startup script.

```bash
# Add to /etc/rc.d/rc.sysinit or /etc/init.d/rcS:
mdadm --assemble -s
```

The `-s` (scan) flag tells `mdadm` to first read `mdadm.conf`. If the file is absent, `mdadm` falls back to `/proc/mdstat`. After assembly the system mounts the array via `/etc/fstab`.

> **Note:** On systemd systems, RAID auto-start is handled by `mdadm-assemble.service` and `md-raid-autodetect.service`. No manual rc-file entry is needed. `mdadm.conf` must still exist for compatibility.

Manual start and mount without autostart:

```bash
mdadm --assemble /dev/md0 /dev/sdb1 /dev/sdc1 /dev/sdd1
mount /dev/md0 /mnt/raid
```

---

## Legacy: raidtab

Before `mdadm`, RAID was configured via `/etc/raidtab` with the utilities `mkraid`, `raidstart`, and `raidstop`. Not used on modern systems, but may appear on the exam.

```
# /etc/raidtab example
raiddev /dev/md0
  raid-level              0
  nr-raid-disks           2
  persistent-superblock   0
  chunk-size              8
  device                  /dev/hda1
  raid-disk               0
  device                  /dev/hdb1
  raid-disk               1

raiddev /dev/md1
  raid-level              5
  nr-raid-disks           3
  nr-spare-disks          1
  persistent-superblock   1
  parity-algorithm        left-symmetric
  device                  /dev/sda1
  raid-disk               0
  device                  /dev/sdb1
  raid-disk               1
  device                  /dev/sdc1
  raid-disk               2
  device                  /dev/sdd1
  spare-disk              0
```

| Utility | Action |
|---|---|
| `mkraid` | Create and activate arrays from raidtab |
| `raidstart` | Start (activate) arrays |
| `raidstop` | Stop (deactivate) arrays |

The `-a` (or `--all`) flag applies the operation to all arrays in the file.

> **Important:** `raidtab`, `mkraid`, `raidstart`, `raidstop` are **legacy**. The modern way is `mdadm` with `mdadm.conf`. Know both and be able to tell them apart.

---

## mdadm Modes

`mdadm` (Multiple Devices Admin) is the primary software RAID management tool. Requires only the `md` kernel module.

| Mode | Option | Purpose |
|---|---|---|
| Create | `-C`, `--create` | Create a new array from scratch, write superblock |
| Assemble | `-A`, `--assemble` | Assemble an existing array (superblock already on disks) |
| Build | `-B`, `--build` | Assemble without superblock (legacy, rarely used) |
| Manage | `--manage` | Manage array members: add, remove, mark failed |
| Misc | `--misc` | Miscellaneous: details, remove superblock, export config |
| Monitor | `-F`, `--monitor` | Monitor array events, send notifications |
| Grow | `--grow` | Resize or restructure an array |

### Create

```bash
mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdb1 /dev/sdc1
mdadm -C /dev/md0 -l 1 -n 2 /dev/sdb1 /dev/sdc1

mdadm -C /dev/md0 -l 5 -n 3 --spare-devices=1 /dev/sdb1 /dev/sdc1 /dev/sdd1 /dev/sde1
mdadm -C /dev/md0 -l 0 -n 2 --chunk=64 /dev/sdb1 /dev/sdc1
```

### Assemble

```bash
mdadm --assemble /dev/md0 /dev/sdb1 /dev/sdc1
mdadm --assemble --scan
mdadm --assemble -s    # scan with mdadm.conf, fall back to /proc/mdstat
```

### Check status

```bash
cat /proc/mdstat
mdadm --detail /dev/md0
mdadm --examine /dev/sdb1    # check if a disk belongs to an array
```

### Save mdadm.conf

```bash
mdadm --verbose --detail --scan /dev/md0          # preview
mdadm --verbose --detail --scan /dev/md0 >> /etc/mdadm.conf
mdadm --detail --scan --verbose > /etc/mdadm.conf  # all arrays at once
```

Example `mdadm.conf` content:

```
ARRAY /dev/md0 level=raid5 num-devices=3 metadata=1.2 \
    name=myserver:0 UUID=38edfd0d:45092996:954b269a:9e919b3a \
    devices=/dev/sdb1,/dev/sdc1,/dev/sdd1
```

> **Important:** `mdadm.conf` is **not** updated automatically when the array changes. Added a spare? Regenerate the file manually.

### Monitor

```bash
mdadm --monitor --daemonise --mail=admin@example.com /dev/md0
mdadm --monitor --scan --syslog
```

Monitor mode tracks events: disk failure, rebuild start/finish, array degradation. On an event it can send email or execute a script.

### Disk management

```bash
mdadm --manage /dev/md0 --fail /dev/sdb1    # mark failed
mdadm --manage /dev/md0 --remove /dev/sdb1  # remove from array
mdadm --manage /dev/md0 --add /dev/sde1     # add new disk (as spare)
mdadm --detail /dev/md0 | grep Spare
```

Typical disk replacement procedure:

```bash
# 1. Mark failed
mdadm --manage /dev/md0 --fail /dev/sdb1

# 2. Remove from array
mdadm --manage /dev/md0 --remove /dev/sdb1

# 3. Physically replace the disk, partition the new one
fdisk /dev/sdb    # set type 0xfd

# 4. Add new disk
mdadm --manage /dev/md0 --add /dev/sdb1

# 5. Monitor rebuild
watch cat /proc/mdstat
```

---

## /proc/mdstat

This pseudo-file is created by the kernel and shows the current state of all software RAID arrays. Its presence confirms the kernel supports RAID.

```
Personalities : [raid1] [raid5] [raid6]   # loaded RAID modules
md0 : active raid1 sdc1[1] sdb1[0]        # name, status, level, disks
      10484736 blocks super 1.2 [2/2] [UU] # size, superblock version, disk status

unused devices: <none>
```

In the `[UU_...]` field:
- `U` — disk is active (UP)
- `_` — disk is unavailable (DOWN/FAILED)

During rebuild a progress bar appears:

```
[===>.................]  recovery = 18.5% finish=8.1min speed=75000K/sec
```

> **Tip:** `watch cat /proc/mdstat` refreshes every 2 seconds — convenient for monitoring a rebuild.

---

## Exam Cheat Sheet

### Paths and Files

| Path | Purpose |
|---|---|
| `/proc/mdstat` | Current state of all RAID arrays |
| `/etc/mdadm.conf` | Configuration file (Debian/generic) |
| `/etc/mdadm/mdadm.conf` | Configuration file (Ubuntu/RHEL) |
| `/dev/md0`, `/dev/md1`, ... | RAID array block devices |

### Short vs Long Options

| Long option | Short | Meaning |
|---|---|---|
| `--create` | `-C` | Create array |
| `--assemble` | `-A` | Assemble array |
| `--level=N` | `-l N` | RAID level |
| `--raid-devices=N` | `-n N` | Number of active disks |
| `--spare-devices=N` | `-x N` | Number of spare disks |
| `--chunk=N` | `-c N` | Chunk size in KiB |

### Common Exam Traps

- `--create` writes a new superblock. If a superblock already exists, use `--assemble`.
- `mdadm.conf` is not updated automatically — regenerate it after any array change.
- `/proc/mdstat` is a **state** file, not a **config** file. Often confused with `mdadm.conf`.
- RAID 5 requires at least 3 disks; RAID 6 and RAID 10 require at least 4.
- `[3/2] [UU_]` in `/proc/mdstat` = degraded array: 3 required, 2 active.
- Partition type for RAID members: `0xFD` (code `fd` in `fdisk`).

---

## Practice Questions

**Q1.** What is the minimum number of disks for RAID 5 with one spare?

**Answer:** **4** — RAID 5 requires at least 3 active disks plus 1 spare.

---

**Q2.** After `cat /proc/mdstat` you see `[3/2] [UU_]`. What does this mean?

**Answer:** The array is **degraded**: 3 disks required, 2 active. `UU_` confirms two UP and one DOWN.

---

**Q3.** Which command assembles a previously created RAID array after a reboot?

**Answer:** `mdadm --assemble --scan` — assembles existing arrays using superblock data.

---

**Q4.** Where is software RAID configuration stored for auto-assembly?

**Answer:** `/etc/mdadm.conf` (or `/etc/mdadm/mdadm.conf` on Ubuntu/RHEL). `/proc/mdstat` is the kernel's state file, not configuration.

---

**Q5.** Disk `/dev/sdc1` failed in array `/dev/md0` and has been marked as failed. What is the next command before physically replacing the disk?

**Answer:** `mdadm --manage /dev/md0 --remove /dev/sdc1` — remove the failed disk from the array, then physically replace it and add the new one with `--add`.

---

**Q6.** After adding a spare via `mdadm --manage`, will `mdadm.conf` be updated automatically?

**Answer:** **No** — `mdadm` never updates `mdadm.conf` automatically. Regenerate it manually after any change.

---

**Q7.** What partition type should be set on disks intended for software RAID?

**Answer:** `0xFD` — Linux RAID autodetect (code `fd` in `fdisk`). This allows the kernel to detect and assemble arrays automatically at boot.

---

**Q8.** Which RAID level provides the best write performance with two disks but no fault tolerance?

**Answer:** **RAID 0** (striping) — distributes data across all disks in parallel for maximum speed. Any disk failure destroys the entire array.
