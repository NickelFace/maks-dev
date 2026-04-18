---
title: "iptables / nftables"
description: "Linux firewall: chains, tables, NAT, rule syntax"
icon: "🔥"
group: "Security"
tags: ["Security", "iptables", "nftables", "Linux", "Firewall"]
date: 2026-04-14
---

<div class="intro-card">
In-depth Linux firewall reference: <strong>iptables</strong> (rule syntax, chains, NAT, persistence) and <strong>nftables</strong> (modern syntax, migration from iptables).
</div>

<div class="cert-coming-soon" style="margin-top:32px">
  <div class="coming-icon">🚧</div>
  <div>Content in development</div>
</div>

**Planned:**
- iptables — tables (filter/nat/mangle/raw), chains, priorities
- iptables — common patterns: stateful firewall, rate limiting, port knocking
- iptables — save and restore (iptables-save/restore, netfilter-persistent)
- nftables — syntax: tables, chains, rules, sets
- nftables — iptables rule equivalents in nft
- firewalld — zones, services, rich rules, `firewall-cmd`
- Common setups: simple server firewall, NAT router, DMZ
