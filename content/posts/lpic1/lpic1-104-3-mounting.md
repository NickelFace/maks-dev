---
title: "LPIC-1 104.3 — Control Mounting and Unmounting of Filesystems"
date: 2026-04-19
description: "mount, umount, /etc/fstab, UUID, LABEL, blkid, lsblk, systemd mount and automount units. LPIC-1 exam topic 104.3."
tags: ["Linux", "LPIC-1", "mount", "umount", "fstab", "UUID", "blkid", "systemd", "mounting"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-104-3-mounting/"
---

> **Exam weight: 3** — LPIC-1 v5, Exam 101

## What You Need to Know

- Mount and unmount filesystems manually.
- Configure automatic mounting at boot via `/etc/fstab`.
- Use labels and UUIDs to identify partitions.
- Work with systemd mount unit files.

Key utilities: `/etc/fstab`, `/media/`, `mount`, `umount`, `blkid`, `lsblk`.

---

## What is Mounting

A filesystem in Linux cannot be used directly. It must first be attached to a point in the directory tree — called a **mount point**. After mounting, the partition's contents are accessible through that directory.

Mounting can be done manually with `mount`, automatically via `/etc/fstab` at boot, or through systemd unit files.

---

## The mount Command

### Basic Syntax

```
mount -t TYPE DEVICE MOUNTPOINT
```

- `TYPE` — filesystem type (`ext4`, `btrfs`, `exfat`, `ntfs`, etc.)
- `DEVICE` — partition with the filesystem, e.g. `/dev/sdb1`
- `MOUNTPOINT` — directory to attach to; must already exist

```bash
mount -t exfat /dev/sdb1 ~/flash/
```

Any files previously in the mount point directory become inaccessible while another filesystem is mounted on top.

### Viewing Mounted Filesystems

`mount` without arguments lists all mounted filesystems. Filter by type with `-t`:

```bash
mount -t ext4
# /dev/sda1 on / type ext4 (rw,noatime,errors=remount-ro)

mount -t ext4,fuseblk    # multiple types comma-separated
```

Output format: `SOURCE on TARGET type TYPE OPTIONS`.

Alternatives: `cat /proc/self/mounts`, `cat /proc/mounts`, `findmnt`.

### Key Options

| Option | Description |
|---|---|
| `-t TYPE` | specify filesystem type |
| `-o OPTS` | pass comma-separated mount options |
| `-r` / `-ro` | mount read-only |
| `-w` / `-rw` | mount read-write |
| `-a` | mount all filesystems in `/etc/fstab` |
| `--bind` | make a directory's contents visible at another path |

**Remounting** an already-mounted filesystem — no need to specify type:

```bash
mount -o remount,ro /dev/sdb1
mount -o remount,ro /mnt/data    # by mount point
```

**`mount --bind`** makes a directory's contents accessible at another location without copying:

```bash
mount --bind /src /dst
```

---

## The umount Command

Accepts either device name or mount point — both are equivalent:

```bash
umount /dev/sdb1
umount ~/flash
```

| Option | Description |
|---|---|
| `-a` | unmount all filesystems in `/etc/fstab` |
| `-f` | force unmount (useful for unreachable network filesystems) |
| `-r` | if unmounting fails, remount read-only |

Options combine: `umount -fr /mnt/server`.

### Busy Filesystem: lsof

When you get `target is busy`, some process is holding files open:

```bash
lsof /dev/sdb1
# COMMAND  PID  USER  FD  TYPE  DEVICE  SIZE/OFF  NODE  NAME
# evince   3135 carol 16r REG   8,17    21881768  5195  /media/.../file.pdf
```

Close the program, then unmount.

---

## /mnt vs /media

- **`/mnt`** — conventional for manual, temporary mounts.
- **`/media`** — standard for removable media. Modern distributions auto-mount there: `/media/USER/LABEL`.

---

## /etc/fstab

Describes filesystems that can be mounted. Each line has exactly **6 fields**:

```
FILESYSTEM  MOUNTPOINT  TYPE  OPTIONS  DUMP  PASS
```

| Field | Description |
|---|---|
| `FILESYSTEM` | device, UUID, or label |
| `MOUNTPOINT` | mount point path |
| `TYPE` | filesystem type |
| `OPTIONS` | comma-separated mount options |
| `DUMP` | whether `dump` backs this up (usually `0`) |
| `PASS` | fsck check order on boot; `0` = skip |

Example:

```
/dev/sda1  /  ext4  noatime,errors=remount-ro  0  1
```

### Mount Options

| Option | Description |
|---|---|
| `defaults` | = `rw,suid,dev,exec,auto,nouser,async` |
| `atime` / `noatime` | update access time on reads |
| `auto` / `noauto` | mount with `mount -a` or not |
| `exec` / `noexec` | allow / deny binary execution |
| `user` / `nouser` | allow / deny mounting by regular users |
| `group` | allow mounting by users in the device's group |
| `owner` | allow mounting by the device's owner |
| `suid` / `nosuid` | respect / ignore SUID/SGID bits |
| `ro` / `rw` | read-only / read-write |
| `sync` / `async` | synchronous / asynchronous I/O |
| `dev` / `nodev` | interpret block/character devices |
| `remount` | remount already-mounted filesystem (`mount -o` only, not fstab) |

**`sync` on flash media** shortens device lifespan due to limited write cycles.

---

## UUID and Labels

Device names are unstable — `/dev/sdb1` may become `/dev/sdc1` after reconnection. UUIDs and labels don't change between reconnections.

### lsblk -f

```bash
lsblk -f /dev/sda1
# NAME  FSTYPE  LABEL  UUID                                  FSAVAIL  FSUSE%  MOUNTPOINT
# sda1  ext4           6e2c12e3-472d-4bac-a257-c49ac07f3761  64.9G    33%     /
```

### blkid

```bash
blkid
blkid /dev/sda1
# /dev/sda1: UUID="6e2c12e3-..." TYPE="ext4" PARTUUID="..."
```

Both utilities are listed in the 104.3 objectives.

### Using UUID and LABEL

In `/etc/fstab`:

```
UUID=6e2c12e3-472d-4bac-a257-c49ac07f3761  /      ext4  noatime,errors=remount-ro  0  1
LABEL=homedisk                              /home  ext4  defaults                   0  2
```

On the command line:

```bash
mount UUID=56C11DCC5D2E1334 /mnt/external
mount LABEL=Backup /mnt/backup
```

---

## Mounting via systemd

systemd manages mounting through unit files in `/etc/systemd/system/`.

If you mount a filesystem manually without a fstab entry or mount unit, systemd automatically generates a temporary mount unit and tracks the mount point.

### Mount Unit (.mount)

```ini
[Unit]
Description=External data disk

[Mount]
What=/dev/disk/by-uuid/56C11DCC5D2E1334
Where=/mnt/external
Type=ntfs
Options=defaults

[Install]
WantedBy=multi-user.target
```

| Field | Description |
|---|---|
| `What=` | device (typically via `/dev/disk/by-uuid/`) |
| `Where=` | full mount point path |
| `Type=` | filesystem type |
| `Options=` | mount options |
| `WantedBy=` | target (`multi-user.target` for normal boot) |

### File Naming

File name = mount point with `/` replaced by `-`, plus `.mount` extension:

| Mount point | File name |
|---|---|
| `/mnt/external` | `mnt-external.mount` |
| `/var/log/db` | `var-log-db.mount` |
| `/` | `-.mount` |

File goes in `/etc/systemd/system/`.

### Managing Units

```bash
systemctl daemon-reload
systemctl start  mnt-external.mount
systemctl status mnt-external.mount
systemctl enable mnt-external.mount    # persist across reboots
```

### Automount Unit (.automount)

Mounts on demand — when the mount point is first accessed:

```ini
[Unit]
Description=Automount for the external data disk

[Automount]
Where=/mnt/external

[Install]
WantedBy=multi-user.target
```

File name: `mnt-external.automount`. Same naming rule.

```bash
systemctl daemon-reload
systemctl start  mnt-external.automount
systemctl enable mnt-external.automount
```

---

## Quick Reference

```bash
# View mounted filesystems
mount
mount -t ext4,ntfs
findmnt

# Mount
mount -t ext4 /dev/sdb1 /mnt/data
mount -o ro,noatime /dev/sdb1 /mnt/data
mount -o remount,ro /mnt/data
mount UUID=... /mnt/data
mount LABEL=Backup /mnt/backup
mount -a
mount --bind /src /dst

# Unmount
umount /dev/sdb1
umount /mnt/data
umount -fr /mnt/server
umount -a

# Device info
lsblk -f /dev/sdb1
blkid /dev/sda1

# Who is using the filesystem
lsof /dev/sdb1

# systemd
systemctl daemon-reload
systemctl start  mnt-external.mount
systemctl enable mnt-external.mount
```

---

## Exam Questions

1. How many fields in a valid `/etc/fstab` line? → **6**: FILESYSTEM, MOUNTPOINT, TYPE, OPTIONS, DUMP, PASS.
2. Two ways besides device name to identify a partition in fstab? → **`UUID=`** and **`LABEL=`**.
3. What does `mount --bind` do? → Makes a directory's contents visible at another path.
4. What happens if you mount manually without fstab/unit entry? → systemd auto-generates a temporary mount unit.
5. Which commands list all mounted filesystems? → `mount`, `cat /proc/self/mounts`, `cat /proc/mounts`, `findmnt`.
6. What does `noauto` in fstab mean? → Entry is skipped by `mount -a`; must be mounted manually.
7. What does `nouser` mean? → Regular users cannot mount this filesystem; only root can.
8. How to force-unmount an unreachable network filesystem? → `umount -f -r /mnt/server`.
9. Where does a mount unit go and what is it named? → `/etc/systemd/system/`, name = mount point with slashes→dashes + `.mount`.
10. Must you specify type when remounting? → No, device or mount point is sufficient.
11. What does `defaults` include? → `rw, suid, dev, exec, auto, nouser, async`.
12. How to disable binary execution while keeping `defaults`? → Add `noexec`: `defaults,noexec`.
13. Difference between `lsblk -f` and `blkid`? → `lsblk -f` shows a table with free space and mount point; `blkid` gives compact output suitable for scripts.
14. How to find processes holding files on a busy filesystem? → `lsof /dev/sdXN`.
15. Why is `sync` not recommended for flash storage? → Writes happen synchronously, wearing out flash cells faster due to limited write cycles.

---

## Exercises

### Exercise 1 — Mount ext4 read-only with options

Mount ext4 on `/dev/sdc1` to `/mnt/external` read-only, with options `noatime` and `async`.

<details>
<summary>Answer</summary>

```bash
mount -t ext4 -o noatime,async,ro /dev/sdc1 /mnt/external
```

</details>

---

### Exercise 2 — Find what is holding a busy filesystem

Unmounting `/dev/sdd2` returns `target is busy`. How do you find which files are open?

<details>
<summary>Answer</summary>

```bash
lsof /dev/sdd2
```

Output shows: process name, PID, user, and the open file. Close the program, then unmount.

</details>

---

### Exercise 3 — noauto and mount -a

`/etc/fstab` contains:

```
/dev/sdb1  /data  ext4  noatime,noauto,async
```

Will this filesystem be mounted by `mount -a`?

<details>
<summary>Answer</summary>

No. The `noauto` option tells `mount -a` to skip this entry. The filesystem must be mounted manually.

</details>

---

### Exercise 4 — Finding a filesystem's UUID

How do you find the UUID of the filesystem on `/dev/sdb1`?

<details>
<summary>Answer</summary>

```bash
lsblk -f /dev/sdb1
# or
blkid /dev/sdb1
```

`lsblk -f` shows a table with type, label, UUID, free space and mount point. `blkid` gives compact output, convenient for scripts. Both are in the 104.3 objectives.

</details>

---

### Exercise 5 — Remount as read-only

An exFAT filesystem is mounted at `/mnt/data`. How do you remount it read-only?

<details>
<summary>Answer</summary>

When remounting, type and UUID are not needed — mount point alone is sufficient:

```bash
mount -o remount,ro /mnt/data
```

</details>

---

### Exercise 6 — List ext3 and ntfs mounts

How do you list all mounted filesystems of type ext3 and ntfs?

<details>
<summary>Answer</summary>

```bash
mount -t ext3,ntfs
```

</details>

---

### Exercise 7 — nouser and regular user mounting

`/etc/fstab` contains:

```
/dev/sdc1  /backup  ext4  noatime,nouser,async
```

Can a regular user mount this filesystem with `mount /backup`?

<details>
<summary>Answer</summary>

No. The `nouser` option allows only root to mount this filesystem.

To allow regular users: use `user` (any user) or `group` (users in the device's group).

</details>

---

### Exercise 8 — Force-unmount an unreachable network filesystem

A network filesystem at `/mnt/server` has become unreachable due to connection loss. How do you force-unmount it, or fall back to read-only if that fails?

<details>
<summary>Answer</summary>

```bash
umount -fr /mnt/server
```

`-f` forces unmount; `-r` falls back to remounting read-only if unmounting fails.

</details>

---

### Exercise 9 — fstab entry for btrfs Backup

Write an `/etc/fstab` line that mounts a btrfs volume with label `Backup` at `/mnt/backup` with default options but no binary execution.

<details>
<summary>Answer</summary>

```
LABEL=Backup  /mnt/backup  btrfs  defaults,noexec  0  0
```

`defaults` includes `exec`. Adding `noexec` overrides it — the last matching option wins.

DUMP and PASS are `0 0`: skip `dump` backup, skip fsck on boot.

</details>

---

### Exercise 10 — fstab equivalent of a mount unit

Given this systemd mount unit:

```ini
[Unit]
Description=External data disk

[Mount]
What=/dev/disk/by-uuid/56C11DCC5D2E1334
Where=/mnt/external
Type=ntfs
Options=defaults

[Install]
WantedBy=multi-user.target
```

What is the equivalent `/etc/fstab` line, and what must the unit file be named and where should it go?

<details>
<summary>Answer</summary>

fstab equivalent:

```
UUID=56C11DCC5D2E1334  /mnt/external  ntfs  defaults  0  0
```

`What=/dev/disk/by-uuid/UUID` is a symlink path created by udev. In fstab, the same UUID is written as `UUID=`.

Unit file: `mnt-external.mount` in `/etc/systemd/system/`.

Naming rule: replace each `/` in the mount point path with `-`:

| Mount point | File name |
|---|---|
| `/mnt/external` | `mnt-external.mount` |
| `/var/log/db` | `var-log-db.mount` |
| `/` | `-.mount` |

</details>

---

*LPIC-1 Study Notes | Topic 104: Devices, Linux Filesystems, Filesystem Hierarchy Standard*
