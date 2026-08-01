# Sites synchronization release-preparation handoff

Date: 2026-08-02 (Asia/Jakarta)

Base: `main` at `c586a2f2348a9763074de59c99b91b77440f1f5d`

Branch: `nmapaye-bot/sites-sync-release-prep`

Implementation commit: `a8caf27` (`ci: verify Sites and Pages release layouts`)

## Outcome

GitHub Actions now runs a real release-layout gate before uploading the Pages
artifact. The gate builds ordinary Astro output, tests and stages the real Sites
distribution, compares every static file by relative path, byte size, and
SHA-256 hash, inspects a packaged Sites archive, and rebuilds ordinary Astro
output in a `finally` path before Pages upload.

No portfolio content, résumé data, SEO, dependency, access-policy, domain,
runtime behavior, or visual source changed. Nothing was pushed, merged,
deployed, published, or written to the Sites project.

## Protected contracts

- GitHub Pages keeps public files at `dist/**`, including `dist/index.html`,
  writing routes, generated assets, icons, the social image, and the résumé.
- Pages output rejects Sites-only `dist/client`, `dist/server`, and
  `dist/.openai` entries.
- Sites staging contains only `dist/client/**` and `dist/server/index.js`.
- A Sites archive adds `dist/.openai/hosting.json` while retaining no misplaced
  root-level static output.
- The complete Pages inventory must exactly match the Sites client inventory.
- CI restores and rechecks ordinary Pages output even if Sites verification
  fails.

The verified build contains 40 static files. The Pages build, staged Sites
client, and archive client matched exactly across all 40 files. The inventory
includes the homepage, writing index, AURORA article, résumé, generated CSS and
JavaScript, 17 optimized WebP images, project posters, favicon family, social
image, crawler files, and sitemap.

## Regression evidence

- The first unit-test run failed because the release-layout verifier did not
  exist.
- The first integration run failed because child Astro builds did not default
  telemetry off in a restricted workspace.
- The verifier now supplies that default and the complete integration path
  passes.
- Four focused tests reject leaked layout directories, missing hosting
  metadata, misplaced archive files, and missing, additional, resized, or
  hash-changed static assets.

## Verification results

| Command | Result |
| --- | --- |
| `ASTRO_TELEMETRY_DISABLED=1 npm test` | 119 motion tests and 57 build/SEO/hosting/release-layout tests passed. |
| `ASTRO_TELEMETRY_DISABLED=1 npm run test:sites` | 12 staged-worker and built-bundle tests passed. |
| `PIP_DISABLE_PIP_VERSION_CHECK=1 ../../.venv/bin/python scripts/test-resume.py` | 2 tests passed. |
| `SITES_PACKAGE_HELPER=/Users/nmapaye/.codex/plugins/cache/openai-bundled/sites/0.1.33/scripts/package-site.sh npm run test:release-layouts` | Official Sites helper archive passed; 40 static files matched exactly; ordinary Pages output was restored. |
| `ASTRO_TELEMETRY_DISABLED=1 npm run build` | 3 pages built successfully. |
| `git diff --check` | Passed. |
| Ordinary output inspection | 40 files; `dist/client`, `dist/server`, and `dist/.openai` absent. |

## Required release gate

Current-iOS Safari remains the only explicit release blocker. Before merging or
publishing, use a real current iPhone or a current installed iOS Simulator to
smoke-test:

- `/`
- `/#work`
- `/#experience`
- `/#notes`
- `/#contact`
- `/writing/`
- `/writing/aurora-private-caffeine-tracking/`
- `/resume.pdf`

Check anchor landing beneath the sticky header, mobile-menu closure and focus,
scrolling, touch interactions, card/effect cleanup, back/forward restoration,
zoom, and absence of horizontal overflow. Chromium device emulation is not a
substitute.

## Final synchronization sequence

After the iOS gate passes and the integration choice is approved:

1. Refresh the remote base and confirm whether `main` moved:

   ```sh
   git fetch origin main
   git rev-parse origin/main
   git merge-base --is-ancestor origin/main nmapaye-bot/sites-sync-release-prep
   ```

2. If `main` moved, rebase the feature branch onto the new `origin/main`, then
   rerun every verification command below. Do not deploy an archive built from
   an earlier commit.

3. Validate the exact final commit:

   ```sh
   ASTRO_TELEMETRY_DISABLED=1 npm test
   ASTRO_TELEMETRY_DISABLED=1 npm run test:sites
   PIP_DISABLE_PIP_VERSION_CHECK=1 ../../.venv/bin/python scripts/test-resume.py
   SITES_PACKAGE_HELPER=/Users/nmapaye/.codex/plugins/cache/openai-bundled/sites/0.1.33/scripts/package-site.sh npm run test:release-layouts
   ASTRO_TELEMETRY_DISABLED=1 npm run build
   git diff --check
   git status --short
   git rev-parse HEAD
   ```

4. Integrate and push only after explicit approval. Wait for the `Deploy to
   GitHub Pages` workflow and require terminal success for the pushed `main`
   commit:

   ```sh
   gh run list --branch main --workflow deploy.yml --limit 1
   gh run watch RUN_ID --exit-status
   ```

5. Recheck the public homepage, writing index, AURORA article, and résumé. Stop
   before Sites deployment if Pages fails or differs from the approved design.

6. In an authorized Sites release session, obtain a fresh short-lived source
   credential without persisting it. Push the exact final commit to the
   configured Sites source branch, build with `npm run build:sites`, package
   with the current official Sites helper, save one new version using that exact
   commit SHA, deploy it privately, and poll to terminal success.

7. Perform an authenticated Sites smoke check of the homepage, writing index,
   AURORA article, résumé, and one generated asset. Confirm new worker logs show
   200 responses with no new 404s.

Do not change the existing owner-only access policy during synchronization.
