---
title: "LPIC-2 209.2 — NFS Server Configuration"
date: 2026-03-19
description: "NFSv3 architecture and daemons, /etc/exports format and options, exportfs, showmount, rpcinfo, nfsstat, client-side mounting, squashing, TCP Wrappers for NFS, NFSv4 overview. LPIC-2 exam topic 209.2."
tags: ["Linux", "LPIC-2", "NFS", "file sharing", "exports", "rpcbind"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-209-2-nfs/"
page_lang: "en"
---

> **Exam topic 209.2** — NFS Server Configuration (weight: 3). Covers NFSv3 setup, `/etc/exports` configuration, NFS utilities, client-side mounting, and access control. LPIC-2 focuses on **NFSv3**.

---

## What Is NFS

**NFS (Network File System)** is a protocol for mounting remote filesystems as local ones. The server publishes (exports) a directory; the client mounts it via the standard `mount` command.

---

## NFS Versions

| Version | Year | Protocol | Features |
|---|---|---|---|
| NFSv2 | 1989 | UDP only | 32-bit files, deprecated |
| NFSv3 | 1995 | UDP or TCP | 64-bit files, async write, weak cache consistency |
| NFSv4 | 2000/2015 | TCP (primary) | Kerberos, single port 2049, built-in locking |

NFSv3 uses **RPC (Remote Procedure Call)** for mounting, locking, and quotas — requiring multiple ports, which complicates firewall configuration.

```bash
# Disable NFSv4 on Red Hat — /etc/sysconfig/nfs
RPCNFSDARGS='--no-nfs-version 4'

# Debian — /etc/default/nfs-kernel-server
# add --no-nfs-version 4 to RPCMOUNTDOPTS

# Force NFSv3 on mount
mount -o vers=3 server:/share /mnt
```

---

## Architecture and Daemons

NFSv3 operates via a set of daemons and kernel services, all registered through the portmapper.

| Daemon | Alias | Role | Where needed |
|---|---|---|---|
| `rpc.nfsd` / `nfsd` | nfsd | Main NFS daemon, data transfer | Server |
| `rpc.mountd` | mountd | Handles mount requests | Server |
| `rpcbind` | portmapper | Maps RPC services to ports | Server and client |
| `rpc.lockd` | lockd | NLM protocol, file locking | Both (not needed in NFSv4) |
| `rpc.statd` | statd | State monitoring, lock recovery | Both |
| `rpc.rquotad` | rquotad | Quota management on exports | Server |
| `idmapd` | rpc.idmapd | UID/GID mapping by name | NFSv4 only |

```bash
# Start NFS (CentOS/RHEL)
systemctl start nfs rpcbind

# Start NFS (Debian/Ubuntu)
systemctl start nfs-kernel-server rpcbind
```

> On kernel-space NFS systems, the server appears in the process list as `[nfsd]`. On older user-space NFS systems — as `rpc.nfsd`.

---

## /etc/exports

The main NFS server configuration file. Each line is one entry:

```
/path/to/directory  client(options)  client2(options)
```

Additional `.exports` files can be placed in `/etc/exports.d/`.

### Client specification formats:

| Type | Example | Description |
|---|---|---|
| Single host | `192.168.1.10` or `client.example.com` | Single IP or FQDN |
| Subnet | `192.168.1.0/24` or `192.168.1.0/255.255.255.0` | CIDR or mask |
| Wildcard | `192.168.56.*` | IP wildcard (use carefully) |
| Domain | `*.example.com` | Hostname wildcard |
| NIS group | `@groupname` | NIS netgroup |

> **Critical syntax rule:** There must be NO space between the client name and the options parenthesis. A space turns the rest of the line into a separate rule applying to ALL hosts.
>
> Correct: `/share client(rw)`
> Wrong: `/share client (rw)` — the `(rw)` will apply to ALL hosts!

### /etc/exports options:

| Option | Description | Default |
|---|---|---|
| `ro` | Read-only | yes |
| `rw` | Read-write | no |
| `sync` | Write to disk before responding. Required for rw exports. | no |
| `async` | Don't wait for cache flush. Speeds up ro exports, dangerous for rw. | yes |
| `root_squash` | root on client maps to nobody on server | yes |
| `no_root_squash` | root on client acts as root on server | no |
| `all_squash` | All users (including root) map to nobody | no |
| `no_all_squash` | Regular users map by UID/GID | yes |
| `anonuid=N` | UID for anonymous user | 65534 |
| `anongid=N` | GID for anonymous group | 65534 |
| `subtree_check` | Checks permissions in parent directories | no |
| `no_subtree_check` | Disables subtree check. Improves reliability. | yes |
| `fsid=N` | Filesystem ID. In NFSv4, `fsid=0` or `fsid=root` = pseudo-filesystem root. | — |

```bash
# /etc/exports examples
/srv/data        192.168.1.10(rw,sync,no_root_squash)
/srv/data        192.168.1.0/24(ro,async)
/srv/public      *(ro,all_squash)
/home            client5.example.com(rw,sync,root_squash)
```

> `root_squash` is **enabled by default**. This protects against a compromised client root. `no_root_squash` is needed, for example, for NFS-based backups.

---

## Management Utilities

### exportfs

Reads `/etc/exports` and manages exports without restarting NFS.

| Command | Description |
|---|---|
| `exportfs` | Show current exports |
| `exportfs -v` | Show with detailed options |
| `exportfs -r` | Re-read /etc/exports and re-export everything |
| `exportfs -a` | Export everything from /etc/exports |
| `exportfs -u host:/path` | Unexport a specific path |
| `exportfs -ua` | Unexport all |
| `exportfs -o opts IP:/path` | Temporary export from command line |

```bash
# Apply changes in /etc/exports
exportfs -r

# Temporary export without modifying /etc/exports
exportfs -o rw,no_root_squash 192.168.1.10:/srv/temp

# Remove temporary export
exportfs -u 192.168.1.10:/srv/temp
```

Export data is stored in:
- `/var/lib/nfs/etab` — detailed list with default options
- `/var/lib/nfs/xtab` — active exports
- `/proc/fs/nfs/exports` — kernel export table

### showmount

Shows NFS server export information. Works remotely.

| Command | Description |
|---|---|
| `showmount -e` | List current exports |
| `showmount -e server` | Exports on a remote server |
| `showmount -a` | Clients and what they've mounted |
| `showmount -d` | Directories mounted by clients |
| `showmount` (no args) | Names of connected hosts |

> `showmount -e` does NOT work with NFSv4 servers. Use `exportfs -v` instead.

### rpcinfo

Queries the portmapper and checks RPC services.

```bash
# List all registered RPC services
rpcinfo -p

# Query a remote server
rpcinfo -p server

# Check NFS availability via UDP (null request)
rpcinfo -u server nfs

# Check via TCP
rpcinfo -t server nfs
```

> portmapper listens on port **111**; nfsd listens on port **2049**.

### nfsstat

Shows NFS client and server statistics from `/proc/net/rpc/`.

| Flag | Description |
|---|---|
| `nfsstat -s` | Server statistics |
| `nfsstat -c` | Client statistics |
| `nfsstat -n` | NFS statistics (without RPC) |
| `nfsstat -r` | RPC statistics |
| `nfsstat -sn` | Server NFS statistics only |
| `nfsstat -cn` | Client NFS statistics only |

---

## Mounting on the Client

### Temporary mount:

```bash
mkdir /mnt/nfs_share
mount -t nfs -o vers=3 192.168.1.100:/srv/data /mnt/nfs_share
```

### Permanent mount via /etc/fstab:

```
192.168.1.100:/srv/data  /mnt/nfs_share  nfs  ro,hard,intr,bg  0  0
```

### Client mount options:

| Option | Description |
|---|---|
| `ro` / `rw` | Read-only / read-write |
| `hard` | On server unavailability — infinite retries (default) |
| `soft` | On unavailability — return error after timeout |
| `intr` | Allow interrupting a hung mount (Ctrl+C) |
| `nointr` | Disallow interruption |
| `bg` | Retry mounting in background |
| `fg` | All retries in foreground (default) |
| `tcp` | Use TCP (recommended) |
| `udp` | Use UDP |
| `vers=3` | Force NFSv3 |
| `rsize=N` | Read block size in bytes |
| `wsize=N` | Write block size in bytes |
| `noatime` | Don't update atime on reads |
| `nosuid` | Ignore SUID/SGID bits on mounted FS |
| `noexec` | Prevent executing binaries |
| `port=N` | Specify NFS server port |

> Recommended combination: `hard,intr,bg` — mount doesn't hang permanently but keeps retrying.

### Checking mounted NFS resources:

```bash
cat /proc/mounts              # all mounted filesystems
cat /var/lib/nfs/rmtab        # clients and their mounts (server-side)
showmount -a                  # clients with mount paths
```

---

## NFS Security

NFSv3 uses two mechanisms: `/etc/exports` entries (who can mount what) and AUTH_SYS/AUTH_UNIX (client sends UID/GID — easy to spoof).

### Recommendations:

Use TCP instead of UDP:
```bash
mount -o tcp server:/share /mnt
```

Avoid wildcards in `/etc/exports` — specify individual IPs.

Apply squashing for public exports:
```bash
/srv/public  192.168.1.0/24(ro,sync,all_squash,anonuid=65534,anongid=65534)
```

Check ports with firewall:
```bash
rpcinfo -p    # see all NFS ports
```

---

## TCP Wrappers for NFS

TCP Wrappers control service access via `/etc/hosts.allow` and `/etc/hosts.deny`. Check order: `hosts.allow` first, then `hosts.deny`.

```bash
# Check if a daemon supports TCP Wrappers
ldd /sbin/rpcbind | grep libwrap
# libwrap.so.0 => ... means supported

ldd /sbin/rpc.nfsd | grep libwrap
# empty = rpc.nfsd doesn't directly support TCP Wrappers
```

Format:
```
daemon: client_list
```

```bash
# /etc/hosts.deny — block everything
portmap: ALL
mountd: ALL
statd: ALL

# /etc/hosts.allow — allow specific hosts
portmap: 192.168.1.10, 192.168.1.20
mountd: 192.168.1.0/255.255.255.0
statd: .example.com

# Subnet with mask
portmap: 192.168.24.16/255.255.255.248

# Whole domain
portmap: .example.com

# NIS group
portmap: @workstations
```

> No restart needed after changing `hosts.allow` and `hosts.deny` — changes take effect immediately.

> Strategy: deny all in `hosts.deny` (`portmap: ALL`), then allow specific hosts in `hosts.allow`.

---

## NFSv4 — Brief Overview

The exam requires **awareness**, not deep knowledge.

Key differences from NFSv3:
- Single fixed port **2049** (instead of multiple dynamic ports)
- TCP by default
- Built-in file locking (NLM not needed)
- Kerberos for authentication and encryption
- Pseudo-filesystem — client sees exports as a single tree
- `idmapd` for UID/GID mapping by name
- portmapper (rpcbind) not required (but may be present for compatibility)

```bash
# In NFSv4 /etc/exports, use fsid=0 (or fsid=root) for the pseudo-FS root
/exports        192.168.1.0/24(rw,sync,fsid=0,no_subtree_check)
/exports/data   192.168.1.0/24(rw,sync,fsid=1,no_subtree_check)
```

---

## Exam Cheat Sheet

### Key Files

| File/Path | Purpose |
|---|---|
| `/etc/exports` | NFS server export configuration |
| `/etc/exports.d/*.exports` | Additional export files |
| `/etc/fstab` | Permanent NFS mounts on client |
| `/etc/hosts.allow` | TCP Wrappers — allowed hosts |
| `/etc/hosts.deny` | TCP Wrappers — denied hosts |
| `/var/lib/nfs/etab` | Detailed export table with default options |
| `/var/lib/nfs/xtab` | Active exports |
| `/var/lib/nfs/rmtab` | Current clients and mounted paths |
| `/proc/fs/nfs/exports` | Kernel export table |
| `/proc/mounts` | All mounted filesystems |

### Key Commands

```bash
exportfs -r                                    # apply /etc/exports
exportfs -v                                    # show exports with details
exportfs -o rw 192.168.1.10:/srv/data          # temporary export
exportfs -ua                                   # unexport all
showmount -e                                   # list exports (NFSv3 only)
rpcinfo -p                                     # list RPC services and ports
nfsstat -sn                                    # server NFS statistics
mount -t nfs -o vers=3,tcp server:/path /mnt   # mount NFSv3 with TCP
cat /proc/mounts                               # check mounted filesystems
```

### Common Exam Pitfalls

| Pitfall | Rule |
|---|---|
| `root_squash` | Enabled by **default** — `no_root_squash` must be explicit |
| `sync` | NOT default — must be specified for rw exports |
| Space before `(` in /etc/exports | Critical error — opens access to ALL hosts |
| `showmount -e` with NFSv4 | Doesn't work — use `exportfs -v` |
| portmapper port | **111** |
| nfsd port | **2049** |
| TCP Wrappers | Apply to `rpcbind`, not directly to `rpc.nfsd` |
| Filesystem type in /etc/fstab | `nfs`, not `nfs3` |
| NFSv4 pseudo-FS root | `fsid=0` or `fsid=root` |
