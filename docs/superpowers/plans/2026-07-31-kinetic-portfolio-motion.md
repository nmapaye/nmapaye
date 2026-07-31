# Kinetic Portfolio Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and release all nine approved kinetic portfolio effects while preserving the existing Astro content, semantics, routes, ordinary build, and Sites distribution.

**Architecture:** Server-rendered Astro components provide complete static fallbacks and fixed-size decorative pools. Dependency-free ES modules share one policy observer, one interaction coordinator, and one requestAnimationFrame scheduler; event handlers update state and the scheduler performs bounded transform, opacity, and CSS-variable writes. The same single bundled entry runs on every route, but homepage-only controllers mount only when kinetic markers exist.

**Tech Stack:** Astro 4, JavaScript ES modules, CSS, Node `node:test`, Node `zlib`, Pointer Events, `requestAnimationFrame`, `IntersectionObserver`, GitHub Pages, and OpenAI Sites.

**Execution prerequisite:** This approved plan is committed by the planning
session before Task 1 begins. Implementation therefore starts from a clean
worktree. The committed approved design spec and this implementation plan are
the only permitted planning artifacts in release history.

## Global Constraints

- Implement all nine named effects; none may be omitted or replaced with a merely static substitute under normal motion settings.
- Preserve the exact homepage top-level order and the existing one featured plus three secondary project article counts.
- Keep `src/data/site.ts` as the only source of factual project content.
- Add only the approved semantic marquee phrase: `SYSTEMS / SECURITY / PRODUCT`.
- Keep the native cursor visible and native vertical page scrolling functional.
- Add no runtime dependency, client framework, physics library, or animation library.
- Emit one deferred external motion entry and keep its total level-9 gzip size at or below 25,600 bytes.
- Use one shared frame scheduler with at most one outstanding frame and no frames or timers while idle, hidden, or offscreen.
- Keep exactly one foreground effect owner. On a burst-marked link with a
  related heading or project-name treatment, the closest link burst owns the
  first 100ms; its normal release starts the related shake or a 300ms shuffle.
  Preemption discards that queued follow-up, so the two effects never overlap.
- Cap pools at 24 stickers, eight burst particles, and 16 grid tiles.
- Reduced motion must cancel inertia, cursor following, shake, shuffle, trails, bursts, marquee movement, and wipes within one rendered frame.
- Decorative copies must be `aria-hidden`, nonfocusable, and unable to receive pointer events.
- Keep the sticky navigation below no existing layer changes at `z-index: 50` and the skip link unobscured at `z-index: 1000`; motion layers stay below 50.
- Preserve all current content, link destinations, SEO, résumé, writing routes, native `<details>` behavior, 44-pixel targets, and source DOM order.
- Keep `npm run build`, the ordinary `dist/**` layout, and GitHub Pages artifact behavior unchanged.
- Keep `npm run build:sites` staging identical content under `dist/client/**` with the worker at `dist/server/index.js`.
- Do not change `.openai/hosting.json`, the Sites project ID, owner-only access, domains, or environment variables.
- Do not push or deploy until the release checkpoint explicitly obtains authority.

---

## File Structure

### New runtime sources

- `src/scripts/motion/scheduler.mjs` — sole animation-frame owner and capped timeline.
- `src/scripts/motion/policy.mjs` — reduced-motion, pointer, visibility, blend, and 3D policy.
- `src/scripts/motion/index.mjs` — idempotent mounting, shared context, coordination, and lifecycle.
- `src/scripts/motion/pointer-effects.mjs` — blobs, sticker recycling, and burst particles.
- `src/scripts/motion/marquee.mjs` — signed scroll velocity and finite decay.
- `src/scripts/motion/grid.mjs` — drag ownership, wrapping, seam bounce, inertia, and keyboard input.
- `src/scripts/motion/card-stack.mjs` — card hover, focus, tap, and static fallback state.
- `src/scripts/motion/text-effects.mjs` — bounded shake and deterministic shuffle.
- `src/scripts/motion/navigation-wipe.mjs` — link classification, reentrancy lock, and safe navigation.

### New Astro and CSS files

- `src/components/effects/MotionLayer.astro` — global blobs, fixed pools, and wipe panels.
- `src/components/effects/ProjectPoster.astro` — factual HTML composition over geometry-only SVG art.
- `src/components/effects/KineticMarquee.astro` — one semantic source plus hidden visual tracks.
- `src/components/effects/InfiniteProjectGrid.astro` — 16-tile static fallback and enhancement surface.
- `src/components/effects/CardStack.astro` — decorative layered posters and visual metadata.
- `src/components/effects/GlitchText.astro` — hidden visual overlay paired with a caller-owned semantic label.
- `src/styles/motion.css` — all effect styling, breakpoints, fallbacks, forced colors, and reduced motion.

### New public assets

- `public/images/project-posters/aurora.svg`
- `public/images/project-posters/embnode.svg`
- `public/images/project-posters/gitops.svg`
- `public/images/project-posters/syslib.svg`

These SVGs contain palette geometry only. Project names, indexes, stacks, facts,
periods, and metrics remain rendered from `src/data/site.ts`.

### New test files

- `scripts/test-motion-scheduler.mjs`
- `scripts/test-motion-policy.mjs`
- `scripts/test-motion-lifecycle.mjs`
- `scripts/test-motion-pointer-effects.mjs`
- `scripts/test-motion-marquee.mjs`
- `scripts/test-motion-grid.mjs`
- `scripts/test-motion-card-stack.mjs`
- `scripts/test-motion-text-effects.mjs`
- `scripts/test-motion-navigation-wipe.mjs`
- `scripts/test-motion-bundle.mjs`

### Existing files modified in place

- `package.json`
- `README.md`
- `src/layouts/Base.astro`
- `src/pages/index.astro`
- `src/components/Nav.astro`
- `src/components/Hero.astro`
- `src/components/ChapterIndex.astro`
- `src/components/Projects.astro`
- `src/components/ProjectCard.astro`
- `src/components/Experience.astro`
- `src/components/Notes.astro`
- `src/components/Contact.astro`
- `scripts/test-homepage.mjs`
- `scripts/test-sites-build.mjs`

Do not rewrite existing component-local editorial styles. Motion-specific rules
belong in `src/styles/motion.css`.

---

### Task 1: Shared scheduler, policy, coordinator, and lifecycle

**Files:**

- Create: `src/scripts/motion/scheduler.mjs`
- Create: `src/scripts/motion/policy.mjs`
- Create: `src/scripts/motion/index.mjs`
- Create: `scripts/test-motion-scheduler.mjs`
- Create: `scripts/test-motion-policy.mjs`
- Create: `scripts/test-motion-lifecycle.mjs`
- Modify: `package.json:6-16`

**Interfaces:**

- Produces:
  - `createFrameScheduler({ requestFrame, cancelFrame, onError, maxDelta })`
    returning
    `{ request, cancel, cancelAll, now, suspend, resume, resetTiming, destroy, snapshot }`
  - `createBrowserFrameScheduler(browserWindow, options)`
  - `deriveMotionPolicy(input)`
  - `observeMotionPolicy({ window, document, onChange, signal })`
    returning `{ current, refresh }`
  - `initializeMotion(root, environment)`
  - `destroyMotion(root)`
  - `createInteractionCoordinator()`
  - `createSeededRandom(seed)`
- Shared controller context:

```js
{
  root,
  scheduler,
  policy,
  refreshPolicy,
  coordinator,
  lockForNavigation,
  clock,
  random,
  observerFactory,
  onError,
  signal,
}
```

- Controllers implement `update(timestamp) -> boolean` and return `true` only
  when another frame is required.

- [ ] **Step 1: Add failing scheduler, policy, and lifecycle tests**

```js
// scripts/test-motion-scheduler.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { createFrameScheduler } from '../src/scripts/motion/scheduler.mjs';

test('coalesces controllers into one frame and stops when idle', () => {
  const frames = [];
  const scheduler = createFrameScheduler({
    requestFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame() {},
    onError(error) {
      throw error;
    },
    maxDelta: 50,
  });
  const timestamps = [];
  const controller = {
    update(timestamp) {
      timestamps.push(timestamp);
      return false;
    },
  };

  scheduler.request(controller);
  scheduler.request(controller);
  assert.equal(frames.length, 1);

  frames.shift()(16);
  assert.deepEqual(timestamps, [16]);
  assert.deepEqual(scheduler.snapshot(), {
    pending: false,
    active: 0,
    suspended: false,
  });
});

test('caps restored-frame time and cancels every active controller', () => {
  const frames = [];
  const scheduler = createFrameScheduler({
    requestFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame() {},
    onError(error) {
      throw error;
    },
    maxDelta: 50,
  });
  const seen = [];
  const controller = {
    update(timestamp) {
      seen.push(timestamp);
      return seen.length < 2;
    },
  };

  scheduler.request(controller);
  frames.shift()(10);
  frames.shift()(5010);
  assert.deepEqual(seen, [10, 60]);
  scheduler.cancelAll();
  assert.equal(scheduler.snapshot().active, 0);
});

test('suspend and resume preserve virtual time without a restoration jump', () => {
  const frames = new Map();
  let nextId = 0;
  const flush = (timestamp) => {
    const [id, callback] = frames.entries().next().value;
    frames.delete(id);
    callback(timestamp);
  };
  const scheduler = createFrameScheduler({
    requestFrame(callback) {
      nextId += 1;
      frames.set(nextId, callback);
      return nextId;
    },
    cancelFrame(id) {
      frames.delete(id);
    },
  });
  const seen = [];
  const controller = {
    update(timestamp) {
      seen.push(timestamp);
      return seen.length < 3;
    },
  };

  scheduler.request(controller);
  flush(100);
  scheduler.suspend();
  scheduler.resume();
  flush(10_000);
  flush(10_016);

  assert.deepEqual(seen, [100, 100, 116]);
});

test('maps an idle event timestamp onto the next scheduler frame', () => {
  const frames = [];
  const scheduler = createFrameScheduler({
    requestFrame(callback) { frames.push(callback); return frames.length; },
    cancelFrame() {},
  });
  scheduler.request({ update() { return false; } });
  frames.shift()(100);

  const startedAt = scheduler.now(250);
  const elapsed = [];
  scheduler.request({
    update(timestamp) {
      elapsed.push(timestamp - startedAt);
      return false;
    },
  });
  frames.shift()(266);
  assert.deepEqual(elapsed, [16]);
});
```

```js
// scripts/test-motion-policy.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveMotionPolicy } from '../src/scripts/motion/policy.mjs';

test('reduced motion and hidden pages disable every animated capability', () => {
  assert.deepEqual(
    deriveMotionPolicy({
      reducedMotion: true,
      finePointer: true,
      hidden: false,
      supportsBlend: true,
      supports3d: true,
      supportsPointer: true,
      supportsPointerCapture: true,
      forcedColors: false,
    }),
    {
      navigationActive: false,
      motionAllowed: false,
      finePointerEffects: false,
      blendAllowed: false,
      perspectiveAllowed: false,
      pointerAllowed: true,
      pointerCaptureAllowed: true,
      reducedMotion: true,
      hidden: false,
      forcedColors: false,
    },
  );
});
```

```js
// scripts/test-motion-lifecycle.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInteractionCoordinator,
  destroyMotion,
  initializeMotion,
} from '../src/scripts/motion/index.mjs';

test('initialization is idempotent and teardown destroys every controller', () => {
  const root = {};
  let mounts = 0;
  let destroys = 0;
  const environment = {
    controllerFactories: [
      () => {
        mounts += 1;
        return { destroy() { destroys += 1; } };
      },
    ],
    requestFrame() { return 1; },
    cancelFrame() {},
    observePolicy({ onChange }) {
      const policy = {
        motionAllowed: true,
        reducedMotion: false,
        hidden: false,
      };
      onChange(policy);
      return policy;
    },
  };

  assert.equal(initializeMotion(root, environment), initializeMotion(root, environment));
  assert.equal(mounts, 1);
  destroyMotion(root);
  assert.equal(destroys, 1);
});

test('higher-priority ownership preempts foreground motion', () => {
  const coordinator = createInteractionCoordinator();
  let cancelled = 0;
  assert.equal(coordinator.claim('card:01', 1, () => { cancelled += 1; }), true);
  assert.equal(coordinator.claim('grid', 2), true);
  assert.equal(coordinator.owner, 'grid');
  assert.equal(cancelled, 1);
  assert.equal(coordinator.claim('burst:01', 1), false);
  coordinator.release('grid');
  assert.equal(coordinator.owner, null);
});

test('a normal release runs one queued follow-up but preemption discards it', () => {
  const coordinator = createInteractionCoordinator();
  const seen = [];
  coordinator.claim('link:/work', 1);
  coordinator.afterRelease('link:/work', 'shuffle:01', () => {
    seen.push('shuffle');
  });
  coordinator.release('link:/work');
  assert.deepEqual(seen, ['shuffle']);

  coordinator.claim('link:/work', 1);
  coordinator.afterRelease('link:/work', 'shuffle:01', () => {
    seen.push('stale');
  });
  coordinator.claim('grid', 2);
  assert.deepEqual(seen, ['shuffle']);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```sh
node --test scripts/test-motion-scheduler.mjs scripts/test-motion-policy.mjs scripts/test-motion-lifecycle.mjs
```

Expected: FAIL with module-not-found errors for the three new runtime files.

- [ ] **Step 3: Implement the scheduler and policy contracts**

Use a virtual capped timeline so controller signatures remain
`update(timestamp)`:

```js
// src/scripts/motion/scheduler.mjs
export function createFrameScheduler({
  requestFrame,
  cancelFrame,
  onError = () => {},
  maxDelta = 50,
}) {
  const active = new Set();
  let frameId = null;
  let suspended = false;
  let destroyed = false;
  let rawTime = null;
  let timeline = null;
  let realignOnNextFrame = false;

  function stopFrame({ resetTimeline = false } = {}) {
    if (frameId !== null) cancelFrame(frameId);
    frameId = null;
    rawTime = null;
    if (resetTimeline) timeline = null;
  }

  function schedule() {
    if (!destroyed && !suspended && active.size > 0 && frameId === null) {
      frameId = requestFrame(tick);
    }
  }

  function tick(timestamp) {
    frameId = null;
    if (timeline === null) timeline = timestamp;
    else if (rawTime !== null) {
      timeline += Math.min(maxDelta, Math.max(0, timestamp - rawTime));
    } else if (realignOnNextFrame) {
      timeline = Math.max(timeline, timestamp);
    }
    rawTime = timestamp;
    realignOnNextFrame = false;

    for (const controller of [...active]) {
      if (!active.has(controller)) continue;
      try {
        if (controller.update(timeline) !== true) active.delete(controller);
      } catch (error) {
        active.delete(controller);
        onError(error, controller);
      }
    }
    if (active.size === 0) {
      rawTime = null;
      realignOnNextFrame = true;
    }
    schedule();
  }

  return {
    request(controller) {
      if (destroyed) return false;
      const wasIdle = active.size === 0;
      active.add(controller);
      if (wasIdle && !suspended) realignOnNextFrame = true;
      schedule();
      return true;
    },
    cancel(controller) {
      active.delete(controller);
      if (active.size === 0) {
        stopFrame();
        realignOnNextFrame = true;
      }
    },
    cancelAll() {
      active.clear();
      stopFrame();
      realignOnNextFrame = true;
    },
    now(rawTimestamp) {
      if (timeline === null) return rawTimestamp;
      if (rawTime === null) {
        return realignOnNextFrame
          ? Math.max(timeline, rawTimestamp)
          : timeline;
      }
      return timeline + Math.min(
        maxDelta,
        Math.max(0, rawTimestamp - rawTime),
      );
    },
    suspend() {
      suspended = true;
      stopFrame();
      realignOnNextFrame = false;
    },
    resume() {
      suspended = false;
      schedule();
    },
    resetTiming() {
      rawTime = null;
      realignOnNextFrame = false;
    },
    destroy() {
      destroyed = true;
      active.clear();
      stopFrame({ resetTimeline: true });
      realignOnNextFrame = false;
    },
    snapshot() {
      return { pending: frameId !== null, active: active.size, suspended };
    },
  };
}

export function createBrowserFrameScheduler(browserWindow, options = {}) {
  return createFrameScheduler({
    requestFrame: browserWindow.requestAnimationFrame.bind(browserWindow),
    cancelFrame: browserWindow.cancelAnimationFrame.bind(browserWindow),
    ...options,
  });
}
```

```js
// src/scripts/motion/policy.mjs
export function deriveMotionPolicy(input) {
  const motionAllowed = !input.reducedMotion && !input.hidden;
  return {
    navigationActive: false,
    motionAllowed,
    finePointerEffects:
      motionAllowed &&
      !input.forcedColors &&
      input.finePointer &&
      input.supportsPointer,
    blendAllowed:
      motionAllowed && !input.forcedColors && input.supportsBlend,
    perspectiveAllowed: motionAllowed && input.supports3d,
    pointerAllowed: input.supportsPointer,
    pointerCaptureAllowed:
      input.supportsPointer && input.supportsPointerCapture,
    reducedMotion: input.reducedMotion,
    hidden: input.hidden,
    forcedColors: input.forcedColors,
  };
}
```

Implement the live observer without assuming `matchMedia`, modern
`MediaQueryList.addEventListener`, or `CSS.supports` exists:

```js
// src/scripts/motion/policy.mjs
export function observeMotionPolicy({
  window: browserWindow,
  document: browserDocument,
  onChange,
  signal,
}) {
  const inertQuery = { matches: false };
  const query = (value) => browserWindow?.matchMedia?.(value) ?? inertQuery;
  const reduced = query('(prefers-reduced-motion: reduce)');
  const fine = query('(hover: hover) and (pointer: fine)');
  const forced = query('(forced-colors: active)');
  const sources = [reduced, fine, forced];
  const legacyCleanups = [];

  const read = () => deriveMotionPolicy({
    reducedMotion: reduced.matches,
    finePointer: fine.matches,
    forcedColors: forced.matches,
    hidden: Boolean(browserDocument?.hidden),
    supportsBlend:
      browserWindow?.CSS?.supports?.('mix-blend-mode', 'difference') ?? false,
    supports3d:
      browserWindow?.CSS?.supports?.('transform-style', 'preserve-3d') ?? false,
    supportsPointer: 'PointerEvent' in (browserWindow ?? {}),
    supportsPointerCapture:
      'setPointerCapture' in (browserWindow?.Element?.prototype ?? {}),
  });
  let current;
  const emit = () => {
    current = read();
    onChange(current);
    return current;
  };

  for (const source of sources) {
    if (source.addEventListener) {
      source.addEventListener('change', emit, { signal });
    } else if (source.addListener) {
      source.addListener(emit);
      legacyCleanups.push(() => source.removeListener?.(emit));
    }
  }
  browserDocument?.addEventListener?.('visibilitychange', emit, { signal });
  signal?.addEventListener('abort', () => {
    for (const cleanup of legacyCleanups) cleanup();
  }, { once: true });
  emit();
  return {
    get current() {
      return current;
    },
    refresh: emit,
  };
}
```

Extend `scripts/test-motion-policy.mjs` with mutable fake media queries and a
signal-aware fake document. Assert the initial callback is synchronous, each
query and visibility change emits exactly once, legacy listeners are removed
on abort, and turning reduced motion back off changes policy without scheduling
work by itself.

- [ ] **Step 4: Implement idempotent mounting and coordination**

```js
// src/scripts/motion/index.mjs
import {
  createBrowserFrameScheduler,
  createFrameScheduler,
} from './scheduler.mjs';
import { observeMotionPolicy } from './policy.mjs';

const mounts = new WeakMap();

export function createSeededRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

export function createInteractionCoordinator(onError = () => {}) {
  let current = null;
  const followups = new Map();
  let preempting = false;

  function discardFollowups(owner) {
    followups.delete(owner);
  }

  function cancelOwner() {
    if (!current) return;
    const previous = current;
    preempting = true;
    try {
      previous.onPreempt();
    } catch (error) {
      onError(error, previous.owner);
    } finally {
      preempting = false;
      if (current?.owner === previous.owner) current = null;
      discardFollowups(previous.owner);
    }
  }
  return {
    claim(owner, priority, onPreempt = () => {}) {
      if (current && current.owner !== owner && current.priority > priority) {
        return false;
      }
      if (current && current.owner !== owner) cancelOwner();
      current = { owner, priority, onPreempt };
      return true;
    },
    release(owner) {
      if (current?.owner !== owner) return;
      current = null;
      const callbacks = [...(followups.get(owner)?.values() ?? [])];
      discardFollowups(owner);
      if (preempting || callbacks.length === 0) return;
      try {
        callbacks.at(-1)();
      } catch (error) {
        onError(error, owner);
      }
    },
    afterRelease(owner, key, callback) {
      if (current?.owner !== owner) return false;
      if (!followups.has(owner)) followups.set(owner, new Map());
      followups.get(owner).set(key, callback);
      return true;
    },
    preempt(owner, priority, onPreempt = () => {}) {
      if (current && current.owner !== owner) cancelOwner();
      current = { owner, priority, onPreempt };
    },
    cancelCurrent() {
      cancelOwner();
      current = null;
    },
    get owner() {
      return current?.owner ?? null;
    },
  };
}

export function initializeMotion(root, environment = {}) {
  if (mounts.has(root)) return mounts.get(root);
  const abortController = new AbortController();
  const browserWindow = environment.window ?? globalThis.window;
  const browserDocument = environment.document ?? globalThis.document;
  const scheduler = environment.scheduler ?? (
    environment.requestFrame
      ? createFrameScheduler({
          requestFrame: environment.requestFrame,
          cancelFrame: environment.cancelFrame ?? (() => {}),
          onError: environment.onError,
          maxDelta: 50,
        })
      : createBrowserFrameScheduler(browserWindow, {
          onError: environment.onError,
          maxDelta: 50,
        })
  );
  const context = {
    root,
    scheduler,
    coordinator: createInteractionCoordinator(environment.onError),
    clock:
      environment.clock ??
      (() => browserWindow?.performance?.now?.() ?? 0),
    random: environment.random ?? createSeededRandom(0x4e4d3031),
    observerFactory:
      environment.observerFactory ??
      ((callback, options) =>
        browserWindow?.IntersectionObserver
          ? new browserWindow.IntersectionObserver(callback, options)
          : null),
    onError: environment.onError ?? (() => {}),
    signal: abortController.signal,
    policy: null,
    refreshPolicy: null,
    lockForNavigation: () => {},
  };
  const controllers = [];
  let navigationLocked = false;
  let latestRawPolicy = null;
  const applyNavigationLock = (policy) => (
    navigationLocked
      ? {
          ...policy,
          navigationActive: true,
          motionAllowed: false,
          finePointerEffects: false,
          blendAllowed: false,
          perspectiveAllowed: false,
        }
      : { ...policy, navigationActive: false }
  );
  const observePolicy = environment.observePolicy ?? observeMotionPolicy;
  const observedPolicy = observePolicy({
    window: browserWindow,
    document: browserDocument,
    signal: abortController.signal,
    onChange(policy) {
      const wasHidden = context.policy?.hidden;
      latestRawPolicy = policy;
      const effectivePolicy = applyNavigationLock(policy);
      context.policy = effectivePolicy;
      for (const controller of controllers) {
        try {
          controller.setPolicy?.(
            controller.navigation ? policy : effectivePolicy,
          );
        } catch (error) {
          context.onError(error, controller);
        }
      }
      const settledPolicy = applyNavigationLock(latestRawPolicy);
      context.policy = settledPolicy;
      if (effectivePolicy.navigationActive && !settledPolicy.navigationActive) {
        for (const controller of controllers) {
          if (controller.navigation) continue;
          try {
            controller.setPolicy?.(settledPolicy);
          } catch (error) {
            context.onError(error, controller);
          }
        }
      }
      if (!settledPolicy.motionAllowed) context.coordinator.cancelCurrent();
      if (settledPolicy.hidden || settledPolicy.navigationActive) {
        scheduler.cancelAll();
        scheduler.suspend();
      } else {
        if (wasHidden) scheduler.resetTiming();
        scheduler.resume();
        if (!settledPolicy.motionAllowed) scheduler.cancelAll();
      }
    },
  });
  if (context.policy === null) {
    latestRawPolicy = observedPolicy?.current ?? observedPolicy;
    context.policy = applyNavigationLock(latestRawPolicy);
  }
  context.refreshPolicy =
    observedPolicy?.refresh?.bind(observedPolicy) ?? (() => context.policy);
  for (const factory of environment.controllerFactories ?? []) {
    try {
      const controller = factory(context);
      if (controller) {
        controllers.push(controller);
        controller.setPolicy?.(context.policy);
      }
    } catch (error) {
      environment.onError?.(error, factory);
    }
  }
  const mount = {
    destroy() {
      abortController.abort();
      for (const controller of controllers) controller.destroy?.();
      scheduler.destroy();
      mounts.delete(root);
    },
  };
  mounts.set(root, mount);
  return mount;
}

export function destroyMotion(root) {
  mounts.get(root)?.destroy();
}
```

- [ ] **Step 5: Add the motion unit command and keep the full test gate green**

Add:

```json
{
  "scripts": {
    "test:motion": "node --test scripts/test-motion-*.mjs",
    "test": "npm run test:motion && npm run build && node --test scripts/test-seo.mjs scripts/test-homepage.mjs scripts/test-hosting.mjs"
  }
}
```

Run:

```sh
npm run test:motion
ASTRO_TELEMETRY_DISABLED=1 npm test
```

Expected: all new unit tests and all existing tests PASS.

- [ ] **Step 6: Commit the shared foundation**

```sh
git add package.json src/scripts/motion/scheduler.mjs src/scripts/motion/policy.mjs src/scripts/motion/index.mjs scripts/test-motion-scheduler.mjs scripts/test-motion-policy.mjs scripts/test-motion-lifecycle.mjs
git commit -m "feat: add shared portfolio motion runtime"
```

---

### Task 2: Canonical poster artwork and static motion shell

**Files:**

- Create: `public/images/project-posters/aurora.svg`
- Create: `public/images/project-posters/embnode.svg`
- Create: `public/images/project-posters/gitops.svg`
- Create: `public/images/project-posters/syslib.svg`
- Create: `src/components/effects/ProjectPoster.astro`
- Create: `src/components/effects/MotionLayer.astro`
- Create: `src/styles/motion.css`
- Modify: `src/layouts/Base.astro:2-19,67-72`
- Modify: `src/pages/index.astro:14`
- Modify: `scripts/test-homepage.mjs`

**Interfaces:**

- `ProjectPoster.astro` consumes:

```ts
interface Props {
  project: Project;
  variant: 'sticker' | 'grid' | 'stack';
  layer?: number;
}
```

- `MotionLayer.astro` consumes `{ kinetic?: boolean }`.
- `Base.astro` adds optional `kinetic?: boolean`, defaulting to `false`.
- Produces stable DOM markers:
  - `[data-motion-root]`
  - two `[data-motion-blob]`
  - 24 `[data-motion-sticker]`
  - eight `[data-motion-particle]`
  - `[data-motion-wipe]` with three panels.

- [ ] **Step 1: Add failing built-markup and asset assertions**

Append a focused test:

```js
test('motion markup uses fixed decorative pools and canonical poster assets', async () => {
  const html = await readHomepage();
  const posterPaths = [
    'public/images/project-posters/aurora.svg',
    'public/images/project-posters/embnode.svg',
    'public/images/project-posters/gitops.svg',
    'public/images/project-posters/syslib.svg',
  ];

  await Promise.all(
    posterPaths.map((path) => assert.doesNotReject(access(new URL(path, repoRoot)))),
  );
  assert.match(html, /data-motion-root/);
  assert.equal((html.match(/data-motion-blob=/g) ?? []).length, 2);
  assert.equal((html.match(/data-motion-sticker(?:\s|=)/g) ?? []).length, 24);
  assert.equal((html.match(/data-motion-particle(?:\s|=)/g) ?? []).length, 8);
  assert.equal((html.match(/data-motion-wipe-panel/g) ?? []).length, 3);
  assert.match(html, /data-motion-root[^>]*aria-hidden="true"/);
  assert.doesNotMatch(html, /data-motion-grid[^>]*tabindex="0"/);
});
```

Run:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run build
node --test --test-name-pattern="motion markup" scripts/test-homepage.mjs
```

Expected: FAIL because the assets and motion root do not exist.

- [ ] **Step 2: Create the four geometry-only SVG backgrounds**

Use exact stable view boxes and palette-only geometry. The four files must not
contain project names, indexes, periods, stacks, facts, or metrics.

```svg
<!-- aurora.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500">
  <rect width="1200" height="1500" fill="#101010"/>
  <circle cx="820" cy="420" r="390" fill="#ffeb09"/>
  <path d="M0 1180C250 900 470 1380 760 1030s440-90 440-90v560H0Z" fill="#b8ff39"/>
  <path d="M90 170h640v70H90zm0 120h420v28H90z" fill="#f7f5ee"/>
</svg>
```

```svg
<!-- embnode.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500">
  <rect width="1200" height="1500" fill="#f7f5ee"/>
  <path d="M0 0h1200v360H0zM0 1140h1200v360H0z" fill="#ef362f"/>
  <g fill="#101010"><circle cx="250" cy="750" r="170"/><circle cx="600" cy="750" r="170"/><circle cx="950" cy="750" r="170"/></g>
  <path d="M80 500h1040M80 1000h1040" stroke="#101010" stroke-width="38"/>
</svg>
```

```svg
<!-- gitops.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500">
  <rect width="1200" height="1500" fill="#b8ff39"/>
  <path d="M0 0h600v750H0zm600 750h600v750H600z" fill="#101010"/>
  <path d="M600 0h600v750H600zM0 750h600v750H0z" fill="#ffeb09"/>
  <path d="M110 1400 1090 100M110 100l980 1300" stroke="#ef362f" stroke-width="52"/>
</svg>
```

```svg
<!-- syslib.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1500">
  <rect width="1200" height="1500" fill="#ffeb09"/>
  <g fill="none" stroke="#101010" stroke-width="42">
    <rect x="100" y="100" width="1000" height="1300"/>
    <rect x="220" y="220" width="760" height="1060"/>
    <rect x="340" y="340" width="520" height="820"/>
  </g>
  <circle cx="600" cy="750" r="180" fill="#ef362f"/>
</svg>
```

- [ ] **Step 3: Render factual poster composites from `site.ts`**

```astro
---
// src/components/effects/ProjectPoster.astro
import type { Project } from '../../data/site';

interface Props {
  project: Project;
  variant: 'sticker' | 'grid' | 'stack';
  layer?: number;
}

const { project, variant, layer = 0 } = Astro.props;
const slug = project.name.toLowerCase();
const background = `/images/project-posters/${slug}.svg`;
const detail = project.metrics?.[0]
  ? `${project.metrics[0].value} / ${project.metrics[0].label}`
  : project.facts[0];
---

<figure
  class:list={['project-poster', `project-poster--${variant}`]}
  data-motion-poster={project.index}
  data-layer={layer}
  aria-hidden="true"
>
  <img src={background} alt="" width="1200" height="1500" loading="lazy" />
  <figcaption>
    <span>{project.index}</span>
    <strong>{project.name}</strong>
    {project.period && <small>{project.period}</small>}
    <small>{project.stack.slice(0, 3).join(' / ')}</small>
    <small>{detail}</small>
  </figcaption>
</figure>
```

No project text belongs in the SVG files. The component must always receive a
real `Project` object from `site.ts`.

- [ ] **Step 4: Render the fixed global pools and one bundled entry**

```astro
---
// src/components/effects/MotionLayer.astro
import { projects } from '../../data/site';
import ProjectPoster from './ProjectPoster.astro';

interface Props { kinetic?: boolean; }
const { kinetic = false } = Astro.props;
const stickers = Array.from({ length: 24 }, (_, index) => projects[index % projects.length]);
---

<div
  class="motion-layer"
  data-motion-root
  data-motion-kinetic={kinetic ? 'true' : 'false'}
  aria-hidden="true"
>
  <div class="motion-blobs" data-motion-blobs>
    <span data-motion-blob="lead"></span>
    <span data-motion-blob="trail"></span>
  </div>
  <div class="motion-particles" data-motion-particles>
    {Array.from({ length: 8 }, (_, index) => <span data-motion-particle={index}></span>)}
  </div>
  <div class="motion-wipe" data-motion-wipe>
    <span data-motion-wipe-panel="red"></span>
    <span data-motion-wipe-panel="yellow"></span>
    <span data-motion-wipe-panel="green"></span>
  </div>
  {kinetic && (
    <div class="motion-stickers" data-motion-stickers>
      {stickers.map((project, index) => (
        <span data-motion-sticker={index}>
          <ProjectPoster project={project} variant="sticker" />
        </span>
      ))}
    </div>
  )}
</div>

<script>
  import { initializeMotion } from '../../scripts/motion/index.mjs';
  const root = document.querySelector('[data-motion-root]');
  if (root) initializeMotion(root);
</script>
```

Update `Base.astro` to import `motion.css` and `MotionLayer`, add the optional
prop, render `<MotionLayer kinetic={kinetic} />` after `<slot />`, and change
the homepage invocation to `<Base structuredData={identityGraph} kinetic>`.
Do not move or wrap `Nav`, `main`, its six children, or `Footer`.

- [ ] **Step 5: Add safe static CSS foundations**

```css
/* src/styles/motion.css */
.motion-layer {
  position: fixed;
  inset: 0;
  z-index: 40;
  overflow: clip;
  pointer-events: none;
  isolation: isolate;
}

[data-motion-blob],
[data-motion-sticker],
[data-motion-particle],
[data-motion-wipe-panel] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.project-poster {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border: var(--rule);
  background: var(--paper);
}

.project-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-poster figcaption {
  position: absolute;
  inset: auto 0 0;
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.motion-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@supports not (mix-blend-mode: difference) {
  [data-motion-blobs] { display: none; }
}

@media (forced-colors: active), (prefers-reduced-motion: reduce) {
  [data-motion-blobs],
  [data-motion-stickers],
  [data-motion-particles],
  [data-motion-wipe] {
    display: none;
  }
}
```

- [ ] **Step 6: Build and verify GREEN**

Run:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run build
node --test --test-name-pattern="motion markup" scripts/test-homepage.mjs
ASTRO_TELEMETRY_DISABLED=1 npm test
```

Expected: the focused test and full suite PASS; built writing pages contain the
same single module but no poster URLs.

- [ ] **Step 7: Commit the static foundation**

```sh
git add public/images/project-posters src/components/effects/ProjectPoster.astro src/components/effects/MotionLayer.astro src/styles/motion.css src/layouts/Base.astro src/pages/index.astro scripts/test-homepage.mjs
git commit -m "feat: add canonical kinetic poster shell"
```

---

### Task 3: Liquid blobs, sticker trail, and chaotic link bursts

**Files:**

- Create: `src/scripts/motion/pointer-effects.mjs`
- Create: `scripts/test-motion-pointer-effects.mjs`
- Modify: `src/scripts/motion/index.mjs`
- Modify: `src/components/Nav.astro:10-23`
- Modify: `src/components/Hero.astro:10,27-31`
- Modify: `src/components/Projects.astro:8,24-28`
- Modify: `src/components/ProjectCard.astro:23-31`
- Modify: `src/components/Contact.astro:14-19`
- Modify: `src/styles/motion.css`

**Interfaces:**

- Consumes the shared controller context from Task 1.
- Produces:
  - `shouldSpawnSticker(previousSample, nextSample, limits) -> boolean`
  - `createBurst({ seed, triggerCount, limit, lifetime }) -> Particle[]`
  - `advanceBlob(state, target, elapsed, config) -> BlobState`
  - `mountPointerEffects(context) -> controller`

- [ ] **Step 1: Write failing pure pointer-effect tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceBlob,
  createBurst,
  shouldSpawnSticker,
} from '../src/scripts/motion/pointer-effects.mjs';

test('stickers require both 60 pixels and 60 milliseconds', () => {
  const previous = { x: 0, y: 0, timestamp: 0 };
  assert.equal(
    shouldSpawnSticker(null, { x: 100, y: 0, timestamp: 100 }, {
      minDistance: 60,
      minInterval: 60,
    }),
    false,
  );
  assert.equal(
    shouldSpawnSticker(previous, { x: 59, y: 0, timestamp: 80 }, {
      minDistance: 60,
      minInterval: 60,
    }),
    false,
  );
  assert.equal(
    shouldSpawnSticker(previous, { x: 60, y: 0, timestamp: 59 }, {
      minDistance: 60,
      minInterval: 60,
    }),
    false,
  );
  assert.equal(
    shouldSpawnSticker(previous, { x: 60, y: 0, timestamp: 60 }, {
      minDistance: 60,
      minInterval: 60,
    }),
    true,
  );
});

test('burst output is deterministic, capped at eight, and expires at 300ms', () => {
  const first = createBurst({ seed: 11, triggerCount: 3, limit: 8, lifetime: 300 });
  const second = createBurst({ seed: 11, triggerCount: 3, limit: 8, lifetime: 300 });
  assert.deepEqual(first, second);
  assert.equal(first.length, 8);
  assert.ok(first.every((particle) => particle.expiresAt === 300));
  assert.ok(first.every((particle) => ['✦', '◆', '⚡', '↗', '01', '02', '03', '04'].includes(particle.symbol)));
});

test('blob springs approach the target without overshooting the configured bound', () => {
  const next = advanceBlob(
    { x: 0, y: 0, vx: 0, vy: 0 },
    { x: 100, y: 50 },
    16,
    { stiffness: 0.014, damping: 0.78, maxSpeed: 32 },
  );
  assert.ok(next.x > 0 && next.x < 100);
  assert.ok(next.y > 0 && next.y < 50);
  assert.ok(Math.hypot(next.vx, next.vy) <= 32);
});
```

Run:

```sh
node --test scripts/test-motion-pointer-effects.mjs
```

Expected: FAIL because `pointer-effects.mjs` does not exist.

- [ ] **Step 2: Implement deterministic math and fixed-pool ownership**

```js
export const BURST_SYMBOLS = ['✦', '◆', '⚡', '↗', '01', '02', '03', '04'];

export function shouldSpawnSticker(previous, next, limits) {
  if (!previous) return false;
  return (
    next.timestamp - previous.timestamp >= limits.minInterval &&
    Math.hypot(next.x - previous.x, next.y - previous.y) >= limits.minDistance
  );
}

export function advanceBlob(state, target, elapsed, config) {
  const scale = Math.min(elapsed, 50);
  let vx = (state.vx + (target.x - state.x) * config.stiffness * scale) * config.damping;
  let vy = (state.vy + (target.y - state.y) * config.stiffness * scale) * config.damping;
  const speed = Math.hypot(vx, vy);
  if (speed > config.maxSpeed) {
    vx *= config.maxSpeed / speed;
    vy *= config.maxSpeed / speed;
  }
  return { x: state.x + vx, y: state.y + vy, vx, vy };
}

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createBurst({ seed, triggerCount, limit, lifetime }) {
  const random = seeded(seed ^ triggerCount);
  return Array.from({ length: Math.min(8, limit) }, (_, index) => ({
    symbol: BURST_SYMBOLS[Math.floor(random() * BURST_SYMBOLS.length)],
    x: (random() - 0.5) * 96,
    y: -24 - random() * 72,
    rotation: (random() - 0.5) * 80,
    scale: 0.75 + random() * 0.75,
    colorIndex: index % 3,
    expiresAt: lifetime,
  }));
}
```

`mountPointerEffects()` must:

- listen through the supplied abort signal;
- activate blobs only inside `[data-motion-hero]` or
  `[data-motion-showcase]`;
- activate stickers only inside `[data-motion-showcase]`;
- recycle the next of exactly 24 pre-rendered nodes;
- hide each sticker no later than 900ms;
- reuse exactly eight pre-rendered particle nodes per burst;
- treat hover, focus, and pointer activation on `[data-motion-burst]` equally;
- process `getCoalescedEvents()` when available, otherwise the parent event;
- stop on leave, blur, hidden policy, reduced motion, or grid ownership;
- never call RAF, timers, or `Math.random()` directly.

Use one scheduler client for blob and transient-pool state:

```js
export function mountPointerEffects(context) {
  const stickerNodes = [...context.root.querySelectorAll('[data-motion-sticker]')];
  const particleNodes = [...context.root.querySelectorAll('[data-motion-particle]')];
  const blobNodes = [...context.root.querySelectorAll('[data-motion-blob]')];
  const state = {
    pointer: null,
    previousFrame: null,
    running: false,
    lastSticker: null,
    stickerCursor: 0,
    triggerCount: 0,
    burstOwner: null,
    stickers: [],
    particles: [],
    blobs: blobNodes.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 })),
  };

  const controller = {
    update(timestamp) {
      const elapsed = state.previousFrame === null ? 0 : timestamp - state.previousFrame;
      state.previousFrame = timestamp;
      if (context.coordinator.owner === 'grid') {
        state.pointer = null;
        state.stickers = [];
      }
      state.stickers = state.stickers
        .map((item) => ({ ...item, remaining: item.remaining - elapsed }))
        .filter((item) => item.remaining > 0);
      state.particles = state.particles
        .map((item) => ({ ...item, remaining: item.remaining - elapsed }))
        .filter((item) => item.remaining > 0);
      if (state.particles.length === 0 && state.burstOwner) {
        context.coordinator.release(state.burstOwner);
        state.burstOwner = null;
      }
      let blobMoving = false;
      if (
        state.pointer &&
        context.policy.finePointerEffects &&
        context.coordinator.owner !== 'grid'
      ) {
        state.blobs = state.blobs.map((blob, index) =>
          advanceBlob(blob, state.pointer, elapsed, {
            stiffness: index === 0 ? 0.014 : 0.009,
            damping: index === 0 ? 0.78 : 0.82,
            maxSpeed: 32,
          }),
        );
        blobMoving = state.blobs.some((blob) =>
          Math.hypot(blob.vx, blob.vy) > 0.05 ||
          Math.hypot(blob.x - state.pointer.x, blob.y - state.pointer.y) > 0.5,
        );
      }
      blobNodes.forEach((node, index) => {
        const blob = state.blobs[index];
        node.style.setProperty('--blob-x', `${blob.x}px`);
        node.style.setProperty('--blob-y', `${blob.y}px`);
        const speed = Math.hypot(blob.vx, blob.vy);
        const stretch = Math.min(0.18, speed / 160);
        node.style.setProperty('--blob-scale-x', String(1 + stretch));
        node.style.setProperty('--blob-scale-y', String(1 - stretch * 0.5));
        node.style.setProperty(
          '--blob-rotate',
          `${Math.atan2(blob.vy, blob.vx) * (180 / Math.PI)}deg`,
        );
        node.toggleAttribute(
          'data-active',
          Boolean(state.pointer && context.policy.finePointerEffects),
        );
      });
      stickerNodes.forEach((node, index) => {
        const item = state.stickers.find((entry) => entry.index === index);
        node.toggleAttribute('data-active', Boolean(item));
        if (!item) return;
        const progress = 1 - item.remaining / 900;
        node.style.setProperty('--sticker-x', `${item.x}px`);
        node.style.setProperty('--sticker-y', `${item.y + progress * 72}px`);
        node.style.setProperty('--sticker-rotate', `${item.rotation}deg`);
        node.style.opacity = String(Math.max(0, 1 - progress));
      });
      particleNodes.forEach((node, index) => {
        const item = state.particles[index];
        node.toggleAttribute('data-active', Boolean(item));
        if (!item) return;
        const progress = 1 - item.remaining / item.duration;
        node.textContent = item.symbol;
        node.style.setProperty(
          '--particle-x',
          `${item.originX + item.x * progress}px`,
        );
        node.style.setProperty(
          '--particle-y',
          `${item.originY + item.y * progress}px`,
        );
        node.style.setProperty('--particle-rotate', `${item.rotation}deg`);
        node.style.setProperty('--particle-scale', String(item.scale));
        node.style.opacity = String(Math.max(0, 1 - progress));
        node.style.setProperty(
          '--particle-color',
          ['var(--red)', 'var(--yellow)', 'var(--green)'][item.colorIndex],
        );
      });
      const needsAnotherFrame = Boolean(
        blobMoving ||
        state.stickers.length ||
        state.particles.length,
      );
      state.running = needsAnotherFrame;
      if (!needsAnotherFrame) state.previousFrame = null;
      return needsAnotherFrame;
    },
    setPolicy(policy) {
      if (!policy.finePointerEffects) {
        state.pointer = null;
        state.stickers = [];
        for (const node of [...blobNodes, ...stickerNodes]) {
          node.removeAttribute('data-active');
        }
      }
      if (!policy.motionAllowed || policy.forcedColors) {
        state.particles = [];
        for (const node of particleNodes) node.removeAttribute('data-active');
        if (state.burstOwner) context.coordinator.release(state.burstOwner);
        state.burstOwner = null;
        state.running = false;
        state.previousFrame = null;
      }
      if (!policy.finePointerEffects && state.particles.length === 0) {
        state.running = false;
        state.previousFrame = null;
        context.scheduler.cancel(controller);
      }
    },
    destroy() {
      state.pointer = null;
      state.running = false;
      state.previousFrame = null;
      state.stickers = [];
      state.particles = [];
      context.scheduler.cancel(controller);
      if (state.burstOwner) context.coordinator.release(state.burstOwner);
      state.burstOwner = null;
      for (const node of [...stickerNodes, ...particleNodes, ...blobNodes]) {
        node.removeAttribute('data-active');
        node.removeAttribute('style');
      }
    },
  };

  context.root.ownerDocument.addEventListener('pointermove', handlePointerMove, {
    signal: context.signal,
    passive: true,
  });
  context.root.ownerDocument.addEventListener('focusin', handleBurstTrigger, {
    signal: context.signal,
  });
  context.root.ownerDocument.addEventListener('pointerover', handleBurstTrigger, {
    signal: context.signal,
    passive: true,
  });
  context.root.ownerDocument.addEventListener('pointerdown', handleBurstTrigger, {
    signal: context.signal,
    passive: true,
  });

  function handlePointerMove(event) {
    const samples = event.getCoalescedEvents?.() || [event];
    for (const sample of samples) {
      const zone = event.target.closest?.(
        '[data-motion-hero], [data-motion-showcase]',
      );
      if (!zone || !context.policy.finePointerEffects) {
        state.pointer = null;
        state.lastSticker = null;
        state.stickers = [];
        for (const node of [...blobNodes, ...stickerNodes]) {
          node.removeAttribute('data-active');
        }
        continue;
      }
      if (context.coordinator.owner === 'grid') {
        state.pointer = null;
        state.lastSticker = null;
        continue;
      }
      state.pointer = { x: sample.clientX, y: sample.clientY };
      const inShowcase = zone.matches('[data-motion-showcase]');
      if (!inShowcase) {
        state.lastSticker = null;
        continue;
      }
      const nextSticker = {
        x: sample.clientX,
        y: sample.clientY,
        timestamp: sample.timeStamp,
      };
      if (!state.lastSticker) {
        state.lastSticker = nextSticker;
        continue;
      }
      if (
        [null, 'grid-inertia'].includes(context.coordinator.owner) &&
        shouldSpawnSticker(
          state.lastSticker,
          nextSticker,
          { minDistance: 60, minInterval: 60 },
        )
      ) {
        const index = state.stickerCursor % stickerNodes.length;
        state.stickerCursor += 1;
        state.stickers = state.stickers.filter((item) => item.index !== index);
        state.stickers.push({
          index,
          x: sample.clientX,
          y: sample.clientY,
          rotation: (context.random() - 0.5) * 24,
          remaining: 900,
        });
        state.lastSticker = nextSticker;
      }
    }
    if (!state.pointer && state.stickers.length === 0 && state.particles.length === 0) {
      state.running = false;
      state.previousFrame = null;
      context.scheduler.cancel(controller);
      return;
    }
    if (!state.running) {
      state.previousFrame = context.scheduler.now(context.clock());
    }
    state.running = true;
    context.scheduler.request(controller);
  }

  function handleBurstTrigger(event) {
    const target = event.target.closest?.('[data-motion-burst]');
    if (
      !target ||
      !context.policy.motionAllowed ||
      context.policy.forcedColors ||
      context.coordinator.owner === 'grid'
    ) return;
    if (
      event.type === 'pointerover' &&
      event.relatedTarget &&
      target.contains(event.relatedTarget)
    ) return;
    const owner = `link:${target.getAttribute('href') ?? target.textContent}`;
    if (!context.coordinator.claim(owner, 1, cancelBurst)) return;
    if (state.burstOwner && state.burstOwner !== owner) {
      context.coordinator.release(state.burstOwner);
    }
    state.burstOwner = owner;
    const rect = target.getBoundingClientRect();
    const hasTextFollowup = Boolean(
      target.closest('[data-motion-shake-related], [data-motion-card]'),
    );
    const lifetime = hasTextFollowup ? 100 : 300;
    state.triggerCount += 1;
    state.particles = createBurst({
      seed: 0x4e4d3031,
      triggerCount: state.triggerCount,
      limit: particleNodes.length,
      lifetime,
    }).map((item) => ({
      ...item,
      originX: rect.left + rect.width / 2,
      originY: rect.top + rect.height / 2,
      duration: lifetime,
      remaining: item.expiresAt,
    }));
    if (!state.running) {
      state.previousFrame = context.scheduler.now(context.clock());
    }
    state.running = true;
    context.scheduler.request(controller);
  }

  function cancelBurst() {
    state.particles = [];
    state.burstOwner = null;
    for (const node of particleNodes) node.removeAttribute('data-active');
  }

  return controller;
}
```

Add signal-owned `pointerout` and window `blur` handlers. When the related
target remains inside the same marked zone, do nothing; otherwise clear
`state.pointer` and `state.lastSticker`, remove blob active flags, and request
one cleanup frame only
when a transient still exists. Observe Hero and Work with the shared
`observerFactory`; keep a two-bit visibility map and ignore pointer/scroll
events for an offscreen zone. The observer fallback is event-driven and never
starts a frame by itself. Policy cancellation and destroy call `cancelBurst()`,
clear stickers, release any foreground owner, disconnect the observer, and
remove every active flag. The existing passive listeners never call
`preventDefault()`. The adapter test must enter Hero, move more than 60px,
then cross into Work and prove the first Work sample only establishes a new
baseline; no sticker may be spawned from cross-zone travel.
Inject a trigger between scheduler frames and assert the event-mapped
scheduler timestamp counts that partial interval: burst particles are gone by
their 100/300ms logical deadlines and stickers by 900ms, rather than starting
their clocks on the first subsequent frame.

- [ ] **Step 3: Add only marker attributes to existing semantic elements**

Use:

```astro
<section id="top" class="cover" data-motion-hero aria-labelledby="cover-title">
<section id="work" class="chapter work" data-motion-showcase aria-labelledby="work-title">
<a class="btn" data-motion-burst href={resume}>Resume</a>
```

Mark the existing brand and primary-nav anchors, hero action anchors, featured
and secondary project anchors, and contact anchors. Do not wrap, clone, reorder,
or change their hrefs.

- [ ] **Step 4: Add bounded pointer-effect CSS**

```css
[data-motion-blob] {
  width: clamp(10rem, 24vw, 22rem);
  aspect-ratio: 1;
  border-radius: 48% 52% 61% 39% / 43% 37% 63% 57%;
  background: var(--white);
  mix-blend-mode: difference;
  transform: translate3d(var(--blob-x, -200vw), var(--blob-y, -200vh), 0)
    rotate(var(--blob-rotate, 0deg))
    scale(var(--blob-scale-x, 1), var(--blob-scale-y, 1));
}

[data-motion-sticker] {
  width: clamp(7rem, 12vw, 11rem);
  transform: translate3d(var(--sticker-x), var(--sticker-y), 0)
    rotate(var(--sticker-rotate));
}

[data-motion-particle] {
  font: 900 1.3rem/1 var(--font-mono);
  color: var(--particle-color);
  transform: translate3d(var(--particle-x), var(--particle-y), 0)
    rotate(var(--particle-rotate)) scale(var(--particle-scale));
}

[data-motion-blob][data-active],
[data-motion-sticker][data-active],
[data-motion-particle][data-active] {
  opacity: 1;
}
```

- [ ] **Step 5: Register the controller and verify**

Import `mountPointerEffects` into `index.mjs` and include it in the default
controller factories only when the root has `data-motion-kinetic="true"`.

Run:

```sh
npm run test:motion
ASTRO_TELEMETRY_DISABLED=1 npm test
```

Expected: pointer tests and the full suite PASS.

- [ ] **Step 6: Commit pointer effects**

```sh
git add src/scripts/motion/pointer-effects.mjs scripts/test-motion-pointer-effects.mjs src/scripts/motion/index.mjs src/components/Nav.astro src/components/Hero.astro src/components/Projects.astro src/components/ProjectCard.astro src/components/Contact.astro src/styles/motion.css
git commit -m "feat: add kinetic pointer effects"
```

---

### Task 4: Scroll-reactive hero marquee

**Files:**

- Create: `src/scripts/motion/marquee.mjs`
- Create: `src/components/effects/KineticMarquee.astro`
- Create: `scripts/test-motion-marquee.mjs`
- Modify: `src/scripts/motion/index.mjs`
- Modify: `src/components/Hero.astro:1-4,23-33`
- Modify: `src/styles/motion.css`
- Modify: `scripts/test-homepage.mjs`

**Interfaces:**

- Produces:
  - `createMarqueeState(initial)`
  - `sampleScroll(state, { scrollY, timestamp }, config)`
  - `advanceMarquee(state, elapsed, config)`
  - `mountMarquee(context)`

- [ ] **Step 1: Write failing velocity, reversal, and stop tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceMarquee,
  createMarqueeState,
  sampleScroll,
} from '../src/scripts/motion/marquee.mjs';

test('signed scroll velocity accelerates and reverses the marquee', () => {
  let state = createMarqueeState({ scrollY: 100, timestamp: 0 });
  state = sampleScroll(state, { scrollY: 220, timestamp: 40 }, {
    impulse: 12,
    maxVelocity: 40,
  });
  assert.ok(state.velocity > 0);
  state = sampleScroll(state, { scrollY: 120, timestamp: 80 }, {
    impulse: 12,
    maxVelocity: 40,
  });
  assert.ok(state.velocity < 0);
});

test('marquee reaches zero no later than 250ms after input', () => {
  let state = { ...createMarqueeState({ scrollY: 0, timestamp: 0 }), velocity: 30 };
  for (let elapsed = 0; elapsed < 250; elapsed += 25) {
    state = advanceMarquee(state, 25, { decay: 0.58, stopVelocity: 0.25 });
  }
  assert.equal(state.velocity, 0);
  assert.equal(state.active, false);
});

test('marquee position remains inside one repeated-track span', () => {
  const state = advanceMarquee(
    { ...createMarqueeState(), position: 95, velocity: 20, active: true },
    16,
    { decay: 1, stopVelocity: 0.01, wrapSpan: 100 },
  );
  assert.ok(state.position >= 0 && state.position < 100);
});
```

Run:

```sh
node --test scripts/test-motion-marquee.mjs
```

Expected: FAIL because `marquee.mjs` does not exist.

- [ ] **Step 2: Implement finite marquee state**

```js
export function createMarqueeState({ scrollY = 0, timestamp = 0 } = {}) {
  return { position: 0, velocity: 0, scrollY, timestamp, active: false };
}

export function sampleScroll(state, sample, config) {
  const elapsed = Math.max(1, sample.timestamp - state.timestamp);
  const signed = ((sample.scrollY - state.scrollY) / elapsed) * config.impulse;
  return {
    ...state,
    velocity: Math.max(-config.maxVelocity, Math.min(config.maxVelocity, signed)),
    scrollY: sample.scrollY,
    timestamp: sample.timestamp,
    active: true,
  };
}

export function advanceMarquee(state, elapsed, config) {
  const velocity = Math.abs(state.velocity) <= config.stopVelocity
    ? 0
    : state.velocity * Math.pow(config.decay, elapsed / 25);
  const rawPosition = state.position + velocity * (elapsed / 16.667);
  const wrapSpan = config.wrapSpan ?? Number.MAX_SAFE_INTEGER;
  return {
    ...state,
    position: ((rawPosition % wrapSpan) + wrapSpan) % wrapSpan,
    velocity,
    active: velocity !== 0,
  };
}
```

Implement the event-driven adapter:

```js
export function mountMarquee(context) {
  const document = context.root.ownerDocument;
  const browserWindow = document.defaultView;
  const element = document.querySelector('[data-motion-marquee]');
  const hero = element?.closest('[data-motion-hero]');
  const tracks = [...(element?.querySelectorAll('[data-motion-marquee-track]') ?? [])];
  if (!browserWindow || !element || !hero || tracks.length !== 2) return null;

  element.setAttribute('data-motion-enhanced', '');
  const wrapSpan = tracks[0].scrollWidth;
  if (wrapSpan <= 0) {
    element.removeAttribute('data-motion-enhanced');
    return null;
  }
  let state = createMarqueeState({
    scrollY: browserWindow.scrollY,
    timestamp: context.clock(),
  });
  let previousFrame = null;
  let nearViewport = true;
  let controller;
  let observer;
  try {
    observer = context.observerFactory?.((entries) => {
    nearViewport = entries.some((entry) => entry.isIntersecting);
    if (!nearViewport) {
      state = { ...state, velocity: 0, active: false };
      previousFrame = null;
      context.scheduler.cancel(controller);
    }
    }, { rootMargin: '25% 0px' });
    if (observer) {
      nearViewport = false;
      observer.observe(hero);
    }
  } catch (error) {
    element.removeAttribute('data-motion-enhanced');
    throw error;
  }

  controller = {
    update(timestamp) {
      if (
        !nearViewport ||
        !context.policy.motionAllowed ||
        context.policy.forcedColors
      ) return false;
      const elapsed = previousFrame === null ? 0 : timestamp - previousFrame;
      previousFrame = timestamp;
      state = advanceMarquee(state, elapsed, {
        decay: 0.58,
        stopVelocity: 0.25,
        wrapSpan,
      });
      element.style.setProperty('--motion-marquee-x', `${-state.position}px`);
      return state.active;
    },
    setPolicy(policy) {
      if (!policy.motionAllowed || policy.forcedColors) {
        state = { ...state, velocity: 0, active: false, position: 0 };
        previousFrame = null;
        element.style.setProperty('--motion-marquee-x', '0px');
        context.scheduler.cancel(controller);
      }
    },
    destroy() {
      context.scheduler.cancel(controller);
      observer?.disconnect();
      element.removeAttribute('data-motion-enhanced');
      element.style.removeProperty('--motion-marquee-x');
    },
  };

  function onScroll() {
    if (
      !nearViewport ||
      !context.policy.motionAllowed ||
      context.policy.forcedColors
    ) return;
    state = sampleScroll(state, {
      scrollY: browserWindow.scrollY,
      timestamp: context.clock(),
    }, { impulse: 12, maxVelocity: 40 });
    context.scheduler.request(controller);
  }
  try {
    browserWindow.addEventListener('scroll', onScroll, {
      signal: context.signal,
      passive: true,
    });
  } catch (error) {
    observer?.disconnect();
    element.removeAttribute('data-motion-enhanced');
    throw error;
  }
  return controller;
}
```

The adapter test must drive the fake observer offscreen and prove subsequent
scroll events enqueue no frame, drive it onscreen and prove one frame is
enqueued, then drive it offscreen again and prove the controller cancels
immediately. The only per-frame DOM write is `--motion-marquee-x`; the track
width is read once during mount.

- [ ] **Step 3: Render one semantic source and hidden visual tracks**

```astro
<!-- src/components/effects/KineticMarquee.astro -->
<p class="kinetic-marquee" data-motion-marquee>
  <span class="kinetic-marquee__source">SYSTEMS / SECURITY / PRODUCT</span>
  <span class="kinetic-marquee__track" data-motion-marquee-track aria-hidden="true">
    SYSTEMS / SECURITY / PRODUCT / SYSTEMS / SECURITY / PRODUCT
  </span>
  <span class="kinetic-marquee__track" data-motion-marquee-track aria-hidden="true">
    SYSTEMS / SECURITY / PRODUCT / SYSTEMS / SECURITY / PRODUCT
  </span>
</p>
```

Import and render `<KineticMarquee />` inside `Hero.astro`, after
`.cover__content` and before `</section>`. Keep the semantic source visible
without JavaScript; enhanced CSS overlays the tracks only after mounting.

- [ ] **Step 4: Add a failing markup assertion, then register and style**

```js
test('hero marquee keeps one semantic source and hidden visual tracks', async () => {
  const html = await readHomepage();
  const marquee = html.match(/<p class="kinetic-marquee"[\s\S]*?<\/p>/)?.[0] ?? '';
  assert.match(marquee, /kinetic-marquee__source[^>]*>SYSTEMS \/ SECURITY \/ PRODUCT/);
  assert.equal((marquee.match(/data-motion-marquee-track/g) ?? []).length, 2);
  assert.equal((marquee.match(/aria-hidden="true"/g) ?? []).length, 2);
});
```

```css
.kinetic-marquee {
  position: absolute;
  inset: auto 0 0;
  min-height: clamp(3rem, 6vw, 5.5rem);
  overflow: hidden;
  border-top: var(--rule);
  background: var(--red);
  font: 900 clamp(1.2rem, 3vw, 2.8rem)/1 var(--font-display);
  white-space: nowrap;
}

.kinetic-marquee__track {
  position: absolute;
  inset: 50% auto auto 0;
  transform: translate3d(var(--motion-marquee-x, 0), -50%, 0);
}

.kinetic-marquee:not([data-motion-enhanced]) .kinetic-marquee__track {
  display: none;
}

.kinetic-marquee[data-motion-enhanced] .kinetic-marquee__source {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.kinetic-marquee[data-motion-enhanced] .kinetic-marquee__track:last-child {
  transform: translate3d(
    calc(var(--motion-marquee-x, 0px) + 100%),
    -50%,
    0
  );
}

@media (prefers-reduced-motion: reduce), (forced-colors: active) {
  .kinetic-marquee[data-motion-enhanced] .kinetic-marquee__source {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
    clip-path: none;
  }

  .kinetic-marquee[data-motion-enhanced] .kinetic-marquee__track {
    display: none;
  }
}
```

Register `mountMarquee` as a homepage controller. Set
`data-motion-enhanced` on the marquee root only after its listener and
intersection gate mount successfully, and remove it on destroy. A factory
failure must leave the semantic source visible and both duplicate tracks
hidden.

- [ ] **Step 5: Verify and commit**

```sh
npm run test:motion
ASTRO_TELEMETRY_DISABLED=1 npm test
git add src/scripts/motion/marquee.mjs src/components/effects/KineticMarquee.astro scripts/test-motion-marquee.mjs src/scripts/motion/index.mjs src/components/Hero.astro src/styles/motion.css scripts/test-homepage.mjs
git commit -m "feat: add scroll-reactive hero marquee"
```

---

### Task 5: Infinite draggable project grid

**Files:**

- Create: `src/scripts/motion/grid.mjs`
- Create: `src/components/effects/InfiniteProjectGrid.astro`
- Create: `scripts/test-motion-grid.mjs`
- Modify: `src/scripts/motion/index.mjs`
- Modify: `src/components/Projects.astro:1-14`
- Modify: `src/styles/motion.css`
- Modify: `scripts/test-homepage.mjs`

**Interfaces:**

- Produces:
  - `createGridState(config)`
  - `reduceGrid(state, event, config)`
  - `advanceGrid(state, elapsed, config)`
  - `layoutGridTiles(state, { columns, rows })`
  - `mountGrid(context)`

- [ ] **Step 1: Write failing threshold, ownership, wrap, and cancellation tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceGrid,
  createGridState,
  layoutGridTiles,
  reduceGrid,
} from '../src/scripts/motion/grid.mjs';

test('starts at eight pixels and pointercancel removes ownership and inertia', () => {
  let state = createGridState({ tileCount: 16, width: 1200, height: 700 });
  state = reduceGrid(state, {
    type: 'pointerdown', pointerId: 4, pointerType: 'mouse',
    x: 0, y: 0, timestamp: 0,
  }, { threshold: 8 });
  state = reduceGrid(state, {
    type: 'pointermove', pointerId: 4, x: 7, y: 0, timestamp: 10,
  }, { threshold: 8 });
  assert.equal(state.dragging, false);
  state = reduceGrid(state, {
    type: 'pointermove', pointerId: 4, x: 8, y: 0, timestamp: 20,
  }, { threshold: 8 });
  assert.equal(state.dragging, true);
  const stillOwned = reduceGrid(
    state,
    { type: 'pointerup', pointerId: 99 },
    { motionAllowed: true },
  );
  assert.equal(stillOwned.pointerId, 4);
  state = reduceGrid(state, { type: 'pointercancel', pointerId: 4 }, { threshold: 8 });
  assert.equal(state.pointerId, null);
  assert.equal(state.inertia.active, false);
});

test('wraps continuously and flags a seam bounce', () => {
  let state = createGridState({ tileCount: 16, width: 100, height: 100 });
  state = { ...state, x: 95, velocityX: 20, inertia: { active: true } };
  state = advanceGrid(state, 16, { damping: 1, stopVelocity: 0.01 });
  assert.ok(state.x >= 0 && state.x < 100);
  assert.equal(state.seamX, true);
});

test('Home resets and reduced motion never starts inertia', () => {
  let state = createGridState({ tileCount: 16, width: 1000, height: 600 });
  state = { ...state, x: 300, y: 100 };
  state = reduceGrid(state, { type: 'key', key: 'Home' }, { keyboardStep: 80 });
  assert.equal(state.x, 0);
  assert.equal(state.y, 0);
  state = reduceGrid(state, { type: 'policy', motionAllowed: false }, {});
  assert.equal(state.inertia.active, false);
});

test('touch threshold is horizontal and recycled tiles cross opposite seams', () => {
  let state = createGridState({ tileCount: 16, width: 100, height: 100 });
  state = reduceGrid(state, {
    type: 'pointerdown', pointerId: 2, pointerType: 'touch',
    x: 0, y: 0, timestamp: 0,
  }, { threshold: 8 });
  state = reduceGrid(state, {
    type: 'pointermove', pointerId: 2, pointerType: 'touch',
    x: 2, y: 40, timestamp: 16,
  }, { threshold: 8 });
  assert.equal(state.dragging, false);
  state = { ...state, x: 10, y: 10 };
  const tiles = layoutGridTiles(state, { columns: 4, rows: 4 });
  assert.deepEqual(
    [...new Set(tiles.slice(0, 4).map((tile) => tile.x))].sort((a, b) => a - b),
    [-15, 10, 35, 60],
  );
  const xIntervals = [...new Set(tiles.slice(0, 4).map((tile) => tile.x))]
    .sort((a, b) => a - b);
  assert.ok(xIntervals[0] <= 0);
  assert.ok(xIntervals.at(-1) + 50 >= state.width);
  assert.ok(
    xIntervals.slice(1).every((value, index) => value - xIntervals[index] <= 50),
  );
});
```

Run:

```sh
node --test scripts/test-motion-grid.mjs
```

Expected: FAIL because `grid.mjs` does not exist.

- [ ] **Step 2: Implement pure state transitions**

Use Euclidean modulo so negative offsets wrap correctly:

```js
function wrap(value, span) {
  return ((value % span) + span) % span;
}

export function layoutGridTiles(state, { columns = 4, rows = 4 } = {}) {
  const stepX = state.width / columns;
  const stepY = state.height / rows;
  return Array.from({ length: state.tileCount }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns) % rows;
    return {
      x: wrap(column * stepX + state.x + stepX, state.width) - stepX,
      y: wrap(row * stepY + state.y + stepY, state.height) - stepY,
    };
  });
}

export function createGridState({ tileCount, width, height }) {
  return {
    tileCount,
    width,
    height,
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    pointerId: null,
    originX: 0,
    originY: 0,
    lastX: 0,
    lastY: 0,
    lastTimestamp: 0,
    dragging: false,
    seamX: false,
    seamY: false,
    inertia: { active: false },
  };
}

export function advanceGrid(state, elapsed, config) {
  if (!state.inertia.active) return { ...state, seamX: false, seamY: false };
  const rawX = state.x + state.velocityX * (elapsed / 16.667);
  const rawY = state.y + state.velocityY * (elapsed / 16.667);
  const velocityX = state.velocityX * config.damping;
  const velocityY = state.velocityY * config.damping;
  const active = Math.hypot(velocityX, velocityY) >= config.stopVelocity;
  return {
    ...state,
    x: wrap(rawX, state.width),
    y: wrap(rawY, state.height),
    velocityX,
    velocityY,
    seamX: rawX < 0 || rawX >= state.width,
    seamY: rawY < 0 || rawY >= state.height,
    inertia: { active },
  };
}

export function reduceGrid(state, event, config) {
  if (event.type === 'pointerdown' && state.pointerId === null) {
    return {
      ...state,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      originX: event.x,
      originY: event.y,
      lastX: event.x,
      lastY: event.y,
      lastTimestamp: event.timestamp,
      dragging: false,
      inertia: { active: false },
    };
  }
  if (
    event.type === 'pointermove' &&
    event.pointerId === state.pointerId
  ) {
    const totalX = event.x - state.originX;
    const totalY = event.y - state.originY;
    const distance =
      state.pointerType === 'touch' ? Math.abs(totalX) : Math.hypot(totalX, totalY);
    const dragging = state.dragging || distance >= config.threshold;
    if (!dragging) return { ...state, lastX: event.x, lastY: event.y };
    const elapsed = Math.max(1, event.timestamp - state.lastTimestamp);
    const deltaX = event.x - state.lastX;
    const deltaY = event.pointerType === 'touch' ? 0 : event.y - state.lastY;
    return {
      ...state,
      x: wrap(state.x + deltaX, state.width),
      y: wrap(state.y + deltaY, state.height),
      velocityX: (deltaX / elapsed) * 16.667,
      velocityY: (deltaY / elapsed) * 16.667,
      lastX: event.x,
      lastY: event.y,
      lastTimestamp: event.timestamp,
      dragging: true,
    };
  }
  if (
    ['pointerup', 'pointercancel', 'lostpointercapture'].includes(event.type) &&
    event.pointerId === state.pointerId
  ) {
    const cancelled = event.type !== 'pointerup';
    return {
      ...state,
      pointerId: null,
      dragging: false,
      velocityX: cancelled ? 0 : state.velocityX,
      velocityY: cancelled ? 0 : state.velocityY,
      inertia: {
        active:
          !cancelled &&
          config.motionAllowed !== false &&
          Math.hypot(state.velocityX, state.velocityY) > 0,
      },
    };
  }
  if (event.type === 'key' && event.key === 'Home') {
    return { ...state, x: 0, y: 0, velocityX: 0, velocityY: 0 };
  }
  if (event.type === 'key' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    return { ...state, x: wrap(state.x + direction * config.keyboardStep, state.width) };
  }
  if (event.type === 'policy' && !event.motionAllowed) {
    return {
      ...state,
      pointerId: null,
      dragging: false,
      velocityX: 0,
      velocityY: 0,
      inertia: { active: false },
    };
  }
  return state;
}
```

`reduceGrid()` must reject a second pointer, cross the threshold at exactly
eight pixels, handle `pointerup`, `pointercancel`, and `lostpointercapture`
identically, support ArrowLeft/ArrowRight and Home, and clear inertia when
motion policy is static.

- [ ] **Step 3: Render exactly 16 non-semantic tiles**

```astro
---
// src/components/effects/InfiniteProjectGrid.astro
import { projects } from '../../data/site';
import ProjectPoster from './ProjectPoster.astro';
const tiles = Array.from({ length: 16 }, (_, index) => projects[index % projects.length]);
---

<div class="infinite-project-grid" data-motion-grid aria-hidden="true">
  <p id="project-grid-instructions" class="motion-sr-only">
    Draggable project-poster grid. Use Left and Right arrows to pan; Home resets.
  </p>
  <div class="infinite-project-grid__camera" data-motion-grid-camera>
    {tiles.map((project, index) => (
      <div
        data-motion-grid-tile={index}
        style={`left:${(index % 4) * 25}%;top:${Math.floor(index / 4) * 25}%`}
      >
        <div data-motion-grid-bounce>
          <ProjectPoster project={project} variant="grid" />
        </div>
      </div>
    ))}
  </div>
</div>
```

Render it immediately after `.work__header` and before the featured article.
It must not use an `article`, anchor, `.work-feature`, or `.project-card`.

- [ ] **Step 4: Enhance only after controller success**

`mountGrid()` must remove `aria-hidden`, add `tabindex="0"`, `role="region"`,
`aria-label="Draggable project-poster grid"`, and
`aria-describedby="project-grid-instructions"` only after listeners and
dimensions initialize. It must set `touch-action: pan-y`, capture one pointer,
toggle `data-motion-dragging` on the Work section, claim coordinator priority
2, suspend competing effects, and remove every enhancement on destroy.

```js
export function mountGrid(context) {
  const element = context.root.ownerDocument.querySelector('[data-motion-grid]');
  if (!element) return null;
  const showcase = element.closest('[data-motion-showcase]');
  const tileNodes = [...element.querySelectorAll('[data-motion-grid-tile]')];
  const bounds = element.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) return null;
  let state = createGridState({
    tileCount: element.querySelectorAll('[data-motion-grid-tile]').length,
    width: bounds.width,
    height: bounds.height,
  });
  let previousLayout = null;
  let previousFrame = null;
  let visible = true;
  let visibilityObserver = null;

  function render() {
    const layout = layoutGridTiles(state, { columns: 4, rows: 4 });
    layout.forEach((position, index) => {
      const node = tileNodes[index];
      const previous = previousLayout?.[index];
      const crossed =
        previous &&
        (
          Math.abs(position.x - previous.x) > state.width / 2 ||
          Math.abs(position.y - previous.y) > state.height / 2
        );
      node.style.setProperty('--tile-x', `${position.x}px`);
      node.style.setProperty('--tile-y', `${position.y}px`);
      node.toggleAttribute(
        'data-motion-tile-seam',
        Boolean(crossed && context.policy.motionAllowed),
      );
    });
    previousLayout = layout;
  }

  function stopGridMotion() {
    releaseCapture();
    state = reduceGrid(state, {
      type: 'policy',
      motionAllowed: false,
    }, {});
    previousFrame = null;
    showcase?.removeAttribute('data-motion-dragging');
    context.coordinator.release('grid');
    context.coordinator.release('grid-inertia');
    context.scheduler.cancel(controller);
    for (const node of tileNodes) {
      node.removeAttribute('data-motion-tile-seam');
    }
    render();
  }

  const controller = {
    update(timestamp) {
      const elapsed = previousFrame === null ? 0 : timestamp - previousFrame;
      previousFrame = timestamp;
      state = advanceGrid(state, elapsed, { damping: 0.92, stopVelocity: 0.08 });
      render();
      if (!state.dragging && !state.inertia.active) {
        context.coordinator.release('grid-inertia');
      }
      return state.inertia.active;
    },
    setPolicy(policy) {
      if (!policy.motionAllowed) {
        stopGridMotion();
        element.removeAttribute('data-motion-seam-x');
        element.removeAttribute('data-motion-seam-y');
      }
    },
    destroy() {
      stopGridMotion();
      visibilityObserver?.disconnect();
      element.removeAttribute('tabindex');
      element.removeAttribute('role');
      element.removeAttribute('aria-label');
      element.removeAttribute('aria-describedby');
      element.removeAttribute('data-motion-enhanced');
      element.setAttribute('aria-hidden', 'true');
      element.removeAttribute('style');
      for (const node of tileNodes) {
        node.removeAttribute('data-motion-tile-seam');
        node.style.removeProperty('--tile-x');
        node.style.removeProperty('--tile-y');
        node.style.removeProperty('--tile-bounce');
      }
    },
  };

  visibilityObserver = context.observerFactory((entries) => {
    const entry = entries.find(
      (candidate) => candidate.target === (showcase ?? element),
    );
    if (entry) applyVisibility(entry.isIntersecting);
  }, { threshold: 0 });
  if (visibilityObserver) {
    visibilityObserver.observe(showcase ?? element);
  } else {
    const browserWindow = element.ownerDocument.defaultView;
    const refreshFallbackVisibility = () => {
      const rect = (showcase ?? element).getBoundingClientRect();
      applyVisibility(
        rect.bottom > 0 &&
        rect.top < (browserWindow?.innerHeight ?? rect.bottom),
      );
    };
    refreshFallbackVisibility();
    browserWindow?.addEventListener('scroll', refreshFallbackVisibility, {
      signal: context.signal,
      passive: true,
    });
    browserWindow?.addEventListener('resize', refreshFallbackVisibility, {
      signal: context.signal,
      passive: true,
    });
  }

  element.addEventListener('pointerdown', onPointerDown, { signal: context.signal });
  element.addEventListener('pointermove', onPointerMove, { signal: context.signal });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    element.addEventListener(type, onPointerEnd, { signal: context.signal });
  }
  for (const type of ['pointerup', 'pointercancel']) {
    element.ownerDocument.addEventListener(type, onPointerEnd, {
      signal: context.signal,
    });
  }
  element.ownerDocument.defaultView?.addEventListener('blur', () => {
    if (state.pointerId !== null) {
      onPointerEnd({ type: 'pointercancel', pointerId: state.pointerId });
    }
  }, { signal: context.signal });
  element.addEventListener('keydown', onKeyDown, { signal: context.signal });

  function onPointerDown(event) {
    if (!visible) return;
    if (state.pointerId === null) {
      context.coordinator.release('grid-inertia');
      context.scheduler.cancel(controller);
    }
    const wasIdle = state.pointerId === null;
    state = reduceGrid(state, {
      type: 'pointerdown',
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      timestamp: event.timeStamp,
    }, { threshold: 8 });
    if (
      wasIdle &&
      state.pointerId === event.pointerId &&
      context.policy.pointerCaptureAllowed
    ) {
      element.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event) {
    if (!visible) return;
    const before = state.dragging;
    state = reduceGrid(state, {
      type: 'pointermove',
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      timestamp: event.timeStamp,
    }, { threshold: 8 });
    if (!before && state.dragging) {
      const claimed = context.coordinator.claim('grid', 2, () => {
        releaseCapture();
        state = reduceGrid(state, {
          type: 'pointercancel',
          pointerId: state.pointerId,
        }, { motionAllowed: false });
        showcase?.removeAttribute('data-motion-dragging');
        context.scheduler.cancel(controller);
      });
      if (!claimed) {
        releaseCapture();
        state = reduceGrid(state, {
          type: 'pointercancel',
          pointerId: state.pointerId,
        }, { motionAllowed: false });
        return;
      }
      showcase?.setAttribute('data-motion-dragging', '');
    }
    if (state.dragging) {
      if (context.policy.motionAllowed) context.scheduler.request(controller);
      else render();
    }
  }

  function onPointerEnd(event) {
    if (event.pointerId !== state.pointerId) return;
    releaseCapture();
    state = reduceGrid(state, {
      type: event.type,
      pointerId: event.pointerId,
    }, { motionAllowed: context.policy.motionAllowed });
    render();
    showcase?.removeAttribute('data-motion-dragging');
    context.coordinator.release('grid');
    if (
      state.inertia.active &&
      context.coordinator.claim('grid-inertia', 0, () => {
        state = {
          ...state,
          velocityX: 0,
          velocityY: 0,
          inertia: { active: false },
        };
        for (const node of tileNodes) {
          node.removeAttribute('data-motion-tile-seam');
        }
        context.scheduler.cancel(controller);
      })
    ) {
      context.scheduler.request(controller);
    }
  }

  function onKeyDown(event) {
    if (!visible) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    state = reduceGrid(state, { type: 'key', key: event.key }, { keyboardStep: 80 });
    render();
  }

  function releaseCapture() {
    const pointerId = state.pointerId;
    if (
      pointerId !== null &&
      element.hasPointerCapture?.(pointerId)
    ) {
      try {
        element.releasePointerCapture(pointerId);
      } catch {
        // The browser may already have released capture during cancellation.
      }
    }
  }

  function applyVisibility(nextVisible) {
    if (visible === nextVisible) return;
    visible = nextVisible;
    if (!visible) stopGridMotion();
  }

  element.removeAttribute('aria-hidden');
  element.tabIndex = 0;
  element.setAttribute('role', 'region');
  element.setAttribute('aria-label', 'Draggable project-poster grid');
  element.setAttribute('aria-describedby', 'project-grid-instructions');
  element.setAttribute('data-motion-enhanced', '');
  render();
  return controller;
}
```

The integration test must use a fake element that records pointer capture and
prove that document-level `pointerup`, `pointercancel`, window blur, policy
cancellation, destroy, and `lostpointercapture` all converge on the same
idempotent release path. It must also make a priority-3 owner preempt an active
drag and make a pre-existing priority-3 owner reject a newly crossed drag
threshold; both paths must release browser pointer capture before reducing the
owned pointer state. A fake observer must begin during active inertia, report
Work as non-intersecting, and observe synchronous capture/ownership/inertia
cleanup plus zero scheduled grid clients; re-entry stays idle until a new user
event. Run the same assertion through the scroll/resize fallback with no
observer. ArrowLeft, ArrowRight, and Home must render synchronously without
requesting a scheduler frame because keyboard panning has no inertia. Events
from non-owned pointers remain ignored.

```css
.infinite-project-grid {
  position: relative;
  height: clamp(24rem, 62vw, 44rem);
  overflow: clip;
  border-bottom: var(--rule);
  background: var(--paper);
  touch-action: pan-y;
}

.infinite-project-grid__camera {
  position: absolute;
  inset: 0;
}

[data-motion-grid-tile] {
  position: absolute;
  width: clamp(11rem, 22vw, 18rem);
  transform: translate3d(var(--tile-x, 0px), var(--tile-y, 0px), 0);
}

[data-motion-grid][data-motion-enhanced] [data-motion-grid-tile] {
  left: 0 !important;
  top: 0 !important;
  width: max(50%, 12rem);
}

[data-motion-grid-bounce] {
  transform: scale(var(--tile-bounce, 1));
  transition: transform 140ms cubic-bezier(.2, .8, .2, 1);
}

[data-motion-grid-tile][data-motion-tile-seam] [data-motion-grid-bounce] {
  --tile-bounce: 0.94;
}

@media (prefers-reduced-motion: reduce) {
  [data-motion-grid-bounce] {
    transition: none;
    --tile-bounce: 1;
  }
}
```

- [ ] **Step 5: Verify fixed pool and no article regression**

Add:

```js
test('infinite grid is a static 16-tile fallback without duplicate links', async () => {
  const html = await readHomepage();
  const grid = html.match(/<div class="infinite-project-grid"[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? '';
  assert.equal((html.match(/data-motion-grid-tile=/g) ?? []).length, 16);
  assert.match(grid, /aria-hidden="true"/);
  assert.doesNotMatch(grid, /tabindex="0"|<a\b|<article\b/);
  assert.equal((html.match(/class="work-feature"/g) ?? []).length, 1);
  assert.equal((html.match(/class="project-card"/g) ?? []).length, 3);
});
```

Run:

```sh
npm run test:motion
ASTRO_TELEMETRY_DISABLED=1 npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the infinite grid**

```sh
git add src/scripts/motion/grid.mjs src/components/effects/InfiniteProjectGrid.astro scripts/test-motion-grid.mjs src/scripts/motion/index.mjs src/components/Projects.astro src/styles/motion.css scripts/test-homepage.mjs
git commit -m "feat: add infinite draggable project grid"
```

---

### Task 6: 3D project card stacks

**Files:**

- Create: `src/scripts/motion/card-stack.mjs`
- Create: `src/components/effects/CardStack.astro`
- Create: `scripts/test-motion-card-stack.mjs`
- Modify: `src/scripts/motion/index.mjs`
- Modify: `src/components/Projects.astro:14-38`
- Modify: `src/components/ProjectCard.astro:1-31`
- Modify: `src/styles/motion.css`
- Modify: `scripts/test-homepage.mjs`

**Interfaces:**

- Produces:
  - `reduceCardStack(state, event, policy)`
  - `mountCardStacks(context)`
- `CardStack.astro` consumes `{ project: Project }`.

- [ ] **Step 1: Write failing card-state tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { reduceCardStack } from '../src/scripts/motion/card-stack.mjs';

test('hover, focus, and tap expand without preventing a nested link', () => {
  const initial = {
    expanded: false,
    hovered: false,
    focused: false,
    tapped: false,
  };
  assert.equal(reduceCardStack(initial, { type: 'pointerenter' }, { motionAllowed: true }).expanded, true);
  assert.equal(reduceCardStack(initial, { type: 'focusin' }, { motionAllowed: true }).expanded, true);
  const tapped = reduceCardStack(initial, {
    type: 'activate',
    interactiveTarget: true,
  }, { motionAllowed: true });
  assert.equal(tapped.expanded, true);
  assert.equal(tapped.preventDefault, false);
});

test('reduced motion uses the static expanded state', () => {
  const state = reduceCardStack(
    {
      expanded: false,
      hovered: false,
      focused: false,
      tapped: false,
    },
    { type: 'policy' },
    { motionAllowed: false },
  );
  assert.equal(state.expanded, true);
  assert.equal(state.animate, false);
});

test('a second tap collapses the same stack without cancelling activation', () => {
  const policy = { motionAllowed: true };
  const first = reduceCardStack(
    {
      expanded: false,
      hovered: false,
      focused: false,
      tapped: false,
    },
    { type: 'activate', interactiveTarget: true },
    policy,
  );
  const second = reduceCardStack(
    first,
    { type: 'activate', interactiveTarget: true },
    policy,
  );
  assert.equal(second.expanded, false);
  assert.equal(second.preventDefault, false);
});
```

Run:

```sh
node --test scripts/test-motion-card-stack.mjs
```

Expected: FAIL because `card-stack.mjs` does not exist.

- [ ] **Step 2: Implement finite card state**

```js
export function reduceCardStack(state, event, policy) {
  if (!policy.motionAllowed) {
    return { ...state, expanded: true, animate: false, preventDefault: false };
  }
  const next = {
    ...state,
    hovered:
      event.type === 'pointerenter'
        ? true
        : event.type === 'pointerleave'
          ? false
          : state.hovered,
    focused:
      event.type === 'focusin'
        ? true
        : event.type === 'focusout'
          ? false
          : state.focused,
    tapped: event.type === 'activate' ? !state.tapped : state.tapped,
    preventDefault: false,
  };
  const expanded = Boolean(next.hovered || next.focused || next.tapped);
  return {
    ...next,
    expanded,
    animate: expanded !== state.expanded,
  };
}
```

Implement the adapter as one scheduler client for all four fixed stacks:

```js
export function mountCardStacks(context) {
  const document = context.root.ownerDocument;
  const cards = [...document.querySelectorAll('[data-motion-card]')];
  if (cards.length === 0) return null;
  const showcase = cards[0].closest('[data-motion-showcase]');
  let visible = true;
  let visibilityObserver = null;
  const entries = cards.map((card) => ({
    card,
    stack: card.querySelector('[data-motion-card-stack]'),
    state: {
      expanded: false,
      hovered: false,
      focused: false,
      tapped: false,
    },
    startedAt: null,
    owner: `card:${card.dataset.motionCard}`,
  })).filter((entry) => entry.stack);
  if (entries.length === 0) return null;
  function render(entry) {
    entry.stack.toggleAttribute('data-expanded', entry.state.expanded);
  }

  function finish(entry) {
    entry.startedAt = null;
    for (const layer of entry.stack.querySelectorAll('[data-motion-card-layer]')) {
      layer.style.removeProperty('will-change');
    }
    context.coordinator.release(entry.owner);
    render(entry);
    if (entries.every((candidate) => candidate.startedAt === null)) {
      context.scheduler.cancel(controller);
    }
  }

  function cancel(entry) {
    entry.state = {
      ...entry.state,
      animate: false,
      preventDefault: false,
    };
    entry.stack.setAttribute('data-motion-static', '');
    finish(entry);
  }

  function transition(entry, event) {
    if (!visible) return;
    const next = reduceCardStack(entry.state, event, context.policy);
    if (!next.animate) {
      entry.state = next;
      render(entry);
      return;
    }
    const currentOwner = context.coordinator.owner;
    const relatedShuffleOwnsCard =
      typeof currentOwner === 'string' &&
      currentOwner.startsWith('shuffle:') &&
      entry.card.querySelector(
        '[data-motion-shuffle][data-active]',
      );
    if (
      (
        typeof currentOwner === 'string' &&
        currentOwner.startsWith('link:')
      ) ||
      relatedShuffleOwnsCard
    ) {
      entry.state = { ...next, animate: false };
      entry.stack.setAttribute('data-motion-static', '');
      render(entry);
      return;
    }
    if (!context.coordinator.claim(entry.owner, 1, () => cancel(entry))) {
      return;
    }
    entry.state = next;
    entry.stack.removeAttribute('data-motion-static');
    render(entry);
    entry.startedAt = context.scheduler.now(context.clock());
    for (const layer of entry.stack.querySelectorAll('[data-motion-card-layer]')) {
      layer.style.willChange = 'transform';
    }
    context.scheduler.request(controller);
  }

  const controller = {
    update(timestamp) {
      for (const entry of entries) {
        if (
          typeof entry.startedAt === 'number' &&
          timestamp - entry.startedAt >= 220
        ) {
          finish(entry);
        }
      }
      return entries.some((entry) => entry.startedAt !== null);
    },
    setPolicy(policy) {
      for (const entry of entries) {
        entry.state = reduceCardStack(entry.state, { type: 'policy' }, policy);
        if (!policy.motionAllowed) {
          entry.stack.setAttribute('data-motion-static', '');
        }
        finish(entry);
      }
      context.scheduler.cancel(controller);
    },
    destroy() {
      context.scheduler.cancel(controller);
      visibilityObserver?.disconnect();
      for (const entry of entries) {
        context.coordinator.release(entry.owner);
        entry.stack.removeAttribute('data-expanded');
        entry.stack.removeAttribute('data-motion-static');
        for (const layer of entry.stack.querySelectorAll('[data-motion-card-layer]')) {
          layer.style.removeProperty('will-change');
        }
      }
    },
  };

  function applyVisibility(nextVisible) {
    if (visible === nextVisible) return;
    visible = nextVisible;
    if (!visible) {
      for (const entry of entries) cancel(entry);
      context.scheduler.cancel(controller);
    }
  }

  visibilityObserver = context.observerFactory((records) => {
    const record = records.find(
      (candidate) => candidate.target === (showcase ?? cards[0]),
    );
    if (record) applyVisibility(record.isIntersecting);
  }, { threshold: 0 });
  if (visibilityObserver) {
    visibilityObserver.observe(showcase ?? cards[0]);
  } else {
    const browserWindow = document.defaultView;
    const refreshFallbackVisibility = () => {
      const rect = (showcase ?? cards[0]).getBoundingClientRect();
      applyVisibility(
        rect.bottom > 0 &&
        rect.top < (browserWindow?.innerHeight ?? rect.bottom),
      );
    };
    refreshFallbackVisibility();
    browserWindow?.addEventListener('scroll', refreshFallbackVisibility, {
      signal: context.signal,
      passive: true,
    });
    browserWindow?.addEventListener('resize', refreshFallbackVisibility, {
      signal: context.signal,
      passive: true,
    });
  }

  for (const entry of entries) {
    entry.card.addEventListener('pointerenter', () => {
      transition(entry, { type: 'pointerenter' });
    }, { signal: context.signal });
    entry.card.addEventListener('pointerleave', () => {
      transition(entry, { type: 'pointerleave' });
    }, { signal: context.signal });
    entry.card.addEventListener('focusin', () => {
      transition(entry, { type: 'focusin' });
    }, { signal: context.signal });
    entry.card.addEventListener('focusout', (event) => {
      if (!entry.card.contains(event.relatedTarget)) {
        transition(entry, { type: 'focusout' });
      }
    }, { signal: context.signal });
    entry.card.addEventListener('click', (event) => {
      transition(entry, {
        type: 'activate',
        interactiveTarget: Boolean(event.target.closest?.('a,button')),
      });
    }, { signal: context.signal });
  }
  return controller;
}
```

The focused DOM-adapter test must assert 220ms ownership, no
`preventDefault()`, hover-leave while focus remains expanded, preemption
cleanup, and removal of `will-change`. Add the real listener-order regression:
dispatch `pointerover` from a burst-marked project link so the document-level
pointer controller claims `link:*` before the card's `pointerenter`; the stack
must settle immediately into its fanned state without claiming `card:*`, the
100ms burst must remain owned, and its queued 300ms shuffle must still start on
normal release. Repeat with the project-name node as the event target and
assert its already-active, closest `shuffle:*` owner completes instead of
being preempted by the card; the active shuffle marker scopes this yield to the
same card, so entering an unrelated card still replaces the older local
effect. A
priority-2 grid claim that preempts an animating card must synchronously remove
the card scheduler client before the grid requests its own, keeping the global
client count at or below three. Inject a pointer event between two fake frames
and assert the 220ms card bound is measured from that event-mapped scheduler
timestamp. A fake observer and the scroll/resize fallback must cancel an
active card client immediately when Work exits, and re-entry must remain idle
until new input. The direct-tap path uses the confirmed `click`
event, not `pointerdown`, so a vertical touch scroll that never activates a
click cannot toggle a card.

- [ ] **Step 3: Render decorative layers for all four projects**

```astro
---
// src/components/effects/CardStack.astro
import type { Project } from '../../data/site';
import ProjectPoster from './ProjectPoster.astro';
interface Props { project: Project; }
const { project } = Astro.props;
const metadata = project.featured
  ? [...project.facts, ...(project.metrics ?? []).map((item) => `${item.value} / ${item.label}`)]
  : [project.period, ...project.stack, ...project.facts].filter(Boolean);
---

<div class="card-stack" data-motion-card-stack aria-hidden="true">
  {[0, 1, 2].map((layer) => (
    <div class="card-stack__layer" data-motion-card-layer={layer}>
      <ProjectPoster project={project} variant="stack" layer={layer} />
    </div>
  ))}
  <p class="card-stack__metadata">{metadata.slice(0, 3).join(' / ')}</p>
</div>
```

Insert it inside `.work-feature__copy` before that container's existing label,
and as the first child of each existing secondary article. Add
`data-motion-card={project.index}` to the same featured and secondary articles.
Keeping the featured stack inside the copy column avoids creating a third item
in the existing two-column `.work-feature` grid. Do not create a new article or
move ordinary facts, metrics, stacks, periods, or links.

- [ ] **Step 4: Add bounded 3D and flat fallback CSS**

```css
[data-motion-card] {
  position: relative;
  isolation: isolate;
}

.card-stack {
  position: relative;
  min-height: 14rem;
  perspective: 900px;
  pointer-events: none;
}

.card-stack__layer {
  position: absolute;
  inset: 0;
  transform:
    translate3d(var(--stack-x, 0), var(--stack-y, 0), var(--stack-z, 0))
    rotate(var(--stack-rotate, 0deg));
  transform-style: preserve-3d;
}

.card-stack__layer,
.card-stack__metadata {
  transition: transform 220ms cubic-bezier(.2, .8, .2, 1), opacity 160ms linear;
}

.card-stack[data-motion-static] .card-stack__layer,
.card-stack[data-motion-static] .card-stack__metadata {
  transition: none;
}

.card-stack[data-expanded] [data-motion-card-layer="0"] {
  --stack-x: -12%;
  --stack-y: 5%;
  --stack-z: -20px;
  --stack-rotate: -5deg;
}

.card-stack[data-expanded] [data-motion-card-layer="1"] {
  --stack-x: 0%;
  --stack-y: -3%;
  --stack-z: 0px;
}

.card-stack[data-expanded] [data-motion-card-layer="2"] {
  --stack-x: 12%;
  --stack-y: 5%;
  --stack-z: 20px;
  --stack-rotate: 5deg;
}

.card-stack__metadata {
  position: absolute;
  inset: auto 0 0;
  opacity: 0;
}

.card-stack[data-expanded] .card-stack__metadata {
  opacity: 1;
}

@supports not (transform-style: preserve-3d) {
  .card-stack { perspective: none; }
  .card-stack__layer {
    transform: translate(var(--stack-flat-x, 0), var(--stack-flat-y, 0));
  }
  .card-stack[data-expanded] [data-motion-card-layer="0"] {
    --stack-flat-x: -10%;
    --stack-flat-y: 4%;
  }
  .card-stack[data-expanded] [data-motion-card-layer="2"] {
    --stack-flat-x: 10%;
    --stack-flat-y: 4%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card-stack__layer,
  .card-stack__metadata {
    transition: none;
  }

  .card-stack__layer {
    transform: translate(var(--stack-static-x, 0), var(--stack-static-y, 0));
  }

  [data-motion-card-layer="0"] {
    --stack-static-x: -8%;
    --stack-static-y: 4%;
  }

  [data-motion-card-layer="2"] {
    --stack-static-x: 8%;
    --stack-static-y: 4%;
  }

  .card-stack__metadata {
    opacity: 1;
  }
}
```

- [ ] **Step 5: Verify semantics and commit**

Extend the built test to assert four `data-motion-card` roots, 12 hidden layers,
one `.work-feature`, three `.project-card`, and unchanged ordinary project
links/facts.

Run and commit:

```sh
npm run test:motion
ASTRO_TELEMETRY_DISABLED=1 npm test
git add src/scripts/motion/card-stack.mjs src/components/effects/CardStack.astro scripts/test-motion-card-stack.mjs src/scripts/motion/index.mjs src/components/Projects.astro src/components/ProjectCard.astro src/styles/motion.css scripts/test-homepage.mjs
git commit -m "feat: add accessible 3d project stacks"
```

---

### Task 7: Brutalist heading shake and deterministic text shuffle

**Files:**

- Create: `src/scripts/motion/text-effects.mjs`
- Create: `src/components/effects/GlitchText.astro`
- Create: `scripts/test-motion-text-effects.mjs`
- Modify: `src/scripts/motion/index.mjs`
- Modify: `src/components/Hero.astro:23-31`
- Modify: `src/components/ChapterIndex.astro:10-17`
- Modify: `src/components/Projects.astro:9-28`
- Modify: `src/components/ProjectCard.astro:9-31`
- Modify: `src/components/Experience.astro:8-11`
- Modify: `src/components/Notes.astro:27-39`
- Modify: `src/components/Contact.astro:9-19`
- Modify: `src/styles/motion.css`
- Modify: `scripts/test-homepage.mjs`

**Interfaces:**

- Produces:
  - `shakeFrame(elapsed, config)`
  - `shuffleFrame(label, elapsed, { seed, triggerCount, duration })`
  - `mountTextEffects(context)`
- `GlitchText.astro` consumes `{ text: string }`.

- [ ] **Step 1: Write failing duration, amplitude, and resolution tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  shakeFrame,
  shuffleFrame,
} from '../src/scripts/motion/text-effects.mjs';

test('shake stays within 250ms, two pixels, and three oscillations', () => {
  const samples = [0, 50, 100, 150, 200, 250].map((elapsed) =>
    shakeFrame(elapsed, { duration: 250, amplitude: 2, oscillations: 3 }),
  );
  assert.ok(samples.slice(0, -1).every(({ x, y }) => Math.abs(x) <= 2 && Math.abs(y) <= 2));
  assert.deepEqual(samples.at(-1), { x: 0, y: 0, done: true });
});

test('shuffle is deterministic and resolves to the exact label by 400ms', () => {
  const options = { seed: 23, triggerCount: 2, duration: 400 };
  assert.equal(
    shuffleFrame('AURORA', 160, options),
    shuffleFrame('AURORA', 160, options),
  );
  assert.equal(shuffleFrame('AURORA', 400, options), 'AURORA');
});

test('shuffle preserves spaces and never mutates the semantic source', () => {
  const source = 'Chapter Index';
  const visual = shuffleFrame(source, 120, {
    seed: 23,
    triggerCount: 1,
    duration: 400,
  });
  assert.equal(visual[7], ' ');
  assert.equal(source, 'Chapter Index');
});
```

Run:

```sh
node --test scripts/test-motion-text-effects.mjs
```

Expected: FAIL because `text-effects.mjs` does not exist.

- [ ] **Step 2: Implement deterministic frames**

```js
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789◆✦';

export function shakeFrame(elapsed, config) {
  if (elapsed >= config.duration) return { x: 0, y: 0, done: true };
  const phase = Math.floor((elapsed / config.duration) * config.oscillations * 2);
  const direction = phase % 2 === 0 ? 1 : -1;
  return {
    x: direction * config.amplitude,
    y: -direction * config.amplitude,
    done: false,
  };
}

export function shuffleFrame(label, elapsed, options) {
  if (elapsed >= options.duration) return label;
  const resolved = Math.floor((elapsed / options.duration) * label.length);
  let state = (options.seed ^ options.triggerCount ^ Math.floor(elapsed / 40)) >>> 0;
  return [...label].map((character, index) => {
    if (character === ' ' || index < resolved) return character;
    state = (state * 1664525 + 1013904223) >>> 0;
    return GLYPHS[state % GLYPHS.length];
  }).join('');
}
```

Implement one controller that batches both bounded text effects and owns no
independent timer:

```js
export function mountTextEffects(context) {
  const document = context.root.ownerDocument;
  const motionZone = (element) =>
    element.closest(
      '[data-motion-hero], [data-motion-showcase], section, nav',
    ) ??
    document.body;
  const shakes = [...document.querySelectorAll('[data-motion-shake]')].map(
    (element, index) => ({
      element,
      zone: motionZone(element),
      owner: `shake:${element.id || index}`,
      startedAt: null,
      baseDuration: 250,
      duration: 250,
    }),
  );
  const shuffles = [...document.querySelectorAll('[data-motion-shuffle]')].map(
    (element, index) => ({
      element,
      zone: motionZone(element),
      visual: element.querySelector('[data-motion-shuffle-visual]'),
      label: element.getAttribute('data-motion-shuffle-label') ?? '',
      owner: `shuffle:${index}`,
      startedAt: null,
      triggerCount: 0,
      baseDuration: 400,
      duration: 400,
    }),
  ).filter((entry) => entry.visual);
  const zones = [...new Set(
    [...shakes, ...shuffles].map((entry) => entry.zone).filter(Boolean),
  )];
  const zoneVisibility = new Map(zones.map((zone) => [zone, true]));
  let visibilityObserver = null;
  const shakeByElement = new Map(shakes.map((entry) => [entry.element, entry]));
  const shuffleByElement = new Map(
    shuffles.map((entry) => [entry.element, entry]),
  );

  function cancelShake(entry) {
    entry.startedAt = null;
    entry.element.style.setProperty('--shake-x', '0px');
    entry.element.style.setProperty('--shake-neg-x', '0px');
    entry.element.style.setProperty('--shake-y', '0px');
    entry.element.removeAttribute('data-motion-active');
    context.coordinator.release(entry.owner);
    cancelSchedulerIfIdle();
  }

  function cancelShuffle(entry) {
    entry.startedAt = null;
    entry.visual.textContent = entry.label;
    entry.element.removeAttribute('data-active');
    context.coordinator.release(entry.owner);
    cancelSchedulerIfIdle();
  }

  function cancelSchedulerIfIdle() {
    if ([...shakes, ...shuffles].every((entry) => entry.startedAt === null)) {
      context.scheduler.cancel(controller);
    }
  }

  function startNow(
    entry,
    cancel,
    duration,
    startedAt = context.scheduler.now(context.clock()),
  ) {
    if (
      zoneVisibility.get(entry.zone) === false ||
      !context.policy.motionAllowed ||
      context.policy.forcedColors
    ) return;
    if (!context.coordinator.claim(entry.owner, 1, () => cancel(entry))) return;
    entry.duration = duration;
    entry.startedAt = startedAt;
    entry.triggerCount = (entry.triggerCount ?? 0) + 1;
    entry.element.setAttribute(
      entry.visual ? 'data-active' : 'data-motion-active',
      '',
    );
    context.scheduler.request(controller);
  }

  function start(entry, cancel, trigger) {
    if (
      zoneVisibility.get(entry.zone) === false ||
      !context.policy.motionAllowed ||
      context.policy.forcedColors
    ) return;
    const triggeredAt = context.scheduler.now(context.clock());
    const burstTarget = trigger.closest?.('[data-motion-burst]');
    const currentOwner = context.coordinator.owner;
    const followsBurst =
      burstTarget && typeof currentOwner === 'string' &&
      currentOwner.startsWith('link:');
    const duration = entry.visual && followsBurst ? 300 : entry.baseDuration;
    if (
      followsBurst &&
      context.coordinator.afterRelease(
        currentOwner,
        entry.owner,
        () => startNow(entry, cancel, duration, triggeredAt + 100),
      )
    ) {
      return;
    }
    startNow(entry, cancel, duration, triggeredAt);
  }

  const controller = {
    update(timestamp) {
      for (const entry of shakes) {
        if (typeof entry.startedAt !== 'number') continue;
        const frame = shakeFrame(timestamp - entry.startedAt, {
          duration: entry.duration,
          amplitude: 2,
          oscillations: 3,
        });
        entry.element.style.setProperty('--shake-x', `${frame.x}px`);
        entry.element.style.setProperty('--shake-neg-x', `${-frame.x}px`);
        entry.element.style.setProperty('--shake-y', `${frame.y}px`);
        if (frame.done) cancelShake(entry);
      }
      for (const entry of shuffles) {
        if (typeof entry.startedAt !== 'number') continue;
        const elapsed = timestamp - entry.startedAt;
        entry.visual.textContent = shuffleFrame(entry.label, elapsed, {
          seed: 0x4e4d3031,
          triggerCount: entry.triggerCount,
          duration: entry.duration,
        });
        if (elapsed >= entry.duration) cancelShuffle(entry);
      }
      return [...shakes, ...shuffles].some(
        (entry) => entry.startedAt !== null,
      );
    },
    setPolicy(policy) {
      if (!policy.motionAllowed || policy.forcedColors) {
        for (const entry of shakes) cancelShake(entry);
        for (const entry of shuffles) cancelShuffle(entry);
        context.scheduler.cancel(controller);
      }
    },
    destroy() {
      context.scheduler.cancel(controller);
      visibilityObserver?.disconnect();
      for (const entry of shakes) {
        cancelShake(entry);
        entry.element.style.removeProperty('--shake-x');
        entry.element.style.removeProperty('--shake-neg-x');
        entry.element.style.removeProperty('--shake-y');
      }
      for (const entry of shuffles) {
        cancelShuffle(entry);
        entry.element.removeAttribute('data-motion-enhanced');
      }
    },
  };

  function applyZoneVisibility(zone, nextVisible) {
    if (zoneVisibility.get(zone) === nextVisible) return;
    zoneVisibility.set(zone, nextVisible);
    if (nextVisible) return;
    for (const entry of shakes.filter((candidate) => candidate.zone === zone)) {
      cancelShake(entry);
    }
    for (const entry of shuffles.filter((candidate) => candidate.zone === zone)) {
      cancelShuffle(entry);
    }
    cancelSchedulerIfIdle();
  }

  visibilityObserver = context.observerFactory((records) => {
    for (const record of records) {
      if (zoneVisibility.has(record.target)) {
        applyZoneVisibility(record.target, record.isIntersecting);
      }
    }
  }, { threshold: 0 });
  if (visibilityObserver) {
    for (const zone of zones) visibilityObserver.observe(zone);
  } else {
    const browserWindow = document.defaultView;
    const refreshFallbackVisibility = () => {
      for (const zone of zones) {
        const rect = zone.getBoundingClientRect();
        applyZoneVisibility(
          zone,
          rect.bottom > 0 &&
            rect.top < (browserWindow?.innerHeight ?? rect.bottom),
        );
      }
    };
    refreshFallbackVisibility();
    browserWindow?.addEventListener('scroll', refreshFallbackVisibility, {
      signal: context.signal,
      passive: true,
    });
    browserWindow?.addEventListener('resize', refreshFallbackVisibility, {
      signal: context.signal,
      passive: true,
    });
  }

  function resolveTarget(event) {
    const eventElement = event.target.closest?.('*');
    if (!eventElement) return null;

    const directShuffle = eventElement.closest('[data-motion-shuffle]');
    const scopedShuffle =
      eventElement.closest('[data-motion-card]')?.querySelector(
        '[data-motion-shuffle]',
      );
    const shuffle = directShuffle ?? scopedShuffle;
    if (shuffleByElement.has(shuffle)) {
      return { entry: shuffleByElement.get(shuffle), cancel: cancelShuffle };
    }

    const directShake = eventElement.closest('[data-motion-shake]');
    const relatedId =
      eventElement.closest('[data-motion-shake-related]')
        ?.getAttribute('data-motion-shake-related');
    const shake = directShake ?? (relatedId ? document.getElementById(relatedId) : null);
    return shakeByElement.has(shake)
      ? { entry: shakeByElement.get(shake), cancel: cancelShake }
      : null;
  }

  function onTrigger(event) {
    const resolved = resolveTarget(event);
    if (!resolved) return;
    if (
      event.type === 'pointerover' &&
      event.relatedTarget &&
      resolved.entry.element.contains(event.relatedTarget)
    ) return;
    start(resolved.entry, resolved.cancel, event.target);
  }

  for (const type of ['pointerover', 'click', 'focusin']) {
    document.addEventListener(type, onTrigger, {
      signal: context.signal,
      passive: type === 'pointerover',
    });
  }
  for (const entry of shuffles) {
    entry.element.setAttribute('data-motion-enhanced', '');
  }
  return controller;
}
```

The DOM-adapter tests use minimal fakes to prove that cancellation, reduced
motion, and destroy restore the exact original visual label, zero all three
shake variables, and leave the caller-owned `<h3>` or `<strong>` text node
untouched. They must also preempt an active shake and an active shuffle with a
grid claim and assert the batched text scheduler client is removed
synchronously when no other text entry remains active. Trigger between fake
frames and assert standalone shake/shuffle deadlines are measured from the
event, while queued effects inherit `triggeredAt + 100`: shake resolves at
350ms and project shuffle at 400ms from the original activation even if the
burst releases on the next available frame. Fake-observer and scroll/resize
fallback tests must move an active target's owning section offscreen, assert
immediate cancellation and zero text clients, and prove neither re-entry nor a
stale queued burst follow-up restarts work without a new visible input. Repeat
for a Chapter Index label and its enclosing `<nav>` so those four entries never
fall back to the always-intersecting document body.

- [ ] **Step 3: Render stable semantic labels with hidden overlays**

```astro
---
// src/components/effects/GlitchText.astro
interface Props { text: string; }
const { text } = Astro.props;
---
<span class="glitch-text__visual" data-motion-shuffle-visual aria-hidden="true">{text}</span>
```

Wrap, but do not alter, each existing project `<h3>` and Chapter Index
`<strong>`:

```astro
<div
  class="glitch-text"
  data-motion-shuffle
  data-motion-shuffle-label={project.name}
>
  <h3>{project.name}</h3>
  <GlitchText text={project.name} />
</div>
```

Use the analogous wrapper around each unchanged `<strong>{chapter.label}</strong>`.
This preserves the existing exact `<h3>EmbNode</h3>` and
`<strong>Work</strong>` source assertions. Add `data-motion-shake` to the hero
h1 and the four chapter h2 elements. Put
`data-motion-shake-related="cover-title"` on hero actions,
`data-motion-shake-related="work-title"` on project links,
`data-motion-shake-related="notes-title"` on writing links, and
`data-motion-shake-related="contact-title"` on contact actions; add no tabindex
to headings. A burst-marked focused link runs a 100ms closest-target burst;
normal release then runs the related 250ms shake or closer 300ms project-name
shuffle. Thus the shake finishes by 350ms and the shuffle by 400ms from the
original activation while exactly one foreground effect owns the coordinator.
Grid or navigation preemption discards the queued text follow-up. Experience
has no related-focus marker and remains pointer-hover-only.

- [ ] **Step 4: Add transform-owner-safe CSS**

```css
[data-motion-shake] {
  transform: translate3d(var(--shake-x, 0), var(--shake-y, 0), 0);
  text-shadow:
    var(--shake-neg-x, 0) 0 var(--red),
    var(--shake-x, 0) 0 var(--green);
}

.glitch-text {
  position: relative;
  display: inline-block;
}

.glitch-text__visual {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.glitch-text[data-motion-enhanced][data-active] > :not([aria-hidden="true"]) {
  color: transparent;
  text-shadow: none;
}

.glitch-text[data-motion-enhanced][data-active] .glitch-text__visual {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce), (forced-colors: active) {
  [data-motion-shake] {
    transform: none !important;
    text-shadow: none !important;
  }

  .glitch-text > :not([aria-hidden="true"]) {
    color: inherit !important;
    text-shadow: inherit !important;
  }

  .glitch-text__visual {
    display: none !important;
  }
}
```

The media rule supplies the pre-JavaScript fallback; the live policy controller
also restores the source, hides the overlay, and zeroes all shake variables.

- [ ] **Step 5: Verify exact semantic copies and commit**

The built test must assert exactly eight shuffle roots, eight
`aria-hidden="true"` visual spans, five shake headings, unchanged Chapter Index
hrefs, and the exact four project-name source strings.

```sh
npm run test:motion
ASTRO_TELEMETRY_DISABLED=1 npm test
git add src/scripts/motion/text-effects.mjs src/components/effects/GlitchText.astro scripts/test-motion-text-effects.mjs src/scripts/motion/index.mjs src/components/Hero.astro src/components/ChapterIndex.astro src/components/Projects.astro src/components/ProjectCard.astro src/components/Experience.astro src/components/Notes.astro src/components/Contact.astro src/styles/motion.css scripts/test-homepage.mjs
git commit -m "feat: add brutalist text motion"
```

---

### Task 8: Color-wipe navigation and complete lifecycle orchestration

**Files:**

- Create: `src/scripts/motion/navigation-wipe.mjs`
- Create: `scripts/test-motion-navigation-wipe.mjs`
- Modify: `src/scripts/motion/index.mjs`
- Modify: `src/styles/motion.css`
- Modify: `scripts/test-motion-lifecycle.mjs`

**Interfaces:**

- Produces:
  - `classifyNavigation(anchorDescriptor, activation, currentUrl)`
  - `createNavigationWipeController(options)`
  - final `initializeMotion(root, environment)` default controller wiring.

- [ ] **Step 1: Write failing navigation classification and lock tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyNavigation,
  createNavigationWipeController,
} from '../src/scripts/motion/navigation-wipe.mjs';

const ordinary = {
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
};

test('only ordinary same-origin HTML navigation is eligible', () => {
  assert.deepEqual(
    classifyNavigation(
      { href: '/writing/', target: '', download: false },
      ordinary,
      'https://nmapaye.com/',
    ),
    { eligible: true, destination: 'https://nmapaye.com/writing/' },
  );
  for (const href of [
    '#work',
    '/resume.pdf',
    'mailto:nmapaye@ucsc.edu',
    'https://example.com/',
  ]) {
    assert.equal(
      classifyNavigation(
        { href, target: '', download: false },
        ordinary,
        'https://nmapaye.com/',
      ).eligible,
      false,
    );
  }
});

test('the first activation owns the wipe and navigates exactly once', () => {
  const scheduled = [];
  const destinations = [];
  const layer = {
    setAttribute() {},
    toggleAttribute() {},
    removeAttribute() {},
  };
  const controller = createNavigationWipeController({
    duration: 300,
    schedule(callback) { scheduled.push(callback); return scheduled.length; },
    cancel() {},
    navigate(destination) { destinations.push(destination); },
    layer,
    panels: Array.from({ length: 3 }, () => ({
      setAttribute() {},
      toggleAttribute() {},
      removeAttribute() {},
    })),
    policy: { motionAllowed: true },
  });

  assert.equal(controller.start('https://nmapaye.com/writing/'), true);
  assert.equal(controller.start('https://nmapaye.com/other/'), false);
  scheduled.shift()();
  assert.deepEqual(destinations, ['https://nmapaye.com/writing/']);
  controller.destroy();
  assert.deepEqual(destinations, ['https://nmapaye.com/writing/']);
});
```

Run:

```sh
node --test scripts/test-motion-navigation-wipe.mjs
```

Expected: FAIL because `navigation-wipe.mjs` does not exist.

- [ ] **Step 2: Implement exact eligibility and safe reentrancy**

```js
export function classifyNavigation(anchor, activation, currentUrl) {
  if (
    typeof anchor.href !== 'string' ||
    anchor.href.trim() === '' ||
    activation.defaultPrevented ||
    activation.button !== 0 ||
    activation.metaKey ||
    activation.ctrlKey ||
    activation.shiftKey ||
    activation.altKey ||
    anchor.download ||
    (anchor.target && anchor.target !== '_self')
  ) {
    return { eligible: false, destination: null };
  }
  let current;
  let destination;
  try {
    current = new URL(currentUrl);
    destination = new URL(anchor.href, current);
  } catch {
    return { eligible: false, destination: null };
  }
  const sameDocumentHash =
    destination.origin === current.origin &&
    destination.pathname === current.pathname &&
    destination.search === current.search &&
    destination.hash;
  const extension = destination.pathname.match(/(\.[a-z0-9]+)$/i)?.[1]?.toLowerCase();
  const isHtml = extension === undefined || extension === '.html';
  if (
    destination.origin !== current.origin ||
    !['http:', 'https:'].includes(destination.protocol) ||
    sameDocumentHash ||
    !isHtml
  ) {
    return { eligible: false, destination: null };
  }
  return { eligible: true, destination: destination.href };
}
```

The delegated adapter must pass
`download: anchor.hasAttribute('download')`; do not pass the DOM
`anchor.download` string because an empty `download` attribute is still an
explicit download. Extend the classifier test with table rows for an empty
download attribute, `_blank`, `_parent`, named targets, every modifier,
non-primary buttons, default-prevented clicks, invalid URLs, `javascript:`,
`tel:`, PDFs, images, cross-scheme/host/port URLs, same-document `#work`, and
cross-document `/#work`.

Implement the reentrancy lock and cleanup in the pure controller:

```js
export const NAVIGATION_TIMEOUT_MS = 300;

export function createNavigationWipeController({
  duration = NAVIGATION_TIMEOUT_MS,
  schedule,
  cancel,
  navigate,
  layer,
  panels,
  coordinator,
  beforeStart = () => {},
  policy = { motionAllowed: true, forcedColors: false },
  onError = () => {},
}) {
  let pending = null;
  let timer = null;
  let activePolicy = policy;
  let unlockMotion = () => {};

  function resetVisuals() {
    layer?.removeAttribute('data-active');
    for (const panel of panels) panel.removeAttribute('data-active');
  }

  function finish() {
    if (pending === null) return false;
    const destination = pending;
    pending = null;
    if (timer !== null) {
      try {
        cancel(timer);
      } catch (error) {
        onError(error);
      }
    }
    timer = null;
    try {
      resetVisuals();
    } catch (error) {
      onError(error);
    }
    coordinator?.release('navigation');
    try {
      navigate(destination);
    } catch (error) {
      onError(error);
      try {
        unlockMotion();
      } catch (unlockError) {
        onError(unlockError);
      }
    }
    unlockMotion = () => {};
    return true;
  }

  function fail(error) {
    finish();
    if (error) onError(error);
  }

  return {
    start(destination) {
      if (pending !== null) return false;
      pending = destination;
      try {
        unlockMotion = beforeStart() ?? (() => {});
        coordinator?.preempt('navigation', 3);
        if (!activePolicy.motionAllowed || activePolicy.forcedColors) {
          finish();
          return true;
        }
        layer?.setAttribute('data-active', '');
        for (const panel of panels) panel.setAttribute('data-active', '');
        timer = schedule(finish, duration);
      } catch (error) {
        fail(error);
      }
      return true;
    },
    complete() {
      return finish();
    },
    setPolicy(nextPolicy) {
      activePolicy = nextPolicy;
      if (!nextPolicy.motionAllowed || nextPolicy.forcedColors) finish();
    },
    pagehide() {
      finish();
    },
    fail,
    destroy() {
      if (pending !== null) {
        fail();
      } else {
        if (timer !== null) cancel(timer);
        timer = null;
        resetVisuals();
        coordinator?.release('navigation');
      }
    },
    snapshot() {
      return { pending, locked: pending !== null, timerActive: timer !== null };
    },
  };
}
```

`finish()` deliberately clears the destination, timeout, visuals, and lock
before calling the injected navigation function. The tests must assert that
completion/timeout/pagehide/destroy races navigate once, and that even a
throwing navigation function leaves `snapshot().locked === false`.

Mount it through one delegated click adapter:

```js
export function mountNavigationWipe(context) {
  const document = context.root.ownerDocument;
  const browserWindow = document.defaultView;
  const layer = context.root.querySelector('[data-motion-wipe]');
  const panels = [...context.root.querySelectorAll('[data-motion-wipe-panel]')];
  if (!browserWindow || !layer || panels.length !== 3) return null;

  const wipe = createNavigationWipeController({
    schedule: (callback, delay) => browserWindow.setTimeout(callback, delay),
    cancel: (id) => browserWindow.clearTimeout(id),
    navigate: (destination) => browserWindow.location.assign(destination),
    layer,
    panels,
    coordinator: context.coordinator,
    beforeStart: context.lockForNavigation,
    policy: context.policy,
    onError: context.onError,
  });

  function onClick(event) {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    const result = classifyNavigation({
      href: anchor.getAttribute('href'),
      target: anchor.getAttribute('target') ?? '',
      download: anchor.hasAttribute('download'),
    }, {
      button: event.button,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      defaultPrevented: event.defaultPrevented,
    }, browserWindow.location.href);
    if (!result.eligible) return;
    event.preventDefault();
    wipe.start(result.destination);
  }

  document.addEventListener('click', onClick, { signal: context.signal });
  browserWindow.addEventListener('pagehide', () => wipe.pagehide(), {
    signal: context.signal,
  });
  panels.at(-1).addEventListener('transitionend', (event) => {
    if (event.propertyName === 'transform') wipe.complete();
  }, { signal: context.signal });
  for (const panel of panels) {
    panel.addEventListener('transitioncancel', () => {
      wipe.fail(new Error('navigation wipe transition cancelled'));
    }, { signal: context.signal });
  }

  return {
    navigation: true,
    setPolicy(policy) {
      wipe.setPolicy(policy);
    },
    destroy() {
      wipe.destroy();
    },
  };
}
```

The DOM-adapter test dispatches two eligible clicks while locked and proves
both are prevented, only the first destination is retained, one timeout
exists, and navigation occurs exactly once. Ineligible activations must remain
completely untouched.

- [ ] **Step 3: Complete controller registration and lifecycle**

The final default homepage controller list is:

```js
[
  mountNavigationWipe,
  mountPointerEffects,
  mountMarquee,
  mountGrid,
  mountCardStacks,
  mountTextEffects,
]
```

`mountNavigationWipe` is registered on every route. Use static imports in
`index.mjs` and replace the Task 1 factory selection and lifecycle tail with:

```js
const kineticFactories = [
  mountPointerEffects,
  mountMarquee,
  mountGrid,
  mountCardStacks,
  mountTextEffects,
];

function defaultFactories(root) {
  return [
    mountNavigationWipe,
    ...(root.getAttribute('data-motion-kinetic') === 'true'
      ? kineticFactories
      : []),
  ];
}

// Inside initializeMotion(), after policy setup:
context.lockForNavigation = () => {
  if (navigationLocked) return () => {};
  navigationLocked = true;
  context.policy = applyNavigationLock(context.policy);
  for (const controller of controllers) {
    if (controller.navigation) continue;
    try {
      controller.setPolicy?.(context.policy);
    } catch (error) {
      context.onError(error, controller);
    }
  }
  context.coordinator.cancelCurrent();
  scheduler.cancelAll();
  scheduler.suspend();
  let unlocked = false;
  return () => {
    if (unlocked) return;
    unlocked = true;
    navigationLocked = false;
    context.policy = applyNavigationLock(latestRawPolicy ?? context.policy);
    scheduler.resetTiming();
    if (!context.policy.hidden) scheduler.resume();
    for (const controller of controllers) {
      if (controller.navigation) continue;
      try {
        controller.setPolicy?.(context.policy);
      } catch (error) {
        context.onError(error, controller);
      }
    }
  };
};

const factories =
  environment.controllerFactories ?? defaultFactories(root);
for (const factory of factories) {
  try {
    const controller = factory(context);
    if (!controller) continue;
    controllers.push(controller);
    controller.setPolicy?.(context.policy);
  } catch (error) {
    context.onError(error, factory);
  }
}

const browserHtml = browserDocument?.documentElement;
browserHtml?.classList.add('motion-ready');
let destroyed = false;
let pageInactive = false;

function applyPageInactive(reason) {
  if (pageInactive) return;
  pageInactive = true;
  const staticPolicy = {
    ...context.policy,
    motionAllowed: false,
    finePointerEffects: false,
    blendAllowed: false,
    perspectiveAllowed: false,
    hidden: true,
  };
  context.policy = staticPolicy;
  for (const controller of controllers) {
    try {
      controller.pagehide?.(reason);
      controller.setPolicy?.(staticPolicy);
    } catch (error) {
      context.onError(error, controller);
    }
  }
  try {
    context.coordinator.cancelCurrent();
  } catch (error) {
    context.onError(error);
  }
  scheduler.cancelAll();
  scheduler.suspend();
}

function onPageShow() {
  initializeMotion(root, environment);
  pageInactive = false;
  navigationLocked = false;
  scheduler.resetTiming();
  const refreshedPolicy = context.refreshPolicy();
  if (refreshedPolicy) latestRawPolicy = refreshedPolicy;
  context.policy = applyNavigationLock(latestRawPolicy ?? context.policy);
  if (!context.policy.hidden) scheduler.resume();
  for (const controller of controllers) {
    try {
      controller.setPolicy?.(
        controller.navigation
          ? (latestRawPolicy ?? context.policy)
          : context.policy,
      );
    } catch (error) {
      context.onError(error, controller);
    }
  }
}

browserWindow?.addEventListener('pagehide', () => applyPageInactive('pagehide'), {
  signal: abortController.signal,
});
browserWindow?.addEventListener('pageshow', onPageShow, {
  signal: abortController.signal,
});

const mount = {
  destroy() {
    if (destroyed) return;
    destroyed = true;
    abortController.abort();
    applyPageInactive('destroy');
    for (const controller of controllers) {
      try {
        controller.destroy?.();
      } catch (error) {
        context.onError(error, controller);
      }
    }
    scheduler.destroy();
    browserHtml?.classList.remove('motion-ready');
    mounts.delete(root);
  },
};
mounts.set(root, mount);
return mount;
```

Keep the policy observer callback from Task 1 as the only live media/visibility
source. When it receives hidden or reduced policy, deliver that policy to every
controller synchronously and then cancel/suspend the scheduler; on visible
restoration, reset timing before resuming. The `pageInactive` guard prevents
duplicate pagehide/destroy cleanup while keeping final controller destruction
idempotent.

The finalized `initializeMotion()` must:

- mark `<html class="motion-ready">` only after the shared shell and lifecycle
  are ready; never use that global class to hide or reposition an
  effect-specific static fallback;
- let each controller that changes a static fallback's presentation set its
  own `data-motion-enhanced` marker only after its required nodes, listeners,
  dimensions, and observer have mounted, and remove that marker on failure or
  destroy;
- use one scheduler and one coordinator;
- synchronously broadcast a `navigationActive: true`, static motion policy to
  every non-navigation controller before showing the wipe, then cancel all
  scheduler clients and preempt any remaining ownership at navigation priority
  3;
- suspend on `visibilitychange` hidden and `pagehide`;
- reset the scheduler timeline on visibility restoration;
- call the idempotent initializer on `pageshow`;
- cancel all controllers and transient nodes within one frame on live reduced
  motion;
- catch a factory failure, report it through `onError`, and continue mounting
  the remaining effects;
- remove `motion-ready`, roles, tabindex, CSS variables, active classes,
  listeners, observers, timers, and pointer ownership on destroy.

Add lifecycle tests proving each bullet with injected fakes. Include an exact
test where a writing root has `data-motion-kinetic="false"`: only navigation
mounts and the fake frame/timer counts remain zero. Include a test that pointer
effects plus marquee plus one card/text/grid owner is the maximum three active
scheduler clients; grid and navigation preemption must reduce, never increase,
that count. For the navigation case, seed visible blobs, one live sticker,
active marquee decay, and a card/text owner; call `wipe.start()`, and before
the wipe is activated assert every non-navigation controller received
`navigationActive: true`, all transient active flags were cleared, every
non-navigation scheduler client was removed, and only the single navigation
timeout remains. A simulated `location.assign()` failure must broadcast a
fresh `navigationActive: false` policy and leave motion idle until a real input
event. While the wipe is pending, dispatch a fine-pointer media change and
assert every non-navigation observer delivery remains merged with the
persistent navigation lock: `navigationActive` stays true, motion stays
disabled, and no client or timer beyond the wipe can restart. The navigation
controller receives the raw accessibility policy, so live forced colors or
reduced motion still takes its specified immediate-navigation path; assert
that path unlocks without restarting background motion. Make one homepage
factory throw and assert its static element has
no `data-motion-enhanced` marker, its semantic fallback remains visible, and
the remaining controllers still mount. Drive a fake document hidden before
`pagehide`, visible before `pageshow`, and assert `refreshPolicy()` delivers a
fresh visible snapshot before any resumed frame. That bfcache path must also
clear a successful wipe's retained `navigationLocked` boolean before applying
the snapshot, so the restored page is active and the next eligible navigation
can acquire a new lock exactly once. Do not use JSDOM.

- [ ] **Step 4: Style the wipe as one bounded sequence**

```css
.motion-wipe {
  position: absolute;
  inset: 0;
  z-index: 4;
  overflow: hidden;
}

[data-motion-wipe-panel] {
  inset: 0;
  transform: translate3d(-105%, 0, 0);
}

[data-motion-wipe-panel="red"] { background: var(--red); }
[data-motion-wipe-panel="yellow"] { background: var(--yellow); }
[data-motion-wipe-panel="green"] { background: var(--green); }

.motion-wipe[data-active] [data-motion-wipe-panel] {
  opacity: 1;
  transition: transform 180ms steps(4, end);
  transform: translate3d(0, 0, 0);
}

.motion-wipe[data-active] [data-motion-wipe-panel="yellow"] {
  transition-delay: 45ms;
}

.motion-wipe[data-active] [data-motion-wipe-panel="green"] {
  transition-delay: 90ms;
}
```

Reduced motion and forced colors must keep the wipe hidden and navigate
immediately.

- [ ] **Step 5: Verify all lifecycle and navigation tests**

```sh
npm run test:motion
ASTRO_TELEMETRY_DISABLED=1 npm test
```

Expected: all motion tests, existing route tests, and build tests PASS.

- [ ] **Step 6: Commit navigation and orchestration**

```sh
git add src/scripts/motion/navigation-wipe.mjs scripts/test-motion-navigation-wipe.mjs src/scripts/motion/index.mjs src/styles/motion.css scripts/test-motion-lifecycle.mjs
git commit -m "feat: add safe kinetic page transitions"
```

---

### Task 9: Ordinary-build, bundle, and Sites delivery contracts

**Files:**

- Create: `scripts/test-motion-bundle.mjs`
- Modify: `scripts/test-motion-scheduler.mjs`
- Modify: `scripts/test-homepage.mjs`
- Modify: `scripts/test-sites-build.mjs`
- Modify: `package.json:6-16`
- Modify: `README.md`

**Interfaces:**

- Consumes the final built HTML, CSS, module, poster assets, and existing
  filesystem-backed Sites worker mock.
- Produces release-gate commands:
  - `npm run test:motion`
  - `npm run test:motion:bundle`
  - `npm test`
  - `npm run test:sites`

- [ ] **Step 1: Add a failing exact bundle test**

Before creating `scripts/test-motion-bundle.mjs`, replace the temporary
`test-motion-*.mjs` glob with the exact unit-file list shown in Step 5. This
prevents the new build-dependent bundle test from running before `npm test`
creates a fresh `dist`.

```js
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

const buildRoot = path.resolve(
  process.cwd(),
  process.env.MOTION_BUILD_ROOT ?? 'dist',
);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

function externalModules(html) {
  return [...html.matchAll(
    /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["'][^"']+["'])[^>]*><\/script>/gi,
  )].map(([tag]) => tag.match(/\bsrc=["']([^"']+)["']/i)?.[1]).filter(Boolean);
}

function importedScripts(source) {
  const pattern =
    /\b(?:import|export)\s+(?:[^"'()]*?\sfrom\s*)?["']([^"']+\.js(?:\?[^"']*)?)["']|\bimport\s*\(\s*["']([^"']+\.js(?:\?[^"']*)?)["']\s*\)/g;
  return [...source.matchAll(pattern)].map((match) => match[1] ?? match[2]);
}

async function collectGraph(entry) {
  const pending = [entry];
  const graph = new Set();
  while (pending.length > 0) {
    const file = pending.pop();
    if (graph.has(file)) continue;
    graph.add(file);
    const source = await readFile(file, 'utf8');
    for (const specifier of importedScripts(source)) {
      assert.ok(
        specifier.startsWith('.'),
        `motion bundle imports non-local script ${specifier}`,
      );
      pending.push(path.resolve(
        path.dirname(file),
        specifier.replace(/[?#].*$/, ''),
      ));
    }
  }
  return graph;
}

test('every page references one shared motion entry within 25 KiB gzip', async () => {
  const files = await walk(buildRoot);
  const htmlFiles = files.filter((file) => file.endsWith('.html'));
  assert.ok(htmlFiles.length > 0, 'expected built HTML files');
  const referenced = [];
  for (const file of htmlFiles) {
    const scripts = externalModules(await readFile(file, 'utf8'));
    assert.equal(
      scripts.length,
      1,
      `${path.relative(buildRoot, file)} must reference exactly one external module`,
    );
    referenced.push(scripts[0]);
  }
  assert.equal(
    new Set(referenced).size,
    1,
    `built pages use different modules: ${[...new Set(referenced)].join(', ')}`,
  );

  const publicPath = new URL(referenced[0], 'https://build.invalid/').pathname;
  const entry = path.join(buildRoot, publicPath.replace(/^\/+/, ''));
  const graph = await collectGraph(entry);
  const allBuiltScripts = files.filter((file) => file.endsWith('.js'));
  assert.equal(
    allBuiltScripts.length,
    1,
    `expected one emitted JavaScript asset, found ${allBuiltScripts
      .map((file) => path.relative(buildRoot, file)).join(', ')}`,
  );
  assert.equal(
    graph.size,
    1,
    `motion entry emitted imported chunks: ${[...graph]
      .map((file) => path.relative(buildRoot, file)).join(', ')}`,
  );
  const compressedBytes = (
    await Promise.all(
      [...graph].map(async (file) =>
        gzipSync(await readFile(file), { level: 9 }).byteLength),
    )
  ).reduce((sum, size) => sum + size, 0);
  assert.ok(
    compressedBytes <= 25_600,
    `motion bundle graph is ${compressedBytes} gzip bytes`,
  );

  const packageJson = JSON.parse(
    await readFile(path.resolve(process.cwd(), 'package.json'), 'utf8'),
  );
  assert.deepEqual(Object.keys(packageJson.dependencies).sort(), [
    '@astrojs/sitemap',
    '@fontsource-variable/space-grotesk',
    'astro',
  ]);
});
```

Run:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run build
node --test scripts/test-motion-bundle.mjs
```

Expected: PASS only if the final bundle contract is already met; otherwise RED
with the exact asset count or byte size. If it is red, remove duplication and
unused branches from the owning modules without removing any effect.

- [ ] **Step 2: Add a static runtime-ownership scan**

Append to `scripts/test-motion-scheduler.mjs`:

```js
test('motion sources have one frame owner and no global randomness or intervals', async () => {
  const directory = new URL('../src/scripts/motion/', import.meta.url);
  const names = (await readdir(directory)).filter((name) => name.endsWith('.mjs'));
  const sources = new Map(
    await Promise.all(names.map(async (name) => [
      name,
      await readFile(new URL(name, directory), 'utf8'),
    ])),
  );
  for (const [name, source] of sources) {
    assert.doesNotMatch(source, /\bsetInterval\s*\(/, `${name} uses setInterval`);
    assert.doesNotMatch(source, /\bMath\.random\s*\(/, `${name} uses Math.random`);
    if (name !== 'scheduler.mjs') {
      assert.doesNotMatch(
        source,
        /\b(?:requestAnimationFrame|cancelAnimationFrame)\b/,
        `${name} directly owns a frame API`,
      );
    }
  }
  for (const name of [
    'pointer-effects.mjs',
    'marquee.mjs',
    'grid.mjs',
    'card-stack.mjs',
    'text-effects.mjs',
    'navigation-wipe.mjs',
  ]) {
    assert.doesNotMatch(
      sources.get(name),
      /\b(?:Date|performance)\.now\s*\(/,
      `${name} reads a global clock`,
    );
  }
});
```

Add `readdir` and `readFile` imports from `node:fs/promises` at the top. Run
the focused test and deliberately insert/remove a forbidden call once to prove
the scan fails for the intended reason.

- [ ] **Step 3: Expand built-homepage contracts without weakening existing tests**

Add assertions for:

```js
const moduleTag = html.match(
  /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc=")[^>]*>/,
)?.[0];
assert.ok(moduleTag, 'homepage references one external motion module');
assert.equal(
  (html.match(/<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc=")[^>]*>/g) ?? []).length,
  1,
);
assert.equal((html.match(/data-motion-blob=/g) ?? []).length, 2);
assert.equal((html.match(/data-motion-sticker=/g) ?? []).length, 24);
assert.equal((html.match(/data-motion-particle=/g) ?? []).length, 8);
assert.equal((html.match(/data-motion-grid-tile=/g) ?? []).length, 16);
assert.equal((html.match(/data-motion-card=/g) ?? []).length, 4);
assert.equal((html.match(/data-motion-card-layer=/g) ?? []).length, 12);
assert.equal((html.match(/data-motion-shuffle(?:\s|=)/g) ?? []).length, 8);
assert.equal((html.match(/data-motion-shake(?:\s|=)/g) ?? []).length, 5);
assert.doesNotMatch(html, /data-motion-enhanced/);
assert.match(css, /@media \(forced-colors:\s*active\)/);
assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
assert.match(css, /\.motion-layer[^}]*pointer-events:none/);
assert.match(css, /\.glitch-text__visual[^}]*pointer-events:none/);
```

Keep every current assertion in `test-homepage.mjs`, `test-seo.mjs`, and
`test-hosting.mjs`. Read `dist/writing/index.html` and
`dist/writing/aurora-private-caffeine-tracking/index.html`, assert each
references the exact same module URL as the homepage, and assert both:

```js
assert.doesNotMatch(writingHtml, /project-posters|data-motion-kinetic="true"/);
assert.doesNotMatch(articleHtml, /project-posters|data-motion-kinetic="true"/);
```

Also `access()` all four exact poster paths under `dist/images/project-posters`
and assert the homepage references each stable public URL. Do not replace exact
content checks with broad snapshots.

- [ ] **Step 4: Make the Sites test discover and serve the real module and posters**

After reading the homepage:

```js
const moduleTag = homepageHtml.match(
  /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc=")[^>]*>/,
)?.[0];
const modulePath = moduleTag?.match(/\bsrc="([^"]+)"/)?.[1];
assert.ok(modulePath, 'homepage must reference the generated motion module');

for (const path of [
  modulePath,
  '/images/project-posters/aurora.svg',
  '/images/project-posters/embnode.svg',
  '/images/project-posters/gitops.svg',
  '/images/project-posters/syslib.svg',
]) {
  await assertAvailable(worker, assets, path);
}
```

Read the staged writing index and article HTML and assert that each references
the same `modulePath`, contains no `project-posters` URL, and has
`data-motion-kinetic="false"`. The existing `assertAvailable()` already
performs both GET and HEAD, so use it for the generated module, generated CSS,
all four posters, and every existing route/asset. Preserve all current
query-rewriting and unknown-path 404 checks.

- [ ] **Step 5: Finalize package and README commands**

Use:

```json
{
  "scripts": {
    "test:motion": "node --test scripts/test-motion-scheduler.mjs scripts/test-motion-policy.mjs scripts/test-motion-lifecycle.mjs scripts/test-motion-pointer-effects.mjs scripts/test-motion-marquee.mjs scripts/test-motion-grid.mjs scripts/test-motion-card-stack.mjs scripts/test-motion-text-effects.mjs scripts/test-motion-navigation-wipe.mjs",
    "test:motion:bundle": "npm run build && node --test scripts/test-motion-bundle.mjs",
    "test": "npm run test:motion && npm run build && node --test scripts/test-seo.mjs scripts/test-homepage.mjs scripts/test-hosting.mjs scripts/test-motion-bundle.mjs",
    "test:sites": "npm run build:sites && MOTION_BUILD_ROOT=dist/client node --test scripts/test-sites-build.mjs scripts/test-motion-bundle.mjs"
  }
}
```

Keep `build`, `build:sites`, `test:homepage`, and `test:seo` unchanged. The
`test:sites` addition runs the same bundle/parity contract against the staged
client tree but remains outside `npm test`, because staging reshapes `dist`.
Add `npm run test:motion` and
`npm run test:motion:bundle` to the README development section without changing
portfolio content.

- [ ] **Step 6: Run ordinary and Sites delivery gates**

Run in this order because `test:sites` reshapes `dist`:

```sh
npm run test:motion
ASTRO_TELEMETRY_DISABLED=1 npm test
ASTRO_TELEMETRY_DISABLED=1 npm run test:sites
```

Expected: all suites PASS; Sites GET and HEAD return 200 for the module and all
four posters; the unknown route remains 404.

- [ ] **Step 7: Commit delivery coverage**

```sh
git add scripts/test-motion-bundle.mjs scripts/test-motion-scheduler.mjs scripts/test-homepage.mjs scripts/test-sites-build.mjs package.json README.md
git commit -m "test: verify kinetic motion delivery"
```

---

### Task 10: Browser acceptance and performance evidence

**Files:**

- Modify only if a failing browser criterion produces a regression test and
  focused fix in its owning source/test file.

**Interfaces:**

- Consumes the exact committed ordinary Astro build.
- Produces browser evidence for all nine effects, accessibility, cleanup,
  responsive layout, and performance.

- [ ] **Step 1: Start the exact local build for interactive QA**

Run:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run build
npm run preview -- --host 127.0.0.1 --port 4321
```

Keep the preview process running at `http://127.0.0.1:4321/`. Use the in-app
browser for Chrome-compatible inspection, and local Firefox, Safari, and iOS
Safari for the required browser matrix.

- [ ] **Step 2: Verify the nine normal-motion behaviors**

At a desktop viewport, verify each exact contract:

1. Work pointer travel creates rotating/falling poster stickers no more often
   than 60px/60ms and they disappear by 900ms.
2. Two difference-mode blobs follow with different spring rates; the native
   cursor remains visible.
3. The hero marquee accelerates downward, reverses upward, and stops within
   250ms.
4. Marked links emit no more than eight symbols and navigate without delay
   except the eligible HTML wipe.
5. The grid drags, wraps continuously, bounces at tile seams, and retains
   bounded release inertia.
6. All four project stacks fan and reveal only metadata already visible in the
   card.
7. Five display headings shake no more than two pixels for no more than 250ms.
8. Eligible HTML links show one red/yellow/green wipe; hash, PDF, mail, external,
   modified, and targeted links remain ordinary.
9. Four project names and four Chapter Index labels scramble and resolve to
   their exact strings by 400ms.

If one fails, stop browser QA, write a focused failing automated test where the
behavior is deterministic, fix the owning controller/component, rerun its unit
test and `npm test`, commit the fix, rebuild, and restart this task.

- [ ] **Step 3: Verify keyboard, touch, accessibility, and cleanup**

Check:

- existing tab order and focus names remain unchanged except for one enhanced
  grid region;
- ArrowLeft/ArrowRight pan the focused grid and Home resets it;
- card stacks respond to `:focus-within`; shake and shuffle use existing focus
  targets;
- mobile 320px, 390px, and 430px layouts have no horizontal document overflow;
- vertical touch scrolling works over the grid while horizontal drag pans it;
- pointer cancellation releases grid ownership and re-enables pointer effects;
- the accessibility tree exposes one copy of every visual label;
- keyboard focus rings remain visibly above every local effect and unobscured
  by the global layer at each focus stop;
- disabling JavaScript leaves all content, links, writing routes, poster
  fallback, and native navigation usable;
- changing reduced motion live cancels every transient within one frame;
- forced colors hides blobs and preserves readable text, borders, and focus;
- hiding/restoring the tab produces no physics jump;
- rapid double activation performs one wipe and one navigation.

Before each representative interaction, install a `PerformanceObserver` for
`layout-shift`, clear its array, perform the interaction, and require zero
entries not attributable to a user viewport resize. At each mobile width,
evaluate:

```js
document.documentElement.scrollWidth === document.documentElement.clientWidth
```

Do not treat authored `overflow-x: clip` as evidence. For idle/offscreen/
hidden coverage, capture separate five-second Chrome Performance recordings
after load, after scrolling Hero and Work fully away, on a writing page, and
while the tab is hidden. Require no motion-owned animation-frame callback or
timer task in those windows. Restore the tab and confirm the first motion frame
has no elapsed-time jump.

Run the matrix in the latest locally available stable Chrome, Firefox, and
Safari on macOS plus current iOS Simulator Safari.

Current-machine audit: Chrome `150.0.7871.187` and Safari `26.5` are installed;
Firefox is absent, and only Command Line Tools are installed, so `simctl` is
unavailable. Before claiming browser acceptance or proceeding to release,
obtain Firefox plus either a real iPhone or full Xcode/iOS Simulator. If those
environments are still unavailable at execution time, stop at this gate and
report the missing browser evidence; do not waive or silently mark it passed.

- [ ] **Step 4: Capture the reproducible performance trace**

In Chrome stable on the development Mac:

1. load the built homepage and wait for all network activity to settle;
2. record ten seconds with no CPU throttling while continuously dragging the
   grid and moving the pointer through Work;
3. exclude the first and last trace frames;
4. confirm there is no scripting task longer than 50ms;
5. confirm active frame interval p95 is at most 25ms on a 60Hz-or-faster
   display;
6. inspect the DOM before and after and confirm pool counts remain
   24/8/16 with no growth;
7. reload without the QA sampler, capture a separate five-second recording
   during the same interaction, and confirm only one animation-frame callback
   source is active.

Save the exported trace outside the repository as
`/tmp/nmapaye-motion-chrome-trace.json` and record the exact tested SHA beside
it in the release report. In parallel, use this
console sampler during the same ten-second interaction to make the p95
calculation reproducible:

```js
window.__motionIntervals = [];
window.__motionLongTasks = [];
new PerformanceObserver((list) => {
  window.__motionLongTasks.push(...list.getEntries().map((entry) => entry.duration));
}).observe({ type: 'longtask' });
let previousMotionSample;
const motionSampleStart = performance.now();
function sampleMotionFrame(timestamp) {
  if (previousMotionSample !== undefined) {
    window.__motionIntervals.push(timestamp - previousMotionSample);
  }
  previousMotionSample = timestamp;
  if (timestamp - motionSampleStart < 10_000) requestAnimationFrame(sampleMotionFrame);
}
requestAnimationFrame(sampleMotionFrame);
```

After ten seconds, discard the first and last interval, sort the remainder,
and select index `Math.ceil(length * 0.95) - 1`. Record that value, the maximum
`longtask` duration, trace path, browser version, viewport, and pool counts in
the release report. The sampler is QA instrumentation; remove/reload it before
the separate one-motion-frame-source and idle recordings.

If the trace fails, add a regression assertion for the measurable cause,
optimize the owning module without reducing effect scope, rerun all motion and
build tests, commit, and repeat the trace.

- [ ] **Step 5: Finish QA with a clean full test run**

Stop the preview process, then run:

```sh
npm run test:motion
ASTRO_TELEMETRY_DISABLED=1 npm test
ASTRO_TELEMETRY_DISABLED=1 npm run test:sites
python3 scripts/test-resume.py
git diff --check
git status --short
```

Expected: all commands PASS and status shows no uncommitted files.

---

### Task 11: Exact-commit release and production verification

**Files:**

- Do not modify source unless release verification exposes a new reproducible
  defect.

**Interfaces:**

- Consumes one clean, fully verified commit.
- Produces a healthy GitHub Pages deployment and a new private Sites version
  from that same commit.

- [ ] **Step 1: Stop for explicit release authority**

Report the exact commit SHA, test results, bundle gzip size, browser matrix,
and performance metrics. Ask the user to authorize the GitHub and Sites
release. Do not push, merge, change access, or deploy before approval.

- [ ] **Step 2: Refresh the remote and reverify the exact release commit**

After approval:

```sh
git fetch origin
git status --short --branch
git log -1 --format=%H
```

If `origin/main` moved, rebase only the kinetic commits onto it and resolve no
unrelated user changes. Regardless of whether the remote moved, rerun:

```sh
npm run test:motion
ASTRO_TELEMETRY_DISABLED=1 npm test
ASTRO_TELEMETRY_DISABLED=1 npm run test:sites
python3 scripts/test-resume.py
git diff --check
```

Expected: all checks PASS from the final SHA.

If rebase, conflict resolution, or any release preparation changes the commit
SHA or source tree, rebuild and repeat every Task 10 browser, accessibility,
and performance check against that new SHA. Browser evidence from an older SHA
cannot authorize a changed release commit.

- [ ] **Step 3: Publish the verified Git commit using the approved integration path**

Use the release method the user authorizes: either direct update of
`origin/main` or a reviewed PR from the current `nmapaye-bot/` branch. Push
only the verified commits and no local planning artifacts outside the approved
design spec and this plan.
After direct push or PR merge, fetch `origin/main` again and record its exact
SHA. A PR merge or squash may create a different commit even when the content
looks identical. Create a clean temporary worktree at that exact
`origin/main` SHA. Do not reuse another checkout's dependencies: bootstrap and
verify that worktree with:

```sh
npm ci
release_test_env="$(mktemp -d)"
python3 -m venv "$release_test_env/venv"
"$release_test_env/venv/bin/python" -m pip install -r requirements-test.txt
npm run test:motion
ASTRO_TELEMETRY_DISABLED=1 npm test
ASTRO_TELEMETRY_DISABLED=1 npm run test:sites
"$release_test_env/venv/bin/python" scripts/test-resume.py
git diff --check
git status --short
```

Require every command to pass and the status to remain clean. If dependency
installation fails, stop and report it rather than borrowing an unverified
`node_modules` or Python environment. If the post-integration SHA differs from
Task 10, repeat browser acceptance and performance evidence there. Wait for
the GitHub Pages workflow for that same SHA to finish successfully before
touching Sites. All remaining public and Sites steps use this
post-integration SHA and temporary worktree, not the pre-merge branch SHA.

- [ ] **Step 4: Verify public GitHub Pages**

Check `https://nmapaye.com/`, `/writing/`,
`/writing/aurora-private-caffeine-tracking/`, `/resume.pdf`, the generated
module path, the generated CSS path, and all four
`/images/project-posters/*.svg` paths. Require 200 responses and confirm the
homepage and writing content remain unchanged.

If the workflow or public smoke check fails, stop before Sites deployment and
report the run URL and failing evidence.

- [ ] **Step 5: Build, package, save, and privately deploy the exact SHA to Sites**

Before any Sites action, read and follow the `sites:sites-building` and
`sites:sites-hosting` skills. Read the existing project ID verbatim from
`.openai/hosting.json`; never create a new project or alter access. Use the
official Sites packaging helper on the exact pushed commit, inspect the archive
for:

```text
dist/server/index.js
dist/client/index.html
exactly one dist/client/_astro/*.js asset referenced by dist/client/index.html
every dist/client/_astro/*.css asset referenced by built HTML, including the homepage CSS
dist/client/images/project-posters/aurora.svg
dist/client/images/project-posters/embnode.svg
dist/client/images/project-posters/gitops.svg
dist/client/images/project-posters/syslib.svg
dist/.openai/hosting.json
```

Obtain a fresh Sites source credential without persisting it. Push the exact
source SHA to the configured Sites source branch, save one new version, deploy
that saved version with the private-deployment operation, and poll until
terminal success. Never deploy an older version on failure.

- [ ] **Step 6: Perform authenticated Sites smoke and log verification**

Open the production Sites URL in the authenticated in-app browser and verify:

- homepage and all nine effects;
- `/writing/`;
- the AURORA article;
- `/resume.pdf`;
- the generated module;
- the generated CSS;
- one GET and one HEAD for each poster asset.

Inspect new worker-log entries and require 200 responses with no new route or
asset 404s. Report the exact commit SHA, GitHub workflow, Sites version number,
production URL, smoke results, and any retained failure identifiers.
