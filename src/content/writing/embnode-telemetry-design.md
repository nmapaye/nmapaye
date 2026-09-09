---
title: "EmbNode: testing telemetry before connecting hardware"
seoTitle: "EmbNode Telemetry Design | Nathaniel Mapaye"
description: "Packet framing, OTA failure handling, and power accounting in a C++17 telemetry prototype, with the limits of host testing made explicit."
publishedDate: 2026-09-09
tags: [C++17, FreeRTOS, Embedded systems, Telemetry, CRC16, Testing]
---

EmbNode is my telemetry prototype for an ESP32 or STM32 environment with
FreeRTOS. Its host build isolates packet framing, power accounting, and an OTA
coordinator so those behaviors can be tested without a board or a network
service. The current CMake configuration requests C++17.

This article describes [commit eef04e4](https://github.com/nmapaye/embnode/tree/eef04e4ee93c3284d01180d99dc9f86f6d723e0c).
The repository includes FreeRTOS task scaffolding. It does not establish a
finished DMA sampler, reliable MQTT delivery, or measured battery life on a
physical device.

## Separating sampling, aggregation, and communications

The [sampler task](https://github.com/nmapaye/embnode/blob/eef04e4ee93c3284d01180d99dc9f86f6d723e0c/src/tasks/sampler_task.cpp)
uses `vTaskDelayUntil` for periodic scheduling and produces a simulated sample.
It records timing relative to an ideal schedule and logs jitter outside a
configured budget. Integration with a DMA completion callback remains platform
work, so the presence of a jitter budget is not evidence that hardware meets it.

The aggregator receives samples and batches them into frames. Communications
receives frames, encodes them, tries an MQTT hook, and calls an HTTP hook when
MQTT reports failure. Separating those responsibilities creates places to inspect
timing and queue pressure without putting transport calls inside the sampler.

There are unresolved boundaries. The task code ignores failed nonblocking queue
pushes, so queue saturation can discard work without a drop counter. The HTTP
result is also ignored. There is no durable retry queue or delivery
acknowledgment in that loop. Those behaviors need an explicit loss and retry
policy before unattended use.

## Defining a packet independently of a C++ structure

The [packet encoder](https://github.com/nmapaye/embnode/blob/eef04e4ee93c3284d01180d99dc9f86f6d723e0c/src/telemetry/packet.cpp)
writes the outer frame field by field:

| Field | Size | Representation |
| --- | --- | --- |
| Magic | 2 bytes | `A5 5A` |
| Version | 1 byte | Version 1 |
| Type | 1 byte | Samples, metrics, or log |
| Payload length | 2 bytes | Unsigned, little-endian |
| Payload | Variable | At most 65,535 bytes |
| CRC | 2 bytes | CRC16-CCITT, stored little-endian |

The CRC covers the header and payload. Decode rejects unknown types and
versions, incorrect magic, truncated or extra bytes, and a mismatched CRC.
Encoding rejects a payload that cannot fit in the length field. A temporary
decoded frame is assigned to the caller's output only after validation passes.

The outer frame is portable, but its payload is opaque. The current aggregator
copies the in-memory `Sample` representation into that payload. Structure
padding and byte order can differ across targets, so a receiver still needs an
explicit sample format. A stable envelope alone does not make the whole message
portable. CRC detects corruption; it does not authenticate a sender.

## Treating OTA completion as a state transition

The [OTA coordinator](https://github.com/nmapaye/embnode/blob/eef04e4ee93c3284d01180d99dc9f86f6d723e0c/src/ota/ota.cpp)
requires a backend with begin, write, finalize, and abort operations. The
compatibility wrapper without a backend reports failure. That keeps a missing
platform implementation from looking like a completed update.

The coordinator distinguishes failure before commitment from an image that
committed after the deadline. In the latter case it returns
`CommittedAfterDeadline`. A caller should record the deadline miss, but aborting
or retrying as though commitment never occurred would misrepresent device state.
The repository tests this with controlled backend behavior and a test clock.

## Power accounting and host evidence

Power accounting includes the interval currently in progress, which avoids
omitting time in the active state simply because a transition has not happened
yet. Reset support and a controlled clock make the arithmetic deterministic in
tests. These are calculations using modeled states and currents. A board-level
current trace is still needed to characterize radio bursts, wake costs, and
battery behavior.

The [host contracts](https://github.com/nmapaye/embnode/blob/eef04e4ee93c3284d01180d99dc9f86f6d723e0c/tests/host_tests.cpp)
exercise malformed packets, power accounting, and OTA failures. To reproduce
the host checks from that commit:

```sh
cmake -S . -B build-host -DEMBNODE_BUILD_FREERTOS_LIB=OFF -DEMBNODE_ENABLE_SANITIZERS=ON
cmake --build build-host
ctest --test-dir build-host --output-on-failure
```

On September 9, 2026, both registered host tests passed with AppleClang 21 and
AddressSanitizer/UndefinedBehaviorSanitizer enabled on macOS. The host build
excludes the FreeRTOS task implementation and does not validate its scheduling,
queue ownership, hardware hooks, or network behavior.

Before treating this as a device deployment, I would define the sample payload
format, address the FreeRTOS queue's handling of frames that own dynamic memory,
account for dropped samples, implement and test the transport and OTA backends,
and measure timing and power on the target board. Those are remaining work,
not results established by the host tests.
