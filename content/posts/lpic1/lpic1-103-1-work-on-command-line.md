---
title: "LPIC-1 103.1 — Work on the Command Line"
date: 2026-04-16
description: "pwd, uname, man, apropos, type, which, history, environment variables, PATH, quoting and escaping. LPIC-1 exam topic 103.1."
tags: ["Linux", "LPIC-1", "Bash", "Shell", "Command Line"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-103-1-work-on-command-line/"
page_lang: "en"
---

> **Exam weight: 4** — LPIC-1 v5, Exam 101

## What you need to know

- Execute single commands and single-line command sequences.
- Work with environment variables: create, read and export.
- Use and edit the command history.
- Run commands inside and outside a defined PATH.

---

## Getting system information

### pwd and uname

To find out which directory you are currently in, run `pwd` (print working directory):

```bash
$ pwd
/home/frank
```

To get information about the kernel and system architecture, use `uname`. The `-a` flag prints everything at once:

```bash
$ uname -a
Linux base 4.18.0-18-generic #19~18.04.1-Ubuntu SMP Fri Apr 5 10:22:13 UTC 2019 x86_64 x86_64 x86_64 GNU/Linux
```

Individual `uname` flags:

| Flag | Output |
|------|--------|
| `-s` | Kernel name |
| `-n` | Hostname |
| `-r` | Kernel release |
| `-v` | Kernel version |
| `-m` | Machine architecture |
| `-i` | Hardware platform |
| `-o` | Operating system |
| `-a` | All of the above |

### man and apropos

`man` opens the manual page for a command:

```bash
$ man uname
```

If you cannot remember the exact command name, use `apropos`. It searches by name and description across all man pages:

```bash
$ apropos kernel
uname (2) - get name and information about current kernel
```

### type and which

`type` shows the type of a command and its location. It can check several commands at once:

```bash
$ type uname cp kill which
uname is hashed (/bin/uname)
cp is /bin/cp
kill is a shell builtin
which is /usr/bin/which
```

Note "hashed": this means the command was recently used and was cached in Bash's hash table for faster lookup. Clear the hash table with `hash -d`.

Three possible command types in `type` output:
- Regular binary (path to the file)
- Shell builtin (built into Bash itself)
- Hashed (cached in the current session)

`which` returns only the path to an executable file, with no extra text:

```bash
$ which uname
/bin/uname
```

For Bash built-in commands use `help` instead of `which`.

---

## Command history

### The history command

`history` lists recently executed commands with sequential numbers. The most recent commands appear at the bottom. Useful combined with `grep`:

```bash
$ history | grep bash_history
1605 sudo find /home -name ".bash_history" | xargs grep sudo
```

View only the last N commands:

```bash
$ history 20
```

Navigating history with keyboard shortcuts:
- Up/Down arrow — cycle through history entries.
- `Ctrl+R` — interactive reverse search through history.

### The .bash_history file

History is saved to the hidden file `~/.bash_history`. It is only visible with `ls -a`:

```bash
$ ls -a /home/frank
. .. .bash_history .bash_logout .bashrc .profile .ssh newfile
```

Important nuance: commands are added to the in-memory history database immediately, but are written to `.bash_history` only when the session ends. The very latest commands may therefore be absent from the file.

Compare the in-memory history with the file:

```bash
$ history 20
$ tail -n 20 ~/.bash_history
```

---

## Environment variables

### Viewing variables: env and set

`env` prints environment variables. `PATH` is always among them — it is the list of directories the shell searches for executables:

```bash
$ env
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

Print only the value of a specific variable with `echo`:

```bash
$ echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

`set` prints more — including local variables and shell functions. The difference:

| Command | Shows |
|---------|-------|
| `env` | Only exported environment variables |
| `set` | All variables including locals, plus functions |

Example: a variable `mynewvar` created without `export` is visible via `set` but not via `env`:

```bash
$ mynewvar=goodbye
$ env | grep mynewvar
(no output)
$ set | grep mynewvar
mynewvar=goodbye
```

### Creating and exporting variables

Creating a variable is simple:

```bash
$ myvar=hello
$ echo $myvar
hello
```

No spaces around `=`. Such a variable lives only in the current session. Child shells will not see it:

```bash
$ bash
$ echo $myvar
(empty)
```

To pass a variable to child shells, export it:

```bash
$ export myvar
$ bash
$ echo $myvar
hello
```

Add a directory to PATH temporarily (without rebooting):

```bash
$ export PATH="/home/frank/myfiles:$PATH"
```

### Removing variables: unset

`unset` removes a variable. No `$` sign is needed before the name:

```bash
$ unset myvar
$ echo $myvar
(empty)
```

If you remove the `PATH` variable, the shell will stop finding commands by name. You will have to type full paths, such as `/usr/bin/sudo`. Exiting the shell restores PATH.

---

## Escaping special characters

Bash interprets special characters and spaces in its own way. Creating a file with spaces in its name without quotes creates multiple files:

```bash
$ touch my big file
$ ls
my  big  file
```

Three ways to escape special characters:

**Double quotes** preserve the literal meaning of most characters, but `$`, `` ` ``, `\` and `!` are still interpreted:

```bash
$ touch "my big file"
$ echo "$myvar"
hello
```

**Single quotes** make everything literal, with no exceptions:

```bash
$ touch 'my big file'
$ echo '$myvar'
$myvar
```

**Backslash** escapes a single character:

```bash
$ touch my\ big\ file
```

Full list of special characters in Bash: `& ; | * ? " ' [ ] ( ) $ < > { } # / \ ! ~`

---

## Exam command reference

```bash
pwd                         # current directory
uname -a                    # all system information
uname -v                    # kernel version
uname -i                    # hardware platform
man <command>               # manual page
apropos <keyword>           # search man pages
type <command>              # command type and location
which <command>             # path to executable
history                     # command history
history 20                  # last 20 commands
history | grep <string>     # search history
tail -n 20 ~/.bash_history  # last 20 lines of history file
env                         # environment variables
set                         # all variables and functions
echo $VARIABLE              # value of a variable
export VAR=value            # create and export a variable
export PATH="dir:$PATH"     # add a directory to PATH
unset VAR                   # remove a variable
hash -d                     # clear the command hash table
```

---

## Typical exam questions

**Which command prints the current working directory?**
`pwd`

**What is the difference between `set` and `env`?**
`env` shows only exported environment variables. `set` shows all variables including locals, plus shell functions.

**A variable was created without `export`. Will it be available in a child shell?**
No. A variable without `export` is only available in the current session.

**`type` showed `kill is a shell builtin`. What does that mean?**
The `kill` command is built into the Bash shell and is not a separate executable file.

**What is the difference between single and double quotes?**
Single quotes make all characters literal. Double quotes preserve interpretation of `$`, `` ` ``, `\` and `!`.

**Why are the most recent commands absent from `~/.bash_history`?**
Commands are written to the file only when the session ends. During the session they are stored in an in-memory database.

**How do you temporarily add the directory `/opt/mytools` to PATH?**
`export PATH="/opt/mytools:$PATH"`

---

## Exercises

### Lesson 1 — Guided Exercises

**1. Using the `man` system, find out how to make `apropos` print a brief usage message and exit.**

<details>
<summary>Answer</summary>

```bash
$ man apropos
```

In the "Options" section find the `--usage` parameter. It prints a brief syntax message and exits.

```bash
$ apropos --usage
```

> `--usage` is available in many GNU utilities. It is the standard way to get minimal help without opening the full man page.

</details>

---

**2. Using the `man` system, determine which licence the `grep` command is distributed under.**

<details>
<summary>Answer</summary>

```bash
$ man grep
```

Scroll to the "Copyright" section. It states that the program uses the Free Software Foundation licence (GPL).

</details>

---

### Lesson 1 — Explorational Exercises

**1. Determine the hardware architecture and Linux kernel version in a human-readable format.**

<details>
<summary>Answer</summary>

First study the `uname` man page to find the right flags:

```bash
$ man uname
```

The `-v` flag prints the kernel version; `-i` shows the hardware platform:

```bash
$ uname -v
$ uname -i
```

> You can also use `uname -a` to get everything at once. But if you need a clean machine-readable string, `-v` and `-i` are more precise.

</details>

---

**2. Print the last 20 lines of the in-memory history and the `.bash_history` file, and compare them.**

<details>
<summary>Answer</summary>

```bash
$ history 20
$ tail -n 20 ~/.bash_history
```

The in-memory history (`history` output) will contain commands from the current session that are not yet in `.bash_history`. They will be written to the file only when the session ends.

</details>

---

**3. Use `apropos` to find the man page of the command that shows block device sizes in bytes rather than megabytes or gigabytes.**

<details>
<summary>Answer</summary>

```bash
$ apropos block
```

Find `lsblk`, which lists block devices. Then open its man page and look for the relevant flag:

```bash
$ man lsblk
```

In the "Description" section the `-b` flag outputs sizes in bytes. Run it:

```bash
$ lsblk -b
```

</details>

---

### Lesson 2 — Guided Exercises

**1. Using `export`, add a new directory to PATH. The change should not persist after a reboot.**

<details>
<summary>Answer</summary>

```bash
$ export PATH="/home/yourname/myfiles:$PATH"
```

Verify the directory was added:

```bash
$ echo $PATH
```

To test the new path, create a script, make it executable, and run it from another directory:

```bash
$ mkdir -p ~/myfiles
$ touch ~/myfiles/myscript.sh
$ echo '#!/bin/bash' >> ~/myfiles/myscript.sh
$ echo 'echo Hello' >> ~/myfiles/myscript.sh
$ chmod +x ~/myfiles/myscript.sh
$ myscript.sh
Hello
```

> This PATH change exists only in the current session. To make it permanent, add the export line to `~/.bashrc` or `~/.bash_profile`.

</details>

---

**2. Remove the PATH variable with `unset`. Try running `sudo`. What happened and why? Exiting the shell restores the original state.**

<details>
<summary>Answer</summary>

```bash
$ unset PATH
$ sudo cat /etc/shadow
```

The command fails: the shell cannot find `sudo` because it does not know where to look. `sudo` is a regular binary at `/usr/bin/sudo`, and without PATH the shell cannot find it by name alone.

Running it via an absolute path still works:

```bash
$ /usr/bin/sudo /bin/cat /etc/shadow
```

Restore PATH by exiting the current shell:

```bash
$ exit
```

> This exercise clearly shows why PATH is so critical. Without it, the shell cannot find any command by name.

</details>

---

### Lesson 2 — Explorational Exercises

**1. Find the full list of special Bash characters.**

<details>
<summary>Answer</summary>

Full list of characters Bash interprets non-literally:

```
& ; | * ? " ' [ ] ( ) $ < > { } # / \ ! ~
```

Each has a special meaning in the shell. For example `|` creates a pipe, `$` expands a variable, `*` is a filename glob.

</details>

---

**2. Try the different methods of escaping special characters. Is there a difference between them?**

<details>
<summary>Answer</summary>

Yes, there is. Double quotes escape most characters, but `$`, `` ` ``, `\` and `!` retain their meaning:

```bash
$ mynewvar=goodbye
$ echo "$mynewvar"
goodbye
```

Single quotes make absolutely everything literal, including `$`:

```bash
$ echo '$mynewvar'
$mynewvar
```

A backslash escapes the single following character:

```bash
$ echo \$mynewvar
$mynewvar
```

The choice depends on the task: if you need variables to expand inside a string, use double quotes. If you need to pass a string literally, use single quotes.

</details>

---

## Related topics

- [101.1 Determine and Configure Hardware Settings](/posts/lpic1-101-1-hardware-settings/) — hardware and devices
- 103.2 Process Text Streams Using Filters — text stream processing
- 103.3 Perform Basic File Management — file management
- 105.1 Customise and Use the Shell Environment — shell environment customisation

---

*LPIC-1 Study Notes | Topic 103: GNU and Unix Commands*
