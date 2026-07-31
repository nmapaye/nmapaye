import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { tokenizeJavaScript } from './motion-test-lexer.mjs';

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

function staticSpecifier(tokens, start) {
  for (let index = start; index < tokens.length; index += 1) {
    if (tokens[index].value === ';') return null;
    if (tokens[index].type === 'word' && tokens[index].value === 'from') {
      return tokens[index + 1]?.type === 'string' ? tokens[index + 1].value : null;
    }
  }
  return null;
}

function importedScripts(source) {
  const tokens = tokenizeJavaScript(source);
  const scripts = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (
      token.type !== 'word' ||
      !['import', 'export'].includes(token.value) ||
      tokens[index - 1]?.value === '.'
    ) continue;
    const next = tokens[index + 1];
    if (token.value === 'import' && next?.type === 'string') {
      scripts.push(next.value);
    } else if (
      token.value === 'import' &&
      next?.value === '(' &&
      tokens[index + 2]?.type === 'string'
    ) {
      scripts.push(tokens[index + 2].value);
    } else {
      const specifier = staticSpecifier(tokens, index + 1);
      if (specifier) scripts.push(specifier);
    }
  }
  return scripts;
}

test('import parser captures minified dependencies without parsing comments or strings', () => {
  const source = `
    import{a}from"./static.js";
    export{a}from"./exported.js";
    import "./side-effect.js";
    import("./dynamic.js?cache=1#section");
    // import "./comment.js";
    const literal = 'export { a } from "./literal.js"';
  `;

  assert.deepEqual(importedScripts(source), [
    './static.js',
    './exported.js',
    './side-effect.js',
    './dynamic.js?cache=1#section',
  ]);
});

test('import parser handles templates, regexes, and escaped module specifiers', () => {
  const source = [
    'const template = `raw import "./raw.js"; ${import("./dynamic.js")}`;',
    'const ignored = /export{a}from"external.js"/;',
    'import "./chunk\\u002ejs";',
  ].join('\n');

  assert.deepEqual(importedScripts(source), [
    './dynamic.js',
    './chunk.js',
  ]);
});

test('graph strips query/hash paths and rejects minified non-local imports', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'motion-bundle-'));
  try {
    const entry = path.join(root, 'entry.js');
    const chunk = path.join(root, 'chunk.js');
    await writeFile(entry, 'import{value}from"./chunk.js?cache=1#section";export{value};');
    await writeFile(chunk, 'export const value = 1;');
    assert.deepEqual([...await collectGraph(entry, root)].sort(), [chunk, entry].sort());

    await writeFile(entry, 'import{value}from"external-package.js";export{value};');
    await assert.rejects(
      collectGraph(entry, root),
      /motion bundle imports non-local script external-package\.js/,
    );

    await writeFile(entry, 'import".package.js";');
    await assert.rejects(
      collectGraph(entry, root),
      /motion bundle imports non-local script \.package\.js/,
    );

    const build = path.join(root, 'build');
    const nested = path.join(build, 'nested');
    const outside = path.join(root, 'outside.js');
    const escapingEntry = path.join(nested, 'entry.js');
    await mkdir(nested, { recursive: true });
    await writeFile(outside, 'export const escaped = true;');
    await writeFile(escapingEntry, 'import"../../outside.js";');
    await assert.rejects(
      collectGraph(escapingEntry, build),
      /motion bundle local import escapes build root \.\.\/\.\.\/outside\.js/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function isInside(root, candidate) {
  const pathFromRoot = path.relative(root, candidate);
  return (
    pathFromRoot === '' ||
    (!pathFromRoot.startsWith(`..${path.sep}`) &&
      pathFromRoot !== '..' &&
      !path.isAbsolute(pathFromRoot))
  );
}

async function collectGraph(entry, root = buildRoot) {
  const absoluteRoot = path.resolve(root);
  const pending = [entry];
  const graph = new Set();
  while (pending.length > 0) {
    const file = pending.pop();
    if (graph.has(file)) continue;
    assert.ok(isInside(absoluteRoot, file), `motion bundle entry escapes build root ${file}`);
    graph.add(file);
    const source = await readFile(file, 'utf8');
    for (const specifier of importedScripts(source)) {
      assert.ok(
        specifier.startsWith('./') || specifier.startsWith('../'),
        `motion bundle imports non-local script ${specifier}`,
      );
      const dependency = path.resolve(
        path.dirname(file),
        specifier.replace(/[?#].*$/, ''),
      );
      assert.ok(
        isInside(absoluteRoot, dependency),
        `motion bundle local import escapes build root ${specifier}`,
      );
      pending.push(dependency);
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
