---
title: "LPIC-1 105.2 — Customize or Write Simple Scripts"
date: 2026-04-19
description: "Shebang, sh syntax, test, if/case, for/while/until, read/seq/exec, command chains, mail, script permissions and SUID. LPIC-1 exam topic 105.2."
tags: ["Linux", "LPIC-1", "bash", "scripting", "test", "loops", "case"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-105-2-scripts/"
---

> **Exam weight: 4** — LPIC-1 v5, Exam 102

## What You Need to Know

- Apply standard `sh` syntax: loops and conditionals.
- Use command substitution.
- Test command return values to determine success or failure.
- Chain commands together.
- Send conditional notifications to the root administrator.
- Select the correct script interpreter via the shebang line `#!`.
- Manage script location, ownership, execute permissions, and SUID.

Key files, terms, and utilities: `for`, `while`, `test`, `if`, `read`, `seq`, `exec`, `||`, `&&`.

---

## Shebang and Interpreter Selection

The first line of a script begins with `#!` (shebang) followed by the absolute path to the interpreter. The kernel reads this line when executing the file and passes it to the named program. Without a shebang the script still runs, but through the current shell — which may not be the intended behavior.

Common examples:

```bash
#!/bin/bash       # Bash — the most common choice
#!/bin/sh         # POSIX-compatible shell (varies by distro)
#!/usr/bin/env python3   # Python via env — more portable
```

---

## Basic sh Syntax

### Variables

Assignment — no spaces around the equals sign:

```bash
NAME="Alice"
COUNT=42
```

Reference a variable with `$NAME` or `${NAME}`. Double quotes preserve variable substitution; single quotes suppress it.

### Script Parameters

Inside a script, arguments are available as positional parameters:

| Parameter | Meaning |
|---|---|
| `$0` | Script name |
| `$1`, `$2` … | First, second … argument |
| `$#` | Number of arguments |
| `$@` | All arguments as separate words |
| `$*` | All arguments as a single string |
| `$?` | Exit code of the last command |
| `$$` | PID of the current process |
| `$!` | PID of the last background process |

---

## Command Substitution

Capture the output of a command and assign it to a variable or embed it in a string:

```bash
TODAY=$(date +%Y-%m-%d)
TODAY=`date +%Y-%m-%d`    # older form
```

The modern `$(...)` syntax is preferred because it supports nesting; backticks do not.

---

## Return Values and the test Command

### Exit Code

Every command returns an integer when it finishes. Zero means success; anything else is an error. The code is available in `$?` immediately after:

```bash
ls /etc
echo $?       # 0
ls /nonexistent
echo $?       # 2
```

A script can return its own code with `exit N` (0–255).

### Two Forms of test

The `test` builtin has two equivalent forms — as a command name or as square brackets where `test` is implied:

```bash
test -d /etc && echo "yes"
[ -d /etc ] && echo "yes"
```

Spaces inside `[ ]` are mandatory — after `[` and before `]`.

### File and Directory Tests

Assume the path is stored in `$VAR`:

| Flag | True when |
|---|---|
| `-e "$VAR"` | path exists |
| `-f "$VAR"` | path is a regular file |
| `-d "$VAR"` | path is a directory |
| `-s "$VAR"` | path exists and is non-empty |
| `-r "$VAR"` | path is readable by the current user |
| `-w "$VAR"` | path is writable |
| `-x "$VAR"` | path is executable |
| `-b "$VAR"` | block special device |
| `-c "$VAR"` | character special device |
| `-h` / `-L "$VAR"` | symbolic link |
| `-p "$VAR"` | named pipe |
| `-S "$VAR"` | socket |
| `-u "$VAR"` | has SUID bit |
| `-g "$VAR"` | has SGID bit |
| `-k "$VAR"` | has sticky bit |
| `-O "$VAR"` | owned by current user |
| `-G "$VAR"` | owned by current user's effective group |
| `-N "$VAR"` | modified since last read |

Always quote variables in tests — an empty variable produces a syntax error without quotes.

### Comparing Two Files

| Test | True when |
|---|---|
| `"$A" -nt "$B"` | A is newer than B (mtime) |
| `"$A" -ot "$B"` | A is older than B |
| `"$A" -ef "$B"` | A and B are the same file (same inode) |

### String Comparisons

| Test | True when |
|---|---|
| `-z "$S"` | string is empty (zero length) |
| `-n "$S"` | string is non-empty |
| `"$A" = "$B"` | strings are equal |
| `"$A" != "$B"` | strings differ |
| `"$A" < "$B"` | A sorts before B (locale-dependent) |
| `"$A" > "$B"` | A sorts after B |

For reproducible string ordering independent of locale: set `LANG=C` before the comparison.

### Numeric Comparisons

| Operator | Meaning |
|---|---|
| `-lt` | less than |
| `-gt` | greater than |
| `-le` | less or equal |
| `-ge` | greater or equal |
| `-eq` | equal |
| `-ne` | not equal |

Use only these letter operators for numbers. Using `<` or `>` compares strings and also redirects stdout — `test 1 > 2` creates a file named `2` and returns true.

### Logical Modifiers

| Operator | Meaning |
|---|---|
| `! EXPR` | true if EXPR is false |
| `EXPR1 -a EXPR2` | both expressions are true (AND) |
| `EXPR1 -o EXPR2` | at least one is true (OR) |

Example:

```bash
if [ ! -d "$FROM" -o ! -d "$TO" ]
then
    echo "One of the directories does not exist"
    exit 1
fi
```

---

## Conditional Constructs

### if / then / elif / else

```bash
if CONDITION
then
    COMMANDS
elif OTHER_CONDITION
then
    COMMANDS
else
    COMMANDS
fi
```

The condition is any command — its exit code is tested. Closed with `fi` (if reversed).

### case

Use `case` when many branches are needed:

```bash
#!/bin/bash
DISTRO=$1
echo -n "Distribution $DISTRO uses "
case "$DISTRO" in
  debian | ubuntu | mint)
    echo -n "the DEB"
    ;;
  centos | fedora | opensuse)
    echo -n "the RPM"
    ;;
  *)
    echo -n "an unknown"
    ;;
esac
echo " package format."
```

```
$ ./script.sh opensuse
Distribution opensuse uses the RPM package format.
```

Each pattern list is terminated by `;;`, `;&`, or `;;&`. The `*` pattern matches anything not caught above. Closed with `esac` (case reversed).

### nocasematch Option

Enable case-insensitive pattern matching in `case` (and `[[ ]]`):

```bash
shopt -s nocasematch    # enable
shopt -u nocasematch    # disable
```

Changes made inside a script do not affect the parent session — scripts run in a subshell.

---

## Loops

### for

```bash
for VARNAME in LIST
do
    COMMANDS
done
```

`LIST` is a sequence of whitespace-separated elements. `IFS` defines the delimiter (default: space, tab, newline).

Example — check odd/even:

```bash
#!/bin/bash
for NUM in 1 1 2 3 5 8 13
do
    echo -n "$NUM is "
    if [ $(( $NUM % 2 )) -ne 0 ]; then echo "odd."; else echo "even."; fi
done
```

### C-Style for

```bash
#!/bin/bash
SEQ=( 1 1 2 3 5 8 13 )
for (( IDX = 0; IDX < ${#SEQ[*]}; IDX++ ))
do
    echo "${SEQ[$IDX]}"
done
```

### until

Repeats while the test returns non-zero (fails):

```bash
IDX=0
until [ $IDX -eq ${#SEQ[*]} ]
do
    echo "${SEQ[$IDX]}"
    IDX=$(( $IDX + 1 ))
done
```

### while

Repeats while the test returns zero (succeeds):

```bash
while [ $IDX -lt ${#SEQ[*]} ]
do
    echo "${SEQ[$IDX]}"
    IDX=$(( $IDX + 1 ))
done
```

`while` and `until` are mirror images — `while COND` is equivalent to `until ! COND`.

### Practical Example: sync.sh

A script to synchronise files from a source to a destination directory. The list of items is stored in `~/.sync.list` (one entry per line, spaces in names allowed):

```bash
#!/bin/bash
set -ef

FILE=~/.sync.list
FROM=$1
TO=$2

if [ ! -d "$FROM" -o ! -d "$TO" ]
then
    echo "Usage: $0 <SOURCEDIR> <DESTDIR>"
    exit 1
fi

mapfile -t LIST < $FILE

for (( IDX = 0; IDX < ${#LIST[*]}; IDX++ ))
do
    echo -e "$FROM/${LIST[$IDX]} \u2192 $TO/${LIST[$IDX]}"
    rsync -qa --delete "$FROM/${LIST[$IDX]}" "$TO"
done
```

`set -ef`: `-e` exits on any error; `-f` disables filename globbing.

`mapfile -t LIST < $FILE`: loads the file into array `LIST`, one line per element, stripping trailing newlines.

`rsync -qa --delete`: quiet mode, archive (preserves attributes), delete in destination what is gone in source.

---

## read, seq, exec

### read

```bash
read -p "Name: " NAME           # prompt and read
read -s PASSWORD                # silent (for passwords)
read -t 5 ANSWER                # timeout 5 seconds
read FIRST SECOND REST          # split input across multiple variables
```

### seq

Print a sequence of numbers:

```bash
seq 5            # 1 2 3 4 5
seq 2 2 10       # 2 4 6 8 10  (step 2)
seq -w 1 10      # 01 02 ... 10  (leading zeros)
```

In a `for` loop:

```bash
for i in $(seq 1 10); do echo "Step $i"; done
```

### exec

Replaces the current shell process with the named command — no new process, no return:

```bash
exec /usr/bin/python3 myscript.py
```

Without a command, `exec` redirects the rest of the script's I/O:

```bash
exec > /tmp/log.txt 2>&1    # all subsequent output goes to the file
```

---

## Command Chains

| Separator | Behavior |
|---|---|
| `;` | run in sequence regardless of result |
| `&&` | run next command only if previous succeeded (exit 0) |
| `\|\|` | run next command only if previous failed (exit ≠ 0) |

```bash
make && make install                    # install only on successful build
test -f /tmp/lock || touch /tmp/lock    # create lock file if absent
mkdir backup && cp -r data backup/      # copy only if directory was created
```

A `&&` chain replaces a simple `if`:

```bash
[ -d /backup ] && rsync -a /data/ /backup/
```

---

## Conditional Mail to the Administrator

The objective: know how to send conditional notifications to root. Use `mail` or `mailx`:

```bash
df -h | grep -E '9[0-9]%|100%' && \
    df -h | mail -s "Disk usage critical on $(hostname)" root
```

With `if`:

```bash
if ! systemctl is-active --quiet apache2
then
    echo "Apache down at $(date)" | mail -s "ALERT: apache2 down" root
fi
```

An MTA (postfix, sendmail, exim) must be running on the server for mail to actually be delivered.

---

## Script Location and Permissions

Common directories:

| Path | Use |
|---|---|
| `~/bin` or `~/.local/bin` | personal scripts |
| `/usr/local/bin` | scripts for all users |
| `/usr/local/sbin` | administrative scripts requiring root |
| `/etc/cron.daily/` etc. | scripts run by cron |

Make a script executable:

```bash
chmod +x myscript.sh         # for everyone
chmod 755 myscript.sh        # rwxr-xr-x
chmod 700 myscript.sh        # owner only
```

Short-name execution works only when the script's directory is in `PATH`. Otherwise use the full or relative path:

```bash
./myscript.sh
/usr/local/bin/myscript.sh
```

### SUID on Scripts

The Linux kernel ignores the SUID bit on shell scripts for security reasons (race conditions during interpretation). If you need a regular user to run something as root, use:

- `sudo` with a specific rule in `/etc/sudoers`
- A C wrapper that calls the script
- `setcap` for specific capabilities

---

## Quick Reference

```bash
# Shebang (first line of script)
#!/bin/bash
#!/bin/sh
#!/usr/bin/env python3

# Script parameters
$0  $1  $2  $#  $@  $*  $?  $$  $!

# Command substitution
result=$(command)
result=`command`      # older form

# test
test -f "$FILE"       # regular file
[ -d "$DIR" ]         # directory
[ -z "$VAR" ]         # empty string
[ "$A" -lt "$B" ]     # numeric: less than
[ "$A" -nt "$B" ]     # file A newer than B
echo $?               # check last exit code

# Logical operators inside test
[ ! EXPR ]                    # NOT
[ EXPR1 -a EXPR2 ]            # AND
[ EXPR1 -o EXPR2 ]            # OR

# if
if [ COND ]; then CMD; elif [ COND2 ]; then CMD2; else CMD3; fi

# case
case "$VAR" in
  pat1) CMDS ;;
  pat2|pat3) CMDS ;;
  *) CMDS ;;
esac
shopt -s nocasematch   # case-insensitive matching

# for
for VAR in LIST; do CMDS; done
for (( i=0; i<N; i++ )); do CMDS; done

# while / until
while [ COND ]; do CMDS; done
until [ COND ]; do CMDS; done

# read / seq / exec
read -p "Prompt: " VAR
seq 1 10
for i in $(seq 1 10); do ...; done
exec CMD          # replace shell with CMD
exec > file.txt   # redirect all script output

# Command chains
CMD1 && CMD2      # CMD2 only if CMD1 succeeded
CMD1 || CMD2      # CMD2 only if CMD1 failed
CMD1 ; CMD2       # always run both

# Permissions
chmod +x script.sh
chmod 755 script.sh

# set options
set -e    # exit on error
set -f    # disable globbing
set -x    # trace execution
```

---

## Exam Questions

1. What exit code means success? → Zero.
2. How is `==` inside `test` different from `-eq`? → `==` compares strings; `-eq` compares integers.
3. How to test that a variable is empty? → `[ -z "$VAR" ]`.
4. How to test that a path is a directory? → `[ -d "$PATH" ]`.
5. How to test that file A is newer than file B? → `[ "$A" -nt "$B" ]`.
6. What is a shebang and where does it go? → `#!interpreter` on the very first line of the script.
7. How to do case-insensitive matching in `case`? → `shopt -s nocasematch` before the construct.
8. How to close a `case` block? → `esac`.
9. How to close an `if` block? → `fi`.
10. Difference between `&&` and `;`? → `&&` runs the next command only on success; `;` always runs it.
11. Why does `test 1 > 2` return true? → `>` is a string operator (1 < 2 alphabetically), and the `>` is also interpreted as a redirect creating a file named `2`.
12. How to ensure stable alphabetical ordering regardless of locale? → Set `LANG=C` before the comparison.
13. What does `mapfile -t LIST < file` do? → Reads the file into array `LIST`, one line per element, trimming trailing newlines.
14. Which `set` option exits the script on any error? → `-e`.
15. Do `shopt` changes inside a script affect the parent shell? → No — the script runs in a subshell.
16. What does `exec > /tmp/log.txt 2>&1` do in a script? → Redirects all subsequent stdout and stderr to the file, without replacing the shell.
17. How to send a one-line alert to root? → `echo "message" | mail -s "subject" root`.
18. Why does the kernel ignore SUID on shell scripts? → Race condition risk during shebang interpretation.

---

## Exercises

### Exercise 1 — test for file comparison

How do you use `test` to check whether the file in `$FROM` is newer than the file in `$TO`?

<details>
<summary>Answer</summary>

```bash
test "$FROM" -nt "$TO"
```

Returns exit code 0 if `$FROM` is newer. The `-nt` flag stands for "newer than". Double quotes protect against empty variables.

</details>

---

### Exercise 2 — Infinite while and missing increment

This script should print numbers 0 through 9, but instead prints 0 forever. Fix it.

```bash
#!/bin/bash
COUNTER=0
while [ $COUNTER -lt 10 ]
do
    echo $COUNTER
done
```

<details>
<summary>Answer</summary>

The loop body never increments `COUNTER`, so the condition `[ $COUNTER -lt 10 ]` is always true.

Fixed script:

```bash
#!/bin/bash
COUNTER=0
while [ $COUNTER -lt 10 ]
do
    echo $COUNTER
    COUNTER=$(( $COUNTER + 1 ))
done
```

Alternative increment forms: `(( COUNTER++ ))` or `let COUNTER++`.

</details>

---

### Exercise 3 — Different sort order on two machines

The same script sorts a list of usernames differently on two machines:

Machine 1:
```
carol
Dave
emma
Frank
Grace
henry
```

Machine 2:
```
Dave
Frank
Grace
carol
emma
henry
```

Why, and how do you fix it?

<details>
<summary>Answer</summary>

Sorting depends on the system locale. Different locales use different rules for comparing upper- and lowercase letters. To get stable results everywhere:

```bash
LANG=C sort users.txt
```

Machine 1 likely uses a UTF-8 locale (e.g., `en_US.UTF-8`) that interleaves upper- and lowercase. Machine 2 uses `C`/`POSIX`, which places all uppercase ASCII letters before all lowercase.

</details>

---

### Exercise 4 — Script arguments into a Bash array

How do you populate a Bash array with all the command-line arguments of a script?

<details>
<summary>Answer</summary>

```bash
PARAMS=( "$@" )
```

Or equivalently:

```bash
PARAMS=( $* )
```

`"$@"` is preferred — it preserves each argument as a separate element even when arguments contain spaces. `$*` (unquoted) splits on `IFS` and can lose argument boundaries.

</details>

---

### Exercise 5 — Why does `test 1 > 2` return true?

<details>
<summary>Answer</summary>

Two reasons:

1. The `>` operator inside `test` is for **string** comparison, not numeric. Numerically `1 < 2`, but `test 1 > 2` asks whether the string `"1"` sorts after `"2"` — and it does not, so the test is false. However…
2. The shell intercepts `>` as a **redirect** before `test` even sees it. The actual command executed is `test 1` (redirect stdout to a file named `2`). `test 1` evaluates a non-empty string as true, so the exit code is 0.

For correct numeric comparison use `[ 1 -gt 2 ]`. For correct string comparison escape the operator: `test 1 \> 2`.

</details>

---

### Exercise 6 — Temporarily change IFS to newline

How do you change the field separator to newline and restore it afterwards?

<details>
<summary>Answer</summary>

```bash
OLDIFS=$IFS
IFS=$'\n'

# ... commands that rely on newline as separator ...

IFS=$OLDIFS
```

`$'\n'` is ANSI-C quoting in Bash — backslash sequences (`\n`, `\t`, etc.) are interpreted as the actual control characters. Without the `$`, the literal two-character string `\n` would be assigned.

</details>

---

*LPIC-1 Study Notes | Topic 105: Shells and Shell Scripting*
