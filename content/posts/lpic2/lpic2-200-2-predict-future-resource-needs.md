---
title: "LPIC-2 200.2 — Predict Future Resource Needs"
date: 2025-07-27
description: "Capacity planning, monitoring tools (collectd, Nagios, Icinga2, MRTG, Cacti), growth prediction, and resource exhaustion. LPIC-2 exam topic 200.2."
tags: ["Linux", "Performance", "LPIC-2", "Monitoring", "Nagios", "Icinga2", "collectd", "Cacti", "MRTG"]
categories: ["LPIC-2"]
lang_pair: "/posts/lpic2/ru/lpic2-200-2-predict-future-resource-needs/"
page_lang: "en"
---

> **Exam weight: 2 points** out of the total 8 for section 200 Capacity Planning.

**Goal:** Candidates must be able to monitor resource usage to **predict future system needs**.

| Area | Description |
|---|---|
| Infrastructure monitoring | Using measurement tools to oversee IT infrastructure |
| Saturation point | Predicting the **capacity break point** of a configuration |
| Growth rate | Observing the rate of increase in resource usage |
| Trend visualisation | Plotting resource usage trends |
| Tools | Icinga2, Nagios, collectd, MRTG, Cacti |

---

## Diagnosing Resource Usage

Diagnosis is the first step before any prediction. It builds on the tools covered in topic 200.1.

### Key tool — sar

`sar` (System Activity Reporter) is one of the most important tools because it **records measurements over long periods**, making accumulated data available for **trend analysis**.

```bash
# Show CPU usage for today (every 10 minutes)
sar

# Show CPU usage: 4 samples at 1-second intervals
sar 1 4

# Show memory usage
sar -r

# Show disk activity
sar -d

# Show network statistics
sar -n DEV
```

Data is collected by **`sadc`** (System Activity Data Collector) and stored in `/var/log/sa/` as `saDD` (DD = day of the month).

- **`sa1`** — saves data to a binary file (run from `cron`)
- **`sa2`** — creates a daily report from `sa1` data (run from `cron`)

```bash
# Enable sadc on Debian/Ubuntu
/etc/default/sysstat    # set ENABLE="true"

# Configure sadc on RHEL/CentOS
/etc/sysconfig/sysstat  # SADC_OPTIONS="-S DISK"
```

### Establishing a baseline

Before diagnosing a problem, establish a **baseline** — the "normal" behaviour of the system when working correctly. If a resource reaches **100% utilisation**, the source of the problem is obvious, but pinpointing it may require additional analysis.

Supporting diagnostic utilities:

```bash
top        # interactive process and resource monitoring
vmstat     # virtual memory statistics
iostat     # disk I/O statistics
netstat    # network connections and statistics
```

---

## Monitoring IT Infrastructure

**Capacity planning** is the formal name for the process of forecasting resource needs.

### Capacity planning steps

```
1. Understand the current needs of system users
2. Monitor current resource usage
3. Gather information about future directions and expected needs
4. Make decisions and predictions based on collected data
```

> **Warning:** Accurate forecasting requires **documented evidence** of both current resource usage and its **rate of growth over time**. Without this data, any forecast will be wildly inaccurate.

### Monitoring solution architecture

```
┌─────────────────┐         ┌──────────────────┐
│  Collector      │  ──────►│  Presentation    │
│  (Data Logger)  │         │  (Visualization) │
│                 │         │                  │
│  collectd       │         │  Cacti           │
│  MRTG           │         │  MRTG HTML       │
│  sadc/sar       │         │  Nagios UI       │
└─────────────────┘         └──────────────────┘
```

Monitoring solutions fall into two roles:

- **Collector** — collects and logs metrics
- **Presentation** — builds graphs and dashboards

Many products combine both roles or are designed to work together.

---

## Monitoring Tools

### collectd

**collectd** is a daemon that periodically collects system performance statistics.

```
Purpose:       Collect system metrics (CPU, memory, disk, network, etc.)
Language:      C (portability, high performance)
Config file:   /etc/collectd/collectd.conf  (or /etc/collectd.conf)
Key feature:   Runs WITHOUT cron or scripting languages — suitable for embedded systems
```

> **Important:** collectd only collects data. **collectd does NOT display** the collected data — you need additional tools for visualisation (e.g. Cacti, Grafana, RRDTool).

```bash
# Install (Debian/Ubuntu)
apt install collectd

# Main configuration file
/etc/collectd/collectd.conf

# Start / check status
systemctl start collectd
systemctl status collectd
```

#### collectd configuration — loading plugins

```apache
# /etc/collectd/collectd.conf

# Data collection interval (seconds)
Interval 10

# Load plugins
LoadPlugin cpu
LoadPlugin memory
LoadPlugin disk
LoadPlugin interface
LoadPlugin load
LoadPlugin df
LoadPlugin network    # for remote hosts

# Network plugin configuration (send data to a server)
<Plugin network>
    Server "monitoring.example.com" "25826"
</Plugin>
```

> **Tip:** The key directive is `LoadPlugin`. It defines **what** collectd will collect. Without loading a plugin, no data is gathered for that metric.

---

### Nagios and Icinga2

#### Nagios

```
Type:      Network and host monitoring system
Editions:  Nagios Core (FOSS) / Nagios XI (commercial)
Features:
  - Monitor systems, network devices, and services
  - Custom checks via plugins
  - Failure notifications
```

**Key Nagios paths:**

```
/etc/nagios/               # main configuration directory
/etc/nagios/nagios.cfg     # main config file
/etc/nagios/objects/       # host and service definitions
/usr/lib/nagios/plugins/   # check plugins
/var/log/nagios/nagios.log # log file
```

```bash
# Validate configuration
nagios -v /etc/nagios/nagios.cfg

# Start
systemctl start nagios
```

#### Icinga2

> **Note:** Icinga2 is a **fork of Nagios Core** with extended functionality: a DSL configuration language, clustering support, and the modern Icinga Web 2 interface.

```
Type:    Monitoring system (Nagios fork)
Config:  /etc/icinga2/icinga2.conf
Objects: /etc/icinga2/conf.d/
Log:     /var/log/icinga2/icinga2.log
```

```icinga2
# Example host definition in Icinga2
object Host "web-server" {
    address = "192.168.1.10"
    check_command = "hostalive"
}

# Example service check
object Service "http" {
    host_name = "web-server"
    check_command = "http"
}
```

---

### MRTG

**MRTG** (Multi Router Traffic Grapher) — collects and visualises network traffic.

```
Full name:     Multi Router Traffic Grapher
Language:      Perl (portability)
Purpose:       Collect and graph network traffic (SNMP)
Output:        HTML pages with dynamic graphs
Compatibility: Works with RRDTool
```

```bash
# Install
apt install mrtg

# Generate a base configuration via cfgmaker
cfgmaker public@router.example.com > /etc/mrtg/mrtg.cfg

# Generate an HTML report
indexmaker /etc/mrtg/mrtg.cfg > /var/www/html/mrtg/index.html

# Run (usually from cron every 5 minutes)
mrtg /etc/mrtg/mrtg.cfg
```

> **Tip:** MRTG uses **SNMP** to poll network devices. It can graph almost any metric exposed by network equipment.

---

### Cacti

**Cacti** is a metric visualisation solution built on RRDTool.

```
Type:          Presentation software (frontend to RRDTool)
Database:      MySQL
Frontend:      PHP
Speciality:    Network traffic graphs + templates for any metric
Compatibility: MRTG graphs, RRDTool
```

> **Note:** Cacti supports using data collected by MRTG in its own graphs. This allows combining MRTG data collection with Cacti's rich visualisation.

### Tool comparison

| Tool | Type | Language | Speciality | Data storage |
|---|---|---|---|---|
| **collectd** | Collector | C | System metrics | RRD/files |
| **Nagios Core** | Monitor + Alert | C | Hosts/services | Files |
| **Icinga2** | Monitor + Alert | C++ | Hosts/services (Nagios fork) | DB/files |
| **MRTG** | Collector + Presenter | Perl | Network traffic (SNMP) | RRD/HTML |
| **Cacti** | Presenter | PHP | Graphs (RRDTool frontend) | MySQL |

---

## Predicting Growth

By analysing accumulated monitoring data, you can **statistically forecast growth** in resource needs.

> **Warning:** Forecasting is called **statistical** because real-world needs are influenced by external factors. For example, email reduced demand for fax machines and phone lines. Growth is not always linear — when infrastructure expands, different services grow at different rates.

### Prediction algorithm

```
Step 1: Determine what to measure
        └─► CPU, RAM, disk, network, I/O...

Step 2: Choose appropriate tools to measure and record data
        └─► sar, collectd, Nagios, MRTG, Cacti...

Step 3: Analyse the measurement results
        └─► Start with the largest fluctuations

Step 4: Predict future needs based on the analysis
        └─► Extrapolate the trend → capacity break point
```

### Capacity break point

```
Current usage + growth rate → predicted date of resource exhaustion

Example: disk is 70% full, growing at 5% per month
         → in ~6 months the disk will be 100% full (break point)
```

**Key terms for the exam:**

- **capacity break point** — the moment a resource can no longer handle the load
- **growth rate** — the rate of increase in resource usage
- **trend graph** — a graph for visualising the forecast
- **baseline** — the "normal" behaviour reference line

---

## Resource Exhaustion

**Resource exhaustion** is the state when a resource **cannot service requests** normally. Supply and demand are out of sync.

### Consequences

```
Resource Exhaustion
       │
       ├──► Denial of Service (DoS)
       │
       └──► "fail open" vulnerability:
            Devices in "fail open" mode can be
            compromised through deliberate resource exhaustion
```

> **Warning — real example: ARP flood on switches.** Some **network switches** transition to **"fail open"** mode when their ARP table overflows and start **forwarding all traffic to all ports** (flooding), effectively turning from a switch into a hub. This allows an attacker to intercept other users' traffic (passive sniffing).

### Bottleneck

> **Important:** A **bottleneck** is the single point in the system that limits throughput and **slows everything else down**. Resource exhaustion of one component is typically visible in the collected monitoring data.

```
System with a bottleneck:

  [CPU 30%] → [RAM 40%] → [DISK I/O 100% ← BOTTLENECK] → [NET 20%]
                                    ↑
                          All flow "stalls" here
```

> **Warning:** Eliminating one bottleneck does not fully solve the problem. Once a specific bottleneck is removed (e.g. replacing a disk), **the next most loaded component becomes the new constraint**. Therefore, during analysis it is important to identify **as many potential bottlenecks as possible at once**, not just the most obvious one.

```
Before disk replacement:          After disk replacement:
[CPU 30%]                         [CPU 95% ← new BOTTLENECK]
[RAM 40%]                         [RAM 40%]
[DISK 100% ← bottleneck]          [DISK 50%]
                                       ↑
                      The problem shifted, it didn't disappear
```

### Typical exhaustion scenarios

| Resource | Symptom | Diagnostic tool |
|---|---|---|
| CPU | 100% load, service degradation | `top`, `sar -u`, `uptime` |
| RAM | swap overflow, OOM killer | `free`, `vmstat`, `sar -r` |
| Disk | no space for writes, service failures | `df`, `iostat`, `sar -d` |
| Network | packet loss, high latency | `netstat`, `sar -n DEV` |
| File descriptors | "too many open files" | `lsof`, `ulimit -n` |
| Inodes | no room for new files | `df -i` |
| ARP table | switch → flood mode (fail open) | `arp -n`, `ip neigh` |

---

## Exam Cheat Sheet

### Key Commands

```bash
sar                          # view historical CPU data
sar -r                       # memory statistics
sar -d                       # disk statistics
sar -n DEV                   # network statistics
sar 1 5                      # 5 samples at 1-second intervals

# sar data storage:
/var/log/sa/saDD             # binary files (DD = day of month)
/etc/default/sysstat         # sysstat config (Debian): ENABLE="true"
/etc/sysconfig/sysstat       # sysstat config (RHEL)

# collectd
/etc/collectd/collectd.conf  # main config
LoadPlugin cpu               # key directive for loading a plugin
systemctl start collectd

# MRTG
cfgmaker public@router > /etc/mrtg/mrtg.cfg
mrtg /etc/mrtg/mrtg.cfg

# Nagios
/etc/nagios/nagios.cfg
nagios -v /etc/nagios/nagios.cfg   # validate config

# Icinga2
/etc/icinga2/icinga2.conf
```

### Tool Summary

```
collectd  → daemon, C, system metrics, /etc/collectd/collectd.conf
Cacti     → PHP frontend, MySQL, RRDTool, network traffic
MRTG      → Perl, SNMP, network traffic, HTML pages
Nagios    → host/service monitoring, Core (FOSS) + XI (commercial)
Icinga2   → Nagios fork, DSL config, /etc/icinga2/
sar/sadc  → built into Linux, /var/log/sa/, historical data
```

### Common Exam Traps

1. **collectd** — **collects** data only, no visualisation
2. **Cacti** — **visualisation only** (frontend), does not collect data
3. **MRTG** — specialises in **network traffic** (not system metrics)
4. **Icinga2** — is a **fork of Nagios**, not a product built from scratch
5. collectd config: the key directive is `LoadPlugin`, not `Plugin` or `Enable`
6. `sar` data is stored in `/var/log/sa/`, not `/var/log/sysstat/`

---

## Practice Questions

**Q1.** Which tool is a C daemon that collects performance statistics but **does not display** them?

**Answer:** `collectd`

---

**Q2.** In which directory does `sadc` store collected data by default?

**Answer:** `/var/log/sa/`

---

**Q3.** What is the formal name for the process of predicting future resource needs?

**Answer:** **Capacity planning**

---

**Q4.** Which tool is a frontend to RRDTool, uses MySQL for storage, and PHP for its web interface?

**Answer:** **Cacti**

---

**Q5.** What happens to a "fail open" device when its resources are exhausted?

**Answer:** The device starts passing all traffic/requests without inspection, which can be exploited as an attack vector (bypassing protection).

---

**Q6.** Which tool is a Nagios fork with DSL configuration support and clustering?

**Answer:** **Icinga2**

---

**Q7.** List the four steps of the algorithm for predicting future resource needs.

**Answer:**
1. Determine what to measure
2. Choose appropriate tools to measure and record data
3. Analyse the results (starting with the largest fluctuations)
4. Predict future needs based on the analysis

---

**Q8.** Which directive in `collectd.conf` is responsible for loading data collection plugins?

**Answer:** `LoadPlugin` (e.g. `LoadPlugin cpu`, `LoadPlugin memory`)

---

**Q9.** What is a **bottleneck** and why does eliminating it not always solve the problem?

**Answer:** A bottleneck is the single point in the system that limits throughput and slows everything else. After eliminating one bottleneck, **the next most loaded component becomes the new constraint**. Therefore, you should identify as many potential bottlenecks as possible during analysis, not just the most obvious one.

---

**Q10.** How does a network switch behave when its ARP table overflows, and why is this dangerous?

**Answer:** The switch enters **"fail open"** mode and starts forwarding traffic **to all ports** (flooding), turning from a switch into a hub. An attacker on the same network can then **intercept other users' traffic** (passive sniffing).
