---
title: "LPIC-1 103.7 — Search Text Files Using Regular Expressions"
date: 2026-04-16
description: "Regular expressions, BRE vs ERE, grep, egrep, fgrep, sed, find with regex. LPIC-1 exam topic 103.7."
tags: ["Linux", "LPIC-1", "regex", "grep", "sed", "egrep", "find"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-103-7-regular-expressions/"
page_lang: "en"
---

## What You Need to Know

- Build simple regular expressions from several notation elements.
- Understand the difference between Basic (BRE) and Extended (ERE) regular expressions.
- Know special characters, character classes, quantifiers, and anchors.
- Use tools to search the filesystem or file contents.
- Apply regular expressions to delete, modify, and replace text.

---

## Regular Expressions: Basics

A regular expression (regex) describes a search pattern. Tools like `grep` and `sed` use it to find matches in text.

The basic building block of a regex is called an **atom** — a single character that may or may not have a special meaning. Most ordinary characters keep their literal meaning, while a few reserved characters act as metacharacters.

A substring that matches an atom with a quantifier is called a **piece**. When a substring matches and a longer substring from the same starting position also matches, the longer one is used.

### Special Characters

| Character | Meaning |
|-----------|---------|
| `.` | Any single character (except newline) |
| `*` | Zero or more repetitions of the preceding element |
| `^` | Start of line (anchor) |
| `$` | End of line (anchor) |
| `\` | Escape the next character |
| `[]` | Character class |
| `[^]` | Negated character class |

A dot means literally any character. To match an actual dot, escape it: `\.`.

### Character Classes

A character class is defined in square brackets and matches any one of the listed characters.

```
[abc]      — a, b, or c
[a-z]      — any lowercase letter
[A-Z]      — any uppercase letter
[0-9]      — any digit
[a-zA-Z]   — any letter
[^0-9]     — any character that is not a digit
```

POSIX classes work inside `[]` and are portable across locales. They cannot be used as a standalone atom outside brackets or as range boundaries.

| Class | Description |
|-------|-------------|
| `[:alpha:]` | Letters |
| `[:digit:]` | Digits 0–9 |
| `[:alnum:]` | Letters and digits |
| `[:upper:]` | Uppercase letters |
| `[:lower:]` | Lowercase letters |
| `[:space:]` | Whitespace: space, `\t`, `\n`, `\r`, `\f`, `\v` |
| `[:blank:]` | Space and tab |
| `[:punct:]` | Printable characters that are not space or letter/digit |
| `[:print:]` | All printable characters including space |
| `[:graph:]` | All printable characters except space |
| `[:cntrl:]` | Control characters |
| `[:ascii:]` | ASCII characters (0–127) |
| `[:xdigit:]` | Hex digits 0–9, a–f, A–F |

Example: `[[:alpha:]]` matches any letter regardless of locale. `[[:blank:]]{2}` matches exactly two whitespace characters.

### Quantifiers

A quantifier specifies how many times the preceding element must appear.

| Quantifier | BRE | ERE | Meaning |
|------------|-----|-----|---------|
| `*` | yes | yes | 0 or more |
| `\+` | yes | `+` | 1 or more |
| `\?` | yes | `?` | 0 or 1 |
| `\{n\}` | yes | `{n}` | exactly n times |
| `\{n,\}` | yes | `{n,}` | n or more times |
| `\{n,m\}` | yes | `{n,m}` | between n and m times |

In BRE the characters `+`, `?`, `{`, and `}` must be escaped with a backslash. In ERE they work without escaping.

### Anchors

Anchors don't match a character — they fix a position in the line.

- `^` matches the start of a line: `^root` finds lines beginning with "root". Outside the start of an expression `^` is treated literally.
- `$` matches the end of a line: `bash$` finds lines ending with "bash". In the middle of an expression `$` is treated literally.
- `^$` matches an empty line.

---

## BRE vs ERE

GNU utilities support two regex dialects.

**BRE (Basic Regular Expressions)** is the default in `grep` and `sed`. The metacharacters `+`, `?`, `|`, `(`, `)`, `{`, `}` must be escaped to act as operators.

**ERE (Extended Regular Expressions)** is used with `grep -E` and `egrep`. The same metacharacters work immediately without escaping.

Comparison: to match "colour" or "color", BRE uses `colou\?r`, ERE uses `colou?r`. Both mean the same thing but syntax differs.

The OR operator `|` is only available in ERE: `cat|dog` matches lines with "cat" or "dog". In BRE `|` is literal, though most GNU programs support `\|` as an extension.

Grouping with parentheses also behaves differently. BRE: `\(abc\)*`, ERE: `(abc)*`. Unescaped parentheses in BRE are ordinary characters.

**Back references** let you refer to an already-matched group within the same expression. A group is defined with parentheses; references are `\1`, `\2`, etc. In ERE: `([[:digit:]])\1` matches any digit repeated twice in a row. In BRE parentheses are escaped: `\([[:digit:]]\)\1`.

---

## grep, egrep, fgrep

### grep

`grep` searches for lines matching a pattern. Uses BRE by default.

```bash
grep 'pattern' file.txt
grep 'root' /etc/passwd
grep '^#' /etc/fstab        # lines starting with #
grep 'bash$' /etc/passwd    # lines ending with bash
grep '.' /etc/hosts         # lines with any character (all non-empty)
```

Searching multiple files or recursively:

```bash
grep -r 'error' /var/log/
grep 'warning' /var/log/*.log
```

### egrep

`egrep` uses ERE. Fully equivalent to `grep -E`.

```bash
egrep 'colou?r' file.txt            # colour or color
egrep 'cat|dog' file.txt            # cat or dog
egrep '(err|warn)' /var/log/syslog  # err or warn
egrep '[0-9]{3}-[0-9]{4}' phones    # phone number
```

On modern systems `egrep` is deprecated; prefer `grep -E`.

### fgrep

`fgrep` searches for a fixed string without interpreting regex. Equivalent to `grep -F`. Faster on large files when the pattern is simple.

```bash
fgrep '192.168.1.1' /var/log/auth.log
fgrep '*.conf' Makefile              # * is a literal asterisk here
```

Similarly, `fgrep` is deprecated; prefer `grep -F`.

### Useful Flags

| Flag | Meaning |
|------|---------|
| `-i` | Case-insensitive |
| `-v` | Invert match (lines without a match) |
| `-n` | Show line numbers |
| `-c` | Print only the count of matching lines |
| `-l` | Print only filenames |
| `-H` | Always print the filename before each line |
| `-r` | Recursive search through directories |
| `-E` | Use ERE |
| `-F` | Fixed string (no regex) |
| `-f FILE` | Read pattern from a file |
| `-o` | Print only the matching part of a line |
| `-w` | Match whole words only |
| `-z` | Use null byte as line delimiter (for `find -print0`) |
| `-A n` | Show n lines after each match |
| `-B n` | Show n lines before each match |
| `-C n` | Show n lines around each match |

`-H` is especially important when calling `grep` from `find -exec`: without it the filename is not printed when there is only one file. Context lines in the output are marked with `-` instead of `:` after the filename.

When using `find -print0`, pass `-z` to `grep` so both tools use the null delimiter:

```bash
find . -print0 | grep -z 'pattern'
```

Examples:

```bash
grep -i 'error' /var/log/syslog                    # errors in any case
grep -v '^#' /etc/fstab                            # lines without comments
grep -n 'TODO' *.py                                # line numbers with TODO
grep -c 'failed' /var/log/auth.log                 # count of failed attempts
grep -H 'root' /etc/*                              # with filename
grep -l 'root' /etc/*                              # only filenames
grep -w 'cat' /usr/share/words                     # only the word "cat", not "catch"
find /usr/share/doc -type f -exec grep -i -H '3d modeling' "{}" \;
```

---

## sed: Stream Editing

`sed` reads text line by line, applies commands, and writes the result. It does not modify the original file by default.

### The substitute Command

The `s` command replaces text using a regex:

```
s/regexp/replacement/flags
```

The `/` delimiter can be replaced by any other character — useful when working with paths:

```bash
sed 's/old/new/' file.txt             # replace the first occurrence per line
sed 's/old/new/g' file.txt            # replace all occurrences
sed 's/old/new/2' file.txt            # replace the second occurrence
sed 's/old/new/gi' file.txt           # all occurrences, case-insensitive
sed 's|/usr/bin|/usr/local/bin|g' f   # using | as delimiter
```

In the replacement string:
- `&` refers to the entire matched expression.
- `\1`, `\2`, etc. refer to captured groups in BRE: `\(group\)`.

```bash
# Wrap a number in parentheses
sed 's/[0-9]\+/(&)/' file.txt

# Swap the first and second words
sed 's/\(\w\+\) \(\w\+\)/\2 \1/' file.txt
```

The `-i` flag edits the file in place:

```bash
sed -i 's/http/https/g' config.txt
sed -i.bak 's/http/https/g' config.txt   # save a backup
```

### Deleting Lines

The `d` command deletes lines:

```bash
sed '/^#/d' /etc/fstab          # delete comment lines
sed '/^$/d' file.txt            # delete empty lines
sed '5d' file.txt               # delete line 5
sed '1,3d' file.txt             # delete lines 1–3
```

### Other sed Commands

| Command | Meaning |
|---------|---------|
| `p` | Print the line (usually with `-n`) |
| `q` | Quit after the current line |
| `c TEXT` | Replace the entire line with TEXT |
| `a\text` | Append a line after the current one |
| `i\text` | Insert a line before the current one |
| `r FILE` | Insert the contents of FILE after the current line |
| `w FILE` | Write the current line to FILE |
| `y/abc/xyz/` | Transliterate characters (like tr) |

Addresses in sed can be a line number, a regex, or a range. A regex range is written as `/start/,/end/`:

```bash
sed -n '/error/p' /var/log/syslog          # print only lines with error
sed -n '10,20p' file.txt                   # print lines 10–20
sed '3a\new line' file.txt                 # append a line after line 3
sed '/^#/c REMOVED' file.txt              # replace comments with "REMOVED"
sed -n '/<body>/,/<\/body>/p' page.html   # print the body block
```

Multiple commands can be passed with `-e`, separated by `;` inside quotes, or stored in a script file:

```bash
sed -e 's/foo/bar/g' -e '/^#/d' file.txt
sed "1,7d;11d" file.txt
sed -f script.sed file.txt
```

The `-r` (or `-E`) flag enables ERE in sed. The `e` flag at the end of an `s` command executes the replacement as a shell command:

```bash
sed -r -e 's/(^[^.]*)\.(crt|key)$/cat \1.\2/e' < template.ovpn > client.ovpn
```

---

## Combining grep and sed

`grep` and `sed` work well in a pipeline: `grep` selects the right lines, `sed` transforms their form. A practical example: analysing failed login attempts.

```bash
# Show only entries with a hostname (no IP at the end)
lastb -d -a --time-format notime | grep -v '[0-9]$'

# Keep only domain names
lastb -d -a --time-format notime | grep -v '[0-9]$' \
  | sed -e 's/.* \(.*\)$/\1/'

# Unique domains, sorted
lastb -d -a --time-format notime | grep -v '[0-9]$' \
  | sed -e 's/.* \(.*\)$/\1/' | sort | uniq
```

The regex `[0-9]$` in `grep -v` selects lines not ending with a digit — i.e. lines with a hostname instead of an IP. In `sed` the pattern `.* \(.*\)$` captures everything from the last space to the end of the line, and `\1` substitutes it back in place of the whole line.

---

## Filesystem Search: find with regex

`find` supports the `-regex` option, which tests each path against a regular expression. By default `find` uses the `findutils-default` dialect, very close to BRE. ERE is enabled with `-regextype posix-extended` or `-regextype egrep`.

```bash
# Find hidden files or files in hidden directories larger than 100 MB
find $HOME -regex '.*/\..*' -size +100M

# Find fonts with ERE and alternation
find /usr/share/fonts -regextype posix-extended \
  -iregex '.*(dejavu|liberation).*sans.*(italic|oblique).*'
```

`-iregex` is case-insensitive. The pattern in `-regex` is tested against the full path, not just the filename, so `.*` at the start is usually necessary.

---

## Searching in less

`less` supports regex searching directly while viewing a file or command output.

| Key | Action |
|-----|--------|
| `/` | Open search, jump to first match |
| `Ctrl+K` before typing | Highlight matches only, don't move |
| `&` | Filter: show only lines that match |
| `n` | Next match |
| `N` | Previous match |

Example: when viewing a man page, press `/` and type `^[[:blank:]]*-o` (or simply `^ *-o`) to jump straight to the description of the `-o` option.

---

## Quick Reference

```bash
# grep: BRE search
grep 'root' /etc/passwd
grep '^root' /etc/passwd
grep 'bash$' /etc/passwd
grep -v ^# /etc/services
grep -i 'error' /var/log/syslog
grep -n 'TODO' *.py
grep -c 'failed' /var/log/auth.log
grep -r 'pattern' /etc/
grep -w 'word' file.txt

# grep -E / egrep: ERE search
grep -E 'colou?r' file.txt
grep -E 'err|warn' /var/log/syslog
grep -E '[0-9]{2,4}' file.txt
egrep "\S+@\S+\.\S+"                                             # email
egrep "[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}"         # IPv4
egrep ".org$|.com$" domains.txt

# grep -F / fgrep: fixed string
grep -F '192.168.1.1' file.txt
fgrep '*.conf' Makefile

# find with regex
find $HOME -regex '.*/\..*' -size +100M
find . -type f -regextype egrep -not -regex '.*\.[[:alnum:]]{1,}$'
find /path -regextype posix-extended -iregex '.*pattern.*'

# sed: substitution
sed 's/old/new/g' file.txt
sed 's/old/new/gi' file.txt
sed -i 's/old/new/g' file.txt
sed -i.bak 's/old/new/g' file.txt

# sed: delete lines
sed '/^#/d' file.txt
sed '/^$/d' file.txt
sed '1,5d' file.txt

# sed: print lines
sed -n '10,20p' file.txt
sed -n '/error/p' /var/log/syslog

# Regex reference
man 7 regex
```

---

## Exam Tips

**Which tool searches for a fixed string without interpreting regex?**
`grep -F` or `fgrep`.

**Which grep flag prints only the count of matching lines?**
`-c`.

**How is "one or more" written in ERE?**
`+`. In BRE it must be escaped: `\+`.

**How do you edit a file in place with sed and keep a backup?**
`sed -i.bak 's/old/new/g' file.txt`. The suffix after `-i` has no space.

**What does `^` mean inside a character class `[^abc]`?**
It negates the class: matches any character except a, b, c.

**What does `&` mean in sed's replacement string?**
The entire matched text. For example, `sed 's/[0-9]*/[&]/'` wraps the number in square brackets.

**How does `grep -E` differ from `grep`?**
`grep -E` uses ERE, where `+`, `?`, `|`, `()`, `{}` work without escaping.

**How do you find empty lines with grep?**
`grep '^$' file.txt`.

**How do you print lines that are neither comments nor empty?**
`grep -v '^#' file.txt | grep -v '^$'` or `grep -Ev '^(#|$)' file.txt`.

**What does `sed -n '5,10p'` do?**
Prints only lines 5 through 10.

**How do you enable ERE for find's -regex?**
`find . -regextype posix-extended` or `-regextype egrep`.

**How do you show only matching lines in less without moving through the file?**
Press `&` and type the expression. To highlight without moving, press `Ctrl+K` before typing in the `/` search bar.

**What happens when you run `uptime -s | sed -e 's/(.*) (.*)/\1/'`?**
The line is printed unchanged. `sed` uses BRE by default, where `(` and `)` are literal characters. Use `\(.*\) \(.*\)` in BRE or add `-r` for ERE.

**What does the `-z` flag do in grep?**
Switches the line delimiter from `\n` to a null byte. Required when working with `find -print0`.

**How do you print only the `<body>` block of an HTML file with sed?**
`sed -n '/<body>/,/<\/body>/p' file.html`. A two-regex address range with `-n` and `p`.

**How do you remove all HTML tags with sed, keeping only the text?**
`sed 's/<[^>]*>//g'`. The pattern `<[^>]*>` matches `<`, any number of non-`>` characters, and `>`.

---

## Exercises

### Guided Exercises

#### 1. Email address regex

**What extended regular expression matches any email address such as `info@example.org`?**

<details><summary>Answer</summary>

```bash
egrep "\S+@\S+\.\S+"
```

`\S+` matches one or more non-whitespace characters. `@` is literal. The dot before the TLD is escaped `\.` so it doesn't match any character. The expression doesn't strictly validate an address but covers the standard format.

</details>

---

#### 2. IPv4 address regex

**What extended regular expression matches any IPv4 address in dotted-quad notation, e.g. `192.168.15.1`?**

<details><summary>Answer</summary>

```bash
egrep "[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}"
```

Each octet is represented as `[0-9]{1,3}`: one to three digits. Dots between octets are escaped `\.` to match literally. The expression doesn't restrict values to 0–255 but covers the notation format.

</details>

---

#### 3. Filter comments from /etc/services

**How do you use `grep` to print `/etc/services` with all comment lines (starting with `#`) removed?**

<details><summary>Answer</summary>

```bash
grep -v ^# /etc/services
```

`-v` inverts the match: only lines that do not match are printed. The `^` anchor fixes the pattern at the start of the line, so only pure comment lines are filtered out, not lines containing `#` in the middle.

</details>

---

#### 4. Filter .org and .com domains

**A file `domains.txt` contains one domain per line. How do you use `egrep` to print only `.org` or `.com` domains?**

<details><summary>Answer</summary>

```bash
egrep ".org$|.com$" domains.txt
```

The `$` anchor fixes the match at the end of the line. The `|` operator provides alternation. For a strict dot match use `\.org$|\.com$`.

</details>

---

#### 5. Extract IPv4 addresses from last output

**`last` shows a list of recent logins including IP addresses. How do you use `egrep` to extract only the IPv4 addresses, discarding everything else on each line?**

<details><summary>Answer</summary>

```bash
last -i | egrep -o '[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}'
```

`-o` prints only the matched part, not the whole line. `-i` in `last` forces IP addresses instead of hostnames. The pattern matches any string of four digit groups separated by dots.

</details>

---

#### 6. grep flag for find -print0

**Which flag must be passed to `grep` to correctly filter the output of `find` run with `-print0`?**

<details><summary>Answer</summary>

The `-z` (or `--null-data`) flag:

```bash
find . -print0 | grep -z 'pattern'
```

`find -print0` separates paths with a null byte instead of a newline to correctly handle names with spaces. `grep -z` switches to the same delimiter.

</details>

---

#### 7. sed BRE vs ERE with capture groups

**`uptime -s` prints the last boot time as `2019-08-05 20:13:22`. What happens when you run `uptime -s | sed -e 's/(.*) (.*)/\1/'`?**

<details><summary>Answer</summary>

The line is printed unchanged. `sed` uses BRE by default, where `(` and `)` are literal characters, not group delimiters. The pattern `(.*)` doesn't match anything in the date string. Correct versions:

```bash
# BRE — escaped parentheses
uptime -s | sed -e 's/\(.*\) \(.*\)/\1/'

# ERE via -r flag
uptime -s | sed -r -e 's/(.*) (.*)/\1/'
```

Both print only the date, discarding the time.

</details>

---

#### 8. Count matching lines with grep

**Which flag makes `grep` print the count of matching lines instead of the lines themselves?**

<details><summary>Answer</summary>

`-c`:

```bash
grep -c 'failed' /var/log/auth.log
```

</details>

---

### Explorational Exercises

#### 1. Find files without an extension

**How do you use `find` with extended regular expressions to find all files in the current directory that have no standard extension?**

<details><summary>Answer</summary>

```bash
find . -type f -regextype egrep -not -regex '.*\.[[:alnum:]]{1,}$'
```

`-regextype egrep` enables ERE. The pattern `.*\.[[:alnum:]]{1,}$` describes a path ending with a dot and one or more alphanumeric characters — any extension. `-not` inverts the condition: files that don't match are printed, i.e. files without an extension.

</details>

---

#### 2. Highlight matches in less without moving

**In `less`, pressing `/` opens the search bar and jumps to the first match. Which key combination keeps you at the current position and only highlights matches?**

<details><summary>Answer</summary>

`Ctrl+K` before typing the search expression.

`Ctrl+K` switches the mode: `less` highlights all matches in colour without scrolling to the first one.

</details>

---

#### 3. Filter lines in less with regex

**How do you filter the output in `less` so that only lines matching a regex are shown?**

<details><summary>Answer</summary>

Press `&` and type the regular expression.

The `&` command puts `less` into filter mode: lines not matching the expression are hidden. To restore the full output, press `&` again with an empty expression.

</details>

---

#### 4. Print the body block of an HTML file with sed

**How do you use `sed` to print only the `<body>` block of an HTML file?**

<details><summary>Answer</summary>

```bash
sed -n -e '/<body>/,/<\/body>/p' file.html
```

The address `/<body>/,/<\/body>/` defines a range: from the line matching `<body>` to the line matching `<\/body>`. The backslash before `/` escapes it inside the sed address. `-n` suppresses automatic printing; `p` explicitly prints only lines in the range.

</details>

---

#### 5. Remove all HTML tags with sed

**What `sed` expression removes all HTML tags from a document, leaving only the text?**

<details><summary>Answer</summary>

```bash
sed 's/<[^>]*>//g'
```

The pattern `<[^>]*>` matches `<`, then any number of characters that are not `>` (negated class `[^>]`), then `>`. The `g` flag replaces all occurrences per line with an empty string.

</details>

---

#### 6. Inline file contents with sed

**In an `.ovpn` template, certificate filenames (`ca.crt`, `client.crt`, `client.key`, `ta.key`) need to be replaced with the contents of those files. How do you do this with a single `sed` command?**

<details><summary>Answer</summary>

```bash
sed -r -e 's/(^[^.]*)\.(crt|key)$/cat \1.\2/e' < client.template > client.ovpn
```

`-r` enables ERE. The pattern `(^[^.]*)` captures the filename without extension (group 1); `\.(crt|key)$` matches the extension at end of line (group 2). The replacement `cat \1.\2` forms the command `cat filename.extension`. The `e` flag at the end of the `s` command executes the replacement string as a shell command and substitutes its output back into the stream. Each line with a filename is replaced by the contents of the corresponding file.

</details>

---

*Topic 103: GNU and Unix Commands*
