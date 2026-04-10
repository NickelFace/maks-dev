---
title: "LPIC-2 203.3 — Creating and Configuring Filesystem Options"
date: 2026-04-10
description: "AutoFS auto-mounting, ISO9660 extensions (Rock Ridge/Joliet/El Torito), UDF, mkisofs/cdrecord, dm-crypt, LUKS, eCryptfs, and systemd automount units. LPIC-2 exam topic 203.3."
tags: ["Linux", "Filesystem", "LPIC-2", "AutoFS", "LUKS", "ISO9660", "UDF", "encryption"]
categories: ["LPIC-2"]
---

> **Exam topic 203.3** — Creating and Configuring Filesystem Options. Covers AutoFS, ISO9660 and its extensions, UDF, ISO image creation with mkisofs/cdrecord, and encrypted filesystems (dm-crypt, LUKS, eCryptfs).

---

## AutoFS — Automatic Mounting

AutoFS mounts and unmounts filesystems on demand, without administrator intervention. When a user accesses a directory, the `automount` daemon mounts the required device. When the device is idle for a configured period, AutoFS unmounts it automatically.

AutoFS is useful in two scenarios: network environments where NFS servers are not always available, and for removable media such as CD-ROM or USB.

> **Important for the exam:** AutoFS mounts a resource only when you access the **pseudo-directory directly**. Running `ls /var/autofs/floppy` shows nothing; running `ls /var/autofs/floppy/floppy` triggers the mount.

AutoFS has two parts: a kernel component and the `automount` daemon. The daemon reads configuration files and delegates mount tasks to the kernel.

---

## AutoFS Configuration: auto.master

The main AutoFS configuration file, `/etc/auto.master`, is called the **master map**. It contains lines with three space-separated fields:

```
# Format: <mount-point> <map-file> [options]
/var/autofs/floppy   /etc/auto.floppy   --timeout=2
/var/autofs/cdrom    /etc/auto.cdrom    --timeout=6
/home                /etc/auto.home     --timeout=60
```

| Field | Description |
|---|---|
| Mount point | Directory where pseudo-directories will appear |
| Map file | Path to a subordinate file describing devices |
| Options | e.g. `--timeout=N` — idle seconds before unmounting |

> **Warning:** AutoFS will not reload or restart if the mount point is busy. Check for active processes in the directory before running `reload`.

Each entry in `auto.master` starts its own `automount` daemon instance. Keeping each device in a separate map file is recommended: if one daemon hangs, the other devices continue working.

---

## Subordinate Map Files

Subordinate files (`/etc/auto.[dir]`) describe specific devices. Each line has three fields:

```
# Format: <pseudo-dir> <mount-options> <device>
floppy   -user,fstype=auto   :/dev/fd0
cdrom    -ro,fstype=iso9660  :/dev/cdrom
```

```
# /etc/auto.home — NFS example
*   -fstype=nfs4,rw   server.example.com:/home/&
```

| Field | Description |
|---|---|
| Pseudo-directory | Name that appears inside the mount point |
| Options | Mount parameters, same as `mount -o` options |
| Device | Local device (`:/dev/fd0`) or NFS share (`server:/share`) |

> **Note:** For local devices the path starts with a colon: `:/dev/fd0`. For NFS, the colon separates host from path: `server:/share`.

Configuration files are re-read on daemon reload:

```bash
/etc/init.d/autofs reload
# or
systemctl reload autofs
```

---

## Map File Types

`auto.master` supports three map types:

| Type | Description | Example entry |
|---|---|---|
| Direct map | Mount using absolute paths | `/- /etc/auto.direct` |
| Indirect map | Mount under a specified parent directory | `/home /etc/auto.home` |
| Built-in map | AutoFS built-in maps, e.g. `+auto.master` | `+dir:/etc/auto.master.d` |

Example direct map (`/etc/auto.direct`):

```
/mnt/projectx   -fstype=nfs4,rw   server:/tmp/projectx
/mnt/projecty   -fstype=nfs4,rw   server:/tmp/projecty
```

Including nested master files:

```
+dir:/etc/auto.master.d
```

> **Important:** If AutoFS reports `unable to read auto.master` on startup, comment out the `+auto.master` line in `/etc/auto.master` with `#`.

---

## AutoFS and systemd

On systemd systems, automounting is configured via unit files with the `.automount` extension. The filename reflects the mount point path (same naming convention as `.mount` units). For the mount point `/mnt` the file is `mnt.automount`.

A `.automount` unit works alongside a same-named `.mount` unit. systemd registers the mount point as `autofs` type and waits for the first access. When a process accesses the directory (e.g. `ls /mnt`), systemd immediately performs the mount via the paired `.mount` unit.

```ini
# /etc/systemd/system/mnt.automount
[Unit]
Description=My new automounted file system.

[Automount]
Where=/mnt

[Install]
WantedBy=multi-user.target
```

The paired `.mount` unit describes the actual mount:

```ini
# /etc/systemd/system/mnt.mount
[Unit]
Description=My new file system

[Mount]
What=/dev/sdb1
Where=/mnt
Type=ext4
Options=

[Install]
WantedBy=multi-user.target
```

Full setup sequence:

```bash
# 1. Enable and start the automount unit
systemctl enable mnt.automount
systemctl start mnt.automount

# 2. Check status — unit will be "active (waiting)"
systemctl status mnt.automount

# 3. After start, mount shows the point as autofs but the disk is not yet mounted
#    systemd-1 on /mnt type autofs (rw,relatime,...)
mount | grep mnt

# 4. Access the directory — this triggers the mount
ls /mnt

# 5. Now lsblk and mount show the real disk on /mnt
lsblk
mount | grep mnt
```

> **Important:** After `systemctl start mnt.automount`, the mount point is registered as `autofs` but the physical disk is not yet mounted. `lsblk` shows an empty `MOUNTPOINT`. Only after the first access to `/mnt` does systemd perform the actual mount.

| `.automount` option | Required | Description |
|---|---|---|
| `Where=` | Yes | Mount point path |
| `DirectoryMode=` | No | Permissions for created directories, default 0755 |
| `TimeoutIdleSec=` | No | Idle time before unmounting; disabled by default |

---

## CD-ROM Filesystems

Three optical media filesystem types are tested on the exam:

| Type | Description |
|---|---|
| ISO9660 | Standard for CD-ROM; supports filenames up to 8.3 (DOS format) |
| UDF (Universal Disk Format) | Modern OSTA standard for all optical media; designed to replace ISO9660 |
| HFS (Hierarchical File System) | Apple filesystem, used on Mac-compatible CDs |

---

## ISO9660 and Extensions

ISO9660 itself is limited to 8.3 filenames and lacks Unix permissions. Extensions were added to address this:

| Extension | Purpose |
|---|---|
| **Rock Ridge** | Unix extension: long filenames, permissions, and symbolic links. Required for Linux to read CDs with Unix-style names. |
| **Joliet** | Microsoft extension: filenames up to 64 Unicode characters; makes the disc readable on Windows. |
| **El Torito** | Extension for creating bootable CD-ROMs. Without it, the disc cannot be used as a boot medium. |

> **Important for the exam:** El Torito, Joliet, and Rock Ridge are **extensions** of ISO9660. UDF is a completely **separate and independent filesystem**. Do not confuse them.

---

## UDF

UDF is standardized by OSTA (Optical Storage Technology Association). It works with CD-R, CD-RW, and DVD, including video DVDs.

Tools from the `udftools` package:

| Utility | Purpose |
|---|---|
| `mkudffs` | Create a new UDF filesystem on a disk or CD-R/RW |
| `udffsck` | Check integrity and repair errors on UDF partitions |
| `wrudf` | Interactive shell for UDF maintenance: cp, rm, mkdir, etc. |
| `cdrwtool` | Manage CD-RW drives: formatting, speed settings |

---

## mkisofs — Creating ISO Images

`mkisofs` creates ISO images from directories. On newer distributions it is replaced by `genisoimage`, but the syntax is compatible.

```bash
# Create a simple ISO image
mkisofs -r -o cd_image.iso /path/to/private_collection/

# With Joliet and Rock Ridge (Windows and Linux compatible)
mkisofs -r -J -o image.iso /path/to/files/

# Create a bootable ISO (El Torito)
mkisofs -r -b boot/grub/stage2_eltorito \
        -no-emul-boot -boot-load-size 4 \
        -boot-info-table -c boot/boot.catalog \
        -o bootable.iso /path/to/files/
```

Key `mkisofs` options:

| Option | Description |
|---|---|
| `-o filename` | Output ISO filename |
| `-r` | Rock Ridge + change permissions to root/public readable |
| `-R` | Rock Ridge without changing file permissions |
| `-J` | Joliet extensions (Windows compatibility) |
| `-b file` | El Torito: boot image for a bootable CD |
| `-c file` | El Torito: boot catalog file (required with `-b`) |
| `-no-emul-boot` | El Torito: no disk emulation mode at boot |
| `-boot-load-size N` | El Torito: boot sector size, recommended value 4 |
| `-hfs` | Create a hybrid ISO9660/HFS image for Mac |
| `-udf` | Add UDF support (for video DVDs) |

> **Note:** `mkisofs` cannot write to a CD drive directly. Use `cdrecord` for writing. This separation is intentional: create the image first, verify it, then write. Three reasons: `mkisofs` has no knowledge of CD writers; direct writing is unreliable on slow machines; and the image should be verified before committing to disc.

---

## Testing an ISO Image

Linux can mount an ISO file as a loop device without writing it to disc, allowing you to verify the directory structure and permissions before burning.

```bash
# Mount an ISO image as a loop device
mount -t iso9660 -o ro,loop=/dev/loop0 cd_image /cdrom

# Inspect contents
ls /cdrom

# Unmount after verification
umount /cdrom
```

---

## Writing an Image to CD

`cdrecord` writes an image to a SCSI CD writer. First find the device coordinates with `cdrecord -scanbus` (BUS, ID, LUN), then use them for writing.

```bash
# Find CD writer coordinates
cdrecord -scanbus

# Write an image (dev=BUS,ID,LUN)
cdrecord -v speed=2 dev=0,6,0 -data cd_image

# Rewrite a CD-RW (erase first)
cdrecord -v speed=2 dev=0,6,0 blank=fast -data cd_image
```

On a fast enough machine you can pipe `mkisofs` output directly into `cdrecord` without creating an intermediate file. You must pre-calculate the image size:

```bash
# Step 1: determine image size (dry run)
IMG_SIZE=`mkisofs -R -q -print-size private_collection/ 2>&1 | sed -e "s/.* = //"`

# Step 2: create image and write via pipe
mkisofs -r private_collection/ | cdrecord speed=2 dev=0,6,0 tsize=${IMG_SIZE}s -data -
```

> **Warning:** CD writing must not be interrupted. Even deleting a large file during a write can break the data stream and ruin the disc: deleting a 650-MB file causes the kernel to update metadata for 650,000 blocks, temporarily stalling disk activity.

---

## Copying a CD

With separate CD-ROM and CD-writer drives:

```bash
cdrecord -v dev=0,6,0 speed=2 -isosize /dev/scd0
```

With only one drive — read to file first, then write:

```bash
# Read CD contents into a file
dd if=/dev/scd0 of=cdimage

# Write the saved image to a blank CD
cdrecord -v speed=2 dev=0,6,0 -data cdimage
```

> **Note:** A file created with `dd if=/dev/scd0` is equivalent to `mkisofs` output. Both methods produce an image suitable for writing with `cdrecord`.

---

## Encrypted Filesystems

Linux supports several symmetric encryption algorithms:

| Algorithm | Notes |
|---|---|
| AES (Rijndael) | NIST standard; 128-bit block; 128/192/256-bit key. Intel hardware acceleration via AES-NI since 2010. |
| Twofish | AES candidate; 128-bit block, key up to 256 bits. Lost to Rijndael on performance. |
| DES | Obsolete standard; 56-bit key. Considered insecure — brute-forced quickly. |

> **Important:** Check AES-NI support in the CPU: `grep aes /proc/cpuinfo`. Check kernel support: `sort -u /proc/crypto | grep module`. Load the driver: `modprobe aesni-intel`.

Three encryption mechanisms are required for the exam:

| Type | Level | Notes |
|---|---|---|
| dm-crypt | Block device | Single key, no metadata, experts only |
| LUKS | Block device | Up to 8 keys, metadata in partition header, recommended |
| eCryptfs | File level | Stacks over an existing FS, encrypts each file separately, metadata in file header |

The **Device Mapper** is a general Linux kernel mechanism for mapping one block device to another. It is used by LVM, software RAID, and encryption. The virtual device appears in `/dev/mapper`; all data passes through an encrypt/decrypt filter before hitting the physical disk.

---

## dm-crypt

dm-crypt encrypts an entire block device. It stores no metadata — if the passphrase is lost, data cannot be recovered. After encryption the partition is indistinguishable from a disk of random data, providing plausible deniability.

```bash
# Load required modules at startup
echo aes >> /etc/modules
echo dm_mod >> /etc/modules
echo dm_crypt >> /etc/modules
modprobe -a aes dm_mod dm_crypt

# Create an encrypted device and set a passphrase
cryptsetup -y create crypt /dev/hda3

# Add to crypttab and fstab for auto-unlock at boot
echo "crypt /dev/hda3 none none" >> /etc/crypttab
echo "/dev/mapper/crypt /crypt reiserfs defaults 0 1" >> /etc/fstab

# Create a filesystem on the encrypted device
mkfs.reiserfs /dev/mapper/crypt

# Mount (will prompt for passphrase on every boot)
mkdir /crypt
mount /crypt
```

> **Warning:** dm-crypt is intended for experienced users. For everyone else, LUKS is recommended. Losing the passphrase means permanent data loss — there is no metadata to fall back on.

---

## LUKS

LUKS (Linux Unified Key Setup) is the preferred encryption method on modern Linux systems. It stores metadata and cryptographic parameters in the partition header, making it easy to transfer data between systems. Supports **up to 8 keys** per partition (key escrow). On the exam LUKS is sometimes called **dm-crypt/LUKS**.

```bash
# Step 1: create a container file (512 MiB)
dd if=/dev/urandom of=/root/encrypted bs=1M count=512

# Step 2: format as LUKS (will prompt for confirmation and passphrase)
cryptsetup -y luksFormat encrypted

# Step 3: open the container under the name "encrypted"
cryptsetup luksOpen encrypted encrypted

# Step 4: create a filesystem on the opened device
mkfs.ext4 /dev/mapper/encrypted

# Step 5: mount for use
mount /dev/mapper/encrypted /mnt

# Step 6: unmount and close the container
umount /mnt
cryptsetup luksClose /dev/mapper/encrypted
```

View LUKS container information:

```bash
cryptsetup luksDump /dev/sdb1
```

---

## eCryptfs

eCryptfs layers on top of an existing filesystem. Two mounts are required: first a standard `mount` for the partition, then a `mount` with `ecryptfs` type.

```bash
# First mount: mount the partition normally
mount /dev/sdb1 /mnt/data

# Second mount: add the encryption layer
mount -t ecryptfs /mnt/data /mnt/data
```

Encryption is per-file; metadata is stored in each file's header. Encrypted files can be transferred between systems.

> **Note:** eCryptfs can be added to `/etc/fstab` for auto-mounting. Additional documentation: `man 7 ecryptfs`.

---

## Utilities: dd and mke2fs

`dd` is a general-purpose low-level data copy tool. It operates on fixed-size blocks.

```bash
# Create a file filled with random data (512 MiB)
dd if=/dev/urandom of=/root/encrypted bs=1M count=512

# Back up the MBR
dd if=/dev/sda of=/backup/mbr.bin bs=512 count=1

# Full disk copy
dd if=/dev/sda of=/dev/sdb bs=64K

# Create an empty container of a given size
dd if=/dev/zero of=/tmp/container bs=1M count=100
```

`mke2fs` creates ext2/ext3/ext4 filesystems:

```bash
# Create ext2
mke2fs /dev/sdb1

# Create ext4 (recommended)
mke2fs -t ext4 /dev/sdb1

# Create ext4 with a label
mke2fs -t ext4 -L "mydata" /dev/sdb1

# Equivalent via mkfs
mkfs.ext4 /dev/sdb1
```

> **Note:** `mke2fs -t ext4` and `mkfs.ext4` produce identical results. Both forms appear on the exam.

---

## Exam Cheat Sheet

### Paths and Files

| Path | Purpose |
|---|---|
| `/etc/auto.master` | Main AutoFS configuration (master map) |
| `/etc/auto.[dir]` | Subordinate map files for specific mount points |
| `/etc/sysconfig/autofs` | AutoFS behavior config (RHEL/CentOS) |
| `/etc/default/autofs` | AutoFS behavior config (Debian/Ubuntu) |
| `/etc/auto.master.d/` | Directory for nested master files |
| `/etc/crypttab` | Encrypted partition definitions for auto-unlock |
| `/etc/systemd/system/` | Directory for `.mount` and `.automount` unit files |

### Key Commands

```bash
# AutoFS
systemctl start|stop|reload autofs
/etc/init.d/autofs reload

# ISO images
mkisofs -r -J -o image.iso /source/dir/
mount -t iso9660 -o ro,loop=/dev/loop0 cd_image /cdrom
cdrecord -scanbus
cdrecord -v speed=2 dev=0,6,0 -data cd_image
dd if=/dev/scd0 of=cdimage

# UDF
mkudffs /dev/sdb1
udffsck /dev/sdb1

# dd and mke2fs
dd if=/dev/urandom of=file bs=1M count=512
mke2fs -t ext4 /dev/sdb1

# LUKS
cryptsetup luksFormat /dev/sdb1
cryptsetup luksOpen /dev/sdb1 myname
cryptsetup luksClose myname
cryptsetup luksDump /dev/sdb1
```

### Common Exam Traps

- AutoFS filesystems must **not** be listed in `/etc/fstab`. Duplicate entries cause problems on reboot.
- UDF is a **separate filesystem**, not an ISO9660 extension. El Torito, Joliet, and Rock Ridge are extensions of ISO9660.
- `cdrecord` writes an image but does not create it. `mkisofs` creates an image but does not write it.
- Keep each device in a separate map file. One hung daemon can block all devices from the same file.
- `mkisofs` without `-r` or `-R` creates a CD with the source directory's permissions, not publicly readable ones.

---

## Practice Questions

**Q1.** An administrator wants to auto-mount the NFS directory `/export/data` from server `fileserver` at `/mnt/data` via AutoFS. Which file should be edited first?

**Answer:** `/etc/auto.master` — add a line mapping the mount point to a map file. Then create the map file itself.

---

**Q2.** The file `/etc/auto.floppy` contains `floppy -user,fstype=auto :/dev/fd0`. What happens when a user runs `ls /var/autofs/floppy`?

**Answer:** **Nothing** — the pseudo-directory `floppy` is not visible when listing the parent directory. The mount is triggered only on direct access: `ls /var/autofs/floppy/floppy`.

---

**Q3.** Which ISO9660 extension is used for creating bootable CD-ROMs?

**Answer:** **El Torito**. Rock Ridge adds Unix attributes; Joliet adds Windows compatibility; UDF is a separate filesystem.

---

**Q4.** Which filesystem encryption method stores metadata in the volume header and supports up to 8 keys?

**Answer:** **LUKS**. dm-crypt has no metadata at all. eCryptfs operates at the file level, not the volume level.

---

**Q5.** An administrator created an ISO image and wants to verify its contents without burning it to disc. Which command does this?

**Answer:** `mount -t iso9660 -o ro,loop=/dev/loop0 cd_image /cdrom` — mounts the ISO as a loop device for inspection.

---

**Q6.** What does the `-J` option in `mkisofs -r -J -o disk.iso /data/` do?

**Answer:** Enables **Joliet extensions** for Windows compatibility with Unicode filenames up to 64 characters. `-r` enables Rock Ridge; `-b` is for El Torito; `-hfs` is for HFS.

---

**Q7.** `/etc/auto.master` contains `/home /etc/auto.home --timeout=300`. What happens to a mounted home directory after the user has not accessed it for 5 minutes?

**Answer:** It is **automatically unmounted**. `--timeout=300` means 300 seconds (5 minutes) of idle time. On next access, AutoFS mounts it again automatically.

---

**Q8.** What does a `.automount` unit file in systemd contain?

**Answer:** A `[Automount]` section with the required `Where=` parameter. It works alongside a same-named `.mount` unit that describes what to mount and how.
