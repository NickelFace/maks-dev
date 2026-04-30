---
title: "LPIC-2 212.3 — Secure Shell (OpenSSH)"
date: 2026-06-14
description: "OpenSSH client and server configuration, key-based authentication, ssh-keygen/ssh-agent/ssh-copy-id, port forwarding, X11 forwarding, SCP/SFTP, sshd_config hardening. LPIC-2 exam topic 212.3."
tags: ["Linux", "LPIC-2", "OpenSSH", "SSH", "SCP", "SFTP", "port forwarding", "X11"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-212-3-openssh/"
page_lang: "en"
---

> **Exam topic 212.3** — Secure shell (OpenSSH) (weight: 4). Covers SSH client and server configuration, key management, port forwarding, and X11 forwarding.

---

## OpenSSH Components

| Binary | Role |
|---|---|
| `ssh` | Client — connect to remote hosts |
| `sshd` | Server daemon — accepts incoming connections |
| `ssh-keygen` | Generate and manage key pairs |
| `ssh-agent` | Authentication agent (caches private keys) |
| `ssh-add` | Add keys to ssh-agent |
| `ssh-copy-id` | Copy public key to remote authorized_keys |
| `scp` | Secure copy (SSH-based file transfer) |
| `sftp` | Secure FTP subsystem over SSH |
| `ssh-keyscan` | Collect public keys from servers |

Default port: **22**

---

## Server Configuration — sshd_config

Main server config: `/etc/ssh/sshd_config`

```bash
systemctl restart sshd     # apply changes
systemctl reload sshd      # reload config without dropping connections
sshd -t                    # test config syntax
```

### Key Parameters

```ini
Port 22                          # listening port (can specify multiple Port lines)
ListenAddress 0.0.0.0            # listen on all IPv4 interfaces
ListenAddress ::                 # listen on all IPv6 interfaces

PermitRootLogin no               # disable root login (recommended)
# PermitRootLogin prohibit-password  # allow root only with key auth
# PermitRootLogin yes            # allow root with password (insecure)

PasswordAuthentication yes       # allow password auth (set no to force keys)
PubkeyAuthentication yes         # allow key-based auth
AuthorizedKeysFile .ssh/authorized_keys  # location of authorized keys

PermitEmptyPasswords no          # deny accounts with empty passwords
MaxAuthTries 3                   # max login attempts before disconnect
MaxSessions 10                   # max sessions per connection

UsePAM yes                       # use PAM for authentication

X11Forwarding yes                # allow X11 forwarding
AllowTcpForwarding yes           # allow port forwarding

# Restrict access to specific users/groups
AllowUsers alice bob             # only these users may log in
AllowGroups ssh-users            # only members of this group
DenyUsers mallory                # deny specific users
DenyGroups badgroup

# Idle timeout
ClientAliveInterval 300          # send keepalive every 300 seconds
ClientAliveCountMax 2            # disconnect after 2 missed keepalives

Banner /etc/issue.net            # show file contents before login

Subsystem sftp /usr/lib/openssh/sftp-server   # enable SFTP subsystem
```

> **Exam fact:** Changes to `sshd_config` require `systemctl reload sshd` (or `sshd -t` first to check syntax).

### PermitRootLogin values

| Value | Behavior |
|---|---|
| `yes` | Root can log in with password or key |
| `no` | Root cannot log in at all |
| `prohibit-password` | Root can log in with key only (no password) |
| `forced-commands-only` | Root can log in with key only if a forced command is specified |

---

## Client Configuration

Per-user config: `~/.ssh/config`  
System-wide config: `/etc/ssh/ssh_config`

```
# ~/.ssh/config
Host webserver
    HostName 192.168.1.100
    User deploy
    Port 2222
    IdentityFile ~/.ssh/deploy_key

Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ForwardAgent no
```

```bash
ssh webserver          # uses settings from ~/.ssh/config for "webserver"
```

### Common ssh Options

```bash
ssh -p 2222 user@host              # connect on port 2222
ssh -i ~/.ssh/mykey user@host      # use specific private key
ssh -l user host                   # specify username
ssh -v user@host                   # verbose (debug)
ssh -vv user@host                  # more verbose
ssh -o StrictHostKeyChecking=no    # skip host key check (unsafe, use with care)
```

---

## Key-Based Authentication

### Generate Key Pair

```bash
ssh-keygen -t ed25519 -C "alice@example.com"    # Ed25519 (modern, recommended)
ssh-keygen -t rsa -b 4096 -C "alice@example.com"    # RSA 4096-bit
ssh-keygen -t ecdsa -b 521                           # ECDSA
```

```
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/alice/.ssh/id_ed25519):
Enter passphrase (empty for no passphrase): ****
```

Generated files:
- `~/.ssh/id_ed25519` — private key (permissions must be 0600)
- `~/.ssh/id_ed25519.pub` — public key

> **Key types:** RSA is the traditional choice. Ed25519 is modern, shorter, and faster. DSA is obsolete and disabled in OpenSSH 7.0+.

### Copy Public Key to Server

```bash
ssh-copy-id user@server                              # copy default key
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server    # copy specific key
```

This appends the public key to `~/.ssh/authorized_keys` on the server.

Manual equivalent:

```bash
cat ~/.ssh/id_ed25519.pub | ssh user@server "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### authorized_keys

`~/.ssh/authorized_keys` — one public key per line. Permissions must be:
- `~/.ssh/` directory: **0700**
- `~/.ssh/authorized_keys`: **0600**
- owned by the user

```
# ~/.ssh/authorized_keys
ssh-ed25519 AAAAC3Nza... alice@laptop
# Restrict a key to one command only:
command="backup.sh",no-port-forwarding,no-x11-forwarding ssh-ed25519 AAAAC3Nza... backup@server
```

Key options (before the key type):
- `command="cmd"` — force a specific command when this key is used
- `no-port-forwarding` — disable port forwarding for this key
- `no-x11-forwarding` — disable X11 forwarding
- `no-agent-forwarding` — disable agent forwarding
- `from="192.168.1.*"` — allow this key only from matching IPs

### known_hosts

When connecting to a server for the first time, ssh saves its host key:
- `~/.ssh/known_hosts` — per-user
- `/etc/ssh/ssh_known_hosts` — system-wide

```bash
ssh-keyscan -H hostname >> ~/.ssh/known_hosts    # pre-populate
ssh-keygen -R hostname                           # remove host key (after server rebuild)
```

---

## ssh-agent

ssh-agent caches decrypted private keys so you don't need to enter the passphrase repeatedly.

```bash
eval "$(ssh-agent)"         # start agent and set env variables
ssh-add ~/.ssh/id_ed25519   # add key (prompts for passphrase once)
ssh-add -l                  # list cached keys
ssh-add -d ~/.ssh/id_ed25519  # remove key
ssh-add -D                  # remove all keys
```

**Agent Forwarding** — passes the agent connection through SSH so you can use your local keys on intermediate servers:

```bash
ssh -A user@jumphost         # forward agent to jumphost
```

```ini
# ~/.ssh/config
Host jumphost
    ForwardAgent yes
```

> **Security warning:** Agent forwarding is convenient but risky — anyone with root on the intermediate server can use your keys while you're connected.

---

## Port Forwarding (Tunneling)

### Local Port Forwarding (-L)

Opens a local port that forwards to a remote host/port via SSH:

```
ssh -L [local_addr:]local_port:remote_host:remote_port user@sshserver
```

```bash
# Access remote MySQL (3306) as if it were local
ssh -L 3307:localhost:3306 user@dbserver
# Now connect: mysql -h 127.0.0.1 -P 3307

# Access internal web server through SSH jump host
ssh -L 8080:internal-web:80 user@jumphost
# Now open: http://localhost:8080
```

### Remote Port Forwarding (-R)

Opens a port on the **remote** server that forwards back to a local host/port:

```
ssh -R [remote_addr:]remote_port:local_host:local_port user@sshserver
```

```bash
# Make local web server (port 80) accessible on remote server's port 8080
ssh -R 8080:localhost:80 user@remoteserver
# On remoteserver: curl http://localhost:8080 → reaches local port 80
```

Use case: expose a local service through a firewall (reverse tunnel).

### Dynamic Port Forwarding (-D)

Creates a SOCKS proxy:

```bash
ssh -D 1080 user@sshserver
# Configure browser to use SOCKS5 proxy localhost:1080
```

### -N and -f flags

```bash
ssh -N -L 3307:localhost:3306 user@server   # -N: don't execute a remote command
ssh -f -N -L 3307:localhost:3306 user@server  # -f: go to background
```

---

## X11 Forwarding

Allows running GUI applications on the remote server and displaying them locally.

**Server (`/etc/ssh/sshd_config`):**
```ini
X11Forwarding yes
X11DisplayOffset 10      # first display number to use (default: 10)
```

**Client:**
```bash
ssh -X user@server       # enable X11 forwarding
ssh -Y user@server       # trusted X11 forwarding (less secure, fewer restrictions)
```

```bash
# After connecting with -X:
firefox &                # opens Firefox window on your local display
```

`-X` = untrusted (safer, some apps may refuse to run)  
`-Y` = trusted (all X11 permissions granted)

---

## SCP — Secure Copy

```bash
# Copy local file to remote
scp file.txt user@host:/remote/path/

# Copy remote file to local
scp user@host:/remote/file.txt /local/path/

# Copy directory recursively
scp -r /local/dir/ user@host:/remote/dir/

# Use different port
scp -P 2222 file.txt user@host:/path/

# Preserve timestamps and permissions
scp -p file.txt user@host:/path/

# Specify key
scp -i ~/.ssh/mykey file.txt user@host:/path/
```

---

## SFTP — SSH File Transfer Protocol

SFTP is an SSH subsystem, not FTP over SSH. It provides a file transfer protocol that runs over SSH.

```bash
sftp user@host
sftp> ls
sftp> cd /remote/dir
sftp> get remotefile.txt
sftp> put localfile.txt
sftp> mkdir newdir
sftp> rm file.txt
sftp> bye
```

Restrict a user to SFTP only (no shell) via `sshd_config`:

```ini
Match User ftpuser
    ForceCommand internal-sftp
    ChrootDirectory /var/sftp/%u
    AllowTcpForwarding no
    X11Forwarding no
```

```bash
# /var/sftp/ftpuser must be owned by root
chown root:root /var/sftp/ftpuser
chmod 755 /var/sftp/ftpuser
# Create writable upload directory inside
mkdir /var/sftp/ftpuser/upload
chown ftpuser:ftpuser /var/sftp/ftpuser/upload
```

---

## Host Key Management

Server host keys are in `/etc/ssh/`:

```
/etc/ssh/ssh_host_rsa_key       (private, 0600)
/etc/ssh/ssh_host_rsa_key.pub   (public)
/etc/ssh/ssh_host_ed25519_key
/etc/ssh/ssh_host_ed25519_key.pub
```

Regenerate host keys (e.g., after cloning a VM):

```bash
rm /etc/ssh/ssh_host_*
dpkg-reconfigure openssh-server    # Debian
ssh-keygen -A                      # regenerate all missing host keys
```

---

## Exam Cheat Sheet

### Files and Paths

| Path | Description |
|---|---|
| `/etc/ssh/sshd_config` | SSH server configuration |
| `/etc/ssh/ssh_config` | SSH client defaults (system-wide) |
| `~/.ssh/config` | SSH client config (per-user) |
| `~/.ssh/id_ed25519` | Private key (0600) |
| `~/.ssh/id_ed25519.pub` | Public key |
| `~/.ssh/authorized_keys` | Allowed public keys for this user (0600) |
| `~/.ssh/known_hosts` | Trusted server host keys |
| `/etc/ssh/ssh_known_hosts` | System-wide trusted host keys |
| `/etc/ssh/ssh_host_*_key` | Server private host keys (0600) |

### Key Commands

```bash
ssh-keygen -t ed25519              # generate Ed25519 key pair
ssh-copy-id user@server            # install public key on server
ssh -L 3307:localhost:3306 user@db # local port forward
ssh -R 8080:localhost:80 user@srv  # remote port forward
ssh -D 1080 user@server            # SOCKS proxy
ssh -X user@server                 # X11 forwarding
scp file.txt user@host:/path/      # secure copy
```

### Common Exam Pitfalls

| Pitfall | Rule |
|---|---|
| `authorized_keys` permissions | Must be 0600; `~/.ssh/` must be 0700 |
| `-L` vs `-R` | `-L` = local port forwards to remote; `-R` = remote port forwards to local |
| `-X` vs `-Y` | `-X` = untrusted (safer); `-Y` = trusted (apps may need this) |
| SFTP vs FTP | SFTP is an SSH subsystem, not FTP over SSH — completely separate protocol |
| `PermitRootLogin prohibit-password` | Root can log in with key but not password |
| Reload vs restart | `reload` keeps connections alive; `restart` drops them |
| Host key mismatch | Edit `~/.ssh/known_hosts` or run `ssh-keygen -R hostname` |
| DSA keys | Disabled in OpenSSH 7.0+ — do not use |
