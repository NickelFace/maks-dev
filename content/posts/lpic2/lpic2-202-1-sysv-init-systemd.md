---
title: "LPIC-2 202.1 — SysV Init and systemd"
date: 2025-08-31
description: "System startup customisation: SysV runlevels, inittab, init scripts, chkconfig, update-rc.d, systemd units and targets, mkinitrd, LSB. LPIC-2 exam topic 202.1."
tags: ["Linux", "systemd", "SysV", "LPIC-2", "Boot"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-202-1-sysv-init-systemd/"
page_lang: "en"
---

> **Exam weight: 3 points.** You need to manage services via runlevels (SysV) and targets (systemd), understand the boot sequence, and know all the utilities listed here. The exam tests both approaches.

---

## SysV Init

### Runlevels and special levels

SysV Init divides system states into levels. Each level defines a set of running services.

| Runlevel | Description |
|---|---|
| 0 | System halt, reserved |
| 1 | Single-user mode (maintenance), reserved |
| 2 | Debian: multi-user mode (including GUI) |
| 3 | Red Hat: multi-user text mode |
| 4 | Undefined, available for custom use |
| 5 | Red Hat: multi-user graphical mode |
| 6 | Reboot, reserved |
| 7–9 | Available for custom use, most distros ignore them |
| s / S | Single-user mode (synonyms). Scripts from `/etc/rcS.d/` run at boot |
| A, B, C | On-demand levels: scripts run but the current runlevel does not change |

> **Exam tip:** Debian uses runlevel 2 for all multi-user modes. Red Hat uses runlevel 3 for text and 5 for graphical. This distinction is frequently tested.

> **Note:** On-demand levels A, B, C let you run a group of scripts without changing the actual runlevel. If the current level is 2 and you run `init A`, the scripts for level A execute, but `runlevel` still shows 2.

```bash
runlevel
# Output: N 3
# N = previous level (N = initial boot), 3 = current
```

---

### inittab

`init` is the parent of all processes. At startup it reads `/etc/inittab` and launches processes according to its contents, including `getty` for user logins.

Format of each line:

```
id:runlevels:action:process
```

- `id` — unique identifier (1–4 characters). For `getty`, `id` must match the tty device suffix, otherwise login accounting breaks.
- `runlevels` — levels without separators (e.g. `345` means levels 3, 4, and 5)
- `action` — what to do with the process
- `process` — command to run. If it starts with `+`, init skips utmp/wtmp accounting.

Example `/etc/inittab`:

```ini
# Default runlevel:
id:2:initdefault:

# System initialisation at boot (before everything else):
si::sysinit:/etc/init.d/rcS

# Single user:
~~:S:wait:/sbin/sulogin

# rc scripts for each runlevel:
l0:0:wait:/etc/init.d/rc 0
l1:1:wait:/etc/init.d/rc 1
l2:2:wait:/etc/init.d/rc 2
l3:3:wait:/etc/init.d/rc 3
l4:4:wait:/etc/init.d/rc 4
l5:5:wait:/etc/init.d/rc 5
l6:6:wait:/etc/init.d/rc 6

# Fallback on crash:
z6:6:respawn:/sbin/sulogin

# Getty on virtual terminals:
1:2345:respawn:/sbin/getty 38400 tty1
2:23:respawn:/sbin/getty 38400 tty2
```

**`action` field values:**

| Action | Description |
|---|---|
| `initdefault` | Sets the default runlevel at boot; `process` field is ignored |
| `sysinit` | Runs at boot before all `boot`/`bootwait`; `runlevels` field is ignored |
| `boot` | Runs at boot; `runlevels` field is ignored |
| `bootwait` | Runs at boot, init waits for it to finish; `runlevels` field is ignored |
| `once` | Runs once when entering the runlevel |
| `wait` | Runs once when entering the runlevel, init waits for it to finish |
| `respawn` | Runs when entering the runlevel and auto-restarts on exit (e.g. `getty`) |
| `off` | Does nothing |
| `ondemand` | Runs on demand for levels a, b, c without changing the current runlevel |
| `powerwait` | Runs on power failure (from UPS), init waits for finish |
| `powerfail` | Runs on power failure, init does not wait |
| `powerokwait` | Runs when power is restored |
| `powerfailnow` | Runs when the UPS battery is almost depleted |
| `ctrlaltdel` | Runs on SIGINT (Ctrl+Alt+Del on the console) |
| `kbdrequest` | Runs on KeyboardSignal from the keyboard handler |

> **Important:** Execution order: all `sysinit` entries run first, then `boot`/`bootwait`, then everything else.

> **Warning:** On systemd-based systems `/etc/inittab` is either absent or ignored. It only applies to SysV Init.

---

### Init scripts

Init scripts are stored in `/etc/init.d/`. For each runlevel there is a separate directory `/etc/rcX.d/` (X = level number). When changing runlevels, init calls `/etc/init.d/rc` with the level number:

```
l2:2:wait:/etc/init.d/rc 2
```

The `rc` script then iterates over `/etc/rc2.d/` and calls each symlink with the appropriate argument. Example contents of `/etc/rc2.d/`:

```
K20gpm        S11pcmcia   S20logoutd  S20ssh     S89cron
S10ipchains   S12kerneld  S20lpd      S20xfs     S91apache
S10sysklogd   S14ppp      S20makedev  S22ntpdate S99gdm
```

Naming convention:

- `S20nginx` — Start, priority 20 → calls `nginx start`
- `K80nginx` — Kill (stop), priority 80 → calls `nginx stop`

Scripts execute in lexicographic order. A lower number runs earlier. Start and stop are symmetric: what starts first (S20) stops last (K80).

Example init script structure:

```bash
#!/bin/sh
case "$1" in
  start)
    gpm_start
    ;;
  stop)
    gpm_stop
    ;;
  force-reload|restart)
    gpm_stop; sleep 3; gpm_start
    ;;
  *)
    echo "Usage: /etc/init.d/gpm {start|stop|restart|force-reload}"
    exit 1
esac
```

---

### chkconfig

`chkconfig` is used on RPM-based distributions (Red Hat, CentOS, SUSE) to manage symlinks in `/etc/rcX.d/`.

The script header `chkconfig` reads:

```bash
# chkconfig: 2345 55 25
#             ^^^^ ^^ ^^
#             |    |  |--- stop priority (K-links)
#             |    |------ start priority (S-links)
#             |----------- runlevels to start on
```

```bash
# List all services and their runlevel status:
chkconfig --list

# List a specific service:
chkconfig --list nginx

# Enable on default runlevels (2, 3, 4, 5):
chkconfig nginx on

# Disable on all runlevels:
chkconfig nginx off

# Enable on specific levels (Red Hat syntax):
chkconfig --levels 2345 nginx on

# Add a new service (script already in /etc/init.d/):
chkconfig --add food

# Remove all runlevel links (script in /etc/init.d/ stays):
chkconfig --del food
```

> **Tip:** `chkconfig` only manages symlinks — it does not start the service immediately. To start now, call `/etc/init.d/nginx start` separately.

> **Important:** `chkconfig --del food` removes links from all `rcX.d/` directories but leaves `/etc/init.d/food` on disk.

---

### update-rc.d

Debian-based systems use `update-rc.d` instead of `chkconfig`.

```bash
# Add a service to standard runlevels:
update-rc.d foobar defaults
# Creates K-links in rc0.d, rc1.d, rc6.d and S-links in rc2.d, rc3.d, rc4.d, rc5.d

# Remove all service links (only if the script is already gone):
update-rc.d dovecot remove

# Force-remove (when the script still exists):
update-rc.d -f dovecot remove

# Create K-links (stop) on specific levels to prevent auto-start:
update-rc.d -f dovecot stop 24 2 3 4 5 .
# The trailing dot is mandatory!
```

> **Warning:** If you remove links with `update-rc.d -f dovecot remove`, the next package update will restore them automatically. To prevent this, create K-links (stop) in the relevant directories instead.

---

### Changing runlevel: init and telinit

```bash
# Switch runlevel immediately (no warnings):
init 3
telinit 3      # same thing via telinit

init 6         # reboot
init 0         # halt
init 1         # single-user mode
```

`telinit` is a wrapper around `init` that sends it a signal. On systemd systems both commands are redirected to `systemctl`.

Friendlier commands for multi-user systems:

```bash
shutdown -r +15 "Reboot in 15 minutes"
halt
poweroff
reboot
```

---

## systemd

### Units and Types

systemd manages resources through unit files. A unit defines a service or action and has the format `name.type`. There are eight unit types:

| Type | Purpose |
|---|---|
| `.service` | Manage daemons (services) |
| `.target` | Group other units (analogous to runlevel) |
| `.socket` | Socket-activated services |
| `.mount` | Mount points |
| `.automount` | Automatic mounting |
| `.device` | Devices recognised by the kernel |
| `.path` | Filesystem monitoring |
| `.snapshot` | systemd state snapshot |

The exam most commonly asks about `.service` and `.target`.

---

### Unit file structure

Example `sshd.service`:

```ini
[Unit]
Description=OpenSSH server daemon
After=syslog.target network.target auditd.service

[Service]
EnvironmentFile=/etc/sysconfig/sshd
ExecStartPre=/usr/sbin/sshd-keygen
ExecStart=/usr/sbin/sshd -D $OPTIONS
ExecReload=/bin/kill -HUP $MAINPID
KillMode=process
Restart=on-failure
RestartSec=42s

[Install]
WantedBy=multi-user.target
```

Example target file `graphical.target`:

```ini
[Unit]
Description=Graphical Interface
Requires=multi-user.target
After=multi-user.target
Conflicts=rescue.target
Wants=display-manager.service
AllowIsolate=yes

[Install]
Alias=default.target
```

**Key directives:**

| Section | Directive | Meaning |
|---|---|---|
| `[Unit]` | `After=` | Start after these units |
| `[Unit]` | `Requires=` | Hard dependency |
| `[Unit]` | `Wants=` | Soft dependency |
| `[Unit]` | `Conflicts=` | Cannot run simultaneously |
| `[Service]` | `ExecStart=` | Start command |
| `[Service]` | `Restart=` | Restart policy |
| `[Install]` | `WantedBy=` | Which target includes this unit. `WantedBy=multi-user.target` means the service runs in both text and graphical mode |

---

### Unit file directories

systemd reads files from three locations with different priorities:

| Directory | Written by | Priority |
|---|---|---|
| `/usr/lib/systemd/system/` | Package manager (vendor) | Low |
| `/run/systemd/system/` | Temporary overrides (lost on reboot) | Medium |
| `/etc/systemd/system/` | Administrator | High |

> **Important:** Never edit files directly in `/usr/lib/systemd/system/`. All customisations go in `/etc/systemd/system/`. Changes in `/usr/lib/` will be overwritten on package updates.

Ways to override a unit:

```bash
# 1. Full replacement: create a file with the same name in /etc/systemd/system/
cp /usr/lib/systemd/system/nginx.service /etc/systemd/system/nginx.service

# 2. Partial override via a drop-in directory:
mkdir /etc/systemd/system/nginx.service.d/
cat > /etc/systemd/system/nginx.service.d/override.conf << EOF
[Service]
Restart=always
EOF

# 3. Via systemctl (creates a drop-in automatically):
systemctl edit nginx.service

# 4. Edit the full unit via systemctl:
systemctl edit --full nginx.service

# After any changes — reload configs:
systemctl daemon-reload
```

---

### systemd-delta

`systemd-delta` shows all active unit file overrides by comparing the three directories.

```bash
systemd-delta                        # show all overrides with diffs
systemd-delta --type=overridden      # filter by type
systemd-delta --type=masked
systemd-delta --type=extended
systemd-delta --diff=false           # list only, no diff
systemd-delta --no-pager
```

**Override types:**

| Type | Description |
|---|---|
| `masked` | Units blocked by a symlink to `/dev/null` |
| `equivalent` | Overridden files with no actual changes |
| `redirected` | Symlinks pointing to other unit files |
| `overridden` | Fully replaced unit files |
| `extended` | Units with drop-in `.conf` files |

---

### Targets

Targets in systemd define system states, analogous to runlevels in SysV. Key difference: multiple targets can be active simultaneously.

Dependency hierarchy: `graphical.target` depends on `multi-user.target`, which depends on `basic.target`.

```bash
systemctl get-default                        # current default target
systemctl set-default multi-user.target      # set default target
# Creates symlink /etc/systemd/system/default.target

systemctl list-units --type=target           # all active targets
systemctl list-unit-files --type=target      # all available targets
```

```bash
ls -al /etc/systemd/system/default.target
# lrwxrwxrwx ... default.target -> /usr/lib/systemd/system/graphical.target
```

---

### Runlevel to target mapping

| SysV Runlevel | systemd Target | Description |
|---|---|---|
| 0 | `poweroff.target` | Shutdown |
| 1 | `rescue.target` | Single-user mode |
| 2 | `multi-user.target` | Multi-user, no GUI |
| 3 | `multi-user.target` | Multi-user, no GUI |
| 4 | `multi-user.target` | Multi-user, no GUI |
| 5 | `graphical.target` | Multi-user with GUI |
| 6 | `reboot.target` | Reboot |

Aliases `runlevel0.target` through `runlevel6.target` exist for backwards compatibility.

---

### systemctl

```bash
# --- Start / stop ---
systemctl start nginx.service
systemctl stop nginx.service
systemctl restart nginx.service
systemctl reload nginx.service           # reload config without restart
systemctl reload-or-restart nginx.service

# --- Status ---
systemctl status nginx.service
systemctl is-active nginx.service        # active or inactive
systemctl is-enabled nginx.service       # enabled or disabled
systemctl is-failed nginx.service

# --- Autostart ---
systemctl enable nginx.service           # add to autostart
systemctl disable nginx.service          # remove from autostart

# --- Masking ---
systemctl mask nginx.service             # symlink to /dev/null
systemctl unmask nginx.service

# --- Switching targets ---
systemctl isolate multi-user.target      # switch to multi-user (no GUI)
systemctl isolate rescue.target          # switch to rescue (no notification)
systemctl rescue                         # switch to rescue (notifies users)
systemctl rescue --no-wall               # switch without notification
systemctl emergency                      # emergency mode (broken system)
systemctl default                        # return to default target

# --- Unit information ---
systemctl list-units                     # all active units
systemctl list-units --all               # all units including inactive
systemctl list-units --type=service      # services only
systemctl list-unit-files                # all unit files with state
systemctl cat nginx.service              # print unit file contents
systemctl show nginx.service             # low-level properties
systemctl show sshd.service -p Conflicts # specific property
systemctl list-dependencies nginx.service  # dependency tree

# --- Reload systemd configuration ---
systemctl daemon-reload
```

> **Important:** `systemctl enable` adds the service to autostart at the next boot but does not start it now. To both enable and start: run both `systemctl enable` and `systemctl start`.

> **Note:** `systemctl isolate rescue.target` switches silently without notifying logged-in users. `systemctl rescue` first sends a wall message to all users, then switches. `systemctl emergency` loads a minimal environment without network services — for cases where rescue mode is already broken.

> **Warning:** Difference between `mask` and `disable`: `disable` removes from autostart but the service can still be started manually. `mask` creates a symlink to `/dev/null` and completely blocks any start, including manual and via dependencies.

---

## mkinitrd and mkinitramfs

At boot, the kernel cannot access the root filesystem if it resides on LVM, RAID, or requires a special driver. The solution is an initial ramdisk (initrd) — a temporary filesystem in memory that the kernel mounts first, containing the required modules.

### mkinitrd (RPM-based distributions)

`mkinitrd` is used on Red Hat, CentOS, and SUSE. It automatically includes the modules needed to access the root FS, based on `/etc/fstab` and `/etc/raidtab`.

```bash
mkinitrd /boot/initrd-4.18.0-305.img 4.18.0-305.el8.x86_64
```

| Option | Effect |
|---|---|
| `--version` | Show version |
| `-f` | Overwrite an existing image with the same name |
| `--builtin=module` | Treat a module as built into the kernel, exclude from image |
| `--omit-lvm-modules` | Exclude LVM modules |
| `--omit-raid-modules` | Exclude RAID modules |
| `--omit-scsi-modules` | Exclude SCSI modules |

> **Important:** Rebuild initrd every time you manually recompile the kernel or install a kernel module patch. Skipping this step means the system will fail to boot after the update.

### mkinitramfs (Debian-based distributions)

```bash
mkinitramfs -o /boot/initrd.img-$(uname -r) $(uname -r)

# Options:
mkinitramfs -d /etc/initramfs-tools -o outfile   # alternative confdir
mkinitramfs -k -o outfile                         # keep temp directory
mkinitramfs -r /dev/sda1 -o outfile               # override ROOT from config
```

Config file: `/etc/initramfs-tools/initramfs.conf`

> **Warning:** On Debian-based distributions `mkinitrd` is broken for modern kernels. Use `mkinitramfs` only.

---

## Root Device Configuration

The root device can be set in several ways, each overriding the previous:

1. Defaults from kernel source code
2. Values set by the `rdev` command
3. Parameters passed to the kernel at boot (`root=/dev/xyz`)
4. Parameters in the GRUB configuration file

From within the initrd environment, the root device can be changed via `/proc`:

```bash
# Change root device to /dev/hda1 (0x301):
echo 0x301 > /proc/sys/kernel/real-root-dev

# Configure NFS root:
echo /var/nfsroot > /proc/sys/kernel/nfs-root-name
echo 193.8.232.2:193.8.232.7::255.255.255.0:myhost > /proc/sys/kernel/nfs-root-addrs
echo 255 > /proc/sys/kernel/real-root-dev   # 0xff = NFS
```

| File | Purpose |
|---|---|
| `/proc/sys/kernel/real-root-dev` | Root FS device number |
| `/proc/sys/kernel/nfs-root-name` | NFS root path |
| `/proc/sys/kernel/nfs-root-addrs` | NFS root addresses |

---

## Linux Boot Process

| Phase | Description |
|---|---|
| 1 | Load, configure, and start the kernel loader |
| 2 | Register setup |
| 3 | Kernel decompression |
| 4 | Kernel and memory initialisation |
| 5 | Kernel setup |
| 6 | Enable additional CPUs (SMP) |
| 7 | Create the init process |

The kernel tries to launch `init` from the following paths in order until one succeeds:

```
/sbin/init
/etc/init
/bin/init
/bin/sh
```

> **Important:** If none of these paths work, the kernel panics with `Kernel panic - not syncing`. The exam may ask which path is tried first and what happens on failure.

---

## Linux Standard Base (LSB)

LSB defines a compatibility standard between Linux distributions. A program built in an LSB-compliant environment will run on any LSB-supporting distribution.

What LSB defines:

- Standard libraries: `libdl`, `libcrypt`, `libpthread`, `libc`, `libm`, including search paths, format (ELF), and dynamic linking
- 130+ commands with calling conventions: `cp`, `tar`, `kill`, `gzip`, `perl`, `python`
- System init behaviour, init script functions, and locations
- Runlevel definitions, username/group conventions, and UID/GID ranges
- Package standard: LSB uses RPM format. On Debian, `alien` reads RPM packages

> **Note:** LSB is a family of specifications, not a single one. There is a generic part (LSB-generic) and an architecture-specific part (LSB-arch). A binary for Intel will not run on Alpha even if both distributions support LSB.

### LSB init scripts

An LSB-compliant init script must support these arguments:

| Argument | Required |
|---|---|
| `start` | Mandatory |
| `stop` | Mandatory |
| `restart` | Mandatory |
| `force-reload` | Mandatory |
| `status` | Mandatory |
| `reload` | Optional |
| `try-restart` | Optional |

Functions from `/lib/lsb/init-functions`:

```bash
# Start a program as a daemon (checks if already running):
start_daemon [-f] [-n nicelevel] [-p pidfile] pathname [args...]
# -f: start even if already running
# -n: set nice level

# Stop a process (tries specified signal, falls back to SIGTERM):
killproc [-p pidfile] pathname [signal]

# Get the PID(s) of a daemon:
pidofproc [-p pidfile] pathname
```

Example LSB header in a script:

```bash
### BEGIN INIT INFO
# Provides:          myservice
# Required-Start:    $network $remote_fs $syslog
# Required-Stop:     $network $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: My custom service
# Description:       Long description of the service
### END INIT INFO
```

> **Tip:** `Required-Start` defines dependencies. `$network`, `$remote_fs`, `$syslog` are LSB virtual facilities. Both `chkconfig` and `update-rc.d` read this header to create symlinks with the correct priority numbers.

---

## Exam Cheat Sheet

### Paths and Files

| Path | Purpose |
|---|---|
| `/etc/inittab` | SysV Init config: default runlevel, processes |
| `/etc/init.d/` | SysV init scripts |
| `/etc/rc.d/` | rcX.d directories with symlinks |
| `/etc/rcX.d/` | Symlinks to scripts for runlevel X (SXXname, KXXname) |
| `/usr/lib/systemd/system/` | Package manager unit files (do not edit!) |
| `/etc/systemd/system/` | Admin unit files and overrides |
| `/run/systemd/system/` | Temporary overrides (lost on reboot) |
| `/etc/initramfs-tools/initramfs.conf` | mkinitramfs config (Debian) |

### Key Commands

| Command | What it does |
|---|---|
| `runlevel` | Show current and previous runlevel |
| `init N` / `telinit N` | Change runlevel (SysV) |
| `chkconfig --list` | List services and runlevels (RPM) |
| `chkconfig nginx on` | Enable service on default levels |
| `update-rc.d foobar defaults` | Add service to autostart (Debian) |
| `update-rc.d -f dovecot remove` | Force-remove service links |
| `mkinitrd /boot/initrd.img version` | Create initrd (RPM) |
| `mkinitramfs -o /boot/initrd.img version` | Create initrd (Debian) |
| `systemctl get-default` | Current default target |
| `systemctl set-default graphical.target` | Set default target |
| `systemctl isolate rescue.target` | Switch target immediately |
| `systemctl enable/disable` | Autostart on/off |
| `systemctl mask/unmask` | Block / unblock completely |
| `systemctl daemon-reload` | Reload unit files after changes |
| `systemctl edit nginx.service` | Create drop-in override |
| `systemctl edit --full nginx.service` | Edit the full unit |
| `systemd-delta` | Show all unit file overrides |

### Common Mistakes

- Forgetting `systemctl daemon-reload` after editing a unit file
- Confusing `enable` (autostart) with `start` (start now)
- Confusing `disable` (removes autostart, manual start still works) with `mask` (blocks everything)
- Editing files directly in `/usr/lib/systemd/system/`
- Forgetting the trailing dot in `update-rc.d -f dovecot stop 24 2 3 4 5 .`
- Confusing Red Hat and Debian runlevel behaviour (levels 2–5)

---

## Practice Questions

**Q1.** On a Debian server with SysV Init, you need to disable autostart of `apache2`. Which command does this?

A. `chkconfig apache2 off`
B. `update-rc.d -f apache2 remove`
C. `systemctl disable apache2`
D. `service apache2 stop`

**Answer:** B. `chkconfig` is for RPM-based systems. `update-rc.d -f apache2 remove` removes symlinks on Debian. `systemctl disable` only works with systemd.

---

**Q2.** Which file stores the default runlevel in SysV Init?

A. `/etc/rc.local` B. `/etc/default/init` C. `/etc/inittab` D. `/etc/init.d/defaults`

**Answer:** C. The line `id:3:initdefault:` in `/etc/inittab` sets the boot runlevel.

---

**Q3.** An admin ran `systemctl edit nginx.service`, saved changes, but the service behaviour is unchanged. What needs to be done?

A. `systemctl restart nginx.service`
B. `systemctl reload nginx.service`
C. `systemctl daemon-reload`
D. `systemctl reset nginx.service`

**Answer:** C. After changing unit files, systemd must reload its configuration with `systemctl daemon-reload`. Only then do the changes take effect.

---

**Q4.** What happens to files in `/run/systemd/system/` on reboot?

A. They are copied to `/etc/systemd/system/`
B. They are preserved unchanged
C. They are deleted
D. They are moved to `/usr/lib/systemd/system/`

**Answer:** C. The `/run/` directory holds temporary data that does not survive a reboot. Override files there are discarded.

---

**Q5.** Which command shows which unit files are overridden on the system?

A. `systemctl list-overrides` B. `systemd-delta` C. `systemctl diff` D. `systemctl show --changed`

**Answer:** B. `systemd-delta` compares all three unit file directories and shows discrepancies with type labels: masked, overridden, extended, etc.

---

**Q6.** An admin wants `myapp.service` to never start, even if triggered manually or via a dependency. What should they do?

A. `systemctl disable myapp.service`
B. `systemctl stop myapp.service`
C. `systemctl mask myapp.service`
D. `systemctl remove myapp.service`

**Answer:** C. `mask` creates a symlink to `/dev/null`, completely blocking any start. `disable` only removes from autostart.

---

**Q7.** Which systemd target corresponds to SysV runlevel 5 on Red Hat systems?

A. `multi-user.target` B. `rescue.target` C. `graphical.target` D. `runlevel5.target`

**Answer:** C. Runlevel 5 on Red Hat is multi-user graphical mode, which maps to `graphical.target`. `runlevel5.target` is an alias pointing to `graphical.target`.

---

**Q8.** What does `systemctl isolate multi-user.target` do?

A. Starts all units from multi-user.target without touching others
B. Starts units from multi-user.target and stops all units outside its dependency tree
C. Sets multi-user.target as the default target
D. Lists units in multi-user.target

**Answer:** B. `isolate` switches the system to the specified target: starts everything needed and stops everything else. It is the equivalent of changing runlevel in SysV.
