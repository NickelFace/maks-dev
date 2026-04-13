---
title: "LPIC-1 101.1 — Determine and Configure Hardware Settings"
date: 2026-04-13
description: "BIOS/UEFI, pseudo-filesystems /proc/ /sys/ /dev/, sysfs, udev, dbus, kernel modules, lspci, lsusb. LPIC-1 exam topic 101.1."
tags: ["Linux", "LPIC-1", "Hardware", "Kernel"]
categories: ["LPIC-1"]
---

> **Exam weight: 2** — LPIC-1 v5, Exam 101

## What you need to know

- Enable and disable integrated peripheral devices
- Distinguish between types of mass storage devices
- Determine hardware resources for devices
- Work with hardware inspection tools: `lsusb`, `lspci`
- Manage USB devices
- Understand the concepts of sysfs, udev and dbus

---

## BIOS and UEFI: configuration before the OS loads

Before the operating system starts, hardware can be configured directly in the BIOS or UEFI utility. You enter it at power-on by pressing the appropriate key — usually Del, F2 or F12. The exact key depends on the manufacturer and is typically shown on screen during POST.

BIOS (Basic Input/Output System) was used on x86 motherboards until the mid-2000s. From the late 2000s onwards it began to be replaced by UEFI (Unified Extensible Firmware Interface), which offers richer capabilities: device identification, testing, configuration and firmware updates. In practice both are still commonly called "BIOS" because they serve the same purpose.

What you can do in BIOS/UEFI:

- Enable or disable integrated peripherals (NIC, Bluetooth, serial ports)
- Change IRQ and DMA assignments for devices
- Set boot order so the system boots from the right disk
- Enable or disable CPU features (disabling saves power and closes certain vulnerabilities)
- Set correct RAM timings and frequency per manufacturer spec

If the OS fails to boot without an obvious reason, the first thing to check is the boot device order in BIOS/UEFI.

---

## Filesystems and pseudo-filesystems

Linux provides three pseudo-filesystems through which you can read hardware information in real time.

### /proc/

`/proc/` stores no real files on disk. It is a virtual filesystem the kernel generates on the fly. It holds information about running processes and system state.

Useful files:

```
/proc/cpuinfo       — CPU information
/proc/meminfo       — memory information
/proc/interrupts    — interrupt table (IRQ)
/proc/ioports       — I/O port ranges
/proc/dma           — DMA channels in use
/proc/bus/pci/      — PCI devices
```

Example — view the CPU model:

```bash
cat /proc/cpuinfo | grep "model name"
```

### /sys/

`/sys/` appeared after `/proc/` and is called sysfs. Here the kernel exports the device and driver hierarchy as a directory tree. Every device in the system gets its own directory.

For example, find network card information here:

```bash
ls /sys/class/net/
```

Read a specific device parameter, such as link state:

```bash
cat /sys/class/net/eth0/operstate
```

### /dev/

`/dev/` contains device files. When you open `/dev/sda` you are communicating with the first hard disk. When you write to `/dev/null`, data simply disappears.

Device file types:
- **Block (b):** hard disks, SSDs, USB drives (`/dev/sda`, `/dev/nvme0n1`)
- **Character (c):** terminals, serial ports (`/dev/tty0`, `/dev/ttyS0`)

List all block devices:

```bash
ls -l /dev/sd*
```

---

## sysfs, udev and dbus

### sysfs

sysfs, mounted at `/sys/`, exports kernel, device and driver information. It is the primary interface between userspace and the kernel's device subsystem.

### udev

udev manages dynamic device files in `/dev/`. The kernel detects a device event and passes it to the udev process, which creates the corresponding files in `/dev/` according to predefined rules.

udev handles two scenarios:

- **Coldplug** — devices already connected when the machine powers on. udev processes them during system startup.
- **Hotplug** — devices connected while the system is running (e.g. a USB flash drive). The kernel supports hotplug since version 2.6.

udev relies on sysfs (`/sys/`) for device information. Rules for device identification are stored in `/etc/udev/rules.d/`. Base rules are provided by the distribution; you can add your own for specific cases.

Monitor device events in real time:

```bash
udevadm monitor
```

### dbus

D-Bus is a message bus through which processes communicate with each other. For example, Network Manager uses D-Bus to notify the desktop about a network change. Systemd relies heavily on D-Bus for service management.

---

## Types of mass storage devices

All storage devices in Linux are called block devices because data is read and written in buffered blocks.

Starting with kernel 2.4, most storage devices are represented as SCSI devices regardless of the actual connection type. IDE, SATA, SSD and USB drives all receive the `sd` prefix.

| Type | Interface | Example in /dev/ | Notes |
|------|-----------|------------------|-------|
| HDD/SSD (SATA, IDE, USB) | SATA/IDE/USB | `/dev/sda`, `/dev/sdb` | Prefix `sd`, letter depends on detection order |
| NVMe SSD | PCIe | `/dev/nvme0n1` | Prefix `nvme`, partitions: `nvme0n1p1`, `nvme0n1p2` |
| SD cards | MMC | `/dev/mmcblk0` | Partitions: `mmcblk0p1`, `mmcblk0p2` |
| Optical drives (legacy IDE) | IDE | `/dev/hdc` | Second IDE channel, master |
| Floppy disks | FDC | `/dev/fd0`, `/dev/fd1` | Legacy type |
| Virtual disks | Virtio | `/dev/vda` | Inside virtual machines |

Legacy IDE naming: first IDE channel master `/dev/sda`, slave `/dev/sdb`; second channel master `/dev/sdc`, slave `/dev/sdd`. An optical drive on the second channel gets `/dev/hdc` in the old notation.

Partition naming: for `sd` disks just append a number: `/dev/sda1`, `/dev/sda2`. For NVMe and MMC a `p` is inserted between the disk name and partition number: `/dev/nvme0n1p1`, `/dev/mmcblk0p1`.

---

## Hardware resources

Each device uses one or more resources:

**IRQ (Interrupt Request)** — interrupt line the device uses to signal the CPU. View current assignments:

```bash
cat /proc/interrupts
```

**I/O Ports** — address ranges for data exchange with the device:

```bash
cat /proc/ioports
```

**DMA (Direct Memory Access)** — channels for direct memory access, bypassing the CPU:

```bash
cat /proc/dma
```

**Memory-mapped I/O** — physical memory ranges reserved for devices.

---

## Working with kernel modules

Device drivers in Linux are loaded as kernel modules. Here are the main tools.

### lsmod

Lists all loaded modules:

```bash
lsmod
```

Output has three columns:

| Column | Description |
|--------|-------------|
| Module | Module name |
| Size | RAM used by the module (bytes) |
| Used by | Modules that depend on this one |

The `Used by` column matters for troubleshooting: you cannot unload a module that other modules depend on. For example, `snd_hda_intel` pulls in `snd_hda_codec`, `snd_pcm` and other audio modules.

Filter output by name:

```bash
lsmod | grep snd_hda_intel
```

### modprobe

Loads or unloads a module along with all its dependencies:

```bash
# Load a module
sudo modprobe bluetooth

# Unload a module and all dependents (if not in use)
sudo modprobe -r snd-hda-intel
```

Unlike `insmod`, `modprobe` resolves dependencies automatically. The `-r` flag unloads the module only if no running process is using it.

Module parameters can be passed directly at load time:

```bash
sudo modprobe nouveau modeset=0
```

To apply parameters on every boot, add them to a file in `/etc/modprobe.d/`:

```bash
# /etc/modprobe.d/nouveau.conf
options nouveau modeset=0
```

### modinfo

Shows the module description, file path, author, license, dependencies and available parameters:

```bash
modinfo bluetooth
```

The `-p` flag lists only the available parameters, nothing else:

```bash
modinfo -p nouveau
```

Example output:

```
modeset:enable driver (default: auto, 0 = disabled, 1 = enabled) (int)
noaccel:disable kernel/abi16 acceleration (int)
```

This is useful before writing parameters to `/etc/modprobe.d/`.

---

## Inspecting PCI devices: lspci

`lspci` lists all devices connected to the PCI/PCIe bus — video cards, NICs, SATA controllers, USB expansion cards. Some devices are soldered onto the motherboard; others are inserted into expansion slots.

Note: many hardware commands require root privileges or show limited output for regular users. Use `sudo`.

Basic output:

```bash
lspci
```

Example:

```
01:00.0 VGA compatible controller: NVIDIA Corporation GM107 [GeForce GTX 750 Ti]
04:02.0 Network controller: Ralink corp. RT2561/RT61 802.11g PCI
```

The hex numbers at the start of each line (e.g. `04:02.0`) are the unique PCI bus address of the device.

Detailed information for a specific device by its address:

```bash
lspci -s 04:02.0 -v
```

Output shows flags, IRQ, memory range and a `kernel driver in use` line with the loaded module name.

Other useful flags:

```bash
lspci -s 01:00.0 -k   # module in use + all available modules
lspci -v               # verbose output for all devices
lspci -vv              # very verbose
lspci -nn              # add numeric vendor and device IDs
```

Example output of `lspci -s 01:00.0 -k`:

```
01:00.0 VGA compatible controller: NVIDIA Corporation GM107 [GeForce GTX 750 Ti]
    Kernel driver in use: nvidia
    Kernel modules: nouveau, nvidia_drm, nvidia
```

`Kernel driver in use` is the active driver; `Kernel modules` lists all available modules for this device.

Three signs a device is working correctly:
1. The device is detected (`lspci` sees it)
2. A suitable kernel module is loaded (`Kernel driver in use` is present)
3. The device is ready to use

---

## Inspecting USB devices: lsusb

`lsusb` lists all USB devices in the system, including hubs. Keyboards, mice and removable storage most commonly use the USB interface.

Basic output:

```bash
lsusb
```

Example:

```
Bus 001 Device 028: ID 093a:2521 Pixart Imaging, Inc. Optical Mouse
Bus 001 Device 020: ID 1131:1001 Integrated System Solution Corp. KY-BT100 Bluetooth Adapter
Bus 001 Device 001: ID 1d6b:0002 Linux Foundation 2.0 root hub
```

Line format: bus (`Bus 001`), device number (`Device 028`), ID as `vendorid:productid`, description.

Select a device by bus and device number (from `lsusb -t` output):

```bash
lsusb -s 01:20
```

Detailed information for a specific device by its ID:

```bash
lsusb -v -d 1781:0c9f
```

This shows the full device descriptor: class, protocol, packet size, USB version and more. If a device appears in `lsusb -t` but the `Driver=` field is empty, either the module is not loaded or the device is managed directly by an application without a kernel module.

Show device tree with ports and drivers:

```bash
lsusb -t
```

Example output of `lsusb -t`:

```
/:  Bus 01.Port 1: Dev 1, Class=root_hub, Driver=dwc_otg/1p, 480M
    |__ Port 3: Dev 20, If 0, Class=Wireless, Driver=btusb, 12M
    |__ Port 1: Dev 7, If 0, Class=Vendor Specific Class, Driver=lan78xx, 480M
```

The tree shows which port each device is connected to, its class and active driver.

---

## Managing USB devices

Beyond `lsusb`, there are several ways to interact with USB devices.

Monitor connection events via udev:

```bash
udevadm monitor --subsystem-match=usb
```

Get detailed device information via udev:

```bash
udevadm info -a -n /dev/sdb
```

Set a udev rule for a specific USB device (file `/etc/udev/rules.d/99-my-usb.rules`):

```
SUBSYSTEM=="usb", ATTR{idVendor}=="046d", ATTR{idProduct}=="c52b", MODE="0666"
```

---

## Enabling and disabling peripherals

Integrated peripherals (Wi-Fi, Bluetooth, serial ports) are often configured in BIOS/UEFI. From Linux you can control them via:

1. Unloading the kernel module: `sudo modprobe -r iwlwifi` disables Wi-Fi
2. Blocklist in `/etc/modprobe.d/`: prevents the module from loading at boot

Two approaches for blacklisting. You can add a line to the existing `/etc/modprobe.d/blacklist.conf`:

```
blacklist nouveau
```

The preferred approach is to create a separate file for just the module:

```
# /etc/modprobe.d/nouveau.conf
blacklist nouveau
```

This is needed, for example, when the proprietary `nvidia` driver is installed and the default `nouveau` module needs to be kept out of the way.

After making changes, rebuild initramfs:

```bash
sudo update-initramfs -u
```

---

## Exam command reference

```bash
# PCI device information
lspci
lspci -k        # with module names
lspci -nn       # with numeric IDs

# USB device information
lsusb
lsusb -t        # as a tree
lsusb -v        # verbose

# Kernel modules
lsmod           # list loaded modules
modprobe name   # load a module
modprobe -r name  # unload a module
modinfo name    # module information

# Hardware resources
cat /proc/interrupts
cat /proc/ioports
cat /proc/dma

# udev
udevadm monitor
udevadm info -a -n /dev/device
```

---

## Typical exam questions

1. What is the successor to BIOS on x86 systems? → UEFI
2. Which file shows IRQ assignments? → `/proc/interrupts`
3. Which command loads a module with dependencies? → `modprobe`
4. What is udev? → Dynamic device file manager
5. Where are device files stored? → `/dev/`
6. How does `/sys/` differ from `/proc/`? → `/sys/` is specialized for device structure; `/proc/` covers processes and general kernel state
7. Which command shows the driver for a PCI device? → `lspci -k`
8. How do you view kernel module parameters? → `modinfo -p module_name`
9. Where are persistent module parameters stored? → `/etc/modprobe.d/`
10. What is coldplug? → Detection of devices already connected when the system starts
11. How are NVMe partitions named? → `/dev/nvme0n1p1`, `/dev/nvme0n1p2`
12. How are SD card partitions named? → `/dev/mmcblk0p1`, `/dev/mmcblk0p2`
13. What is the preferred way to blacklist a module? → Create a dedicated file `/etc/modprobe.d/module_name.conf` with a `blacklist` directive

---

## Related topics

- 101.2 Boot the System — system boot process
- 101.3 Change runlevels / boot targets — runlevels
- 102.1 Design hard disk layout — disk partitioning

---

## Exercises

### Exercise 1 — SATA disk boot order

A system stops booting after a second SATA disk is added. All components are working. What is the likely cause?

**Answer:**

The BIOS/UEFI most likely started trying to boot from the new disk instead of the one with the operating system. When a second SATA disk is added, it may receive a higher priority in the boot device list, and the BIOS will attempt to boot from it. Since the new disk has no bootloader, the system hangs.

Fix: enter BIOS/UEFI and restore the correct disk to the top of the boot order.

---

### Exercise 2 — Inspecting a video card with lspci

You need to check the specs of a discrete video card connected to the PCI bus without opening the case. Which command do you use?

**Answer:**

```bash
lspci -v
```

`lspci` lists all devices on the PCI/PCIe bus, including video cards. The `-v` flag adds details: vendor, model, subsystem (brand and marketing name) and other attributes.

If there are multiple cards or you need to target a specific one, first find its address with `lspci`, then query the details:

```bash
lspci -s 01:00.0 -v
```

The `Subsystem` line in the output shows exactly what is printed on the box.

---

### Exercise 3 — Kernel module for a RAID controller

The `lspci` output contains this line:

```
03:00.0 RAID bus controller: LSI Logic / Symbios Logic MegaRAID SAS 2208 [Thunderbolt] (rev 05)
```

Which command shows the loaded kernel module for this device?

**Answer:**

```bash
lspci -s 03:00.0 -k
```

The `-s` flag targets the specific device address; `-k` shows `Kernel driver in use` (active driver) and `Kernel modules` (all available modules for this device).

---

### Exercise 4 — Module unload failure

An administrator tries to unload the `bluetooth` module with `modprobe -r bluetooth` and gets:

```
modprobe: FATAL: Module bluetooth is in use.
```

What is the cause?

**Answer:**

The `bluetooth` module is being used by a running process. `modprobe -r` only unloads a module if nothing is using it.

Check who holds the module via `lsmod | grep bluetooth` and look at the `Used by` column. Dependent modules (e.g. `btusb`) must be unloaded first, then `bluetooth` itself. Alternatively, stop the `bluetoothd` service and retry.

---

### Exercise 5 — Headless boot on legacy BIOS

On older servers with a legacy BIOS, the system refuses to boot if no keyboard is connected. How do you fix this?

**Answer:**

In the BIOS settings, find the option that controls behaviour when a keyboard is absent — usually called `Halt on` or `Boot with keyboard errors`. Set it to `All, But Keyboard` (or equivalent) to ignore the missing keyboard and continue booting. Standard setting for headless servers.

---

### Exercise 6 — No lspci on ARM

On single-board computers like the Raspberry Pi (ARM), the `lspci` command is not present. Why?

**Answer:**

Because ARM boards have no PCI/PCIe bus. `lspci` queries specifically the PCI bus, which is standard on x86. On ARM, peripherals are connected through the SoC internal bus directly, without a PCI interface. Use `lsusb` for USB devices or read from `/sys/bus/` instead.

---

### Exercise 7 — USB drive on a Linux router

An external USB hard drive is connected to a Linux-based router. There are no other block devices. What will it be called in `/dev/`?

**Answer:**

```
/dev/sda
```

Since kernel 2.4, USB drives are represented as SCSI devices and receive the `sd` prefix. Since there are no other block devices, the first disk gets the letter `a`. Its partitions: `/dev/sda1`, `/dev/sda2`, etc.

---

### Exercise 8 — Checking for the Meltdown vulnerability

How do you check whether the current system is affected by Meltdown?

**Answer:**

```bash
grep bugs /proc/cpuinfo
```

If the CPU is vulnerable, the output includes `bugs: cpu_meltdown`. Modern kernels also expose a detailed check via sysfs:

```bash
cat /sys/devices/system/cpu/vulnerabilities/meltdown
```

The exam expects the `/proc/cpuinfo` approach.

---

*LPIC-1 Study Notes | Topic 101: System Architecture*
