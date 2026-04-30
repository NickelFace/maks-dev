---
title: "LPIC-2 208.4 — Nginx as Web Server and Reverse Proxy"
date: 2026-03-01
description: "Nginx architecture, reverse proxy configuration, virtual server setup, PHP via FastCGI (php-fpm), proxy_pass vs fastcgi_pass, location blocks, try_files. LPIC-2 exam topic 208.4."
tags: ["Linux", "LPIC-2", "Nginx", "reverse proxy", "FastCGI", "web server"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-208-4-nginx/"
page_lang: "en"
---

> **Exam topic 208.4** — Nginx as Web Server and Reverse Proxy (weight: 2). Covers installing and configuring Nginx as a reverse proxy and basic HTTP server.

---

## What Is Nginx

**Nginx** (pronounced "engine-x") is a multi-purpose open-source server. It can operate as:

- HTTP web server
- HTTP reverse proxy server
- IMAP/POP3 proxy

> Platforms like **Netflix**, **WordPress**, and **GitHub** use Nginx.

**Key features:**

- Does not use threads — works on an **event-driven (asynchronous) architecture**
- Small memory footprint
- Predictable performance under high load
- Suitable for both small and large environments
- Commercial version: **Nginx Plus**

---

## Reverse Proxy

A **proxy server** is an intermediary that forwards requests from multiple clients to various servers on the internet.

A **reverse proxy** is a proxy server that:

- Sits **behind a firewall** in a private network
- Routes client requests to the appropriate **backend servers**
- Provides an additional layer of abstraction and control over traffic

### Use cases:

| Use case | Description |
|---|---|
| **Load balancing** | Distributes requests across servers, prevents overload; reroutes traffic when a server fails |
| **Traffic acceleration** | Data compression, caching, SSL offloading from backend servers |
| **Security and anonymity** | Hides backend servers, protects against attacks, allows multiple servers behind one URL |

---

## Configuration Files

| Path | Description |
|---|---|
| `/etc/nginx/` | Configuration directory |
| `/etc/nginx/nginx.conf` | Main configuration file |
| `/etc/nginx/sites-enabled/default` | Default site config (Debian-based) |

---

## Basic Reverse Proxy Configuration

```nginx
location / {
    proxy_set_header X-Real-IP        $remote_addr;
    proxy_set_header X-Forwarded-For  $remote_addr;
    proxy_set_header Host             $host;
    proxy_pass       http://localhost:8000;
}
```

> All requests Nginx forwards to the HTTP server at `localhost:8000`.

### Full example with PHP proxy:

```nginx
server {
    listen   80;

    root /var/www/;
    index index.php index.html index.htm;

    server_name example.com www.example.com;

    location / {
        try_files $uri $uri/ /index.php;
    }

    location ~ \.php$ {
        proxy_set_header X-Real-IP       $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header Host            $host;
        proxy_pass http://localhost:8080;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

> `location ~ /\.ht` — prevents serving `.htaccess` file contents.
> `try_files` — tries to serve the requested file; if not found, passes the request to the proxy.

---

## Basic Web Server Configuration

```nginx
server {
    # Listen on all interfaces (or specific IP: listen x.x.x.x:80;)
    listen 80;

    # Server name. Wildcard: *.example.com — subdomains only.
    # For domain + subdomains: example.com and *.example.com
    server_name example.com www.example.com;

    # Document root (best placed at server level, not inside location)
    root /usr/local/www/example.com;

    # Logs. Error log cannot be disabled.
    access_log /var/log/nginx/example.access.log;
    error_log  /var/log/nginx/example.error.log;

    location / {
        # Rewrite rules and other conditions
        # Avoid if() where possible
    }
}
```

---

## PHP Support via FastCGI

For PHP, Nginx uses a **FastCGI spawner**. Recommended: **php-fpm**.

php-fpm capabilities:
- Adaptive worker process spawning
- Statistics
- Workers with different `uid/gid/chroot/environment` and `php.ini`
- Replacement for `safe_mode`

Best practice — extract PHP config to a separate file and include it:

```nginx
# At the end of nginx.conf:
include php.conf;
```

Contents of `php.conf`:

```nginx
location ~ \.php {
    # Security: return 404 if file doesn't exist
    try_files $uri =404;

    fastcgi_param  QUERY_STRING       $query_string;
    fastcgi_param  REQUEST_METHOD     $request_method;
    fastcgi_param  CONTENT_TYPE       $content_type;
    fastcgi_param  CONTENT_LENGTH     $content_length;

    fastcgi_param  SCRIPT_NAME        $fastcgi_script_name;
    fastcgi_param  SCRIPT_FILENAME    $request_filename;

    fastcgi_param  REQUEST_URI        $request_uri;
    fastcgi_param  DOCUMENT_URI       $document_uri;
    fastcgi_param  DOCUMENT_ROOT      $document_root;
    fastcgi_param  SERVER_PROTOCOL    $server_protocol;

    fastcgi_param  GATEWAY_INTERFACE  CGI/1.1;
    fastcgi_param  SERVER_SOFTWARE    nginx;

    fastcgi_param  REMOTE_ADDR        $remote_addr;
    fastcgi_param  REMOTE_PORT        $remote_port;
    fastcgi_param  SERVER_ADDR        $server_addr;
    fastcgi_param  SERVER_PORT        $server_port;
    fastcgi_param  SERVER_NAME        $server_name;

    # Unix socket:
    # fastcgi_pass unix:/tmp/php5-fpm.sock;

    # TCP connection:
    fastcgi_pass 127.0.0.1:9000;
}
```

---

## Installation

### Debian / Ubuntu:

```bash
apt-get install nginx
# nginx starts automatically
```

### Red Hat / CentOS:

```bash
# First add EPEL repository
yum install epel-release
yum install nginx

# Start and enable manually
systemctl start nginx
systemctl enable nginx
```

> If **Apache** is already running on port 80 — stop it before starting Nginx, or configure both servers on **different ports**.

---

## Exam Cheat Sheet

### Key directives:

| Directive | Purpose |
|---|---|
| `listen 80` | Port to listen on |
| `server_name` | Hostname(s) for this server block |
| `root` | Document root directory |
| `proxy_pass` | Forward requests to HTTP backend |
| `fastcgi_pass` | Forward requests to FastCGI backend (PHP) |
| `try_files` | Try serving file, fallback to proxy/index |
| `access_log` | Access log path |
| `error_log` | Error log path (cannot be disabled) |
| `include` | Include additional config file |

### proxy_pass vs fastcgi_pass:

| Directive | Use when |
|---|---|
| `proxy_pass` | Proxying to an HTTP/HTTPS server |
| `fastcgi_pass` | Proxying to a FastCGI application (PHP-FPM) |

### Key exam facts:

| Question | Answer |
|---|---|
| Nginx architecture | Event-driven, async — no threads |
| Config directory | `/etc/nginx/` |
| Main config file | `/etc/nginx/nginx.conf` |
| PHP integration method | FastCGI via `fastcgi_pass` |
| Directive for document root | `root` |
| Block `.htaccess` serving | `location ~ /\.ht { deny all; }` |
