---
title: "LPIC-1 102.4 — Use Debian Package Management"
date: 2026-04-16
description: "dpkg, apt-get, apt-cache, apt-file, sources.list, dependency handling. LPIC-1 exam topic 102.4."
tags: ["Linux", "LPIC-1", "Debian", "dpkg", "apt"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-102-4-debian-package-management/"
page_lang: "en"
---

> **Exam weight: 3** — LPIC-1 v5, Exam 101

## What you need to know

- Install, upgrade and remove Debian binary packages.
- Find packages that contain specific files or libraries, including uninstalled ones.
- Obtain package information: version, contents, dependencies, integrity, installation status.
- Understand the purpose and capabilities of apt.

Tools and files: `/etc/apt/sources.list`, `dpkg`, `dpkg-reconfigure`, `apt-get`, `apt-cache`.

---

## The .deb format and dpkg

The `.deb` format emerged as the standard for distributing compiled software on Debian systems. The `dpkg` tool works with this format directly. It is used on Debian itself and all its derivatives, including Ubuntu.

`dpkg` handles installation, configuration, maintenance and removal of packages. APT works on top of `dpkg`, adding dependency resolution and repository support — it does not replace `dpkg`.

### Installing and upgrading packages

```bash
dpkg -i PACKAGENAME.deb
```

Before installing, `dpkg` checks whether an older version is already present. If so, the package is upgraded. Otherwise it is installed fresh.

### Dependencies in dpkg

`dpkg` checks for dependencies when installing. If required packages are missing, installation fails with a list of unmet dependencies. `dpkg` cannot resolve dependencies on its own — the required `.deb` files must be found and installed manually.

Example dependency error:

```
dpkg: dependency problems prevent configuration of openshot-qt:
 openshot-qt depends on fonts-cantarell; however:
  Package fonts-cantarell is not installed.
```

The `--force` flag bypasses dependency warnings during removal, but this is dangerous: the system may end up in a broken state.

### Removing packages

```bash
dpkg -r PACKAGENAME
```

`dpkg` will not remove a package if another installed package depends on it. To remove both at once, list them with a space:

```bash
dpkg -r unzip file-roller
```

When removing with `-r`, configuration files stay on the system. To remove the package along with all its config files, use the `-P` (purge) flag:

```bash
dpkg -P PACKAGENAME
```

### Viewing package information

```bash
dpkg -I PACKAGENAME.deb
```

The `-I` flag (uppercase i) shows details of a `.deb` file: version, dependencies, description. This works on a file that is not yet installed.

### Listing installed packages and their files

Show all installed packages:

```bash
dpkg --get-selections
```

Show the files installed by a specific package:

```bash
dpkg -L PACKAGENAME
```

Example output:

```
# dpkg -L unrar
/.
/usr
/usr/bin
/usr/bin/unrar-nonfree
/usr/share/doc/unrar/changelog.Debian.gz
```

### Finding the owner of a file

To find which package owns a specific file on the system:

```bash
dpkg-query -S /usr/bin/unrar-nonfree
# unrar: /usr/bin/unrar-nonfree
```

`dpkg-query -S` only works with files that are already installed. To search across uninstalled packages use `apt-file search`.

### Reconfiguring a package

When a package is installed, it runs a post-install script that sets up configuration files and asks the user questions. If the configuration is broken or you need to change the original answers, run:

```bash
dpkg-reconfigure PACKAGENAME
```

The utility backs up old configs, unpacks fresh ones and re-runs the post-install script as if the package were being installed for the first time. Example:

```bash
dpkg-reconfigure tzdata
```

---

## Advanced Package Tool (apt)

APT simplifies package installation, upgrade and removal by adding automatic dependency resolution and remote repository support. It is a layer on top of `dpkg`, not a replacement.

Main APT utilities:

- `apt-get` — install, upgrade and remove packages.
- `apt-cache` — search and retrieve information from the package index.
- `apt-file` — search for files inside packages.
- `apt` — combines the most commonly used `apt-get` and `apt-cache` commands. For the exam you need to know `apt-get` and `apt-cache`, since `apt` may not be available on every system.

APT requires a network connection to download packages and update indexes.

### Updating the package index

Before installing or upgrading packages, update the local index:

```bash
apt-get update
# or
apt update
```

This downloads fresh package lists from the repositories described in `/etc/apt/sources.list` and files in `/etc/apt/sources.list.d/`.

### Installing, upgrading and removing via apt-get

Install a package (with automatic dependency resolution):

```bash
apt-get install PACKAGENAME
```

Upgrade all installed packages to the latest versions from the repositories:

```bash
apt-get upgrade
# or
apt upgrade
```

Upgrade a specific package:

```bash
apt-get upgrade PACKAGENAME
```

Remove a package:

```bash
apt-get remove PACKAGENAME
# or
apt remove PACKAGENAME
```

Removing with `remove` leaves configuration files on the system. To remove a package along with its configs, use `purge`:

```bash
apt-get purge PACKAGENAME
# or
apt-get remove --purge PACKAGENAME
```

Fix a broken installation caused by unmet dependencies:

```bash
apt-get install -f
```

### Local package cache

When a package is downloaded, the `.deb` file is saved to the local cache: `/var/cache/apt/archives/`. Partially downloaded files go to `/var/cache/apt/archives/partial/`. The cache can grow large over time; clean it with:

```bash
apt-get clean
# or
apt clean
```

### Searching packages with apt-cache

Search for a package by name, description or files:

```bash
apt-cache search PATTERN
# or
apt search PATTERN
```

Get detailed information about a package (version, dependencies, description), similar to `dpkg -I`:

```bash
apt-cache show PACKAGENAME
# or
apt show PACKAGENAME
```

### The sources.list file

APT takes the list of package sources from `/etc/apt/sources.list`. It can be edited with any text editor.

A typical entry:

```
deb http://us.archive.ubuntu.com/ubuntu/ disco main restricted universe multiverse
```

Entry syntax: `archive_type URL distribution components`.

**Archive type:**
- `deb` — binary packages (ready to run).
- `deb-src` — source packages.

**Ubuntu components:**
- `main` — officially supported open-source packages.
- `restricted` — officially supported proprietary software (e.g. drivers).
- `universe` — community-maintained packages.
- `multiverse` — non-free or patent-encumbered software.

**Debian components:**
- `main` — packages compliant with the DFSG, considered part of the distribution.
- `contrib` — DFSG-compliant packages that depend on non-free components.
- `non-free` — packages that do not comply with the DFSG.
- `security` — security updates.
- `backports` — newer versions of `main` packages for the stable release.

Lines beginning with `#` are comments and are ignored. After adding a new entry run `apt-get update`.

### The sources.list.d directory

Instead of editing the main file you can add individual `.list` files to `/etc/apt/sources.list.d/`. The syntax inside is the same. Example file `buster-backports.list`:

```
deb http://deb.debian.org/debian buster-backports main contrib non-free
deb-src http://deb.debian.org/debian buster-backports main contrib non-free
```

### apt-file: package contents and file search

`apt-file` may not be installed by default. Install and initialise it:

```bash
apt-get install apt-file
apt-file update
```

Show all files contained in a package (including uninstalled ones):

```bash
apt-file list PACKAGENAME
```

Find which package contains a file (including in uninstalled packages):

```bash
apt-file search FILENAME
```

Example:

```bash
apt-file search libSDL2.so
# libsdl2-dev: /usr/lib/x86_64-linux-gnu/libSDL2.so
```

The difference between `apt-file search` and `dpkg-query -S`: the former searches all packages including uninstalled ones; the latter only sees files from already installed packages.

---

## Exam command reference

| Command | What it does |
|---|---|
| `dpkg -i pkg.deb` | Install a package from a file |
| `dpkg -r pkg` | Remove a package (configs remain) |
| `dpkg -P pkg` | Remove a package along with configs (purge) |
| `dpkg -I pkg.deb` | Show information about a .deb file |
| `dpkg --get-selections` | List all installed packages |
| `dpkg -L pkg` | Files installed by a package |
| `dpkg-query -S /path/to/file` | Find the owner of a file (installed only) |
| `dpkg-reconfigure pkg` | Re-run package configuration |
| `apt-get update` | Update the package index |
| `apt-get install pkg` | Install a package from the repository |
| `apt-get upgrade` | Upgrade all packages |
| `apt-get remove pkg` | Remove a package (configs remain) |
| `apt-get purge pkg` | Remove a package along with configs |
| `apt-get install -f` | Fix unmet dependencies |
| `apt-get clean` | Clear the local package cache |
| `apt-cache search pattern` | Search for a package by pattern |
| `apt-cache show pkg` | Detailed package information |
| `apt-file update` | Update the apt-file cache |
| `apt-file list pkg` | Files inside a package (including uninstalled) |
| `apt-file search file` | Find a package by filename (including uninstalled) |

---

## Typical exam questions

**What is the difference between `-r` and `-P` in dpkg?**
`-r` removes the package but leaves configuration files. `-P` (purge) removes the package along with all its configs. The same distinction applies to `apt-get remove` and `apt-get purge`.

**What is the difference between `dpkg-query -S` and `apt-file search`?**
`dpkg-query -S` only works with installed packages. `apt-file search` searches across all packages, including those not yet installed.

**Can you remove a package that another package depends on?**
No. `dpkg -r` will refuse. You must remove the dependent package first, or remove both at once with `dpkg -r pkg1 pkg2`. The `--force` flag bypasses the check but is dangerous.

**What does `apt-get install -f` do?**
It fixes an interrupted or incomplete installation by installing missing dependencies. The `-f` flag stands for `--fix-broken`.

**What is the difference between `deb` and `deb-src` in sources.list?**
`deb` points to a repository with binary packages; `deb-src` points to one with source code.

**Why use `dpkg-reconfigure`?**
To re-run the post-install configuration of a package, for example after the config is broken or to change the original setup answers.

**Where does APT store downloaded .deb files?**
In `/var/cache/apt/archives/`. The cache can be cleared with `apt-get clean`.

---

## Exercises

### Guided Exercises

**1. Which command installs a package named `package.deb` with dpkg?**

<details>
<summary>Answer</summary>

```bash
dpkg -i package.deb
```

</details>

---

**2. Find which package owns the file `7zr.1.gz` using dpkg-query.**

<details>
<summary>Answer</summary>

```bash
dpkg-query -S 7zr.1.gz
```

</details>

---

**3. Can you remove the `unzip` package with `dpkg -r unzip` if `file-roller` depends on it? If not, how do you do it correctly?**

<details>
<summary>Answer</summary>

No. `dpkg` will not allow removing a package if another installed package depends on it. Solution: remove `file-roller` first (if nothing depends on it), then `unzip`, or remove both at once:

```bash
dpkg -r unzip file-roller
```

</details>

---

**4. How do you use `apt-file` to find which package contains the file `/usr/bin/unrar`?**

<details>
<summary>Answer</summary>

```bash
apt-file search /usr/bin/unrar
```

</details>

---

**5. Which `apt-cache` command shows information about the `gimp` package?**

<details>
<summary>Answer</summary>

```bash
apt-cache show gimp
```

</details>

---

### Explorational Exercises

**1. Write a sources.list entry for a Debian source-package repository.**

There is a source-code repository for the `xenial` distribution at `http://us.archive.ubuntu.com/ubuntu/`, component `universe`. Which line should be added to `/etc/apt/sources.list`?

<details>
<summary>Answer</summary>

```
deb-src http://us.archive.ubuntu.com/ubuntu/ xenial universe
```

Source packages use the `deb-src` type. This line can also be added in a separate file under `/etc/apt/sources.list.d/`, for example `xenial_sources.list`.

</details>

---

**2. Find the package that provides the header file `zzip-io.h`.**

A compilation error says the header file `zzip-io.h` is missing from the system. How do you find which package provides it?

<details>
<summary>Answer</summary>

The file is not installed, so `dpkg-query -S` will not help. Use `apt-file search`, which searches across all packages including uninstalled ones:

```bash
apt-file search zzip-io.h
```

</details>

---

**3. Force-remove a package with dependants using dpkg.**

How do you use `dpkg` to ignore the dependency warning and remove a package even if other packages depend on it?

<details>
<summary>Answer</summary>

Use the `--force` parameter, but this is an extremely dangerous operation. The system may end up in a broken or unstable state. Only use this when you fully understand the consequences.

</details>

---

**4. Get detailed information about the `midori` package.**

<details>
<summary>Answer</summary>

```bash
apt-cache show midori
```

> `apt show midori` does the same thing and is a shorter alias.

</details>

---

**5. Which command should be run before installing or upgrading packages to ensure the index is up to date?**

<details>
<summary>Answer</summary>

```bash
apt-get update
```

This downloads fresh indexes from the repositories listed in `/etc/apt/sources.list` and files in `/etc/apt/sources.list.d/`.

</details>

---

## Related topics

- [102.3 Manage Shared Libraries](/posts/lpic1-102-3-shared-libraries/) — shared libraries that packages depend on
- 102.5 Use RPM and YUM Package Management — equivalent package management on RPM-based systems

---

*LPIC-1 Study Notes | Topic 101: System Architecture*
