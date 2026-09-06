---
title: "CCNA 6.1 SDN and Catalyst Center"
date: 2026-09-20
description: "Software-Defined Networking: separating the control and data planes, Northbound and Southbound APIs, Cisco Catalyst Center (Intent-Based Networking), SD-Access, NETCONF/RESTCONF, and YANG."
tags: ["CCNA", "Cisco", "SDN", "Catalyst Center", "automation"]
categories: ["CCNA"]
page_lang: "en"
lang_pair: "/posts/ccna/ru/ccna-6-01-sdn/"
---

## Traditional Networks vs SDN

| Aspect | Traditional Networks | SDN |
|---|---|---|
| Management | CLI on each device | Centralized controller |
| Configuration | Manual, one device at a time | Via API and policies |
| Flexibility | Low | High |
| Visibility | Limited | End-to-end |
| Errors | Frequent (manual input) | Reduced through automation |

---

## Network Device Planes

| Plane | Name | Description |
|---|---|---|
| Data Plane | Forwarding plane | Packet forwarding (FIB/CAM/TCAM) |
| Control Plane | Control plane | Route computation (OSPF, STP, ARP) |
| Management Plane | Management plane | SSH, SNMP, NetConf: device configuration |

### In SDN:
- The **Control Plane** is moved to a **centralized controller**
- Devices (data plane) receive forwarding rules from the controller via protocols (OpenFlow, NETCONF/YANG)

```mermaid
graph TD
    Apps["Applications / NMS"]
    SDN["SDN Controller<br/>Centralized Control Plane"]
    Devices["Network Devices<br/>Data Plane Only"]

    Apps <-->|"Northbound API (REST)"| SDN
    SDN <-->|"Southbound API (OpenFlow / NETCONF)"| Devices
```

### Northbound and Southbound APIs

| API | Direction | Purpose | Protocols |
|---|---|---|---|
| Northbound | Controller ↔ Applications/NMS | Manage the controller from applications | REST, RESTCONF |
| Southbound | Controller ↔ Devices | Program device forwarding rules | OpenFlow, NETCONF, YANG |

---

## SDN Architectures

| Type | Description |
|---|---|
| Pure SDN | Fully centralized control plane (OpenFlow) |
| Hybrid SDN | Part of the control plane on the controller, part on devices |
| SD-WAN | SDN for WAN (Cisco Viptela/SD-WAN) |
| Cisco ACI | Application Centric Infrastructure for data centers |

---

## Cisco Catalyst Center

**Cisco Catalyst Center** (formerly DNA Center) is a network automation and management platform.

### Catalyst Center Capabilities

| Feature | Description |
|---|---|
| Intent-Based Networking | Define intent ("allow VLAN 10 on all switches"), controller applies it |
| Network Discovery | Automatic device discovery |
| Network Design | Hierarchy: Global → Site → Building → Floor |
| Provision | Automated device configuration |
| Policy | Security groups (SGT), segmentation |
| Assurance | Monitoring, analytics, and troubleshooting |

### Interaction with Devices

```mermaid
graph LR
    Apps["Applications / Scripts"]
    DNA["Catalyst Center"]
    Devices["Devices"]

    Apps <-->|"REST API (Northbound)"| DNA
    DNA <-->|"NETCONF/RESTCONF (Southbound)"| Devices
```

### SD-Access

**SD-Access (Software-Defined Access)** is a Cisco solution for automating campus networks:
- **Fabric**: overlay network on top of the physical infrastructure (VXLAN + LISP)
- **Control Plane**: LISP for endpoint tracking
- **Data Plane**: VXLAN for tunneling
- **Policy Plane**: TrustSec/SGT for micro-segmentation

---

## Configuration Protocols

### NETCONF (RFC 6241)

- Transport: SSH (TCP 830)
- Data format: XML
- Operations: get, get-config, edit-config, copy-config

### RESTCONF (RFC 8040)

- Transport: HTTPS
- Data format: JSON or XML
- Methods: GET, POST, PUT, PATCH, DELETE
- Based on YANG data models

### YANG

**YANG** (Yet Another Next Generation) is a data modeling language for configuring network devices. It defines the structure and data types used in NETCONF/RESTCONF.

---

## Resources

| Resource | Description |
|---|---|
| [Cisco Catalyst Center Documentation](https://developer.cisco.com/docs/dna-center/) | Official Catalyst Center documentation: API, Intent API |
| [SDN Overview (networklessons.com)](https://networklessons.com/network-automation/introduction-to-sdn-software-defined-networking) | SDN: control/data plane separation, OpenFlow, controllers |
| [Cisco SD-Access](https://www.cisco.com/c/en/us/solutions/enterprise-networks/software-defined-access/index.html) | SD-Access: fabric, underlay/overlay, policy, segmentation |
| [Jeremy's IT Lab: SDN and Automation (YouTube)](https://www.youtube.com/watch?v=UdmgpxTq6Yw) | SDN, Catalyst Center, management and automation from the Free CCNA series |
| [Cisco DevNet: Catalyst Center Sandbox](https://developer.cisco.com/site/sandbox/) | Free lab environment for learning the Catalyst Center API |
| [OpenFlow: Open Networking Foundation](https://opennetworking.org/sdn-definition/) | SDN definition and the OpenFlow protocol from ONF |
