---
title: "Cisco IOS — General Commands"
description: "Essential Cisco IOS commands: modes, interfaces, routing, CDP/LLDP, file operations"
icon: "📋"
group: "Networking"
tags: ["Cisco", "IOS", "commands", "general", "CDP", "LLDP", "TCAM"]
date: 2026-04-22
---

<div class="intro-card">
Essential Cisco IOS command reference: <strong>exec modes, interface config, static routes, CDP/LLDP, file operations, hardware diagnostics</strong>, and common troubleshooting commands.
</div>

## Basic Navigation and Modes

<div class="ref-panel">
<div class="ref-panel-head">Modes and Basic Config</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">enable</td><td class="desc">Enter privileged exec mode</td></tr>
<tr><td class="mono">configure terminal</td><td class="desc">Enter global configuration mode</td></tr>
<tr><td class="mono">end</td><td class="desc">Exit to privileged exec</td></tr>
<tr><td class="mono">hostname switch1</td><td class="desc">Set device hostname</td></tr>
<tr><td class="mono">copy running-config startup-config</td><td class="desc">Save config (also: write)</td></tr>
<tr><td class="mono">configure replace nvram:startup-config</td><td class="desc">Fully replace running-config with startup-config (unlike copy, does not merge)</td></tr>
<tr><td class="mono">service compress-config</td><td class="desc">Compress running-config when saving to NVRAM</td></tr>
<tr><td class="mono">logging synchronous</td><td class="desc">Hold log messages until current command output finishes</td></tr>
<tr><td class="mono">no service config</td><td class="desc">Suppress "Error opening tftp://…" messages on boot (takes effect after reload)</td></tr>
</tbody>
</table>
</div>
</div>

---

## Interfaces

<div class="ref-panel">
<div class="ref-panel-head">Interface Configuration</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">interface fastethernet 0/0</td><td class="desc">Enter interface configuration</td></tr>
<tr><td class="mono">interface range fastethernet 0/0 - 3</td><td class="desc">Configure multiple interfaces at once</td></tr>
<tr><td class="mono">ip address 192.168.0.1 255.255.255.0</td><td class="desc">Set IP address</td></tr>
<tr><td class="mono">ip address dhcp</td><td class="desc">Get IP via DHCP</td></tr>
<tr><td class="mono">shutdown</td><td class="desc">Disable interface (no shutdown to enable)</td></tr>
<tr><td class="mono">no switchport</td><td class="desc">Put switch port into routed (L3) mode</td></tr>
<tr><td class="mono">ip proxy-arp</td><td class="desc">Enable Proxy ARP on interface</td></tr>
</tbody>
</table>
</div>
</div>

---

## Routing

<div class="ref-panel">
<div class="ref-panel-head">Static Routes and DNS</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">ip route 192.168.30.0 255.255.255.0 192.168.20.50</td><td class="desc">Add static route</td></tr>
<tr><td class="mono">ip name-server 192.168.0.1</td><td class="desc">Set DNS server</td></tr>
<tr><td class="mono">no ip cef</td><td class="desc">Disable Cisco Express Forwarding globally</td></tr>
<tr><td class="mono">no ip route-cache cef</td><td class="desc">Disable CEF on a specific interface</td></tr>
</tbody>
</table>
</div>
</div>

---

## CDP and LLDP

<div class="ref-panel">
<div class="ref-panel-head">CDP / LLDP</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show cdp neighbors</td><td class="desc">List directly connected Cisco devices</td></tr>
<tr><td class="mono">cdp timer 5</td><td class="desc">Send CDP packets every 5 seconds</td></tr>
<tr><td class="mono">cdp holdtime 10</td><td class="desc">Declare neighbor dead after 10 s without CDP</td></tr>
<tr><td class="mono">no cdp run</td><td class="desc">Disable CDP globally</td></tr>
<tr><td class="mono">lldp run</td><td class="desc">Enable LLDP globally</td></tr>
<tr><td class="mono">lldp enable</td><td class="desc">Enable LLDP on interface</td></tr>
<tr><td class="mono">show lldp neighbors</td><td class="desc">List neighbors discovered via LLDP</td></tr>
</tbody>
</table>
</div>
</div>

---

## Show / Diagnostics

<div class="ref-panel">
<div class="ref-panel-head">Interface and Routing Diagnostics</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show running-config</td><td class="desc">Active configuration</td></tr>
<tr><td class="mono">show startup-config</td><td class="desc">Saved configuration (used on next reboot)</td></tr>
<tr><td class="mono">show ip interface brief</td><td class="desc">All interfaces with IP addresses and status</td></tr>
<tr><td class="mono">show ip interface fa0/0</td><td class="desc">Interface Layer 3 detail (IP, ACL, etc.)</td></tr>
<tr><td class="mono">show interface fa0/0</td><td class="desc">Interface Layer 2 detail (errors, encapsulation)</td></tr>
<tr><td class="mono">show interface status</td><td class="desc">Status of all switch ports</td></tr>
<tr><td class="mono">show ip route</td><td class="desc">Routing table</td></tr>
<tr><td class="mono">show ip arp</td><td class="desc">ARP table (IP ↔ MAC)</td></tr>
<tr><td class="mono">show mac address-table int fa0/1</td><td class="desc">MAC addresses seen on fa0/1</td></tr>
<tr><td class="mono">show logging</td><td class="desc">Recent syslog messages</td></tr>
<tr><td class="mono">terminal monitor</td><td class="desc">Send console messages (including debug) to SSH/Telnet session</td></tr>
<tr><td class="mono">show control-plane host open-ports</td><td class="desc">Open TCP/UDP ports on the device</td></tr>
<tr><td class="mono">show processes cpu</td><td class="desc">CPU utilization per process</td></tr>
<tr><td class="mono">debug ip nat</td><td class="desc">Real-time NAT debug (may overload CPU — use carefully)</td></tr>
</tbody>
</table>
</div>
</div>

---

## Hardware and Flash

<div class="ref-panel">
<div class="ref-panel-head">Hardware Diagnostics</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">show flash:</td><td class="desc">Flash memory contents and free space</td></tr>
<tr><td class="mono">show file system</td><td class="desc">Available flash and NVRAM space</td></tr>
<tr><td class="mono">show memory</td><td class="desc">RAM usage</td></tr>
<tr><td class="mono">show license</td><td class="desc">Installed IOS licenses</td></tr>
<tr><td class="mono">show platform tcam utilization</td><td class="desc">Remaining TCAM capacity (routes, ACLs, QoS entries)</td></tr>
<tr><td class="mono">show sdm prefer</td><td class="desc">Current SDM template (how TCAM is allocated)</td></tr>
<tr><td class="mono">sdm prefer dual-ipv4-and-ipv6 default</td><td class="desc">Switch TCAM allocation to support both IPv4 and IPv6</td></tr>
</tbody>
</table>
</div>
</div>

---

## File Operations

<div class="ref-panel">
<div class="ref-panel-head">Config Backup / Restore</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">copy startup-config ftp://user:pass@172.10.1.2/backup.txt</td><td class="desc">Back up startup-config to FTP</td></tr>
<tr><td class="mono">copy ftp://user:pass@172.10.1.2/backup.txt startup-config</td><td class="desc">Restore startup-config from FTP</td></tr>
</tbody>
</table>
</div>
</div>

---

## Interface Speed & Duplex

<div class="ref-panel">
<div class="ref-panel-head">Duplex Negotiation Matrix</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Local \ Remote</th><th>Half</th><th>Full</th><th>Auto</th></tr></thead>
<tbody>
<tr><td class="mono">Half</td><td class="desc">Half ✓</td><td class="desc">⚠️ duplex mismatch</td><td class="desc">Half</td></tr>
<tr><td class="mono">Full</td><td class="desc">⚠️ duplex mismatch</td><td class="desc">Full ✓</td><td class="desc">Full ✓</td></tr>
<tr><td class="mono">Auto</td><td class="desc">Half</td><td class="desc">Full ✓</td><td class="desc">Full ✓ (best negotiated)</td></tr>
</tbody>
</table>

> **Important:** if one side has speed fixed to anything other than Auto and duplex is set to Full — auto-negotiation is disabled. The other side will not negotiate and may default to Half, causing a duplex mismatch.
</div>
</div>

<div class="ref-panel">
<div class="ref-panel-head">Speed & Duplex Commands</div>
<div class="ref-panel-body">
<table class="cheat-table">
<thead><tr><th>Command</th><th>Description</th></tr></thead>
<tbody>
<tr><td class="mono">speed 100</td><td class="desc">Force interface speed to 100 Mbps</td></tr>
<tr><td class="mono">speed auto</td><td class="desc">Auto-negotiate speed (default)</td></tr>
<tr><td class="mono">duplex full</td><td class="desc">Force full duplex</td></tr>
<tr><td class="mono">duplex auto</td><td class="desc">Auto-negotiate duplex (default)</td></tr>
<tr><td class="mono">show int fa0/1</td><td class="desc">Check current speed and duplex settings</td></tr>
</tbody>
</table>
</div>
</div>

---

*Cisco IOS Command Reference | General*
