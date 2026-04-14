---
title: "iptables / nftables"
description: "Файрвол Linux: цепочки, таблицы, NAT, синтаксис правил"
icon: "🔥"
group: "Security"
tags: ["Security", "iptables", "nftables", "Linux", "Firewall"]
date: 2026-04-14
---

<div class="intro-card">
Углублённый справочник по файрволу Linux: <strong>iptables</strong> (синтаксис правил, цепочки, NAT, сохранение) и <strong>nftables</strong> (современный синтаксис, миграция с iptables).
</div>

<div class="cert-coming-soon" style="margin-top:32px">
  <div class="coming-icon">🚧</div>
  <div>Контент в разработке</div>
</div>

**Планируется:**
- iptables — таблицы (filter/nat/mangle/raw), цепочки, приоритеты
- iptables — конкретные паттерны: stateful firewall, rate limiting, port knocking
- iptables — сохранение и восстановление (iptables-save/restore, netfilter-persistent)
- nftables — синтаксис: tables, chains, rules, sets
- nftables — аналоги iptables-правил в nft
- firewalld — zones, services, rich rules, `firewall-cmd`
- Типичные схемы: simple server firewall, NAT router, DMZ
