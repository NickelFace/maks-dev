---
title: "SSH & Tunnels"
description: "ssh_config, keys, tunnels, ProxyJump, agent forwarding, scp/rsync"
icon: "🔑"
group: "Security"
tags: ["SSH", "Security", "Linux", "Tunnels"]
date: 2026-04-14
---

<div class="intro-card">
SSH reference: <strong>key management, ~/.ssh/config, tunnels (L/R/D), ProxyJump, agent forwarding, scp, rsync</strong>. Secure sshd configuration.
</div>

<div class="cert-coming-soon" style="margin-top:32px">
  <div class="coming-icon">🚧</div>
  <div>Content in development</div>
</div>

**Planned:**
- Keys — `ssh-keygen` (ed25519, rsa), `ssh-copy-id`, `authorized_keys`
- ~/.ssh/config — Host, User, IdentityFile, Port, ProxyJump, LocalForward
- Tunnels — `-L` (local), `-R` (remote), `-D` (dynamic/SOCKS5)
- ProxyJump / ProxyCommand — hopping through a bastion host
- Agent forwarding — `ssh-add`, `ssh-agent`, `ForwardAgent`
- scp / sftp — file transfer
- rsync — sync, `-avz --delete`, `--exclude`
- sshd_config — secure configuration: PermitRootLogin, PubkeyAuthentication, AllowUsers
- Multiplexing — ControlMaster, ControlPath, ControlPersist
