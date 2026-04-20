---
title: "LPIC-1 110.2 — Setup Host Security"
date: 2026-04-20
description: "Shadow passwords, /etc/passwd and /etc/shadow, /etc/nologin, xinetd superdaemon, systemd.socket, disabling unnecessary services, TCP wrappers with /etc/hosts.allow and /etc/hosts.deny. LPIC-1 exam topic 110.2."
tags: ["Linux", "LPIC-1", "security", "xinetd", "TCP wrappers", "shadow"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-110-2-host-security/"
---

> **Exam weight: 3** — LPIC-1 v5, Exam 102

## What You Need to Know

From the official LPIC-1 objectives:

- Understand shadow passwords and how they work.
- Turn off network services not in use.
- Understand the role of TCP wrappers.
- Know about `xinetd` and `systemd.socket`.

Key files and commands: `/etc/nologin`, `/etc/passwd`, `/etc/shadow`, `/etc/xinetd.d/`, `/etc/xinetd.conf`, `systemd.socket`, `/etc/hosts.allow`, `/etc/hosts.deny`.

---

## Shadow Passwords

### /etc/passwd

Readable by all users (`-rw-r--r--`). Contains seven colon-separated fields:

```
username:x:UID:GID:GECOS:home_directory:shell
```

| Field | Description |
|---|---|
| `username` | Login name |
| `x` | Password placeholder — actual hash is in `/etc/shadow` |
| `UID` | User ID number |
| `GID` | Primary group ID |
| `GECOS` | Full name / comment field |
| `home_directory` | Path to home directory |
| `shell` | Login shell |

The `x` in the password field means shadow passwords are in use.

### /etc/shadow

Not world-readable (`-rw-r-----` or `----------`). Contains the actual password hashes and aging data. Only root (and the `shadow` group on some distributions) can read it. Commands such as `passwd` and `chage` modify this file.

```
emma:$6$abc123...:18000:7:90:14:30::
```

Fields: username, hash, last-change (days since epoch), min, max, warn, inactive, expiry, reserved.

---

## /etc/nologin

When this file exists, all login attempts by non-root users are rejected. The file may contain a message shown to users attempting to log in.

```bash
echo "System maintenance in progress." > /etc/nologin
```

Root is unaffected by `/etc/nologin`.

The command `nologin` can be set as a user's shell to prevent that specific account from logging in:

```bash
usermod -s /sbin/nologin emma
```

`/etc/nologin` blocks all non-root logins including passwordless SSH key logins.

---

## Superdaemon: xinetd

On older and resource-constrained systems, a *superdaemon* listens on multiple ports and starts the appropriate service on demand, keeping services inactive until needed.

### /etc/xinetd.conf — main configuration

```
defaults
{
    # log_type = SYSLOG daemon info
}

includedir /etc/xinetd.d
```

The only meaningful directive is `includedir`, which points to per-service configuration files.

### /etc/xinetd.d/ — per-service files

Each file controls one service. Example `/etc/xinetd.d/ssh`:

```
service ssh
{
    disable       = no
    socket_type   = stream
    protocol      = tcp
    wait          = no
    user          = root
    server        = /usr/sbin/sshd
    server_args   = -i
    flags         = IPv4
    interface     = 192.168.1.1
}
```

| Directive | Description |
|---|---|
| `service` | Service name (must match `/etc/services` or use a port number) |
| `disable` | `no` = active, `yes` = disabled |
| `socket_type` | `stream` for TCP, `dgram` for UDP |
| `protocol` | `tcp` or `udp` |
| `wait` | `no` for TCP (usually) |
| `user` | User the service process runs as |
| `server` | Full path to the service binary |
| `server_args` | Arguments passed to the binary |
| `flags` | `IPv4`, `IPv6`, etc. |
| `interface` / `bind` | Network interface IP to listen on |

Template files in `/etc/xinetd.d/` (e.g., `daytime`, `echo`, `chargen`) all contain `disable = yes` and serve as examples for legacy services.

Restart xinetd after changes:

```bash
sudo systemctl restart xinetd.service
```

---

## systemd.socket

The modern equivalent of `xinetd`. A socket unit activates a service on demand when a connection arrives.

```bash
sudo systemctl start ssh.socket      # SSH on demand via systemd
sudo lsof -i :22 -P                  # verify which process listens
```

When `ssh.socket` is active, `systemd` (PID 1) appears as the listener and spawns `sshd` on each incoming connection.

---

## Disabling Unnecessary Services

Unused services waste resources and increase the attack surface.

### SysV-init systems

```bash
sudo service --status-all            # list all services
sudo update-rc.d SERVICE remove      # disable on Debian/Ubuntu
sudo chkconfig SERVICE off           # disable on RHEL/CentOS
```

### systemd systems

```bash
systemctl list-units --state active --type service   # list active services
sudo systemctl disable UNIT --now    # stop immediately and prevent autostart
```

### Verifying no service listens on a port

```bash
netstat -ltu                         # older systems (net-tools)
ss -ltu                              # modern equivalent
```

---

## TCP Wrappers

TCP wrappers provide simple host-based access control for services linked with `libwrap`. They have been removed from many modern distributions (e.g., Fedora 29+) but remain relevant for legacy systems.

### Check libwrap support

```bash
ldd /usr/sbin/sshd | grep "libwrap"
```

If `libwrap.so` appears, the daemon supports TCP wrappers.

### /etc/hosts.allow and /etc/hosts.deny

Processing order:
1. `/etc/hosts.allow` is checked first — if a matching `ALLOW` rule exists, access is granted.
2. `/etc/hosts.deny` is checked next — if a matching `DENY` rule exists, access is denied.
3. If no match in either file, access is granted (default allow).

Format: `DAEMON: CLIENT_LIST`

```
# /etc/hosts.deny
sshd: ALL

# /etc/hosts.allow
sshd: LOCAL
sshd: 192.168.1.
```

Common client patterns:

| Pattern | Meaning |
|---|---|
| `ALL` | All hosts |
| `LOCAL` | Hosts in the local domain (no dot in hostname) |
| `192.168.1.` | IP prefix (subnet) |
| `KNOWN` | Hosts with resolvable hostnames |

Changes take effect immediately — no service restart needed.

---

## Quick Reference

```
/etc/passwd:     username:x:UID:GID:GECOS:home:shell
  x = shadow passwords in use; world-readable

/etc/shadow:     password hashes + aging; not world-readable
  modified by passwd and chage

/etc/nologin:    blocks all non-root logins (SSH keys too)
  usermod -s /sbin/nologin USER   block specific account shell

xinetd:
  /etc/xinetd.conf             main config (includedir /etc/xinetd.d)
  /etc/xinetd.d/SERVICE        per-service file
    disable = no/yes
    socket_type = stream/dgram
    server = /path/to/binary
    server_args = -i
    interface = IP
  systemctl restart xinetd.service

systemd.socket:
  systemctl start ssh.socket

Disable services:
  systemctl disable UNIT --now
  update-rc.d SERVICE remove   (Debian SysV)
  chkconfig SERVICE off        (RHEL SysV)
  systemctl list-units --state active --type service

TCP wrappers:
  ldd /usr/sbin/DAEMON | grep libwrap   check support
  /etc/hosts.allow checked first
  /etc/hosts.deny checked second
  default = allow if no match
  sshd: ALL          deny all
  sshd: LOCAL        allow local network
  changes immediate, no restart needed
```

---

## Exam Questions

1. What does the `x` in the password field of `/etc/passwd` mean? → Shadow passwords are in use; the actual hash is in `/etc/shadow`.
2. How many fields does `/etc/passwd` have? → 7 (username, password placeholder, UID, GID, GECOS, home, shell).
3. What file stores the actual password hashes? → `/etc/shadow`
4. Who can read `/etc/shadow`? → Only root (and the `shadow` group on some distributions).
5. What happens when `/etc/nologin` exists? → All non-root login attempts are rejected; the file contents are shown as a message.
6. Does `/etc/nologin` block passwordless SSH key logins? → Yes, it blocks all non-root logins regardless of authentication method.
7. What command makes `/sbin/nologin` a user's shell? → `usermod -s /sbin/nologin USERNAME`
8. What is the main configuration file for xinetd? → `/etc/xinetd.conf`
9. Where are per-service xinetd configuration files stored? → `/etc/xinetd.d/`
10. What `xinetd` directive activates or deactivates a service? → `disable = no` (active) or `disable = yes` (inactive).
11. What `socket_type` value is used for TCP services in xinetd? → `stream`
12. What is the modern systemd equivalent of xinetd? → `systemd.socket` units (e.g., `ssh.socket`).
13. What systemd command stops a service and prevents it from starting at boot? → `systemctl disable UNIT --now`
14. How do you check if a daemon supports TCP wrappers? → `ldd /path/to/daemon | grep "libwrap"`
15. In what order are `/etc/hosts.allow` and `/etc/hosts.deny` checked? → `hosts.allow` first, then `hosts.deny`; default is allow if neither matches.
16. What TCP wrappers rule denies all SSH connections? → Add `sshd: ALL` to `/etc/hosts.deny`
17. Do TCP wrapper changes require a service restart? → No, changes take effect immediately.
18. What command lists all active systemd service units? → `systemctl list-units --state active --type service`

---

## Exercises

### Exercise 1 — Shadow Password Inspection

Check whether shadow passwords are configured on your system, and attempt to view `/etc/shadow` as a non-root user.

<details>
<summary>Answer</summary>

```bash
grep root /etc/passwd      # should show 'x' in password field
grep root /etc/shadow      # will fail with permission denied for non-root
```

`/etc/passwd` is readable by all; `/etc/shadow` is not.

</details>

---

### Exercise 2 — Disable a Service Permanently

Disable the `cups` printing service permanently on a systemd system and verify port 631 is no longer listening.

<details>
<summary>Answer</summary>

```bash
sudo systemctl disable cups.service --now
netstat -l | grep ":ipp" 
# or
ss -l | grep ":ipp"
```

</details>

---

### Exercise 3 — xinetd Configuration

Write an xinetd configuration file that allows `xinetd` to manage the `daytime` service (re-enable the legacy service for testing).

<details>
<summary>Answer</summary>

Edit `/etc/xinetd.d/daytime` and change:

```
disable = yes
```

to:

```
disable = no
```

Then restart xinetd:

```bash
sudo systemctl restart xinetd.service
```

Test with:

```bash
nc localhost daytime
```

</details>

---

### Exercise 4 — TCP Wrappers

Configure TCP wrappers so that `sshd` only accepts connections from the local network.

<details>
<summary>Answer</summary>

Add to `/etc/hosts.deny`:

```
sshd: ALL
```

Add to `/etc/hosts.allow`:

```
sshd: LOCAL
```

No restart required. Verify with `ldd /usr/sbin/sshd | grep libwrap` first to confirm TCP wrappers support.

</details>

---

### Exercise 5 — /etc/nologin

Prevent all non-root users from logging in while you perform maintenance.

<details>
<summary>Answer</summary>

```bash
echo "System maintenance in progress. Try again in 30 minutes." > /etc/nologin
```

When done:

```bash
rm /etc/nologin
```

</details>

---

*LPIC-1 Study Notes | Topic 110: Security*
