---
title: "LPIC-2 212.4 — Security Tasks"
date: 2026-04-11
description: "GPG/OpenPGP key management, intrusion detection (fail2ban, portsentry), OpenSSL certificates, security auditing tools (nmap, lsof, fuser, netstat, arp), password hashing. LPIC-2 exam topic 212.4."
tags: ["Linux", "LPIC-2", "GPG", "OpenPGP", "fail2ban", "portsentry", "nmap", "lsof", "john", "OpenSSL", "security"]
categories: ["LPIC-2"]
---

> **Exam topic 212.4** — Security tasks (weight: 3). Covers GPG key management, intrusion detection, OpenSSL certificates, and security auditing tools.

---

## GPG — GNU Privacy Guard

GPG implements the OpenPGP standard (RFC 4880). Used for encrypting files and email, signing data, and verifying integrity.

### Key Concepts

| Term | Meaning |
|---|---|
| Public key | Shared with everyone; used to encrypt data sent to you or verify your signatures |
| Private key (secret key) | Keep secret; used to decrypt data or sign |
| Key ring | Collection of stored keys |
| Fingerprint | Short hash identifying a key; used to verify key authenticity |
| Web of Trust | OpenPGP trust model: keys are trusted transitively via signatures |
| Keyserver | Public server for distributing public keys |

### Key Management

```bash
# Generate key pair
gpg --gen-key
gpg --full-generate-key      # more options (key type, size, expiry)

# List keys
gpg --list-keys              # list public keys
gpg --list-secret-keys       # list private keys
gpg -k                       # shorthand for --list-keys
gpg -K                       # shorthand for --list-secret-keys

# Export / import
gpg --export -a "Alice" > alice.pub.asc         # export public key (ASCII armor)
gpg --export-secret-keys -a "Alice" > alice.sec.asc
gpg --import alice.pub.asc                      # import someone's public key

# Keyserver operations
gpg --keyserver keys.openpgp.org --send-keys <fingerprint>
gpg --keyserver keys.openpgp.org --recv-keys <fingerprint>
gpg --keyserver keys.openpgp.org --search-keys alice@example.com

# Delete keys
gpg --delete-key "Alice"             # delete public key
gpg --delete-secret-key "Alice"      # delete private key

# Edit key (change expiry, add UID, sign, etc.)
gpg --edit-key "Alice"
```

### Key Signing and Trust

```bash
gpg --sign-key alice@example.com      # sign Alice's key with your private key
# or interactively:
gpg --edit-key alice@example.com
gpg> sign
gpg> trust
gpg> quit
```

Trust levels: unknown → undefined → marginal → full → ultimate

### Encrypt and Decrypt

```bash
# Encrypt for recipient (uses their public key)
gpg --encrypt --recipient alice@example.com file.txt
# → creates file.txt.gpg

# Encrypt with ASCII armor (for email)
gpg -e -a -r alice@example.com file.txt
# → creates file.txt.asc

# Decrypt (uses your private key)
gpg --decrypt file.txt.gpg > file.txt
gpg -d file.txt.gpg

# Symmetric encryption (password only, no keys)
gpg --symmetric file.txt
gpg -c file.txt
```

### Sign and Verify

```bash
# Sign a file (creates detached signature)
gpg --detach-sign file.txt          # creates file.txt.sig
gpg --detach-sign -a file.txt       # ASCII armor: file.txt.asc

# Sign inline (signature embedded in file)
gpg --sign file.txt                 # creates file.txt.gpg

# Clear-sign (human-readable, signature appended)
gpg --clearsign message.txt         # creates message.txt.asc

# Verify signature
gpg --verify file.txt.sig file.txt
gpg --verify message.txt.asc
```

### Revocation

```bash
# Generate revocation certificate (do this right after key creation)
gpg --gen-revoke alice@example.com > revoke.asc

# Revoke a key
gpg --import revoke.asc
```

> **Exam fact:** Create a revocation certificate immediately after generating a key pair — if you lose access to the private key you cannot revoke it later.

### GPG Files

| Path | Contents |
|---|---|
| `~/.gnupg/` | GPG home directory (0700) |
| `~/.gnupg/pubring.kbx` | Public key ring (modern) |
| `~/.gnupg/trustdb.gpg` | Trust database |
| `~/.gnupg/private-keys-v1.d/` | Private keys |

---

## OpenSSL

OpenSSL provides SSL/TLS implementation and a general-purpose cryptography toolkit.

### Generate Keys and Certificates

```bash
# Generate RSA private key
openssl genrsa -out private.key 2048

# Generate private key with passphrase protection
openssl genrsa -aes256 -out private.key 2048

# Create self-signed certificate (key + cert in one step)
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout private.key -out certificate.crt -days 365

# Create CSR (Certificate Signing Request) from existing key
openssl req -new -key private.key -out request.csr

# Sign a CSR with a CA
openssl x509 -req -in request.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out signed.crt -days 365

# View certificate details
openssl x509 -in certificate.crt -text -noout

# Verify a certificate against a CA
openssl verify -CAfile ca.crt certificate.crt

# Check certificate expiry
openssl x509 -in certificate.crt -noout -dates

# Convert formats
openssl pkcs12 -export -in cert.crt -inkey key.pem -out bundle.p12   # PEM → PKCS12
openssl pkcs12 -in bundle.p12 -out cert.pem -nodes                   # PKCS12 → PEM
```

### Test SSL/TLS Connections

```bash
openssl s_client -connect host:443              # test HTTPS
openssl s_client -connect host:993              # test IMAPS
openssl s_client -starttls smtp -connect host:587  # test STARTTLS
```

---

## Intrusion Detection

### fail2ban

fail2ban monitors log files and bans IPs that show malicious behavior (too many failed logins).

```bash
apt install fail2ban
systemctl start fail2ban
systemctl enable fail2ban
```

Configuration:
- `/etc/fail2ban/jail.conf` — default config (do NOT edit)
- `/etc/fail2ban/jail.local` — local overrides (create this)
- `/etc/fail2ban/jail.d/` — drop-in config files

```ini
# /etc/fail2ban/jail.local
[DEFAULT]
bantime  = 3600       # ban duration in seconds (or 3600s, 1h, 1d)
findtime = 600        # time window to count failures
maxretry = 5          # number of failures before ban

[sshd]
enabled  = true
port     = ssh
logpath  = /var/log/auth.log
maxretry = 3
```

```bash
# Management
fail2ban-client status                 # show all active jails
fail2ban-client status sshd            # show sshd jail status (banned IPs)
fail2ban-client set sshd unbanip 1.2.3.4   # unban an IP
fail2ban-client reload                 # reload configuration
```

fail2ban uses **filters** (regex patterns in `/etc/fail2ban/filter.d/`) and **actions** (what to do when triggered, in `/etc/fail2ban/action.d/`). Default SSH action bans via iptables.

### portsentry

portsentry detects port scans and blocks the scanner. It listens on unused ports; any connection attempt signals a scan.

Config: `/etc/portsentry/portsentry.conf`

```bash
# Modes
portsentry -tcp      # TCP port scan detection
portsentry -udp      # UDP port scan detection
portsentry -atcp     # advanced TCP (bind to all unreserved ports)
portsentry -audp     # advanced UDP
```

Blocked hosts are added to `/etc/hosts.deny` or an iptables rule.

> **For LPIC-2:** Understand portsentry's purpose (port scan detection) and its main configuration file.

---

## Security Auditing Tools

### nmap — Network Scanner

```bash
# Basic scan (top 1000 ports)
nmap 192.168.1.100

# Scan all ports
nmap -p- 192.168.1.100

# Scan specific ports
nmap -p 22,80,443 192.168.1.100

# Service/version detection
nmap -sV 192.168.1.100

# OS detection
nmap -O 192.168.1.100

# Aggressive scan (OS, version, scripts, traceroute)
nmap -A 192.168.1.100

# Scan types
nmap -sS host    # SYN scan (stealth, default as root)
nmap -sT host    # TCP connect scan (full handshake)
nmap -sU host    # UDP scan
nmap -sP 192.168.1.0/24   # Ping scan (host discovery only)
nmap -sn 192.168.1.0/24   # No port scan (same as -sP in newer nmap)

# Scan a network
nmap 192.168.1.0/24

# Output to file
nmap -oN scan.txt host     # normal output
nmap -oX scan.xml host     # XML output
nmap -oG scan.gnmap host   # grepable output
```

### netstat / ss

```bash
# Show listening ports
netstat -tlnp       # TCP listening, numeric, with PID
netstat -ulnp       # UDP listening
netstat -anp        # all connections with PID
ss -tlnp            # modern equivalent to netstat -tlnp
ss -anp             # all sockets

# Show established connections
netstat -tn
ss -tn
```

### lsof — List Open Files

```bash
lsof                              # all open files
lsof -u alice                     # files opened by user alice
lsof -p 1234                      # files opened by PID 1234
lsof -i                           # all network connections
lsof -i :80                       # what's using port 80
lsof -i tcp                       # TCP connections only
lsof /var/log/auth.log            # who has this file open
lsof +D /tmp                      # all files under /tmp
```

### fuser — Find Processes Using Files/Sockets

```bash
fuser /var/log/messages           # PID of processes using this file
fuser -m /mnt/usb                 # all processes using this filesystem
fuser -k /var/log/messages        # kill processes using this file
fuser 80/tcp                      # PID using TCP port 80
fuser -n tcp 443                  # same, explicit namespace

# Signal
fuser -k -TERM 80/tcp             # send SIGTERM to process using port 80
```

### arp

```bash
arp -n                    # show ARP table (numeric)
arp -a                    # show in BSD format
arp -d 192.168.1.1        # delete ARP entry
arp -s 192.168.1.1 aa:bb:cc:dd:ee:ff   # add static ARP entry
```

---

## Password Security

### /etc/shadow — Password Hashing

The shadow file stores hashed passwords in the format:

```
user:$id$salt$hash:lastchange:min:max:warn:inactive:expire:
```

`$id$` identifies the hash algorithm:

| id | Algorithm |
|---|---|
| `$1$` | MD5 (obsolete, weak) |
| `$5$` | SHA-256 |
| `$6$` | SHA-512 (current standard) |
| `$y$` | yescrypt (modern, bcrypt-like) |
| `$2b$` | bcrypt |

```bash
# Check what algorithm is in use
grep username /etc/shadow | cut -d'$' -f2
```

### john — Password Cracker

John the Ripper tests password hashes against wordlists and brute force. Used for auditing password strength.

```bash
# Crack /etc/shadow (needs root)
john /etc/shadow

# Use a wordlist
john --wordlist=/usr/share/wordlists/rockyou.txt /etc/shadow

# Show cracked passwords
john --show /etc/shadow

# Crack specific hash formats
john --format=sha512crypt hashes.txt
```

> **For LPIC-2:** Know that john tests password strength by cracking. It is a legitimate auditing tool.

### chage — Password Aging

```bash
chage -l username              # list password aging info
chage -M 90 username           # max days before password change required
chage -m 7 username            # min days between changes
chage -W 14 username           # warn N days before expiry
chage -E 2026-12-31 username   # set account expiry date
chage -d 0 username            # force password change on next login
```

---

## File Integrity

### checksums

```bash
md5sum file.txt                    # generate MD5 checksum
md5sum -c checksums.md5            # verify checksums

sha256sum file.txt
sha256sum -c checksums.sha256

sha512sum file.txt
```

### Find SUID/SGID Files

```bash
# Find all SUID files
find / -perm -4000 -type f 2>/dev/null

# Find all SGID files
find / -perm -2000 -type f 2>/dev/null

# Find both
find / -perm /6000 -type f 2>/dev/null

# Find world-writable files
find / -perm -0002 -type f 2>/dev/null

# Find files with no owner
find / -nouser -o -nogroup 2>/dev/null
```

---

## Exam Cheat Sheet

### GPG Quick Reference

```bash
gpg --gen-key                          # generate key pair
gpg --list-keys                        # list public keys
gpg --export -a "user" > key.asc       # export public key
gpg --import key.asc                   # import key
gpg -e -r recipient file.txt           # encrypt
gpg -d file.txt.gpg                    # decrypt
gpg --detach-sign file.txt             # sign (detached)
gpg --verify file.txt.sig file.txt     # verify
gpg --gen-revoke user > revoke.asc     # create revocation cert
```

### Files and Paths

| Path | Description |
|---|---|
| `~/.gnupg/` | GPG home directory (0700) |
| `/etc/fail2ban/jail.conf` | fail2ban defaults (do not edit) |
| `/etc/fail2ban/jail.local` | fail2ban local overrides |
| `/etc/fail2ban/filter.d/` | fail2ban detection patterns |
| `/etc/fail2ban/action.d/` | fail2ban actions |
| `/etc/portsentry/portsentry.conf` | portsentry config |

### Common Exam Pitfalls

| Pitfall | Rule |
|---|---|
| `jail.conf` vs `jail.local` | Never edit `jail.conf`; create `jail.local` for overrides |
| GPG revocation cert | Must be created right after key generation |
| `$6$` in shadow | SHA-512 — current standard; `$1$` = MD5 (weak) |
| lsof vs fuser | `lsof` shows files per process; `fuser` shows processes per file |
| nmap `-sS` | Requires root (raw socket); `-sT` works as regular user |
| SUID find | `-perm -4000` (note the `-` before 4000 = "at least these bits set") |
