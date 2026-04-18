---
title: "Network Engineer — 01. VLAN"
date: 2025-08-03
description: "Lab: configuring Extended VLAN, VTP and DTP. Trunk links, DTP, extended-range VLANs."
tags: ["Networking", "VLAN", "VTP", "Cisco"]
categories: ["Network Engineer"]
code_toggle: true
lang_pair: "/posts/neteng/ru/neteng-01-vlan/"
---

## Lab: Configuring Extended VLAN, VTP and DTP

### Topology

![Topology](/img/neteng/01/scheme.png)

### Addressing table

| Device | Interface | IP address   | Subnet Mask   |
| ------ | --------- | ------------ | ------------- |
| S1     | VLAN 99   | 192.168.99.1 | 255.255.255.0 |
| S2     | VLAN 99   | 192.168.99.2 | 255.255.255.0 |
| S3     | VLAN 99   | 192.168.99.3 | 255.255.255.0 |
| PC-A   | NIC       | 192.168.10.1 | 255.255.255.0 |
| PC-B   | NIC       | 192.168.20.1 | 255.255.255.0 |
| PC-C   | NIC       | 192.168.10.2 | 255.255.255.0 |

### Goals

- Configure VTP, DTP and trunk links between switches
- S2 acts as VTP server; S1 and S3 as clients
- Add VLANs and assign ports
- Configure extended-range VLANs on S1 in VTP transparent mode

---

### Part 1 — Basic device setup

1. Build the network according to the topology.

<details>
<summary>S1</summary>
<pre><code>
Enable
Configure terminal
interface vlan 1
ip address 192.168.1.1 255.255.255.0
no shutdown
exit
hostname S1
do copy run start
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S2</summary>
<pre><code>
Enable
Configure terminal
interface vlan 1
ip address 192.168.1.2 255.255.255.0
no shutdown
exit
hostname S2
do copy run start
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3</summary>
<pre><code>
Enable
Configure terminal
interface vlan 1
ip address 192.168.1.3 255.255.255.0
no shutdown
exit
hostname S3
do copy run start
end
copy running-config startup-config
</code></pre>
</details>

2. Disable DNS lookup on each switch:

```
no ip domain-lookup
```

3. Set privileged and console passwords, enable logging synchronous:

<details>
<summary>S1, S2, S3</summary>
<pre><code>
enable
configure terminal
no ip domain-lookup
enable secret cisco
line console 0
password cisco
login
logging synchronous
end
copy running-config startup-config
</code></pre>
</details>

4. Set a login banner:

<details>
<summary>S1, S2, S3</summary>
<pre><code>
enable
configure terminal
Banner motd "**This is a secure system. Authorized Access Only!
end
copy running-config startup-config
</code></pre>
</details>

---

### Part 2 — VTP configuration

<details>
<summary>S1 (client)</summary>
<pre><code>
enable
configure terminal
vtp domain CCNA
vtp password cisco
vtp version 3
vtp mode client
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S2 (server)</summary>
<pre><code>
enable
configure terminal
vtp domain CCNA
vtp password cisco
vtp version 3
vtp mode server
end
vtp primary server force
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3 (client)</summary>
<pre><code>
enable
configure terminal
vtp domain CCNA
vtp password cisco
vtp version 3
vtp mode client
end
copy running-config startup-config
</code></pre>
</details>

---

### Part 3 — DTP and trunk ports

**Dynamic trunk: S1 — S2**

Set S1's port toward S2 to `dynamic desirable`. S2 defaults to `dynamic auto` — the trunk forms automatically:

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/1
switchport trunk encapsulation dot1q
switchport mode dynamic desirable
end
copy running-config startup-config
</code></pre>
</details>

**Static trunks: S1 — S3 and S2 — S3**

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/3
switchport trunk encapsulation dot1q
switchport mode trunk
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S2</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/3
switchport trunk encapsulation dot1q
switchport mode trunk
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/1
switchport trunk encapsulation dot1q
switchport mode trunk
interface Ethernet 0/3
switchport trunk encapsulation dot1q
switchport mode trunk
end
copy running-config startup-config
</code></pre>
</details>

Verify trunks on S1:

```
show interfaces trunk
```

<details>
<summary>S1 output</summary>
<pre><code>
enable
configure terminal
Port        Mode             Encapsulation  Status        Native vlan
Et0/1       desirable        802.1q         trunking      1
Et0/3       on               802.1q         trunking      1
end
copy running-config startup-config
</code></pre>
</details>

---

### Part 4 — Create VLANs on the server

<details>
<summary>S2</summary>
<pre><code>
enable
configure terminal
vlan 10
name Red
vlan 20
name Blue
vlan 30
name Yellow
vlan 99
name Management
end
copy running-config startup-config
</code></pre>
</details>

Verify VLANs propagated to clients:

<details>
<summary>S1 — show vlan brief</summary>
<pre><code>
enable
configure terminal
VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/2
10   Red                              active
20   Blue                             active
30   Yellow                           active
99   Management                       active
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3 — show vlan brief</summary>
<pre><code>
enable
configure terminal
VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/2
10   Red                              active
20   Blue                             active
30   Yellow                           active
99   Management                       active
end
copy running-config startup-config
</code></pre>
</details>

---

### Part 5 — Assign ports to VLANs

Assign access ports and configure the Management SVI on all switches.

| Switch | Interface | VLAN | Host |
| ------ | --------- | ---- | ---- |
| S1     | Et0/0     | 10   | PC-A |
| S2     | Et0/0     | 20   | PC-B |
| S3     | Et0/0     | 10   | PC-C |

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/0
switchport mode access
switchport access vlan 10
interface vlan 99
ip address 192.168.99.1 255.255.255.0
no shutdown
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S2</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/0
switchport mode access
switchport access vlan 20
interface vlan 99
ip address 192.168.99.2 255.255.255.0
no shutdown
end
copy running-config startup-config
</code></pre>
</details>
<details>
<summary>S3</summary>
<pre><code>
enable
configure terminal
interface Ethernet 0/0
switchport mode access
switchport access vlan 10
interface vlan 99
ip address 192.168.99.3 255.255.255.0
no shutdown
end
copy running-config startup-config
</code></pre>
</details>

---

### Part 6 — Connectivity check

PC-A and PC-C are both in VLAN 10 — verify reachability:

<details>
<summary>PC-A</summary>
<pre><code>
VPCS> ping 192.168.10.2
84 bytes from 192.168.10.2 icmp_seq=1 ttl=64 time=0.506 ms
84 bytes from 192.168.10.2 icmp_seq=2 ttl=64 time=0.802 ms
84 bytes from 192.168.10.2 icmp_seq=3 ttl=64 time=0.513 ms
84 bytes from 192.168.10.2 icmp_seq=4 ttl=64 time=0.761 ms
84 bytes from 192.168.10.2 icmp_seq=5 ttl=64 time=0.880 ms
</code></pre>
</details>

Verify Management VLAN reachability from S2:

<details>
<summary>S2</summary>
<pre><code>
enable
configure terminal
S2(config-if)#do ping 192.168.99.1
Sending 5, 100-byte ICMP Echos to 192.168.99.1, timeout is 2 seconds:
.!!!!
Success rate is 80 percent (4/5), round-trip min/avg/max = 1/1/1 ms
S2(config-if)#do ping 192.168.99.2
Sending 5, 100-byte ICMP Echos to 192.168.99.2, timeout is 2 seconds:
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 4/4/4 ms
S2(config-if)#do ping 192.168.99.3
Sending 5, 100-byte ICMP Echos to 192.168.99.3, timeout is 2 seconds:
.!!!!
Success rate is 80 percent (4/5), round-trip min/avg/max = 1/1/1 ms
</code></pre>
</details>

---

### Part 7 — Extended VLAN

Extended-range VLANs (1025–4096) cannot be managed via VTP — the switch must be in transparent mode first.

Switch S1 to VTP transparent:

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
vtp mode transparent
end
copy running-config startup-config
</code></pre>
</details>

Verify:

```
show vtp status
```

<details>
<summary>S1 output</summary>
<pre><code>
enable
configure terminal
VTP Version capable             : 1 to 3
VTP version running             : 1
VTP Domain Name                 : CCNA
VTP Pruning Mode                : Disabled
VTP Traps Generation            : Disabled
Feature VLAN:
--------------
VTP Operating Mode                : Transparent
Maximum VLANs supported locally   : 255
Number of existing VLANs          : 9
Configuration Revision            : 0
end
copy running-config startup-config
</code></pre>
</details>

Create extended VLAN 2000:

<details>
<summary>S1</summary>
<pre><code>
enable
configure terminal
vlan 2000
end
</code></pre>
</details>

Verify:

```
show vlan brief
```

<details>
<summary>S1 output</summary>
<pre><code>
enable
configure terminal
VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Et0/2
10   Red                              active    Et0/0
20   Blue                             active
30   Yellow                           active
99   Management                       active
1002 fddi-default                     act/unsup
1003 trcrf-default                    act/unsup
1004 fddinet-default                  act/unsup
1005 trbrf-default                    act/unsup
2000 VLAN2000                         active
end
copy running-config startup-config
</code></pre>
</details>

---

*Network Engineer Course | Lab 01*
