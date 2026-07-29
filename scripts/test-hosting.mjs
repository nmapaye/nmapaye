import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../deployment/sites-worker.mjs';

test('Sites worker resolves Astro directory routes to their index files', async () => {
  const requestedPaths = [];

  for (const { path, method = 'GET' } of [
    { path: '/' },
    { path: '/writing/' },
    { path: '/writing' },
    {
      path: '/writing/aurora-private-caffeine-tracking?ref=portfolio',
      method: 'HEAD',
    },
  ]) {
    await worker.fetch(new Request(`https://portfolio.example${path}`, { method }), {
      ASSETS: {
        fetch(input) {
          const url = new URL(input.url);
          requestedPaths.push(`${url.pathname}${url.search}`);
          return new Response('ok', { status: 200 });
        },
      },
    });
  }

  assert.deepEqual(requestedPaths, [
    '/index.html',
    '/writing/index.html',
    '/writing/index.html',
    '/writing/aurora-private-caffeine-tracking/index.html?ref=portfolio',
  ]);
});

test('Sites worker delegates direct asset requests unchanged', async () => {
  const request = new Request('https://portfolio.example/_astro/index.css');
  const expected = new Response('ok', { status: 200 });
  let received;

  const response = await worker.fetch(request, {
    ASSETS: {
      fetch(input) {
        received = input;
        return expected;
      },
    },
  });

  assert.equal(received, request);
  assert.equal(response, expected);
});
