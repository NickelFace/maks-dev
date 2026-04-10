---
title: "LPIC-2 212.5 — OpenVPN"
date: 2026-04-11
description: "OpenVPN tunnel modes (tun/tap), PKI and certificate setup, server and client configuration, static key vs TLS mode, routing, /etc/openvpn configuration. LPIC-2 exam topic 212.5."
tags: ["Linux", "LPIC-2", "OpenVPN", "VPN", "PKI", "TLS", "networking"]
categories: ["LPIC-2"]
---

> **Exam topic 212.5** — OpenVPN (weight: 2). Covers OpenVPN tunnel configuration, PKI setup, server/client config files, and routing.

---

## OpenVPN Basics

OpenVPN is an open source SSL/TLS-based VPN. It creates an encrypted tunnel between hosts using the OpenSSL library.

Key characteristics:
- Operates at Layer 2 (tap) or Layer 3 (tun)
- Uses a single UDP or TCP port (default: UDP 1194)
- Cross-platform: Linux, Windows, macOS, Android, iOS
- Two authentication modes: **static key** (pre-shared) or **TLS/PKI** (certificate-based)

```bash
apt install openvpn easy-rsa    # Debian/Ubuntu
yum install openvpn easy-rsa    # RHEL/CentOS
```

Config directory: `/etc/openvpn/`

---

## Tunnel Modes

| Mode | Device | Layer | Use case |
|---|---|---|---|
| `tun` | tun0 | Layer 3 (IP routing) | Remote access VPN, site-to-site routed |
| `tap` | tap0 | Layer 2 (Ethernet bridging) | Bridged networks, non-IP protocols, Windows file sharing |

```
dev tun    # routed tunnel (most common)
dev tap    # bridged tunnel
```

`tun` is the default and most common choice. Use `tap` only when you need layer-2 bridging (e.g., connecting two LAN segments as if they were one).

---

## PKI with Easy-RSA

OpenVPN TLS mode requires:
1. A CA certificate (`ca.crt`)
2. Server certificate + key (`server.crt`, `server.key`)
3. Client certificate + key (`client.crt`, `client.key`)
4. Diffie-Hellman parameters (`dh.pem`)
5. TLS authentication key (`ta.key`) — optional but recommended

### Setup with Easy-RSA

```bash
make-cadir /etc/openvpn/easy-rsa
cd /etc/openvpn/easy-rsa

# Initialize PKI
./easyrsa init-pki

# Build CA (Certificate Authority)
./easyrsa build-ca

# Generate server certificate and key (no passphrase for server)
./easyrsa build-server-full server nopass

# Generate client certificate and key
./easyrsa build-client-full client1 nopass

# Generate Diffie-Hellman parameters
./easyrsa gen-dh

# Generate TLS auth key (for tls-auth directive)
openvpn --genkey --secret ta.key
```

Files are placed in `/etc/openvpn/easy-rsa/pki/`:

```
pki/ca.crt                        # CA certificate (copy to server and all clients)
pki/issued/server.crt             # server certificate
pki/private/server.key            # server private key
pki/issued/client1.crt            # client certificate
pki/private/client1.key           # client private key
pki/dh.pem                        # DH parameters
ta.key                            # TLS auth key
```

```bash
# Copy to /etc/openvpn/
cp pki/ca.crt pki/issued/server.crt pki/private/server.key pki/dh.pem /etc/openvpn/
```

---

## Server Configuration

```
# /etc/openvpn/server.conf

port 1194
proto udp                       # UDP is faster; use tcp if UDP is blocked
dev tun

# PKI files
ca   /etc/openvpn/ca.crt
cert /etc/openvpn/server.crt
key  /etc/openvpn/server.key    # keep secret
dh   /etc/openvpn/dh.pem

# VPN subnet
server 10.8.0.0 255.255.255.0   # VPN subnet; server gets 10.8.0.1

# TLS auth (optional but recommended — protects against DoS)
tls-auth /etc/openvpn/ta.key 0  # 0 = server

# Routes pushed to clients
push "route 192.168.1.0 255.255.255.0"    # tell clients how to reach LAN
push "redirect-gateway def1 bypass-dhcp"  # route all client traffic through VPN
push "dhcp-option DNS 8.8.8.8"

# Client-to-client communication
client-to-client

# Persistent options (survive restart)
persist-key
persist-tun

# Drop privileges after startup
user nobody
group nobody        # or "group nogroup" on some distros

# Logging
status /var/log/openvpn-status.log
log-append /var/log/openvpn.log
verb 3              # verbosity: 0=silent, 3=normal, 9=debug

keepalive 10 120    # ping every 10s; restart if no response in 120s
```

```bash
systemctl start openvpn@server     # start using /etc/openvpn/server.conf
systemctl enable openvpn@server
```

The `@server` syntax refers to `server.conf` in `/etc/openvpn/`.

---

## Client Configuration

```
# /etc/openvpn/client.conf  (or client.ovpn)

client                          # this is a client
dev tun
proto udp

remote vpn.example.com 1194    # server address and port
# Multiple remotes for redundancy:
# remote vpn1.example.com 1194
# remote vpn2.example.com 1194
# remote-random             # connect to a random remote

resolv-retry infinite          # keep trying to resolve hostname
nobind                         # don't bind to a specific local port

persist-key
persist-tun

# PKI files
ca   ca.crt
cert client1.crt
key  client1.key

# TLS auth
tls-auth ta.key 1              # 1 = client

# Verify server certificate is actually a server cert
remote-cert-tls server

verb 3
```

### Inline Certificate Configuration (single .ovpn file)

Instead of separate files, embed certificates in the config:

```
<ca>
-----BEGIN CERTIFICATE-----
...CA certificate contents...
-----END CERTIFICATE-----
</ca>

<cert>
-----BEGIN CERTIFICATE-----
...client certificate...
-----END CERTIFICATE-----
</cert>

<key>
-----BEGIN PRIVATE KEY-----
...client private key...
-----END PRIVATE KEY-----
</key>

<tls-auth>
-----BEGIN OpenVPN Static key V1-----
...ta.key contents...
-----END OpenVPN Static key V1-----
</tls-auth>
key-direction 1
```

This produces a single portable `.ovpn` file for distribution to clients.

---

## Static Key Mode (Simple Setup)

For point-to-point VPNs without PKI:

```bash
# Generate static key
openvpn --genkey --secret static.key
```

**Server:**
```
dev tun
ifconfig 10.8.0.1 10.8.0.2
secret static.key
```

**Client:**
```
remote server-ip
dev tun
ifconfig 10.8.0.2 10.8.0.1
secret static.key
```

> Static key mode is simple but lacks Perfect Forward Secrecy and doesn't scale (same key for all clients). Use PKI/TLS mode for production.

---

## Routing

### Server-side IP Forwarding

For clients to reach the LAN behind the VPN server, enable IP forwarding:

```bash
echo 1 > /proc/sys/net/ipv4/ip_forward
# or in /etc/sysctl.conf:
net.ipv4.ip_forward = 1
```

### NAT for VPN clients

```bash
iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
```

### Route all client traffic through VPN

In server.conf:
```
push "redirect-gateway def1 bypass-dhcp"
push "dhcp-option DNS 10.8.0.1"
```

This overwrites the default route on clients so all their traffic goes through the VPN.

### Per-client IP Assignment

```
# server.conf
client-config-dir /etc/openvpn/ccd

# /etc/openvpn/ccd/client1
ifconfig-push 10.8.0.10 255.255.255.0
```

---

## Certificate Revocation

```bash
# Revoke a client certificate
cd /etc/openvpn/easy-rsa
./easyrsa revoke client1

# Generate CRL (Certificate Revocation List)
./easyrsa gen-crl

# Copy CRL to OpenVPN directory
cp pki/crl.pem /etc/openvpn/

# Add to server.conf
crl-verify /etc/openvpn/crl.pem
```

OpenVPN checks the CRL on each new connection. Revoked certificates are rejected.

---

## Exam Cheat Sheet

### Files and Paths

| Path | Description |
|---|---|
| `/etc/openvpn/` | OpenVPN configuration directory |
| `/etc/openvpn/server.conf` | Server configuration |
| `/etc/openvpn/easy-rsa/pki/` | PKI directory |
| `/etc/openvpn/easy-rsa/pki/ca.crt` | CA certificate |
| `/etc/openvpn/easy-rsa/pki/issued/` | Signed certificates |
| `/etc/openvpn/easy-rsa/pki/private/` | Private keys |
| `/var/log/openvpn.log` | OpenVPN log |
| `/var/log/openvpn-status.log` | Connected clients status |

### Key Commands

```bash
systemctl start openvpn@server          # start server instance
./easyrsa init-pki                      # initialize PKI
./easyrsa build-ca                      # create CA
./easyrsa build-server-full server nopass
./easyrsa build-client-full client1 nopass
./easyrsa gen-dh                        # Diffie-Hellman parameters
openvpn --genkey --secret ta.key        # TLS auth key
./easyrsa revoke client1                # revoke certificate
./easyrsa gen-crl                       # generate CRL
```

### Common Exam Pitfalls

| Pitfall | Rule |
|---|---|
| `tun` vs `tap` | `tun` = Layer 3 routing (most common); `tap` = Layer 2 bridging |
| `tls-auth` key direction | `0` on server; `1` on client |
| `remote-cert-tls server` | Verify the peer is actually a server certificate — prevents MITM |
| Static key vs PKI | Static key = simple, no PFS; PKI/TLS = production use |
| IP forwarding for routing | Must enable `net.ipv4.ip_forward` for VPN clients to reach the LAN |
| CRL not updated | Revoke + gen-crl + copy to `/etc/openvpn/` + `crl-verify` in config |
| `@server` systemd syntax | Refers to `/etc/openvpn/server.conf` |
