---
title: "LPIC-2 208.1 — Basic Apache Configuration"
date: 2026-02-03
description: "Apache httpd architecture, configuration files, MPM models, DSO modules, access control (2.2 vs 2.4 syntax), virtual hosting, mod_perl, mod_php, logging, and monitoring. LPIC-2 exam topic 208.1."
tags: ["Linux", "LPIC-2", "Apache", "HTTP", "VirtualHost", "web server"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-208-1-apache-basic-configuration/"
page_lang: "en"
---

> **Exam topic 208.1** — Basic Apache Configuration (weight: 4). Covers Apache httpd installation, configuration structure, modules, MPM, access control, virtual hosts, and basic performance tuning.

---

## Apache Overview

**Apache HTTP Server** (httpd) is the most widely deployed web server in the world. It handles HTTP/HTTPS requests and supports a rich module ecosystem.

**Default port:** 80 (HTTP), 443 (HTTPS)

### Configuration file locations:

| Distribution | Main config | Additional |
|---|---|---|
| RHEL / CentOS | `/etc/httpd/conf/httpd.conf` | `/etc/httpd/conf.d/*.conf` |
| Debian / Ubuntu | `/etc/apache2/apache2.conf` | Split into multiple directories |

### Debian/Ubuntu directory structure:

```
/etc/apache2/
├── apache2.conf          # Main config
├── ports.conf            # Listen directives
├── sites-available/      # All virtual host configs
├── sites-enabled/        # Symlinks to active sites
├── mods-available/       # All module configs (.load + .conf)
├── mods-enabled/         # Symlinks to active modules
└── conf-available/       # Additional config snippets
    conf-enabled/         # Symlinks to active snippets
```

---

## Managing Apache

### apache2ctl / apachectl

```bash
apache2ctl start           # start Apache
apache2ctl stop            # stop Apache
apache2ctl restart         # restart (drops connections)
apache2ctl graceful        # graceful restart (waits for requests to finish)
apache2ctl graceful-stop   # graceful stop
apache2ctl configtest      # test configuration (-t shorthand)
apache2ctl status          # show server status (requires mod_status)
apache2ctl -M              # list loaded modules
apache2ctl -S              # list virtual hosts
apache2ctl -l              # list statically compiled modules (httpd -l)
```

### Debian helper tools:

```bash
a2enmod  rewrite           # enable module
a2dismod rewrite           # disable module
a2ensite 000-default       # enable virtual host
a2dissite 000-default      # disable virtual host
a2enconf security          # enable config snippet
a2disconf security         # disable config snippet
```

---

## Apache Modules

### Static vs DSO modules

| Type | How loaded | Detection |
|---|---|---|
| **Static** | Compiled into binary | `httpd -l` (built-in list) |
| **DSO** | Loaded at runtime via `LoadModule` | `httpd -M` or `apache2ctl -M` |

DSO (Dynamic Shared Object) requires `mod_so` to be compiled in.

### LoadModule syntax:

```apache
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule php7_module      /usr/lib/apache2/modules/libphp7.so
```

Module files location:
- RHEL: `/etc/httpd/modules/` → symlink to `/usr/lib64/httpd/modules/`
- Debian: `/usr/lib/apache2/modules/`

### Building modules with apxs:

```bash
apxs -c -i -a mod_example.c
# -c  compile
# -i  install into modules directory
# -a  enable in httpd.conf (adds LoadModule)
```

---

## MPM — Multi-Processing Module

Apache can use one of several MPM backends:

### Prefork MPM (default for mod_php compatibility)

Each request handled by a **separate process** (no threads). Safer with non-thread-safe libraries.

```apache
<IfModule mpm_prefork_module>
    StartServers          5
    MinSpareServers       5
    MaxSpareServers      10
    MaxRequestWorkers   150
    MaxConnectionsPerChild 0
</IfModule>
```

| Directive | Default | Description |
|---|---|---|
| `StartServers` | 5 | Initial child processes |
| `MinSpareServers` | 5 | Minimum idle processes |
| `MaxSpareServers` | 10 | Maximum idle processes |
| `MaxRequestWorkers` | 150 | Max simultaneous connections |
| `MaxConnectionsPerChild` | 0 | Max requests per child (0 = unlimited) |

### Worker MPM

Hybrid: multiple processes, each with multiple **threads**. More efficient but requires thread-safe code.

```apache
<IfModule mpm_worker_module>
    StartServers          2
    MinSpareThreads      25
    MaxSpareThreads      75
    ThreadsPerChild      25
    MaxRequestWorkers   150
    MaxConnectionsPerChild 0
</IfModule>
```

> **MaxRequestWorkers** protects available RAM from being exhausted under high load.

---

## Logging

### Access log

Default location: `/var/log/apache2/access.log` (Debian) or `/var/log/httpd/access_log` (RHEL)

**Common Log Format (CLF):**

```
%h %l %u %t "%r" %>s %b
```

| Token | Meaning |
|---|---|
| `%h` | Remote hostname/IP |
| `%l` | Identity (from identd, usually `-`) |
| `%u` | Authenticated user (or `-`) |
| `%t` | Time of request |
| `%r` | First line of request (`GET /path HTTP/1.1`) |
| `%>s` | Final HTTP status code |
| `%b` | Bytes sent (excluding headers; `-` if zero) |

**Combined format** adds:

```
%h %l %u %t "%r" %>s %b "%{Referer}i" "%{User-Agent}i"
```

### Defining log formats:

```apache
LogFormat "%h %l %u %t \"%r\" %>s %b" common
LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined

CustomLog /var/log/apache2/access.log combined
```

### Error log

```apache
ErrorLog  /var/log/apache2/error.log
LogLevel  warn
```

**LogLevel values** (least → most verbose):

```
emerg → alert → crit → error → warn → notice → info → debug → trace1 → trace8
```

**Per-module or per-directory LogLevel** (Apache 2.3.6+):

```apache
LogLevel info ssl:warn
LogLevel warn
<Directory /var/www/debug>
    LogLevel debug
</Directory>
```

---

## Access Control

### Two types:

| Type | Mechanism | Description |
|---|---|---|
| **DAC** (Authentication) | `authn_file`, `htpasswd` | Based on username/password |
| **MAC** (Authorization) | `authz_host`, IP rules | Based on IP address or hostname |

### Apache 2.2 syntax (legacy):

```apache
Order Deny,Allow
Deny from all
Allow from 192.168.1.0/24

Order Allow,Deny
Allow from all
Deny from 10.0.0.0/8
```

`Satisfy Any` — access if EITHER authentication OR IP passes.

### Apache 2.4 syntax (current):

```apache
# Allow by IP:
Require ip 192.168.1.0/24

# Allow localhost:
Require local

# Allow authenticated users:
Require valid-user

# Allow specific user:
Require user alice

# Allow group:
Require group admins

# Combine (all must match):
<RequireAll>
    Require valid-user
    Require ip 192.168.1.0/24
</RequireAll>

# Combine (any must match):
<RequireAny>
    Require ip 10.0.0.0/8
    Require valid-user
</RequireAny>

# Deny specific, allow rest:
<RequireNone>
    Require ip 1.2.3.4
</RequireNone>
```

---

## Password Authentication

### htpasswd

```bash
htpasswd -cB /etc/apache2/.htpasswd alice    # create file + add user (bcrypt)
htpasswd -B  /etc/apache2/.htpasswd bob      # add user to existing file
htpasswd     /etc/apache2/.htpasswd alice    # update password (MD5 default)
htpasswd -D  /etc/apache2/.htpasswd alice    # delete user
```

> **Security:** The password file MUST be stored **outside** the DocumentRoot.

### htpasswd options:

| Option | Description |
|---|---|
| `-c` | Create new file (overwrites if exists) |
| `-B` | Use bcrypt (recommended) |
| `-m` | Use MD5 (default on most systems) |
| `-s` | Use SHA-1 |
| `-D` | Delete user |

### Basic Auth configuration:

```apache
<Directory /var/www/html/private>
    AuthType Basic
    AuthName "Restricted Area"
    AuthUserFile /etc/apache2/.htpasswd
    AuthGroupFile /etc/apache2/.htgroups
    Require valid-user
</Directory>
```

### .htaccess files

Per-directory overrides (no server restart needed):

```apache
# In httpd.conf or VirtualHost:
<Directory /var/www/html>
    AllowOverride All     # allow .htaccess to override everything
    # AllowOverride None  # disable .htaccess (more secure)
</Directory>
```

---

## mod_perl

Embeds a Perl interpreter inside Apache — scripts persist in memory between requests (fast).

```apache
LoadModule perl_module modules/mod_perl.so
AddModule  mod_perl.c

PerlModule Apache::Registry

Alias /perl /var/www/perl
<Directory /var/www/perl>
    SetHandler perl-script
    PerlHandler Apache::Registry
    Options +ExecCGI
    PerlSendHeader On
</Directory>
```

---

## mod_php

Embeds PHP interpreter inside Apache.

### Two modes:

| Mode | Description | Performance |
|---|---|---|
| **CGI** | PHP as external process | Slow (new process per request) |
| **DSO** | PHP as Apache module | Fast (in-process) |

### DSO configuration:

```apache
LoadModule php7_module /usr/lib/apache2/modules/libphp7.so

<FilesMatch "\.php$">
    SetHandler application/x-httpd-php
</FilesMatch>

# Alternatively:
AddType application/x-httpd-php .php .phtml
```

### PHP settings in Apache config:

```apache
php_value  upload_max_filesize 10M
php_flag   display_errors      Off
```

> PHP settings in `.htaccess` require `AllowOverride Options`.

---

## Virtual Hosting

### Name-based virtual hosting (recommended)

Multiple sites on a single IP, distinguished by the `Host:` header.

```apache
# Debian: Listen is usually in ports.conf
Listen 80

<VirtualHost *:80>
    ServerName   www.example.com
    ServerAlias  example.com
    DocumentRoot /var/www/example
    ErrorLog     /var/log/apache2/example-error.log
    CustomLog    /var/log/apache2/example-access.log combined
</VirtualHost>

<VirtualHost *:80>
    ServerName   www.other.com
    DocumentRoot /var/www/other
</VirtualHost>
```

> **Note:** `NameVirtualHost` directive is **obsolete in Apache 2.4** — it is now the default behavior when using `*:80`.

> **First VirtualHost** that matches the IP/port is the **default** if no `Host:` header matches.

### IP-based virtual hosting

Each site uses a different IP address:

```apache
<VirtualHost 192.168.1.10:80>
    ServerName site1.example.com
    DocumentRoot /var/www/site1
</VirtualHost>

<VirtualHost 192.168.1.20:80>
    ServerName site2.example.com
    DocumentRoot /var/www/site2
</VirtualHost>
```

### Listing configured virtual hosts:

```bash
apache2ctl -S
httpd -S
```

---

## Redirects

### mod_alias:

```apache
Redirect permanent /old    https://example.com/new     # 301
Redirect temp     /promo   https://example.com/sale    # 302 (default)
Redirect seeother /moved   https://example.com/here    # 303
Redirect gone     /removed                              # 410

RedirectMatch permanent ^/blog/(.*)$ /articles/$1      # regex redirect
```

### mod_rewrite:

```apache
RewriteEngine On
RewriteCond   %{HTTP_HOST} ^old\.example\.com$
RewriteRule   ^(.*)$       https://new.example.com$1 [R=301,L]

# Force HTTPS:
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$    https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
```

---

## Monitoring and Performance

### MRTG → RRDtool → Cricket

Evolution of network/server graphing tools:

| Tool | Description |
|---|---|
| **MRTG** | Multi Router Traffic Grapher — original SNMP-based grapher |
| **RRDtool** | Round Robin Database — storage + graphing engine, successor |
| **Cricket** | Configuration-driven monitoring system built on RRDtool |

### mod_status

```apache
<Location /server-status>
    SetHandler server-status
    Require ip 127.0.0.1
</Location>
```

```bash
apache2ctl status          # requires mod_status + lynx
```

### Key performance directive:

```apache
# Prefork: limits total simultaneous connections
MaxRequestWorkers 150

# Tune based on: RAM / (RAM per process)
# e.g., 2GB / 20MB per process = ~100 workers
```

---

## Key Configuration Directives Reference

```apache
ServerRoot      /etc/httpd                  # base for relative paths
ServerName      www.example.com:80          # server's hostname
DocumentRoot    /var/www/html               # default document root
Listen          80                          # port to listen on
User            apache                      # run as this user
Group           apache                      # run as this group
DirectoryIndex  index.html index.php        # default files

# Performance:
KeepAlive        On                         # persistent connections
MaxKeepAliveRequests 100
KeepAliveTimeout 5

# Security:
ServerTokens     Prod                       # minimal version in headers
ServerSignature  Off                        # no version in error pages
```

---

## Exam Cheat Sheet

### Files and Paths

```
/etc/httpd/conf/httpd.conf         # RHEL main config
/etc/apache2/apache2.conf          # Debian main config
/etc/apache2/sites-available/      # virtual host configs
/etc/apache2/sites-enabled/        # active virtual hosts (symlinks)
/etc/apache2/mods-available/       # available modules
/etc/apache2/mods-enabled/         # active modules (symlinks)
/var/log/apache2/access.log        # access log (Debian)
/var/log/apache2/error.log         # error log (Debian)
/var/log/httpd/access_log          # access log (RHEL)
```

### Commands

```bash
apache2ctl configtest             # test config (-t)
apache2ctl -M                     # list loaded modules (DSO + static)
apache2ctl -S                     # list virtual hosts
httpd -l                          # list static (compiled-in) modules only
a2enmod rewrite && apache2ctl graceful
htpasswd -cB /etc/apache2/.htpasswd user   # create file + bcrypt
htpasswd -D  /etc/apache2/.htpasswd user   # delete user
apxs -c -i -a mod_example.c               # compile + install + enable module
```

### MPM Comparison

| MPM | Model | Best for |
|---|---|---|
| **Prefork** | 1 process per request | mod_php (non-thread-safe) |
| **Worker** | Threads per process | High-concurrency, thread-safe |
| **Event** | Async keep-alive | Modern high-traffic sites |

### Access Control: 2.2 vs 2.4

| Apache 2.2 | Apache 2.4 equivalent |
|---|---|
| `Order Allow,Deny` + `Allow from all` | `Require all granted` |
| `Order Deny,Allow` + `Deny from all` | `Require all denied` |
| `Allow from 192.168.1.0/24` | `Require ip 192.168.1.0/24` |
| `Satisfy Any` | `<RequireAny>` |

### Logging Format Tokens

| Token | Meaning |
|---|---|
| `%h` | Client IP |
| `%u` | Auth user |
| `%t` | Timestamp |
| `%r` | Request line |
| `%>s` | Status code |
| `%b` | Bytes sent |
| `%{Referer}i` | Referer header |
| `%{User-Agent}i` | User-Agent header |

### Virtual Host Rules

| Rule | Note |
|---|---|
| First matching VirtualHost | becomes the default |
| `NameVirtualHost` | obsolete in Apache 2.4 |
| `Listen` directive | required (usually in ports.conf on Debian) |
| `ServerAlias` | additional names for same VirtualHost |
