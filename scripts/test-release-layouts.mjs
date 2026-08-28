import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import {
  assertMatchingStaticInventories,
  assertPagesLayout,
  assertSitesArchiveLayout,
  assertSitesLayout,
} from './release-layouts.mjs';

const requiredStaticFiles = {
  'index.html':
    '<link rel="stylesheet" href="/_astro/site.css"><script type="module" src="/_astro/site.js"></script>',
  'writing/index.html': '<main>Writing</main>',
  'writing/ai-olympic-offo-technohome-public-archive/index.html': '<main>Public archive</main>',
  'writing/aurora-private-caffeine-tracking/index.html': '<main>AURORA</main>',
  '_astro/site.css': 'body { color: #111; }',
  '_astro/site.js': 'export const ready = true;',
  '_astro/chunk.js': 'export const chunk = true;',
  'images/project-posters/aurora.svg': '<svg></svg>',
  'favicon.ico': 'ico',
  'favicon-32.png': 'favicon-32',
  'favicon-master.png': 'favicon-master',
  'apple-touch-icon.png': 'apple-touch',
  'og.png': 'social-image',
  'resume.pdf': '%PDF-release-layout-fixture',
};

async function createTemporaryRoot(t, prefix) {
  const root = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(root, { recursive: true }));
  return root;
}

async function writeFiles(root, files) {
  for (const [relativePath, contents] of Object.entries(files)) {
    const destination = join(root, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }
}

test('Pages layout keeps public files at dist root and rejects Sites-only directories', async (t) => {
  const pagesRoot = await createTemporaryRoot(t, 'nmapaye-pages-layout-');
  await writeFiles(pagesRoot, requiredStaticFiles);

  const inventory = await assertPagesLayout(pagesRoot);
  assert.equal(inventory.get('index.html')?.size > 0, true);
  assert.equal(inventory.has('_astro/site.css'), true);

  await writeFiles(pagesRoot, { 'client/index.html': 'misplaced' });
  await assert.rejects(
    assertPagesLayout(pagesRoot),
    /Pages distribution must not contain client/,
  );
});

test(
  'Sites layout keeps the exact public inventory in client and rejects root-level static output',
  async (t) => {
    const sitesRoot = await createTemporaryRoot(t, 'nmapaye-sites-layout-');
    await writeFiles(join(sitesRoot, 'client'), requiredStaticFiles);
    await writeFiles(sitesRoot, { 'server/index.js': 'export default {};' });

    const inventory = await assertSitesLayout(sitesRoot);
    assert.equal(inventory.has('writing/index.html'), true);

    await writeFiles(sitesRoot, { 'index.html': 'misplaced' });
    await assert.rejects(
      assertSitesLayout(sitesRoot),
      /Sites distribution contains unexpected root entry: index\.html/,
    );
  },
);

test(
  'packaged Sites layout requires hosting metadata and retains no Pages files at dist root',
  async (t) => {
    const archiveRoot = await createTemporaryRoot(t, 'nmapaye-sites-archive-');
    const packagedDist = join(archiveRoot, 'dist');
    await writeFiles(join(packagedDist, 'client'), requiredStaticFiles);
    await writeFiles(packagedDist, {
      'server/index.js': 'export default {};',
      '.openai/hosting.json': '{"project_id":"appgprj_fixture"}',
    });

    const inventory = await assertSitesArchiveLayout(packagedDist);
    assert.equal(inventory.has('resume.pdf'), true);

    await rm(join(packagedDist, '.openai/hosting.json'));
    await assert.rejects(
      assertSitesArchiveLayout(packagedDist),
      /Sites archive must contain dist\/\.openai\/hosting\.json/,
    );

    await writeFiles(packagedDist, {
      '.openai/hosting.json': '{"project_id":"appgprj_fixture"}',
      'index.html': 'misplaced',
    });
    await assert.rejects(
      assertSitesArchiveLayout(packagedDist),
      /Sites archive contains unexpected root entry: index\.html/,
    );
  },
);

test(
  'static inventory comparison detects missing, additional, and changed packaged assets',
  async (t) => {
    const pagesRoot = await createTemporaryRoot(t, 'nmapaye-pages-inventory-');
    const sitesRoot = await createTemporaryRoot(t, 'nmapaye-sites-inventory-');
    await writeFiles(pagesRoot, requiredStaticFiles);
    await writeFiles(join(sitesRoot, 'client'), requiredStaticFiles);
    await writeFiles(sitesRoot, { 'server/index.js': 'export default {};' });

    const pagesInventory = await assertPagesLayout(pagesRoot);
    const sitesInventory = await assertSitesLayout(sitesRoot);
    assert.doesNotThrow(() => assertMatchingStaticInventories(pagesInventory, sitesInventory));

    await unlink(join(sitesRoot, 'client/_astro/chunk.js'));
    const missingSitesInventory = await assertSitesLayout(sitesRoot);
    assert.throws(
      () => assertMatchingStaticInventories(pagesInventory, missingSitesInventory),
      /_astro\/chunk\.js: missing from Sites client/,
    );

    await writeFiles(join(sitesRoot, 'client'), {
      '_astro/chunk.js': requiredStaticFiles['_astro/chunk.js'],
      '_astro/extra.js': 'unexpected',
    });
    const additionalSitesInventory = await assertSitesLayout(sitesRoot);
    assert.throws(
      () => assertMatchingStaticInventories(pagesInventory, additionalSitesInventory),
      /_astro\/extra\.js: unexpected Sites client file/,
    );

    await unlink(join(sitesRoot, 'client/_astro/extra.js'));
    await writeFiles(join(sitesRoot, 'client'), { '_astro/site.css': 'changed' });
    const changedSitesInventory = await assertSitesLayout(sitesRoot);
    assert.throws(
      () => assertMatchingStaticInventories(pagesInventory, changedSitesInventory),
      /_astro\/site\.css: byte size differs|_astro\/site\.css: SHA-256 hash differs/,
    );
  },
);
