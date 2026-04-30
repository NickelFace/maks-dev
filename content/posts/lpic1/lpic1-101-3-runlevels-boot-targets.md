---
title: "LPIC-1 101.3 — Change Runlevels, Boot Targets, Shutdown and Reboot"
date: 2025-07-09
description: "SysVinit runlevels, systemd targets, telinit, systemctl isolate, shutdown, wall, acpid. LPIC-1 exam topic 101.3."
tags: ["Linux", "LPIC-1", "systemd", "SysVinit", "Runlevels"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-101-3-runlevels-boot-targets/"
page_lang: "en"
---

> **Exam weight: 3** — LPIC-1 v5, Exam 101

## What you need to know

- Set the default runlevel or boot target
- Switch between runlevels and targets, including single-user mode
- Shut down and reboot the system from the command line
- Notify users before a runlevel change or other major event
- Properly terminate running processes
- Know the basics of acpid

---

## Service managers: three approaches

When the kernel finishes loading, it launches the first process in the system. That process always receives PID 1. Depending on the distribution, it can be SysVinit, systemd or Upstart. All three can start and stop services, but they do it differently.

---

## SysVinit and runlevels

SysVinit divides system states into runlevels numbered 0 through 6.

| Runlevel | Purpose |
|----------|---------|
| 0 | Halt |
| 1, s, single | Single-user mode, no network (maintenance mode) |
| 2, 3, 4 | Multi-user mode with console or network login |
| 5 | Same as 3, plus graphical login |
| 6 | Reboot |

The only runlevels with a consistent meaning across all distributions are 0, 1 and 6.

### /etc/inittab

`/etc/inittab` controls init behaviour. Line format:

```
id:runlevels:action:process
```

The default runlevel is set like this:

```
id:3:initdefault:
```

Never set 0 or 6 as the default — the system will immediately halt or reboot after loading.

Available action values:

| Action | Behaviour |
|--------|-----------|
| `boot` | Runs during system initialisation; runlevels field is ignored |
| `bootwait` | Same, but init waits for the process to finish |
| `sysinit` | Runs after initialisation, regardless of runlevel |
| `wait` | Runs for the specified runlevels; init waits for completion |
| `respawn` | Process is restarted when it exits |
| `ctrlaltdel` | Executed when Ctrl+Alt+Del is pressed |

### Service scripts

Scripts live in `/etc/init.d/`. For each runlevel there is a directory `/etc/rcN.d/` (N is the runlevel number) containing symbolic links to scripts from `/etc/init.d/`. A link name begins with `K` (kill, stop) or `S` (start), followed by a two-digit priority and the service name. For example, `/etc/rc1.d/K90network` stops the network service when entering runlevel 1.

### SysVinit commands

Show the current runlevel:

```bash
runlevel
# Output: N 3  (N means the runlevel has not changed since boot)
```

Switch runlevel without rebooting:

```bash
telinit 3
telinit 1   # single-user mode
telinit 6   # reboot
telinit 0   # halt
```

`init N` does the same thing as `telinit N`.

After every change to `/etc/inittab`, run:

```bash
telinit q   # or telinit Q
```

This forces init to re-read its configuration. Without this step, a bad entry in `/etc/inittab` can cause the system to hang on the next reboot.

---

## systemd and boot targets

systemd is used by the majority of distributions today. Instead of runlevels, it operates with units and targets.

### Unit types

| Type | Purpose |
|------|---------|
| `service` | An active service that can be started and stopped |
| `socket` | A network or filesystem socket |
| `device` | A hardware device registered through udev |
| `mount` | A mount point (similar to an `/etc/fstab` entry) |
| `automount` | Same, but mounted automatically on access |
| `target` | A group of units managed together |
| `snapshot` | A saved state of the systemd manager |

### Runlevel to target mapping

| SysV runlevel | systemd target |
|---|---|
| 0 | poweroff.target |
| 1 | rescue.target |
| 3 | multi-user.target |
| 5 | graphical.target |
| 6 | reboot.target |

### Managing units with systemctl

```bash
systemctl start unit.service      # start
systemctl stop unit.service       # stop
systemctl restart unit.service    # restart
systemctl status unit.service     # detailed status
systemctl is-active unit.service  # active or inactive
systemctl enable unit.service     # enable at boot
systemctl disable unit.service    # disable at boot
systemctl is-enabled unit.service # check autostart status
```

If there is only one unit with a given name in the system, the `.service` suffix can be omitted. For example, `systemctl status sshd` works the same as `systemctl status sshd.service`.

### Switching targets

```bash
systemctl isolate multi-user.target
systemctl isolate rescue.target    # single-user mode
```

### Default target

Show the current default:

```bash
systemctl get-default
```

Change it:

```bash
systemctl set-default multi-user.target
```

The default target is stored as a symlink at `/etc/systemd/system/default.target`. Never set `shutdown.target` as the default — it is the equivalent of runlevel 0. You can also set the target via a kernel parameter at boot:

```
systemd.unit=multi-user.target
```

### systemd configuration files

- `/lib/systemd/system/` — vendor unit files (primary location)
- `/usr/lib/systemd/` — alternative location on some distributions
- `/etc/systemd/` — user overrides
- `/etc/systemd/logind.conf` — power event settings (suspend, hibernate, etc.)
- `/etc/systemd/logind.conf.d/` — drop-in config files (alternative to a single logind.conf)

List units:

```bash
systemctl list-unit-files
systemctl list-unit-files --type=service
systemctl list-unit-files --type=target
systemctl list-units
```

On systemd-based systems, `/sbin/init` is a symlink to `/lib/systemd/systemd`.

---

## Shutdown and reboot

### The shutdown command

```bash
shutdown [options] time [message]
```

The `time` argument is required. Formats:

| Format | Meaning |
|--------|---------|
| `hh:mm` | Specific time, e.g. `23:00` |
| `+m` | In m minutes, e.g. `+10` |
| `now` or `+0` | Immediately |

Options:

| Option | Action |
|--------|--------|
| `-h` | Halt after shutdown |
| `-r` | Reboot |
| `-c` | Cancel a scheduled shutdown |

Examples:

```bash
shutdown -h now
shutdown -r +5 "Rebooting in 5 minutes"
shutdown -r 23:00
shutdown -c
```

After `shutdown` runs, all processes receive SIGTERM first, then SIGKILL, after which the system switches runlevel or powers off. Running `shutdown` without `-h` or `-r` drops the system into single-user mode (runlevel 1).

On SysV systems you can restrict which users can reboot via Ctrl+Alt+Del. Add the `-a` option to the `shutdown` command on the `ctrlaltdel` line in `/etc/inittab`. Then only users listed in `/etc/shutdown.allow` will be able to trigger a reboot that way.

### systemctl for power management

```bash
systemctl reboot
systemctl poweroff
systemctl suspend    # sleep mode, data stays in RAM
systemctl hibernate  # hibernation, data written to disk
```

On some distributions `poweroff` and `reboot` are symlinks to `systemctl`.

---

## Notifying users: wall

The `wall` command broadcasts a message to the terminal sessions of all logged-in users.

```bash
wall "Server going down for maintenance in 10 minutes"
wall /path/to/message.txt
```

The `shutdown` command automatically sends a warning via `wall` when a message argument is provided.

---

## acpid

`acpid` (Advanced Configuration and Power Interface daemon) is the main power management daemon in Linux. It handles hardware events: lid close, battery level changes, power button press.

If `acpid` is running, systemd power management functions (`suspend`, `hibernate`) configured in `logind.conf` will not work, because `acpid` intercepts those events first.

---

## Upstart (for reference)

Upstart was developed for Ubuntu as a SysVinit replacement with parallel service startup. Ubuntu switched to systemd in 2015 and Upstart is now rarely seen.

Upstart scripts were stored in `/etc/init/`. Main commands:

```bash
initctl list         # list services
start tty6           # start
stop tty6            # stop
status tty6          # status
```

---

## Exam command reference

| Command / file | Purpose |
|---|---|
| `runlevel` | Show current runlevel (SysVinit) |
| `telinit N` | Switch runlevel (SysVinit) |
| `telinit q` | Reload `/etc/inittab` |
| `init N` | Same as `telinit N` |
| `/etc/inittab` | SysVinit configuration file |
| `/etc/init.d/` | Service scripts |
| `/etc/rcN.d/` | Symlinks per runlevel (K*/S* naming) |
| `systemctl isolate X.target` | Switch to a target immediately |
| `systemctl get-default` | Show default target |
| `systemctl set-default X.target` | Set default target |
| `/etc/systemd/system/default.target` | Symlink pointing to the default target |
| `shutdown -h now` | Halt immediately |
| `shutdown -r +5` | Reboot in 5 minutes |
| `shutdown -c` | Cancel scheduled shutdown |
| `wall "message"` | Broadcast message to all users |
| `/sbin/init` | Symlink to `/lib/systemd/systemd` on systemd systems |

---

## Typical exam questions

**Q: How do you reboot the system using `telinit`?**
`telinit 6` — runlevel 6 means reboot.

**Q: What happens to a service linked as `/etc/rc1.d/K90network` when entering runlevel 1?**
The service is stopped. Names starting with K cause the script to be called with the `stop` argument.

**Q: How do you check whether `sshd.service` is running?**
`systemctl status sshd.service` for detailed output, or `systemctl is-active sshd.service` for a one-word answer.

**Q: How do you enable `sshd.service` to start at boot?**
`systemctl enable sshd.service` (as root). It creates a symlink that systemd picks up at boot.

**Q: A SysV system always boots into runlevel 1, even though `/etc/inittab` says 3. Why?**
A kernel parameter `1` or `S` is set in the bootloader configuration. Kernel parameters override the `initdefault` value in `/etc/inittab`.

**Q: What does `/sbin/init` point to on a systemd system?**
`/lib/systemd/systemd`.

**Q: How do you cancel a scheduled shutdown?**
`shutdown -c`

**Q: How do you check the default boot target in systemd?**
`systemctl get-default` or inspect the symlink: `ls -l /etc/systemd/system/default.target`.

---

## Related topics

- [101.2 Boot the System](/posts/lpic1-101-2-boot-the-system/) — bootloader, initramfs, dmesg
- 101.1 Determine and Configure Hardware Settings — BIOS, hardware resources

---

## Exercises

### Exercise 1 — Reboot with telinit

How do you reboot the system using the `telinit` command?

<details>
<summary>Answer</summary>

```bash
telinit 6
```

Runlevel 6 means reboot.

</details>

---

### Exercise 2 — K90network at runlevel 1

What happens to the service behind `/etc/rc1.d/K90network` when the system enters runlevel 1?

<details>
<summary>Answer</summary>

The service is stopped. The filename starts with `K` (kill), so when runlevel 1 is entered, the script is called with the `stop` argument.

> Runlevel 1 is single-user mode without a network connection, so all network services in `/etc/rc1.d/` have names starting with K.

</details>

---

### Exercise 3 — Check sshd status

How do you use `systemctl` to check whether `sshd.service` is running?

<details>
<summary>Answer</summary>

```bash
systemctl status sshd.service
```

Or more concisely:

```bash
systemctl is-active sshd.service
```

> `is-active` prints `active` if the service is running and `inactive` otherwise. `status` gives full details: PID, recent log lines, start time.

</details>

---

### Exercise 4 — Enable sshd at boot

What command enables `sshd.service` to start automatically on a systemd system?

<details>
<summary>Answer</summary>

```bash
systemctl enable sshd.service
```

Run as root. The command creates a symbolic link that systemd picks up during boot.

</details>

---

### Exercise 5 — Wrong runlevel despite inittab

A SysV system always boots into runlevel 1, even though `/etc/inittab` specifies runlevel 3. What is the most likely cause?

<details>
<summary>Answer</summary>

A kernel parameter `1` or `S` is set in the bootloader configuration. Kernel parameters take precedence over the `initdefault` value in `/etc/inittab`.

> Check the parameters of the current boot with `cat /proc/cmdline`. Persistent parameters are set in the bootloader config, for example in `GRUB_CMDLINE_LINUX` inside `/etc/default/grub`.

</details>

---

### Exercise 6 — /sbin/init on systemd

The file `/sbin/init` exists on systemd systems but is only a symbolic link. What does it point to?

<details>
<summary>Answer</summary>

```
/lib/systemd/systemd
```

</details>

---

### Exercise 7 — Check the default target

How do you check the default boot target on a systemd system?

<details>
<summary>Answer</summary>

```bash
systemctl get-default
```

Or by inspecting the symlink directly:

```bash
ls -l /etc/systemd/system/default.target
```

> Both methods show the same information. `systemctl get-default` reads the symlink and prints the target name in a convenient form.

</details>

---

### Exercise 8 — Cancel a scheduled shutdown

How do you cancel a reboot scheduled with the `shutdown` command?

<details>
<summary>Answer</summary>

```bash
shutdown -c
```

</details>

---

*LPIC-1 Study Notes | Topic 101: System Architecture*
