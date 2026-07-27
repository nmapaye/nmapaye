---
title: "Building AURORA: Private Caffeine, Sleep, and Alertness Tracking"
description: "How AURORA combines manual caffeine logs, optional Apple Health sleep data, a vigilance test, and private on-device storage."
publishedDate: 2026-07-27
tags:
  - React Native
  - TypeScript
  - HealthKit
  - MMKV
  - Privacy
---

AURORA started with a narrow product question: can a caffeine tracker explain
how intake timing relates to sleep and alertness without requiring an account or
sending personal health information to a server?

The current iPhone and iPad app combines manual caffeine logging, optional sleep
import, a short reaction-time test, and on-device summaries. It is deliberately
not a medical device. The guidance is informational, and the app does not
diagnose, treat, or prevent any condition.

## Make the manual path complete

The core experience cannot depend on Apple Health. A user can log a dose with a
timestamp and milligram amount, review daily totals, set a preferred cutoff, and
run the vigilance test without granting any system permission.

This constraint shaped onboarding and failure handling. If Health access is
unavailable, denied, or contains no recent sleep samples, AURORA stays usable.
Sample data is also available for exploring the interface without entering
personal information.

## Keep Health access narrow

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

## Persist locally and recover safely

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

## Treat alertness as a signal, not a verdict

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
