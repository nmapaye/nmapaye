import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const canonicalUrl = 'https://nmapaye.com/';
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

test('homepage omits private and changing personal details', async () => {
  const html = await readOutput('index.html');

  assert.doesNotMatch(html, /\(831\)|831[-.)\s]*227[-\s]*4349/i);
  assert.doesNotMatch(html, /\bGPA\b/i);
  assert.doesNotMatch(html, /"birthDate"|"telephone"|"streetAddress"/);
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
