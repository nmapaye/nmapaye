# Website design standard

Preserve the existing visual identity of nmapaye.com. Read [docs/design-system.md](docs/design-system.md) before changing styles or interactions.

Use the neobrutalism reference for selective component details. Keep the original Space Grotesk and condensed display typography, oversized headings, yellow/green/red section colors, photo placement, page structure, and project presentation unless the user explicitly requests a redesign.

Keep the native cursor. Do not restore the large cursor-following blobs or their blend layer. Preserve the other existing effects, including the marquee, project grid, card stacks, text effects, stickers, bursts, and navigation transitions, with their reduced-motion and accessibility behavior.

Use the component tokens in `src/styles/tokens.css` for button shadows and pressed states, 5px component corners, and badge borders. Apply card shadows only to standalone About and writing cards, never to connected homepage panels or section edges.

Preserve factual copy, public URLs, metadata, structured data, résumé assets, announcement behavior, and menu behavior. Run `npm test` and `npm run test:release-layouts`, then inspect desktop and mobile layouts. Do not publish unless requested.
