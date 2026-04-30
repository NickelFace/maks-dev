---
title: "LPIC-2 204.3 — Logical Volume Manager (LVM)"
date: 2025-11-08
description: "LVM architecture (PV/VG/LV), full deployment cycle, extending and reducing volumes, LVM snapshots, Device Mapper, and lvm.conf filters. LPIC-2 exam topic 204.3."
tags: ["Linux", "LVM", "LPIC-2", "storage", "Device Mapper"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-204-3-logical-volume-manager/"
page_lang: "en"
---

> **Exam topic 204.3** — Logical Volume Manager. Covers the three-tier LVM architecture, physical/volume/logical volume commands, resizing, snapshots, Device Mapper, and lvm.conf configuration.

---

## What is LVM

LVM (Logical Volume Manager) combines multiple physical partitions into a single storage pool, then carves logical volumes of any size from that pool. The Linux kernel sees no difference between an ordinary partition and a logical volume, so `mount` works identically for both.

The key advantage over traditional partitioning: volume size can be changed on a running system, and a new disk is added to the pool without repartitioning existing data.

> **Important:** The package is called `lvm2`. If `pvcreate`, `vgcreate`, and `lvcreate` are unavailable, install it: `apt install lvm2` or `yum install lvm2`.

---

## LVM Architecture: Three Tiers

```
Physical disk/partition  (/dev/sdb1, /dev/sdc)
          |
    Physical Volume (PV)      ← pvcreate
          |
    Volume Group (VG)         ← vgcreate
          |
    Logical Volume (LV)       ← lvcreate
          |
      Filesystem              ← mkfs
          |
    Mount point               ← mount
```

Each tier has its own command set: `pv*` for physical volumes, `vg*` for volume groups, `lv*` for logical volumes.

> **Note:** Physical Extents (PE) are the minimum allocation blocks inside a VG, defaulting to 4 MB. Logical Extents (LE) on the LV side map one-to-one to PEs. PE size is set at VG creation time with `vgcreate -s`.

---

## Physical Volumes (PV)

A Physical Volume is a disk or partition prepared for use in LVM. `pvcreate` writes LVM metadata to the beginning of the device.

Partition type for LVM in `fdisk`: `0x8e` (Linux LVM).

### Creating a PV

```bash
pvcreate /dev/sdb1 /dev/sdc1
```

### Viewing PVs

```bash
pvdisplay              # detailed output per PV
pvs                    # brief table of all PVs
pvscan                 # scan disks, find PVs
pvck /dev/sdb1         # check PV metadata
```

Example `pvs` output:

```
  PV         VG       Fmt  Attr PSize  PFree
  /dev/sdb1  vg_data  lvm2 a--  10.00g  5.00g
  /dev/sdc1  vg_data  lvm2 a--   5.00g  2.00g
```

### Managing PVs

```bash
pvmove /dev/sdb1          # move extents to other PVs within the VG
pvremove /dev/sdb1        # remove LVM metadata from the device
pvchange -x n /dev/sdb1   # prevent new extent allocation on this PV
pvresize /dev/sdb1        # recalculate PV size after partition resize
```

> **Warning:** Before `pvremove`, ensure no active extents exist on the device. Use `pvmove` to migrate data first.

---

## Volume Groups (VG)

A Volume Group combines one or more PVs into a single pool. Logical Volumes are created from this pool.

### Creating a VG

```bash
# Create group volume01 from two PVs
vgcreate volume01 /dev/sdb1 /dev/sdc1

# Create with non-default PE size (8 MB instead of 4 MB)
vgcreate -s 8M vg_data /dev/sdb1
```

### Viewing VGs

```bash
vgdisplay volume01    # detailed information
vgs                   # brief table of all VGs
vgscan                # search for VGs on all disks
vgck volume01         # check VG metadata
```

### Managing VGs

```bash
vgextend volume01 /dev/sdd1      # add a PV to the VG
vgreduce volume01 /dev/sdb1      # remove a PV (no data must remain)
vgrename volume01 vg_new         # rename the VG
vgremove volume01                # delete the VG (all LVs must be removed first)
vgchange -a y volume01           # activate the VG
vgchange -a n volume01           # deactivate the VG
vgexport volume01                # export VG (for migration to another machine)
vgimport volume01                # import a previously exported VG
vgmerge vg_target vg_source      # merge two VGs into one
vgsplit volume01 vg_new /dev/sdb1 # split a PV into a new VG
vgcfgbackup volume01             # back up VG metadata
vgcfgrestore volume01            # restore VG metadata from backup
```

> **Important:** `vgchange -a y` activates all VGs; `vgchange -a n` deactivates them. The `-a` flag stands for `--activate`.

---

## Logical Volumes (LV)

A Logical Volume is a virtual partition inside a VG. The kernel sees it as an ordinary block device.

### Creating an LV

```bash
# Create a 100 MB LV with an auto-generated name (lvol0, lvol1...)
lvcreate -L 100M volume01

# Create with an explicit name
lvcreate -L 2G -n mydata volume01

# Create using 50% of free space in the VG
lvcreate -l 50%FREE -n mydata volume01

# Create using a specific number of extents
lvcreate -l 128 -n mydata volume01
```

After creation the LV is accessible via two paths:

- `/dev/volume01/mydata` (symlink)
- `/dev/mapper/volume01-mydata` (Device Mapper)

### Viewing LVs

```bash
lvdisplay /dev/volume01/mydata   # detailed information
lvs                              # brief table of all LVs
lvscan                           # list all LVs on all VGs
lvmdiskscan                      # all devices visible to LVM
```

### Format and mount

```bash
mkfs -t xfs /dev/volume01/mydata
mkfs.ext4 /dev/volume01/mydata
mount /dev/volume01/mydata /mnt/data

# /etc/fstab entry (recommended: use /dev/mapper path)
/dev/mapper/volume01-mydata  /mnt/data  xfs  defaults  0  0
```

> **Tip:** In `/etc/fstab` use `/dev/mapper/` paths rather than `/dev/VG/LV`. This ensures correct LVM activation at boot on some distributions.

---

## Full Cycle: Disk to Mount Point

```bash
# Step 1: create physical volumes
pvcreate /dev/hda4 /dev/hda5

# Step 2: create a volume group
vgcreate volume01 /dev/hda4 /dev/hda5

# Step 3: create a 100 MB logical volume
lvcreate -L 100M -n lvol0 volume01

# Step 4: format
mkfs -t xfs /dev/volume01/lvol0

# Step 5: mount
mount /dev/volume01/lvol0 /mnt
```

---

## Extending VG and LV

Extend the VG by adding a new PV, then extend the LV, then the filesystem inside it.

### Extend the VG

```bash
pvcreate /dev/hda6
vgextend volume01 /dev/hda6
```

### Extend the LV

```bash
lvextend -L +50M /dev/volume01/lvol0     # add 50 MB
lvextend -L 500M /dev/volume01/lvol0     # resize to exactly 500 MB
lvextend -l +100%FREE /dev/volume01/lvol0  # use all free space in the VG
```

### Extend the filesystem

After `lvextend` the filesystem is still unaware of the new space — resize it separately.

```bash
# XFS (extend only; shrink is not supported — filesystem must be mounted)
xfs_growfs /dev/volume01/lvol0
# or by mount point:
xfs_growfs /mnt

# ext2/ext3/ext4 (filesystem must be unmounted for resize)
resize2fs /dev/volume01/lvol0
```

> **Important:** XFS can only be extended **online** (while mounted). ext2/ext3/ext4 must be **unmounted** for resize. This is a frequent exam question.

---

## Shrinking an LV

Shrinking is more complex than extending: shrink the filesystem first, then the LV.

```bash
# Only for ext2/ext3/ext4 — XFS cannot be shrunk!

# Step 1: unmount
umount /dev/volume01/lvol0

# Step 2: check the filesystem
e2fsck -f /dev/volume01/lvol0

# Step 3: shrink the filesystem first
resize2fs /dev/volume01/lvol0 80M

# Step 4: then shrink the LV
lvreduce -L 80M /dev/volume01/lvol0

# Alternative: lvresize works in both directions
lvresize -L -20M /dev/volume01/lvol0
```

> **Warning:** Always shrink in this order: **filesystem first, then LV**. Reversing the order causes data loss. XFS does not support shrinking at all.

---

## LVM Snapshots

A snapshot is a virtual point-in-time copy of a logical volume. Used for backup without stopping the system.

LVM snapshots use copy-on-write (CoW): when a block in the original LV changes, the old value is saved to the snapshot first, then the original is overwritten. The snapshot uses space proportional to the volume of changes, not the original volume size.

### Creating a snapshot

```bash
# Create a snapshot of lvol0, allocating 50 MB for CoW data
lvcreate -L 50M -s -n snapshot0 /dev/volume01/lvol0
```

Flags: `-s` (or `--snapshot`) creates a snapshot; `-n` sets the name.

### Using a snapshot

```bash
# Mount snapshot read-only (e.g., for backup)
mount -o ro /dev/volume01/snapshot0 /mnt/backup

# Back up the data
tar -czf /backup/data.tar.gz /mnt/backup/

# Unmount
umount /mnt/backup
```

### Deleting a snapshot

```bash
lvremove /dev/volume01/snapshot0
```

> **Warning:** Delete snapshots immediately after use. On databases and write-intensive systems, an unclosed snapshot degrades performance — every write to the original LV requires an extra copy operation.

> **Important:** If the snapshot fills up (CoW space is exhausted), it becomes **invalid**. Monitor fill levels with `lvs` or `lvdisplay`.

---

## Device Mapper

Device Mapper is a Linux kernel driver that creates virtual block devices on top of physical ones. LVM uses Device Mapper as its transport layer; Device Mapper itself knows nothing about volume groups or LVM metadata formats.

When a logical volume is activated, LVM translates it into a mapped device. Each LV segment becomes a row in the mapping table. Device Mapper supports three mapping types: **linear** (sequential), **striped** (interleaved), and **error** (for fault testing).

Every LV appears in `/dev/mapper/` with the name `VG_name-LV_name` (hyphen-separated).

```bash
dmsetup info
dmsetup info /dev/mapper/volume01-lvol0
```

Example output:

```
Name:              volume01-lvol0
State:             ACTIVE
Read Ahead:        256
Tables present:    LIVE
Open count:        1
Major, minor:      253, 2
Number of targets: 1
UUID: LVM-abc123...
```

Example `/etc/fstab` entries:

```
/dev/mapper/centos-root   /      xfs   defaults  0 0
/dev/mapper/centos-swap   swap   swap  defaults  0 0
```

> **Note:** If a VG or LV name contains a hyphen, it is **doubled** in the `/dev/mapper/` path. For example, VG `vg-data` with LV `lv-home` gives `/dev/mapper/vg--data-lv--home`.

---

## lvm.conf Configuration

The global LVM configuration file is `/etc/lvm/lvm.conf`. It is loaded at system startup. The default path can be overridden with the `LVM_SYSTEM_DIR` environment variable.

```bash
lvm dumpconfig --type default
lvm dumpconfig --type default --withcomments
```

> **Note:** On older distributions, `lvmconf` was used instead of `lvm dumpconfig`.

### devices section: filters

`vgscan` and `pvscan` scan all block devices for LVM metadata. In multipath environments the same metadata is found on each path, producing duplicate entries in `pvs` output. The `filter` option in the `devices` section restricts the device list using regular expressions.

Format: `"a|regex|"` (accept) or `"r|regex|"` (reject). Rules are applied in order; the first match wins.

```ini
# Accept all devices (default behavior)
filter = [ "a/.*/" ]

# Exclude CD-ROM
filter = [ "r|/dev/cdrom|" ]

# Accept only multipath devices, reject everything else
filter = [ "a|/dev/disk/by-id/dm-uuid-.*-mpath-.*|", "r|.*|" ]

# Accept only /dev/hda8, reject everything else
filter = [ "a|^/dev/hda8$|", "r/.*/" ]
```

> **Warning:** Rule order matters. Putting `"r|.*|"` first will block all devices and LVM will find no PVs.

> **Important:** `a` = accept, `r` = reject. The separator in the regex can be any character (`|`, `/`, `!`) — opening and closing must match.

### devices section: preferred_names

Controls which path LVM displays in `pvs` output when a physical device has multiple paths. The first matching pattern wins.

```ini
# In multipath environments: show mpath paths instead of sd paths
preferred_names = [ "^/dev/mpath/", "^/dev/mapper/mpath", "^/dev/[hs]d" ]
```

### devices section: types

Specifies allowed block device types and partition type numbers. Needed when the system boots from a local disk but other disks are multipath.

```ini
# Allow device-mapper devices with type number 253
types = [ "device-mapper", 253 ]
```

Full documentation: `man lvm.conf`.

---

## Complete LVM Command Reference

### Physical Volume (pv*) commands

| Command | Description |
|---|---|
| `pvcreate` | Initialize a partition/disk as a PV |
| `pvdisplay` | Detailed PV information |
| `pvs` | Brief report on all PVs |
| `pvscan` | Scan disks for PVs |
| `pvck` | Check PV metadata |
| `pvchange` | Change PV attributes |
| `pvmove` | Move extents between PVs |
| `pvremove` | Remove LVM label from a device |
| `pvresize` | Update PV size after partition resize |

### Volume Group (vg*) commands

| Command | Description |
|---|---|
| `vgcreate` | Create a VG from one or more PVs |
| `vgdisplay` | Detailed VG information |
| `vgs` | Brief report on all VGs |
| `vgscan` | Scan disks for VGs |
| `vgck` | Check VG metadata |
| `vgchange` | Change VG attributes (including activation) |
| `vgextend` | Add a PV to a VG |
| `vgreduce` | Remove a PV from a VG |
| `vgrename` | Rename a VG |
| `vgremove` | Delete a VG |
| `vgexport` | Export a VG for migration |
| `vgimport` | Import an exported VG |
| `vgmerge` | Merge two VGs into one |
| `vgsplit` | Split a VG into two |
| `vgmknodes` | Recreate device files in `/dev` |
| `vgcfgbackup` | Back up VG metadata |
| `vgcfgrestore` | Restore VG metadata |
| `vgconvert` | Convert VG metadata format |

### Logical Volume (lv*) commands

| Command | Description |
|---|---|
| `lvcreate` | Create an LV in an existing VG |
| `lvdisplay` | Detailed LV information |
| `lvs` | Brief report on all LVs |
| `lvscan` | List all LVs on all VGs |
| `lvchange` | Change LV attributes |
| `lvextend` | Increase LV size |
| `lvreduce` | Decrease LV size |
| `lvresize` | Resize LV in either direction |
| `lvrename` | Rename an LV |
| `lvremove` | Delete an LV |
| `lvmdiskscan` | All devices visible to LVM |
| `lvconvert` | Change LV type (e.g., add mirror) |

---

## Exam Cheat Sheet

### Creation sequence

```
fdisk (type 0x8e) → pvcreate → vgcreate → lvcreate → mkfs → mount
```

### Extension sequence

```
pvcreate (new disk) → vgextend → lvextend → xfs_growfs / resize2fs
```

### Shrink sequence (ext only)

```
umount → e2fsck -f → resize2fs → lvreduce → mount
```

### Snapshot

```bash
lvcreate -L <size> -s -n <snap_name> /dev/VG/LV
lvremove /dev/VG/snap_name
```

### Device Mapper paths

```
/dev/mapper/VG_name-LV_name
/dev/VG_name/LV_name      ← symlink to /dev/mapper/...
```

Device Mapper mapping types: **linear**, **striped**, **error**.

### lvm.conf filters

```ini
filter = [ "a/.*/" ]                     # accept all
filter = [ "r|/dev/cdrom|" ]             # reject cdrom
filter = [ "a|/dev/sda|", "r|.*|" ]     # only /dev/sda
```

Rule order matters — first match wins.

### Common Exam Mistakes

| Mistake | Correct approach |
|---|---|
| Extend LV before shrinking FS | For shrink: FS first, then LV |
| Try to shrink XFS | XFS cannot be shrunk, only ext can |
| Forget `xfs_growfs` after `lvextend` | After extending LV, also extend FS |
| Mount snapshot read-write | Snapshots are normally mounted read-only (`-o ro`) |
| Forget `pvcreate` before `vgextend` | A disk must become a PV before being added to a VG |

---

## Practice Questions

**Q1.** Which command initializes `/dev/sdb` for use in LVM?

**Answer:** `pvcreate /dev/sdb`

---

**Q2.** An admin wants to add 10 GB to logical volume `/dev/vg0/data` with XFS mounted. What is the correct command sequence?

**Answer:** `lvextend -L +10G /dev/vg0/data`, then `xfs_growfs /dev/vg0/data`. No unmount is needed — XFS extends online.

---

**Q3.** What is the difference between `/dev/mapper/vg0-data` and `/dev/vg0/data`?

**Answer:** They are two paths to the same device. `/dev/vg0/data` is a symlink pointing to `/dev/mapper/vg0-data`. Using `/dev/mapper/` in `/etc/fstab` is recommended.

---

**Q4.** An admin ran `lvcreate -L 200M -s -n snap0 /dev/vg0/data`. A week later the snapshot became invalid. Why?

**Answer:** The 200 MB CoW space was insufficient to store all changed blocks. When the allocated space filled up, the snapshot lost integrity. Allocate at least 15–20% of the original LV size for snapshots, or monitor fill level with `lvs`.

---

**Q5.** What is the correct command sequence to migrate an LV to another server using `vgexport`/`vgimport`?

**Answer:**
1. `umount /dev/vg0/data`
2. `vgchange -a n vg0`
3. `vgexport vg0`
4. Physically move the disk to the new server
5. `vgscan`
6. `vgimport vg0`
7. `vgchange -a y vg0`
8. `mount /dev/vg0/data /mnt/data`

---

**Q6.** An ext4 filesystem on `/dev/vg0/logs` occupies 5 GB and needs to be reduced to 3 GB. What commands are needed and in what order?

**Answer:**
1. `umount /dev/vg0/logs`
2. `e2fsck -f /dev/vg0/logs`
3. `resize2fs /dev/vg0/logs 3G`
4. `lvreduce -L 3G /dev/vg0/logs`
5. `mount /dev/vg0/logs /var/log`

---

**Q7.** Which command shows current `lvm.conf` settings with descriptions?

**Answer:** `lvm dumpconfig --type default --withcomments`

---

**Q8.** An admin ran `lvextend -L +1G /dev/vg0/data` but `df -h` still shows the old size. What is needed?

**Answer:** Extend the filesystem. For XFS (mounted): `xfs_growfs /dev/vg0/data`. For ext4: `resize2fs /dev/vg0/data`. `lvextend` only extends the block device — the filesystem inside must be resized separately.
