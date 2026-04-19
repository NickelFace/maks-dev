---
title: "LPIC-1 103.2 — Process Text Streams Using Filters"
date: 2026-04-16
description: "cat, head, tail, less, nl, od, cut, paste, sort, uniq, tr, sed, split, wc, zcat, md5sum, sha256sum. LPIC-1 exam topic 103.2."
tags: ["Linux", "LPIC-1", "Bash", "Text Processing", "sed", "awk"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-103-2-text-filters/"
---

> **Exam weight: 2** — LPIC-1 v5, Exam 101

## What you need to know

Send text files and streams through GNU textutils filter utilities and modify output using standard UNIX commands.

Utilities covered: `bzcat`, `cat`, `cut`, `head`, `less`, `md5sum`, `nl`, `od`, `paste`, `sed`, `sha256sum`, `sha512sum`, `sort`, `split`, `tail`, `tr`, `uniq`, `wc`, `xzcat`, `zcat`.

---

## Text streams and filters

In Linux almost everything is built around text. Config files, logs, command output, data tables, scripts — all text. Filters read text from standard input or a file, do something with it, and pass the result to standard output. That output can then be piped into the next filter with `|`.

A pipeline looks like this:

```bash
cat /etc/passwd | cut -d: -f1 | sort | uniq
```

Each command receives the output of the previous one as input. This is the Unix philosophy: small tools, each doing one thing well.

---

## Viewing and printing files

### cat

`cat` (concatenate) prints the contents of one or more files. With multiple filenames it prints them in sequence.

```bash
cat file.txt                 # print a file
cat file1.txt file2.txt      # concatenate two files
cat -n file.txt              # number all lines
cat -b file.txt              # number only non-empty lines
cat -A file.txt              # show special chars: $ at line ends, ^I for tabs
cat > newfile.txt            # write keyboard input to a file (Ctrl+D to finish)
```

### head and tail

`head` shows the beginning of a file, `tail` shows the end. Default is 10 lines.

```bash
head file.txt                # first 10 lines
head -n 20 file.txt          # first 20 lines
head -20 file.txt            # same, short syntax
head -c 100 file.txt         # first 100 bytes

tail file.txt                # last 10 lines
tail -n 5 file.txt           # last 5 lines
tail -f /var/log/syslog      # follow a file in real time
tail -n +5 file.txt          # output from line 5 to end of file
```

`tail -f` is especially useful for debugging: open a log in one terminal, run commands in another, and see what is happening immediately.

### less

`less` is a paginated file viewer. Unlike `more`, you can scroll backwards.

```bash
less file.txt
less +G file.txt             # open at the end of the file
```

Navigation inside `less`:
- `Space` / `f` — next page
- `b` — previous page
- `g` — beginning of file
- `G` — end of file
- `/pattern` — search forward
- `?pattern` — search backward
- `n` / `N` — next / previous search result
- `q` — quit

### nl

`nl` numbers the lines of a file. More flexible than `cat -n`.

```bash
nl file.txt                  # number only non-empty lines
nl -b a file.txt             # number all lines (including empty)
nl -b t file.txt             # number only non-empty (default)
nl -v 10 file.txt            # start numbering at 10
nl -i 5 file.txt             # increment by 5 (10, 15, 20...)
nl -w 3 -s ': ' file.txt     # field width 3, separator ': '
```

### od

`od` (octal dump) prints a file in octal, hexadecimal or other formats. Useful for inspecting binary files and hidden characters.

```bash
od file.txt                  # octal output (default)
od -c file.txt               # character output with escape sequences
od -x file.txt               # hexadecimal output
od -t x1 file.txt            # hex byte by byte
od -An -c file.txt           # no addresses, characters only
```

Example: `echo "AB" | od -c` shows `A`, `B`, `\n` — you can see the newline character.

---

## Working with columns and fields

### cut

`cut` extracts parts of lines by a delimiter character or by character position.

```bash
# Extract by delimiter (-d) and field number (-f)
cut -d: -f1 /etc/passwd          # first column (usernames)
cut -d: -f1,3 /etc/passwd        # first and third columns
cut -d: -f1-3 /etc/passwd        # columns 1 through 3
cut -d' ' -f2 file.txt           # second word on each line

# Extract by character position (-c)
cut -c1-10 file.txt              # characters 1 to 10
cut -c5 file.txt                 # only the 5th character of each line
cut -c1,5,10 file.txt            # characters 1, 5 and 10

# Extract by byte (-b)
cut -b1-5 file.txt               # bytes 1 to 5
```

Important: `cut` works with a single delimiter. For multiple consecutive spaces, `awk` is a better choice.

### paste

`paste` joins lines from multiple files horizontally, inserting a delimiter between them.

```bash
paste file1.txt file2.txt        # join as columns, tab-separated
paste -d, file1.txt file2.txt    # use comma as separator
paste -d: file1.txt file2.txt    # use colon as separator
paste -s file.txt                # transpose: file lines into one line
```

Example: if `names.txt` contains names and `ages.txt` contains ages, `paste -d, names.txt ages.txt` produces CSV.

---

## Sorting and uniqueness

### sort

`sort` sorts the lines of a text file or stream.

```bash
sort file.txt                    # alphabetical sort
sort -r file.txt                 # reverse order
sort -n file.txt                 # numeric sort
sort -rn file.txt                # numeric, reverse order
sort -k2 file.txt                # sort by second field
sort -k2 -t: file.txt            # by second field, delimiter ':'
sort -k2,2n file.txt             # by second field, numerically
sort -u file.txt                 # remove duplicates while sorting
sort -f file.txt                 # case-insensitive
sort -h file.txt                 # sort by human-readable sizes (1K, 2M)
```

The difference between `sort -n` and `sort`: without `-n`, the string "10" comes before "9" (lexicographically 1 < 9); with `-n`, correctly 9 < 10.

### uniq

`uniq` removes (or outputs) repeated lines. It only works on already-sorted input, so it almost always follows `sort`.

```bash
sort file.txt | uniq             # remove duplicates
sort file.txt | uniq -c          # show repeat count
sort file.txt | uniq -d          # show only duplicated lines
sort file.txt | uniq -u          # show only unique lines
sort file.txt | uniq -i          # case-insensitive
```

Example — count word frequency in a text:

```bash
tr ' ' '\n' < text.txt | sort | uniq -c | sort -rn | head
```

---

## Text transformation

### tr

`tr` (translate) replaces or deletes individual characters. It only works with streams; it does not accept files directly.

```bash
echo "Hello World" | tr 'a-z' 'A-Z'    # convert to uppercase
echo "Hello World" | tr 'A-Z' 'a-z'    # convert to lowercase
echo "Hello   World" | tr -s ' '       # squeeze repeated spaces into one
echo "abc123" | tr -d '0-9'            # delete all digits
echo "abc123" | tr -cd '0-9'           # keep only digits
cat file.txt | tr '\t' ' '             # replace tabs with spaces
cat file.txt | tr -s '\n'              # remove blank lines
```

`tr` supports character classes: `[:alpha:]`, `[:digit:]`, `[:space:]`, `[:upper:]`, `[:lower:]`.

```bash
echo "Hello World 123" | tr -d '[:digit:]'        # delete digits
echo "Hello World" | tr '[:lower:]' '[:upper:]'   # to uppercase
```

### sed

`sed` (stream editor) is a powerful stream editor. It applies commands to each line.

Most common use — text substitution (`s` = substitute):

```bash
sed 's/old/new/' file.txt           # replace first occurrence per line
sed 's/old/new/g' file.txt          # replace all occurrences (global)
sed 's/old/new/i' file.txt          # case-insensitive
sed 's/old/new/2' file.txt          # replace only the second occurrence
sed -i 's/old/new/g' file.txt       # edit file in-place
sed -i.bak 's/old/new/g' file.txt   # edit in-place, save .bak copy
```

Deleting lines:

```bash
sed '3d' file.txt                # delete line 3
sed '2,5d' file.txt              # delete lines 2–5
sed '/pattern/d' file.txt        # delete lines containing pattern
sed '/^#/d' file.txt             # delete comment lines
sed '/^$/d' file.txt             # delete blank lines
```

Printing selected lines:

```bash
sed -n '5p' file.txt             # print only line 5
sed -n '2,5p' file.txt           # print lines 2–5
sed -n '/pattern/p' file.txt     # print lines matching pattern
sed -n -e '1'p -e '10'p -e '$'p file.txt  # lines 1, 10 and last
```

In `sed`, `$` denotes the last line of the file. The trick `sed -n '$='` prints the last line number — i.e. the total line count, as an alternative to `wc -l`.

`sed` also accepts input via redirection:

```bash
sed -n /pattern/p < file.txt
```

---

## Splitting and counting

### split

`split` divides a file into parts. Convenient for large files.

```bash
split file.txt                       # split every 1000 lines, names xaa, xab...
split -l 500 file.txt                # split every 500 lines
split -b 1M file.txt                 # split every 1 megabyte
split -b 1M file.txt part_           # parts with prefix part_
split -l 100 -d file.txt chunk_      # numeric suffixes (chunk_00, chunk_01...)
```

To reassemble: `cat part_* > original.txt`

### wc

`wc` (word count) counts lines, words and bytes.

```bash
wc file.txt                     # lines, words, bytes
wc -l file.txt                  # lines only
wc -w file.txt                  # words only
wc -c file.txt                  # bytes only
wc -m file.txt                  # characters (multi-byte aware)
wc -L file.txt                  # length of the longest line
wc -l *.txt                     # for multiple files + total
```

Classic example: `ls | wc -l` — count files in a directory.

---

## Compressed files

These utilities let you read compressed files without explicit decompression. Convenient for viewing compressed logs.

### zcat, bzcat, xzcat

```bash
zcat file.gz                    # read a gzip file without decompressing
zcat file.gz | grep error       # filter a compressed file
bzcat file.bz2                  # read a bzip2 file
xzcat file.xz                   # read an xz file
```

These commands are equivalent to:

```bash
zcat file.gz      # same as: gunzip -c file.gz
bzcat file.bz2    # same as: bunzip2 -c file.bz2
xzcat file.xz     # same as: xz -dc file.xz
```

Note: `gzip file.txt` compresses the file to `file.txt.gz` and removes the original. That is why `zcat` is so convenient — no need to decompress, read, then recompress.

Combining with other filters:

```bash
zcat access.log.gz | tail -100 | grep "404"
bzcat large_data.bz2 | cut -d, -f3 | sort | uniq -c
```

---

## Checksums

Checksums are used to verify file integrity: download an ISO image, compute the checksum, compare it with the official one. If they match, the file is intact.

### md5sum, sha256sum, sha512sum

```bash
md5sum file.txt                  # compute MD5 hash
sha256sum file.txt               # compute SHA-256 hash
sha512sum file.txt               # compute SHA-512 hash

md5sum file1.txt file2.txt       # for multiple files

# Save checksums to a file
sha256sum *.txt > checksums.sha256

# Verify files against saved checksums
sha256sum -c checksums.sha256
```

MD5 is cryptographically outdated (collisions can be engineered), but it still appears for integrity checks. For serious use, prefer SHA-256 or SHA-512.

Output of `sha256sum`:

```
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  empty.txt
```

First part is the hash, second is the filename.

---

## Exam command reference

| Command | What it does |
|---------|-------------|
| `cat -n` | number all lines |
| `cat -b` | number only non-empty lines |
| `head -n 5` | first 5 lines |
| `tail -n 5` | last 5 lines |
| `tail -f` | follow a file in real time |
| `tail -n +N` | from line N to end of file |
| `wc -l` | line count |
| `wc -w` | word count |
| `wc -c` | byte count |
| `sort -n` | numeric sort |
| `sort -r` | reverse sort |
| `sort -k2 -t:` | by 2nd field, delimiter ':' |
| `sort -u` | sort and remove duplicates |
| `uniq -c` | lines with repeat count |
| `uniq -d` | only duplicated lines |
| `uniq -u` | only unique lines |
| `cut -d: -f1` | first field, delimiter ':' |
| `cut -c1-5` | characters 1–5 |
| `paste -d,` | join files with comma |
| `tr 'a-z' 'A-Z'` | to uppercase |
| `tr -d '0-9'` | delete digits |
| `tr -s ' '` | squeeze repeated spaces |
| `sed 's/a/b/g'` | replace all a with b |
| `sed -i` | edit file in-place |
| `sed -n '5p'` | print only line 5 |
| `sed '/pattern/d'` | delete lines matching pattern |
| `nl -b a` | number all lines |
| `od -c` | character dump |
| `split -l 100` | split every 100 lines |
| `split -b 1M` | split every 1 megabyte |
| `zcat file.gz` | read gzip without decompressing |
| `bzcat file.bz2` | read bzip2 without decompressing |
| `xzcat file.xz` | read xz without decompressing |
| `sha256sum -c` | verify files against checksums |

---

## Typical exam questions

**Which command prints the last 20 lines of a file?**
`tail -n 20 file.txt` or `tail -20 file.txt`

**How do you follow log updates in real time?**
`tail -f /var/log/syslog`

**How do you print only the first field from /etc/passwd (delimiter ':')?**
`cut -d: -f1 /etc/passwd`

**How do you count the number of lines in a file?**
`wc -l file.txt`

**How do you remove duplicates from a sorted file?**
`sort file.txt | uniq`

**What is the difference between `uniq -d` and `uniq -u`?**
`-d` prints only lines that appear more than once. `-u` prints only lines that appear exactly once.

**How do you convert text to uppercase?**
`tr 'a-z' 'A-Z'` or `tr '[:lower:]' '[:upper:]'`

**How do you read the contents of file.gz without decompressing it?**
`zcat file.gz`

**What is the difference between `sha256sum -c` and running `sha256sum` without flags?**
Without `-c` it computes a hash. With `-c` it reads a file of previously saved checksums and verifies them.

**How do you split a file into parts of 500 lines with the prefix "part_"?**
`split -l 500 file.txt part_`

---

## Exercises

### Guided Exercises

**Exercise 1 — Counting processors**

The file `/proc/cpuinfo` has a line like `processor : 0`, `processor : 1`, etc. for each processor.

**1.1. Count the number of processors using `grep` and `wc`.**

<details>
<summary>Answer</summary>

```bash
grep processor /proc/cpuinfo | wc -l
```

Or via `cat`:
```bash
cat /proc/cpuinfo | grep processor | wc -l
```

> Both give the same result. `grep file` is faster in scripts; the `cat | grep` pipeline is clearer for interactive use.

</details>

---

**1.2. Do the same with `sed` instead of `grep`.**

<details>
<summary>Answer</summary>

```bash
sed -n /processor/p /proc/cpuinfo | wc -l
```

The `-n` flag suppresses output of all lines. The `p` command prints only lines matching the pattern `processor`. Then `wc -l` counts them.

A variant entirely in `sed` without `wc`:
```bash
sed -n /processor/p /proc/cpuinfo | sed -n '$='
```

Here `'$='` means: find the last line (`$`) and print its number (`=`). The result is the same as `wc -l`.

</details>

---

**Exercise 2 — Exploring /etc/passwd**

**2.1. Which users have access to the Bash shell?**

<details>
<summary>Answer</summary>

```bash
grep ":/bin/bash$" /etc/passwd
```

To print only usernames:
```bash
grep ":/bin/bash$" /etc/passwd | cut -d: -f1
```

The `$` at the end of the regex anchors to the end of line, avoiding accidental matches in other fields.

</details>

---

**2.2. How many users in the system do not have shell access (service accounts)?**

<details>
<summary>Answer</summary>

```bash
grep -v ":/bin/bash$" /etc/passwd | wc -l
```

The `-v` flag inverts the match: lines where `:/bin/bash$` is not found are printed.

</details>

---

**2.3. How many unique users and groups exist in the system (from /etc/passwd only)?**

<details>
<summary>Answer</summary>

Unique UIDs (users):
```bash
cut -d: -f3 /etc/passwd | sort -u | wc -l
```

Unique GIDs (groups):
```bash
cut -d: -f4 /etc/passwd | sort -u | wc -l
```

> Plain `cut | wc -l` without `sort -u` may overcount if multiple users share a UID. `sort -u` removes duplicates before counting.

</details>

---

**2.4. Print only the first line, the last line and the tenth line of /etc/passwd.**

<details>
<summary>Answer</summary>

```bash
sed -n -e '1'p -e '10'p -e '$'p /etc/passwd
```

The `-n` flag suppresses all output. Each `-e` block is a separate instruction: `1p` — first line, `10p` — tenth line, `'$'p` — last line (`$` in sed means end of file).

</details>

---

**Exercise 3 — The mypasswd file**

Create a file `mypasswd` with the following content:

```
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
nvidia-persistenced:x:121:128:NVIDIA Persistence Daemon,,,:/nonexistent:/sbin/nologin
libvirt-qemu:x:64055:130:Libvirt Qemu,,,:/var/lib/libvirt:/usr/sbin/nologin
libvirt-dnsmasq:x:122:133:Libvirt Dnsmasq,,,:/var/lib/libvirt/dnsmasq:/usr/sbin/nologin
carol:x:1000:2000:Carol Smith,Finance,,,Main Office:/home/carol:/bin/bash
dave:x:1001:1000:Dave Edwards,Finance,,,Main Office:/home/dave:/bin/ksh
emma:x:1002:1000:Emma Jones,Finance,,,Main Office:/home/emma:/bin/bash
frank:x:1003:1000:Frank Cassidy,Finance,,,Main Office:/home/frank:/bin/bash
grace:x:1004:1000:Grace Kearns,Engineering,,,Main Office:/home/grace:/bin/ksh
henry:x:1005:1000:Henry Adams,Sales,,,Main Office:/home/henry:/bin/bash
john:x:1006:1000:John Chapel,Sales,,,Main Office:/home/john:/bin/bash
```

**3.1. Print all users from group 1000 using `sed`.**

<details>
<summary>Answer</summary>

```bash
sed -n /:1000:[A-Z]/p mypasswd
```

The naive `sed -n /1000/p mypasswd` also matches carol (whose UID is 1000). The regex `/:1000:[A-Z]/` requires an uppercase letter immediately after `1000:`, which marks the GECOS field (full name) — uniquely identifying the GID field.

</details>

---

**3.2. Print only the full names of users in group 1000.**

<details>
<summary>Answer</summary>

```bash
sed -n /:1000:[A-Z]/p mypasswd | cut -d: -f5 | cut -d, -f1
```

The fifth field contains `Dave Edwards,Finance,,,Main Office`, so a second `cut` on `,` extracts just the name.

Result:
```
Dave Edwards
Emma Jones
Frank Cassidy
Grace Kearns
Henry Adams
John Chapel
```

</details>

---

### Explorational Exercises

**Exercise 1 — Prize draw**

Pick a random Main Office employee for a prize draw using `sed`, `cut` and `sort -R`.

<details>
<summary>Answer</summary>

```bash
sed -n /'Main Office'/p mypasswd | cut -d: -f5 | cut -d, -f1 | sort -R | head -1
```

Breakdown:
- `sed -n /'Main Office'/p mypasswd` — lines containing "Main Office"
- `cut -d: -f5` — fifth field (full name + department)
- `cut -d, -f1` — only the name before the first comma
- `sort -R` — random shuffle (different order each run)
- `head -1` — take only the first name

</details>

---

**Exercise 2 — Count by department**

How many people work in Finance, Engineering and Sales?

<details>
<summary>Answer</summary>

```bash
sed -n /'Main Office'/p mypasswd | cut -d, -f2 | uniq -c
```

Result:
```
4 Finance
1 Engineering
2 Sales
```

> `uniq` only works on adjacent lines. If the data is not ordered, add `sort` before `uniq`. Here the lines are already grouped by department, so `sort` is not needed.

</details>

---

**Exercise 3 — Create a CSV file**

Prepare `names.csv` for import into LibreOffice in the format:

```
First Name,Last Name,Position
Carol,Smith,Finance
...
John,Chapel,Sales
```

<details>
<summary>Answer</summary>

Build three separate files first:
```bash
sed -n /'Main Office'/p mypasswd | cut -d: -f5 | cut -d" " -f1 > firstname
sed -n /'Main Office'/p mypasswd | cut -d: -f5 | cut -d" " -f2 | cut -d, -f1 > lastname
sed -n /'Main Office'/p mypasswd | cut -d: -f5 | cut -d, -f2 > department
```

Join with `paste` and replace tabs with commas:
```bash
paste firstname lastname department | tr '\t' , > names.csv
```

Or shorter using `paste -d`:
```bash
paste -d, firstname lastname department > names.csv
```

Most compact version without intermediate files:
```bash
sed -n /'Main Office'/p mypasswd | cut -d: -f5 | cut -d, -f1,2 | tr ' ' , > names.csv
```

</details>

---

**Exercise 4 — Integrity check with md5sum**

Verify that `names.csv` was not modified during transfer.

<details>
<summary>Answer</summary>

Compute the hash:
```bash
md5sum names.csv
# 61f0251fcab61d9575b1d0cbf0195e25  names.csv
```

If the file is modified, the hash changes completely:
```bash
sed -i.backup s/Jones/James/ names.csv
md5sum names.csv
# f44a0d68cb480466099021bf6d6d2e65  names.csv
```

It is best to send the file and its checksum over different channels. Linux distributions use the same principle: they publish `SHA256SUMS` or `MD5SUMS` files alongside ISO images. For real security use SHA-256 or SHA-512 — MD5 is cryptographically broken.

</details>

---

**Exercise 5 — Split a book into parts**

Split a text file into parts of 100 lines to read 100 lines per day.

<details>
<summary>Answer</summary>

Download a book from Project Gutenberg:
```bash
wget https://www.gutenberg.org/files/50461/50461-0.txt
```

Split into 100-line parts with numeric suffixes:
```bash
split -l 100 -d 50461-0.txt melville
```

Flags:
- `-l 100` — 100 lines per file
- `-d` — numeric suffixes instead of alphabetic (melville00, melville01...)

Check the line count of a part:
```bash
nl melville00 | tail -1
```

</details>

---

**Exercise 6 — ls -l, tr and cut**

Display file information from `/etc` in various ways, combining `ls -l`, `tr` and `cut`.

<details>
<summary>Answer</summary>

The problem with `ls -l`: multiple spaces between fields break `cut`. Squeeze them with `tr -s ' '`:

```bash
ls -l /etc | tr -s ' '
```

Only filenames (9th field):
```bash
ls -l /etc | tr -s ' ' | cut -d" " -f9
```

Filename and owner (fields 9 and 3):
```bash
ls -l /etc | tr -s ' ' | cut -d" " -f9,3
```

Only directories with their owners:
```bash
ls -l /etc | grep ^d | tr -s ' ' | cut -d" " -f9,3
```

`grep ^d` keeps only lines starting with `d` (directory indicator in `ls -l`).

</details>

---

**Exercise 7 — Monitor a log and plug in a USB drive**

Use `tail -f` to monitor `/var/log/syslog` while inserting a USB drive. Find the device model, manufacturer and storage capacity.

<details>
<summary>Answer</summary>

```bash
tail -f /var/log/syslog | grep -i 'product\:\|blocks\|manufacturer'
```

Example output:
```
Nov  8 06:01:35 hostname kernel: usb 1-4.3: Product: Cruzer Blade
Nov  8 06:01:35 hostname kernel: usb 1-4.3: Manufacturer: SanDisk
Nov  8 06:01:37 hostname kernel: sd 2:0:0:0: [sdc] 61056064 512-byte logical blocks: (31.3 GB/29.1 GiB)
```

The `-i` flag makes `grep` case-insensitive. The `|` inside quotes acts as a logical OR: match lines containing `product:`, `blocks` or `manufacturer`. The backslash escapes `|` from shell interpretation.

</details>

---

## Related topics

- [103.1 Work on the Command Line](/posts/lpic1-103-1-work-on-command-line/) — shell, I/O redirection and pipelines
- 103.3 Perform Basic File Management — file management
- 103.4 Use Streams, Pipes and Redirects — streams and redirections
- 103.7 Search Text Files Using Regular Expressions — text editors (vi, nano)

---

*LPIC-1 Study Notes | Topic 103: GNU and Unix Commands*
