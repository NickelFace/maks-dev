---
title: "LPIC-2 207.1 — Basic DNS Server Configuration"
date: 2026-04-10
description: "BIND components, named.conf structure (options/logging/zone), caching-only server, rndc, named-checkconf/named-checkzone, dig and host. Alternative DNS servers: dnsmasq, djbdns, PowerDNS. LPIC-2 exam topic 207.1."
tags: ["Linux", "LPIC-2", "DNS", "BIND", "named", "dig"]
categories: ["LPIC-2"]
---

> **Exam topic 207.1** — Basic DNS Server Configuration (weight: 3). Covers configuring BIND as a caching-only DNS server, `named.conf` structure, zone types, `rndc` management, and DNS diagnostic utilities.

---

## DNS History and Basics

In the early days of the internet, all hostname-to-IP mappings were stored in a single **`HOSTS.TXT`** file, maintained by NIC and distributed via FTP. As the number of hosts grew, the distributed **DNS (Domain Name System)** was developed with local caching and distributed data updates.

**DNS listens on port `53`** (UDP and TCP) and performs:
- **Forward resolution**: name → IP (A record)
- **Reverse resolution (rDNS)**: IP → name (PTR record)

---

## Key Terms

| Term | Description |
|---|---|
| **Zone** | Equivalent to a domain; the zone file contains hostnames and IPs |
| **PTR record** | Required for reverse DNS (rDNS) |
| **Authoritative server** | Manages zone configuration — the "zone master" |
| **Recursive server** | Resolves names for zones it is not authoritative for |
| **Resolver** | Library/software component that performs DNS queries on the client |
| **FQDN** | Fully Qualified Domain Name |

> Name resolution order is controlled by **`/etc/nsswitch.conf`**.

---

## BIND Components

**BIND (Berkeley Internet Name Domain)** is the most popular DNS server on Linux.

| Component | Description |
|---|---|
| `/usr/sbin/named` | Main DNS server daemon |
| `/usr/sbin/rndc` | Daemon management tool |
| `/usr/sbin/named-checkconf` | Validates `named.conf` syntax |
| `named.conf` | Main BIND configuration file |
| `/etc/init.d/bind` | Start/stop script (distribution-dependent) |
| `/var/named/` | Working directory for named (zone files) |

**`named.conf` location by distribution:**

| Distribution | Path |
|---|---|
| RHEL / CentOS | `/etc/named.conf` |
| Debian / Ubuntu | `/etc/bind/named.conf` |

**Zone file locations:**

| Distribution | Zone file path |
|---|---|
| CentOS / RHEL | `/var/named/named.*` |
| Debian / Ubuntu | `/etc/bind/db.*` |

---

## named.conf

**`named.conf`** is the main BIND configuration file, the first file read by the `named` daemon.

### Syntax

```
keyword {
    parameters;
};
```

- Statements can be **nested**
- Simple parameters end with **`;`**
- Comments: `//`, `#`, `/* ... */`

> **Warning:** `;` is **not** a comment in `named.conf`. It is a comment in BIND **zone files**.

### File structure (Ubuntu — everything via include):

```
include "/etc/bind/named.conf.options";
include "/etc/bind/named.conf.local";
include "/etc/bind/named.conf.default-zones";
```

---

## Caching-Only Server

A caching-only server resolves names and **stores results in cache**. It **does not serve its own zones** (except a few internal ones).

### Full `named.conf` example (Debian):

```
options {
    directory "/var/named";
    // forwarders {
    //     0.0.0.0;
    // };
};

logging {
    category lame-servers { null; };
    category cname { null; };
};

// Root servers:
zone "." {
    type hint;
    file "/etc/bind/db.root";
};

// Internal zones (required):
zone "localhost" {
    type master;
    file "/etc/bind/db.local";
};

zone "127.in-addr.arpa" {
    type master;
    file "/etc/bind/db.127";
};

zone "0.in-addr.arpa" {
    type master;
    file "/etc/bind/db.0";
};

zone "255.in-addr.arpa" {
    type master;
    file "/etc/bind/db.255";
};
```

---

## options Section

> **Warning:** Only **one** `options` statement is allowed in `named.conf`.

### Key parameters:

| Parameter | Description |
|---|---|
| `directory` | Working directory for zone files (`/var/named`) |
| `listen-on` | Port and addresses for incoming queries |
| `recursion` | Allow/deny recursion (`yes`/`no`) |
| `allow-query` | List of IPs allowed to query |
| `forwarders` | Upstream DNS server IPs |
| `forward` | Forwarding mode: `first` or `only` |
| `version` | BIND version in responses (can be hidden) |
| `dialup` | For servers behind a firewall/dialup connection |

### Example with forwarders:

```
options {
    directory "/var/named";
    listen-on port 53 { 127.0.0.1; };
    recursion yes;
    allow-query { localhost; 192.168.1.0/24; };

    forwarders {
        123.12.134.2;
        123.12.134.3;
    };
    forward only;    // only to forwarders
    // forward first; // forwarders first, then others (default)

    version "not revealed";  // hide BIND version
};
```

### Hiding the BIND version:

```
version "not revealed";
// or:
version none;
```

Query the version:

```bash
dig @ns.example.com version.bind chaos txt
```

---

## logging Section

> **Warning:** Only **one** `logging` statement is allowed in `named.conf`.

**Channel** — where to write logs  
**Category** — type of messages  
**Severity** — detail level: from `critical` (minimum) to `dynamic` (maximum)

```
logging {
    channel my_channel {
        file "data/named.log";
        severity dynamic;
    };

    // Route to channel:
    category security { my_channel; };
    category queries  { my_channel; };

    // Disable categories:
    category lame-servers { null; };
    category cname        { null; };
};
```

### Important logging categories:

| Category | Description |
|---|---|
| `client` | Client queries |
| `security` | Approvals and denials |
| `queries` | DNS queries |
| `update` | Dynamic DNS updates |
| `xfer-in` | Incoming zone transfers |
| `xfer-out` | Outgoing zone transfers |
| `lame-servers` | Misconfigured servers |
| `general` | Everything else (catch-all) |
| `default` | All messages without a category |

> BIND 9 applies logging configuration **after** parsing the entire file (unlike BIND 8). The `logging` section is optional — sensible defaults exist.

---

## zone Section

### Zone types:

| Type | Meaning |
|---|---|
| `master` | Primary authoritative server for the zone |
| `slave` | Secondary zone server |
| `hint` | Root server list (for the `"."` zone) |
| `forward` | Forward queries to another server |
| `redirect` | Responds when receiving NXDOMAIN |

### Zone examples:

```
// Root zone:
zone "." {
    type hint;
    file "named.ca";
};

// Forward authoritative zone:
zone "example.com" {
    type master;
    file "db.example.com";
    allow-update { none; };
};

// Reverse zone:
zone "1.168.192.in-addr.arpa" {
    type master;
    file "db.192.168.1";
};

// Slave zone:
zone "example.com" {
    type slave;
    masters { 192.168.1.1; };
    file "slaves/db.example.com";
};
```

### The `@` symbol in zone files:

`@` means "current origin" — the zone name from `named.conf`:

```
zone "127.in-addr.arpa" {
    type master;
    file "/etc/bind/db.127";
};
// Inside db.127, the @ symbol = 127.in-addr.arpa
```

---

## Managing the named Daemon

### rndc (Remote Name Daemon Control)

Controls `named` locally and **remotely**. Requires a shared secret key (`/etc/rndc.key`).

**`/etc/rndc.key`:**

```
key "rndc-key" {
    algorithm hmac-md5;
    secret "tyZqsLtPHCNna5SFBLT0Eg==";
};

options {
    default-key "rndc-key";
    default-server 127.0.0.1;
    default-port 953;
};
```

**In `named.conf`:**

```
key "rndc-key" {
    algorithm hmac-md5;
    secret "tyZqsLtPHCNna5SFBLT0Eg==";
};

controls {
    inet 127.0.0.1 port 953
        allow { 127.0.0.1; } keys { "rndc-key"; };
};
```

> The secret is never transmitted over the network — both sides compute a **hash** and compare. `rndc.key` permissions: owner `root:bind`, mode `640`. To generate: `rndc-confgen`.

### rndc commands:

| Command | Action |
|---|---|
| `rndc reload` | Reload all zones and config |
| `rndc reload example.com` | Reload one zone only |
| `rndc status` | Server status |
| `rndc flush` | Clear cache |
| `rndc stop` | Stop named |
| `rndc help` | List all commands |

### Signals via `kill`:

```bash
kill -HUP  <PID>   # SIGHUP: reload config and zones
kill -TERM <PID>   # stop named
kill -INT  <PID>   # stop named
```

### Via systemd / SysV:

```bash
systemctl reload  named      # reload config
systemctl restart named      # restart
systemctl stop    named      # stop
systemctl start   named      # start

service named reload         # SysV alternative
/etc/init.d/bind reload      # Debian
```

---

## named-checkconf and named-checkzone

Validates `named.conf` syntax **without** restarting the server.

```bash
named-checkconf                                  # default location
named-checkconf /etc/bind/named.conf             # non-standard location
named-checkzone example.com /var/named/db.example.com  # check zone file
```

- If no errors — returns **without output**
- On error: `/etc/named.conf:56: unknown option 'nclude'`

> **Warning:** Files included via `include` are **not checked automatically** — they must be passed explicitly as an argument.

---

## Alternative DNS Servers

### dnsmasq

Lightweight **DNS forwarder + DHCP server**. Supports:
- Static and dynamic DHCP leases
- BOOTP/TFTP/PXE protocols
- Ideal for local networks and embedded systems

### djbdns

Created by Daniel Bernstein in response to BIND vulnerabilities. Includes:
- DNS cache, DNS server, DNS client
- DNS debugging tools
- Source code is **public domain since 2007**
- Debian fork: **dbndns**

### PowerDNS

Dutch DNS software vendor (license: **GPL**). Packages: `pdns`, `pdns-server`.

Supported backends:

```bash
pdns-backend-mysql     # MySQL
pdns-backend-pgsql     # PostgreSQL
pdns-backend-ldap      # LDAP
pdns-backend-sqlite    # SQLite
pdns-backend-lua       # Lua
pdns-backend-geo       # Geo
pdns-backend-pipe      # Pipe/coprocess
pdns-recursor          # Recursive resolver
```

### Comparison:

| Server | License | Features |
|---|---|---|
| **BIND** | ISC | Most widely used, fully featured |
| **dnsmasq** | GPL | Lightweight DNS+DHCP, for local networks |
| **djbdns** | Public Domain | High security, debugging tools |
| **PowerDNS** | GPL | Multiple backends (MySQL, LDAP, SQLite…) |

---

## dig and host

ISC officially **deprecated `nslookup`** in favor of `host` and `dig`. `nslookup` is still available in most distributions.

### host

Simple tool for basic name resolution.

```bash
host example.com               # forward lookup
host -t MX example.com         # query specific record type
host -t NS example.com
host 217.147.180.162            # reverse lookup
host -C example.com            # compare SOA across all NS servers
host -l example.com            # list all hosts (AXFR)
```

**Key options:**

| Option | Description |
|---|---|
| `-t type` | Record type (A, MX, NS, SOA…) |
| `-a` | Equivalent to `-v -t ANY` |
| `-C` | Compare SOA on authoritative servers |
| `-l` | All domain hosts (AXFR) |
| `-r` | Disable recursion |
| `-T` | Use TCP |
| `-v` | Verbose output |

### dig

More flexible tool with detailed output.

```bash
dig example.com                    # A record
dig -t NS  example.com             # NS records
dig -t MX  example.com             # MX records
dig -t SOA example.com             # SOA record
dig -t ANY example.com             # all records

dig @8.8.8.8 example.com           # query specific server
dig -x 217.147.180.162             # reverse PTR lookup
dig +trace example.com             # trace from root
dig +short example.com             # brief output
dig +noall +answer example.com     # answer section only
dig @ns.example.com version.bind chaos txt  # query BIND version
```

**dig output sections:**

| Section | Content |
|---|---|
| `QUESTION` | What was queried |
| `ANSWER` | Response to the query |
| `AUTHORITY` | Zone NS servers |
| `ADDITIONAL` | Extra info (IPs for NS servers) |
| Statistics | Query time, server, size |

**Key dig options:**

| Option | Description |
|---|---|
| `-t type` | Record type: A, MX, NS, TXT, ANY… |
| `@server` | Specify DNS server |
| `-x addr` | Reverse lookup (PTR) |
| `+trace` | Trace from root |
| `+short` | Brief output |
| `+norecurse` | Disable recursion |
| `+tcp` | Use TCP |
| `+dnssec` | Request DNSSEC records |
| `-4` / `-6` | IPv4 / IPv6 only |
| `-f file` | Batch mode |
| `-k keyfile` | TSIG key |

---

## Exam Cheat Sheet

### Files and Paths

```
/etc/named.conf               # main BIND config (RHEL)
/etc/bind/named.conf          # main BIND config (Debian/Ubuntu)
/var/named/                   # zone files (RHEL/CentOS)
/etc/bind/db.*                # zone files (Debian/Ubuntu)
/etc/rndc.key                 # rndc key (permissions: root:bind, 640)
/var/run/named/named.pid      # named PID file
/etc/nsswitch.conf            # controls name resolution order
```

### Utilities

```bash
named-checkconf                              # validate named.conf syntax
named-checkconf /etc/bind/named.conf         # non-standard path
named-checkzone zone file                    # validate zone file
rndc-confgen                                 # generate rndc.key
```

### Managing named

```bash
rndc reload                  # reload config and all zones
rndc reload example.com      # reload one zone
rndc flush                   # clear cache
rndc status                  # server status
rndc stop                    # stop

kill -HUP  <PID>             # SIGHUP: reload config
kill -TERM <PID>             # stop named

systemctl reload  named      # reload (systemd)
systemctl restart named      # restart (systemd)
service named reload         # reload (SysV)
```

### Key named.conf Rules

| Rule | Note |
|---|---|
| Only **1** `options` block | Otherwise syntax error |
| Only **1** `logging` block | Otherwise syntax error |
| `;` is **not** a comment | Unlike zone files |
| `@` in zones | Current origin |
| `include` files not checked | `named-checkconf` ignores them |

### Zone Types

| Type | Purpose |
|---|---|
| `master` | Primary authoritative |
| `slave` | Secondary authoritative |
| `hint` | Root servers (zone `"."`) |
| `forward` | Query forwarding |

### Alternative Servers (exam facts)

| Server | Key facts |
|---|---|
| **dnsmasq** | Lightweight, DNS+DHCP, local networks |
| **djbdns** | Bernstein, security, Public Domain 2007 |
| **PowerDNS** | GPL, multiple backends (MySQL, LDAP…) |
