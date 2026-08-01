import { createHash } from 'node:crypto';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

const requiredStaticPaths = [
  'index.html',
  'writing/index.html',
  'writing/aurora-private-caffeine-tracking/index.html',
  'images/project-posters/aurora.svg',
  'favicon.ico',
  'favicon-32.png',
  'favicon-master.png',
  'apple-touch-icon.png',
  'og.png',
  'resume.pdf',
];

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function assertFile(path, message) {
  if (!(await pathExists(path)) || !(await stat(path)).isFile()) {
    throw new Error(message);
  }
}

export async function describeStaticFiles(root, currentPath = '') {
  const inventory = new Map();
  const directory = resolve(root, currentPath);

  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const entryPath = join(directory, entry.name);
    const entryRelativePath = join(currentPath, entry.name);

    if (entry.isDirectory()) {
      for (const [nestedPath, description] of await describeStaticFiles(root, entryRelativePath)) {
        inventory.set(nestedPath, description);
      }
      continue;
    }

    if (!entry.isFile()) {
      throw new Error(`Release layout contains non-file entry: ${relative(root, entryPath)}`);
    }

    const contents = await readFile(entryPath);
    inventory.set(entryRelativePath.split(sep).join('/'), {
      size: contents.byteLength,
      hash: createHash('sha256').update(contents).digest('hex'),
    });
  }

  return inventory;
}

async function assertStaticSurface(root) {
  const inventory = await describeStaticFiles(root);

  for (const requiredPath of requiredStaticPaths) {
    if (!inventory.has(requiredPath)) {
      throw new Error(`Static distribution must contain ${requiredPath}`);
    }
  }

  if (![...inventory.keys()].some((path) => path.startsWith('_astro/') && path.endsWith('.css'))) {
    throw new Error('Static distribution must contain a generated CSS asset');
  }
  if (![...inventory.keys()].some((path) => path.startsWith('_astro/') && path.endsWith('.js'))) {
    throw new Error('Static distribution must contain a generated JavaScript asset');
  }

  return inventory;
}

async function assertOnlyRootEntries(root, allowedEntries, label) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!allowedEntries.has(entry.name)) {
      throw new Error(`${label} contains unexpected root entry: ${entry.name}`);
    }
  }
}

export async function assertPagesLayout(distributionRoot) {
  for (const forbiddenEntry of ['client', 'server', '.openai']) {
    if (await pathExists(resolve(distributionRoot, forbiddenEntry))) {
      throw new Error(`Pages distribution must not contain ${forbiddenEntry}/`);
    }
  }

  return assertStaticSurface(distributionRoot);
}

export async function assertSitesLayout(distributionRoot) {
  await assertOnlyRootEntries(distributionRoot, new Set(['client', 'server']), 'Sites distribution');
  await assertFile(
    resolve(distributionRoot, 'server/index.js'),
    'Sites distribution must contain dist/server/index.js',
  );
  return assertStaticSurface(resolve(distributionRoot, 'client'));
}

export async function assertSitesArchiveLayout(packagedDistributionRoot) {
  await assertOnlyRootEntries(
    packagedDistributionRoot,
    new Set(['.openai', 'client', 'server']),
    'Sites archive',
  );
  await assertFile(
    resolve(packagedDistributionRoot, '.openai/hosting.json'),
    'Sites archive must contain dist/.openai/hosting.json',
  );
  await assertFile(
    resolve(packagedDistributionRoot, 'server/index.js'),
    'Sites archive must contain dist/server/index.js',
  );
  return assertStaticSurface(resolve(packagedDistributionRoot, 'client'));
}

export function assertMatchingStaticInventories(
  referenceInventory,
  candidateInventory,
  candidateLabel = 'Sites client',
) {
  const mismatches = [];

  for (const [path, referenceFile] of referenceInventory) {
    const candidateFile = candidateInventory.get(path);
    if (!candidateFile) {
      mismatches.push(`${path}: missing from ${candidateLabel}`);
      continue;
    }
    if (candidateFile.size !== referenceFile.size) {
      mismatches.push(`${path}: byte size differs`);
      continue;
    }
    if (candidateFile.hash !== referenceFile.hash) {
      mismatches.push(`${path}: SHA-256 hash differs`);
    }
  }

  for (const path of candidateInventory.keys()) {
    if (!referenceInventory.has(path)) {
      mismatches.push(`${path}: unexpected ${candidateLabel} file`);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`${candidateLabel} does not match the Pages build:\n${mismatches.join('\n')}`);
  }
}
