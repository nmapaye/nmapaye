import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const canonicalUrl = 'https://nmapaye.com/';
const outputRoot = new URL('../dist/', import.meta.url);
const articleUrl =
  'https://nmapaye.com/writing/aurora-private-caffeine-tracking/';
const approvedProfiles = [
  'https://www.linkedin.com/in/nmapaye',
  'https://github.com/nmapaye',
];

async function readOutput(path) {
  return readFile(new URL(`../dist/${path}`, import.meta.url), 'utf8');
}

function getJsonLdDocuments(html) {
  return [...html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )].map((match) => JSON.parse(match[1]));
}

function getGraphNode(documents, type) {
  return documents
    .flatMap((document) => document['@graph'] ?? [document])
    .find((node) => node['@type'] === type);
}

async function getHtmlFiles(directory = outputRoot) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);

    if (entry.isDirectory()) {
      files.push(...(await getHtmlFiles(entryUrl)));
    } else if (entry.name.endsWith('.html')) {
      files.push(entryUrl);
    }
  }

  return files;
}

test('homepage publishes one canonical professional identity', async () => {
  const html = await readOutput('index.html');
  const documents = getJsonLdDocuments(html);
  const profilePage = getGraphNode(documents, 'ProfilePage');
  const person = getGraphNode(documents, 'Person');

  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/nmapaye\.com\/">/,
    'homepage must use the nmapaye.com canonical URL',
  );
  assert.match(
    html,
    /<meta property="og:url" content="https:\/\/nmapaye\.com\/">/,
    'Open Graph URL must match the canonical URL',
  );
  assert.ok(profilePage, 'homepage must publish a ProfilePage JSON-LD node');
  assert.ok(person, 'homepage must publish a Person JSON-LD node');
  assert.equal(profilePage['@id'], `${canonicalUrl}#profile`);
  assert.deepEqual(profilePage.mainEntity, { '@id': `${canonicalUrl}#person` });
  assert.equal(person['@id'], `${canonicalUrl}#person`);
  assert.equal(person.name, 'Nathaniel Mapaye');
  assert.equal(person.alternateName, 'Nathaniel Fransiscus Mapaye');
  assert.equal(person.jobTitle, 'Software Engineer');
  assert.deepEqual(person.sameAs, approvedProfiles);
});

test('all public pages omit private and legacy identity details', async () => {
  const htmlFiles = await getHtmlFiles();

  assert.ok(htmlFiles.length > 0, 'expected generated HTML files');

  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    const message = `unexpected private or legacy detail in ${file.pathname}`;

    assert.doesNotMatch(
      html,
      /(?:\+?1[\s.-]*)?(?:\(\d{3}\)|\d{3})[\s.-]+\d{3}[\s.-]+\d{4}/,
      message,
    );
    assert.doesNotMatch(html, /\bGPA\b/i, message);
    assert.doesNotMatch(
      html,
      /https:\/\/nmapaye\.github\.io\/nmapaye(?:\/|["'])/i,
      message,
    );
    assert.doesNotMatch(
      html,
      /"(?:birthDate|telephone|streetAddress)"\s*:/i,
      message,
    );
  }
});

test('homepage describes AURORA using its current on-device implementation', async () => {
  const html = await readOutput('index.html');

  assert.match(html, /optional, read-only Apple Health sleep import/i);
  assert.match(html, /MMKV/);
  assert.doesNotMatch(html, /SQLite/);
});

test('crawler discovery files point at the canonical domain', async () => {
  const [robots, sitemap] = await Promise.all([
    readOutput('robots.txt'),
    readOutput('sitemap-index.xml'),
  ]);

  assert.match(robots, /^User-agent: \*\nAllow: \/\n/m);
  assert.match(robots, /Sitemap: https:\/\/nmapaye\.com\/sitemap-index\.xml/);
  assert.match(sitemap, /https:\/\/nmapaye\.com\/sitemap-0\.xml/);
});

test('writing index publishes the AURORA case study', async () => {
  const html = await readOutput('writing/index.html');

  assert.match(
    html,
    /href="\/writing\/aurora-private-caffeine-tracking\/?"/,
    'writing index must link to the AURORA case study',
  );
  assert.match(html, /Building AURORA: Private Caffeine, Sleep, and Alertness Tracking/);
});

test('AURORA case study publishes grounded BlogPosting authorship', async () => {
  const html = await readOutput(
    'writing/aurora-private-caffeine-tracking/index.html',
  );
  const documents = getJsonLdDocuments(html);
  const article = getGraphNode(documents, 'BlogPosting');

  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/nmapaye\.com\/writing\/aurora-private-caffeine-tracking\/">/,
  );
  assert.ok(article, 'case study must publish a BlogPosting JSON-LD node');
  assert.equal(article['@id'], `${articleUrl}#article`);
  assert.equal(
    article.headline,
    'Building AURORA: Private Caffeine, Sleep, and Alertness Tracking',
  );
  assert.equal(article.datePublished, '2026-07-27T00:00:00.000Z');
  assert.equal(article.dateModified, '2026-07-27T00:00:00.000Z');
  assert.equal(article.image, `${canonicalUrl}profile.jpg`);
  assert.deepEqual(article.author, {
    '@type': 'Person',
    '@id': `${canonicalUrl}#person`,
    name: 'Nathaniel Mapaye',
    url: canonicalUrl,
  });
  assert.equal(article.mainEntityOfPage, articleUrl);
  assert.match(
    html,
    />\s*By\s*<a[^>]+rel="author"[^>]*>Nathaniel Mapaye<\/a>/,
  );
  assert.match(html, /HealthKit access is optional and read-only/);
  assert.match(html, /MMKV/);
  assert.doesNotMatch(html, /SQLite/);
});

test('sitemap includes the writing index and AURORA case study', async () => {
  const sitemap = await readOutput('sitemap-0.xml');

  assert.match(sitemap, /https:\/\/nmapaye\.com\/writing\/<\/loc>/);
  assert.match(
    sitemap,
    /https:\/\/nmapaye\.com\/writing\/aurora-private-caffeine-tracking\/<\/loc>/,
  );
});
