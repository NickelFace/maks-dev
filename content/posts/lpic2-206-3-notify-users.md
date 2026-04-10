---
title: "LPIC-2 206.3 — Notifying Users on System-Related Issues"
date: 2026-04-10
description: "/etc/issue, /etc/issue.net, /etc/motd, wall, shutdown (-k/-c/--no-wall), mesg, systemctl service/target management. LPIC-2 exam topic 206.3."
tags: ["Linux", "LPIC-2", "wall", "motd", "systemctl", "shutdown"]
categories: ["LPIC-2"]
---

> **Exam topic 206.3** — Notifying Users on System-Related Issues (weight: 1). Covers static login messages, dynamic broadcast messages, and systemd service and target management.

---

## Overview

All user notification methods fall into two types:

- **Static** (logon messaging): files shown at login. Content changes only when the message itself is updated.
- **Dynamic** (fluid messaging): tools for immediately broadcasting messages to currently active users.

| Tool | Type | When shown | Audience |
|---|---|---|---|
| `/etc/issue` | Static | Before login (pre-login) | Local tty terminals |
| `/etc/issue.net` | Static | Before login (pre-login) | Telnet, SSH (if configured) |
| `/etc/motd` | Static | After login (post-login) | Local tty terminals |
| `wall` | Dynamic | Immediately | All active terminals |
| `shutdown` | Dynamic | On schedule + immediately | All active terminals |

---

## Static Login Messages

### /etc/issue

`/etc/issue` is displayed on the tty login screen **before** the user enters a username and password. Typical use: company access policy, unauthorized access warning, planned maintenance announcement.

By default the file shows system information via escape sequences:

```bash
cat /etc/issue
# \S
# Kernel \r on an \m
```

Example modified file with a maintenance announcement:

```
########################################################
 NOTICE
 System will be down for maintenance
 When: December 26 1:00am through 1:30am
########################################################
```

> **Warning:** Displaying the distribution and kernel version in `/etc/issue` is considered bad practice. An attacker gains valuable information before authentication. Legally it is better to add an unauthorized access prohibition notice.

### /etc/issue.net

`/etc/issue.net` serves the same role as `/etc/issue` but is intended for **remote connections**. By default it is active only for Telnet. To enable it for SSH, edit the SSH configuration:

```bash
# /etc/ssh/sshd_config
# Uncomment this line:
Banner /etc/issue.net
```

After editing, restart the SSH server:

```bash
sudo systemctl restart sshd
```

> **Note:** When using `/etc/issue.net` over SSH, special escape sequences (e.g., `\r` for kernel version) may not work correctly. Plain text is safer.

### /etc/motd

`/etc/motd` (Message of the Day) is displayed to the user **after** successful authentication but before the command prompt appears. Traditionally used for informal announcements; today more commonly used for upcoming maintenance notices, with `/etc/issue` and `/etc/issue.net` reserved for legal warnings.

On some distributions the file exists but is empty. On others it does not exist and must be created:

```bash
sudo nano /etc/motd
```

Example content:

```
Welcome to server01.example.com

Scheduled maintenance: Sunday 2:00am - 4:00am
Please save your work before then.

For support: helpdesk@example.com
```

> **Tip:** On Ubuntu and Debian, `/etc/update-motd.d/` contains scripts that dynamically generate `/etc/motd` at each login, showing current system information automatically.

---

## Dynamic Messages to Active Users

### wall

`wall` (write all) sends a message to **all active terminals** simultaneously. Message length is limited to 22 lines.

```bash
wall "Server reboot in 30 minutes. Please save your work."

# Send message from a file
wall /tmp/maintenance_notice.txt

# Suppress the standard broadcast banner (root only)
wall -n "Urgent: disk /dev/sdb failing, backup NOW"
```

By default any user can run `wall`. In practice administrators often restrict it to root only.

A user who does not want to receive broadcast messages can disable writes to their terminal:

```bash
mesg n    # disallow writes to terminal
mesg y    # re-enable
```

Which terminals have writes disabled can be checked with `finger`.

> **Important:** The `-n` option of `wall` works only for root and suppresses the standard broadcast header. It is only meaningful when used via the `rpc.walld` daemon.

### shutdown

`shutdown` automatically sends broadcast messages as the shutdown time approaches and at the moment of shutdown itself.

```bash
# Shut down in 10 minutes with a message
shutdown -h +10 "Server halting for hardware replacement. Expected up at 00:00:00."

# Reboot at a specific time
shutdown -r 02:00 "Planned reboot for kernel update."

# Immediate shutdown
shutdown -h now

# Dry-run: sends warnings but does NOT shut down the system
sudo shutdown -k +20 "Please log out, maintenance starting soon."

# Shut down without broadcast messages
shutdown --no-wall +5

# Cancel a scheduled shutdown
shutdown -c "Maintenance postponed to next week."
```

> **Warning:** `shutdown -k` creates `/etc/nologin`, which temporarily blocks new user logins — even though the system is not actually shutting down. The file is removed when the dry-run period ends, but while it exists no new logins are possible.

> **Warning:** If you ran `shutdown --no-wall +5` and then cancel with `shutdown -c`, users will still receive the cancellation message. To suppress it too, use `shutdown -c --no-wall`.

**shutdown options related to notifications:**

| Option | Action |
|---|---|
| `+N` | Run after N minutes |
| `HH:MM` | Run at a specific time |
| `-k` | Dry-run: warnings without actual shutdown |
| `--no-wall` | Shutdown without broadcast messages |
| `-c` | Cancel a scheduled shutdown |
| `-h` | Halt after shutdown |
| `-r` | Reboot after shutdown |

---

## systemctl — Managing System State

In systemd-based systems, `systemctl` replaces several legacy tools. It is the central tool for managing the systemd init system: services, system states (targets/runlevels), and unit configuration files.

### Starting and Stopping Services

```bash
sudo systemctl start application.service
sudo systemctl stop application.service

# The .service suffix can be omitted
sudo systemctl start application
```

Multiple instances of the same service with different configs use `@` syntax:

```bash
sudo systemctl start openvpn@config1.service
sudo systemctl start openvpn@config2.service
```

Multiple services in one command:

```bash
sudo systemctl stop application1.service application2.service
```

### Restarting and Reloading Config

```bash
sudo systemctl restart application.service              # full restart
sudo systemctl reload application.service               # reload config without stopping
sudo systemctl reload-or-restart application.service    # reload if possible, else restart
```

### Enabling and Disabling Autostart

```bash
sudo systemctl enable application.service   # enable autostart at boot
sudo systemctl disable application.service  # disable autostart
```

`enable` creates a symlink from the service file (in `/lib/systemd/system/` or `/etc/systemd/system/`) to the autostart directory (`/etc/systemd/system/some_target.target.wants/`). `disable` removes the symlink.

> **Important:** `systemctl enable` only configures autostart for the next boot. To start the service immediately AND enable autostart, run both: `systemctl start` and `systemctl enable`.

### Checking Service Status

```bash
systemctl status sshd.service                 # full status with logs
systemctl is-active application.service       # exit code 0 = active
systemctl is-enabled application.service      # exit code 0 = autostart enabled
systemctl is-failed application.service       # exit code 0 = failed
```

Example `systemctl status sshd.service` output:

```
sshd.service - OpenSSH server daemon
   Loaded: loaded (/usr/lib/systemd/system/sshd.service; enabled)
   Active: active (running) since Fri 2016-12-16 08:18:17 CET; 4h 58min ago
  Process: 1033 ExecStart=/usr/sbin/sshd $OPTIONS (code=exited, status=0/SUCCESS)
 Main PID: 1067 (sshd)
```

`is-active`, `is-enabled`, and `is-failed` are especially useful in shell scripts where the exit code matters more than text output.

### System State Overview

```bash
systemctl list-units                          # all active units
systemctl                                     # same (default behavior)
systemctl list-units --all                    # all units including inactive
systemctl list-units --all --state=inactive   # filter by state
systemctl list-units --type=service           # filter by type
```

`list-units` output columns:

| Column | Content |
|---|---|
| `UNIT` | Unit name in systemd |
| `LOAD` | Whether configuration is loaded into memory |
| `ACTIVE` | General state (active / inactive) |
| `SUB` | Detailed state (running, exited, failed, etc.) |
| `DESCRIPTION` | Brief unit description |

### Viewing Unit Files

```bash
systemctl list-unit-files    # all unit files on the system
```

The `STATE` column values:

| Value | Meaning |
|---|---|
| `enabled` | Autostart is enabled |
| `disabled` | Autostart is disabled |
| `static` | No `[Install]` section; cannot be enabled via `enable`. Used as a dependency or one-shot action |
| `masked` | Completely disabled; cannot be started manually or automatically |

### Managing Unit Files

**Viewing a unit file:**

```bash
systemctl cat atd.service
```

Example output:

```ini
[Unit]
Description=ATD daemon

[Service]
Type=forking
ExecStart=/usr/bin/atd

[Install]
WantedBy=multi-user.target
```

**Viewing dependencies:**

```bash
systemctl list-dependencies sshd.service            # dependency tree
systemctl list-dependencies sshd.service --all      # all dependencies recursively
systemctl list-dependencies sshd.service --reverse  # reverse (who depends on this)
systemctl list-dependencies sshd.service --before   # what starts before this unit
systemctl list-dependencies sshd.service --after    # what starts after this unit
```

**Viewing unit properties:**

```bash
systemctl show sshd.service               # all properties as key=value
systemctl show sshd.service -p Conflicts  # one specific property
```

**Masking and unmasking:**

Masking, unlike `disable`, makes the unit completely impossible to start. systemd creates a symlink to `/dev/null`. The service cannot be started manually or automatically.

```bash
sudo systemctl mask nginx.service     # completely block the service
sudo systemctl unmask nginx.service   # remove the block
```

Attempting to start a masked service gives:

```
Failed to start nginx.service: Unit nginx.service is masked.
```

> **Important:** `disable` removes autostart but manual `systemctl start` still works. `mask` blocks all startup — both manual and automatic — until `unmask` is run.

**Editing unit files:**

```bash
sudo systemctl edit nginx.service          # open snippet for partial override
sudo systemctl edit --full nginx.service   # open full unit file for editing
```

`systemctl edit` without a flag creates `/etc/systemd/system/nginx.service.d/` and opens an empty snippet file. Snippet settings override values from the system unit file.

`--full` loads the entire unit file into an editor and saves the modified copy to `/etc/systemd/system/nginx.service`. This copy takes priority over the system file in `/lib/systemd/system/`.

Removing changes:

```bash
sudo rm -r /etc/systemd/system/nginx.service.d   # remove snippet
sudo rm /etc/systemd/system/nginx.service         # remove overridden unit file
sudo systemctl daemon-reload                      # reload configuration
```

> **Warning:** After any manual editing or deletion of unit files, run `systemctl daemon-reload`. Without it, systemd continues using the old configuration from memory.

### Managing Targets and Runlevels

Targets are special unit files with a `.target` suffix that describe system states. Their purpose is to group other units. This is the analog of SysV runlevels, but more flexible — multiple targets can be active simultaneously.

**Getting and setting the default target:**

```bash
systemctl get-default                          # get current default target
sudo systemctl set-default graphical.target    # set graphical mode as default
sudo systemctl set-default multi-user.target   # return to multi-user without GUI
```

**Listing targets:**

```bash
systemctl list-unit-files --type=target   # all target files
systemctl list-units --type=target        # only currently active targets
```

**Isolate: switching between targets:**

`isolate` starts all units belonging to a target and stops all units not in it. Analogous to `init N` or `telinit N` in SysV.

```bash
systemctl list-dependencies multi-user.target   # check dependencies first
sudo systemctl isolate multi-user.target        # switch to multi-user without GUI
sudo systemctl isolate graphical.target         # switch to graphical mode
```

> **Warning:** `isolate` stops services. Check dependencies with `list-dependencies` before isolating.

**Shortcuts for common events:**

```bash
sudo systemctl rescue    # rescue mode (single-user equivalent)
sudo systemctl halt      # stop system without cutting power
sudo systemctl poweroff  # full power-off
sudo systemctl reboot    # reboot
```

**SysV runlevel to systemd target mapping:**

| SysV Runlevel | systemd Target | Description |
|---|---|---|
| 0 | `poweroff.target` | Shutdown |
| 1 | `rescue.target` | Single-user / rescue mode |
| 2, 3, 4 | `multi-user.target` | Multi-user, no GUI |
| 5 | `graphical.target` | Multi-user with GUI |
| 6 | `reboot.target` | Reboot |

---

## Escape Sequences in /etc/issue

`/etc/issue` supports escape sequences processed by `getty`:

| Sequence | Meaning |
|---|---|
| `\r` | Kernel version (uname -r) |
| `\m` | Processor architecture |
| `\n` | System hostname |
| `\o` | Domain name |
| `\d` | Current date |
| `\t` | Current time |
| `\s` | OS name |
| `\S` | Distribution name (from /etc/os-release) |
| `\l` | Current tty line name |

> **Note:** These sequences work in `/etc/issue` via `getty`. In `/etc/issue.net` over an SSH connection they are generally not interpreted.

---

## Exam Cheat Sheet

**Files and their purpose:**

| File | When shown | For whom |
|---|---|---|
| `/etc/issue` | Before login | Local tty |
| `/etc/issue.net` | Before login | Telnet / SSH (requires config) |
| `/etc/motd` | After login | Local tty |

**Commands:**

```bash
wall "message"                           # broadcast to all active terminals
shutdown -h +10 "text"                   # halt in 10 minutes with message
shutdown -r 02:00 "text"                 # reboot at 02:00
shutdown -k +20 "text"                   # dry-run (no actual shutdown)
shutdown --no-wall +5                    # shutdown without broadcast
shutdown -c "text"                       # cancel scheduled shutdown
mesg n                                   # disallow writes to terminal
mesg y                                   # allow writes to terminal
systemctl restart sshd                   # restart SSH after sshd_config change
```

**Enabling /etc/issue.net for SSH:**

```
# /etc/ssh/sshd_config
Banner /etc/issue.net
```

### Common Exam Mistakes

- `/etc/motd` is shown AFTER login, not before.
- `/etc/issue.net` by default only works with Telnet; SSH requires the `Banner` directive in `sshd_config`.
- `wall -n` works only for root.
- `shutdown -k` creates `/etc/nologin` and blocks new logins even though the system does not shut down.
- Escape sequences (`\r`, `\m`, etc.) are not guaranteed to work in `/etc/issue.net` over SSH.

---

## Practice Questions

**Q1.** Which file displays a message to the user BEFORE authentication on a local tty terminal?

A. `/etc/motd`  B. `/etc/issue.net`  C. `/etc/issue`  D. `/etc/login.msg`

**Answer:** C. `/etc/issue` is shown before the username and password are entered on a tty terminal.

---

**Q2.** What change must be made to `/etc/ssh/sshd_config` to have SSH display the contents of `/etc/issue.net` at login?

A. `Issue /etc/issue.net`  B. `Banner /etc/issue.net`  C. `Motd /etc/issue.net`  D. `LoginMessage /etc/issue.net`

**Answer:** B. The `Banner` directive in `sshd_config` specifies the path to the pre-login message file.

---

**Q3.** An administrator wants to broadcast an urgent message to all logged-in users right now, without shutting down the system. Which command to use?

A. `broadcast "message"`  B. `notify "message"`  C. `wall "message"`  D. `write all "message"`

**Answer:** C. `wall` broadcasts a message to all active terminals.

---

**Q4.** An administrator ran `shutdown -k +30 "Maintenance in 30 minutes"`. What will happen?

A. The system shuts down in 30 minutes and users receive a warning  
B. Users receive a warning, the system does not shut down, but new logins are blocked for 30 minutes  
C. Only root receives the warning; the system does not shut down  
D. No effect — the `-k` flag is obsolete

**Answer:** B. The `-k` flag is a dry-run: warnings are sent but the system does not shut down. However, `/etc/nologin` is created, temporarily blocking new logins until the dry-run ends.

---

**Q5.** A user does not want to receive broadcast messages from `wall`. Which command should they run?

A. `mesg n`  B. `wall --ignore`  C. `block wall`  D. `chmod 000 /dev/tty`

**Answer:** A. `mesg n` disallows writes to the user's terminal, including messages from `wall`.

---

**Q6.** Which file is shown to a tty user AFTER successful login but BEFORE the command prompt appears?

A. `/etc/issue`  B. `/etc/issue.net`  C. `/etc/motd`  D. `/etc/profile`

**Answer:** C. `/etc/motd` (Message of the Day) is displayed after authentication, before the shell prompt.

---

**Q7.** An administrator scheduled a shutdown with `shutdown --no-wall +5` and now wants to cancel it so users do NOT receive the cancellation message. Which command is correct?

A. `shutdown -c`  B. `shutdown -c --no-wall`  C. `shutdown --cancel --silent`  D. `systemctl cancel shutdown`

**Answer:** B. Using `shutdown -c` without `--no-wall` still sends a cancellation message to users. To suppress it, use `shutdown -c --no-wall`.

---

**Q8.** The escape sequence `\r` is used in `/etc/issue`. What does it display?

A. Hostname  B. Kernel version  C. Current date  D. Processor architecture

**Answer:** B. The `\r` sequence in `/etc/issue` substitutes the kernel version (equivalent to `uname -r`).
