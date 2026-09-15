# Selective styling standard

The existing visual identity of nmapaye.com is the starting point for future work. The [neobrutalism styling reference](https://www.neobrutalism.dev/styling) guides individual component details. It does not authorize replacing the site's typography, palette, page layout, photography, or effects.

## Preserve the original design

Keep Space Grotesk for body text, the existing condensed display font stack and oversized headings, and monospace labels. Keep the yellow, green, red, black, and cream palette with its existing section assignments. Retain the hero's overlapping photographic composition, section order, connected panels, project grid, card stacks, and writing layouts.

Keep existing text, assets, links, metadata, and responsive behavior. Do not convert the homepage into detached cards or substitute a new font, smaller heading system, monochromatic theme, or photo treatment without an explicit request.

## Component additions

The shared `--component-*` tokens in `src/styles/tokens.css` define these additions without changing the original section tokens:

| Detail | Token/value |
| --- | --- |
| Small corners | `--component-radius: 5px` |
| Button and badge border | `--component-border: 2px solid var(--ink)` |
| Hard shadow | `--component-shadow: 4px 4px 0 var(--ink)` |
| Pressed shadow | `--component-shadow-pressed: 2px 2px 0 var(--ink)` |

Buttons use the hard shadow at rest and move 2px toward it on hover or press, with a 120ms transition. Preserve their original colors, uppercase typography, spacing, and locations. On reduced-motion or coarse-pointer devices, retain the static shadow and disable button movement.

Technology badges use the common 2px border and 5px corners. Preserve their original labels, colors, padding, and type sizes. This includes project technology lists and the existing mobile tool badges.

Standalone About project cards, top-level About experience entries, and writing-index cards receive the hard shadow and 5px corners. Their original borders, padding, type, layout, and colors remain. Do not add rounded corners or shadows to connected homepage panels, section edges, nested list items, or the decorative project grid.

The table-tennis photo and contact portrait share the `.photo-frame` cream mat with the component border, corners, and hard shadow. Keep the table-tennis image at a maximum of 320px wide with its natural proportions, and retain the contact portrait's slight tilt. Frames sit inside the existing colored panels; the panels' connected edges stay square.

## Motion and accessibility

Remove the two large cursor-following blobs, their spring renderer, and the blending layer. Keep the native cursor and do not reintroduce another cursor overlay.

Preserve all other original effects: kinetic marquee, draggable project display, card stacks, text effects, sticker trails, bursts, and navigation wipes. Retain the scheduler, visibility policy, reduced-motion support, focus handling, mobile-menu behavior, and announcement expiry. Hero pointer movement alone must not schedule a blob animation.

Preserve visible keyboard focus, the skip link, semantic headings, decorative-image handling, and existing mobile behavior. New component details must not obscure text, controls, or scrolling.

## Verification

Run `npm test` for the original motion, content, SEO, and bundle contracts. Change assertions only when the approved component styling or blob removal changes their expected result. Keep regression coverage proving that blobs stay absent while other effects remain.

Run `npm run test:release-layouts` to check both hosting formats and restore ordinary Pages output. Inspect desktop and mobile views against the original layout, including the hero, work, experience, notes, contact, About, and writing pages. Verify pointer movement and scrolling without blobs, remaining effect behavior, focus, reduced motion, button states, badges, and standalone cards.

Keep deployment configuration unchanged and do not publish as part of a styling adjustment.
