---
title: "CCNA 5.1 Security Concepts"
date: 2026-09-08
description: "CIA triad, threat types (malware, DoS, MITM, phishing), L2 attacks and defenses, Defense in Depth and Zero Trust security models, network security components."
tags: ["CCNA", "Cisco", "security", "CIA", "threats"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-5-01-security-concepts/"
---

## CIA Triad

| Principle | Name | Description | Threats |
|---|---|---|---|
| C | Confidentiality | Data accessible only to authorized users | Interception, data leaks |
| I | Integrity | Data has not been modified without authorization | MITM, tampering |
| A | Availability | Services are accessible when needed | DoS, DDoS |

---

## Threat and Attack Types

### Malware

| Type | Description |
|---|---|
| Virus | Self-replicating code that embeds itself into programs |
| Worm | Self-propagates across the network (no carrier required) |
| Trojan | Disguised within legitimate software |
| Ransomware | Encrypts data and demands payment |
| Spyware | Collects information about the user |
| Adware | Displays unwanted advertisements |
| Rootkit | Conceals its presence within the system |
| Botnet | Network of infected machines (zombies) |

### Network Attacks

| Attack | Description | Defense |
|---|---|---|
| DoS | Resource exhaustion from a single source | Rate limiting, ACL |
| DDoS | Distributed attack from a botnet | Anti-DDoS, ISP filtering |
| Phishing | Fake emails/sites to steal credentials | User training, email filtering |
| Spear Phishing | Targeted phishing (specific person/company) | User training |
| MITM | Intercept and modify traffic in transit | Encryption (TLS), HTTPS |
| Replay Attack | Resending previously captured packets | Timestamps, nonce |
| Reconnaissance | Gathering information about a target | IPS, firewall |
| Password Attack | Brute force, dictionary attack | Strong passwords, lockout |
| Social Engineering | Manipulating people into revealing information | Staff training |

### L2 Attacks

| Attack | Description | Defense |
|---|---|---|
| MAC Flooding | Fills CAM table → switch acts like a hub | Port Security |
| VLAN Hopping | Bypasses VLAN isolation via DTP | Disable DTP, native VLAN ≠ 1 |
| DHCP Spoofing | Rogue DHCP server | DHCP Snooping |
| ARP Spoofing | Forged ARP replies (MITM) | Dynamic ARP Inspection (DAI) |
| STP Attack | Become Root Bridge → intercept traffic | BPDU Guard, Root Guard |

---

## Attack Vectors

| Vector | Description |
|---|---|
| Email | Phishing, malicious attachments |
| Web | Drive-by download, XSS, SQL injection |
| Removable media | USB drives with malware |
| Wireless networks | Evil twin AP, deauthentication attacks |
| Physical access | Connecting to an unprotected port |
| Insider threat | Malicious employee |
| Supply chain | Compromise during the delivery phase |

---

## Perimeter Defense

### Security Models

| Model | Description |
|---|---|
| Defense in Depth | Multiple layers of protection (perimeter, network, host, application) |
| Zero Trust | "Never trust, always verify": every request is authenticated |
| DMZ | Demilitarized zone for public-facing servers |

### Network Security Components

| Component | Description |
|---|---|
| Firewall | Filters traffic based on rules |
| IDS (Intrusion Detection System) | Detects attacks (passive) |
| IPS (Intrusion Prevention System) | Detects and blocks attacks |
| VPN | Encrypted tunnel over a public network |
| NAC | Network Access Control: verifies host compliance |
| SIEM | Security Information & Event Management |

### Password Policy

| Requirement | Recommendation |
|---|---|
| Length | Minimum 12–16 characters |
| Complexity | Letters, numbers, special characters |
| Rotation | Regular password changes |
| Storage | Hashed only (bcrypt, PBKDF2) |
| Multi-factor | Password + OTP/app/biometrics |

---

## Resources

| Resource | Description |
|---|---|
| [Cisco Security Concepts: Cisco Learning](https://learningnetwork.cisco.com/s/article/network-security-concepts) | Overview of network security concepts from Cisco |
| [CIA Triad: NIST](https://csrc.nist.gov/glossary/term/cia_triad) | Confidentiality, Integrity, Availability: foundational security principles |
| [Common Network Threats (networklessons.com)](https://networklessons.com/cisco/ccna-200-301/network-security-threats-vulnerabilities-and-countermeasures) | Threats: DoS, DDoS, MITM, phishing, malware |
| [Jeremy's IT Lab: Security Concepts (YouTube)](https://www.youtube.com/watch?v=4_-JN1hqCmw) | CIA triad, threats, and defenses from the Free CCNA series |
| [Cisco Cybersecurity Essentials](https://www.cisco.com/c/en/us/products/security/index.html) | Cisco security products and concepts |
| [David Bombal: Network Security Basics (YouTube)](https://www.youtube.com/watch?v=E03gh1PVUGM) | Network security basics: attacks and countermeasures |
