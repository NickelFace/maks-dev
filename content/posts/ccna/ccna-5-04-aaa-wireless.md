---
title: "CCNA 5.4 AAA and Wireless Security"
date: 2026-09-15
description: "AAA (Authentication, Authorization, Accounting): RADIUS vs TACACS+, configuration on Cisco IOS, 802.1X port-based access control, EAP methods, and WPA2/WPA3 wireless security standards."
tags: ["CCNA", "Cisco", "AAA", "RADIUS", "security"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-5-04-aaa-wireless/"
---

## AAA: Concept

**AAA** = Authentication + Authorization + Accounting

| Component | Description |
|---|---|
| Authentication | Who are you? Verifying identity (login/password, certificate, OTP) |
| Authorization | What are you allowed to do? Rights and privileges |
| Accounting | What did you do? Audit log of actions |

### Authentication Sources

| Source | Description |
|---|---|
| Local | Local user database (`username` in IOS) |
| RADIUS | External server (RFC 2865) |
| TACACS+ | External server (Cisco) |

---

## RADIUS vs TACACS+

| Parameter | RADIUS | TACACS+ |
|---|---|---|
| Standard | RFC 2865/2866 (open) | Cisco (proprietary) |
| Transport | UDP 1812 (auth), 1813 (acct) | TCP 49 |
| Encryption | Password only | Entire payload |
| A/A/A separation | No (Authentication + Authorization combined) | Yes (separate) |
| Use case | WLAN, VPN, 802.1X (network access) | Device management (device administration) |

> **💡 Tip:** **RADIUS**, for authenticating users onto the network (Wi-Fi, VPN). **TACACS+**: for managing network devices (SSH, IOS privileges). This distinction is important for the exam!

---

## AAA Configuration

### Basic Configuration with RADIUS

```bash
# Enable AAA
Router(config)# aaa new-model                              # enable AAA framework

# Configure RADIUS server
Router(config)# radius server ISE
Router(config-radius-server)# address ipv4 192.168.1.100 auth-port 1812 acct-port 1813
Router(config-radius-server)# key cisco123                # shared key

# Or legacy syntax
Router(config)# radius-server host 192.168.1.100 auth-port 1812 key cisco123

# Login authentication policy
Router(config)# aaa authentication login default group radius local
# Order: RADIUS first, fallback to local database if unavailable

# Enable authentication policy
Router(config)# aaa authentication enable default group radius enable

# Command authorization
Router(config)# aaa authorization exec default group radius local
Router(config)# aaa authorization commands 15 default group radius local

# Accounting
Router(config)# aaa accounting exec default start-stop group radius
Router(config)# aaa accounting commands 15 default start-stop group radius
```

### Configuration with TACACS+

```bash
Router(config)# aaa new-model

Router(config)# tacacs server ISE_TACACS
Router(config-server-tacacs)# address ipv4 192.168.1.101
Router(config-server-tacacs)# key tacacs_secret

Router(config)# aaa authentication login default group tacacs+ local
Router(config)# aaa authorization exec default group tacacs+ local
Router(config)# aaa authorization commands 15 default group tacacs+ none
Router(config)# aaa accounting commands 15 default start-stop group tacacs+
```

---

## 802.1X (Port-Based Access Control)

**IEEE 802.1X**: a port-level authentication standard. Network access is denied until authentication succeeds.

### 802.1X Components

| Role | Description |
|---|---|
| Supplicant | Client device (PC, phone) |
| Authenticator | Switch or AP: acts as intermediary |
| Authentication Server | RADIUS server (Cisco ISE, FreeRADIUS) |

### Authentication Process

```
Client ──── EAPOL Start ────────► Switch
Client ◄─── EAP Request/Identity── Switch
Client ──── EAP Response ────────► Switch ──► RADIUS
Client ◄──────────────────── EAP Success/Failure ─── RADIUS
Client ──── Full Access ─────────► Switch (if Success)
```

### EAP Methods

| Method | Description |
|---|---|
| EAP-TLS | Mutual certificates: maximum security |
| PEAP | Protected EAP: server certificate only; client uses password |
| EAP-FAST | Cisco: no certificates (PAC) |
| EAP-TTLS | Similar to PEAP |

### Configuring 802.1X on a Switch

```bash
Router(config)# aaa new-model
Router(config)# radius server AUTH_SRV
Router(config-radius-server)# address ipv4 192.168.1.100 auth-port 1812
Router(config-radius-server)# key cisco123

Router(config)# aaa authentication dot1x default group radius
Router(config)# dot1x system-auth-control              # enable 802.1X globally

Router(config)# interface fastethernet 0/1
Router(config-if)# switchport mode access
Router(config-if)# dot1x port-control auto             # auto = 802.1X
# force-authorized = always open (default)
# force-unauthorized = always closed
# auto = requires authentication

Switch# show dot1x all                                 # 802.1X status
Switch# show dot1x interface fa0/1
```

---

## Wireless Security

### Encryption Standards

| Standard | Algorithm | Status |
|---|---|---|
| WEP | RC4 (40/104-bit) | Broken: do not use |
| WPA | TKIP (RC4) | Deprecated |
| WPA2 Personal | AES-CCMP + PSK | Recommended for home |
| WPA2 Enterprise | AES-CCMP + 802.1X/EAP | Recommended for enterprise |
| WPA3 Personal | SAE (Simultaneous Authentication of Equals) | Current standard |
| WPA3 Enterprise | AES-256-GCMP + 802.1X | Current standard |

### WPA2 Enterprise on WLC

Configured through the WLC GUI (Cisco 3504/5520):

1. Create RADIUS server profile (Security → AAA → RADIUS Auth Servers)
2. Create WLAN: Security → Layer 2 → WPA+WPA2; Auth Key Mgmt = 802.1X
3. WLAN → AAA Servers → select RADIUS server

```bash
# CLI example on WLC
config radius auth add 1 192.168.1.100 1812 ascii cisco123
config radius auth enable 1
config wlan security wpa akm 802.1x enable 1
config wlan radius_server auth add 1 1                  # wlan 1 → radius server 1
config wlan enable 1
```

---

## Resources

| Resource | Description |
|---|---|
| [RFC 2865: RADIUS](https://www.rfc-editor.org/rfc/rfc2865) | Remote Authentication Dial In User Service: RADIUS standard |
| [TACACS+ vs RADIUS (networklessons.com)](https://networklessons.com/cisco/ccna-routing-switching-icnd2-200-105/tacacs-and-radius) | TACACS+ vs RADIUS: encryption, ports, use cases |
| [AAA (networklessons.com)](https://networklessons.com/system-management/aaa-authentication-on-cisco-ios) | Authentication, Authorization, Accounting on Cisco IOS |
| [WPA3: Wi-Fi Alliance](https://www.wi-fi.org/discover-wi-fi/security) | WPA3: SAE, Enhanced Open, 192-bit Enterprise Mode |
| [Jeremy's IT Lab: AAA and RADIUS (YouTube)](https://www.youtube.com/watch?v=RLQbFYt58sY) | AAA, TACACS+, RADIUS from the Free CCNA series |
| [Cisco ISE: Identity Services Engine](https://www.cisco.com/c/en/us/products/security/identity-services-engine/index.html) | Cisco ISE: 802.1X, RADIUS, access policies |
