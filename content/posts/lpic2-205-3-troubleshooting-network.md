---
title: "LPIC-2 205.3 — Troubleshooting Network Issues"
date: 2026-04-10
description: "Systematic network diagnostics, TCP Wrappers (hosts.allow/hosts.deny), interface and routing management, netstat/ss, ping/traceroute/mtr, DNS tools (dig/host), config files, dmesg, NetworkManager. LPIC-2 exam topic 205.3."
tags: ["Linux", "networking", "LPIC-2", "troubleshooting", "TCP Wrappers", "NetworkManager"]
categories: ["LPIC-2"]
---

> **Exam topic 205.3** — Troubleshooting Network Issues (weight: 4). Covers systematically diagnosing and resolving network problems, TCP Wrappers access control, interface/routing configuration, and key diagnostic tools.

---

## Introduction to Network Diagnostics

There is no universal "error book" with ready answers. But almost every problem can be solved logically if you understand how traffic should flow from source to destination and back. Traffic in both directions often follows different routes, and that itself is frequently the source of problems.

**Step-by-step diagnostic algorithm:**

```
1. List all network components: PC, switch, router, firewall, ISP, target host.
2. Determine how the components interact.
3. Check sequentially from nearest to farthest.
```

Example step-by-step diagnosis when a site is unreachable:

**Step 1.** Check if other internet machines are reachable. Try another URL or ping another IP. If everything else works, the problem is with the specific target host.

```bash
ping -c 4 8.8.8.8
ping -c 4 1.1.1.1
```

**Step 2.** Check if the target host itself is down. Ask someone to check it from a different network or contact the server administrator.

**Step 3.** Check firewall reachability. Ping its IP, try logging in via SSH.

```bash
ping -c 4 192.168.1.1
```

**Step 4.** Check if one of the hops along the path is down. Run `traceroute` with `-I` (ICMP instead of UDP):

```bash
traceroute -I www.lpi.org
# Each line is one hop. *** means packet loss at that node.
```

**Step 5.** Check if the firewall is reachable from other machines on the network. Try `ping` or open a page from another PC.

**Step 6.** Check if the firewall is blocking traffic to the specific host. Someone may have added a blocking rule.

**Step 7.** If the problem is on the firewall, check its interface settings, rules, and cables.

**Step 8.** Check if interface eth0 is up:

```bash
ifconfig eth0
# or
ip link show eth0
```

**Step 9.** Check the routing table, specifically the presence of a default gateway:

```bash
route -n
# or
ip route show
```

**Step 10.** Check for a physical cause. An unshielded cable near power lines causes unpredictable, hard-to-reproduce data transmission errors.

> **Warning:** Firewalls may block ICMP echo-request. If `ping` gets no reply, that does not mean the host is unreachable. Verify TCP connectivity with `nc` or `telnet`.

---

## Access Control Files: TCP Wrappers

TCP Wrappers intercepts incoming connections to services compiled with `libwrap` support and decides who to allow. To check if a service supports it:

```bash
ldd /sbin/rpcbind | grep libwrap
```

### Check Order

1. `/etc/hosts.allow` is read first. If the client address is found, access is granted immediately.
2. `/etc/hosts.deny` is read next. If the address is found, access is blocked.
3. If the address is not found in either file, access is granted by default.

> **Important:** Remember the order: allow → deny → permit. The exam often tests this order. `hosts.allow` is always checked first.

### Entry Format

```
# /etc/hosts.allow
sshd: 192.168.1.0/24
rpcbind: 192.168.56.101, 192.168.56.106
ALL: localhost

# /etc/hosts.deny
sshd: ALL
rpcbind: ALL
```

Entry fields: `service: client_list`. The list may contain IP addresses, host names, subnets, and wildcards (`ALL`, `LOCAL`).

> **Tip:** Best practice — write `ALL: ALL` in `hosts.deny` and list only allowed addresses in `hosts.allow`. No service restart is needed after changing these files; changes take effect immediately.

---

## Managing Network Interfaces

### ifconfig (legacy)

```bash
ifconfig -a                                         # view all interfaces
ifconfig eth0                                       # view a specific interface
ifconfig eth0 192.168.1.100 netmask 255.255.255.0   # assign IP and mask
ifconfig eth0 up                                    # bring interface up
ifconfig eth0 down                                  # bring interface down
```

### ip (modern, recommended)

```bash
ip addr show                          # show all interfaces and addresses
ip link show                          # show link layer info
ip addr add 192.168.1.100/24 dev eth0 # assign IP address
ip addr del 192.168.1.100/24 dev eth0 # remove IP address
ip link set eth0 up                   # bring interface up
ip link set eth0 down                 # bring interface down
ip -s link show eth0                  # show interface statistics
```

> **Important:** `ip` (from the `iproute2` package) is gradually replacing `ifconfig` (from `net-tools`). Know both for the exam.

---

## Managing the Routing Table

### route (legacy)

```bash
route -n                                                        # show routing table
route add -net 192.168.10.0 netmask 255.255.255.0 dev eth0     # add route to network
route add -net 192.168.20.0 netmask 255.255.255.0 gw 192.168.1.10  # add route via gateway
route add default gw 192.168.1.1 eth1                          # set default gateway
route del -net 192.168.10.0 netmask 255.255.255.0              # delete a route
```

Flags in `route -n` output:

| Flag | Meaning |
|---|---|
| U | Route is active (Up) |
| H | Target is a specific host |
| G | Route uses a Gateway |
| D | Added Dynamically |
| M | Modified by a routing daemon |

### ip route (modern)

```bash
ip route show                                     # show routing table
ip route add 192.168.10.0/24 via 192.168.1.1 dev eth0  # add route
ip route add default via 192.168.1.1              # set default gateway
ip route del 192.168.10.0/24                      # delete a route
ip route get 8.8.8.8                              # find route to a specific host
```

> **Warning:** Two common routing mistakes. First: missing network entry for an interface — when an interface is configured, the kernel should automatically add a route for its subnet. Second: two default gateways. There should be exactly one. Having two may go unnoticed for a long time because traffic accidentally goes through the correct one.

---

## Viewing Network State

### netstat (legacy, but appears on the exam)

```bash
netstat              # all active sockets
netstat -aln --tcp   # TCP connections with numeric addresses
netstat -l           # listening ports only
netstat -rn          # routing table (same as route -n)
netstat -s           # statistics by protocol
netstat -tulnp       # TCP/UDP listening with PID, numeric
```

### ss (modern, recommended)

```bash
ss -t -a    # all TCP connections
ss -tlnp    # listening TCP ports with PID
ss -u -a    # all UDP sockets
ss -t       # show send/receive queues
ss -t dst :80  # filter by destination port
```

The difference between `ss` and `netstat`: `ss` reads data directly from kernel space and shows Recv-Q and Send-Q queues, which helps understand whether the application is keeping up with the data flow.

> **Tip:** For the exam — `netstat -tulnp` and `ss -tlnp` both show listening TCP/UDP ports with process names. Know both.

---

## Connectivity Diagnostics and Tracing

### ping / ping6

```bash
ping -c 4 192.168.1.1         # send 4 packets
ping6 -c 4 fe80::1            # IPv6
ping -s 1400 8.8.8.8          # specify packet size
ping -i 0.2 192.168.1.1       # interval between packets
```

Good result: 0% packet loss, stable RTT. Rising RTT or packet loss indicates congestion or link degradation.

### traceroute / traceroute6

```bash
traceroute 8.8.8.8                    # standard trace
traceroute -I 8.8.8.8                 # use ICMP instead of UDP
traceroute6 2001:4860:4860::8888      # IPv6
traceroute -6 2001:4860:4860::8888    # equivalent to traceroute6
```

Uses the TTL field in the IP header: each hop decrements TTL and sends ICMP Time Exceeded when TTL reaches 0, building a map of the path.

> **Note:** `traceroute6` and `traceroute -6` are synonyms. Know both for the exam.

### mtr (best tool for live diagnostics)

```bash
mtr 8.8.8.8              # interactive mode
mtr -n 8.8.8.8           # without name resolution
mtr -c 20 8.8.8.8        # send 20 packets then stop
mtr --report 8.8.8.8     # text-mode report
```

`mtr` combines `ping` and `traceroute`: continuously sends packets and shows loss and latency per hop in real time.

> **Important:** For the exam — if the question asks about a tool that combines ping and traceroute, the answer is always `mtr`.

---

## Configuration Files

### /etc/resolv.conf

Contains DNS server addresses and search parameters:

```
domain example.com           # default domain
search example.com test.com  # list of domains to search
nameserver 192.168.1.1       # primary DNS
nameserver 8.8.8.8           # secondary DNS
```

> **Warning:** NetworkManager overwrites `resolv.conf`. If NetworkManager is active, do not edit `/etc/resolv.conf` directly — changes will disappear after reconnection. Use `nmcli` or files under `/etc/NetworkManager/`.

### /etc/hosts

Local IP-to-name mapping table. Checked before DNS queries:

```
127.0.0.1   localhost
::1         localhost ip6-localhost
192.168.1.10  server01 server01.example.com
```

### Name Resolution Tools: dig and host

If a host does not resolve, first check `/etc/resolv.conf` and `/etc/hosts`, then use `dig` or `host` for manual verification:

```bash
# host: quick way to get an IP from a name
host ns12.zoneedit.com
# ns12.zoneedit.com has address 209.62.64.46

# dig: detailed output with QUESTION, ANSWER, AUTHORITY sections
dig zonetransfer.me
# Check the ANSWER SECTION and the SERVER: line (which DNS answered)

# Query a specific DNS server
dig @8.8.8.8 example.com

# Query MX records
dig example.com MX

# Reverse lookup (PTR)
dig -x 192.168.1.10
```

`dig` is the "Swiss Army knife" of name resolution: it shows everything the DNS server returned. `host` is simpler and faster when you just need the IP.

> **Important:** For the exam — `host` gives a brief `hostname has address X.X.X.X` output. `dig` gives a full DNS response with all sections. Both can resolve names and check records.

### /etc/hostname and /etc/HOSTNAME

Stores the host name. Debian/Ubuntu: `/etc/hostname`; old Red Hat: `/etc/HOSTNAME`. On Red Hat systems the name is also in `/etc/sysconfig/network` as `HOSTNAME=myserver`.

```bash
hostname                          # view current hostname
hostname newname                  # set hostname (temporary)
hostnamectl set-hostname newname  # set hostname (permanent via systemd)
```

### Interface Configuration Directories

```bash
# Debian/Ubuntu: /etc/network/interfaces
auto eth0
iface eth0 inet static
  address 192.168.1.100
  netmask 255.255.255.0
  gateway 192.168.1.1
  dns-nameservers 8.8.8.8

# Red Hat/CentOS: /etc/sysconfig/network-scripts/ifcfg-eth0
DEVICE="eth0"
BOOTPROTO=static
IPADDR=192.168.1.77
NETMASK=255.255.255.0
GATEWAY=192.168.1.254
ONBOOT=yes
NM_CONTROLLED="no"
```

---

## Logs and Hardware Information

### dmesg

Shows the kernel message ring buffer. Useful at first boot to verify the NIC driver loaded:

```bash
dmesg                          # show full kernel buffer
dmesg | grep -i eth            # filter for network card
dmesg | grep -i network

# Example of successful NIC initialization:
# [2.06] e1000 0000:00:03.0 eth0: Intel(R) PRO/1000 Network Connection
# [21.89] e1000: eth0 NIC Link is Up 1000 Mbps Full Duplex
```

> **Tip:** If the system has been running for a long time, old boot messages may have been overwritten in the ring buffer. Look in `/var/log/dmesg`, `/var/log/syslog`, or `/var/log/messages` instead.

### /var/log/syslog and /var/log/messages

```bash
# Debian/Ubuntu uses /var/log/syslog
tail -f /var/log/syslog
grep -i "eth0\|network" /var/log/syslog

# Red Hat/CentOS uses /var/log/messages
tail -f /var/log/messages
grep -i "eth0\|network" /var/log/messages

# With systemd: journalctl
journalctl -u NetworkManager
journalctl -k   # kernel messages only
```

---

## Incorrect System Initialization

If a network interface did not come up at all, the cause may be a boot error — the kernel did not load the required NIC module or failed to initialize the interface.

```bash
dmesg | grep -i eth
dmesg | grep -i "link is up\|link is down\|error"

# If the buffer has been overwritten, check logs
grep -i eth /var/log/messages  # Red Hat
grep -i eth /var/log/syslog    # Debian/Ubuntu
```

A NIC initialization error looks like: no `NIC Link is Up` line, or a line like `probe of 0000:xx:xx.x failed`. In this case check whether the required driver is installed and load the module manually with `modprobe`.

---

## NetworkManager

NetworkManager manages network connections in most modern distributions. Starts automatically at boot. Settings are stored in two places:

```
# User settings
/home/$USER/.gconf/system/networking/connections/

# System settings
/etc/NetworkManager/
/etc/NetworkManager/system-connections/
```

```bash
systemctl status NetworkManager             # NetworkManager status
nmcli connection show                       # show all connections
nmcli connection show --active              # show active connections
nmcli device status                         # show device states
nmcli device show eth0                      # show interface details
nmcli device connect eth0                   # connect interface
nmcli device disconnect eth0                # disconnect interface

# Set static IP
nmcli connection modify "eth0" ipv4.addresses "192.168.1.100/24"
nmcli connection modify "eth0" ipv4.gateway "192.168.1.1"
nmcli connection modify "eth0" ipv4.method manual
nmcli connection up "eth0"
```

> **Warning:** If NetworkManager is active, it may overwrite settings made via `ip` or `ifconfig` on the next reconnection or reboot. To disable management of a specific interface, add `NM_CONTROLLED="no"` to its config (Red Hat) or an `unmanaged-devices` section to `/etc/NetworkManager/NetworkManager.conf`.

### Network Initialization: Systemd vs SysV

```bash
# Systemd
systemctl start networking
systemctl enable networking
systemctl start NetworkManager
systemctl enable NetworkManager

# SysV (legacy)
/etc/init.d/networking start
/etc/init.d/network start   # Red Hat

# View network-related systemd units
systemctl list-units --type=service | grep -i net
```

---

## Exam Cheat Sheet

### Key Files

| File | Purpose |
|---|---|
| `/etc/hosts` | Local name table (checked before DNS) |
| `/etc/resolv.conf` | DNS server addresses |
| `/etc/hostname` | Host name (Debian/Ubuntu) |
| `/etc/HOSTNAME` | Host name (old Red Hat) |
| `/etc/hosts.allow` | TCP Wrappers whitelist |
| `/etc/hosts.deny` | TCP Wrappers blacklist |
| `/etc/network/interfaces` | Interface config (Debian) |
| `/etc/sysconfig/network-scripts/ifcfg-*` | Interface config (Red Hat) |
| `/var/log/syslog` | System log (Debian/Ubuntu) |
| `/var/log/messages` | System log (Red Hat/CentOS) |

### Key Commands

| Task | Command |
|---|---|
| Show interfaces | `ip addr show` / `ifconfig -a` |
| Show routes | `ip route show` / `route -n` |
| Show open ports | `ss -tlnp` / `netstat -tulnp` |
| Check connectivity | `ping -c 4 <host>` |
| Trace path | `traceroute <host>` |
| Live trace diagnostics | `mtr <host>` |
| Kernel messages | `dmesg \| grep -i eth` |
| Check hostname | `hostname` |
| Manage connections | `nmcli connection show` |

### Common Configuration Mistakes

1. No route entry for an interface after configuring it.
2. Two default gateways.
3. Wrong DNS in `/etc/resolv.conf`.
4. `/etc/hosts` overrides DNS: old entry points to wrong IP.
5. TCP Wrappers blocking access: address in `hosts.deny` but not in `hosts.allow`.
6. NetworkManager overwriting manual settings.

---

## Practice Questions

**Q1.** An administrator ran `ping 8.8.8.8` and got no reply. This means 8.8.8.8 is unreachable.

A. True  
B. False — a firewall may block ICMP  
C. True, but only for IPv4  
D. False — use ping6 instead

**Answer:** B. A firewall on an intermediate node or on 8.8.8.8 itself may block ICMP echo-request/reply. No ping reply does not prove the host is unreachable.

---

**Q2.** In what order does TCP Wrappers check access files for an incoming connection?

A. hosts.deny → hosts.allow → permit  
B. hosts.allow → hosts.deny → permit  
C. hosts.allow → hosts.deny → deny  
D. hosts.deny → hosts.allow → deny

**Answer:** B. First `hosts.allow` (allow and exit), then `hosts.deny` (block); if not found in either, access is permitted.

---

**Q3.** Which command shows the path to a host while displaying per-hop loss and latency in real time?

A. traceroute  
B. ping  
C. mtr  
D. netstat

**Answer:** C. `mtr` combines `ping` and `traceroute`, continuously sending packets and showing statistics per hop.

---

**Q4.** `/etc/resolv.conf` was edited manually, but the changes disappeared after a reboot. What is the cause?

A. The file is read-only and does not accept changes  
B. NetworkManager automatically overwrites the file  
C. `/etc/hosts` overrides `/etc/resolv.conf`  
D. The DNS server needs to be restarted

**Answer:** B. NetworkManager manages `/etc/resolv.conf` when a connection is active. For permanent changes, use `nmcli` or settings in `/etc/NetworkManager/`.

---

**Q5.** `route -n` shows two routes with Destination `0.0.0.0`. What does this mean?

A. Normal — one route for IPv4, another for IPv6  
B. A problem — two default gateways can cause unpredictable routing  
C. Normal — one primary, one backup  
D. A syntax error in the route command

**Answer:** B. There should be exactly one default gateway. Two default gateways create unpredictable behavior that may go unnoticed for a long time if traffic accidentally takes the correct path.

---

**Q6.** Which command lists all listening TCP ports with process names and no name resolution?

A. `netstat -l`  
B. `ss -tlnp`  
C. `ip route show`  
D. `lsof -i tcp`

**Answer:** B. `ss -tlnp`: `-t` TCP only, `-l` listening only, `-n` no name resolution, `-p` with process names. `netstat -tlnp` also works but `ss` is preferred.

---

**Q7.** An admin wants to deny all TCP Wrappers access except from subnet 192.168.1.0/24. How to configure the files?

A. Add `ALL: ALL` to `hosts.allow` and `ALL: 192.168.1.` to `hosts.deny`  
B. Add `ALL: 192.168.1.` to `hosts.allow` and `ALL: ALL` to `hosts.deny`  
C. Add only `ALL: 192.168.1.` to `hosts.allow`  
D. Add only `ALL: ALL` to `hosts.deny`

**Answer:** B. Allow the needed subnet in `hosts.allow`, deny everyone else with `ALL: ALL` in `hosts.deny`. Check order: allow first, so 192.168.1.x passes through, everyone else hits the deny rule.

---

**Q8.** Where are network interface configuration files stored on Red Hat/CentOS?

A. `/etc/network/interfaces`  
B. `/etc/sysconfig/network-scripts/ifcfg-*`  
C. `/etc/NetworkManager/system-connections/`  
D. `/etc/netplan/`

**Answer:** B. On Red Hat-compatible systems the config for eth0 is at `/etc/sysconfig/network-scripts/ifcfg-eth0`. Option A is Debian/Ubuntu. Option D is Ubuntu with Netplan.
