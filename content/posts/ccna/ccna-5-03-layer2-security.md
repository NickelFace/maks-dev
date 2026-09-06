---
title: "CCNA 5.3 Layer 2 Security"
date: 2026-09-13
description: "Port Security (shutdown/restrict/protect, sticky MAC), DHCP Snooping (trusted/untrusted ports), Dynamic ARP Inspection, and protection against VLAN Hopping and STP attacks."
tags: ["CCNA", "Cisco", "Port Security", "DHCP Snooping", "security"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-5-03-layer2-security/"
---

## Port Security

**Port Security** restricts which MAC addresses are allowed to use a switch port.

### Violation Modes

| Mode | Action on violation | Syslog message | Counter |
|---|---|:---:|:---:|
| Shutdown (default) | Port → err-disabled | Yes | Yes |
| Restrict | Blocks violator, port stays up for others | Yes | Yes |
| Protect | Blocks violator, no notification | No | No |

> **💡 Tip:** `shutdown` is the most secure. `restrict` blocks but keeps the port active. `protect` is the most permissive and not recommended for production.

### Configuring Port Security

```bash
# Access ports only!
Switch(config)# interface fastethernet 0/1
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10

# Enable port security
Switch(config-if)# switchport port-security

# Maximum number of MAC addresses (default: 1)
Switch(config-if)# switchport port-security maximum 3

# Static MAC (manually configured)
Switch(config-if)# switchport port-security mac-address AABB.CC11.2233

# Sticky MAC (automatically learn and save connected MACs to config)
Switch(config-if)# switchport port-security mac-address sticky

# Violation mode
Switch(config-if)# switchport port-security violation shutdown    # default
Switch(config-if)# switchport port-security violation restrict
Switch(config-if)# switchport port-security violation protect
```

### Recovering an err-disabled Port

```bash
# Manual recovery
Switch(config)# interface fastethernet 0/1
Switch(config-if)# shutdown
Switch(config-if)# no shutdown

# Automatic recovery
Switch(config)# errdisable recovery cause psecure-violation
Switch(config)# errdisable recovery interval 300                  # after 300 sec
Switch# show errdisable recovery                                   # status
```

### Verifying Port Security

```bash
Switch# show port-security                           # all ports
Switch# show port-security interface fa0/1          # specific port
Switch# show port-security address                   # learned MACs
Switch# show mac address-table                       # MAC address table
```

---

## DHCP Snooping

**DHCP Snooping** is a switch feature that prevents rogue DHCP server attacks.

Ports are classified as:
- **Trusted**: trusted port (toward DHCP server, uplink)
- **Untrusted**: untrusted port (client-facing ports, default)

DHCP OFFER and ACK messages (server responses) are blocked on untrusted ports.

```bash
# Enable DHCP Snooping globally
Switch(config)# ip dhcp snooping

# Enable for a specific VLAN
Switch(config)# ip dhcp snooping vlan 10
Switch(config)# ip dhcp snooping vlan 10,20,30

# Disable Option 82 insertion (often needed to fix DHCP issues)
Switch(config)# no ip dhcp snooping information option

# Mark the uplink/server port as trusted
Switch(config)# interface gigabitethernet 0/1              # uplink to router/server
Switch(config-if)# ip dhcp snooping trust

# Rate-limit DHCP on untrusted port
Switch(config)# interface fastethernet 0/1                 # client port
Switch(config-if)# ip dhcp snooping limit rate 15          # max 15 packets/sec

# Verification
Switch# show ip dhcp snooping                              # global settings
Switch# show ip dhcp snooping binding                      # binding table MAC→IP→VLAN→port
Switch# show ip dhcp snooping statistics
```

> **📌 Important:** DHCP Snooping builds a **binding table**: MAC address → IP → VLAN → port. This table is used by DAI and IP Source Guard.

---

## Dynamic ARP Inspection (DAI)

**DAI** prevents ARP spoofing by validating ARP packets against the DHCP Snooping binding table.

```bash
# Requires DHCP Snooping (for the binding table)
Switch(config)# ip dhcp snooping
Switch(config)# ip dhcp snooping vlan 10

# Enable DAI for VLAN
Switch(config)# ip arp inspection vlan 10
Switch(config)# ip arp inspection vlan 10,20

# Trusted port for DAI (uplink to router, another switch)
Switch(config)# interface gigabitethernet 0/1
Switch(config-if)# ip arp inspection trust

# Additional DAI validations
Switch(config)# ip arp inspection validate src-mac   # verify src MAC in Ethernet = ARP
Switch(config)# ip arp inspection validate dst-mac   # verify dst MAC
Switch(config)# ip arp inspection validate ip        # verify IP in ARP

# Rate-limit ARP on a port
Switch(config)# interface fastethernet 0/1
Switch(config-if)# ip arp inspection limit rate 100

# Verification
Switch# show ip arp inspection                        # status and VLANs
Switch# show ip arp inspection vlan 10
Switch# show ip arp inspection interfaces
Switch# show ip arp inspection statistics
```

---

## Additional L2 Security Measures

### Disabling Unused Ports

```bash
Switch(config)# interface range fastethernet 0/5-24
Switch(config-if-range)# shutdown
Switch(config-if-range)# switchport access vlan 999       # blackhole VLAN
```

### Protection Against VLAN Hopping

```bash
# Disable DTP on access ports
Switch(config-if)# switchport mode access
Switch(config-if)# switchport nonegotiate

# Change Native VLAN (not VLAN 1)
Switch(config-if)# switchport trunk native vlan 999       # unused VLAN

# Remove VLAN 1 from trunk
Switch(config-if)# switchport trunk allowed vlan remove 1
```

### STP Protection

```bash
# PortFast + BPDU Guard on access ports
Switch(config-if)# spanning-tree portfast
Switch(config-if)# spanning-tree bpduguard enable

# Root Guard on ports where Root Bridge should not appear
Switch(config-if)# spanning-tree guard root
```

---

## Resources

| Resource | Description |
|---|---|
| [Port Security (networklessons.com)](https://networklessons.com/switching/how-to-configure-port-security-on-cisco-switch) | Port Security: restrict, protect, shutdown, sticky MAC |
| [DHCP Snooping (networklessons.com)](https://networklessons.com/switching/dhcp-snooping) | DHCP Snooping: trusted/untrusted ports, rogue DHCP protection |
| [Dynamic ARP Inspection (networklessons.com)](https://networklessons.com/switching/dai-dynamic-arp-inspection) | DAI: ARP spoofing protection, integration with DHCP Snooping |
| [802.1X (networklessons.com)](https://networklessons.com/switching/aaa-802-1x-authentication) | Port-based NAC: authenticator, supplicant, auth server |
| [Jeremy's IT Lab: Layer 2 Security (YouTube)](https://www.youtube.com/watch?v=lMI2Q8Ke1p0) | Port Security, DHCP Snooping, DAI from the Free CCNA series |
| [Cisco Port Security Configuration](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-3/configuration_guide/sec/b_173_sec_9300_cg/configuring_port_security.html) | Official Cisco guide for Port Security configuration |
