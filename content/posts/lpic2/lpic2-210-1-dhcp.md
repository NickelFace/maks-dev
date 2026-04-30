---
title: "LPIC-2 210.1 — DHCP Configuration"
date: 2026-03-27
description: "ISC DHCPd configuration: dhcpd.conf structure, global parameters, subnet/range, static hosts, groups, BOOTP/PXE, DHCP relay (dhcrelay), lease file, logging, IPv6 and radvd. LPIC-2 exam topic 210.1."
tags: ["Linux", "LPIC-2", "DHCP", "ISC DHCPd", "networking", "radvd"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-210-1-dhcp/"
page_lang: "en"
---

> **Exam topic 210.1** — DHCP Configuration (weight: 2). Covers ISC DHCPd server setup, `dhcpd.conf` structure, lease management, BOOTP support, relay agents, and IPv6 with radvd.

---

## What Is DHCP

**DHCP (Dynamic Host Configuration Protocol)** allows clients to receive network configuration from a server. Addresses are issued as **leases** for a defined time period.

- Server listens on **UDP 67**; responds on **UDP 68**
- `-p` flag changes the listening port; response port is always one higher

For IPv6, there is DHCPv6, but **NDP (Neighbour Discovery Protocol)** is better suited for this — it's handled by the `radvd` daemon.

---

## Lease Process (DORA)

1. Client broadcasts **DHCPDISCOVER**
2. Server(s) receive request and decide what address to offer (based on subnet and MAC)
3. Each server sends **DHCPOFFER**
4. Client selects one offer and sends **DHCPREQUEST**
5. Server records the lease and sends **DHCPACK**

> **Router problem:** DHCP uses broadcast. Routers don't forward broadcasts between subnets by default. A client in one subnet can't reach a DHCP server in another without a **DHCP relay**.

---

## Installation

```bash
# Debian/Ubuntu
apt-get install isc-dhcp-server

# RHEL/CentOS
yum install dhcp
```

---

## dhcpd.conf Structure

Configuration file: `/etc/dhcp/dhcpd.conf`

Structure elements:
- **Global parameters** — defaults for all clients
- `shared-network` — multiple subnets on one physical interface
- `subnet` — defines a network segment
- `group` — groups hosts with shared settings
- `host` — settings for a specific client

> Parameter priority: global → subnet → group → host (more specific overrides broader).

---

## Global Parameters

```bash
# Parameters with "option" keyword — sent to clients
option domain-name-servers 10.0.0.10 10.0.0.11;
option domain-name "example.com";

# Parameters without "option" — control server behavior
default-lease-time 600;       # default lease time (seconds)
max-lease-time 7200;          # maximum lease time
```

### Common option codes:

| Code | Name | Description |
|---|---|---|
| 1 | `subnet-mask` | Subnet mask |
| 3 | `routers` | Default gateway |
| 6 | `domain-name-servers` | DNS servers |
| 12 | `host-name` | Host name |
| 15 | `domain-name` | Domain name |
| 51 | `ip-address-lease-time` | Lease duration |
| 66 | `tftp-server` | TFTP server (for BOOTP/PXE) |
| 67 | `bootfile-name` | Boot file name |

---

## Subnet and Address Ranges

```bash
subnet 192.168.1.0 netmask 255.255.255.0 {
    option routers 192.168.1.1;
    option broadcast-address 192.168.1.255;
    option domain-name-servers 192.168.1.1;
    range 192.168.1.100 192.168.1.200;   # dynamic address pool
}
```

A `subnet` block must contain at least one `range`. Without `range`, the subnet is declared but no addresses are issued.

### Multiple subnets on one interface (`shared-network`):

```bash
shared-network OFFICE {
    option domain-name "office.example.com";
    subnet 10.1.0.0 netmask 255.255.255.0 {
        range 10.1.0.50 10.1.0.150;
    }
    subnet 10.1.1.0 netmask 255.255.255.0 {
        range 10.1.1.50 10.1.1.150;
    }
}
```

---

## Static Hosts

For servers and printers that need a permanent IP — bind a specific IP to a MAC address via the `host` block:

```bash
host webserver {
    hardware ethernet 00:11:22:33:44:55;
    fixed-address 192.168.1.10;
    option host-name "webserver";
}
```

> `hardware ethernet` and `fixed-address` are the two required fields for a static host.

The host name in `host webserver {}` is just a unique internal identifier — it's not sent to the client.

`fixed-address` can be outside the `range` — this is normal.

---

## Host Groups

The `group` block combines multiple `host` entries with shared parameters:

```bash
group {
    option routers 192.168.1.1;
    option broadcast-address 192.168.1.255;
    netmask 255.255.255.0;

    host printer1 {
        hardware ethernet 00:AA:BB:CC:DD:EE;
        fixed-address 192.168.1.20;
    }

    host printer2 {
        hardware ethernet 00:AA:BB:CC:DD:FF;
        fixed-address 192.168.1.21;
    }
}
```

---

## BOOTP Support

**BOOTP (Bootstrap Protocol, 1985)** is the predecessor to DHCP. Used for diskless stations booting an OS from the network. DHCP is backward-compatible with BOOTP.

```
Client (no OS) ──UDP 67──► BOOTP/DHCP server
               ◄──UDP 68── IP + boot filename
                    ↓
               TFTP server → client downloads OS image
```

### allow bootp vs allow booting:

| Directive | What it enables |
|---|---|
| `allow bootp;` | Accept BOOTP requests from clients identified by MAC in a `host {}` record |
| `allow booting;` | Send boot file information (`filename` and `next-server`) to the client |

> For a regular DHCP server, neither directive is needed. They're only required for PXE boot or legacy BOOTP clients.

### PXE configuration:

```bash
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.100 192.168.1.200;

    allow bootp;
    allow booting;

    next-server 192.168.1.1;   # TFTP server IP
    filename "pxelinux.0";     # bootloader file
}
```

### Static BOOTP host:

```bash
host diskless01 {
    hardware ethernet 00:01:02:FE:DC:BA;
    fixed-address 192.168.1.50;
    option host-name "diskless01";
    filename "/mybootfile.img";
    server-name "tftpserver";
    next-server "backup-tftpserver";
}
```

> If `next-server` is not specified, the client requests the file from the DHCP server itself.

---

## DHCP Relay

Routers don't forward broadcasts between subnets. The **relay agent** (`dhcrelay`) intercepts DHCP/BOOTP requests in its segment and forwards them unicast to the DHCP server. It also adds the originating subnet info so the server knows which pool to use.

```bash
# Forward to DHCP server at 21.31.0.1
dhcrelay 21.31.0.1

# Listen on specific interface only
dhcrelay -i eth1 21.31.0.1
```

> `dhcrelay` correctly passes the client's MAC in the `chaddr` field — so static host identification by `hardware ethernet` still works through a relay.

> Most modern routers have built-in DHCP relay (`ip helper-address` in Cisco). `dhcrelay` is only needed if the router doesn't support this.

---

## Logging and Monitoring

### Leases file (server):

```bash
cat /var/lib/dhcp/dhcpd.leases
```

Stores all active leases: IP, MAC, start/end time. If empty — the config probably has no `range`, only static hosts.

On the client, the issued address is stored in `dhclient.leases`.

### Logging configuration:

```bash
# In dhcpd.conf
log-facility local7;

# In /etc/rsyslog.conf
local7.debug /var/log/dhcpd.log
```

### Viewing logs:

```bash
# syslog systems
tail -f /var/log/messages
tail -f /var/log/daemon.log

# systemd
journalctl -u isc-dhcp-server -f
journalctl | grep dhcpd
```

### Interface restriction:

```bash
# Listen on specific interface only
dhcpd eth0
```

### Syntax check:

```bash
dhcpd -t
dhcpd -t -cf /path/to/dhcpd.conf
```

### Restart after config changes:

```bash
/etc/init.d/dhcp restart
```

---

## IPv6 and radvd

In IPv6, hosts assign themselves link-local addresses without DHCP. **NDP (Neighbour Discovery Protocol)** distributes prefixes, not full addresses. The host builds its full IPv6 address via SLAAC.

**`radvd` (Router Advertisement Daemon)** responds to router solicitation requests from clients.

Configuration: `/etc/radvd.conf`

```bash
interface eth0 {
    AdvSendAdvert on;           # periodically send advertisements
    MinRtrAdvInterval 3;
    MaxRtrAdvInterval 10;

    prefix 2001:0db8:0100:f101::/64 {
        AdvOnLink on;           # prefix available on this link
        AdvAutonomous on;       # client can use SLAAC
        AdvRouterAddr on;       # include router address in advertisement
    };
};
```

> radvd has no concept of pools and leases. The client builds its own address from the received prefix using SLAAC (Stateless Address Autoconfiguration).

---

## Exam Cheat Sheet

### Files

| Path | Purpose |
|---|---|
| `/etc/dhcp/dhcpd.conf` | DHCP server configuration |
| `/var/lib/dhcp/dhcpd.leases` | Active leases file |
| `/var/log/messages` | DHCP logs (syslog systems) |
| `/var/log/daemon.log` | Alternative daemon log |
| `/etc/radvd.conf` | radvd configuration for IPv6 |

### Commands

| Command | Action |
|---|---|
| `dhcpd` | DHCP server executable |
| `dhcpd -t` | Check dhcpd.conf syntax |
| `dhcpd -cf /path/to/dhcpd.conf` | Use non-standard config path |
| `dhcrelay -i eth1 <server-IP>` | Start DHCP relay |
| `arp -n` | Show ARP table |
| `radvd` | IPv6 Router Advertisement daemon |

### Ports

- Server listens: **UDP 67**
- Client receives: **UDP 68**

### Key dhcpd.conf Directives

```
range 10.0.0.1 10.0.0.100;            # address pool
fixed-address 10.0.0.5;               # static IP
hardware ethernet AA:BB:CC:DD:EE:FF;  # MAC address (two words!)
option routers 10.0.0.1;              # gateway
option subnet-mask 255.255.255.0;     # mask (without this = classful behavior)
option domain-name-servers 8.8.8.8;   # DNS
option domain-search "lab.local";     # search domain
default-lease-time 600;               # lease time in seconds
max-lease-time 7200;
log-facility local7;                  # syslog facility
allow booting;                        # enable BOOTP file serving
allow bootp;                          # accept BOOTP requests
filename "/boot.img";                 # BOOTP boot file
next-server 10.0.0.5;                # TFTP server
```

### Common Exam Pitfalls

| Pitfall | Rule |
|---|---|
| `hardware ethernet` | Two words, no hyphen |
| Leases file location | `/var/lib/dhcp/dhcpd.leases`, not `/etc/dhcp/` |
| `dhcrelay` vs `dhcpd` | Different binaries — relay runs separately |
| radvd | Works with prefixes, not addresses — has no pool |
| `allow booting` | Enables `filename`/`next-server` delivery |
| `allow bootp` | Enables accepting BOOTP requests |
| If leases file missing | `touch /var/lib/dhcp/dhcpd.leases` |
