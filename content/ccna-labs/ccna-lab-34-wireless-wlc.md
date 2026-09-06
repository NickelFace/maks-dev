---
title: "Lab 34 · Wireless LAN and the WLC"
date: 2026-09-06
description: "Build a split-MAC wireless network: a Layer 3 switch, a DHCP scope with option 43, a WLC that the AP finds by itself, and a WPA2 WLAN mapped to its own VLAN."
tags: ["CCNA", "Wireless", "WLC", "CAPWAP", "WPA2", "Lab"]
categories: ["CCNA"]
domain: 2
tool: "Packet Tracer"
duration: "50 min"
sources: "Jeremy's IT Lab Day 55–58 · Flackbox 37"
aliases: ["/ccna-labs/ccna-lab-37-wireless/"]
---

Wireless is the one CCNA topic configured mostly in a GUI, which makes it feel unlike the rest of the syllabus. The CLI work is real though: the switch ports, the VLANs, the DHCP scopes and the option 43 that lets an access point find its controller are all typed, and they are where the lab actually fails when it fails.

## Topology

{{< topology cols="4" rows="3" caption="Split-MAC: the AP handles radio, the WLC handles everything else, CAPWAP joins them" >}}
switch SW1 "L3 · VLAN 100/200/300" at 1,1
router WLC "10.0.100.10" at 0,1
switch AP "lightweight AP" at 2,1
pc     WC "wireless client" at 3,1
server DHCP "on SW1" at 1,0

WLC — SW1 label="trunk"
SW1 — AP label="access VLAN 100"
AP — WC label="802.11"
{{< /topology >}}

| VLAN | Purpose | Subnet | SVI |
|---|---|---|---|
| 100 | AP management / WLC | 10.0.100.0/24 | 10.0.100.1 |
| 200 | corporate wireless | 10.0.200.0/24 | 10.0.200.1 |
| 300 | guest wireless | 10.0.300.0/24 | 10.0.30.1 |

## Objectives

- Explain split-MAC and say which functions live on the AP and which on the WLC
- Configure the switch VLANs, trunk and DHCP scopes, including option 43
- Bring an AP through the CAPWAP join process and verify it registered
- Create a WPA2-PSK WLAN mapped to a dynamic interface
- Compare the AP modes and the WLAN security options

---

## Part 1 — Architecture

{{< step num="1" dev="—" title="Split-MAC: what runs where" open="true" >}}
An **autonomous** AP does everything itself — a standalone box with its own configuration. Fine for three APs, unmanageable at three hundred, because every configuration change and every firmware upgrade is per device.

A **lightweight** AP does only the time-critical radio work and tunnels everything else to a **Wireless LAN Controller**. That division is called **split-MAC**:

| Function | Lightweight AP | WLC |
|---|---|---|
| 802.11 beacons and probe responses | **yes** | |
| Frame acknowledgements, retransmission | **yes** | |
| Encryption / decryption | **yes** | |
| Association and re-association | | **yes** |
| Authentication (802.1X, PSK) | | **yes** |
| RF management (channel, power) | | **yes** |
| Roaming decisions | | **yes** |
| Security policy, QoS, VLAN mapping | | **yes** |

The dividing line is **timing**. Anything that must happen inside microseconds — acknowledging a frame — stays on the AP. Everything else goes to the controller, where it can be managed centrally.

The tunnel between them is **CAPWAP** (Control And Provisioning of Wireless Access Points), and it has two channels:

| Channel | Port | Carries | Encrypted |
|---|---|---|---|
| **Control** | **UDP 5246** | management, configuration | **yes (DTLS)** |
| **Data** | **UDP 5247** | client traffic | optional, usually off |

CAPWAP runs over IP, so **the AP and the WLC do not need to be on the same subnet or the same VLAN** — the tunnel crosses any routed path. That is what makes a single controller able to serve a whole campus.

The five deployment models the blueprint mentions:

| Model | Where the WLC lives |
|---|---|
| **Unified / centralised** | a controller appliance in the data centre |
| **Embedded** | controller software on a switch stack |
| **Cloud-based** | controller as a VM in a private or public cloud |
| **Mobility Express** | controller software on one of the APs itself |
| **Autonomous** | no controller at all |
{{< /step >}}

---

## Part 2 — The wired side

{{< step num="2" dev="SW1" title="VLANs, SVIs and the two trunks" >}}
```
SW1(config)#ip routing
SW1(config)#vlan 100
SW1(config-vlan)#name AP-MGMT
SW1(config-vlan)#exit
SW1(config)#vlan 200
SW1(config-vlan)#name WIFI-CORP
SW1(config-vlan)#exit
SW1(config)#vlan 300
SW1(config-vlan)#name WIFI-GUEST
SW1(config-vlan)#exit
SW1(config)#interface Vlan100
SW1(config-if)#ip address 10.0.100.1 255.255.255.0
SW1(config-if)#no shutdown
SW1(config-if)#exit
SW1(config)#interface Vlan200
SW1(config-if)#ip address 10.0.200.1 255.255.255.0
SW1(config-if)#no shutdown
SW1(config-if)#exit
SW1(config)#interface Vlan300
SW1(config-if)#ip address 10.0.30.1 255.255.255.0
SW1(config-if)#no shutdown
SW1(config-if)#end
```

The AP port is an **access port in the management VLAN**:

```
SW1(config)#interface GigabitEthernet1/0/10
SW1(config-if)#description ## lightweight AP ##
SW1(config-if)#switchport mode access
SW1(config-if)#switchport access vlan 100
SW1(config-if)#spanning-tree portfast
SW1(config-if)#end
```

That surprises people: surely the AP carries three VLANs? It does not. **Client traffic is inside the CAPWAP tunnel**, which is ordinary IP in VLAN 100. The VLAN separation happens at the WLC, where each WLAN is mapped to a dynamic interface. The AP port only ever carries CAPWAP.

The **WLC** port is a trunk, because that is where the tunnels terminate and the client VLANs emerge:

```
SW1(config)#interface GigabitEthernet1/0/1
SW1(config-if)#description ## WLC ##
SW1(config-if)#switchport trunk encapsulation dot1q
SW1(config-if)#switchport mode trunk
SW1(config-if)#switchport trunk native vlan 100
SW1(config-if)#switchport trunk allowed vlan 100,200,300
SW1(config-if)#end
```

An **autonomous** AP would need a trunk instead, carrying every SSID's VLAN — which is the operational difference between the two models in one sentence.
{{< /step >}}

{{< step num="3" dev="SW1" title="DHCP scopes, and option 43" open="true" >}}
```
SW1(config)#ip dhcp excluded-address 10.0.100.1 10.0.100.20
SW1(config)#ip dhcp excluded-address 10.0.200.1 10.0.200.10
SW1(config)#ip dhcp excluded-address 10.0.30.1 10.0.30.10

SW1(config)#ip dhcp pool AP-POOL
SW1(dhcp-config)#network 10.0.100.0 255.255.255.0
SW1(dhcp-config)#default-router 10.0.100.1
SW1(dhcp-config)#option 43 hex f104_0a00_640a
SW1(dhcp-config)#exit

SW1(config)#ip dhcp pool WIFI-CORP-POOL
SW1(dhcp-config)#network 10.0.200.0 255.255.255.0
SW1(dhcp-config)#default-router 10.0.200.1
SW1(dhcp-config)#dns-server 10.0.100.53
SW1(dhcp-config)#exit

SW1(config)#ip dhcp pool WIFI-GUEST-POOL
SW1(dhcp-config)#network 10.0.30.0 255.255.255.0
SW1(dhcp-config)#default-router 10.0.30.1
SW1(dhcp-config)#dns-server 8.8.8.8
SW1(dhcp-config)#end
```

**Option 43 is the one that matters and the one that is always wrong the first time.** It tells the AP where its controller is, and the encoding is not obvious:

```
option 43 hex f104_0a00_640a
                │  │  └───────── the WLC address in hex
                │  └──────────── length in bytes (04 = one IPv4 address)
                └─────────────── type f1 = Cisco WLC management addresses
```

`0a00640a` decodes octet by octet: `0a` = 10, `00` = 0, `64` = 100, `0a` = 10 → **10.0.100.10**.

For two controllers, append the second address and double the length:

```
option 43 hex f108_0a00_640a_0a00_640b     ! 10.0.100.10 and 10.0.100.11
```

The underscores are cosmetic and IOS accepts them; they exist so a human can read the field boundaries.

An AP tries several discovery methods in order, and option 43 is only one of them:

1. A previously learned controller, stored in NVRAM
2. **DHCP option 43**
3. **DNS** — resolving `CISCO-CAPWAP-CONTROLLER.<domain>`
4. Layer 2 broadcast on the local subnet
5. A statically configured controller address

Methods 4 and 5 are why an AP on the same VLAN as its WLC often joins with no option 43 at all — and why a lab works until the AP is moved to a different subnet.
{{< /step >}}

{{< verify dev="SW1" cmd="show ip dhcp binding and show ip interface brief" open="true" >}}
```
SW1#show ip dhcp binding
IP address       Client-ID/Hardware address    Lease expiration        Type
10.0.100.21      0100.d0d3.1b4c.55             Sep 07 2026 04:12 PM    Automatic
10.0.200.11      0100.5079.6668.02             Sep 07 2026 04:19 PM    Automatic
```

`10.0.100.21` is the AP — it got an address from AP-POOL and, with it, option 43. `10.0.200.11` is a wireless client on the corporate WLAN, addressed from the corporate pool even though its traffic arrived over a tunnel in VLAN 100.

```
SW1#show ip interface brief | include Vlan
Vlan100                10.0.100.1      YES manual up                    up
Vlan200                10.0.200.1      YES manual up                    up
Vlan300                10.0.30.1       YES manual up                    up
```

All three SVIs up. An SVI stuck `up/down` means the VLAN has no active port (Lab 08) — on VLAN 200 and 300 the WLC trunk is what keeps them up.
{{< /verify >}}

---

## Part 3 — The WLC

{{< step num="4" dev="WLC" title="Initial setup and the interfaces" >}}
The first-boot wizard asks for these, over the console:

| Prompt | Value |
|---|---|
| System name | `WLC-01` |
| Administrative username / password | `admin` / a strong password |
| Management interface IP | `10.0.100.10` |
| Netmask | `255.255.255.0` |
| Default gateway | `10.0.100.1` |
| Management VLAN | `100` (or 0 for untagged) |
| Virtual interface IP | `192.0.2.1` |
| Mobility / RF group name | `LAB-GROUP` |
| Network name (SSID) | `CORP-WIFI` |
| **Country code** | `AU` |

**The country code is not optional and not cosmetic.** It sets the regulatory domain: which channels are legal, at what power, and whether DFS applies. Get it wrong and the radios either refuse to come up or transmit on channels that are illegal in your jurisdiction. Jeremy's course uses `FR` because that is what the simulated hardware's regulatory domain expects — match it to the actual equipment, not to where you happen to be sitting.

The four interface types a WLC has, which is the part exam questions probe:

| Interface | Purpose |
|---|---|
| **Management** | in-band management, and where **APs terminate their CAPWAP tunnels** |
| **Virtual** | a non-routable placeholder (`192.0.2.1`) used for mobility, guest web auth and DHCP relay |
| **Dynamic** | one per WLAN, mapped to a client VLAN — the equivalent of an SVI |
| **Service port** | out-of-band management on a dedicated physical port; must be a different subnet |

The **virtual interface** confuses everyone. It is deliberately an address that is not routable and is identical on every controller in a mobility group — that sameness is what lets a client roam between controllers without its DHCP or authentication state changing. `192.0.2.1` is from the RFC 5737 documentation range, chosen precisely because it will never collide with anything real.
{{< /step >}}

{{< step num="5" dev="WLC" title="Dynamic interfaces and a WPA2 WLAN" open="true" >}}
**CONTROLLER → Interfaces → New** — one dynamic interface per client VLAN:

| Field | Corporate | Guest |
|---|---|---|
| Interface name | `wifi-corp` | `wifi-guest` |
| VLAN identifier | `200` | `300` |
| IP address | `10.0.200.5` | `10.0.30.5` |
| Netmask | `255.255.255.0` | `255.255.255.0` |
| Gateway | `10.0.200.1` | `10.0.30.1` |
| Primary DHCP server | `10.0.100.1` | `10.0.100.1` |

The dynamic interface is the WLC's own address in that client VLAN, and the DHCP server address is where the WLC relays client DHCP requests. Both must be right or clients associate and never get an address.

**WLANs → New**, then across the four tabs:

**General** — Profile Name `CORP-WIFI`, SSID `CORP-WIFI`, Status enabled, Interface `wifi-corp`.

**Security → Layer 2** — WPA+WPA2, WPA2 Policy on, AES on, **PSK** with a passphrase.

**Security → Layer 3** — none for a PSK network.

**QoS** — Platinum for a network carrying voice, Silver otherwise.

**Advanced** — leave the defaults; `FlexConnect` off for centralised switching.

The security options, in the order they should be considered:

| Option | Authentication | Encryption | Use |
|---|---|---|---|
| Open | none | none | never, except a captive-portal guest network |
| WEP | shared key | RC4 | **broken** — recoverable in minutes |
| WPA | PSK or 802.1X | **TKIP** (RC4) | deprecated |
| **WPA2** | PSK or 802.1X | **AES-CCMP** | the current baseline |
| **WPA3** | **SAE** or 802.1X | **AES-GCMP** | current best; SAE resists offline cracking |

**Personal versus Enterprise** is the more important distinction in practice:

- **Personal (PSK)** — one shared passphrase. Anyone who has it is on the network, there is no per-user accounting, and changing it means changing every device.
- **Enterprise (802.1X)** — per-user credentials against a RADIUS server, per-user VLAN assignment and accounting, and revoking one user affects nobody else.

WPA3's headline improvement is **SAE** (Simultaneous Authentication of Equals), which replaces the WPA2 four-way handshake. Under WPA2-PSK an attacker can capture the handshake and crack the passphrase offline at leisure; SAE makes that impossible — every guess requires a fresh interaction with the network.
{{< /step >}}

{{< verify dev="WLC" cmd="Wireless → All APs, and Monitor → Clients" open="true" >}}
**WIRELESS → All APs** should list the access point:

```
AP Name        AP Model        AP MAC             AP Up Time    Admin Status  Operational Status
AP-LAB-01      AIR-CAP2702I    00d0.d31b.4c55     0d 00h 12m    Enabled       REG
```

**`REG`** — registered. The CAPWAP join completed. Anything else means the join failed, and the states tell you where:

| State | Meaning |
|---|---|
| `Discovery` | the AP is looking for a controller — option 43 or DNS problem |
| `Join` | found it, negotiating — often a certificate or time problem |
| `Image Data` | downloading firmware to match the WLC |
| `Config` | receiving its configuration |
| **`REG`** | **joined and operational** |

An AP stuck in `Join` is very often a **clock** problem: CAPWAP uses DTLS with certificates, and a certificate is invalid if the WLC's clock is wrong. That is one more reason NTP (Lab 24) comes before wireless.

**MONITOR → Clients** for an associated station:

```
Client MAC       AP Name      WLAN Profile  Protocol   Status      Auth  Port  WGB
0050.7966.6802   AP-LAB-01    CORP-WIFI     802.11n(2.4 GHz)  Associated  Yes   1    No
```

`Associated` and `Auth: Yes` — the client passed the four-way handshake. `Associated` with `Auth: No` means the PSK is wrong.

From the client itself:

```
PC> ipconfig
   IP Address......................: 10.0.200.11
   Subnet Mask.....................: 255.255.255.0
   Default Gateway.................: 10.0.200.1

PC> ping 10.0.200.1
Reply from 10.0.200.1: bytes=32 time=4ms TTL=255
```

An address from **VLAN 200**, over an AP whose switch port is an access port in **VLAN 100**. The VLAN mapping happened at the WLC, at the end of the CAPWAP tunnel — which is the single most important thing to understand about this architecture.
{{< /verify >}}

{{< verify dev="SW1" cmd="verify the CAPWAP tunnel from the wired side" >}}
```
SW1#show mac address-table interface GigabitEthernet1/0/10

Vlan    Mac Address       Type        Ports
----    -----------       --------    -----
 100    00d0.d31b.4c55    DYNAMIC     Gi1/0/10
```

**One MAC address on the AP port** — the AP's own, in VLAN 100. The wireless clients' MACs never appear there, because their frames are encapsulated inside CAPWAP. On an autonomous AP's trunk port you would see every client MAC in every SSID's VLAN.

That single line of output is the clearest possible demonstration of what a tunnel does.
{{< /verify >}}

---

## AP modes

{{< step num="6" dev="—" title="What else a lightweight AP can be" >}}
| Mode | Function |
|---|---|
| **Local** | the default — serves clients, and scans off-channel briefly between beacons |
| **FlexConnect** | serves clients and switches their traffic **locally** if the WAN to the WLC drops — the branch-office mode |
| **Monitor** | no clients; full-time scanning for rogues and location |
| **Sniffer** | captures 802.11 frames and forwards them to a packet analyser |
| **Rogue Detector** | listens on the **wired** side for rogue AP MAC addresses |
| **Bridge / Mesh** | wireless backhaul between APs |
| **SE-Connect** | dedicated spectrum analysis |

**FlexConnect** is the one that matters operationally. A branch with twenty APs and a controller in head office would lose all wireless if the WAN dropped — FlexConnect lets the APs keep serving clients and switch traffic into local VLANs until the controller comes back.

And the RF facts the exam wants:

- **2.4 GHz** — 11 channels in most regulatory domains, only **1, 6 and 11** are non-overlapping. Better range, worse throughput, crowded.
- **5 GHz** — 20+ non-overlapping channels, shorter range, much less interference. Some channels require DFS (radar avoidance).
- **6 GHz** — Wi-Fi 6E, very wide and very clean, very short range.
- Channel width: **20 MHz** is the safe default in 2.4 GHz; wider channels bond adjacent ones and trade interference resilience for throughput.
{{< /step >}}

---

## What breaks in the real world

| Symptom | Cause | Command / check |
|---|---|---|
| AP never appears on the WLC | option 43 wrong or missing | `show ip dhcp binding`; decode the hex |
| AP stuck in `Join` | clock wrong — DTLS certificate invalid | configure NTP on the WLC |
| AP joins, no clients can associate | WLAN disabled, or wrong dynamic interface | WLANs → Status |
| Clients associate, get no address | dynamic interface DHCP server wrong | Controller → Interfaces |
| Clients on the wrong VLAN | WLAN mapped to the wrong interface | WLANs → General → Interface |
| Radios will not come up | country code not set or mismatched | Wireless → Country |
| Guest and corporate clients can reach each other | no ACL between the client VLANs | apply an ACL on the SVIs |
| Poor throughput in 2.4 GHz | overlapping channels | use 1, 6, 11 only |

## Exam notes

- **Split-MAC**: the AP does beacons, ACKs and encryption; the WLC does association, authentication, RF management and roaming.
- **CAPWAP**: control **UDP 5246** (DTLS-encrypted), data **UDP 5247** (usually not encrypted). It runs over IP, so AP and WLC can be on different subnets.
- The **AP switch port is an access port** in the management VLAN. The **WLC port is a trunk**.
- **DHCP option 43** type `f1`, then length, then the WLC address in hex.
- AP discovery order: stored controller → **option 43** → **DNS** → broadcast → static.
- WLC interfaces: **management** (CAPWAP terminates here), **virtual** (non-routable, roaming/web-auth), **dynamic** (one per client VLAN), **service port**.
- WPA2 = **AES-CCMP**; WPA3 = **AES-GCMP + SAE**. WEP and TKIP are broken.
- **Personal** = PSK. **Enterprise** = 802.1X against RADIUS, with per-user policy.
- 2.4 GHz non-overlapping channels: **1, 6, 11**.
- **FlexConnect** keeps a branch's wireless working when the WAN to the controller fails.

---

*Sources: Jeremy's IT Lab Day 55–58 · Flackbox CCNA Lab Guide 37 · verified in Packet Tracer 8.2.*
