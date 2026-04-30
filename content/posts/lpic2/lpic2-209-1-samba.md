---
title: "LPIC-2 209.1 — Samba Server Configuration"
date: 2026-03-10
description: "Samba daemons (smbd/nmbd/winbindd), smb.conf structure, global directives, share configuration, security levels, passdb backends, ACLs, username mapping, mounting CIFS shares, WINS, AD domain join. LPIC-2 exam topic 209.1."
tags: ["Linux", "LPIC-2", "Samba", "SMB", "CIFS", "Winbind", "Active Directory", "file sharing"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-209-1-samba/"
page_lang: "en"
---

> **Exam topic 209.1** — Samba Server Configuration (weight: 5). Covers configuring Samba as a standalone file/print server or AD member server, access control, user management, and mounting SMB shares.

---

## What Is Samba

Samba implements the **SMB (Server Message Block)** protocol — Microsoft's protocol for file and printer sharing. Installing Samba on Linux allows Windows systems (and any SMB-capable client) to access Linux resources. Shared resources are called **shares** or **services**.

Samba operates in two main modes:
- **Standalone server** — independent, no domain
- **Member server** — participant in a Windows Active Directory domain

---

## Samba Daemons

| Daemon | Purpose |
|---|---|
| `smbd` | Manages SMB shares, file locking, user authentication. Always running on the server. |
| `nmbd` | Handles NetBIOS name requests and WINS. Needed in legacy mixed environments. |
| `winbindd` | Links Linux to a Windows domain controller. Required for AD or NT4 domain integration. |

```bash
systemctl start smbd nmbd
systemctl enable smbd nmbd
systemctl status smbd
```

> On an AD domain controller, do NOT run `smbd` separately. For member or standalone servers: run `smbd`, `nmbd`, `winbindd`. The `samba` service (not `smbd`) is only for AD DC.

---

## Configuration Files

| File | Purpose |
|---|---|
| `/etc/samba/smb.conf` | Main Samba configuration |
| `/etc/samba/smbpasswd` | Password database (legacy backend) |
| `/etc/samba/lmhosts` | NetBIOS hosts file |
| `/var/log/samba/` | Log directory |
| `/var/log/samba/log.smbd` | SMB daemon logs |
| `/var/log/samba/log.nmbd` | NetBIOS daemon logs |
| `/var/log/samba/log.%m` | Per-client log (`%m` = client NetBIOS name) |

---

## smb.conf Structure

`smb.conf` is divided into sections. Section names are in square brackets (case-insensitive). Comments start with `#` or `;`.

| Section | Purpose |
|---|---|
| `[global]` | Global server parameters (network, logging, security) |
| `[homes]` | Auto-creates a home directory share for each user |
| `[printers]` | Access to all server printers without per-printer sections |
| `[netlogon]` | DC directives for domain authentication responses |
| `[profiles]` | Roaming user profiles |
| `[share-name]` | Any custom share |

---

## Global Directives

```ini
[global]
    workgroup = FIREFLYGROUP         # Workgroup or domain name (not FQDN, uppercase)
    server string = Samba Server %v  # Server description
    netbios name = MYSERVER          # NetBIOS name (default = hostname)
    netbios aliases = MYALIAS        # Additional NetBIOS names
    realm = EXAMPLE.COM              # Kerberos realm for AD (uppercase only)
    interfaces = enp0s*              # Interfaces for Samba
    hosts allow = 192.168.1.0/24    # Allowed hosts (CIDR, hostname, space/comma-separated)
    hosts deny = 192.168.1.99       # Denied hosts
    disable netbios = no             # Disable NetBIOS (yes = nmbd won't start)
    wins support = no                # Enable WINS server (yes = act as WINS)
    smb ports = 445 139              # SMB ports
    log file = /var/log/samba/log.%m # Log file path
    max log size = 50                # Max log size (KB)
    security = user                  # Security level
    passdb backend = tdbsam          # Password storage backend
    username map = /etc/samba/username.map
    encrypt passwords = yes
    unix password sync = yes
    guest ok = no
    map to guest = Bad User          # Never / Bad User / Bad Password
```

> `workgroup` must contain a workgroup or Windows domain name — not a FQDN. Otherwise Windows systems won't find the server in Network Neighborhood.

> `%m` in log file path inserts the client's NetBIOS name — each client gets its own log file.

---

## smb.conf Macros

Samba supports macros that are dynamically substituted per connection:

| Macro | Substitutes |
|---|---|
| `%S` | Current service (share) name |
| `%U` | Session username |
| `%G` | Session user's primary group |
| `%u` | Current service user |
| `%g` | Current service user's primary group |
| `%H` | Home directory of `%u` |
| `%L` | Server's NetBIOS name |
| `%m` | Client machine's NetBIOS name |
| `%M` | Client machine's DNS name |
| `%I` | Client IP address |
| `%h` | Server hostname (DNS) |
| `%v` | Samba version |

```ini
server string = Linux Samba Server %L
log file = /var/log/samba/log.%m
path = /home/%S          # In [homes]: %S expands to username
```

> In the `[homes]` section, `%S` expands to the requested service name — i.e., the username. So `path = /home/%S` gives each user their own directory.

---

## Share Configuration

```ini
[ssharea]
    comment = Server Share A
    path = /srv/ssharea
    browseable = yes          # visible in share list
    public = no               # yes = no password; no = password required
    writable = yes            # equivalent to: read only = no
    read only = no            # antonym of writable
    valid users = alice bob @group   # allowed users/groups
    invalid users = baduser          # denied users (overrides valid users)
    write list = alice               # can write even if share is read-only
    guest ok = no
    create mask = 0644
    directory mask = 0755
    printable = no
    hosts allow = 192.168.2.0/24
    hosts deny = 192.168.2.99
```

### [homes] section — home directories:

```ini
[homes]
    comment = Home Directories
    path = /home/%S    # %S = username
    browseable = no    # hide from share list
    writable = yes
```

```bash
smbclient //sambaserver/alice -U alice   # access via username
smbclient //sambaserver/homes -U alice   # access via [homes] section
```

---

## Security Levels

### User-level security (recommended):

| Mode | Directive | Description |
|---|---|---|
| Standalone | `security = user` | Local password database on server |
| AD member | `security = ads` | Active Directory participant |
| NT4 domain | `security = domain` | Validated by NT4 PDC/BDC |

### Share-level security (deprecated):

```ini
security = share
```

Each share is protected by a password, not tied to a user. Removed in Samba 4. Know as a concept for the exam.

---

## Password Backends (passdb backend)

| Backend | Description |
|---|---|
| `smbpasswd` | Text file. Deprecated. No scaling, no Windows attributes. |
| `tdbsam` | Local TDB database. Stores Windows attributes. Recommended for standalone up to ~250 users. |
| `ldapsam` | LDAP backend. Needed for large environments. |

```ini
passdb backend = tdbsam
# or with explicit path:
passdb backend = tdbsam:/etc/samba/private/passdb.tdb
passdb backend = smbpasswd:/etc/samba/smbpasswd
passdb backend = ldapsam:ldap://localhost
```

---

## Samba Utilities

| Command | Purpose |
|---|---|
| `testparm` | Validate `smb.conf` syntax |
| `testparm -s` | Print config without prompt (for scripts) |
| `testparm -v` | Show all parameters including defaults |
| `smbstatus` | Show current connections and file locks |
| `smbpasswd -a username` | Add user to Samba database |
| `smbpasswd -x username` | Remove user from database |
| `pdbedit -L` | List Samba users |
| `pdbedit -L -v` | Detailed user list |
| `nmblookup hostname` | Resolve NetBIOS name to IP |
| `nmblookup -M workgroup` | Find master browser |
| `smbclient -L //server -U user` | List shares on server |
| `smbclient //server/share -U user` | Connect to share |
| `net -S server -U user share` | List shares via net |
| `net ads join -U admin` | Join AD domain |
| `net ads leave -U admin` | Leave AD domain |
| `net ads info` | AD domain info |
| `net rpc join -U admin` | Join NT4 domain |
| `wbinfo --ping-dc` | Check winbind connection to DC |
| `wbinfo -u` | List domain users |
| `wbinfo -g` | List domain groups |
| `smbd -b \| grep CONFIGFILE` | Find smb.conf path |
| `samba-tool` | Samba 4 administration tool (mainly for AD DC) |

---

## Mounting Samba Shares on Linux

### Modern method (cifs):

```bash
mount -t cifs //server/sharename /mnt/point \
  -o username=alice,password=secret

# Better: use credentials file
mount -t cifs //server/sharename /mnt/point \
  -o credentials=/etc/samba/credentials
```

`/etc/samba/credentials`:
```
username=alice
password=secret
```
```bash
chmod 600 /etc/samba/credentials
```

### Permanent mount via /etc/fstab:

```
//server/sharename  /mnt/point  cifs  credentials=/etc/samba/credentials,uid=1000,gid=1000,rw  0  0
```

### Legacy: smbmount (deprecated but on exam):

```bash
smbmount //windows/winshare2 /opt/winshare2 \
  -o username=alice.jones,password=Alice,uid=nobody,gid=nobody,fmask=775,dmask=775,rw,hard
```

`/etc/fstab` with smbfs:
```
//windows/winshare2  /opt/winshare2  smbfs  username=alice.jones,...  0  0
```

### Mount options:

| Option | Description |
|---|---|
| `username=` | Username for authentication |
| `password=` | Password (better to use credentials file) |
| `credentials=` | File with username and password |
| `uid=` | UID for local file representation |
| `gid=` | GID for local file representation |
| `fmask=` | Permissions for files (not a mask — actual permissions) |
| `dmask=` | Permissions for directories (not a mask — actual permissions) |
| `rw` / `ro` | Read-write or read-only |

---

## Username Mapping

When Samba server and Windows client usernames differ, configure a mapping file.

In `smb.conf` `[global]`:
```ini
username map = /etc/samba/username.map
```

File format:
```
# unix_username = client_username [client_username2 ...]
root = administrator admin
nobody = guest pcguest smbguest
alice.jones = alice
readonly = glen fred terry sarah
lachlan = "Lachlan Smith"    # spaces in client name — use quotes
users = @sales               # @group: all members of group sales
admin = *                    # * wildcard: any unknown user
!root = administrator        # ! — stop processing on match
```

Rules:
- `@group` — matches any member of a UNIX group
- `+group` — lookup via nsswitch
- `&group` — NIS lookup only
- `*` — wildcard, matches any unknown name
- `!` at start of line — stop processing on match

> Put the `*` wildcard line at the **end** of the file. If there's no `!` before it, all names will match the wildcard and subsequent lines won't be processed.

---

## WINS Server

WINS (Windows Internet Name Service) translates NetBIOS names to IP addresses via UDP requests.

```ini
[global]
    wins support = yes
```

```bash
service smb restart
service nmb restart
```

> There must be only **one** WINS server on the network. If `wins support = yes` is set, do NOT set `wins server` — this is a conflict.

---

## Logon Scripts

Logon scripts run when a user or client machine logs in. Typical use: mapping home directory as a network drive, connecting printers.

Scripts are Windows batch files. Each line must end with `\r\n` (Windows style).

```ini
[global]
    logon server = yes

[netlogon]
    comment = Netlogon for Windows clients
    path = /home/netlogon
    browseable = no
    guest ok = no
    writeable = no
    logon script = %U.bat    # script by username
    # logon script = %m.bat  # script by client machine name
```

---

## Joining an Active Directory Domain

### Prerequisites:

1. `/etc/resolv.conf` must point to the DC:
```
nameserver 192.168.1.2
search example.com
```

2. `/etc/hosts` must NOT resolve hostname to `127.0.0.1`:
```
192.168.1.3 server2.example.com server2
```

3. `/etc/krb5.conf` (minimal for Samba):
```ini
[libdefaults]
    default_realm = EXAMPLE.COM
    dns_lookup_realm = false
    dns_lookup_kdc = true
```

4. NTP must be synchronized on all domain participants.

### smb.conf for AD member server:

```ini
[global]
    security = ADS
    workgroup = EXAMPLE
    realm = EXAMPLE.COM           # uppercase always
    log file = /var/log/samba/%m.log
    log level = 1
    idmap config * : backend = tdb
    idmap config * : range = 3000-7999
```

### Join commands:

```bash
# AD domain:
net ads join -U administrator
# Output: Joined 'server2' to dns domain 'example.com'

# NT4 domain:
net rpc join -U administrator
# Output: Joined domain EXAMPLE.
```

### After joining:

```ini
# /etc/nsswitch.conf
passwd:  files winbind
group:   files winbind
```

```bash
systemctl start winbind smbd nmbd
wbinfo --ping-dc    # check DC connectivity
wbinfo -u           # list domain users
wbinfo -g           # list domain groups
```

---

## Samba Ports

| Port | Protocol | Description |
|---|---|---|
| 137 | UDP | NetBIOS name service |
| 138 | UDP | NetBIOS datagram service |
| 139 | TCP | NetBIOS session service (legacy SMB) |
| 445 | TCP | SMB over TCP (primary, no NetBIOS) |
| 389 | TCP/UDP | LDAP |
| 88 | TCP/UDP | Kerberos |
| 636 | TCP | LDAPS |

---

## Exam Cheat Sheet

### Files and Paths

| What | Where |
|---|---|
| Main config | `/etc/samba/smb.conf` |
| Legacy passwords | `/etc/samba/smbpasswd` |
| NetBIOS hosts | `/etc/samba/lmhosts` |
| Logs | `/var/log/samba/` |
| Username mapping | `/etc/samba/username.map` |
| Kerberos config | `/etc/krb5.conf` |

### Common Exam Pitfalls

| Pitfall | Rule |
|---|---|
| `wins support = yes` + `wins server = ...` | Conflict — use only one |
| `workgroup` | Not FQDN — use `WORKGROUP` not `workgroup.local` |
| `realm` | Always uppercase: `EXAMPLE.COM` not `example.com` |
| `writable = yes` | Same as `read only = no` |
| `public = yes` | No password needed |
| `invalid users` | Overrides `valid users` — denied even if in valid list |
| `smbmount` | Deprecated — use `mount -t cifs` |
| `fmask`/`dmask` | These are actual permissions, not masks (misleading names) |
| `testparm` | Checks syntax only, not operational correctness |
| `share-level security` | Removed in Samba 4 |
| `[homes]` without `path` | Uses system home directory |
| Explicit `[PrinterName]` | Has priority over `[printers]` |
| `samba-tool` | For AD DC only, not standalone |
| After smb.conf change | Run `testparm` first, then restart service |

### Security Levels Summary

| `security = ` | Use case |
|---|---|
| `user` | Standalone, local passwords |
| `ads` | Active Directory member |
| `domain` | NT4 domain member |
| `share` | Deprecated (removed in Samba 4) |

### passdb Backend Summary

| Backend | Best for |
|---|---|
| `tdbsam` | Standalone, up to ~250 users (recommended) |
| `ldapsam` | Large environments |
| `smbpasswd` | Legacy only — not recommended |
