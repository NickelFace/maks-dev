---
title: "LPIC-2 207.3 — DNS Server Security"
date: 2026-01-25
description: "BIND security: hide version, ACLs, allow-query/allow-transfer, unprivileged user, chroot jail, split DNS, TSIG transaction signatures, DNSSEC (ZSK/KSK, RRSIG/NSEC/NSEC3/DS), DANE/TLSA records. LPIC-2 exam topic 207.3."
tags: ["Linux", "LPIC-2", "DNS", "BIND", "DNSSEC", "TSIG", "security"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-207-3-dns-server-security/"
page_lang: "en"
---

> **Exam topic 207.3** — Securing a DNS Server (weight: 2). Covers BIND security strategies, chroot jails, split DNS configuration, TSIG zone transfer authentication, DNSSEC record signing, and DANE certificate binding.

---

## DNS Security Strategies

> The "security through obscurity" principle does not provide absolute protection, but increases the time needed to detect an attack.

### Hiding the BIND Version

How an attacker checks the version:

```bash
dig @target chaos version.bind txt
```

Hide it in `named.conf`:

```
options {
    version "hidden";
};
```

### ACLs

```
acl "trusted" {
    localhost;
    192.168.1.0/24;
};
```

> ACL labels: update in one place — applies everywhere.

### Restricting Queries (allow-query)

```
options {
    allow-query { trusted; };
};

// Or for a specific zone:
zone "example.com" IN {
    allow-query { 192.168.1.0/24; };
};
```

### Restricting Zone Transfers (allow-transfer)

**Danger of open zone transfers:**

```bash
dig axfr @ns.example.com example.com
# Reveals the ENTIRE infrastructure: VPN, offices, internal hosts
host -l example.com ns.example.com
# Same thing, different format
```

**Correct configuration:**

```
// Globally deny
options {
    allow-transfer { none; };
};

// Allow only to slaves
acl "my_slave_servers" {
    10.0.1.2;
    10.0.1.3;
};

zone "example.org" IN {
    type master;
    allow-transfer { my_slave_servers; };
};

// On slave — always deny further transfers
zone "example.org" IN {
    type slave;
    allow-transfer { none; };
};
```

> **Warning:** Don't forget to protect the **reverse zone** the same way!

### Restricting Dynamic Updates

```
zone "example.com" IN {
    allow-update { none; };               // deny all
    allow-update-forwarding { none; };    // deny via slave
    allow-notify { 192.168.0.104; };      // only master sends NOTIFY
};
```

---

## Running BIND as an Unprivileged User

**Problem:** BIND may run as `root` by default. If compromised, the attacker gets full system access.

**Why not `nobody`?** Many other services already run as `nobody` — undesirable interaction is possible.

**Solution:** create a dedicated `named` user.

```bash
# Manual launch
named -u named -g named

# Debian (/etc/init.d/bind):
start-stop-daemon ... --exec /usr/sbin/named -- -u named -g named
# -- separates start-stop-daemon options from named options

# Red Hat/CentOS (already configured by default):
systemctl status named
# Process: ExecStart=/usr/sbin/named -u named

# Autostart (Red Hat):
chkconfig named on
```

Verify permissions on zone directory:

```bash
ls -l /var/named
# drwxrwx---. named named  data/
# -rw-rw----. root  named  named.ca
```

> **Warning:** Make sure `named` has **write** permission to the directory specified in the `directory` option in `named.conf`.

---

## Chroot Jail for BIND

Chroot isolates a process: the specified directory becomes the root `/`. The process cannot escape beyond it.

### Preparing the Chroot Environment

New root: `/var/cache/bind`

```bash
# 1. Create /dev/null
mknod -m 666 /var/cache/bind/dev/null c 1 3

# 2. Copy user files
cd /var/cache/bind/etc
cp -p /etc/{passwd,group} .
cp /etc/ld.so.cache .
cp /etc/localtime .

# 3. Find required libraries
ldd /usr/sbin/named
# libc.so.6 => /lib/libc.so.6

# 4. Copy libraries (symlinks + real files)
cd /var/cache/bind/lib
cp -pd /lib/{libc.so.6,libc-2.1.3.so,ld-linux.so.2,ld-2.1.3.so} .

# 5. Copy BIND binaries
cp -p /usr/sbin/named{,-xfer} /var/cache/bind/usr/sbin
cp -p /usr/sbin/rndc /var/cache/bind/usr/sbin
```

### Chroot environment structure:

```
/var/cache/bind/          ← new root (/)
├── dev/null
├── etc/
│   ├── passwd            ← copy with named user
│   ├── group
│   ├── ld.so.cache
│   ├── localtime
│   └── bind/
│       ├── named.conf
│       └── example.com.zone
├── lib/                  ← BIND libraries
├── usr/sbin/
│   ├── named
│   ├── named-xfer
│   └── rndc
└── var/cache/bind/
    └── bind.log
```

> All paths in `named.conf` are **relative to the new root**, without the `/var/cache/bind` prefix.

### Starting BIND in chroot

```bash
# Command line
named -t /var/cache/bind

# Debian
start-stop-daemon ... --exec /usr/sbin/named -- -t /var/cache/bind

# Red Hat
daemon ... /sbin/named -t /var/cache/bind

# Using the bind-chroot package (CentOS/RHEL — simpler):
yum install bind-chroot
/usr/libexec/setup-named-chroot.sh /var/named/chroot on
systemctl stop named && systemctl disable named
systemctl start named-chroot && systemctl enable named-chroot
# Zone files are now in: /var/named/chroot/var/named/
```

> BIND enters chroot **immediately after parsing arguments**, before reading configuration.

### Logging in chroot

Standard syslog does not work — no access to `/dev/log`. Use a file:

```
logging {
    channel some_log {
        file "bind.log" versions 3;
        severity info;
    };
    category default { some_log; };
};
// Log: /var/cache/bind/bind.log
```

### Combining chroot + unprivileged user

```bash
named -u named -g named -t /var/cache/bind
```

**BIND startup sequence:**

1. Parse command-line arguments
2. **chroot** (enter jail)
3. Write PID file (still as root)
4. **Drop to** `named` user

> The `named` user must exist in the **copy** of `/etc/passwd` inside the chroot. It need not exist outside the jail.

---

## Split DNS

Used for: different answers to internal vs external clients; isolating internal zones from the internet.

### Two Servers on Different Hosts

```
Internet ← [liongate 192.168.72.1] ← forwarders → [privdns 192.168.72.2]
              visible server                         internal master
```

**`named.conf` on privdns (internal master):**

```
// Internal root — for itself only
zone "." IN {
    type master;
    file "/etc/bind/internal.root.zone";
    allow-transfer { none; };
    allow-query    { none; };
};

// Internal zone — only for liongate
zone "exworks" IN {
    type master;
    file "/etc/bind/exworks.zone";
    allow-transfer { none; };
    allow-query    { 192.168.72.1; };
};

options {
    recursion no;
    fetch-glue no;
};
// Do NOT include zone "." type hint!
```

**`named.conf` on liongate (forwarder):**

```
options {
    forwarders {
        192.168.72.2;    // privdns — first (internal)
        224.121.121.99;  // ISP DNS — for external
    };
};
```

### Two Servers on the Same Host

When no separate host is available — both servers on `liongate`:

```
[liongate]
├── Internal (chroot, port 5353, user inamed)
│   master for ".", "exworks", reverse zone
└── Visible (port 53, user vnamed)
    slave for "exworks" + forwarders → ISP
```

**Internal server `named.conf`:**

```
options {
    directory "/var/cache/bind";
    listen-on port 5353 { 127.0.0.1; };
    recursion no;
    fetch-glue no;
};

zone "exworks" IN {
    type master;
    file "/etc/bind/exworks.zone";
    allow-transfer { 127.0.0.1; };  // visible server only
    allow-query    { 127.0.0.1; };
};
```

**Visible server `named.conf`:**

```
options {
    directory "/var/cache/bindVisible";
    forwarders { 224.121.121.99; };  // ISP for external queries
};

zone "exworks" IN {
    type slave;
    masters port 5353 { 127.0.0.1; };  // master on non-standard port
    file "exworks.slave";
    allow-transfer { none; };
    allow-query    { 127.0.0.1; 192.168.72.0/24; };
};
```

> **NOTIFY problem:** `also-notify` does not support port numbers. When a zone changes, restart the visible server manually.

---

## TSIG — Transaction Signatures

TSIG (Transaction SIGnatures) secures **the communication channel between servers** for zone transfers. Uses a shared secret + HMAC.

**Used for:** zone transfers, dynamic updates, NOTIFY, recursive queries.

### Generating the Key

```bash
# On the master server:
dnssec-keygen -a HMAC-SHA512 -b 512 -n HOST -r /dev/urandom mykey
# Creates: Kmykey.+165+XXXXX.key  and  Kmykey.+165+XXXXX.private
# For HMAC — both files contain the SAME key

# Do not use HMAC-MD5 — deprecated!
# Recommended: HMAC-SHA256 or HMAC-SHA512
```

### Configuring the Master Server

**Create `/etc/bind/tsig.key`:**

```
key "TRANSFER" {
    algorithm hmac-sha512;
    secret "XIQDYlGaIbWfyopYHS1vtFr...KJQ==";
};

# Slave server 1
server 10.0.1.2 {
    keys { TRANSFER; };
};

# Slave server 2
server 10.0.1.3 {
    keys { TRANSFER; };
};
```

**Include in `named.conf`:**

```
include "/etc/bind/tsig.key";
```

**Reload and verify:**

```bash
rndc reload
rndc tsig-list   # list active TSIG keys
```

**Restrict zone transfer to key:**

```
zone "example.com" {
    type master;
    file "example.com.zone";
    allow-transfer { key TRANSFER; };
};
```

### Configuring the Slave Server

Same `tsig.key` file, same secret, but `server` points to the **master**:

```
key "TRANSFER" {
    algorithm hmac-sha512;
    secret "XIQDYlGaIbWfyopYHS1vtFr...KJQ==";  // same!
};

# Master server
server 10.0.1.1 {
    keys { TRANSFER; };
};
```

Then `include` in `named.conf` and `rndc reload`.

> **Warning:** The key file must only be accessible to the named process. Do not type the key manually — copy it from the `.private` file!

---

## DNSSEC — DNS Security Extensions

DNSSEC protects against **DNS response spoofing** (cache poisoning) through digital signatures on records.

### How It Works

```
Root servers (.) ← trust anchor (since May 6, 2010)
    ↓ sign child zone's KSK
.com / .ru / .nl servers
    ↓ sign KSK
example.com servers
    ↓ ZSK signs zone records
Client verifies the chain from bottom up
```

The public key of `example.com` is published on `.com` parent zone servers.

### DNSSEC Record Types

| Record | Purpose |
|---|---|
| `DNSKEY` | Zone public key (ZSK or KSK) |
| `RRSIG` | Digital signature of a record set |
| `NSEC` | Proof of non-existence of a name |
| `NSEC3` | Same, but hashed (protects against zone enumeration) |
| `DS` | Hash of DNSKEY in the parent zone |

**NSEC vs NSEC3:**
- `NSEC`: vulnerable to zone walking — reveals the next name
- `NSEC3`: returns a **hash** of the next name — enumeration requires brute force

### dnssec-keygen and dnssec-signzone

**`dnssec-keygen` options:**

| Option | Purpose | Values |
|---|---|---|
| `-a` | Algorithm | `RSASHA256`, `RSASHA1`, `DSA`, `HMAC-MD5`, `HMAC-SHA512` |
| `-b` | Key size | RSA: 512–4096; DSA: 512–1024 (×64); HMAC-MD5: 1–512 |
| `-n` | Name type | `ZONE`, `HOST`, `ENTITY`, `USER`, `OTHER` |
| `-f KSK` | Generate KSK | — |
| `-r` | Randomness source | `/dev/urandom` (recommended) |

```bash
# ZSK for the zone
dnssec-keygen -a RSASHA256 -b 1024 -n ZONE example.com
# Creates: Kexample.com.+008+XXXXX.key  and  .private

# KSK for the zone
dnssec-keygen -a RSASHA256 -b 2048 -f KSK -n ZONE example.com

# TSIG key (symmetric)
dnssec-keygen -a HMAC-SHA512 -b 512 -n HOST mykey
```

**Filename format:** `K` + name + `+` + algorithm number + `+` + footprint + `.key/.private`

```bash
# Sign the zone
dnssec-signzone -K /path/to/keys -o example.com example.com.zone
# Creates: example.com.zone.signed (with RRSIG records)

# Load keys manually
rndc loadkeys example.com
```

**Automatic signing (`named.conf`):**

```
zone "example.com" {
    type master;
    file "example.com.zone";
    auto-dnssec maintain;
    inline-signing yes;
    key-directory "/etc/bind/keys";
};
```

### Other DNSSEC Utilities

| Utility | Purpose |
|---|---|
| `dnssec-verify` | Verify a signed zone |
| `dnssec-checkds` | Check DS records |
| `dnssec-coverage` | Check key coverage |
| `dnssec-dsfromkey` | Generate DS from DNSKEY |
| `dnssec-settime` | Manage key timestamps |
| `dnssec-revoke` | Revoke a key |

> **Warning:** DNSSEC does **not** protect zone transfers and dynamic updates — use TSIG for those.

---

## DANE — DNS-Based Authentication of Named Entities

**The CA problem:** browsers trust any of 1000+ certificate authorities. Compromise of one CA is catastrophic.

**Example — DigiNotar (2011):** attackers generated fraudulent certificates for major sites. Browsers accepted them as valid. DigiNotar went bankrupt within weeks.

**DANE** uses DNSSEC to bind TLS certificates to DNS names via **TLSA records**.

**TLSA record syntax:**

```
_443._tcp.www.example.com. IN TLSA 0 0 1 <hash>
# _port._protocol.server_name
```

**Three fields (read right to left):**

| Field | Position | Value | Description |
|---|---|---|---|
| Matching Type | 3rd | `0` | Data not hashed |
| | | `1` | SHA-256 ✓ |
| | | `2` | SHA-512 |
| Selector | 2nd | `0` | Full certificate |
| | | `1` | Public key only |
| Certificate Usage | 1st | `0` PKIX-TA | Public CA (X.509) |
| | | `1` PKIX-EE | End-entity certificate (X.509) |
| | | `2` DANE-TA | Private CA |
| | | `3` DANE-EE | End-entity without CA ← **maximum benefit** |

> With value `3`, DANE completely eliminates dependency on third-party CAs. Requires working DNSSEC.

---

## Exam Cheat Sheet

### Security Directives

| Directive | Where | Purpose |
|---|---|---|
| `version "hidden"` | `options` | Hide BIND version |
| `allow-query` | `options`, `zone` | Who can query |
| `allow-transfer` | `options`, `zone` | Who can receive zone transfer |
| `allow-update` | `zone` | Who can make dynamic updates |
| `allow-update-forwarding` | `zone` | Updates via slave |
| `allow-notify` | `zone` | Who sends NOTIFY messages |
| `allow-recursion` | `options` | Who may use recursion |
| `recursion no` | `options` | Disable recursion globally |
| `forwarders` | `options` | Upstream servers |
| `heartbeat-interval 0` + `dialup yes` | `options` | Disable WAN connections |

### Key Commands

```bash
# Hide BIND version (check by attacker)
dig @server chaos version.bind txt

# Zone transfer (should be blocked)
dig axfr @server zonename
host -l zonename nameserver

# Generate TSIG key
dnssec-keygen -a HMAC-SHA512 -b 512 -n HOST keyname

# Generate ZSK
dnssec-keygen -a RSASHA256 -b 1024 -n ZONE example.com

# Generate KSK
dnssec-keygen -a RSASHA256 -b 2048 -f KSK -n ZONE example.com

# Sign zone
dnssec-signzone -K /keys -o example.com example.com.zone

# Run BIND in chroot as unprivileged user
named -u named -g named -t /var/cache/bind
```

### Protection Methods Comparison

| Method | Protects Against | Files / Utilities |
|---|---|---|
| Unprivileged user | Privilege escalation | `-u named`, `/etc/passwd` |
| Chroot jail | System compromise | `-t /var/cache/bind` |
| ACL + allow-* | Unauthorized access | `named.conf` |
| TSIG | IP spoofing on transfers | `dnssec-keygen`, `key {}` |
| DNSSEC | DNS response spoofing | `dnssec-keygen`, `dnssec-signzone` |
| DANE | CA compromise | TLSA records + DNSSEC |
| Split DNS | Internal infrastructure leakage | `view {}`, `forwarders {}` |

### Algorithms (exam facts)

| Algorithm | Type | Use | Status |
|---|---|---|---|
| `HMAC-MD5` | Symmetric | TSIG | Deprecated |
| `HMAC-SHA256` | Symmetric | TSIG | Recommended |
| `HMAC-SHA512` | Symmetric | TSIG | Recommended |
| `RSASHA1` | Asymmetric | DNSSEC | Being deprecated |
| `RSASHA256` | Asymmetric | DNSSEC | Recommended |
| `DSA` | Asymmetric | DNSSEC | Being deprecated |

### Quick Q&A

**Q:** How to run BIND as user named in chroot `/var/cache/bind`?  
**A:** `named -u named -g named -t /var/cache/bind`

**Q:** Which utility generates both TSIG and DNSSEC keys?  
**A:** `dnssec-keygen`

**Q:** What must be done on the slave when configuring TSIG?  
**A:** Create `tsig.key` with the **same** secret, but `server` points to the **master**

**Q:** How does TSIG differ from DNSSEC?  
**A:** TSIG — point-to-point between servers (transfers, updates); DNSSEC — end-to-end to the client (response authenticity)

**Q:** Which Certificate Usage value in TLSA gives maximum DANE benefit?  
**A:** `3` (DANE-EE) — no dependency on any CA

**Q:** Why does the slave need `allow-transfer { none; }`?  
**A:** The slave should not redistribute data further — it only receives from master

**Q:** What is NSEC3 and why is it needed?  
**A:** NSEC3 returns a hash of the next name instead of the name itself — protects against zone walking (enumeration)
