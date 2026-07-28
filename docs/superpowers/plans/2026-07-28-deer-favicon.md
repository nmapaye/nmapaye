# Deer Favicon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `NM` SVG favicon with favicon assets derived from the approved deer photograph.

**Architecture:** Keep one 512 px project master derived from the supplied photo, then produce the browser and Apple icon formats from that master. The shared Astro layout owns all favicon metadata, and the existing SEO contract test verifies the generated HTML.

**Tech Stack:** Astro 4, Node.js test runner, built-in image editing, Pillow-compatible image conversion

## Global Constraints

- Preserve the original photograph rather than redrawing or illustrating it.
- Keep the face, glasses, pink bow, and both ears visible.
- Retain the source's existing square framing.
- Apply only subtle contrast and sharpening needed for small-size legibility.
- Do not remove the background or alter the deer's appearance.
- Create a 512 px master, a 32 px PNG, a multi-size ICO, and a 180 px Apple touch icon.

---

### Task 1: Generate and integrate the deer favicon

**Files:**
- Create: `public/favicon-master.png`
- Create: `public/favicon-32.png`
- Create: `public/favicon.ico`
- Create: `public/apple-touch-icon.png`
- Modify: `src/layouts/Base.astro:30`
- Modify: `scripts/test-seo.mjs`
- Delete: `public/favicon.svg`

**Interfaces:**
- Consumes: the approved source photograph and `import.meta.env.BASE_URL`
- Produces: `/favicon.ico`, `/favicon-32.png`, and `/apple-touch-icon.png`
  references in every generated HTML page

- [ ] **Step 1: Add a failing favicon metadata test**

Append this test to `scripts/test-seo.mjs`:

```js
test('all pages publish the deer favicon assets', async () => {
  const htmlFiles = await getHtmlFiles();

  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');

    assert.match(html, /<link rel="icon" href="\/favicon\.ico" sizes="any">/);
    assert.match(
      html,
      /<link rel="icon" type="image\/png" sizes="32x32" href="\/favicon-32\.png">/,
    );
    assert.match(
      html,
      /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png">/,
    );
    assert.doesNotMatch(html, /favicon\.svg/);
  }
});
```

- [ ] **Step 2: Run the focused SEO test to verify it fails**

Run:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run test:seo
```

Expected: FAIL in `all pages publish the deer favicon assets` because generated
HTML still references `/favicon.svg`.

- [ ] **Step 3: Create the 512 px favicon master**

Use the supplied deer image as the edit target with the built-in image-editing
tool. Preserve the photograph and its framing exactly; apply only subtle
contrast and sharpening so the glasses, eyes, nose, bow, and ear silhouettes
remain legible when reduced. Copy the approved output to:

```text
public/favicon-master.png
```

Visually confirm that both ear tips, the entire glasses frame, the bow, and the
deer's nose remain inside the square.

- [ ] **Step 4: Derive the production icon files**

Use Pillow to resize the master with Lanczos filtering and subtle unsharp
masking after reduction:

```python
from pathlib import Path
from PIL import Image, ImageFilter

public = Path("public")
master = Image.open(public / "favicon-master.png").convert("RGB")
master = master.resize((512, 512), Image.Resampling.LANCZOS)
master.save(public / "favicon-master.png", optimize=True)

favicon32 = master.resize((32, 32), Image.Resampling.LANCZOS)
favicon32 = favicon32.filter(ImageFilter.UnsharpMask(radius=0.6, percent=110, threshold=2))
favicon32.save(public / "favicon-32.png", optimize=True)

apple = master.resize((180, 180), Image.Resampling.LANCZOS)
apple = apple.filter(ImageFilter.UnsharpMask(radius=0.8, percent=80, threshold=2))
apple.save(public / "apple-touch-icon.png", optimize=True)

master.save(
    public / "favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
)
```

Run `file` and a Pillow dimension check to confirm:

```text
favicon-master.png: 512x512 PNG
favicon-32.png: 32x32 PNG
apple-touch-icon.png: 180x180 PNG
favicon.ico: ICO containing 16x16, 32x32, and 48x48 frames
```

- [ ] **Step 5: Update the shared layout**

Replace the existing SVG favicon link in `src/layouts/Base.astro` with:

```astro
<link rel="icon" href={`${base}/favicon.ico`.replace(/\/+/g, '/')} sizes="any" />
<link
  rel="icon"
  type="image/png"
  sizes="32x32"
  href={`${base}/favicon-32.png`.replace(/\/+/g, '/')}
/>
<link
  rel="apple-touch-icon"
  sizes="180x180"
  href={`${base}/apple-touch-icon.png`.replace(/\/+/g, '/')}
/>
```

Delete `public/favicon.svg`.

- [ ] **Step 6: Run automated verification**

Run:

```sh
ASTRO_TELEMETRY_DISABLED=1 npm run test:seo
.venv/bin/python scripts/test-resume.py
git diff --check
```

Expected: 8 SEO tests pass, 2 résumé tests pass, and `git diff --check` produces
no output.

- [ ] **Step 7: Perform visual verification**

Inspect `public/favicon-32.png` at native resolution and on a nearest-neighbor
enlarged preview. Confirm the glasses, bow, face, and ear silhouette are
recognizable and no important feature is clipped.

- [ ] **Step 8: Commit**

```sh
git add public/favicon-master.png public/favicon-32.png public/favicon.ico \
  public/apple-touch-icon.png public/favicon.svg src/layouts/Base.astro \
  scripts/test-seo.mjs docs/superpowers/plans/2026-07-28-deer-favicon.md
git commit -m "feat: use deer photo as site favicon"
```
