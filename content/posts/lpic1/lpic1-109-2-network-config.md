---
title: "LPIC-1 109.2 — Persistent Network Configuration"
date: 2026-04-20
description: "Network interface naming conventions, /etc/network/interfaces, ifup/ifdown, hostname configuration, /etc/hosts, /etc/resolv.conf, NetworkManager/nmcli, systemd-networkd. LPIC-1 exam topic 109.2."
tags: ["Linux", "LPIC-1", "networking", "NetworkManager", "nmcli", "systemd-networkd"]
categories: ["LPIC-1"]
page_lang: "en"
lang_pair: "/posts/lpic1/ru/lpic1-109-2-network-config/"
---

> **Exam weight: 4** — LPIC-1 v5, Exam 102

## What You Need to Know

From the official LPIC-1 objectives:

- Understand basic TCP/IP host configuration.
- Configure Ethernet and Wi-Fi network using NetworkManager.
- Awareness of `systemd-networkd`.

Key files and commands: `/etc/hostname`, `/etc/hosts`, `/etc/nsswitch.conf`, `/etc/resolv.conf`, `/etc/network/interfaces`, `ifup`, `ifdown`, `ip`, `ifconfig`, `route`, `nmcli`, `hostnamectl`.

---

## Network Interface Naming

### Naming Prefixes

| Prefix | Interface type |
|---|---|
| `en` | Ethernet |
| `ib` | InfiniBand |
| `sl` | Serial line (SLIP) |
| `wl` | Wireless LAN |
| `ww` | Wireless WAN (WWAN) |

### Naming Policies (predictable names)

The kernel assigns names in order of priority:

1. **BIOS onboard index** — `eno1`, `eno2`
2. **PCI slot number** — `ens1`, `ens3`
3. **Bus topology** (PCI bus/slot/function) — `enp2s0`
4. **MAC address** — `enx001122334455`
5. **Legacy** — `eth0`, `eth1` (fallback)

### Listing Interfaces

```bash
ip link show          # modern
ifconfig -a           # all interfaces, including inactive
nmcli device          # NetworkManager device list
```

---

## /etc/network/interfaces (Debian/Ubuntu)

The traditional network configuration file used with `ifupdown`.

```
# Loopback
auto lo
iface lo inet loopback

# DHCP
auto eth0
iface eth0 inet dhcp

# Static
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    dns-nameservers 8.8.8.8 8.8.4.4
```

Key directives:

| Directive | Description |
|---|---|
| `auto IFACE` | Bring up interface at boot |
| `iface IFACE inet dhcp` | Configure via DHCP |
| `iface IFACE inet static` | Static configuration |
| `address` | IP address |
| `netmask` | Subnet mask |
| `gateway` | Default gateway |
| `dns-nameservers` | DNS servers (requires `resolvconf`) |

### ifup / ifdown

```bash
ifup eth0      # bring up interface
ifdown eth0    # bring down interface
```

---

## Hostname Configuration

### /etc/hostname

Contains the system's static hostname as a single line:

```
myserver
```

### hostnamectl

```bash
hostnamectl                          # show current hostname info
hostnamectl set-hostname myserver    # set static hostname
hostnamectl set-hostname "My Server" --pretty   # set pretty hostname
hostnamectl set-hostname "" --transient          # set transient hostname
hostnamectl status                   # show all hostname types
```

Three hostname types:

| Type | Description |
|---|---|
| Static | Stored in `/etc/hostname`; persists across reboots |
| Transient | Set by the kernel or DHCP; lost on reboot |
| Pretty | Free-form human-readable label |

---

## Name Resolution Files

### /etc/nsswitch.conf

Controls the order and sources for name resolution. The `hosts` line determines how hostnames are resolved:

```
hosts:    files dns
```

This checks `/etc/hosts` first, then DNS.

### /etc/hosts

Maps IP addresses to hostnames locally, bypassing DNS:

```
127.0.0.1       localhost
127.0.1.1       myserver
::1             localhost ip6-localhost ip6-loopback
192.168.1.10    fileserver fs
```

Format: `IP ADDRESS  hostname [alias ...]`

### /etc/resolv.conf

Configures DNS servers and search domains:

```
nameserver 8.8.8.8
nameserver 8.8.4.4
search example.com
```

| Directive | Description |
|---|---|
| `nameserver IP` | DNS server (up to 3) |
| `search DOMAIN` | Append domain for unqualified lookups (up to 6) |
| `domain DOMAIN` | Local domain (mutually exclusive with `search`) |

Note: NetworkManager and other tools may overwrite this file automatically.

---

## NetworkManager and nmcli

NetworkManager is the standard network management daemon on most distributions. `nmcli` is its command-line client.

### nmcli Object Overview

| Object | Description |
|---|---|
| `general` | Overall NetworkManager status |
| `networking` | Enable/disable networking |
| `radio` | Wi-Fi and WWAN radio switches |
| `connection` | Manage saved connections |
| `device` | Manage network interfaces |
| `agent` | Secret agents |
| `monitor` | Monitor network activity |

### Common nmcli Commands

```bash
# Status
nmcli general status
nmcli device status
nmcli device show eth0

# Connections
nmcli connection show
nmcli connection up myconn
nmcli connection down myconn
nmcli connection delete myconn

# Add a static Ethernet connection
nmcli connection add type ethernet ifname eth0 con-name myconn \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns 8.8.8.8 \
  ipv4.method manual

# Modify an existing connection
nmcli connection modify myconn ipv4.dns 1.1.1.1

# Networking on/off
nmcli networking on
nmcli networking off

# Wi-Fi
nmcli radio wifi on
nmcli device wifi list
nmcli device wifi connect "MySSID" password "MyPass"
```

---

## systemd-networkd

`systemd-networkd` is a systemd-based network configuration daemon.

### Configuration Directories

| Path | Description |
|---|---|
| `/lib/systemd/network/` | Shipped by packages |
| `/run/systemd/network/` | Runtime (generated) |
| `/etc/systemd/network/` | Administrator configuration (highest priority) |

### .network File Format

Files must end in `.network`. The `[Match]` section selects the interface; `[Network]` sets the configuration.

```ini
# DHCP example: /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
DHCP=yes
```

```ini
# Static example
[Match]
Name=eth0

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8
```

---

## Quick Reference

```
Interface prefixes: en (Ethernet)  wl (Wi-Fi)  ww (WWAN)
  eno1 (onboard)  ens1 (PCI slot)  enp2s0 (bus)  enx... (MAC)

ip link show         list interfaces
ifconfig -a          all interfaces (legacy)
nmcli device         NetworkManager device list

/etc/network/interfaces:
  auto IFACE           bring up at boot
  iface IFACE inet dhcp/static/loopback
  address / netmask / gateway / dns-nameservers
  ifup IFACE / ifdown IFACE

Hostname:
  /etc/hostname          static hostname file
  hostnamectl set-hostname NAME   set static
  hostnamectl status              show all types

Name resolution:
  /etc/nsswitch.conf    hosts: files dns
  /etc/hosts            IP hostname [alias]
  /etc/resolv.conf      nameserver / search / domain

nmcli:
  nmcli general status
  nmcli connection show/add/modify/up/down/delete
  nmcli device status/show/wifi list
  nmcli device wifi connect SSID password PASS

systemd-networkd .network file:
  [Match] Name=eth0
  [Network] DHCP=yes  or  Address=.../24  Gateway=...  DNS=...
  Config dir: /etc/systemd/network/
```

---

## Exam Questions

1. What prefix identifies a wireless LAN interface? → `wl`
2. What naming convention produces interface names like `enp2s0`? → PCI bus topology (bus/slot/function)
3. What directive in `/etc/network/interfaces` brings an interface up automatically at boot? → `auto IFACE`
4. What command brings down interface `eth0` in the `ifupdown` system? → `ifdown eth0`
5. Where is the static hostname stored? → `/etc/hostname`
6. What `hostnamectl` command sets the static hostname to `webserver`? → `hostnamectl set-hostname webserver`
7. What are the three hostname types managed by `hostnamectl`? → Static, transient, and pretty.
8. What file controls the order in which name resolution sources are consulted? → `/etc/nsswitch.conf`
9. What is the format of an `/etc/hosts` entry? → `IP_ADDRESS hostname [alias ...]`
10. How many `nameserver` entries can `/etc/resolv.conf` hold? → Up to 3.
11. What is the difference between `search` and `domain` in `/etc/resolv.conf`? → They are mutually exclusive; if both are present, the last one wins.
12. What `nmcli` command shows all saved connections? → `nmcli connection show`
13. What `nmcli` command connects to a Wi-Fi network named `Office`? → `nmcli device wifi connect "Office" password "pass"`
14. What `nmcli` object is used to manage network interfaces? → `device`
15. In which directory does a system administrator place `systemd-networkd` configuration files? → `/etc/systemd/network/`
16. What section in a `.network` file selects the interface to configure? → `[Match]`
17. What `nmcli` command disables all networking? → `nmcli networking off`
18. What tool may overwrite `/etc/resolv.conf` automatically? → NetworkManager (indicated by a comment `# Generated by NetworkManager` in the file).

---

## Exercises

### Exercise 1 — Static Interface Configuration

Write an `/etc/network/interfaces` stanza that configures `eth1` statically with IP `10.0.0.50/24`, gateway `10.0.0.1`, and DNS `10.0.0.53`.

<details>
<summary>Answer</summary>

```
auto eth1
iface eth1 inet static
    address 10.0.0.50
    netmask 255.255.255.0
    gateway 10.0.0.1
    dns-nameservers 10.0.0.53
```

</details>

---

### Exercise 2 — Hostname Change

Change the system's static hostname to `dbserver` using `hostnamectl`, then verify the change.

<details>
<summary>Answer</summary>

```bash
hostnamectl set-hostname dbserver
hostnamectl status
```

</details>

---

### Exercise 3 — nmcli Static Connection

Use `nmcli` to create a static Ethernet connection named `corp` on `eth0` with IP `192.168.10.20/24`, gateway `192.168.10.1`, and DNS `192.168.10.5`.

<details>
<summary>Answer</summary>

```bash
nmcli connection add type ethernet ifname eth0 con-name corp \
  ipv4.addresses 192.168.10.20/24 \
  ipv4.gateway 192.168.10.1 \
  ipv4.dns 192.168.10.5 \
  ipv4.method manual
nmcli connection up corp
```

</details>

---

### Exercise 4 — systemd-networkd

Write a `systemd-networkd` configuration file that enables DHCP on interface `ens3`.

<details>
<summary>Answer</summary>

Create `/etc/systemd/network/10-ens3.network`:

```ini
[Match]
Name=ens3

[Network]
DHCP=yes
```

</details>

---

### Exercise 5 — nsswitch.conf

Modify the `hosts` line in `/etc/nsswitch.conf` so that `/etc/hosts` is checked first, and DNS is only consulted if the host is not found there.

<details>
<summary>Answer</summary>

```
hosts:    files dns
```

With `files` listed first, `/etc/hosts` is checked before DNS. If the entry is found in files, DNS is not queried.

</details>

---

*LPIC-1 Study Notes | Topic 109: Networking Fundamentals*
