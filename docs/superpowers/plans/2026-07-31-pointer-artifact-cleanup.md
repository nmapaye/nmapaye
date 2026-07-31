# Pointer Artifact Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove ghosted pointer-trail cards with a bounded 150 ms exit and center a 25%-smaller difference-blend blob on the pointer.

**Architecture:** Keep the existing fixed node pools and shared frame scheduler. Give each sticker one renderer-owned lifecycle, including a non-restarting exit timestamp and complete style cleanup, while keeping blob geometry CSS-local inside the dedicated blend layer.

**Tech Stack:** Astro, browser ESM, CSS transforms, Node's built-in test runner, existing filesystem-backed homepage integration tests, Chrome browser QA.

## Global Constraints

- Keep the fixed pools of 24 stickers and two blobs.
- Add no dependency and create no new runtime nodes.
- Preserve the shared frame scheduler and motion coordinator.
- Keep normal Work trail lifetime at 900 ms and exit lifetime at exactly 150 ms.
- Reduce blob sizing from `clamp(10rem, 24vw, 22rem)` to `clamp(7.5rem, 18vw, 16rem)`.
- Preserve coarse-pointer, reduced-motion, forced-colors, unsupported-blend, content, SEO, résumé, route, and hosting-access behavior.
- Preserve ordinary `npm run build` and the existing Sites staging contract.
- Do not push or deploy before the existing release gates pass.

---

### Task 1: Make sticker teardown single-source and add the 150 ms exit

**Files:**
- Modify: `scripts/test-motion-pointer-effects.mjs`
- Modify: `src/scripts/motion/pointer-effects.mjs`

**Interfaces:**
- Consumes: the existing `mountPointerEffects(context)` controller, `context.scheduler.now(rawTimestamp)`, fixed `stickerNodes`, and window/document listener signals.
- Produces: sticker items with optional `exitingAt: number` and `exitOpacity: number`; immediate `clearStickers()` cleanup; bounded `beginStickerExit()` behavior.

- [ ] **Step 1: Add failing renderer-cleanup regressions**

Extend `scripts/test-motion-pointer-effects.mjs` so natural expiry and immediate policy cleanup assert both state and renderer output:

```js
assert.equal(sticker.attrs.has('data-active'), false);
assert.equal(sticker.style.opacity, '');
assert.equal(sticker.style.values.size, 0);
```

The production mutation these checks catch is removing the active attribute
without removing inline opacity and transform variables.

- [ ] **Step 2: Add failing 150 ms exit regressions**

Use a mutable clock and real mounted controller to cover pointer exit, Work to
Hero movement, scrolling while `IntersectionObserver` exists, and the
`pointerout` then offscreen event order. The core timing assertion is:

```js
clock = 450;
harness.controller.update(450);
const opacityAtExit = Number(harness.stickers[0].style.opacity);
harness.dispatch('pointerout', {
  target: harness.showcase,
  relatedTarget: null,
});

clock = 525;
harness.controller.update(525);
assert.ok(Number(harness.stickers[0].style.opacity) < opacityAtExit);
assert.ok(Number(harness.stickers[0].style.opacity) > 0);

clock = 599;
assert.equal(harness.controller.update(599), true);
clock = 600;
harness.controller.update(600);
assert.equal(harness.stickers[0].attrs.has('data-active'), false);
assert.equal(harness.stickers[0].style.opacity, '');
```

For the scroll case, call `harness.triggerWindow('scroll')`; for Work to Hero,
dispatch a pointer move whose target is `harness.hero`. Assert that a second
exit trigger does not move the deadline beyond the original 150 ms.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
node --test scripts/test-motion-pointer-effects.mjs
```

Expected failures:

- expired or immediately-cleared stickers retain inline opacity;
- `pointerout` retains the normal 900 ms lifetime;
- observer-backed mounts have no scroll cleanup listener;
- zone changes do not start a bounded exit.

- [ ] **Step 4: Implement renderer-owned sticker cleanup**

In `src/scripts/motion/pointer-effects.mjs`, introduce exact constants and a
node reset helper:

```js
const STICKER_LIFETIME = 900;
const STICKER_EXIT_DURATION = 150;

function resetStickerNode(node) {
  node.removeAttribute('data-active');
  node.removeAttribute('style');
}
```

Update `clearStickers()` to clear state, reset the baseline/zone, and call
`resetStickerNode()` for every pooled sticker.

- [ ] **Step 5: Implement a non-restarting short exit**

Add a helper that captures current opacity from the scheduler timeline exactly
once and requests frames only when at least one item changed:

```js
const beginStickerExit = () => {
  if (state.stickers.length === 0) return;
  const timestamp = context.scheduler.now(context.clock());
  let changed = false;
  state.stickers = state.stickers.map((item) => {
    if (item.exitingAt !== undefined) return item;
    changed = true;
    return {
      ...item,
      exitingAt: timestamp,
      exitOpacity: Math.max(
        0,
        1 - (timestamp - item.startedAt) / STICKER_LIFETIME,
      ),
    };
  });
  state.lastSticker = null;
  state.stickerZone = null;
  if (changed) request();
};
```

Filter normal items at 900 ms and exiting items at 150 ms. When a pooled node
has no matching item, call `resetStickerNode(node)` before returning. For an
exiting item, compute opacity as:

```js
const exitProgress = Math.max(
  0,
  Math.min(1, (timestamp - item.exitingAt) / STICKER_EXIT_DURATION),
);
node.style.opacity = String(item.exitOpacity * (1 - exitProgress));
```

Continue deriving fall distance from the original 900 ms progress so the card
does not jump position when the exit begins.

- [ ] **Step 6: Route every soft boundary through the exit helper**

Call `beginStickerExit()` when:

- `pointerout` leaves the current motion zone;
- a pointer move changes from Work to Hero or another non-showcase zone;
- the document scrolls;
- the owning zone becomes offscreen.

Resolve the browser window before observer setup. Install exactly one passive,
abort-owned scroll listener for all mounts. In no-observer mode, let that same
handler also call the fallback geometry refresh; retain the separate resize
listener. Keep policy, hidden, forced-colors, grid-ownership, blur teardown,
and destroy paths on immediate `clearStickers()`.

- [ ] **Step 7: Run focused and adjacent tests and verify GREEN**

Run:

```bash
node --test scripts/test-motion-pointer-effects.mjs
npm run test:motion
git diff --check -- src/scripts/motion/pointer-effects.mjs scripts/test-motion-pointer-effects.mjs
```

Expected: pointer tests pass; any full-suite failure must be unrelated to the
two edited pointer files and investigated before committing.

- [ ] **Step 8: Commit the sticker repair**

```bash
git add -- src/scripts/motion/pointer-effects.mjs scripts/test-motion-pointer-effects.mjs
git commit -m "fix: retire pointer trail cards cleanly"
```

---

### Task 2: Center and reduce the liquid blobs

**Files:**
- Modify: `scripts/test-homepage.mjs`
- Modify: `src/styles/motion.css`

**Interfaces:**
- Consumes: `--blob-x`, `--blob-y`, `--blob-rotate`, `--blob-scale-x`, and `--blob-scale-y` written by the pointer controller.
- Produces: a blob whose unrotated center is the spring coordinate at all responsive sizes, with a 120–256 px layout diameter.

- [ ] **Step 1: Add a failing built-CSS contract**

Extend `difference blobs blend at their own page-layer boundary` in
`scripts/test-homepage.mjs`:

```js
assert.match(blob ?? '', /width:\s*clamp\(7\.5rem,\s*18vw,\s*16rem\)/);
const translateIndex = blob.indexOf('translate3d(');
const centerIndex = blob.indexOf('translate(-50%,-50%)');
const rotateIndex = blob.indexOf('rotate(');
assert.ok(
  translateIndex >= 0 && translateIndex < centerIndex && centerIndex < rotateIndex,
);
```

This protects the consumer-visible geometry: removing the centering transform
or restoring the oversized clamp makes the regression fail.

- [ ] **Step 2: Build and verify RED**

Run:

```bash
ASTRO_TELEMETRY_DISABLED=1 npm run build
node --test --test-name-pattern="difference blobs" scripts/test-homepage.mjs
```

Expected: FAIL because the built CSS still contains the old width and lacks
the center translation.

- [ ] **Step 3: Apply the minimal blob CSS change**

Update the exact blob rule in `src/styles/motion.css`:

```css
[data-motion-blob] {
  width: clamp(7.5rem, 18vw, 16rem);
  aspect-ratio: 1;
  border-radius: 48% 52% 61% 39% / 43% 37% 63% 57%;
  background: var(--white);
  transform: translate3d(var(--blob-x, -200vw), var(--blob-y, -200vh), 0)
    translate(-50%, -50%)
    rotate(var(--blob-rotate, 0deg))
    scale(var(--blob-scale-x, 1), var(--blob-scale-y, 1));
}
```

Do not change `.motion-layer--blend` or add per-blob blend modes.

- [ ] **Step 4: Rebuild and verify GREEN**

Run:

```bash
ASTRO_TELEMETRY_DISABLED=1 npm run build
node --test scripts/test-homepage.mjs
git diff --check -- src/styles/motion.css scripts/test-homepage.mjs
```

Expected: all homepage tests pass and the built output keeps one dedicated
difference-blend layer.

- [ ] **Step 5: Commit the blob repair**

```bash
git add -- src/styles/motion.css scripts/test-homepage.mjs
git commit -m "fix: center and reduce pointer blobs"
```

---

### Task 3: Restore the full lifecycle fixture contract

**Files:**
- Modify: `scripts/test-motion-lifecycle.mjs`

**Interfaces:**
- Consumes: pointer fallback geometry reads of DOMRect `top`, `bottom`, `left`, and `right`.
- Produces: a fake DOMRect that matches the real browser geometry contract.

- [ ] **Step 1: Reproduce the existing integration failure**

Run:

```bash
node --test --test-name-pattern="mounted motion clients clear exact transient state" scripts/test-motion-lifecycle.mjs
```

Expected: FAIL because the fake returns no `right`; the pointer fallback
correctly treats that incomplete rectangle as offscreen and never becomes the
third active controller.

- [ ] **Step 2: Complete the test fixture DOMRect**

Change only the lifecycle fixture method:

```js
getBoundingClientRect() {
  return {
    top: 0,
    bottom: 500,
    left: 0,
    right: 500,
    width: 500,
    height: 500,
  };
}
```

- [ ] **Step 3: Verify and commit the fixture repair**

Run:

```bash
node --test scripts/test-motion-lifecycle.mjs
git diff --check -- scripts/test-motion-lifecycle.mjs
git add -- scripts/test-motion-lifecycle.mjs
git commit -m "test: complete lifecycle viewport geometry"
```

Expected: lifecycle tests pass with the real pointer controller active.

---

### Task 4: Integrated verification and Chrome QA

**Files:**
- Verify: `src/scripts/motion/pointer-effects.mjs`
- Verify: `src/styles/motion.css`
- Verify: `scripts/test-motion-pointer-effects.mjs`
- Verify: `scripts/test-homepage.mjs`
- Verify: `scripts/test-motion-lifecycle.mjs`

**Interfaces:**
- Consumes: the exact committed source from Tasks 1–3.
- Produces: a freshly built local preview and evidence that the two reported visual defects are resolved.

- [ ] **Step 1: Run repository verification**

Run each command separately:

```bash
ASTRO_TELEMETRY_DISABLED=1 npm test
ASTRO_TELEMETRY_DISABLED=1 npm run test:sites
python3 scripts/test-resume.py
git diff --check
```

Expected: all commands pass. If the unrelated uncommitted marquee or
text/navigation audit changes cause a failure, diagnose it without discarding
or silently bundling those changes into this repair.

- [ ] **Step 2: Reload the local preview in Chrome**

Keep the existing preview server, rebuild after the final source change, and
reload `http://127.0.0.1:4321/` before observing state.

- [ ] **Step 3: Verify desktop pointer geometry**

At the normal desktop viewport:

1. Move to a known point inside Hero.
2. Poll until `--blob-x` and `--blob-y` are within 0.5 px of the pointer.
3. Assert the lead blob's rendered bounding-box center is within 1 px of the
   spring coordinate.
4. Assert computed layout width is no more than 256 px.

- [ ] **Step 4: Verify trail cleanup**

In Work, move across at least three 60 px/60 ms thresholds, then leave Work and
scroll into Experience. Assert opacity decreases during the exit and that,
after 150 ms, there are zero `[data-motion-sticker][data-active]` elements and
every pooled sticker has empty inline opacity/style values.

- [ ] **Step 5: Verify narrow responsive geometry**

Apply a 390 px viewport override, reload, repeat the settled-center check, and
assert the computed blob width is 120 px. Reset the temporary override before
finishing.

- [ ] **Step 6: Review the scoped diff**

Confirm the pointer repair commits contain no content, résumé, SEO, route,
hosting-access, or unrelated motion changes. Do not push or deploy while the
existing iOS Safari release gate remains unavailable.
