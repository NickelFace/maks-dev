---
title: "LPIC-1 102.6 — Linux as a Virtualization Guest"
date: 2026-04-16
description: "Hypervisor types, full/para/hybrid virtualisation, guest drivers, disk images, VM templates, cloud-init, containers. LPIC-1 exam topic 102.6."
tags: ["Linux", "LPIC-1", "Virtualization", "KVM", "cloud-init"]
categories: ["LPIC-1"]
lang_pair: "/posts/lpic1/ru/lpic1-102-6-linux-virtualization-guest/"
page_lang: "en"
---

> **Exam weight: 1** — LPIC-1 v5, Exam 101

## What you need to know

- General concepts of virtual machines and containers.
- Typical elements of a VM in an IaaS cloud: compute instances, block storage, networking.
- Which properties of a Linux system must be changed when cloning or using it as a template.
- How system images are used to deploy VMs, cloud instances and containers.
- Linux extensions for hypervisor integration (guest drivers).
- Basic understanding of cloud-init.

---

## Virtualisation overview

Virtualisation is a technology in which a special platform called a hypervisor runs processes with fully emulated computer systems. The hypervisor manages the physical resources of the host and distributes them among guest machines.

A virtual machine can be moved from one hypervisor to another. This process is called migration. Live migration is performed without stopping the guest.

### Hypervisor types

**Type-1 (bare-metal)** runs directly on hardware, with no operating system beneath it. Example: Xen.

**Type-2** requires a host operating system to run. Example: VirtualBox. KVM occupies a middle ground: technically it needs a Linux system underneath, but it integrates into the kernel and behaves like a Type-1 hypervisor.

### Common hypervisors

**Xen** — open-source Type-1 hypervisor. The computer boots directly into it.

**KVM (Kernel Virtual Machine)** — a Linux kernel module. VMs are managed through the libvirt daemon and tools like `virsh`. It uses the QEMU project for device emulation. Configurations are stored as XML files in `/etc/libvirt/qemu/`.

**VirtualBox** — popular desktop application by Oracle. Runs on Linux, macOS and Windows. Type-2 hypervisor.

---

## Types of virtual machines

### Full virtualisation

The guest (HardwareVM) is unaware that it is running inside a VM. No special drivers are needed inside the guest, so all instructions must execute directly. On the x86 platform this requires CPU extensions: Intel VT-x or AMD-V. They are enabled in BIOS/UEFI settings.

### Paravirtualisation

The guest (PVM) knows it is running in a virtual environment and uses special guest drivers to communicate with the hypervisor. The modified kernel and these drivers provide a noticeable performance gain over full virtualisation.

### Hybrid virtualisation

Combines full virtualisation and paravirtualisation. An unmodified OS runs in a fully virtual environment but uses paravirtual drivers for storage and networking. This delivers near-native performance.

---

## Guest drivers

Different hypervisors ship their own guest driver packages:

- **KVM** uses drivers from the **Virtio** project.
- **VirtualBox** provides **Guest Extensions** as a downloadable ISO image.

---

## Virtual machine storage

A virtual machine in libvirt/KVM typically consists of two parts: an XML configuration file and a disk image file. The disk image lives by default in `/var/lib/libvirt/images/`.

The guest sees the full declared disk size, even though the host may have far less space actually occupied.

### Disk image types

**COW (Copy-on-Write)** — thin provisioning. The file is created with a defined upper limit and grows on disk as data is written. The `qcow2` format is the standard COW format for QEMU/KVM.

**RAW** — the full disk size is allocated upfront. Writes are faster because the hypervisor does not need to track file expansion. Occupies more host space from the start.

---

## Working with VM templates

A template is a VM with a base system installation and pre-configured settings that is then copied to quickly deploy new guests. When cloning a template, the new guest receives a different hostname, a new MAC address for the network interface, and several other unique identifiers.

### D-Bus Machine ID

Every Linux system receives a unique machine identifier at installation time — the D-Bus Machine ID. If a VM is cloned without changing this ID, two guests will share the same identifier, leading to unpredictable behaviour.

ID file: `/var/lib/dbus/machine-id`, which is a symbolic link to `/etc/machine-id`.

Changing the ID on a running system is dangerous: instability and crashes are possible. If a new ID is needed, do it like this:

```bash
# Check that the ID exists
dbus-uuidgen --ensure

# View the current ID
dbus-uuidgen --get

# Generate a new ID (only on a powered-off or freshly cloned VM)
sudo rm -f /etc/machine-id
sudo dbus-uuidgen --ensure=/etc/machine-id
```

If `/var/lib/dbus/machine-id` is not a symbolic link to `/etc/machine-id`, it must also be removed.

### SSH Host Keys

When cloning a VM, SSH host keys must also be regenerated. If two clones share the same host keys, SSH clients will warn about a key conflict when connecting.

Host keys are stored in `/etc/ssh/` and have names like `ssh_host_*_key`.

---

## Deploying VMs in the cloud

IaaS (Infrastructure as a Service) is a model where a provider supplies infrastructure as a service. The provider runs hypervisors and provides tools for deploying guest images.

### IaaS elements

**Computing Instances** — units of CPU resource consumption. The more instances you run and the longer they run, the higher the bill.

**Block Storage** — external storage for VMs. Cost depends on volume and access speed: fast SSDs cost more, archive storage costs less.

**Networking** — configuring routing, subnets and firewalls through the provider's web interface. Many providers offer DNS, public IP addresses and hybrid VPN solutions for connecting corporate and cloud infrastructure.

### Accessing cloud guests via SSH

The primary access method for cloud guests is SSH keys. Passwords are generally not used in the cloud.

```bash
# Create a key pair (public and private)
ssh-keygen

# Copy the public key to a remote server
ssh-copy-id -i <public_key> user@cloud_server
```

If only one public key is present in `~/.ssh/`, the `-i` flag can be omitted: `ssh-copy-id` will find the `.pub` file automatically. Key file permissions: private key — `0600`, public key — `0644`.

Some cloud providers automatically generate a key pair when creating a VM and provide the private key for download.

---

## cloud-init

cloud-init is a utility for automatically configuring cloud VMs and containers on first boot. It reads YAML files in `cloud-config` format and applies settings: networking, packages, SSH keys, user accounts, locale and much more. It runs once during the initial system startup.

Example `cloud-config` file:

```yaml
#cloud-config
timezone: Africa/Dar_es_Salaam
hostname: test-system

# Update the system on first boot
apt_update: true
apt_upgrade: true

# Install the Nginx web server
packages:
  - nginx
```

The first line `#cloud-config` is mandatory; no space is allowed between `#` and `cloud-config`.

---

## Containers

A container is an isolated environment for running an application that uses only the minimum software needed to operate. Unlike a VM, the entire computer is not emulated, so overhead is significantly lower.

Containers can migrate between hosts on the fly, without stopping the application. New application versions can be deployed alongside old ones.

On Linux, containers rely on the kernel's `cgroups` (control groups) mechanism. `cgroups` allow limiting memory usage, CPU time, disk and network traffic for a specific application.

Examples of container technologies: Docker, Kubernetes, LXD/LXC, systemd-nspawn, OpenShift. Their implementation details are outside the scope of LPIC-1.

Two kinds of containers are distinguished:
- **Linux container** — isolates a system environment (LXC/LXD).
- **Application container** — runs a single application (Docker, Podman).

---

## Exam command reference

| Command | Description |
|---|---|
| `dbus-uuidgen --ensure` | Verify that the D-Bus Machine ID exists |
| `dbus-uuidgen --get` | Show the current D-Bus Machine ID |
| `dbus-uuidgen --ensure=/etc/machine-id` | Generate a new Machine ID |
| `ssh-keygen` | Create an SSH key pair |
| `ssh-copy-id -i <key> user@host` | Copy a public key to a remote host |
| `grep -E "vmx\|svm" /proc/cpuinfo` | Check whether the CPU supports hardware virtualisation |

---

## Typical exam questions

**Which CPU extensions are required for full virtualisation on x86?**
VT-x (Intel) or AMD-V (AMD).

**Where is the D-Bus Machine ID stored?**
`/var/lib/dbus/machine-id` (symlink to `/etc/machine-id`).

**What must be changed when cloning a VM?**
The D-Bus Machine ID and SSH host keys.

**Which disk format do KVM VMs use by default?**
`qcow2` (COW).

**What does cloud-init do?**
Automatically configures the system on first boot using a YAML config.

**How does a container differ from a VM?**
A container does not emulate the entire computer — it uses the host kernel and consumes fewer resources.

**Which command shows whether two clones have the same D-Bus ID?**
`dbus-uuidgen --get` (run on each machine and compare the output).

---

## Exercises

### Guided Exercises

**1. Which CPU extensions are required to run guests with full virtualisation on the x86 platform?**

<details>
<summary>Answer</summary>

Intel VT-x for Intel processors or AMD-V for AMD processors. These extensions are enabled in BIOS or UEFI settings.

</details>

---

**2. A business-critical server requires maximum performance. Which type of virtualisation does it most likely use?**

<details>
<summary>Answer</summary>

Paravirtualisation. In this case the guest OS is aware of its virtual environment and uses special software drivers to work with the hypervisor's resources. This provides a noticeable performance gain over full virtualisation.

> A paravirtualised system like Xen allows the guest to use hardware resources more efficiently precisely because of drivers designed specifically to communicate with the hypervisor.

</details>

---

**3. Two virtual machines were cloned from the same template and both use D-Bus. They behave unstably even though their hostnames and network settings differ. Which command helps check whether they have the same D-Bus Machine ID?**

<details>
<summary>Answer</summary>

```bash
dbus-uuidgen --get
```

Run this command on each machine and compare the output. If the strings match, both VMs share the same Machine ID, which is causing the problems.

</details>

---

### Explorational Exercises

**1. Check whether your CPU supports virtualisation extensions.**

<details>
<summary>Answer</summary>

```bash
grep --color -E "vmx|svm" /proc/cpuinfo
```

The output will highlight `vmx` for Intel processors with VT-x enabled, or `svm` for AMD processors with AMD-V enabled. If the output is empty, enter BIOS/UEFI and enable virtualisation support manually.

Example output on an Intel machine with VT-x enabled:

```
flags : fpu vme de pse tsc msr pae mce cx8 apic sep mtrr pge mca cmov pat pse36
clflush dts acpi mmx fxsr sse sse2 ss ht tm pbe syscall nx pdpe1gb rdtscp lm constant_tsc
art arch_perfmon pebs bts rep_good nopl xtopology nonstop_tsc cpuid aperfmperf pni
pclmulqdq dtes64 monitor ds_cpl vmx smx est tm2 ...
```

</details>

---

**2. If your CPU supports virtualisation, install the KVM hypervisor and create a test VM.**

<details>
<summary>Answer</summary>

Packages to install depend on the distribution:
- Ubuntu: `sudo apt install qemu-kvm libvirt-daemon-system virt-manager`
- Fedora: `sudo dnf install @virtualization`
- Arch Linux: `sudo pacman -S qemu libvirt virt-manager`

After installation, run `virt-manager` for a graphical interface. For command-line VM creation use `virt-install`. Try both approaches to understand how VMs are deployed.

</details>

---

## Related topics

- [101.1 Determine and Configure Hardware Settings](/posts/lpic1-101-1-hardware-settings/) — BIOS/UEFI and enabling VT-x/AMD-V
- [102.1 Design Hard Disk Layout](/posts/lpic1-102-1-hard-disk-layout/) — partition planning, including for VMs
- [102.4 Use Debian Package Management](/posts/lpic1-102-4-debian-package-management/) — installing libvirt on Debian systems

---

*LPIC-1 Study Notes | Topic 101: System Architecture*
