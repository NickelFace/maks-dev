---
title: "LPIC-1 102.5 — Use RPM and YUM Package Management"
date: 2026-04-16
description: "rpm, yum, dnf, zypper — install, query, verify packages, manage repositories, rpm2cpio. LPIC-1 exam topic 102.5."
tags: ["Linux", "LPIC-1", "RPM", "YUM", "dnf", "zypper"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-102-5-rpm-yum-package-management/"
page_lang: "en"
---

> **Exam weight: 3** — LPIC-1 v5, Exam 101

## What you need to know

- Install, reinstall, upgrade and remove packages using `rpm`, `yum` and `zypper`.
- Obtain information about RPM packages: version, status, dependencies, integrity, signatures.
- Determine which files a package provides, and find which package owns a specific file.
- Know that `dnf` exists.

---

## RPM: installing and managing packages

RPM (Red Hat Package Manager) works directly with `.rpm` files. It does not resolve dependencies automatically, so installing packages via RPM is only convenient when dependencies are already satisfied. Package filename format:

```
bash-5.1.8-6.el9.x86_64.rpm
 ^    ^     ^   ^    ^
 |    |     |   |    architecture
 |    |     |   distribution
 |    |     release
 |    version
 package name
```

### Installing and removing

```bash
# Install a new package
rpm -ivh package.rpm
# -i  install
# -v  verbose output
# -h  show hash progress ########

# Upgrade a package (installs if not present)
rpm -Uvh package.rpm

# Freshen: upgrade only if already installed
rpm -Fvh package.rpm

# Remove a package (package name, not file)
rpm -e package_name

# Reinstall
rpm -ivh --replacepkgs package.rpm

# Ignore dependencies (dangerous)
rpm -ivh --nodeps package.rpm

# Force installation
rpm -ivh --force package.rpm
```

The difference between `-U` and `-F` is important for the exam. `-U` installs the package even if it was not there before; `-F` skips installation if the package is not already on the system.

### Querying the RPM database

All queries use the `-q` (query) flag. You can query both installed packages and `.rpm` files on disk.

```bash
# Check whether a package is installed
rpm -q bash
# Output: bash-5.1.8-6.el9.x86_64

# List all installed packages
rpm -qa
rpm -qa | grep ssh

# Detailed package information
rpm -qi bash

# List files in a package
rpm -ql bash

# Find which package owns a file
rpm -qf /bin/bash
# Output: bash-5.1.8-6.el9.x86_64

# List config files of a package
rpm -qc bash

# List documentation files
rpm -qd bash

# List dependencies (what the package requires)
rpm -qR bash

# What the package provides (capabilities)
rpm -q --provides bash

# Pre/post-install scripts
rpm -q --scripts bash

# Package changelog
rpm -q --changelog bash | head -20

# Query an .rpm file (not installed) — add -p
rpm -qip package.rpm    # package file info
rpm -qlp package.rpm    # list files in package
rpm -qRp package.rpm    # package dependencies
```

Remember the suffixes: `i` = info, `l` = list files, `f` = file (who owns it), `c` = config, `d` = docs, `R` = requires, `p` = package file on disk.

### Verifying integrity and signatures

RPM can verify a package in two ways: via MD5/SHA (file integrity) and via a GPG signature (publisher authenticity).

```bash
# Verify an installed package (file integrity)
rpm -V bash
# No output means everything is fine
# If a file has changed: S M 5 D L U G T c /etc/bashrc
# S=size, M=permissions, 5=MD5, D=device, L=symlink, U=owner, G=group, T=mtime, c=config

# Verify all installed packages
rpm -Va

# Check the signature of an .rpm file
rpm --checksig package.rpm
rpm -K package.rpm

# Import the publisher's GPG key (needed to verify signatures)
rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release
```

The output codes of `rpm -V` appear in exam questions. A letter in the output indicates an attribute that differs from what is expected.

---

## rpm2cpio: extracting without installing

`rpm2cpio` converts an `.rpm` file into a `cpio` archive. This is useful when you need to extract a single file from a package without installing the whole thing.

```bash
# Extract package contents into the current directory
rpm2cpio package.rpm | cpio -idmv
# -i  extract
# -d  create directories automatically
# -m  preserve modification times
# -v  verbose

# List files in a package without extracting
rpm2cpio package.rpm | cpio -tv

# Extract a single specific file
rpm2cpio package.rpm | cpio -idmv ./usr/bin/bash
```

A typical scenario: you accidentally deleted a system file and need to restore it without reinstalling the entire package.

---

## YUM: high-level package manager

YUM (Yellowdog Updater, Modified) works on top of RPM and resolves dependencies automatically. It downloads packages from repositories and installs everything required.

### Managing packages with yum

```bash
# Install a package
yum install package_name
yum install -y package_name    # without confirmation

# Remove a package
yum remove package_name
yum erase package_name         # same thing

# Upgrade a specific package
yum update package_name

# Upgrade all packages
yum update

# Check for an update without installing
yum check-update package_name

# Check for updates for all packages
yum check-update

# Reinstall a package
yum reinstall package_name

# Downgrade to a previous version
yum downgrade package_name

# Install a specific version
yum install package_name-version
```

### Searching and getting information

```bash
# Search by name or description
yum search keyword

# Detailed package information
yum info package_name

# List all available packages
yum list

# List installed packages
yum list installed

# List available (not installed) packages
yum list available

# Find which package provides a file or utility
yum provides /bin/bash
yum whatprovides /bin/bash    # same thing

# List package dependencies
yum deplist package_name

# Operation history
yum history
yum history info 5            # details of transaction #5
yum history undo 5            # undo transaction #5

# Clean the cache
yum clean all
yum clean packages
yum clean metadata

# Install from a local .rpm file (with dependency resolution)
yum localinstall package.rpm
```

`yum provides` is especially useful: you tell it "I need the file `/usr/bin/nmap`" and yum tells you which package to get it from.

### Configuring YUM: yum.conf and repositories

The main configuration file is `/etc/yum.conf`. It holds global settings for all repositories.

```ini
# /etc/yum.conf (example)
[main]
cachedir=/var/cache/yum/$basearch/$releasever
keepcache=0
debuglevel=2
logfile=/var/log/yum.log
exactarch=1
obsoletes=1
gpgcheck=1
plugins=1
installonly_limit=3
```

Repositories are stored in `/etc/yum.repos.d/` in files with a `.repo` extension. Each file can contain one or more repositories. You can add repositories manually by creating a `.repo` file, but the recommended way is the `yum-config-manager` utility.

```ini
# /etc/yum.repos.d/myrepo.repo (example)
[myrepo]
name=My Custom Repository
baseurl=http://repo.example.com/centos/7/os/x86_64/
enabled=1
gpgcheck=1
gpgkey=http://repo.example.com/RPM-GPG-KEY-myrepo
```

Repository fields:

- `[section]` — unique repository identifier
- `name` — human-readable name
- `baseurl` — repository address (http, ftp, file://)
- `mirrorlist` — alternative to baseurl, a link to a list of mirrors
- `enabled` — 1 enabled, 0 disabled
- `gpgcheck` — 1 verify GPG signature, 0 skip
- `gpgkey` — path or URL to the GPG key

```bash
# Add a repository via yum-config-manager
yum-config-manager --add-repo https://rpms.remirepo.net/enterprise/remi.repo

# Enable a repository
yum-config-manager --enable updates

# Disable a repository
yum-config-manager --disable updates

# List all repositories
yum repolist
yum repolist all        # including disabled ones

# Temporarily enable a disabled repository for one command
yum --enablerepo=epel install htop
```

The repository ID in `yum repolist all` output is taken from the first column, up to the first `/`. For the string `updates/7/x86_64` the ID is `updates`.

---

## DNF: the successor to YUM

DNF (Dandified YUM) replaced YUM in Fedora 22 and became the default package manager in RHEL 8 and CentOS 8. Command syntax is nearly identical to YUM.

```bash
# Basic operations
dnf install package_name
dnf remove package_name
dnf upgrade                      # upgrade all packages
dnf upgrade package_name         # upgrade one package

# Search and information
dnf search keyword
dnf info package_name
dnf provides /bin/bash

# List installed packages
dnf list --installed

# List files in a package
dnf repoquery -l package_name

# Repository management
dnf repolist
dnf repolist --enabled
dnf repolist --disabled
dnf config-manager --add_repo https://example.url/repo.repo
dnf config-manager --set-enabled REPO_ID
dnf config-manager --set-disabled REPO_ID
```

DNF repositories use the same `.repo` files in `/etc/yum.repos.d/` — the format is identical to YUM. DNF fixes several YUM issues: better dependency resolution, modular package support, more accurate upgrade logic. Built-in help: `dnf help install`.

---

## Zypper: the openSUSE package manager

Zypper works on openSUSE and SUSE Linux Enterprise and also uses RPM packages under the hood. The syntax differs slightly from YUM.

```bash
# Update package lists from repositories
zypper refresh
zypper ref                 # short form

# Install a package
zypper install package_name
zypper in package_name     # short form

# Install a local .rpm file with dependency resolution from repositories
zypper in /home/user/package.rpm

# Remove a package (also removes packages that depend on it)
zypper remove package_name
zypper rm package_name

# Upgrade all packages
zypper update

# Show available updates without installing
zypper list-updates

# Search for a package by name
zypper search keyword
zypper se keyword

# List installed packages
zypper se -i

# Check whether a specific package is installed
zypper se -i unzip

# Search only among uninstalled packages
zypper se -u keyword

# Package information
zypper info package_name

# Find which package provides a file
zypper se --provides /usr/bin/bash
zypper se --provides /usr/lib64/libgimpmodule-2.0.so.0

# List repositories
zypper repos

# Add a repository
zypper addrepo http://packman.inode.at/suse/openSUSE_Leap_15.1/ packman
zypper ar URL alias

# Remove a repository
zypper removerepo packman

# Enable or disable a repository
zypper modifyrepo -e repo-non-oss    # enable
zypper modifyrepo -d repo-non-oss    # disable

# Enable/disable auto-refresh for a repository
zypper modifyrepo -f repo-non-oss    # enable auto-refresh
zypper modifyrepo -F repo-non-oss    # disable auto-refresh
```

Zypper supports per-repository auto-refresh: when the `-f` flag is enabled, zypper will run `refresh` automatically before working with that repository.

---

## Exam command reference

| Task | RPM | YUM | Zypper |
|---|---|---|---|
| Install a package | `rpm -ivh pkg.rpm` | `yum install pkg` | `zypper in pkg` |
| Upgrade a package | `rpm -Uvh pkg.rpm` | `yum update pkg` | `zypper up pkg` |
| Remove a package | `rpm -e pkg` | `yum remove pkg` | `zypper rm pkg` |
| Reinstall | `rpm -ivh --replacepkgs` | `yum reinstall pkg` | `zypper in -f pkg` |
| Package information | `rpm -qi pkg` | `yum info pkg` | `zypper info pkg` |
| List package files | `rpm -ql pkg` | `dnf repoquery -l pkg` | `rpm -ql pkg` |
| Who owns this file | `rpm -qf /path/file` | `yum whatprovides /path` | `zypper se --provides /path` |
| Dependencies | `rpm -qR pkg` | `yum deplist pkg` | `zypper info pkg` |
| Verify integrity | `rpm -V pkg` | | |
| List installed | `rpm -qa` | `yum list installed` | `zypper se -i` |
| Add a repository | | `yum-config-manager --add-repo URL` | `zypper addrepo URL alias` |
| Enable/disable repo | | `yum-config-manager --enable/--disable ID` | `zypper modifyrepo -e/-d alias` |
| Extract package | `rpm2cpio pkg.rpm \| cpio -idmv` | | |

**Key rpm flags:**
```
-i   install          -q   query
-U   upgrade          -a   all
-F   freshen          -l   list files
-e   erase            -i   info
-v   verbose          -f   find package for file
-h   hash marks       -c   config files
-V   verify           -d   documentation
-K   check signature  -R   requires (dependencies)
-p   query package file (not installed)
```

---

## Typical exam questions

**Which command shows which package owns the file `/usr/bin/ssh`?**
`rpm -qf /usr/bin/ssh`

**How do you install a package via RPM with a progress display?**
`rpm -ivh package.rpm`

**What is the difference between `rpm -U` and `rpm -F`?**
`-U` installs the package even if it is not on the system; `-F` only upgrades an already installed package.

**Which file contains the global YUM configuration?**
`/etc/yum.conf`

**Where are YUM repository configurations stored?**
In `/etc/yum.repos.d/`, files with the `.repo` extension.

**How do you extract files from an `.rpm` package without installing it?**
`rpm2cpio package.rpm | cpio -idmv`

**Which YUM command finds the package that provides `/bin/traceroute`?**
`yum provides /bin/traceroute`

**How do you verify the integrity of an installed package?**
`rpm -V package_name`

**What does the letter `S` mean in the output of `rpm -V`?**
The file size differs from what is expected.

**Which zypper command updates the package list from repositories?**
`zypper refresh` or `zypper ref`

---

## Exercises

### Guided Exercises

**1. Install `file-roller-3.28.1-2.el7.x86_64.rpm` with rpm, showing a progress bar.**

<details>
<summary>Answer</summary>

```bash
rpm -ih file-roller-3.28.1-2.el7.x86_64.rpm
```

The `-h` flag enables progress display as `#` characters. `-v` can be added for verbose text output, but `-ih` alone is enough for the progress bar.

</details>

---

**2. Using rpm, find which package contains the file `/etc/redhat-release`.**

<details>
<summary>Answer</summary>

```bash
rpm -qf /etc/redhat-release
```

The `-qf` flag stands for "query file" — it queries which package a file belongs to.

</details>

---

**3. How do you check for available updates for all packages using yum?**

<details>
<summary>Answer</summary>

```bash
yum check-update
```

The command shows a list of packages that have updates available but installs nothing. Pass a package name as an argument to check just one package.

</details>

---

**4. Disable the `repo-extras` repository using zypper.**

<details>
<summary>Answer</summary>

```bash
zypper modifyrepo -d repo-extras
```

`modifyrepo` changes parameters of an existing repository. `-d` disables it; `-e` re-enables it.

</details>

---

**5. You have a ready-made `.repo` file describing a new repository. Where should you put it so that DNF picks it up?**

<details>
<summary>Answer</summary>

In the `/etc/yum.repos.d/` directory.

DNF and YUM share the same directory for repositories. The `.repo` file format is identical for both.

</details>

---

### Explorational Exercises

**1. How do you use zypper to find which package contains the file `/usr/sbin/swapon`?**

<details>
<summary>Answer</summary>

```bash
zypper se --provides /usr/sbin/swapon
```

The `se` (search) operator with the `--provides` flag finds packages that provide the specified file or capability.

</details>

---

**2. How do you get a list of all installed packages using dnf?**

<details>
<summary>Answer</summary>

```bash
dnf list --installed
```

</details>

---

**3. Add a repository located at `https://www.example.url/home:reponame.repo` using dnf.**

<details>
<summary>Answer</summary>

```bash
dnf config-manager --add_repo https://www.example.url/home:reponame.repo
```

Note the underscore in `--add_repo` — not a hyphen. Added repositories are enabled by default.

</details>

---

**4. How do you check whether the `unzip` package is installed using zypper?**

<details>
<summary>Answer</summary>

```bash
zypper se -i unzip
```

The `-i` flag limits the search to installed packages only. If `unzip` is installed it will appear in the results with the status `i` in the first column.

</details>

---

**5. Using yum, find which package provides the file `/bin/wget`.**

<details>
<summary>Answer</summary>

```bash
yum whatprovides /bin/wget
```

`yum whatprovides` works with full file paths as well as library names or capabilities (e.g. `libgimpui-2.0.so.0`).

</details>

---

## Related topics

- [102.4 Use Debian Package Management](/posts/lpic1-102-4-debian-package-management/) — dpkg and apt
- 103.1 Work on the Command Line — shell basics

---

*LPIC-1 Study Notes | Topic 101: System Architecture*
