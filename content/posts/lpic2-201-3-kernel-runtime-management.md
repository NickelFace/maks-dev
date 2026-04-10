---
title: "LPIC-2 201.3 — Kernel Runtime Management"
date: 2026-04-10
description: "Managing the running Linux kernel: modules, /proc, sysctl, udev, hardware analysis tools, and tracing utilities. LPIC-2 exam topic 201.3."
tags: ["Linux", "Kernel", "LPIC-2", "udev", "sysctl", "Modules"]
categories: ["LPIC-2"]
---

> **Exam weight:** Topic 201.3 carries **4 points** — one of the highest-weighted topics on the LPIC-2 201 exam. Focus on module management commands, `sysctl`, `/proc/sys/`, and `udev`.

---

## Kernel Module Management

Kernel modules allow drivers to be loaded and unloaded at runtime without rebooting. Module files are stored in `/lib/modules/<kernel-version>/` with the `.ko` extension.

### lsmod — list loaded modules

`lsmod` displays all currently loaded modules. It reads directly from `/proc/modules`.

```bash
lsmod
```

Output has three columns: module name, size in bytes, and use count. A fourth column, when present, shows which other modules depend on this one.

```
Module                  Size  Used by
snd_ens1371            28672  0
snd_ac97_codec        131072  1 snd_ens1371
snd                    98304  3 snd_ens1371,snd_ac97_codec
```

> **Important:** If the use count (Used by) is greater than zero, the module cannot be unloaded. First unload all modules that reference it.

### insmod — load a module manually

`insmod` loads a module from the full path to the `.ko` file. It does not resolve dependencies automatically — its main disadvantage compared to `modprobe`.

```bash
# Successful load
insmod /lib/modules/$(uname -r)/kernel/drivers/scsi/sym53c8xx.ko

# Fails due to unresolved dependencies
insmod snd-ens1371.ko
# insmod: error inserting 'snd-ens1371.ko': -1 Unknown symbol in module
```

> **Warning:** `insmod` requires the full path to the `.ko` file. If dependencies are not already loaded, you get "Unknown symbol in module". In those cases, use `modprobe` instead.

| Option | Description |
|---|---|
| `-s` | Write result to syslog instead of the terminal |
| `-v` | Verbose output |

### rmmod — unload a module

`rmmod` unloads a module from the running kernel. Root privileges are required, and the use count must be zero.

```bash
# Attempt to unload a module that is in use
rmmod snd_ac97_codec
# ERROR: Module snd_ac97_codec is in use by snd_ens1371

# Correct order: unload the dependent module first
rmmod snd_ens1371
rmmod snd_ac97_codec
```

> **Tip:** `modprobe -r` is more convenient than `rmmod` — it automatically determines the correct unload order for dependencies.

### modprobe — smart load and unload

`modprobe` is the recommended tool for loading modules. Unlike `insmod`, it automatically loads all dependencies by reading `/lib/modules/<version>/modules.dep`. It accepts a module name without a path or extension.

```bash
# Load module and all its dependencies
modprobe snd_ens1371

# Load with parameters
modprobe usbcore nousb=1

# Unload module and its dependencies
modprobe -r snd_ens1371

# Show the full current configuration
modprobe -c

# Verbose mode: shows what is happening
modprobe -v btusb
# insmod /lib/modules/3.13.0-63-generic/kernel/drivers/bluetooth/btusb.ko
```

| Option | Description |
|---|---|
| `-r` | Remove a module (like `rmmod`) |
| `-a` | Load all listed modules |
| `-c` | Show full configuration including defaults |
| `-l` | List modules |
| `-n` | Dry run — check without actually loading |
| `-v` | Verbose output |
| `-s` | Write errors to syslog |
| `-f` | Force load, ignore version conflicts |

### modinfo — module information

`modinfo` displays detailed information about a module: description, author, version, parameters, and dependencies.

```bash
modinfo snd_ens1371
# filename:  /lib/modules/.../snd-ens1371.ko
# author:    Thomas Sailer
# description: Ensoniq AudioPCI97 ES1371+
# license:  GPL
# parm:      joystick_port:int

# Show only module parameters
modinfo -p snd_ens1371

# Show only the filename
modinfo -n snd_ens1371
```

> **Exam tip:** Use `modinfo -p` when asked "how to find out what parameters a module accepts".

| Option | Description |
|---|---|
| `-a` | Show author |
| `-d` | Show description |
| `-n` | Show filename |
| `-p` | Show accepted parameters |
| `-V` | Show utility version |

### depmod — recalculate dependencies

`depmod` scans all modules in `/lib/modules/<version>/` and rebuilds the `modules.dep` dependency file. Most distributions run `depmod -a` automatically at boot.

```bash
# Recalculate for the running kernel
depmod -a

# Recalculate for a specific version
depmod -a 4.15.0-20-generic

# Show dependencies without writing to file
depmod -n
```

> **Warning:** If you install a new module manually and don't run `depmod -a`, `modprobe` will not find it or cannot resolve its dependencies.

---

## Module Configuration

### Configuration files in /etc

| File/Directory | Purpose |
|---|---|
| `/etc/modprobe.conf` | Main configuration file (deprecated) |
| `/etc/modprobe.d/` | Directory with configuration files (modern approach) |
| `/etc/modules` | List of modules to auto-load at startup |
| `/etc/modules.conf` | Old format, deprecated |

Files in `/etc/modprobe.d/` use the `.conf` extension. Lines starting with `#` and blank lines are ignored.

Example `/etc/modprobe.d/blacklist.conf`:

```
# Prevent a module from loading automatically
blacklist pcspkr
```

Example `/etc/modprobe.d/sound.conf`:

```
# Set module parameters at load time
options snd_ens1371 joystick_port=1

# Commands to run around load/unload
install mymodule /sbin/modprobe realmodule
pre-install mymodule /bin/echo "Loading..."
post-remove mymodule /bin/echo "Removed."
```

### Aliases

An alias lets you load a module under a different name. Useful when software looks for a driver by a standard name but the actual file has a different name.

```
# Load the module "eth0" as "e1000"
alias eth0 e1000

# Alias for all devices of a certain type
alias net-pf-10 off
```

```bash
# After adding the alias to the config
modprobe eth0
# modprobe loads e1000
```

> **Exam tip:** "How to configure loading a module under a name different from the file name" — answer: the `alias` directive in `/etc/modprobe.d/*.conf`.

### modules.dep

`/lib/modules/<version>/modules.dep` stores inter-module dependencies. `modprobe` reads it to determine the load order.

```bash
cat /lib/modules/$(uname -r)/modules.dep
# kernel/drivers/sound/snd-ens1371.ko: kernel/sound/snd-ac97-codec.ko kernel/sound/snd.ko
```

The file is regenerated by `depmod -a` on every system boot.

---

## The /proc Filesystem

`/proc` is a pseudo-filesystem: the kernel generates its contents on the fly. No data is stored on disk. Through `/proc` you can both read and modify kernel parameters at runtime.

```bash
# Kernel version
cat /proc/sys/kernel/osrelease

# Hostname
cat /proc/sys/kernel/hostname

# Loaded modules (same as lsmod)
cat /proc/modules

# CPU information
cat /proc/cpuinfo

# Memory usage
cat /proc/meminfo
```

### /proc/sys/kernel

The `/proc/sys/kernel/` directory contains files for changing kernel parameters at runtime. Writing to a file immediately changes system behaviour.

```bash
# Read the current value
cat /proc/sys/kernel/panic
# 0

# Enable auto-reboot 20 seconds after a kernel panic
echo 20 > /proc/sys/kernel/panic

# Check the maximum number of open files
cat /proc/sys/fs/file-max
```

> **Warning:** Changes through `/proc/sys/` do not survive a reboot. For permanent changes use `sysctl` with `/etc/sysctl.conf`.

---

## sysctl

`sysctl` reads and sets kernel parameters. Parameters come from the `/proc/sys/` hierarchy but are written in dot-notation, e.g. `kernel.panic` instead of `/proc/sys/kernel/panic`.

```bash
# Show all parameters
sysctl -a

# Show a specific parameter
sysctl kernel.panic
# kernel.panic = 0

# Change a parameter
sysctl -w kernel.panic=20

# Apply settings from a file (used at system startup)
sysctl -p /etc/sysctl.conf

# Apply all files from a directory
sysctl -p /etc/sysctl.d/
```

Example `/etc/sysctl.conf`:

```
# Enable IP forwarding
net.ipv4.ip_forward = 1

# Auto-reboot 30 seconds after kernel panic
kernel.panic = 30

# Protection against IP spoofing
net.ipv4.conf.all.rp_filter = 1
```

You can also create individual files in `/etc/sysctl.d/`, e.g. `/etc/sysctl.d/99-custom.conf`.

> **Important:** Modules loaded after `sysctl` is applied can override its settings. To avoid this, run `sysctl -p` after all modules are loaded.

---

## /boot and /lib/modules Layout

### /boot/

| File | Description |
|---|---|
| `vmlinuz-<version>` | Compressed kernel image |
| `initrd.img-<version>` | Initial RAM disk |
| `System.map-<version>` | Kernel symbol table |
| `config-<version>` | Configuration used to build this kernel |
| `grub/` | GRUB bootloader configuration |

### /lib/modules/\<version\>/

| Path | Description |
|---|---|
| `kernel/` | Module files (.ko) |
| `modules.dep` | Module dependencies |
| `modules.alias` | Module aliases |
| `modules.builtin` | Modules built directly into the kernel |

---

## Hardware Analysis Tools

### uname

`uname` displays information about the running kernel.

```bash
uname -a
# Linux myhost 5.15.0-76-generic #83-Ubuntu SMP Thu Jun 15 19:16:32 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux
```

| Option | Description |
|---|---|
| `-a` | All information |
| `-r` | Kernel release, e.g. `5.15.0-76-generic` |
| `-n` | Network hostname |
| `-m` | Machine architecture |
| `-s` | Kernel name (always `Linux`) |
| `-v` | Kernel version (build date) |
| `-p` | Processor type |
| `-o` | Operating system |

### dmesg

`dmesg` prints the kernel ring buffer — messages about boot, hardware detection, and errors.

```bash
# Print the full buffer
dmesg

# Save to a file
dmesg > /var/log/boot.messages

# Find information about a specific device
dmesg | grep -i usb

# Find errors
dmesg | grep -i error
```

> **Tip:** When troubleshooting hardware, `dmesg` is the first place to look. The output is also saved to `/var/log/dmesg`.

### lspci

`lspci` lists all devices on the system's PCI buses. Requires kernel 2.1.82 or later.

```bash
# Basic list
lspci

# Detailed output (up to 3 -v flags)
lspci -v
lspci -vvv

# Show numeric IDs instead of names
lspci -n
```

Example output:

```
00:03.0 Ethernet controller: Intel Corporation 82540EM Gigabit Ethernet Controller
00:05.0 Multimedia audio controller: Intel Corporation 82801AA AC'97 Audio Controller
```

### lsusb

`lsusb` lists USB devices, the USB equivalent of `lspci`. Requires `/proc/bus/usb` support (kernel 2.3.15 or later).

```bash
# List USB devices
lsusb

# Detailed output
lsusb -v

# Tree view of USB topology
lsusb -t
```

Example output:

```
Bus 007 Device 003: ID 03f0:0324 Hewlett-Packard SK-2885 keyboard
Bus 007 Device 002: ID 045e:0040 Microsoft Corp. Wheel Mouse Optical
```

### lsdev

`lsdev` shows consolidated hardware information: I/O addresses, IRQs, and DMA channels. Data is sourced from `/proc/interrupts`, `/proc/ioports`, and `/proc/dma`.

```bash
lsdev
```

> **Note:** `lsdev` may not be present on all systems. Use `procinfo` as an alternative.

---

## udev

### How udev works

`udev` moved device management from kernel space into user space. The `udevd` daemon runs in the background and receives "uevent" messages from the kernel via the `sysfs` pseudo-filesystem. When you plug in a USB stick or camera, the kernel sends a uevent, `udevd` receives it, matches it against a set of rules, and performs the required actions: creating a device file in `/dev`, loading the appropriate module, mounting the device, running scripts.

```
Kernel detects device
       ↓
  Sends uevent
       ↓
  udevd receives uevent
       ↓
  Matches against rules in /etc/udev/rules.d/
       ↓
  Performs actions: create /dev/sdX, run scripts, etc.
```

### udev files and directories

| Path | Description |
|---|---|
| `/etc/udev/udev.conf` | Main udev configuration file (log priority, etc.) |
| `/etc/udev/rules.d/` | User-defined rules (override system rules) |
| `/lib/udev/rules.d/` | Default system rules |

> **Important:** User rules go in `/etc/udev/rules.d/`; system defaults are in `/lib/udev/rules.d/`. Rules in `/etc/` take priority.

### udev rule syntax

Each rule is a comma-separated list of key=value pairs, split into match keys (conditions) and assign keys (actions).

```
# Assign the name eth0 to a network card with a specific MAC address
SUBSYSTEM=="net", ACTION=="add", ATTR{address}=="00:21:86:9e:c2:c4", NAME="eth0"
```

Operators:

| Operator | Description |
|---|---|
| `==` | Match: equal |
| `!=` | Match: not equal |
| `=` | Assign value (clears the list) |
| `+=` | Append to list |
| `:=` | Assign finally, prevent further changes |

Common match keys:

| Key | Description |
|---|---|
| `SUBSYSTEM` | Device subsystem (net, usb, block) |
| `ACTION` | Event action (add, remove, change) |
| `ATTR{...}` | Device attribute from sysfs |
| `KERNEL` | Kernel device name |
| `DRIVERS` | Driver name |

Common assign keys:

| Key | Description |
|---|---|
| `NAME` | Device filename in /dev |
| `SYMLINK` | Symbolic link to the device |
| `MODE` | Device file permissions |
| `OWNER` | Device file owner |
| `RUN` | Command to execute |

Example rules:

```
# Create a symlink /dev/my-usb for a specific USB device
SUBSYSTEM=="usb", ATTR{idVendor}=="03f0", ATTR{idProduct}=="0324", SYMLINK+="my-usb"

# Run a script when a USB storage device is attached
ACTION=="add", SUBSYSTEM=="block", KERNEL=="sd*", RUN+="/usr/local/bin/usb-mount.sh"
```

> **Warning:** Watch for conflicting rules: if two rules assign the same device name to different devices, you get unpredictable behaviour. Use `udevadm test` to check a rule without actually applying it.

### Monitoring udev events

```bash
# Modern way to monitor events
udevadm monitor

# Kernel events only
udevadm monitor --kernel

# udev events only
udevadm monitor --udev

# Test rule application to a device (no real actions)
udevadm test /sys/class/net/eth0

# Reload udev rules without restarting the daemon
udevadm control --reload-rules

# Get device information
udevadm info --query=all --name=/dev/sda
```

> **Note:** On older systems `udevmonitor` was a separate utility. On modern distributions it is a symlink to `udevadm`. If the link is missing, use `udevadm monitor` directly.

---

## Tracing Tools

### strace — system call tracing

`strace` intercepts and records all system calls made by a process and the signals it receives. No source code or recompilation required. For each call it outputs the name, arguments, and return value to stderr.

```bash
# Trace a command
strace cat /dev/null

# Attach to a running process by PID
strace -p 1234

# Attach to a process and all its children
strace -p 1234 -f

# Save output to a file
strace -o /tmp/trace.log cat /dev/null

# Show only specific system calls
strace -e open,read cat /dev/null
```

Example output from `strace cat /dev/null`:

```
execve("/bin/cat", ["cat", "/dev/null"], [...]) = 0
open("/dev/null", O_RDONLY)             = 3
read(3, "", 32768)                      = 0
close(3)                                = 0
exit_group(0)                           = ?
```

> **Tip:** The `-p` flag is especially useful for debugging daemons: attach to a hung process live and see which system call it is stuck on.

### ltrace — library call tracing

`ltrace` works like `strace` but intercepts dynamic library calls rather than kernel system calls. Also requires no source code.

```bash
# Trace library calls
ltrace cat /dev/null

# Attach to a running process
ltrace -p 1234
```

Example output from `ltrace cat /dev/null`:

```
__libc_start_main(...)
setlocale(6, "")        = "en_US.utf8"
open("/dev/null", 0, 02) = 3
read(3, "", 32768)       = 0
exit(0)
```

> **Note:** `strace` shows kernel calls (`open`, `read`, `write`); `ltrace` shows library calls (`malloc`, `setlocale`, `printf`). In real debugging, both are often run together.

### strings — read strings in binaries

`strings` prints all printable strings of 4 or more characters from a file. Useful for inspecting binaries without source code: find config file names, environment variables, paths.

```bash
# Find strings in a binary file
strings /usr/bin/ssh

# Find config files the program uses
strings /usr/sbin/sshd | grep etc

# Set minimum string length
strings -n 8 /usr/bin/cat
```

> **Exam tip:** `strace` traces system calls; `ltrace` traces library calls; `strings` reads text content from binaries. All three work without recompiling the program.

---

## Boot Process and initrd

`initrd` (initial RAM disk) is a temporary root filesystem that the bootloader loads into memory alongside the kernel. It is needed to mount the real root, which may require modules (RAID, LVM, encryption) that are unavailable before `/lib/modules` is accessible.

Boot sequence with `initrd`:

1. Bootloader (GRUB) loads the kernel and `initrd` image into memory
2. Kernel converts `initrd` into a regular RAM disk and frees the image memory
3. The RAM disk is mounted as root (read-write)
4. `/linuxrc` is run as root, performs setup
5. After `/linuxrc` finishes, the real root is mounted
6. If `/initrd` exists, the RAM disk is moved there; otherwise it is unmounted
7. Normal init process `/sbin/init` starts

> **Warning:** If the `/initrd` directory does not exist, the RAM disk cannot be unmounted. Any process using files from `initrd` will block this. Therefore, unmount all filesystems including `/proc` before switching to the real root.

Boot parameters for `initrd`:

| Parameter | Description |
|---|---|
| `initrd=<file>` | Load the specified file as the initial RAM disk |
| `noinitrd` | Do not convert initrd to a RAM disk; keep data in `/dev/initrd` for debugging |
| `root=/dev/ram` | Use the RAM disk as the permanent root (compressed filesystems) |

> **Note:** `/dev/initrd` is read-only and accessible only once. After the last process closes it, the memory is freed and the device becomes unavailable.

```bash
# Free RAM disk memory after switching root
freeramdisk /dev/ram0
```

---

## Exam Cheat Sheet

### Key Files and Paths

```
/proc/modules                      # Loaded modules
/proc/sys/kernel/                  # Editable kernel parameters
/lib/modules/<ver>/modules.dep     # Module dependencies
/lib/modules/<ver>/modules.alias   # Module aliases
/etc/modprobe.d/                   # modprobe configuration
/etc/modules                       # Auto-loaded modules
/etc/sysctl.conf                   # Persistent kernel parameters
/etc/sysctl.d/                     # Additional sysctl files
/etc/udev/udev.conf                # udev configuration
/etc/udev/rules.d/                 # User-defined udev rules
/lib/udev/rules.d/                 # System udev rules
/boot/vmlinuz-<ver>                # Kernel image
/boot/initrd.img-<ver>             # Initial RAM disk
/boot/System.map-<ver>             # Kernel symbol table
/var/log/dmesg                     # Saved dmesg buffer
```

### Key Commands

```bash
uname -r                           # Kernel version
uname -a                           # Full kernel info

lsmod                              # Loaded modules
modinfo <module>                   # Module information
modinfo -p <module>                # Module parameters

insmod /path/to/module.ko          # Load (file path, no deps)
modprobe <module>                  # Load (with dependencies)
modprobe -r <module>               # Unload (with dependencies)
rmmod <module>                     # Unload module
depmod -a                          # Rebuild module dependencies

sysctl -a                          # All kernel parameters
sysctl kernel.panic                # Read a parameter
sysctl -w kernel.panic=30          # Write a parameter
sysctl -p /etc/sysctl.conf         # Apply config file

dmesg                              # Kernel message buffer
lspci                              # PCI devices
lspci -v                           # Verbose PCI output
lsusb                              # USB devices
lsusb -v                           # Verbose USB output
lsdev                              # IRQ/DMA/IO summary

udevadm monitor                    # Monitor udev events
udevadm test /sys/class/net/eth0   # Test a rule
udevadm control --reload-rules     # Reload rules
udevadm info --query=all --name=/dev/sda  # Device info
```

### Common Mistakes

- `insmod` needs the full `.ko` file path; `modprobe` works with just the module name
- `rmmod` will not unload a module with a non-zero use count
- Changes to `/proc/sys/` do not survive a reboot — use `/etc/sysctl.conf`
- User udev rules go in `/etc/udev/rules.d/`, not `/lib/udev/rules.d/`
- `modprobe -c` shows configuration; `modprobe -r` removes a module
- After manually installing a new module, always run `depmod -a`

---

## Practice Questions

**Q1.** You want to find out what parameters the `e1000` module accepts. Which command do you run?

A. `lsmod e1000`
B. `modinfo -p e1000`
C. `insmod e1000 --help`
D. `modprobe -c e1000`

**Answer:** B. `modinfo -p e1000` lists the parameters the module accepts.

---

**Q2.** `rmmod snd_ac97_codec` fails with "in use by snd_ens1371". How do you unload it correctly?

A. `rmmod -f snd_ac97_codec`
B. `modprobe -r snd_ac97_codec`
C. `rmmod snd_ens1371 && rmmod snd_ac97_codec`
D. Both B and C are correct.

**Answer:** D. You can manually unload `snd_ens1371` first and then `snd_ac97_codec`, or use `modprobe -r snd_ac97_codec` which automatically determines the correct unload order.

---

**Q3.** You want `e1000` to load automatically under the name `eth_driver`. How do you configure this?

A. Add `install e1000 eth_driver` to `/etc/modprobe.d/eth.conf`
B. Add `alias eth_driver e1000` to `/etc/modprobe.d/eth.conf`
C. Add `e1000 eth_driver` to `/etc/modules`
D. Create a symlink `/lib/modules/.../eth_driver.ko -> e1000.ko`

**Answer:** B. The `alias` directive in `/etc/modprobe.d/` loads a module under a name different from its filename.

---

**Q4.** Which file should you edit so that `net.ipv4.ip_forward=1` is applied on every boot?

A. `/proc/sys/net/ipv4/ip_forward`
B. `/etc/modules`
C. `/etc/sysctl.conf`
D. `/lib/modules/modules.dep`

**Answer:** C. `/etc/sysctl.conf` persists kernel parameter settings across reboots. `/proc/sys/` changes are lost on reboot.

---

**Q5.** Where should user-defined udev rules go to override system defaults?

A. `/lib/udev/rules.d/`
B. `/etc/udev/udev.conf`
C. `/etc/udev/rules.d/`
D. `/proc/udev/rules/`

**Answer:** C. User rules go in `/etc/udev/rules.d/`. System defaults are in `/lib/udev/rules.d/`.

---

**Q6.** Why is `depmod -a` needed after manually installing a new module?

A. Loads all modules from `/lib/modules/`
B. Rebuilds the `modules.dep` dependency file
C. Verifies module file integrity
D. Removes outdated modules from the system

**Answer:** B. `depmod -a` scans modules and rebuilds `/lib/modules/<version>/modules.dep`, which `modprobe` reads to resolve dependencies.

---

**Q7.** You are watching `udevadm monitor` output. Which command lets you check how udev rules would apply to a specific device without actually triggering them?

A. `udevadm info /dev/sda`
B. `udevadm test /sys/block/sda`
C. `udevadm control --reload-rules`
D. `udevadm trigger /dev/sda`

**Answer:** B. `udevadm test` processes the sysfs path and shows which rules would match, without applying them.

---

**Q8.** After running `sysctl -w kernel.panic=30`, the value resets to 0 after a reboot. What makes the change permanent?

A. Run `depmod -a` after the change
B. Add `kernel.panic = 30` to `/etc/sysctl.conf`
C. Add `echo 30 > /proc/sys/kernel/panic` to `/etc/rc.local`
D. Add a line to `/etc/modules`

**Answer:** B. `sysctl -w` changes the value only until the next reboot. For persistence, add the parameter to `/etc/sysctl.conf` and apply it with `sysctl -p`.
