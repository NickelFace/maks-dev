---
title: "CCNA 200-301 — Preparation Guide"
date: 2026-03-01
description: "Complete resource list for CCNA 200-301 exam preparation: books, video courses, practice labs, exam tips and registration."
tags: ["Networking", "CCNA", "Cisco", "Certification"]
categories: ["CCNA"]
---

> Exam code: **200-301** · Current version: **v1.1** (2024) · Duration: **120 min** · Passing score: ~825/1000

## Exam Domains

| Domain | Weight |
|---|---|
| 1. Network Fundamentals | 20% |
| 2. Network Access | 20% |
| 3. IP Connectivity | 25% |
| 4. IP Services | 10% |
| 5. Security Fundamentals | 15% |
| 6. Automation and Programmability | 10% |

Official exam topics (PDF): [200-301-CCNA-v1.1.pdf](https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf)

---

## Books

### Official Cert Guide (Wendell Odom) — recommended

The de facto standard. Two volumes, covers all exam domains in depth.

- **Volume 1** — Network Fundamentals, Network Access, IP Connectivity
- **Volume 2** — IP Services, Security, Automation, full exam review

Latest edition: **v1.1 (2024)** — updated for the current exam version.

- [Cisco Press — Official Cert Guide Library (v1.1)](https://www.ciscopress.com/store/ccna-200-301-official-cert-guide-library-premium-edition-9780138221447)
- [Amazon](https://www.amazon.com/CCNA-200-301-Official-Cert-Guide/dp/0135792738)

> Each chapter ends with a review quiz. Use these consistently — do not skip.

### 31 Days Before Your CCNA Exam

Compact review book. Best used in the final month before the exam as a structured refresher. Shared in the community chat as `Book 31days before exam.pdf`.

### All Cheat Sheets

Community-assembled cheat sheet collection covering subnetting, protocol summaries, and CLI commands. Shared in the chat as `All Cheat Sheets.pdf`.

---

## Video Courses

### Jeremy's IT Lab (YouTube) — free, highly recommended

Full 200-301 coverage, clear explanations, free on YouTube. Mentioned by the community as the go-to resource.

Search: **"Jeremy's IT Lab CCNA"** on YouTube.

### CiscoStr (Danil) — Russian-language course

Structured paid course by an experienced instructor. Free YouTube recordings available:

- [YouTube playlist (2020 recording)](https://www.youtube.com/playlist?list=PLHpWwR6fSBN76MvCxsfJwOnsQIloB3-Mo)
- [CiscoStr website](https://ciscostr.ru)

### Cisco NetAcad — free self-paced

Three official Cisco courses covering the full 200-301 syllabus:

1. **CCNA: Introduction to Networks**
2. **CCNA: Switching, Routing, and Wireless Essentials**
3. **CCNA: Enterprise Networking, Security, and Automation**

Registration: [netacad.com](https://www.netacad.com) · Module exams at the end of each section mirror the real exam format.

### CBT Nuggets

Paid, professional-quality video course. Good for visual learners who prefer a structured paid option.

---

## Practice Labs

### Cisco Packet Tracer — recommended for beginners

Free simulator from Cisco. No hardware required. Download via:

- [netacad.com/courses/packet-tracer](https://www.netacad.com/courses/packet-tracer)

Covers ~90% of what you need for the exam. The community recommends starting here before moving to GNS3 or EVE-NG.

> Packet Tracer labs (`.pka` files) from the course cover: static routing, VLANs, OSPF, IPv6, EtherChannel, wireless.

### EVE-NG / GNS3 — advanced

Full network emulators that run real Cisco IOS images.

- [EVE-NG community edition](https://www.eve-ng.net) — free
- [Cisco DevNet Sandboxes](https://developer.cisco.com/site/sandbox/) — free cloud labs, no local install required

> **Community warning:** EVE-NG can behave unexpectedly. Beginners may confuse emulator bugs with configuration mistakes. Stick with Packet Tracer until you have a solid foundation.

### Cisco DevNet Sandboxes

Free cloud-hosted lab environments. Covers more than EVE-NG for certain scenarios.

- [developer.cisco.com/site/sandbox/](https://developer.cisco.com/site/sandbox/)

---

## Exam Prep & Practice Tests

### ExamTopics

Large question bank with community discussions on each question. Good for understanding why an answer is correct.

- [examtopics.com](https://www.examtopics.com)

### ITExams

Another practice question database:

- [itexams.com/exam/200-301](https://www.itexams.com/exam/200-301)

### 9tut

Practice questions including IPv6 section:

- [9tut.com](https://www.9tut.com)

### Boson ExSim

Paid practice exam simulator. High-quality questions that closely match the real exam difficulty.

### Anki Flashcards

Spaced repetition is effective for memorising commands, protocol timers, and port numbers.

- Download Anki: [apps.ankiweb.net](https://apps.ankiweb.net)
- CCNA deck: [ankiweb.net/shared/info/591991787](https://ankiweb.net/shared/info/591991787)

---

## Exam Registration

### Pearson VUE

CCNA is delivered through Pearson VUE — both in-person testing centres and online proctored.

- [home.pearsonvue.com/cisco.aspx](https://home.pearsonvue.com/cisco.aspx)

### Extra time for non-native English speakers

You can request **+30 minutes** of additional time if English is not your first language.

- [Request accommodation](https://www.pearsonvue.com/accommodations/pv_review.asp?clientName=Cisco%20Systems)
- Or via: [Cisco Learning Network discussion](https://learningnetwork.cisco.com/s/question/0D56e0000D6DrnJCQS/ccna-200301-non-native-english-speaker-extra-time)

### Required documents

Bring **2 forms of ID** to the testing centre (required per Pearson VUE policy):
- Foreign passport (primary)
- Second ID (national ID, driver's license)

---

## Key Topics to Focus On

Based on community experience:

**Must know:**
- **Binary and hex math** — subnetting by hand, IPv6 prefix calculations
- **OSPF** — single-area and multi-area, neighbour states, LSA types
- **BGP basics** — eBGP, iBGP neighbour relationships, attributes
- **VLANs and trunking** — 802.1Q, DTP, VTP, inter-VLAN routing
- **STP / RSTP** — port states, port roles, topology changes (STP is still in 200-301 despite rumours)
- **ACLs** — standard, extended, named; wildcard masks
- **NAT/PAT** — static, dynamic, overload
- **Wireless** — 802.11 standards, WLC, lightweight APs
- **Automation** — REST API, JSON, Python basics, DNA Center, SD-WAN/SD-Access overview

**Common pitfalls:**
- The official course (NetAcad) does not cover 100% of exam questions — supplement with OCG
- EVE-NG glitches can mislead beginners; use Packet Tracer for initial labs
- IPv6 gets a dedicated section — don't skip it

---

## Study Plan (rough timeline)

| Phase | Duration | Focus |
|---|---|---|
| Foundation | 4–6 weeks | Domains 1–2: Fundamentals, switching |
| Core | 6–8 weeks | Domains 3–4: Routing, IP services |
| Security + Automation | 2–3 weeks | Domains 5–6 |
| Review | 3–4 weeks | Practice exams, weak areas, cheat sheets |
| Final sprint | 1 month | "31 Days Before" book, Anki, daily practice tests |

---

## Useful Links

| Resource | URL |
|---|---|
| Cisco official certifications | [cisco.com/training-certifications](https://www.cisco.com/c/en/us/training-events/training-certifications/certifications.html) |
| Cisco Learning Network | [learningnetwork.cisco.com](https://learningnetwork.cisco.com) |
| Exam topics PDF | [200-301-CCNA-v1.1.pdf](https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf) |
| NetAcad | [netacad.com](https://www.netacad.com) |
| Packet Tracer download | [netacad.com/courses/packet-tracer](https://www.netacad.com/courses/packet-tracer) |
| Pearson VUE | [home.pearsonvue.com/cisco.aspx](https://home.pearsonvue.com/cisco.aspx) |
| ExamTopics | [examtopics.com](https://www.examtopics.com) |
| Anki (flashcards) | [apps.ankiweb.net](https://apps.ankiweb.net) |
| CCNA Anki deck | [ankiweb.net/shared/info/591991787](https://ankiweb.net/shared/info/591991787) |
| Cisco DevNet Sandboxes | [developer.cisco.com/site/sandbox/](https://developer.cisco.com/site/sandbox/) |

---

*Based on community experience from the CiscoStr Telegram group.*
