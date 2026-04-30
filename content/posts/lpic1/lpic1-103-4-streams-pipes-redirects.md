---
title: "LPIC-1 103.4 — Streams, Pipes and Redirects"
date: 2026-04-16
description: "Redirecting stdin, stdout and stderr, pipes, tee, xargs, command substitution, here documents. LPIC-1 exam topic 103.4."
tags: ["Linux", "LPIC-1", "pipes", "redirects", "streams", "xargs", "tee"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-103-4-streams-pipes-redirects/"
page_lang: "en"
---

## What You Need to Know

- Redirect stdin, stdout, and stderr.
- Pipe the output of one command into the input of another.
- Use command output as arguments for another command.
- Send output to both the screen and a file simultaneously.
- Utilities: `tee`, `xargs`.

---

## File Descriptors and Standard Streams

Every Linux process works with three standard data channels:

| Channel | Name   | Descriptor | Device      |
|---------|--------|------------|-------------|
| stdin   | input  | 0          | /dev/stdin  |
| stdout  | output | 1          | /dev/stdout |
| stderr  | errors | 2          | /dev/stderr |

By default in a terminal session the keyboard is connected to stdin, and the screen is connected to stdout and stderr. Bash lets you reassign any of these channels when launching a program.

---

## Output Redirection

The `>` symbol redirects stdout to a file:

```bash
cat /proc/cpuinfo > /tmp/cpu.txt
```

This is equivalent to the explicit `1>`, because when no number is given Bash substitutes descriptor 1:

```bash
cat /proc/cpuinfo 1> /tmp/cpu.txt
```

### Overwrite vs Append

The `>` operator overwrites the file without confirmation. The `>>` operator appends data to the end of the file without touching existing content. If the file doesn't exist yet, both operators create it:

```bash
cat /proc/cpuinfo >> /tmp/cpu.txt    # data is appended to the end
```

### Redirecting stderr

To capture stderr, put the digit `2` before `>`:

```bash
cat /proc/cpu_info 2> /tmp/error.txt
cat /tmp/error.txt
# cat: /proc/cpu_info: No such file or directory
```

### Redirecting stdout and stderr Together

To redirect both streams into one file at the same time use `&>` or `>&`:

```bash
cat /proc/cpuinfo &> /tmp/all.txt
```

Spaces around the ampersand are not allowed. A space before `&` would tell Bash to run the command in the background.

The same result using explicit notation:

```bash
cat /proc/cpuinfo > /tmp/all.txt 2>&1
```

Order matters here: first stdout is redirected to the file, then stderr is redirected to wherever stdout currently points.

### Redirecting Between Descriptors

`1>&2` redirects stdout to stderr. `2>&1` does the reverse: stderr is sent wherever stdout is going.

This is needed when you want to pass stderr messages to another program through a pipe, because a pipe only captures stdout. The fix: use `2>&1` before the pipe.

### Descriptors Above 2

Programs can open their own descriptors numbered 3 and above. They can be reassigned using the same notation:

```bash
./fd 3</tmp/error.txt 4>&1
```

Descriptor `3<>/tmp/error.txt` opens a file for both reading and writing simultaneously.

### noclobber

By default `>` overwrites a file without warning. The `noclobber` option prevents this:

```bash
set -o noclobber    # enable (or set -C)
set +o noclobber    # disable (or set +C)
```

Even with `noclobber` active, `>>` still works. You can also force an overwrite with `>|`:

```bash
cat /proc/cpuinfo >| /tmp/cpu.txt
```

For a permanent effect add the option to `~/.bashrc` or the system profile. Redirecting to `/dev/null` works with `noclobber` on because it's a device, not a regular file.

---

## Input Redirection

The `<` symbol redirects the contents of a file into a process's stdin. Data flows right to left:

```bash
uniq -c < /tmp/error.txt
```

Without an explicit number Bash substitutes descriptor 0, so this is equivalent to `uniq -c 0</tmp/error.txt`.

---

## Here Document and Here String

**Here Document** lets you enter multi-line text directly on the command line and feed it into stdin:

```bash
wc -c <<EOF
How many characters
in this Here document?
EOF
# 43
```

The string to the right of `<<` sets the terminating marker. Input ends when that marker appears alone on a line. No spaces between `<<` and the marker.

**Here String** does the same for a single line:

```bash
wc -c <<< "How many characters in this Here string?"
# 41
```

Strings with spaces must be quoted, otherwise only the first word reaches stdin and the rest are passed as arguments by Bash.

---

## Pipes

The vertical bar `|` connects the stdout of one command to the stdin of another. Unlike redirections, data flows left to right, and the target is another process rather than the filesystem. Bash launches all commands in a pipeline simultaneously:

```bash
cat /proc/cpuinfo | wc
# 208 1184 6096
```

A single command can have any number of pipes:

```bash
cat /proc/cpuinfo | grep 'model name' | uniq
```

Pipes and redirections can be combined in one line:

```bash
grep 'model name' < /proc/cpuinfo | uniq
```

### tee: Output to File and Screen Simultaneously

A pipe and a redirect are mutually exclusive: one stream, one recipient. The `tee` command removes this constraint. It reads from stdin, writes to stdout, and simultaneously writes to a file:

```bash
grep 'model name' < /proc/cpuinfo | uniq | tee cpu_model.txt
```

The result appears on screen and is saved to the file. The `-a` flag switches `tee` to append mode instead of overwrite:

```bash
... | tee -a cpu_model.txt
```

### Pipes and stderr

A pipe only captures stdout. To capture stderr too, redirect it into stdout first:

```bash
make 2>&1 | tee log.txt
```

Without `2>&1` the error message appears on screen but never reaches `log.txt`.

---

## Command Substitution

Command substitution lets you use the output of a command as an argument or variable value. Both syntaxes give the same result:

```bash
mkdir `date +%Y-%m-%d`
mkdir $(date +%Y-%m-%d)
```

Saving output to a variable:

```bash
OS=`uname -o`
echo $OS
# GNU/Linux
```

The `$()` syntax is preferred over backticks: it's cleaner with nested substitutions.

---

## xargs

When you need to pass command output to another command not through stdin but as command-line arguments, use `xargs`. It reads from stdin and passes the data as arguments to the specified command:

```bash
find /usr/share/icons -name 'debian*' | xargs identify -format "%f: %wx%h\n"
```

`xargs` collected all the paths found by `find` and passed them as arguments to `identify` in a single call.

### xargs Options

| Option   | Meaning                                              |
|----------|------------------------------------------------------|
| `-n N`   | Run command with N arguments at a time               |
| `-L N`   | Use N input lines per command run                    |
| `-I STR` | Set a placeholder string for positioning the argument|
| `-0`     | Use null character as delimiter                      |

```bash
find . -name '*.log' | xargs -n 1 rm
```

### Paths with Spaces: -print0 and -0

If filenames contain spaces, standard space-based splitting breaks. `find -print0` separates entries with a null byte, and `xargs -0` reads them correctly:

```bash
find . -name '*avi' -print0 | xargs -0 du | sort -n
```

### Argument Position: -I

By default `xargs` appends arguments at the end of the command. The `-I` option sets a placeholder string you can place anywhere:

```bash
find . -mindepth 2 -name '*.mp4' -print0 | xargs -0 -I PATH mv PATH ./
```

Here `PATH` stands in for the source in the `mv` command, followed by the target directory.

---

## Quick Reference

```bash
# Redirect stdout to file
command > file.txt

# Append stdout to file
command >> file.txt

# Redirect stderr to file
command 2> errors.txt

# Both streams to one file
command &> all.txt
command > all.txt 2>&1

# Discard stderr
command 2> /dev/null

# Redirect stdin from file
command < input.txt

# Here Document
command <<END
line 1
line 2
END

# Here String
command <<< "string"

# Pipe
cmd1 | cmd2 | cmd3

# tee: screen + file
cmd | tee file.txt
cmd | tee -a file.txt     # append, don't overwrite

# stderr through pipe
cmd 2>&1 | tee log.txt

# noclobber
set -o noclobber          # enable
set +o noclobber          # disable
command >| file.txt       # force overwrite with noclobber on

# Command substitution
VAR=$(command)
VAR=`command`

# xargs
find . -name '*.txt' | xargs grep "pattern"
find . -name '*.txt' -print0 | xargs -0 rm
find . -name '*.jpg' -print0 | xargs -0 -I F mv F ./photos/
```

---

## Exam Tips

**Which operator redirects stderr to a file?**
`2>`

**How do you redirect both stdout and stderr to one file?**
`&>` or `> file 2>&1`

**How do you write output to a file and display it on screen at the same time?**
With `tee`: `cmd | tee file.txt`

**How do you append data to an existing file without overwriting it?**
With `>>` or `tee -a`

**What does `2>&1` do?**
Redirects stderr to wherever stdout is currently pointing.

**How does `xargs` differ from command substitution?**
Command substitution inserts output as part of the command line (an argument or value). `xargs` reads stdin and explicitly passes its contents as arguments to a command, with control over how many arguments per invocation.

**Why use `-print0` / `-0`?**
To correctly handle filenames that contain spaces and special characters.

**What is a Here Document?**
A way to feed multi-line text into a command's stdin directly from the command line, without creating a temporary file. Denoted by `<<MARKER`.

---

## Exercises

### Guided Exercises

#### Lesson 1: Redirections

**1. `cat` can handle binary data. How do you use redirection to send the contents of `/dev/sdc` to a file `sdc.img` in the current directory?**

<details><summary>Answer</summary>

```bash
cat /dev/sdc > sdc.img
```

`cat` reads `/dev/sdc` as a plain data stream and sends it to the file via stdout. This is a standard way to create a bit-for-bit disk image.

</details>

---

**2. What is the standard channel being redirected by `date 1> now.txt`?**

<details><summary>Answer</summary>

Standard output, stdout.

Descriptor 1 corresponds to stdout. The `1>` form is explicit but fully equivalent to plain `>`.

</details>

---

**3. A user gets an error about `noclobber` being active when trying to overwrite a file. How do you disable it for the current session?**

<details><summary>Answer</summary>

```bash
set +C
# or
set +o noclobber
```

The `+` flag disables an option; `-` enables it. `set -C` and `set -o noclobber` turn the protection on.

</details>

---

**4. What does `cat <<.>/dev/stdout` do?**

<details><summary>Answer</summary>

Bash enters Here Document mode and waits for input lines until a lone `.` appears on its own line. After that, everything entered is sent to stdout and appears on screen.

</details>

---

#### Lesson 2: Pipes and Command Substitution

**1. `date +%Y-%m-%d` prints the current date as year-month-day. How do you save its output to a variable `TODAY` using command substitution?**

<details><summary>Answer</summary>

```bash
TODAY=`date +%Y-%m-%d`
# or
TODAY=$(date +%Y-%m-%d)
```

The `$()` syntax is preferred when nesting substitutions.

</details>

---

**2. How do you use `echo` to send the contents of `TODAY` to the stdin of `sed s/-/./g`?**

<details><summary>Answer</summary>

```bash
echo $TODAY | sed s/-/./g
```

`echo` prints the variable value to stdout; the pipe passes it to `sed`'s stdin, which replaces hyphens with dots.

</details>

---

**3. How do you use the output of `date +%Y-%m-%d` as a Here String for `sed s/-/./g`?**

<details><summary>Answer</summary>

```bash
sed s/-/./g <<< `date +%Y-%m-%d`
# or
sed s/-/./g <<< $(date +%Y-%m-%d)
```

Here String `<<<` feeds the string directly into stdin without running `echo`.

</details>

---

**4. The command `convert image.jpeg -resize 25% small/image.jpeg` creates a scaled-down copy in the `small` subdirectory. How do you run it for every file in `filelist.txt` using `xargs`?**

<details><summary>Answer</summary>

```bash
xargs -I IMG convert IMG -resize 25% small/IMG < filelist.txt
# or
cat filelist.txt | xargs -I IMG convert IMG -resize 25% small/IMG
```

`-I IMG` sets `IMG` as the placeholder. `xargs` substitutes each filename from the list in both positions: the source and the destination path.

</details>

---

### Explorational Exercises

#### Lesson 1: Redirections

**1. Where does `cat /proc/cpu_info 2>1` send the error message?**

<details><summary>Answer</summary>

To a file named `1` in the current directory.

This is not a redirect to descriptor 1, because there is no ampersand after `2>`. The construct `2>&1` redirects to a descriptor; `2>1` creates a file named `1`.

</details>

---

**2. Does redirection to `/dev/null` work when `noclobber` is active?**

<details><summary>Answer</summary>

Yes. `/dev/null` is a character device, and `noclobber` only protects regular files from being overwritten.

</details>

---

**3. How do you feed the value of `$USER` into `sha1sum`'s stdin without using `echo`?**

<details><summary>Answer</summary>

```bash
sha1sum <<< $USER
```

Here String passes the string directly into stdin without an external command.

</details>

---

**4. The Linux kernel keeps symbolic links to a process's open files in `/proc/PID/fd/`. How do you use this directory to check which files nginx with PID 1234 is writing to?**

<details><summary>Answer</summary>

```bash
ls -l /proc/1234/fd
```

Each link in that directory points to a real file. The ones leading into log directories reveal where nginx is writing.

</details>

---

**5. The `bc` program only accepts operations through stdin. How do you send it `scale=6; 1/3` using a Here String?**

<details><summary>Answer</summary>

```bash
bc <<< "scale=6; 1/3"
```

Here String feeds the string into `bc`'s stdin, and it immediately evaluates and prints the result.

</details>

---

#### Lesson 2: Pipes and xargs

**1. The commands `dd < /dev/sda1 > sda1.img` and `sha1sum < sda1.img > sda1.sha1` run separately. How do you combine them into a single command using `tee`?**

<details><summary>Answer</summary>

```bash
dd < /dev/sda1 | tee sda1.img | sha1sum > sda1.sha1
```

`dd` reads the partition and sends the data through the pipe to `tee`. `tee` simultaneously writes the stream to `sda1.img` and passes it on to `sha1sum`'s stdin, which computes the hash and saves it to `sda1.sha1`.

</details>

---

**2. The command `find /etc -type f | tar -cJ -f /srv/backup/etc.tar.xz -T -` can fail on paths with spaces. Which options should be added to `find` and `tar`?**

<details><summary>Answer</summary>

```bash
find /etc -type f -print0 | tar -cJ -f /srv/backup/etc.tar.xz --null -T -
```

`find -print0` separates entries with a null byte instead of a newline. The `--null` option for `tar` tells it to read the file list from `-T` using a null delimiter.

</details>

---

**3. How do you transfer a local file `etc.tar.gz` to a remote host via `ssh` without creating a temporary file?**

<details><summary>Answer</summary>

```bash
cat etc.tar.gz | ssh user@storage "cat > /srv/backup/etc.tar.gz"
# or
ssh user@storage "cat > /srv/backup/etc.tar.gz" < etc.tar.gz
```

`cat` sends the file contents to stdout; the pipe passes them into `ssh`'s stdin. The second variant does the same thing via input redirection: `ssh` reads the local file directly and streams it to the command on the remote side.

</details>

---

*Topic 103: GNU and Unix Commands*
