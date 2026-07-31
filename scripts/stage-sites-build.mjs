import { createHash } from 'node:crypto';
import { copyFile, cp, mkdir, mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const distributionRoot = resolve(projectRoot, 'dist');
const workerSource = resolve(projectRoot, 'deployment/sites-worker.mjs');

async function describeFiles(root, currentPath = '') {
  const files = new Map();
  const directory = resolve(root, currentPath);
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = join(directory, entry.name);
    const entryRelativePath = join(currentPath, entry.name);

    if (entry.isDirectory()) {
      for (const [nestedPath, description] of await describeFiles(root, entryRelativePath)) {
        files.set(nestedPath, description);
      }
      continue;
    }

    if (!entry.isFile()) {
      throw new Error(`Cannot stage non-file build entry: ${relative(root, entryPath)}`);
    }

    const contents = await readFile(entryPath);
    files.set(entryRelativePath, {
      size: (await stat(entryPath)).size,
      hash: createHash('sha256').update(contents).digest('hex'),
    });
  }

  return files;
}

async function verifyClientMatchesBuild(buildRoot, clientRoot) {
  const [buildFiles, clientFiles] = await Promise.all([
    describeFiles(buildRoot),
    describeFiles(clientRoot),
  ]);
  const mismatches = [];

  for (const [filePath, buildFile] of buildFiles) {
    const clientFile = clientFiles.get(filePath);
    if (!clientFile) {
      mismatches.push(`${filePath}: missing from dist/client`);
      continue;
    }
    if (clientFile.size !== buildFile.size) {
      mismatches.push(`${filePath}: byte size differs`);
      continue;
    }
    if (clientFile.hash !== buildFile.hash) {
      mismatches.push(`${filePath}: SHA-256 hash differs`);
    }
  }

  for (const filePath of clientFiles.keys()) {
    if (!buildFiles.has(filePath)) {
      mismatches.push(`${filePath}: unexpected file in dist/client`);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Staged client build does not match Astro output:\n${mismatches.join('\n')}`);
  }
}

let temporaryDirectory;
try {
  temporaryDirectory = await mkdtemp(join(tmpdir(), 'nmapaye-sites-build-'));
  const savedBuildRoot = join(temporaryDirectory, 'astro-build');
  await cp(distributionRoot, savedBuildRoot, { recursive: true });

  await rm(distributionRoot, { recursive: true, force: true });
  await mkdir(distributionRoot, { recursive: true });

  const clientRoot = join(distributionRoot, 'client');
  await cp(savedBuildRoot, clientRoot, { recursive: true });

  const stagedWorker = join(distributionRoot, 'server/index.js');
  await mkdir(dirname(stagedWorker), { recursive: true });
  await copyFile(workerSource, stagedWorker);

  await verifyClientMatchesBuild(savedBuildRoot, clientRoot);
} finally {
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
