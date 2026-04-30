---
title: "LPIC-1 102.3 — Manage Shared Libraries"
date: 2026-04-16
description: "Shared libraries, naming conventions, ldconfig, /etc/ld.so.conf, LD_LIBRARY_PATH, ldd. LPIC-1 exam topic 102.3."
tags: ["Linux", "LPIC-1", "Libraries", "ldconfig"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-102-3-shared-libraries/"
page_lang: "en"
---

> **Exam weight: 1** — LPIC-1 v5, Exam 101

## What you need to know

- Identify the shared libraries a program depends on.
- Know the typical locations of system libraries.
- Load shared libraries.

---

## What are shared libraries

When a program is compiled it can use code in two ways: statically or dynamically. With static linking all required code is bundled directly into the executable. With dynamic linking the program stores only references, and the actual code is loaded from external files at runtime. Those external files are shared libraries.

The dynamic linker/loader is responsible for finding and loading the required libraries into memory when a program starts. On Linux its name typically looks like `/lib/ld-linux.so.2` (32-bit systems) or `/lib64/ld-linux-x86-64.so.2` (64-bit systems).

Shared libraries are beneficial for two reasons: multiple programs share the same code in memory, saving resources, and updating a library immediately affects all programs that use it.

---

## Naming convention

Shared libraries follow a strict naming convention.

**Real name (realname):** contains the full version number.
```
libname.so.X.Y.Z
```
Example: `libz.so.1.2.11`

**soname:** contains only the major version. This is a symbolic link pointing to the real file.
```
libname.so.X
```
Example: `libz.so.1 -> libz.so.1.2.11`

**Linker name:** the name without a version, used at compile time.
```
libname.so
```
Example: `libz.so -> libz.so.1`

This chain of symbolic links allows updating a library without rebuilding programs — it is enough to change what the soname points to.

---

## Where libraries are stored

Standard library locations in Linux:

| Path | Purpose |
|------|---------|
| `/lib` | Libraries needed at boot (before `/usr` is mounted) |
| `/lib32` | 32-bit libraries on 64-bit systems |
| `/lib64` | 64-bit libraries |
| `/usr/lib` | Main libraries for user-space programs |
| `/usr/local/lib` | Libraries for manually built programs |

---

## How a program finds libraries

When a program starts, the dynamic linker searches for libraries in the following order:

1. Paths hard-coded in the binary itself (rpath, written at compile time).
2. Paths from the `LD_LIBRARY_PATH` environment variable.
3. Paths from the cache `/etc/ld.so.cache` (built from `/etc/ld.so.conf`).
4. Default paths: `/lib`, `/lib64`, `/usr/lib`, `/usr/lib64`.

### ldconfig and the library cache

`ldconfig` reads the configuration and builds the cache `/etc/ld.so.cache` so the linker can find libraries quickly. Run `ldconfig` every time a new library is installed or the configuration changes.

```bash
# Update the cache
sudo ldconfig

# Show the cache contents
ldconfig -p

# Rescan directories and update the cache with verbose output
sudo ldconfig -v
```

The output of `ldconfig -p` lists all cached libraries with their paths:
```
libz.so.1 (libc6,x86-64) => /lib/x86_64-linux-gnu/libz.so.1
```

### /etc/ld.so.conf

This file contains the list of directories that `ldconfig` scans when building the cache. Modern distributions typically store the main configuration like this:

```
# /etc/ld.so.conf
include /etc/ld.so.conf.d/*.conf
```

Individual files for each library set live in `/etc/ld.so.conf.d/`. If you install a package with libraries in a non-standard directory, add the path there and run `ldconfig`.

Example — adding a directory:
```bash
echo "/usr/local/lib/myapp" | sudo tee /etc/ld.so.conf.d/myapp.conf
sudo ldconfig
```

### LD_LIBRARY_PATH

The `LD_LIBRARY_PATH` environment variable lets you temporarily add directories to the library search path. It has higher priority than the cache, making it convenient for testing or running programs with custom libraries.

```bash
# Run a program with a custom library
LD_LIBRARY_PATH=/home/user/mylibs ./myprogram

# Or set the variable for the session
export LD_LIBRARY_PATH=/usr/local/mylibs:$LD_LIBRARY_PATH
```

To remove the variable from the current session:

```bash
unset LD_LIBRARY_PATH
```

To make the change permanent, add `export LD_LIBRARY_PATH=/usr/local/mylib` to a Bash initialisation file: `/etc/bash.bashrc` (all users) or `~/.bashrc` (current user).

Using `LD_LIBRARY_PATH` permanently in production is not recommended — it is better to add the path to `/etc/ld.so.conf.d/` and update the cache. The variable is most useful for development and debugging.

---

## The ldd command

`ldd` shows which shared libraries a given binary requires. It is useful for diagnosing "library not found" errors and for checking dependencies before deployment.

```bash
ldd /bin/ls
```

Typical output:
```
	linux-vdso.so.1 (0x00007ffd1a9b0000)
	libselinux.so.1 => /lib/x86_64-linux-gnu/libselinux.so.1 (0x00007f...)
	libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f...)
	/lib64/ld-linux-x86-64.so.2 (0x00007f...)
```

If a library is not found, `ldd` shows `not found` next to its name:
```
	libmissing.so.1 => not found
```

Important: `ldd` actually executes the program in a special mode. Do not run `ldd` on binaries from untrusted sources — it is a security risk. For those cases use `objdump -p binary | grep NEEDED` or `readelf -d binary | grep NEEDED` instead.

`ldd` works on shared libraries themselves, not just executables:

```bash
ldd /lib/x86_64-linux-gnu/libc.so.6
```

With the `-u` flag `ldd` prints direct dependencies that are not actually used:

```bash
ldd -u /usr/bin/git
# Unused direct dependencies:
#   /lib/x86_64-linux-gnu/libz.so.1
#   /lib/x86_64-linux-gnu/libpthread.so.0
```

Unused dependencies appear because of linker options at build time: the library is marked as NEEDED in the ELF header even though it is not actually required.

---

## Exam command reference

```bash
# Show a binary's library dependencies
ldd /path/to/binary

# Update the library cache (requires root)
ldconfig

# View the cache contents
ldconfig -p

# Update the cache with verbose output
ldconfig -v

# Temporarily set a library search path
LD_LIBRARY_PATH=/my/lib/dir ./program

# Find a library file by name
find /lib /usr/lib /usr/lib64 -name "libz.so*"

# Show dependencies without executing the program (safer than ldd)
objdump -p /bin/ls | grep NEEDED
readelf -d /bin/ls | grep NEEDED
```

---

## Typical exam questions

**Which configuration file does ldconfig read?**
`/etc/ld.so.conf` (and files included via `include` from `/etc/ld.so.conf.d/`).

**Where is the shared library cache stored?**
`/etc/ld.so.cache`. It is a binary file created by `ldconfig`.

**Which command must be run after adding a new library to /usr/local/lib?**
`ldconfig` (with root privileges).

**Which environment variable lets you temporarily add a library path?**
`LD_LIBRARY_PATH`.

**What does the ldd command do?**
It lists the shared libraries a binary depends on and the paths where they will be found.

**On a 64-bit system, libraries typically live in...**
`/lib64/` and `/usr/lib64/` (also `/lib/` and `/usr/lib/` for 32-bit libraries).

**Why does the soname contain only the major version?**
Because ABI compatibility is guaranteed within one major version. A program linked against `libfoo.so.2` will work with any `libfoo.so.2.x.y` without recompilation.

---

## Exercises

### Guided Exercises

**1. Break down the following shared library names into their components.**

| Full filename | Library name | so suffix | Version number |
|---|---|---|---|
| `linux-vdso.so.1` | linux-vdso | so | 1 |
| `libprocps.so.6` | libprocps | so | 6 |
| `libdl.so.2` | libdl | so | 2 |
| `libc.so.6` | libc | so | 6 |
| `libsystemd.so.0` | libsystemd | so | 0 |
| `ld-linux-x86-64.so.2` | ld-linux-x86-64 | so | 2 |

Note `ld-linux-x86-64`: this is the dynamic linker itself, and its name does not start with `lib`. It follows the same naming convention but has a special role — it loads all other libraries.

Also worth remembering: `linux-vdso.so.1` is a virtual library (vDSO, virtual Dynamic Shared Object) that the kernel maps directly into every process's address space. There is no file on disk.

---

**2. You developed a program and want to add a new shared library directory `/opt/lib/mylib` to the system. You wrote the absolute path into a file `mylib.conf`.**

**Which directory should you put this file in?**

<details>
<summary>Answer</summary>

`/etc/ld.so.conf.d`

All `.conf` files in this directory are automatically included by the main `/etc/ld.so.conf` via the `include /etc/ld.so.conf.d/*.conf` directive.

</details>

**Which command must you run for the change to take effect?**

<details>
<summary>Answer</summary>

```bash
sudo ldconfig
```

`ldconfig` re-reads the configuration, updates symbolic links, and rebuilds the cache `/etc/ld.so.cache`. Without this step the linker will not see the new directory.

</details>

---

**3. Which command lists the shared libraries required by the `kill` program?**

<details>
<summary>Answer</summary>

```bash
ldd /bin/kill
```

The path `/bin/kill` or `/usr/bin/kill` depends on the distribution. Use `which kill` to find the exact path. Always pass an absolute path to `ldd`.

</details>

---

### Explorational Exercises

**1. Inspect ELF dependencies and soname with objdump.**

`objdump` is a utility for displaying information from object files. Check whether it is installed:

```bash
which objdump
```

If not, install the `binutils` package.

**Print glibc's dependencies:**

```bash
objdump -p /lib/x86_64-linux-gnu/libc.so.6 | grep NEEDED
```

glibc has almost no dependencies, since it is itself the base system library. The output may be empty or contain only `ld-linux`.

**Print glibc's soname:**

```bash
objdump -p /lib/x86_64-linux-gnu/libc.so.6 | grep SONAME
```

Output: `SONAME      libc.so.6`

The soname is written directly into the ELF header of the library. This is the name the dynamic linker uses when creating the symbolic link and when searching at program startup.

**Print Bash's dependencies:**

```bash
objdump -p /bin/bash | grep NEEDED
```

Output shows the libraries Bash depends on, such as `libtinfo`, `libdl`, `libc`.

> Unlike `ldd`, `objdump -p | grep NEEDED` only reads the ELF header without executing the file. This is safer when analysing binaries from untrusted sources. `readelf -d /bin/bash | grep NEEDED` does the same thing with a different tool.

---

## Related topics

- [101.2 Boot the System](/posts/lpic1-101-2-boot-the-system/) — system boot and the role of the dynamic linker
- 102.4 Use Debian Package Management — installing packages, including libraries
- 102.5 Use RPM and YUM Package Management — the same for RPM-based systems

---

*LPIC-1 Study Notes | Topic 101: System Architecture*
