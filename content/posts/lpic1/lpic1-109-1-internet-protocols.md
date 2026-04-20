---
title: "LPIC-1 109.1 — Fundamentals of Internet Protocols"
date: 2026-04-20
description: "IPv4 addressing, address classes, private ranges, CIDR, TCP/UDP/ICMP, common ports, /etc/services, IPv6 addressing and key differences. LPIC-1 exam topic 109.1."
tags: ["Linux", "LPIC-1", "networking", "IPv4", "IPv6", "TCP", "UDP"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-109-1-internet-protocols/"
---

> **Exam weight: 4** — LPIC-1 v5, Exam 102

## What You Need to Know

From the official LPIC-1 objectives:

- Demonstrate an understanding of network masks and CIDR notation.
- Knowledge of the differences between private and public "dotted quad" IP addresses.
- Knowledge about common TCP and UDP ports and protocols (20, 21, 22, 23, 25, 53, 80, 110, 123, 139, 143, 161, 162, 389, 443, 465, 514, 636, 993, 995).
- Knowledge about the differences and major features of UDP, TCP, and ICMP.
- Knowledge of the major differences between IPv4 and IPv6.
- Knowledge of the basic features of IPv6.

Key files and commands: `/etc/services`.

---

## IPv4 Addressing

IPv4 addresses are 32-bit numbers written as four decimal octets separated by dots (e.g., `192.168.1.100`).

### Address Classes

| Class | First Octet Range | Default Prefix | Purpose |
|---|---|---|---|
| A | 1–126 | /8 | Large networks |
| B | 128–191 | /16 | Medium networks |
| C | 192–223 | /24 | Small networks |
| D | 224–239 | — | Multicast |
| E | 240–255 | — | Reserved/experimental |
| — | 127.0.0.0/8 | — | Loopback (127.0.0.1) |

### Private (RFC 1918) Ranges

These addresses are not routed on the public internet and require NAT to communicate externally.

| Range | CIDR | Class |
|---|---|---|
| 10.0.0.0 – 10.255.255.255 | 10.0.0.0/8 | A |
| 172.16.0.0 – 172.31.255.255 | 172.16.0.0/12 | B |
| 192.168.0.0 – 192.168.255.255 | 192.168.0.0/16 | C |

### Subnet Masks and CIDR

A subnet mask defines which bits of an address identify the network and which identify the host.

- `/24` = `255.255.255.0` — 256 addresses, 254 usable hosts
- `/25` = `255.255.255.128` — 128 addresses, 126 usable hosts
- Usable hosts = 2ⁿ − 2, where n is the number of host bits

**Network address**: all host bits set to 0 (first address in range).  
**Broadcast address**: all host bits set to 1 (last address in range).

Example: `192.168.1.0/24` → network `192.168.1.0`, broadcast `192.168.1.255`, usable `192.168.1.1–192.168.1.254`.

### Special Addresses

- **Default route**: `0.0.0.0/0` — matches any destination; used as the gateway of last resort.
- **NAT** (Network Address Translation): allows multiple hosts with private IPs to share a single public IP.
- **TTL** (Time to Live): decremented by each router; packet dropped when TTL reaches 0, preventing routing loops.

---

## Common Ports and Protocols

| Port | Protocol | Service |
|---|---|---|
| 20 | TCP | FTP data |
| 21 | TCP | FTP control |
| 22 | TCP | SSH |
| 23 | TCP | Telnet |
| 25 | TCP | SMTP |
| 53 | TCP/UDP | DNS |
| 80 | TCP | HTTP |
| 110 | TCP | POP3 |
| 123 | UDP | NTP |
| 139 | TCP | NetBIOS |
| 143 | TCP | IMAP |
| 161 | UDP | SNMP |
| 162 | UDP | SNMP Trap |
| 389 | TCP | LDAP |
| 443 | TCP | HTTPS |
| 465 | TCP | SMTPS |
| 514 | TCP/UDP | RSH / Syslog |
| 636 | TCP | LDAPS |
| 993 | TCP | IMAPS |
| 995 | TCP | POP3S |

The file `/etc/services` maps service names to port numbers and protocols.

---

## Transport Layer Protocols

### TCP — Transmission Control Protocol

- Connection-oriented: establishes a connection before data transfer via the 3-way handshake (SYN → SYN-ACK → ACK).
- Reliable: guarantees delivery, order, and error checking.
- Used by HTTP, HTTPS, SSH, SMTP, FTP.

### UDP — User Datagram Protocol

- Connectionless: sends datagrams without establishing a connection.
- Unreliable: no delivery guarantees.
- Lower overhead; used where speed matters more than reliability (DNS queries, NTP, streaming).

### ICMP — Internet Control Message Protocol

- Not a transport protocol; carries control and diagnostic messages.
- Used by `ping` (echo request/reply) and `traceroute`.
- No ports; operates at the network layer.

---

## IPv6

IPv6 addresses are 128-bit numbers written as eight groups of four hexadecimal digits separated by colons:

```
2001:0db8:0000:0000:0000:0000:0000:0001
```

### Abbreviation Rules

1. Drop leading zeros within each group: `0db8` → `db8`, `0001` → `1`.
2. Replace one sequence of consecutive all-zero groups with `::` (only once per address).

```
2001:db8::1
fe80::1
::1       (loopback)
```

### Address Types

| Type | Description |
|---|---|
| Global unicast | 2000::/3 — publicly routable |
| Link-local unicast | fe80::/10 — not routed beyond a link |
| Loopback | ::1 |
| Multicast | ff00::/8 |
| Anycast | One address shared by multiple interfaces; nearest responds |

### Key Differences from IPv4

| Feature | IPv4 | IPv6 |
|---|---|---|
| Address size | 32-bit | 128-bit |
| Broadcast | Yes | No (multicast used instead) |
| Address config | DHCP or static | SLAAC, DHCPv6, or static |
| Hop limit | TTL field | Hop Limit field |
| ARP | Yes | Replaced by NDP (Neighbor Discovery Protocol) |
| URL notation | `http://192.168.1.1/` | `http://[::1]/` (brackets required) |

---

## Quick Reference

```
IPv4 classes:
  A: 1–126     /8    private: 10.0.0.0/8
  B: 128–191   /16   private: 172.16.0.0/12
  C: 192–223   /24   private: 192.168.0.0/16
  loopback: 127.0.0.1

CIDR: /prefix — host bits = 32-prefix; usable hosts = 2^n - 2
  network addr = host bits all 0
  broadcast    = host bits all 1

Default route: 0.0.0.0/0   NAT   TTL

Key ports:
  20/21 FTP   22 SSH    23 Telnet   25 SMTP    53 DNS
  80 HTTP     110 POP3  123 NTP     139 NetBIOS 143 IMAP
  161 SNMP    162 SNMPTRAP  389 LDAP  443 HTTPS  465 SMTPS
  514 RSH/Syslog  636 LDAPS  993 IMAPS  995 POP3S

/etc/services — maps service names to port/protocol

TCP: connection-oriented, reliable (SYN/SYN-ACK/ACK)
UDP: connectionless, unreliable, low overhead
ICMP: control messages, ping/traceroute, no ports

IPv6:
  128-bit, 8 groups of 4 hex digits
  Abbreviation: drop leading zeros; :: replaces one run of all-zero groups
  fe80::/10 link-local   ::1 loopback   ff00::/8 multicast
  No broadcast; SLAAC; Hop Limit; NDP replaces ARP
  Brackets in URLs: http://[::1]/
```

---

## Exam Questions

1. What is the default subnet mask for a Class B address? → `/16` (255.255.0.0)
2. Which private range belongs to Class A? → `10.0.0.0/8`
3. What is the broadcast address for `192.168.5.0/24`? → `192.168.5.255`
4. How many usable hosts fit in a `/26` subnet? → 62 (2⁶ − 2)
5. What does the default route `0.0.0.0/0` represent? → The route of last resort; matches any destination.
6. What port does HTTPS use? → 443
7. What port does SMTP use? → 25
8. What port does DNS use? → 53 (TCP and UDP)
9. What port does SNMP Trap use? → 162/UDP
10. What file maps service names to port numbers? → `/etc/services`
11. What is the key difference between TCP and UDP? → TCP is connection-oriented and reliable; UDP is connectionless and unreliable.
12. What protocol does `ping` use? → ICMP
13. What is the loopback address in IPv6? → `::1`
14. What IPv6 prefix is used for link-local addresses? → `fe80::/10`
15. What replaces ARP in IPv6? → NDP (Neighbor Discovery Protocol)
16. How are IPv6 addresses abbreviated? → Drop leading zeros per group; replace one run of consecutive all-zero groups with `::`.
17. How is an IPv6 address written in a URL? → Enclosed in brackets: `http://[2001:db8::1]/`
18. What does SLAAC stand for? → Stateless Address Autoconfiguration — allows a host to configure its own IPv6 address without DHCP.

---

## Exercises

### Exercise 1 — Subnetting

A network administrator uses `172.16.10.0/28`. What is the broadcast address and how many usable hosts are available?

<details>
<summary>Answer</summary>

`/28` means 28 network bits, 4 host bits. 2⁴ = 16 addresses.

Network: `172.16.10.0`  
Broadcast: `172.16.10.15`  
Usable hosts: 14 (addresses `172.16.10.1` through `172.16.10.14`)

</details>

---

### Exercise 2 — Private Range Identification

Classify these addresses as private or public: `10.0.0.1`, `172.15.0.1`, `172.16.0.1`, `192.168.100.1`, `8.8.8.8`.

<details>
<summary>Answer</summary>

- `10.0.0.1` — private (10.0.0.0/8)
- `172.15.0.1` — public (172.15.x.x is outside 172.16.0.0/12)
- `172.16.0.1` — private (172.16.0.0/12)
- `192.168.100.1` — private (192.168.0.0/16)
- `8.8.8.8` — public

</details>

---

### Exercise 3 — IPv6 Abbreviation

Abbreviate the address `2001:0db8:0000:0000:0001:0000:0000:0001`.

<details>
<summary>Answer</summary>

1. Drop leading zeros per group: `2001:db8:0:0:1:0:0:1`
2. Replace longest run of consecutive zero groups with `::`: `2001:db8::1:0:0:1`

The two trailing zero groups (`0:0`) are shorter than the pair in positions 3–4, so the replacement is applied to the earlier run.

</details>

---

### Exercise 4 — Protocol Selection

You are writing a real-time video streaming application where occasional lost packets are acceptable but low latency is critical. Which transport protocol should you use?

<details>
<summary>Answer</summary>

UDP — it is connectionless and has lower overhead. Lost packets are not retransmitted, which is acceptable for streaming where latency matters more than perfect reliability.

</details>

---

### Exercise 5 — Port Lookup

What command would look up the port number for the `imaps` service?

<details>
<summary>Answer</summary>

```bash
grep imaps /etc/services
```

Output will show `imaps 993/tcp`.

</details>

---

*LPIC-1 Study Notes | Topic 109: Networking Fundamentals*
