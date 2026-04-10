---
title: "LPIC-2 206.2 — Backup Operations"
date: 2026-04-10
description: "Backup types (full/incremental/differential), storage media, tar (incremental with .snar), rsync, dd, cpio, mt and tape devices, Amanda/Bacula/Bareos/BackupPC. LPIC-2 exam topic 206.2."
tags: ["Linux", "LPIC-2", "backup", "rsync", "tar", "Amanda", "Bacula", "Bareos"]
categories: ["LPIC-2"]
---

> **Exam topic 206.2** — Backup Operations (weight: 3). Covers backup strategy, backup types, storage media selection, and the tools used to create, verify, and restore backups.

---

## Why Backups Matter

RAID arrays and cloud storage protect against only one cause of data loss — hardware failure. Human error, software bugs, natural disasters, and deliberate data destruction all fall outside the protection RAID provides.

The rule is simple: every server requires regular backups. The exception is cluster nodes that can simply be reinstalled from scratch on failure — it is the computation results that matter, not the nodes themselves.

---

## Backup Strategy

### What to Back Up

The correct answer always comes from a risk analysis, not from a habit of copying everything. Large data volumes increase backup and recovery time, so only back up what is genuinely needed to restore system operation.

Obvious candidates: user files in `/home` and system configuration in `/etc`. Grey zones include `/var` (logs, spool, mail) — you decide what is important. When in doubt, back it up.

### How Often

The answer depends on how fast data changes. Determine what volume of data loss is acceptable without serious consequences, then calculate how long it takes to accumulate that much change. Minimum one backup per that interval.

Classic scheme: incremental backup nightly, full backup on weekends. Today systems run 24/7, so a common approach is snapshot to disk followed by tape write while production is running.

### How to Verify Backups

Two mandatory steps in any strategy:

**Backup verification:** the most reliable method is to read the entire backup and compare it with the original. A faster practical approach is to create a table of contents with file checksums during backup, then compare with what was actually written.

**Recovery procedure testing:** you must have a written recovery procedure. Test it with a real restore every few months. If you have never tested it, assume you have no backup.

### Where to Store

At minimum two sets of media. Keeping both in the same building is pointless — any disaster will destroy both system and backup simultaneously. Keep at least one set off-site. Encrypt sensitive data on external media. Store a copy of the backup plan alongside the backups.

> **Warning:** Recovery time matters. In some environments recovery takes hours due to slow network connections. If the acceptable downtime is less than the recovery time, backups alone are not enough — consider clustered failover solutions.

> **Important:** The goal of backup is to restore the system as quickly as necessary. Anything that does not help achieve this goal does not need to be backed up.

---

## Which Directories to Include

| Directory | Include | Notes |
|---|---|---|
| `/bin` | Yes | Utilities needed for full recovery |
| `/boot` | Yes | Bootloader and kernel |
| `/etc` | Yes | System configuration files |
| `/home` | Yes | User files |
| `/lib`, `/lib64` | Yes | Libraries |
| `/opt` | Yes | Third-party applications |
| `/root` | Yes | Root's home directory |
| `/srv` | Yes | Service data |
| `/usr` | Yes | Binaries, documentation, source |
| `/var` | Yes (partial) | Logs, mail, spool. `/var/run` can be excluded |
| `/dev` | No | Virtual device filesystem |
| `/proc` | No | Kernel virtual filesystem |
| `/run` | No | Runtime temporary data |
| `/sys` | No | Hardware virtual filesystem |
| `/tmp` | No | Temporary files |

---

## Backup Types

| Type | Description | Pros | Cons |
|---|---|---|---|
| Full | All data copied | Simple recovery | Time and space intensive |
| Incremental | Only changes since the last backup of any type | Fast, less space | Recovery requires the full chain |
| Differential | Only changes since the last full backup | Simpler recovery than incremental | Grows over time |
| Snapshot | Full backup + pointer table, then incremental | Saves space | More complex to implement |

> **Important:** For the exam — Incremental copies changes since the last backup OF ANY TYPE. Differential copies changes since the last FULL backup only. This difference is frequently tested.

---

## Backup Storage Media

### Magnetic Tape

Tape is widely used in enterprise environments because of cost — per gigabyte it is cheaper than any alternative. Data is stored passively without power, reducing failure risk during storage.

Main downside: sequential access. To reach a specific file, the tape must rewind to the right position. With many small files the tape constantly stops, starts, and partially rewinds. Tape is ideal for long-term archiving and where recovery speed is not critical.

### Disk

A local disk is rarely used as the primary backup medium but is often used as a buffer between the backup system and a remote storage server. Advantage: fast recovery of recent files. Disadvantage: a constantly powered disk fails far more often than passive tape.

Inexpensive portable USB drives solve this for small systems — easy to take off-site.

### Optical Media (CDR/DVD/BD)

Good for systems that change infrequently. Classic use case: write a full system image for quick recovery. Optical discs are cheap, reliable when stored correctly, and easy to transport.

Downsides: most are write-once, limited capacity, moderate speed.

### Network Storage (NAS/SAN)

NAS/SAN provides high availability, deduplication, and data compression. Most modern systems can emulate tape devices, simplifying migration from tape. Bandwidth is generally high.

Downsides: high cost, constant power consumption, unsuitable for long-term archiving.

**Media comparison:**

| Medium | Cost | Speed | Off-site | Long-term | Notes |
|---|---|---|---|---|---|
| Tape | Very low | Low (sequential) | Easy | Excellent | Best for archives |
| Local HDD | Medium | High | Inconvenient | Poor | Good as a buffer |
| USB drive | Medium | Medium/High | Easy | Good | Convenient for small systems |
| CDR/DVD/BD | Low | Medium | Easy | Good | Write-once, small capacity |
| NAS/SAN | High | High | Difficult | Poor | For operational access |

---

## Backup Utilities

### tar

`tar` (Tape ARchive) combines multiple files and directories into a continuous byte stream. This stream can be compressed, written to a file, or directly to tape.

By default `tar` works with a tape device. To write to a file, specify the filename explicitly with `-f`.

**Creating backups:**

```bash
# Full backup of /home with gzip compression
tar -czf /backup/home_full.tar.gz /home

# Full backup with bzip2
tar -cjf /backup/home_full.tar.bz2 /home

# Full backup with xz
tar -cJf /backup/home_full.tar.xz /home

# Write directly to tape /dev/st0
tar -cvf /dev/st0 /home

# Incremental backup (creates/updates .snar snapshot file)
tar -czf /backup/home_inc.tar.gz \
    --listed-incremental=/backup/home.snar /home
```

**Viewing archive contents:**

```bash
tar -tzf /backup/home_full.tar.gz   # list files
tar -tvf /backup/home_full.tar.gz   # detailed list
```

**tar options for creating archives:**

| Option | Description |
|---|---|
| `-c` | Create archive |
| `-f <file>` | Archive filename |
| `-v` | Verbose output |
| `-z` / `--gzip` | gzip compression |
| `-j` / `--bzip2` | bzip2 compression |
| `-J` / `--xz` | xz compression |
| `-g <file>` / `--listed-incremental` | Incremental backup with snapshot file |
| `-W` / `--verify` | Verify archive immediately after creation (non-tarball only) |
| `-d` / `--diff` / `--compare` | Compare archive with files on disk |

> **Warning:** The `--verify` (`-W`) flag does NOT work with tarballs (compressed archives). To verify a compressed backup, create the archive without compression, verify it, then compress separately.

> **Important:** The snapshot file for tar incremental backups must have the `.snar` extension. This is a frequent exam question.

### rsync

`rsync` synchronizes files between two locations. It analyzes existing files at the destination and transfers only changed parts, making it very fast for repeated backups.

Source and destination can be local or remote. For remote transfer over SSH, files are encrypted in transit.

```bash
rsync -av /home /backup/                         # local backup
rsync -ah --progress /home /backup/              # with progress
rsync -av /home user@remotehost:~/backup/        # remote via SSH
rsync -av -e ssh /home user@remotehost:~/backup/ # explicit SSH
rsync -av --delete /home /backup/                # mirror (delete removed files)
rsync -av --exclude='/home/user/tmp' /home /backup/  # exclude a directory
```

> **Warning:** `rsync://remotehost:/path` uses the rsync daemon without encryption. For secure transfer use `user@host:/path` format, which routes rsync over SSH.

> **Important:** By default rsync copies new and changed files but does NOT delete files that were removed from the source. Use `--delete` for mirroring.

**rsync options:**

| Option | Description |
|---|---|
| `-a` / `--archive` | Equivalent to `-rlptgoD`. Recursive, preserve permissions, timestamps, symlinks |
| `-v` | Verbose output |
| `-h` | Human-readable output |
| `--progress` | Transfer progress |
| `--delete` | Delete at destination files that no longer exist at source |
| `-e ssh` | Use SSH for encrypted transfer |
| `--exclude` | Exclude files/directories by pattern |

### dd

`dd` copies data at the byte level. It is used for creating exact byte-for-byte images of partitions and disks, and is often used in digital forensics.

```bash
dd if=/dev/sda1 of=/backup/sda1.img bs=1024 count=1048576  # image a 1 GB partition
dd if=/dev/sda of=/backup/sda_full.img bs=4M                # copy entire disk
dd if=/backup/sda1.img of=/dev/sda1 bs=1024                 # restore image
dd if=/dev/zero of=/dev/sda bs=1M                           # wipe disk with zeros
dd if=/dev/sda | gzip > /backup/sda.img.gz                  # compressed image
```

| Option | Description |
|---|---|
| `if=` | Input file (file, partition, or disk) |
| `of=` | Output file (file, partition, or disk) |
| `bs=` | Block size — affects speed |
| `count=` | Number of blocks to copy |

> **Warning:** Never use `dd` on a mounted disk. Copying or restoring a mounted partition may corrupt data. Boot from a live CD or unmount the partition first.

> **Note:** `dd` does NOT control magnetic tapes. Use `mt` for tape management.

### cpio

`cpio` copies files to and from archives. It is older than `tar` and can read/write multiple formats including tar and zip. Less common in modern practice but mentioned on the exam.

`cpio` works in three modes:

| Mode | Flag | Description |
|---|---|---|
| Output (create archive) | `-o` | Reads file list from stdin, packs into archive |
| Input (extract) | `-i` | Reads archive and extracts files |
| Pass-through (copy) | `-p` | Reads file list and copies to target directory |

`cpio` reads the file list from stdin. It is usually provided by `find`.

```bash
cd /sue; find . | cpio -o > /backup/sue.cpio       # pack directory
cpio -i < /backup/sue.cpio                          # extract
find /sue -name "*.conf" | cpio -p /backup/configs/ # pass-through copy
find /etc | cpio -ov > /backup/etc.cpio             # verbose pack
```

> **Note:** `tar` has largely replaced `cpio` for general archive work. However `cpio` is still used in some system tools — Linux initramfs images are built with `cpio`.

### mt — Magnetic Tape Control

Tape is a sequential-access device. To reach a specific archive you must pass through all preceding ones sequentially.

**Tape devices:**

| Device | Type | Description |
|---|---|---|
| `/dev/st0`, `/dev/st1` | SCSI | Tape with auto-rewind |
| `/dev/nst0`, `/dev/nst1` | SCSI | Tape without auto-rewind (non-rewinding) |
| `/dev/ht0`, `/dev/ht1` | PATA | Tape with auto-rewind |
| `/dev/nht0`, `/dev/nht1` | PATA | Tape without auto-rewind |

> **Important:** `/dev/st0` rewinds the tape after every operation. `/dev/nst0` does not rewind, which is needed for writing multiple archives to one tape sequentially. Using `/dev/st0` will cause each new `tar` to overwrite from the beginning.

`mt` (magnetic tape control) controls tape directly. Without `-f`, it reads the `$TAPE` environment variable.

```bash
mt -f /dev/nst0 rewind      # rewind tape to start
mt -f /dev/nst0 eject       # rewind and eject tape
mt -f /dev/nst0 fsf 1       # skip forward 1 file mark (next archive)
mt -f /dev/nst0 bsf 2       # skip backward 2 file marks
mt -f /dev/nst0 status      # show tape status
mt -f /dev/nst0 weof        # write end-of-data marker
```

**Example: multiple archives on one tape with nst0**

```bash
tar -cvf /dev/nst0 /home    # write first backup (tape does NOT rewind)
tar -cvf /dev/nst0 /etc     # write second backup right after

mt -f /dev/nst0 rewind      # rewind to start for reading
tar -xvf /dev/nst0           # read first backup
mt -f /dev/nst0 fsf 1       # skip to next archive
tar -xvf /dev/nst0           # read second backup
```

> **Note:** For systems with multiple tape drives (multi-drive SCSI media changers), use `mtx` for loading and unloading tapes, not `mt`.

---

## Network Backup Solutions

### Amanda

AMANDA (Advanced Maryland Automatic Network Disk Archiver) allows setting up one master backup server that collects data from many hosts over the network onto tape drives, disks, or optical media. Amanda is built on standard utilities — `dump` and/or GNU `tar`. Free Community Edition for small teams; Enterprise Edition with Zmanda Management Console for larger environments.

### Bacula

Bacula is a set of enterprise-grade open-source programs for managing backup, recovery, and data verification in heterogeneous networks. Architecture consists of five components: Director, Console, File, Storage, and Monitor. This provides management flexibility via web, GUI, or text interface.

> **Tip:** A closed commercial version (Bacula Systems) exists with full support and extended features.

### Bareos

Bareos is a fork of Bacula version 5.2, created because the Bacula team rejected community contributions. Functionally nearly identical to Bacula, but adds LTO hardware encryption, bandwidth limiting, and new console commands. Aims to lower the barrier for newcomers with ready-made packages for popular Linux distributions and Windows.

> **Warning:** Bareos protects backup data according to user-defined retention policies. This can complicate tape reuse — in such situations the developers themselves recommend considering an alternative solution.

### BackupPC

High-performance enterprise-grade backup for Linux, Windows, and macOS. Oriented toward backing up workstations and laptops to a disk server. Easy to set up and configure, built on `rsync` and `tar`.

**Solutions comparison:**

| Solution | Backend | Interface | Features |
|---|---|---|---|
| Amanda | dump, tar | CLI, GUI (Enterprise) | Tape, disk, optical. Many platforms |
| Bacula | Custom | Web, GUI, CLI | 5 components, complex setup |
| Bareos | Bacula 5.2 fork | Web, GUI, CLI | LTO encryption, easier for newcomers |
| BackupPC | rsync, tar | Web | PC/laptops, easy start |

> **Important:** For the exam — know Amanda, Bacula, Bareos, BackupPC by name and purpose. Bareos is a fork of Bacula 5.2. Amanda uses dump and tar. BackupPC uses rsync and tar.

---

## Verifying Backup Integrity

```bash
tar -Wcvf /backup/home.tar /home       # verify immediately on creation (non-compressed only)
tar -dvf /backup/home.tar              # compare archive with disk files
tar --diff -f /backup/home.tar         # same, long form
tar --compare -f /backup/home.tar      # same, alternative long form

gzip -t /backup/home.tar.gz            # check gzip archive integrity

# Checksum verification (create first, verify later)
sha256sum /backup/home.tar.gz > /backup/home.tar.gz.sha256
sha256sum -c /backup/home.tar.gz.sha256
```

> **Important:** `-W` / `--verify` checks the archive immediately after creation. It works ONLY with uncompressed tar archives. It does not work with tarballs (`.tar.gz`, `.tar.bz2`).

---

## Restoring from Backups

**Restoring with tar:**

```bash
tar -xzf /backup/home_full.tar.gz                         # restore to current directory
tar -xzf /backup/home_full.tar.gz -C /restore/            # restore to specific directory
tar -xzf /backup/home_full.tar.gz home/user/document.txt  # restore a single file
tar -xvf /dev/st0                                          # restore from tape

# Restore incremental backup (full first, then incrementals in order)
tar -xJf /backup/home_full.tar.xz -C /restore/
tar -xJf /backup/home_inc1.tar.xz -C /restore/
tar -xJf /backup/home_inc2.tar.xz -C /restore/

tar -tzf /backup/home_full.tar.gz   # list files without extracting
```

**Restoring with rsync:**

```bash
rsync -av user@remotehost:~/backup/ /home/
rsync -a user@remotehost:~/backup/ /restore/
```

**Restoring with dd:**

```bash
dd if=/backup/sda1.img of=/dev/sda1 bs=4M            # restore image (must be unmounted)
gunzip -c /backup/sda.img.gz | dd of=/dev/sda bs=4M  # restore compressed image
```

---

## Exam Cheat Sheet

**Tape devices:**

```
/dev/st0    SCSI tape with auto-rewind
/dev/nst0   SCSI tape without auto-rewind (non-rewinding)
/dev/ht0    PATA tape with auto-rewind
/dev/nht0   PATA tape without auto-rewind
```

**Frequently used commands:**

```bash
tar -czf backup.tar.gz /home                            # gzip backup
tar -cjf backup.tar.bz2 /home                           # bzip2 backup
tar -cJf backup.tar.xz /home                            # xz backup
tar -czf inc.tar.gz --listed-incremental=snap.snar /home # incremental
tar -Wcvf backup.tar /home                              # verify on create (uncompressed only)
tar -dvf backup.tar                                     # compare with disk
tar -xzf backup.tar.gz -C /restore/                     # restore

rsync -av /home /backup/                                # local backup
rsync -av /home user@host:~/backup/                     # remote via SSH
rsync -av --delete /home /backup/                       # mirror

dd if=/dev/sda1 of=/backup/sda1.img bs=4M               # disk image

mt -f /dev/nst0 rewind                                  # rewind tape
mt -f /dev/nst0 fsf 1                                   # skip to next archive
mt -f /dev/nst0 status                                  # tape status
```

**Key paths:**

| Path | Purpose |
|---|---|
| `/dev/st*` | SCSI tape with auto-rewind |
| `/dev/nst*` | SCSI tape without auto-rewind |
| `*.snar` | Snapshot file for tar incremental backup |

### Common Mistakes

- Using `/dev/st0` instead of `/dev/nst0` when writing multiple archives — each new tar overwrites from the beginning of the tape.
- Running `dd` on a mounted partition — leads to data corruption.
- Using `rsync://host:/` instead of `user@host:/` — the former does not encrypt data.
- Trying to verify a tarball with `tar -W` — the option does not work with compressed archives.
- Giving the snapshot file the `.snap` extension instead of `.snar`.

---

## Practice Questions

**Q1.** Which tape devices do NOT auto-rewind after an operation?

A. `/dev/st0`  B. `/dev/nst0`  C. `/dev/ht1`  D. `/dev/nht0`

**Answer:** B and D. The `n` prefix in the device name means non-rewinding.

---

**Q2.** You are writing multiple tar archives to a single tape. Which device should you use?

A. `/dev/st0`  B. `/dev/nst0`  C. Either, there is no difference

**Answer:** B. With `/dev/st0` the tape rewinds after each operation, and the next archive overwrites the previous one.

---

**Q3.** Which tar flag verifies the archive immediately after creation?

A. `-d`  B. `-z`  C. `-W`  D. `-v`

**Answer:** C. The `-W` (`--verify`) flag verifies the archive immediately after creation. Works only with uncompressed archives.

---

**Q4.** You want to transfer a backup to a remote host with encrypted transfer. Which command is correct?

A. `rsync -av /home rsync://backuphost:/home`  B. `rsync -av /home backuphost:~/home`  C. `rsync -av backuphost:~/home /home`

**Answer:** B. The `host:/path` format uses SSH for encrypted transfer. The `rsync://host:/path` format uses the rsync daemon without encryption.

---

**Q5.** What extension must the snapshot file for a tar incremental backup have?

A. `.snap`  B. `.tar.snap`  C. `.snar`  D. `.inc`

**Answer:** C. The `.snar` extension is required for tar snapshot files.

---

**Q6.** What is Bareos?

A. A standalone product with no connection to other solutions  B. A fork of Amanda  C. A fork of Bacula version 5.2  D. A commercial version of BackupPC

**Answer:** C. Bareos started as a fork of Bacula 5.2 because the Bacula team rejected community contributions to the original project.

---

**Q7.** Which directories should be excluded from backups?

A. `/etc` and `/home`  B. `/proc` and `/sys`  C. `/usr` and `/var`  D. `/bin` and `/lib`

**Answer:** B. `/proc` and `/sys` are virtual filesystems generated by the kernel and contain no real data to back up.

---

**Q8.** You want to copy the entire disk `/dev/sda` to a file. Which command is correct?

A. `dd of=/dev/sda if=/backup/sda.img`  B. `dd if=/dev/sda of=/backup/sda.img`  C. `rsync /dev/sda /backup/sda.img`  D. `tar -cf /backup/sda.img /dev/sda`

**Answer:** B. With `dd`, the input file is always `if=` and the output file is always `of=`. `rsync` is not used for byte-level disk copying.
