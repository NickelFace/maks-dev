---
title: "LPIC-1 108.2 — System Logging"
date: 2026-04-20
description: "rsyslog configuration with facilities and priorities, logrotate, dmesg, systemd-journald with journalctl filtering and journal management, systemd-cat, ForwardToSyslog. LPIC-1 exam topic 108.2."
tags: ["Linux", "LPIC-1", "logging", "rsyslog", "journald", "journalctl", "syslog", "admin"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-108-2-logging/"
---

> **Exam weight: 4** — LPIC-1 v5, Exam 102

## What You Need to Know

From the official LPIC-1 objectives:

- Configure the syslog daemon.
- Understand standard facilities, priorities, and actions.
- Configure log rotation.
- Awareness of systemd journal.
- Filter systemd journal data.
- Delete old systemd journal data.
- Retrieve systemd journal data from a rescue system.
- Understand interaction of rsyslog with systemd-journald.

Key files and commands: `/etc/rsyslog.conf`, `/var/log/`, `syslog`, `rsyslogd`, `logger`, `/etc/logrotate.conf`, `/etc/logrotate.d/`, `logrotate`, `/var/log/journal/`, `/etc/systemd/journald.conf`, `journalctl`, `systemd-cat`.

---

## Log Files

### Common Log Files in /var/log/

| File | Contents |
|---|---|
| `auth.log` | Authentication events, sudo usage |
| `syslog` | General system messages (Debian/Ubuntu) |
| `messages` | General system messages (RHEL/CentOS) |
| `kern.log` | Kernel messages |
| `debug` | Debug-level messages |
| `daemon.log` | Background daemon messages |
| `mail.log` | Mail server activity |
| `Xorg.0.log` | X display server log |
| `wtmp` | Binary: successful login history (read with `who` or `w`) |
| `btmp` | Binary: failed login attempts (read with `utmpdump` or `last -f /var/log/btmp`) |
| `faillog` | Binary: failed login counts per user (read with `faillog -a`) |
| `lastlog` | Binary: last login time per user (read with `lastlog`) |

### Log Entry Format

```
Oct 20 10:00:34 hostname program[PID]: message text
```

Fields: timestamp, hostname, program name with PID in brackets, message.

---

## rsyslog

`rsyslog` is the standard syslog daemon on most Linux distributions. Its configuration is in `/etc/rsyslog.conf`, with additional drop-in files in `/etc/rsyslog.d/`.

The configuration file has three sections:

```
#### MODULES ####
# Load input/output modules
module(load="imuxsock")   # local socket input
module(load="imklog")     # kernel log input

#### GLOBAL DIRECTIVES ####
# Global settings
$FileOwner syslog
$FileGroup adm

#### RULES ####
# Facility.Priority  Action
auth,authpriv.*      /var/log/auth.log
*.*;auth,authpriv.none  /var/log/syslog
```

### Facilities

Facilities identify the source or type of log message:

| Facility | Number | Description |
|---|---|---|
| `kern` | 0 | Kernel messages |
| `user` | 1 | User-level messages |
| `mail` | 2 | Mail system |
| `daemon` | 3 | System daemons |
| `auth` / `authpriv` | 4 | Security/authentication |
| `syslog` | 5 | Syslog internal messages |
| `lpr` | 6 | Line printer |
| `news` | 7 | Network news |
| `uucp` | 8 | UUCP system |
| `cron` | 9 | Cron/at jobs |
| `ftp` | 11 | FTP daemon |
| `ntp` | 12 | NTP subsystem |
| `local0`–`local7` | 16–23 | Locally defined |

### Priorities

Priorities (severity levels), from most to least severe:

| Priority | Number | Description |
|---|---|---|
| `emerg` | 0 | System is unusable |
| `alert` | 1 | Action must be taken immediately |
| `crit` | 2 | Critical conditions |
| `err` | 3 | Error conditions |
| `warn` | 4 | Warning conditions |
| `notice` | 5 | Normal but significant condition |
| `info` | 6 | Informational messages |
| `debug` | 7 | Debug-level messages |

A rule with a given priority matches that level **and all higher-severity levels** (lower numbers). Use `=priority` to match exactly one level, and `!priority` to exclude a level.

### Rule Format

```
facility.priority   action
```

Examples:

```
# All auth messages go to auth.log
auth,authpriv.*          /var/log/auth.log

# All messages except auth/authpriv go to syslog
*.*;auth,authpriv.none   /var/log/syslog

# Mail messages at info and above (but not debug) to mail.log
mail.info;mail.!debug    /var/log/mail.log

# Emergency messages to all logged-in users
*.emerg                  :omusrmsg:*

# Send to remote syslog server
*.info                   @192.168.1.1
```

### logger — Send Log Messages Manually

`logger` writes a message to syslog from the command line or a script:

```bash
logger "Backup completed"
logger -p auth.warn "Suspicious login attempt from 10.0.0.5"
logger -t backup "Starting backup process"
```

---

## logrotate

`logrotate` manages log file rotation to prevent unbounded growth. It runs from cron (typically daily).

- Global config: `/etc/logrotate.conf`
- Per-application configs: `/etc/logrotate.d/`

### logrotate.conf Directives

| Directive | Description |
|---|---|
| `rotate N` | Keep N old rotated log files |
| `weekly` / `daily` / `monthly` | Rotation frequency |
| `missingok` | Do not error if log file is missing |
| `notifempty` | Do not rotate if log file is empty |
| `compress` | Compress rotated logs with gzip |
| `delaycompress` | Delay compression until next rotation (keeps one uncompressed) |
| `sharedscripts` | Run pre/postrotate scripts once even for multiple files |
| `postrotate` / `endscript` | Run a shell command after rotation |

Example `/etc/logrotate.d/nginx`:

```
/var/log/nginx/*.log {
    weekly
    rotate 4
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        nginx -s reopen
    endscript
}
```

Rotated log files are renamed: `logfile.1`, `logfile.2.gz`, etc.

---

## dmesg

`dmesg` displays the kernel ring buffer — kernel messages from boot and hardware events:

```bash
dmesg
dmesg | tail
dmesg | grep -i error
```

The kernel ring buffer is limited in size; oldest messages are overwritten first.

---

## systemd-journald

`systemd-journald` is the journaling service that collects log data from the kernel, initrd, and all services. It stores logs in a structured binary format.

Configuration: `/etc/systemd/journald.conf`

### journalctl — Query the Journal

| Option | Description |
|---|---|
| `-r` | Show newest entries first (reverse) |
| `-f` | Follow (like `tail -f`) |
| `-e` | Jump to end of journal |
| `-n N` | Show last N lines |
| `-k` / `--dmesg` | Show only kernel messages |

### Filtering Options

| Option | Description |
|---|---|
| `--list-boots` | List boot IDs and boot numbers |
| `-b N` | Show messages from boot N (0 = current, -1 = previous) |
| `-p PRIORITY` | Filter by priority (number or name, e.g., `-p err`) |
| `--since "DATETIME"` | Show messages since a date/time |
| `--until "DATETIME"` | Show messages until a date/time |
| `/path/to/binary` | Show messages from a specific executable |
| `-u UNIT` | Show messages from a specific systemd unit |

Combine filters with `+` for OR logic:

```bash
journalctl -p err + -u ssh
```

### Journal Fields

Structured fields can be used in filters:

```bash
journalctl PRIORITY=3
journalctl SYSLOG_FACILITY=4
journalctl _PID=1234
journalctl _BOOT_ID=XXXX
journalctl _TRANSPORT=kernel
```

### systemd-cat — Write to Journal

`systemd-cat` sends output from a command or pipe to the journal:

```bash
echo "Backup done" | systemd-cat
systemd-cat -p warning echo "Low disk space"
./script.sh | systemd-cat -t myscript
```

| Option | Description |
|---|---|
| `-p PRIORITY` | Set priority (e.g., `info`, `warning`, `err`) |
| `-t IDENTIFIER` | Set syslog identifier (tag) |

---

## Journal Storage

The `Storage=` directive in `/etc/systemd/journald.conf` controls where journal data is kept:

| Value | Description |
|---|---|
| `auto` | Persistent if `/var/log/journal/` exists; otherwise volatile (default) |
| `persistent` | Always write to `/var/log/journal/` (created if missing) |
| `volatile` | Store only in `/run/log/journal/` (lost on reboot) |
| `none` | Discard all log data |

Persistent journal: `/var/log/journal/`
Volatile journal: `/run/log/journal/`

### Journal Size Configuration

These directives in `journald.conf` control storage limits:

| Directive | Description |
|---|---|
| `SystemMaxUse=` | Max disk space for persistent journal |
| `RuntimeMaxUse=` | Max disk space for volatile journal |
| `SystemKeepFree=` | Min free disk space to leave on persistent storage |
| `RuntimeKeepFree=` | Min free disk space to leave on volatile storage |
| `SystemMaxFileSize=` | Max size of an individual persistent journal file |
| `RuntimeMaxFileSize=` | Max size of an individual volatile journal file |
| `SystemMaxFiles=` | Max number of persistent journal files |
| `RuntimeMaxFiles=` | Max number of volatile journal files |

### Journal Maintenance Commands

```bash
journalctl --disk-usage          # show total journal disk usage
journalctl --vacuum-time=1month  # delete entries older than 1 month
journalctl --vacuum-size=500M    # reduce journal to under 500 MB
journalctl --vacuum-files=5      # keep only 5 journal files
journalctl --rotate              # rotate journal files
journalctl --flush               # flush volatile to persistent journal
journalctl --sync                # sync journal to disk
```

### Rescue Access

Read journals from a non-running system:

```bash
journalctl -D /mnt/var/log/journal     # specify journal directory
journalctl --file /path/to/file.journal
journalctl --root /mnt                 # specify alternate root
journalctl -m                          # merge journals from all hosts
```

### Forwarding to syslog

To forward journal entries to rsyslog, set in `/etc/systemd/journald.conf`:

```
ForwardToSyslog=yes
```

---

## Quick Reference

```
Log files:
  /var/log/auth.log     authentication events
  /var/log/syslog       general (Debian/Ubuntu)
  /var/log/messages     general (RHEL)
  /var/log/kern.log     kernel
  /var/log/wtmp         login history (who, w)
  /var/log/btmp         failed logins (utmpdump, last -f)
  /var/log/faillog      failed login counts (faillog -a)
  /var/log/lastlog      last login per user (lastlog)

rsyslog:
  /etc/rsyslog.conf     main config (MODULES / GLOBAL DIRECTIVES / RULES)
  /etc/rsyslog.d/       drop-in configs
  Rule format: facility.priority  action
  Facilities: kern(0) user(1) mail(2) daemon(3) auth(4) syslog(5)
              lpr(6) news(7) uucp(8) cron(9) ftp(11) ntp(12) local0-7(16-23)
  Priorities (high to low): emerg(0) alert(1) crit(2) err(3)
                             warn(4) notice(5) info(6) debug(7)
  *  = all  none = exclude  = = exact  ! = not

logger:
  logger "message"
  logger -p facility.priority "message"
  logger -t tag "message"

logrotate:
  /etc/logrotate.conf   global config
  /etc/logrotate.d/     per-app configs
  Directives: rotate N, weekly/daily/monthly, compress, delaycompress,
              missingok, notifempty, sharedscripts, postrotate/endscript

dmesg:
  dmesg                 kernel ring buffer

journalctl:
  -r  reverse    -f  follow    -e  jump to end    -n N  last N lines
  -k/--dmesg     kernel only
  --list-boots   list boots
  -b N           boot N (0=current, -1=previous)
  -p PRIORITY    filter by severity
  --since/--until "DATETIME"
  -u UNIT        unit messages
  /path/exec     messages from executable
  + between filters = OR

journalctl maintenance:
  --disk-usage        total journal size
  --vacuum-time=      delete entries older than
  --vacuum-size=      shrink to size
  --vacuum-files=     keep N files
  --rotate            rotate files
  --flush             volatile -> persistent
  --sync              sync to disk

journald storage:
  Storage=auto        /var/log/journal/ if exists, else /run/
  Storage=persistent  always /var/log/journal/
  Storage=volatile    always /run/log/journal/
  Storage=none        discard all

systemd-cat:
  echo "msg" | systemd-cat
  systemd-cat -p warning echo "msg"
  systemd-cat -t TAG cmd

Forward to syslog: ForwardToSyslog=yes in journald.conf
```

---

## Exam Questions

1. What format does a syslog log entry follow? → `Timestamp Hostname Program[PID]: Message`
2. Which log file records failed login attempts? → `/var/log/btmp` (read with `last -f /var/log/btmp` or `utmpdump`)
3. What command reads the `faillog` binary file? → `faillog -a`
4. What is the rsyslog facility number for the `cron` facility? → 9
5. What is the priority number for `err`? → 3
6. What does `*.emerg :omusrmsg:*` do in rsyslog? → Sends all emergency messages to all logged-in users.
7. What does `auth,authpriv.none` mean in an rsyslog rule? → Exclude both `auth` and `authpriv` facilities from this rule.
8. What command sends a custom message to syslog from a script? → `logger "message"` or `logger -p facility.priority "message"`
9. What does `delaycompress` do in logrotate? → Keeps the most recently rotated log uncompressed; compresses it on the next rotation.
10. What does `notifempty` do in logrotate? → Skips rotation if the log file is empty.
11. What does `postrotate / endscript` do in logrotate? → Runs a shell command after log rotation (e.g., to reload the logging daemon).
12. How do you show only kernel messages in the journal? → `journalctl -k` or `journalctl --dmesg`
13. How do you follow new journal entries in real time? → `journalctl -f`
14. How do you show journal entries from the previous boot? → `journalctl -b -1`
15. How do you filter journal entries by priority `err` and above? → `journalctl -p err`
16. What does `journalctl --vacuum-time=2weeks` do? → Deletes journal entries older than 2 weeks.
17. What is `Storage=volatile` in `journald.conf`? → Stores the journal only in `/run/log/journal/`, which is lost on reboot.
18. How do you make the journal forward entries to rsyslog? → Set `ForwardToSyslog=yes` in `/etc/systemd/journald.conf`.

---

## Exercises

### Exercise 1 — rsyslog Rule

Write an rsyslog rule that sends all `mail` facility messages at `info` and above to `/var/log/mail.log`, and all `kern` facility messages to `/var/log/kern.log`.

<details>
<summary>Answer</summary>

```
mail.info     /var/log/mail.log
kern.*        /var/log/kern.log
```

</details>

---

### Exercise 2 — journalctl Filtering

Show all journal entries from the current boot with priority `warning` or higher, in reverse order.

<details>
<summary>Answer</summary>

```bash
journalctl -b 0 -p warning -r
```

</details>

---

### Exercise 3 — logrotate Configuration

Write a logrotate stanza for `/var/log/myapp.log` that rotates weekly, keeps 8 old files, compresses them (with one delay), and signals the app after rotation.

<details>
<summary>Answer</summary>

```
/var/log/myapp.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        kill -HUP $(cat /var/run/myapp.pid)
    endscript
}
```

</details>

---

### Exercise 4 — Recovering Journal from Rescue System

A system will not boot. You mount the broken system's root at `/mnt`. How do you read its journal?

<details>
<summary>Answer</summary>

```bash
journalctl --root /mnt
```

Or, pointing directly to the journal directory:

```bash
journalctl -D /mnt/var/log/journal
```

</details>

---

### Exercise 5 — Journal Disk Usage

How do you check how much disk space the journal is using, and then reduce it to no more than 200 MB?

<details>
<summary>Answer</summary>

```bash
journalctl --disk-usage
journalctl --vacuum-size=200M
```

</details>

---

*LPIC-1 Study Notes | Topic 108: Essential System Services*
