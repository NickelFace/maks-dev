---
title: "LPIC-2 210.3 — LDAP Client Usage"
date: 2026-04-10
description: "LDAP tree structure, DN/RDN, LDIF format, ldapsearch with filters, ldapadd/ldapdelete/ldapmodify/ldappasswd, search scopes, slapadd vs ldapadd. LPIC-2 exam topic 210.3."
tags: ["Linux", "LPIC-2", "LDAP", "OpenLDAP", "directory", "authentication"]
categories: ["LPIC-2"]
---

> **Exam topic 210.3** — LDAP Client Usage (weight: 2). Covers using LDAP command-line client tools, LDIF format, search filters, and understanding the LDAP directory tree structure.

---

## What Is LDAP

**LDAP (Lightweight Directory Access Protocol)** is a lightweight version of DAP from the X.500 standard (RFC 2251). Developed at the University of Michigan, now maintained by the OpenLDAP project.

LDAP is a client-server system: the server stores the directory and answers queries; the client connects, queries, or modifies entries. The directory is optimized for **frequent reads and infrequent writes**.

Typical LDAP directory content: employee names, phone numbers, email addresses, departments, company policies, and user authentication data.

---

## LDAP Tree Structure

The LDAP directory is built as a hierarchical tree. Every object is identified by a unique **Distinguished Name (DN)**.

Example DN:
```
cn=John Doe,ou=engineering,dc=example,dc=com
```

DN attributes are read bottom-up (specific to general):

| Attribute | Full name | Example |
|---|---|---|
| `dc` | Domain Component | `dc=example` |
| `o` | Organization | `o=MyCompany` |
| `ou` | Organizational Unit | `ou=engineering` |
| `cn` | Common Name | `cn=John Doe` |
| `uid` | User ID | `uid=jdoe` |
| `c` | Country | `c=US` |
| `sn` | Surname | `sn=Doe` |

**RDN (Relative Distinguished Name)** — the leftmost component of the DN. It uniquely identifies an entry among siblings with the same parent.

> **Exam question:** DN = full path to the entry. RDN = only the leftmost component of the DN.

Object class schemas are stored in `/etc/openldap/schema/`. Each `objectClass` defines mandatory and optional attributes.

---

## LDIF Format

**LDIF (LDAP Data Interchange Format)** — text format for describing LDAP entries. Used for import/export.

Entry structure:
```ldif
dn: cn=John Doe,o=bmi,c=us
objectclass: top
objectclass: person
cn: John Doe
sn: Doe
telephonenumber: 555-111-5555
```

LDIF rules:
- Each entry starts with a `dn:` line
- Blank line separates entries
- Long lines can be wrapped with an indentation on continuation lines

Line wrapping example:
```ldif
dn: cn=some_example_user,dc=example,dc=com
# Equivalent:
dn: cn=some_e
 xample_user,
 dc=example,d
 c=com
```

> The leading space on continuation lines is mandatory. Without it, the server treats the line as a new attribute.

---

## ldapsearch

The primary tool for querying an LDAP directory.

```bash
ldapsearch [options] [filter] [attributes]
```

### Key options:

| Option | Description |
|---|---|
| `-h host` | LDAP server host |
| `-p port` | Port (default 389) |
| `-H uri` | URI (ldap://host:port or ldaps://host) |
| `-D dn` | Bind DN (authenticate as) |
| `-w pass` | Password |
| `-W` | Prompt for password interactively |
| `-x` | Simple authentication (not SASL) |
| `-b base` | Base DN for search start |
| `-s scope` | Search scope: base, one, sub |
| `-L` | Output in LDIF format |
| `-v` | Verbose output |
| `-A` | Attribute names only, no values |
| `-z size` | Limit number of returned entries |

### Search scope values (`-s`):

| Value | Description |
|---|---|
| `base` | Base entry only |
| `one` | One level below the base entry |
| `sub` | All entries in the subtree (default) |

### Examples:

```bash
# Search all entries in an OU
ldapsearch -h myhost -p 389 -s base \
  -b "ou=people,dc=example,dc=com" \
  "objectclass=*"

# Authenticated search, LDIF output
ldapsearch -x -H ldap://localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W -b "dc=example,dc=com" \
  -L "(cn=John*)"

# From exam documentation — all objects
ldapsearch -b 'dc=ispnet1,dc=net' '(objectclass=*)'

# Search for specific attributes only
ldapsearch -x -H ldap://localhost \
  -b "ou=People,dc=example,dc=com" \
  "(objectClass=inetOrgPerson)" cn mail
```

> `-x` is required for simple authentication. Without it, ldapsearch tries to use SASL. `-x` appears in almost all exam command examples.

---

## LDAP Filters

Filters use prefix (Polish) notation with mandatory parentheses.

| Operator | Syntax | Example |
|---|---|---|
| Equality | `attr=val` | `cn=John` |
| Presence | `attr=*` | `cn=*` |
| Substring | `attr=val*` | `cn=Jo*` |
| Approximate | `attr~=val` | `cn~=Jon` |
| Greater or equal | `attr>=val` | `age>=30` |
| Less or equal | `attr<=val` | `age<=65` |
| AND | `(&(f1)(f2))` | `(&(cn=J*)(ou=IT))` |
| OR | `(\|(f1)(f2))` | `(\|(cn=A)(cn=B))` |
| NOT | `(!(f))` | `(!(cn=admin))` |

```bash
# Entries with cn=marie OR without phone starting with 9
ldapsearch -x "(|(cn=marie)(!(telephoneNumber=9*)))"

# AND with nested OR
ldapsearch -x -b "dc=example,dc=com" \
  "(&(objectclass=person)(|(cn=John)(cn=Jane)))"
```

> Parentheses are required around each condition. Always write parentheses on the exam.

---

## ldappasswd

Utility for changing an LDAP user's password. Uses the LDAPv3 Password Modify extended operation (RFC 3062).

If no new password is specified and interactive mode is not enabled, the server **auto-generates a password**.

```bash
ldappasswd -x -h localhost \
  -D "cn=root,dc=example,dc=com" \
  -s secretpassword \
  -W uid=admin,ou=users,dc=example,dc=com
```

| Option | Description |
|---|---|
| `-s newpass` | New password |
| `-S` | Prompt for new password interactively |
| `-D dn` | Admin DN (who is changing) |
| `-W` | Prompt for admin password |
| `-x` | Simple authentication |

> If the user DN is not specified, `ldappasswd` changes the password of the user bound with `-D`.

---

## ldapadd

Tool for adding entries to the directory. Technically a **symbolic link to `ldapmodify` with `-a` flag**.

```bash
ldapmodify -a  # same as ldapadd
```

Data is read from an LDIF file. The server must be running (unlike `slapadd`).

```bash
ldapadd -h myhost -p 389 \
  -D "cn=orcladmin" \
  -w welcome \
  -f jhay.ldif
```

Example LDIF for adding a user:
```ldif
dn: uid=jdoe,ou=people,dc=example,dc=com
objectclass: top
objectclass: person
objectclass: inetOrgPerson
uid: jdoe
cn: John Doe
sn: Doe
mail: jdoe@example.com
userPassword: {SSHA}...
```

> **Key exam distinction:** `ldapadd` works via the LDAP protocol with a running server. `slapadd` works directly with the database files with the server **stopped**.

---

## ldapdelete

Tool for deleting entries. Also a symbolic link to `ldapmodify`.

```bash
ldapdelete -h myhost -p 389 \
  -D "cn=orcladmin" \
  -w welcome \
  "uid=hricard,ou=sales,ou=people,dc=example,dc=com"
```

> `ldapdelete` does NOT delete child entries automatically. Delete all children first, then the parent.

---

## ldapmodify

The primary tool for modifying existing entries. `ldapadd` and `ldapdelete` are just links to it.

The operation type is specified via `changetype` in the LDIF file:

```ldif
dn: uid=jdoe,ou=people,dc=example,dc=com
changetype: modify
replace: mail
mail: newemail@example.com
-
add: telephoneNumber
telephoneNumber: 555-9999
-
delete: description
```

`changetype` values:

| Value | Action |
|---|---|
| `add` | Add new entry |
| `delete` | Delete entry |
| `modify` | Modify attributes |
| `modrdn` | Rename entry |

The `-` separator is required between modify operations for the same entry.

```bash
ldapmodify -x -h localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W -f changes.ldif
```

Useful flags:

| Flag | Description |
|---|---|
| `-a` | Add new entries (ldapadd mode) |
| `-c` | Continue on errors |
| `-n` | Show what would be done, but don't execute |
| `-v` | Verbose output |

---

## /etc/ldap/ldap.conf

Client-side configuration file. After configuring it, `-H` and `-b` flags become optional:

```
BASE    dc=example,dc=com
URI     ldap://192.168.1.100
```

File locations:
- Debian/Ubuntu: `/etc/ldap/ldap.conf`
- Red Hat/CentOS: `/etc/openldap/ldap.conf`

---

## Exam Cheat Sheet

### LDAP Ports

| Port | Protocol |
|---|---|
| **389** | LDAP (plaintext) |
| **636** | LDAPS (LDAP over TLS) |

### Command Summary

| Command | Role |
|---|---|
| `ldapsearch` | Search and query the directory |
| `ldapadd` | Add entries (symlink to `ldapmodify -a`) |
| `ldapdelete` | Delete entries (symlink to `ldapmodify`) |
| `ldappasswd` | Change user password |
| `ldapmodify` | Modify existing entries |

### Common Options

```
-x        simple authentication (not SASL)
-D dn     bind DN (who we authenticate as)
-w pass   password
-W        prompt for password interactively
-h host   server host
-p port   server port
-H uri    URI (ldap://host or ldaps://host)
-b base   base DN for search
-f file   LDIF file
-L        output in LDIF format
-s scope  search scope (base/one/sub)
```

### Key Exam Facts

| Fact | Detail |
|---|---|
| `ldapadd` and `ldapdelete` | Symbolic links to `ldapmodify` |
| `ldapadd` vs `slapadd` | `ldapadd` = live server via protocol; `slapadd` = direct DB access, server stopped |
| `-x` flag | Required for simple auth (non-SASL) |
| Server not specified + no auto-gen | `ldappasswd` auto-generates password |
| DN vs RDN | DN = full path; RDN = leftmost component only |
| Object class schemas | `/etc/openldap/schema/` |
