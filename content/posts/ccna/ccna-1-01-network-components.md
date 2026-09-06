---
title: "CCNA 1.1 Network Components and Roles"
date: 2026-07-01
description: "Overview of network devices (Switch, Router, AP, Firewall), OSI and TCP/IP models, Cisco IOS CLI modes and essential management commands."
tags: ["CCNA", "Cisco", "OSI", "CLI", "network devices"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-1-01-network-components/"
---

## Network Devices

| Device | OSI Layer | Description |
|---|:---:|---|
| Hub | L1 | Signal repeater; all ports share one collision domain |
| Switch | L2 | Filters traffic by MAC address; separate collision domain per port |
| Router | L3 | Routes packets between networks using IP |
| Access Point (AP) | L2 | Provides wireless access to a wired network |
| Firewall | L3–L7 | Filters traffic based on rules |
| IDS/IPS | L3–L7 | Detects/prevents intrusions |

### Network Roles

| Role | Description |
|---|---|
| Client | Initiates requests to a server |
| Server | Processes client requests |
| Peer | Acts as both client and server (P2P) |

> **💡 Tip:** On the CCNA exam: a router separates broadcast domains; a switch separates collision domains but does NOT separate broadcast domains (unless VLANs are configured).

---

## OSI Model

| # | Layer | PDU | Devices | Protocol Examples |
|:---:|---|---|---|---|
| 7 | Application | Data | n/a | HTTP, HTTPS, FTP, DNS, DHCP, SMTP |
| 6 | Presentation | Data | n/a | SSL/TLS, JPEG, ASCII |
| 5 | Session | Data | n/a | NetBIOS, RPC, SQL |
| 4 | Transport | Segment | n/a | TCP, UDP |
| 3 | Network | Packet | Router, L3 Switch | IPv4, IPv6, ICMP, OSPF |
| 2 | Data Link | Frame | Switch, Bridge | Ethernet, 802.11, PPP, ARP |
| 1 | Physical | Bits | Hub, Repeater | Cables, signals |

> **📌 Important:** Data encapsulation: on the sender, data travels top-down (7→1) with headers added at each layer. On the receiver, data travels bottom-up (1→7) with headers removed (decapsulation).

---

## TCP/IP Model

| TCP/IP Layer | OSI Layers | Protocols |
|---|---|---|
| Application | 5, 6, 7 | HTTP, DNS, DHCP, FTP, SMTP, Telnet, SSH |
| Transport | 4 | TCP, UDP |
| Internet | 3 | IPv4, IPv6, ICMP, ARP |
| Network Access | 1, 2 | Ethernet, Wi-Fi, PPP |

---

## Cisco IOS CLI Modes

| Mode | Prompt | Enter | Exit |
|---|---|---|---|
| User EXEC | `Router>` | connect | `exit` / `logout` |
| Privileged EXEC | `Router#` | `enable` | `disable` |
| Global Config | `Router(config)#` | `configure terminal` | `exit` / `end` |
| Interface Config | `Router(config-if)#` | `interface <type> <number>` | `exit` |
| Line Config | `Router(config-line)#` | `line console 0` / `line vty 0 15` | `exit` |

> **⚠️ Note:** The `end` command and `Ctrl+Z` return immediately to Privileged EXEC from any configuration mode. `exit` moves up one level.

---

## Essential CLI Commands

```bash
# Navigating between modes
Router> enable
Router# configure terminal
Router(config)# interface gigabitethernet 0/0
Router(config-if)# exit
Router(config)# end
Router#

# Help
Router# ?                       # all commands in current mode
Router# show ?                  # all show options
Router# show ver?               # commands starting with "ver"

# Keyboard shortcuts
Ctrl+A      # beginning of line
Ctrl+E      # end of line
Ctrl+Z      # → Privileged EXEC
Ctrl+C      # abort process
Tab         # complete command
↑ / Ctrl+P  # previous command
↓ / Ctrl+N  # next command

# Viewing configuration
Router# show version            # IOS, model, uptime
Router# show running-config     # current configuration (DRAM)
Router# show startup-config     # saved configuration (NVRAM)
Router# show history            # command history

# Save / Reset
Router# copy running-config startup-config   # save
Router# write                                # same (shorthand)
Router# erase startup-config                 # clear NVRAM
Router# reload                              # reboot

# Output filtering
Router# show running-config | include hostname
Router# show running-config | section interface
Router# show running-config | begin line
Router# show running-config | exclude !
```

> **💡 Tip:** Abbreviations work as long as they are unambiguous: `en` = `enable`, `conf t` = `configure terminal`, `sh run` = `show running-config`.

---

## Resources

| Resource | Description |
|---|---|
| [Cisco IOS CLI Reference](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/configuration/xe-16/fundamentals-xe-16-book.html) | Official Cisco IOS CLI documentation |
| [Network Devices (networklessons.com)](https://networklessons.com/cisco/ccna-routing-switching-icnd1-100-105/network-devices) | Detailed breakdown of network devices: router, switch, hub, firewall |
| [OSI Model (networklessons.com)](https://networklessons.com/network-fundamentals/introduction-to-the-osi-model) | Layer-by-layer explanation of the OSI model |
| [Jeremy's IT Lab: Network Devices (YouTube)](https://www.youtube.com/watch?v=H8W9oMZGWdA) | CCNA: network components and device roles, Free CCNA series |
| [Cisco IOS CLI Modes (Cisco Learning Network)](https://learningnetwork.cisco.com) | CLI modes: User EXEC, Privileged EXEC, Global Config |
| [IDS vs IPS (Cisco)](https://www.cisco.com/c/en/us/products/security/intrusion-prevention-system-ips/index.html) | Cisco explanation of the difference between IDS and IPS |
