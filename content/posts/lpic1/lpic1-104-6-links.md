---
title: "LPIC-1 104.6 — Create and Change Hard and Symbolic Links"
date: 2026-04-19
description: "ln, ln -s, inode, link count, hard and symbolic links, ls -li, broken links. LPIC-1 exam topic 104.6."
tags: ["Linux", "LPIC-1", "ln", "symlink", "hardlink", "inode", "links"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-104-6-links/"
---

> **Exam weight: 2** — LPIC-1 v5, Exam 101

## What You Need to Know

- Create hard and symbolic links with `ln`.
- Distinguish them using `ls -l` and `ls -i`.
- Understand the difference between copying and linking.
- Know hard link limitations: same filesystem only, no links to directories.

---

## Inodes and Links

### What is an Inode

An inode is a filesystem data structure storing a file's attributes: permissions, owner, size, timestamps, and disk block pointers. **The filename is not stored in the inode.** A filename exists as a directory entry that maps a string to an inode number.

All kernel interaction with a file goes through its inode.

### Two Types of Links

**Hard link:** an additional directory entry pointing to the same inode as the original name. Both names are fully equivalent — there is no way to tell which is the "original."

**Symbolic link (symlink/soft link):** a separate file with its own inode whose contents are a path string pointing to the target. When accessed, the kernel follows that path to the target.

---

## Hard Links

### Creating a Hard Link

```
ln TARGET LINK_NAME
```

```bash
ln target.txt /home/carol/Documents/hardlink
```

Omitting `LINK_NAME` creates a link with the same name as the target in the current directory.

### Link Count and Inode

```bash
ls -li
# 3806696 -r--r--r-- 2 carol carol 111702 Jun 7 10:13 hardlink
# 3806696 -r--r--r-- 2 carol carol 111702 Jun 7 10:13 target.txt
```

- First column — inode number. Same number = same data.
- `2` after permissions — hard link count.
- Default count: 1 for regular files, 2 for directories.
- Each new hard link increments the count by 1.

Changes through any name are visible through all others — the data on disk is shared.

### Moving and Deleting

Hard links behave like regular files: `rm` to delete, `mv` to move/rename. Because the link points to an inode (not a path), moving it does not break the connection.

`rm` on one name only decrements the counter. Data survives as long as count > 0.

### Limitations

- **Cannot** create a hard link to a **directory** (prevents directory cycles).
- **Cannot** create a hard link **across filesystem boundaries**.

```bash
ln /media/user/FlashA/file.txt ~/link
# ln: failed to create hard link ... : Invalid cross-device link
```

---

## Symbolic Links

### Creating a Symbolic Link

```
ln -s TARGET LINK_NAME
```

```bash
ln -s target.txt /home/carol/Documents/softlink
```

Unlike hard links: can point to directories and can cross filesystem boundaries.

### Identifying in ls Output

```bash
ls -lh
# lrwxrwxrwx 1 carol carol 12 Jun 7 10:14 softlink -> target.txt
```

Indicators: first character `l`, and `->` followed by the target path after the name.

### Permissions

A symlink always shows `lrwxrwxrwx` in `ls -l`. **Real access is determined by the target's permissions.**

### Relative vs Absolute Paths

If the target path is relative, it is interpreted **relative to the symlink's location**. Moving the symlink to another directory will break it.

```bash
# Created in ~/Documents/ — dangerous (relative)
ln -s original.txt softlink

# After mv softlink ../ — broken!
# Fix: always use an absolute path
ln -s /home/carol/Documents/original.txt softlink
```

### Broken Links

When the target is deleted, the symlink remains but points nowhere — a **broken (dangling) link**. If a file with the same name is later created at the same path, the symlink works again.

### Deleting and Moving

Same as regular files: `rm link`, `mv link /new/path`.

---

## Copying vs Linking

| Method | Inode | Disk space | Relation to original |
|---|---|---|---|
| `cp` | new | new | independent |
| `ln` (hard) | shared with target | shared | full — same data |
| `ln -s` (symlink) | own, new | a few bytes (path string) | via path to target |

---

## Comparison Table

| Property | Hard link | Symbolic link |
|---|---|---|
| Command | `ln T L` | `ln -s T L` |
| Type in `ls -l` | `-` (like a file) | `l` |
| Own inode | no, shared | yes |
| Increments link count | yes | no |
| Cross filesystem | no | yes |
| Link to directory | no | yes |
| When target deleted | data survives (count ≥ 1) | link breaks |
| Size in `ls -l` | same as target | length of path string |

---

## Uses in System Administration

- **Version switching:** `/usr/bin/python` → `python3.11`. Retarget the link to switch interpreters without editing scripts.
- **nginx `sites-enabled`:** config files are symlinks to `sites-available/`.
- **Incremental backups** (`rsync --link-dest`): unchanged files are hard links to the previous snapshot — space-efficient while each snapshot looks complete.
- **Convenience access:** symlink in `~` pointing to `/var/log/myapp/`.

---

## Quick Reference

```bash
# Hard link
ln target.txt hardlink

# Symbolic link
ln -s target.txt softlink

# Symbolic link with absolute path (safe)
ln -s /home/user/file.txt /home/user/links/file

# Overwrite an existing link
ln -sf newtarget.txt softlink

# Show inode number and link count
ls -li

# Show inode number only
ls -i

# Delete any link
rm link

# Move a link
mv link /new/path
```

---

## Exam Questions

1. What happens when the target of a hard link is deleted? → Data remains accessible through the link; count drops to 1, not 0.
2. What happens when the target of a symlink is deleted? → The symlink becomes broken: `No such file or directory`.
3. Can you create a hard link to a directory? → **No**, only a symbolic link.
4. Can you create a hard link across filesystem boundaries? → **No**: `Invalid cross-device link`. Use a symlink instead.
5. Which `ls` flag shows the inode number? → **`-i`**.
6. What permissions does a symlink show in `ls -l`? → Always **`lrwxrwxrwx`**. Real access is from the target.
7. How does a copy differ from a hard link? → A copy has its own inode and disk space; a hard link shares the inode and data with the target.
8. How to create `c.txt` with the same inode as `a.txt`? → `ln a.txt c.txt`.
9. Does a symlink increase the target's link count? → **No**.
10. Why does a relative symlink break when moved? → The target path is resolved relative to the symlink's location; in the new directory, that relative path leads nowhere.

---

## Exercises

### Exercise 1 — Enable the sticky bit with chmod

Which symbolic-mode `chmod` option enables the sticky bit on a directory?

<details>
<summary>Answer</summary>

```bash
chmod +t /path/to/dir
# or explicitly for others:
chmod o+t /path/to/dir
```

The sticky bit symbol is `t`. To enable it, use `+t`.

</details>

---

### Exercise 2 — Create a symbolic link

The file `document.txt` is in `/home/carol/Documents`. Create a symbolic link named `text.txt` in the current directory pointing to it.

<details>
<summary>Answer</summary>

```bash
ln -s /home/carol/Documents/document.txt text.txt
```

The `-s` flag creates a symbolic link. Using the full path prevents the link from breaking if it is ever moved.

</details>

---

### Exercise 3 — Hard link vs copy

Explain the difference between a hard link to a file and a copy of that file.

<details>
<summary>Answer</summary>

A **hard link** is another name for the same file. Link and original share one inode and one set of disk blocks. Changes through any name are visible through all others.

A **copy** is a fully independent entity with its own inode and its own disk space. Changes to the copy do not affect the original.

</details>

---

### Exercise 4 — Deleting the target of a symlink

Given:

```bash
touch recipes.txt
ln recipes.txt receitas.txt
ln -s receitas.txt rezepte.txt
```

What happens to `rezepte.txt` after `rm receitas.txt`?

<details>
<summary>Answer</summary>

`rezepte.txt` becomes a **broken link**. Symlinks point to **names**, not inodes. The name `receitas.txt` no longer exists, so the symlink leads nowhere.

The data itself survives on disk and is accessible via `recipes.txt` (a hard link with the same inode), but the symlink has no knowledge of that.

</details>

---

### Exercise 5 — Hard link to a flash drive

A USB drive is mounted at `/media/youruser/FlashA`. You run:

```bash
ln /media/youruser/FlashA/esquema.pdf ~/schematics.pdf
```

What happens? Why?

<details>
<summary>Answer</summary>

The command fails with `Invalid cross-device link`. Hard links cannot span different devices or filesystems — an inode is only meaningful within its own filesystem.

Fix — use a symlink:

```bash
ln -s /media/youruser/FlashA/esquema.pdf ~/schematics.pdf
```

</details>

---

### Exercise 6 — Analysing ls output for link count

```
-rw-rw-r-- 1 carol carol 2,8M jun 17 15:45 compressed.zip
-rw-r--r-- 4 carol carol  77K jun 17 17:25 document.txt
-rw-rw-r-- 1 carol carol 216K jun 17 17:25 image.png
-rw-r--r-- 4 carol carol  77K jun 17 17:25 text.txt
```

How many links point to `document.txt`? Are they hard or symbolic? Which `ls` flag shows inode numbers?

<details>
<summary>Answer</summary>

Link count is **4**. Starting count is 1 (the name itself), so **3 additional hard links** were created.

They are **hard links** — symlinks do not increase the target's link count.

Flag **`-i`**:

```bash
ls -lahi
# 5388833 -rw-r--r-- 4 document.txt
# 5388833 -rw-r--r-- 4 text.txt
```

`document.txt` and `text.txt` share inode `5388833` → `text.txt` is one of those hard links.

</details>

---

### Exercise 7 — Moving a relative symlink

Directory structure:

```
~/Documents/
├── clients.txt          ("John, Michael, Bob")
└── somedir/
    ├── clients.txt      ("Bill, Luke, Karl")
    └── partners.txt -> clients.txt    (relative symlink)
```

After `mv ~/Documents/somedir/partners.txt ~/Documents/`, what does `less ~/Documents/partners.txt` show?

<details>
<summary>Answer</summary>

The link works, but shows `~/Documents/clients.txt` — `John, Michael, Bob` — **not the intended file**.

`partners.txt` stores `clients.txt` as a **relative path**, resolved from its current location. After moving from `somedir/` to `Documents/`, the link looks for `clients.txt` next to itself — and finds `Documents/clients.txt` instead.

Fix: always use an absolute path when creating symlinks:

```bash
ln -s /home/carol/Documents/somedir/clients.txt partners.txt
```

</details>

---

### Exercise 8 — Symlink permissions

```
-rw-r--r-- 1 carol carol 19 Jun 24 11:12 clients.txt
lrwxrwxrwx 1 carol carol 11 Jun 24 11:13 partners.txt -> clients.txt
```

What are the actual access permissions for `partners.txt`?

<details>
<summary>Answer</summary>

`rw-r--r--` — the target's permissions (`clients.txt`).

A symlink always shows `lrwxrwxrwx` in `ls -l`, but those are its own metadata. Access through the link is governed by the **target's permissions**.

</details>

---

*LPIC-1 Study Notes | Topic 104: Devices, Linux Filesystems, Filesystem Hierarchy Standard*
