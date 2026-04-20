---
title: "LPIC-1 109.3 — Basic Network Troubleshooting"
date: 2026-04-20
description: "ip, ifconfig, route, ping, traceroute, tracepath, netcat (nc), netstat, ss for Linux network troubleshooting. LPIC-1 exam topic 109.3."
tags: ["Linux", "LPIC-1", "networking", "troubleshooting", "ping", "traceroute", "netstat", "ss"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-109-3-troubleshooting/"
---

> **Exam weight: 4** — LPIC-1 v5, Exam 102

## What You Need to Know

From the official LPIC-1 objectives:

- Troubleshoot networking configuration issues on client hosts.
- Use system utilities to identify networking configuration and troubleshoot network problems.

Key files and commands: `ip`, `ifconfig`, `route`, `ping`, `ping6`, `traceroute`, `traceroute6`, `tracepath`, `tracepath6`, `netcat`, `netstat`, `ss`.

---

## Interface Configuration

### ip — Modern Tool

```bash
# Show all interfaces
ip addr show
ip addr show eth0

# Add / remove an IP address
ip addr add 192.168.1.10/24 dev eth0
ip addr del 192.168.1.10/24 dev eth0

# Bring interface up / down
ip link set eth0 up
ip link set eth0 down
```

### ifconfig — Legacy Tool

```bash
ifconfig                              # show active interfaces
ifconfig -a                           # show all, including inactive
ifconfig eth0 192.168.1.10 netmask 255.255.255.0
ifconfig eth0 down
ifconfig eth0 up
```

---

## Routing

### Viewing the Routing Table

```bash
ip route show           # modern
route -n                # legacy (numeric output)
netstat -r              # legacy (routing table)
```

### Managing Routes

```bash
# Add a route
ip route add 192.168.2.0/24 via 192.168.1.1
ip route add default via 192.168.1.1

# Remove a route
ip route del 192.168.2.0/24

# Legacy route command
route add -net 192.168.2.0/24 gw 192.168.1.1 dev eth0
route del -net 192.168.2.0/24
```

### IPv6 Routing

```bash
ip -6 route show
ip -6 route add 2001:db8::/32 via fe80::1 dev eth0
```

---

## ping and ping6

`ping` sends ICMP echo request packets to test host reachability.

```bash
ping 8.8.8.8               # continuous
ping -c 4 8.8.8.8          # send exactly 4 packets
ping6 ::1                  # IPv6 ping
ping -6 ::1                # alternative IPv6 syntax
```

Common reasons ping can fail:
- Remote host is down.
- Firewall (local or remote) is blocking ICMP.
- Incorrect hostname or DNS resolution failure.
- Incorrect local network configuration.
- Interface is disconnected.
- Router ACL blocks ICMP.

---

## traceroute and traceroute6

`traceroute` traces the path packets take to a destination by sending packets with incrementing TTL values and recording each router that sends back an ICMP Time Exceeded message.

```bash
traceroute 8.8.8.8
traceroute6 2001:4860:4860::8888
```

| Option | Description |
|---|---|
| `-I` | Use ICMP echo requests (instead of UDP) |
| `-T` | Use TCP SYN packets |
| `-i IFACE` | Force a specific network interface |
| `--mtu` | Report MTU at each hop |

By default, `traceroute` uses UDP packets. The `-I` and `-T` options require root.

---

## tracepath and tracepath6

`tracepath` is similar to `traceroute` but does not require root privileges and automatically discovers the Path MTU.

```bash
tracepath 8.8.8.8
tracepath6 ::1
tracepath -6 ::1
```

Unlike `traceroute`, `tracepath` reports the MTU at each hop and does not require elevated privileges.

---

## nc — netcat

`nc` (netcat) creates arbitrary TCP or UDP connections for testing and data transfer.

```bash
# Connect to a TCP port
nc hostname 80

# Listen on a port
nc -l 1234

# UDP mode
nc -u hostname 53

# Check if a port is open (no data transfer)
nc -z hostname 22
```

### Manual HTTP request with nc

```bash
nc learning.lpi.org 80
GET /index.html HTTP/1.1
HOST: learning.lpi.org

```

(Press Enter twice after the last header.)

---

## netstat and ss

Both commands show open network connections, routing tables, and interface statistics.

### ss — Modern Tool

```bash
ss -tulnp          # TCP and UDP listening, numeric, with process names
ss -a              # all sockets (listening and established)
ss -ln | grep ":80"  # check if port 80 is in use
```

### netstat — Legacy Tool

```bash
netstat -tulnp     # TCP and UDP listening, numeric, with process names
netstat -r         # routing table
```

### Common Options (both tools)

| Option | Description |
|---|---|
| `-a` | All sockets (listening and connected) |
| `-l` | Listening sockets only |
| `-t` | TCP sockets |
| `-u` | UDP sockets |
| `-n` | Numeric addresses (no reverse DNS) |
| `-p` | Show process name and PID |

`ss` is the modern replacement for `netstat`. Both accept the same options.

---

## Quick Reference

```
Interface config:
  ip addr show / ip addr add IP/PREFIX dev IFACE / ip addr del IP/PREFIX dev IFACE
  ip link set IFACE up/down
  ifconfig IFACE IP netmask MASK   (legacy)

Routing:
  ip route show / ip route add / ip route del
  ip route add default via GW
  route -n / netstat -r            (legacy)
  ip -6 route show

ping / ping6:
  ping -c N HOST    (N packets)
  ping6 HOST  or  ping -6 HOST

traceroute:
  traceroute HOST   (UDP default)
  -I ICMP  -T TCP  -i IFACE  --mtu
  traceroute6 HOST  or  traceroute -6 HOST

tracepath HOST / tracepath6 HOST
  no root needed; discovers MTU along path

nc HOST PORT              connect TCP
nc -l PORT                listen
nc -u HOST PORT           UDP
nc -z HOST PORT           check if port open

ss -tulnp    netstat -tulnp
  -a all  -l listening  -t TCP  -u UDP  -n numeric  -p process
```

---

## Exam Questions

1. What command adds a default gateway using the `ip` suite? → `ip route add default via GATEWAY`
2. What option sends exactly 5 ICMP echo requests with `ping`? → `-c 5`
3. What is the IPv6 equivalent of `ping`? → `ping6` or `ping -6`
4. By default, what protocol does `traceroute` use to probe hops? → UDP
5. What `traceroute` option switches probes to ICMP echo requests? → `-I`
6. What is the key advantage of `tracepath` over `traceroute`? → `tracepath` does not require root privileges and automatically discovers the Path MTU.
7. What `nc` option switches to UDP mode? → `-u`
8. What `nc` command checks whether port 443 is open on a host? → `nc -z hostname 443`
9. What is the modern replacement for `netstat`? → `ss`
10. What `ss` command shows all TCP listening sockets with process names? → `ss -tlnp`
11. What legacy command shows the routing table? → `route -n` or `netstat -r`
12. What command brings up interface `ens3` with `ip`? → `ip link set ens3 up`
13. What command removes IP `10.0.0.5/24` from interface `eth0`? → `ip addr del 10.0.0.5/24 dev eth0`
14. What tools can be used to capture network packets on a Linux host? → `tcpdump` and `wireshark`
15. What option to `traceroute` forces it to use a specific network interface? → `-i IFACE`
16. How do you view the IPv6 routing table? → `ip -6 route show`
17. What does `ss -ln | grep ":80"` do? → Shows whether any socket is listening on port 80.
18. What is the difference between `traceroute` and `tracepath`? → `traceroute` is more flexible (protocol choice, flags) but requires root for some modes; `tracepath` requires no root and reports MTU discovery automatically.

---

## Exercises

### Exercise 1 — Add and Verify a Route

Add a static route to network `10.5.0.0/24` via gateway `192.168.1.254`, then verify it appears in the routing table.

<details>
<summary>Answer</summary>

```bash
ip route add 10.5.0.0/24 via 192.168.1.254
ip route show
```

</details>

---

### Exercise 2 — Test Reachability

Send exactly 3 ICMP packets to `8.8.8.8` and then trace the path to it.

<details>
<summary>Answer</summary>

```bash
ping -c 3 8.8.8.8
tracepath 8.8.8.8
```

</details>

---

### Exercise 3 — Find Listening Services

Show all TCP and UDP sockets that are currently listening, including process names, using the modern tool.

<details>
<summary>Answer</summary>

```bash
ss -tulnp
```

</details>

---

### Exercise 4 — Test a TCP Port

Use `nc` to check whether port 22 is open on `192.168.1.50`, then connect to port 80 and manually send an HTTP request.

<details>
<summary>Answer</summary>

```bash
nc -z 192.168.1.50 22

nc 192.168.1.50 80
GET / HTTP/1.1
HOST: 192.168.1.50

```

</details>

---

### Exercise 5 — Trace MTU Path

Determine the maximum MTU along the path to `8.8.8.8` without requiring root.

<details>
<summary>Answer</summary>

```bash
tracepath 8.8.8.8
```

`tracepath` performs Path MTU Discovery automatically and reports the MTU at each hop.

</details>

---

*LPIC-1 Study Notes | Topic 109: Networking Fundamentals*
