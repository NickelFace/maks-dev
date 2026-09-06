---
title: "CCNA 1.4 TCP and UDP"
date: 2026-07-09
description: "Comparison of TCP and UDP, three-way handshake, flow control, well-known port number table and diagnostic commands."
tags: ["CCNA", "Cisco", "TCP", "UDP", "transport layer"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-1-04-tcp-udp/"
---

## TCP vs UDP

| Characteristic | TCP | UDP |
|---|---|---|
| Reliability | Yes (acknowledgments, retransmission) | No |
| Connection establishment | Yes (three-way handshake) | No |
| Ordering | Yes (sequence numbers) | No |
| Flow control | Yes (windowing) | No |
| Speed | Slower | Faster |
| Usage | HTTP, SSH, FTP, SMTP, Telnet | DNS, DHCP, TFTP, VoIP, SNMP |

---

## TCP: Details

### Three-Way Handshake

```
Client                    Server
  │──── SYN ────────────►│   Client proposes ISN (Initial Seq. Number)
  │◄─── SYN-ACK ─────────│   Server acknowledges and proposes its own ISN
  │──── ACK ────────────►│   Client acknowledges
  │                       │
  │    DATA               │
  │◄──────────────────────│
```

### TCP Header (Key Fields)

| Field | Description |
|---|---|
| Source Port | Sender's port (1–65535) |
| Destination Port | Receiver's port |
| Sequence Number | Byte sequence number |
| Acknowledgment Number | Next expected byte |
| Window Size | Receive buffer size |
| Flags | SYN, ACK, FIN, RST, PSH, URG |

### Flow Control

- **Windowing**: receiver advertises buffer size; sender does not exceed it
- **Slow Start**: begins with a small window; increases upon successful transmission
- **Congestion Avoidance**: reduces window on packet loss

### Connection Termination (Four-Way)

```
Client ──── FIN ────────► Server
Client ◄─── ACK ───────── Server
Client ◄─── FIN ───────── Server
Client ──── ACK ────────► Server
```

---

## UDP: Details

### UDP Header

| Field | Size |
|---|---|
| Source Port | 16 bits |
| Destination Port | 16 bits |
| Length | 16 bits |
| Checksum | 16 bits |

Total 8 bytes, minimal header overhead.

> **💡 Tip:** UDP is used by applications that implement reliability themselves (DNS retries on timeout) or where latency matters more than delivery (VoIP, video).

---

## Well-Known Ports

| Port | Protocol | Transport | Description |
|:---:|---|:---:|---|
| 20 | FTP-data | TCP | FTP data |
| 21 | FTP | TCP | FTP control |
| 22 | SSH | TCP | Secure shell |
| 23 | Telnet | TCP | Remote shell (unencrypted) |
| 25 | SMTP | TCP | Email (sending) |
| 53 | DNS | TCP/UDP | Name resolution |
| 67/68 | DHCP | UDP | 67 = server, 68 = client |
| 69 | TFTP | UDP | Trivial file transfer |
| 80 | HTTP | TCP | Web (unencrypted) |
| 110 | POP3 | TCP | Email retrieval |
| 123 | NTP | UDP | Time synchronization |
| 143 | IMAP | TCP | Email retrieval (IMAP) |
| 161/162 | SNMP | UDP | 161 = agent, 162 = traps |
| 443 | HTTPS | TCP | Web (HTTPS/TLS) |
| 514 | Syslog | UDP | System logs |

> **📌 Important:** Ports 0–1023, **well-known** (reserved for servers)
> Ports 1024–49151, **registered** (applications)
> Ports 49152–65535, **dynamic/ephemeral** (client connections)

---

## Diagnostic Commands

```bash
# On a host (Linux/Windows)
netstat -an                  # active connections and ports
ss -tulnp                    # sockets (Linux)

# On Cisco IOS
Router# show tcp brief       # active TCP connections
Router# show udp             # active UDP sessions
Router# show ip socket       # all open sockets

# Connectivity checks
Router# ping 192.168.1.1               # ICMP echo
Router# ping 192.168.1.1 repeat 100    # 100 packets
Router# traceroute 8.8.8.8            # trace route

# Extended ping (from Privileged EXEC)
Router# ping
Protocol [ip]:
Target IP address: 192.168.1.1
Repeat count [5]: 100
Datagram size [100]: 1500
```

---

## Resources

| Resource | Description |
|---|---|
| [RFC 793: TCP](https://www.rfc-editor.org/rfc/rfc793) | Original TCP specification: 3-way handshake, flow control, windowing |
| [RFC 768: UDP](https://www.rfc-editor.org/rfc/rfc768) | Original UDP specification |
| [TCP vs UDP (networklessons.com)](https://networklessons.com/network-fundamentals/introduction-to-tcp-and-udp) | Comparing TCP and UDP, when to use each |
| [TCP Three-Way Handshake (networklessons.com)](https://networklessons.com/cisco/ccna-routing-switching-icnd1-100-105/tcp-three-way-handshake) | Detailed explanation of the TCP connection establishment process |
| [Jeremy's IT Lab: OSI Model & TCP/IP Suite (YouTube)](https://www.youtube.com/watch?v=t-ai8JzhHuY) | TCP, UDP, ports and sockets from the Free CCNA series |
| [Well-Known Port Numbers (IANA)](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml) | Official IANA port number registry |
