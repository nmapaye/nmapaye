# Portfolio release-hardening morning handoff

Date: 2026-08-01 (Asia/Jakarta)

Branch: `nmapaye-bot/sites-preview-repair`

Implementation HEAD verified: `cf88bffb1c43dbfd9e1ae160532451b6fa04465d`

## Release verdict

The six confirmed defects are fixed, the available automated and browser verification passed, and ordinary Astro `dist/` is restored. The branch is **not release-ready**: no usable current-iOS Simulator was found and `simctl` is unavailable, so current-iOS Safari parity remains an open, release-blocking gate. Chromium emulation was not used as a substitute.

No P0 defect was reproduced. The sprint fixed five P1 defects and one P2 defect.

## Fixed defects

### P1 — marquee lifecycle

- **Root cause:** The 250 ms stop deadline was coupled to animation-frame progress; natural idle retained a stale frame baseline; responsive geometry was not refreshed; and adapter listeners lacked independent teardown ownership.
- **Source:** `src/scripts/motion/marquee.mjs`
- **Regression coverage:** `scripts/test-motion-marquee.mjs` covers the event-clock deadline, stalled frames, baseline reset, resize/orientation geometry refresh, normalized wrapping, and direct-destroy listener cleanup. Against the archived prior source: 11 tests, 5 passed and 6 failed. Repaired result: 11 passed, 0 failed.
- **Commit:** `87aa4348f6ba3ee856c445cadd39712627a6600c` (`fix(motion): harden marquee lifecycle`)

### P2 — navigation-wipe fragments and teardown

- **Root cause:** Literal empty same-document fragments such as `#` were classified as wipe-eligible, and delegated/page/panel listeners were not all owned by a controller that direct teardown could abort.
- **Source:** `src/scripts/motion/navigation-wipe.mjs`
- **Regression coverage:** `scripts/test-motion-navigation-wipe.mjs` covers empty same-document fragments, click eligibility and locking, completion/error races, pre-aborted setup, transition cancellation, and post-destroy listener detachment. Against the archived prior source: 10 tests, 8 passed and 2 failed. Repaired result at this stage: 10 passed, 0 failed.
- **Commit:** `17ee9c7e5f04c23d262730a5be7f6e6b37db10ba` (`fix(motion): harden navigation wipe cleanup`)

### P1 — text-effect teardown and stale queued work

- **Root cause:** Queued burst follow-ups were not invalidated when a zone moved offscreen or the controller was destroyed; direct teardown left delegated listeners and shake CSS custom properties behind.
- **Source:** `src/scripts/motion/text-effects.mjs`
- **Regression coverage:** `scripts/test-motion-text-effects.mjs` covers destroyed/offscreen queued work, controller-owned listeners, shake-property cleanup, and preservation of the already-correct pre-aborted behavior. Against the archived prior source: 22 tests, 17 passed and 5 failed. Repaired result: 22 passed, 0 failed.
- **Commit:** `7f68d3c6972394cd654ffd1e0e11bd94cb3de617` (`fix(motion): harden text effect teardown`)

### P1 — mobile menu navigation and responsive lifecycle

- **Root cause:** The native mobile `<details>` remained open after ordinary same-document navigation and had no closure at resize, orientation, pagehide, or direct teardown. The real motion root is a masthead sibling, so menu discovery also had to use `context.root.ownerDocument` rather than the motion root.
- **Source:** `src/components/Nav.astro`; `src/scripts/motion/navigation-wipe.mjs`
- **Regression coverage:** `scripts/test-motion-navigation-wipe.mjs` adds the stable menu marker, production document/root topology, same-document and cross-route closure ordering, responsive/page lifecycle closure, direct teardown, and pre-aborted setup. Initial red run: 13 tests, 8 passed and 5 failed; corrected-topology red run: 9 passed and 4 failed. Final result: 13 passed, 0 failed.
- **Commit:** `8189eff4288d3c5f30be8d87a662b694d152feeb` (`fix(nav): close mobile menu across lifecycle`)

### P1 — queued observer delivery after text-effect teardown

- **Root cause:** An `IntersectionObserver` delivery queued before `disconnect()` retained the destroyed controller's closures, allowing stale offscreen work to restore removed shake properties and release a coordinator owner reused after remount.
- **Source:** `src/scripts/motion/text-effects.mjs`
- **Regression coverage:** `scripts/test-motion-text-effects.mjs` invokes the saved observer callback after destroy and owner reuse. Red: 23 tests, 22 passed and 1 failed because three shake properties returned. Green: 23 passed, 0 failed.
- **Commit:** `1455ac32523f2e920e31d9e77ecc8a595d6532df` (`fix(motion): ignore queued observer work after teardown`)

### P1 — mobile-menu focus after keyboard activation

- **Root cause:** Closing the focused mobile `<details>` hid its active link; the browser's native same-document default action then overrode synchronous summary focus and left focus on `<body>`.
- **Source:** `src/scripts/motion/navigation-wipe.mjs`
- **Regression coverage:** `scripts/test-motion-navigation-wipe.mjs` now models literal menu containment, native fragment focus fixup, post-default microtask restoration, destroy cancellation, and zero pre-aborted panel listeners. Initial focus red: 13 tests, 12 passed and 1 failed; synchronous fix: 13 passed. Browser-driven timing red: 12 passed and 1 failed; destroy-guard red: 13 passed and 1 failed; final: 14 passed, 0 failed.
- **Commits:** `38bfa8ebc6199ca79bb81e82940bc2855c47f934` (`fix(nav): restore focus after mobile menu activation`); `cf88bffb1c43dbfd9e1ae160532451b6fa04465d` (`fix(nav): defer menu focus past anchor activation`)

## Verification commands

| Command | Result |
| --- | --- |
| `node --test scripts/test-motion-marquee.mjs` | Archived prior source: exit 1, 5 passed and 6 failed. Repaired worktree and post-commit/fix-round reruns: exit 0, 11 passed and 0 failed. |
| `node --test scripts/test-motion-navigation-wipe.mjs` | Earlier wipe/mobile-menu red-green evidence retained; final focus-timing and destroy-guard regressions produced the expected red failures. Final result: 14 passed, 0 failed. |
| `node --test scripts/test-motion-text-effects.mjs` | Archived prior source: exit 1, 17 passed and 5 failed. Initial repair: 22 passed. Queued-observer regression red: 22 passed and 1 failed; final result: 23 passed, 0 failed. |
| `ASTRO_TELEMETRY_DISABLED=1 node --test scripts/test-motion-marquee.mjs scripts/test-motion-navigation-wipe.mjs scripts/test-motion-text-effects.mjs` | Final component totals: 48 passed, 0 failed. |
| `ASTRO_TELEMETRY_DISABLED=1 npm test` | Final motion suite: 119 passed, 0 failed. Build/SEO/homepage/hosting/bundle suite: 53 passed, 0 failed. Astro built 3 pages. |
| `PIP_DISABLE_PIP_VERSION_CHECK=1 ../../.venv/bin/python scripts/test-resume.py` | 2 passed; `OK`. |
| `ASTRO_TELEMETRY_DISABLED=1 npm run test:sites` | 12 passed, 0 failed, including staged distribution and worker route/query/404 checks. |
| `ASTRO_TELEMETRY_DISABLED=1 npm run build` | Task 4 build: exit 0, 3 pages built. Final build: exit 0, 3 pages built after `test:sites`, restoring ordinary Astro output. |
| `git diff --check` | Passed; no tracked whitespace errors. |
| `git diff --check -- scripts/test-motion-navigation-wipe.mjs src/scripts/motion/navigation-wipe.mjs` | Exit 0 with no output. |
| `git diff --check -- scripts/test-motion-text-effects.mjs src/scripts/motion/text-effects.mjs` | Completed cleanly; no unrelated scoped changes. |
| `git status --short` | Historical check at `8189eff`: only the then-untracked release-hardening plan. Final check after `159f4d2`: clean. |
| `git show --check --oneline --stat HEAD` | Completed without whitespace diagnostics for the marquee commit. |
| `git show --format= --name-only HEAD` | Listed only `scripts/test-motion-marquee.mjs` and `src/scripts/motion/marquee.mjs`. |
| `git show --stat --oneline <commit>` | Run for the original four implementation commits through `8189eff`; recorded stats matched their scoped file sets. |
| `git show --format=fuller --find-renames <commit>` | Full diffs reviewed for the original four implementation commits through `8189eff`; no release concern found. |
| `git show --format='%H %s' --name-only <commit>` | Corroborated the original four implementation commit hashes, subjects, and file lists. |
| Scoped review package `875b104..159f4d2` | Audited all four final-fix commits; queued-observer, focus, worker-path, and deferred-test findings were resolved with no implementation issue. |
| `ASTRO_TELEMETRY_DISABLED=1 npm run preview -- --host 127.0.0.1 --port 48731` | Initial sandbox bind failed with `listen EPERM`; the approved-localhost rerun became ready at `http://127.0.0.1:48731/`. |
| `curl --silent --show-error --max-time 2 http://127.0.0.1:48731/` after shutdown | Exit 7 (`Couldn't connect`), confirming the sprint preview was stopped. |
| `xcrun --find Simulator` | Failed: utility was not a developer tool or on `PATH`. |
| `xcrun --find simctl` | Failed: utility was not a developer tool or on `PATH`. |
| `/usr/bin/xcrun simctl list runtimes` | Failed: unable to find utility `simctl`. |

## Browser matrix

All HTML route/width rows below passed exact URL, expected title/H1, present `<main>`, and no document-level horizontal overflow. The PDF row passed local PDF viewer URL, title, and loading checks at every width.

| Route | 390 | 768 | 1024 | 1175 | 1440 |
| --- | --- | --- | --- | --- | --- |
| `/` | Pass | Pass | Pass | Pass | Pass |
| `/writing/` | Pass | Pass | Pass | Pass | Pass |
| `/writing/aurora-private-caffeine-tracking/` | Pass | Pass | Pass | Pass | Pass |
| `/resume.pdf` | Pass | Pass | Pass | Pass | Pass |

Additional passed checks:

- Responsive navigation: mobile menu at 390 px; desktop navigation at 768, 1024, 1175, and 1440 px; no horizontal overflow. Work, Experience, Notes, Contact, breakpoint round trips, and three rapid Work activations all closed the mobile menu. Work and Contact landed at 84 px beneath a 71 px sticky-header bottom.
- Final focus timing at 390 px: an active nested Work link closed the menu and performed the native `#work` navigation; immediate native focus fixup moved focus to `<body>`, then deferred restoration settled on the visible `Menu` summary. Work remained 84 px below the 71 px header, with no wipe or overflow.
- Navigation state: anchors, reload/scroll restoration at `/#work`, back/forward history, and rapid repeated Notes activation passed. Exactly one locked navigation completed.
- Native Chrome: keyboard focus with visible 4 px outlines, burst/shuffle, grid keyboard movement, pointer spring/exit cleanup, five-sticker drag cleanup, 20 px grid drag without page scroll, card fans, rapid scroll, routes/history, repeated activation, effect cleanup, and overflow passed.
- Safari: homepage, `/#work` sticky landing, article title/H1, back/forward restoration, and exact 200% full-page zoom passed; readable wrapping had no horizontal clipping/scrollbar, and zoom was reset to verified 100%.
- Firefox: homepage, `/#work`, article title/H1, and back/forward restoration passed.
- Accessibility/fallback: reduced motion, forced colors, no-JavaScript fallback, and active-effect cleanup passed.
- Lifecycle: explicit controlled `visibilitychange` hidden/visible behavior and `frozen` to `active` passed with no active effects, wipe, or overflow. This is not claimed as a physical tab-switch result.
- External-link DOM audit passed without opening external destinations; same-tab behavior and `rel` values were correct.
- Final cleanup found 0 active text effects, decorations, wipe layers/panels, or open mobile menus; shake inline style was empty and console warnings/errors were 0.

Unavailable check:

- **Current-iOS Safari: release-blocking.** No usable current-iOS Simulator was found and `simctl` is unavailable. No current-iOS route or interaction parity is claimed.

## Output and operational boundaries

The final `ASTRO_TELEMETRY_DISABLED=1 npm run build` restored ordinary static Astro output after Sites staging verification. Positive proof: `dist/index.html`, `dist/writing/index.html`, `dist/writing/aurora-private-caffeine-tracking/index.html`, and `dist/resume.pdf` exist. Negative proof: Sites-only `dist/server/index.js` and `dist/client/` are absent.

No push, deploy, publish, Sites-project mutation, tool installation, or credential change occurred.

## Residual risk

The final review's two test-quality observations were closed by literal nested-menu coverage and explicit pre-aborted panel-listener assertions. The current-iOS Safari gate above remains the only explicit release blocker.
