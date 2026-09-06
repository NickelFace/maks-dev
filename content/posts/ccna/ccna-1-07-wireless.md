---
title: "CCNA 1.7 Wireless Networks"
date: 2026-07-19
description: "802.11 standards (Wi-Fi 4/5/6), frequency bands and channels, WLAN components (AP, WLC, CAPWAP), CSMA/CA media access method and WPA2/WPA3 security standards."
tags: ["CCNA", "Cisco", "Wi-Fi", "802.11", "WLAN"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-1-07-wireless/"
---

## 802.11 Standards

| Standard | Frequency | Max Speed | Range | Notes |
|---|---|---|---|---|
| 802.11b | 2.4 GHz | 11 Mbps | ~35 m (indoor) | Obsolete |
| 802.11a | 5 GHz | 54 Mbps | ~35 m | Obsolete |
| 802.11g | 2.4 GHz | 54 Mbps | ~38 m | Backward compatible with b |
| 802.11n | 2.4/5 GHz | 600 Mbps | ~70 m | Wi-Fi 4, MIMO |
| 802.11ac | 5 GHz | 3.5 Gbps | ~35 m | Wi-Fi 5, MU-MIMO |
| 802.11ax | 2.4/5 GHz | 9.6 Gbps | ~30 m | **Wi-Fi 6**, OFDMA, MU-MIMO |
| 802.11ax | 6 GHz | 9.6 Gbps | ~20 m | **Wi-Fi 6E**, 6 GHz only, less interference |

> **💡 Tip:** A common exam topic: 802.11n was the first standard to support dual-band (2.4 and 5 GHz). Wi-Fi 6E = 802.11ax extended to the 6 GHz band (same technology, new spectrum).

---

## Frequency Bands and Channels

### 2.4 GHz

- Channels 1–14 (in the US 1–11)
- Channel width: 20 MHz
- **Non-overlapping channels: 1, 6, 11** (use these for adjacent APs)

### 5 GHz

- More channels (up to 25 in the US)
- Channel width: 20, 40, 80, 160 MHz
- Less interference, shorter range

### 6 GHz (Wi-Fi 6E)

- Available only with Wi-Fi 6E (802.11ax) devices
- ~60 channels of 20 MHz width (US), much more capacity
- No legacy devices → minimal interference
- Shorter range than 5 GHz; best for high-density indoor environments

> **⚠️ Note:** The 2.4 GHz band is congested (Bluetooth, microwaves, other APs). Use 5 GHz when possible. Use 6 GHz (Wi-Fi 6E) for maximum throughput in dense environments.

---

## Operating Modes

| Mode | Description |
|---|---|
| Infrastructure | Clients connect through an access point (AP) |
| Ad-hoc (IBSS) | Devices connect directly without an AP |
| Mesh | APs connect to each other wirelessly |

### BSS and ESS

| Term | Full Name | Description |
|---|---|---|
| BSS | Basic Service Set | One access point and its clients |
| BSSID | BSS Identifier | MAC address of the AP |
| SSID | Service Set Identifier | Network name (up to 32 characters) |
| ESS | Extended Service Set | Multiple BSSs sharing one SSID |
| DS | Distribution System | Wired infrastructure connecting APs |

---

## WLAN Components

| Component | Description |
|---|---|
| AP (Access Point) | Bridge between wired and wireless network |
| WLC (Wireless LAN Controller) | Centralized AP management; APs become Lightweight |
| CAPWAP | Tunneling protocol between Lightweight AP and WLC (UDP 5246/5247) |
| Autonomous AP | Standalone AP; does not require a WLC |
| Lightweight AP | AP managed by a WLC (thin AP) |

> **💡 Tip:** CAPWAP (Control And Provisioning of Wireless Access Points) replaced LWAPP. Control traffic = UDP 5246, data = UDP 5247.

---

## Media Access Methods

- **CSMA/CA** (Collision Avoidance): listen before transmit + random backoff
- **ACK**: each packet is acknowledged
- **RTS/CTS**: Request to Send / Clear to Send to prevent the "hidden node" problem

> **📌 Important:** Wi-Fi uses **CSMA/CA** (Avoidance), not **CSMA/CD** (Detection) like wired Ethernet. In a wireless environment, a device cannot simultaneously transmit and listen for collisions.

---

## Wireless Security

| Standard | Encryption | Authentication | Status |
|---|---|---|---|
| WEP | RC4 (40-bit) | Open/PSK | Broken: do not use |
| WPA | TKIP (RC4) | PSK / 802.1X | Deprecated |
| WPA2 | AES-CCMP | PSK / 802.1X (EAP) | Recommended |
| WPA3 | AES-GCMP | SAE / 802.1X | Current standard |

### WPA2 Modes

| Mode | Usage | Authentication |
|---|---|---|
| Personal (PSK) | Home, small business | Pre-Shared Key |
| Enterprise | Corporate | RADIUS + 802.1X/EAP |

> **⚠️ Note:** On the exam: WEP is obsolete and insecure. For enterprise networks use WPA2 Enterprise with RADIUS.

---

## Resources

| Resource | Description |
|---|---|
| [IEEE 802.11 Standards (IEEE)](https://standards.ieee.org/ieee/802.11/7028/) | Official 802.11a/b/g/n/ac/ax standards |
| [Wireless Standards (networklessons.com)](https://networklessons.com/wireless/introduction-wireless-lan) | WLAN overview: standards, frequencies, channels, SSID |
| [Wi-Fi 6 (802.11ax) (Cisco)](https://www.cisco.com/c/en/us/solutions/enterprise-networks/802-11ax-solution/index.html) | Cisco on Wi-Fi 6: OFDMA, MU-MIMO, improvements over 802.11ac |
| [Jeremy's IT Lab: Wireless Fundamentals (YouTube)](https://www.youtube.com/watch?v=bPfELUx1BoI) | Wireless fundamentals: standards, frequencies, BSS/ESS |
| [Channel Planning 2.4 GHz vs 5 GHz (Cisco)](https://www.cisco.com/c/en/us/support/docs/wireless-mobility/wireless-lan-wlan/212016-Best-Practices-for-Wireless-Channel-Pl.html) | Best practices for 2.4/5 GHz channel planning |
| [David Bombal: Wireless Networking (YouTube)](https://www.youtube.com/watch?v=pnBqmEFKUHk) | CCNA wireless: standards, SSID, security |
