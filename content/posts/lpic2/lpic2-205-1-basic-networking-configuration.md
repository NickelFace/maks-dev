---
title: "LPIC-2 205.1 — Basic Networking Configuration"
date: 2025-11-17
description: "ifconfig, route, ip addr/route, ARP, loopback interface, default gateway, and wireless tools (iw, iwconfig, iwlist). LPIC-2 exam topic 205.1."
tags: ["Linux", "networking", "LPIC-2", "ip", "ifconfig", "ARP", "wifi"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-205-1-basic-networking-configuration/"
page_lang: "en"
---

> **Exam topic 205.1** — Basic Networking Configuration (weight: 3). Covers configuring wired and wireless network interfaces, routing tables, ARP, and the loopback interface.

---

## Utilities and Files

| Utility | Purpose |
|---|---|
| `/sbin/ifconfig` | Configure and display ethernet interfaces (legacy) |
| `/sbin/route` | Manage the routing table (legacy) |
| `/sbin/ip` | Modern replacement for ifconfig and route |
| `/usr/sbin/arp` | View and manage the ARP cache |
| `/sbin/iw` | Configure Wi-Fi (nl80211, modern) |
| `/sbin/iwconfig` | Configure Wi-Fi (WEXT, legacy but widely supported) |
| `/sbin/iwlist` | Scan wireless networks |

---

## ifconfig — Interface Configuration

`ifconfig` configures an interface and makes it available to the kernel's network stack. It can assign an IP address, subnet mask, broadcast address, and activate or deactivate the interface.

### Syntax

```bash
# Assign IP and bring interface up
ifconfig <interface> <ip-address>

# Assign IP with explicit mask
ifconfig eth0 172.16.1.2 netmask 255.255.255.0

# Bring interface up or down
ifconfig eth0 up
ifconfig eth0 down

# Show all interfaces (including inactive)
ifconfig -a

# Show a specific interface
ifconfig lo
```

### Example output for eth0

```
eth0  Link encap:10Mps Ethernet  HWaddr 00:00:C0:90:B3:42
      inet addr:172.16.1.2  Bcast:172.16.1.255  Mask:255.255.255.0
      UP BROADCAST RUNNING  MTU:1500  Metric:1
      RX packets:0 errors:0 dropped:0 overrun:0
      TX packets:0 errors:0 dropped:0 overrun:0
```

> **Important:** If `netmask` is not specified explicitly, `ifconfig` infers the mask from the address class. For `172.16.1.2` (class B) it would set `255.255.0.0` instead of the intended `255.255.255.0`. Always specify the mask explicitly when working with subnets.

> **Tip:** Short commands `ifup <interface>` and `ifdown <interface>` quickly bring up or down an already-configured interface.

---

## route — Routing Table

`route` adds and removes routes in the kernel routing table.

### Syntax

```bash
# Add/delete a route
route {add|del} [-net|-host] target [gw gateway] [netmask mask] [dev interface]

# Add a route to a network via a gateway
route add -net 172.16.0.0 netmask 255.255.255.0 gw romeo

# Add the default route
route add default gw 192.168.1.1

# Show the routing table
route
```

### Example output

```
Kernel IP routing table
Destination  Gateway         Genmask        Flags Metric Ref Use Iface
default      192.168.1.254   0.0.0.0        UG    0      0   0   eth0
192.168.1.0  *               255.255.255.0  U     1      0   0   eth0
```

> **Warning:** You can configure many gateways, but **only one default gateway is active**. `default` is shorthand for `0.0.0.0`, which matches any destination when no more specific route exists.

---

## Loopback Interface

The loopback (`lo`) is a virtual interface implemented entirely in the kernel's network stack. It is not connected to any physical network. Packets sent to `127.0.0.1` (IPv4) or `::1` (IPv6) are simply returned up the stack as if they came from another device.

```bash
# Bring up loopback
ifconfig lo 127.0.0.1

# Check
ifconfig lo
```

Entry in `/etc/hosts`:

```
127.0.0.1  localhost
```

> **Important:** Loopback must be configured even when the machine is not connected to any network. Without it, RPC applications (NFS, NIS) will fail to start — they register with portmapper via the loopback address.

---

## Routing via a Gateway

If a network has multiple Ethernet segments connected by a gateway, add a route to the remote network. For example, if host `romeo` connects two networks:

```bash
# Add a route to 172.16.0.0 via gateway romeo
route add -net 172.16.0.0 netmask 255.255.255.0 gw romeo

# Make romeo the default gateway
route add default gw romeo
```

> **Warning:** Make sure hosts in the remote network know the return route to your network. Otherwise packets will be sent but replies will never arrive.

---

## ip — Modern Replacement for ifconfig and route

`/sbin/ip` is the modern tool for managing addresses, routes, tunnels, and policy routing. Officially recommended over `ifconfig` and `route`, though both legacy tools still work.

### Working with addresses

```bash
# Show all addresses (like ifconfig -a)
ip addr show

# Assign an address to an interface
ip addr add 192.168.123.15/24 broadcast 192.168.123.255 dev eth0

# Remove an address
ip addr del 192.168.123.15/24 dev eth0
```

### Working with routes

```bash
# Show routing table (like route)
ip route show

# Add a route to a network
ip route add 192.168.1.0/24 dev eth0

# Add a route via a gateway
ip route add 192.168.123.254/24 dev eth0

# Add default route
ip route add default via 192.168.1.1
```

### Example output of ip addr show

```
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 16436 qdisc noqueue state UNKNOWN
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
    inet6 ::1/128 scope host

2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP
    link/ether 00:90:f5:b6:91:d1 brd ff:ff:ff:ff:ff:ff
    inet 192.168.123.181/24 brd 192.168.123.255 scope global eth0
    inet6 fe80::290:f5ff:feb6:91d1/64 scope link
```

---

## ARP — Address Resolution Protocol

In the OSI model, networking operates at two layers: Layer 2 (Ethernet, MAC addresses) and Layer 3 (IP addresses). To send an IP packet on a local network, the kernel needs the recipient's MAC address. That is ARP's purpose.

When the kernel wants to communicate with a host on the same subnet, it broadcasts an **ARP request**: "Who has IP address X? Send me your MAC." The host with that IP replies with its MAC. The result is cached in the ARP cache.

```bash
# Show ARP cache
arp

# Example output:
Address       HWtype  HWaddress           Flags Mask  Iface
10.9.8.126    ether   00:19:bb:2e:df:73   C           wlan0
```

> **Note:** There is also RARP (Reverse ARP). ARP: know the IP, get the MAC. RARP: know the MAC, get the IP.

> **Warning:** Manually adding entries to the ARP cache is rarely needed — it updates automatically. To delete a stale entry: `arp -d <ip>`.

---

## Wireless: iw, iwconfig, iwlist

### iw (modern, nl80211)

`iw` works through the nl80211 standard (netlink). If `iw` does not see your device, the driver does not support nl80211 — use `iwconfig` instead.

```bash
# Show wireless interfaces
iw dev

# Connection status
iw dev wlan0 link

# Scan for networks
iw dev wlan0 scan

# Connect to an access point
iw dev wlan0 connect "MyNetwork"

# Connect specifying a channel
iw dev wlan0 connect "MyNetwork" 2432

# Connect with a key
iw dev wlan0 connect "MyNetwork" 0:"mypassword"

# Switch to Ad-Hoc mode
iw dev wlan0 set type ibss

# Enable power saving
iw dev wlan0 set power_save on
```

### iwconfig (legacy, WEXT)

`iwconfig` works similarly to `ifconfig` but only for wireless interfaces. The `wireless_tools` package is formally deprecated but still widely supported.

```bash
# Show wireless interface parameters
iwconfig wlan0

# Connect to a network by ESSID
iwconfig wlan0 essid "MyNetwork"

# Set encryption key (ASCII)
iwconfig wlan0 key s:mypassword

# Disable ESSID check
iwconfig wlan0 essid any

# Switch operating mode
iwconfig wlan0 mode Ad-Hoc
iwconfig wlan0 mode Managed
```

> **Note:** Mode values: `Ad-Hoc` — network without an access point; `Managed` — client with roaming; `Master` — access point mode; `Monitor` — passive monitoring without association.

### iwlist (scanning)

```bash
# Scan available networks
iwlist wlan0 scan

# Show supported encryption keys
iwlist wlan0 keys
```

> **Warning:** Scanning (`scan`) requires root. When run as a regular user, `iwlist` returns the results of the last scan if available.

---

## Exam Cheat Sheet

### Key Commands — old vs new

| Task | ifconfig/route (legacy) | ip (modern) |
|---|---|---|
| Show addresses | `ifconfig -a` | `ip addr show` |
| Assign address | `ifconfig eth0 192.168.1.2 netmask 255.255.255.0` | `ip addr add 192.168.1.2/24 dev eth0` |
| Show routes | `route` | `ip route show` |
| Add route | `route add -net 10.0.0.0 netmask 255.0.0.0 gw 192.168.1.1` | `ip route add 10.0.0.0/8 via 192.168.1.1` |
| Default gateway | `route add default gw 192.168.1.1` | `ip route add default via 192.168.1.1` |
| ARP cache | `arp` | `ip neigh show` |

### Files and Paths

| Path | Purpose |
|---|---|
| `/etc/hosts` | Static name-to-IP mapping (127.0.0.1 localhost) |
| `/sbin/ifconfig` | Ethernet interface configuration |
| `/sbin/route` | Routing table management |
| `/sbin/ip` | Modern tool for addresses, routes, tunnels |
| `/usr/sbin/arp` | ARP cache view/management |
| `/sbin/iw` | Wireless networking (nl80211) |
| `/sbin/iwconfig` | Wireless networking (WEXT, legacy) |
| `/sbin/iwlist` | Wireless network scanning |

### Common Mistakes

- Forgetting `netmask` in `ifconfig` — the mask will be inferred from the address class, likely wrong.
- Configuring two default gateways — only one works; the second is ignored.
- Using `iw` with a WEXT-driver card — switch to `iwconfig` if `iw` doesn't see the device.
- Running `iwlist scan` as a regular user — root is required for scanning.

---

## Practice Questions

**Q1.** How do you assign IP `192.168.10.5/24` to `eth0` using `ifconfig`?

**Answer:** `ifconfig eth0 192.168.10.5 netmask 255.255.255.0`

---

**Q2.** How do you add default gateway `10.0.0.1` using `route`?

**Answer:** `route add default gw 10.0.0.1`

---

**Q3.** What is the difference between `iw` and `iwconfig`?

**Answer:** `iw` uses the nl80211 (netlink) standard; `iwconfig` uses the legacy WEXT standard from the `wireless_tools` package. If the card driver does not support nl80211, `iw` will not see the device — use `iwconfig` instead.

---

**Q4.** Which command shows the ARP cache?

**Answer:** `arp` or `ip neigh show`

---

**Q5.** What does the `default` route in the routing table mean?

**Answer:** `default` is shorthand for `0.0.0.0` — it matches any destination when no more specific route exists. Only one default gateway can be active at a time.

---

**Q6.** Which IPv6 address identifies the loopback interface?

**Answer:** `::1`

---

**Q7.** Why must the loopback interface be configured even when the machine is not connected to any network?

**Answer:** RPC applications (NFS, NIS) register with portmapper via the loopback address `127.0.0.1` at startup. Without loopback, these services will not start.

---

**Q8.** How do you show all addresses assigned to network interfaces using `ip`?

**Answer:** `ip addr show`
