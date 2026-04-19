---
title: "LPIC-1 105.1 — Shell Variables and Environment (Part 2)"
date: 2026-04-19
description: "Local and global variables, export, env, common environment variables, aliases, functions, /etc/skel. LPIC-1 exam topic 105.1."
tags: ["Linux", "LPIC-1", "bash", "shell", "environment", "export", "alias", "PATH"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-105-1-2-shell-variables/"
---

> **Exam weight: 4** — LPIC-1 v5, Exam 102 | Part 2 of 105.1

## Shell Types — Quick Reference

Bash reads different initialization files depending on two attributes: interactive vs non-interactive, and login vs non-login.

Check interactivity via `$-` — if the output contains `i`, the shell is interactive:

```bash
$ echo $-
himBHs
```

Check login status:

```bash
$ echo $0          # -bash means login shell
$ shopt login_shell  # on = login, off = non-login
```

| Launch method | Login | Interactive |
|---|---|---|
| `ssh user@host` | yes | yes |
| `Ctrl+Alt+F2` (tty login) | yes | yes |
| `su -` / `sudo -i` | yes | yes |
| `gnome-terminal`, `sakura` | no | yes |
| `bash` inside a shell | no | yes |
| `./script.sh` | no | no |
| `bash -c 'cmd'` | no | no |

---

## Initialization Files

### Global Files (All Users)

`/etc/profile` — read by any login shell. Usually sources scripts from `/etc/profile.d/*.sh`.

`/etc/bash.bashrc` — Debian/Ubuntu. Read by interactive shells.

`/etc/bashrc` — RHEL/CentOS equivalent of `/etc/bash.bashrc`.

### User Files

`~/.bash_profile` — personal login file, highest priority.

`~/.bash_login` — read only if `~/.bash_profile` is absent.

`~/.profile` — fallback, compatible with other POSIX shells. Read if neither of the above exists.

`~/.bashrc` — for interactive non-login shells. Often sourced from `~/.bash_profile`:

```bash
if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi
```

`~/.bash_logout` — executed when a login shell exits.

### Reading Order

| Shell type | Files read |
|---|---|
| Login + interactive | `/etc/profile` → `/etc/profile.d/*.sh` → first of `~/.bash_profile`, `~/.bash_login`, `~/.profile` (which sources `~/.bashrc`) |
| Non-login + interactive | `/etc/bash.bashrc` (if present), `~/.bashrc` |
| Non-login + non-interactive (script) | Only the file pointed to by `BASH_ENV`, if set |
| On exit from login shell | `~/.bash_logout` |

### source and the Dot Command

Apply changes to `~/.bashrc` without restarting the shell:

```bash
source ~/.bashrc
. ~/.bashrc          # equivalent
```

Both execute the file's commands in the **current** shell. Running `bash file` spawns a child — variables set there disappear on exit.

To fully reload the current shell process: `exec bash` or `exec $SHELL`.

---

## Shell Variables

### Assignment and Reference

```bash
$ distro=zorinos     # assignment — no spaces around =
$ echo $distro       # reference — dollar sign required
zorinos
```

Spaces around `=` break the command:

```bash
$ distro =zorinos
-bash: distro: command not found
$ distro= zorinos
-bash: zorinos: command not found
```

### Variable Naming Rules

- May contain letters (`a-z`, `A-Z`), digits (`0-9`), underscore (`_`)
- Must start with a letter or underscore — **not** a digit
- No spaces in names (use `_` instead)

```bash
$ distro_1=zorinos    # OK
$ _distro=zorinos     # OK
$ 1distro=zorinos     # error
```

### Value Rules

Values may contain letters, digits, and most special characters (`?`, `!`, `*`, `.`, `/`).

Values with **spaces** must be quoted:

```bash
$ distro="zorin 12.4"
```

Values with **redirect** or **pipe** characters need quoting, otherwise the shell interprets them literally:

```bash
$ distro=>zorin      # creates an empty file named 'zorin'
$ distro=">zorin"    # now it is a variable value
```

Backslash must be escaped with another backslash:

```bash
$ win_path=C:\\path\\to\\dir\\
$ echo $win_path
C:\path\to\dir\
```

### Quotes in Assignment Context

Single quotes — literal, no substitution:

```bash
$ lizard=uromastyx
$ animal='My $lizard'
$ echo $animal
My $lizard
```

Double quotes — allow variable substitution:

```bash
$ animal="My $lizard"
$ echo $animal
My uromastyx
```

When referencing a variable whose value contains spaces or wildcards, always use double quotes with `echo`:

```bash
$ lizard="    genus    |    uromastyx"
$ echo $lizard          # shell does field splitting
genus | uromastyx
$ echo "$lizard"        # spaces preserved
    genus    |    uromastyx
```

---

## Local Shell Variables

By convention, local variable names are **lowercase**.

### readonly — Immutable Variable

```bash
$ readonly reptile=tortoise
```

Or in two steps:

```bash
$ reptile=tortoise
$ readonly reptile
```

Attempt to change it fails:

```bash
$ reptile=lizard
-bash: reptile: readonly variable
```

List all readonly variables:

```bash
$ readonly
$ readonly -p
```

### set — List All Variables

`set` without arguments prints all shell variables and functions (including unexported ones). Pipe through `less` or `grep`:

```bash
$ set | less
$ set | grep reptile
reptile=tortoise
```

### Child Shells and Visibility

A local variable is not passed to child shells:

```bash
$ reptile=tortoise
$ bash
$ echo $reptile
                     # empty
$ exit
```

### unset — Remove a Variable

```bash
$ unset reptile
$ echo $reptile
                     # empty
```

No dollar sign before the name. Works on both local and global variables.

---

## Global Environment Variables

Environment variables are visible in the current shell and all spawned processes. By convention, names are **UPPERCASE**.

```bash
$ echo $SHELL
/bin/bash
```

### Passing Values Between Variables

```bash
$ my_shell=$SHELL
$ your_shell=$my_shell
$ echo $your_shell
/bin/bash
```

### export — Make a Variable Global

```bash
$ export reptile          # export existing local variable
$ export amphibian=frog   # create and export in one step
```

After export, the variable is visible in child shells:

```bash
$ bash
$ echo $amphibian
frog
```

### export -n — Revoke Export

```bash
$ export -n reptile       # back to local
```

### env, printenv, declare -x

All three list environment variables.

`export` without arguments (same as `declare -x`):

```bash
$ export
declare -x HOME="/home/user2"
declare -x PATH="/usr/local/bin:/usr/bin:/bin"
declare -x SHELL="/bin/bash"
```

`env` and `printenv` give a simpler list:

```bash
$ env
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
HOME=/home/user2
```

`printenv` can fetch one variable **without** a dollar sign:

```bash
$ printenv PWD
/home/user2
```

Distinction for the exam: `set` shows everything including local variables and functions. `env`/`printenv` show only exported variables that child processes inherit.

---

## Running a Program in a Modified Environment

### env -i — Empty Environment

Starts a program with almost no inherited variables:

```bash
$ env -i bash
$ echo $USER
                     # empty
```

Useful for testing that a script does not rely on accidental user variables.

### env VAR=value command

Run one command with a temporarily changed variable — the shell's own environment is unchanged:

```bash
$ env LANG=es_ES.UTF-8 date
```

### BASH_ENV for Scripts

A non-interactive script reads no startup files, but checks `BASH_ENV`. If it points to a file, Bash sources that file before executing the script:

```bash
# ~/.startup_script
CROCODILIAN=caiman
```

```bash
$ BASH_ENV=/home/user2/.startup_script ./test_env.sh
caiman
```

---

## Common Environment Variables

### DISPLAY

X server address — `[hostname]:display[:screen]`. Empty hostname means localhost:

```bash
$ printenv DISPLAY
:0
```

`reptilium:0:2` — X server on host `reptilium`, display 0, screen 2.

### History Variables

| Variable | Purpose |
|---|---|
| `HISTCONTROL` | `ignorespace` (skip commands starting with space), `ignoredups` (skip consecutive duplicates), `ignoreboth` (both) |
| `HISTSIZE` | Commands kept in memory during session (default 1000) |
| `HISTFILESIZE` | Commands stored in history file (default 2000) |
| `HISTFILE` | Path to history file (default `~/.bash_history`) |

### HOME and Tilde

`HOME` holds the absolute path to the user's home directory. Tilde `~` is a synonym:

```bash
$ echo ~; echo $HOME
/home/carol
/home/carol
```

Standard check in `~/.profile`:

```bash
if [ -f "$HOME/.bashrc" ]; then
    . "$HOME/.bashrc"
fi
```

Test equality:

```bash
$ if [ ~ == "$HOME" ]; then echo "true"; fi
true
```

### HOSTNAME and HOSTTYPE

```bash
$ echo $HOSTNAME      # TCP/IP hostname
debian
$ echo $HOSTTYPE      # CPU architecture
x86_64
```

### LANG

System locale:

```bash
$ echo $LANG
en_UK.UTF-8
```

### LD_LIBRARY_PATH

Colon-separated list of shared library directories:

```bash
$ echo $LD_LIBRARY_PATH
/usr/local/lib
```

### MAIL and MAILCHECK

```bash
$ echo $MAIL          # path to mailbox
/var/mail/carol
$ echo $MAILCHECK     # check interval in seconds
60
```

### PATH

Colon-separated list of directories searched for executables. Typical `/etc/profile` block:

```bash
if [ "`id -u`" -eq 0 ]; then
    PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
else
    PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games"
fi
export PATH
```

`id -u` returns the UID — 0 for root.

Add a directory:

```bash
$ PATH=/new/dir:$PATH     # first (searched first)
$ PATH=$PATH:/new/dir     # last (searched last)
```

### Prompt Variables PS1–PS4

`PS1` — primary prompt (`# ` for root, `$ ` for regular users).

`PS2` — continuation prompt for multi-line commands (default `> `).

`PS3` — prompt for `select` construct.

`PS4` — debug tracing prefix for `set -x` (default `+ `).

### SHELL and USER

```bash
$ echo $SHELL        # absolute path to current shell
/bin/bash
$ echo $USER         # current username
carol
```

---

## Aliases and Functions

### Aliases

```bash
alias ll='ls -lah'
alias ..='cd ..'
alias grep='grep --color=auto'

alias             # list all
unalias ll        # remove one
unalias -a        # remove all
```

### Bash Functions

Functions accept positional arguments via `$1`, `$2`, `$@`. Functions override aliases of the same name.

```bash
greet() {
    echo "Hello, $1!"
}

greet World
# Hello, World!
```

List all defined functions:

```bash
$ declare -f
```

### Saving Aliases and Functions

Put them in `~/.bashrc` for persistence. Many distros use a separate `~/.bash_aliases` sourced from `~/.bashrc`:

```bash
if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
fi
```

---

## Skeleton Directory /etc/skel

`/etc/skel` is the template home directory. Its contents are copied into every new user's home when the account is created with `useradd -m` or `adduser`.

```bash
$ ls -la /etc/skel
.bash_logout  .bashrc  .profile
```

Add a line to any file here — all **future** users get it automatically. Existing users are unaffected.

Change the template path: edit `SKEL=` in `/etc/default/useradd`, or use `useradd -k /alternate/skel`.

---

## Quick Reference

```bash
# Check shell type
echo $0              # -bash = login
shopt login_shell    # on = login, off = non-login
echo $-              # 'i' present = interactive

# Apply config without restart
source ~/.bashrc
. ~/.bashrc
exec bash            # replace current shell process

# Variables
var=value            # local variable
export var=value     # create and export
export var           # export existing
export -n var        # revoke export
readonly var=value   # immutable
readonly             # list readonly variables
unset var            # remove variable
echo $var            # show value
printenv var         # show value (no $ needed)

# List variables
set                  # all variables and functions
env                  # environment only
printenv             # same as env
export               # environment with declare -x
declare -x           # synonym for export

# Modified environment
env -i bash                      # empty environment
env LANG=es_ES.UTF-8 date        # one variable for one command
BASH_ENV=~/.startup ./script.sh  # startup file for script

# Aliases and functions
alias ll='ls -lah'
unalias ll
alias
declare -f

# PATH
PATH=/new/dir:$PATH   # prepend (higher priority)
PATH=$PATH:/new/dir   # append

# Skel
ls -la /etc/skel
useradd -m newuser    # home created from /etc/skel
```

---

## Exam Questions

1. What is the difference between `~/.bash_profile` and `~/.bashrc`? → `bash_profile` is read once by a login shell at login. `bashrc` is read by every interactive non-login shell.
2. Both `~/.bash_profile` and `~/.profile` exist — which is read? → `~/.bash_profile`; `~/.profile` is ignored.
3. Where does the system-wide `PATH` live? → `/etc/profile` (plus fragments in `/etc/profile.d/`).
4. Difference between `source file` and `bash file`? → `source` executes in the current shell; `bash file` spawns a child shell and changes are lost on exit.
5. Which command turns a local variable into a global one? → `export VAR`.
6. What does `export -n VAR` do? → Revokes export; the variable becomes local again.
7. Single vs double quotes in assignment? → Double quotes allow `$variable` substitution; single quotes take everything literally.
8. Which variable specifies a startup file for a non-interactive script? → `BASH_ENV`.
9. Which command shows only environment variables? → `env`, `printenv`, or `export -p`.
10. Which command shows all variables including local ones and functions? → `set`.
11. How to make new users receive a particular alias by default? → Add the `alias` line to the appropriate file in `/etc/skel`.
12. How to create an immutable variable? → `readonly VAR=value`.
13. What is `~/.bash_logout` and when does it run? → A script executed when a login shell exits.
14. Difference between `unset VAR` and `VAR=`? → `unset` removes the variable entirely; `VAR=` leaves it with an empty value.
15. Which characters are forbidden at the start of a variable name? → Digits. Names must begin with a letter or underscore.
16. What is `declare -x`? → A synonym for `export`; lists or marks variables as exported.
17. What does `env -i` do? → Starts a command with an almost empty environment, stripping inherited variables.
18. What do `HISTCONTROL=ignoreboth` and `HISTCONTROL=ignoredups` do? → `ignoreboth`: skip commands starting with space AND consecutive duplicates. `ignoredups`: skip consecutive duplicates only.
19. What does `DISPLAY=reptilium:0:2` mean? → X server on host `reptilium`, display number 0, screen 2.

---

## Exercises

### Exercise 1 — Shell type by launch method

For each launch method, state whether the shell is a login shell and whether it is interactive.

| Launch method | Login | Interactive |
|---|---|---|
| `ssh user@host` | ? | ? |
| `Ctrl+Alt+F2` (login on tty2) | ? | ? |
| `su -` | ? | ? |
| `gnome-terminal` | ? | ? |
| `sakura` from `konsole` | ? | ? |
| Running `./script.sh` | ? | ? |

<details>
<summary>Answer</summary>

| Launch method | Login | Interactive |
|---|---|---|
| `ssh user@host` | yes | yes |
| `Ctrl+Alt+F2` | yes | yes |
| `su -` | yes | yes |
| `gnome-terminal` | no | yes |
| `sakura` from `konsole` | no | yes |
| `./script.sh` | no | no |

SSH, local tty login, and `su -` create a login shell (explicit system entry). Terminal emulators in a graphical session and shells inside other shells are non-login. A script is non-interactive.

</details>

---

### Exercise 2 — su and sudo for four shell types

Write the command to switch to user `bob`'s shell for each of the four types.

| Shell type | Command |
|---|---|
| Login + interactive | ? |
| Non-login + interactive | ? |
| Login + non-interactive | ? |
| Non-login + non-interactive | ? |

<details>
<summary>Answer</summary>

| Shell type | Command |
|---|---|
| Login + interactive | `su - bob` or `sudo -i -u bob` |
| Non-login + interactive | `su bob` or `sudo -u bob bash` |
| Login + non-interactive | `su - bob -c 'cmd'` or `sudo -i -u bob 'cmd'` |
| Non-login + non-interactive | `su bob -c 'cmd'` or `sudo -u bob 'cmd'` |

The dash in `su -` or the `-i` flag in `sudo` marks a login shell. Without them the shell is non-login. Adding `-c 'cmd'` runs one command non-interactively.

</details>

---

### Exercise 3 — Startup files for each shell type

Which initialization files does each shell type read? Assume the user has `~/.bash_profile`, `~/.bashrc`, and `~/.bash_logout`, and `~/.bash_profile` contains the standard block that sources `~/.bashrc`.

| Shell type | Files read |
|---|---|
| Login + interactive | ? |
| Non-login + interactive | ? |
| Login + non-interactive | ? |
| Non-login + non-interactive | ? |

<details>
<summary>Answer</summary>

| Shell type | Files read |
|---|---|
| Login + interactive | `/etc/profile`, `/etc/profile.d/*.sh`, `~/.bash_profile` (sources `~/.bashrc`); on exit: `~/.bash_logout` |
| Non-login + interactive | `/etc/bash.bashrc` (Debian) or `/etc/bashrc` (RHEL), `~/.bashrc` |
| Login + non-interactive | Rare (`bash --login script.sh`) — reads the same set as login + interactive |
| Non-login + non-interactive | Only the file pointed to by `BASH_ENV`, if set |

</details>

---

### Exercise 4 — Local or global variable?

For each command sequence, decide whether the result is a local or global variable.

| Commands | Local | Global |
|---|---|---|
| `debian=mother` | ? | ? |
| `ubuntu=deb-based` | ? | ? |
| `mint=ubuntu-based; export mint` | ? | ? |
| `export suse=rpm-based` | ? | ? |
| `zorin=ubuntu-based` | ? | ? |

<details>
<summary>Answer</summary>

| Commands | Local | Global |
|---|---|---|
| `debian=mother` | yes | no |
| `ubuntu=deb-based` | yes | no |
| `mint=ubuntu-based; export mint` | no | yes |
| `export suse=rpm-based` | no | yes |
| `zorin=ubuntu-based` | yes | no |

Plain assignment creates a local variable. `export`, whether combined with assignment or applied afterward, makes it a global environment variable.

</details>

---

### Exercise 5 — Decode variable values

Explain what each output means.

| Command | Output |
|---|---|
| `echo $HISTCONTROL` | `ignoreboth` |
| `echo ~` | `/home/carol` |
| `echo $DISPLAY` | `reptilium:0:2` |
| `echo $MAILCHECK` | `60` |
| `echo $HISTFILE` | `/home/carol/.bash_history` |

<details>
<summary>Answer</summary>

`HISTCONTROL=ignoreboth` — commands starting with a space are not saved to history, and consecutive duplicate commands are not saved either.

`~ = /home/carol` — the tilde expands to `$HOME`, which is `/home/carol` for user `carol`.

`DISPLAY=reptilium:0:2` — the X server is running on host `reptilium`, display number 0, screen 2.

`MAILCHECK=60` — Bash checks for new mail every 60 seconds.

`HISTFILE=/home/carol/.bash_history` — command history is saved to this file when the session ends.

</details>

---

### Exercise 6 — Fix invalid assignments

Each assignment is broken. Write the correct command and the `echo` call to produce the expected output.

| Broken assignment | Expected output |
|---|---|
| `lizard =chameleon` | `chameleon` |
| `cool lizard=chameleon` | `chameleon` |
| `lizard=cha\|me\|leon` | `cha\|me\|leon` |
| `lizard=/** chameleon **/` | `/** chameleon **/` |
| `win_path=C:\path\to\dir\` | `C:\path\to\dir\` |

<details>
<summary>Answer</summary>

| Correct command | Reference |
|---|---|
| `lizard=chameleon` | `echo $lizard` |
| `cool_lizard=chameleon` | `echo $cool_lizard` |
| `lizard="cha\|me\|leon"` | `echo $lizard` |
| `lizard="/** chameleon **/"` | `echo "$lizard"` |
| `win_path=C:\\path\\to\\dir\\` | `echo $win_path` |

Line 1: no spaces around `=`. Line 2: spaces in names are forbidden — use underscore. Lines 3–4: special characters `|` and `*` must be quoted. Line 4: double quotes required in `echo` to preserve internal spaces. Line 5: each backslash must be escaped with another backslash.

</details>

---

### Exercise 7 — Name the command for each task

| Task | Command |
|---|---|
| Set the current shell locale to Spanish UTF-8 (`es_ES.UTF-8`) | ? |
| Print the current working directory | ? |
| Access the variable holding SSH connection info | ? |
| Append `/home/carol/scripts` to PATH (lowest priority) | ? |
| Assign the literal string `PATH` to `my_path` | ? |
| Assign the value of `$PATH` to `my_path` | ? |

<details>
<summary>Answer</summary>

| Task | Command |
|---|---|
| Set locale | `LANG=es_ES.UTF-8` |
| Print working directory | `echo $PWD` or `pwd` |
| SSH connection info | `echo $SSH_CONNECTION` |
| Append scripts to PATH | `PATH=$PATH:/home/carol/scripts` |
| Literal `PATH` into `my_path` | `my_path=PATH` |
| Value of `$PATH` into `my_path` | `my_path=$PATH` |

Without the dollar sign `PATH` is just five characters. With `$` the shell expands it to its value.

</details>

---

### Exercise 8 — Local variable mammal

Create a local variable `mammal` with value `gnu`.

<details>
<summary>Answer</summary>

```bash
mammal=gnu
```

</details>

---

### Exercise 9 — Variable substitution in a value

Using substitution, create a local variable `var_sub` so that `echo $var_sub` outputs `The value of mammal is gnu`.

<details>
<summary>Answer</summary>

```bash
var_sub="The value of mammal is $mammal"
```

Double quotes allow `$mammal` to be expanded. Single quotes would output `The value of mammal is $mammal` literally.

</details>

---

### Exercise 10 — Export mammal

Make `mammal` a global environment variable.

<details>
<summary>Answer</summary>

```bash
export mammal
```

</details>

---

### Exercise 11 — Search with set and grep

Find `mammal` using `set` and `grep`.

<details>
<summary>Answer</summary>

```bash
set | grep mammal
```

</details>

---

### Exercise 12 — Search with env and grep

Find `mammal` using `env` and `grep`.

<details>
<summary>Answer</summary>

```bash
env | grep mammal
```

After `export mammal`, the variable appears in both `set` and `env`. Before export, `env` did not show it; `set` did.

</details>

---

### Exercise 13 — BIRD with two commands

Create an environment variable `BIRD` with value `penguin`. Use two commands.

<details>
<summary>Answer</summary>

```bash
BIRD=penguin; export BIRD
```

The semicolon separates two commands on one line. They can also be written on separate lines.

</details>

---

### Exercise 14 — NEW_BIRD with one command

Create an environment variable `NEW_BIRD` with value `yellow-eyed penguin`. Use one command.

<details>
<summary>Answer</summary>

```bash
export NEW_BIRD="yellow-eyed penguin"
```

Quotes are required because of the spaces in the value. Single quotes work equally well here since there is no variable substitution needed.

</details>

---

### Exercise 15 — Create ~/bin

You are `user2`. Create a `bin` directory in your home directory.

<details>
<summary>Answer</summary>

```bash
mkdir ~/bin
```

Equivalents: `mkdir /home/user2/bin` or `mkdir $HOME/bin`.

</details>

---

### Exercise 16 — Prepend ~/bin to PATH

Add `~/bin` to `PATH` so Bash searches it first.

<details>
<summary>Answer</summary>

```bash
PATH="$HOME/bin:$PATH"
```

Equivalents: `PATH=~/bin:$PATH` or `PATH=/home/user2/bin:$PATH`.

The colon separates directories. Placing your directory before `$PATH` makes Bash check it before system directories.

</details>

---

### Exercise 17 — Persist PATH via ~/.profile

Write the `if` block to add `~/bin` to PATH persistently via `~/.profile`.

<details>
<summary>Answer</summary>

```bash
if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi
```

The `[ -d "$HOME/bin" ]` check confirms the directory exists before adding it. Without the check, a non-existent path would pollute PATH.

</details>

---

### Exercise 18 — Hello world function and where to put it

Write a `hello` function that prints `Hello, world!`. Show how to load it with `source`. In which file should it go so user2 has it in every X Window terminal? In which file so root has it in any interactive shell?

<details>
<summary>Answer</summary>

```bash
hello() {
    echo "Hello, world!"
}
```

Save to a file (e.g., `~/myfuncs.sh`) and load:

```bash
$ source ~/myfuncs.sh
$ hello
Hello, world!
```

For user2 in X Window terminals (non-login interactive): `~/.bashrc`.

For root in any interactive shell: `/root/.bashrc`. If root also uses login shells (`su -`), add `source ~/.bashrc` to `/root/.bash_profile` as well, or put the function in `/etc/bash.bashrc` to cover all interactive shells system-wide.

</details>

---

### Exercise 19 — Is a simple echo script interactive?

Script `simple.sh`:

```bash
#!/bin/bash
echo "Hi"
```

Is it interactive? What makes a script interactive?

<details>
<summary>Answer</summary>

Not interactive. The script runs as a non-login non-interactive shell: commands come from a file, not a keyboard; stdin/stdout are not connected to a terminal by the user.

A script becomes interactive when it explicitly requests user input via `read` and its stdin is connected to a terminal:

```bash
#!/bin/bash
read -p "What is your name? " name
echo "Hello, $name!"
```

</details>

---

### Exercise 20 — Apply ~/.bashrc changes without restarting

You edited `~/.bashrc`. Apply the changes in the current shell without restarting it. Show two ways.

<details>
<summary>Answer</summary>

```bash
source ~/.bashrc
```

```bash
. ~/.bashrc
```

Both execute the file's commands in the current shell. Running `bash ~/.bashrc` would not work — variables would be set in a child shell and lost on exit.

A third option for a full shell reload: `exec bash` or `exec $SHELL` replaces the current shell process with a new one, reading all startup files fresh.

</details>

---

### Exercise 21 — Switching to tty when GUI freezes

The GUI is frozen. You press `Ctrl+Alt+F2` and log in on tty2. Which initialization files does Bash read?

<details>
<summary>Answer</summary>

Logging in on tty2 creates a login interactive shell. Files read:

1. `/etc/profile` (sources `/etc/profile.d/*.sh`)
2. First found of: `~/.bash_profile`, `~/.bash_login`, `~/.profile`

If `~/.bash_profile` contains the standard block sourcing `~/.bashrc`, then `~/.bashrc` is also read. On Debian, `/etc/profile` typically also sources `/etc/bash.bashrc`.

On exit, `~/.bash_logout` is executed.

</details>

---

### Exercise 22 — Automating ~/.bash_login via /etc/skel

You want every new user to receive `~/.bash_login` with a custom set of commands. How do you automate this?

<details>
<summary>Answer</summary>

Place the file in `/etc/skel`:

```bash
$ sudo nano /etc/skel/.bash_login
```

When a new user is created with `useradd -m newuser` or `adduser newuser`, the system copies `/etc/skel/.bash_login` to `/home/newuser/.bash_login`.

Note on priority: `~/.bash_login` is used only if `~/.bash_profile` is absent. If `~/.bash_profile` exists, `~/.bash_login` is silently skipped.

Existing users are not affected — copy the file manually for them.

</details>

---

### Exercise 23 — let and arithmetic

Create a local variable `my_val` with the value `10` as the result of `5 + 5`. Then create `your_val` with the value `5` as the result of dividing `my_val` by 2.

<details>
<summary>Answer</summary>

```bash
let "my_val = 5 + 5"
let "your_val = $my_val / 2"
```

`let` evaluates an arithmetic expression and assigns the result. Equivalents: `((my_val = 5 + 5))` or `my_val=$((5 + 5))`. All variants work with integers only.

</details>

---

### Exercise 24 — Command substitution syntax

Which is the correct modern equivalent of:

```bash
latest_music=`ls -l1t ~/Music | head -n 6`
```

A. `latest_music=$(ls -l1t ~/Music | head -n 6)`

B. `latest_music="(ls -l1t ~/Music | head -n 6)"`

C. `latest_music=((ls -l1t ~/Music | head -n 6))`

<details>
<summary>Answer</summary>

**A** is correct:

```bash
latest_music=$(ls -l1t ~/Music | head -n 6)
```

Command substitution has two equivalent syntaxes: backticks `` `cmd` `` and `$(cmd)`. The modern style is `$(cmd)` because it is easier to nest.

B produces a literal string. C is arithmetic substitution — it evaluates integers, not shell commands.

</details>

---

*LPIC-1 Study Notes | Topic 105: Shells and Shell Scripting*
