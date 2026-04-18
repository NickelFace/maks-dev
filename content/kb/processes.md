---
title: "Process & Services"
description: "ps, top/htop, kill, nice, systemd, cron, journald"
icon: "⚙️"
group: "Linux Core"
tags: ["Linux", "systemd", "ps", "cron", "journald"]
date: 2026-04-14
---

<div class="intro-card">
Process and service management: monitoring (<strong>ps, top</strong>), signals (<strong>kill</strong>), priorities (<strong>nice/renice</strong>), service management (<strong>systemctl</strong>), scheduling (<strong>cron</strong>), logs (<strong>journald</strong>).
</div>

<div class="cert-coming-soon" style="margin-top:32px">
  <div class="coming-icon">🚧</div>
  <div>Content in development</div>
</div>

**Planned:**
- `ps aux / ps -ef` — process snapshot, filtering
- `top / htop` — interactive monitoring, hotkeys
- `kill / killall / pkill` — sending signals; SIGTERM vs SIGKILL
- `nice / renice` — CPU priority (nice -20..19)
- `systemctl` — start/stop/enable/status/mask, unit files
- `journalctl` — filter by unit, time, priority
- `cron / crontab` — syntax, special strings (@reboot, @daily)
- `at / anacron` — one-time tasks
