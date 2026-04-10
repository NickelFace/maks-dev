---
title: "LPIC-2 211.3 — Managing Mailbox Access"
date: 2026-04-10
description: "POP3 vs IMAP protocols, Courier MTA awareness, Dovecot IMAP/POP3 configuration (10-auth/10-mail/10-ssl/10-master.conf), auth mechanisms, maildir vs mbox, TLS setup, doveadm/doveconf utilities. LPIC-2 exam topic 211.3."
tags: ["Linux", "LPIC-2", "Dovecot", "Courier", "IMAP", "POP3", "email", "TLS"]
categories: ["LPIC-2"]
---

> **Exam topic 211.3** — Managing Mailbox Access (weight: 2). Covers configuring Dovecot IMAP/POP3, TLS setup, auth mechanisms, and Courier awareness.

---

## POP3 vs IMAP

| Characteristic | POP3 (Post Office Protocol v3) | IMAP (Internet Message Access Protocol) |
|---|---|---|
| Mail storage | Downloads to client, deletes from server (copy can be kept) | Mail stays on server |
| Multi-device access | Difficult: first device downloads messages | Fully supported |
| Status synchronization | No | Yes (read, flagged) |
| Data loss risk on client failure | Low (messages downloaded) | High (everything on server) |
| Server disk usage | Low | Requires space for all messages from all users |

Key difference: IMAP leaves the original on the server and downloads only a copy. POP3 takes the message from the server entirely — if a phone downloads mail via POP3, the computer won't see those messages.

---

## Courier

Courier is a full MTA with built-in ESMTP, IMAP, POP3, webmail, and mailing list support. In practice it is most often used for IMAP/POP3, not as the primary MTA. Courier is installed alongside Postfix or sendmail to add IMAP/POP3 support.

Courier stores mail in maildir format natively, but can also work with mbox.

```bash
# Debian/Ubuntu
apt-get install courier-imap courier-pop

# RHEL/CentOS
yum install courier-imap
yum install courier-pop
```

Configuration files: `/etc/courier/`

| File | Purpose |
|---|---|
| `authdaemonrc` | Authentication daemon settings |
| `imapd` | IMAP settings |
| `pop3d` | POP3 settings |

Mail queue: `/var/spool/mqueue`

Key configuration parameters:

| Parameter | Description |
|---|---|
| `ADDRESS` | IP address for incoming connections. 0 = listen on all interfaces |
| `PORT` | TCP port for incoming connections |
| `MAXDAEMONS` | Maximum number of client connections |
| `MAXPERIP` | Maximum connections per IP |
| `MAILDIRPATH` | Path to mail storage directory |

Default parameters in `imapd`:

| Parameter | Default | Description |
|---|---|---|
| `ADDRESS` | 0 | Listen IP. 0 = all interfaces |
| `PORT` | 143 | IMAP port |
| `MAXDAEMONS` | 40 | Maximum IMAP processes |
| `MAXPERIP` | 20 | Maximum connections per IP |
| `MAILDIRPATH` | Maildir | Mail directory name |
| `IMAPDSTART` | YES | Start IMAP on boot |

POP3 default port is 110; `MAXPERIP` defaults to 4.

For basic setup, set `MAILDIRPATH` in both files to match where the MTA delivers mail:

```
MAILDIRPATH=mail/inbox
```

```bash
systemctl restart courier-imap.service
systemctl restart courier-pop.service
```

Verify via telnet:

```bash
# IMAP (port 143)
telnet localhost 143
# exit:
a01 LOGOUT

# POP3 (port 110)
telnet localhost 110
# exit:
QUIT
```

> **Exam note:** For LPIC-2, Courier is awareness-only. Deep configuration is not tested.

---

## Dovecot

Dovecot is an open source IMAP and POP3 server for Linux/Unix, written with security as a primary focus. Primary specialization is IMAP, but POP3 is also supported.

Typical setup: Postfix receives and sends mail via SMTP; Dovecot distributes it to clients via IMAP or POP3. Roundcube can be added on top for a web interface.

```bash
# IMAP only
apt install dovecot-imapd

# POP3 only
apt install dovecot-pop3d

# Both protocols
apt install dovecot-pop3d dovecot-imapd
```

apt automatically pulls in `dovecot-core` and dependencies. After installation, Dovecot starts immediately but requires manual configuration before use.

Configuration files: `/etc/dovecot/conf.d/`

| File | Configures |
|---|---|
| `10-auth.conf` | Authentication mechanisms |
| `10-mail.conf` | Mailbox locations |
| `10-ssl.conf` | SSL/TLS parameters |
| `10-master.conf` | Listeners (ports and protocols) |

---

## Authentication

Dovecot supports these password backends:

- PAM (most common)
- BSDAuth
- LDAP
- passwd
- SQL: MySQL, PostgreSQL, SQLite

PAM configuration lives in `/etc/pam.d/`. Dovecot uses service name `dovecot` by default.

Example `/etc/pam.d/dovecot`:

```
#%PAM-1.0
@include common-auth
@include common-account
@include common-session
```

Auth mechanism is configured in `10-auth.conf` via `auth_mechanisms`.

**Plaintext mechanisms** (safe only over SSL/TLS):
- `PLAIN` — password sent in cleartext
- `LOGIN` — similar to PLAIN, used by some clients

**Non-plaintext (protected) mechanisms:**
- `CRAM-MD5`, `DIGEST-MD5`, `SCRAM-SHA1`, `SCRAM-SHA-256`
- `NTLM`, `GSSAPI`, `GSS-SPNEGO`
- `APOP`, `RPA`, `OTP`, `SKEY`, `ANONYMOUS`

> **Exam fact:** Non-plaintext mechanisms are incompatible with PAM. PAM can only verify a plaintext password that is passed to it. Non-plaintext mechanisms also do not work with DES or MD5 hashes.

> **Exam fact:** By default, only `PLAIN` is enabled.

Enable multiple mechanisms in `10-auth.conf`:

```
auth_mechanisms = plain login cram-md5
```

By default, Dovecot forbids plaintext authentication without TLS. To allow it:

```
disable_plaintext_auth = no
```

> Allowing plaintext without TLS is insecure — passwords transmit in cleartext. This only makes sense if encryption is guaranteed at another layer.

---

## Mailbox Location

Configured in `10-mail.conf` via `mail_location`.

maildir format:

```
mail_location = maildir:~/Maildir
```

mbox format:

```
mail_location = mbox:~/mail:INBOX=/var/mail/%u
```

`%u` substitutes the username. User john's mail is at `/var/mail/john` in mbox mode.

> Maildir is preferred over mbox: no locking issues, resistant to corruption, works on network filesystems.

maildir structure:
- `new/` — new unread messages
- `cur/` — read messages
- `tmp/` — temporary files during delivery

---

## SSL/TLS

SSL configuration is in `10-ssl.conf`.

Generate a self-signed certificate:

```bash
/usr/share/dovecot/mkcert.sh
```

The script creates:
- Certificate: `/etc/dovecot/dovecot.pem` (mode 0440)
- Key: `/etc/dovecot/private/dovecot.pem` (mode 0400, root only)

Minimum SSL configuration in `10-ssl.conf`:

```
ssl = required
ssl_cert = </etc/dovecot/dovecot.pem
ssl_key = </etc/dovecot/private/dovecot.pem
```

> `ssl = required` rejects connections without SSL/TLS. `ssl = yes` allows unencrypted connections.

Security hardening:

```
# Minimum protocol version (protection against POODLE)
ssl_min_protocol = TLSv1.2

# Cipher suite (protection against Logjam)
ssl_cipher_list = AES256+EECDH:AES256+EDH

# Prefer server ciphers over client (protection against downgrade)
ssl_prefer_server_ciphers = yes

# DH key length (protection against Logjam)
ssl_dh_parameters_length = 2048
```

`AES256+EECDH` — key exchange: Ephemeral Elliptic Curve Diffie-Hellman; encryption: AES-256.  
`AES256+EDH` — same, but with RSA instead of elliptic curves.

Alternative certificate generation via openssl:

```bash
openssl req -new -x509 -days 1000 -nodes \
  -out "/etc/dovecot/dovecot.pem" \
  -keyout "/etc/dovecot/private/dovecot.key"
```

Verify SSL connection:

```bash
openssl s_client -connect server1:995    # POP3S
openssl s_client -connect server1:imaps  # IMAPS
```

---

## Configuring Ports (10-master.conf)

Listeners are configured in `10-master.conf`. To enable only encrypted ports (IMAPS 993, POP3S 995):

```
service imap-login {
  inet_listener imap {
    port = 0        # disable unencrypted IMAP (143)
  }
  inet_listener imaps {
    port = 993
    ssl = yes
  }
}

service pop3-login {
  inet_listener pop3 {
    port = 0        # disable unencrypted POP3 (110)
  }
  inet_listener pop3s {
    port = 995
    ssl = yes
  }
}
```

`port = 0` disables the listener — the service will not accept connections on that port.

### Postfix Integration via UNIX Listener

When Dovecot works with real Linux system users (not virtual), add a UNIX socket in `10-master.conf` so Postfix can pass mail directly:

```
service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
```

```bash
systemctl restart dovecot
systemctl status dovecot
```

Verify ports are listening:

```bash
netstat -anp | egrep '993|995'
lsof -i | grep dovecot
```

Test POP3 session via telnet:

```bash
telnet 127.0.0.1 110
# Server responds: +OK Dovecot ready.

USER dpezet
# +OK
PASS mypassword
# +OK Logged in.

LIST
# +OK 1 messages

RETR 1
# +OK <message text>

QUIT
```

---

## doveadm

`doveadm` is the main Dovecot administration tool.

```bash
# Process management
doveadm reload                                        # reload config
doveadm stop                                          # stop

# Connection management
doveadm who                                           # list current users
doveadm kick user                                     # disconnect user

# Mailbox management
doveadm mailbox list -u user@example.com              # list folders
doveadm fetch -u user "subject" mailbox INBOX         # find messages
doveadm expunge -u user mailbox INBOX all             # delete all from INBOX
doveadm deduplicate -u user mailbox INBOX             # remove duplicates
doveadm backup -u user dsync://backup-server          # sync with remote server
doveadm copy -u user destmailbox Archive mailbox INBOX  # copy messages
doveadm move -u user destmailbox Archive mailbox INBOX  # move messages

# Diagnostics
doveadm log find                                      # find log file
doveadm penalty                                       # current rate-limiting penalties
doveadm stats                                         # mailbox statistics
```

---

## doveconf

`doveconf` reads all Dovecot configuration files and outputs final settings in simplified format. Useful for diagnostics without reading twenty files manually.

```bash
doveconf | less       # show all settings including defaults
doveconf -n           # show only non-default settings
```

Example `doveconf -n` output:

```
mail_location = maildir:~/mail/inbox
passdb {
  driver = pam
}
protocols = " imap pop3"
ssl = no
userdb {
  driver = passwd
}
```

---

## Include Syntax in dovecot.conf

Dovecot uses non-standard include syntax. The exclamation mark before `include` is part of the syntax, not negation:

```
!include conf.d/*.conf       # include all files from conf.d/
!include_try local.conf      # include if file exists (no error if missing)
```

Files from `conf.d/` are sorted by ASCII and read in that order. Files with smaller numeric prefix are processed first: `10-auth.conf` loads before `20-imap.conf`.

---

## Exam Cheat Sheet

### Ports

| Port | Protocol |
|---|---|
| 110 | POP3 |
| 143 | IMAP |
| 993 | IMAPS |
| 995 | POP3S |

### Files and Paths

| Path | Description |
|---|---|
| `/etc/courier/` | Courier config directory |
| `/etc/courier/authdaemonrc` | Courier authentication |
| `/etc/courier/imapd` | Courier IMAP settings |
| `/etc/courier/pop3d` | Courier POP3 settings |
| `/var/spool/mqueue` | Courier mail queue |
| `/etc/dovecot/conf.d/` | Dovecot config directory |
| `/etc/dovecot/conf.d/10-auth.conf` | Auth mechanisms |
| `/etc/dovecot/conf.d/10-mail.conf` | Mailbox location |
| `/etc/dovecot/conf.d/10-ssl.conf` | SSL/TLS |
| `/etc/dovecot/conf.d/10-master.conf` | Listeners/ports |
| `/etc/pam.d/dovecot` | Dovecot PAM config |
| `/usr/share/dovecot/mkcert.sh` | Certificate generation script |
| `/etc/dovecot/dovecot.pem` | SSL certificate (0440) |
| `/etc/dovecot/private/dovecot.pem` | SSL key (0400) |

### Key Configuration Parameters

| Parameter | File | Default |
|---|---|---|
| `auth_mechanisms` | 10-auth.conf | `plain` |
| `mail_location` | 10-mail.conf | distro-dependent |
| `ssl` | 10-ssl.conf | `yes` |
| `disable_plaintext_auth` | 10-auth.conf | `yes` |

### Common Exam Pitfalls

| Pitfall | Rule |
|---|---|
| Non-plaintext mechanisms + PAM | Incompatible — PAM can only verify plaintext passwords |
| Non-plaintext mechanisms + MD5/DES hashes | Also incompatible |
| `port = 0` | Disables the listener (does NOT set it to port 0) |
| Key permissions | 0400 (root only); certificate 0440 (world readable) |
| `ssl = required` vs `ssl = yes` | `required` = reject without TLS; `yes` = TLS optional |
| Restarting after install | Restart `dovecot`, not `dovecot-imapd` or `dovecot-pop3d` |
