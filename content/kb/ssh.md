---
title: "SSH & Tunnels"
description: "ssh_config, ключи, туннели, ProxyJump, agent forwarding, scp/rsync"
icon: "🔑"
group: "Security"
tags: ["SSH", "Security", "Linux", "Tunnels"]
date: 2026-04-14
---

<div class="intro-card">
Справочник SSH: <strong>управление ключами, ~/.ssh/config, туннели (L/R/D), ProxyJump, agent forwarding, scp, rsync</strong>. Безопасная настройка sshd.
</div>

<div class="cert-coming-soon" style="margin-top:32px">
  <div class="coming-icon">🚧</div>
  <div>Контент в разработке</div>
</div>

**Планируется:**
- Ключи — `ssh-keygen` (ed25519, rsa), `ssh-copy-id`, `authorized_keys`
- ~/.ssh/config — Host, User, IdentityFile, Port, ProxyJump, LocalForward
- Туннели — `-L` (local), `-R` (remote), `-D` (dynamic/SOCKS5)
- ProxyJump / ProxyCommand — прыжки через бастион
- Agent forwarding — `ssh-add`, `ssh-agent`, `ForwardAgent`
- scp / sftp — копирование файлов
- rsync — синхронизация, `-avz --delete`, `--exclude`
- sshd_config — безопасная конфигурация: PermitRootLogin, PubkeyAuthentication, AllowUsers
- Мультиплексирование — ControlMaster, ControlPath, ControlPersist
