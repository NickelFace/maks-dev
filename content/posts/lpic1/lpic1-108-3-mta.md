---
title: "LPIC-1 108.3 — Mail Transfer Agent (MTA) Basics"
date: 2026-04-20
description: "MTA concepts and common MTAs (Sendmail, Postfix, Exim), sendmail and mail commands, mail queue management, /etc/aliases and newaliases, ~/.forward for per-user forwarding. LPIC-1 exam topic 108.3."
tags: ["Linux", "LPIC-1", "email", "MTA", "sendmail", "postfix", "aliases", "admin"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-108-3-mta/"
---

> **Exam weight: 3** — LPIC-1 v5, Exam 102

## What You Need to Know

From the official LPIC-1 objectives:

- Create e-mail aliases.
- Configure e-mail forwarding.
- Knowledge of commonly available MTA programs (postfix, sendmail, exim).

Key files and commands: `~/.forward`, `/etc/aliases`, `sendmail`, `mailq`, `mail`, `postfix`, `sendmail`, `exim`, `newaliases`.

---

## Mail Concepts

A **Mail Transfer Agent (MTA)** routes email between servers using SMTP (Simple Mail Transfer Protocol) on port 25. When a message arrives, the MTA delivers it to the local **inbox** at `/var/spool/mail/username`.

DNS **MX (Mail Exchanger) records** direct mail to the correct server for a domain.

### Common MTAs

| MTA | Notes |
|---|---|
| Sendmail | The original Unix MTA; powerful but complex configuration |
| Postfix | Drop-in Sendmail replacement; most widely used today |
| Exim | Default MTA on Debian systems |
| qmail | Secure design; not commonly installed by default |

Postfix provides a `sendmail` compatibility wrapper so scripts using `sendmail` continue to work without modification.

---

## sendmail Command

The `sendmail` command (available on all MTAs as a compatibility interface) sends an email from the command line. The message body is read from stdin; terminate with a line containing only `.`:

```bash
$ sendmail user@example.com
Subject: Test

Hello, this is a test message.
.
```

Useful flags:

| Flag | Description |
|---|---|
| `-bp` | List the mail queue (same as `mailq`) |
| `-q` | Flush the mail queue (attempt delivery of queued messages) |
| `-bi` / `-I` | Rebuild the aliases database (same as `newaliases`) |

---

## mail Command (MUA)

`mail` is a simple Mail User Agent for reading and sending mail from the terminal.

### Send Mode

```bash
mail -s "Subject" recipient@example.com
```

The command reads the message body from stdin.

### Read Mode

Running `mail` without arguments opens the inbox and shows a list of messages. Commands in read mode:

| Command | Action |
|---|---|
| `N` (number) | Read message N |
| `d N` | Delete message N |
| `r N` | Reply to message N |
| `q` | Quit and save changes |

---

## Mail Queue

When a message cannot be delivered immediately, the MTA places it in the mail queue. Queue locations:

- Sendmail: `/var/spool/mqueue/`
- Postfix: `/var/spool/postfix/`

### Queue Commands

```bash
mailq              # list queued messages
sendmail -bp       # same as mailq
sendmail -q        # force retry of all queued messages
```

---

## /etc/aliases — System-Wide Aliases

`/etc/aliases` defines email aliases for the system. It maps alias names to one or more destinations:

```
# Format: alias: destination
postmaster:   root
root:         admin@example.com
helpdesk:     alice, bob, charlie
bugs:         /var/log/bugs.txt
complaints:   |/usr/local/bin/ticket-handler
```

### Destination Types

| Destination | Description |
|---|---|
| `username` | Local user |
| `user@domain` | Remote email address |
| `user1, user2` | Comma-separated list (distribution list) |
| `/path/to/file` | Append message to a file |
| `\|/path/to/command` | Pipe message body to a program |
| `:include:/path/to/file` | Read destinations from a file |

After editing `/etc/aliases`, rebuild the binary alias database:

```bash
newaliases          # preferred command
sendmail -bi        # equivalent
sendmail -I         # equivalent
```

The compiled database is stored as `/etc/aliases.db`.

---

## ~/.forward — Per-User Forwarding

Each user can create a `~/.forward` file to redirect their mail without requiring root access or a `newaliases` rebuild.

```
# Forward to another address
user@otherdomain.com

# Deliver locally AND forward
\username, user@otherdomain.com

# Pipe to a program
|/usr/bin/vacation
```

Rules for `~/.forward`:

- No `newaliases` needed — the MTA reads it directly.
- The file must be owned by the user and not writable by others (group and world write bits must be clear).
- The `\username` syntax with backslash delivers a copy locally, preventing forwarding loops.

---

## Quick Reference

```
MTA = Mail Transfer Agent
  SMTP port 25
  Local inbox: /var/spool/mail/username
  Common MTAs: Postfix (most common), Sendmail (original),
               Exim (Debian default), qmail

sendmail:
  sendmail addr         send mail (body from stdin, end with .)
  sendmail -bp          list mail queue
  sendmail -q           flush/retry mail queue
  sendmail -bi / -I     rebuild aliases DB (= newaliases)

mail command:
  mail -s "Subject" addr    send mail (body from stdin)
  mail                      read inbox

Mail queue:
  mailq                 list queued messages
  sendmail -q           force retry

/etc/aliases:
  alias: destination(s)
  Destinations: username, user@domain, comma list,
                /file, |command, :include:/file
  After editing: run newaliases

~/.forward:
  user@domain           forward to address
  \username             keep local copy (prevents loop)
  |/path/cmd            pipe to program
  No newaliases needed; file must not be group/world writable
```

---

## Exam Questions

1. What protocol does an MTA use to route email between servers? → SMTP on port 25.
2. Where is local user mail stored on the system? → `/var/spool/mail/username`
3. What DNS record type directs email to a mail server? → MX (Mail Exchanger) record.
4. Which MTA is the most widely used today and is a drop-in replacement for Sendmail? → Postfix.
5. Which MTA is the default on Debian-based systems? → Exim.
6. How do you send an email with `sendmail` from the command line? → Run `sendmail user@domain`, type the message body, then end with a line containing only `.`.
7. What does `sendmail -bp` do? → Lists the mail queue (same as `mailq`).
8. What does `sendmail -q` do? → Forces the MTA to retry delivery of all queued messages.
9. How do you send an email with a subject line using the `mail` command? → `mail -s "Subject" recipient@example.com`
10. What file defines system-wide email aliases? → `/etc/aliases`
11. What command must be run after editing `/etc/aliases`? → `newaliases` (or `sendmail -bi` or `sendmail -I`).
12. What file stores the compiled aliases database? → `/etc/aliases.db`
13. What does the destination `|/path/to/script` mean in `/etc/aliases`? → Pipe the message body to the specified program.
14. What is the purpose of `~/.forward`? → Allows individual users to redirect or forward their incoming mail without root access.
15. Does `~/.forward` require running `newaliases` after editing? → No, the MTA reads it directly.
16. What does `\username` mean in `~/.forward`? → Deliver a local copy to that user (the backslash prevents forwarding loops).
17. What permission rule applies to `~/.forward`? → The file must be owned by the user and must not be writable by group or others.
18. Where does Postfix store its mail queue? → `/var/spool/postfix/`

---

## Exercises

### Exercise 1 — System Alias

Add an alias so that mail sent to `webmaster` is delivered to both `alice` and `bob@remote.example.com`. What command rebuilds the database?

<details>
<summary>Answer</summary>

In `/etc/aliases`:

```
webmaster:   alice, bob@remote.example.com
```

Then run:

```bash
newaliases
```

</details>

---

### Exercise 2 — File Delivery Alias

Create an alias `bugs` that appends incoming messages to `/var/log/bugs.txt`.

<details>
<summary>Answer</summary>

In `/etc/aliases`:

```
bugs:   /var/log/bugs.txt
```

Run `newaliases` after editing.

</details>

---

### Exercise 3 — Per-User Forward

User `carol` wants all her incoming mail forwarded to `carol@gmail.com` while also keeping a local copy. Write the contents of her `~/.forward`.

<details>
<summary>Answer</summary>

```
\carol, carol@gmail.com
```

The `\carol` part delivers locally; `carol@gmail.com` forwards externally. The backslash prevents an infinite forwarding loop.

</details>

---

### Exercise 4 — Reading the Queue

How do you list all messages currently waiting in the mail queue?

<details>
<summary>Answer</summary>

```bash
mailq
```

or equivalently:

```bash
sendmail -bp
```

</details>

---

### Exercise 5 — Sending from Command Line

Send a test message to `root` with the body "Disk check passed" using `sendmail`.

<details>
<summary>Answer</summary>

```bash
sendmail root <<EOF
Subject: Disk check

Disk check passed
.
EOF
```

Or interactively:

```bash
sendmail root
Subject: Disk check

Disk check passed
.
```

End the message with a line containing only `.`.

</details>

---

*LPIC-1 Study Notes | Topic 108: Essential System Services*
