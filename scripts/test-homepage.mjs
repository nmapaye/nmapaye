import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../', import.meta.url);
const outputRoot = new URL('../dist/', import.meta.url);
const homepageUrl = new URL('index.html', outputRoot);

export async function readHomepage() {
  return readFile(homepageUrl, 'utf8');
}

export async function readSource(path) {
  return readFile(new URL(path, repoRoot), 'utf8');
}

export async function readBuiltCss() {
  const assetRoot = new URL('_astro/', outputRoot);
  const entries = await readdir(assetRoot, { withFileTypes: true });
  const stylesheets = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
    .map((entry) => readFile(new URL(entry.name, assetRoot), 'utf8'));

  return (await Promise.all(stylesheets)).join('\n');
}

export function visibleText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

test('approved portfolio photos are stored locally', async () => {
  const assetPaths = [
    'src/assets/portfolio/hero-balloon.png',
    'src/assets/portfolio/experience-table-tennis.png',
    'src/assets/portfolio/contact-portrait.png',
    'src/assets/portfolio/notes-aquarium.png',
  ];

  await Promise.all(
    assetPaths.map(async (path) => {
      await assert.doesNotReject(
        access(new URL(path, repoRoot)),
        `missing approved photo asset: ${path}`,
      );
    }),
  );
});

test('built pages self-host Space Grotesk and preserve the editorial type roles', async () => {
  const [html, css] = await Promise.all([readHomepage(), readBuiltCss()]);

  assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/);
  assert.match(
    css,
    /@font-face\{[^}]*font-family:(?:"Space Grotesk Variable"|Space Grotesk Variable)[^}]*font-display:swap[^}]*font-weight:300 700[^}]*\}/,
  );
  assert.match(
    css,
    /--font-sans:\s*"Space Grotesk Variable",\s*"Space Grotesk",\s*Arial,\s*Helvetica,\s*sans-serif/,
  );
  assert.match(
    css,
    /--font-display:\s*Impact,\s*Haettenschweiler,\s*"Arial Narrow",\s*"Arial Narrow Bold",\s*sans-serif/,
  );
  assert.match(
    css,
    /--font-mono:\s*ui-monospace,\s*SFMono-Regular,\s*Menlo,\s*Consolas,\s*monospace/,
  );
  assert.match(css, /--lh-base:\s*1\.55/);
  assert.match(
    css,
    /body\{[^}]*font-family:var\(--font-sans\)[^}]*line-height:var\(--lh-base\)[^}]*letter-spacing:-\.012em/,
  );
});

test('final review contracts keep the release gate, resilient masthead, and legacy cleanup intact', async () => {
  const [workflow, readme, nav, hero, experience, notes, contact, writingIndex, tokens, global, site, html] =
    await Promise.all([
      readSource('.github/workflows/deploy.yml'),
      readSource('README.md'),
      readSource('src/components/Nav.astro'),
      readSource('src/components/Hero.astro'),
      readSource('src/components/Experience.astro'),
      readSource('src/components/Notes.astro'),
      readSource('src/components/Contact.astro'),
      readSource('src/pages/writing/index.astro'),
      readSource('src/styles/tokens.css'),
      readSource('src/styles/global.css'),
      readSource('src/data/site.ts'),
      readHomepage(),
    ]);

  assert.match(workflow, /- name: Test site\s+run: npm test/);
  assert.doesNotMatch(workflow, /run: npm run build/);
  assert.doesNotMatch(workflow, /run: npm run test:seo/);
  assert.match(workflow, /- name: Generate public résumé\s+run: python scripts\/build-resume\.py public\/resume\.pdf/);
  assert.match(workflow, /- name: Test public resume\s+run: python scripts\/test-resume\.py/);
  assert.match(workflow, /uses: actions\/upload-pages-artifact@v3[\s\S]*?path: \.\/dist/);
  assert.match(readme, /python3 scripts\/build-resume\.py public\/resume\.pdf\s+npm test\s+python3 scripts\/test-resume\.py/);

  assert.match(
    nav,
    /\.masthead__brand,\s*\.masthead__desktop a\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;[\s\S]*?display:\s*inline-flex;/,
  );
  assert.match(nav, /\.masthead__desktop\s*\{[\s\S]*?gap:\s*clamp\(0\.25rem,\s*1vw,\s*0\.75rem\);/);
  assert.match(nav, /@media \(max-width: 639px\)[\s\S]*?\.masthead__desktop\s*\{\s*display:\s*none;/);

  assert.match(tokens, /--font-display:[^;]*'Arial Narrow'/);
  assert.match(global, /\.display\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
  assert.match(hero, /@media \(max-width: 639px\)[\s\S]*?\.cover h1\s*\{[\s\S]*?clamp\(3\.25rem,\s*18vw,/);
  assert.match(experience, /@media \(max-width: 639px\)[\s\S]*?\.experience__header h2\s*\{[\s\S]*?clamp\(3rem,\s*15vw,/);
  assert.match(notes, /@media \(max-width: 639px\)[\s\S]*?\.notes__content h2\s*\{[\s\S]*?clamp\(2rem,\s*10\.5vw,/);
  assert.match(writingIndex, /@media \(max-width: 639px\)[\s\S]*?\.writing-index h1\s*\{[\s\S]*?clamp\(2rem,\s*10\.5vw,/);

  const notesImage = html.match(
    /<img\b(?=[^>]*\balt="Nathaniel Mapaye posing in front of an aquarium")[^>]*>/,
  )?.[0];
  const contactImage = html.match(
    /<img\b(?=[^>]*\balt="Portrait of Nathaniel Mapaye")[^>]*>/,
  )?.[0];

  assert.match(notesImage ?? '', /sizes="\(max-width: 959px\) 100vw, 50vw"/);
  assert.match(contactImage ?? '', /sizes="\(max-width: 639px\) 75vw, \(max-width: 959px\) 15rem, 24vw"/);

  assert.doesNotMatch(site, /export const about/);
  assert.doesNotMatch(site, /export interface SkillGroup/);
  assert.doesNotMatch(site, /export const skills/);
  assert.match(site, /href: string;\s*\/\/ in-page anchor, e\.g\. "\/#work"/);
  assert.doesNotMatch(global, /\.section(?:__title)?(?:\s|\{|:)/);
  assert.doesNotMatch(global, /\.card\s*\{/);
});

test('site data carries the approved editorial copy and factual project metrics', async () => {
  const source = await readSource('src/data/site.ts');

  assert.match(
    source,
    /Software engineer building from low-level systems to polished products\./,
  );
  assert.match(source, /label: 'Notes', href: '\/writing\/'/);
  assert.match(source, /value: 'Read-only', label: 'Apple Health access'/);
  assert.match(source, /value: '60 sec', label: 'Vigilance test'/);
  assert.match(source, /index: '01'/);
  assert.match(source, /export const featuredSkills/);
  assert.doesNotMatch(source, /0 cloud/i);
  assert.doesNotMatch(source, /proof, not prose/i);
});

test('homepage work navigation targets rendered work and includes AURORA facts', async () => {
  const homepage = await readHomepage();

  assert.match(homepage, /href="\/#work"/);
  assert.match(homepage, /<section id="work"/);
  assert.match(homepage, /Optional, read-only Apple Health sleep import/);
});

test('work chapter leads with factual AURORA metrics and keeps all projects', async () => {
  const html = await readHomepage();
  const workChapter = html.match(/<section id="work"[^>]*>([\s\S]*?)<\/section>/)?.[0];

  assert.ok(workChapter, 'homepage renders the Work chapter');

  const text = visibleText(workChapter);
  const workFeature = workChapter.match(/<article class="work-feature"[^>]*>[\s\S]*?<\/article>/)?.[0];
  const secondaryPanels = workChapter.match(/<article class="project-card"[^>]*>[\s\S]*?<\/article>/g) ?? [];
  const embNode = secondaryPanels.find((panel) => /<h3[^>]*>EmbNode<\/h3>/.test(panel));
  const gitOps = secondaryPanels.find((panel) => /<h3[^>]*>GitOps<\/h3>/.test(panel));
  const sysLib = secondaryPanels.find((panel) => /<h3[^>]*>SysLib<\/h3>/.test(panel));

  assert.equal((workChapter.match(/class="work-feature"/g) ?? []).length, 1);
  assert.equal(secondaryPanels.length, 3);
  assert.ok(workFeature, 'Work chapter renders the featured AURORA panel');
  assert.ok(embNode, 'Work chapter renders the EmbNode secondary panel');
  assert.ok(gitOps, 'Work chapter renders the GitOps secondary panel');
  assert.ok(sysLib, 'Work chapter renders the SysLib secondary panel');

  assert.match(text, /01\s*\/\s*Work/i);
  assert.match(text, /AURORA/);
  assert.match(text, /60 sec/);
  assert.match(text, /Vigilance test/);
  assert.match(text, /Read-only/);
  assert.match(text, /Apple Health access/);
  assert.match(text, /iOS \+ iPad/);
  assert.match(text, /EmbNode/);
  assert.match(text, /GitOps/);
  assert.match(text, /SysLib/);
  assert.match(
    workFeature,
    /href="\/writing\/aurora-private-caffeine-tracking\/?"/,
  );
  assert.match(workFeature, /href="https:\/\/nmapaye\.github\.io\/aurora"/);
  assert.match(embNode, /href="https:\/\/github\.com\/nmapaye\/embnode"/);
  assert.match(visibleText(embNode), /FreeRTOS/);
  assert.match(visibleText(embNode), /DMA/);
  assert.match(gitOps, /href="https:\/\/github\.com\/nmapaye\/gitops"/);
  assert.match(visibleText(gitOps), /Prometheus/);
  assert.match(visibleText(gitOps), /Automated rollback/);
  assert.match(sysLib, /href="https:\/\/github\.com\/nmapaye\/syslib"/);
  assert.match(visibleText(sysLib), /26\.9M/);
  assert.match(visibleText(sysLib), /ThreadSanitizer/);
  assert.doesNotMatch(workChapter, /0 cloud/i);
  assert.doesNotMatch(workChapter, /proof, not prose/i);
});

test('homepage renders the approved issue shell and cover', async () => {
  const html = await readHomepage();
  const text = visibleText(html);
  const globalStyles = await readSource('src/styles/global.css');
  const chapterIndex = html.match(
    /<nav class="chapter-index"[^>]*>([\s\S]*?)<\/nav>/,
  )?.[0];

  assert.match(html, /class="skip-link" href="#main-content"/);
  assert.match(html, /<main id="main-content"[^>]*tabindex="-1"[^>]*>/);
  assert.match(text, /NM\s*\/\s*Issue 01/i);
  assert.match(text, /SYSTEMS\s*TO\s*SCREENS/i);
  assert.match(
    text,
    /Software engineer building from low-level systems to polished products\./,
  );
  assert.match(text, /01\s*\/\s*Work/i);
  assert.match(text, /02\s*\/\s*Experience/i);
  assert.match(text, /03\s*\/\s*Notes/i);
  assert.match(text, /04\s*\/\s*Contact/i);
  assert.ok(chapterIndex, 'homepage renders the Chapter Index navigation');
  assert.match(chapterIndex, /href="#work"/);
  assert.match(chapterIndex, /href="#experience"/);
  assert.match(chapterIndex, /href="#notes"/);
  assert.match(chapterIndex, /href="#contact"/);
  assert.match(html, /href="\/resume\.pdf"/);
  assert.match(html, /mailto:nmapaye@ucsc\.edu/);
  assert.match(
    html,
    /alt="Nathaniel Mapaye inside an immersive balloon installation"/,
  );
  assert.doesNotMatch(html, /id="theme-toggle"/);
  assert.doesNotMatch(html, /localStorage\.setItem\('theme'/);
  assert.match(
    globalStyles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.btn:hover\s*\{[\s\S]*?transform:\s*none;[\s\S]*?box-shadow:\s*none;/,
  );
});

test('notes and contact close the issue with the approved voice and photos', async () => {
  const html = await readHomepage();
  const text = visibleText(html);
  const chapterIndex = html.match(
    /<nav class="chapter-index"[^>]*>([\s\S]*?)<\/nav>/,
  )?.[0];
  const notesImage = html.match(
    /<img\b(?=[^>]*\balt="Nathaniel Mapaye posing in front of an aquarium")[^>]*>/,
  )?.[0];
  const contactImage = html.match(
    /<img\b(?=[^>]*\balt="Portrait of Nathaniel Mapaye")[^>]*>/,
  )?.[0];

  assert.match(html, /id="notes"/);
  assert.match(text, /03\s*\/\s*Notes/i);
  assert.match(text, /NOTES\s*FROM\s*THE\s*UNDERGROUND/i);
  assert.match(
    text,
    /Building AURORA: Private Caffeine, Sleep, and Alertness Tracking/,
  );
  assert.match(html, /href="\/writing\/aurora-private-caffeine-tracking\/?"/);
  assert.ok(chapterIndex, 'homepage renders the Chapter Index navigation');
  assert.match(chapterIndex, /href="#notes"/);
  assert.ok(notesImage, 'Notes renders the approved aquarium photograph');
  assert.match(notesImage, /loading="lazy"/);
  assert.match(notesImage, /src="\/_astro\/notes-aquarium\.[^"]+\.webp"/);
  assert.match(notesImage, /srcset="[^"]+\.webp 640w, [^"]+\.webp 960w, [^"]+\.webp 1280w, [^"]+\.webp 1600w"/);
  assert.match(html, /id="contact"/);
  assert.match(text, /04\s*\/\s*Contact/i);
  assert.match(text, /LET[’']S\s*BUILD/i);
  assert.ok(contactImage, 'Contact renders the approved portrait photograph');
  assert.match(contactImage, /loading="lazy"/);
  assert.match(contactImage, /src="\/_astro\/contact-portrait\.[^"]+\.webp"/);
  assert.match(contactImage, /srcset="[^"]+\.webp 320w, [^"]+\.webp 480w, [^"]+\.webp 640w"/);
  assert.match(html, /href="mailto:nmapaye@ucsc\.edu"/);
  assert.match(html, /href="\/resume\.pdf"/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/nmapaye"/);
  assert.match(html, /href="https:\/\/github\.com\/nmapaye"/);
});

test('writing output uses the public Notes identity and article navigation', async () => {
  const index = await readFile(new URL('writing/index.html', outputRoot), 'utf8');
  const article = await readFile(
    new URL('writing/aurora-private-caffeine-tracking/index.html', outputRoot),
    'utf8',
  );
  const indexText = visibleText(index);
  const articleText = visibleText(article);

  assert.match(index, /<title>Notes — Nathaniel Mapaye<\/title>/);
  assert.match(indexText, /03\s*\/\s*Notes/i);
  assert.match(indexText, /NOTES\s*FROM\s*THE\s*UNDERGROUND/i);
  assert.match(indexText, /NM\s*\/\s*Issue 01/i);
  assert.match(index, /<main id="main-content"[^>]*tabindex="-1"[^>]*>/);
  assert.match(articleText, /←\s*All notes/i);
  assert.match(article, /<main id="main-content"[^>]*tabindex="-1"[^>]*>/);
  assert.match(
    article,
    /By\s*<a href="\/" rel="author"[^>]*>Nathaniel Mapaye<\/a>/,
  );
});

test('Notes and Contact keep their mobile crop, title, and contrast contracts', async () => {
  const notes = await readSource('src/components/Notes.astro');
  const contact = await readSource('src/components/Contact.astro');
  const writingIndex = await readSource('src/pages/writing/index.astro');

  assert.match(
    contact,
    /\.contact__portrait\s*\{[\s\S]*?aspect-ratio:\s*4\s*\/\s*5;[\s\S]*?overflow:\s*hidden;/,
  );
  assert.match(
    contact,
    /\.contact__portrait\s*:global\(img\)\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?object-fit:\s*cover;/,
  );
  assert.match(
    notes,
    /\.notes__content h2\s*\{[\s\S]*?font-size:\s*clamp\(3rem,\s*7vw,\s*6\.5rem\);/,
  );
  assert.match(
    writingIndex,
    /\.writing-index h1\s*\{[\s\S]*?clamp\(3rem,\s*11vw,\s*9rem\)/,
  );
  assert.match(
    notes,
    /\.notes__content article h3 a\s*\{[\s\S]*?color:\s*inherit;/,
  );
  assert.doesNotMatch(notes, /\.notes__content article a\s*\{/);
  assert.match(
    notes,
    /\.notes__content article > \.btn\s*\{[\s\S]*?color:\s*var\(--ink\);/,
  );
  assert.match(
    notes,
    /\.notes__photo,\s*\.notes__content\s*\{\s*min-width:\s*0;/,
  );
});

test('experience chapter emphasizes systems, security, and product', async () => {
  const html = await readHomepage();
  const experienceChapter = html.match(/<section id="experience"[^>]*>[\s\S]*?<\/section>/)?.[0];

  assert.ok(experienceChapter, 'homepage renders the Experience chapter');

  const text = visibleText(experienceChapter);

  assert.match(experienceChapter, /id="experience"/);
  assert.match(text, /02\s*\/\s*Experience/i);
  assert.match(text, /SYSTEMS\.\s*SECURITY\.\s*PRODUCT\./i);

  for (const [role, organization] of [
    ['AI Fellow', 'Handshake'],
    ['Linear Algebra Tutor', 'UCSC ACE'],
    ['Data Center Engineering Intern', 'Bitera D\.C'],
    ['Cyber Security Analyst Intern', 'Xapiens Teknologi Indonesia'],
  ]) {
    assert.match(text, new RegExp(role));
    assert.match(text, new RegExp(organization));
  }

  assert.match(text, /authenticated testing/i);
  assert.match(text, /incident postmortems/i);
  assert.match(text, /CVSS ≥ 9/);
  assert.match(text, /authenticated scans/i);
  assert.match(text, /PoC-backed remediation reports/i);
  assert.match(text, /CVSS ≥ 8/);
  assert.match(text, /University of California, Santa Cruz/);
  assert.match(text, /B\.S\., Technology &amp; Information Management/);
  assert.match(text, /C\+\+23/);
  assert.match(text, /Burp Suite/);
  const actionImage = experienceChapter.match(
    /<img\b(?=[^>]*\balt="Nathaniel Mapaye playing table tennis outdoors")[^>]*>/,
  )?.[0];
  const timeline = experienceChapter.match(
    /<ol class="experience__timeline"[^>]*>([\s\S]*?)<\/ol>/,
  )?.[1];
  const timelineEntries = timeline?.match(/<article\b[^>]*>[\s\S]*?<\/article>/g) ?? [];

  assert.ok(actionImage, 'Experience renders the table-tennis action image');
  assert.match(
    actionImage,
    /alt="Nathaniel Mapaye playing table tennis outdoors"/,
  );
  assert.match(actionImage, /loading="lazy"/);
  assert.match(actionImage, /sizes="\(max-width: 959px\) 100vw, 34vw"/);
  assert.match(
    actionImage,
    /src="\/_astro\/experience-table-tennis\.[^"]+\.webp"/,
  );
  assert.match(
    actionImage,
    /srcset="[^"]+\.webp 480w, [^"]+\.webp 720w, [^"]+\.webp 960w"/,
  );

  assert.equal(timelineEntries.length, 4, 'Experience renders four timeline entries');
  const roleBulletCounts = timelineEntries.map((entry) => {
    const roleBullets = entry.match(/<ul\b[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? '';

    return (roleBullets.match(/<li\b/g) ?? []).length;
  });

  assert.deepEqual(roleBulletCounts, [2, 2, 2, 2]);
  assert.equal(roleBulletCounts.reduce((total, count) => total + count, 0), 8);
});

test('homepage renders the final issue architecture without legacy chapters', async () => {
  const html = await readHomepage();
  const main = html.match(/<main id="main-content"[^>]*>([\s\S]*?)<\/main>/)?.[1];

  assert.ok(main, 'homepage renders the main landmark');

  const chapterPositions = [
    main.indexOf('class="cover"'),
    main.indexOf('class="chapter-index"'),
    main.indexOf('<section id="work"'),
    main.indexOf('<section id="experience"'),
    main.indexOf('<section id="notes"'),
    main.indexOf('<section id="contact"'),
  ];

  assert.ok(
    chapterPositions.every((position) => position >= 0),
    'main contains the cover, chapter index, and four issue chapters',
  );
  assert.deepEqual(
    [...chapterPositions].sort((a, b) => a - b),
    chapterPositions,
    'homepage chapters retain the editorial reading order',
  );
  assert.match(html, /<header class="masthead"[^>]*>/);
  assert.match(html, /<footer class="footer"[^>]*>/);
  assert.doesNotMatch(html, /id="about"/);
  assert.doesNotMatch(html, /id="education"/);
  assert.doesNotMatch(html, /id="skills"/);
});

test('homepage source composes only the final homepage sections', async () => {
  const source = await readSource('src/pages/index.astro');

  assert.doesNotMatch(source, /components\/(?:About|Education|Skills)\.astro/);
  assert.match(
    source,
    /<Nav\s*\/>\s*<main id="main-content"[^>]*>\s*<Hero\s*\/>\s*<ChapterIndex\s*\/>\s*<Projects\s*\/>\s*<Experience\s*\/>\s*<Notes\s*\/>\s*<Contact\s*\/>\s*<\/main>\s*<Footer\s*\/>/,
  );
  assert.match(source, /<main id="main-content"[^>]*tabindex="-1"[^>]*>/);

  await Promise.all(
    ['About.astro', 'Education.astro', 'Skills.astro'].map((file) =>
      assert.rejects(
        access(new URL(`src/components/${file}`, repoRoot)),
        { code: 'ENOENT' },
        `deleted component remains absent: ${file}`,
      ),
    ),
  );
});

test('homepage retains accessible destinations, a fixed palette, and resilient interaction contracts', async () => {
  const [html, nav, tokens, global] = await Promise.all([
    readHomepage(),
    readSource('src/components/Nav.astro'),
    readSource('src/styles/tokens.css'),
    readSource('src/styles/global.css'),
  ]);

  for (const id of ['main-content', 'work', 'experience', 'notes', 'contact']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }

  assert.match(html, /<details class="masthead__mobile"[^>]*>/);
  assert.match(html, /aria-label="Mobile primary"/);
  assert.match(html, /aria-label="Homepage chapters"/);
  assert.match(nav, /<summary>Menu<\/summary>/);

  const desktopNav = html.match(
    /<nav class="masthead__desktop"[^>]*>([\s\S]*?)<\/nav>/,
  )?.[1];
  const mobileNav = html.match(
    /<nav aria-label="Mobile primary"[^>]*>([\s\S]*?)<\/nav>/,
  )?.[1];
  const linksInNav = (navMarkup) =>
    [...navMarkup.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
      .map(([, href, label]) => ({ href, label: visibleText(label) }));
  const expectedDestinations = [
    { href: '/#work', label: 'Work' },
    { href: '/#experience', label: 'Experience' },
    { href: '/writing/', label: 'Notes' },
    { href: '/#contact', label: 'Contact' },
    { href: '/resume.pdf', label: 'Resume' },
    { href: 'mailto:nmapaye@ucsc.edu', label: 'Email' },
  ];

  assert.ok(desktopNav, 'homepage renders the desktop primary navigation');
  assert.ok(mobileNav, 'homepage renders the mobile primary navigation');
  assert.deepEqual(linksInNav(desktopNav), expectedDestinations);
  assert.deepEqual(linksInNav(mobileNav), expectedDestinations);

  for (const [token, value] of [
    ['ink', '#101010'],
    ['paper', '#f7f5ee'],
    ['yellow', '#ffeb09'],
    ['green', '#b8ff39'],
    ['red', '#ef362f'],
  ]) {
    assert.match(tokens, new RegExp(`--${token}:\\s*${value}`, 'i'));
  }

  assert.doesNotMatch(tokens, /\[data-theme=['"]dark['"]\]/);
  assert.doesNotMatch(html, /id="theme-toggle"/);
  assert.match(global, /:focus-visible/);
  assert.match(global, /prefers-reduced-motion:\s*reduce/);
  assert.match(global, /overflow-x:\s*clip/);
});
