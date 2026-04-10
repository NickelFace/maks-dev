---
title: "LPIC-2 211.1 — Using E-mail Servers"
date: 2026-04-10
description: "SMTP protocol, Postfix architecture, main.cf and master.cf, aliases, virtual domains, lookup tables, relay configuration, TLS in Postfix, Sendmail configuration files, Exim, Postfix utilities (postconf/postmap/postqueue/postsuper). LPIC-2 exam topic 211.1."
tags: ["Linux", "LPIC-2", "Postfix", "SMTP", "email", "Sendmail", "Exim", "MTA"]
categories: ["LPIC-2"]
---

> **Exam topic 211.1** — Using E-mail Servers (weight: 4). Covers Postfix configuration, mail queues, aliases, virtual domains, TLS, and Sendmail/Exim awareness.

---

## SMTP Protocol

SMTP is described in RFC 5321. Commands are four characters; server responses start with a three-digit code.

**Response codes:**
- `2xx` — success
- `4xx` — temporary error (retry possible)
- `5xx` — permanent error (message rejected)

Common codes: `220` = server ready, `250` = command OK, `550` = recipient not found.

### SMTP session example:

```bash
telnet mailserver 25
EHLO localhost
MAIL FROM:<sender@example.com>
RCPT TO:<user@example.com>
DATA
Subject: Test
.
QUIT
```

### Disable VRFY command (security):

```ini
# /etc/postfix/main.cf
disable_vrfy_command = yes
```

> VRFY is disabled for security: it allows enumerating valid addresses on the server.

---

## MTA Architecture

**MTA (Mail Transfer Agent)** — receives and delivers mail.

| Component | Role |
|---|---|
| **MTA** | Transfers mail between servers (Postfix, Sendmail, Exim) |
| **MDA** | Final delivery to user mailbox (procmail, maildrop) |
| **MUA** | Mail client (Thunderbird, Evolution) |

---

## Postfix Overview

Postfix splits mail processing into separate programs, each with its own storage directory (speeds up crash recovery).

### Main Postfix processes:

| Process | Role |
|---|---|
| `master` | Main process, launches all others |
| `smtpd` | Accepts incoming SMTP connections |
| `smtp` | Sends mail to remote servers |
| `qmgr` | Manages the mail queue |
| `pickup` | Picks up mail from local queue |
| `cleanup` | Normalizes headers |

### Queue directory: `/var/spool/postfix/`

| Subdirectory | Purpose |
|---|---|
| `incoming` | New incoming messages |
| `active` | Messages actively being processed by qmgr |
| `deferred` | Messages delayed due to temporary errors |
| `bounce` | Non-delivery notifications |
| `hold` | Messages on hold |
| `corrupt` | Corrupted messages |
| `maildrop` | Local messages from sendmail-compatible commands |

---

## Configuration Files

All files in `/etc/postfix/`:

| File | Purpose |
|---|---|
| `main.cf` | Mail processing parameters |
| `master.cf` | Process management |
| `install.cf` | Installation parameters |

```bash
postfix reload          # apply main.cf changes without restart
systemctl restart postfix
```

```bash
postconf -d    # all parameters including defaults (877+ lines)
postconf -n    # only explicitly configured parameters
postconf -e 'home_mailbox = Maildir/'   # change parameter without editing file
```

Sample config: `/usr/share/postfix/main.cf.dist` (Debian)

---

## main.cf — Key Parameters

```ini
myhostname = mail.example.com           # server hostname
mydomain = example.com                  # server domain
myorigin = $mydomain                    # sender domain in outgoing mail
mydestination = $mydomain, localhost.$mydomain, localhost  # accept mail for these
inet_interfaces = all                   # interfaces to listen on
inet_protocols = all                    # IPv4 and IPv6
mynetworks = 192.168.1.0/24, 127.0.0.0/8  # authorized relay clients
soft_bounce = no                        # test mode: defer instead of reject
```

### mynetworks_style (if mynetworks is not set manually):

| Value | Behavior |
|---|---|
| `subnet` | Trust clients from the same subnet (default) |
| `class` | Trust the entire A/B/C class network |
| `host` | Trust only the local machine |

### Canonical maps:

```ini
sender_canonical_maps = hash:/etc/postfix/sender_canonical    # rewrite sender only
recipient_canonical_maps = hash:/etc/postfix/recipient_canonical  # rewrite recipient only
```

> **Exam fact:** `sender_canonical_maps` changes only the sender address. `alias_maps` changes only the recipient. These are different!

---

## master.cf — Process Management

Each line describes one service. Line continuation uses indentation (whitespace at the start of the next line).

```
service  type  private  unpriv  chroot  wakeup  maxproc  command
```

```
smtp      inet  n       -       -       -       -       smtpd
pickup    unix  n       -       -       60      1       pickup
cleanup   unix  n       -       -       -       0       cleanup
qmgr      unix  n       -       n       300     1       qmgr
```

> **Exam fact:** Lines in master.cf continue via indentation (space/tab at start of next line) — NOT with a backslash.

> `chroot` field: default is `n` in Postfix >= 3.0, `y` in Postfix < 3.0.

---

## Aliases — /etc/aliases

Redirects mail from one address to another:

```
postmaster: root
root:       admin@example.com
webmaster:  john, mary
devnull:    /dev/null
```

```bash
newaliases        # regenerate aliases.db
# equivalent to:
sendmail -bi
```

> **Two aliases required in any configuration:** `mailer-daemon: postmaster` and `postmaster: root`.

---

## Virtual Domains

```ini
# main.cf
virtual_alias_domains = example.com, other.nl
virtual_alias_maps = hash:/etc/postfix/virtual
```

`/etc/postfix/virtual`:
```
postmaster@example.com   peter
info@other.nl            gerda
sales@example.com        petra
@example.com             jim       # catch-all: unmatched → jim
```

```bash
postmap /etc/postfix/virtual    # create virtual.db
postfix reload
```

> After every change to a lookup table: run `postmap`, then `postfix reload`.

---

## Lookup Tables

| Table | Purpose |
|---|---|
| `access` | Allow/deny SMTP hosts |
| `alias` | Redirect to local mailboxes |
| `canonical` | Rewrite addresses in headers |
| `relocated` | Old address → new address |
| `transport` | Domain → delivery method |
| `virtual` | Domains and recipients → local mailboxes |

```bash
postmap /etc/postfix/access    # compile text file to hash database
```

---

## Relay Configuration

```ini
relay_domains =               # don't relay for anyone (safest)
relay_domains = $mydomain     # relay only for own domain

relayhost =                   # direct delivery to internet
relayhost = mail.example.com  # route outgoing through ISP relay
```

> If `relay_domains` is too broad, the server becomes an **open relay** used for spam. Restrict with `mynetworks`.

---

## TLS in Postfix

`smtpd_tls_security_level` values:

| Value | Behavior |
|---|---|
| `none` | Don't announce STARTTLS |
| `may` | TLS available but not required (recommended per RFC 2487) |
| `encrypt` | TLS required — may block all incoming mail if remote doesn't support it |
| `dane` | Use TLSA DNS records (DANE) |

```bash
# Generate self-signed certificate (no key passphrase — Postfix requirement)
openssl req -nodes -x509 -newkey rsa:2048 \
  -keyout postfixkey.pem -out postfixcert.pem -days 356
```

```ini
# RSA (recommended)
smtpd_tls_cert_file = /etc/postfix/postfixcert.pem
smtpd_tls_key_file  = /etc/postfix/postfixkey.pem

# DSA
smtpd_tls_dcert_file = /etc/postfix/postfixcert.pem
smtpd_tls_dkey_file  = /etc/postfix/postfixkey.pem
```

> **`smtpd_tls_` vs `smtp_tls_`:** `smtpd_tls_` = server behavior (incoming). `smtp_tls_` = client behavior (outgoing). Don't mix them up.

```ini
smtpd_tls_CAfile = /etc/postfix/cacerts.pem   # single CA file
smtpd_tls_CApath = /etc/postfix/certs/         # CA directory
smtpd_tls_mandatory_exclude_ciphers = aNULL, MD5  # disable anonymous ciphers
```

TLS log levels (`smtpd_tls_loglevel`): 0=none, 1=handshake summary, 2=negotiation details, 3=hex dump, 4=full SMTP dump.

---

## Sendmail Emulation

Postfix includes sendmail-compatible commands:

| Command | Purpose | Native Postfix |
|---|---|---|
| `sendmail` | Send mail / accept from stdin | — |
| `mailq` | Show message queue | `postqueue -p` |
| `newaliases` | Rebuild aliases database | `postalias /etc/aliases` |
| `sendmail -bp` | Show queue | `mailq` |
| `sendmail -bi` | Rebuild aliases | `newaliases` |

---

## Sendmail Configuration

| File | Purpose |
|---|---|
| `/etc/mail/sendmail.cf` | Main config (generated via m4, never edit directly) |
| `/etc/mail/local-host-names` | Domains to accept mail for |
| `/etc/mail/access` | Allow/deny hosts (access.db) |
| `/etc/mail/virtusertable` | Virtual users and domains |
| `/etc/mail/aliases` | Aliases |
| `/etc/mail/mailertable` | Domain-based mail routing |
| `/etc/mail/genericstable` | Outgoing rewrite: local name → external domain |
| `/etc/mail/domaintable` | Old domain → new domain mapping |

```bash
m4 sendmail.mc > /etc/mail/sendmail.cf    # generate config
killall -HUP sendmail                     # reload
makemap hash /etc/mail/virtusertable < sourcefile
```

### /etc/mail/access actions:

| Action | Behavior |
|---|---|
| `OK` | Accept mail even if other rules reject it. Does NOT enable relay. |
| `RELAY` | Accept and allow relay. Includes OK. |
| `REJECT` | Reject with error message |
| `DISCARD` | Delete silently without notification |
| `SKIP` | Stop searching for this entry |

> **Key exam fact:** `OK` does not enable relay. `RELAY` enables relay and implicitly includes OK.

---

## Exim

Exim was developed at Cambridge. Configuration: `exim.conf`. Documentation: `man exim4-config_files`. For LPIC-2, awareness is sufficient.

---

## Postfix Utilities

| Utility | Purpose |
|---|---|
| `postfix` | Start, stop, reload, check |
| `postconf` | Read/modify main.cf |
| `postmap` | Create/query lookup tables |
| `postalias` | Work with aliases database |
| `postqueue` | Manage queue (view, flush) |
| `postsuper` | Delete, hold, requeue messages |
| `postcat` | View files from queue |

```bash
# postfix
postfix start / stop / reload / restart / check / status / flush

# postconf
postconf -n                              # explicitly configured parameters only
postconf -d                              # defaults only
postconf myhostname                      # show specific parameter
postconf -e 'myhostname = mail.x.com'   # change parameter
postconf -f                              # check syntax

# postmap
postmap /etc/postfix/virtual             # compile text → hash database
postmap -q user@example.com hash:/etc/postfix/virtual  # query table

# postqueue
postqueue -p                             # show queue (= mailq)
postqueue -f                             # flush deferred

# postsuper
postsuper -d ALL                         # delete all from queue
postsuper -d ALL deferred                # delete deferred only
postsuper -h ALL                         # put all on hold
postsuper -r ALL                         # requeue all

# postcat
postcat -q <ID>                          # show message by queue ID
```

---

## Exam Cheat Sheet

### Files and Paths

```
/etc/postfix/main.cf        main Postfix config
/etc/postfix/master.cf      process management
/etc/aliases                global aliases
/var/spool/postfix/         mail queue
/var/log/maillog            mail log
/etc/postfix/virtual        virtual domains
/etc/mail/sendmail.cf       sendmail config
/usr/share/postfix/main.cf.dist   sample config (Debian)
```

### Key Commands

```bash
postfix reload              # reload config
postfix check               # check config + file permissions
postconf -n                 # show non-default parameters only
postconf -e 'param = val'   # change parameter without editing file
postmap /etc/postfix/virtual  # compile lookup table
newaliases                  # rebuild aliases.db
mailq                       # show queue
postqueue -p                # same (native Postfix)
postsuper -d ALL            # delete all queued messages
```

### Common Exam Pitfalls

| Pitfall | Rule |
|---|---|
| After changing lookup table | Run `postmap`, then `postfix reload` |
| After changing `/etc/aliases` | Run `newaliases` |
| `relay_domains` vs `relayhost` | relay_domains = incoming relay; relayhost = outgoing relay |
| `sender_canonical_maps` | Rewrites sender only, not recipient |
| master.cf line continuation | Indentation (space/tab) — NOT backslash |
| TLS key passphrase | Postfix requires no passphrase on the private key |
| `smtpd_tls_` vs `smtp_tls_` | smtpd = incoming server; smtp = outgoing client |
| Sendmail `OK` vs `RELAY` | `OK` ≠ relay; `RELAY` = relay + OK |
| Required aliases | `mailer-daemon: postmaster` and `postmaster: root` |
