---
title: "LPIC-2 204.2 — Adjusting Storage Device Access"
date: 2026-04-10
description: "hdparm, sdparm, tune2fs, sysctl/proc, SSD TRIM, NVMe, iSCSI initiator/target configuration, scsi_id, WWID/WWN/IQN/LUN identifiers, SAN protocols, and LUN persistence via udev. LPIC-2 exam topic 204.2."
tags: ["Linux", "storage", "LPIC-2", "iSCSI", "hdparm", "NVMe", "SAN"]
categories: ["LPIC-2"]
---

> **Exam topic 204.2** — Adjusting Storage Device Access. Covers hdparm/sdparm, tune2fs, sysctl, SSD/NVMe, iSCSI configuration, storage identifiers (WWID, WWN, LUN, IQN), and SAN protocols.

---

## Disk Types and Interfaces

| Disk type | Device file | Protocol/interface |
|---|---|---|
| IDE/PATA | `/dev/hd*` | ATAPI |
| SATA / SCSI / SAS | `/dev/sd*` | AHCI / libata |
| NVMe SSD | `/dev/nvme*` | NVMe (PCIe) |
| iSCSI | `/dev/sd*` | iSCSI over IP |

> **Note:** Old PATA disks were named `/dev/hda`, `/dev/hdb`, etc. Modern SATA and SCSI disks share the `/dev/sd*` prefix because the kernel handles them through the common libata driver.

---

## hdparm

`hdparm` reads, tests, and changes parameters of SATA/IDE disks. It operates through the kernel's libata interface and supports PATA, ATAPI, SATA, and SCSI disks with SAT (SCSI-ATA Command Translation) support.

> **Warning:** Most `hdparm` options are dangerous and can damage a disk. Test on non-production disks only and read `man hdparm` before use.

### Syntax

```bash
hdparm [options] [device]
```

### Key options

| Option | Description |
|---|---|
| `-I` | Detailed disk information (DMA, cache, model) |
| `-i` | Brief identification information |
| `-g` | Disk geometry (cylinders, heads, sectors) |
| `-d [0\|1]` | Get or set the DMA flag |
| `-a` | Read-ahead: number of sectors to prefetch |
| `-r [0\|1]` | Read-only flag (1 = read-only) |
| `-t` | Test disk read speed (buffered disk reads) |
| `-T` | Test cache read speed (cached reads) |
| `-W [0\|1]` | Show or set write-caching |
| `-X` | Set DMA mode (dangerous, usually already configured) |
| `-v` | Show all settings except `-i` |

### Performance test example

```bash
sudo hdparm -tT /dev/sde
# /dev/sde:
#  Timing cached reads:   11810 MB in  2.00 seconds = 5916.78 MB/sec
#  Timing buffered disk reads:  1024 MB in  2.69 seconds =  380.94 MB/sec
```

> **Tip:** Run the test several times and average the results — a single measurement is not reliable.

### Making settings persistent

`hdparm` changes are lost on reboot. To make them permanent, create or edit:

```
/etc/udev/rules.d/50-hdparm.rules
```

---

## sdparm

`sdparm` interacts with SCSI devices through VPD (Vital Product Data) tables and mode pages. It is not "hdparm for SCSI" — it is a separate tool with a different approach.

`sdparm` can read serial numbers, part codes, and device descriptions. It can also control disk behavior: stop the spindle, change write-back caching parameters.

### Key options

| Option | Description |
|---|---|
| (no options) | Show all common mode parameters for the device |
| `--all` | Show all recognized fields for this device type |
| `--command cmd` | Execute a command: `stop`, `start`, `sync`, `load` |
| `--hex` | Show VPD pages in hex (when sdparm cannot decode them) |
| `--page` | Show a specific VPD page |
| `--vendor` | Show vendor information |

> **Important for the exam:** Running `sdparm` without options shows all **common mode parameters**. The `--all` option shows ALL recognized fields — not the same thing.

---

## tune2fs

`tune2fs` configures how the kernel interacts with ext2 and ext3 filesystems.

```bash
tune2fs [options] /dev/sdXY
```

### Key options

| Option | Description |
|---|---|
| `-e continue` | On FS error: ignore, return error to the application |
| `-e remount-ro` | On FS error: remount as read-only |
| `-e panic` | On FS error: trigger kernel panic and halt the system |
| `-m <percent>` | Percentage of reserved blocks (default 5%) |
| `-O [^]mount_option` | Set or clear a mount option (^ = clear) |
| `-s [0\|1]` | Enable/disable sparse superblock (for large filesystems) |

> **Tip:** On large disks, the default 5% reserved blocks is wasteful. On a 2 TB disk that is 100 GB unused. Set it to 1% with `tune2fs -m 1 /dev/sda1`.

> **Warning:** After changing the sparse superblock flag (`-s`), run `e2fsck` to make the filesystem valid again.

---

## sysctl and /proc

`sysctl` changes kernel parameters at runtime. All tunable parameters live in the `/proc/sys/` tree.

### sysctl options

| Option | Description |
|---|---|
| `-a`, `-A` | Show all available values |
| `-w` | Change a parameter value |
| `-p` | Load settings from a file (default `/etc/sysctl.conf`) |
| `-e` | Ignore errors about unknown keys |
| `-n` | Suppress the key name, show only the value |

```bash
sysctl -a
sysctl -w vm.swappiness=10
sysctl -p /etc/sysctl.d/99-sysctl.conf

# Read/write directly via /proc
cat /proc/sys/vm/swappiness
echo 10 > /proc/sys/vm/swappiness

# Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward
```

> **Warning:** Changes made via `echo` to `/proc/sys/` or via `sysctl` do **not persist** after reboot. For permanent changes, add a line to `/etc/sysctl.conf` or a file in `/etc/sysctl.d/`.

### Interrupt monitoring

```bash
cat /proc/interrupts
```

Example output on a single-CPU system:

```
           CPU0
  0:   16313284   XT-PIC  timer
  1:     334558   XT-PIC  keyboard
 14:     123824   XT-PIC  ide0
 15:          7   XT-PIC  ide1
```

On multi-core systems additional CPU columns appear. By default all interrupts are handled by CPU0, which becomes a bottleneck when it is flooded with IRQs from network storage while other cores are idle.

### Controlling smp_affinity

Each interrupt entry in `/proc/interrupts` has a subdirectory at `/proc/irq/`. The `smp_affinity` file inside contains a bitmask where each bit corresponds to a CPU core.

| Bitmask value | CPU |
|---|---|
| 1 | CPU0 |
| 2 | CPU1 |
| 4 | CPU2 |
| 8 | CPU3 |
| 32 | CPU5 |

```bash
# Route interrupt #13 to CPU5
echo 32 > /proc/irq/13/smp_affinity

# Route interrupt #12 to CPU1
echo 2 > /proc/irq/12/smp_affinity
```

> **Tip:** Proper interrupt distribution across cores can noticeably speed up heavily loaded systems with network storage — CPU0 is no longer a bottleneck.

---

## SSD, AHCI, and NVMe

### AHCI

AHCI (Advanced Host Controller Interface) is the interface for SATA disks. Designed for mechanical drives: 1 queue of 32 commands. SATA SSDs use the same AHCI, creating a bottleneck.

> **Important:** If an SSD is not recognized, check BIOS/UEFI settings. The SATA mode must be set to **AHCI**, not IDE.

### NVMe

NVMe (Non-Volatile Memory Express) connects via PCIe and uses the NVMHCI protocol. Instead of 1 queue of 32 commands, NVMe supports **65,000 queues of 65,000 commands each**. Up to 7× faster than AHCI SSDs.

NVMe support was added in Linux kernel 3.3.

### NVMe device naming

```
/dev/nvme0n1p1
       ^  ^ ^
       |  | └── p1 = partition 1
       |  └──── n1 = namespace 1
       └─────── nvme0 = first NVMe disk (numbered from 0)
```

Disks are numbered from 0; namespaces and partitions from 1. Third disk, fourth namespace, second partition = `/dev/nvme2n4p2`.

### SSD TRIM

SSDs store data in blocks, erase whole blocks, and write page by page. This leads to write amplification: changing one page requires rewriting an entire block. The TRIM command tells the SSD controller which blocks are free, allowing internal defragmentation.

```bash
# Automatic TRIM (via mount option)
/dev/sda1 / ext4 discard,noatime 0 1

# Manual TRIM (for all free blocks in the FS)
fstrim /
```

### nvme-cli

Managing NVMe disks requires the `nvme` utility from the `nvme-cli` package. Standard SMART tools (`smartctl`) do not work with NVMe directly because there is no AHCI or SCSI interface.

```bash
nvme help
nvme smart-log /dev/nvme0
```

---

## iSCSI

iSCSI (Internet Small Computer System Interface) is a network implementation of the SCSI protocol over IP. The client sends SCSI commands (CDB, Command Descriptor Blocks) over the network; the server receives and executes them. Unlike Fibre Channel, iSCSI works on ordinary network infrastructure over LAN, WAN, or the Internet.

| Term | Role |
|---|---|
| initiator | Client that imports storage |
| target | Server that exports storage |
| CDB | Command Descriptor Block — a SCSI command packet |

### Initiator (client) configuration

Configuration file (RHEL and derivatives):

```
/etc/iscsi/iscsid.conf
```

Service management:

```bash
/etc/init.d/iscsi status
/etc/init.d/iscsi start
/etc/init.d/iscsi restart
```

### Discovering targets

```bash
iscsiadm -m discovery -t sendtargets -p 192.168.1.100
```

After discovery, log in to a volume or restart the service to mount all discovered volumes automatically.

### /etc/fstab for iSCSI

```
/dev/sdb1 /mnt/iscsi ext4 _netdev 0 0
```

> **Important:** The `_netdev` option is **mandatory** for iSCSI volumes in fstab. It ensures the network comes up before the system attempts to mount the device.

### /etc/iscsi/iscsid.conf example

```ini
# iSNS settings
isns.address = 192.168.1.200
isns.port = 3260

# CHAP authentication
node.session.auth.authmethod = CHAP
node.session.auth.username = myuser
node.session.auth.password = mypassword

# CHAP for discovery sessions
discovery.sendtargets.auth.authmethod = CHAP
discovery.sendtargets.auth.username = discuser
discovery.sendtargets.auth.password = discpassword
```

### iSCSI target (server)

Before kernel 2.6.38 the standard was STGT/TGT. From 2.6.38 the standard Linux target is **LIO** (linux-iscsi.org), which supports Fibre Channel, FCoE, iSCSI, iSER, SRP, USB, and other fabric protocols.

#### Legacy: tgtd / tgt

Target configuration file:

```
/etc/tgt/targets.conf
```

Example with two LUNs:

```xml
<target iqn.2008-09.com.example:server.target1>
    backing-store /srv/images/iscsi-share.img
    direct-store /dev/sdd
</target>
```

`backing-store` points to a file or block device; `direct-store` passes local SCSI device parameters (serial number, vendor) directly into the iSCSI LUN.

Service management:

```bash
service tgtd start
service tgtd stop
service tgtd force-stop   # immediately drops all sessions
```

#### Modern: LIO + targetcli

```bash
systemctl enable target
targetcli
```

Basic workflow in `targetcli`:

```bash
# 1. Create a backstore
/> cd /backstores/block
/backstores/block> create iscsidisk1 dev=/dev/sde

# 2. Create an IQN for the target
/backstores/block> cd /iscsi
/iscsi> create iqn.2016-02.com.example.server07:iscsidisk1

# 3. Restrict portal to a specific IP (remove 0.0.0.0)
/iscsi> cd iqn.2016-02.com.example.server07:iscsidisk1/tpg1/portals
/iscsi/.../portals> delete 0.0.0.0 3260
/iscsi/.../portals> create 192.168.56.103

# 4. Create a LUN
/iscsi/.../portals> cd ../luns
/iscsi/.../luns> create /backstores/block/iscsidisk1

# 5. Exit (config is saved automatically)
/> exit
```

> **Tip:** targetcli saves configuration to `/etc/target/saveconfig.json` on exit. The last 10 config backups are stored in `/etc/target/backup/`.

> **Warning:** Use only lowercase in backstore names — targetcli behaves unpredictably with uppercase.

After setting up the target, connect from the initiator:

```bash
iscsiadm -m discovery -t sendtargets -p 192.168.56.103
iscsiadm -m node -T iqn.2016-02.com.example.server07:iscsidisk1 \
         -p 192.168.56.103 -l
iscsiadm -m session -P3
```

Discovered iSCSI entries are stored in:

```
/var/lib/iscsi/nodes/
/var/lib/iscsi/send_targets/
```

Initiator IQN is set in:

```
/etc/iscsi/initiatorname.iscsi
```

---

## scsi_id and LUN Persistence

Linux device names (`/dev/sda`, `/dev/sdb`) change between reboots if the disk discovery order changes. LUN persistence solves this: you always reference a disk by a stable name regardless of connection order.

### WWID via /dev/disk/by-id/

Linux automatically creates symlinks in `/dev/disk/by-id/` where the link name contains the device's WWID:

```bash
ls -l /dev/disk/by-id/
# scsi-3600508b400105e210000900000490000 -> ../../sda   (page 0x83)
# scsi-SSEAGATE_ST373453LW_3HW1RHM6     -> ../../sda   (page 0x80)
```

There are two WWID types: page 0x83 and page 0x80. Any SCSI device has one of them.

### scsi_id

The `scsi_id` utility retrieves the WWID directly from the device via an inquiry command.

By default `scsi_id` does not show devices not in its whitelist. To get the WWID of any device, use the `-g` flag.

```bash
# Get WWID (modern syntax)
/sbin/scsi_id -g -u -d /dev/sdc
# 3200049454505080f

# Old sysfs syntax (RHEL5 and older)
scsi_id -g -u -s /block/sdc
```

To avoid specifying `-g` every time, edit `/etc/scsi_id.conf`: remove the `options=-b` line and add `options=-g`.

### LUN persistence via udev

After obtaining the WWID, create a rule in `/etc/udev/rules.d/20-names.rules`:

```
KERNEL="sd*", BUS="scsi", PROGRAM="/sbin/scsi_id -g -u -d /dev/$parent", RESULT="3200049454505080f", NAME="bookone"
```

Now every time this disk connects, udev compares the `scsi_id` result to the specified RESULT and creates a device named `bookone`, regardless of which `/dev/sd*` the kernel assigns.

> **Note:** On RHEL6 and newer use `-d /dev/$parent` instead of `-s /block/$parent`, as new `scsi_id` versions do not accept sysfs paths.

### Multipath

If a device has multiple paths (different NICs or HBAs), device-mapper-multipath uses the WWID to merge them into a single pseudo-device:

```
/dev/mapper/3600508b400105df70000e00000ac0000
```

With `user_friendly_names` enabled, the device gets a name like `/dev/mapper/mpath0`, and the WWID mapping is stored in:

```
/etc/multipath/bindings
```

Show all paths to a device:

```bash
multipath -l
```

#### Persistent alias in /etc/multipath.conf

Assign a human-readable name via an alias. This works even with a single path — just add the WWID and alias:

```
multipaths {
    multipath {
        wwid    3600a0b80001327510000015427b625e
        alias   backupdisk
    }
}
```

The device is always accessible as `/dev/mpath/backupdisk`.

---

## WWID, WWN, LUN, IQN

| Identifier | Expansion | Purpose |
|---|---|---|
| WWID | World Wide Identifier | Unique SCSI device ID (synonym for WWN) |
| WWN | World Wide Name | Unique SCSI device ID (synonym for WWID) |
| LUN | Logical Unit Number | Logical device number on a target |
| IQN | iSCSI Qualified Name | Unique address identifying both the target server AND the disk |
| scsi_id | Utility | Retrieves the unique ID of a SCSI device |

> **Important:** IQN identifies both the iSCSI target server and the disk it offers. WWID and WWN uniquely identify only the disk, not the server.

Example IQN:

```
iqn.2003-01.org.linux-iscsi.server1.x8664:sn.abc123
```

---

## SAN

SAN (Storage Area Network) is a dedicated high-speed network for access to disk storage. Disks in a SAN appear to the server as locally attached.

| Protocol | Description |
|---|---|
| Fibre Channel (FC) | Requires special hardware; high speed |
| FCoE | Fibre Channel over Ethernet — FC over standard Ethernet |
| AoE | ATA over Ethernet — ATA commands directly over Ethernet |
| iSCSI | SCSI over IP; works on ordinary infrastructure |

> **Note:** AoE and FCoE work only on local networks because they do not support routing. iSCSI can work over WAN and the Internet.

---

## Exam Cheat Sheet

### Files and Paths

| File / path | Purpose |
|---|---|
| `/etc/iscsi/iscsid.conf` | iSCSI initiator configuration (RHEL) |
| `/etc/iscsi/initiatorname.iscsi` | Initiator IQN |
| `/etc/tgt/targets.conf` | Target configuration (legacy tgtd/TGT) |
| `/etc/target/saveconfig.json` | Target configuration (modern LIO/targetcli) |
| `/var/lib/iscsi/nodes/` | Discovered iSCSI node records |
| `/var/lib/iscsi/send_targets/` | Discovery session records |
| `/dev/disk/by-id/` | WWID → /dev/sd* symlinks |
| `/etc/scsi_id.conf` | scsi_id configuration (whitelist / default -g) |
| `/etc/udev/rules.d/20-names.rules` | udev rules for LUN persistence |
| `/etc/multipath/bindings` | WWID → mpath name mapping |
| `/etc/udev/rules.d/50-hdparm.rules` | Persistent hdparm settings via udev |
| `/proc/interrupts` | Interrupt table (current distribution) |
| `/proc/irq/<N>/smp_affinity` | IRQ balancing bitmask |
| `/etc/sysctl.conf` | Persistent kernel parameters |
| `/etc/multipath.conf` | Multipath configuration, aliases |

### Key Commands

```bash
# hdparm
hdparm -I /dev/sda             # detailed disk info
hdparm -tT /dev/sda            # speed test (disk + cache)
hdparm -d 1 /dev/sda           # enable DMA
hdparm -W 1 /dev/sda           # enable write-caching

# sdparm
sdparm /dev/sda                # common mode parameters
sdparm --all /dev/sda          # all recognized fields
sdparm --command stop /dev/sda # stop the spindle

# tune2fs
tune2fs -m 1 /dev/sda1         # reserve 1% of blocks
tune2fs -e remount-ro /dev/sda1  # behavior on FS error

# sysctl
sysctl -a                      # all kernel parameters
sysctl -w vm.swappiness=10     # set a parameter
sysctl -p /etc/sysctl.conf     # load from file
echo 32 > /proc/irq/13/smp_affinity  # route IRQ13 to CPU5

# iSCSI
iscsiadm -m discovery -t sendtargets -p 192.168.1.100
iscsiadm -m node -T iqn... -p 192.168.1.100 -l
iscsiadm -m session -P3
/etc/init.d/iscsi restart

# targetcli (LIO target)
targetcli
systemctl enable target

# tgtd (legacy TGT target)
service tgtd start
service tgtd force-stop

# scsi_id
/sbin/scsi_id -g -u -d /dev/sdc

# multipath
multipath -l

# NVMe
nvme help
nvme smart-log /dev/nvme0

# TRIM
fstrim /
```

### Common Exam Traps

- `sdparm` without options shows **common mode parameters**. `--all` shows all fields — not the same.
- `hdparm` changes are **temporary**. Without `/etc/udev/rules.d/50-hdparm.rules` they disappear on reboot.
- iSCSI entries in `/etc/fstab` **must** have the `_netdev` option. Without it the system hangs at boot trying to mount the volume before the network is up.
- WWID and WWN identify the disk; IQN identifies both the target server and the disk. Different exam answers.
- NVMe naming: disk from 0, namespace and partition from 1. Second disk, first namespace, first partition = `/dev/nvme1n1p1`.

---

## Practice Questions

**Q1.** Which command shows the **disk** read speed (not cache) for `/dev/sdb`?

**Answer:** `hdparm -t /dev/sdb` — lowercase `-t` tests buffered disk reads. Uppercase `-T` tests cache reads.

---

**Q2.** An administrator runs `sdparm /dev/sdc` without parameters. What is displayed?

**Answer:** All **common mode parameters** of the device. `--all` would show all recognized fields (different output).

---

**Q3.** Which file must be created to make `hdparm` settings persist across reboots?

**Answer:** `/etc/udev/rules.d/50-hdparm.rules` — hdparm settings are applied at boot via udev rules.

---

**Q4.** What does `/dev/nvme1n3p2` mean?

**Answer:** Second NVMe disk (`nvme1`, numbered from 0), third namespace (`n3`, from 1), second partition (`p2`, from 1).

---

**Q5.** Which identifier simultaneously points to both the iSCSI target server and the disk it offers?

**Answer:** **IQN** (iSCSI Qualified Name). WWID and WWN uniquely identify only the disk.

---

**Q6.** An admin added an iSCSI disk to `/etc/fstab`. The system hangs at boot before the disk is mounted. What is most likely wrong?

**Answer:** The `_netdev` option is missing. Without it the system tries to mount the device before the network is up. Adding `_netdev` delays the mount until network initialization is complete.

---

**Q7.** Which utility manages NVMe disks and retrieves SMART logs from them?

**Answer:** `nvme` (from the `nvme-cli` package). `smartctl` does not work with NVMe because there is no AHCI or SCSI interface.

---

**Q8.** What percentage of blocks does `tune2fs` reserve by default, and how do you change it to 1%?

**Answer:** **5%** by default. Change with `tune2fs -m 1 /dev/sda1`.
