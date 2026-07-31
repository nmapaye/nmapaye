import assert from 'node:assert/strict';
import { access, readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const distributionRoot = fileURLToPath(new URL('../dist/', import.meta.url));
const clientRoot = resolve(distributionRoot, 'client');
const workerPath = resolve(distributionRoot, 'server/index.js');

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function assertStagedLayout() {
  assert.equal(
    await pathExists(resolve(clientRoot, 'index.html')),
    true,
    'Sites distribution must contain dist/client/index.html',
  );
  assert.equal(
    await pathExists(workerPath),
    true,
    'Sites distribution must contain dist/server/index.js',
  );
  assert.equal(
    await pathExists(resolve(distributionRoot, 'index.html')),
    false,
    'Sites distribution must not retain dist/index.html',
  );
}

function isInside(root, path) {
  const pathFromRoot = relative(root, path);
  return (
    pathFromRoot === '' ||
    (!pathFromRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) &&
      pathFromRoot !== '..' &&
      !isAbsolute(pathFromRoot))
  );
}

async function createFilesystemAssets(root) {
  const realRoot = await realpath(root);

  return {
    async fetch(input) {
      const request = input instanceof Request ? input : new Request(input);
      const url = new URL(request.url);
      let decodedPathname;

      try {
        decodedPathname = decodeURIComponent(url.pathname);
      } catch {
        return new Response('Bad Request', { status: 400 });
      }

      if (decodedPathname.split('/').some((segment) => segment === '.' || segment === '..')) {
        return new Response('Forbidden', { status: 403 });
      }

      const requestedPath = resolve(realRoot, `.${decodedPathname}`);
      if (!isInside(realRoot, requestedPath)) {
        return new Response('Forbidden', { status: 403 });
      }

      let realRequestedPath;
      try {
        realRequestedPath = await realpath(requestedPath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          return new Response('Not Found', { status: 404 });
        }
        throw error;
      }

      if (!isInside(realRoot, realRequestedPath) || !(await stat(realRequestedPath)).isFile()) {
        return new Response('Not Found', { status: 404 });
      }

      const body = request.method === 'HEAD' ? null : await readFile(realRequestedPath);
      return new Response(body, { status: 200 });
    },
  };
}

async function getStagedWorker() {
  await assertStagedLayout();
  const module = await import(pathToFileURL(workerPath).href);
  return module.default;
}

async function assertAvailable(worker, assets, path) {
  for (const method of ['GET', 'HEAD']) {
    const response = await worker.fetch(
      new Request(`https://portfolio.example${path}`, { method }),
      { ASSETS: assets },
    );

    assert.equal(response.status, 200, `${method} ${path} must resolve from staged assets`);
    if (method === 'GET') {
      assert.ok((await response.arrayBuffer()).byteLength > 0, `GET ${path} must return its asset`);
    } else {
      assert.equal(response.body, null, `HEAD ${path} must not return a body`);
    }
  }
}

test('the staged Sites distribution serves real Astro pages and assets', async () => {
  const worker = await getStagedWorker();
  const assets = await createFilesystemAssets(clientRoot);

  const homepage = await worker.fetch(new Request('https://portfolio.example/'), { ASSETS: assets });
  const homepageHtml = await homepage.text();
  const cssPath = homepageHtml.match(/<link rel="stylesheet" href="([^"]+\.css)">/)?.[1];
  const moduleTag = homepageHtml.match(
    /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc=")[^>]*>/,
  )?.[0];
  const modulePath = moduleTag?.match(/\bsrc="([^"]+)"/)?.[1];
  assert.ok(cssPath, 'homepage must reference a generated CSS asset');
  assert.ok(modulePath, 'homepage must reference the generated motion module');

  const [writingHtml, articleHtml] = await Promise.all([
    readFile(resolve(clientRoot, 'writing/index.html'), 'utf8'),
    readFile(resolve(clientRoot, 'writing/aurora-private-caffeine-tracking/index.html'), 'utf8'),
  ]);
  for (const writing of [writingHtml, articleHtml]) {
    const writingModule = writing.match(
      /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc=")[^>]*>/,
    )?.[0]?.match(/\bsrc="([^"]+)"/)?.[1];
    assert.equal(writingModule, modulePath);
    assert.doesNotMatch(writing, /project-posters/);
    assert.match(writing, /data-motion-kinetic="false"/);
  }

  for (const path of [
    '/',
    '/index.html',
    '/writing/',
    '/writing/aurora-private-caffeine-tracking/',
    '/writing/aurora-private-caffeine-tracking/?ref=portfolio',
    modulePath,
    cssPath,
    '/images/project-posters/aurora.svg',
    '/images/project-posters/embnode.svg',
    '/images/project-posters/gitops.svg',
    '/images/project-posters/syslib.svg',
    '/favicon.ico',
    '/favicon-32.png',
    '/favicon-master.png',
    '/apple-touch-icon.png',
    '/og.png',
    '/resume.pdf',
  ]) {
    await assertAvailable(worker, assets, path);
  }
});

test('the staged worker preserves directory-route query strings and returns 404 for unknown routes', async () => {
  const worker = await getStagedWorker();
  const requests = [];
  const assets = await createFilesystemAssets(clientRoot);
  const recordingAssets = {
    async fetch(input) {
      const request = input instanceof Request ? input : new Request(input);
      const url = new URL(request.url);
      requests.push(`${url.pathname}${url.search}`);
      return assets.fetch(request);
    },
  };

  const queryPath = '/writing/aurora-private-caffeine-tracking?ref=portfolio&source=sites';
  await assertAvailable(worker, recordingAssets, queryPath);
  assert.deepEqual(requests, [
    '/writing/aurora-private-caffeine-tracking/index.html?ref=portfolio&source=sites',
    '/writing/aurora-private-caffeine-tracking/index.html?ref=portfolio&source=sites',
  ]);

  const unknownRoute = await worker.fetch(
    new Request('https://portfolio.example/not-a-real-page'),
    { ASSETS: recordingAssets },
  );
  assert.equal(unknownRoute.status, 404);
});
