# Deer favicon design

## Goal

Replace the current `NM` favicon with the supplied deer photograph while keeping
the deer recognizable at browser-tab size.

## Visual treatment

- Preserve the original photograph rather than redrawing or illustrating it.
- Keep the face, glasses, pink bow, and both ears visible.
- Retain the source's existing square framing because it is already tightly
  composed around those features.
- Apply only subtle contrast and sharpening needed for small-size legibility.
- Do not remove the background or alter the deer's appearance.

## Assets and integration

Create a 512 px square master and derive:

- `public/favicon-32.png`;
- `public/favicon.ico`;
- `public/apple-touch-icon.png` at 180 px.

Update the shared Astro layout to reference the PNG favicon, ICO fallback, and
Apple touch icon. Remove the old `public/favicon.svg` after the new assets are
verified.

## Verification

- Confirm every generated asset has the intended dimensions and format.
- Visually inspect the 32 px output at native size and enlarged nearest-neighbor
  scale.
- Build the site and run the SEO and résumé test suites.
- Confirm generated HTML contains the new favicon metadata and no reference to
  `favicon.svg`.
