---
title: "LPIC-2 212.2 — Managing FTP Servers"
date: 2026-04-11
description: "FTP active vs passive mode, vsftpd configuration, Pure-FTPd, ProFTPD, anonymous FTP, /etc/ftpusers, FTPS/TLS, FTP ports 20 and 21. LPIC-2 exam topic 212.2."
tags: ["Linux", "LPIC-2", "FTP", "vsftpd", "ProFTPD", "Pure-FTPd", "TLS"]
categories: ["LPIC-2"]
---

> **Exam topic 212.2** — Managing FTP Servers (weight: 2). Covers vsftpd configuration, anonymous FTP, access control, TLS, and awareness of Pure-FTPd and ProFTPD.

---

## FTP Protocol Basics

FTP uses two TCP connections:

| Connection | Port | Purpose |
|---|---|---|
| Control | 21 | Commands and responses (entire session) |
| Data | 20 (active) or ephemeral (passive) | Actual file transfer |

FTP sends credentials in cleartext — never use plain FTP over untrusted networks. Use FTPS (FTP + TLS) or SFTP (SSH file transfer, unrelated to FTP).

---

## Active vs Passive Mode

### Active Mode (PORT)

1. Client connects to server port 21 (control).
2. Client opens a random local port and sends its IP + port to server via `PORT` command.
3. **Server** initiates data connection from port 20 to the client's port.

Problem: firewalls/NAT on the client side block incoming connections from the server.

### Passive Mode (PASV)

1. Client connects to server port 21 (control).
2. Client sends `PASV` command.
3. **Server** opens a random high port and tells the client.
4. **Client** initiates data connection to the server's random port.

Passive mode is firewall-friendly because the client initiates both connections. Modern FTP clients use passive by default.

```
Active:  server → client (server initiates data connection)
Passive: client → server (client initiates both connections)
```

---

## vsftpd

**vsftpd** (Very Secure FTP Daemon) is the most common FTP server on Linux. Focus of LPIC-2 exam.

```bash
apt install vsftpd          # Debian/Ubuntu
yum install vsftpd          # RHEL/CentOS
systemctl start vsftpd
systemctl enable vsftpd
```

Configuration file: `/etc/vsftpd.conf`

### Key Parameters

```ini
# Basic
listen=YES                    # standalone mode (not via inetd)
listen_ipv6=NO                # set YES to listen on IPv6 (disables listen=YES)
anonymous_enable=YES          # allow anonymous login
local_enable=YES              # allow local system users
write_enable=YES              # enable write commands (STOR, DELE, etc.)
local_umask=022               # umask for uploaded files

# Banner
ftpd_banner=Welcome to FTP service.

# Chroot local users to their home directories
chroot_local_user=YES
chroot_list_enable=YES
chroot_list_file=/etc/vsftpd/chroot_list   # users in this list are NOT chrooted

# Logging
xferlog_enable=YES
xferlog_file=/var/log/vsftpd.log
xferlog_std_format=YES

# Passive mode port range
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=50000
pasv_address=203.0.113.5     # external IP (behind NAT)

# Connection limits
max_clients=100
max_per_ip=10
```

### Anonymous FTP

```ini
anonymous_enable=YES
anon_root=/var/ftp             # root directory for anonymous users
anon_upload_enable=YES         # allow anonymous uploads (also needs write_enable=YES)
anon_mkdir_write_enable=YES    # allow anonymous to create directories
anon_other_write_enable=YES    # allow anonymous to rename/delete
no_anon_password=YES           # skip password prompt for anonymous
```

Anonymous users log in as `ftp` or `anonymous`. The `ftp` system user must exist with its home directory set to `anon_root`.

```bash
mkdir -p /var/ftp/pub
chown root:root /var/ftp         # root owns the root dir (prevents vsftpd error)
chmod 755 /var/ftp
chown ftp:ftp /var/ftp/pub       # writable subdir for uploads
```

> **Security:** The anonymous FTP root directory must be owned by root, not ftp. If ftp owns it, vsftpd refuses to start (security check).

### Local Users

```ini
local_enable=YES
write_enable=YES
chroot_local_user=YES          # jail users to their home dir
```

With `chroot_local_user=YES`, users cannot navigate above their home directory. If their home is writable by them, vsftpd may refuse login (security check). Fix:

```bash
chmod a-w /home/user           # make home not writable by user
# or
allow_writeable_chroot=YES     # override the security check (less safe)
```

---

## Access Control Files

### /etc/ftpusers

Lists users who are **denied** FTP access. One username per line. Always exists — contains system accounts (root, daemon, bin, etc.) that should never log in via FTP.

```
root
daemon
nobody
```

> **Exam fact:** `/etc/ftpusers` is a **blacklist** — users listed here are DENIED access.

### /etc/vsftpd/user_list

Works differently depending on `userlist_deny`:

```ini
userlist_enable=YES
userlist_file=/etc/vsftpd/user_list
userlist_deny=YES    # (default) listed users are DENIED
userlist_deny=NO     # listed users are ALLOWED; everyone else denied (whitelist)
```

> **Exam fact:** `/etc/vsftpd/user_list` can act as either a blacklist (`userlist_deny=YES`) or whitelist (`userlist_deny=NO`). `/etc/ftpusers` is always a blacklist.

Both files can coexist. `user_list` is checked first; if the user is denied there, `ftpusers` is not consulted.

---

## FTPS — FTP over TLS

Two FTPS modes:

| Mode | Description | Port |
|---|---|---|
| Explicit FTPS (STARTTLS) | Client connects normally, then upgrades to TLS via `AUTH TLS` command | 21 |
| Implicit FTPS | TLS from the very start | 990 |

Explicit FTPS is more common and recommended.

vsftpd TLS configuration:

```ini
ssl_enable=YES
allow_anon_ssl=NO               # don't allow anonymous TLS (optional)
force_local_data_ssl=YES        # require TLS for data connections
force_local_logins_ssl=YES      # require TLS for login
ssl_tlsv1=YES
ssl_sslv2=NO
ssl_sslv3=NO

rsa_cert_file=/etc/ssl/certs/vsftpd.pem
rsa_private_key_file=/etc/ssl/private/vsftpd.pem
```

Generate a self-signed certificate:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/vsftpd.pem \
  -out /etc/ssl/certs/vsftpd.pem
```

---

## Pure-FTPd

Pure-FTPd is configured via command-line options or small files in `/etc/pure-ftpd/conf/`. Each option is a file containing its value.

```bash
apt install pure-ftpd
```

```bash
# Example: set passive port range
echo "40000 50000" > /etc/pure-ftpd/conf/PassivePortRange

# Enable TLS (1 = allow TLS, 2 = require TLS)
echo 1 > /etc/pure-ftpd/conf/TLS

# Virtual users
pure-pw useradd john -u ftpuser -d /home/john/ftp
pure-pw mkdb                   # compile virtual user database
```

> **For LPIC-2:** Pure-FTPd awareness is sufficient. Know it exists and that it uses `/etc/pure-ftpd/conf/`.

---

## ProFTPD

ProFTPD uses an Apache-style configuration file.

```
# /etc/proftpd/proftpd.conf
ServerName    "FTP Server"
ServerType    standalone
DefaultRoot   ~            # chroot users to home dir

<Anonymous /var/ftp>
  User         ftp
  Group        nogroup
  UserAlias    anonymous ftp
  MaxClients   10
  <Limit WRITE>
    DenyAll
  </Limit>
</Anonymous>
```

```bash
# Access control
/etc/proftpd/ftpusers       # denied users (same role as /etc/ftpusers)
```

> **For LPIC-2:** ProFTPD awareness is sufficient. Know it uses Apache-style config in `/etc/proftpd/proftpd.conf`.

---

## Testing FTP

```bash
# Connect via FTP client
ftp localhost
ftp> user anonymous
ftp> pass anything@test.com
ftp> ls
ftp> get file.txt
ftp> bye

# Test with lftp
lftp -u user,password ftp://server

# Test passive mode explicitly
ftp> passive
ftp> ls
```

---

## Exam Cheat Sheet

### Ports

| Port | Protocol |
|---|---|
| 20 | FTP data (active mode) |
| 21 | FTP control |
| 990 | Implicit FTPS |

### Files and Paths

| Path | Description |
|---|---|
| `/etc/vsftpd.conf` | vsftpd main configuration |
| `/etc/ftpusers` | Users denied FTP (blacklist, always active) |
| `/etc/vsftpd/user_list` | vsftpd user list (blacklist or whitelist) |
| `/var/log/vsftpd.log` | vsftpd transfer log |
| `/var/ftp` | Default anonymous FTP root |
| `/etc/proftpd/proftpd.conf` | ProFTPD configuration |
| `/etc/pure-ftpd/conf/` | Pure-FTPd configuration directory |

### Common Exam Pitfalls

| Pitfall | Rule |
|---|---|
| Active vs Passive | Active: server initiates data; Passive: client initiates data |
| `/etc/ftpusers` | Always a blacklist — no parameter to change this |
| `userlist_deny=NO` | user_list becomes a whitelist — everyone else is denied |
| Anonymous root ownership | Must be owned by root, not ftp, or vsftpd refuses to start |
| `chroot_local_user=YES` + writable home | vsftpd refuses login — fix with `allow_writeable_chroot=YES` or `chmod a-w` |
| FTPS vs SFTP | FTPS = FTP + TLS; SFTP = SSH subsystem — completely different protocols |
