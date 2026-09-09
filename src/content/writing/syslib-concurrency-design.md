---
title: "SysLib: ownership and waiting in two C++ queues"
seoTitle: "SysLib Concurrency Design | Nathaniel Mapaye"
description: "How SysLib's SPSC ring publishes values with atomics, why its MPMC queue uses a mutex, and what the tests establish."
publishedDate: 2026-09-09
tags: [C++20, Concurrency, Atomics, SPSC, MPMC, Testing]
---

SysLib is my header-only C++20 systems library. Its queue implementations have
different ownership rules: the SPSC ring supports one producer and one consumer,
while the MPMC queue supports multiple producers and consumers through a mutex
and a condition variable. Choosing between them starts with the threads that
will use the queue and the behavior callers need when it is empty or full.

This article describes [commit 68391d8](https://github.com/nmapaye/syslib/tree/68391d8c8d84fe02fa16821aeb9556f0e1fcbc0e).
The current implementation differs from earlier portfolio descriptions of a
lock-free MPMC queue with epoch reclamation. The MPMC queue now uses ordinary
container ownership under a lock. The repository's build requirement is C++20.

## Publishing a value in the SPSC ring

The [ring implementation](https://github.com/nmapaye/syslib/blob/68391d8c8d84fe02fa16821aeb9556f0e1fcbc0e/include/syslib/spsc_ring.hpp)
rounds a requested capacity up to a power of two. It uses a mask to map increasing
head and tail counters onto a fixed vector of optional values. A request for
three slots therefore produces a capacity of four. Zero and capacities that
overflow the rounding calculation are rejected.

Only the producer advances the head. It reads its own head counter with relaxed
ordering, then reads the consumer's tail with acquire ordering to check whether
there is room. After constructing a value in the slot, it publishes the new head
with release ordering under the default policy. The consumer acquires that head
before reading the slot. This pairs publication of the counter with visibility
of the value that precedes it.

The consumer moves the value out, resets the optional, and releases the updated
tail. The producer's acquire load of the tail establishes when it can reuse the
slot. Both directions matter: publication makes a new value readable, and the
return path makes old storage reusable.

The hot counters are separately aligned to 64 bytes. That expresses an attempt
to keep independently written counters apart in memory, but it is not a measured
performance result on every processor. The lock-free trait checks whether the
platform's size-type atomics are always lock-free. User-defined construction and
move operations can still allocate, throw, or block.

## What callers must respect

The single-producer, single-consumer restriction is part of the contract. Adding
a second producer requires a different synchronization design. Capacity is
bounded: `try_push` returns false when full and `try_pop` reports an empty queue.
The waiting variants retry with the selected backoff policy. They do not provide
a deadline, cancellation token, or shutdown protocol.

The default policy uses release/acquire ordering. Although policy parameters
allow changes, this article does not establish that weaker custom orders are
safe. A caller must also stop both threads before destroying the queue. The
optional slots allow move-only values that have no default constructor without
requiring a live object in every unused slot.

## Waiting in the MPMC queue

The [MPMC implementation](https://github.com/nmapaye/syslib/blob/68391d8c8d84fe02fa16821aeb9556f0e1fcbc0e/include/syslib/mpmc_queue.hpp)
holds a deque behind a mutex. Enqueue inserts under the lock and then wakes one
waiting consumer. `pop_wait` uses a predicate with a condition variable, so it
waits for data without a spin loop and checks the queue again after a wakeup.

Dequeuing removes the stored value immediately. Storage grows with queued work;
there is no fixed capacity or producer backpressure. Removing a value establishes
its destruction, but does not promise that the allocator returns all underlying
memory to the operating system at that moment.

A less obvious failure case occurs when moving the front value throws. The
waiting pop catches the exception, unlocks, and notifies another waiter if a
value remains available. Without that notification, another consumer could stay
asleep even though the queue still contains an item. The test suite includes a
synthetic move failure to exercise this path. This does not make every throwing
move operation reversible; a user-defined move can modify its source before
throwing.

## Evidence and reproduction

The [SPSC tests](https://github.com/nmapaye/syslib/blob/68391d8c8d84fe02fa16821aeb9556f0e1fcbc0e/tests/test_spsc.cpp)
cover basic ordering, wraparound, a producer/consumer run, move-only values, and
invalid capacities. The [MPMC tests](https://github.com/nmapaye/syslib/blob/68391d8c8d84fe02fa16821aeb9556f0e1fcbc0e/tests/test_mpmc.cpp)
check wakeups, throwing extraction, value lifetime, and delivery of every value
exactly once in a four-producer/four-consumer run.

To run the existing tests from a checkout of that commit:

```sh
cmake -S . -B build-tests -DSYSLIB_BUILD_BENCHMARKS=OFF -DSYSLIB_ENABLE_ASAN=ON -DSYSLIB_ENABLE_UBSAN=ON
cmake --build build-tests
ctest --test-dir build-tests --output-on-failure
```

CMake fetches GoogleTest. AddressSanitizer and UndefinedBehaviorSanitizer require
a supported compiler. ThreadSanitizer is a separate build option and should be
run separately from AddressSanitizer.

On September 9, 2026, all 14 registered tests passed with AppleClang 21 on macOS
and AddressSanitizer/UndefinedBehaviorSanitizer enabled. That run did not include
ThreadSanitizer or a benchmark.

These tests provide evidence for particular behaviors and executions. They do
not constitute a formal linearizability proof or a portable throughput claim.
I have left earlier throughput figures out of this article because a useful
comparison needs a pinned implementation, compiler settings, machine details,
and a clearly defined operation count.
