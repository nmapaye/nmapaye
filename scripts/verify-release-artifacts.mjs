import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertMatchingStaticInventories,
  assertPagesLayout,
  assertSitesArchiveLayout,
  assertSitesLayout,
} from './release-layouts.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distributionRoot = resolve(projectRoot, 'dist');

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: process.env.ASTRO_TELEMETRY_DISABLED ?? '1',
      },
      stdio: 'inherit',
      ...options,
    });

    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      rejectRun(
        new Error(
          `${command} ${args.join(' ')} failed${signal ? ` with signal ${signal}` : ` with exit ${code}`}`,
        ),
      );
    });
  });
}

async function createContractArchive(archivePath, stagingRoot) {
  const packagedDist = join(stagingRoot, 'dist');
  await cp(distributionRoot, packagedDist, { recursive: true });
  await mkdir(join(packagedDist, '.openai'), { recursive: true });
  await cp(
    resolve(projectRoot, '.openai/hosting.json'),
    join(packagedDist, '.openai/hosting.json'),
  );
  await mkdir(dirname(archivePath), { recursive: true });
  await run('tar', ['-C', stagingRoot, '-czf', archivePath, 'dist']);
}

async function createSitesArchive(archivePath, stagingRoot) {
  const officialHelper = process.env.SITES_PACKAGE_HELPER;
  if (officialHelper) {
    await run('bash', [officialHelper, projectRoot, archivePath]);
    return 'official Sites helper';
  }

  await createContractArchive(archivePath, stagingRoot);
  return 'CI contract packager';
}

let temporaryRoot;
let pagesInventory;
let verificationError;

try {
  temporaryRoot = await mkdtemp(join(tmpdir(), 'nmapaye-release-layouts-'));

  await run('npm', ['run', 'build']);
  pagesInventory = await assertPagesLayout(distributionRoot);

  await run('npm', ['run', 'test:sites']);
  const sitesInventory = await assertSitesLayout(distributionRoot);
  assertMatchingStaticInventories(pagesInventory, sitesInventory);

  const archivePath = join(temporaryRoot, 'archives', 'nmapaye-sites.tar.gz');
  const stagingRoot = join(temporaryRoot, 'package');
  const packager = await createSitesArchive(archivePath, stagingRoot);
  const extractedRoot = join(temporaryRoot, 'extracted');
  await mkdir(extractedRoot, { recursive: true });
  await run('tar', ['-C', extractedRoot, '-xzf', archivePath]);

  const archiveInventory = await assertSitesArchiveLayout(join(extractedRoot, 'dist'));
  assertMatchingStaticInventories(pagesInventory, archiveInventory, 'Sites archive client');

  console.log(
    `Verified ${pagesInventory.size} identical static files across Pages, Sites client, and the ${packager} archive.`,
  );
} catch (error) {
  verificationError = error;
} finally {
  try {
    await run('npm', ['run', 'build']);
    const restoredPagesInventory = await assertPagesLayout(distributionRoot);
    if (pagesInventory) {
      assertMatchingStaticInventories(
        pagesInventory,
        restoredPagesInventory,
        'restored Pages build',
      );
    }
    console.log('Restored and verified the ordinary GitHub Pages distribution.');
  } catch (restoreError) {
    verificationError = verificationError
      ? new AggregateError(
          [verificationError, restoreError],
          'Release verification and restoration failed',
        )
      : restoreError;
  }

  if (temporaryRoot) {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

if (verificationError) {
  throw verificationError;
}
