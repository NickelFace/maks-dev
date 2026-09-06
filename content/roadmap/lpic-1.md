---
title: "LPIC-1 Roadmap"
description: "LPIC-1: exam domains, topics and progress tracker"
page_lang: "en"
lang_pair: "/roadmap/ru/lpic-1/"
cert_link: "/certs/lpic-1/"
cert_name: "LPIC-1"
store_key: "rdm.lpic-1"
total: 44
total_label: "topics"
default_checked: true
---

<div class="rdm-eyebrow">§ LPIC-1 · Linux Professional Institute</div>
<h1 class="rdm-h1">Linux <em>admin foundations.</em></h1>
<p class="rdm-lead">44 topics across 2 exams, with maks.top write-ups. Tick boxes as you go; progress is saved in your browser.</p>

<div class="overall-progress">
<div class="op-header">
<span class="op-title">Overall progress</span>
<span class="op-count" id="op-count">44 / 44 topics · 100%</span>
</div>
<div class="op-bar"><div class="op-fill" id="op-fill" style="width:100%"></div></div>
</div>

<div class="quick-links">
<a href="/certs/lpic-1/" class="ql-btn">🐧 LPIC-1 cert page</a>
<a href="/tags/lpic-1/" class="ql-btn">📚 LPIC-1 articles</a>
</div>

<hr class="rdm-divider">

<div class="rdm-section-label">Exam domains</div>

<div class="rdm-section-label" style="margin-top:24px">Exam 101: Hardware · Boot · CLI · Filesystems</div>

<div class="domain"><details open>
<summary class="domain-header"><span class="domain-num">101</span><span class="domain-name">System Architecture</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" id="t101-bar" style="width:100%"></span></span><span class="dpb-text" id="t101-txt">3/3</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item done" data-key="l1-101-1"><input type="checkbox" checked class="topic-cb" data-key="l1-101-1" data-domain="t101"><a href="/posts/lpic1/lpic1-101-1-hardware-settings/" class="topic-link">101.1 Hardware Settings: BIOS/UEFI, IRQ, DMA, /sys, /proc, lsmod</a><span class="topic-tag">101.1</span></div>
<div class="topic-item done" data-key="l1-101-2"><input type="checkbox" checked class="topic-cb" data-key="l1-101-2" data-domain="t101"><a href="/posts/lpic1/lpic1-101-2-boot-the-system/" class="topic-link">101.2 Boot the System: GRUB2, kernel parameters, init sequence</a><span class="topic-tag">101.2</span></div>
<div class="topic-item done" data-key="l1-101-3"><input type="checkbox" checked class="topic-cb" data-key="l1-101-3" data-domain="t101"><a href="/posts/lpic1/lpic1-101-3-runlevels-boot-targets/" class="topic-link">101.3 Runlevels / Boot Targets: SysV vs systemd targets, runlevel commands</a><span class="topic-tag">101.3</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">102</span><span class="domain-name">Linux Installation & Package Management</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" id="t102-bar" style="width:100%"></span></span><span class="dpb-text" id="t102-txt">5/5</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item done" data-key="l1-102-1"><input type="checkbox" checked class="topic-cb" data-key="l1-102-1" data-domain="t102"><a href="/posts/lpic1/lpic1-102-1-hard-disk-layout/" class="topic-link">102.1 Hard Disk Layout: MBR vs GPT, partitions, swap, LVM basics</a><span class="topic-tag">102.1</span></div>
<div class="topic-item done" data-key="l1-102-3"><input type="checkbox" checked class="topic-cb" data-key="l1-102-3" data-domain="t102"><a href="/posts/lpic1/lpic1-102-3-shared-libraries/" class="topic-link">102.3 Shared Libraries: ldd, ldconfig, LD_LIBRARY_PATH</a><span class="topic-tag">102.3</span></div>
<div class="topic-item done" data-key="l1-102-4"><input type="checkbox" checked class="topic-cb" data-key="l1-102-4" data-domain="t102"><a href="/posts/lpic1/lpic1-102-4-debian-package-management/" class="topic-link">102.4 Debian Package Management: dpkg, apt, apt-get</a><span class="topic-tag">102.4</span></div>
<div class="topic-item done" data-key="l1-102-5"><input type="checkbox" checked class="topic-cb" data-key="l1-102-5" data-domain="t102"><a href="/posts/lpic1/lpic1-102-5-rpm-yum-package-management/" class="topic-link">102.5 RPM / YUM / DNF Package Management</a><span class="topic-tag">102.5</span></div>
<div class="topic-item done" data-key="l1-102-6"><input type="checkbox" checked class="topic-cb" data-key="l1-102-6" data-domain="t102"><a href="/posts/lpic1/lpic1-102-6-linux-virtualization-guest/" class="topic-link">102.6 Linux Virtualization Guest: KVM, containers, cloud-init</a><span class="topic-tag">102.6</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">103</span><span class="domain-name">GNU and Unix Commands</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" id="t103-bar" style="width:100%"></span></span><span class="dpb-text" id="t103-txt">8/8</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item done" data-key="l1-103-1"><input type="checkbox" checked class="topic-cb" data-key="l1-103-1" data-domain="t103"><a href="/posts/lpic1/lpic1-103-1-work-on-command-line/" class="topic-link">103.1 Work on the Command Line: bash, history, variables, aliases</a><span class="topic-tag">103.1</span></div>
<div class="topic-item done" data-key="l1-103-2"><input type="checkbox" checked class="topic-cb" data-key="l1-103-2" data-domain="t103"><a href="/posts/lpic1/lpic1-103-2-text-filters/" class="topic-link">103.2 Text Filters: cat, head, tail, grep, sort, uniq, wc, tr, cut</a><span class="topic-tag">103.2</span></div>
<div class="topic-item done" data-key="l1-103-3"><input type="checkbox" checked class="topic-cb" data-key="l1-103-3" data-domain="t103"><a href="/posts/lpic1/lpic1-103-3-basic-file-management/" class="topic-link">103.3 Basic File Management: ls, cp, mv, rm, mkdir, find, tar, gzip</a><span class="topic-tag">103.3</span></div>
<div class="topic-item done" data-key="l1-103-4"><input type="checkbox" checked class="topic-cb" data-key="l1-103-4" data-domain="t103"><a href="/posts/lpic1/lpic1-103-4-streams-pipes-redirects/" class="topic-link">103.4 Streams, Pipes & Redirects: stdin/stdout/stderr, >, >>, |, tee</a><span class="topic-tag">103.4</span></div>
<div class="topic-item done" data-key="l1-103-5"><input type="checkbox" checked class="topic-cb" data-key="l1-103-5" data-domain="t103"><a href="/posts/lpic1/lpic1-103-5-processes/" class="topic-link">103.5 Processes: ps, top, kill, signals, nice, jobs, bg, fg</a><span class="topic-tag">103.5</span></div>
<div class="topic-item done" data-key="l1-103-6"><input type="checkbox" checked class="topic-cb" data-key="l1-103-6" data-domain="t103"><a href="/posts/lpic1/lpic1-103-6-process-priorities/" class="topic-link">103.6 Process Priorities: nice, renice, ionice</a><span class="topic-tag">103.6</span></div>
<div class="topic-item done" data-key="l1-103-7"><input type="checkbox" checked class="topic-cb" data-key="l1-103-7" data-domain="t103"><a href="/posts/lpic1/lpic1-103-7-regular-expressions/" class="topic-link">103.7 Regular Expressions: regex, grep -E, sed, awk basics</a><span class="topic-tag">103.7</span></div>
<div class="topic-item done" data-key="l1-103-8"><input type="checkbox" checked class="topic-cb" data-key="l1-103-8" data-domain="t103"><a href="/posts/lpic1/lpic1-103-8-basic-file-editing/" class="topic-link">103.8 Basic File Editing: vi/vim commands, nano</a><span class="topic-tag">103.8</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">104</span><span class="domain-name">Devices, Linux Filesystems, FHS</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" id="t104-bar" style="width:100%"></span></span><span class="dpb-text" id="t104-txt">6/6</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item done" data-key="l1-104-1"><input type="checkbox" checked class="topic-cb" data-key="l1-104-1" data-domain="t104"><a href="/posts/lpic1/lpic1-104-1-partitions-filesystems/" class="topic-link">104.1 Partitions & Filesystems: fdisk, parted, mkfs, ext4/xfs/btrfs</a><span class="topic-tag">104.1</span></div>
<div class="topic-item done" data-key="l1-104-2"><input type="checkbox" checked class="topic-cb" data-key="l1-104-2" data-domain="t104"><a href="/posts/lpic1/lpic1-104-2-filesystem-integrity/" class="topic-link">104.2 Filesystem Integrity: fsck, e2fsck, df, du</a><span class="topic-tag">104.2</span></div>
<div class="topic-item done" data-key="l1-104-3"><input type="checkbox" checked class="topic-cb" data-key="l1-104-3" data-domain="t104"><a href="/posts/lpic1/lpic1-104-3-mounting/" class="topic-link">104.3 Mounting: mount, umount, /etc/fstab, UUID</a><span class="topic-tag">104.3</span></div>
<div class="topic-item done" data-key="l1-104-5"><input type="checkbox" checked class="topic-cb" data-key="l1-104-5" data-domain="t104"><a href="/posts/lpic1/lpic1-104-5-file-permissions/" class="topic-link">104.5 File Permissions: chmod, chown, SUID/SGID/Sticky, umask, ACL</a><span class="topic-tag">104.5</span></div>
<div class="topic-item done" data-key="l1-104-6"><input type="checkbox" checked class="topic-cb" data-key="l1-104-6" data-domain="t104"><a href="/posts/lpic1/lpic1-104-6-links/" class="topic-link">104.6 Hard & Symbolic Links: ln, inode, differences</a><span class="topic-tag">104.6</span></div>
<div class="topic-item done" data-key="l1-104-7"><input type="checkbox" checked class="topic-cb" data-key="l1-104-7" data-domain="t104"><a href="/posts/lpic1/lpic1-104-7-find-fhs/" class="topic-link">104.7 Find Files & FHS: find, locate, updatedb, the FHS standard</a><span class="topic-tag">104.7</span></div>
</div>
</details></div>

<div class="rdm-section-label" style="margin-top:24px">Exam 102: Shell · GUI · Users · System · Network · Security</div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">105</span><span class="domain-name">Shells and Shell Scripting</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" id="t105-bar" style="width:100%"></span></span><span class="dpb-text" id="t105-txt">5/5</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item done" data-key="l1-105-1-1"><input type="checkbox" checked class="topic-cb" data-key="l1-105-1-1" data-domain="t105"><a href="/posts/lpic1/lpic1-105-1-1-shell-environment/" class="topic-link">105.1 Shell Environment: PATH, export, env, source, .bashrc, .profile</a><span class="topic-tag">105.1</span></div>
<div class="topic-item done" data-key="l1-105-1-2"><input type="checkbox" checked class="topic-cb" data-key="l1-105-1-2" data-domain="t105"><a href="/posts/lpic1/lpic1-105-1-2-shell-variables/" class="topic-link">105.1 Shell Variables: $VAR, ${VAR}, special vars: $?, $$, $!, $#</a><span class="topic-tag">105.1+</span></div>
<div class="topic-item done" data-key="l1-105-1-3"><input type="checkbox" checked class="topic-cb" data-key="l1-105-1-3" data-domain="t105"><a href="/posts/lpic1/lpic1-105-1-3-aliases-functions/" class="topic-link">105.1 Aliases & Functions: alias, unalias, function syntax</a><span class="topic-tag">105.1+</span></div>
<div class="topic-item done" data-key="l1-105-2-1"><input type="checkbox" checked class="topic-cb" data-key="l1-105-2-1" data-domain="t105"><a href="/posts/lpic1/lpic1-105-2-1-scripts/" class="topic-link">105.2 Shell Scripts (Part 1): shebang, conditions, loops, test</a><span class="topic-tag">105.2</span></div>
<div class="topic-item done" data-key="l1-105-2-2"><input type="checkbox" checked class="topic-cb" data-key="l1-105-2-2" data-domain="t105"><a href="/posts/lpic1/lpic1-105-2-2-scripts/" class="topic-link">105.2 Shell Scripts (Part 2): functions, arrays, case, read</a><span class="topic-tag">105.2+</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">106</span><span class="domain-name">User Interfaces and Desktops</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" id="t106-bar" style="width:100%"></span></span><span class="dpb-text" id="t106-txt">3/3</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item done" data-key="l1-106-1"><input type="checkbox" checked class="topic-cb" data-key="l1-106-1" data-domain="t106"><a href="/posts/lpic1/lpic1-106-1-x11/" class="topic-link">106.1 X Window System: X11, Wayland, display managers</a><span class="topic-tag">106.1</span></div>
<div class="topic-item done" data-key="l1-106-2"><input type="checkbox" checked class="topic-cb" data-key="l1-106-2" data-domain="t106"><a href="/posts/lpic1/lpic1-106-2-desktops/" class="topic-link">106.2 Graphical Desktops: GNOME, KDE, Xfce, remote desktop</a><span class="topic-tag">106.2</span></div>
<div class="topic-item done" data-key="l1-106-3"><input type="checkbox" checked class="topic-cb" data-key="l1-106-3" data-domain="t106"><a href="/posts/lpic1/lpic1-106-3-accessibility/" class="topic-link">106.3 Accessibility: orca, brltty, visual settings</a><span class="topic-tag">106.3</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">107</span><span class="domain-name">Administrative Tasks</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" id="t107-bar" style="width:100%"></span></span><span class="dpb-text" id="t107-txt">3/3</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item done" data-key="l1-107-1"><input type="checkbox" checked class="topic-cb" data-key="l1-107-1" data-domain="t107"><a href="/posts/lpic1/lpic1-107-1-users/" class="topic-link">107.1 User & Group Management: useradd, usermod, groupadd, passwd, /etc/passwd</a><span class="topic-tag">107.1</span></div>
<div class="topic-item done" data-key="l1-107-2"><input type="checkbox" checked class="topic-cb" data-key="l1-107-2" data-domain="t107"><a href="/posts/lpic1/lpic1-107-2-scheduling/" class="topic-link">107.2 Scheduling Tasks: cron, crontab, at, anacron, systemd timers</a><span class="topic-tag">107.2</span></div>
<div class="topic-item done" data-key="l1-107-3"><input type="checkbox" checked class="topic-cb" data-key="l1-107-3" data-domain="t107"><a href="/posts/lpic1/lpic1-107-3-localisation/" class="topic-link">107.3 Localisation: locale, timezone, timedatectl, iconv</a><span class="topic-tag">107.3</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">108</span><span class="domain-name">Essential System Services</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" id="t108-bar" style="width:100%"></span></span><span class="dpb-text" id="t108-txt">4/4</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item done" data-key="l1-108-1"><input type="checkbox" checked class="topic-cb" data-key="l1-108-1" data-domain="t108"><a href="/posts/lpic1/lpic1-108-1-time/" class="topic-link">108.1 System Time: hwclock, timedatectl, NTP, chrony</a><span class="topic-tag">108.1</span></div>
<div class="topic-item done" data-key="l1-108-2"><input type="checkbox" checked class="topic-cb" data-key="l1-108-2" data-domain="t108"><a href="/posts/lpic1/lpic1-108-2-logging/" class="topic-link">108.2 System Logging: syslog, rsyslog, journald, logrotate</a><span class="topic-tag">108.2</span></div>
<div class="topic-item done" data-key="l1-108-3"><input type="checkbox" checked class="topic-cb" data-key="l1-108-3" data-domain="t108"><a href="/posts/lpic1/lpic1-108-3-mta/" class="topic-link">108.3 MTA Basics: Postfix, sendmail, mail aliases, nullmailer</a><span class="topic-tag">108.3</span></div>
<div class="topic-item done" data-key="l1-108-4"><input type="checkbox" checked class="topic-cb" data-key="l1-108-4" data-domain="t108"><a href="/posts/lpic1/lpic1-108-4-printing/" class="topic-link">108.4 Printing: CUPS, lpr, lpq, lprm, PPD</a><span class="topic-tag">108.4</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">109</span><span class="domain-name">Networking Fundamentals</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" id="t109-bar" style="width:100%"></span></span><span class="dpb-text" id="t109-txt">4/4</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item done" data-key="l1-109-1"><input type="checkbox" checked class="topic-cb" data-key="l1-109-1" data-domain="t109"><a href="/posts/lpic1/lpic1-109-1-internet-protocols/" class="topic-link">109.1 Internet Protocols: TCP/IP, IPv4/IPv6, ports, ICMP</a><span class="topic-tag">109.1</span></div>
<div class="topic-item done" data-key="l1-109-2"><input type="checkbox" checked class="topic-cb" data-key="l1-109-2" data-domain="t109"><a href="/posts/lpic1/lpic1-109-2-network-config/" class="topic-link">109.2 Network Configuration: ip, ifconfig, nmcli, /etc/network/interfaces</a><span class="topic-tag">109.2</span></div>
<div class="topic-item done" data-key="l1-109-3"><input type="checkbox" checked class="topic-cb" data-key="l1-109-3" data-domain="t109"><a href="/posts/lpic1/lpic1-109-3-troubleshooting/" class="topic-link">109.3 Network Troubleshooting: ping, traceroute, netstat, ss, tcpdump</a><span class="topic-tag">109.3</span></div>
<div class="topic-item done" data-key="l1-109-4"><input type="checkbox" checked class="topic-cb" data-key="l1-109-4" data-domain="t109"><a href="/posts/lpic1/lpic1-109-4-dns/" class="topic-link">109.4 DNS Client: /etc/resolv.conf, /etc/hosts, dig, nslookup, host</a><span class="topic-tag">109.4</span></div>
</div>
</details></div>

<div class="domain"><details>
<summary class="domain-header"><span class="domain-num">110</span><span class="domain-name">Security</span><span class="domain-prog-bar"><span class="dpb-track"><span class="dpb-fill" id="t110-bar" style="width:100%"></span></span><span class="dpb-text" id="t110-txt">3/3</span></span><span class="domain-arrow">›</span></summary>
<div class="domain-body">
<div class="topic-item done" data-key="l1-110-1"><input type="checkbox" checked class="topic-cb" data-key="l1-110-1" data-domain="t110"><a href="/posts/lpic1/lpic1-110-1-security-admin/" class="topic-link">110.1 Security Administration: su, sudo, /etc/sudoers, PAM basics, ulimit</a><span class="topic-tag">110.1</span></div>
<div class="topic-item done" data-key="l1-110-2"><input type="checkbox" checked class="topic-cb" data-key="l1-110-2" data-domain="t110"><a href="/posts/lpic1/lpic1-110-2-host-security/" class="topic-link">110.2 Host Security: iptables basics, xinetd/inetd, SSH hardening</a><span class="topic-tag">110.2</span></div>
<div class="topic-item done" data-key="l1-110-3"><input type="checkbox" checked class="topic-cb" data-key="l1-110-3" data-domain="t110"><a href="/posts/lpic1/lpic1-110-3-encryption/" class="topic-link">110.3 Encryption: GPG, openssl, LUKS, symmetric/asymmetric</a><span class="topic-tag">110.3</span></div>
</div>
</details></div>

