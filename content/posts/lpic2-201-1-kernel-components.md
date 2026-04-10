---
title: "LPIC-2 201.1 — Kernel Components"
date: 2026-04-10
description: "Linux kernel architecture, image types, version numbering, kernel modules, and directory layout. LPIC-2 exam topic 201.1."
tags: ["Linux", "Kernel", "LPIC-2", "Modules"]
categories: ["LPIC-2"]
---

## Linux Kernel Architecture

The Linux kernel was originally built as a **monolithic kernel**. A monolithic kernel bundles drivers for all supported hardware into a single binary — even hardware not present on the system. As the supported hardware list grew, so did the kernel size, with most of the code never actually used. The solution was dynamically loadable drivers, known as **kernel modules**.

Linux is not a **microkernel**. In a microkernel architecture, only the minimum possible code runs in privileged mode — that was never the design goal of Linux. The correct term is **hybrid kernel**: it can load and unload modules like a microkernel, but almost all code runs in supervisor mode, like a monolithic kernel.

A monolithic build (without module support) is still possible, but rare in practice: any driver update requires a full kernel recompile. The only upside is a smaller final image, since you compile only what you need and dependencies are immediately obvious.

> **Exam tip:** You may be asked whether Linux is a microkernel. The answer is no — Linux is a hybrid kernel.

---

## Kernel Image Types

The kernel is stored on disk in compressed form. There are two main formats:

| Image | Max size | Loaded into | Compression |
|---|---|---|---|
| `zImage` | 512 KB | Low memory only | gzip |
| `bzImage` | Unlimited | Low and high memory | gzip |

> **Warning:** A common exam trap — `bz` in `bzImage` stands for "big zImage", **not** bzip2. Both formats use **gzip** compression.

Other names you will encounter:

| Filename | Description |
|---|---|
| `vmlinux` | Uncompressed binary, not used in production |
| `vmlinuz` | Generic name for the compressed kernel used by many distros |
| `bzImage` | The most common format |

Most distributions copy `bzImage` under the name `vmlinuz-<version>`, e.g. `vmlinuz-4.3.3`. This allows multiple kernels to coexist on the same system.

Built binaries live in `/boot`. The bootloader (GRUB) reads the kernel from there.

> **Tip:** `bzImage` is the preferred option for any modern kernel: no size limit, supports loading into high memory.

---

## Version Numbering Schemes

The Linux versioning scheme has changed several times over the years.

### Before 2.6.0 (three numbers)

Format: `major.minor.patchlevel`

- **Even** minor (2.2, 2.4) — stable release.
- **Odd** minor (2.1, 2.3, 2.5) — development branch for developers and experimenters.
- Patch level increments for bug fixes.

### 2.6.x series (four numbers)

After 2.6.0 was released in 2004, the project switched to time-based releases. The kernel stayed on the 2.6 branch for seven years; the third number incremented with each release (every 2–3 months), and the fourth was added for bugfix and security patches. Example: `2.6.32.71`. The even/odd system was retired.

### 3.x series

In May 2011, Linus Torvalds announced kernel 3.0.0 to mark Linux's 20th anniversary. The format returned to three numbers: `A.B.C`, where:

- `A` — kernel version
- `B` — release number
- `C` — patch

Test releases use the `-rc` suffix, e.g. `3.2-rc4` (fourth release candidate of the 3.2 branch). Stable example: `3.2.84`.

A fourth number `.z` in the `3.x.y.z` format was occasionally used for emergency security patches.

### 4.x and later

The 4.x branch started in April 2015. The numbering scheme did not change: `4.x.y`, with `-rc` for test builds. The 4.x branch introduced **Live Patching** — applying kernel patches without a reboot by unloading and loading the relevant modules.

> **Note:** On kernel.org, kernels fall into three categories: **mainline** (active development), **stable** (current stable), **longterm** (older maintained branches).

```
Examples:
4.15.3      -> stable release
4.15-rc2    -> second release candidate, not for production
```

---

## XZ Compression of Source Archives

Kernel source code from kernel.org is packed with `tar` and compressed with **XZ**. XZ is the successor to the LZMA and LZMA2 algorithms and achieves better compression ratios than gzip.

Modern kernels support XZ out of the box. On older distributions you may need to install `xz-utils`.

```bash
# Extract the source archive (GNU tar >= 1.22)
tar xvf linux-4.10-rc3.tar.xz

# Equivalent using the -J flag
tar xvJf linux-4.10-rc3.tar.xz
```

File naming format: `linux-A.B.C.tar.xz`, e.g. `linux-3.18.43.tar.xz`.

After extraction, the source tree takes at least 1 GB of disk space — plan accordingly.

> **Note:** XZ is used for **kernel sources** on kernel.org. The kernel images themselves (`zImage`, `bzImage`) are compressed with gzip — these are separate things.

---

## Kernel Modules

Kernel modules are object files with the `.ko` extension, compiled with the C compiler but not linked into a full executable. Modules are loaded into the kernel on demand and can be unloaded the same way.

Most modules ship with the kernel and are compiled during the build process. Each kernel version has its own set of modules.

```bash
# Check the running kernel version
uname -r
# Example output: 4.15.0-20-generic
```

### Module Location

```
/lib/modules/<kernel-version>/
```

Where `<kernel-version>` is the string from `uname -r`, e.g. `2.6.5-15smp`. If multiple kernels are installed, there will be multiple subdirectories under `/lib/modules/`.

### Module Types (subdirectories)

| Subdirectory | Contents |
|---|---|
| `block` | Block device drivers (RAID controllers, IDE tape drives) |
| `cdrom` | Non-standard CD-ROM drives |
| `fs` | Filesystems (e.g. `msdos.ko`) |
| `ipv4` | IP masquerading and other IP processing |
| `net` | Network interface drivers |
| `scsi` | SCSI controller drivers |
| `video` | Specialised video adapter drivers |
| `misc` | Anything that doesn't fit another category |

> **Tip:** `modprobe` uses these subdirectories as tags when searching for and loading a module.

---

## Directory Layout

```
/usr/src/linux/                    # symlink or directory with current kernel sources
/usr/src/linux/Documentation/      # kernel documentation
/boot/                             # kernel binaries (vmlinuz-*, bzImage)
/lib/modules/<version>/            # modules for a specific kernel version
/proc/sys/kernel/osrelease         # running kernel version at runtime
```

> **Note:** `/usr/src/linux` is often a symbolic link to the actual source directory. If you extract the kernel to a different location, create the symlink manually: `ln -s /path/to/sources /usr/src/linux`.

---

## Kernel Documentation

Documentation ships with the source code and lives in `/usr/src/linux/Documentation/`. It covers kernel parameters, `/proc` and `/sys` interfaces, and the specifics of individual subsystems.

The exam tests knowledge of documentation for versions 2.6.x, 3.x, and 4.x. The structure of the Documentation directory and the underlying principles are the same across all three branches.

---

## Exam Cheat Sheet

### Key Paths

| Path | Purpose |
|---|---|
| `/usr/src/linux` | Kernel sources (symlink or directory) |
| `/usr/src/linux/Documentation` | Kernel documentation |
| `/boot/vmlinuz-<version>` | Kernel binary |
| `/lib/modules/<version>/` | Modules for this kernel version |
| `/proc/sys/kernel/osrelease` | Running kernel version |

### Image Formats

| Format | Size limit | Compression | Note |
|---|---|---|---|
| `zImage` | 512 KB | gzip | Loads into low memory only |
| `bzImage` | None | gzip | "big zImage", NOT bzip2 |
| `vmlinux` | None | None | Uncompressed, not used in production |
| `vmlinuz` | None | gzip | Usually a renamed `bzImage` |

### Version Numbering

| Period | Example | Stability |
|---|---|---|
| Before 2.6.0 | `2.4.31` | Even minor = stable |
| 2.6.x | `2.6.32.71` | All releases stable |
| 3.x / 4.x | `3.2.84` / `4.15.3` | Stable |
| 3.x / 4.x RC | `3.2-rc4` / `4.15-rc2` | Development |

### Commands

```bash
# Running kernel version
uname -r

# Extract sources
tar xvf linux-4.10.tar.xz

# Path to modules
ls /lib/modules/$(uname -r)/
```

### Common Mistakes

- `bzImage` uses gzip, not bzip2. Don't confuse the name with the algorithm.
- `zImage` is unsuitable for modern kernels: the 512 KB limit has long been exceeded.
- `/usr/src/linux` may be a symlink, but tools look for sources there.
- The `-rc` suffix means release candidate (unstable); without `-rc` it is a stable release.

---

## Practice Questions

**1. How does `bzImage` differ from `zImage`?**

`bzImage` has no size limit and can load into both low and high memory, whereas `zImage` is limited to 512 KB and loads into low memory only. Both formats use gzip compression.

---

**2. What does `-rc` mean in kernel version `4.15-rc2`?**

It is the second release candidate of the 4.15 branch. Such a release is considered unstable, intended for testing, and should not be used in production.

---

**3. Where are modules stored for kernel version `4.15.0-20-generic`?**

In `/lib/modules/4.15.0-20-generic/`.

---

**4. What compression algorithm is used for kernel sources on kernel.org?**

XZ (`.tar.xz` format). Extraction requires GNU tar version 1.22 or later, or the `xz-utils` package.

---

**5. Is the Linux kernel a microkernel, monolithic, or hybrid kernel?**

Hybrid kernel. It can load and unload modules like a microkernel, but almost all code runs in supervisor mode, like a monolithic kernel.

---

**6. What happens if you build the kernel as monolithic (without module support)?**

Any driver update requires a full recompile of the entire kernel. The upside is that the resulting image may be smaller and dependencies are more explicit.

---

**7. Where is kernel documentation located in the filesystem?**

In `/usr/src/linux/Documentation/` (provided the sources are installed).

---

**8. What was the even/odd minor version scheme and which kernels used it?**

It was used before version 2.6.0. An even minor number (2.2, 2.4) indicated a stable release; an odd minor (2.1, 2.3, 2.5) was a development branch. The scheme was retired with the release of 2.6.0 in 2004.
