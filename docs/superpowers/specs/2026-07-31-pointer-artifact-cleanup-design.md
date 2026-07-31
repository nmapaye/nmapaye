# Pointer Artifact Cleanup Design

**Status:** Approved design  
**Date:** 2026-07-31  
**Project:** Nathaniel Mapaye — Systems to Screens

## Objective

Correct two visual defects in the homepage pointer effects without changing
portfolio content, routes, accessibility semantics, the other seven motion
effects, or either deployment layout:

1. Project-poster trail cards can remain visibly fixed over unrelated page
   content after they should have left the screen.
2. The difference-blend liquid blobs are anchored down and right of the mouse
   and are larger than desired.

## Diagnosis

Sticker visibility currently has two sources of truth. The renderer writes an
inline opacity to every active sticker, while cleanup removes only the
`data-active` attribute. Inline opacity wins over the inactive stylesheet rule,
so an expired, offscreen, or cancelled sticker can remain visible after the
scheduler has stopped. Pointer exit also clears the zone reference before the
offscreen observer can associate the remaining trail with Work.

Blob spring coordinates correctly converge on `clientX` and `clientY`, but the
CSS transform places the blob's top-left at those coordinates. The visible
center is consequently offset by half the blob's layout size. The current
`clamp(10rem, 24vw, 22rem)` size produces a 160–352 px layout box before
rotation and spring stretch enlarge its painted bounds.

## Selected Behavior

### Sticker trail cleanup

Normal pointer movement within Work keeps the existing 900 ms falling trail.
When the pointer leaves Work, enters another motion zone, or the document
scrolls, every remaining sticker begins a 150 ms exit from its current opacity.
The exit is monotonic and does not jump brighter or restart a sticker's normal
lifetime.

At the end of the exit, cleanup removes the active attribute and every inline
style written by the sticker renderer. Policy changes, hidden-page state,
forced-colors mode, grid ownership, and controller destruction continue to use
immediate cleanup rather than an exit animation.

Scroll cleanup must work whether or not `IntersectionObserver` is available.
Observer callbacks remain responsible for offscreen state, but correctness no
longer depends on a pointer-zone reference surviving `pointerout`.

### Liquid blob alignment and size

Each blob remains a spring-following viewport-fixed element in the dedicated
difference-blend layer. A blob-local `translate(-50%, -50%)` centers its layout
box on the spring coordinates before rotation and stretch. The blend layer and
native cursor remain unchanged.

The responsive blob diameter becomes
`clamp(7.5rem, 18vw, 16rem)`, a uniform 25% reduction from the current rule:

- minimum: 160 px → 120 px;
- fluid width: 24 vw → 18 vw;
- maximum: 352 px → 256 px.

The existing two-rate spring lag remains intentional. This change corrects the
geometric anchor; it does not make the blobs rigidly track the pointer.

## Implementation Boundaries

- Keep the fixed pools of 24 stickers and two blobs.
- Add no dependency and create no new runtime nodes.
- Preserve the shared frame scheduler and motion coordinator.
- Do not move blending to an individual blob or back into the effects layer.
- Do not change coarse-pointer, reduced-motion, forced-colors, or unsupported
  blend fallbacks.
- Do not modify content, SEO, résumé files, routes, or hosting access.
- Preserve ordinary `npm run build` and the existing Sites staging contract.

## Verification

Automated regressions will prove that:

- a sticker remains visible during, but not after, its 150 ms exit;
- exit opacity starts from the current rendered value and decreases
  monotonically;
- pointer exit, Work-to-Hero movement, scrolling, and offscreen notification
  cannot leave an active attribute or stale inline opacity;
- natural 900 ms expiry also clears stale renderer-owned styles;
- policy and destruction paths remain immediate;
- existing pointer lifetime, burst, offscreen, and teardown contracts remain
  green;
- the built CSS preserves the dedicated blend layer, centers each blob on its
  spring coordinates, and applies the approved responsive size.

Chrome QA will move the pointer to known coordinates in Hero and Work, allow
the lead spring to settle, and compare the blob's rendered center with the
target. It will also create a trail, leave Work, scroll into Experience, and
confirm that no card remains after 150 ms. The checks will be repeated at a
desktop viewport and a narrow responsive viewport.

## Release Scope

This repair is limited to pointer-effect source, focused tests, and any built
CSS contract assertion required for regression coverage. It does not authorize
a production push or Sites deployment before the existing release gates pass.
