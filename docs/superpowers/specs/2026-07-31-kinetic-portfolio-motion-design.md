# Kinetic Portfolio Motion Design

**Status:** Approved design
**Date:** 2026-07-31
**Project:** Nathaniel Mapaye — Systems to Screens

## Objective

Add nine coordinated microanimations that make the portfolio feel responsive,
playful, and tactile without changing its approved content, visual identity,
information architecture, SEO, résumé, or deployment formats:

1. Sticker Trail
2. Liquid Blob Cursor
3. Horizontal Marquee
4. Chaotic Button Burst
5. Infinite Image Grid
6. 3D Card Stack
7. Brutalist Text Shake
8. Color Flash Reveal
9. Glitch Text Shuffle

The approved direction is **curated kinetic**: all nine effects appear, but
activity is concentrated in showcase zones. Native scrolling, link behavior,
reading order, and the site's systems-to-screens narrative remain stable.

## Existing Contracts

The implementation starts from the current clean `origin/main` in the
`nmapaye-bot/sites-preview-repair` worktree. These contracts remain
authoritative:

- The site is static Astro and currently requires no client-side framework.
- `src/data/site.ts` remains the source of truth for portfolio content.
- The approved marquee phrase `SYSTEMS / SECURITY / PRODUCT` is the one
  intentional interface-label addition. It does not add a project claim,
  résumé statement, or SEO keyword surface.
- The homepage retains its exact top-level sequence:
  `Nav`, `Hero`, `ChapterIndex`, `Projects`, `Experience`, `Notes`, `Contact`,
  and `Footer`.
- Existing project-card counts, navigation destinations, routes, structured
  data, social metadata, résumé, and writing content do not change.
- The palette remains ink `#101010`, paper `#f7f5ee`, yellow `#ffeb09`,
  green `#b8ff39`, and red `#ef362f`.
- The sticky navigation remains at `z-index: 50`; the skip link remains at
  `z-index: 1000`.
- `npm run build` continues to produce the ordinary Astro artifact used by
  GitHub Pages.
- `npm run build:sites` continues to stage the same build as
  `dist/client/**` with the worker at `dist/server/index.js`.
- No runtime dependency will be added for animation.

## Non-goals

This work does not:

- rewrite portfolio copy or invent project results;
- add fabricated application screenshots;
- replace native scrolling with scroll hijacking;
- hide the native cursor;
- add continuous text shaking, scrambling, or autoplaying marquee motion;
- make project metadata available only on hover;
- alter the owner-only Sites access policy or hosting project identity;
- redesign writing pages or change their content;
- introduce a client framework, physics library, or animation library.

## Alternatives Considered

### Curated kinetic — selected

All nine effects share one motion policy and one visual language. Activity
clusters around the hero and work showcase, while editorial sections stay
calm. This preserves the requested breadth without turning every interaction
into a competing animation.

### Maximum chaos

Every eligible element animates aggressively and continuously. This would
deliver spectacle but would undermine readability, motion accessibility, and
the portfolio's professional systems narrative.

### Minimal ambient motion

Only a few effects appear and most are subtle CSS transitions. This would be
easy to maintain but would not satisfy the explicit request for all nine named
interactions.

## Experience Choreography

### 1. Sticker Trail

Within the Work showcase, fine-pointer movement creates factual project-poster
stickers behind the pointer. Posters cycle through AURORA, EmbNode, GitOps, and
SysLib. A sticker may spawn only after at least 60 pixels of travel and at
least 60 milliseconds since the previous spawn. It falls slightly, rotates,
and fades within 900 milliseconds.

The trail:

- uses a recycled pool of at most 24 nodes;
- is decorative and `aria-hidden`;
- never receives pointer events;
- suspends while the image grid owns a drag gesture;
- creates no nodes for coarse pointers or reduced motion;
- stops producing work as soon as the pointer stops or leaves the showcase.

### 2. Liquid Blob Cursor

While the fine pointer is over the homepage hero or Work showcase, two large
fixed blobs spring toward it at different rates. Their overlap, squash, scale,
and rotation create a fluid silhouette, while a fixed
`mix-blend-mode: difference` treatment inverts the colors beneath them. The
native cursor stays visible.

The blobs:

- update through the shared frame scheduler, not their own loop;
- use bounded transforms rather than animated large-surface blur;
- are noninteractive, `aria-hidden`, and below the navigation and skip link;
- restore to an inert offscreen state on pointer leave, window blur, page
  hiding, or reduced-motion activation;
- disappear where `mix-blend-mode: difference` is unsupported and in
  forced-colors mode, rather than placing an opaque fallback over content.

### 3. Horizontal Marquee

The hero contains one semantic line reading
`SYSTEMS / SECURITY / PRODUCT`. Visual duplicate tracks are `aria-hidden`.
Signed scroll velocity determines speed and direction: faster downward
scrolling accelerates the expected direction, upward scrolling reverses it.
Velocity decays to zero and movement stops within 250 milliseconds after
scroll input ends. There is no autonomous marquee motion, so no persistent
pause control is needed.

### 4. Chaotic Button Burst

Hover, keyboard focus, or direct tap on primary navigation links, hero actions,
project links, and contact actions emits up to eight decorative particles. A
seeded choice selects from
`✦`, `◆`, `⚡`, `↗`, and the four project numbers. Particles receive bounded
offsets, rotation, scale, and color, then disappear within 300 milliseconds.

The burst never clones an anchor, changes accessible text, delays link
activation, or prevents ordinary navigation. Focus and tap receive the same
brief visual response as hover.

### 5. Infinite Image Grid

The Work section includes a draggable loop of the four project posters. A
fixed pool of at most 16 tiles covers and slightly exceeds the viewport.
Tiles recycle across opposite seams as the camera moves, creating an infinite
surface.

There are no terminal content bounds. “Boundary bounce” means each tile
squashes and springs as it crosses a viewport seam; the overall canvas remains
continuous. Pointer release adds bounded inertia. The grid:

- begins dragging only after an eight-pixel threshold;
- captures and tracks one pointer at a time;
- treats `pointerup`, `pointercancel`, and `lostpointercapture` as terminal
  cleanup paths;
- permits two-axis mouse and pen dragging;
- uses horizontal touch dragging with `touch-action: pan-y`, preserving native
  vertical page scrolling;
- supports Left/Right arrow panning and Home-to-reset when its enhanced grid
  surface has focus;
- removes inertia and seam bounce under reduced motion.

### 6. 3D Card Stack

The featured AURORA article and all three secondary project cards gain an
`aria-hidden` visual stack of layered project posters. Hover,
`:focus-within`, or a direct tap fans the layers apart with bounded perspective
and reveals a visual metadata treatment.

The treatment uses only metadata already visible in that project's ordinary
markup: AURORA uses facts and metrics; secondary cards use their rendered
period when present, stack, and facts. The decorative stack does not create a
second accessible copy. Unsupported 3D transforms receive a flat
two-dimensional spread. Reduced motion shows a static expanded arrangement
without perspective or tilt.

### 7. Brutalist Text Shake

Selected display headings receive a short stepped red/green glitch jitter on
hover or related keyboard focus. Each trigger lasts at most 250 milliseconds,
moves no more than two pixels, and uses at most three oscillations. It never
runs continuously and never applies to body copy.

One element owns each transform. If a heading or card already uses a transform,
the shake applies to a dedicated visual wrapper or pseudo-element so effects
cannot overwrite one another.

The pointer trigger is the heading itself. Keyboard focus triggers the same
heading only when focus enters an existing link or control in its section:
hero actions for the hero, project links for Work, writing links for Notes, and
contact actions for Contact. Experience has no natural focus target, so its
heading receives pointer hover only. No heading or decorative wrapper becomes
a focus stop.

### 8. Color Flash Reveal

Eligible same-origin HTML navigation triggers a single directional wipe made
from staggered red, yellow, and green full-screen panels. The panels read as
one traveling block sequence, not repeated flashes, and complete in roughly
240–300 milliseconds before ordinary navigation continues.

The handler does not intercept:

- in-page hash links;
- modified clicks or non-primary pointer buttons;
- downloads, PDFs, email links, or telephone links;
- external or cross-origin destinations;
- links targeting another browsing context.

Eligible links include the site brand, writing cards, article/back links,
footer navigation, and ordinary same-origin page links. Browser Back, Forward,
reload, address-bar, and history traversal remain ordinary navigation because
they do not originate from an eligible link activation.

Keyboard and touch activation follow the same eligible-click path. If setup,
animation, page visibility, or timing fails, navigation proceeds immediately.
Cross-document View Transitions are not required for this implementation. If
they are enabled later, they must not add a second visible transition or become
a navigation dependency.

Only one wipe may be pending. The first eligible activation stores and owns its
destination; later clicks or key activations during the 300-millisecond lock
are ignored. Teardown, `pagehide`, or an animation error immediately calls
`location.assign()` with the stored destination. The lock always clears before
or during navigation and cannot leave the page inert.

### 9. Glitch Text Shuffle

The four project names and four Chapter Index labels briefly display seeded
randomized characters before resolving to the exact readable string within
400 milliseconds. The semantic text node never changes. An `aria-hidden`
visual overlay performs the scramble, so assistive technology encounters one
stable label.

Shuffle sequences are deterministic for a given label and trigger count,
cancellable, finite, and never autoplayed in a loop.

## Effect Scope and Triggers

| Effect | Exact scope | Trigger |
| --- | --- | --- |
| Sticker Trail | Homepage Work showcase | Fine-pointer travel |
| Liquid Blob Cursor | Homepage hero and Work showcase | Fine-pointer movement |
| Horizontal Marquee | Homepage hero | Signed document scroll while the hero is near the viewport |
| Chaotic Button Burst | Primary navigation, hero actions, project links, and contact actions | Hover, focus, or tap/pointer activation |
| Infinite Image Grid | Homepage Work showcase | Mouse/pen drag, horizontal touch drag, or focused Arrow/Home keys |
| 3D Card Stack | Featured AURORA article and three secondary project cards | Hover, focus within, or pointer/tap activation without preventing a link |
| Brutalist Text Shake | Hero title and chapter display headings | Heading hover, or focus entering an existing hero/Work/Notes/Contact control |
| Color Flash Reveal | Brand, writing, article/back, footer, and other eligible same-origin page links | Ordinary click, tap, or keyboard link activation |
| Glitch Text Shuffle | Four project names and four Chapter Index labels | Hover, related focus, or tap/pointer activation |

## Project Poster System

Four local SVG background artworks will be checked in at:

- `public/images/project-posters/aurora.svg`
- `public/images/project-posters/embnode.svg`
- `public/images/project-posters/gitops.svg`
- `public/images/project-posters/syslib.svg`

The SVG files contain palette geometry only—no project names, periods, stack
labels, facts, or metrics. `ProjectPoster.astro` composes each background with
the corresponding project object from `src/data/site.ts`, ensuring factual
content has one source of truth. This composite supplies the approved project
index, name, period when available, representative stack labels, and existing
verified facts or metrics. It does not resemble a fabricated screenshot or
imply an unrecorded product state.

The same four stable public URLs and Astro-generated poster templates are
reused by the sticker trail, infinite grid, and card stacks. SVGs include
intrinsic dimensions; composites reserve a deterministic aspect ratio to
prevent layout shift. Ordinary and Sites tests assert the same
`/images/project-posters/*.svg` paths.

## Component Architecture

### Astro components

- `src/components/effects/MotionLayer.astro`
  renders the fixed blob, particle, and wipe layers once from `Base.astro`.
  When the homepage opts into kinetic mode, it also renders the sticker pool
  and project-poster templates used by recycled visual pools.
- `src/components/effects/KineticMarquee.astro`
  renders the semantic and visual hero marquee inside `Hero.astro`.
- `src/components/effects/InfiniteProjectGrid.astro`
  renders the grid's static fallback, fixed tile pool, and interaction surface
  inside `Projects.astro`.
- `src/components/effects/CardStack.astro`
  renders the decorative stack within the featured project markup and each
  existing `ProjectCard.astro`.
- `src/components/effects/ProjectPoster.astro`
  centralizes poster URLs, aspect ratios, and factual labels used by the Astro
  components.

Adding effects inside existing components preserves the exact homepage
top-level order and current project article count.

`Base.astro` renders the fixed shell and one deferred module on every route so
the navigation wipe is available consistently. The homepage opts into poster
templates and kinetic markers through an explicit Base prop. Hero, pointer,
grid, card, and text controllers mount only when those homepage markers exist.
Writing pages download the same cacheable module, capped by the global
25-KiB-gzip budget, but request no poster backgrounds and run only the
event-driven navigation controller. They incur no continuous frame or timer
work.

### Styling

`src/styles/motion.css` contains effect layers, static fallbacks, breakpoint
behavior, feature queries, forced-colors rules, and reduced-motion rules.
It uses the current token system and does not redefine the portfolio palette.

Global motion layers use `pointer-events: none` and remain below
`z-index: 50`. Local interactive surfaces retain their normal stacking and
focus outlines. The document must not gain horizontal overflow.

### Runtime modules

One deferred Astro-bundled module initializes dependency-free controllers:

- `src/scripts/motion/index.mjs` — idempotent orchestration and policy changes;
- `scheduler.mjs` — the only requestAnimationFrame owner;
- `policy.mjs` — fine/coarse pointer, reduced motion, visibility, and support;
- `pointer-effects.mjs` — blobs, sticker trail, and link bursts;
- `marquee.mjs` — scroll velocity and track positioning;
- `grid.mjs` — pointer ownership, wrapping, inertia, and seam bounce;
- `card-stack.mjs` — hover, focus, and tap state;
- `text-effects.mjs` — shake and deterministic character shuffle;
- `navigation-wipe.mjs` — link eligibility and safe wipe navigation.

These module boundaries are the implementation contract. Browser bundling may
combine them into one emitted asset, but source responsibilities remain
separate and the scheduler remains the only frame owner.

## Runtime Interfaces and Data Flow

Astro renders stable HTML with `data-motion-*` markers. JavaScript queries
those markers, then registers only controllers whose required elements and
platform features exist.

Event handlers only:

1. validate the event and ownership;
2. update small controller state;
3. request work from the shared scheduler.

The scheduler receives one browser timestamp, calculates capped elapsed time,
asks active controllers to advance, then performs bounded transform, opacity,
or CSS-variable writes. A controller returns whether it needs another frame.
When none do, the scheduler stops.

Each controller exposes the conceptual interface:

```text
mount(context) -> controller
controller.update(timestamp) -> needsAnotherFrame
controller.setPolicy(policy)
controller.destroy()
```

The shared context supplies the scheduler, clock, media policy, observer
factory, and seeded random source. Tests inject deterministic replacements.
Controllers do not call `requestAnimationFrame`, `setInterval`, or global
randomness directly.

An `IntersectionObserver` gates controllers tied to the hero and Work section.
When unavailable, controllers use conservative event-driven behavior and still
stop while idle.

### Coordination and ownership

One shared interaction owner prevents showcase effects from competing:

1. reduced motion, hidden-page suspension, and a navigation wipe preempt every
   other motion controller;
2. an active grid drag suspends blobs, sticker spawning, card fans, bursts,
   shake, and shuffle until pointer ownership ends;
3. outside a drag, one local foreground interaction owns the current target:
   link burst, text shuffle, card fan, or heading shake; the closest marked
   target wins and new sticker spawning pauses while it is active;
4. the blob background and scroll-reactive marquee may coexist with that one
   local foreground interaction.

At most three controllers animate in one frame: blob background, marquee, and
one foreground effect. Pointer blobs and any particles already decaying are
batched by `pointer-effects.mjs` as one scheduler client. A card may remain in
its final fanned CSS state while its link owns a burst, but it does not run a
second animation. Re-triggering a foreground target cancels and replaces that
target's previous transient state; it never accumulates independent loops.

## Lifecycle and Failure Isolation

Initialization is idempotent and records mounted roots in a `WeakMap`. An
`AbortController` owns listeners for each mount. Teardown:

- aborts event listeners;
- disconnects observers;
- releases or abandons pointer ownership safely;
- cancels transient particles and navigation timers;
- unregisters controllers from the scheduler;
- removes active `will-change` hints;
- restores stable classes and CSS variables.

`visibilitychange` to hidden and `pagehide` suspend work. Visibility restoration
resets timing before motion can resume, preventing a large physics jump.
`pageshow` calls the idempotent initializer, which mounts only when the root is
not already mounted.

A live change to `prefers-reduced-motion: reduce` synchronously requests static
states and guarantees no pending frame, timer, inertia, or transient node after
the next rendered frame.

Controller mounting is isolated with guarded setup. A missing node, unsupported
API, or controller exception disables only that effect. Core content,
navigation, and the remaining effects continue to work.

## Accessibility and Input Contract

- JavaScript-off HTML remains complete and usable.
- The native cursor stays visible.
- Decorative layers are `aria-hidden`, non-focusable, and noninteractive.
- Semantic text is never mutated to create a visual effect.
- No factual metadata or control is hover-only.
- Existing focusable elements retain their relative tab order, accessible
  names, hrefs, native `<details>` behavior, and 44-pixel critical targets.
- The server-rendered grid surface is static and nonfocusable. Only after its
  controller mounts successfully does JavaScript add `tabindex="0"`,
  `role="region"`, a concise label, and keyboard instructions. This creates
  exactly one focus stop at the grid's visual position and cannot become a dead
  control when JavaScript is unavailable.
- The enhanced grid surface does not duplicate project links or metadata.
- Focus-visible outlines remain unobscured throughout effects.
- Other keyboard and touch equivalents reuse existing controls and create no
  additional focus stops beyond the single enhanced grid surface.
- Reduced motion uses complete static compositions rather than merely faster
  versions of the same motion.
- Forced-colors mode removes blend-dependent decoration while keeping text,
  controls, borders, and focus visible.

## Performance Contract

- One deferred motion bundle and no runtime dependency.
- Motion JavaScript target: at most 25 KiB gzip.
- One shared animation-frame scheduler and at most one outstanding frame.
- Zero animation frames or timers while idle, hidden, or offscreen.
- At most 24 trail stickers, eight burst particles per activation, and 16 grid
  tiles.
- Pools recycle nodes; DOM size does not grow after interaction ends.
- Frame math uses the supplied timestamp and caps elapsed time after stalls.
- Primary animation properties are transforms and opacity.
- Layout reads do not occur in the frame write phase.
- Large animated blur and backdrop filtering are excluded.
- `will-change` is temporary and removed after active interaction.
- No animation-induced cumulative layout shift.
- No horizontal document overflow at 320, 390, or 430 pixels.
- A ten-second Chrome stable performance trace on the development Mac, after
  load and with no CPU throttling, must contain no scripting task longer than
  50 milliseconds during sustained grid dragging and pointer motion. Excluding
  the first and last trace frames, the 95th-percentile active frame interval
  must be at most 25 milliseconds on a 60-Hz-or-faster display.

## Static and Progressive Fallbacks

The portfolio remains correct when any of the following are absent:

- JavaScript;
- Pointer Events or pointer capture;
- `IntersectionObserver`;
- `matchMedia`;
- 3D transforms;
- filters or blend modes;
- cross-document View Transitions;
- coalesced pointer events.

Ordinary links and static project images are the foundation. Optional APIs
improve fidelity only after feature detection. Reduced-motion and forced-color
styles are authored in CSS so they apply before JavaScript initializes.

## Testing Strategy

### Pure module tests

Dependency-free `node:test` coverage uses injected clocks, frame schedulers,
media policies, observers, and seeded random sources. It verifies:

- marquee signed velocity, reversal, clamping, decay, and idle stop;
- sticker spatial and temporal thresholds, 24-node cap, expiry, and recycling;
- burst eight-particle cap, expiry, and deterministic symbol selection;
- grid drag threshold, single-pointer ownership, wrapping, seam bounce,
  inertia, cancellation, keyboard movement, and Home reset;
- card-stack state transitions for pointer, focus, tap, and static policy;
- bounded shake timing and amplitude;
- shuffle preservation, deterministic frames, exact resolution, and
  cancellation;
- eligible and ineligible navigation classification;
- idempotent initialization and teardown;
- zero scheduled work after policy cancellation, visibility suspension, and
  destruction.

Tests target pure state transitions and small DOM adapters rather than adding
JSDOM or another runtime dependency.

### Built-site integration tests

`scripts/test-homepage.mjs` will additionally assert:

- exactly one deferred external motion module is emitted;
- all nine effect markers are present in their intended sections;
- semantic marquee and project names appear exactly as expected;
- visual duplicates and effect layers are `aria-hidden`;
- overlays are noninteractive;
- existing component order, project-card count, navigation destinations, SEO,
  content, and source DOM order remain unchanged;
- static HTML keeps the grid surface nonfocusable and contains no duplicate
  project links;
- reduced-motion and forced-colors rules exist;
- poster assets resolve from built HTML.

`scripts/test-sites-build.mjs` will discover the generated JavaScript asset and
project posters, then exercise GET and HEAD requests for them through the real
filesystem-backed Sites worker mock. Existing homepage, writing, article,
favicon, social image, CSS, résumé, query-string, and unknown-route checks
remain intact.

### Browser acceptance

The real rendered site is checked at desktop and 320, 390, and 430-pixel mobile
widths using mouse, keyboard-only navigation, and touch/coarse-pointer
emulation. Minimum browser coverage is the latest locally available stable
Chrome, Firefox, and Safari on macOS, plus iOS Safari on a real device or the
current iOS Simulator. Computed tab order and responsive visibility are browser
assertions, not regex-based Node assertions. Acceptance requires:

- each of the nine named effects visibly performs its specified behavior;
- tab order, accessible names, and link destinations remain correct;
- grid dragging does not steal vertical touch scrolling;
- card metadata is available without hover;
- the native cursor and focus indicators remain visible;
- active motion stops when reduced motion is enabled live;
- hiding and restoring the page creates no physics jump;
- pointer cancellation and interrupted navigation clean up safely;
- JavaScript-disabled content and navigation remain complete;
- the accessibility tree contains one readable copy of visual text;
- no responsive overflow or animation-induced layout shift appears;
- an interaction performance trace shows no unbounded nodes, duplicate frame
  loops, or long scripting tasks.

### Verification commands

The implementation plan must run at least:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm test
ASTRO_TELEMETRY_DISABLED=1 npm run test:sites
python3 scripts/test-resume.py
git diff --check
```

It must also run the dedicated motion unit tests, inspect both build layouts,
measure the compressed motion bundle, and complete browser acceptance checks.
`scripts/test-motion-bundle.mjs` locates the single external motion asset
referenced by built HTML, compresses its exact bytes with Node's
`gzipSync(..., { level: 9 })`, and fails above 25,600 bytes. If bundling emits
an imported JavaScript chunk, the test includes its compressed size in the
same 25,600-byte total and fails the one-entry-asset integration assertion.

## Release Gate

No completion claim rests only on unit tests. Before a released version is
called complete:

1. all ordinary and Sites build checks pass from the exact commit;
2. browser acceptance passes against that commit;
3. the public deployment keeps the unchanged homepage and writing routes
   healthy;
4. the authenticated Sites preview serves the homepage, writing route,
   article, résumé, posters, CSS, and generated JavaScript successfully;
5. worker logs introduce no new asset or route 404s.

Publishing remains a distinct external action and must use the existing Sites
project, source branch, private access policy, and exact verified commit.

## Definition of Done

The work is complete only when all nine named effects are implemented and
visibly verified, every accessibility and performance invariant above holds,
the existing content and deployment contracts remain unchanged, all automated
checks pass, and both ordinary and Sites artifacts contain and serve the same
verified motion implementation.
