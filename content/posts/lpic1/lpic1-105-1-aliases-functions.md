---
title: "LPIC-1 105.1 — Aliases, Functions, and Special Variables (Part 3)"
date: 2026-04-19
description: "Alias quoting, dynamic vs static expansion, Bash functions, special variables $? $$ $!, functions in scripts, function inside alias. LPIC-1 exam topic 105.1."
tags: ["Linux", "LPIC-1", "bash", "alias", "function", "shell", "environment"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-105-1-aliases-functions/"
---

> **Exam weight: 4** — LPIC-1 v5, Exam 102 | Part 3 of 105.1

## Aliases — Advanced Usage

### Quotes and Variables Inside an Alias

Commands with spaces, options, or chains must be quoted inside an alias. Otherwise Bash treats the first space as the end of the definition.

```bash
$ alias ll='ls -al'
$ alias greet='echo Hello world!'
```

A variable value can be embedded in an alias:

```bash
$ reptile=uromastyx
$ alias greet='echo Hello $reptile!'
$ greet
Hello uromastyx!
```

A variable can also be set inside the alias itself, separated by a semicolon:

```bash
$ alias greet='reptile=tortoise; echo Hello $reptile!'
$ greet
Hello tortoise!
```

### Dynamic vs Static Expansion

The type of quotes determines **when** a variable is expanded.

**Single quotes** — defer expansion until the alias is invoked:

```bash
$ alias where?='echo $PWD'
$ where?
/home/user2
$ cd Music
$ where?
/home/user2/Music          # expands to current directory each time
```

**Double quotes** — expand the variable immediately when the alias is created, fixing the value:

```bash
$ alias where?="echo $PWD"
$ where?
/home/user2
$ cd Music
$ where?
/home/user2                # still the old directory
```

Simple rule: **single quotes = dynamic, double quotes = static**.

### Alias Inside an Alias

An alias can call another alias by name:

```bash
$ alias where?='echo $PWD'
$ alias my_home=where?
$ my_home
/home/user2
```

### Command Chain with Semicolons

An alias can run multiple commands separated by semicolons:

```bash
$ alias git_info='which git; git --version'
$ git_info
/usr/bin/git
git version 2.7.4
```

---

## Bash Functions — Advanced Usage

### Single-line Function Definition

A function can be written on one line. Semicolons separate commands, and a semicolon is **required after the last command** before the closing brace:

```bash
$ greet() { greeting="Hello world!"; echo $greeting; }
$ greet
Hello world!
```

When typing a function interactively line by line, Bash shows the `>` continuation prompt (PS2) until the block is closed:

```bash
$ greet() {
> greeting="Hello world!"
> echo $greeting
> }
```

### Variables Inside Functions

A function works with both local shell variables and environment variables. Given a file `funed` with:

```bash
editors() {
    editor=emacs
    echo "My editor is: $editor. $editor is a fun text editor."
}
```

Source and call it:

```bash
$ . funed
$ editors
My editor is: emacs. emacs is a fun text editor.
```

The variable `editor` set inside the function remains in the current shell after the call:

```bash
$ echo $editor
emacs
```

Environment variables like `$USER` can also be used inside functions:

```bash
editors() {
    editor=emacs
    echo "The text editor of $USER is: $editor."
}
editors
```

If the function call is the last line of the file, sourcing the file immediately invokes it.

### Positional Parameters in Functions

Parameters are passed either from the file itself or from the command line.

From the file:

```bash
editors() {
    editor=emacs
    echo "The text editor of $USER is: $editor."
    echo "Bash is not a $1 shell."
}
editors tortoise
```

From the command line (remove the invocation from the file, source just the definition, then call):

```bash
$ . funed
$ editors tortoise
The text editor of user2 is: emacs.
Bash is not a tortoise shell.
```

### Aliases and Positional Parameters

Technically you can pass arguments to an alias, but they always go to the **end** of the expanded line, regardless of where `$1` is placed:

```bash
$ alias great_editor='echo $1 is a great text editor'
$ great_editor emacs
is a great text editor emacs
```

For proper positional parameter handling, use **functions**, not aliases.

---

## Special Built-in Bash Variables

These variables are read-only — you can read them but not assign to them directly.

### $? — Last Exit Code

Stores the exit code of the last command. `0` means success:

```bash
$ ps aux | grep bash
user2  420  ... -bash
$ echo $?
0
```

Non-zero means an error:

```bash
$ ps aux | rep bash
-bash: rep: command not found
$ echo $?
127
```

### $$ — Shell PID

Current shell's process ID:

```bash
$ echo $$
420
```

### $! — Background Job PID

PID of the last process started in the background with `&`:

```bash
$ ps aux | grep bash &
[1] 663
$ echo $!
663
```

### Positional Parameters $0..$9

`$0` — script or shell name. `$1`–`$9` — arguments passed to a function or script:

```bash
$ special_vars() {
> echo $0
> echo $1
> echo $2
> echo $3
> }
$ special_vars debian ubuntu zorin
-bash
debian
ubuntu
zorin
```

### Other Special Variables

| Variable | Meaning |
|---|---|
| `$#` | Number of arguments passed |
| `$@` / `$*` | All arguments |
| `$_` | Last argument of the previous command (or script name at startup) |

Full list: `man bash`, section SPECIAL PARAMETERS.

---

## Functions in Scripts

Functions appear most often inside Bash scripts. Converting the `funed` file to a script `funed.sh` takes two additions:

```bash
#!/bin/bash
editors() {
    editor=emacs
    echo "The text editor of $USER is: $editor."
    echo "Bash is not a $1 shell."
}
editors tortoise
```

What changed:

- The shebang `#!/bin/bash` on line 1 tells the kernel which interpreter to use.
- The last line calls the function. Without it, the script would only define it and exit.

Make it executable and run:

```bash
$ chmod +x funed.sh
$ ./funed.sh
The text editor of user2 is: emacs.
Bash is not a tortoise shell.
```

---

## Function Inside an Alias

A function definition can be embedded in an alias, together with its invocation and self-cleanup:

```bash
$ alias great_editor='gr8_ed() { echo $1 is a great text editor; unset -f gr8_ed; }; gr8_ed'
```

How it works:

1. `gr8_ed() { ... }` defines the function.
2. `unset -f gr8_ed` inside the function removes it from the session after it runs.
3. `; gr8_ed` at the end calls the function.

Test:

```bash
$ great_editor emacs
emacs is a great text editor
```

`unset` flags:

| Flag | Effect |
|---|---|
| `unset -v NAME` | Remove a variable |
| `unset -f NAME` | Remove a function |
| `unset NAME` | Remove variable first; if none, remove function |

---

## Function Inside a Function

One function can call another. Example: add to `~/.bashrc` so that on login the user gets a greeting and a video folder check.

`check_vids` — lists mkv files and warns the user:

```bash
check_vids() {
    ls -1 ~/Video/*.mkv > /dev/null 2>&1
    if [ "$?" = "0" ]; then
        echo -e "Remember, you must not keep more than 5 video files in your Video folder.\nThanks."
    else
        echo -e "You do not have any videos in the Video folder. You can keep up to 5.\nThanks."
    fi
}
```

Step by step:

- `> /dev/null 2>&1` redirects both stdout and stderr to /dev/null (the bit-bucket).
- `[ "$?" = "0" ]` checks whether the previous command succeeded.

`editors` — greets the user and calls `check_vids`:

```bash
editors() {
    editor=emacs
    echo "Hi, $USER!"
    echo "$editor is more than a text editor!"
    check_vids
}

editors
```

The last line of the file calls `editors`, which in turn calls `check_vids`.

Test by switching to the user:

```bash
# su - user2
Hi, user2!
emacs is more than a text editor!
Remember, you must not keep more than 5 video files in your Video folder.
Thanks.
```

---

## Quick Reference — Additions

```bash
# Special variables
echo $?      # exit code of last command (0 = success)
echo $$      # PID of current shell
echo $!      # PID of last background process
echo $0      # script/shell name
echo $1      # first positional argument
echo $#      # number of arguments
echo $@      # all arguments

# unset
unset -v NAME   # remove variable
unset -f NAME   # remove function

# Alias with command chain
alias git_info='which git; git --version'

# Single-line function (semicolon required after last command)
greet() { greeting="Hello world!"; echo $greeting; }

# Shebang
#!/bin/bash

# Make script executable and run
chmod +x script.sh
./script.sh

# readonly function
readonly -f my_fun     # make function read-only
readonly -f            # list all read-only functions
```

---

## Exam Questions

1. Difference between single and double quotes in alias definition? → Single quotes defer variable expansion until the alias is invoked. Double quotes expand the value immediately when the alias is created.
2. What does `$?` hold right after a successful command? → `0`.
3. Difference between `$$` and `$!`? → `$$` is the PID of the current shell. `$!` is the PID of the last background process.
4. Why do positional parameters not work correctly in aliases? → Arguments always go to the end of the expanded alias string, regardless of where `$1` appears. Use functions for positional parameters.
5. Which two flags of `unset` specify the type of entity to remove? → `-v` for variables, `-f` for functions.
6. What must the first line of a Bash script contain for it to run with the right interpreter? → A shebang: `#!/bin/bash`.
7. How to prevent a function defined inside an alias from persisting in the session? → Add `unset -f funcname` as the last command inside the function, and call the function at the end of the alias definition.
8. What does `readonly -f` do? → Makes a function read-only; it cannot be redefined or removed with `unset -f`.
9. What does `$#` hold? → The number of arguments passed to the function or script.
10. What does `$@` expand to? → All positional arguments as a list.
11. What is `$_`? → The last argument of the previous command (or the script name at startup).

---

## Exercises

### Exercise 1 — Aliases vs functions capabilities

Fill in Yes or No.

| Capability | Aliases | Functions |
|---|:---:|:---:|
| Can use local variables | ? | ? |
| Can use environment variables | ? | ? |
| Can be escaped with `\` | ? | ? |
| Support recursion | ? | ? |
| Work well with positional parameters | ? | ? |

<details>
<summary>Answer</summary>

| Capability | Aliases | Functions |
|---|:---:|:---:|
| Can use local variables | Yes | Yes |
| Can use environment variables | Yes | Yes |
| Can be escaped with `\` | Yes | No |
| Support recursion | Yes | Yes |
| Work well with positional parameters | No | Yes |

Escaping with `\` applies to aliases because they can shadow built-in commands at parse time. Functions don't have that name-collision issue.

Positional parameters in aliases always append to the end of the expanded string — they don't substitute into `$1`, `$2`. Use functions when you need argument handling.

</details>

---

### Exercise 2 — List all aliases

<details>
<summary>Answer</summary>

```bash
alias
```

</details>

---

### Exercise 3 — Alias logg for ogg files

Create alias `logg` that lists all ogg files in `~/Music`, one per line.

<details>
<summary>Answer</summary>

```bash
alias logg='ls -1 ~/Music/*ogg'
```

The `-1` option (digit one) forces one filename per line. The glob `*ogg` matches any name ending in `ogg`.

</details>

---

### Exercise 4 — Call the alias

<details>
<summary>Answer</summary>

```bash
logg
```

</details>

---

### Exercise 5 — Extend logg to greet the user

Modify `logg` to first print the current username and a colon, then the list.

<details>
<summary>Answer</summary>

```bash
alias logg='echo $USER:; ls -1 ~/Music/*ogg'
```

The two commands are joined by a semicolon. Single quotes defer `$USER` expansion until invocation, so it picks up the current user's name.

</details>

---

### Exercise 6 — Call the updated alias

<details>
<summary>Answer</summary>

```bash
logg
```

</details>

---

### Exercise 7 — Verify logg is in the alias list

<details>
<summary>Answer</summary>

```bash
alias
```

</details>

---

### Exercise 8 — Remove the alias

<details>
<summary>Answer</summary>

```bash
unalias logg
```

</details>

---

### Exercise 9 — Match alias names to commands

Write correct definitions for these aliases.

| Name | Command |
|---|---|
| `b` | `bash` |
| `bash_info` | print bash path and version |
| `kernel_info` | print kernel release |
| `greet` | print `Hi, $USER` |
| `computer` | set `pc=slimbook`, print `My computer is a $pc` |

<details>
<summary>Answer</summary>

```bash
alias b=bash
alias bash_info='which bash; echo "$BASH_VERSION"'
alias kernel_info='uname -r'
alias greet='echo Hi, $USER'
alias computer='pc=slimbook; echo My computer is a $pc'
```

Single quotes are used so that `$USER`, `$BASH_VERSION`, and `$pc` are expanded at invocation time, not at definition time. For `b=bash`, no quotes are needed because the value has no spaces.

</details>

---

### Exercise 10 — Function my_fun in /etc/bash.bashrc

As root, write function `my_fun` that greets the user and prints their `PATH`. It should run on every login.

<details>
<summary>Answer</summary>

Variant A (parentheses syntax):

```bash
my_fun() {
    echo Hello, $USER!
    echo Your path is: $PATH
}
my_fun
```

Variant B (`function` keyword syntax):

```bash
function my_fun {
    echo Hello, $USER!
    echo Your path is: $PATH
}
my_fun
```

The function call on the last line is required; without it the function is only defined, not executed.

`/etc/bash.bashrc` is sourced for interactive non-login shells. For login sessions, either source it from `/etc/profile`, or add the code to both files.

</details>

---

### Exercise 11 — Switch to user2 to test

<details>
<summary>Answer</summary>

```bash
su - user2
```

The dash starts a login shell that runs the full set of startup files.

</details>

---

### Exercise 12 — Same function as a one-liner

<details>
<summary>Answer</summary>

Variant A:

```bash
my_fun() { echo "Hello, $USER!"; echo "Your path is: $PATH"; }
```

Variant B:

```bash
function my_fun { echo "Hello, $USER!"; echo "Your path is: $PATH"; }
```

A semicolon is required after the last command, before the closing brace.

</details>

---

### Exercise 13 — Call the function

<details>
<summary>Answer</summary>

```bash
my_fun
```

</details>

---

### Exercise 14 — Remove the function

<details>
<summary>Answer</summary>

```bash
unset -f my_fun
```

The `-f` flag tells `unset` to remove a function. Without it, `unset` first tries to remove a variable of the same name.

</details>

---

### Exercise 15 — Predict the output of special_vars2

Function:

```bash
special_vars2() {
    echo $#
    echo $_
    echo $1
    echo $4
    echo $6
    echo $7
    echo $_
    echo $@
    echo $?
}
```

Call: `special_vars2 crying cockles and mussels alive alive oh`

<details>
<summary>Answer</summary>

| Line | Output |
|---|---|
| `echo $#` | `7` |
| `echo $_` | `7` |
| `echo $1` | `crying` |
| `echo $4` | `mussels` |
| `echo $6` | `alive` |
| `echo $7` | `oh` |
| `echo $_` | `oh` |
| `echo $@` | `crying cockles and mussels alive alive oh` |
| `echo $?` | `0` |

Seven arguments were passed: `crying cockles and mussels alive alive oh`. So `$#=7`, `$1=crying`, `$4=mussels`, `$6=alive`, `$7=oh`.

`$_` holds the last argument of the previous command. After `echo $#` (which printed `7`), `$_` becomes `7`. After `echo $7` (which printed `oh`), `$_` becomes `oh`.

`$@` expands to all arguments. `$?` is `0` because `echo $@` succeeded.

</details>

---

### Exercise 16 — Parameterized check_music function

Write `check_music`, a startup-script function based on `check_vids`. Make it accept positional parameters for: folder name, file extension, maximum count, file type label.

<details>
<summary>Answer</summary>

```bash
check_music() {
    ls -1 ~/$1/*.$2 > /dev/null 2>&1
    if [ "$?" = "0" ]; then
        echo -e "Remember, you must not keep more than $3 $4 files in your $1 folder.\nThanks."
    else
        echo -e "You do not have any $4 files in the $1 folder. You can keep up to $3.\nThanks."
    fi
}
check_music Music ogg 7 music
```

Parameter mapping: `$1=Music` (folder), `$2=ogg` (extension), `$3=7` (limit), `$4=music` (label in the message).

`ls ... > /dev/null 2>&1` discards both stdout and stderr. The exit code via `$?` is checked against `0` to decide which message to print.

</details>

---

### Exercise 17 — Read-only functions

How do you make a function read-only? How do you list all read-only functions?

<details>
<summary>Answer</summary>

```bash
readonly -f my_fun    # make read-only
readonly -f           # list all read-only functions
```

A read-only function cannot be redefined or removed with `unset -f`. To undo it you must start a new shell session.

</details>

---

### Exercise 18 — fyi function with system summary

Write a `fyi` function for a startup script that prints: username, home directory, hostname, OS type, PATH, mail directory, mail check interval, shell nesting level, and changes PS1 to `<user>@<host-date>`.

<details>
<summary>Answer</summary>

```bash
fyi() {
    echo -e "For your Information:\n
    Username: $USER
    Home directory: $HOME
    Host: $HOSTNAME
    Operating System: $OSTYPE
    Path for executable files: $PATH
    Your mail directory is $MAIL and is searched every $MAILCHECK seconds.
    The current level of your shell is: $SHLVL"
    PS1="\u@\h-\d "
}
fyi
```

Environment variables used: `$USER`, `$HOME`, `$HOSTNAME`, `$OSTYPE`, `$PATH`, `$MAIL`, `$MAILCHECK`, `$SHLVL`.

In the `PS1` string: `\u` = username, `\h` = hostname (up to first dot), `\d` = date. Full list of prompt escape sequences: `man bash`, section PROMPTING.

The `-e` flag for `echo` enables interpretation of escape sequences such as `\n` (newline).

</details>

---

*LPIC-1 Study Notes | Topic 105: Shells and Shell Scripting*
