---
title: "CCNA 4.2 NTP and DHCP"
date: 2026-08-26
description: "Configuring a DHCP server on Cisco IOS, relay agent (ip helper-address), NTP stratum, time synchronization and NTP authentication."
tags: ["CCNA", "Cisco", "NTP", "DHCP", "IP services"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-4-02-ntp-dhcp/"
---

## DHCP

### DHCP Operation (DORA)

```
Client                          DHCP Server
  │──── DISCOVER (broadcast) ──►│  Client searches for server
  │◄─── OFFER ─────────────────│  Server offers an IP
  │──── REQUEST (broadcast) ───►│  Client requests the offered IP
  │◄─── ACK ───────────────────│  Server confirms the lease
```

### Configuring DHCP Server on Cisco IOS

```bash
# Exclude addresses from pool (gateways, servers, printers)
Router(config)# ip dhcp excluded-address 192.168.1.1 192.168.1.20

# Create pool
Router(config)# ip dhcp pool LAN_POOL
Router(dhcp-config)# network 192.168.1.0 255.255.255.0
Router(dhcp-config)# default-router 192.168.1.1          # gateway
Router(dhcp-config)# dns-server 8.8.8.8 8.8.4.4
Router(dhcp-config)# domain-name company.local
Router(dhcp-config)# lease 7                             # lease time: 7 days
Router(dhcp-config)# lease 0 12                          # 0 days 12 hours
Router(dhcp-config)# lease infinite                      # permanent

# Disable DHCP
Router(config)# no service dhcp                          # disable server
Router(config)# service dhcp                             # enable (default)
```

### DHCP for Cisco IP Phones

```bash
Router(dhcp-config)# option 150 ip 192.168.1.50          # TFTP server for phones
```

### DHCP Relay Agent (Helper Address)

When the DHCP server is in a different subnet, the router forwards DHCP broadcasts:

```bash
Router(config)# interface gigabitethernet 0/0            # interface toward clients
Router(config-if)# ip helper-address 10.0.0.100          # DHCP server IP
```

> **💡 Tip:** `ip helper-address` forwards several UDP broadcasts: DHCP (67/68), DNS (53), TFTP (69), NTP (37), NetBIOS (137/138). The standard use case is DHCP only.

### DHCP Client on Cisco IOS

```bash
Router(config)# interface gigabitethernet 0/1
Router(config-if)# ip address dhcp                       # get IP from DHCP

Switch(config)# ip default-gateway 192.168.1.1           # gateway for switch
```

### DHCP Verification

```bash
Router# show ip dhcp pool                    # pools and statistics
Router# show ip dhcp binding                 # assigned addresses (MAC → IP)
Router# show ip dhcp conflict               # address conflicts
Router# show ip dhcp server statistics      # server statistics
Router# debug ip dhcp server events         # debug
```

---

## NTP

### How NTP Works

- NTP (Network Time Protocol) synchronizes time between devices
- **Stratum**, accuracy level: Stratum 0 = atomic clocks, Stratum 1 = directly connected server, Stratum 2–15 = clients
- UDP port 123

| Stratum | Description |
|---|---|
| 0 | Reference clocks (GPS, atomic): not in network |
| 1 | NTP server synchronized with Stratum 0 |
| 2 | Client of Stratum 1 |
| 3–15 | Sequential clients |

> **📌 Important:** Time synchronization is critical for: logs and debugging (timestamps), SSL/TLS certificates, OSPF/BGP (authentication), Kerberos, NTP authentication.

### NTP Configuration

```bash
# NTP client (synchronize with server)
Router(config)# ntp server 216.239.35.0                  # Google NTP
Router(config)# ntp server 216.239.35.4 prefer           # preferred server
Router(config)# ntp server 192.168.1.100 version 2       # local server

# NTP master (router acts as time source)
Router(config)# ntp master 3                             # stratum 3

# NTP authentication
Router(config)# ntp authenticate
Router(config)# ntp authentication-key 1 md5 cisco123
Router(config)# ntp trusted-key 1
Router(config)# ntp server 192.168.1.100 key 1

# Set time manually
Router# clock set 14:30:00 05 May 2026

# Timezone
Router(config)# clock timezone MSK 3                     # UTC+3
Router(config)# clock summer-time MSK recurring          # daylight saving time

# NTP source interface
Router(config)# ntp source loopback 0
```

### NTP Verification

```bash
Router# show ntp status                  # synchronization status
Router# show ntp associations            # server/peer list
Router# show ntp associations detail     # detailed
Router# show clock                       # current time
Router# show clock detail                # with time source
```

Sample `show ntp status`:
```
Clock is synchronized, stratum 4, reference is 192.168.1.100
...
```
Key word: `synchronized` = normal; `unsynchronized` = problem.

---

## Resources

| Resource | Description |
|---|---|
| [RFC 5905: NTPv4](https://www.rfc-editor.org/rfc/rfc5905) | Network Time Protocol Version 4: stratum specification, synchronization |
| [RFC 2131: DHCP](https://www.rfc-editor.org/rfc/rfc2131) | Dynamic Host Configuration Protocol: DORA process |
| [NTP (networklessons.com)](https://networklessons.com/system-management/cisco-network-time-protocol-ntp) | NTP: stratum, master, client, NTP authentication |
| [DHCP (networklessons.com)](https://networklessons.com/ip-services/introduction-to-dhcp) | DHCP: pool, lease, ip helper-address, relay agent |
| [Jeremy's IT Lab: NTP (YouTube)](https://www.youtube.com/watch?v=cNRVYoZ6PPYQ) | NTP stratum, Cisco IOS NTP configuration from the Free CCNA series |
| [Cisco DHCP Configuration Guide](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipaddr_dhcp/configuration/xe-16/dhcp-xe-16-book/config-dhcp-server.html) | Official documentation for DHCP server, relay, pool |
