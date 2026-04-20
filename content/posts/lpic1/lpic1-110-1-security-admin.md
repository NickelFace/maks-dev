---
title: "LPIC-1 110.1 — Perform Security Administration Tasks"
date: 2026-04-20
description: "Special permissions SUID/SGID, passwd/chage/usermod, su, lsof, fuser, nmap, ulimit, last/who/w, sudo and /etc/sudoers. LPIC-1 exam topic 110.1."
tags: ["Linux", "LPIC-1", "security", "sudo", "nmap", "lsof", "ulimit"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-110-1-security-admin/"
---

> **Exam weight: 3** — LPIC-1 v5, Exam 102

## What You Need to Know

From the official LPIC-1 objectives:

- Audit a system to find files with the SUID/SGID bit set.
- Set or change user passwords and password aging information.
- Configure `su`.
- Use privilege escalation with `sudo`.
- Manage logins with `lsof`, `fuser`, `nmap`, `netstat`, `last`, `who`, `w`.
- Set resource limits for users with `ulimit` and `/etc/security/limits.conf`.

Key files and commands: `find`, `passwd`, `fuser`, `lsof`, `nmap`, `chage`, `netstat`, `sudo`, `su`, `usermod`, `ulimit`, `who`, `last`, `lastb`, `w`.

---

## Special Permission Bits: SUID and SGID

### SUID (Set User ID) — octal 4000

When set on an executable, it runs with the owner's privileges rather than the caller's.

```bash
chmod u+s /usr/bin/program     # symbolic
chmod 4755 /usr/bin/program    # octal
```

Example: `/usr/bin/passwd` has SUID set so any user can change their own password.

### SGID (Set Group ID) — octal 2000

On an executable: runs with the group's privileges.
On a directory: new files inherit the directory's group.

```bash
chmod g+s /shared/dir
chmod 2755 /shared/dir
```

### Finding SUID/SGID Files

```bash
find / -perm -4000 -type f        # all SUID files
find / -perm -2000 -type f        # all SGID files
find / -perm /6000 -type f        # SUID or SGID (either bit set)
find / -perm -6000 -type f        # SUID and SGID (both bits set)
```

The `-` prefix means "at least these bits are set"; `/` means "any of these bits".

---

## Password Management

### passwd

```bash
passwd                       # change own password
passwd emma                  # change another user's password (root only)
passwd -S emma               # show password status
passwd -l emma               # lock account (prepend ! to hash)
passwd -u emma               # unlock account
passwd -e emma               # expire password (force change at next login)
passwd -d emma               # delete password (passwordless login)
```

`passwd -S` output format: `USERNAME STATUS DATE MIN MAX WARN INACTIVE`

Status codes: `P` = password set, `L` = locked, `NP` = no password.

### chage — change password aging

```bash
chage -l emma                # list aging information
chage -m 7 emma              # minimum days between changes
chage -M 90 emma             # maximum days before change required
chage -d 0 emma              # force change at next login (last change = epoch)
chage -d 2024-01-01 emma     # set last change date
chage -W 14 emma             # days of warning before expiry
chage -I 30 emma             # inactive days after expiry before lock
chage -E 2025-12-31 emma     # account expiry date (YYYY-MM-DD)
chage -E -1 emma             # set expiry to never
```

### usermod — lock/unlock

```bash
usermod -L emma              # lock (same effect as passwd -l)
usermod -U emma              # unlock
usermod -f 30 emma           # inactive days (same as chage -I)
usermod --inactive 30 emma   # long form of -f
```

---

## su — Switch User

```bash
su emma                      # switch to emma, keep current environment
su - emma                    # switch to emma, load full login environment
su                           # switch to root, keep environment
su -                         # switch to root with full login environment
```

The `-` (or `-l` / `--login`) flag sources the target user's shell profile files and sets `HOME`, `SHELL`, `USER`, `LOGNAME`.

---

## Listing Open Files and Ports

### lsof — list open files

```bash
lsof -i                      # all internet connections
lsof -i4                     # IPv4 only
lsof -i6                     # IPv6 only
lsof -i :22                  # processes using port 22
lsof -i :22 -P               # same, show port numbers not names
lsof -i @192.168.1.1         # connections to a specific IP
lsof -i TCP                  # TCP connections only
```

### fuser — identify processes using files/ports

```bash
fuser -v /var/log/syslog     # verbose: which process uses this file
fuser -n tcp 22              # which process listens on TCP port 22
fuser -n udp 53              # UDP port 53
fuser -k /var/log/syslog     # send SIGKILL to processes using the file
```

ACCESS codes in `fuser -v` output: `c` (current dir), `e` (executable), `f` (open file), `r` (root dir), `m` (memory-mapped).

---

## netstat

```bash
netstat -l                   # listening sockets only
netstat -t                   # TCP sockets
netstat -u                   # UDP sockets
netstat -n                   # numeric addresses/ports (no DNS)
netstat -e                   # extended information
netstat -tulnp               # all TCP/UDP listening, numeric, with process
netstat -r                   # routing table
```

Without `-l`, `netstat` shows established connections only.

---

## nmap — Network Mapper

```bash
nmap 192.168.1.1             # scan single host
nmap 192.168.1.1 192.168.1.2 # scan multiple hosts
nmap 192.168.1.1-254         # scan a range
nmap 192.168.1.0/24          # scan a subnet
nmap 192.168.1.*             # wildcard range

nmap -p 22 192.168.1.1       # specific port
nmap -p 22,80,443 host       # port list
nmap -p 1-1024 host          # port range
nmap -p- host                # all 65535 ports
nmap -F host                 # fast scan (top 100 ports)
nmap -v host                 # verbose output
nmap --exclude 192.168.1.5 192.168.1.0/24   # exclude a host
```

---

## ulimit — Resource Limits

`ulimit` is a bash built-in that sets per-process resource limits.

```bash
ulimit -a                    # show all current soft limits
ulimit -Ha                   # show all hard limits

ulimit -S -n 1024            # set soft limit for open files
ulimit -H -n 4096            # set hard limit for open files
ulimit -f 100                # max file size in 512-byte blocks
ulimit -b                    # max socket buffer size
ulimit -l                    # max locked memory
ulimit -m                    # max resident set size
ulimit -v                    # max virtual memory
ulimit -u                    # max number of user processes
```

Soft limits can be raised up to the hard limit by any user. Hard limits can only be raised by root.

### /etc/security/limits.conf

Persistent limits that survive reboots. Applied by PAM at login.

```
emma    hard    nproc   50
@staff  soft    nofile  4096
*       hard    core    0
```

Format: `USER/GROUP  TYPE  ITEM  VALUE`
Types: `soft`, `hard`, `both`.

---

## Login History and Active Sessions

### last and lastb

```bash
last                         # successful logins (from /var/log/wtmp)
last emma                    # logins for a specific user
last reboot                  # system reboots
lastb                        # failed login attempts (from /var/log/btmp)
```

### who

```bash
who                          # currently logged-in users
who -b                       # last system boot time
who -r                       # current runlevel
who -H                       # print column headers
```

### w

```bash
w                            # who is logged in and what they are doing
```

`w` output columns: `USER`, `TTY`, `FROM` (remote host), `LOGIN@`, `IDLE`, `JCPU` (total CPU for job), `PCPU` (CPU for current process), `WHAT` (current command).

---

## sudo — Privilege Escalation

```bash
sudo command                 # run command as root
sudo -u emma command         # run command as user emma
sudo -l                      # list allowed commands for current user
sudo -s                      # start a root shell
```

Credential cache: by default, sudo remembers authentication for 15 minutes (`timestamp_timeout = 15`).

### /etc/sudoers

Always edit with `visudo` — it checks syntax before saving.

```
# Basic format:
# USER  HOST=(RUNAS)  COMMAND

root    ALL=(ALL:ALL) ALL
emma    ALL=(ALL:ALL) ALL
%sudo   ALL=(ALL:ALL) ALL          # group sudo (Debian)
%wheel  ALL=(ALL:ALL) ALL          # group wheel (RHEL)

# No password required:
emma    ALL=(ALL) NOPASSWD: ALL

# Specific command:
emma    ALL=(root) /usr/bin/systemctl restart nginx
```

### Aliases in sudoers

```
Host_Alias   WEBSERVERS = web1, web2
User_Alias   ADMINS = alice, bob
Cmnd_Alias   SERVICES = /usr/bin/systemctl, /usr/sbin/service
Runas_Alias  WEBUSERS = www-data, nginx

ADMINS  WEBSERVERS=(WEBUSERS) SERVICES
```

| Alias Type | Purpose |
|---|---|
| `Host_Alias` | Groups of hosts |
| `User_Alias` | Groups of users |
| `Cmnd_Alias` | Groups of commands |
| `Runas_Alias` | Groups of users commands can run as (by UID) |

### /etc/sudoers.d/

Drop-in directory for additional sudoers rules. Files here are included automatically.

```bash
visudo -f /etc/sudoers.d/emma
```

### Adding a user to the sudo group

```bash
usermod -aG sudo emma        # Debian/Ubuntu
usermod -aG wheel emma       # RHEL/CentOS/Fedora
```

---

## Quick Reference

```
Special bits:
  SUID 4000 / u+s    run as owner
  SGID 2000 / g+s    run as group / inherit group in dirs
  find / -perm -4000 -type f     find SUID files
  find / -perm /6000 -type f     find SUID or SGID files

passwd -S emma    P=password L=locked NP=no password
passwd -l / -u / -e / -d emma

chage -l emma           list aging info
chage -m/-M/-W/-I/-E/-d emma

usermod -L/-U emma      lock/unlock
usermod -f N emma       inactive days

su emma / su - emma     keep env / load login env

lsof -i :PORT    process using port
fuser -n tcp PORT    same
fuser -k FILE    kill users of file

netstat -tulnp    listening TCP/UDP numeric with process
nmap HOST / RANGE / CIDR
  -p PORT  -F (100 ports)  -v

ulimit -a (soft)  -Ha (hard)
/etc/security/limits.conf   persistent limits

last / lastb      login history
who -b/-r/-H / w

sudo -u USER CMD   run as user
/etc/sudoers (edit with visudo):
  USER HOST=(RUNAS) CMD
  NOPASSWD:  %group  Aliases
/etc/sudoers.d/    drop-in files
```

---

## Exam Questions

1. What octal value represents the SUID bit? → `4000` (symbolic: `u+s`)
2. What `find` command locates all SUID files on the system? → `find / -perm -4000 -type f`
3. What does the `-` prefix mean in `find -perm -4000`? → At least those bits are set (the SUID bit must be set; other bits may vary).
4. What does `passwd -S emma` output and what does each field mean? → Username, status (P/L/NP), last change date, min days, max days, warn days, inactive days.
5. How do you force a user to change their password at next login with `chage`? → `chage -d 0 emma`
6. How do you set an account expiry date to never with `chage`? → `chage -E -1 emma`
7. What is the difference between `su emma` and `su - emma`? → `su - emma` loads the full login environment (HOME, SHELL, profile); `su emma` keeps the current environment.
8. What `lsof` option shows connections to a specific port? → `-i :PORT` (e.g., `lsof -i :22`)
9. How do you use `fuser` to find which process listens on TCP port 80? → `fuser -n tcp 80`
10. What `nmap` option scans only the top 100 ports? → `-F`
11. What is the difference between soft and hard `ulimit`? → Soft limits can be raised up to the hard limit by any user; hard limits can only be raised by root.
12. Where are persistent resource limits configured? → `/etc/security/limits.conf`
13. Where does `last` read its data from? → `/var/log/wtmp`
14. What command shows failed login attempts? → `lastb` (reads from `/var/log/btmp`)
15. What columns does `w` display? → USER, TTY, FROM, LOGIN@, IDLE, JCPU, PCPU, WHAT
16. How do you run a command as a specific user with `sudo`? → `sudo -u username command`
17. What tool must be used to edit `/etc/sudoers`? → `visudo` (checks syntax before saving)
18. How do you allow a group called `ops` to run all commands without a password in sudoers? → `%ops ALL=(ALL) NOPASSWD: ALL`

---

## Exercises

### Exercise 1 — Find SUID/SGID Files

Find all files on the system with both SUID and SGID bits set.

<details>
<summary>Answer</summary>

```bash
find / -perm -6000 -type f
```

The `-6000` means both bits must be set. Use `/6000` if you want files where either bit is set.

</details>

---

### Exercise 2 — Password Aging

Set up the user `alice` so that her password expires in 60 days, she gets a 7-day warning, and her account is locked 14 days after expiry.

<details>
<summary>Answer</summary>

```bash
chage -M 60 alice
chage -W 7 alice
chage -I 14 alice
chage -l alice
```

</details>

---

### Exercise 3 — Resource Limits

Set a persistent hard limit of 50 processes for the user `bob`.

<details>
<summary>Answer</summary>

Add this line to `/etc/security/limits.conf`:

```
bob  hard  nproc  50
```

</details>

---

### Exercise 4 — sudoers Configuration

Allow the group `developers` to restart the `nginx` service without a password.

<details>
<summary>Answer</summary>

Edit `/etc/sudoers` with `visudo`:

```
%developers ALL=(root) NOPASSWD: /usr/bin/systemctl restart nginx
```

</details>

---

### Exercise 5 — Port Investigation

Find which process is listening on TCP port 443, using two different tools.

<details>
<summary>Answer</summary>

```bash
lsof -i :443
fuser -n tcp 443
netstat -tlnp | grep :443
ss -tlnp | grep :443
```

</details>

---

*LPIC-1 Study Notes | Topic 110: Security*
