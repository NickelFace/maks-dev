---
title: "LPIC-1 104.2 — Maintain the Integrity of Filesystems"
date: 2026-04-19
description: "du, df, fsck, e2fsck, tune2fs, xfs_repair, xfs_fsr, xfs_db — monitor disk usage, check and repair ext and XFS filesystems. LPIC-1 exam topic 104.2."
tags: ["Linux", "LPIC-1", "fsck", "e2fsck", "tune2fs", "xfs_repair", "du", "df", "filesystems"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-104-2-filesystem-integrity/"
---

> **Exam weight: 2** — LPIC-1 v5, Exam 101

## What You Need to Know

- Check filesystem integrity.
- Monitor free space and inodes.
- Fix simple filesystem problems.

Key utilities: `du`, `df`, `fsck`, `e2fsck`, `mke2fs`, `tune2fs`, `xfs_repair`, `xfs_fsr`, `xfs_db`.

---

## Introduction

Modern Linux filesystems are journaling: every operation is written to an internal journal before execution. If a kernel panic or power loss interrupts it, the journal allows recovery without filesystem corruption. Journaling has greatly reduced the need for manual checks — but they are still occasionally necessary.

---

## Disk Usage: du

`du` (disk usage) reports space used by files and directories, recursively.

### Basic Usage

Without options, prints kilobyte block counts for the current directory and all subdirectories:

```bash
$ du -h
4.8M .
```

### Key Options

| Option | Description |
|---|---|
| `-h` | human-readable sizes (K, M, G) |
| `-a` | show every file, not just directories |
| `-s` | summary only (no subdirectory breakdown) |
| `-S` | exclude subdirectory sizes from each directory's total |
| `-c` | append a grand total line |
| `-d N` | limit recursion to N levels deep |
| `--exclude="PATTERN"` | skip files matching pattern |

**`-S` (capital) vs default:** normally `du` includes subdirectory sizes in the parent total. With `-S` each directory's total counts only its own files:

```bash
$ du -h           $ du -Sh
4.8M ./Temp       4.8M ./Temp
6.0M .            1.3M .
```

**Case matters:** `-s` (lowercase) prints a summary line; `-S` (uppercase) separates subdirectory accounting.

**Limit depth:**

```bash
$ du -h -d 1
224K ./somedir
232K .
```

Hidden deeper levels are still counted in totals, just not printed separately.

**Exclude files:**

```bash
$ du -ah --exclude="*.bin"
```

---

## Free Space: df

`df` reports at the filesystem level — lists all mounted filesystems with total size, used, available, usage percentage, and mount point.

### Basic Usage

```bash
$ df -h
Filesystem Size Used Avail Use% Mounted on
udev       2.9G 0    2.9G  0%   /dev
/dev/sda1  106G 25G  76G   25%  /
```

### Key Options

| Option | Description |
|---|---|
| `-h` | human-readable sizes |
| `-i` | show inodes instead of blocks |
| `-T` | add filesystem type column |
| `-t TYPE` | filter — show only filesystems of this type |
| `-x TYPE` | filter — exclude filesystems of this type |
| `--output=FIELDS` | specify columns and their order |

**`-T` vs `-t` — important exam distinction:**

- `-T` (uppercase) **adds** a Type column to output; all filesystems remain visible.
- `-t TYPE` (lowercase) is a **filter** — only shows filesystems of the specified type.

```bash
df -ht ext4      # show only ext4
df -hx tmpfs     # hide tmpfs
```

**`--output`** — control columns and order:

```bash
$ df -h --output=target,source,fstype,pcent
Mounted on  Filesystem Type     Use%
/dev        udev       devtmpfs 0%
/           /dev/sda1  ext4     25%
```

Block fields: `source`, `fstype`, `size`, `used`, `avail`, `pcent`, `target`.  
Inode fields: `itotal`, `iused`, `iavail`, `ipcent`.

---

## ext2 / ext3 / ext4 Maintenance

### fsck

`fsck` checks a filesystem for errors. **Never run on a mounted filesystem — data loss will result.**

```bash
fsck /dev/sdb1
```

`fsck` itself is a wrapper: it calls the appropriate utility for the filesystem type. Without `-t`, it assumes ext and calls `e2fsck`.

```bash
fsck -t vfat /dev/sdc      # explicit type
```

| Option | Description |
|---|---|
| `-A` | check all filesystems in `/etc/fstab` |
| `-C` | show progress bar (ext2/3/4 only) |
| `-N` | dry run — show what would be done |
| `-R` | with `-A`, skip the root filesystem |
| `-V` | verbose output |

### e2fsck

Dedicated tool for ext2/3/4. `fsck.ext2`, `fsck.ext3`, `fsck.ext4` are all symlinks to `e2fsck`.

By default, interactive. For each error it asks: `y` (fix), `n` (skip), `a` (fix this and all subsequent).

Non-interactive modes:

| Option | Description |
|---|---|
| `-p` | auto-fix errors; exit if admin intervention needed |
| `-y` | answer yes to everything |
| `-n` | answer no; filesystem opened read-only, no changes |
| `-f` | force check even if filesystem is marked `clean` |

### tune2fs

View and change ext2/3/4 parameters.

```bash
tune2fs -l /dev/sda1    # list all parameters
```

Output includes: label, UUID, block size, inode count, mount count, maximum mount count, last check date.

| Option | Description |
|---|---|
| `-l` | list filesystem parameters |
| `-c N` | set max mounts before check; `-1` disables |
| `-C N` | set current mount count value |
| `-i N[d|m|y]` | check interval: `d` days, `m` months, `y` years; `0` disables |
| `-L LABEL` | set filesystem label (≤16 chars) |
| `-U UUID` | set filesystem UUID |
| `-j` | add journal (converts ext2 → ext3) |
| `-J OPTS` | journal options |
| `-e BEHAVIOUR` | error behaviour: `continue`, `remount-ro`, `panic` |

**Case matters:** `-c` (lowercase) sets the maximum; `-C` (uppercase) sets the current counter value.

**Mount count:** increments by 1 on each mount. When it reaches maximum mount count, `e2fsck` runs automatically on next boot.

**Error behaviour:**

- `continue` — keep running normally (default)
- `remount-ro` — remount read-only; stops writes, prevents further corruption
- `panic` — trigger kernel panic

### Converting ext2 to ext3

ext3 = ext2 + journal. Add journal with `-j`:

```bash
tune2fs -j /dev/sda1
```

Journal options via `-J` (comma-separated):

```bash
tune2fs -J size=10,location=100M,device=/dev/sdb1 /dev/sda1
```

| Journal option | Description |
|---|---|
| `size=N` | journal size in MB |
| `location=POS` | position on disk (suffix M, G) |
| `device=DEV` | store journal on a separate device |

---

## XFS Maintenance

### xfs_repair

The `fsck` equivalent for XFS. First step: scan without making changes:

```bash
xfs_repair -n /dev/sdb1
```

`-n` = no modify. If errors are found, run without `-n` to repair:

```bash
xfs_repair /dev/sdb1
```

| Option | Description |
|---|---|
| `-n` | check only, no modifications |
| `-l LOGDEV` | external log section device |
| `-r RTDEV` | realtime section device |
| `-m N` | limit memory use to N MB |
| `-d` | dangerous mode — repair read-only mounted filesystem |
| `-v` | verbose; repeat for more detail |
| `-L` | zero out a corrupt log (last resort — may cause data loss) |

`xfs_repair` cannot repair a filesystem with a dirty log without `-L`.

### xfs_db

Interactive debugger for XFS internals:

```bash
xfs_db /dev/sdb1
```

`help` lists commands; `help COMMAND` shows details.

### xfs_fsr

Defragments XFS. Without arguments, runs for 2 hours attempting to defragment all write-mounted XFS filesystems listed in `/etc/mtab`. May require a separate package install.

---

## Quick Reference

```bash
# Files in current directory only (no subdirectories)
du -Shd 0

# Recursive with depth limit
du -h -d 1

# Only ext4 with inode columns
df -t ext4 --output=source,target,itotal,iavail,pcent

# Show filesystem type
df -hT

# Inode usage
df -i

# Auto-fix ext errors
e2fsck -p /dev/sdc1

# Force check even if clean
e2fsck -f /dev/sdc1

# Convert ext2 to ext3, reset counter, set label
tune2fs -j -C 0 -L UserData /dev/sdb1

# Set check interval to 30 days
tune2fs -i 30d /dev/sda1

# Show ext2/3/4 parameters
tune2fs -l /dev/sda1

# Journal on separate device + 30-day interval
tune2fs -j /dev/sdb1 -J device=/dev/sdc1 -i 30d

# Check XFS without repair
xfs_repair -n /dev/sdb1

# Check XFS with external log, no repair
xfs_repair -l /dev/sdc1 -n /dev/sda1
```

---

## Exam Questions

1. Which command shows disk usage for all mounted filesystems? → **`df`**.
2. Which `e2fsck` option auto-fixes errors without prompting? → **`-p`**.
3. Which `tune2fs` option sets the check interval in days? → **`-i`**.
4. Which `tune2fs` option sets the maximum mount count? → **`-c`** (lowercase).
5. Difference between `-T` and `-t` in `df`? → `-T` adds a Type column; `-t TYPE` filters output to only that filesystem type.
6. How to add a journal to ext2? → `tune2fs -j /dev/XXX` — converts to ext3.
7. How to check XFS without making changes? → `xfs_repair -n /dev/XXX`.
8. XFS equivalent of `fsck`? → **`xfs_repair`**.
9. How to place an ext journal on a separate device? → `tune2fs -J device=/dev/XXX`.
10. Which `du` option shows only files in the current directory (not subdirectories)? → **`-S`** (uppercase), often with `-d 0`.
11. Default reserved space for root in new ext4? → **5%**.
12. What does `xfs_repair -n` mean? → no modify — check only, no writes to disk.
13. Difference between `-c` and `-C` in `tune2fs`? → `-c` sets the maximum mount count; `-C` sets the current counter value.
14. What is `mount count` in `tune2fs -l`? → number of times the filesystem has been mounted; triggers `e2fsck` when it reaches maximum mount count.
15. What does `-e remount-ro` do in `tune2fs`? → on filesystem error, remount read-only to stop further writes.
