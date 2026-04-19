---
title: "LPIC-1 104.7 — Find System Files and Place Files in the Correct Location"
date: 2026-04-19
description: "FHS directory hierarchy, find, locate, updatedb, which, type, whereis. LPIC-1 exam topic 104.7."
tags: ["Linux", "LPIC-1", "find", "locate", "FHS", "whereis", "which"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-104-7-find-fhs/"
---

> **Exam weight: 2** — LPIC-1 v5, Exam 101

## What You Need to Know

- Understand where files belong according to FHS.
- Find files and commands on a Linux system.
- Know the purpose and location of important FHS directories.

Key utilities: `find`, `locate`, `updatedb`, `whereis`, `which`, `type`, `/etc/updatedb.conf`.

---

## FHS — Filesystem Hierarchy Standard

FHS is a Linux Foundation initiative that defines a standard directory layout for Linux systems. Compliance is not mandatory, but nearly all distributions follow it.

Full specification: http://refspecs.linuxfoundation.org/fhs.shtml

### Root Directories

| Directory | Purpose |
|---|---|
| `/` | Root — top of the hierarchy |
| `/bin` | Essential binaries available to all users |
| `/boot` | Boot files: kernel image, initrd, GRUB |
| `/dev` | Device files (physical and virtual): `/dev/sda`, `/dev/null` |
| `/etc` | Host-specific configuration files |
| `/home` | User home directories (`/home/USERNAME`) |
| `/lib` | Shared libraries for `/bin` and `/sbin` |
| `/media` | Mount points for removable media (USB, CD, cards) |
| `/mnt` | Mount point for temporarily attached filesystems |
| `/opt` | Add-on application packages |
| `/proc` | Virtual filesystem with process and kernel data |
| `/root` | Root user's home directory |
| `/run` | Runtime variable data; cleared at boot |
| `/sbin` | System administration binaries |
| `/srv` | Data served by the system (e.g. `/srv/www`) |
| `/tmp` | Temporary files |
| `/usr` | Read-only user data: utilities, applications |
| `/var` | Variable data written during operation: logs, mail, print queues |

**Exam tip:** administrator-compiled binaries for all users go in `/usr/local/bin`.

### Temporary Files

FHS 3.0 defines three locations for temporary files:

| Location | Cleared at boot? | Purpose |
|---|---|---|
| `/tmp` | recommended | Program temporary data; may not survive restart |
| `/var/tmp` | no | Temporary files that should survive reboots |
| `/run` | yes | Runtime data (`.pid` files); old systems used `/var/run` → symlink to `/run` |

---

## The find Command

`find` recursively walks directories and checks files against given criteria.

### Basic Syntax

```
find STARTING_PATH OPTIONS EXPRESSION
```

```bash
find . -name '*.jpg'
```

Always quote glob patterns in single quotes — otherwise the shell expands them before `find` sees them.

### Search by Name

| Option | Description |
|---|---|
| `-name PATTERN` | match by name, case-sensitive |
| `-iname PATTERN` | match by name, case-insensitive |
| `-not EXPR` | negate an expression |

`*.jpg` matches names ending in `.jpg`; `*.jpg*` matches names with `.jpg` anywhere.

### Depth and Filesystem Boundaries

| Option | Description |
|---|---|
| `-maxdepth N` | go at most N levels deep (current dir = level 1) |
| `-mindepth N` | start only from level N |
| `-mount` | do not cross filesystem boundaries |
| `-fstype TYPE` | search only on filesystems of this type |

```bash
find /mnt -fstype exfat -iname "*report*"
```

### Search by Attributes

| Option | Description |
|---|---|
| `-user NAME` | owned by user |
| `-group NAME` | owned by group |
| `-readable` / `-writable` / `-executable` | accessible to the current user |
| `-perm NNNN` | exact permission match |
| `-perm -NNNN` | permissions include at least these bits |
| `-empty` | empty files and directories |
| `-size N[cKMG]` | by size; `c`=bytes, `K`=KiB, `M`=MiB, `G`=GiB; `+`/`-` for greater/less |
| `-type X` | `f`=file, `d`=dir, `l`=symlink, `b`=block, `c`=char, `s`=socket, `p`=pipe |

```bash
find ~ -iname "*report*" -perm 0644 -atime 10 -size +1M
```

### Search by Time

| Option | Description |
|---|---|
| `-amin N` / `-cmin N` / `-mmin N` | accessed / status changed / modified N minutes ago |
| `-atime N` / `-ctime N` / `-mtime N` | same, in units of N×24 hours |

`-cmin` and `-ctime` trigger on any metadata change, including permission changes.

Prefix `+` means "more than N", `-` means "less than N":

```bash
find . -mtime -1 -size +100M    # modified less than 24 h ago, larger than 100 MB
```

### Actions on Results

| Option | Description |
|---|---|
| `-exec CMD {} \;` | run command for each result; `{}` is replaced with the file path |
| `-delete` | delete found files |
| `-print0` | null-separated output for piping to `xargs -0` |

```bash
find . -name "*.conf" -exec chmod 644 {} \;
find . -name "*.bak" -delete
```

---

## locate and updatedb

`locate` searches a pre-built database instead of scanning the filesystem — results are instant but may be stale.

Database location: `/var/lib/mlocate.db`.

### Database Staleness

```bash
locate jpg
# /home/carol/Downloads/Expert.jpg
# /home/carol/Downloads/jpg_specs.doc     ← matches because "jpg" appears in the name
```

Update the database manually:

```bash
sudo updatedb
```

### locate Options

| Option | Description |
|---|---|
| `-i` | case-insensitive |
| `-A "p1" "p2"` | match ALL patterns (default: match any one — OR logic) |
| `-c` | count matches instead of printing paths |
| `-e` | verify each result actually exists on disk |
| `-r` / `--regex` | use a regular expression |

### /etc/updatedb.conf

Controls what `updatedb` skips:

| Variable | Effect |
|---|---|
| `PRUNEFS=` | filesystem types to skip (space-separated, case-insensitive) |
| `PRUNENAMES=` | directory names to skip |
| `PRUNEPATHS=` | absolute paths to skip |
| `PRUNE_BIND_MOUNTS=yes\|no` | skip bind-mounted directories |

---

## Searching for Binaries and Manual Pages

### which

Shows the full path to an executable found via `PATH`.

```bash
which bash        # /usr/bin/bash
which -a mkfs     # all matches in PATH
```

### type

Shell built-in. Reports how the shell interprets a name — distinguishes aliases, functions, built-ins, and files.

```bash
type locate        # locate is /usr/bin/locate
type -a locate     # all matches
type -t locate     # "file"
type -t ll         # "alias"
type -t cd         # "builtin"
```

Use `type` when the exam asks "how does the shell handle this command."

### whereis

Finds the binary, manual page, and source code of a program.

```bash
whereis locate
# locate: /usr/bin/locate /usr/share/man/man1/locate.1.gz
```

| Option | Description |
|---|---|
| `-b` | binary only |
| `-m` | manual page only |
| `-s` | source only |

---

## Quick Reference

```bash
# find by name
find PATH -name "PATTERN"
find PATH -iname "PATTERN"           # case-insensitive
find PATH -not -name "PATTERN"

# find by type and attributes
find PATH -type f                    # files only
find PATH -type d                    # directories only
find PATH -size +10M                 # larger than 10 MiB
find PATH -empty                     # empty files/dirs
find PATH -perm 0644                 # exact permissions
find PATH -perm -644                 # permissions include at least 644
find PATH -user NAME -group NAME
find PATH -writable

# find by time
find PATH -mtime -7                  # modified in last 7 days
find PATH -mmin -30                  # modified in last 30 minutes

# control scope
find PATH -maxdepth 2
find PATH -mount                     # don't cross filesystems
find PATH -fstype ext4

# actions
find PATH -name "*.bak" -exec rm {} \;
find PATH -name "*.bak" -delete

# locate
locate PATTERN
locate -i PATTERN
locate -A "p1" "p2"
locate -c PATTERN                    # count
locate -e PATTERN                    # existing files only
locate -r 'REGEX'
sudo updatedb

# find executables
which COMMAND
which -a COMMAND
type COMMAND
type -a COMMAND
type -t COMMAND                      # alias|keyword|function|builtin|file
whereis COMMAND
whereis -b COMMAND
whereis -m COMMAND
```

---

## Exam Questions

1. Where do administrator-compiled binaries for all users go per FHS? → **`/usr/local/bin`**.
2. Which temporary directory is cleared at boot? → **`/run`** (legacy: `/var/run`, now a symlink).
3. Where do removable media get mounted? → **`/media`**. Temporary manual mounts use **`/mnt`**.
4. Which command tells you how the shell interprets a name (alias, built-in, file)? → **`type`**.
5. Difference between `which` and `type`? → `which` searches only `PATH`; `type` also detects aliases, functions, and built-ins.
6. What does `whereis` show that `which` does not? → Manual pages and source code locations.
7. What does `-maxdepth N` do in `find`? → Limits search to N levels deep; current directory is level 1.
8. Difference between `-perm NNNN` and `-perm -NNNN`? → Exact match vs "at least these bits set."
9. `-mtime` vs `-mmin`? → `-mtime` counts in units of 24 hours; `-mmin` counts in minutes.
10. How to exclude a filesystem type from `updatedb`? → Add it to **`PRUNEFS=`** in `/etc/updatedb.conf`.
11. How to exclude a path from `updatedb`? → Add it to **`PRUNEPATHS=`**.
12. How to exclude a directory name from `updatedb`? → Add it to **`PRUNENAMES=`**.
13. How to skip bind mounts in `updatedb`? → Set **`PRUNE_BIND_MOUNTS=yes`**.
14. Does `find -name` use globs or regexes? → **Globs** (`*`, `?`, `[]`). Use `find -regex` for regexes.
15. How to enable regex in `locate`? → Option **`-r`**.

---

## Exercises

### Exercise 1 — Disposable temporary file

A program needs a one-off temporary file that is not needed after the program exits. Which FHS directory is the right choice?

<details>
<summary>Answer</summary>

`/tmp`. Since the file's fate after program exit does not matter, `/tmp` is the correct choice.

`/tmp` may be cleared at boot — harmless for a disposable file. For files that must survive reboots, use `/var/tmp`.

</details>

---

### Exercise 2 — Temporary directory cleared at boot

Which temporary directory must be cleared during system boot?

<details>
<summary>Answer</summary>

**`/run`** (on some systems `/var/run`, which is now a symlink to `/run`).

For `/tmp`, clearing at boot is only recommended, not required. For `/run`, it is a standard requirement.

</details>

---

### Exercise 3 — find with write access, time, and size filters

Find files in the current directory that are writable by the current user, modified in the last 10 days, and larger than 4 GiB.

<details>
<summary>Answer</summary>

```bash
find . -writable -mtime -10 -size +4G
```

`-writable` checks write access for the current user. `-mtime -10` means modified no more than 10 days ago. `-size +4G` means strictly larger than 4 GiB.

</details>

---

### Exercise 4 — locate with multiple patterns simultaneously

Find via `locate` files whose name contains both the substring `report` and one of: `update`, `updated`, `updating`.

<details>
<summary>Answer</summary>

```bash
locate -A "report" "updat"
```

`-A` switches `locate` to AND logic — all patterns must match. The pattern `updat` covers all three endings: `update`, `updated`, `updating`.

Without `-A`, `locate` with multiple patterns uses OR logic — files matching any one pattern are shown.

</details>

---

### Exercise 5 — Find the manual page for ifconfig

How do you find the path to the manual page for `ifconfig`?

<details>
<summary>Answer</summary>

```bash
whereis -m ifconfig
```

`whereis` locates binaries, manual pages, and source code. The `-m` option limits output to manual pages only.

</details>

---

### Exercise 6 — Exclude ntfs from updatedb indexing

Which variable in `/etc/updatedb.conf` prevents `updatedb` from indexing `ntfs` filesystems?

<details>
<summary>Answer</summary>

```
PRUNEFS=ntfs
```

`PRUNEFS=` takes a space-separated list of filesystem types to skip. Case is irrelevant. Multiple types: `PRUNEFS=ntfs vfat`.

</details>

---

### Exercise 7 — Where to mount an internal disk per FHS

A system administrator wants to mount an internal disk (`/dev/sdc1`). Where should the mount point go according to FHS?

<details>
<summary>Answer</summary>

**`/mnt`** — FHS recommends this directory for temporary manual mounts of internal filesystems.

`/media` is intended for removable media (USB drives, CD/DVD, memory cards).

</details>

---

### Exercise 8 — locate showing only existing files

The `mlocate` database is not updated instantly, so `locate` sometimes returns paths to already-deleted files. How do you make it show only files that actually exist on disk?

<details>
<summary>Answer</summary>

```bash
locate -e PATTERN
```

`-e` verifies each result exists at the moment `locate` runs. Files deleted after the check will still appear on the next run until the database is rebuilt.

</details>

---

### Exercise 9 — find with depth limit and filesystem boundary

Find files in the current directory and subdirectories no more than two levels deep, whose name contains `Status` or `statute` (case-insensitive), without crossing into mounted filesystems.

<details>
<summary>Answer</summary>

```bash
find . -maxdepth 3 -mount -iname "*statu*"
```

Both `Status` and `statute` share the prefix `statu`, so `*statu*` with `-iname` catches both. `-mount` stops traversal at filesystem boundaries. Current directory is level 1, so "two levels down" = `-maxdepth 3`.

</details>

---

### Exercise 10 — find with filesystem type, permissions, and change time

Find files under `/mnt` that: are on ext4 partitions, have at least group-execute permission, are readable by the current user, and had their metadata changed in the last 2 hours.

<details>
<summary>Answer</summary>

```bash
find /mnt -fstype ext4 -perm -410 -cmin -120
```

`-fstype ext4` limits search to ext4. The octal mask `410` encodes owner-read (`4`) + group-execute (`1`); the `-` prefix means "at least these bits". `-cmin -120` matches metadata changes within the last 120 minutes.

</details>

---

### Exercise 11 — find empty files modified long ago at minimum depth

Find empty files modified more than 30 days ago, located at least two directory levels below the current directory.

<details>
<summary>Answer</summary>

```bash
find . -empty -mtime +30 -mindepth 3
```

`-empty` catches empty files and directories. `-mtime +30` means modified more than 30 days ago. Current directory is level 1, so "at least two levels below" = `-mindepth 3`.

Note: `-ctime` in `find` means inode change time (metadata), not creation time. True creation time (`birth time`) requires `stat` and is not available in standard `find`.

</details>

---

### Exercise 12 — find files accessible by a shared group

Users `carol` and `john` both belong to group `mkt`. Find files in `john`'s home directory that `carol` can read via the shared group.

<details>
<summary>Answer</summary>

```bash
find /home/john -perm -040
```

For `carol` to read via group membership, the group-read bit must be set. Octal `040` = group-read. The `-` prefix means "at least these bits" — other permission bits can be anything.

</details>

---

*LPIC-1 Study Notes | Topic 104: Devices, Linux Filesystems, Filesystem Hierarchy Standard*
