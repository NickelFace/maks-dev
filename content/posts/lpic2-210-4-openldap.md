---
title: "LPIC-2 210.4 — Configuring an OpenLDAP Server"
date: 2026-04-10
description: "OpenLDAP slapd configuration (slapd.conf vs slapd-config/LDIF), distinguished names, server utilities (slapadd/slapcat/slapindex/slappasswd), ACL, TLS setup, client integration with NSLCD and PAM. LPIC-2 exam topic 210.4."
tags: ["Linux", "LPIC-2", "OpenLDAP", "LDAP", "slapd", "directory server"]
categories: ["LPIC-2"]
---

> **Exam topic 210.4** — Configuring an OpenLDAP Server (weight: 4). Covers installing and configuring the slapd daemon, managing the LDAP database, access control, TLS, and integrating Linux clients.

---

## What Is OpenLDAP

OpenLDAP is the most popular LDAP implementation in the Linux world. The main server process, **`slapd` (Standalone LDAP Daemon)**, listens on port **389** by default. Primary use case: centralized user authentication in a Linux network — the Linux equivalent of Microsoft Active Directory.

LDAP is optimized for **frequent reads and infrequent writes**.

---

## LDAP Directory Structure

The directory is built as a hierarchical tree similar to DNS:

```
dc=example,dc=com
    ├── ou=People
    │     ├── uid=alice
    │     └── uid=bob
    └── ou=Groups
          └── cn=admins
```

### Object types:

- **User accounts** — for authentication and Unix logins
- **Organizational Units (ou)** — folders for grouping objects by department, country, type
- **Groups** — for access rights assignment
- **Computers** — asset inventory
- **Contacts / Email directories** — address books

### LDAP abbreviations:

| Abbreviation | Full name | Example |
|---|---|---|
| `cn` | Common Name | `cn=admin` |
| `dc` | Domain Component | `dc=example`, `dc=com` |
| `ou` | Organizational Unit | `ou=users` |
| `uid` | User ID | `uid=jdoe` |
| `o` | Organization | `o=MyCompany` |
| `sn` | Surname | `sn=Doe` |
| `c` | Country | `c=US` |
| `dn` | Distinguished Name | full path to object |

> LDAP uses camelCase for object classes: `inetOrgPerson`, `posixAccount`, `organizationalUnit`.

---

## Installation

```bash
# Debian/Ubuntu
apt install slapd ldap-utils

# Red Hat/CentOS
yum install openldap-servers openldap-clients
```

After installation, `slapd` starts automatically with minimal configuration. For interactive reconfiguration:

```bash
dpkg-reconfigure slapd
```

View current configuration:
```bash
slapcat
```

Open port 389 in UFW:
```bash
ufw allow ldap
```

---

## Distinguished Names

**DN (Distinguished Name)** uniquely identifies an entry in the tree. It starts with the most specific attribute and moves to more general ones:

```
uid=donpezet,ou=users,dc=lpiclab,dc=com
```

**RDN (Relative Distinguished Name)** — the leftmost component of the DN, identifying an entry among siblings.

If a name contains a comma, it must be escaped:
```
CN=Supergroup,O=Crosby\, Stills\, Nash and Young,C=US
```

---

## slapd Configuration

OpenLDAP supports two configuration methods.

### Method 1: slapd.conf (legacy)

All configuration in a single text file `/etc/slapd.conf` (or `/etc/openldap/slapd.conf`). Three minimum directives required:

```
suffix          "dc=example,dc=com"
rootdn          "cn=Manager,dc=example,dc=com"
rootpw          {SHA}<password-hash>
directory       /var/lib/ldap
```

- `suffix` — LDAP tree root (usually the organization's domain name)
- `rootdn` — account with full rights to the entire directory
- `rootpw` — admin password (stored encrypted in modern versions)

> `slapd.conf` is deprecated since OpenLDAP 2.3. Know both methods for the exam.

### Method 2: slapd-config (current)

Since OpenLDAP 2.3, configuration is stored as LDIF files in `/etc/openldap/slapd.d/`. These files **must not be edited manually** — only via `ldapadd`, `ldapdelete`, `ldapmodify`. Key advantage: changes apply **without restarting slapd**.

`slapd.d` directory structure:
```
/etc/openldap/slapd.d/
├── cn=config/
│   ├── cn=module{0}.ldif
│   ├── cn=schema/
│   │   ├── cn={0}core.ldif
│   │   ├── cn={1}cosine.ldif
│   │   └── cn={2}inetorgperson.ldif
│   ├── olcDatabase={0}config.ldif
│   └── olcDatabase={1}hdb.ldif
└── cn=config.ldif
```

Database configuration LDIF example:
```ldif
dn: olcDatabase=hdb,cn=config
objectClass: olcDatabaseConfig
objectClass: olcHdbConfig
olcDatabase: hdb
olcSuffix: dc=example,dc=com
olcRootDN: cn=Manager,dc=example,dc=com
olcRootPW: {SSHA}xEleXlHqbSyi2FkmObnQ5m4fReBrjwGb
olcDbDirectory: /var/lib/ldap
```

### olcLogLevel values:

| Level | Name | Description |
|---|---|---|
| 1 | trace | Function calls |
| 8 | conns | Connection management |
| 32 | filter | Search filter processing |
| 128 | ACL | ACL processing |
| 256 | stats | Connection and operation statistics |
| 32768 | none | Critical messages only |

```ldif
olcLogLevel: -1       # maximum logging
olcLogLevel: stats    # recommended for production
olcLogLevel: conns filter    # connections and filters only
```

### Key slapd-config attributes:

| Attribute | Purpose |
|---|---|
| `olcSuffix` | LDAP tree root |
| `olcRootDN` | Admin DN |
| `olcRootPW` | Admin password |
| `olcDbDirectory` | Database file path |
| `olcAccess` | ACL rules |
| `olcLogLevel` | Logging level |

---

## LDIF Format

LDIF (LDAP Data Interchange Format) — text format for working with the directory. Records are separated by blank lines. Comment lines start with `#`.

```ldif
# Comment
dn: cn=John Doe,dc=example,dc=com
cn: John Doe
objectClass: person
sn: Doe
```

> A trailing space at the end of a line is treated as part of the attribute value — imports fail with cryptic errors.

### changetype operations:

| changetype | Action |
|---|---|
| `add` | Add new entry |
| `delete` | Delete entry |
| `modify` | Modify entry attributes |
| `modrdn` | Rename entry |

```ldif
# Modify example
dn: uid=alice,ou=People,dc=example,dc=com
changetype: modify
replace: telephoneNumber
telephoneNumber: +1-555-9999
-
add: mail
mail: alice@example.com
```

---

## Creating Objects

### Organizational Units (first):

```ldif
dn: ou=users,dc=lab,dc=example,dc=com
objectClass: organizationalUnit
ou: users

dn: ou=groups,dc=lab,dc=example,dc=com
objectClass: organizationalUnit
ou: groups
```

```bash
ldapadd -x -D "cn=admin,dc=lab,dc=example,dc=com" -W -f ou.ldif
```

### User accounts:

```ldif
dn: uid=jdoe,ou=users,dc=lab,dc=example,dc=com
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
cn: John Doe
sn: Doe
uid: jdoe
userPassword: {SSHA}hash
loginShell: /bin/bash
uidNumber: 10001
gidNumber: 10001
homeDirectory: /home/jdoe
```

### Groups:

```ldif
dn: cn=jdoe,ou=groups,dc=lab,dc=example,dc=com
objectClass: posixGroup
cn: jdoe
gidNumber: 10001
```

---

## Server Utilities

Work directly with database files. **slapd must be stopped** before running these.

### slapadd

Adds objects directly to the database from an LDIF file:

```bash
systemctl stop slapd
slapadd -l users.ldif
systemctl start slapd
```

### slapcat

Exports database contents to LDIF (backup, inspection):

```bash
slapcat               # output to screen
slapcat -l all.ldif   # save to file
```

### slapindex

Rebuilds database indexes (needed after manual database file changes):

```bash
systemctl stop slapd
slapindex             # rebuild all
slapindex uid         # rebuild specific attribute index
systemctl start slapd
```

### slappasswd

Generates an encrypted password hash for use in LDIF files and configuration:

```bash
slappasswd
# Enter password twice → returns: {SSHA}hash
```

---

## Access Control (ACL)

By default, all clients can read the directory. The `olcRootDN` user always has full rights regardless of ACL settings.

Access to attributes is controlled by `olcAccess`. Rules are evaluated in order — first match wins.

```ldif
# Protect passwords
olcAccess: to attrs=userPassword
  by self write
  by anonymous auth
  by * none

# Allow users to edit their own data
olcAccess: to *
  by self write
  by users read
  by * none
```

- `by self write` — user can change their own password
- `by anonymous auth` — anonymous users can authenticate (hash comparison) but can't read the password
- `by * none` — everyone else is denied

> ACL rules are read top-to-bottom. If no rule matches, access is denied by default.

---

## Schemas and Object Classes

A **schema** defines allowed `objectClass` values and attributes.

- **Object ID** — numeric identifier, assigned once
- **Attribute** — specific value attached to an object
- **Object class** — template with a set of attributes

The most popular schema: **`inetOrgPerson`** — implements "White Pages": names, addresses, email, phones.

Schema files: `/etc/openldap/schema/`
- `core.ldif`, `cosine.ldif`, `inetorgperson.ldif`, `nis.ldif`

> An object can belong to multiple `objectClass` at once. `objectClass: top` is required for all objects.

### Three objectClasses for a Unix user:

| objectClass | Purpose |
|---|---|
| `inetOrgPerson` | Personal data (cn, mail, phone) |
| `posixAccount` | Unix data (uid, gid, shell, homeDirectory) |
| `shadowAccount` | Shadow password attributes |

---

## TLS in OpenLDAP

By default, OpenLDAP transmits data in plaintext. TLS is added via **SASL** (Simple Authentication and Security Layer).

### Three required TLS files:

1. CA certificate (trusted by the server)
2. Server private key
3. Server public certificate (distributed to clients)

### Generating certificates:

```bash
# Step 1: Generate private key
openssl genrsa -aes128 -out openldap.key 2048

# Remove passphrase (required for automatic startup)
openssl rsa -in openldap.key -out openldap.key

# Step 2: Create CSR
openssl req -new -days 7300 -key openldap.key -out openldap.csr
# Common Name must match the LDAP server's hostname

# Step 3: Self-signed certificate
openssl x509 -req -in openldap.csr \
  -out openldap.crt -signkey openldap.key -days 7300
```

### Place certificates:

```bash
cp openldap.key openldap.crt /etc/ldap/sasl2/
cp /etc/ssl/certs/ca-certificates.crt /etc/ldap/sasl2/
chown openldap: /etc/ldap/sasl2/*
```

### Apply TLS via LDIF:

```ldif
dn: cn=config
changetype: modify
replace: olcTLSCACertificateFile
olcTLSCACertificateFile: /etc/ldap/sasl2/ca-certificates.crt
-
replace: olcTLSCertificateFile
olcTLSCertificateFile: /etc/ldap/sasl2/openldap.crt
-
replace: olcTLSCertificateKeyFile
olcTLSCertificateKeyFile: /etc/ldap/sasl2/openldap.key
```

```bash
# Apply via SASL EXTERNAL (local socket, requires root)
ldapmodify -Y EXTERNAL -H ldapi:/// -f tls.ldif

systemctl restart slapd
```

> `-Y EXTERNAL` uses SASL authentication via socket (local only). `ldapi:///` = Unix socket connection.

---

## Linux Client Integration

A Linux client doesn't know about OpenLDAP by default. Two components are needed:

**PAM** — `pam_ldap` module connects PAM to the LDAP server for login authentication.

**NSLCD** (Name Service LDAP Connection Daemon) — background process that performs name lookups via LDAP.

### Install client packages:

```bash
apt install libnss-ldapd libpam-ldapd ldap-utils
```

The installer wizard asks:
1. LDAP server IP/hostname (multiple for redundancy)
2. Base DN (e.g. `dc=lpiclab,dc=com`)
3. Services for LDAP lookup: select `passwd`, `shadow`, `group`

### Auto-create home directories:

Add to `/etc/pam.d/common-session`:
```
session optional pam_mkhomedir.so skel=/etc/skel umask=077
```

### Enable TLS in NSLCD:

Add to `/etc/nslcd.conf`:
```
ssl start_tls
tls_reqcert allow
```

```bash
systemctl restart nslcd
```

---

## Exam Cheat Sheet

### Key Paths

| Path | Purpose |
|---|---|
| `/etc/openldap/slapd.conf` | Legacy configuration file |
| `/etc/openldap/slapd.d/` | Current slapd-config directory (LDIF files) |
| `/var/lib/ldap/` | OpenLDAP database files |
| `/etc/openldap/schema/` | Schema files |
| `/etc/ldap/sasl2/` | TLS certificates |
| `/etc/ldap/ldap.conf` | LDAP client configuration (Debian) |
| `/etc/openldap/ldap.conf` | LDAP client configuration (Red Hat) |
| `/etc/nslcd.conf` | NSLCD daemon config (client) |

### Key Commands

```bash
slappasswd                                          # generate password hash
slapcat                                             # export database to LDIF
slapcat -l all.ldif                                 # export to file
slapadd -l file.ldif                                # import (slapd stopped!)
slapindex                                           # rebuild indexes (slapd stopped!)
dpkg-reconfigure slapd                              # interactive reconfiguration
ldapadd -x -D "cn=admin,dc=..." -W -f file.ldif    # add objects
ldapmodify -x -D "cn=admin,dc=..." -W -f mod.ldif  # modify objects
ldapdelete -x -D "cn=admin,dc=..." -W "dn=..."     # delete object
ldapsearch -x -b "dc=..." "(filter)"               # search
ldappasswd -x -D "cn=admin,dc=..." -W -s pass "dn" # change password
# Apply TLS config via socket:
ldapmodify -Y EXTERNAL -H ldapi:/// -f tls.ldif
```

### Key Exam Facts

| Fact | Detail |
|---|---|
| slapd daemon | OpenLDAP server, port 389 |
| slapd.conf | Legacy method, deprecated since 2.3 |
| slapd-config | Current method, `/etc/slapd.d/`, LDIF-based |
| slapd.d files | Cannot be edited manually — use ldapmodify |
| slapadd vs ldapadd | `slapadd` = direct DB (server stopped); `ldapadd` = via protocol (server running) |
| slappasswd | Generates `{SSHA}` hash for LDIF files |
| slapcat | Exports DB to LDIF (backup) |
| Unix user objectClasses | `inetOrgPerson` + `posixAccount` + `shadowAccount` |
| rootdn ACL | Always has full access regardless of olcAccess rules |
| TLS import | `ldapmodify -Y EXTERNAL -H ldapi:///` |
