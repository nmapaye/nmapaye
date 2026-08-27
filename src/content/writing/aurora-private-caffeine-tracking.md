---
title: "Building AURORA"
seoTitle: "Building AURORA, a Private React Native iOS App | Nathaniel Mapaye"
description: "How AURORA combines manual caffeine logs, optional Apple Health sleep data, a vigilance test, and private on-device storage."
seoDescription: "How AURORA uses React Native, Swift, HealthKit, MMKV, caffeine logging, sleep data, and a vigilance test in a private iOS app."
publishedDate: 2026-07-27
tags:
  - React Native
  - TypeScript
  - Swift
  - iOS
  - HealthKit
  - MMKV
  - On-device storage
  - Caffeine tracking
  - Vigilance testing
---

Building AURORA started with a question from myself :P how can I monitor my caffeine intake effectively?

Most people (sane ones at that) would understand that drinking caffeine past 2pm is a poor idea, but I wanted to take the idea one step further and understand just how bad taking caffeine would be at unideal points in time!

Some of my use-cases so far have been when I'm travelling and need to stay awake on flights, or during busy study/work sessions that require me to keep concentrated focus, and the PVT system I implemented acting as a safety guard against being fatigued while driving (and funnily enough an working as addictive game between my friends to determine whose the most alert!)

Anyways below is some AI-slop which was generated as essentially a long README if you're interested about the metal of it all, please enjoy the readthrough, and more importantly, thank you for taking the time to read my little blog!

## Make the manual path unified

The core experience cannot depend on Apple Health. A user can log a dose with a
timestamp and milligram amount, review daily totals, set a preferred cutoff, and
run the vigilance test without granting any system permission.

This constraint shaped onboarding and failure handling. If Health access is
unavailable, denied, or contains no recent sleep samples, AURORA stays usable.
Sample data is also available for exploring the interface without entering
personal information.

## Minimize Health access

HealthKit access is optional and read-only. AURORA requests sleep analysis data
and never asks for write permissions.

The platform adapter accepts the different shapes returned by native HealthKit
bridges, converts supported timestamp values to milliseconds, rejects invalid
or reversed sleep intervals, removes duplicates with stable identifiers, and
sorts the resulting sessions consistently. The rest of the app consumes this
normalized model instead of depending on a particular native package.

That boundary makes the permission states explicit:

- **Granted:** recent sleep sessions can be imported.
- **Denied or unsupported:** manual logging remains available.
- **Empty:** the app explains that no recent sleep was found instead of treating
  an empty result as an error.
- **Interrupted import:** the next launch returns to a retryable idle state.

## Persists locally

The application state is managed with Zustand and persisted on-device through
MMKV. Caffeine doses, sleep sessions, vigilance sessions, preferences, and
onboarding state share a versioned persisted model.

Migrations normalize older data when the stored shape changes. If the native
storage module is unavailable in a development environment, the adapter falls
back to memory and reports that data will not persist. That fallback keeps the
app runnable without pretending that persistence succeeded.

There is currently no cloud sync. That is a product limitation, but it also
keeps the privacy model easy to explain: the app does not require a backend
account to provide its core experience.

## Treat alertness as a key signal

The vigilance test is a 60-second reaction exercise. Completed sessions are
stored alongside caffeine and sleep data so the Insights screen can show recent
scores and build a baseline over multiple runs.

The interface describes these values as patterns and signals. It avoids
presenting a reaction score or a caffeine-decay estimate as a clinical
conclusion. This distinction matters whenever software turns personal data into
advice.

## Test the boundaries users actually hit

The project checks the paths that determine whether the privacy and fallback
promises are real:

- Health permission granted, denied, unavailable, and empty-result flows.
- Duplicate and malformed sleep samples.
- Manual caffeine logging and custom entries.
- Persistence migrations and interrupted imports.
- Loading and clearing isolated sample data.
- Completing and saving a vigilance session.

The app also separates the Expo application from its public showcase website,
so marketing-site changes do not alter the native release configuration.

## What I would build next

The near-term focus is a stable App Store and TestFlight release, clearer
physical-device testing, and continued accessibility work. Cloud sync, an Apple
Watch companion, encrypted import/export, and background automation are not
current features and should not be implied in product descriptions.

The [AURORA source code](https://github.com/nmapaye/aurora) contains the current
implementation, tests, release notes, and platform constraints.
