---
title: "LPIC-1 103.3 — Basic File Management"
date: 2026-04-16
description: "Copying, moving, deleting files, globbing, find, tar, cpio, dd, and compression. LPIC-1 exam topic 103.3."
tags: ["Linux", "LPIC-1", "files", "find", "tar", "cp", "mv", "rm"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-103-3-basic-file-management/"
page_lang: "en"
---

## What You Need to Know

- Copy, move, and delete files and directories individually.
- Recursively copy and delete multiple files and directories.
- Use simple and extended wildcard patterns in commands.
- Search for files using `find` by type, size, and time.
- Work with `tar`, `cpio`, and `dd`.

---

## Copying Files and Directories

### cp

`cp` copies files and directories.

```bash
cp source dest          # copy a file
cp file1 file2 dir/     # copy multiple files into a directory
cp -r dir1/ dir2/       # recursively copy a directory
cp -p file dest         # preserve permissions, owner, timestamps
cp -a dir1/ dir2/       # archive mode: recursive + preserve all attributes (= -dR --preserve=all)
cp -i file dest         # prompt before overwriting
cp -u file dest         # copy only if source is newer than dest
cp -v file dest         # verbose output
cp -l file dest         # create a hard link instead of copying
cp -s file dest         # create a symbolic link instead of copying
```

`-r` (or `-R`) copies directories recursively. Without it `cp` will error on a directory.

`-a` combines `-dR --preserve=all`: preserves symbolic links, permissions, timestamps, and owner. Use it for full backups.

---

## Moving and Renaming

### mv

`mv` moves files and directories, and renames them.

```bash
mv file newname         # rename a file
mv file dir/            # move a file into a directory
mv dir1/ dir2/          # move or rename a directory
mv -i file dest         # prompt before overwriting
mv -u file dest         # move only if source is newer than dest
mv -v file dest         # verbose output
```

`mv` is atomic within a single filesystem: the file simply gets a new name in the directory tree. Across different filesystems, `mv` copies the file and removes the original.

---

## Removing Files and Directories

### rm

```bash
rm file                 # remove a file
rm file1 file2          # remove multiple files
rm -r dir/              # recursively remove a directory and its contents
rm -f file              # force remove without prompt (ignores non-existent files)
rm -rf dir/             # recursive and forced (be careful!)
rm -i file              # prompt for each file
rm -v file              # verbose output
```

### rmdir

`rmdir` removes only empty directories.

```bash
rmdir dir/              # remove an empty directory
rmdir -p a/b/c          # remove a chain of empty directories
```

If a directory contains even one file, `rmdir` will error. For non-empty directories use `rm -r`.

---

## Creating Files and Directories

### mkdir

```bash
mkdir dir               # create a directory
mkdir -p a/b/c          # create the full directory chain (-p doesn't error on existing ones)
mkdir -m 755 dir        # create a directory with specified permissions
```

### touch

`touch` creates an empty file or updates the timestamps of an existing one.

```bash
touch file              # create a file or update atime/mtime to current time
touch -t 202312311230 file  # set a specific time (YYYYMMDDhhmm)
touch -d "2023-12-31" file  # set a date in readable format
touch -a file           # update only atime
touch -m file           # update only mtime
```

---

## Listing Directory Contents

### ls

```bash
ls                      # list files in current directory
ls -l                   # long listing
ls -a                   # show hidden files (starting with .)
ls -la                  # long listing with hidden files
ls -lh                  # sizes in human-readable format (K, M, G)
ls -lt                  # sort by modification time
ls -lr                  # reverse sort order
ls -R                   # recursive listing
ls -i                   # show inode numbers
ls -d dir/              # show info about the directory itself, not its contents
```

---

## Globbing and Patterns

File globbing is the shell expanding patterns before passing arguments to a command.

### Basic Wildcards

| Character | Meaning |
|-----------|---------|
| `*` | any sequence of characters (including empty) |
| `?` | exactly one character |
| `[abc]` | one character from the set |
| `[a-z]` | one character from the range |
| `[!abc]` | one character not in the set |
| `[^abc]` | same (shell-dependent) |

### Examples

```bash
ls *.txt            # all files with .txt extension
ls file?.log        # file1.log, file2.log, but not file10.log
ls report[0-9].pdf  # report0.pdf ... report9.pdf
ls [!.]* 2>/dev/null # files not starting with a dot (like ls without -a)
cp *.conf /etc/bak/ # copy all .conf files
rm temp*            # remove everything starting with temp
```

### Extended Globbing (extglob)

In bash, extended globbing is enabled with `shopt -s extglob`:

| Pattern | Meaning |
|---------|---------|
| `?(pattern)` | zero or one match |
| `*(pattern)` | zero or more matches |
| `+(pattern)` | one or more matches |
| `@(pattern)` | exactly one match |
| `!(pattern)` | anything except the match |

```bash
shopt -s extglob
ls !(*.bak)         # all files except .bak
```

---

## Searching with find

`find` searches the directory hierarchy using various criteria.

### Syntax

```
find [path] [criteria] [action]
```

### By Name and Type

```bash
find / -name "*.log"          # by name (case-sensitive)
find / -iname "*.log"         # by name (case-insensitive)
find / -type f                # regular files only
find / -type d                # directories only
find / -type l                # symbolic links only
find / -name "*.conf" -type f # name + type
```

### By Size

```bash
find / -size +100M            # larger than 100 megabytes
find / -size -10k             # smaller than 10 kilobytes
find / -size 1G               # exactly 1 gigabyte
find / -size 100b             # exactly 100 bytes
find . -size 0b               # empty files (0 bytes)
find . -empty                 # empty files and directories (shorter)
```

Size suffixes: `c` (bytes), `k` (kilobytes), `M` (megabytes), `G` (gigabytes).

### By Time

```bash
find / -mtime -7              # modified less than 7 days ago
find / -mtime +30             # modified more than 30 days ago
find / -atime -1              # accessed less than 1 day ago
find / -ctime -2              # status changed less than 2 days ago
find / -mmin -60              # modified less than 60 minutes ago
find / -newer /etc/passwd     # newer than the specified file
```

### By Permissions and Owner

```bash
find / -perm 755              # exact permissions 755
find / -perm -644             # at least permissions 644 (all specified bits set)
find / -perm /111             # at least one of the specified bits set
find / -user username         # files owned by user
find / -group groupname       # files owned by group
find / -nouser                # files with no owner in the system
```

### Actions

```bash
find / -name "*.tmp" -delete                    # delete found files
find / -name "*.sh" -exec chmod +x {} \;        # run a command for each file
find / -name "*.log" -exec cp {} /backup/ \;    # copy each file
find / -name "core" -exec rm -f {} +            # + groups files (more efficient than \;)
find / -name "*.txt" | xargs grep "pattern"     # pass results to xargs
```

`{}` is replaced by the found filename. `\;` terminates `-exec`. `+` at the end groups arguments like `xargs` and is faster.

### Logical Operators

```bash
find / -name "*.log" -and -size +10M    # both conditions (AND is default)
find / -name "*.bak" -or -name "*.tmp"  # either condition
find / -not -name "*.conf"              # negation
find / \( -name "a" -or -name "b" \)    # grouping
```

---

## Identifying File Types

### file

`file` determines a file's type by examining its content, not its extension.

```bash
file document.pdf       # PDF document, version 1.4
file script.sh          # POSIX shell script
file /bin/ls            # ELF 64-bit LSB executable
file image.jpg          # JPEG image data
file archive.tar.gz     # gzip compressed data
```

`file` reads signatures from `/etc/magic` and `/usr/share/misc/magic`.

---

## Archiving: tar and cpio

### tar

`tar` (Tape ARchive) creates archives from files and directories.

#### Creating an Archive

```bash
tar -cf archive.tar dir/        # create archive
tar -czf archive.tar.gz dir/    # create + compress with gzip
tar -cjf archive.tar.bz2 dir/   # create + compress with bzip2
tar -cJf archive.tar.xz dir/    # create + compress with xz
tar -cvf archive.tar dir/       # create with verbose output
```

#### Viewing Contents

```bash
tar -tf archive.tar             # list files in archive
tar -tvf archive.tar            # detailed listing
```

#### Extracting

```bash
tar -xf archive.tar             # extract to current directory
tar -xzf archive.tar.gz         # extract .tar.gz
tar -xjf archive.tar.bz2        # extract .tar.bz2
tar -xf archive.tar -C /dest/   # extract to specified directory
tar -xf archive.tar file.txt    # extract only one file
```

#### tar Flags (memorize)

| Flag | Meaning |
|------|---------|
| `-c` | create |
| `-x` | extract |
| `-t` | list |
| `-f` | file (archive name) |
| `-z` | gzip |
| `-j` | bzip2 |
| `-J` | xz |
| `-v` | verbose |
| `-C` | change directory (extraction target) |
| `-p` | preserve permissions |
| `--exclude` | exclude file/directory |

`-f` is almost always required. The filename follows immediately after `-f`.

### cpio

`cpio` (copy in/out) works with a file list from stdin.

```bash
# Create archive
find . -name "*.conf" | cpio -ov > backup.cpio

# View contents
cpio -tv < backup.cpio

# Extract
cpio -idv < backup.cpio

# Extract to another directory
(mkdir -p /dest && cd /dest && cpio -idv < /path/backup.cpio)
```

`cpio` modes:
- `-o` (out) — create archive
- `-i` (in) — extract
- `-p` (pass-through) — copy without creating an archive

---

## Copying Data: dd

`dd` copies data byte by byte. Works with block devices and files.

```bash
# Create a disk image
dd if=/dev/sda of=/backup/disk.img

# Restore an image
dd if=/backup/disk.img of=/dev/sda

# Create a partition image
dd if=/dev/sda1 of=partition.img

# Create a file of a given size (filled with zeros)
dd if=/dev/zero of=test.img bs=1M count=100

# Create a file with random data
dd if=/dev/urandom of=random.bin bs=1M count=10

# Create a bootable USB
dd if=linux.iso of=/dev/sdb bs=4M status=progress

# Convert case
dd if=input.txt of=output.txt conv=ucase
```

`dd` parameters:

| Parameter | Meaning |
|-----------|---------|
| `if=` | input file (source) |
| `of=` | output file (destination) |
| `bs=` | block size |
| `count=` | number of blocks |
| `skip=` | skip blocks at start of input |
| `seek=` | skip blocks at start of output |
| `conv=` | conversion (ucase, lcase, notrunc, sync…) |
| `status=progress` | show progress |

---

## File Compression

### gzip and gunzip

`gzip` compresses files, replacing the original with `.gz`.

```bash
gzip file.txt           # creates file.txt.gz, removes file.txt
gzip -k file.txt        # keep the original file
gzip -d file.txt.gz     # decompress (= gunzip)
gzip -1 file.txt        # fast compression (weak)
gzip -9 file.txt        # maximum compression (slow)
gzip -l file.txt.gz     # show archive info
gunzip file.txt.gz      # decompress
zcat file.txt.gz        # read without decompressing
```

### bzip2 and bunzip2

`bzip2` gives better compression than gzip but is slower.

```bash
bzip2 file.txt          # creates file.txt.bz2, removes file.txt
bzip2 -k file.txt       # keep the original file
bzip2 -d file.txt.bz2   # decompress (= bunzip2)
bzip2 -1 file.txt       # fast compression
bzip2 -9 file.txt       # maximum compression
bunzip2 file.txt.bz2    # decompress
bzcat file.txt.bz2      # read without decompressing
```

### xz

`xz` provides the best compression of the three, but is the slowest.

```bash
xz file.txt             # creates file.txt.xz
xz -d file.txt.xz       # decompress
xz -k file.txt          # keep original
xzcat file.txt.xz       # read without decompressing
```

---

## Exam Quick Reference

```bash
# cp
cp -r src/ dst/                          # recursive copy
cp -a src/ dst/                          # archive mode (preserves everything)
cp -i *.txt /backup/                     # copy with prompt

# find — most common patterns
find /home -name "*.txt" -type f
find /var -size +50M -mtime -7
find / -perm -4000 -type f               # find SUID files
find . -name "*.tmp" -delete
find . -name "*.sh" -exec chmod +x {} \;

# tar — remember order: operation, then modifiers, then -f
tar -czf backup.tar.gz /home/user/
tar -xzf backup.tar.gz -C /restore/
tar -tf archive.tar

# dd — disk copying
dd if=/dev/sda of=disk.img bs=4M status=progress

# gzip/bzip2
gzip -k largefile.log        # compress, keeping original
tar -czf backup.tar.gz dir/  # most often used through tar
```

---

## Exam Tips

**Recursively remove a directory:** `rm -rf dir/` (not `rmdir`).

**Preserve permissions when copying:** `cp -a` or `cp -p`.

**Find files larger than 1 GB:** `find / -size +1G`.

**Find files modified in the last 2 days:** `find / -mtime -2`.

**Create an archive compressed with bzip2:** `tar -cjf arch.tar.bz2 dir/`.

**Extract .tar.gz to /tmp:** `tar -xzf arch.tar.gz -C /tmp/`.

**View archive contents without extracting:** `tar -tf arch.tar`.

**Difference between mtime, atime, ctime:**
- `mtime` — time of last file content modification.
- `atime` — time of last file access.
- `ctime` — time of last metadata change (permissions, owner).

**What `touch` does to an existing file:** updates its timestamps to the current time.

**Difference between `cpio` and `tar`:** `cpio` reads a file list from stdin; `tar` takes filenames directly.

**`dd conv=notrunc`:** do not truncate the output file when writing.

---

## Exercises

### Guided Exercises

#### 1. Analyzing ls -lh Output

Given the output of `ls -lh`:

```
total 60K
drwxr-xr-x  2  frank  frank  4.0K  Apr 1  2018  Desktop
drwxr-xr-x  2  frank  frank  4.0K  Apr 1  2018  Documents
-rw-r--r--  1  frank  frank  21    Sep 7  12:59  emp_name
-rw-r--r--  1  frank  frank  20    Sep 7  13:03  emp_salary
-rw-r--r--  1  frank  frank  8.8K  Apr 1  2018  examples.desktop
-rw-r--r--  1  frank  frank  10    Sep 1  2018  file1
```

**What does the `d` at the start of a line mean?**

<details><summary>Answer</summary>

`d` marks a directory. A regular file uses `-`, a special character device uses `c`.

</details>

**Why are sizes displayed in human-readable format?**

<details><summary>Answer</summary>

Because of the `-h` flag. Without it sizes would be in bytes.

</details>

**How would the output of plain `ls` differ?**

<details><summary>Answer</summary>

Only filenames would be shown — no permissions, owner, size, or date.

</details>

---

#### 2. Copying and Moving

Given:

```bash
cp /home/frank/emp_name /home/frank/backup
```

**What happens to `emp_name` on success?**

<details><summary>Answer</summary>

`emp_name` is copied into the `backup` directory. The original file stays in place.

</details>

**If `emp_name` were a directory, which flag would `cp` need?**

<details><summary>Answer</summary>

`-r` (recursive). Without it `cp` refuses to copy a directory with the message `omitting directory`.

</details>

**If `cp` were replaced with `mv`, what changes?**

<details><summary>Answer</summary>

`emp_name` would be moved into `backup`. It would no longer exist in frank's home directory.

</details>

---

#### 3. Removing with a Wildcard

Given a directory with:

```
file1.txt  file2.txt  file3.txt  file4.txt
```

**Which wildcard removes everything with one command?**

<details><summary>Answer</summary>

The asterisk `*`:

```bash
rm *
```

`*` matches any number of any characters, including empty — it captures all files.

</details>

---

#### 4. ls with a Wildcard

**Which files does `ls file*.txt` list from the same directory?**

<details><summary>Answer</summary>

All four: `file1.txt`, `file2.txt`, `file3.txt`, `file4.txt`. The asterisk matches any number of characters, including a single digit.

</details>

---

#### 5. Bracket Globbing

**Complete the command to list all four files (`file1.txt`…`file4.txt`):**

```bash
ls file[].txt
```

<details><summary>Answer</summary>

```bash
ls file[0-9].txt
```

`[0-9]` is a range matching one digit from 0 to 9. `[1-4]` or `[1234]` also work.

</details>

---

#### 6. Analyzing find -type d Output

Given:

```bash
$ find /home/frank/Documents/ -type d
/home/frank/Documents/
/home/frank/Documents/animal
/home/frank/Documents/animal/domestic
/home/frank/Documents/animal/wild
```

**What type of files does this command list?**

<details><summary>Answer</summary>

Only directories. The `-type d` flag restricts results to directories.

</details>

**Where does the search start?**

<details><summary>Answer</summary>

`/home/frank/Documents`.

</details>

---

#### 7. Missing tar Flag

A user wants to create a compressed archive:

```bash
tar cvf /home/frank/backup.tar.gz /home/frank/dir1
```

**Which flag is missing for gzip compression?**

<details><summary>Answer</summary>

`-z`. Without it `tar` creates a plain uncompressed archive despite the `.gz` extension. The correct command:

```bash
tar -czvf /home/frank/backup.tar.gz /home/frank/dir1
```

</details>

---

### Explorational Exercises

#### 1. Create Files dog and cat

**Task:** In your home directory, create files named `dog` and `cat`.

<details><summary>Answer</summary>

```bash
touch dog cat
```

`touch` creates empty files with current timestamps. Multiple names can be passed in one command.

</details>

---

#### 2. Create a Directory and Move Files

**Task:** Create an `animal` directory and move `dog` and `cat` into it.

<details><summary>Answer</summary>

```bash
mkdir animal
mv dog cat -t animal/
```

`-t` specifies the target directory explicitly — convenient when moving multiple files. `mv dog cat animal/` also works.

</details>

---

#### 3. Create backup Inside Documents

**Task:** Go to `~/Documents` and create a `backup` directory there.

<details><summary>Answer</summary>

```bash
cd ~/Documents
mkdir backup
```

</details>

---

#### 4. Recursive Copy

**Task:** Copy `animal` together with its contents into `backup`.

<details><summary>Answer</summary>

```bash
cp -r animal ~/Documents/backup
```

`-r` copies the directory recursively. Without this flag `cp` errors with `omitting directory`.

</details>

---

#### 5. Rename Inside backup

**Task:** Rename `animal` inside `backup` to `animal.bkup`.

<details><summary>Answer</summary>

```bash
mv animal/ animal.bkup
```

Run inside the `backup` directory. `mv` renames a directory the same way it renames a file.

</details>

---

#### 6. List Specific Archives

**Task:** The directory `/home/lpi/databases` contains many files including `db-1.tar.gz`, `db-2.tar.gz`, and `db-3.tar.gz`. List only those three with a single command.

<details><summary>Answer</summary>

```bash
ls db-[1-3].tar.gz
```

`[1-3]` matches exactly one character in the range 1–3, which precisely excludes all other files.

</details>

---

#### 7. Remove Only PDFs

**Task:** Given a directory:

```
cne1222223.pdf  cne12349.txt  cne1234.pdf
```

Remove only `.pdf` files using a single glob character.

<details><summary>Answer</summary>

```bash
rm *.pdf
```

`*` matches any name before `.pdf`. The `.txt` file is untouched.

</details>

---

#### 8. Find and Delete Large Backup Files

**Task:** Find files with the `.backup` extension in `/var`.

<details><summary>Answer</summary>

```bash
find /var -name "*.backup"
```

</details>

**Task:** Narrow it down: find only `.backup` files between 100M and 1000M in size.

<details><summary>Answer</summary>

```bash
find /var -name "*.backup" -size +100M -size -1000M
```

Two `-size` conditions combine as AND: the file must be strictly larger than 100M and strictly smaller than 1000M.

</details>

**Task:** Add deletion of the found files to the previous command.

<details><summary>Answer</summary>

```bash
find /var -name "*.backup" -size +100M -size -1000M -delete
```

`-delete` removes each found file directly without spawning an external process. Use it only after verifying the search returns exactly the files you intend to delete.

</details>

---

#### 9. Archive Multiple Files

Four files are in `/var`:

```
db-jan-2018.backup
db-feb-2018.backup
db-march-2018.backup
db-apr-2018.backup
```

**Task:** Create an archive `db-first-quarter-2018.backup.tar` from all four files.

<details><summary>Answer</summary>

```bash
tar -cvf db-first-quarter-2018.backup.tar db-jan-2018.backup db-feb-2018.backup db-march-2018.backup db-apr-2018.backup
```

`tar` accepts multiple files separated by spaces. All of them go into the single archive.

</details>

**Task:** Create the same archive but compressed with gzip. The filename should end in `.gz`.

<details><summary>Answer</summary>

```bash
tar -zcvf db-first-quarter-2018.backup.tar.gz db-jan-2018.backup db-feb-2018.backup db-march-2018.backup db-apr-2018.backup
```

The `-z` flag adds gzip compression. The `.tar.gz` extension indicates a tar archive compressed with gzip.

</details>

---

*Topic 103: GNU and Unix Commands*
