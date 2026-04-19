---
title: "LPIC-1 105.1 — Customize and Use the Shell Environment"
date: 2026-04-19
description: "Shell types, startup files, environment variables, aliases, functions, source, /etc/skel. LPIC-1 exam topic 105.1."
tags: ["Linux", "LPIC-1", "bash", "shell", "environment", "alias", "source", "skel"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-105-1-1-shell-environment/"
---

> **Exam weight: 4** — LPIC-1 v5, Exam 102

## What You Need to Know

- Set environment variables such as `PATH` at login and when spawning a new shell.
- Write Bash functions for frequently used command sequences and store them in startup files.
- Maintain skeleton directories for new accounts.
- Set the correct path for finding commands.

Key files and utilities: `.`, `source`, `/etc/bash.bashrc`, `/etc/profile`, `env`, `export`, `set`, `unset`, `~/.bash_profile`, `~/.bash_login`, `~/.profile`, `~/.bashrc`, `~/.bash_logout`, `function`, `alias`.

---

## Bash Shell Types

### Interactive vs Non-interactive

An **interactive** shell reads commands from a terminal and displays a prompt. It starts when you open a terminal emulator, log in at the console, or connect via SSH.

A **non-interactive** shell starts to execute a script or a single command without user involvement — for example, `bash script.sh` or a cron job.

### Login vs Non-login

A **login shell** starts when you enter the system: through a text console, SSH, `su -`, or explicitly with `bash -l` (`--login`). It loads the full set of startup files and builds the user environment from scratch.

A **non-login shell** opens after login: a new terminal window in a graphical environment, a plain `bash` call, running a script. It assumes the environment is inherited from the parent login session and reads only bashrc files.

### Four Combinations

Each shell simultaneously belongs to one of two interactive/non-interactive pairs and one of two login/non-login pairs — four combinations in total.

**Interactive login:** Logging in at a text console, SSH, `su -`, `sudo -i`. The right place for user startup settings.

**Interactive non-login:** A new terminal in a graphical environment, `bash` called after login, a shell from an IDE. The most common scenario in everyday work.

**Non-interactive login:** A rare combination. Arises when a script is forced to run as login (`bash --login script.sh`) or when piping a command over SSH: `command | ssh user@host`.

**Non-interactive non-login:** Automated scripts, cron jobs, hook scripts. Bash in this mode reads no startup files. Needed variables are either exported in the parent environment beforehand or set inside the script.

The shell type combination determines which initialization files Bash reads.

### Terminals: pts and tty

In a graphical session, terminal emulators run through pseudo-terminals **pts** (pseudo terminal slave): GNOME Terminal, Konsole, XTerm, sakura.

Kernel-level text consoles are accessed via `Ctrl + Alt + F1`...`F6` and work through real **tty** (teletypewriter) devices. `Ctrl + Alt + F7` returns to the graphical session.

Use `ps` to see where a shell is running:

```bash
$ ps aux | grep bash
user  5270  ... pts/0  Ss  ... bash      # emulator in GUI, non-login
user  5411  ... tty1   S+  ... -bash     # console, login
```

The leading dash in `-bash` shows it is a login shell.

### Identifying the Shell Type

`echo $0` shows the current shell's name in a form that distinguishes login from non-login:

| Output | Meaning |
|---|---|
| `-bash` or `-su` | Interactive login shell |
| `bash` or `/bin/bash` | Interactive non-login shell |
| Script name | Non-interactive (script running) |

Confirm with `shopt`:

```bash
$ shopt login_shell
login_shell    off     # off = non-login, on = login
```

---

## Launching a Shell

### bash Options

| Option | Effect |
|---|---|
| `-l` / `--login` | Start as a login shell; reads `/etc/profile` and user login files |
| `-i` | Start as an interactive shell |
| `--noprofile` | Skip `/etc/profile`, `~/.bash_profile`, `~/.bash_login`, `~/.profile` |
| `--norc` | Skip `/etc/bash.bashrc` and `~/.bashrc` |
| `--rcfile FILE` | Use FILE instead of the standard rc files |

`bash --noprofile --norc` starts a completely clean shell — useful for debugging.

### The su Command

`su` (switch user) changes the user identity. The presence of a login flag determines the shell type.

With the target user's environment (interactive login):

```bash
$ su - user2
$ su -l user2
$ su --login user2
$ su -           # become root in a login session
```

Without loading the environment (interactive non-login):

```bash
$ su user2
$ su             # become root in a non-login session
```

The dash, `-l`, and `--login` are equivalent. Without a login flag, `su` keeps the original user's environment, which can cause confusion with variables like `HOME` or `PATH`.

### The sudo Command

`sudo` runs a command as another user (usually root). The user must be in `/etc/sudoers`.

Login shell (loads full environment):

```bash
$ sudo -i                     # root login shell
$ sudo -i command             # run as root in login environment, then return
$ sudo su - user2             # login user2 via sudo + su chain
$ sudo su -                   # login root via chain
```

Non-login shell:

```bash
$ sudo -s                     # non-login root shell
$ sudo -u root -s             # same, explicit
$ sudo -u user2 -s            # non-login shell as user2
$ sudo su user2               # same via su
```

Use the login variant when you need the target user's environment variables; otherwise use non-login.

---

## Bash Initialization Files

### Global Files

`/etc/profile` — the main global file for login shells. Read by all users at login. Sets `PATH`, `PS1`, and similar variables. Sources `/etc/bash.bashrc` (on Debian) and runs all scripts from `/etc/profile.d/*.sh`.

`/etc/bash.bashrc` — global file for interactive shells. Read directly for non-login; sourced via `/etc/profile` for login. This makes it apply to every interactive session. On Red Hat-based systems the equivalent is `/etc/bashrc`.

`/etc/profile.d/*.sh` — drop-in directory for package and administrator additions to the global environment. Sourced from `/etc/profile`.

### User Files

`~/.bash_profile` — personal login file. Takes priority over `~/.bash_login` and `~/.profile`.

`~/.bash_login` — alternative login file. Read only if `~/.bash_profile` does not exist.

`~/.profile` — universal login file, compatible with other Bourne-family shells. Read if neither `~/.bash_profile` nor `~/.bash_login` exists. By default adds `~/bin` to `PATH` and sources `~/.bashrc`.

`~/.bashrc` — file for interactive non-login shells. Contains history settings, aliases, functions. Often sourced from `~/.bash_profile` so login sessions also pick up these settings.

`~/.bash_logout` — executed when a login shell exits. Good for cleaning up temporary files or logs.

### File Reading Order

**Login shell:**

1. `/etc/profile` → sources `/etc/bash.bashrc` + `/etc/profile.d/*.sh`
2. First found of: `~/.bash_profile`, `~/.bash_login`, `~/.profile` → standard `~/.profile` additionally sources `~/.bashrc`

On a Debian system, the login shell effectively reads all four files: `/etc/bash.bashrc`, `/etc/profile`, `~/.bashrc`, `~/.profile` — via the sourcing chain.

**Interactive non-login shell:**

1. `/etc/bash.bashrc` (if enabled in the build)
2. `~/.bashrc`

**Non-interactive non-login shell:** reads no startup files. Uses the parent environment. Exception: if `BASH_ENV` is set, Bash reads the file it points to before executing the script.

Local files override global ones — a user's `~/.bash_profile` is read after `/etc/profile`, so user settings win.

**Practical guideline:** `PATH` and general environment variables go in `~/.bash_profile` (or `/etc/profile`). Aliases and functions needed in every terminal go in `~/.bashrc`. To make a login session see them too, add `source ~/.bashrc` to `~/.bash_profile`.

---

## Environment Variables

### Local vs Exported

A local variable is visible only in the current shell. An exported variable is inherited by child processes.

```bash
$ MYVAR=hello          # local variable
$ export MYVAR         # now exported
$ export GREETING=hi   # one line does both
```

No spaces around `=`. If there are spaces, Bash tries to run the name as a command.

### env, set, export, unset

| Command | Description |
|---|---|
| `env` | Show exported variables; `env VAR=value cmd` runs cmd with modified environment; `env -i cmd` runs with empty environment |
| `printenv` | Show a specific variable or all: `printenv PATH` |
| `set` | Show all shell variables and functions (including unexported); also controls shell options: `set -x` traces commands |
| `export` | Mark a variable as exported; `export -f` exports a function; without args shows all exported variables |
| `unset` | Remove a variable or function; `-f` for functions, `-v` for variables |

The exam distinction: `set` shows everything including local variables and functions. `env` shows only what child processes will inherit.

### Configuring PATH

`PATH` holds a colon-separated list of directories. Bash searches them for executables when you type a short command name.

Add a directory for the current session:

```bash
$ export PATH="$HOME/bin:$PATH"
```

Make it permanent: add the same line to `~/.bashrc` or `~/.bash_profile`. For all users, edit `/etc/profile` or drop a file in `/etc/profile.d/`.

Order matters. Bash takes the first match, so a directory at the start overrides standard commands of the same name — powerful but potentially dangerous.

`unset PATH` leaves the shell unable to find commands by short name. Every program must be called by its absolute path.

---

## Aliases

An alias replaces one string with another during command parsing. Good for short abbreviations and safe defaults.

```bash
$ alias ll='ls -lah'
$ alias rm='rm -i'      # prompt before every removal
$ alias                 # list all aliases
$ alias ll              # show one alias definition
$ unalias ll            # remove one
$ unalias -a            # remove all
```

An alias only works at the start of a command. It cannot accept arguments — use functions for that.

To bypass an alias and call the original command:

```bash
$ \rm file.txt          # backslash cancels alias rm='rm -i'
$ command rm file.txt   # builtin command ignores aliases
$ /bin/rm file.txt      # call by absolute path
```

Aliases are not inherited by child shells and do not work in non-interactive shells without `shopt -s expand_aliases`.

For persistence, put aliases in `~/.bashrc`. On Debian-based systems the convention is to keep them in `~/.bash_aliases`, which is sourced from `~/.bashrc`.

---

## Bash Functions

A function groups commands into a named unit. Accepts positional arguments via `$1`, `$2`, etc. `$@` holds all arguments, `$#` holds their count.

Two equivalent syntaxes:

```bash
function greet {
    echo "Hello, $1"
}

greet() {
    echo "Hello, $1"
}
```

Usage:

```bash
$ greet World
Hello, World
```

Inspect a function:

```bash
$ declare -f greet
$ type greet
```

Remove a function:

```bash
$ unset -f greet
```

Return a numeric exit code with `return N` (0–255). Without `return`, the exit code equals that of the last command executed inside the function.

Export a function to child processes:

```bash
$ export -f greet
```

Functions are more powerful than aliases: they accept arguments, contain logic, loops, and conditionals. Put them in `~/.bashrc` for availability in every interactive shell.

---

## source and the Dot Command

`source file` and `. file` are equivalent. Both read the file and execute its commands in the current shell without spawning a child process.

This matters: changes to variables, aliases, and functions persist in the current session. Running a file as a regular script (`./file.sh`) executes it in a child shell — all changes are lost when that child exits.

Typical use: after editing `~/.bashrc`, apply changes immediately:

```bash
$ source ~/.bashrc
$ . ~/.bashrc           # same
```

The dot command requires a space between it and the filename. `./file` calls the file as a script; `. file` sources it.

---

## Skeleton Directory /etc/skel

`/etc/skel` stores template files that are copied into a new user's home directory when the account is created with `useradd -m` or `adduser`.

Default contents on Debian:

```bash
$ ls -la /etc/skel
.bash_logout
.bashrc
.profile
```

Administrators can add any files or directories here: editor settings, project templates, corporate aliases, baseline scripts. Every new user gets a copy.

Changes to `/etc/skel` do not affect existing users — only those created afterward.

Specify an alternative template directory with `useradd -k`:

```bash
# useradd -m -k /etc/skel-developer newuser
```

The default path is set in `/etc/default/useradd` with `SKEL=`. View current defaults:

```bash
$ useradd -D
```

On Debian, `adduser` reads its own config at `/etc/adduser.conf`:

```bash
$ grep SKEL /etc/adduser.conf
SKEL=/etc/skel
SKEL_IGNORE_REGEX="dpkg-(old|new|dist|save)"
```

`SKEL_IGNORE_REGEX` filters files by regex — by default excludes `.dpkg-old`, `.dpkg-new`, and similar package manager artifacts.

Without the `-m` flag, `useradd` does not create a home directory and does not copy from `/etc/skel`. `adduser` (Debian's Perl wrapper) always creates the home directory.

---

## Quick Reference

```bash
# identify shell type
echo $0                      # -bash = login, bash = non-login
shopt login_shell            # on = login, off = non-login
ps aux | grep bash           # all active Bash shells

# bash launch options
bash -l                      # login shell (= --login)
bash -i                      # interactive shell
bash --noprofile             # skip login startup files
bash --norc                  # skip rc files
bash --rcfile FILE           # use custom rc file
bash --noprofile --norc      # clean shell for debugging

# su — with environment (login)
su - user                    # = su -l user = su --login user
su -                         # become root in login session

# su — without environment (non-login)
su user
su

# sudo — with environment (login)
sudo -i                      # root login shell
sudo -i command              # run in login environment and return
sudo su - user               # login user via chain
sudo su -                    # login root via chain

# sudo — without environment (non-login)
sudo -s                      # non-login root
sudo -u user -s              # non-login as user
sudo su user

# environment variables
env                          # all exported variables
env -i command               # run with empty environment
env VAR=value command        # run with modified environment
printenv                     # same as env without args
printenv VAR                 # value of one variable
set                          # all variables and functions
set -o                       # all shell options and their state
set -x                       # enable command tracing
export VAR=value             # create and export variable
export -f funcname           # export function
unset VAR                    # remove variable
unset -f funcname            # remove function

# aliases
alias name='command'         # create alias
alias                        # list all aliases
alias name                   # show one definition
unalias name                 # remove one
unalias -a                   # remove all

# functions
function name { ... }        # define function (syntax 1)
name() { ... }               # define function (syntax 2)
declare -f name              # show definition
declare -f                   # all defined functions
type name                    # object type (alias/function/builtin/file)

# apply configuration
source file                  # read and execute in current shell
. file                       # same as source

# PATH
echo $PATH
export PATH="$PATH:/new"     # append directory
export PATH="/new:$PATH"     # prepend directory (higher priority)
which command                # path to executable
type command                 # how Bash interprets the name

# user creation with skel
useradd -m name              # create with home from /etc/skel
useradd -m -k /template name # with alternative skel
useradd -D                   # show defaults (includes SKEL)
adduser name                 # Debian wrapper, always creates home
grep SKEL /etc/adduser.conf  # skel settings for adduser
grep SKEL /etc/default/useradd  # skel settings for useradd

# BASH_ENV for non-interactive scripts
export BASH_ENV=/path/init.sh   # Bash reads init.sh before running the script
```

---

## Exam Questions

1. What is the order of login startup files for a login shell? → `/etc/profile` first, then the first found of `~/.bash_profile`, `~/.bash_login`, `~/.profile`.
2. What files does an interactive non-login shell read? → `/etc/bash.bashrc` (if enabled) and `~/.bashrc`.
3. What does a non-interactive non-login shell (cron, scripts) read? → No startup files. Environment is inherited or set inside the script.
4. What does `echo $0` output for a login vs non-login shell? → Login: `-bash` or `-su` with a leading dash. Non-login: `bash` or `/bin/bash`. Script: the script filename.
5. What does the leading dash in `-bash` (in `ps` output) indicate? → It is a login shell.
6. Difference between `su user` and `su - user`? → Without dash: non-login, keeps original environment. With dash: login, reads all of the target user's startup files.
7. Difference between `sudo -i` and `sudo -s`? → `sudo -i` starts a root login shell with full environment initialization. `sudo -s` starts a non-login shell, environment stays from the calling user.
8. What does `bash --noprofile` do? → Starts a login shell without reading `/etc/profile` or any user login files.
9. What does `bash --norc` do? → Starts an interactive shell without reading `/etc/bash.bashrc` or `~/.bashrc`.
10. Difference between `source file` and `bash file`? → `source` executes in the current shell, changes persist. `bash` spawns a child process, changes are lost on exit.
11. Difference between `set` and `env`? → `set` shows all variables and functions including local ones. `env` shows only exported variables that child processes will inherit.
12. Where should aliases and functions be defined for permanent use? → In `~/.bashrc` for a single user. In `/etc/bash.bashrc` or `/etc/profile.d/` for all users.
13. How to make a file appear in every new user's home directory? → Place it in `/etc/skel`. Existing users are not affected.
14. What happens after `unset PATH`? → The shell loses its command search list. Programs must be called by absolute path.
15. How to export a function to child processes? → `export -f funcname`.
16. Equivalent of the `.` (dot) command? → `source`. Both read and execute the file in the current shell.
17. Which file runs on login shell exit? → `~/.bash_logout`.
18. How does `useradd -m` relate to the skel directory? → Without `-m` no home directory is created and nothing is copied from `/etc/skel`. With `-m` the directory is created and populated.
19. How to bypass an alias and call the original command? → Prefix with a backslash (`\rm`), use `command rm`, or call by absolute path (`/bin/rm`).
20. What is `BASH_ENV` for? → Points to a startup file that a non-interactive non-login shell reads before executing a script.
21. Difference between `pts` and `tty`? → `pts`: pseudo-terminal of a GUI terminal emulator. `tty`: real kernel text console, accessed via `Ctrl + Alt + F1`...`F6`.
22. Config file with `SKEL=` for `adduser` on Debian? → `/etc/adduser.conf`.
23. Config file with `SKEL=` for `useradd`? → `/etc/default/useradd`.

---

## Exercises

### Exercise 1 — Shell types by launch method

Fill in the table for each launch method: interactive or not, login or not, what `echo $0` outputs.

| Launch method | Interactive | Login | echo $0 |
|---|---|---|---|
| `sudo ssh user2@machine2` | ? | ? | ? |
| `Ctrl + Alt + F2` | ? | ? | ? |
| `su - user2` | ? | ? | ? |
| `gnome-terminal` | ? | ? | ? |
| Regular user launches sakura from konsole | ? | ? | ? |
| Script `test.sh` with `echo $0` inside | ? | ? | ? |

<details>
<summary>Answer</summary>

| Launch method | Interactive | Login | echo $0 |
|---|---|---|---|
| `sudo ssh user2@machine2` | Yes | Yes | `-bash` |
| `Ctrl + Alt + F2` | Yes | Yes | `-bash` |
| `su - user2` | Yes | Yes | `-bash` |
| `gnome-terminal` | Yes | No | `bash` |
| Regular user launches sakura from konsole | Yes | No | `/bin/bash` |
| Script `test.sh` with `echo $0` inside | No | No | `./test.sh` |

Patterns: SSH, text console, and `su -` give a login shell with the leading dash in `-bash`. A terminal emulator and its descendants give a non-login shell with `bash` or `/bin/bash`. A script gives a non-interactive shell where `$0` is the script name itself.

</details>

---

### Exercise 2 — su and sudo commands for each shell type

Write the `su` and `sudo` commands for each scenario.

**a) Interactive login shell as user2**

**b) Interactive login shell as root**

**c) Interactive non-login shell as root**

**d) Interactive non-login shell as user2**

<details>
<summary>Answer</summary>

**a) Interactive login shell as user2**

```bash
# su
$ su - user2
$ su -l user2
$ su --login user2

# sudo
$ sudo su - user2
$ sudo su -l user2
$ sudo su --login user2
```

**b) Interactive login shell as root**

```bash
# su
$ su - root
$ su -

# sudo
$ sudo su - root
$ sudo su -
$ sudo -i
```

**c) Interactive non-login shell as root**

```bash
# su
$ su root
$ su

# sudo
$ sudo su root
$ sudo su
$ sudo -s
$ sudo -u root -s
```

**d) Interactive non-login shell as user2**

```bash
# su
$ su user2

# sudo
$ sudo su user2
$ sudo -u user2 -s
```

Mnemonic: the dash in `su -`, the `-i` flag in `sudo`, and `-l`/`--login` are all equivalent — they start a login session with the full environment of the target user.

</details>

---

### Exercise 3 — Which startup files are read

For each shell type, indicate which startup files will be read. Assume `/root/` has no `.profile` or `.bashrc` (fresh Debian install).

| Shell type | /etc/profile | /etc/bash.bashrc | ~/.profile | ~/.bashrc |
|---|---|---|---|---|
| Interactive login shell as user2 | ? | ? | ? | ? |
| Interactive login shell as root | ? | ? | ? | ? |
| Interactive non-login shell as root | ? | ? | ? | ? |
| Interactive non-login shell as user2 | ? | ? | ? | ? |

<details>
<summary>Answer</summary>

| Shell type | /etc/profile | /etc/bash.bashrc | ~/.profile | ~/.bashrc |
|---|---|---|---|---|
| Interactive login shell as user2 | Yes | Yes | Yes | Yes |
| Interactive login shell as root | Yes | Yes | No | No |
| Interactive non-login shell as root | No | Yes | No | No |
| Interactive non-login shell as user2 | No | Yes | No | Yes |

Notes:

- The root row is built on the assumption that `/root/` has no `.profile` or `.bashrc`. On a fresh Debian install, root's home is minimal. If an admin places those files there, they will be read too.
- `/etc/bash.bashrc` appears for all interactive shells: for non-login directly, for login via the `/etc/profile` sourcing chain. Hence "Yes" in every interactive row.
- `~/.profile` is a login file — non-login shells do not read it.
- `~/.bashrc` for login user2: read indirectly because `~/.profile` by default contains `source ~/.bashrc`.

</details>

---

### Exercise 4 — Hello world function

A file contains this function:

```bash
function hello() {
    echo "Hello world!"
}
```

**a)** What must you do to make the function available in the current shell?

**b)** How do you call the function after loading it?

**c)** In which file should you place the function so it runs every time user2 opens a terminal in an X Window session? What shell type is this?

**d)** In which file should you place the function so it runs for root in any interactive shell (login or non-login)?

<details>
<summary>Answer</summary>

**a)** Source the file with `source` or `.`:

```bash
$ source file_with_function
$ . file_with_function
```

**b)** Type its name:

```bash
$ hello
Hello world!
```

**c)** `/home/user2/.bashrc`. Shell type: interactive non-login (an X terminal emulator opens a non-login shell).

**d)** `/etc/bash.bashrc`. This file is read for all interactive shells: non-login shells read it directly; login shells pick it up via `/etc/profile`.

</details>

---

### Exercise 5 — Script interactivity

Given this script:

```bash
#!/bin/bash
echo "Hello world!"
```

**a)** The script is made executable and run. Is it interactive? Why?

**b)** What makes a script interactive?

<details>
<summary>Answer</summary>

**a)** No. There is no user input — commands are not typed by a person in real time. The shell runs the script from start to finish without waiting for any response.

**b)** Needing user input. A script becomes interactive when it waits for a response, for example via `read`:

```bash
#!/bin/bash
read -p "Enter your name: " name
echo "Hello, $name"
```

</details>

---

### Exercise 6 — Applying ~/.bashrc changes

After editing variables in `~/.bashrc`, you need to apply the changes without opening a new terminal. From the home directory, two commands work.

<details>
<summary>Answer</summary>

```bash
$ source .bashrc
```

or

```bash
$ . .bashrc
```

Both read the file and execute it in the current shell. Without this, the new configuration takes effect only the next time a shell is opened.

</details>

---

### Exercise 7 — Switching to a tty when the GUI freezes

John is in an X Window session with a terminal emulator, but the session has frozen. He needs a working text shell.

**a)** How does he open a tty shell?

**b)** Which startup files will be read?

<details>
<summary>Answer</summary>

**a)** Press `Ctrl + Alt + F1` through `F6`. One of the six text consoles will appear with its own login prompt.

**b)**

```
/etc/profile
/home/john/.profile
```

These are the two main login files. Additionally, via the sourcing chain: `/etc/bash.bashrc` (through `/etc/profile`), scripts from `/etc/profile.d/*.sh` (through `/etc/profile`), and `~/.bashrc` (if `~/.profile` sources it, as is the Debian default). The full list is wider than the two named above.

</details>

---

### Exercise 8 — ~/.bash_login for all new users

Linda asked her admin to create `~/.bash_login` that prints the date and time on login. Other users liked the idea. The admin wants this file to appear automatically for all future users.

**a)** What should the admin do?

**b)** Does this affect existing users?

<details>
<summary>Answer</summary>

**a)** Place the `.bash_login` file in `/etc/skel`. When a new user is created with `useradd -m` or `adduser`, the file is automatically copied to their home directory:

```bash
# echo 'date' > /etc/skel/.bash_login
```

**b)** No. Changes to `/etc/skel` only apply to users created after the change. For existing users the file must be copied manually.

Note on priority: Bash reads login files in order `~/.bash_profile`, `~/.bash_login`, `~/.profile` and takes the first one found. If users have `~/.bash_profile`, `~/.bash_login` will be silently skipped.

</details>

---

*LPIC-1 Study Notes | Topic 105: Shells and Shell Scripting*
