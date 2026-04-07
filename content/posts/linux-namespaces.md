---
title: "Linux Namespaces"
date: 2026-03-28
description: "All 8 Linux namespace types explained with interactive examples."
tags: ["Linux", "Kernel", "Containers", "LPIC-2"]
views: 1240
icon: "🌐"
---

<div class="intro-card">
<strong>Namespaces</strong> — механизм ядра Linux, изолирующий глобальные системные ресурсы между процессами. Именно на них построены Docker, Podman и любые OCI-контейнеры. Всего <strong>8 типов</strong> — кликай карточку чтобы раскрыть детали и команды.
</div>

<div class="ns-map">
  <div class="ns-map-title">Навигация по типам</div>
  <div class="ns-map-grid" id="nsMap"></div>
</div>

## Все типы namespace

<div class="ns-grid" id="nsGrid"></div>

## Quick reference

<div class="ref-panel">
  <div class="ref-panel-head">lsns / unshare / nsenter</div>
  <div class="ref-panel-body">
    <table class="cheat-table">
      <thead><tr><th>Command</th><th>What it does</th><th>Type</th></tr></thead>
      <tbody>
        <tr><td class="mono">lsns</td><td class="desc">List all namespaces on system</td><td><span class="stag stag-proc">process</span></td></tr>
        <tr><td class="mono">unshare --uts bash</td><td class="desc">New UTS namespace</td><td><span class="stag stag-kernel">kernel</span></td></tr>
        <tr><td class="mono">unshare --pid --fork --mount-proc</td><td class="desc">New PID namespace with /proc</td><td><span class="stag stag-proc">process</span></td></tr>
        <tr><td class="mono">unshare --net bash</td><td class="desc">New network namespace</td><td><span class="stag stag-net">network</span></td></tr>
        <tr><td class="mono">unshare --user --map-root-user</td><td class="desc">Rootless user namespace</td><td><span class="stag stag-proc">process</span></td></tr>
        <tr><td class="mono">nsenter --target PID --net</td><td class="desc">Enter NET ns of process</td><td><span class="stag stag-net">network</span></td></tr>
        <tr><td class="mono">nsenter --target PID --mount bash</td><td class="desc">Enter MNT ns of process</td><td><span class="stag stag-fs">filesystem</span></td></tr>
        <tr><td class="mono">ip netns add myns</td><td class="desc">Create named network namespace</td><td><span class="stag stag-net">network</span></td></tr>
        <tr><td class="mono">readlink /proc/$$/ns/uts</td><td class="desc">Show current UTS ns inode</td><td><span class="stag stag-kernel">kernel</span></td></tr>
        <tr><td class="mono">ls -la /proc/$$/ns/</td><td class="desc">List all ns of current process</td><td><span class="stag stag-kernel">kernel</span></td></tr>
      </tbody>
    </table>
  </div>
</div>

<script>
const namespaces=[
  {name:"UTS",flag:"CLONE_NEWUTS",icon:"🖥️",color:"#00d4ff",summary:"Hostname & domain isolation",desc:"Isolates hostname and NIS domain name. Allows each container to have its own hostname without affecting the host system.",tabs:[{label:"unshare",code:`sudo unshare --uts bash\nhostname container1\nhostname\n<span class="out">container1</span>\n\n<span class="comment"># другой терминал:</span>\nhostname\n<span class="out">server01  ← не изменился</span>`},{label:"check",code:`lsns -t uts\nreadlink /proc/\$\$/ns/uts`}]},
  {name:"PID",flag:"CLONE_NEWPID",icon:"⚙️",color:"#7c3aed",summary:"Process ID isolation — PID 1 inside",desc:"First process in a new PID namespace becomes PID 1. Docker's init process is always PID 1 inside the container, even if it's PID 84521 on the host.",tabs:[{label:"unshare",code:`sudo unshare --pid --fork --mount-proc bash\nps aux\n<span class="out">PID TTY COMMAND\n  1 pts bash\n  7 pts ps aux</span>`},{label:"check",code:`lsns -t pid\ndocker inspect --format '{{.State.Pid}}' myc`}]},
  {name:"NET",flag:"CLONE_NEWNET",icon:"🌐",color:"#10b981",summary:"Network stack isolation — own interfaces",desc:"Each network namespace has its own interfaces, IP addresses, routing tables, netfilter rules, and sockets. Docker creates a veth pair — one end in container, one on host bridge.",tabs:[{label:"unshare",code:`sudo unshare --net bash\nip link\n<span class="out">1: lo: &lt;LOOPBACK&gt;</span>\n<span class="comment"># только loopback!</span>`},{label:"veth",code:`ip link add veth0 type veth peer name veth1\nip link set veth1 netns &lt;container_pid&gt;\nip addr add 172.17.0.1/16 dev veth0`}]},
  {name:"MNT",flag:"CLONE_NEWNS",icon:"📁",color:"#f59e0b",summary:"Filesystem mount isolation",desc:"The oldest namespace (Linux 2.4.19). Isolates the mount table. Each namespace has its own view of the filesystem tree. Basis for container rootfs isolation.",tabs:[{label:"unshare",code:`sudo unshare --mount bash\nmount --bind /tmp/newroot /mnt\n<span class="comment"># хост не видит это монтирование</span>`},{label:"nsenter",code:`CPID=$(docker inspect --format '{{.State.Pid}}' myc)\nsudo nsenter --target \$CPID --mount bash\nls /   <span class="out"># container rootfs</span>`}]},
  {name:"IPC",flag:"CLONE_NEWIPC",icon:"📨",color:"#f472b6",summary:"IPC objects isolation",desc:"Isolates System V IPC objects (message queues, semaphores, shared memory) and POSIX message queues.",tabs:[{label:"example",code:`ipcmk -M 1024\n<span class="out">Shared memory id: 3</span>\nsudo unshare --ipc bash\nipcs -m\n<span class="out"># (empty)</span>`},{label:"check",code:`lsns -t ipc\nipcs -a`}]},
  {name:"User",flag:"CLONE_NEWUSER",icon:"👤",color:"#818cf8",summary:"UID/GID isolation — rootless containers",desc:"The most powerful namespace. Allows an unprivileged process to get UID 0 (root) inside while remaining a regular user outside. Rootless Docker is built on this.",tabs:[{label:"example",code:`<span class="comment"># Без sudo!</span>\nunshare --user --map-root-user bash\nid\n<span class="out">uid=0(root) gid=0(root)</span>\ncat /proc/\$\$/uid_map\n<span class="out">0  1000  1</span>`},{label:"check",code:`lsns -t user\nsysctl kernel.unprivileged_userns_clone`}]},
  {name:"Cgroup",flag:"CLONE_NEWCGROUP",icon:"📊",color:"#34d399",summary:"Cgroup hierarchy isolation (4.6+)",desc:"Process inside container sees / as cgroup root instead of the full path. Prevents container escape via cgroup path enumeration.",tabs:[{label:"example",code:`cat /proc/\$\$/cgroup\n<span class="out">0::/user.slice/user-1000.slice/...</span>\nsudo unshare --cgroup bash\ncat /proc/\$\$/cgroup\n<span class="out">0::/</span>`},{label:"check",code:`lsns -t cgroup`}]},
  {name:"Time",flag:"CLONE_NEWTIME",icon:"⏱️",color:"#fb923c",summary:"Clock isolation (Linux 5.6+)",desc:"Newest namespace (2020). Useful for container live migration between hosts — the monotonic clock offset survives the transfer.",tabs:[{label:"check",code:`uname -r   <span class="out"># need 5.6+</span>\nreadlink /proc/\$\$/ns/time\nlsns -t time\ncat /proc/self/timens_offsets\n<span class="out">monotonic  0  0\nboottime   0  0</span>`}]}
];

function buildCard(ns,i){
  const tabs=ns.tabs.map((t,ti)=>`<button class="tab-btn ${ti===0?'active':''}" onclick="switchTab(event,'tab-${i}-${ti}')">${t.label}</button>`).join('');
  const contents=ns.tabs.map((t,ti)=>`<div id="tab-${i}-${ti}" class="tab-content ${ti===0?'active':''}"><div class="code-block"><div class="code-label"><span>bash</span><button class="copy-btn" onclick="copyCode(event,this)">copy</button></div><pre>${t.code}</pre></div></div>`).join('');
  return `<div class="ns-card" id="nc${i}" style="--card-color:${ns.color};animation-delay:${i*.04}s" onclick="toggleCard(this)">
    <div class="ns-header">
      <div class="ns-icon">${ns.icon}</div>
      <div class="ns-meta"><div class="ns-name">${ns.name} Namespace</div><div class="ns-flag">${ns.flag}</div></div>
      <div class="ns-summary">${ns.summary}</div>
      <div class="ns-toggle">›</div>
    </div>
    <div class="ns-body">
      <div class="ns-desc">${ns.desc}</div>
      <div class="tabs">${tabs}</div>
      ${contents}
    </div>
  </div>`;
}

document.getElementById('nsGrid').innerHTML=namespaces.map(buildCard).join('');
document.getElementById('nsMap').innerHTML=namespaces.map((n,i)=>`
  <button class="ns-map-btn" style="--c:${n.color}" id="mb${i}" onclick="jumpTo(${i})">
    <div class="ns-map-icon">${n.icon}</div>
    <div class="ns-map-name">${n.name}</div>
    <div class="ns-map-flag">${n.flag.replace('CLONE_NEW','')}</div>
  </button>`).join('');

function toggleCard(c){c.classList.toggle('active')}
function jumpTo(i){
  document.querySelectorAll('.ns-map-btn').forEach(b=>b.classList.remove('sel'));
  document.getElementById('mb'+i).classList.add('sel');
  const card=document.getElementById('nc'+i);
  card.classList.add('active');
  card.scrollIntoView({behavior:'smooth',block:'start'});
}
function switchTab(e,id){
  e.stopPropagation();
  const body=e.target.closest('.ns-body');
  body.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  body.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  e.target.classList.add('active');
  document.getElementById(id).classList.add('active');
}
function copyCode(e,btn){
  e.stopPropagation();
  const pre=btn.closest('.code-block').querySelector('pre');
  navigator.clipboard.writeText(pre.innerText).then(()=>{
    btn.textContent='ok!';btn.classList.add('copied');
    setTimeout(()=>{btn.textContent='copy';btn.classList.remove('copied')},1500);
  });
}
</script>
