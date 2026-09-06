---
title: "CCNA 4.4 SSH and Device Management"
date: 2026-08-31
description: "Configuring SSH v2 on Cisco IOS: RSA key generation, VTY lines, configuration management via TFTP, banner messages and device hardening."
tags: ["CCNA", "Cisco", "SSH", "management", "security"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-4-04-ssh-management/"
---

## Telnet vs SSH

| Characteristic | Telnet | SSH |
|---|---|---|
| Port | TCP 23 | TCP 22 |
| Encryption | No (plaintext!) | Yes (AES, etc.) |
| Authentication | Password | Password or key |
| Security | Insecure | Secure |
| Usage | Isolated lab environments only | Production |

> **⚠️ Note:** Telnet transmits all data including passwords in plaintext. Never use Telnet on production equipment.

---

## SSH Configuration

```bash
# Step 1: Set hostname (not default)
Router(config)# hostname R1

# Step 2: Set domain-name (required for key generation)
R1(config)# ip domain-name company.local

# Step 3: Generate RSA key (minimum 1024, recommend 2048)
R1(config)# crypto key generate rsa general-keys modulus 2048
# or
R1(config)# crypto key generate rsa modulus 2048

# Step 4: Create local users
R1(config)# username admin privilege 15 secret cisco123
R1(config)# username operator privilege 1 secret op_pass

# Step 5: Configure VTY lines
R1(config)# line vty 0 15
R1(config-line)# transport input ssh              # SSH only (blocks Telnet)
R1(config-line)# login local                      # authenticate against local users
R1(config-line)# exec-timeout 5 0               # disconnect after 5 minutes idle

# Optional: SSH version 2 only
R1(config)# ip ssh version 2

# SSH parameters
R1(config)# ip ssh time-out 60                   # authentication timeout (sec)
R1(config)# ip ssh authentication-retries 3      # authentication attempts

# Remove RSA keys (when changing hostname/domain)
R1(config)# crypto key zeroize rsa
```

---

## Local Users and Passwords

```bash
# Enable password (unencrypted - do not use)
Router(config)# enable password cisco

# Encrypted enable password (preferred)
Router(config)# enable secret cisco123

# Encrypt all passwords in configuration
Router(config)# service password-encryption        # type 7 (weak encryption)

# Local users
Router(config)# username admin privilege 15 secret cisco123     # full access
Router(config)# username viewer privilege 1 secret view123      # read-only

# Console password
Router(config)# line console 0
Router(config-line)# login local                   # or: login + password
Router(config-line)# exec-timeout 10 0            # 10 minutes idle

# VTY password (SSH/Telnet)
Router(config)# line vty 0 15
Router(config-line)# login local
Router(config-line)# transport input ssh
Router(config-line)# exec-timeout 5 0
```

---

## Configuration Management

```bash
# Save configuration
Router# copy running-config startup-config
Router# write                                      # shorthand
Router# write memory                               # same

# View
Router# show running-config
Router# show startup-config
Router# show version                               # IOS, model, uptime

# Backup to TFTP
Router# copy running-config tftp
# TFTP server address: 192.168.1.100
# Filename: router-backup.cfg

# Restore from TFTP
Router# copy tftp running-config

# Reset configuration
Router# erase startup-config                       # clear NVRAM
Router# reload                                     # reboot

# Flash management
Router# show flash:                                # flash contents
Router# dir flash:                                 # same
Router# show file systems                          # all file systems
```

### Banner Messages

```bash
# Message of the Day (displayed on connect)
Router(config)# banner motd # Authorized Access Only! #

# Login banner (before login prompt)
Router(config)# banner login # Company R1. Unauthorized access is prohibited. #

# Exec banner (after successful login)
Router(config)# banner exec # Welcome to R1. Have a nice day. #
```

---

## Disabling Unnecessary Services

```bash
# Disable unnecessary services (hardening)
Router(config)# no ip http server                   # HTTP GUI (insecure)
Router(config)# no ip http secure-server            # HTTPS GUI
Router(config)# no service finger
Router(config)# no service tcp-small-servers
Router(config)# no service udp-small-servers
Router(config)# no cdp run                          # CDP (if not needed)
Router(config)# no ip source-route
Router(config)# no ip proxy-arp
Router(config)# no ip directed-broadcast
```

---

## Verification

```bash
# SSH
Router# show ip ssh                        # SSH version and settings
Router# show ssh                           # active SSH sessions
Router# show users                         # all active users

# Line configuration
Router# show line                          # all lines
Router# show line vty 0 4                  # VTY lines

# Connectivity test (from another device)
PC> ssh -l admin 192.168.1.1
```

---

## Resources

| Resource | Description |
|---|---|
| [RFC 4251: SSH Protocol Architecture](https://www.rfc-editor.org/rfc/rfc4251) | SSH 2.0 protocol architecture |
| [SSH Configuration on Cisco (Cisco)](https://www.cisco.com/c/en/us/support/docs/security-vpn/secure-shell-ssh/4145-ssh.html) | Official guide for configuring SSH v2 on Cisco IOS |
| [SSH (networklessons.com)](https://networklessons.com/system-management/configure-ssh-cisco-ios) | SSH v2: RSA keys, VTY, configuration and verification |
| [TFTP vs FTP vs SCP (networklessons.com)](https://networklessons.com/cisco/ccna-routing-switching-icnd2-200-105/tftp-and-ftp) | Comparing file management methods: TFTP, FTP, SCP |
| [Jeremy's IT Lab: SSH Management (YouTube)](https://www.youtube.com/watch?v=jT5jdqkbqsc) | SSH, device management, IOS backup |
| [Cisco IOS File System](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/configuration/xe-16/fundamentals-xe-16-book/cf-file-mgmt.html) | IOS file system: flash, TFTP, configuration copying |
