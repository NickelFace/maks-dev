/* ─── DATA ──────────────────────────────────────────────── */
const NS_DATA = [
  {
    name:"UTS", flag:"CLONE_NEWUTS", icon:"🖥️", color:"#00d4ff",
    summary:"Isolates hostname and NIS domain name",
    desc:"Each process or container gets its own <strong>hostname</strong> and <strong>NIS domainname</strong> without affecting the host system. Docker uses this so each container reports its own hostname rather than the host's.",
    tabs:[
      { label:"Example", code:
`<span class="cm"># Start a new UTS namespace</span>
sudo unshare --uts bash

hostname mycontainer
hostname
<span class="out"># → mycontainer</span>

exit
hostname
<span class="out"># → original host hostname (unchanged)</span>`
      },
      { label:"Inspect", code:
`<span class="cm"># Same inode = same namespace</span>
readlink /proc/1/ns/uts
readlink /proc/$$/ns/uts

lsns -t uts`
      }
    ]
  },
  {
    name:"PID", flag:"CLONE_NEWPID", icon:"⚙️", color:"#7c3aed",
    summary:"Isolates the process ID number space",
    desc:"Processes are numbered <strong>independently starting from PID 1</strong>. The first process in the namespace becomes the <em>init</em> — if it exits, the kernel kills everything else in that namespace. From outside, processes remain visible with their real PIDs.",
    tabs:[
      { label:"Example", code:
`<span class="cm"># New PID namespace with isolated /proc</span>
sudo unshare --pid --fork --mount-proc bash

ps aux
<span class="out">USER  PID  COMMAND
root    1  bash   ← we are PID 1!
root   12  ps aux</span>

<span class="cm"># From host — real PID still visible</span>
pgrep -a bash
<span class="out">15423 bash</span>`
      },
      { label:"Inspect", code:
`lsns -t pid

<span class="cm"># Enter PID namespace of a running container</span>
CPID=$(docker inspect --format '{{.State.Pid}}' mycontainer)
sudo nsenter --target $CPID --pid -- ps aux`
      }
    ]
  },
  {
    name:"Network", flag:"CLONE_NEWNET", icon:"🌐", color:"#10b981",
    summary:"Full network stack isolation per namespace",
    desc:"Each net namespace gets its own <strong>network interfaces</strong>, routing tables, iptables/nftables rules, and sockets. Docker uses veth pairs to connect each container's isolated eth0 back to the host bridge.",
    tabs:[
      { label:"Example", code:
`sudo ip netns add mynet
sudo ip netns exec mynet bash

ip link
<span class="out">1: lo: &lt;LOOPBACK&gt; state DOWN</span>

exit
<span class="cm"># Connect host ↔ namespace via veth pair</span>
sudo ip link add veth0 type veth peer name veth1
sudo ip link set veth1 netns mynet
sudo ip addr add 10.0.0.1/24 dev veth0 && sudo ip link set veth0 up
sudo ip netns exec mynet ip addr add 10.0.0.2/24 dev veth1
sudo ip netns exec mynet ip link set veth1 up
sudo ip netns exec mynet ping 10.0.0.1`
      },
      { label:"Inspect", code:
`ip netns list
lsns -t net

<span class="cm"># Cleanup</span>
sudo ip netns delete mynet`
      }
    ]
  },
  {
    name:"Mount", flag:"CLONE_NEWNS", icon:"📁", color:"#f59e0b",
    summary:"Isolates the filesystem mount table",
    desc:"The <strong>oldest namespace</strong> (Linux 2.4.19). A process can mount/unmount filesystems without affecting other processes. Docker mounts the container's rootfs via a new mount namespace, keeping the host filesystem untouched.",
    tabs:[
      { label:"Example", code:
`sudo unshare --mount bash

mount -t tmpfs tmpfs /mnt
echo "my secret" > /mnt/file.txt
ls /mnt
<span class="out">file.txt</span>

exit
ls /mnt
<span class="out"># (empty on host — mount never leaked)</span>`
      },
      { label:"Inspect", code:
`cat /proc/$$/mountinfo
lsns -t mnt

<span class="cm"># Walk into a container's root filesystem</span>
CPID=$(docker inspect --format '{{.State.Pid}}' mycontainer)
sudo nsenter --target $CPID --mount bash
ls /   <span class="out"># → container rootfs</span>`
      }
    ]
  },
  {
    name:"IPC", flag:"CLONE_NEWIPC", icon:"📨", color:"#f472b6",
    summary:"Isolates SysV IPC and POSIX message queues",
    desc:"Isolates <strong>System V IPC objects</strong> (message queues, semaphores, shared memory segments) and POSIX message queues. Without IPC namespaces, processes in different containers could interact via shared memory keys.",
    tabs:[
      { label:"Example", code:
`ipcmk -M 1024
<span class="out">Shared memory id: 3</span>

ipcs -m
<span class="out">shmid=3 ... 1024 bytes</span>

sudo unshare --ipc bash
ipcs -m
<span class="out"># (empty — isolated IPC table)</span>`
      },
      { label:"Inspect", code:
`lsns -t ipc
ipcs -a`
      }
    ]
  },
  {
    name:"User", flag:"CLONE_NEWUSER", icon:"👤", color:"#818cf8",
    summary:"Maps UIDs/GIDs — unprivileged user can be root inside",
    desc:"The most powerful namespace. An <strong>unprivileged process</strong> can obtain UID 0 (root) inside the namespace while remaining a normal user outside. Rootless Docker/Podman is built entirely on this. No <code>sudo</code> required.",
    tabs:[
      { label:"Example", code:
`<span class="cm"># No sudo needed!</span>
unshare --user --map-root-user bash

id
<span class="out">uid=0(root) gid=0(root) groups=0(root)</span>

cat /proc/$$/uid_map
<span class="out">0  1000  1  ← inside:0 = outside:1000</span>`
      },
      { label:"Inspect", code:
`lsns -t user

<span class="cm"># Check if unprivileged user namespaces are enabled</span>
sysctl kernel.unprivileged_userns_clone
<span class="out"># 1 = enabled (Ubuntu default)</span>`
      }
    ]
  },
  {
    name:"Cgroup", flag:"CLONE_NEWCGROUP", icon:"📊", color:"#34d399",
    summary:"Hides real cgroup path — process sees its own root",
    desc:"Added in <strong>Linux 4.6</strong>. Without it, a process inside a container could read its full cgroup path (<code>/docker/abc123/...</code>), revealing that it's containerised. With a cgroup namespace it only sees <code>/</code>.",
    tabs:[
      { label:"Example", code:
`cat /proc/$$/cgroup
<span class="out">0::/user.slice/user-1000.slice/session-1.scope</span>

sudo unshare --cgroup bash
cat /proc/$$/cgroup
<span class="out">0::/   ← sees root only</span>

docker run --rm alpine cat /proc/1/cgroup
<span class="out">0::/</span>`
      },
      { label:"Inspect", code:
`lsns -t cgroup
readlink /proc/$$/ns/cgroup`
      }
    ]
  },
  {
    name:"Time", flag:"CLONE_NEWTIME", icon:"⏱️", color:"#fb923c",
    summary:"Isolates CLOCK_MONOTONIC & CLOCK_BOOTTIME (Linux 5.6+)",
    desc:"The <strong>newest namespace</strong> (Linux 5.6, March 2020). Useful for container live migration between hosts — the monotonic clock doesn't reset during transfer. <code>CLOCK_REALTIME</code> cannot be virtualised.",
    tabs:[
      { label:"Inspect", code:
`uname -r   <span class="out"># needs 5.6+</span>

readlink /proc/$$/ns/time
lsns -t time

cat /proc/self/timens_offsets
<span class="out">monotonic  0  0
boottime   0  0</span>`
      }
    ]
  }
];

const CHEAT_DATA = [
  // General — inspection and cross-namespace tools
  { cmd:"ls -la /proc/$$/ns/",                    desc:"List all namespaces of current process",           cat:"general" },
  { cmd:"lsns",                                   desc:"List all namespaces on the system",                cat:"general" },
  { cmd:"lsns -t uts",                            desc:"Filter lsns by type (uts/pid/net/mnt/ipc/user/cgroup/time)", cat:"general" },
  { cmd:"nsenter --target PID --all bash",        desc:"Enter all namespaces of a process",               cat:"general" },
  { cmd:"nsenter --target PID --uts bash",        desc:"Enter only the UTS namespace of a process",       cat:"general" },
  { cmd:"readlink /proc/PID/ns/uts",              desc:"Get namespace inode by PID (replace uts with type)", cat:"general" },
  // UTS
  { cmd:"unshare --uts bash",                     desc:"Start a new UTS namespace",                       cat:"uts"     },
  { cmd:"hostname newname",                       desc:"Change hostname inside the UTS namespace",         cat:"uts"     },
  { cmd:"lsns -t uts",                            desc:"List all UTS namespaces",                         cat:"uts"     },
  // PID
  { cmd:"unshare --pid --fork --mount-proc bash", desc:"New PID namespace with isolated /proc",           cat:"pid"     },
  { cmd:"nsenter --target PID --pid bash",        desc:"Enter PID namespace of a running process",        cat:"pid"     },
  { cmd:"lsns -t pid",                            desc:"List all PID namespaces",                         cat:"pid"     },
  // NET
  { cmd:"unshare --net bash",                     desc:"Start a new network namespace",                   cat:"net"     },
  { cmd:"ip netns add myns",                      desc:"Create a named network namespace",                cat:"net"     },
  { cmd:"ip netns exec myns bash",                desc:"Run a command inside a named network namespace",  cat:"net"     },
  { cmd:"ip netns list",                          desc:"List all named network namespaces",               cat:"net"     },
  { cmd:"ip link add veth0 type veth peer name veth1", desc:"Create a veth pair to connect namespaces",  cat:"net"     },
  { cmd:"ip link set veth1 netns myns",           desc:"Move one veth end into a network namespace",      cat:"net"     },
  { cmd:"lsns -t net",                            desc:"List all network namespaces",                     cat:"net"     },
  // MNT
  { cmd:"unshare --mount bash",                   desc:"Start a new mount namespace",                     cat:"mnt"     },
  { cmd:"mount -t tmpfs tmpfs /mnt",              desc:"Mount tmpfs (visible only in this namespace)",    cat:"mnt"     },
  { cmd:"cat /proc/$$/mountinfo",                 desc:"Show mount table for the current process",        cat:"mnt"     },
  { cmd:"nsenter --target PID --mount bash",      desc:"Enter mount namespace of a process",              cat:"mnt"     },
  { cmd:"lsns -t mnt",                            desc:"List all mount namespaces",                       cat:"mnt"     },
  // IPC
  { cmd:"unshare --ipc bash",                     desc:"Start a new IPC namespace",                       cat:"ipc"     },
  { cmd:"ipcs -a",                                desc:"Show all IPC objects (queues, semaphores, shm)",  cat:"ipc"     },
  { cmd:"ipcs -m",                                desc:"List shared memory segments",                     cat:"ipc"     },
  { cmd:"ipcmk -M 1024",                          desc:"Create a 1024-byte shared memory segment",        cat:"ipc"     },
  { cmd:"lsns -t ipc",                            desc:"List all IPC namespaces",                         cat:"ipc"     },
  // USER
  { cmd:"unshare --user --map-root-user bash",    desc:"New user namespace — become root without sudo",   cat:"user"    },
  { cmd:"id",                                     desc:"Show UID/GID (uid=0 inside user namespace)",      cat:"user"    },
  { cmd:"cat /proc/$$/uid_map",                   desc:"Show UID mapping (inside → outside)",             cat:"user"    },
  { cmd:"sysctl kernel.unprivileged_userns_clone",desc:"Check if unprivileged user namespaces are allowed", cat:"user"  },
  { cmd:"lsns -t user",                           desc:"List all user namespaces",                        cat:"user"    },
  // CGROUP
  { cmd:"unshare --cgroup bash",                  desc:"Start a new cgroup namespace",                    cat:"cgroup"  },
  { cmd:"cat /proc/$$/cgroup",                    desc:"Show cgroup path (/ inside cgroup namespace)",    cat:"cgroup"  },
  { cmd:"lsns -t cgroup",                         desc:"List all cgroup namespaces",                      cat:"cgroup"  },
  { cmd:"readlink /proc/$$/ns/cgroup",            desc:"Get cgroup namespace inode of current process",   cat:"cgroup"  },
  // TIME
  { cmd:"readlink /proc/$$/ns/time",              desc:"Get time namespace inode (kernel 5.6+)",          cat:"time"    },
  { cmd:"cat /proc/self/timens_offsets",          desc:"Show CLOCK_MONOTONIC and CLOCK_BOOTTIME offsets", cat:"time"    },
  { cmd:"lsns -t time",                           desc:"List all time namespaces",                        cat:"time"    },
  { cmd:"uname -r",                               desc:"Check kernel version (time NS needs 5.6+)",       cat:"time"    },
];

const STAG_HTML = {
  general: '<span class="stag stag-general">general</span>',
  uts:     '<span class="stag stag-uts">UTS</span>',
  pid:     '<span class="stag stag-pid">PID</span>',
  net:     '<span class="stag stag-net">NET</span>',
  mnt:     '<span class="stag stag-mnt">MNT</span>',
  ipc:     '<span class="stag stag-ipc">IPC</span>',
  user:    '<span class="stag stag-user">User</span>',
  cgroup:  '<span class="stag stag-cgroup">Cgroup</span>',
  time:    '<span class="stag stag-time">Time</span>',
};

/* ─── CARD BUILDER ──────────────────────────────────────── */
function buildCard(ns, i) {
  const tabs = ns.tabs.map((t, ti) =>
    `<button class="tab-btn ${ti===0?'active':''}" onclick="nsTabSwitch(event,'nst${i}_${ti}')">${t.label}</button>`
  ).join('');
  const contents = ns.tabs.map((t, ti) =>
    `<div id="nst${i}_${ti}" class="tab-content ${ti===0?'active':''}">
      <div class="code-block">
        <div class="code-label">
          <span>bash</span>
          <button class="copy-btn" onclick="nsCopyCode(event,this)">copy</button>
        </div>
        <pre class="ns-pre">${t.code}</pre>
      </div>
    </div>`
  ).join('');
  return `<div class="ns-card" id="nc${i}" style="--c:${ns.color};animation-delay:${i*.04}s" onclick="nsToggleCard(this)">
    <div class="ns-header">
      <div class="ns-icon">${ns.icon}</div>
      <div class="ns-meta">
        <div class="ns-name">${ns.name} Namespace</div>
        <div class="ns-flag">${ns.flag}</div>
      </div>
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

/* ─── CHEAT TABLE BUILDER ───────────────────────────────── */
function buildCheatTable(filter, tbodyId) {
  const rows = CHEAT_DATA.filter(r => filter === 'all' || r.cat === filter);
  document.getElementById(tbodyId).innerHTML = rows.map(r =>
    `<tr>
      <td class="mono">${r.cmd}</td>
      <td class="desc">${r.desc}</td>
      <td>${STAG_HTML[r.cat]}</td>
    </tr>`
  ).join('');
}

/* ─── INTERACTIONS ──────────────────────────────────────── */
function nsToggleCard(card) {
  const wasActive = card.classList.contains('active');
  card.classList.toggle('active');
  if (!wasActive) nsUpdateProgress();
}

function nsJumpTo(i) {
  document.querySelectorAll('.ns-map-btn').forEach(b => b.classList.remove('sel'));
  const mb = document.getElementById('mb' + i);
  if (mb) mb.classList.add('sel');
  const card = document.getElementById('nc' + i);
  if (!card) return;
  card.classList.add('active');
  card.scrollIntoView({ behavior:'smooth', block:'start' });
  nsUpdateProgress();
}

function nsTabSwitch(e, id) {
  e.stopPropagation();
  const body = e.target.closest('.ns-body');
  body.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  body.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  e.target.classList.add('active');
  document.getElementById(id).classList.add('active');
}

function nsCopyCode(e, btn) {
  e.stopPropagation();
  const pre = btn.closest('.code-block').querySelector('.ns-pre');
  navigator.clipboard.writeText(pre.innerText).then(() => {
    btn.textContent = 'ok!'; btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 1500);
  });
}

/* ─── PROGRESS ──────────────────────────────────────────── */
function nsUpdateProgress() {
  const opened = document.querySelectorAll('.ns-card.active').length;
  const pct    = Math.round((opened / NS_DATA.length) * 100);
  const fill   = document.getElementById('progFill');
  const txt    = document.getElementById('progTxt');
  if (fill) fill.style.width = pct + '%';
  if (txt)  txt.innerHTML = `<span>${opened} of ${NS_DATA.length} types</span><span style="color:var(--accent)">${pct}%</span>`;
}

/* ─── SCROLL PROGRESS ───────────────────────────────────── */
function nsInitScrollProgress() {
  window.addEventListener('scroll', () => {
    const main = document.querySelector('.ns-page-main');
    if (!main) return;
    const rect   = main.getBoundingClientRect();
    const total  = main.offsetHeight - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), total);
    const pct    = total > 0 ? Math.round((scrolled / total) * 100) : 0;
    const opened = document.querySelectorAll('.ns-card.active').length;
    const cardPct = Math.round((opened / NS_DATA.length) * 100);
    const combined = Math.max(pct, cardPct);
    const fill = document.getElementById('progFill');
    const txt  = document.getElementById('progTxt');
    if (fill) fill.style.width = combined + '%';
    if (txt)  txt.innerHTML = `<span>${opened} of ${NS_DATA.length} types</span><span style="color:var(--accent)">${combined}%</span>`;
  });
}

/* ─── TOC HIGHLIGHT (IntersectionObserver) ──────────────── */
function nsInitTocHighlight() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const i = entry.target.id.replace('nc', '');
        document.querySelectorAll('.toc-item').forEach(t => t.classList.remove('hl'));
        const item = document.querySelector(`.toc-item[data-idx="${i}"]`);
        if (item) item.classList.add('hl');
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.ns-card').forEach(c => observer.observe(c));
}

/* ─── INIT ──────────────────────────────────────────────── */
function nsInit() {
  // NS Map
  document.getElementById('nsMap').innerHTML = NS_DATA.map((n, i) =>
    `<button class="ns-map-btn" style="--c:${n.color}" id="mb${i}" onclick="nsJumpTo(${i})">
      <div class="ns-map-icon">${n.icon}</div>
      <div class="ns-map-name">${n.name}</div>
      <div class="ns-map-flag">${n.flag.replace('CLONE_NEW','')}</div>
    </button>`
  ).join('');

  // Cards
  document.getElementById('nsGrid').innerHTML = NS_DATA.map(buildCard).join('');

  // TOC
  document.getElementById('tocBody').innerHTML = NS_DATA.map((n, i) =>
    `<div class="toc-item" data-idx="${i}" onclick="nsJumpTo(${i})">
      <div class="toc-dot" style="background:${n.color}"></div>
      ${n.name} Namespace
    </div>`
  ).join('');

  // Cheat table
  buildCheatTable('all', 'cheatBody');

  nsInitTocHighlight();
  nsInitScrollProgress();
}

document.addEventListener('DOMContentLoaded', nsInit);