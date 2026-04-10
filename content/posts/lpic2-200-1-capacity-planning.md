---
title: "LPIC-2 200.1 — Measuring and Diagnosing Resource Usage"
date: 2026-04-10
description: "CPU, memory, disk I/O and network monitoring tools: top, vmstat, iostat, sar, ss, lsof and more. LPIC-2 exam topic 200.1."
tags: ["Linux", "Performance", "LPIC-2", "Monitoring", "sysstat"]
categories: ["LPIC-2"]
---

> **Exam weight: 6 points** — one of the highest-weighted topics in section 200.

The core principle: **"You can't manage what you can't measure."** Resource monitoring falls into three categories:

- **Operational** — watching the current state of the system
- **Diagnostic** — finding the root cause of a specific problem
- **Capacity** — collecting data for capacity planning

Key metrics to track on every system: uptime, CPU load average, RAM and swap usage, disk I/O, network I/O, firewall and router throughput.

---

## Measuring CPU

### uptime

Shows current time, system uptime, number of logged-in users, and **load average** over 1, 5, and 15 minutes.

```bash
uptime          # standard output
uptime -V       # utility version
```

Example output:

```
$ uptime
03:03:12 up  1:00,  2 users,  load average: 0.17, 0.18, 0.16
```

> **Note:** Load average is the mean number of processes in the run queue (running + waiting for I/O). A value **≤ the number of CPU cores** is normal. If load average exceeds the core count, the system is overloaded.

---

### top

Real-time dynamic monitor for CPU, memory, and process states.

```bash
top
```

Example output:

```
top - 03:01:24 up 59 min,  2 users,  load average: 0.15, 0.19, 0.16
Tasks: 117 total,   2 running, 115 sleeping,   0 stopped,   0 zombie
%Cpu(s):  0.9 us,  4.5 sy,  0.1 ni, 94.3 id,  0.1 wa,  0.0 hi,  0.1 si,  0.0 st
KiB Mem:    514332 total,   497828 used,    16504 free,    63132 buffers
KiB Swap:   392188 total,        0 used,   392188 free,   270552 cached

  PID USER      PR  NI  VIRT  RES  SHR S  %CPU %MEM    TIME+  COMMAND
 4041 root      20   0  106m  31m 9556 R  30.4  6.3   3:05.58 Xorg
 4262 user      20   0  527m  71m  36m S  18.2 14.3   2:04.42 gnome-shell
```

**CPU fields (`%Cpu(s)`):**

| Field | Meaning |
|---|---|
| `us` | User space (non-kernel) |
| `sy` | Kernel space |
| `ni` | Processes with altered nice value |
| `id` | Idle |
| `wa` | I/O wait — **high value = disk bottleneck** |
| `hi` | Hardware interrupts |
| `si` | Software interrupts |
| `st` | Steal time (hypervisor stole CPU from this VM) |

**Key `top` hotkeys:**

| Key | Action |
|---|---|
| `P` | Sort by CPU |
| `M` | Sort by memory |
| `k` | Kill a process |
| `1` | Show each CPU core separately |
| `h` / `?` | Help |
| `q` | Quit |

---

### htop

An enhanced `top` with vertical and horizontal scrolling. Shows all processes with full command lines. Kill and renice without entering PIDs.

```bash
htop            # launch
htop -u user    # filter by user
```

> **Tip:** `htop`'s key advantage over `top`: process management (kill, renice) without knowing the PID — all through an interactive interface with function keys.

---

### sar — System Activity Reporter

Collects, stores, and displays system activity. Data is stored in `/var/log/sa/` (by the `sadc` daemon). Package: `sysstat`.

```bash
sar                    # CPU stats for today (10-minute intervals)
sar 2 20               # 20 samples at 2-second intervals
sar -u 1 5             # CPU utilization
sar -d 1 5             # disk I/O stats
sar -b 1 5             # I/O transfer rates
sar -r 1 5             # free memory and swap
sar -n DEV 1 5         # network interfaces
sar -q 1 5             # run queue
sar -c 1 5             # system calls
sar -p                 # paging activity
sar -w                 # swapping activity
sar -f /var/log/sa/sa15  # data from a file (15th of the month)
```

Example — CPU (no options):

```
$ sar
Linux 3.2.0-4-686-pae (debian)  05/07/2013  _i686_  (2 CPU)

02:02:34      LINUX RESTART

02:05:01    CPU     %user     %nice   %system   %iowait    %steal     %idle
02:15:01    all      0.15      0.00      1.06      0.23      0.00     98.56
02:25:01    all      0.98      0.83      3.84      0.04      0.00     94.31
Average:    all      0.64      0.14      4.19      0.06      0.00     94.98
```

Example — disk stats (`sar -d`):

```
$ sar -d
06:45:01     DEV      tps  rd_sec/s  wr_sec/s  avgrq-sz avgqu-sz   await   svctm   %util
06:55:01  dev8-0     6.89    227.01     59.67     41.59     0.02    2.63    1.38    0.95
Average:  dev8-0     3.49     85.63     30.14     33.15     0.01    2.36    1.19    0.42
```

**Key options for the exam:**

| Option | Shows |
|---|---|
| _(no option)_ | CPU utilization |
| `-u` | CPU utilization (explicit) |
| `-d` | Disk I/O (`tps`, `rd_sec/s`, `wr_sec/s`, `%util`) |
| `-b` | I/O transfer rates (`tps`, `bread/s`, `bwrtn/s`) |
| `-r` | Free memory and swap |
| `-n DEV` | Network interfaces |
| `-q` | Run queue |
| `-c` | System calls |
| `-p`, `-w` | Paging and swapping activity |

> **Important:** `sar` data is stored in `/var/log/sa/`. `LINUX RESTART` in the output marks a system reboot during that period.

---

### ps and pstree

`ps` supports three syntax styles that can be mixed:

- **UNIX** — with a single dash: `ps -ef`
- **BSD** — without a dash: `ps aux`
- **GNU long** — with two dashes: `ps --forest`

```bash
ps aux              # all processes (BSD syntax)
ps -ef              # all processes (UNIX syntax)
ps -eo pid,ppid,cmd,%cpu,%mem  # custom output
ps -u username      # processes of a specific user
```

**Process states (`STAT`):**

| Code | Meaning |
|---|---|
| `R` | Running — executing or in run queue |
| `S` | Sleeping — interruptible wait |
| `D` | **Uninterruptible sleep — waiting for I/O** |
| `Z` | Zombie — finished but not reaped by parent |
| `T` | Stopped — halted by a signal |
| `s` | Session leader |
| `+` | In foreground process group |

> **Warning:** Processes in state **`D`** are blocked on I/O. Their count is reflected in the **`b`** column of `vmstat`. Many D-state processes = disk or network filesystem problem.

### pstree

Displays processes as a tree rooted at a PID (or `init` if not specified). Identical branches are collapsed with a numeric prefix. Child threads appear in `{}`.

```bash
pstree              # tree from init
pstree -p           # with PID at each node
pstree -u           # with usernames
pstree 3655         # tree from a specific PID
```

Example (`pstree 3655`):

```
gnome-terminal---bash---pstree
               |-bash---man---pager
               |-gnome-pty-helpe
               `-3*[{gnome-terminal}]
```

> **Note:** `3*[{gnome-terminal}]` means 3 identical child threads of `gnome-terminal`. Use `pstree` to trace the PPID (parent process) of any process.

---

### w

Shows information about logged-in users, their processes, and the same uptime/load average metrics as `uptime`.

```bash
w           # all users (full format)
w -s        # short format
w username  # specific user only
```

> **Note:** `-s` (short format) removes the `LOGIN@`, `JCPU`, and `PCPU` columns.

---

## Measuring Memory and Swap

### vmstat

Reports on virtual memory, processes, paging, block I/O, interrupts, and CPU.

```bash
vmstat              # stats since last boot
vmstat 2 5          # 5 reports at 2-second intervals
vmstat -a           # show active/inactive memory
vmstat -s           # summary statistics table
vmstat -d           # disk statistics
```

Example (`vmstat 2 2`):

```
procs ---memory-- ---swap-- -----io---- -system-- ----cpu----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa
 0  0      0 109112  33824 242204    0    0   603    26  196  516  7 11 81  1
 0  0      0 109152  33824 242204    0    0     0     2  124  239  0  1 98  0
```

> **Warning:** The **first row** shows averages since boot — **ignore it** when analysing current load.

**Column reference:**

| Section | Column | Meaning |
|---|---|---|
| **procs** | `r` | Processes in run queue — waiting for CPU |
| **procs** | `b` | Processes in block queue — **uninterruptible sleep** (waiting for I/O) |
| **memory** | `swpd` | Used virtual (swap) memory, KB |
| **memory** | `free` | Free RAM (not cache, not buffers), KB |
| **memory** | `buff` | Buffers — contain **raw disk blocks** |
| **memory** | `cache` | Cache — contains **files** |
| **swap** | `si` | Swap in — pages/sec **from disk to RAM** |
| **swap** | `so` | Swap out — pages/sec **from RAM to disk** |
| **io** | `bi` | Blocks in — blocks/sec **from** block device |
| **io** | `bo` | Blocks out — blocks/sec **to** block device |
| **system** | `in` | Interrupts/sec (including timer) |
| **system** | `cs` | Context switches/sec |
| **cpu** | `us` | % user space |
| **cpu** | `sy` | % kernel space |
| **cpu** | `id` | % idle |
| **cpu** | `wa` | % I/O wait |
| **cpu** | `st` | % steal time (virtualisation) |

> **Important:** `vmstat` **cannot** show per-core CPU statistics. Use `mpstat` or `ps` for that.

**Swap:** RAM is divided into 4 KB pages. When memory runs low, the kernel swaps out pages of inactive processes to a dedicated partition. Heavy swapping (high `si`/`so`) sharply degrades performance.

---

### free

Shows total physical and swap memory, free space, used memory, and kernel buffers. The `shared` column (deprecated) now shows `tmpfs` (shmem) memory.

```bash
free -h             # human-readable (K/M/G)
free -m             # in megabytes
free -g             # in gigabytes
free -s 2           # update every 2 seconds
```

Example (`free -h`):

```
             total       used       free     shared    buffers     cached
Mem:          502M       489M        13M        50B        44M       290M
-/+ buffers/cache:       154M       347M
Swap:         382M       3.9M       379M
```

> **Note:** The `-/+ buffers/cache` row shows real memory usage excluding buffers and cache. In this example, 154M is actually used and 347M is available to applications (cache can be dropped when needed).

---

## Measuring Disk I/O

### iostat

Monitors I/O device load. Without parameters, shows statistics **since the last reboot**. With `interval` and `count`, adds periodic samples.

```bash
iostat              # stats since boot
iostat 1 3          # 3 samples at 1-second intervals
iostat -c           # CPU stats only
iostat -d           # devices only
iostat -x           # extended device statistics
iostat -y 1 5       # suppress the first row (boot average)
```

Example — basic output:

```
$ iostat
avg-cpu:  %user   %nice %system %iowait  %steal   %idle
           1.25    0.32    3.76    0.20    0.00   94.46

Device:            tps    kB_read/s    kB_wrtn/s    kB_read    kB_wrtn
sda              12.21       214.81        17.38     333479      26980
```

| Field | Meaning |
|---|---|
| `tps` | Transactions per second to the device |
| `kB_read/s` | KB/s read |
| `kB_wrtn/s` | KB/s written |
| `%iowait` | % CPU waiting for I/O — **high value = bottleneck** |

> **Tip:** `watch` turns any static utility into a dynamic one:
> ```bash
> watch -n 5 iostat    # refresh every 5 seconds
> ```

---

### iotop

The `top` equivalent for disk I/O — shows load per process in real time. Displays I/O bandwidth per process/thread, I/O priority, and the percentage of time spent on swap-in and I/O wait.

```bash
iotop               # interactive mode
iotop -b            # batch mode (for scripts/pipes)
iotop -o            # only processes with active I/O
iotop -p PID        # specific process
```

Example (`iotop -b | head`):

```
Total DISK READ :       0.00 B/s | Total DISK WRITE :     213.38 M/s
  TID  PRIO  USER     DISK READ  DISK WRITE  SWAPIN      IO    COMMAND
    6 be/4 root        0.00 B/s    0.00 B/s  0.00 % 99.99 % [kworker/u8:0]
 2976 be/4 root        0.00 B/s  213.38 M/s  0.00 %  0.00 % dd if=/dev/zero of=/tmp/foo
```

| Column | Meaning |
|---|---|
| `PRIO` | I/O priority (class/level), e.g. `be/4` = best effort |
| `DISK READ` / `DISK WRITE` | Read/write throughput for the process |
| `SWAPIN` | % time in swap-in |
| `IO` | % time waiting for I/O |

---

### lsof

Lists information about open files and the processes using them. Handles regular files, directories, block/character special files, libraries, streams, and network files.

```bash
lsof                    # all open files of all processes
lsof -p PID             # files of a specific process
lsof /path/to/file      # which process is using this file
lsof +d /var/log        # open files in directory (one level)
lsof +D /var/log        # recursive
lsof -i                 # all network connections
lsof -i :80             # processes on port 80
lsof -i TCP             # TCP connections only
lsof -u username        # user's files
lsof -F                 # machine-readable output
```

Example — who has a file open:

```
$ sudo lsof /var/run/utmp
COMMAND    PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
gdm-simpl 4040 root   10u   REG   0,14     5376  636 /run/utmp
```

| Column | Meaning |
|---|---|
| `FD` | File descriptor — `r`=read, `w`=write, `u`=read+write |
| `TYPE` | File type: `REG`=file, `DIR`=directory, `IPv4`/`IPv6`=network |
| `DEVICE` | Device numbers (major, minor) |
| `NODE` | Inode number |

> **Tip:** `lsof -i` quickly shows all active network services. `lsof | grep deleted` finds files that have been deleted but are still held open by processes (a common cause of disk space exhaustion).

---

## Measuring Network I/O

### netstat

> **Warning:** `netstat` is considered **deprecated**. Use `ss` and `ip` instead.

Shows network connections, routing tables, interface statistics, masquerade connections, and multicast membership.

```bash
netstat             # all active sockets
netstat -r          # routing table (= route -e)
netstat -i          # interface statistics
netstat -s          # per-protocol statistics
netstat -tulnp      # TCP/UDP listeners with PID (no name resolution)
netstat -an         # all connections without name resolution
```

---

### ss

The modern replacement for `netstat` — reads data directly from kernel space and provides more information about TCP states.

```bash
ss                  # all connections
ss -t               # TCP only
ss -u               # UDP only
ss -l               # listening sockets only
ss -n               # no name resolution
ss -p               # show processes
ss -a               # all (including listening)
ss -tulnp           # equivalent of netstat -tulnp
ss -s               # summary statistics
ss -o state ESTABLISHED  # established connections only
```

Example (`ss -t -a`):

```
State      Recv-Q Send-Q    Local Address:Port    Peer Address:Port
LISTEN     0      5         192.168.122.1:domain             *:*
LISTEN     0      128                   *:ssh                *:*
LISTEN     0      100           127.0.0.1:smtp               *:*
```

> **Important:** `ss` is faster and more informative than `netstat` because it reads directly from kernel space. Prefer it for network performance diagnostics.

---

### iptraf / iptraf-ng

Interactive network monitor with a menu. Captures packets and shows current traffic.

```bash
iptraf-ng           # launch (requires root)
```

Collects: TCP packet and byte counters per connection, interface statistics, TCP/UDP traffic breakdown, per-LAN-station packet counters, TCP flag / ICMP / OSPF information.

> **Note:** `iptraf` is a **dynamic** menu-driven tool, especially useful for real-time IP network load monitoring.

---

## Process and Resource Correlation

```bash
# Find processes blocked on I/O
ps aux | awk '$8 == "D"'
ps -eo pid,stat,cmd | grep " D"

# Process tree with PIDs
pstree -p

# Files open by a process
lsof -p PID

# Process memory map
pmap PID
```

> **Important:** Processes in **`D`** state (uninterruptible sleep) are blocked on I/O. Their count appears in the **`b`** column of `vmstat`.

**Resource dependency chain:**

```
RAM shortage
    ↓
Swap increases (si/so in vmstat)
    ↓
Disk I/O increases (bi/bo in vmstat, iostat shows high %iowait)
    ↓
Processes block in D-state (vmstat column b)
    ↓
Artificially low CPU load (CPU idles, waiting for I/O)
```

> **Warning:** RAM shortage **artificially suppresses** CPU load. After adding RAM, CPU load will increase — that is normal.

---

## Correlating Symptoms and Problems

> **Important:** All resource problems share a common trait — one or more resources cannot handle the load under certain conditions. Resources are interconnected: CPU, physical/virtual memory, storage, network interfaces, I/O between components.

| Symptom | Likely cause | Diagnostic tools |
|---|---|---|
| High `%iowait` in CPU | Disk overload / slow I/O | `iostat -x`, `iotop`, `lsof` |
| High `si`/`so` in vmstat | RAM shortage, active swap | `free`, `vmstat`, `sar -r` |
| Many processes in `b` (vmstat) | I/O blocking, disk issues | `ps -eo pid,stat,cmd \| grep " D"`, `iotop` |
| High load average, low CPU% | Processes waiting for I/O (D-state) | `vmstat`, `iostat`, `ps` |
| Resource at 100% utilisation | Clear bottleneck | `top`, `sar`, `iostat` |
| Many TIME_WAIT in netstat/ss | High traffic, socket exhaustion | `ss -s`, `netstat -s` |
| High `st` (steal) | Host system overloaded (VM) | `top`, `vmstat` |
| Unexpected disk space exhaustion | Open deleted files | `lsof \| grep deleted` |

### Diagnostic algorithm

1. `uptime` → check load average
2. `top` / `vmstat` → CPU, memory, swap, blocked processes
3. `iostat` / `iotop` → disk problem?
4. `free` / `sar -r` → memory shortage?
5. `ss` / `netstat` → network connections
6. `ps aux` → specific offending processes
7. `lsof -p PID` → what is the process doing

---

## Exam Cheat Sheet

### Utility Quick Reference

| Utility | Type | Monitors | Package |
|---|---|---|---|
| `iostat` | Static/Dynamic | CPU, device I/O | sysstat |
| `iotop` | Dynamic | Device I/O by process | iotop |
| `vmstat` | Static/Dynamic | Memory, swap, I/O, CPU | procps |
| `netstat` | Static | Network (deprecated) | net-tools |
| `ss` | Static | Network (modern) | iproute2 |
| `iptraf` | Dynamic | Network | iptraf-ng |
| `ps` | Static | CPU, process states | procps |
| `pstree` | Static | Process map | psmisc |
| `w` | Static | CPU, users | procps |
| `lsof` | Static | Network, process map | lsof |
| `top` | Dynamic | CPU, memory, processes | procps |
| `htop` | Dynamic | CPU, memory, processes | htop |
| `uptime` | Static | Uptime, load average | procps |
| `sar` | Static/Dynamic | CPU, mem, net, I/O | sysstat |
| `free` | Static | Memory | procps |

### Key Files

| File / Path | Contents |
|---|---|
| `/var/log/sa/` | `sar` data (sadc) |
| `/proc/cpuinfo` | CPU information |
| `/proc/meminfo` | Memory information |
| `/proc/net/` | Kernel network statistics |
| `/proc/diskstats` | Disk statistics |
| `/proc/PID/` | Per-process information |

### Frequently Tested Commands

```bash
# sar CPU stats: 20 samples at 2-second intervals
sar 2 20

# Processes blocked on I/O
ps -eo pid,stat,cmd | grep " D"
# OR: column b in vmstat

# What is listening on port 80
ss -tulnp | grep :80
lsof -i :80

# Top I/O consumers
iotop -o

# Extended disk statistics
iostat -x 1 5

# Swap statistics
vmstat -s | grep -i swap
free -h

# Listening sockets only
ss -lntp
netstat -tulnp

# Routing table
netstat -r
ip route show
```

### Key Facts for the Exam

- `vmstat` column `b` = processes in **uninterruptible sleep** (waiting for I/O)
- D-state processes in `ps` = blocked on I/O
- `si`/`so` in vmstat = swap in/out (high = RAM shortage)
- `bi`/`bo` in vmstat = blocks in/out (block device I/O)
- `wa` in CPU = % I/O wait (high = disk problems)
- `ss` replaces `netstat` (reads from kernel space directly)
- `sar` data is stored in `/var/log/sa/`
- Package `sysstat` includes: `iostat`, `sar`, `mpstat`, `sadf`
- Package `procps` includes: `free`, `uptime`, `vmstat`, `w`
- `netstat` is **deprecated** (`ss` and `ip` are the replacements)

---

## Practice Questions

**Q1.** The `b` column in `vmstat` output shows 8. What does this mean?

**Answer:** 8 processes are in uninterruptible sleep, blocked waiting for I/O (block queue). This may indicate a disk performance problem.

---

**Q2.** Which command lets you see in real time which processes are creating the most disk load?

**Answer:** `iotop` (or `iotop -o` for active processes only).

---

**Q3.** An admin sees high `%iowait` in `top`. Which utilities help identify the offending process?

**Answer:** `iotop` (shows load by process), `lsof` (shows open files), `ps aux | grep " D"` (D-state processes).

---

**Q4.** The `si` and `so` columns in `vmstat` consistently show high values. What does this mean and what is the likely cause?

**Answer:** Intensive swap in/out — the system is actively moving memory pages between RAM and swap. The likely cause is insufficient physical RAM. The consequence is system slowdown due to slow disk I/O substituting for memory.

---

**Q5.** How does `ss` differ from `netstat` and why is it preferred?

**Answer:** `ss` reads data directly from kernel space, runs faster, and provides more information about TCP states and sockets. `netstat` is considered obsolete.

---

**Q6.** Which package must be installed on Debian to use `iostat` and `sar`?

**Answer:** `sysstat` (`apt install sysstat`).

---

**Q7.** An admin notices high load average with low CPU utilisation (high `%idle`). How do you explain this?

**Answer:** Processes are waiting for I/O (uninterruptible sleep, D-state). Load average counts not only processes on the CPU but also those blocked on I/O. Check `vmstat` (column `b`), `iostat` (high `%iowait`), `iotop`.

---

**Q8.** Which `sar` command shows swap activity for the current day, 10 samples at 1-second intervals?

**Answer:** `sar -w 1 10` (swapping activity) or `sar -r 1 10` (memory and swap).
