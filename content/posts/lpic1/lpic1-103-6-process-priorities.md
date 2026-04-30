---
title: "LPIC-1 103.6 — Modify Process Execution Priorities"
date: 2026-04-16
description: "Process priorities, niceness, nice, renice, schedtool. LPIC-1 exam topic 103.6."
tags: ["Linux", "LPIC-1", "processes", "nice", "renice", "priority", "scheduler"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-103-6-process-priorities/"
page_lang: "en"
---

## What You Need to Know

- What priority a process gets by default.
- How to start a program with a higher or lower priority.
- How to change the priority of an already-running process.

---

## The Linux Scheduler

Operating systems that run multiple processes simultaneously are called multitasking. True parallelism only exists with multiple CPU cores, but even single-processor systems simulate it by rapidly switching between tasks.

At any given moment the CPU handles exactly one process. Most process operations — reading files, network access, screen output — are system calls: the process hands control to the kernel, and while the kernel handles the request the CPU can switch to another process.

The Linux scheduler divides processes into two classes:

- **Real-time processes**. Get static priorities from 0 to 99. They always preempt normal processes.
- **Normal processes** (normal scheduling). Get static priorities from 100 to 139. A lower value means higher priority.

Static real-time priorities are sometimes called static scheduling priorities to distinguish them from dynamic priorities that depend on the nice value.

In **preemptive multitasking** a higher-priority process interrupts a lower-priority one as soon as it enters the run queue.

---

## Reading Priorities

### Priorities in /proc

The actual static priority of a process is stored in `/proc/<PID>/sched`:

```bash
$ grep ^prio /proc/1/sched
prio : 120
```

The default priority of a normal process is 120. The range for normal processes is 100 (highest) to 139 (lowest).

### Priorities in ps

`ps -Al` or `ps -el` show priorities in the `PRI` column. Due to historical quirks, `ps` displays values in the range -40 to 99. To get the real priority, add 40:

```
PRI (ps) + 40 = real priority
80 + 40 = 120  (default)
```

The `NI` column shows the process's nice number.

Sample output:

```
$ ps -el
F S UID  PID PPID C PRI NI ADDR    SZ WCHAN TTY      TIME CMD
4 S   0    1    0 0  80  0 -     9292 -     ?    00:00:00 systemd
1 S   0    3    2 0  60 -20 -       0 -     ?    00:00:00 rcu_gp
```

Sort by CPU usage (ascending):

```bash
$ ps -el --sort=pcpu
```

Extended format with column selection:

```bash
$ ps -e -o user,uid,comm,tty,pid,ppid,pri,pmem,pcpu --sort=-pcpu | head
```

### Priorities in top

`top` displays priorities differently: it subtracts 100 from the real value. This makes real-time priorities negative and easy to spot. Normal processes appear in the range 0 to 39. Real-time processes show `rt` or a negative number.

Correspondence table:

| Real priority | ps PRI | top PR |
|---------------|--------|--------|
| 120 (default) | 80     | 20     |
| 100 (highest normal) | 60 | 0 |
| 139 (lowest normal) | 99 | 39 |

---

## Niceness: Process Politeness

Niceness lets you influence the priority of normal processes. The logic is simple: the "nicer" a process is, the more willingly it yields to others.

- Nice value range: from **-20** (less polite, high priority) to **19** (more polite, low priority).
- By default all processes start with nice = 0, corresponding to real priority 120.
- Only `root` can decrease nice below zero (raise priority).
- A regular user can only increase nice (lower priority).
- Linux allows different nice values for individual threads of the same process.

### Starting with a Changed Priority: nice

The `nice` command launches a program with a specified nice value. Without flags, `nice` sets niceness to 10.

```bash
# Run with niceness 15
$ nice -n 15 tar czf home_backup.tar.gz /home

# Run with niceness -5 (root only)
# nice -n -5 ./critical_task
```

### Changing the Priority of a Running Process: renice

`renice` changes the nice value of an already-running process.

```bash
# By PID (root only for negative values)
# renice -10 -p 2164
2164 (process ID) old priority 0, new priority -10

# By process group
$ renice +5 -g users

# By user
$ renice +3 -u john
```

`-p` specifies a PID, `-g` applies the change to all processes in a group, `-u` to all processes of a user.

### Changing Priority via top

In interactive `top`, press `r`. A prompt appears: `PID to renice [default pid = ...]`. Enter the PID and press Enter, then enter the new nice value.

---

## Quick Reference

```bash
# View the real priority of a process
grep ^prio /proc/<PID>/sched

# List processes with priorities
ps -el
ps -Al

# Start with a non-default priority
nice -n <value> <command>

# Change the priority of a running process by PID
renice <new_value> -p <PID>

# Change the priority for all processes of a user
renice <value> -u <user>

# Change priority via top
# In top press: r -> enter PID -> enter new nice value

# Sort ps by CPU usage (ascending)
ps -el --sort=pcpu

# schedtool: show scheduling parameters
schedtool <PID>

# schedtool: set real-time scheduling with priority
schedtool -R -p <priority> <PID>
```

---

## Exam Tips

**What nice number does a process get by default?**
0 (real priority 120).

**What is the nice value range?**
From -20 to 19.

**Who can set negative nice values?**
Only root.

**How do you determine the real priority from `ps`?**
Add 40 to the PRI column value.

**How does `top` mark real-time processes?**
It shows `rt` or a negative number in the PR column.

**In `ps -el` a process has PRI = -40. What does that mean?**
It's a real-time process: real priority = -40 + 40 = 0 (RT priority range).

**How do you start `backup.sh` with low priority (niceness 10)?**
`nice backup.sh` or `nice -n 10 backup.sh`.

**What does `renice +5 -g users` do?**
Increases the nice value (lowers priority) by 5 for all processes in the `users` group.

---

## Exercises

### Guided Exercises

#### Exercise 1

**In a preemptive multitasking system, a low-priority process holds the CPU. A higher-priority process enters the queue. What happens?**

<details><summary>Answer</summary>

The low-priority process is suspended and the higher-priority process begins executing in its place.

</details>

---

#### Exercise 2

**Look at this `top` output:**

```
  PID USER PR NI VIRT RES SHR S %CPU %MEM TIME+    COMMAND
    1 root 20  0  ... ... ...  S  0,0  0,1 9:59.15  systemd
    2 root 20  0  ...   0   0  S  0,0  0,0 0:02.76  kthreadd
    3 root  0 -20  ...   0   0  I  0,0  0,0 0:00.00  rcu_gp
    4 root  0 -20  ...   0   0  I  0,0  0,0 0:00.00  rcu_par_gp
    8 root  0 -20  ...   0   0  I  0,0  0,0 0:00.00  mm_percpu_wq
    9 root 20  0  ...   0   0  S  0,0  0,0 0:49.06  ksoftirqd/0
   10 root 20  0  ...   0   0  I  0,0  0,0 18:24.20 rcu_sched
   11 root 20  0  ...   0   0  I  0,0  0,0 0:00.00  rcu_bh
   12 root rt  0  ...   0   0  S  0,0  0,0 0:08.17  migration/0
   14 root 20  0  ...   0   0  S  0,0  0,0 0:00.00  cpuhp/0
   15 root 20  0  ...   0   0  S  0,0  0,0 0:00.00  cpuhp/1
   16 root rt  0  ...   0   0  S  0,0  0,0 0:11.79  migration/1
   17 root 20  0  ...   0   0  S  0,0  0,0 0:26.01  ksoftirqd/1
```

**Which PIDs have real-time priority?**

<details><summary>Answer</summary>

PID 12 and PID 16. Both show `rt` in the PR column.

</details>

---

#### Exercise 3

**Look at this `ps -el` output:**

```
F S UID  PID PPID C PRI  NI ADDR  SZ WCHAN TTY      TIME CMD
4 S   0    1    0 0  80   0 - 42855 -     ?    00:09:59 systemd
1 S   0    2    0 0  80   0 -     0 -     ?    00:00:02 kthreadd
1 I   0    3    2 0  60 -20 -     0 -     ?    00:00:00 rcu_gp
1 S   0    9    2 0  80   0 -     0 -     ?    00:00:49 ksoftirqd/0
1 I   0   10    2 0  80   0 -     0 -     ?    00:18:26 rcu_sched
1 I   0   11    2 0  80   0 -     0 -     ?    00:00:00 rcu_bh
1 S   0   12    2 0 -40   - -     0 -     ?    00:00:08 migration/0
1 S   0   14    2 0  80   0 -     0 -     ?    00:00:00 cpuhp/0
5 S   0   15    2 0  80   0 -     0 -     ?    00:00:00 cpuhp/1
```

**Which PID has the highest priority?**

<details><summary>Answer</summary>

PID 12.

PRI = -40 in `ps` output corresponds to real priority -40 + 40 = 0. This falls in the real-time range (0–99), so this process preempts all normal processes.

</details>

---

#### Exercise 4

**A `renice` attempt produces an error:**

```
$ renice -10 21704
renice: failed to set priority for 21704 (process ID): Permission denied
```

**What is the likely cause?**

<details><summary>Answer</summary>

Decreasing the nice value below zero (i.e., raising priority above the default) requires `root`. The command was run as a regular user.

</details>

---

### Explorational Exercises

#### Exercise 1

**Changing priorities is often needed when a process consumes too much CPU. Using `ps` with standard options for a long listing of all system processes, which `--sort` flag sorts them by CPU usage in ascending order?**

<details><summary>Answer</summary>

```bash
$ ps -el --sort=pcpu
```

</details>

---

#### Exercise 2

**The `schedtool` command lets you view and set CPU scheduling parameters for processes. How do you display the scheduling parameters of process 1750? And how do you switch process 1750 to real-time mode with priority -90 (in `top` notation)?**

<details><summary>Answer</summary>

```bash
# Show scheduling parameters
$ schedtool 1750

# Switch to real-time with priority -90 (top) = 89 (schedtool)
$ schedtool -R -p 89 1750
```

`top` shows real-time priority as `real_priority - 100`. So -90 in `top` corresponds to real priority 10. `schedtool` takes the value 0–99 directly. The `-R` flag sets the SCHED_RR (round-robin real-time) policy; `-p` sets the numeric priority.

</details>

---

*Topic 103: GNU and Unix Commands*
