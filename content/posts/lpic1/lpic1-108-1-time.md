---
title: "LPIC-1 108.1 — Maintain System Time"
date: 2026-04-20
description: "System clock vs hardware clock, date and hwclock commands, timedatectl, NTP concepts (stratum, offset, drift, jitter), systemd-timesyncd, ntpd with ntp.conf and ntpq, chrony with chronyc and chrony.conf. LPIC-1 exam topic 108.1."
tags: ["Linux", "LPIC-1", "time", "NTP", "chrony", "systemd", "admin"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-108-1-time/"
---

> **Exam weight: 3** — LPIC-1 v5, Exam 102

## What You Need to Know

From the official LPIC-1 objectives:

- Set the system date and time.
- Set the hardware clock to the correct time in UTC.
- Configure the correct timezone.
- Basic NTP configuration using ntpd and chrony.
- Knowledge of the pool.ntp.org service.
- Awareness of the ntpq, chronyc, and timedatectl commands.

Key files and commands: `/usr/share/zoneinfo/`, `/etc/timezone`, `/etc/localtime`, `/etc/ntp.conf`, `/etc/chrony.conf`, `date`, `hwclock`, `timedatectl`, `ntpd`, `ntpq`, `chronyd`, `chronyc`, `pool.ntp.org`.

---

## System Clock vs Hardware Clock

Linux maintains two separate clocks:

| Clock | Description |
|---|---|
| System clock | Software clock maintained by the kernel; lost on power-off |
| Hardware clock (RTC) | Battery-backed clock on the motherboard; persists without power |

At boot, the kernel reads the RTC to initialize the system clock. After that, the two clocks run independently.

The hardware clock can store time as local time or UTC. Linux distributions default to UTC for the hardware clock, which avoids complications from daylight saving time changes.

---

## date — System Clock

`date` displays or sets the system clock.

```bash
$ date
Mon Oct 21 10:45:21 -03 2019
```

### Useful date Options

| Option | Description |
|---|---|
| `-u` | Display or set time in UTC |
| `-I` | Output in ISO 8601 format (`YYYY-MM-DD`) |
| `-R` | Output in RFC 2822 format (used in email headers) |
| `+%s` | Output Unix epoch (seconds since 1970-01-01 00:00:00 UTC) |
| `--date=@EPOCH` | Convert epoch to human-readable date |
| `--debug` | Show details about how the date string was parsed |
| `-s "STRING"` | Set the system clock to the given time string |

```bash
$ date -u
Mon Oct 21 13:45:21 UTC 2019

$ date +%s
1571661921

$ date --date=@1571661921
Mon Oct 21 10:45:21 -03 2019

$ date -s "2019-10-21 10:45:00"
```

---

## hwclock — Hardware Clock

`hwclock` reads or sets the hardware (RTC) clock and can synchronize it with the system clock.

| Option | Description |
|---|---|
| `--systohc` | Set hardware clock from system clock |
| `--hctosys` | Set system clock from hardware clock |
| `--set --date="STRING"` | Set hardware clock to the given date/time |
| `--verbose` | Show detailed output |

```bash
# Read hardware clock
$ hwclock

# Sync hardware clock to match system clock
$ hwclock --systohc

# Set hardware clock directly
$ hwclock --set --date="2019-10-21 10:45:00"
```

---

## timedatectl — systemd Time Management

`timedatectl` is the systemd tool for viewing and configuring time, timezone, and NTP sync.

```bash
$ timedatectl
               Local time: Mon 2019-10-21 10:45:21 -03
           Universal time: Mon 2019-10-21 13:45:21 UTC
                 RTC time: Mon 2019-10-21 13:45:21
                Time zone: America/Sao_Paulo (-03, -0300)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
```

### timedatectl Commands

| Command | Description |
|---|---|
| `timedatectl set-time "YYYY-MM-DD HH:MM:SS"` | Set system time (NTP must be off) |
| `timedatectl list-timezones` | List all available time zones |
| `timedatectl set-timezone ZONE` | Set the system time zone |
| `timedatectl set-ntp true/false` | Enable or disable NTP synchronization |
| `timedatectl show-timesync --all` | Show full NTP sync details (systemd-timesyncd) |

---

## NTP Concepts

NTP (Network Time Protocol) synchronizes clocks across a network. Servers are organized into a hierarchy called **strata**:

- **Stratum 0**: Reference clocks (atomic clocks, GPS receivers) — not on the network directly
- **Stratum 1**: Servers directly connected to stratum 0 sources
- **Stratum 2**: Servers synchronized from stratum 1
- Higher strata introduce more potential error

`pool.ntp.org` provides a pool of public NTP servers, distributing load across many hosts.

### NTP Terms

| Term | Description |
|---|---|
| Offset | Difference between local clock and NTP time |
| Step | Immediate large time adjustment (when offset is large) |
| Slew | Gradual clock speed adjustment to reduce offset over time |
| Insane Time | Offset too large to correct safely (default threshold: 1000 seconds in ntpd) |
| Drift | Systematic rate at which a clock gains or loses time |
| Jitter | Variability/instability in offset measurements |

---

## systemd-timesyncd

`systemd-timesyncd` is a lightweight SNTP client included with systemd. It is simpler than ntpd or chrony and suitable for most desktop and server use cases that do not need to serve time.

Configuration is in `/etc/systemd/timesyncd.conf`. Status is shown by `timedatectl show-timesync --all`.

---

## ntpd — NTP Daemon

`ntpd` (from the ntp package) is the classic full NTP implementation — it can both synchronize from upstream servers and serve time to other hosts.

Configuration file: `/etc/ntp.conf`

Typical `/etc/ntp.conf`:

```
server 0.pool.ntp.org iburst
server 1.pool.ntp.org iburst
server 2.pool.ntp.org iburst
driftfile /var/lib/ntp/ntp.drift
```

The `iburst` option sends several packets at startup to synchronize quickly.

### ntpq -p — Peer Status

`ntpq -p` shows the list of NTP peers and their status:

```
     remote           refid      st t when poll reach   delay   offset  jitter
==============================================================================
*0.pool.ntp.org  10.0.0.1        2 u   15   64  377    1.234   -0.456   0.123
```

| Column | Meaning |
|---|---|
| `remote` | NTP server hostname (prefix: `*` = selected, `+` = acceptable, `-` = discarded) |
| `refid` | Reference ID of the server's time source |
| `st` | Stratum of the remote server |
| `when` | Seconds since last packet received |
| `poll` | Polling interval in seconds |
| `reach` | Octal bitmask of last 8 poll successes (377 = all succeeded) |
| `delay` | Round-trip delay to the server (ms) |
| `offset` | Time difference between local clock and server (ms) |
| `jitter` | Variability of offset over recent samples (ms) |

---

## chrony

`chrony` is a modern, fast-converging NTP implementation. It handles intermittent connectivity well and is the default on RHEL/Fedora systems.

- Daemon: `chronyd`
- Client: `chronyc`
- Configuration: `/etc/chrony.conf`

Typical `/etc/chrony.conf`:

```
pool pool.ntp.org iburst
driftfile /var/lib/chrony/drift
makestep 1.0 3
rtcsync
```

`makestep 1.0 3` allows a step adjustment if the offset is over 1 second during the first 3 clock updates.

### chronyc Commands

| Command | Description |
|---|---|
| `chronyc tracking` | Show clock performance summary (offset, drift, etc.) |
| `chronyc sources` | List NTP sources and their status |
| `chronyc ntpdata` | Show detailed NTP data for each source |
| `chronyc makestep` | Force an immediate step correction of the clock |

```bash
$ chronyc tracking
Reference ID    : A9FEA97B (time.example.com)
Stratum         : 3
Ref time (UTC)  : Mon Oct 21 13:45:00 2019
System time     : 0.000123456 seconds fast of NTP time
RMS offset      : 0.000045678 seconds
Frequency       : -12.345 ppm slow
Residual freq   : -0.001 ppm
Skew            : 0.012 ppm
Root delay      : 0.012345678 seconds
Root dispersion : 0.001234567 seconds
```

---

## Quick Reference

```
System vs hardware clock:
  System clock    kernel-maintained, lost on reboot
  Hardware clock  battery-backed RTC, persists without power

date:
  date                     current time
  date -u                  UTC time
  date -I                  ISO 8601 (YYYY-MM-DD)
  date -R                  RFC 2822 format
  date +%s                 Unix epoch
  date --date=@EPOCH       epoch to human-readable
  date -s "DATETIME"       set system clock

hwclock:
  hwclock                  read hardware clock
  hwclock --systohc        hardware clock <- system clock
  hwclock --hctosys        system clock <- hardware clock
  hwclock --set --date=STR set hardware clock
  hwclock --verbose        detailed output

timedatectl:
  timedatectl                         show time/timezone/NTP status
  timedatectl set-time "DATETIME"     set time (NTP must be off)
  timedatectl list-timezones          list all timezones
  timedatectl set-timezone ZONE       set timezone
  timedatectl set-ntp true/false      enable/disable NTP
  timedatectl show-timesync --all     timesyncd details

NTP terms:
  Offset      difference between local and NTP time
  Step        large immediate correction
  Slew        gradual speed adjustment
  Drift       systematic clock rate error
  Jitter      variability in offset measurements
  Insane Time offset too large to correct (>1000s default)

ntpq:
  ntpq -p     show peer list (remote/refid/st/when/poll/reach/delay/offset/jitter)
  * prefix    selected server, + acceptable, - discarded

chronyc:
  chronyc tracking    clock performance summary
  chronyc sources     NTP source list
  chronyc ntpdata     detailed source data
  chronyc makestep    force immediate step correction

Config files:
  /etc/ntp.conf          ntpd configuration
  /etc/chrony.conf       chrony configuration
  /etc/systemd/timesyncd.conf   timesyncd configuration
```

---

## Exam Questions

1. What is the difference between the system clock and the hardware clock? → The system clock is maintained by the kernel in memory (lost on power-off); the hardware clock is a battery-backed RTC that persists without power.
2. What command sets the hardware clock from the current system clock? → `hwclock --systohc`
3. What command sets the system clock from the hardware clock? → `hwclock --hctosys`
4. What does `date +%s` output? → The current Unix epoch (seconds since 1970-01-01 00:00:00 UTC).
5. How do you set the system clock to a specific date and time with `date`? → `date -s "YYYY-MM-DD HH:MM:SS"`
6. What does `date --date=@1571661921` do? → Converts the Unix epoch 1571661921 to a human-readable date.
7. What does `timedatectl set-ntp true` do? → Enables NTP synchronization via systemd-timesyncd.
8. What command lists all available time zones on a systemd system? → `timedatectl list-timezones`
9. What is a stratum 1 NTP server? → A server directly connected to a stratum 0 reference clock (atomic clock, GPS).
10. What does the `*` prefix mean in `ntpq -p` output? → That server is the currently selected synchronization source.
11. What does the `reach` column in `ntpq -p` show? → An octal bitmask of the last 8 polling attempts; 377 means all 8 succeeded.
12. What NTP option in `ntp.conf` speeds up initial synchronization? → `iburst` — sends a burst of packets at startup.
13. What file stores ntpd's clock drift information? → `/var/lib/ntp/ntp.drift` (as specified by `driftfile` in `ntp.conf`).
14. What is `chronyc tracking`? → Shows clock performance: current offset, drift, stratum, and reference source.
15. What does `makestep 1.0 3` in `chrony.conf` do? → Allows a step correction if the offset exceeds 1 second, but only during the first 3 clock updates.
16. What is the difference between `step` and `slew` in NTP? → Step is an immediate large correction; slew gradually adjusts clock speed to reduce the offset over time.
17. What is `pool.ntp.org`? → A DNS-based pool of public NTP servers that distributes load across many hosts.
18. What is `systemd-timesyncd`? → A lightweight SNTP client bundled with systemd, suitable for synchronizing time but not for serving time to other hosts.

---

## Exercises

### Exercise 1 — Reading the Hardware Clock

What command reads the hardware clock and shows detailed output?

<details>
<summary>Answer</summary>

```bash
hwclock --verbose
```

</details>

---

### Exercise 2 — Converting an Epoch

The epoch value `1571661921` is shown in a log. How do you convert it to a readable date?

<details>
<summary>Answer</summary>

```bash
date --date=@1571661921
```

</details>

---

### Exercise 3 — Disabling NTP Before Setting Time

You want to set the system time manually to `2019-10-21 15:00:00`. What two commands do you run?

<details>
<summary>Answer</summary>

```bash
timedatectl set-ntp false
timedatectl set-time "2019-10-21 15:00:00"
```

NTP must be disabled before setting the time manually with `timedatectl`.

</details>

---

### Exercise 4 — Reading ntpq Output

In `ntpq -p` output, a server shows `reach` of `377`. What does that mean?

<details>
<summary>Answer</summary>

All 8 of the last polling attempts succeeded. `377` in octal equals `11111111` in binary, meaning every bit is set.

</details>

---

### Exercise 5 — Force chrony Step

The system clock is significantly off and chrony is running. How do you force an immediate step correction?

<details>
<summary>Answer</summary>

```bash
chronyc makestep
```

This forces an immediate large correction instead of waiting for the gradual slew process.

</details>

---

*LPIC-1 Study Notes | Topic 108: Essential System Services*
