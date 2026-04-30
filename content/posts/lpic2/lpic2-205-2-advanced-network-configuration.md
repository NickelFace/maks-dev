---
title: "LPIC-2 205.2 — Advanced Network Configuration"
date: 2025-11-25
description: "VPN and IPSEC (ESP/AH/IKE, Openswan), multihomed hosts, network analysis tools: ping, traceroute, arp, arpwatch, tcpdump, mtr, netstat, ss, lsof, nmap, nc. LPIC-2 exam topic 205.2."
tags: ["Linux", "networking", "LPIC-2", "IPsec", "VPN", "tcpdump", "nmap"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-205-2-advanced-network-configuration/"
page_lang: "en"
---

> **Exam topic 205.2** — Advanced Network Configuration (weight: 4). Covers configuring network devices for various authentication schemes including multihomed configurations, VPN connections, and troubleshooting network problems.

---

## VPN Overview

VPN (Virtual Private Network) connects two or more remote networks through an encrypted tunnel over the public internet. All traffic is encrypted before transmission, and the connection behaves like a physical link even though it passes through many networks and nodes.

Classic use case: offices in Los Angeles and New York each have internet access. VPN connects them without leasing expensive dedicated lines from a telecom provider.

> **Important:** For the exam — VPN encrypts traffic between two points over an untrusted network. Primary implementations: IPSEC and SSL/TLS.

### VPN Types

| Type | Description |
|---|---|
| IPSEC | IP-level encryption, IETF standard RFC 2401-2412 |
| OpenVPN | SSL/TLS, flexible, NAT and firewall friendly |
| SSH tunnel | Simple tunnel over SSH |
| VPND | Virtual private network daemon |
| Cisco (proprietary) | Built into Cisco routers |

---

## IPSEC

IPSEC operates at Layer 3 (IP) and encrypts all packets including UDP. For IPv4 it is optional; for IPv6 it is mandatory.

### Three IPSEC Protocols

**ESP (Encapsulating Security Payload)** — encrypts and authenticates data.

**AH (Authentication Header)** — provides packet authentication without encryption.

**IKE (Internet Key Exchange)** — negotiates connection parameters and keys between nodes. Runs on port `500/udp`, implemented as a userspace daemon.

> **Note:** The term "IPSEC" is sometimes used to refer only to AH and ESP, excluding IKE.

### Linux IPSEC Implementations

**Openswan** (formerly FreeS/WAN) — supports kernels 2.0–2.6. Contains:
- KLIPS — IPSEC packet processing at kernel level (up to kernel 2.5.47)
- NETKEY — built-in IPSEC implementation in kernel 2.6
- Pluto — IKE daemon, negotiates connections

**StrongSwan** — also derived from FreeS/WAN, supports kernel 3.x.

---

## Openswan Configuration

The configuration file `/etc/ipsec.conf` consists of three parts:

1. `config setup` — general startup parameters
2. `conn %default` — default values for all connections
3. `conn <name>` — a specific connection definition

### Example Configuration

```ini
# General startup parameters
config setup
    interfaces="ipsec0=eth0"
    klipsdebug=none
    plutodebug=none
    plutoload=%search
    plutostart=%search
    uniqueids=yes

# Default values
conn %default
    keyingtries=0
    authby=rsasig

# Head office to branch office connection
conn head-branch
    leftid=@head.example.com
    leftrsasigkey=0x175cffc641f...
    left=45.66.9.170
    leftnexthop=45.66.11.254
    leftsubnet=192.168.11.0/24
    rightid=@branch.example.com
    rightrsasigkey=0xfc641fd6d9a24...
    right=17.120.138.134
    rightnexthop=17.120.138.1
    rightsubnet=192.168.0.0/24
    auto=start
```

> **Tip:** The same `ipsec.conf` can be used on both gateways. Pluto automatically determines which side it is on by comparing the IP addresses in the config with its own interface addresses.

### Key Parameters

| Parameter | Purpose |
|---|---|
| `left` / `right` | Gateway IP address |
| `leftsubnet` / `rightsubnet` | Subnet behind the gateway |
| `leftnexthop` / `rightnexthop` | Next hop for routing |
| `leftid` / `rightid` | Authentication identifier |
| `leftrsasigkey` / `rightrsasigkey` | Participant's public RSA key |
| `auto=start` | Bring up connection automatically at startup |
| `auto=add` | Load into Pluto's database but do not start |

### Generating RSA Keys

```bash
# Generate a 2048-bit key
ipsec rsasigkey --verbose 2048 > rsa.key
```

The private key is stored in `/etc/ipsec.secrets` — this file must be accessible only by root.

> **Warning:** Common exam mistake — the private key file is `/etc/ipsec.secrets`. The public key goes into `ipsec.conf` as `leftrsasigkey` or `rightrsasigkey`.

---

## Interface Configuration Tools

### ifconfig

Configures network interfaces and displays their status.

```bash
ifconfig           # show all interfaces
ifconfig eth0      # show a specific interface
ifconfig eth0 192.168.1.10   # assign IP address
ifconfig eth0 up   # bring interface up
ifconfig eth0 down # bring interface down
```

Example output of `ifconfig eth0`:

```
eth0  Link encap:Ethernet  HWaddr 00:10:60:58:05:36
      inet addr:192.168.2.3  Bcast:192.168.2.255  Mask:255.255.255.0
      UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1
      RX packets:1398185 errors:0 dropped:0 overruns:0 frame:0
      TX packets:1411351 errors:0 dropped:0 overruns:0 carrier:0
      collisions:829 txqueuelen:100
```

When diagnosing interface problems, check the flags in the third line:
- `UP` — interface is active; if "down", bring it up with `ifconfig eth0 up`
- `RUNNING` — driver is working correctly; if absent, the driver is not installed properly

The second line shows IP (`inet addr`), mask (`Mask`), and broadcast. The two most common problems: wrong subnet mask (host cannot see part of its subnet) and wrong IP address.

If a host has the wrong network portion of its IP, any `ping` will fail with "no answer" — other hosts don't know that address and send replies to the default gateway. If only the host portion is wrong, the problem may not show up on that host for a long time, but another host with the same address will be affected. IP address conflicts are detected with `arp` — it will show alternating MAC addresses for the same IP.

### Multihomed Host

A host can be configured as multihomed in two ways:

**Two interfaces on the same network** — used to improve performance or reliability (e.g., a server with two physical NICs on the same network). Both IP addresses belong to the same subnet.

**Interfaces on different networks** — the host is connected to multiple networks with different network identifiers, such as a router or firewall.

### ip

Modern replacement for `ifconfig` and `route`. Handles addresses, routes, and interfaces all in one tool.

```bash
# Interface addresses
ip addr show
ip addr add 192.168.1.10/24 dev eth0

# Routes
ip route show
ip route add 10.0.0.0/8 via 192.168.1.1
ip route add default via 192.168.1.1

# Neighbors (ARP table)
ip neigh show
```

### route

Manages the kernel routing table.

```bash
# Show routing table
route
route -n   # without name resolution

# Add route to a network
route add -net 192.168.10.0 netmask 255.255.255.0 dev eth0

# Add route via a gateway
route add -net 192.168.20.0 netmask 255.255.255.0 gw 192.168.1.10

# Set default route
route add default gw 192.168.1.1 eth1

# Delete a route
route del -net 192.168.10.0 netmask 255.255.255.0
```

Example output of `route -n`:

```
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref  Use Iface
192.168.11.0    0.0.0.0         255.255.255.0   U     0      0      0 eth0
145.66.8.0      0.0.0.0         255.255.252.0   U     0      0      0 eth1
0.0.0.0         145.66.11.254   0.0.0.0         UG    0      0      0 eth1
```

Columns: Destination, Gateway, Genmask, Flags (`U`=active, `G`=uses gateway, `H`=host), Metric, Iface. The default route is identified by Destination=`0.0.0.0` and flag `G`.

> **Warning:** Two typical routing mistakes. First: no entry for the interface — when an interface is configured, the kernel should automatically add a route for its subnet. Second: no default route, or two default routes. Two default gateways may not cause problems for a long time because traffic "accidentally" goes through the correct one.

---

## Network Analysis Tools

### ping / ping6

Checks host reachability via ICMP echo request/reply.

```bash
ping 192.168.1.1
ping6 ::1
ping -c 4 google.com   # send 4 packets
```

Example output:

```
PING home.NL.net (193.67.79.250): 56 data bytes
64 bytes from 193.67.79.250: icmp_seq=0 ttl=245 time=32.1 ms
64 bytes from 193.67.79.250: icmp_seq=1 ttl=245 time=32.1 ms
--- home.NL.net ping statistics ---
4 packets transmitted, 4 packets received, 0% packet loss
round-trip min/avg/max = 32.1/33.9/37.6 ms
```

Three metrics to watch:
- `icmp_seq` — packet arrival order; out-of-order packets signal link problems
- `time=` — round-trip time in milliseconds
- `packet loss` — percentage of lost packets

On a LAN the round-trip should be near zero with no packet loss. If there are losses on a LAN, look for cable, hub, or switch problems. Moderate loss and high RTT on WAN is normal.

> **Note:** You cannot ping an IPv4 host from an IPv6 host and vice versa. Both ends must use the same protocol version.

> **Warning:** Many hosts block ICMP to prevent DoS attacks, so no ping reply does not always mean the host is unreachable.

### traceroute / traceroute6

Shows the path a packet takes to its destination and the delay at each hop. `traceroute6` is equivalent to `traceroute -6` for IPv6.

How it works: traceroute sends UDP packets with a progressively increasing TTL. The first three packets have TTL=1, the first router drops them and replies with ICMP TIME_EXCEEDED, from which traceroute learns the first hop's IP. Then TTL=2, and so on until the destination is reached. By default, up to 30 hops are checked.

```bash
traceroute google.com
traceroute6 2001:db8::1
# traceroute6 is equivalent to traceroute -6
```

> **Warning:** `* * *` entries do not always mean packet loss. Possible causes: router does not return ICMP TIME_EXCEEDED, ICMP has low priority and arrives late, firewall filters ICMP after a certain point in the route, old routers forward packets with TTL=0.

### arp / arpwatch

`arp` manages the kernel's ARP cache: view, add, or delete entries.

```bash
arp -n              # show ARP table without name resolution
arp -d 192.168.1.5  # delete an entry
```

If you know what MAC address a particular host should have, an ARP cache dump will reveal a duplicate IP: two different MAC addresses will alternate for the same IP.

`arpwatch` monitors IP/MAC pairings and reports changes via syslog and email. Useful for detecting duplicate IP addresses.

Common causes of IP address conflicts:
- Administrator assigned the same static IP to two hosts
- A static IP fell within the DHCP range and the server issued it to another host
- DHCP server configuration error
- A host woke from sleep with an address that had already been reassigned

> **Note:** `arpwatch` reports "changed ethernet address" when a known IP appears with a new MAC, and "flip flop" when the old MAC reappears for the same IP.

---

## Traffic Monitoring Tools

### tcpdump

Captures all packets on an interface in real time. Requires root.

```bash
tcpdump                    # listen on all interfaces
tcpdump -i eth0            # only interface eth0
tcpdump -n                 # without name resolution
tcpdump -w capture.pcap    # write to file for Wireshark analysis

# Filter by source, destination, and port
tcpdump -i eth0 src 10.10.0.1 and dst 10.10.0.254 and tcp port 80
```

tcpdump filters are combined with `and`, `or`, `not`. You can specify protocol (`tcp`, `udp`, `icmp`), address (`src`, `dst`), and port (`port 80`).

In fully switched networks, tcpdump only sees traffic for its own host. Two options: run tcpdump directly on the source or destination host, or configure a SPAN port on the switch to mirror traffic from relevant ports to the port where tcpdump runs.

### mtr

Combines `ping` and `traceroute` in real time. Unlike `traceroute` which makes one pass, `mtr` continuously sends ICMP packets and collects statistics on the state, load, and responsiveness of each intermediate host.

```bash
mtr google.com          # run in interactive mode
mtr -n google.com       # without resolving IPs to names
mtr -c 100 google.com   # send exactly 100 probe packets then stop
```

> **Note:** Without `-c`, `mtr` runs indefinitely like `ping`. Specify `-c count` to fix the number of packets and get a final summary.

### wireshark

Graphical protocol analyzer with a rich filter language. Can read `.pcap` files created by tcpdump. Allows interactive inspection of captured data down to any level of packet detail, full TCP session reconstruction, and supports hundreds of protocols.

Includes a console version `tshark` (formerly called `tethereal`).

> **Warning:** Wireshark has had many remotely exploitable vulnerabilities. Do not run with root privileges on untrusted networks (e.g., at security conferences). Keep the package updated.

### netstat

Shows active connections, routing tables, and interface statistics. Finds standard and non-standard ports, including those opened with `nc`.

```bash
netstat           # all active sockets
netstat -rn       # routing table without name resolution
netstat -an       # all sockets with numeric addresses
netstat -l        # only listening sockets
netstat -e        # extended mode
netstat -inet     # IP connections only
netstat -p        # show PID and process name
netstat -s        # statistics by protocol
netstat -tulpn    # TCP/UDP, listening, with PID, numeric
```

### ss

Modern replacement for `netstat`. Shows detailed socket information including send and receive queues.

```bash
ss             # all sockets
ss -a          # all, including listening
ss -l          # only listening
ss -t          # TCP only
ss -u          # UDP only
ss -p          # with process names
ss -n          # without name resolution
ss -tulpn      # typical combination for diagnostics
```

### lsof

Lists all open files, including network sockets. Since everything is a file in Linux, `lsof` is excellent for finding open ports and identifying which process holds a connection.

```bash
lsof -i              # all IP sockets
lsof -i tcp          # TCP only
lsof -i :80          # sockets on port 80
lsof -i 192.168.1.2  # sockets for a specific IP
lsof -n -P           # without name/port resolution (faster)
```

The `-n` and `-P` flags speed things up: without host name and port resolution, `lsof` runs faster.

### nmap

Port scanner and network audit tool. Identifies open ports, running services, their versions, and OS type.

```bash
nmap 192.168.1.1          # basic scan
nmap 192.168.1.0/24       # scan a range
nmap -A localhost          # aggressive: service versions, OS, scripts
nmap -sV 192.168.1.1       # service version detection
nmap -sS 192.168.1.1       # TCP SYN scan (stealth)
nmap -sT 192.168.1.1       # full TCP scan
nmap -sU 192.168.1.1       # UDP port scan
```

Example `nmap -A localhost` output:

```
PORT     STATE SERVICE  VERSION
22/tcp   open  ssh      OpenSSH 7.6p1 Ubuntu 4ubuntu0.3
25/tcp   open  smtp     Postfix smtpd
143/tcp  open  imap     Dovecot imapd (Ubuntu)
993/tcp  open  ssl/imap Dovecot imapd (Ubuntu)
2049/tcp open  nfs_acl  3 (RPC #100227)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

> **Important:** For the exam — `-sS` and `-sT` scan open TCP ports. `-sU` scans UDP. `-A` enables OS detection, service version detection, and scripts.

> **Note:** Some `nmap` options require root. If something doesn't work as a regular user, run with `sudo`.

### nc (netcat)

Universal tool for TCP/UDP connections. Can listen on ports, connect to them, and transfer data. Opening a listening port below 1024 requires root.

```bash
# Check a port range (alternative to nmap when nmap is unavailable)
nc -z localhost 1-1023

# Start a simple TCP server on port 8080
nc -l 8080

# Connect to a server
nc 192.168.1.1 8080

# IPv4 only
nc -4 192.168.1.1 80

# UDP instead of TCP
nc -u 192.168.1.1 53
```

> **Tip:** `nc` is used for transferring files between hosts when Samba, FTP, or SSH is unavailable. Server listens: `nc -l 8080 > file.tar.gz`, client sends: `nc server 8080 < file.tar.gz`.

> **Important:** For the exam — `-z` scans ports without sending data. If `nmap` is unavailable, `nc -z host 1-1023` checks a port range.

---

## Exam Cheat Sheet

### Key Files

| File | Purpose |
|---|---|
| `/etc/ipsec.conf` | Openswan/StrongSwan configuration |
| `/etc/ipsec.secrets` | IPSEC private keys |
| `/etc/openvpn/` | OpenVPN configuration directory |

### Quick Reference Commands

| Task | Command |
|---|---|
| Show all interfaces | `ifconfig` or `ip addr show` |
| Show routing table | `route -n` or `ip route show` or `netstat -rn` |
| All listening TCP/UDP | `ss -tulpn` or `netstat -tulpn` |
| Capture traffic on eth0 | `tcpdump -i eth0 -n` |
| Real-time traceroute | `mtr -n host` |
| Check open ports | `nc -z host 1-1023` |
| View ARP table | `arp -n` or `ip neigh show` |

### IPSEC Protocols and Ports

| Protocol | Port / type |
|---|---|
| IKE | UDP/500 |
| ESP | IP protocol 50 |
| AH | IP protocol 51 |

### Common Mistakes

- `plutoload=%search` and `plutostart=%search` mean Pluto searches for `auto=` directives in the config file. Connections with `auto=add` are only loaded; `auto=start` connections are also started.
- The same `ipsec.conf` works on both gateways. Pluto determines whether it is the "left" or "right" node by comparing config IPs with local interface addresses.
- `netstat -r` and `route` show the same thing: the kernel routing table.
- If you suspect a routing problem and don't know where to start, first isolate the failing segment with `ping` or `traceroute`, then analyze the routing table with `route`.

---

## Practice Questions

**Q1.** Which file stores IPSEC private keys in Openswan?

A. `/etc/ipsec.conf`  B. `/etc/ipsec.keys`  C. `/etc/ipsec.secrets`  D. `/etc/pluto/keys`

**Answer:** C. Private keys are stored in `/etc/ipsec.secrets`.

---

**Q2.** Which `ipsec.conf` parameter causes a connection to come up automatically when IPSEC starts?

A. `auto=load`  B. `auto=start`  C. `auto=up`  D. `plutostart=yes`

**Answer:** B. `auto=start` brings the connection up automatically; `auto=add` only loads it into Pluto's database.

---

**Q3.** What does `mtr google.com` do?

A. Sends one ICMP packet to the target  B. Shows the route and continuously updates loss statistics for each hop  C. Scans open ports on the host  D. Captures traffic between hosts

**Answer:** B. `mtr` combines `ping` and `traceroute`, continuously updating statistics.

---

**Q4.** Which `nmap` flags scan for open TCP ports? (two answers)

A. `-sO`  B. `-sZ`  C. `-sT`  D. `-sU`  E. `-sS`

**Answer:** C and E. `-sT` is a full TCP scan; `-sS` is a SYN scan (stealth).

---

**Q5.** What does `plutoload=%search` mean in `ipsec.conf`?

A. Pluto loads all connections without exception  B. Pluto searches for `auto=` directives in the config and loads/starts accordingly  C. Pluto searches the network for automatic peer discovery  D. Pluto loads only explicitly listed connections

**Answer:** B. The value `%search` tells Pluto to look for `auto=add` and `auto=start` in the config file.

---

**Q6.** Which command to use if `nmap` is unavailable but you need to check open ports on localhost?

A. `lsof -i localhost`  B. `nc -z localhost 1-1023`  C. `tcpdump -i lo`  D. `ss -a localhost`

**Answer:** B. `nc -z` scans ports without sending data.

---

**Q7.** How does `ss` differ from `netstat`?

A. `ss` works only with TCP; `netstat` supports all protocols  B. `ss` shows additional socket information including send and receive queues  C. `ss` requires root; `netstat` works for any user  D. `ss` shows only UDP connections

**Answer:** B. `ss` provides more detailed information about socket state.

---

**Q8.** Which IPSEC protocol is responsible for key negotiation and runs on UDP/500?

A. ESP  B. AH  C. IKE  D. KLIPS

**Answer:** C. IKE (Internet Key Exchange) negotiates connection parameters and keys, runs on port 500/udp via the Pluto daemon.
