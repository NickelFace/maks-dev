---
title: "Process & Services"
description: "ps, top/htop, kill, nice, systemd, cron, journald"
icon: "⚙️"
group: "Linux Core"
tags: ["Linux", "systemd", "ps", "cron", "journald"]
date: 2026-04-14
---

<div class="intro-card">
Управление процессами и сервисами: мониторинг (<strong>ps, top</strong>), сигналы (<strong>kill</strong>), приоритеты (<strong>nice/renice</strong>), управление сервисами (<strong>systemctl</strong>), планировщик (<strong>cron</strong>), логи (<strong>journald</strong>).
</div>

<div class="cert-coming-soon" style="margin-top:32px">
  <div class="coming-icon">🚧</div>
  <div>Контент в разработке</div>
</div>

**Планируется:**
- `ps aux / ps -ef` — снимок процессов, фильтрация
- `top / htop` — интерактивный мониторинг, горячие клавиши
- `kill / killall / pkill` — отправка сигналов; SIGTERM vs SIGKILL
- `nice / renice` — приоритет CPU (nice -20..19)
- `systemctl` — start/stop/enable/status/mask, unit-файлы
- `journalctl` — фильтрация по unit, времени, приоритету
- `cron / crontab` — синтаксис, специальные строки (@reboot, @daily)
- `at / anacron` — разовые задачи
