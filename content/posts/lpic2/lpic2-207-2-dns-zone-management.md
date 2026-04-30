---
title: "LPIC-2 207.2 — Creating and Managing DNS Zones"
date: 2026-01-17
description: "Zone file syntax, SOA record, resource record types (A/AAAA/PTR/MX/NS/CNAME), forward and reverse zones, master/slave/stub configuration, zone delegation, glue records, named-checkzone, named-compilezone. LPIC-2 exam topic 207.2."
tags: ["Linux", "LPIC-2", "DNS", "BIND", "zones", "SOA"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-207-2-dns-zone-management/"
page_lang: "en"
---

> **Exam topic 207.2** — Creating and Maintaining DNS Zones (weight: 3). Covers zone file syntax, SOA records, resource record types, forward and reverse zones, master/slave configuration, zone delegation, and zone validation tools.

---

## Zone Types in BIND

A zone defines a DNS server's area of responsibility. Each zone is declared with a `zone` directive in `named.conf`:

| Type | Description |
|---|---|
| `master` | Primary authoritative server for the zone |
| `slave` | Secondary server, copies data from master |
| `forward` | Forwards queries for this zone to another server |
| `hint` | Root server list (only for the `.` zone) |
| `redirect` | Responds when receiving NXDOMAIN |
| `stub` | Like slave, but replicates only NS records |

---

## Standard Zones

### db.local — localhost zone

**Entry in `named.conf`:**

```
zone "localhost" {
    type master;
    file "/etc/bind/db.local";
};
```

**File `/etc/bind/db.local`:**

```
$TTL    604800
@   IN  SOA localhost. root.localhost. (
              1         ; Serial
         604800         ; Refresh
          86400         ; Retry
        2419200         ; Expire
         604800 )       ; Negative Cache TTL
;
@   IN  NS      localhost.
@   IN  A       127.0.0.1
```

> `@` = current origin = zone name from `named.conf` = `localhost`.  
> `root.localhost.` = administrator email `root@localhost` (`.` replaces `@`).

### db.127 — reverse zone 127.in-addr.arpa

**Entry in `named.conf`:**

```
zone "127.in-addr.arpa" {
    type master;
    file "/etc/bind/db.127";
};
```

**File `/etc/bind/db.127`:**

```
$TTL    604800
@   IN  SOA localhost. root.localhost. (
              1         ; Serial
         604800         ; Refresh
          86400         ; Retry
        2419200         ; Expire
         604800 )       ; Negative Cache TTL
;
@       IN  NS      localhost.
1.0.0   IN  PTR     localhost.
```

> **Key rule:** all hostnames **without a trailing dot** automatically get the current origin appended. `1.0.0` → `1.0.0.127.in-addr.arpa.` (corresponds to `127.0.0.1`). Regular IP addresses (`127.0.0.1`) do **not** get the origin appended.

### db.root — root server hints

**Entry in `named.conf`:**

```
zone "." {
    type hint;
    file "/etc/bind/db.root";    ; Ubuntu
    ; or /var/named/named.ca    ; CentOS/RHEL
};
```

**Fragment of `db.root`:**

```
.                        3600000  IN  NS    A.ROOT-SERVERS.NET.
A.ROOT-SERVERS.NET.      3600000      A     198.41.0.4
.                        3600000      NS    B.ROOT-SERVERS.NET.
B.ROOT-SERVERS.NET.      3600000      A     128.9.0.107
```

**Updating the hints file:**

```bash
dig @a.root-servers.net . ns > /etc/bind/db.root   # get current root list
dig @a.root-servers.net . SOA                       # check SOA serial
```

> Type `hint` is used **only** for the root zone `.`. The file is not updated dynamically.

---

## Zone File Syntax

### Directives

Directives start with `$`, case matters:

| Directive | Syntax | Description |
|---|---|---|
| `$TTL` | `$TTL 86400` | Default record time-to-live in cache |
| `$ORIGIN` | `$ORIGIN example.org.` | Appended to names without a trailing dot |
| `$INCLUDE` | `$INCLUDE filename` | Includes content from another file |

**Time units:**

```
604800    ; seconds
7D        ; days
2H        ; hours
30M       ; minutes
2W        ; weeks
```

> Starting from BIND 8.2, every zone file **must** begin with `$TTL` (RFC 2308).

### SOA Record

SOA is the **required first record** in every zone file:

```
@  IN  SOA  master-ns.example.org.  admin.example.org. (
    2024031501    ; Serial    — yyyymmddee
         28800    ; Refresh   — how often slave checks master
          3600    ; Retry     — pause on check failure
        604800    ; Expiration — when slave stops serving the zone
          3600 )  ; Negative Cache TTL — how long to remember NXDOMAIN
```

**Five SOA numbers:**

| # | Name | RFC 1537 recommendation | Description |
|---|---|---|---|
| 1 | **Serial** | format `yyyymmddee` | Increment on every change |
| 2 | **Refresh** | 24h | How often slave checks master |
| 3 | **Retry** | 2h | Pause before retry on failure |
| 4 | **Expiration** | 30d | When slave stops serving the zone |
| 5 | **Negative Cache TTL** | 1h (3600s) | How long to cache NXDOMAIN |

**Serial number format:**

```
2024031500  →  March 15 2024, 1st change (ee=00)
2024031501  →  March 15 2024, 2nd change (ee=01)
2024031600  →  March 16 2024, 1st change
```

> **Warning:** Serial **must** be incremented on every change — otherwise slaves will not learn about updates.

### Resource Record Types

| Type | Description | RFC |
|---|---|---|
| `A` | IPv4 host address | 1035 |
| `AAAA` | IPv6 host address | 1886 |
| `PTR` | Reverse resolution IP → name | 1035 |
| `NS` | Authoritative name server | 1035 |
| `MX` | Mail server (with priority) | 974, 1035 |
| `CNAME` | Alias (canonical name) | 1035 |
| `SOA` | Start of Authority | 1035 |
| `TXT` | Free text | 1035 |

**CNAME restrictions in BIND 9:**
- `MX` and `SOA` **must not** point to a CNAME
- CNAME **must not** point to another CNAME
- Only to `A`/`AAAA` records

**MX priority:** lower number = higher priority (0 = highest)

---

## Forward Zone Example

**Entry in `named.conf`:**

```
zone "example.org" IN {
    type master;
    file "/etc/bind/exampleorg.zone";
};
```

**Zone file `/etc/bind/exampleorg.zone`:**

```
$TTL 86400
@      IN  SOA lion.example.org. dnsmaster.lion.example.org. (
           2001110700    ; Serial: yyyymmddee
                28800    ; Refresh
                 3600    ; Retry
               604800    ; Expiration
                86400 )  ; Negative caching TTL
       IN  NS       lion.example.org.
       IN  NS       cat.example.org.

       IN  MX   0   lion.example.org.    ; primary mail server
       IN  MX  10   cat.example.org.     ; backup

lion   IN   A       224.123.240.1
       IN  MX   0   lion.example.org.
       IN  MX  10   cat.example.org.

doggy  IN   A       224.123.240.2
cat    IN   A       224.123.240.3
www    IN  CNAME    cat.example.org.     ; alias for cat

bird   IN   A       224.123.240.4
```

> An empty name field on the left means the current origin from the previous record remains in effect.

---

## Reverse Zone

### IPv4 Reverse Zone

Converts IP → FQDN. The first three octets **in reverse order** + `.in-addr.arpa`.

IP `224.123.240.x` → zone **`240.123.224.in-addr.arpa`**

**Entry in `named.conf`:**

```
zone "240.123.224.in-addr.arpa" IN {
    type master;
    file "/etc/bind/exampleorg.rev";
};
```

**File `/etc/bind/exampleorg.rev`:**

```
$TTL 86400
@      IN  SOA lion.example.org. dnsmaster.lion.example.org. (
           2001110700  28800  3600  604800  3600 )
       IN  NS   lion.example.org.
       IN  NS   cat.example.org.

1      IN  PTR  lion.example.org.    ; 224.123.240.1
2      IN  PTR  doggy.example.org.   ; 224.123.240.2
3      IN  PTR  cat.example.org.     ; 224.123.240.3
4      IN  PTR  bird.example.org.    ; 224.123.240.4
```

> **Only the last octet** in the PTR record. FQDN **with a trailing dot**! `4` + origin `240.123.224.in-addr.arpa.` = `4.240.123.224.in-addr.arpa.`

### IPv6 Reverse Zone

**IPv6 address format:**

```
Full:        2001:0db8:0000:0000:0000:ff00:0042:8329
Abbreviated: 2001:db8::ff00:42:8329   (:: replaces one group of zeros)
Loopback:    ::1
```

**AAAA record (forward zone):**

```
lion   IN   AAAA   2001:db8::ff00:42:8329
```

**Building the PTR for IPv6:**

```
Step 1 — full form:
  2001:0db8:0000:0000:0000:ff00:0042:8329

Step 2 — each hex character separated by dots:
  2.0.0.1.0.d.b.8.0.0.0.0.0.0.0.0.0.0.0.0.f.f.0.0.0.0.4.2.8.3.2.9

Step 3 — reverse + add ip6.arpa:
  9.2.3.8.2.4.0.0.0.0.f.f.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa
```

| | IPv4 | IPv6 |
|---|---|---|
| Domain | `in-addr.arpa` | `ip6.arpa` |
| Format | Octets in reverse order | Each hex char separated by dots, reversed |

---

## Master and Slave Servers

- Every zone must have **at least one master** and ideally one slave
- Both are **authoritative** for the zone and give identical answers
- **Two independent** servers: different networks, different power supplies
- Data **always originates** from master; slave **copies** from master

### Master Configuration

```
zone "example.org" IN {
    type master;
    file "/etc/bind/exampleorg.zone";
    notify yes;          ; notify slave on change (default)
    allow-update { none; };
};
```

**How master finds slaves:** looks at the zone's **NS records**. Additional servers — via `also-notify`.

> Old BIND versions used `primary` instead of `master`.

### Slave Configuration

```
zone "example.org" IN {
    type slave;
    masters { 224.123.240.1; };    ; master server IP
    file "db.example.org";         ; created automatically by slave
};
```

- Zone file is **created by the slave itself** — no need to create it manually
- Path without a directory → written to BIND's working directory (`/var/cache/bind` or `/var/named`)
- BIND must have **write permissions**

> Old BIND versions used `secondary` instead of `slave`.

### Stub Zone

Like slave, but replicates **only NS records**:

```
zone "example.org" IN {
    type stub;
    masters { 224.123.240.1; };
    file "stub.example.org";
};
```

**Purpose:**
- Keep the list of child zone NS records current
- Speed up name resolution without contacting root servers

---

## Zone Delegation

A zone is authoritative **only if the parent zone has delegated** authority to it.

**Example:** `example.org` delegates `scripts.example.org`

**Child zone file for `scripts.example.org`:**

```
$ORIGIN scripts.example.org.

ctl  IN  A     224.123.240.16
     IN  MX  0  ctl
     IN  MX 10  lion.example.org.
www  IN  CNAME  ctl

perl IN  A     224.123.240.17
bash IN  A     224.123.240.18
sh   IN  CNAME  bash
```

**Delegation in the parent `example.org` zone:**

```
; NS records perform the actual delegation
scripts  2d IN NS ctl.scripts.example.org.
         2d IN NS bash.scripts.example.org.

; Glue records — REQUIRED to find the servers
ctl.scripts.example.org.   2d IN A 224.123.240.16
bash.scripts.example.org.  2d IN A 224.123.240.18
```

> **Glue records** are required because servers `ctl` and `bash` reside **inside** the delegated zone. Without A records in the parent zone, they cannot be found.

---

## Zone Validation Tools

### named-checkzone

```bash
named-checkzone example.org /etc/bind/exampleorg.zone
# zone example.org/IN: loaded serial 0
# OK

named-checkzone 240.123.224.in-addr.arpa /etc/bind/exampleorg.rev

# Trailing dot is optional — both are valid
named-checkzone example.org  /etc/bind/exampleorg.zone
named-checkzone example.org. /etc/bind/exampleorg.zone
```

Errors `ignoring out-of-zone data` or `has 0 SOA records` mean the wrong domain name was given in the command.

### named-compilezone

Starting with BIND 9.9, slave servers save zones in **binary format** by default:

```bash
# Binary → text
named-compilezone -f raw -F text -o zone.txt example.org zone.raw

# Text → binary
named-compilezone -f text -F raw -o zone.raw example.org zone.txt
```

To make a slave save zones in **text** format, add to `named.conf`:

```
zone "example.org" IN {
    type slave;
    masters { 224.123.240.1; };
    file "db.example.org";
    masterfile-format text;
};
```

---

## DNS Utilities

### dig

Primary DNS diagnostic tool. Output is close to zone file format.

```bash
dig bird.example.org A               # A record
dig example.org MX                   # MX records
dig example.org NS                   # NS records
dig example.org SOA                  # SOA record
dig @cat.example.org bird.example.org A   # query specific server
dig @192.168.0.101 +short example.org

dig 4.240.123.224.in-addr.arpa PTR   # explicit PTR query
dig -x 224.123.240.4                 # automatically builds in-addr.arpa

dig +short example.org               # IP only
dig +short +identify example.org     # IP + which server answered
dig example.org | grep status        # NOERROR / NXDOMAIN / REFUSED
dig example.org | grep "Query time"  # query time
```

**Output sections:**

```
;; ANSWER SECTION:
bird.example.org.    1D IN A    224.123.240.4    ← answer

;; AUTHORITY SECTION:
example.org.         1D IN NS   lion.example.org. ← authoritative server

;; ADDITIONAL SECTION:
lion.example.org.    1D IN A    224.123.240.1     ← glue record
```

> If SOA is returned instead of an A record → the domain exists but **the host was not found**.

**Warning — missing trailing dot in PTR records:**

```
; Wrong:
4  IN  PTR  lion.example.org    ; origin gets appended — ERROR!

; Correct:
4  IN  PTR  lion.example.org.   ; trailing dot required
```

### host

Simple and brief output. Especially convenient for reverse lookups.

```bash
host bird.example.org               # forward lookup
host 224.123.240.4                  # reverse lookup
host 4.240.123.224.in-addr.arpa     # explicit PTR
host -t MX example.org              # MX records
host -t NS example.org              # NS records
```

### nslookup

**Deprecated** — use `dig` and `host`. Still on the exam.

```bash
nslookup example.org
nslookup -type=MX example.org
nslookup -type=NS example.org
nslookup 224.123.240.4              # reverse lookup

nslookup                            # interactive mode
> ls -d example.org.               # zone transfer (zone file format)
> help                             # list commands
```

### dnswalk

DNS debugger. Performs zone transfer and checks zone consistency.

```bash
dnswalk zoneedit.com.
# WARN: zoneedit.com A 64.85.73.107: no PTR record
# 0 failures, 15 warnings, 0 errors.
```

> Use with caution — attempts zone transfer from all servers.

---

## Exam Cheat Sheet

### File Locations

| File/Directory | Purpose | Distribution |
|---|---|---|
| `/etc/named.conf` | Main BIND config | CentOS/RHEL |
| `/etc/bind/named.conf` | Main BIND config | Ubuntu/Debian |
| `/etc/bind/named.conf.local` | User zones | Ubuntu |
| `/etc/bind/named.conf.default-zones` | Default zones | Ubuntu |
| `/etc/named.rfc1912.zones` | Default zones | CentOS |
| `/var/named/*.zone` | Zone database files | CentOS |
| `/etc/bind/db.*` | Zone database files | Ubuntu |
| `/var/named/named.ca` | Root servers (hints) | CentOS |
| `/etc/bind/db.root` | Root servers (hints) | Ubuntu |
| `/var/cache/bind/` | BIND working directory | Ubuntu |
| `/var/named/` | BIND working directory | CentOS |

### Quick Facts

```
@ = current origin = zone name from named.conf

FQDN must end with a dot:
  example.org.   ← absolute (has trailing dot)
  example.org    ← relative (origin will be appended)

IPv4 reverse zone:
  192.168.64.x → 64.168.192.in-addr.arpa

IPv6 reverse zone:
  2001:db8::... → ...ip6.arpa (each hex char separated by dots, reversed)

MX priority: LOWER = MORE IMPORTANT (0 = highest)

SOA Serial: format yyyymmddee, MUST increment on every change

Type hint: ONLY for root zone "."

CNAME forbidden: as target of MX/SOA, pointing to another CNAME
```

### SOA — Five Numbers

```
@  IN  SOA  ns1.example.org.  admin.example.org. (
    2024031501    ; 1. Serial    — increment on change (yyyymmddee)
         86400    ; 2. Refresh   — slave checks master (rec: 24h)
          3600    ; 3. Retry     — retry on failure (rec: 2h)
        604800    ; 4. Expire    — slave stops serving zone (rec: 30d)
          3600 )  ; 5. Neg.Cache — NXDOMAIN cache time (rec: 1h)
```

### Common Mistakes

| Mistake | Consequence |
|---|---|
| No trailing dot on FQDN in PTR record | Origin gets appended → wrong name |
| Serial not incremented in SOA | Slave will not pick up changes |
| CNAME points to CNAME | Violates BIND 9 standard |
| MX/SOA points to CNAME | Forbidden by RFC |
| No glue records on delegation | Child NS servers cannot be found |
