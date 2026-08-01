# Portfolio Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkboxes so progress can be resumed without redoing verified work.

**Goal:** Harden the portfolio's existing motion and navigation behavior, fix every reproducible P0-P2 defect found in the release matrix, and leave ordinary Astro output verified without publishing or bypassing the current-iOS-Safari gate.

**Architecture:** Preserve the existing Astro pages and global motion runtime. Keep each repair inside the owning adapter and pair it with a focused Node regression test. The mobile-menu repair extends the existing delegated navigation adapter so anchor activation, responsive lifecycle events, page exit, and destroy all converge on one idempotent close operation. No content, route, SEO, dependency, hosting, or visual-design changes are in scope.

**Tech Stack:** Astro, JavaScript ES modules, Node's built-in test runner, local Astro dev server, Sites build/test scripts, project Python virtual environment, in-app Chromium, installed Chrome/Safari/Firefox, and current iOS Simulator only if locally available.

## Global Constraints

- Work only in `.worktrees/sites-preview-repair` on `nmapaye-bot/sites-preview-repair`.
- Preserve unrelated user changes and keep each repair in a focused local commit.
- Use regression-first development: observe the new test fail against the prior implementation, then make the smallest implementation change and observe it pass.
- Do not push, deploy, publish, modify `main`, modify the Sites project, install new tooling, or change content/SEO/routes/dependencies.
- Build Sites output only for verification, then restore ordinary Astro `dist/` output.
- A missing current-iOS Simulator or unverified current-iOS Safari parity remains release-blocking and must be reported; Chromium device emulation is not a substitute.

## Ranked Inventory

- **P0:** None reproduced.
- **P1:** Mobile `<details>` navigation remains open after activating an in-page link and remains logically open across a desktop/mobile breakpoint round trip, obscuring the destination section on return to mobile.
- **P1:** Existing uncommitted marquee repair addresses stop deadlines coupled to animation frames, stale responsive geometry, and adapter listener cleanup; verify its regressions fail against `HEAD` and pass in the worktree before preserving it.
- **P1:** Existing uncommitted text-effect repair addresses queued shake/shuffle work surviving offscreen/destroy lifecycle changes; verify those regressions fail against `HEAD` and pass in the worktree, while retaining pre-abort as preservation coverage for behavior already correct in `HEAD`.
- **P1:** Final review reproduced a queued `IntersectionObserver` delivery mutating text-effect state after destroy; guard stale delivery and owner reuse with regression coverage.
- **P1:** Final review reproduced hidden focus after keyboard activation closed the mobile menu; restore focus after the native fragment default action without changing scroll behavior.
- **P2:** Existing uncommitted navigation-wipe repair rejects empty same-document fragments and detaches delegated listeners on direct destroy/pre-aborted mount; verify red/green evidence before preserving it.
- **Release blocker (environment):** No usable current-iOS Simulator was found; `simctl` is unavailable. Do not claim the iOS Safari gate passed.

### Task 1: Preserve regression evidence for the inherited marquee repair

**Files:**

- Verify: `scripts/test-motion-marquee.mjs`
- Verify: `src/scripts/motion/marquee.mjs`

- [x] Create a temporary archive of `HEAD` outside the worktree with `mktemp -d` and `git archive HEAD`, then copy only the current marquee test into that archive.
- [x] Run `node --test scripts/test-motion-marquee.mjs` in the archive and record that the new deadline/resize/destroy regressions fail against the prior source.
- [x] Run `node --test scripts/test-motion-marquee.mjs` in the worktree and require every marquee test to pass.
- [x] Review `git diff --check` and the pair's scoped diff for timer races, negative modulo/wrap behavior, and listener ownership.
- [x] Commit only the marquee source and regression test with a focused message.

### Task 2: Preserve regression evidence for the inherited navigation-wipe repair

**Files:**

- Verify: `scripts/test-motion-navigation-wipe.mjs`
- Verify: `src/scripts/motion/navigation-wipe.mjs`

- [x] Copy only the current navigation-wipe test into a fresh temporary `HEAD` archive.
- [x] Run `node --test scripts/test-motion-navigation-wipe.mjs` in the archive and record that the empty-fragment and lifecycle regressions fail against the prior source.
- [x] Run the same focused test in the worktree and require every navigation-wipe test to pass.
- [x] Review the scoped diff for modified-click behavior, download/external/PDF bypasses, one-destination locking, and idempotent abort cleanup.
- [x] Commit only the navigation-wipe source and regression test with a focused message.

### Task 3: Preserve regression evidence for the inherited text-effect repair

**Files:**

- Verify: `scripts/test-motion-text-effects.mjs`
- Verify: `src/scripts/motion/text-effects.mjs`

- [x] Copy only the current text-effect test into a fresh temporary `HEAD` archive.
- [x] Run `node --test scripts/test-motion-text-effects.mjs` in the archive and record that destroy and offscreen invalidation regressions fail against the prior source; record the pre-aborted-context case as preservation coverage if it already passes there.
- [x] Run the same focused test in the worktree and require every text-effect test to pass.
- [x] Review the scoped diff for stale callbacks, epoch invalidation, CSS custom-property cleanup, and listener ownership.
- [x] Commit only the text-effect source and regression test with a focused message.

### Task 4: Close the mobile menu at every navigation and responsive lifecycle boundary

**Files:**

- Modify: `src/components/Nav.astro`
- Modify: `src/scripts/motion/navigation-wipe.mjs`
- Test: `scripts/test-motion-navigation-wipe.mjs`

- [x] Extend the navigation-wipe source/markup test to require a stable `data-mobile-menu` marker on the mobile `<details>` element.
- [x] Extend the delegated-adapter harness with open mobile-menu fakes and add regressions proving: an in-menu same-document link closes the menu without preventing native anchor navigation; an eligible cross-route click closes it before the wipe; `resize`, `orientationchange`, `pagehide`, and direct `destroy()` leave no menu open; a pre-aborted context installs no new listeners.
- [x] Run `node --test scripts/test-motion-navigation-wipe.mjs` and require the new assertions to fail before changing implementation.
- [x] Add `data-mobile-menu` to the existing `<details>` without changing visible copy or styling.
- [x] Add one idempotent `closeOpenMobileMenus()` operation inside `mountNavigationWipe`; invoke it from delegated link activation, resize, orientation change, pagehide, and destroy using the adapter's existing abort-owned listeners.
- [x] Run `node --test scripts/test-motion-navigation-wipe.mjs` and require all assertions to pass.
- [x] In the local browser at 390 px, open the menu, activate `Work`, and verify the menu is closed and `#work` lands below the sticky header. Repeat open -> resize to 768 -> resize to 390 and verify the menu cannot reappear. Repeat for `Experience`, `Notes`, and `Contact`, plus rapid repeated opens/clicks.
- [x] Run `git diff --check`, inspect the scoped diff, and commit only the mobile-menu repair and regressions.

### Task 5: Run the complete release verification matrix

**Files:**

- Verify: all tracked source, tests, build output, and `public/resume.pdf`

- [x] Run the focused motion tests for marquee, navigation wipe, and text effects.
- [x] Run `ASTRO_TELEMETRY_DISABLED=1 npm test` and require the full motion/build/SEO/homepage/hosting/bundle suite to pass.
- [x] Run `PIP_DISABLE_PIP_VERSION_CHECK=1 ../../.venv/bin/python scripts/test-resume.py` and require both resume checks to pass.
- [x] Run `ASTRO_TELEMETRY_DISABLED=1 npm run test:sites` and require Sites dist/worker checks to pass.
- [x] Restore ordinary output with `ASTRO_TELEMETRY_DISABLED=1 npm run build` and confirm `dist/` contains ordinary Astro pages, not the Sites worker bundle.
- [x] Run `git diff --check`, `git status --short`, and inspect every sprint commit with `git show --stat --oneline` plus a full diff review.
- [x] Browser-smoke `/`, `/writing/`, `/writing/aurora-private-caffeine-tracking/`, and `/resume.pdf`; cover widths 390, 768, 1024, 1175, and 1440; anchors/history/reload/restoration; mouse/hover/pointer exit/rapid scroll/repeated activation/keyboard; tab visibility/resize; reduced motion/forced colors/200% zoom/no-JavaScript fallback; and active-effect cleanup.
- [x] Record installed-browser results for Chrome, Safari, and Firefox. Record current-iOS Safari as blocked unless a real locally installed current-iOS Simulator becomes available and passes the same route/interaction smoke checks.

### Task 6: Produce the morning handoff

- [x] Summarize each fixed defect with severity, root cause, source file, regression coverage, and commit hash.
- [x] List every verification command and browser matrix result, distinguishing passed checks from unavailable checks.
- [x] State explicitly that no push/deploy/publish/Sites-project mutation occurred and ordinary Astro `dist/` was restored.
- [x] Report the current-iOS Safari gate as release-blocking if it remains unavailable; do not label the branch release-ready while that gate is open.

### Task 7: Resolve final whole-sprint review findings

- [x] Reproduce and repair queued text-effect observer delivery after destroy; verify owner reuse and cleanup remain intact.
- [x] Reproduce and repair mobile-menu focus loss with literal containment, native default-action focus fixup, and destroy-cancellation coverage.
- [x] Close the two deferred navigation test-quality observations and correct the Sites worker restoration path.
- [x] Verify the final focus timing at 390 px with the real page and preserve the correct sticky-header anchor landing.
- [x] Rerun the full test, resume, Sites, and ordinary Astro build gates; retain current-iOS Safari as release-blocking.
