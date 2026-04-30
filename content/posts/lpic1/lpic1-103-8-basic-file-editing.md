---
title: "LPIC-1 103.8 — Basic File Editing"
date: 2026-04-16
description: "vi modes, navigation, insert, delete, copy-paste, search, macros, EDITOR variable, nano, Emacs. LPIC-1 exam topic 103.8."
tags: ["Linux", "LPIC-1", "vi", "vim", "nano", "editor", "text editing"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-103-8-basic-file-editing/"
page_lang: "en"
---

## What You Need to Know

- Navigate through a document in vi.
- Understand and use vi modes.
- Insert, edit, delete, copy, and search text in vi.
- Know about the existence of Emacs, nano, and vim.
- Configure the default editor via the `EDITOR` variable.

---

## vi Modes

vi operates in several modes. The mode determines what happens when you press keys.

### Normal Mode

Normal mode (also called command mode) is the default when a file is opened. Keys perform navigation and editing commands rather than inserting text. Press `Esc` from any mode to return here.

### Insert Mode

In insert mode text is typed normally, character by character. Enter it with commands like `i`, `a`, `o`, and others. Exit with `Esc`.

### Colon Command Mode

This mode is entered by pressing `:` in normal mode. Here you type commands for saving, quitting, search-and-replace, and running shell commands. Return to normal mode by pressing `Enter` without a command, or run `:visual`.

---

## Navigation in Normal Mode

Basic cursor movement:

| Key | Action |
|-----|--------|
| `h` | left |
| `j` | down |
| `k` | up |
| `l` | right |
| `0` | beginning of line |
| `$` | end of line |
| `w` / `W` | next word / next WORD (with punctuation) |
| `e` / `E` | end of current word |
| `b` | back one word |
| `(` / `)` | beginning / end of sentence |
| `{` / `}` | beginning / end of paragraph |
| `1G` or `gg` | beginning of file |
| `G` | end of file |
| `:N` | go to line N |

To jump to the end of the file on open, use `vi + filename`. `+` without a number means the last line. For a specific line N write `vi +N filename`.

---

## Inserting Text

All commands below switch vi from normal mode to insert mode:

| Key | Action |
|-----|--------|
| `i` | insert before cursor |
| `I` | insert at the beginning of the line |
| `a` | append after cursor |
| `A` | append at the end of the line |
| `o` | open a new line below and enter insert mode |
| `O` | open a new line above and enter insert mode |
| `s` | delete character under cursor and enter insert mode |
| `S` | delete the entire line and enter insert mode |

---

## Deleting and Changing

| Key | Action |
|-----|--------|
| `x` | delete character under cursor |
| `dd` | delete line |
| `dw` | delete word |
| `d$` or `D` | delete to end of line |
| `dt.` | delete from cursor to the `.` character (not including it) |
| `c` | change selection: delete and enter insert mode |
| `r` | replace one character under cursor |
| `u` | undo last action |
| `Ctrl-R` | redo undone action |

The `d` command accepts a motion as its argument. `d5w` deletes the current word and the next 4. `dt.` deletes from the cursor up to the nearest dot, not including the dot itself.

---

## Copying and Pasting

| Key | Action |
|-----|--------|
| `yy` | copy line |
| `y` | copy selection |
| `yw` | copy word |
| `p` | paste after cursor |
| `P` | paste before cursor |

---

## Searching

| Command | Action |
|---------|--------|
| `/pattern` | search forward |
| `?pattern` | search backward |
| `n` | next match |
| `N` | previous match |

After typing the pattern press `Enter` to start the search. `n` and `N` continue the search forward and backward.

---

## Numeric Prefixes

A number can be placed before most normal-mode commands. The command executes exactly that many times. Examples:

- `3yy` — copy the current line and the next 2.
- `2dd` — delete the current line and the next one.
- `5j` — move 5 lines down.
- `d5w` — delete the current word and the next 4.
- `3<` — shift the selection 3 positions to the left.

The number is typed directly before the command, without a space.

---

## Colon Commands

| Command | Action |
|---------|--------|
| `:w` | save file |
| `:w filename` | save as filename |
| `:w!` | force save |
| `:q` | quit |
| `:q!` | quit without saving |
| `:wq` | save and quit |
| `:x`, `:exit`, or `:e` | save and quit (only if changes were made) |
| `ZZ` | save and quit (normal mode, no `:`) |
| `ZQ` | quit without saving (normal mode) |
| `:!cmd` | execute a shell command |
| `:s/REGEX/TEXT/g` | replace REGEX with TEXT in the current line |
| `:visual` | return to normal mode |

`ZZ` and `ZQ` are typed in normal mode as uppercase letters, without a colon.

---

## Registers and Macros

vi stores copied text in registers. A register is specified by `"` followed by its name. For example, `"ly` copies the selection into register `l`, and `"lp` pastes the contents of register `l`.

A macro is recorded with `q` followed by a register letter. Recording continues until `q` is pressed again. The macro is then played back with `@` and the register name. Example: `qa` starts recording into register `a`, the second `q` ends recording, and `@a` replays the entire recorded sequence.

Marks let you bookmark positions in the text. `m` followed by a letter creates a mark at the current cursor position; `'` followed by the same letter jumps back to it.

---

## The EDITOR Variable

Bash uses the `VISUAL` and `EDITOR` variables to determine the default editor. This editor opens when you run `crontab -e` or write a git commit message, for example.

Set the editor for the current session:

```bash
export EDITOR=nano
```

For the setting to persist between sessions, add this line to `~/.bash_profile`. If both variables are set, `VISUAL` takes priority over `EDITOR`.

---

## Alternative Editors

### vim

vim (Vi IMproved) is an enhanced version of vi. On most distributions the `vi` command actually launches vim. Differences include syntax highlighting, plugin support, split-screen editing, and improved search. The built-in interactive tutorial `vimtutor` is a great way to get started.

### nano

GNU nano suits those who don't want to deal with vi's modes. Text is typed directly without mode switching. Commands use `Ctrl` and Meta (Alt or Command depending on the system), and a list of them is always displayed at the bottom of the screen. Nano supports syntax highlighting, search-and-replace, auto-indent, and line numbering.

| Key | Action |
|-----|--------|
| `Ctrl-6` or `Meta-A` | start selection |
| `Meta-6` | copy selection |
| `Ctrl-K` | cut selection |
| `Ctrl-U` | paste |
| `Meta-U` | undo |
| `Meta-E` | redo |
| `Ctrl-\` | replace text |
| `Ctrl-T` | spell check |

### Emacs

Emacs is a powerful editor with command shortcuts through `Ctrl` and `Meta`. Text is typed directly, like nano. Emacs can also compile code, handle email and RSS feeds, making it a full development environment. For the LPIC-1 exam it's enough to know it exists.

---

## Quick Reference

```
# Opening a file
vi filename           open file
vi + filename         open and go to the last line
vi +N filename        open and go to line N

# Saving and quitting
ZZ                    save and quit (normal mode)
ZQ                    quit without saving (normal mode)
:w                    save
:w filename           save under a different name
:w!                   force save
:wq                   save and quit
:q!                   quit without saving

# Navigation
h j k l               left / down / up / right
0  $                  beginning / end of line
gg  G                 beginning / end of file
/pattern              search forward
?pattern              search backward
n  N                  next / previous match

# Insert mode
i  a  o               insert / append / new line below
I  A  O               beginning of line / end of line / new line above

# Deletion
x                     character under cursor
dd                    line
2dd                   two lines
dw  d5w               word / five words
dt.                   up to character .

# Copy and paste
yy  3yy               copy line / three lines
p  P                  paste after / before cursor

# Default editor
export EDITOR=vi
export VISUAL=nano
```

---

## Exam Tips

**How do you delete the current line and the next one?**
`2dd`

**How do you save a file and exit vi? (two ways)**
`:wq` in colon command mode or `ZZ` in normal mode.

**How do you save the file under a new name?**
`:w filea.txt`

**How do you repeat a command N times?**
Type the number directly before the command: `4l`, `2yj`, `3dd`.

**How do you set nano as the default editor?**
`export EDITOR=nano`; for a permanent effect add it to `~/.bash_profile`.

**What does `vi + ~/.bash_profile` do?**
Opens the file and immediately places the cursor on the last line.

---

## Exercises

### Guided Exercises

#### Exercise 1

**vi is often used to edit configuration files and source code where indentation helps distinguish blocks of text. Indentation can be shifted left with `<` and right with `>`. Which keys must be pressed in normal mode to shift the current selection three positions to the left?**

<details><summary>Answer</summary>

`3<`

</details>

---

#### Exercise 2

**An entire line can be selected with `V` in normal mode, but the newline character is included in the selection. Which keys must be pressed in normal mode to select the line from the first character to the end, without including the newline?**

<details><summary>Answer</summary>

`0v$h`

`0` moves to the beginning of the line, `v` starts character-wise visual selection, `$` moves to the end of the line, `h` steps back one character and excludes the newline from the selection.

</details>

---

#### Exercise 3

**How do you launch vi from the command line to open `~/.bash_profile` and immediately jump to the last line?**

<details><summary>Answer</summary>

```bash
vi + ~/.bash_profile
```

The `+` flag without a number means "go to the last line". For a specific line N use `vi +N filename`.

</details>

---

#### Exercise 4

**Which keys must be pressed in vi normal mode to delete characters from the current cursor position up to the nearest dot, not including the dot itself?**

<details><summary>Answer</summary>

`dt.`

`d` begins deletion, `t` means "up to the next occurrence of a character" (not including it), `.` specifies the target character.

</details>

---

### Explorational Exercises

#### Exercise 1

**vim can select rectangular blocks of arbitrary width, not just whole lines. Pressing `Ctrl+V` in normal mode starts block-wise visual selection, which expands with cursor movements. How do you select and delete a block starting at the first character of the current line, 8 columns wide and 5 lines tall?**

<details><summary>Answer</summary>

`0`, then `Ctrl-V`, then `8l5jd`

`0` moves to the beginning of the line, `Ctrl-V` starts block-wise selection, `8l` extends the right boundary 8 characters to the right, `5j` extends the bottom boundary 5 lines down, `d` deletes the selected block.

</details>

---

#### Exercise 2

**A vi session was interrupted by an unexpected power failure. When the file is reopened, vi offers to recover a swap file (an automatic backup). What should you do to discard the swap file?**

<details><summary>Answer</summary>

Press `d` in response to vi's prompt.

</details>

---

#### Exercise 3

**In a vim session, a line was copied into register `l`. What key sequence records a macro in register `a` that inserts the contents of register `l` before the current line?**

<details><summary>Answer</summary>

`qa"lPq`

`q` starts recording a macro, `a` binds it to register `a`, `"l` specifies register `l` as the paste source, `P` inserts the text before the current line, the second `q` ends recording. To play back the macro press `@a`.

</details>

---

*Topic 103: GNU and Unix Commands*
