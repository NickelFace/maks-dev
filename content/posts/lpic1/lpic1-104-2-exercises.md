---
title: "LPIC-1 104.2 — Exercises and Walkthroughs"
date: 2026-04-19
description: "Guided and explorational exercises for LPIC-1 topic 104.2: du, df, e2fsck, tune2fs, xfs_repair."
tags: ["Linux", "LPIC-1", "fsck", "e2fsck", "tune2fs", "xfs_repair", "du", "df", "exercises"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-104-2-exercises/"
---

> **Topic 104.2** — Maintain the Integrity of Filesystems. Guided and explorational exercises.

---

## Guided Exercises

### 1. Show only files in the current directory with du (no subdirectories)

**Task:** use `du` to check how much space files in the current directory take up — excluding subdirectories.

**Answer:**

```bash
du -S -h -d 0
# short form
du -Shd 0
```

`-S` separates the current directory's accounting from its subdirectories. `-d 0` limits recursion depth to zero — no subdirectory lines in output. Without `-S`, the total would still include nested files, so both flags are needed together.

---

### 2. df filtered to ext4 with custom columns

**Task:** display information for each ext4 filesystem. Columns in order: device, mount point, total inodes, available inodes, usage percentage.

**Answer:**

```bash
df -t ext4 --output=source,target,itotal,iavail,pcent
```

`-t ext4` filters by type. `--output=...` sets the column list and order.

Note: `pcent` shows the percentage of **used** space. There is no separate "free percentage" field in `df`.

---

### 3. e2fsck in non-interactive mode with auto-fix

**Task:** run `e2fsck` on `/dev/sdc1` non-interactively, automatically fixing most errors.

**Answer:**

```bash
e2fsck -p /dev/sdc1
```

With `-p`, the tool fixes what it can without human input. If it encounters an error requiring administrator intervention, it prints a description and exits. Alternatives: `-y` answers yes to everything; `-n` answers no and opens the filesystem read-only.

---

### 4. Convert ext2 to ext3, reset mount counter, set label

**Task:** `/dev/sdb1` is ext2. Convert to ext3, reset the mount counter, and change the label to `UserData`.

**Answer:**

```bash
tune2fs -j -C 0 -L UserData /dev/sdb1
```

- `-j` — add journal (ext2 → ext3 conversion)
- `-C 0` (uppercase) — reset current mount count to 0
- `-L UserData` — set label

**Case matters:** `-c` (lowercase) sets the maximum mount count; `-C` (uppercase) sets the current counter value.

---

### 5. Check XFS without making any changes

**Task:** check an XFS filesystem for errors without performing any repair.

**Answer:**

```bash
xfs_repair -n /dev/sdb1
```

`-n` = no modify: filesystem is scanned, errors are reported, nothing is written to disk.

---

## Explorational Exercises

### 1. Effect of `tune2fs -c 9` when mount count is 8

**Given:** ext4 on `/dev/sda1`. Output of `tune2fs -l`:

```
Mount count: 8
Maximum mount count: -1
```

What happens on the next boot if you run `tune2fs -c 9 /dev/sda1`?

**Answer:** the command sets the maximum mount count to 9. Since the current count is 8, on the next boot the count will reach 9 — equal to the maximum — and the system will automatically run a filesystem check.

The original value of `-1` meant the mount-count check was disabled entirely.

---

### 2. Analyse `du -h` output and calculate file sizes

**Given:**

```
216K ./somedir/anotherdir
224K ./somedir
232K .
```

How much space do files in the current directory (only, no subdirectories) take? How to rewrite the command to show this explicitly?

**Answer:** of the total 232 KB, the `somedir` subtree accounts for 224 KB. Files in the current directory alone: 232 − 224 = **8 KB**.

To see this explicitly:

```bash
du -Sh
```

`-S` separates each directory's own files from its subdirectories. Add `-d 0` to suppress subdirectory lines entirely.

---

### 3. Effect of `tune2fs -j -J device= -i 30d` on ext2

**Given:**

```bash
tune2fs -j /dev/sdb1 -J device=/dev/sdc1 -i 30d
```

What happens to the ext2 filesystem on `/dev/sdb1`?

**Answer:** a journal is added, converting `/dev/sdb1` to ext3. The journal is stored on the separate device `/dev/sdc1`. The filesystem will be automatically checked every 30 days.

- `-j` — creates the journal, upgrades to ext3
- `-J device=` — places the journal on a separate disk (performance and reliability)
- `-i 30d` — sets a 30-day automatic check interval

---

### 4. Check XFS with external log section, no repair

**Task:** check XFS `/dev/sda1` whose log section is on `/dev/sdc1`, without making any changes.

**Answer:**

```bash
xfs_repair -l /dev/sdc1 -n /dev/sda1
```

`-l` (lowercase L) specifies the external log device. Do not confuse with `-L` (uppercase), which **zeroes out** a corrupt log.

`-n` is always safe and appropriate for initial diagnosis.

---

### 5. Difference between `-T` and `-t` in df

**Task:** what is the difference between the `-T` and `-t` options of `df`?

**Answer:**

- `-T` (uppercase) **adds** a filesystem type column to output. All filesystems remain in the output.
- `-t TYPE` (lowercase) is a **filter** — only filesystems of the specified type are shown.

Memory aid: uppercase `-T` (Type) **shows** the type; lowercase `-t` **takes** a type argument and filters by it.

The complementary flag `-x TYPE` excludes filesystems of the specified type.
