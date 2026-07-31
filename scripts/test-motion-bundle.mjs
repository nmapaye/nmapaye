import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { gzipSync } from 'node:zlib';

const buildRoot = path.resolve(
  process.cwd(),
  process.env.MOTION_BUILD_ROOT ?? 'dist',
);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

function externalModules(html) {
  return [...html.matchAll(
    /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["'][^"']+["'])[^>]*><\/script>/gi,
  )].map(([tag]) => tag.match(/\bsrc=["']([^"']+)["']/i)?.[1]).filter(Boolean);
}

function importedScripts(source) {
  const pattern =
    /\b(?:import|export)\s+(?:[^"'()]*?\sfrom\s*)?["']([^"']+\.js(?:\?[^"']*)?)["']|\bimport\s*\(\s*["']([^"']+\.js(?:\?[^"']*)?)["']\s*\)/g;
  return [...source.matchAll(pattern)].map((match) => match[1] ?? match[2]);
}

async function collectGraph(entry) {
  const pending = [entry];
  const graph = new Set();
  while (pending.length > 0) {
    const file = pending.pop();
    if (graph.has(file)) continue;
    graph.add(file);
    const source = await readFile(file, 'utf8');
    for (const specifier of importedScripts(source)) {
      assert.ok(
        specifier.startsWith('.'),
        `motion bundle imports non-local script ${specifier}`,
      );
      pending.push(path.resolve(
        path.dirname(file),
        specifier.replace(/[?#].*$/, ''),
      ));
    }
  }
  return graph;
}

test('every page references one shared motion entry within 25 KiB gzip', async () => {
  const files = await walk(buildRoot);
  const htmlFiles = files.filter((file) => file.endsWith('.html'));
  assert.ok(htmlFiles.length > 0, 'expected built HTML files');
  const referenced = [];
  for (const file of htmlFiles) {
    const scripts = externalModules(await readFile(file, 'utf8'));
    assert.equal(
      scripts.length,
      1,
      `${path.relative(buildRoot, file)} must reference exactly one external module`,
    );
    referenced.push(scripts[0]);
  }
  assert.equal(
    new Set(referenced).size,
    1,
    `built pages use different modules: ${[...new Set(referenced)].join(', ')}`,
  );

  const publicPath = new URL(referenced[0], 'https://build.invalid/').pathname;
  const entry = path.join(buildRoot, publicPath.replace(/^\/+/, ''));
  const graph = await collectGraph(entry);
  const allBuiltScripts = files.filter((file) => file.endsWith('.js'));
  assert.equal(
    allBuiltScripts.length,
    1,
    `expected one emitted JavaScript asset, found ${allBuiltScripts
      .map((file) => path.relative(buildRoot, file)).join(', ')}`,
  );
  assert.equal(
    graph.size,
    1,
    `motion entry emitted imported chunks: ${[...graph]
      .map((file) => path.relative(buildRoot, file)).join(', ')}`,
  );
  const compressedBytes = (
    await Promise.all(
      [...graph].map(async (file) =>
        gzipSync(await readFile(file), { level: 9 }).byteLength),
    )
  ).reduce((sum, size) => sum + size, 0);
  assert.ok(
    compressedBytes <= 25_600,
    `motion bundle graph is ${compressedBytes} gzip bytes`,
  );

  const packageJson = JSON.parse(
    await readFile(path.resolve(process.cwd(), 'package.json'), 'utf8'),
  );
  assert.deepEqual(Object.keys(packageJson.dependencies).sort(), [
    '@astrojs/sitemap',
    '@fontsource-variable/space-grotesk',
    'astro',
  ]);
});
