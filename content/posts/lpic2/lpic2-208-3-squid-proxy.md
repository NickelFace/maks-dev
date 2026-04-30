---
title: "LPIC-2 208.3 — Squid Caching Proxy"
date: 2026-02-20
description: "Squid 3.x configuration: squid.conf parameters, ACL types, http_access rules, user authentication schemes (basic/digest/ntlm/negotiate), redirectors, memory management, and squid -k commands. LPIC-2 exam topic 208.3."
tags: ["Linux", "LPIC-2", "Squid", "proxy", "cache", "ACL"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-208-3-squid-proxy/"
page_lang: "en"
---

> **Exam topic 208.3** — Squid Caching Proxy (weight: 2). Covers Squid 3.x configuration, ACL definitions, access control, client authentication, and redirectors.

---

## What Is a Web Cache

A web cache (HTTP proxy) is an intermediary server between clients and web servers:

1. Client is configured to use the proxy (host + port)
2. All browser requests go to the proxy, not directly to the server
3. Proxy contacts the target server, saves the response in cache
4. On repeated requests — serves content from cache (fast, no network load)

**Benefits:** reduced bandwidth usage · faster access · content filtering · load balancing

### Transparent Proxy

A transparent proxy intercepts traffic **without any client-side configuration**. Implemented as a combination of a proxy server and router with traffic redirection. The client is unaware of the proxy.

---

## Configuration File Locations

| Distribution | Path |
|---|---|
| Debian / Ubuntu | `/etc/squid3/` or `/etc/squid/` |
| Red Hat / CentOS | `/etc/squid/` |
| Compiled from source | `/usr/local/squid/etc/` |

Main configuration file: **`squid.conf`** (~125 options, only ~8 required to run).

> If a directive is absent from `squid.conf`, Squid uses the default value. Squid can technically start with an empty config — but all clients will be denied.

---

## Key squid.conf Parameters

| Parameter | Purpose | Default |
|---|---|---|
| `http_port` | Port for incoming requests | **3128** (also 8080) |
| `cache_dir` | Directory and parameters for disk cache | 100 MB, 16×256 subdirs |
| `cache_mem` | RAM for "hot" objects | — |
| `maximum_object_size` | Max size of cached object | **4 MB** |
| `minimum_object_size` | Min size of cached object | **0 KB** (no limit) |
| `cache_swap` | Max disk cache size | — |
| `auth_param` | Authentication program settings | — |
| `redirect_program` | External redirector program | — |
| `redirect_children` | Number of redirector processes | — |

### cache_dir format:

```squid
cache_dir /usr/local/squid/cache/ 100 16 256
#                                  |   |   |
#                                  |   |   └─ 2nd-level subdirectory count
#                                  |   └───── 1st-level subdirectory count
#                                  └───────── cache size in MB
```

> Squid creates many subdirectories with few files each — searching a directory with 1,000,000 entries is extremely slow. Subdirectory splitting speeds up disk access.

---

## Access Control Lists (ACL)

An ACL is a named filter. Squid evaluates rules **top to bottom** and stops at the **first match**.

### Structure:

```squid
acl <name> <type> <value>
http_access allow|deny <name>
```

### ACL types:

| Type | Description |
|---|---|
| `src` | Source IP address/network (client) |
| `dst` | Destination IP address/network (server) |
| `srcdomain` | Source domain name |
| `dstdomain` | Destination domain name |
| `port` | TCP port |
| `time` | Time of day and day of week |
| `proto` | Protocol (HTTP, FTP, etc.) |
| `browser` | Browser type (User-Agent) |
| `proxy_auth` | User authentication |
| `url_regex` | Regular expression for URL |

### ACL examples:

**Allow only internal network:**

```squid
acl ourallowedhosts src 192.168.1.0/255.255.255.0
acl all src 0.0.0.0/0.0.0.0

http_access allow ourallowedhosts
http_access deny all
```

**Allow access only during lunch break:**

```squid
acl allowed_hosts src 192.168.1.0/255.255.255.0
acl lunchtime MTWHF 12:00-13:00
http_access allow allowed_hosts lunchtime
```

> `MTWHF` = Monday–Friday | `WHFAS` = Wednesday–Sunday

**Block sites by domain name:**

```squid
acl adults dstdomain playboy.com sex.com
acl ourallowedhosts src 192.168.1.0/255.255.255.0
acl all src 0.0.0.0/0.0.0.0

http_access deny adults
http_access allow ourallowedhosts
http_access deny all
```

**Block social media except during lunch:**

```squid
acl socialmedia dstdomain www.facebook.com www.twitter.com
acl lunch MTWHF 12:00-13:00
http_access allow socialmedia lunch
http_access deny socialmedia
```

---

## Important ACL Behavior Rules

> **Last-rule default:** Squid automatically appends the **opposite rule** after the last entry:
> - Last rule is `allow` → Squid implicitly adds `deny all`
> - Last rule is `deny` → Squid implicitly adds `allow all`
>
> **Always explicitly end the list with `http_access deny all`!**

> **Authentication trap:** A rule `http_access allow name` with a `proxy_auth` ACL **behaves like `deny !name`** — it denies unauthenticated users, but does NOT grant access to authenticated ones!
>
> To actually grant access to authenticated users, add an explicit allow:
> ```squid
> http_access allow name
> http_access allow all
> ```

> **Common mistake:** `http_access allow name` + the implicit `deny all` = authenticated users will be **blocked**. This is one of the most common beginner Squid mistakes.

---

## User Authentication

### How authentication works:

```
Browser → request without authorization header
Squid   → HTTP 407 (Proxy Authentication Required)
Browser → prompts user for login/password
Browser → repeat request with Authorization header
Squid   → passes credentials to external authenticator (stdin)
Auth.   → responds OK or ERR (stdout)
Squid   → allows or blocks the request
```

### Authentication schemes:

| Scheme | Security | Description |
|---|---|---|
| `basic` | Low | Login/password in Base64 (plaintext) |
| `digest` | Medium | Hashed password transmission |
| `ntlm` | High | Windows NTLM authentication |
| `negotiate` | High | Kerberos/NTLM (most secure) |

> `digest`, `ntlm`, and `negotiate` do not transmit passwords in plaintext. The order of schemes in `squid.conf` determines the order offered to clients.

### Authentication backends:

| Backend | Description |
|---|---|
| `LDAP` | Lightweight Directory Access Protocol |
| `NCSA` | NCSA-style login/password file |
| `PAM` | Unix Pluggable Authentication Modules |
| `SMB` | Windows NT / Samba |
| `MSNT` | Windows NT domain |
| `SASL` | Simple Authentication and Security Layer |
| `YP` | NIS database |
| `getpwam` | Old Unix `/etc/passwd` file |

### PAM authentication example:

```squid
auth_param basic program /usr/lib/squid/pam_auth
auth_param basic children 5 startup=5 idle=1
auth_param basic realm Squid proxy-caching web server
auth_param basic credentialsttl 2 hours

acl ourhosts proxy_auth REQUIRED
http_access allow ourhosts
http_access allow all        # required! otherwise access will be denied
```

---

## Redirectors

Squid can pass every URL through an **external redirector** — a program or script that reads a URL from `stdin` and returns a new URL (or an empty string if unchanged).

> A redirector is not a standard part of Squid — it's an external program. Examples are in the `contrib/` directory of the source code. A ready-made simple redirector is **squirm** (uses a regex library).

```squid
redirect_program /usr/bin/my_redirector
redirect_children 5
```

### Input line format:

```
URL  ip-address/fqdn  ident  method
```

| Field | Description |
|---|---|
| `URL` | Requested URL |
| `ip-address/fqdn` | Client IP and domain name |
| `ident` | IDENT/AUTH result (or `-`) |
| `method` | HTTP method: GET, POST, etc. |

### Example input/output:

```
# Input:
ftp://ftp.gnome.org/pub/GNOME/stable/README  192.168.12.34/-  -  GET

# Output (redirect to mirror):
ftp://ftp.mirror.org/gnome/stable/README  192.168.12.34/-  -  GET
```

> For HTTP redirect, the response must start with `301:` or `302:`

### Perl redirector example:

```perl
#!/usr/local/bin/perl
$|=1;           # Disable output buffering
while (<>) {
    s@http://fromhost.com@http://tohost.org@;
    print;
}
```

---

## Memory Management

Squid makes heavy use of RAM — reading from memory is much faster than reading from disk.

### Metadata (StoreEntry) per object:

| Architecture | StoreEntry | + MD5 key | Total |
|---|---|---|---|
| 32-bit (Intel, MIPS, Sparc) | 56 bytes | 16 bytes | **72 bytes** |
| 64-bit (Alpha) | 88 bytes | 16 bytes | **104 bytes** |

> A cache with **1,000,000 objects** requires ~**72 MB** just for metadata.

### What else lives in memory:

- Disk read/write buffers
- Network I/O buffers
- IP cache and FQDN cache
- ICMP database (Netdb)
- Current request state (headers)
- "Hot" objects in full (frequently accessed)

### Memory parameters:

```squid
cache_mem 64 MB               # RAM for hot objects
maximum_object_size 4096 KB   # max size for disk caching (4 MB)
minimum_object_size 0 KB      # min size (0 = no limit)
cache_swap 1024               # max disk cache in MB
```

---

## Applying Changes

```bash
squid -k reconfigure    # reload config without restarting
squid -k shutdown       # stop Squid
squid -k parse          # parse and check config for errors
```

---

## Exam Cheat Sheet

### Directive Quick Reference

| Directive | Action |
|---|---|
| `http_port 3128` | Default port |
| `cache_dir ufs /var/spool/squid 100 16 256` | 100 MB disk cache |
| `acl NAME src 192.168.1.0/24` | ACL by source IP |
| `acl NAME dstdomain example.com` | ACL by destination domain |
| `acl NAME time MTWHF 08:00-18:00` | ACL by time |
| `acl NAME proxy_auth REQUIRED` | ACL requiring authentication |
| `http_access allow NAME` | Allow ACL |
| `http_access deny NAME` | Deny ACL |
| `auth_param basic program /path` | Authentication program |
| `squid -k reconfigure` | Apply config without restart |

### Minimal Working Configuration:

```squid
http_port 3128
cache_dir ufs /var/spool/squid 100 16 256

acl localnet src 192.168.0.0/255.255.0.0
acl all src 0.0.0.0/0.0.0.0

http_access allow localnet
http_access deny all
```

### Day-of-Week Letters for `time` ACL:

| Letter | Day |
|---|---|
| M | Monday |
| T | Tuesday |
| W | Wednesday |
| H | Thursday |
| F | Friday |
| A | Saturday |
| S | Sunday |

### Key Exam Facts

| Fact | Value |
|---|---|
| Default Squid port | **3128** |
| Proxy auth required HTTP status | **407** |
| ACL type for user auth | `proxy_auth` |
| Reload without restart | `squid -k reconfigure` |
| Last rule implicit default | opposite direction added automatically |
| `basic` auth security | Base64 = plaintext — lowest security |
| `maximum_object_size 4096 KB` | objects > 4 MB not cached to disk |
