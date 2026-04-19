---
title: "LPIC-1 104.5 — Manage File Permissions and Ownership"
date: 2026-04-19
description: "chmod, chown, chgrp, umask, SUID, SGID, sticky bit, octal and symbolic permission notation. LPIC-1 exam topic 104.5."
tags: ["Linux", "LPIC-1", "chmod", "chown", "umask", "SUID", "SGID", "sticky bit", "permissions"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-104-5-file-permissions/"
---

> **Exam weight: 3** — LPIC-1 v5, Exam 101

## What You Need to Know

- Manage access permissions on regular files, special files, and directories.
- Use SUID, SGID, and sticky bit for security.
- Change the default file creation mask.
- Use the group field to grant access to group members.

Key utilities: `chmod`, `umask`, `chown`, `chgrp`.

---

## Viewing Permissions with ls

```bash
ls -l
# -rw-rw-r-- 1 carol carol 1881 Dec 10 15:57 text.txt
# drwxr-xr-x 2 carol carol 4096 Dec 10 17:59 Another_Directory
```

First character = file type. Next 9 = permissions (three groups of three). Then: hard link count, owner, group, size, date, name.

- `ls -a` — show hidden files (starting with `.`)
- `ls -ld DIR` — show directory attributes, not its contents
- `ls -lh` — human-readable sizes

### File Types

| Symbol | Type |
|---|---|
| `-` | regular file |
| `d` | directory |
| `l` | symbolic link |
| `b` | block device (disks) |
| `c` | character device (terminals, serial ports) |
| `s` | socket |

### Permission Groups

The 9 permission characters split into three groups:

- **u** (user/owner)
- **g** (group)
- **o** (others/world)

Each group: `r` (read), `w` (write), `x` (execute). Dash `-` = absent.

**File permissions:**

| Permission | Allows |
|---|---|
| `r` | read file contents |
| `w` | modify or delete the file |
| `x` | execute as a program |

**Directory permissions:**

| Permission | Allows |
|---|---|
| `r` | list files (`ls`) |
| `w` | create, delete, rename files inside (needs `x` too) |
| `x` | enter the directory (`cd`), access files by name |

### How the System Checks Permissions

Exactly one set of permissions applies — checked in order:

1. User is the owner → owner permissions apply.
2. User is in the owning group → group permissions apply.
3. Otherwise → other permissions apply.

If you are the owner but the group has more rights, you still get only the owner rights.

---

## Changing Permissions: chmod

```
chmod MODE FILE
```

Only the file owner or root can change permissions.

### Symbolic Mode

Who: `u` (owner), `g` (group), `o` (others), `a` (all).

Action: `+` (add), `-` (remove), `=` (set exactly).

```bash
chmod u+x script.sh           # add execute for owner
chmod go-w text.txt           # remove write from group and others
chmod a=r notes.txt           # set all to read only
chmod u+x,go-wx file          # multiple changes, comma-separated
```

### Octal Mode

Each permission has a numeric value: `r=4`, `w=2`, `x=1`. Sum them per group:

| Number | Permissions |
|---|---|
| 7 | rwx |
| 6 | rw- |
| 5 | r-x |
| 4 | r-- |
| 0 | --- |

Three digits: owner — group — others:

```bash
chmod 660 text.txt      # rw-rw----
chmod 755 script.sh     # rwxr-xr-x
chmod 640 secret.txt    # rw-r-----
```

Tip: an odd number means the file is definitely executable.

### Recursive Change

```bash
chmod -R u+rwx Another_Directory/
```

Without `-R`, only the directory itself is affected. With `-R` — the entire tree.

### Symbolic vs Octal

- **Octal** — when you need to set all permissions to a specific value at once.
- **Symbolic** — when changing one permission without touching the rest.

---

## Changing Ownership: chown and chgrp

```bash
chown USER:GROUP FILE      # owner and group
chown carol text.txt       # owner only
chown carol: text.txt      # owner + carol's primary group
chown :students text.txt   # group only
```

Group-only change with a dedicated command:

```bash
chgrp students text.txt
```

Only root can transfer ownership to another user or a group you don't belong to. Both support `-R` for recursive application.

---

## Working with Groups

```bash
getent group                    # list all system groups
groups carol                    # groups a user belongs to
groupmems -g cdrom -l           # members of a group (requires root)
```

---

## Default Creation Mask: umask

When a file or directory is created, the system starts with maximum permissions and subtracts the mask:

- Directories: `0777 - umask`
- Files: `0666 - umask` (files never get `x` by default)

```bash
umask          # show current mask (e.g. 0022)
umask -S       # symbolic form (u=rwx,g=rx,o=rx)
```

With `umask 022`: directories → `755`, files → `644`.

Change for current session:

```bash
umask 027
umask u=rwx,g=rx,o=    # symbolic form
```

To persist across sessions, add to `~/.bashrc` or `/etc/profile`.

### umask Values

| umask | File | Directory |
|---|---|---|
| 022 | rw-r--r-- (644) | rwxr-xr-x (755) |
| 027 | rw-r----- (640) | rwxr-x--- (750) |
| 077 | rw------- (600) | rwx------ (700) |
| 007 | rw-rw---- (660) | rwxrwx--- (770) |

---

## Special Permissions

### Sticky Bit

Octal value: **1** (4th digit). Symbol: `t` in place of `x` for others.

On a directory: only the file's owner or the directory's owner can delete or rename files inside. Applied to directories only — has no effect on files.

```bash
chmod 1755 /tmp        # octal
chmod o+t /tmp         # symbolic
```

Classic example: `/tmp` — world-writable, but each user can only delete their own files.

### SGID

Octal value: **2** (4th digit). Symbol: `s` in place of `x` for group.

On an executable file: process runs with the group privileges of the file's owning group.

On a directory: new files and subdirectories created inside inherit the parent directory's group.

```bash
chmod 2755 Sample_Directory    # octal
chmod g+s Sample_Directory     # symbolic
```

### SUID

Octal value: **4** (4th digit). Symbol: `s` in place of `x` for owner.

On an executable file: process runs with the privileges of the file's owner, not the user who launched it. Classic example: `/usr/bin/passwd` (runs as root to update `/etc/shadow`). Has no effect on directories.

```bash
chmod 4755 /bin/foo      # octal
chmod u+s /bin/foo       # symbolic
```

### Four-Digit Octal Notation

Special permissions go in the leading (4th) digit:

| 4th digit | Permission |
|---|---|
| 0 | no special permissions |
| 1 | sticky bit |
| 2 | SGID |
| 4 | SUID |
| 6 | SUID + SGID |

```bash
chmod 6755 test.sh       # SUID + SGID
chmod 0755 test.sh       # remove all special permissions
```

### Uppercase S and T

If a special bit is set but `x` is absent for the same group, the letter is uppercase:

| Symbol | Meaning |
|---|---|
| `s` (lowercase) | special bit set + `x` present |
| `S` (uppercase) | special bit set + `x` **absent** |
| `t` (lowercase) | sticky set + `x` present for others |
| `T` (uppercase) | sticky set + `x` **absent** for others |

Uppercase is a diagnostic signal: the special bit is set but without `x` it is likely useless.

---

## Quick Reference

### Permission Bits

| Bit | Octal | Symbol | Works on |
|---|---|---|---|
| read | 4 | r | file, directory |
| write | 2 | w | file, directory |
| execute | 1 | x | file, directory |
| sticky | 1 (4th digit) | t (for o) | directory only |
| SGID | 2 (4th digit) | s (for g) | file, directory |
| SUID | 4 (4th digit) | s (for u) | file only |

### Commands

| Command | Description |
|---|---|
| `ls -l` | show permissions, owner, group, size |
| `ls -ld DIR` | show directory's own attributes |
| `chmod MODE FILE` | change permissions |
| `chmod -R MODE DIR` | recursive change |
| `chown USER:GROUP FILE` | change owner and group |
| `chgrp GROUP FILE` | change group only |
| `umask` | show or set creation mask |
| `umask -S` | mask in symbolic form |
| `getent group` | list all groups |
| `groups USER` | user's groups |

---

## Exam Questions

1. Which umask gives new files `rw-r-----`? → **`027`** (666 − 027 = 640).
2. How to make all new files in directory `sales` belong to group `sales`? → `chmod g+s sales` or `chmod 2755 sales`.
3. How to set SUID on `/bin/foo`? → `chmod 4755 /bin/foo` or `chmod u+s /bin/foo`.
4. Octal values of special bits? → SUID=4, SGID=2, sticky=1.
5. What does `t` mean in `/tmp` (`drwxrwxrwt`)? → Sticky bit: only the file's owner can delete it.
6. What does uppercase `S` mean in `-rwSr-xr-x`? → SUID is set but owner has no `x`.
7. Difference between `chown` and `chgrp`? → `chown` changes owner and/or group; `chgrp` changes group only.
8. Where to put `umask` to persist across sessions? → `~/.bashrc`, `~/.profile`, or `/etc/profile`.
9. What does `chmod` without `-R` do on a directory? → Changes the directory's own permissions only; files inside are unaffected.
10. How to remove all special permissions with octal notation? → Use `0` as the leading digit: `chmod 0755 file`.

---

## Exercises

### Exercise 1 — Show a directory's own permissions

Create `emptydir` with `mkdir emptydir`. Show the permissions on the directory itself (not its contents).

<details>
<summary>Answer</summary>

```bash
ls -ld emptydir
```

Without `-d`, `ls` lists the directory's contents. The `-d` flag makes it show the directory's own attributes.

</details>

---

### Exercise 2 — chmod in symbolic mode

Create `emptyfile` with `touch emptyfile`. In a single `chmod` command using symbolic mode: add execute for the owner and remove write and execute from group and others.

<details>
<summary>Answer</summary>

```bash
chmod u+x,go-wx emptyfile
```

`u+x` — add execute for owner. `go-wx` — remove write and execute from group and others. Multiple changes are comma-separated with no spaces.

</details>

---

### Exercise 3 — Calculate permissions from umask

What permissions will new files have if umask is `027`?

<details>
<summary>Answer</summary>

`rw-r-----` (640).

Calculation: `666 - 027 = 640`. Files never get `x` by default, so the `x` bits in the mask have no effect on files.

</details>

---

### Exercise 4 — Parse permissions and remove SGID

```
-rwxr-sr-x 1 carol root 33 Dec 11 10:36 test.sh
```

What are the owner's permissions? How do you remove the special permission with octal notation?

<details>
<summary>Answer</summary>

Owner permissions — characters 2–4: `rwx`. Owner can read, write, and execute.

Converting to octal: `rwx`=7, `r-x` for group (`s` is in the `x` position, so `x` is present)=5, `r-x`=5 → regular permissions are `755`.

To remove the special permission, pass `0` as the 4th digit:

```bash
chmod 0755 test.sh
```

</details>

---

### Exercise 5 — Block device ownership

```
$ ls -l /dev/sdb1
brw-rw---- 1 root disk 8, 17 Dec 21 18:51 /dev/sdb1
```

What type of file is this? Who can write to it?

<details>
<summary>Answer</summary>

First character `b` — block device (typically a disk).

Write access: owner (`root`) and any member of the `disk` group. Others have no access.

</details>

---

### Exercise 6 — Octal notation for four files

Express permissions in four-digit octal notation:

```
drwxr-xr-t 2 carol carol  4,0K Dec 20 18:46 Another_Directory
----r--r-- 1 carol carol     0 Dec 11 10:55 foo.bar
-rw-rw-r-- 1 carol carol  1,2G Dec 20 18:22 HugeFile.zip
drwxr-sr-x 2 carol users 4,0K Jan 18 17:26 Sample_Directory
```

<details>
<summary>Answer</summary>

| File | Octal | Notes |
|---|---|---|
| `Another_Directory` | **1755** | sticky=1; `rwx`=7, `r-x`=5, `r-x`=5 |
| `foo.bar` | **0044** | no special bits; `---`=0, `r--`=4, `r--`=4 |
| `HugeFile.zip` | **0664** | no special bits; `rw-`=6, `rw-`=6, `r--`=4 |
| `Sample_Directory` | **2755** | SGID=2; `rwx`=7, `r-x`=5, `r-x`=5 |

</details>

---

### Exercise 7 — chmod with one or two digits

After `chmod 000 emptyfile`, what happens with `chmod 4 emptyfile`? With `chmod 44 emptyfile`? What does this reveal about how `chmod` reads numeric values?

<details>
<summary>Answer</summary>

After `chmod 4 emptyfile`: `-------r--` — **others** only changed.

After `chmod 44 emptyfile`: `----r--r--` — **group and others** changed.

`chmod` reads digits right to left:

| Digits given | What changes |
|---|---|
| 1 | others only |
| 2 | group + others |
| 3 | owner + group + others |
| 4 | special bits + all three groups |

</details>

---

### Exercise 8 — /tmp sticky bit and file deletion

```
drwxrwxrwt 19 root root 16K /tmp
```

Owner, group, and others all have full permissions. Can a regular user delete another user's files in `/tmp`?

<details>
<summary>Answer</summary>

No. `/tmp` is world-writable, but the **sticky bit** (`t`) is set. It means only the file's owner or the directory's owner can delete or rename files inside.

A regular user can only delete their own files in `/tmp`.

</details>

---

### Exercise 9 — SUID and uppercase S

`test.sh` has `-rwsr-xr-x` (SUID set). After running `chmod u-x test.sh`, `ls -l` shows `-rwSr-xr-x`. What happened? What does the uppercase `S` mean?

<details>
<summary>Answer</summary>

Execute permission was removed from the owner. Since `s` occupies the `x` position, the system uses letter case to encode whether `x` is also present:

| Symbol | Special bit | `x` present? |
|---|---|---|
| `s` (lowercase) | set | yes |
| `S` (uppercase) | set | **no** |
| `t` (lowercase) | sticky set | yes |
| `T` (uppercase) | sticky set | **no** |

Uppercase is a diagnostic signal: the special bit is set, but without `x` it is likely useless.

</details>

---

### Exercise 10 — Shared directory with SGID and sticky bit

Create a `Box` directory where all new files automatically belong to group `users`, and only the file's creator can delete it.

<details>
<summary>Answer</summary>

Step 1 — create the directory:

```bash
mkdir Box
```

Step 2 — assign group ownership and set SGID (new files inherit the parent's group):

```bash
chown :users Box/
chmod g+wxs,o+t Box/
```

Result:

```
drwxrwsr-t 2 carol users 4,0K Jan 18 19:09 Box
```

</details>

---

*LPIC-1 Study Notes | Topic 104: Devices, Linux Filesystems, Filesystem Hierarchy Standard*
