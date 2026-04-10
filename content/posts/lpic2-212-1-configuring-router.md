---
title: "LPIC-2 212.1 — Configuring a Router"
date: 2026-04-11
description: "IP forwarding, NAT/masquerading, iptables tables and chains, SNAT/DNAT/MASQUERADE, port forwarding, nftables basics, sysctl.conf. LPIC-2 exam topic 212.1."
tags: ["Linux", "LPIC-2", "iptables", "nftables", "NAT", "routing", "firewall"]
categories: ["LPIC-2"]
---

> **Exam topic 212.1** — Configuring a Router (weight: 3). Covers IP forwarding, NAT, iptables/nftables packet filtering and address translation.

---

## IP Forwarding

By default, Linux drops packets not destined for itself. To act as a router, IP forwarding must be enabled.

**Temporary (lost on reboot):**

```bash
echo 1 > /proc/sys/net/ipv4/ip_forward
# or
sysctl -w net.ipv4.ip_forward=1
```

**Permanent (survives reboot):**

```ini
# /etc/sysctl.conf
net.ipv4.ip_forward = 1
```

```bash
sysctl -p    # reload /etc/sysctl.conf immediately
```

IPv6 forwarding:

```ini
net.ipv6.conf.all.forwarding = 1
```

Verify current state:

```bash
cat /proc/sys/net/ipv4/ip_forward    # 0 = disabled, 1 = enabled
sysctl net.ipv4.ip_forward
```

---

## iptables Overview

iptables inspects and modifies network packets. It uses **tables** (what kind of work) and **chains** (when the rule applies).

### Tables

| Table | Purpose |
|---|---|
| `filter` | Default. Allow/deny packets (INPUT, OUTPUT, FORWARD) |
| `nat` | Address translation (PREROUTING, OUTPUT, POSTROUTING) |
| `mangle` | Modify packet fields (TTL, ToS) |
| `raw` | Bypass connection tracking (PREROUTING, OUTPUT) |
| `security` | Mandatory Access Control (SELinux/secmark) |

### Chains

| Chain | When it applies |
|---|---|
| `INPUT` | Packets destined for this host |
| `OUTPUT` | Packets originating from this host |
| `FORWARD` | Packets passing through this host (routing) |
| `PREROUTING` | Before routing decision (used for DNAT) |
| `POSTROUTING` | After routing decision (used for SNAT/MASQUERADE) |

### Packet flow:

```
Incoming packet
    → PREROUTING (nat)
        → routing decision
            → local process? → INPUT (filter) → local process
            → forward?       → FORWARD (filter) → POSTROUTING (nat) → out
Outgoing packet (from local)
    → OUTPUT (filter/nat) → POSTROUTING (nat) → out
```

---

## iptables Syntax

```bash
iptables [options] -t <table> -A|-I|-D|-R <chain> [matches] -j <target>
```

| Option | Meaning |
|---|---|
| `-t table` | Specify table (default: filter) |
| `-A chain` | Append rule to end of chain |
| `-I chain [n]` | Insert rule at position n (default: 1 = top) |
| `-D chain n` | Delete rule by position number |
| `-D chain rule` | Delete rule matching specification |
| `-R chain n` | Replace rule at position n |
| `-F [chain]` | Flush (delete all rules in chain or all chains) |
| `-P chain target` | Set default policy for chain |
| `-L [chain]` | List rules |
| `-n` | Do not resolve addresses (faster listing) |
| `-v` | Verbose (show counters) |
| `--line-numbers` | Show rule numbers when listing |

### Common Matches

| Match | Example | Meaning |
|---|---|---|
| `-s` | `-s 192.168.1.0/24` | Source IP/network |
| `-d` | `-d 10.0.0.1` | Destination IP |
| `-p` | `-p tcp` | Protocol: tcp, udp, icmp, all |
| `--dport` | `--dport 80` | Destination port (requires `-p tcp/udp`) |
| `--sport` | `--sport 1024:65535` | Source port range |
| `-i` | `-i eth0` | Input interface |
| `-o` | `-o eth1` | Output interface |
| `-m state --state` | `--state NEW,ESTABLISHED` | Connection state |
| `! -s` | `! -s 10.0.0.0/8` | Negation |

### Targets (Actions)

| Target | Meaning |
|---|---|
| `ACCEPT` | Allow the packet |
| `DROP` | Silently discard |
| `REJECT` | Discard and send ICMP error back |
| `LOG` | Log to syslog and continue |
| `MASQUERADE` | Source NAT with dynamic IP (for POSTROUTING) |
| `SNAT --to-source` | Source NAT to specific IP |
| `DNAT --to-destination` | Destination NAT (port forwarding) |
| `REDIRECT` | Redirect to local port |

---

## Basic Firewall Rules

```bash
# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP, HTTPS
iptables -A INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT

# Log and drop everything else
iptables -A INPUT -j LOG --log-prefix "DROPPED: "
```

```bash
# List all rules with numbers
iptables -L -n -v --line-numbers

# Delete rule #3 from INPUT
iptables -D INPUT 3

# Flush all rules in filter table
iptables -F

# Save and restore rules
iptables-save > /etc/iptables/rules.v4
iptables-restore < /etc/iptables/rules.v4
```

---

## NAT — Network Address Translation

### MASQUERADE (dynamic SNAT)

Used when the outgoing IP is dynamic (e.g., PPPoE/DHCP). The source IP is replaced with the current IP of the outgoing interface.

```bash
# Enable MASQUERADE on outgoing interface eth0
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
```

Combined with IP forwarding, this makes the Linux host a NAT router:

```bash
echo 1 > /proc/sys/net/ipv4/ip_forward
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT
iptables -A FORWARD -i eth0 -o eth1 -m state --state ESTABLISHED,RELATED -j ACCEPT
```

`eth0` = external (internet); `eth1` = internal (LAN).

### SNAT (static source NAT)

Used when the external IP is fixed:

```bash
iptables -t nat -A POSTROUTING -o eth0 -j SNAT --to-source 203.0.113.5
```

### MASQUERADE vs SNAT

| | MASQUERADE | SNAT |
|---|---|---|
| IP source | Dynamic (current interface IP) | Static (specified) |
| Use case | Dynamic IP (PPPoE, DHCP) | Static/dedicated IP |
| Performance | Slightly slower (looks up IP each packet) | Faster |

---

## Port Forwarding (DNAT)

Redirect incoming traffic on one port to a different host/port:

```bash
# Forward external port 80 to internal host 192.168.1.100:80
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 \
  -j DNAT --to-destination 192.168.1.100:80

# Also allow the forwarded traffic through
iptables -A FORWARD -p tcp -d 192.168.1.100 --dport 80 -j ACCEPT
```

Redirect to a different port:

```bash
# External 8080 → internal 192.168.1.100:80
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8080 \
  -j DNAT --to-destination 192.168.1.100:80
```

REDIRECT — redirect to a local port (transparent proxy):

```bash
iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3128
```

---

## IPv6 — ip6tables

ip6tables has the same syntax as iptables but works with IPv6. NAT for IPv6 is rarely used (addresses are globally routable), but filtering works identically:

```bash
ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT
ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
ip6tables -P INPUT DROP
```

---

## nftables

nftables replaces iptables/ip6tables/arptables/ebtables in modern distributions. It uses a single tool `nft` and a unified rule language.

```bash
nft list ruleset           # show all rules
nft list tables            # list tables
nft list table inet filter # show specific table
```

Basic nftables structure:

```
table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;
        iif lo accept
        ct state established,related accept
        tcp dport 22 accept
        tcp dport { 80, 443 } accept
    }
    chain forward {
        type filter hook forward priority 0; policy drop;
    }
    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

`inet` = IPv4 + IPv6 combined. Use `ip` for IPv4 only, `ip6` for IPv6 only.

```bash
nft add table inet filter
nft add chain inet filter input '{ type filter hook input priority 0; policy drop; }'
nft add rule inet filter input tcp dport 22 accept

# Load from file
nft -f /etc/nftables.conf

# Save
nft list ruleset > /etc/nftables.conf
```

NAT in nftables:

```bash
table ip nat {
    chain postrouting {
        type nat hook postrouting priority 100;
        oif "eth0" masquerade
    }
    chain prerouting {
        type nat hook prerouting priority -100;
        tcp dport 80 dnat to 192.168.1.100:80
    }
}
```

---

## ip Command — Routing

```bash
# Show routing table
ip route show
ip route

# Add static route
ip route add 10.0.0.0/8 via 192.168.1.1
ip route add 10.0.0.0/8 via 192.168.1.1 dev eth0

# Add default gateway
ip route add default via 192.168.1.1

# Delete route
ip route del 10.0.0.0/8

# Persistent routes: /etc/network/interfaces (Debian) or /etc/sysconfig/network-scripts/ (RHEL)
```

```bash
# Legacy route command (still on exam)
route -n                              # show routing table numeric
route add -net 10.0.0.0/8 gw 192.168.1.1
route add default gw 192.168.1.1
route del -net 10.0.0.0/8
```

---

## Exam Cheat Sheet

### Files and Paths

| Path | Description |
|---|---|
| `/proc/sys/net/ipv4/ip_forward` | IP forwarding toggle (0/1) |
| `/etc/sysctl.conf` | Persistent kernel parameters |
| `/etc/iptables/rules.v4` | Saved iptables rules (Debian) |
| `/etc/nftables.conf` | nftables ruleset |

### Key Commands

```bash
sysctl -w net.ipv4.ip_forward=1      # enable forwarding temporarily
sysctl -p                            # reload sysctl.conf
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination 192.168.1.100
iptables -L -n -v --line-numbers     # list rules
iptables-save > /etc/iptables/rules.v4
nft list ruleset
```

### Common Exam Pitfalls

| Pitfall | Rule |
|---|---|
| MASQUERADE vs SNAT | MASQUERADE = dynamic IP; SNAT = static IP |
| PREROUTING vs POSTROUTING | DNAT goes in PREROUTING; SNAT/MASQUERADE in POSTROUTING |
| ip_forward | Must be 1 for routing/NAT to work — iptables rules alone are not enough |
| `iptables -F` | Flushes rules but does NOT reset policies — a DROP policy remains |
| nftables `inet` | Handles both IPv4 and IPv6 in one table |
| Port forwarding | DNAT rule alone is not enough — FORWARD chain must also ACCEPT |
