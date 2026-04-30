---
title: "LPIC-2 208.2 — Apache HTTPS Configuration"
date: 2026-02-12
description: "SSL/TLS with mod_ssl: key/CSR generation, self-signed certificates, CA.pl, SNI, wildcard certs, certificate chains, disabling weak protocols and ciphers, ServerTokens, TraceEnable. LPIC-2 exam topic 208.2."
tags: ["Linux", "LPIC-2", "Apache", "HTTPS", "SSL", "TLS", "mod_ssl"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-208-2-https-configuration/"
page_lang: "en"
---

> **Exam topic 208.2** — Apache HTTPS Configuration (weight: 3). Covers SSL/TLS setup with mod_ssl, certificate management, SNI, virtual hosting over HTTPS, and hardening against known attacks.

---

## SSL/TLS Basics

```
Client                              Server (Apache + mod_ssl)
  |                                        |
  |---- request public key --------------->|
  |<--- send (CA-signed) public key -------|
  |                                        |
  |  verify signature against CA trust     |
  |  (locally, in browser)                 |
  |                                        |
  |---- encrypt session key with pub key ->|
  |<--- decrypt with private key ----------|
  |         (symmetric session from here)  |
```

**Asymmetric cryptography (PKC):**

- **Public key** — encrypts messages, distributed openly (in the certificate)
- **Private key** — decrypts messages, **never leaves the server**
- Certificate is signed by a CA (Certificate Authority) — browser trusts it

---

## SSL File Locations

| Type | Debian | Red Hat |
|---|---|---|
| Certificates | `/etc/ssl/certs/` | `/etc/pki/tls/certs/` |
| Private keys | `/etc/ssl/private/` | `/etc/pki/tls/private/` |
| OpenSSL config | `/etc/ssl/openssl.cnf` | `/etc/pki/tls/openssl.cnf` |

> Best practice: create a subdirectory per site, e.g. `/etc/ssl/webserver/`.

---

## Installing mod_ssl

```bash
# Red Hat / CentOS
yum install httpd mod_ssl

# Debian / Ubuntu
apt-get install apache2 openssl
```

### Enabling on Debian:

```bash
a2enmod ssl
service apache2 restart

# Check:
apachectl status | grep -i ssl
```

### Enabling on Red Hat (in `/etc/httpd/conf.d/ssl.conf`):

```apache
LoadModule ssl_module modules/mod_ssl.so
Listen 443
```

---

## Generating a Key and CSR (for a Commercial CA)

```bash
# Step 1: Generate private key (2048-bit RSA, encrypted with 3DES)
openssl genrsa -des3 -out server.key 2048

# Step 1a (optional): Strip passphrase for automatic Apache restart
openssl rsa -in server.key -out stripped.key
# server.key = encrypted; stripped.key = plaintext (guard carefully)

# Step 2: Create CSR (Certificate Signing Request)
openssl req -new -key server.key -out server.csr
# When prompted for "Common Name", enter the FQDN: www.example.com
```

### Common Name (CN) rules:

| CN value | Valid for |
|---|---|
| `www.foo.example` | Only `https://www.foo.example` |
| `foo.example` | NOT valid for `www.foo.example` |
| `*.foo.example` | All subdomains, but NOT `foo.example` itself |

After creating the CSR:
1. Send `server.csr` to a commercial CA (DigiCert, Comodo, etc.)
2. Receive signed certificate `newcert.pem`
3. The `.csr` file is no longer needed

---

## Creating a Self-Signed Certificate

```bash
mkdir /etc/ssl/webserver

openssl req -new -x509 -days 365 -nodes \
  -out /etc/ssl/webserver/apache.pem \
  -keyout /etc/ssl/webserver/apache.key
```

| Flag | Meaning |
|---|---|
| `-x509` | Create certificate directly (not a CSR) |
| `-nodes` | No passphrase on key (for automatic startup) |
| `-days 365` | Certificate validity period |

> Self-signed certificates trigger browser warnings — the CA is unknown. Use only for testing or internal networks.

```bash
# Inspect certificate
openssl x509 -in /etc/ssl/webserver/apache.pem -text -noout

# Test SSL connection
openssl s_client -connect example.com:443
openssl s_client -connect example.com:443 -tls1_2
```

---

## Creating Your Own CA with CA.pl

```bash
# Script location:
# Debian:   /usr/lib/ssl/misc/CA.pl
# Red Hat:  /etc/pki/tls/misc/CA.pl

# Step 1: Create CA root  (→ ./demoCA/private/cakey.pem)
/usr/lib/ssl/misc/CA.pl -newca

# Step 2: Create certificate request  (→ newreq.pem, newkey.pem)
/usr/lib/ssl/misc/CA.pl -newreq

# Step 3: Sign the request  (→ newcert.pem)
/usr/lib/ssl/misc/CA.pl -signreq
```

| File | Contents |
|---|---|
| `newcert.pem` | Signed certificate |
| `newkey.pem` | Private key |

> Rename files for clarity: `ssltest.example.com.crt` and `ssltest.example.com.key`.

---

## Key SSL Directives

| Directive | Purpose |
|---|---|
| `SSLEngine on` | Enable SSL for this VirtualHost |
| `SSLCertificateFile` | Path to public certificate (PEM) |
| `SSLCertificateKeyFile` | Path to private key (PEM) |
| `SSLCACertificateFile` | Concatenated CA certificates (one file) |
| `SSLCACertificatePath` | Directory of CA certificates |
| `SSLProtocol` | Allowed/forbidden TLS/SSL versions |
| `SSLCipherSuite` | Colon-separated list of ciphers |
| `SSLHonorCipherOrder` | Server (not client) selects cipher order |
| `SSLCompression` | Enable/disable SSL compression |
| `SSLVerifyClient` | `require` = mutual TLS (client cert auth) |
| `ServerTokens` | How much version info to reveal in headers |
| `ServerSignature` | Apache signature on error pages |
| `TraceEnable` | Allow/deny HTTP TRACE method |

### SSLCACertificateFile vs SSLCACertificatePath:

```bash
# Single file — concatenate all CAs
cat ca1.pem ca2.pem ca3.pem > /etc/ssl/certs/ca-bundle.pem
```

```apache
SSLCACertificateFile /etc/ssl/certs/ca-bundle.pem
# OR
SSLCACertificatePath /etc/ssl/certs/
```

---

## Full HTTPS Virtual Host Configuration

### ports.conf (Debian):

```apache
Listen 80
Listen 443
```

### HTTP + HTTPS example:

```apache
<VirtualHost *:80>
    ServerName   example.com
    DocumentRoot /var/www/html
    Redirect permanent / https://example.com/
</VirtualHost>

<VirtualHost *:443>
    SSLEngine             On
    SSLCertificateFile    /etc/ssl/webserver/apache.pem
    SSLCertificateKeyFile /etc/ssl/webserver/apache.key

    ServerName    example.com
    DocumentRoot  /var/www/html
    ErrorLog      /var/log/apache2/error.log
</VirtualHost>
```

---

## SSL + Virtual Hosts Problem

### The timing issue:

```
Client → TCP → SSL handshake → [certificate sent] → HTTP request → Apache reads Host:
                    ^
          Certificate already sent!
          Apache doesn't yet know which VirtualHost is needed
```

| Virtual host type | SSL | Notes |
|---|---|---|
| **IP-based** | No problem | Unique IP per site |
| **Name-based** | Problem | One IP — Apache doesn't know the hostname until after SSL handshake |

**Solution:** SNI

---

## SNI — Server Name Indication

**SNI** is a TLS extension where the browser includes the hostname in the **first SSL handshake message** (`client hello`), before the encrypted channel is established.

```
Client ---- client hello + server_name=example.com ----> Apache
                                                           |
                                              Picks the right certificate
                                                           |
           <--------- Sends correct certificate -----------+
```

> **Limitation:** `server_name` must contain a hostname/domain — not an IP address.

### Browsers without SNI support:

| Browser/System | SNI |
|---|---|
| All modern browsers | Supported |
| Android 2.x (stock browser) | Not supported |
| IE on Windows XP before SP3 | Not supported |
| Java < 1.7 | Not supported |

### Multiple HTTPS sites via SNI:

```apache
<VirtualHost *:443>
    ServerName site1.example.com
    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/site1.pem
    SSLCertificateKeyFile /etc/ssl/private/site1.key
    DocumentRoot /var/www/site1
</VirtualHost>

<VirtualHost *:443>
    ServerName site2.example.com
    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/site2.pem
    SSLCertificateKeyFile /etc/ssl/private/site2.key
    DocumentRoot /var/www/site2
</VirtualHost>
```

### Fallback for non-SNI clients (multidomain certificate):

```apache
# Block without ServerName — catches all requests without SNI
<VirtualHost *:443>
    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/multidomain.pem
    SSLCertificateKeyFile /etc/ssl/private/multidomain.key
</VirtualHost>
```

---

## Wildcard and Multidomain Certificates

### Wildcard (`*.example.com`):

| URL | Valid? |
|---|---|
| `https://www.example.com` | Yes |
| `https://mail.example.com` | Yes |
| `https://example.com` | No (root domain) |
| `https://sub.www.example.com` | No (sub-subdomain) |

```apache
<VirtualHost *:443>
    ServerName virtual01.example.com
    SSLCertificateFile /etc/ssl/certs/wildcard.example.com.pem
    # CN = *.example.com
</VirtualHost>
```

---

## Certificate Chain

```
Root CA           ← in browser trust store
    |
    +-- Intermediate CA (G2)  ← may not be in browser!
            |
            +-- Your certificate
```

**Problem:** browser doesn't know the intermediate CA — chain error.

**Solution:**

```bash
# Concatenate: your cert first, then intermediate(s)
cat your_cert.pem intermediate.pem > chain.pem
```

```apache
# Modern way (Apache 2.4.8+) — everything in one file
SSLCertificateFile /etc/ssl/certs/chain.pem
```

---

## Disabling Weak Protocols and Ciphers

```apache
# TLS 1.2 only (minimum recommended)
SSLProtocol -All +TLSv1.2

# Strong ciphers only, no RC4
SSLCipherSuite EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH:!RC4

# Server chooses cipher order (not client)
SSLHonorCipherOrder On

# Disable compression (CRIME attack protection)
SSLCompression Off
```

### Protocol status:

| Protocol | Status | Reason |
|---|---|---|
| **SSLv2** | Forbidden | Removed from Apache 2.4+ |
| **SSLv3** | Forbidden | POODLE, DROWN |
| **TLS 1.0** | Deprecated | BEAST |
| **TLS 1.1** | Deprecated | Weak ciphers |
| **TLS 1.2** | Recommended | Current standard |
| **TLS 1.3** | Preferred | Most secure |

### Ciphers to block:

| Cipher | Identifier | Reason |
|---|---|---|
| RC4 / Arcfour | `!RC4` | Known vulnerabilities |
| CBC ciphers | `!CBC` | BEAST, Lucky13 |
| NULL ciphers | `!aNULL` | No encryption |
| MD5 | `!MD5` | Weak hash |
| EXPORT | `!EXPORT` | Intentionally weakened |

---

## Security Directives

### ServerTokens

Controls content of the `Server:` HTTP header:

| Value | Example `Server:` header |
|---|---|
| `Full` (default) | `Apache/2.4.41 (Ubuntu) OpenSSL/1.1.1f PHP/7.4` |
| `OS` | `Apache/2.4.41 (Ubuntu)` |
| `Minor` | `Apache/2.4` |
| `Major` | `Apache/2` |
| `Prod` (recommended) | `Apache` |

```apache
# Global directive (outside any VirtualHost!)
ServerTokens Prod
```

> Completely hiding or changing the header value requires compiling Apache from source.

### ServerSignature

```apache
ServerSignature Off     # no signature (recommended for production)
ServerSignature On      # show version (useful in proxy chains)
ServerSignature Email   # show version + ServerAdmin email
```

### TraceEnable

| Value | Behavior |
|---|---|
| `on` (default) | TRACE allowed per RFC 2616 |
| `off` | Server returns **405 Method Not Allowed** |
| `extended` | TRACE with request body — debug only |

```apache
TraceEnable off
```

> HTTP TRACE is a legitimate part of HTTP/1.1 (RFC 2616). Disable only if there is a specific reason, despite what vulnerability scanners may report.

---

## Include vs IncludeOptional

```apache
# Required include — Apache won't start if no files match
Include /etc/apache2/conf-enabled/*.conf

# Optional include — silently ignored if no files match
IncludeOptional /etc/apache2/sites-enabled/*.conf
```

---

## Exam Cheat Sheet

### Attacks and Mitigations

| Attack | Vulnerable component | Directive |
|---|---|---|
| **POODLE** | SSLv3 | `SSLProtocol -SSLv3` |
| **DROWN** | SSLv2 | `SSLProtocol -SSLv2` |
| **CRIME** | SSL compression | `SSLCompression off` |
| **BEAST** | CBC + TLS 1.0 | `SSLProtocol -TLSv1` + `!CBC` |
| **RC4 attacks** | RC4/Arcfour cipher | `SSLCipherSuite !RC4` |
| **Downgrade** | Client forces weak cipher | `SSLHonorCipherOrder on` |
| **XST** | HTTP TRACE method | `TraceEnable off` |
| **Info leak** | Apache version in headers | `ServerTokens Prod` |

### openssl Commands

```bash
openssl genrsa -des3 -out server.key 2048           # generate private key
openssl rsa -in server.key -out stripped.key         # remove passphrase
openssl req -new -key server.key -out server.csr     # create CSR
openssl req -new -x509 -days 365 -nodes \
  -out apache.pem -keyout apache.key                 # self-signed cert
openssl x509 -in apache.pem -text -noout             # inspect certificate
openssl s_client -connect example.com:443            # test connection
```

### Complete Hardened HTTPS Config

```apache
# Global
ServerTokens Prod
ServerSignature Off
TraceEnable off

Listen 80
Listen 443

<VirtualHost *:80>
    ServerName example.com
    Redirect permanent / https://example.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName    example.com
    DocumentRoot  /var/www/html

    SSLEngine on
    SSLCertificateFile    /etc/ssl/webserver/apache.pem
    SSLCertificateKeyFile /etc/ssl/webserver/apache.key

    SSLProtocol         -All +TLSv1.2
    SSLCipherSuite      EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH:!RC4
    SSLHonorCipherOrder On
    SSLCompression      Off
</VirtualHost>
```

### CA.pl Script Locations

| Distribution | Path |
|---|---|
| Debian | `/usr/lib/ssl/misc/CA.pl` |
| Red Hat | `/etc/pki/tls/misc/CA.pl` |
