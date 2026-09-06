---
title: "Release notes · 2026 W36"
date: 2026-09-06
description: "Thirty-six CCNA labs rebuilt around a collapsible per-device step, a troubleshooting section organised by symptom, eleven interactive trainers, and a light theme for code blocks."
tags: ["Site", "CCNA", "Release"]
categories: ["Site"]
page_lang: "en"
---

This is the first of these. The site has grown past the point where changes
announce themselves, so from here there is a note each week saying what landed
and, where it is interesting, why it was built that way.

## CCNA labs: 36, rebuilt

The lab section was 24 walkthroughs that had accumulated rather than been
planned. It is now **36 labs in blueprint order**, merged from Jeremy's IT Lab
and the Flackbox lab guide so that between them every 200-301 topic that can be
practised has a lab. Old URLs are aliased, so nothing that was bookmarked
breaks.

The structural change matters more than the count. A lab used to be one long
page you read. It is now a sequence of **collapsible steps, one per device**:

- open a step, and you get only that device's configuration — the commands to
  type, in order, with the prompt showing which mode each one belongs to;
- every part ends with a **verification block** — the `show` command that
  proves the step worked, and the output you should be looking at;
- `expand all` / `collapse all` sit above the first step, and a link to a
  heading inside a collapsed step opens it on the way past.

The point is that you can work a lab with the page beside a terminal and never
scroll past a command meant for a different router.

## Troubleshooting: a new section

Twenty pages, organised the way a fault actually arrives — by symptom, not by
protocol. Seven units: method and tools, physical and data link, switching,
routing, IP services, IPv6, and security and filtering.

Each page leads with the symptom, then the cause, then the command that
distinguishes it from the cause that looks identical. Some of what is in there
is the sort of thing that only gets written down after it has cost someone an
afternoon — OSPF stuck in 2-WAY between two DROTHERs is normal and not a fault;
EIGRP's AS-number mismatch is the one adjacency failure that logs nothing at
all; a redistributed route into EIGRP without a seed metric is discarded in
silence.

It lives under CCNA, at [/troubleshooting/](/troubleshooting/).

## Trainers: eleven interactive pieces

Reading about subnetting and doing subnetting in forty seconds are different
skills, and only one of them is on the exam. [/trainers/](/trainers/) now has:

- **five drills** — subnetting, masks and wildcards, binary conversion, powers
  of two, and MAC learning and flooding, all scored and keyboard-driven;
- **four animations** — OSPF LSA flooding, multi-area LSA types, the adjacency
  state machine, and a packet-level walk of a DNS lookup;
- **two tools** — an IP calculator with a live bitmap, and an 802.11 standards
  reference.

Everything runs in the browser. Nothing is sent anywhere and nothing is stored.
There is also a link to [ccna.maks.top](https://ccna.maks.top/), the exam
trainer, which is a separate application with a weighted question bank.

## Diagrams: labels that stopped colliding

Worth writing down because the bug was more general than it looked. Two labs had
overlapping text in their topology diagrams. The cause was not those two labs —
it was that a link label is drawn at the midpoint of its line, and on a
**vertical** link that midpoint lands exactly where the upper node's caption
sits. Every vertical labelled link on the site had the same fault; only two were
bad enough to notice.

Three fixes went into the diagram shortcode rather than into the pages:

- a diagonal or vertical link puts its label at 72% of the line — below the
  caption above it, above the icon below it;
- node captions get an opaque plate, so a link passing behind one is cut off
  rather than drawn through the text;
- a label too wide for the gap between two icons is lifted clear above the line.

Two diagrams were also relaid, because a link was drawn straight through an
unrelated device, and the canvas now sizes itself from the nodes actually
placed — one diagram had been quietly cropping a switch off its right edge.
A geometric check across all thirty-six diagrams now reports zero collisions.

## Code blocks follow the theme

Syntax highlighting had one palette for both themes, on the theory that a dark
code block reads as the deepest layer of a light page. In practice it read as a
black rectangle. The light theme now has its own well and its own hues, hand-
tuned rather than inverted — an inversion puts cyan and green below AA — with
the same roles in both: cyan is the command, purple the keyword, and the comment
token is the contrast floor at 5.5:1 dark and 5.3:1 light.

## The NetworkLessons links were fine, and the test for it was not

Fifty-nine links on this site point at networklessons.com, and fifty-six of them
use the path of a retired exam — the ICND1 100-105 and ICND2 200-105 courses,
both withdrawn in 2020. That looked like obvious rot, and an early probe seemed
to confirm it: the legacy path returned a clean 404 while the current path
returned a redirect to a bot wall.

It was an artifact. networklessons.com sits behind Radware bot protection that
intercepts every article request before the origin decides anything, and the
decisive check is embarrassingly simple — request a slug you invented yourself.
It returns the same redirect as a real article. The response carries no
information about whether the page exists, and the 404 seen earlier did not
reproduce.

What does carry information is the sitemap, because static files bypass the
wall: `sitemap_index.xml` returns 200 and a slug that does not exist returns a
real 404. It lists 814 lesson URLs, every one of them under a topic path and
none under an exam path — so each article now has a canonical topic home,
while the old course URLs continue to serve it.

Nothing was broken, then. What the sitemap did make possible was a different
job: moving each link to the article's canonical home, so it no longer depends
on an alias for a course that was retired six years ago. Ninety-four links
across fifty-four files now point at a topic path, every destination confirmed
present in the sitemap before it was written.

Twelve links stayed where they were, and the reason is the interesting half.
Six have no canonical equivalent at all — there is no lesson on fibre optic
cabling, or on TACACS+ versus RADIUS, or a generic default-route page. The
other six have only a near neighbour: the source article covered collision
*and* broadcast domains and the closest lesson covers collision domains alone;
there is no dedicated LACP-versus-PAgP page, only the EtherChannel lesson the
row above already links to. Those legacy URLs work. Replacing a working link
with an approximate one, or with a second copy of the link on the line above,
would have made the page worse in exchange for tidiness.

## Smaller things

- The site is **English-only** in public now. The Russian pages are still in the
  repository, just not built.
- A back-to-top button appears after the first screen and respects
  `prefers-reduced-motion`.
- Nineteen broken internal links fixed — cross-references between LPIC articles
  had lost a path segment, and two certification pages pointed at section
  indexes that deliberately do not render.

## Next

The Domain 5 and Domain 6 articles — security fundamentals, ACLs, layer 2
security, AAA, SDN, REST APIs, Ansible and friends — are written and scheduled,
one every two or three days through to early October. The roadmap already links
them; the links come alive as each publishes.
