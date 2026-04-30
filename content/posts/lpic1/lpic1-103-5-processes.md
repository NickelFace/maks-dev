---
title: "LPIC-1 103.5 — Create, Monitor and Kill Processes"
date: 2026-04-16
description: "Job control, nohup, screen, tmux, ps, top, signals, kill, pkill. LPIC-1 exam topic 103.5."
tags: ["Linux", "LPIC-1", "processes", "ps", "top", "kill", "screen", "tmux", "signals"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-103-5-processes/"
page_lang: "en"
---

## What You Need to Know

- Run jobs in the foreground and background.
- Keep programs running after logout.
- Monitor active processes.
- Select and sort processes for display.
- Send signals to processes.

---

## Processes: Basics

Every running program in Linux lives as a process. The kernel assigns each process a unique numeric identifier.

### PID, PPID and Process States

**PID** (Process ID) — process number, 1 to 32768 by default.  
**PPID** (Parent Process ID) — PID of the parent process that spawned it.

The process with PID 1 is always `init` or `systemd` — the parent of everything.

Possible process states:

| Symbol | State |
|--------|-------|
| R | Running / Runnable (executing or ready to execute) |
| S | Sleeping (waiting for an event) |
| D | Uninterruptible sleep (waiting for I/O, cannot be interrupted) |
| T | Stopped (by SIGSTOP signal) |
| Z | Zombie (finished, parent hasn't collected exit status yet) |

---

## Job Control

The bash shell can manage multiple jobs in a single terminal.

### Running in the Background

Add `&` to the end of a command and it goes to the background immediately:

```bash
sleep 300 &
# [1] 4521   <- job number and PID
```

To send an already-running process to the background: press `Ctrl+Z` (this stops the process with SIGTSTP), then type `bg`.

### fg, bg and jobs

**jobs** lists all jobs of the current shell:

```bash
jobs
# [1]-  Running    sleep 300 &
# [2]+  Stopped    vim file.txt
```

`+` marks the current default job, `-` marks the previous one.

`jobs` options:

| Option | Action |
|--------|--------|
| `-l` | Show PID alongside status |
| `-n` | Only jobs that changed status since last notification |
| `-p` | Only job PIDs |
| `-r` | Only running jobs |
| `-s` | Only stopped jobs |

**bg** resumes a stopped job in the background:

```bash
bg %2    # send job #2 to background
bg       # send current job (marked +)
```

**fg** brings a job to the foreground:

```bash
fg %1    # bring job #1 to foreground
fg       # bring current job to foreground
```

If no job is specified, `fg` and `bg` act on the current job (marked `+`). The `kill` command, unlike them, always requires a jobspec.

### Jobspec: Ways to Reference a Job

Jobspec (job specification) is how you refer to a specific job in `fg`, `bg`, `kill`, and `jobs`.

| Form | Description |
|------|-------------|
| `%n` | Job number n |
| `%str` | Job whose command starts with str |
| `%?str` | Job whose command contains str |
| `%+` or `%%` | Current job (last started or stopped) |
| `%-` | Previous job |

Examples:

```bash
jobs %1        # job #1
jobs %sl       # job whose command starts with "sl"
jobs %?leep    # job whose command contains "leep"
fg %+          # bring current job to foreground
kill %-        # kill previous job
```

---

## Surviving Logout: nohup, screen, tmux

By default, when you exit a terminal the shell sends **SIGHUP** to all its child processes and they terminate. Three tools solve this problem in different ways.

### nohup

`nohup` runs a command with SIGHUP ignored. Output goes to `nohup.out` in the current directory by default (or `$HOME/nohup.out` if the current directory is not writable).

```bash
nohup ./long_script.sh &
# output -> nohup.out

nohup ./script.sh > /var/log/script.log 2>&1 &
# output -> specified file
```

`nohup` only protects against SIGHUP and does not create a persistent session.

### screen

GNU Screen was created in 1987 to emulate multiple independent VT100 terminals on a single physical terminal. Structure: a session contains windows; windows can be split into regions.

Command prefix: `Ctrl+A`.

**Starting and sessions:**

```bash
screen              # new session
screen -S mywork    # new session with a name
screen -ls          # list sessions
screen -r           # reattach (when there's only one session)
screen -r mywork    # reattach by name or PID
screen -S PID -X quit   # terminate a session by PID
```

Reattach options:

| Option | Action |
|--------|--------|
| `-d -r` | Attach, detaching from elsewhere first if needed |
| `-d -R` | Same, but create session if it doesn't exist |
| `-d -m` | Start session in detached mode (for startup scripts) |

**Key bindings (after `Ctrl+A`):**

| Key | Action |
|-----|--------|
| `c` | Create new window |
| `n` | Next window |
| `p` | Previous window |
| `number` | Go to window by number |
| `"` | List all windows for selection |
| `w` | Window list in the bottom bar |
| `A` | Rename current window |
| `k` | Close current window (with confirmation) |
| `d` | Detach from session |
| `S` | Split horizontally (create region) |
| `\|` | Split vertically (create region) |
| `Tab` | Move to next region |
| `Q` | Close all regions except current |
| `X` | Close current region |
| `[` | Enter copy/scrollback mode |
| `]` | Paste copied text |
| `?` | Help for all keys |
| `:` | Screen command line |

Closing a region does not close its window; the window keeps running.

**Copy mode in screen:**

1. Enter: `Ctrl+A [`
2. Navigate with arrows or PgUp/PgDown.
3. Mark start: `Space`.
4. Move to end.
5. Mark end: `Space`.
6. Paste in the target window: `Ctrl+A ]`.

**Config:** `/etc/screenrc` (system) and `~/.screenrc` (user).

### tmux

tmux was released in 2007. It uses a client-server model. Structure: a session contains windows; windows are split into panes. Unlike screen regions, panes are full pseudo-terminals — closing a pane terminates its process.

Command prefix: `Ctrl+B`.

**Starting and sessions:**

```bash
tmux                            # new session
tmux new -s "LPI" -n "Window"   # session with name, first window named
tmux ls                         # list sessions
tmux a                          # attach (when there's only one session)
tmux attach -t mywork           # attach by name
tmux attach -d -t mywork        # attach, detaching other clients first
tmux kill-session -t mywork     # terminate session
```

**Key bindings (after `Ctrl+B`):**

| Key | Action |
|-----|--------|
| `c` | Create new window |
| `n` | Next window |
| `p` | Previous window |
| `number` | Go to window by number |
| `w` | List all windows for selection |
| `f` | Find window by name |
| `,` | Rename current window |
| `&` | Close current window (with confirmation) |
| `d` | Detach |
| `D` | Choose client to detach |
| `s` | Session list for switching |
| `$` | Rename current session |
| `"` | Split pane horizontally |
| `%` | Split pane vertically |
| `x` | Close current pane (with confirmation) |
| `!` | Break pane into a separate window |
| `z` | Zoom/unzoom pane to full screen |
| arrows | Switch between panes |
| `;` | Go to last active pane |
| `Ctrl+arrow` | Resize pane by 1 row |
| `Alt+arrow` | Resize pane by 5 rows |
| `{` | Swap current pane with previous |
| `}` | Swap current pane with next |
| `t` | Show clock in pane |
| `r` | Refresh client terminal |
| `?` | Help |
| `:` | tmux command line |

**Copy mode in tmux:**

1. Enter: `Ctrl+B [`
2. Navigate with arrows.
3. Mark start: `Ctrl+Space`.
4. Move to end.
5. Copy: `Alt+W`.
6. Paste: `Ctrl+B ]`.

**Config:** `/etc/tmux.conf` and `~/.tmux.conf`. Example with alternate config: `tmux -f /path/to/config`.

### screen vs tmux

| | screen | tmux |
|-|--------|------|
| Prefix | `Ctrl+A` | `Ctrl+B` |
| Model | Monolithic | Client-server |
| Window split | Regions | Panes (pseudo-terminals) |
| Closing split | Doesn't close window | Terminates pane's process |
| Released | 1987 | 2007 |

Key difference from `nohup`: in `screen` and `tmux` processes live inside a server that keeps running independently of the network connection.

---

## Monitoring Processes

### ps

`ps` takes a snapshot of processes at the time it runs. It accepts options in three styles:

| Style | Example | Feature |
|-------|---------|---------|
| BSD | `ps aux` | No leading dash |
| UNIX | `ps -ef` | Single leading dash |
| GNU | `ps --pid 811` | Double leading dash |

Most common variants:

```bash
ps aux               # all processes, extended format (BSD style)
ps -ef               # all processes, full format (System V)
ps a                 # processes with a terminal (tty)
ps -e --forest       # process tree
ps -p 1234           # specific PID
ps aux --sort=-%cpu  # sort by CPU descending
ps aux --sort=-%mem  # sort by memory descending
```

Filter by user (all three are equivalent):

```bash
ps U www-data        # BSD
ps -u www-data       # UNIX
ps --user www-data   # GNU
```

Select columns with `-o`:

```bash
ps -eo pid,user,cmd             # only selected fields
ps o user,%mem,%cpu,cmd         # user, memory, CPU, command
ps o user,comm                  # user and program name
```

BSD-style flags `a`, `u`, `x`:

| Flag | Meaning |
|------|---------|
| `a` | Processes with a terminal (all users) |
| `u` | Format with owner and memory/CPU details |
| `x` | Processes without a terminal |

Columns in `ps aux`:

| Column | Meaning |
|--------|---------|
| USER | Process owner |
| PID | Identifier |
| %CPU | CPU usage |
| %MEM | Memory share |
| VSZ | Virtual memory including swap (KB) |
| RSS | Physical memory without swap (KB) |
| STAT | Process state |
| START | Start time |
| COMMAND | Command |

Extended codes in the STAT column:

| Code | Meaning |
|------|---------|
| `S` | Interruptible sleep (waiting for event) |
| `R` | Running or in run queue |
| `D` | Uninterruptible sleep (usually I/O) |
| `T` | Stopped by control signal |
| `Z` | Zombie |
| `<` | High priority (not yielding) |
| `N` | Low priority (yields) |
| `+` | In foreground process group |

### top

`top` shows processes in real time, refreshing every 3 seconds.

```bash
top
top -u alice        # only processes of a user
top -p 1234,5678    # specific PIDs
top -n 5            # update 5 times then exit
top -b -n 1         # batch mode, one update (useful for scripts)
```

Interactive keys inside `top`:

| Key | Action |
|-----|--------|
| `q` | Quit |
| `k` | Kill process (prompts for PID and signal, default SIGTERM) |
| `r` | Renice (change priority; only root can decrease the value) |
| `M` | Sort by memory |
| `P` | Sort by CPU |
| `N` | Sort by PID |
| `T` | Sort by running time |
| `R` | Toggle sort order: descending / ascending |
| `u` | Filter by user |
| `c` | Show full paths and split userspace/kernelspace (in brackets) |
| `V` | Process tree (forest view) |
| `1` | Show each CPU core separately |
| `t` | Cycle CPU line display (progress bar, numbers, hidden) |
| `m` | Cycle memory line display |
| `x` | Highlight sort column |
| `W` | Save settings to `~/.toprc` |
| `?` or `h` | Help |

Launch `top` with a specific sort field:

```bash
top -o %MEM    # sort by memory on startup
```

Header lines in top:

- `load average` — three numbers: load over 1, 5, and 15 minutes. On a single-core system, 1.0 means full load.
- `Tasks` — total, running, sleeping, stopped, zombie.
- `%Cpu(s)` — CPU time breakdown: us (user), sy (system), ni (nice), id (idle), wa (iowait), hi (hardware interrupts), si (software interrupts), st (stolen).
- `MiB Mem` / `MiB Swap` — memory usage.

### pgrep and pidof

`pgrep` searches for processes by name and returns PIDs:

```bash
pgrep firefox           # find all PIDs of firefox processes
pgrep -l firefox        # with names
pgrep -u alice          # processes of user alice
pgrep -a sshd           # PID and full command line
```

`pidof` does the same but requires an exact program name:

```bash
pidof apache2
```

Both work for substitution into `kill`: `kill $(pgrep sleep)` and `kill $(pidof sleep)`.

### watch

`watch` repeatedly runs a command at a given interval and displays the output:

```bash
watch ps aux            # update every 2 seconds (default)
watch -n 5 free -h      # every 5 seconds
watch -d ls /tmp        # highlight changes
```

### uptime and free

`uptime` shows system uptime and average load:

```bash
uptime
# 14:32:11 up 5 days, 3:12,  2 users,  load average: 0.15, 0.10, 0.09
```

`free` shows RAM and swap usage:

```bash
free -h     # human-readable units (K, M, G)
free -m     # in megabytes
free -s 2   # update every 2 seconds
```

---

## Signals and Killing Processes

Signals are the mechanism for notifying processes about events. A process can catch a signal, ignore it, or let the default action run.

The most important signals:

| Number | Name | Description |
|--------|------|-------------|
| 1 | SIGHUP | Hang up / reload config |
| 2 | SIGINT | Interrupt (like Ctrl+C) |
| 9 | SIGKILL | Force terminate (cannot be caught) |
| 15 | SIGTERM | Graceful terminate (default for kill) |
| 18 | SIGCONT | Continue a stopped process |
| 19 | SIGSTOP | Stop (cannot be caught) |
| 20 | SIGTSTP | Stop from terminal (Ctrl+Z) |

List all signals: `kill -l`.

### kill

`kill` sends a signal to a process by PID:

```bash
kill 1234           # SIGTERM (15) by default
kill -9 1234        # SIGKILL
kill -SIGKILL 1234  # same thing
kill -15 1234       # explicit SIGTERM
kill -HUP 1234      # SIGHUP (reload config)
```

A signal can be specified three ways:

```bash
kill -SIGHUP 1234    # by name
kill -1 1234         # by number
kill -s SIGHUP 1234  # via -s option
```

To avoid looking up PIDs manually, use command substitution:

```bash
kill $(pgrep apache2)   # modern syntax
kill `pgrep apache2`    # old syntax
```

Use SIGKILL as a last resort: the process has no chance to shut down cleanly, save data, or release resources.

### pkill and killall

**pkill** sends a signal to processes by name (no PID needed):

```bash
pkill firefox           # SIGTERM to all firefox
pkill -9 firefox        # SIGKILL
pkill -u alice          # terminate all processes of user alice
pkill -STOP firefox     # stop firefox
```

**killall** works similarly but requires an exact name match:

```bash
killall httpd           # SIGTERM to all httpd
killall -9 httpd        # SIGKILL
killall -v httpd        # verbose (print PIDs)
killall -i httpd        # interactive (ask for confirmation)
```

Difference: `pkill` supports regular expressions and partial matching; `killall` requires an exact name.

---

## Quick Reference

```bash
# Job control
command &               # run in background
Ctrl+Z                  # stop current process
bg [%n]                 # resume job in background
fg [%n]                 # bring job to foreground
jobs                    # list jobs of current shell
jobs -l                 # with PIDs

# Protect from logout
nohup command &                  # ignore SIGHUP
nohup cmd > file.log 2>&1 &      # with redirection
screen -S name                   # new screen session
screen -r name                   # reattach
tmux new -s name                 # new tmux session
tmux attach -t name              # reattach

# Monitoring
ps aux                  # all processes
ps -ef                  # all processes (different format)
ps aux --sort=-%mem     # sort by memory
top                     # interactive monitoring
top -b -n 1             # batch mode
pgrep -l name           # find PID by name
watch -n 5 free -h      # watch a command
uptime                  # system load
free -h                 # memory

# Signals
kill -l                 # list signals
kill PID                # SIGTERM
kill -9 PID             # SIGKILL
pkill name              # by name
pkill -u user           # by user
killall name            # exact name
```

---

## Exam Tips

**Which signal does kill send by default?**
SIGTERM (15). It can be caught and handled, unlike SIGKILL (9).

**How does pkill differ from killall?**
`pkill` supports partial matching and regular expressions. `killall` requires an exact name.

**What does Ctrl+Z do?**
Sends SIGTSTP, which suspends the process. After that `bg` sends it to the background, `fg` brings it to the foreground.

**How does nohup differ from screen?**
`nohup` only protects against SIGHUP. `screen` creates a persistent session you can return to.

**Where does nohup send output?**
To `nohup.out` in the current directory, or `$HOME/nohup.out`.

**How do you detach from a tmux session?**
`Ctrl+B`, then `d`.

**What does a load average of 2.0 mean on a dual-core processor?**
Full load across all cores (1.0 per core).

**How do you list all signals?**
`kill -l`.

**Which signals cannot be caught or ignored?**
SIGKILL (9) and SIGSTOP (19).

---

## Exercises

### Guided Exercises — Lesson 1

#### Exercise 1. oneko and Job Control

`oneko` is a program that shows a cat chasing the mouse cursor. Use it to practice job control.

**How do you run the program?**

<details><summary>Answer</summary>

```bash
oneko
```

</details>

**How do you suspend the process, and what is printed?**

<details><summary>Answer</summary>

Press `Ctrl+Z`:

```
[1]+  Stopped    oneko
```

</details>

**How do you check how many jobs are currently active?**

<details><summary>Answer</summary>

```bash
jobs
```

Output:

```
[1]+  Stopped    oneko
```

</details>

**How do you send the job to the background by its job ID, and how do you know it's running?**

<details><summary>Answer</summary>

```bash
bg %1
```

Output:

```
[1]+ oneko &
```

The `&` at the end means the job is running in the background. The cat starts moving again.

</details>

**How do you terminate the job by its job ID?**

<details><summary>Answer</summary>

```bash
kill %1
```

</details>

---

#### Exercise 2. PID of Apache Processes

**Task:** Find the PIDs of all Apache HTTPD (apache2) processes using two different commands.

<details><summary>Answer</summary>

```bash
pgrep apache2
```

or

```bash
pidof apache2
```

</details>

---

#### Exercise 3. Stop Apache Without a PID

**Task:** Terminate all apache2 processes without using their PIDs, using two commands.

<details><summary>Answer</summary>

```bash
pkill apache2
```

or

```bash
killall apache2
```

</details>

---

#### Exercise 4. kill with Command Substitution

**Task:** Terminate all apache2 instances via `kill` with the default signal (SIGTERM) in one line, without knowing their PIDs.

<details><summary>Answer</summary>

```bash
kill $(pgrep apache2)
```

or

```bash
kill `pgrep apache2`
```

or

```bash
kill $(pidof apache2)
```

Since SIGTERM (15) is the default signal, no flags are needed.

</details>

---

#### Exercise 5. top: Forest View and Full Paths

**Task:** Launch `top` and perform two actions inside the interface.

**How do you show the process tree (forest view)?**

<details><summary>Answer</summary>

Press `V`.

</details>

**How do you show full process paths and separate userspace from kernelspace?**

<details><summary>Answer</summary>

Press `c`. Kernel processes appear in square brackets.

</details>

---

#### Exercise 6. ps Filtered by www-data

**Task:** Show all processes running as `www-data` (Apache HTTPD) using three different syntax styles.

<details><summary>Answer</summary>

BSD syntax:

```bash
ps U www-data
```

UNIX syntax:

```bash
ps -u www-data
```

GNU syntax:

```bash
ps --user www-data
```

</details>

---

### Explorational Exercises — Lesson 1

#### Exercise 7. SIGHUP and Apache

SIGHUP is used to restart daemons: Apache rereads its config, closes old child processes, and spawns new ones — while the parent process itself stays alive.

**How do you start the web server?**

<details><summary>Answer</summary>

```bash
sudo systemctl start apache2
```

</details>

**How do you find the PID of the parent process?**

<details><summary>Answer</summary>

```bash
ps aux | grep apache2
```

The parent process is the one running as `root`.

</details>

**How do you reload Apache with SIGHUP?**

<details><summary>Answer</summary>

```bash
kill -SIGHUP <parent_PID>
```

</details>

**How do you verify the parent is still alive and children were recreated?**

<details><summary>Answer</summary>

```bash
ps aux | grep apache2
```

The parent process keeps the same PID. New child processes appear alongside it.

</details>

---

#### Exercise 8. watch + ps for Connection Monitoring

A static `ps` output becomes dynamic when wrapped in `watch`. Monitor new connections to Apache.

**How do you add MaxConnectionsPerChild to the config?**

<details><summary>Answer</summary>

Insert this line into the config file:

```
MaxConnectionsPerChild 1
```

On Debian/Ubuntu: `/etc/apache2/apache2.conf`. On CentOS/RHEL: `/etc/httpd/conf/httpd.conf`.

Restart after changes:

```bash
sudo systemctl restart apache2
```

</details>

**How do you run watch with ps and grep to monitor apache2?**

<details><summary>Answer</summary>

```bash
watch 'ps aux | grep apache2'
```

The command is quoted in single quotes so the shell doesn't expand `ps aux | grep` before passing it to `watch`.

</details>

**What happens in the watch output when a browser connects to the server?**

<details><summary>Answer</summary>

One of the `www-data` child processes disappears from the list: `MaxConnectionsPerChild 1` means each child terminates after handling one request.

</details>

---

#### Exercise 9. top -o for Sorting on Startup

**How do you launch top sorted by memory immediately?**

<details><summary>Answer</summary>

```bash
top -o %MEM
```

</details>

**How do you confirm the sort column is active (highlight it)?**

<details><summary>Answer</summary>

Press `x` inside top. The active sort column will be highlighted.

</details>

---

#### Exercise 10. ps -o for Column Selection

**How do you print only user, % memory, % CPU, and full command?**

<details><summary>Answer</summary>

```bash
ps o user,%mem,%cpu,cmd
```

</details>

**How do you print only user and program name?**

<details><summary>Answer</summary>

```bash
ps o user,comm
```

`cmd` shows the full command line with arguments; `comm` shows only the program name without arguments.

</details>

---

### Guided Exercises — Lesson 2

#### Exercise 11. screen vs tmux: Feature Comparison

**Task:** Identify which feature belongs to GNU Screen, tmux, or both.

| Feature | GNU Screen | tmux |
|---------|:----------:|:----:|
| Ctrl+A command prefix | + | |
| Client-server model | | + |
| Panes are pseudo-terminals | | + |
| Closing a region doesn't close its window | + | |
| Sessions contain windows | + | + |
| Sessions can be detached | + | + |

---

#### Exercise 12. Working with GNU Screen

**How do you start screen?**

<details><summary>Answer</summary>

```bash
screen
```

</details>

**How do you open a new window and edit `/etc/screenrc` in vi?**

<details><summary>Answer</summary>

Press `Ctrl+A c`, then:

```bash
sudo vi /etc/screenrc
```

</details>

**How do you display the window list in the bottom bar?**

<details><summary>Answer</summary>

`Ctrl+A w`

</details>

**How do you rename the current window to "vi"?**

<details><summary>Answer</summary>

Press `Ctrl+A A`, type `vi`, press Enter.

</details>

**How do you detach and create a new session named "ssh"?**

<details><summary>Answer</summary>

```
Ctrl+A d
screen -S "ssh"
```

</details>

**How do you list sessions and reattach to the first one by PID?**

<details><summary>Answer</summary>

```
Ctrl+A d
screen -ls
screen -r PID
```

</details>

**How do you split the window horizontally and move to the new empty region?**

<details><summary>Answer</summary>

```
Ctrl+A S
Ctrl+A Tab
```

</details>

**How do you terminate a session by PID from the command line?**

<details><summary>Answer</summary>

```bash
screen -S PID -X quit
```

</details>

---

#### Exercise 13. Working with tmux

**How do you start tmux?**

<details><summary>Answer</summary>

```bash
tmux
```

</details>

**How do you open a new window and create `~/.tmux.conf` with nano?**

<details><summary>Answer</summary>

```
Ctrl+B c
nano ~/.tmux.conf
```

</details>

**How do you split the window vertically and resize the new pane?**

<details><summary>Answer</summary>

```
Ctrl+B "
Ctrl+B Ctrl+↓   (several times)
```

</details>

**How do you rename the current window to "text editing"?**

<details><summary>Answer</summary>

```
Ctrl+B ,   (type "text editing", Enter)
```

</details>

**How do you detach and create a new session named "ssh" with window "ssh window"?**

<details><summary>Answer</summary>

```
Ctrl+B d
tmux new -s "ssh" -n "ssh window"
```

</details>

**How do you attach to the "ssh" session from a remote machine, guaranteeing the other client is detached?**

<details><summary>Answer</summary>

```bash
tmux a -d -t ssh
```

</details>

**How do you terminate a session by name?**

<details><summary>Answer</summary>

```bash
tmux kill-session -t ssh
```

</details>

---

### Explorational Exercises — Lesson 2

#### Exercise 14. Multiplexer Command Line

Both tools support a command mode via `prefix + :`.

**How do you enter copy mode in screen via the command line?**

<details><summary>Answer</summary>

```
Ctrl+A :
copy
```

</details>

**How do you rename the current tmux window via the command line?**

<details><summary>Answer</summary>

```
Ctrl+B :
rename-window
```

</details>

**How do you close all screen windows and end the session via the command line?**

<details><summary>Answer</summary>

```
Ctrl+A :
quit
```

</details>

**How do you split a tmux pane via the command line?**

<details><summary>Answer</summary>

```
Ctrl+B :
split-window
```

</details>

**How do you close the current tmux window via the command line?**

<details><summary>Answer</summary>

```
Ctrl+B :
kill-window
```

</details>

---

#### Exercise 15. Copy Mode in screen with vi-like Navigation

**How do you echo a long word?**

<details><summary>Answer</summary>

```bash
echo supercalifragilisticexpialidocious
```

</details>

**How do you copy five consecutive characters from that line?**

<details><summary>Answer</summary>

Enter copy mode: `Ctrl+A [`. Move up one line with `k`. Press `Space` to mark the start. Move 4 characters right with `l`. Press `Space` to mark the end.

</details>

**How do you paste the copied text into the command line?**

<details><summary>Answer</summary>

```
Ctrl+A ]
```

</details>

---

#### Exercise 16. Shared tmux Session

**Task:** Another user wants to connect via `tmux -S /tmp/our_socket a -t our_session`. The socket is already created with correct permissions. What two other conditions are needed?

<details><summary>Answer</summary>

1. Both users must belong to a common group (e.g., `multiplexer`).
2. The socket must be handed to that group: `chgrp multiplexer /tmp/our_socket`.

</details>

---

*Topic 103: GNU and Unix Commands*
