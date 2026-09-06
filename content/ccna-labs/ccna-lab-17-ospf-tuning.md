---
title: "Lab 17 · OSPF Tuning and Network Types"
date: 2026-09-06
description: "Change the network type to kill the DR election, authenticate the adjacency, originate a default route into the area, and tune the timers that decide how fast a failure is noticed."
tags: ["CCNA", "OSPF", "Routing", "Lab"]
categories: ["CCNA"]
domain: 3
tool: "Packet Tracer"
duration: "45 min"
sources: "Jeremy's IT Lab Day 27, 28 · Flackbox 20-1"
---

Lab 16 got OSPF working. This one makes it behave the way a designed network behaves rather than the way the defaults happen to fall: no pointless DR election on a two-router link, an authenticated adjacency, a single default route injected from the edge instead of a full internet table, and failure detection measured in single-digit seconds.

## Topology

The Lab 16 topology, plus an internet-facing link on R1.

{{< topology cols="3" rows="2" caption="Area 0, with R1 as the ASBR originating a default route" >}}
router R1 "1.1.1.1 · ASBR" at 0,0
router R2 "2.2.2.2" at 1,0
router R3 "3.3.3.3" at 2,0
cloud ISP "0.0.0.0/0" at 0,1

R1 — R2 label="10.10.10.0/24"
R2 — R3 label="10.10.20.0/24"
R1 — ISP label="203.0.113.0/30"
{{< /topology >}}

## Objectives

- Change an interface's OSPF network type and watch the DR/BDR election disappear
- Configure MD5 authentication on an adjacency, interface-level and area-level
- Originate a default route into OSPF and understand `always`
- Tune hello and dead intervals, and know why they must match
- Set a per-interface cost and confirm the path moved

---

## Part 1 — Network types

{{< step num="1" dev="R1, R2" title="Kill the DR election on a point-to-point link" open="true" >}}
The 10.10.10.0/24 link has exactly two routers on it, and OSPF still runs a DR/BDR election because the interface type is Ethernet and Ethernet is `BROADCAST` by default. That election costs a wait (the 40-second wait timer on startup), produces a Type-2 LSA nobody needs, and adds a state machine that can go wrong.

```
R1(config)#interface GigabitEthernet0/0
R1(config-if)#ip ospf network point-to-point
R1(config-if)#end
```

```
R2(config)#interface GigabitEthernet0/0
R2(config-if)#ip ospf network point-to-point
R2(config-if)#end
```

**Both ends must match**, because the network type governs whether a DR is expected. One end point-to-point and the other broadcast produces an adjacency that reaches 2-WAY and stalls.

The four types worth knowing:

| Type | DR/BDR | Hello / Dead | Default on |
|---|---|---|---|
| **broadcast** | yes | 10 / 40 | Ethernet |
| **point-to-point** | **no** | 10 / 40 | serial (HDLC/PPP), GRE tunnels |
| non-broadcast (NBMA) | yes | 30 / 120 | Frame Relay main interface |
| point-to-multipoint | no | 30 / 120 | configured manually |

Two useful side effects of point-to-point beyond skipping the election:

Adjacency forms **faster** — there is no wait interval, so it goes straight to ExStart.

A **loopback** set to point-to-point advertises its configured prefix instead of a /32. By default OSPF advertises every loopback as a host route regardless of its mask; `ip ospf network point-to-point` on the loopback is how you get the real prefix into the LSDB.

```
R2(config)#interface Loopback0
R2(config-if)#ip address 2.2.2.2 255.255.255.0
R2(config-if)#ip ospf network point-to-point
```
{{< /step >}}

{{< verify dev="R1" cmd="show ip ospf interface GigabitEthernet0/0" open="true" >}}
```
R1#show ip ospf interface GigabitEthernet0/0
GigabitEthernet0/0 is up, line protocol is up
  Internet Address 10.10.10.1/24, Area 0, Attached via Network Statement
  Process ID 1, Router ID 1.1.1.1, Network Type POINT_TO_POINT, Cost: 1
  Topology-MTID    Cost    Disabled    Shutdown      Topology Name
        0           1         no          no            Base
  Transmit Delay is 1 sec, State POINT_TO_POINT
  Timer intervals configured, Hello 10, Dead 40, Wait 40, Retransmit 5
  Neighbor Count is 1, Adjacent neighbor count is 1
    Adjacent with neighbor 2.2.2.2
```

`Network Type POINT_TO_POINT`, `State POINT_TO_POINT` — and crucially **no `Designated Router` lines at all**. Compare with the broadcast output in Lab 16, which listed a DR and a BDR.

The neighbour table now reports the state without a role suffix:

```
R1#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
2.2.2.2           0   FULL/  -        00:00:37    10.10.10.2      GigabitEthernet0/0
```

`FULL/  -` with a dash where `DR` or `BDR` used to be, and priority 0 because priority is meaningless without an election. That dash is how you confirm at a glance that a link is point-to-point.

The Type-2 Network LSA for that segment also disappears from the database:

```
R1#show ip ospf database network
```

No output for 10.10.10.0/24 — one fewer LSA flooding the area.
{{< /verify >}}

---

## Part 2 — Authentication

{{< step num="2" dev="R2, R3" title="MD5 on the interface" >}}
An unauthenticated OSPF interface will peer with anything that sends a matching hello. On a link that reaches a rack you do not control, that is a route-injection attack waiting to happen.

Interface-level, which is the modern approach:

```
R2(config)#interface GigabitEthernet0/1
R2(config-if)#ip ospf message-digest-key 1 md5 0sp3fK3y!
R2(config-if)#ip ospf authentication message-digest
R2(config-if)#end
```

```
R3(config)#interface GigabitEthernet0/0
R3(config-if)#ip ospf message-digest-key 1 md5 0sp3fK3y!
R3(config-if)#ip ospf authentication message-digest
R3(config-if)#end
```

Area-level, which applies to every interface in the area at once:

```
R2(config)#router ospf 1
R2(config-router)#area 0 authentication message-digest
```

Area-level still needs the **key** configured per interface — it only sets the mode. Interface-level settings override area-level ones, which is how you exempt a single link.

Three modes:

| Mode | Command | Security |
|---|---|---|
| none | default | none |
| plaintext | `ip ospf authentication` | password sent in the clear — pointless |
| **MD5** | `ip ospf authentication message-digest` | hash, with a replay-resistant sequence number |

Configure one end and not the other and the adjacency drops. The log tells you which failure it is:

```
%OSPF-4-ERRRCV: Received invalid packet: Mismatch Authentication type.
  Input packet specified type 0, we use type 2, from 10.10.20.2, GigabitEthernet0/1

%OSPF-4-ERRRCV: Received invalid packet: Mismatch Authentication Key - Message Digest Key 1
  from 10.10.20.2, GigabitEthernet0/1
```

**Type mismatch** = one side has authentication off. **Key mismatch** = both are using MD5 with different passwords. Two different faults, two different messages — read which one you got before changing anything.
{{< /step >}}

{{< verify dev="R2" cmd="show ip ospf interface | include authentication|Message digest" open="true" >}}
```
R2#show ip ospf interface GigabitEthernet0/1 | include authentication|Message
  Message digest authentication enabled
    Youngest key id is 1
```

Then confirm the adjacency actually survived — authentication misconfiguration shows up as a missing neighbour, not as an error on the interface:

```
R2#show ip ospf neighbor

Neighbor ID     Pri   State           Dead Time   Address         Interface
1.1.1.1           0   FULL/  -        00:00:36    10.10.10.1      GigabitEthernet0/0
3.3.3.3           1   FULL/BDR        00:00:33    10.10.20.2      GigabitEthernet0/1
```

Both FULL. Change the key on one side and watch the neighbour disappear after the 40-second dead interval — the adjacency does not drop instantly, because existing state stays valid until it ages out.
{{< /verify >}}

---

## Part 3 — Default route origination

{{< step num="3" dev="R1" title="Inject one route instead of the whole internet" >}}
R1 has a static default route to the ISP. R2 and R3 need to reach the internet, and the wrong way to arrange that is to give them their own statics — the right way is for R1 to advertise the default into OSPF.

```
R1(config)#ip route 0.0.0.0 0.0.0.0 203.0.113.1
R1(config)#router ospf 1
R1(config-router)#default-information originate
R1(config-router)#end
```

`default-information originate` makes R1 an **ASBR** — an Autonomous System Boundary Router — and floods a Type-5 External LSA carrying 0.0.0.0/0 throughout the area.

The condition that catches people: by default, R1 only originates the default **if it has a default route of its own in its routing table**. Lose the static and the advertisement stops, which is usually the behaviour you want — no point telling the network you are a way out when you are not.

Override it if the upstream link is monitored some other way:

```
R1(config-router)#default-information originate always
```

`always` advertises unconditionally. Use it with care: R1 now attracts all internet traffic in the area whether or not it can forward it, and the failure mode is a black hole rather than a reroute.

You can also set the metric and metric type:

```
R1(config-router)#default-information originate metric 10 metric-type 1
```

**Type 2 (E2) is the default**: the metric stays constant across the whole OSPF domain, ignoring internal cost. **Type 1 (E1)** adds the internal cost to reach the ASBR, so routers closer to the exit prefer it. With one ASBR the distinction is academic; with two it decides which exit each router uses.
{{< /step >}}

{{< verify dev="R3" cmd="show ip route ospf" open="true" >}}
```
R3#show ip route ospf
Gateway of last resort is 10.10.20.1 to network 0.0.0.0

O*E2  0.0.0.0/0 [110/1] via 10.10.20.1, 00:01:12, GigabitEthernet0/0
      1.0.0.0/32 is subnetted, 1 subnets
O        1.1.1.1 [110/3] via 10.10.20.1, 00:22:41, GigabitEthernet0/0
      10.0.0.0/8 is variably subnetted, 5 subnets, 2 masks
O        10.10.10.0/24 [110/2] via 10.10.20.1, 00:22:41, GigabitEthernet0/0
```

**`O*E2`** decodes as: `O` learned by OSPF, `*` candidate default, `E2` external type 2. The `Gateway of last resort` line names it.

`[110/1]` — AD 110, metric 1. The metric is 1 and stays 1 no matter how many hops away you are, because E2 does not accumulate internal cost. Switch to `metric-type 1` and this becomes 3 on R3 and 2 on R2, reflecting the real distance to the exit.

Prove it end to end:

```
R3#ping 203.0.113.1 source Loopback0
Type escape sequence to abort.
Sending 5, 100-byte ICMP Echos to 203.0.113.1, timeout is 2 seconds:
Packet sent with a source address of 3.3.3.3
!!!!!
Success rate is 100 percent (5/5), round-trip min/avg/max = 2/6/14 ms
```
{{< /verify >}}

{{< verify dev="R1" cmd="show ip ospf database external" >}}
The LSA that carries it:

```
R1#show ip ospf database external

            OSPF Router with ID (1.1.1.1) (Process ID 1)

                Type-5 AS External Link States

  LS age: 84
  Options: (No TOS-capability, DC, Upward)
  LS Type: AS External Link
  Link State ID: 0.0.0.0 (External Network Number)
  Advertising Router: 1.1.1.1
  LS Seq Number: 80000001
  Network Mask: /0
        Metric Type: 2 (Larger than any link state path)
        MTID: 0
        Metric: 1
        Forward Address: 0.0.0.0
        External Route Tag: 1
```

`Advertising Router: 1.1.1.1` is the ASBR. `Metric Type: 2` with the parenthetical explaining exactly why the metric does not accumulate.

Type-5 LSAs flood through the **entire OSPF domain**, crossing area boundaries unchanged. That is what makes them useful and what makes a stub area — which blocks them — a design tool.
{{< /verify >}}

---

## Part 4 — Timers

{{< step num="4" dev="R2, R3" title="Detect a failure in six seconds instead of forty" >}}
The default dead interval is 40 seconds. A link that fails without the interface going down — a fibre fault behind a media converter, a broken path across a carrier's switched Ethernet — is invisible for those 40 seconds and every packet is dropped.

```
R2(config)#interface GigabitEthernet0/1
R2(config-if)#ip ospf hello-interval 2
R2(config-if)#end
```

```
R3(config)#interface GigabitEthernet0/0
R3(config-if)#ip ospf hello-interval 2
R3(config-if)#end
```

Setting the hello interval automatically sets the dead interval to **4× hello**, so hello 2 gives dead 8. Set them independently if you want a different ratio:

```
R2(config-if)#ip ospf dead-interval 6
```

**Both ends must match, exactly.** A mismatch breaks the adjacency and — this is the cruel part — **logs nothing**. The hellos are structurally valid; they simply describe an incompatible neighbour, so each side discards the other's. Lab 16 covered this failure; the diagnosis is to compare the two sides directly:

```
R2#show ip ospf interface GigabitEthernet0/1 | include Timer
  Timer intervals configured, Hello 2, Dead 8, Wait 8, Retransmit 5

R3#show ip ospf interface GigabitEthernet0/0 | include Timer
  Timer intervals configured, Hello 2, Dead 8, Wait 8, Retransmit 5
```

Aggressive timers cost CPU and generate more hellos; on a link with dozens of neighbours that adds up. The proper solution for fast failure detection is **BFD**, which does sub-second detection in hardware and is outside the CCNA blueprint — but knowing that the timer approach is a workaround is worth saying in an interview.

Restore the defaults when you are done:

```
R2(config-if)#no ip ospf hello-interval
R3(config-if)#no ip ospf hello-interval
```
{{< /step >}}

{{< step num="5" dev="R2" title="Per-interface cost, one more time" >}}
Lab 16 raised the reference bandwidth domain-wide. The per-interface override is the surgical version:

```
R2(config)#interface GigabitEthernet0/1
R2(config-if)#ip ospf cost 50
R2(config-if)#end
```

Precedence, highest first:

1. `ip ospf cost` — explicit, wins over everything
2. `bandwidth` on the interface — feeds the formula
3. the formula: reference ÷ actual interface bandwidth

Using `bandwidth` to influence OSPF is a bad habit even though it works, because the same value feeds EIGRP metrics, QoS calculations and interface utilisation reporting. Change one thing and three unrelated systems move. `ip ospf cost` changes exactly one thing.
{{< /step >}}

{{< verify dev="R1" cmd="show ip ospf | include Reference|Number of areas" >}}
Process-level summary, and the place to confirm the reference bandwidth is consistent:

```
R1#show ip ospf
 Routing Process "ospf 1" with ID 1.1.1.1
 Start time: 00:00:34.116, Time elapsed: 00:41:22.884
 Supports only single TOS(TOS0) routes
 It is an autonomous system boundary router
 Redistributing External Routes from,
 Router is not originating router-LSAs with maximum metric
 Initial SPF schedule delay 5000 msecs
 Minimum hold time between two consecutive SPFs 10000 msecs
 Reference bandwidth unit is 10000 mbps
    Area BACKBONE(0)
        Number of interfaces in this area is 3
        Area has message digest authentication
        SPF algorithm executed 12 times
```

Three things to read here:

- **`It is an autonomous system boundary router`** — confirms `default-information originate` took effect
- **`Reference bandwidth unit is 10000 mbps`** — must be identical on every router in the domain
- **`Area has message digest authentication`** — area-level auth is active

`SPF algorithm executed 12 times` climbing steadily means the topology is churning; on a stable network it should be static.
{{< /verify >}}

---

## What breaks in the real world

| Symptom | Cause | Command that proves it |
|---|---|---|
| Adjacency stalls at 2-WAY on a P2P link | network type mismatch | `show ip ospf interface` both ends |
| Neighbour drops after enabling auth | one end missing, or key differs | read the `%OSPF-4-ERRRCV` text |
| Default route not advertised | R1 has no default of its own | `show ip route 0.0.0.0`; or use `always` |
| Default route advertised but traffic black-holes | `always` with a dead upstream | remove `always` |
| Adjacency down, nothing logged | hello/dead timer mismatch | compare `show ip ospf interface` timers |
| Loopback advertised as /32 | OSPF default for loopbacks | `ip ospf network point-to-point` on it |
| Traffic prefers the slow link | reference bandwidth inconsistent | `show ip ospf \| include Reference` |
| Stuck in EXSTART | MTU mismatch | `show interfaces \| include MTU` both ends |

## Exam notes

- Network types: **broadcast** (DR/BDR, 10/40), **point-to-point** (no DR, 10/40), NBMA and point-to-multipoint (30/120). Type must match on both ends.
- Point-to-point removes the election, speeds up adjacency, and suppresses the Type-2 LSA.
- `ip ospf network point-to-point` on a loopback advertises its real prefix instead of a /32.
- Authentication: none, plaintext, or **MD5** (`ip ospf authentication message-digest` plus `ip ospf message-digest-key`). Interface settings override area settings.
- `default-information originate` needs a default route present; **`always`** removes that condition and makes the router an **ASBR**.
- External metric **type 2 (default)** does not accumulate internal cost; **type 1** does.
- Setting `hello-interval` sets `dead-interval` to **4× hello**. Both ends must match; a mismatch is **silent**.
- Cost precedence: `ip ospf cost` > `bandwidth` > the reference-bandwidth formula.

---

*Sources: Jeremy's IT Lab Day 27 & 28 · Flackbox CCNA Lab Guide 20-1 · verified in Packet Tracer 8.2.*
