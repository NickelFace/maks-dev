---
title: "LPIC-2 211.2 — Managing E-Mail Delivery"
date: 2026-05-10
description: "Procmail recipe syntax and flags, Sieve filter language (RFC 5228), action/control/test commands, vacation extension, mbox vs maildir formats, Dovecot LDA and LMTP integration with Postfix. LPIC-2 exam topic 211.2."
tags: ["Linux", "LPIC-2", "Postfix", "Dovecot", "Procmail", "Sieve", "email", "MDA"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-211-2-email-delivery/"
page_lang: "en"
---

> **Exam topic 211.2** — Managing E-Mail Delivery (weight: 2). Covers mail filtering and sorting using procmail (awareness level) and Sieve (scripting level), plus mbox and maildir storage formats.

---

## Overview

Topic 211.2 covers filtering and sorting incoming mail on the MDA (Mail Delivery Agent) side. Two tools: **procmail** (old standard) and **Sieve** (modern filtering language per RFC 5228). Sieve is supported by Dovecot and Cyrus. Procmail works with Sendmail and Postfix.

> **Exam note:** Sieve must be known at scripting level. Procmail is awareness-only.

---

## Procmail

### Connecting to an MTA

Procmail is rarely run manually — the MTA passes incoming messages to it automatically.

For Sendmail, add to the m4 file:

```
MAILER(`procmail')dnl
```

For Postfix in `main.cf`:

```ini
mailbox_command = /usr/bin/procmail -m /etc/procmailrc
```

The `-m` flag causes procmail to execute recipes as the recipient user, not as root.

### Configuration Files

Procmail reads both files sequentially:

| File | Scope |
|---|---|
| `/etc/procmailrc` | Global, for all users |
| `~/.procmailrc` | Personal, for a specific user |

> **Warning:** `/etc/procmailrc` runs as root. A typo in a recipe can overwrite a system file. Minimize global recipes.

### Recipe Structure

```
:0 [flags] [: lockfile]
* condition1
* condition2
action
```

Each condition starts with `*`. After conditions — one action line.

If `:0:` (with a colon after zero) is used, procmail creates a default lock file. For mbox format, a lock file is always required. For maildir — not needed.

### Recipe Flags

| Flag | Description |
|---|---|
| `H` | Apply egrep to headers (default) |
| `B` | Apply egrep to message body |
| `b` | Pass message body to destination (default) |
| `h` | Pass message headers to destination (default) |
| `c` | Create a copy of the message |
| `f` | Treat pipe as a filter |
| `D` | Case-sensitive matching |
| `A` | Execute only if previous recipe matched |
| `E` | Execute only if previous recipe did not match |
| `W` | Wait for program to finish, check exit code, suppress errors |
| `w` | Wait for program to finish, check exit code, show errors |
| `i` | Ignore write errors |
| `r` | Raw mode — do not add trailing blank line |

### Special Conditions

| Symbol | Description |
|---|---|
| `!` | Invert condition |
| `$` | Evaluate using shell substitution |
| `?` | Use program exit code |
| `<` | Message size less than N bytes |
| `>` | Message size greater than N bytes |
| `variable ??` | Match against environment variable |
| `\` | Escape special characters |

### Recipe Examples

Save a copy of all messages to `messages` folder:

```
:0 c
messages
```

Delete messages with subject "work":

```
:0
* ^Subject.*work
/dev/null
```

Forward messages from `guitar-list` and save a copy:

```
:0
* ^From.*guitar-list
{
  :0 c
  ! user@example.com

  :0
  guitars
}
```

Auto-reply via formail (not from daemon, no X-Loop):

```
:0 hc
* !^FROM_DAEMON
* !^X-Loop: user@example.com
| (formail -r -I"Precedence: junk" \
-A"X-Loop: user@example.com"; \
echo "I am out of office") \
| $SENDMAIL -t
```

### Action Line Special Characters

| Symbol | Description |
|---|---|
| `!` | Forward to addresses |
| `\|` | Pipe to a program |
| `{` | Start of recipe block |
| `}` | End of recipe block |
| `text` | Save to mailbox named text |

---

## Sieve

Sieve is a mail filtering language standardized in RFC 5228. It runs server-side during delivery to the mailbox.

### Configuring Dovecot for Sieve

In Postfix `main.cf`, route mail to Dovecot LDA:

```ini
mailbox_command = /usr/lib/dovecot/dovecot-lda -a "$RECIPIENT"
```

In `/etc/dovecot/conf.d/15-lda.conf`:

```
lda_mailbox_autocreate = yes
lda_mailbox_autosubscribe = yes
protocol lda {
  mail_plugins = $mail_plugins sieve
}
```

In `/etc/dovecot/conf.d/90-sieve.conf`:

```
plugin {
  sieve = ~/.dovecot.sieve
  sieve_dir = ~/sieve
  sieve_default = /var/lib/dovecot/sieve/default.sieve
  sieve_global_dir = /var/lib/dovecot/sieve/global/
}
```

| Option | Description |
|---|---|
| `sieve` | Path to user's personal sieve script |
| `sieve_dir` | Directory with multiple user scripts |
| `sieve_default` | Global default script |
| `sieve_global_dir` | Directory with global scripts |

> If a user has a personal sieve file, it overrides the global script.

### Command Types

Sieve divides all commands into three groups:

1. **Action commands** — what to do with the message
2. **Control commands** — execution flow control
3. **Test commands** — conditions for `if`

### Action Commands

| Command | Description |
|---|---|
| `keep` | Save to default mailbox |
| `fileinto "mailbox"` | Save to specified mailbox (requires `require ["fileinto"]`) |
| `redirect "addr"` | Forward to address unchanged |
| `discard` | Delete silently, no notification to sender |
| `reject "reason"` | Reject and return message to sender (requires `require ["reject"]`) |

> **Exam fact:** `reject` is an extension, not in the base standard — must be declared via `require`. `discard` is silent deletion; the sender receives no response.

### Control Commands

| Command | Description |
|---|---|
| `if / elsif / else` | Conditional check |
| `require ["ext"]` | Load extension (must be at start of script) |
| `stop` | Stop script processing |

### Test Commands

Used inside `if`. Can be combined.

| Command | Description |
|---|---|
| `address` | Compare sender or recipient address |
| `header` | Check SMTP header presence or content |
| `envelope` | Check SMTP envelope parts (From, Rcpt) |
| `exists` | Check header existence |
| `size` | Evaluate message size |
| `allof(...)` | Logical AND — all conditions must match |
| `anyof(...)` | Logical OR — one match is enough |
| `not` | Invert test result |
| `true` | Always TRUE |
| `false` | Always FALSE |

### Comparison Operators

Used as tags (`:tag`) in test commands:

| Operator | Description |
|---|---|
| `:is` | Exact match |
| `:contains` | Contains substring |
| `:matches` | Wildcard match (`*` and `?`) |
| `:over` | Size exceeds (for `size`) |
| `:under` | Size less than (for `size`) |
| `:domain` | Compare only address domain |
| `:localpart` | Compare only local part of address |

### Sieve Script Examples

Move all messages to `saved`:

```sieve
require ["fileinto"];
fileinto "saved";
```

Sort by sender:

```sieve
require ["fileinto"];
if header :is "Sender" "guitar-list.org" {
  fileinto "guitars";
} else {
  fileinto "saved";
}
```

Filter spam and malicious messages:

```sieve
require ["fileinto", "reject"];
if header :contains "subject" "pills" {
  reject "please stop spamming me";
}
elsif address :matches :domain "from" "badhost.com" {
  discard;
}
```

Quarantine suspicious attachments:

```sieve
if attachment :matches ["*.vbs", "*.exe"] {
  fileinto "INBOX.suspicious";
}
```

Forward virus-flagged messages to admin:

```sieve
if exists "x-virus-found" {
  redirect "admin@example.com";
}
```

Delete messages larger than 2 MB:

```sieve
if size :over 2M {
  discard;
}
```

### Vacation Extension

The vacation extension adds an "out of office" auto-reply. Loaded via `require ["vacation"]`.

| Parameter | Description |
|---|---|
| `:days N` | Don't reply to the same sender more than once in N days |
| `:subject "string"` | Auto-reply subject |
| `:from "address"` | From field in auto-reply |
| `:addresses [...]` | Additional recipient addresses to respond to |
| `:mime` | Specify custom MIME content (e.g. multi-language reply) |
| `:handle "string"` | Track different vacation actions as one |
| `"text"` | Auto-reply body text (required argument) |

```sieve
require ["fileinto", "vacation"];
vacation
  :days 1
  :subject "Out of office reply"
  :addresses ["j.doe@company.dom", "john.doe@company.dom"]
  "I'm out of office, please contact Joan Doe instead.
Best regards
John Doe";
```

> `:days 1` means: the same sender gets an auto-reply no more than once per day.

---

## LMTP Integration (Postfix + Dovecot + Sieve)

The standard way to connect Sieve to Postfix + Dovecot is via LMTP (Local Mail Transfer Protocol). Mail arrives at Postfix, passes through LMTP to Sieve, gets filtered, and only then reaches the user's mailbox.

Install three packages:

```bash
sudo apt install dovecot-sieve dovecot-managesieved dovecot-lmtpd
```

| Package | Purpose |
|---|---|
| `dovecot-sieve` | Sieve support in Dovecot |
| `dovecot-managesieved` | Sieve management daemon, listens on port 4190 |
| `dovecot-lmtpd` | Local mail transport between Postfix and Sieve |

**`/etc/dovecot/conf.d/10-master.conf`** — configure LMTP unix listener:

```
service lmtp {
  unix_listener /var/spool/postfix/private/dovecot-lmtp {
    mode = 0600
    user = postfix
    group = postfix
  }
}
```

**`/etc/postfix/main.cf`** — route mailbox delivery through LMTP:

```ini
mailbox_transport = lmtp:unix:private/dovecot-lmtp
smtp_utf8_enable = no
```

`smtp_utf8_enable = no` disables UTF-8, which Sieve does not yet support.

**`/etc/dovecot/conf.d/20-lmtp.conf`** — enable Sieve in LMTP:

```
protocol lmtp {
  postmaster_address = admin@example.com
  mail_plugins = $mail_plugins sieve
}
```

`postmaster_address` — address for Sieve errors. Required field.

**`/etc/dovecot/conf.d/90-sieve.conf`** — full path configuration:

```
plugin {
  sieve = ~/.dovecot.sieve
  sieve_dir = ~/sieve
  sieve_default = /var/lib/dovecot/sieve/default.sieve
  sieve_global_dir = /var/lib/dovecot/sieve/
}
```

Create global script:

```bash
sudo mkdir -p /var/lib/dovecot/sieve
sudo touch /var/lib/dovecot/sieve/default.sieve
sudo chown -R dovecot /var/lib/dovecot/sieve
```

Example global script `/var/lib/dovecot/sieve/default.sieve`:

```sieve
require ["fileinto"];

if address :is "from" "bob@aol.com" {
  fileinto "junk";
}

if address :contains "from" "@aol.com" {
  fileinto "junk";
}

if header :contains "x-spam-flag" "yes" {
  fileinto "junk";
}
```

Verify managesieve is running:

```bash
telnet 127.0.0.1 4190
```

A Dovecot banner with supported commands confirms Sieve is running.

---

## Mail Storage Formats

### Mbox

All messages stored in one text file. Default path: `/var/spool/mail/<username>`.

The entire file is locked for any operation. After the operation, the lock is released.

**Advantages:** Widely supported, fast for appending, fast internal search.  
**Disadvantages:** Locking issues, prone to data corruption.

### Maildir

Each message is a separate file. A `~/Maildir/` directory is created per user with three subdirectories:

| Directory | Purpose |
|---|---|
| `new/` | New unread messages |
| `cur/` | Read messages |
| `tmp/` | Temporary files during delivery |

**Advantages:** Fast lookup/delete of specific messages, minimal or no file locking, works on network filesystems, resistant to data corruption.  
**Disadvantages:** Some filesystems handle many small files poorly; full-text search is slow.

### Procmail Syntax for mbox vs maildir

Maildir folder names end with `/`. No lock file needed for maildir.

**mbox:**
```
:0:
* condition
directory_name
```

**maildir:**
```
:0
* condition
directory_name/
```

> **Exam fact:** Maildir is the recommended format. With mbox in procmail, a lock file is mandatory (`:0:`). With maildir, no lock is needed — use `:0` without the colon.

---

## Exam Cheat Sheet

### Files and Paths

| File | Purpose |
|---|---|
| `/etc/procmailrc` | Global procmail recipes |
| `~/.procmailrc` | Personal procmail recipes |
| `/etc/dovecot/conf.d/15-lda.conf` | Dovecot LDA config + enable sieve |
| `/etc/dovecot/conf.d/90-sieve.conf` | Sieve script paths |
| `/var/spool/mail/<user>` | User mbox file |

### Recipe Structure

```
:0 [flags] [: lockfile]
* condition (regex)
action
```

### Sieve Script Structure

```sieve
require ["extension1", "extension2"];
if TEST {
  ACTION;
} else {
  ACTION;
}
```

### Common Exam Pitfalls

| Pitfall | Rule |
|---|---|
| Using `fileinto` without `require` | `require ["fileinto"]` must appear first |
| Using `reject` without `require` | `require ["reject"]` must appear first |
| `discard` vs `reject` | `discard` = silent delete; `reject` = sends notification |
| `reject` is a base command | It is NOT — it's an extension requiring `require` |
| mbox in procmail without lock | Always use `:0:` (with lock) for mbox |
| `/etc/procmailrc` without `-m` flag | Recipes run as root — dangerous |
