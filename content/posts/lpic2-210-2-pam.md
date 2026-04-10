---
title: "LPIC-2 210.2 — PAM Authentication"
date: 2026-04-10
description: "PAM module types (auth/account/password/session), control flags (required/requisite/sufficient/optional), pam_unix, pam_cracklib, pam_limits, pam_listfile, pam_ldap, SSSD with pam_sss, /etc/passwd and /etc/shadow structure, nsswitch.conf. LPIC-2 exam topic 210.2."
tags: ["Linux", "LPIC-2", "PAM", "authentication", "SSSD", "security"]
categories: ["LPIC-2"]
---

> **Exam topic 210.2** — PAM Authentication (weight: 3). Covers PAM module types, control flags, key PAM modules, `/etc/shadow` format, nsswitch.conf, and SSSD integration.

---

## What Is PAM

**PAM (Pluggable Authentication Modules)** is a set of libraries and APIs that gives applications a unified interface for authentication. Programs like `login` and `su` call the PAM API, and PAM handles where to verify the password — `/etc/shadow`, LDAP, or elsewhere.

```
App1  ─┐
App2  ─┤──► PAM ──► pam_unix.so  ──► /etc/passwd, /etc/shadow
App3  ─┘       └──► pam_ldap.so  ──► LDAP server
```

Without PAM, each application would have to implement its own authentication code for every method.

---

## Four Module Types

Every line in a PAM configuration belongs to one of four types:

| Type | Purpose |
|---|---|
| `auth` | Verifies the user is who they claim to be (password, token, etc.) |
| `account` | Checks account validity: password expiry, login allowed |
| `password` | Manages password changes |
| `session` | Actions at session open/close (logging, home directory mount, etc.) |

---

## Control Flags

The control flag determines what to do on module success or failure:

| Flag | On failure | On success |
|---|---|---|
| `requisite` | Immediately stops with denial | Continue processing |
| `required` | Records failure, continues checking other modules | Continue processing |
| `sufficient` | Continue processing | Immediately succeeds (if no prior `required` failures) |
| `optional` | Ignored if other modules exist | Ignored if other modules exist |

> **Key exam distinction:**
> - `requisite` — instant failure, processing stops immediately
> - `required` — records failure but continues all modules
> - `sufficient` — instant success on pass

---

## Configuration

### Two configuration methods:

**Method 1: single file `/etc/pam.conf`**

```
service  type  control  module-path  module-arguments
```

Example:
```
login  auth  required  pam_unix.so
```

**Method 2: directory `/etc/pam.d/` (recommended)**

Each service gets its own file named after the service: `/etc/pam.d/login`, `/etc/pam.d/sshd`, `/etc/pam.d/su`.

Same format but without the `service` field:
```
type  control  module-path  module-arguments
```

> If `/etc/pam.d/` directory exists, `/etc/pam.conf` is **completely ignored**.

> On Debian/Ubuntu, common settings are in shared files: `common-auth`, `common-account`, `common-password`, `common-session`. Service configs include them via `@include`.

### Example `/etc/pam.d/login`:

```bash
# Authentication via /etc/passwd and /etc/shadow
auth     required  pam_unix.so nullok

# Account state check (password expiry, etc.)
account  required  pam_unix.so

# Log session start and end
session  required  pam_unix.so

# Password change with min length 4, max 8
password required  pam_unix.so nullok obscure min=4 max=8
```

---

## pam_unix

The standard module. Works with `/etc/passwd` and `/etc/shadow`. Supports all four types.

### Useful arguments:

| Argument | Description |
|---|---|
| `nullok` | Allow empty passwords |
| `try_first_pass` | Try password from previous module, prompt only if it fails |
| `use_first_pass` | Use password from previous module, fail immediately if wrong |
| `use_authtok` | Use the password set by the previous module (for `password` type) |
| `remember=N` | Remember N last passwords, prevent reuse |
| `md5` | Use MD5 instead of crypt() |
| `debug` | Log via syslog |
| `audit` | Extended syslog logging |

The `session` type logs username and session type to syslog at start and end.

---

## pam_nis

Authentication via NIS (Network Information Service). NIS is considered legacy and transmits data in plaintext. Modern replacement: LDAP/SSSD.

```bash
# /etc/pam.d/login — NIS as primary, pam_unix as fallback
auth    sufficient pam_nis.so item=user sense=allow map=users.byname value=compsci
auth    required   pam_unix.so try_first_pass

account sufficient pam_ldap.so item=user sense=deny map=cancelled.byname error=expired
account required   pam_unix.so
```

---

## pam_ldap

Direct authentication via LDAP without SSSD. The `pam_ldap.so` module contacts the LDAP server directly.

```bash
# /etc/pam.d/login
auth    sufficient pam_ldap.so
auth    required   pam_unix.so try_first_pass

account sufficient pam_ldap.so
account required   pam_unix.so
```

> `pam_ldap.so` is simpler but doesn't cache data — if the server is unavailable, login fails. SSSD via `pam_sss.so` caches credentials and works offline.

---

## pam_cracklib

Checks the strength of new passwords against dictionaries, compares with old password, checks complexity.

```bash
password required pam_cracklib.so difok=3 minlen=15 dcredit=2 ocredit=2
password required pam_unix.so use_authtok nullok md5
```

| Argument | Description |
|---|---|
| `minlen=N` | Minimum password length |
| `difok=N` | Minimum N characters different from old password |
| `dcredit=N` | Credit for digits (reduces minlen requirement) |
| `ucredit=N` | Credit for uppercase letters |
| `ocredit=N` | Credit for special characters |
| `lcredit=N` | Credit for lowercase letters |

> `pam_cracklib.so` must come **before** `pam_unix.so` in the `password` block. Otherwise the password gets saved before the strength check.

---

## pam_limits

Sets resource limits for user sessions. Works for `uid=0` too.

Configuration from `/etc/security/limits.conf` and files in `/etc/security/limits.d/`.

```bash
session required pam_limits.so
```

Format of `/etc/security/limits.conf`:

```
# domain   type   item    value
*           soft   nofile  1024
*           hard   nofile  4096
@students   hard   nproc   20
john        hard   cpu     300
```

Limit types: `soft` (user can raise up to hard), `hard` (only root can change).

Common `item` values:
- `nofile` — open file count
- `nproc` — process count
- `cpu` — CPU time in minutes
- `maxlogins` — maximum concurrent sessions

---

## pam_listfile

Allows or denies access based on a text file list. One entry per line.

```bash
auth required pam_listfile.so \
  item=user sense=allow file=/etc/allowed_users onerr=fail
```

| Parameter | Description |
|---|---|
| `item` | What to check: `user`, `tty`, `rhost`, `ruser`, `group`, `shell` |
| `sense` | `allow` — allow only those in list; `deny` — deny those in list |
| `file` | Path to the list file |
| `onerr` | What to do on file read error: `succeed` or `fail` |

---

## /etc/passwd and /etc/shadow

`/etc/passwd` — public account information:
```
username:x:UID:GID:GECOS:home_dir:shell
```
The `x` field means the password is stored in `/etc/shadow`.

`/etc/shadow` — protected file with password hashes (root-only):
```
username:$6$salt$hash:lastchg:min:max:warn:inactive:expire:
```

Shadow fields:

| Field | Description |
|---|---|
| `lastchg` | Last password change (days since 1970-01-01) |
| `min` | Minimum password age in days |
| `max` | Maximum password age in days |
| `warn` | Days before expiry to warn |
| `inactive` | Days after expiry before lockout |
| `expire` | Account expiration date |

Hash type prefix: `$1$` = MD5, `$5$` = SHA-256, `$6$` = SHA-512.

---

## nsswitch.conf

`/etc/nsswitch.conf` defines the order of data sources for various system databases. PAM uses it when checking users.

```
passwd:   files ldap
shadow:   files
group:    files ldap
hosts:    files dns
```

`passwd: files ldap` means: first look in `/etc/passwd`, then LDAP.

With SSSD:
```
passwd:   files sss
group:    files sss
shadow:   files sss
```

---

## SSSD and LDAP

**SSSD (System Security Services Daemon)** is a middleware between PAM/NSS and network directories (LDAP, Active Directory). It caches credentials, allowing login even without network access.

PAM connects to SSSD via `pam_sss.so`.

### SSSD setup for LDAP:

```bash
# Install (RHEL/CentOS)
yum install sssd sssd-ldap authconfig

# Configure via authconfig
authconfig \
  --enablesssd \
  --enablesssdauth \
  --enableldap \
  --enableldapauth \
  --ldapserver=ldap://ldap.example.com:389 \
  --ldapbasedn=dc=example,dc=com \
  --enablerfc2307bis \
  --enablemkhomedir \
  --enablecachecreds \
  --update
```

### `/etc/sssd/sssd.conf`:

```ini
[sssd]
services = nss, pam
config_file_version = 2
domains = LDAP

[domain/LDAP]
id_provider = ldap
auth_provider = ldap
ldap_uri = ldap://ldap.example.com:389
ldap_search_base = dc=example,dc=com
ldap_tls_cacertdir = /etc/pki/tls/cacerts
cache_credentials = true
```

```bash
chmod 600 /etc/sssd/sssd.conf    # required!
systemctl enable --now sssd
```

### PAM configuration for SSSD:

```bash
# /etc/pam.d/system-auth
auth     sufficient pam_sss.so
auth     required   pam_unix.so try_first_pass
account  required   pam_unix.so
account  sufficient pam_sss.so
password sufficient pam_sss.so use_authtok
session  optional   pam_sss.so
```

### Auto-create home directory on first login:

```bash
session optional pam_mkhomedir.so skel=/etc/skel umask=077
```

---

## Exam Cheat Sheet

### Files and Paths

| Path | Purpose |
|---|---|
| `/etc/pam.conf` | Unified PAM config (if `/etc/pam.d/` doesn't exist) |
| `/etc/pam.d/` | Per-service config directory |
| `/etc/passwd` | Public account information |
| `/etc/shadow` | Password hashes (root only) |
| `/etc/nsswitch.conf` | NSS source order |
| `/etc/security/limits.conf` | Resource limits for pam_limits |
| `/etc/security/limits.d/` | Additional limits files |
| `/etc/sssd/sssd.conf` | SSSD configuration (must be chmod 600) |

### PAM Module Directory

| Distribution | Path |
|---|---|
| Debian/Ubuntu (64-bit) | `/lib/x86_64-linux-gnu/security/` |
| RHEL/CentOS/Fedora | `/lib64/security/` |
| Universal (legacy) | `/lib/security/` |

### Key Modules

| Module | Purpose |
|---|---|
| `pam_unix.so` | `/etc/passwd` and `/etc/shadow` |
| `pam_cracklib.so` | Password strength checking |
| `pam_limits.so` | Resource limits from `/etc/security/limits.conf` |
| `pam_listfile.so` | Allow/deny by file list |
| `pam_ldap.so` | Direct LDAP authentication (no SSSD) |
| `pam_sss.so` | Authentication via SSSD |
| `pam_deny.so` | Always denies (safe fallback) |
| `pam_mkhomedir.so` | Creates home on first login |

### Control Flags Summary

| Flag | Failure | Success |
|---|---|---|
| `requisite` | Immediate stop + deny | Continue |
| `required` | Mark failure, continue | Continue |
| `sufficient` | Continue | Immediate stop + allow |
| `optional` | Ignored | Ignored |

### Config Line Format

```
# /etc/pam.conf
service  type  control  /lib/security/module.so  [args]

# /etc/pam.d/service_name
type  control  /lib/security/module.so  [args]
```

### Common Pitfalls

| Pitfall | Rule |
|---|---|
| `pam.conf` + `pam.d/` together | `pam.d/` completely overrides `pam.conf` |
| Missing 600 on sssd.conf | SSSD won't start |
| `pam_unix` before `pam_cracklib` in password block | Password saved before strength check |
| Forgetting `pam_sss.so` in all four types | SSSD partially won't work |
