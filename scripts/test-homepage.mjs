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

export function extractMaxWidthMediaBlocks(css, maxWidth) {
  const blocks = [];
  const mediaQuery = new RegExp(
    `^@media\\s*\\(\\s*max-width\\s*:\\s*${maxWidth}px\\s*\\)$`,
  );

  for (let index = 0; index < css.length; index += 1) {
    if (css.startsWith('/*', index)) {
      index = css.indexOf('*/', index + 2);
      if (index === -1) break;
      index += 1;
      continue;
    }

    if (css[index] === '"' || css[index] === "'") {
      const quote = css[index];
      index += 1;
      while (index < css.length) {
        if (css[index] === '\\') index += 2;
        else if (css[index] === quote) break;
        else index += 1;
      }
      continue;
    }

    if (!css.startsWith('@media', index)) continue;

    const blockOpen = css.indexOf('{', index + 6);
    if (blockOpen === -1) break;
    if (!mediaQuery.test(css.slice(index, blockOpen).trim())) continue;

    let depth = 1;
    let cursor = blockOpen + 1;
    for (; cursor < css.length && depth > 0; cursor += 1) {
      if (css.startsWith('/*', cursor)) {
        cursor = css.indexOf('*/', cursor + 2);
        if (cursor === -1) break;
        cursor += 1;
        continue;
      }

      if (css[cursor] === '"' || css[cursor] === "'") {
        const quote = css[cursor];
        cursor += 1;
        while (cursor < css.length) {
          if (css[cursor] === '\\') cursor += 2;
          else if (css[cursor] === quote) break;
          else cursor += 1;
        }
        continue;
      }

      if (css[cursor] === '{') depth += 1;
      if (css[cursor] === '}') depth -= 1;
    }

    if (depth === 0) blocks.push(css.slice(blockOpen + 1, cursor - 1));
    index = cursor - 1;
  }

  return blocks;
}

function splitSimpleSelectorList(prelude) {
  const selectors = [];
  let start = 0;
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = null;
  for (let index = 0; index < prelude.length; index += 1) {
    const character = prelude[index];
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '[') bracketDepth += 1;
    else if (character === ']') bracketDepth -= 1;
    else if (character === '(') parenthesisDepth += 1;
    else if (character === ')') parenthesisDepth -= 1;
    else if (character === ',' && bracketDepth === 0 && parenthesisDepth === 0) {
      selectors.push(prelude.slice(start, index));
      start = index + 1;
    }
  }
  selectors.push(prelude.slice(start));
  return selectors.map((selector) => selector.replace(/\s+/g, ' ').trim());
}

function collectCssRuleBlocks(css) {
  const rules = [];
  let start = 0;
  while (start < css.length) {
    const open = css.indexOf('{', start);
    if (open === -1) break;
    const prelude = css.slice(start, open).trim();
    let depth = 1;
    let cursor = open + 1;
    let quote = null;
    for (; cursor < css.length && depth > 0; cursor += 1) {
      const character = css[cursor];
      if (quote) {
        if (character === '\\') cursor += 1;
        else if (character === quote) quote = null;
      } else if (character === '"' || character === "'") quote = character;
      else if (character === '{') depth += 1;
      else if (character === '}') depth -= 1;
    }
    if (depth !== 0) break;
    const block = css.slice(open + 1, cursor - 1);
    if (prelude.startsWith('@')) rules.push(...collectCssRuleBlocks(block));
    else rules.push({ prelude, block });
    start = cursor;
  }
  return rules;
}

function findExactCssRule(css, expectedSelector) {
  for (const { prelude, block } of collectCssRuleBlocks(css)) {
    if (splitSimpleSelectorList(prelude).some((selector) => expectedSelector.test(selector))) {
      return block;
    }
  }
  return null;
}

export function visibleText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

test('hero marquee keeps one semantic source and hidden visual tracks', async () => {
  const html = await readHomepage();
  const marquee = html.match(/<p class="kinetic-marquee"[\s\S]*?<\/p>/)?.[0] ?? '';
  assert.match(marquee, /kinetic-marquee__source[^>]*>SYSTEMS \/ SECURITY \/ PRODUCT/);
  assert.equal((marquee.match(/data-motion-marquee-track/g) ?? []).length, 2);
  assert.equal((marquee.match(/aria-hidden="true"/g) ?? []).length, 2);
});

test('marquee fallback keeps duplicate tracks hidden yet measurable before enhancement', async () => {
  const [sourceCss, builtCss, html] = await Promise.all([
    readSource('src/styles/motion.css'),
    readBuiltCss(),
    readHomepage(),
  ]);
  const selector = /^\.kinetic-marquee:not\(\[data-motion-enhanced\]\) \.kinetic-marquee__track$/;
  for (const css of [sourceCss, builtCss]) {
    const rule = findExactCssRule(css, selector);
    assert.ok(rule, 'pre-enhancement marquee track rule is present');
    assert.match(rule, /visibility\s*:\s*hidden/);
    assert.doesNotMatch(rule, /display\s*:\s*none/);
  }
  const sourceRule = findExactCssRule(
    builtCss,
    /^\.kinetic-marquee\[data-motion-enhanced\] \.kinetic-marquee__source$/,
  );
  assert.match(sourceRule ?? '', /clip-path\s*:\s*inset\(50%\)/);
  assert.match(
    html,
    /kinetic-marquee__source[^>]*>SYSTEMS \/ SECURITY \/ PRODUCT/,
  );
});

test('motion markup defers decorative stickers and keeps canonical poster assets', async () => {
  const html = await readHomepage();
  const posterPaths = [
    'public/images/project-posters/aurora.svg',
    'public/images/project-posters/embnode.svg',
    'public/images/project-posters/gitops.svg',
    'public/images/project-posters/syslib.svg',
  ];

  await Promise.all(
    posterPaths.map((path) => assert.doesNotReject(access(new URL(path, repoRoot)))),
  );
  assert.match(html, /data-motion-root/);
  assert.equal((html.match(/data-motion-blob=/g) ?? []).length, 2);
  assert.equal((html.match(/data-motion-sticker(?:\s|=)/g) ?? []).length, 0);
  assert.equal((html.match(/data-motion-sticker-template/g) ?? []).length, 1);
  assert.match(html, /data-motion-sticker-sources=/);
  assert.equal((html.match(/data-motion-particle(?:\s|=)/g) ?? []).length, 8);
  assert.equal((html.match(/data-motion-wipe-panel/g) ?? []).length, 3);
  assert.match(html, /data-motion-root[^>]*aria-hidden="true"/);
  assert.doesNotMatch(html, /data-motion-grid[^>]*tabindex="0"/);
});

test('difference blobs blend at their own page-layer boundary', async () => {
  const [html, builtCss] = await Promise.all([readHomepage(), readBuiltCss()]);
  const root = findExactCssRule(builtCss, /^\.motion-root$/);
  const blendLayer = findExactCssRule(builtCss, /^\.motion-layer--blend$/);
  const blob = collectCssRuleBlocks(builtCss).find(({ prelude, block }) => (
    splitSimpleSelectorList(prelude).includes('[data-motion-blob]')
      && /width\s*:/.test(block)
  ))?.block ?? null;

  assert.match(html, /class="motion-root"[^>]*data-motion-root/);
  assert.equal((html.match(/class="motion-layer motion-layer--blend"/g) ?? []).length, 1);
  assert.equal((html.match(/class="motion-layer motion-layer--effects"/g) ?? []).length, 1);
  assert.match(root ?? '', /display:\s*contents/);
  assert.match(blendLayer ?? '', /mix-blend-mode:\s*difference/);
  assert.doesNotMatch(blob ?? '', /mix-blend-mode/);
  assert.match(blob ?? '', /width:\s*clamp\(7\.5rem,\s*18vw,\s*16rem\)/);
  const translateIndex = blob?.indexOf('translate3d(') ?? -1;
  const centerIndex = blob?.indexOf('translate(-50%,-50%)') ?? -1;
  const rotateIndex = blob?.indexOf('rotate(') ?? -1;
  assert.ok(
    translateIndex >= 0 && translateIndex < centerIndex && centerIndex < rotateIndex,
    'blob transforms translate the spring point, center the box, then rotate it',
  );
});

test('built motion delivery keeps one shared module, stable posters, and writing fallbacks', async () => {
  const [html, css, writingHtml, articleHtml] = await Promise.all([
    readHomepage(),
    readBuiltCss(),
    readFile(new URL('writing/index.html', outputRoot), 'utf8'),
    readFile(new URL('writing/aurora-private-caffeine-tracking/index.html', outputRoot), 'utf8'),
  ]);
  const moduleTag = html.match(
    /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc=")[^>]*>/,
  )?.[0];
  assert.ok(moduleTag, 'homepage references one external motion module');
  assert.equal(
    (html.match(/<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc=")[^>]*>/g) ?? []).length,
    1,
  );
  const modulePath = moduleTag.match(/\bsrc="([^"]+)"/)?.[1];
  assert.ok(modulePath, 'homepage motion module has a source URL');
  assert.equal((html.match(/data-motion-blob=/g) ?? []).length, 2);
  assert.equal((html.match(/data-motion-sticker=/g) ?? []).length, 0);
  assert.equal((html.match(/data-motion-sticker-template/g) ?? []).length, 1);
  assert.equal((html.match(/data-motion-particle=/g) ?? []).length, 8);
  assert.equal((html.match(/data-motion-grid-tile=/g) ?? []).length, 16);
  assert.equal((html.match(/data-motion-card=/g) ?? []).length, 4);
  assert.equal((html.match(/data-motion-card-layer=/g) ?? []).length, 12);
  assert.equal((html.match(/data-motion-shuffle(?:\s|=)/g) ?? []).length, 8);
  assert.equal((html.match(/data-motion-shake(?:\s|=)/g) ?? []).length, 5);
  assert.doesNotMatch(html, /data-motion-enhanced/);
  assert.match(css, /@media \(forced-colors:\s*active\)/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /\.motion-layer[^}]*pointer-events:none/);
  assert.match(css, /\.glitch-text__visual[^}]*pointer-events:none/);

  const posterPaths = [
    'images/project-posters/aurora.svg',
    'images/project-posters/embnode.svg',
    'images/project-posters/gitops.svg',
    'images/project-posters/syslib.svg',
  ];
  await Promise.all(posterPaths.map((posterPath) =>
    assert.doesNotReject(access(new URL(posterPath, outputRoot))),
  ));
  for (const posterPath of posterPaths) {
    assert.ok(html.includes(`/${posterPath}`), `homepage references /${posterPath}`);
  }

  for (const writing of [writingHtml, articleHtml]) {
    const writingModule = writing.match(
      /<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc=")[^>]*>/,
    )?.[0]?.match(/\bsrc="([^"]+)"/)?.[1];
    assert.equal(writingModule, modulePath);
    assert.doesNotMatch(writing, /project-posters|data-motion-kinetic="true"/);
  }
});

test('built navigation wipe keeps the exact bounded accessibility sequence', async () => {
  const [html, css] = await Promise.all([readHomepage(), readBuiltCss()]);
  assert.equal((html.match(/data-motion-wipe-panel=/g) ?? []).length, 3);
  assert.deepEqual(
    [...html.matchAll(/data-motion-wipe-panel="([^"]+)"/g)].map((match) => match[1]),
    ['red', 'yellow', 'green'],
  );

  const rule = (selector) => {
    const block = findExactCssRule(css, new RegExp(`^${selector}$`));
    assert.ok(block, `missing compiled wipe selector: ${selector}`);
    return block;
  };
  assert.match(
    rule('\\.motion-wipe\\[data-active\\] \\[data-motion-wipe-panel\\]'),
    /transition:transform (?:\.18s|180ms) steps\(4,end\)/,
  );
  assert.match(
    rule('\\.motion-wipe\\[data-active\\] \\[data-motion-wipe-panel=yellow\\]'),
    /transition-delay:45ms/,
  );
  assert.match(
    rule('\\.motion-wipe\\[data-active\\] \\[data-motion-wipe-panel=green\\]'),
    /transition-delay:90ms/,
  );
  assert.match(
    css,
    /@media\s*\(forced-colors:\s*active\),\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\[data-motion-blobs\],\[data-motion-stickers\],\[data-motion-particles\],\[data-motion-wipe\]\{display:none\}/,
  );
});

test('infinite grid is a static 16-tile fallback without duplicate links', async () => {
  const html = await readHomepage();
  const grid = html.match(/<div class="infinite-project-grid"[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? '';
  const tileRoots = [...html.matchAll(/<div\b[^>]*data-motion-grid-tile=[^>]*>/g)];
  assert.equal(tileRoots.length, 16);
  for (const tile of tileRoots) assert.match(tile[0], /aria-hidden="true"/);
  assert.match(grid, /aria-hidden="true"/);
  assert.doesNotMatch(grid, /tabindex="0"|<a\b|<article\b/);
  assert.doesNotMatch(grid, /<figcaption|<strong|<small/);
  assert.equal((html.match(/class="work-feature"/g) ?? []).length, 1);
  assert.equal((html.match(/class="project-card"/g) ?? []).length, 3);
});

test('homepage extraction keeps one canonical record for each project', async () => {
  const html = await readHomepage();
  const text = visibleText(html);
  const claims = [
    'Intermittent networks and low-power constraints make telemetry delivery unreliable.',
    'Concurrent data-structure experiments need a small surface that makes correctness work explicit.',
    'Canary releases need a clear decision path when service health changes.',
    'Personal health signals need useful feedback without exporting sensitive data by default.',
  ];

  for (const claim of claims) {
    assert.equal(text.split(claim).length - 1, 1, `expected one canonical project claim: ${claim}`);
  }
  assert.equal(text.split('SYSTEMS / SECURITY / PRODUCT').length - 1, 1);
});

test('about route is conventional, copyable, and free of motion markup', async () => {
  const about = await readFile(new URL('about/index.html', outputRoot), 'utf8');
  const text = visibleText(about);

  assert.match(text, /Bay Area systems engineer who ships usable software\./);
  assert.match(text, /C\+\+23 lock-free concurrency/);
  assert.match(text, /FreeRTOS embedded telemetry for ESP32 and STM32/);
  assert.match(text, /Technical focus/);
  assert.match(text, /Selected projects/);
  assert.match(text, /Experience/);
  assert.match(text, /Education/);
  assert.match(text, /nmapaye@ucsc\.edu/);
  assert.doesNotMatch(about, /data-motion-root|data-motion-kinetic|data-motion-sticker/);
});

test('project cards keep their existing semantic content while exposing four decorative stacks', async () => {
  const [html, cardStack, poster, projects] = await Promise.all([
    readHomepage(),
    readSource('src/components/effects/CardStack.astro'),
    readSource('src/components/effects/ProjectPoster.astro'),
    readSource('src/components/Projects.astro'),
  ]);
  assert.equal((html.match(/data-motion-card=/g) ?? []).length, 4);
  assert.equal((html.match(/class="card-stack__stage"/g) ?? []).length, 4);
  assert.equal((html.match(/data-motion-card-layer=/g) ?? []).length, 12);
  assert.equal((html.match(/data-motion-card-layer=[^>]*aria-hidden="true"/g) ?? []).length, 12);
  assert.equal((html.match(/class="work-feature"/g) ?? []).length, 1);
  assert.equal((html.match(/class="project-card"/g) ?? []).length, 3);
  assert.match(html, /href="\/writing\/aurora-private-caffeine-tracking\/"/);
  assert.match(html, /href="https:\/\/github\.com\/nmapaye\/embnode"/);
  assert.match(html, /Intermittent networks and low-power constraints make telemetry delivery unreliable\./);
  assert.doesNotMatch(cardStack, /card-stack__metadata/);
  assert.doesNotMatch(poster, /figcaption/);
  assert.match(projects, /\.work-feature__links\s*\{[\s\S]*?display:\s*flex;[\s\S]*?margin-top:\s*1\.5rem;/);
});

test('stack poster geometry stays inside a clipped card-stack stage', async () => {
  const builtCss = await readBuiltCss();
  const stackPoster = findExactCssRule(
    builtCss,
    /^\.project-poster--stack$/,
  );

  assert.ok(stackPoster, 'built CSS is missing the stack-poster geometry rule');
  assert.match(stackPoster, /height:\s*100%/);
  assert.match(stackPoster, /aspect-ratio:\s*auto/);

  const stackStage = findExactCssRule(
    builtCss,
    /^\.card-stack__stage$/,
  );
  assert.ok(stackStage, 'built CSS is missing the stack-stage containment rule');
  assert.match(stackStage, /position:\s*absolute/);
  assert.match(stackStage, /inset:\s*0/);
  assert.match(stackStage, /overflow:\s*clip/);
  assert.match(stackStage, /contain:\s*paint/);
  assert.match(stackStage, /isolation:\s*isolate/);
});

test('narrow card stacks keep a visible fan inside the mobile gutter', async () => {
  const [authoredCss, builtCss] = await Promise.all([
    readSource('src/styles/motion.css'),
    readBuiltCss(),
  ]);
  const selectors = {
    leftExpanded: /^\.card-stack\[data-expanded\] \[data-motion-card-layer="0"\]$/,
    rightExpanded: /^\.card-stack\[data-expanded\] \[data-motion-card-layer="2"\]$/,
    leftStatic: /^\.card-stack \[data-motion-card-layer="0"\]$/,
    rightStatic: /^\.card-stack \[data-motion-card-layer="2"\]$/,
  };
  const readNumber = (rule, property, unit) => {
    const value = rule?.match(new RegExp(`--${property}:\\s*(-?[\\d.]+)${unit}`))?.[1];
    assert.notEqual(value, undefined, `missing --${property}`);
    return Number(value);
  };

  for (const [label, css] of [['authored', authoredCss], ['built', builtCss]]) {
    const mobileCss = extractMaxWidthMediaBlocks(css, 639).join('\n');
    const leftExpanded = findExactCssRule(mobileCss, selectors.leftExpanded);
    const rightExpanded = findExactCssRule(mobileCss, selectors.rightExpanded);
    const leftStatic = findExactCssRule(mobileCss, selectors.leftStatic);
    const rightStatic = findExactCssRule(mobileCss, selectors.rightStatic);

    assert.ok(leftExpanded, `${label} CSS is missing the left mobile fan rule`);
    assert.ok(rightExpanded, `${label} CSS is missing the right mobile fan rule`);
    assert.ok(leftStatic, `${label} CSS is missing the left static mobile fan rule`);
    assert.ok(rightStatic, `${label} CSS is missing the right static mobile fan rule`);

    const pairs = [
      ['stack-x', readNumber(leftExpanded, 'stack-x', '%'), readNumber(rightExpanded, 'stack-x', '%'), 4],
      ['stack-rotate', readNumber(leftExpanded, 'stack-rotate', 'deg'), readNumber(rightExpanded, 'stack-rotate', 'deg'), 2],
      ['stack-flat-x', readNumber(leftExpanded, 'stack-flat-x', '%'), readNumber(rightExpanded, 'stack-flat-x', '%'), 4],
      ['stack-static-x', readNumber(leftStatic, 'stack-static-x', '%'), readNumber(rightStatic, 'stack-static-x', '%'), 4],
    ];

    for (const [property, left, right, safeMaximum] of pairs) {
      assert.ok(left < 0 && right > 0, `${label} --${property} keeps both fan directions visible`);
      assert.equal(Math.abs(left), Math.abs(right), `${label} --${property} stays symmetric`);
      assert.ok(
        Math.abs(left) <= safeMaximum,
        `${label} --${property} stays within the ${safeMaximum}-unit mobile bound`,
      );
    }
  }

  const desktopLeft = findExactCssRule(authoredCss, selectors.leftExpanded);
  const desktopRight = findExactCssRule(authoredCss, selectors.rightExpanded);
  assert.equal(readNumber(desktopLeft, 'stack-x', '%'), -8);
  assert.equal(readNumber(desktopRight, 'stack-x', '%'), 8);
  assert.equal(readNumber(desktopLeft, 'stack-rotate', 'deg'), -3);
  assert.equal(readNumber(desktopRight, 'stack-rotate', 'deg'), 3);
});

test('text motion retains eight semantic labels behind hidden visual overlays', async () => {
  const html = await readHomepage();

  assert.equal((html.match(/data-motion-shuffle(?:\s|=)/g) ?? []).length, 8);
  assert.equal((html.match(/data-motion-shuffle-visual[^>]*aria-hidden="true"/g) ?? []).length, 8);
  assert.equal((html.match(/data-motion-shake(?:\s|=)/g) ?? []).length, 5);
  assert.match(html, /<strong[^>]*>Work<\/strong>/);
  assert.match(html, /<h3[^>]*>AURORA<\/h3>/);
  assert.match(html, /<h3[^>]*>EmbNode<\/h3>/);
  assert.match(html, /<h3[^>]*>GitOps<\/h3>/);
  assert.match(html, /<h3[^>]*>SysLib<\/h3>/);
  for (const href of ['#work', '#experience', '#notes', '#contact']) {
    assert.match(html, new RegExp(`href="${href}"`));
  }
});

test('exact CSS rule extraction accepts only a matching selector-list member', () => {
  const expected = /^\.project-card\[data-astro-cid-[^\]]+\] \.glitch-text\[data-astro-cid-[^\]]+\]$/;
  const exact = '.project-card[data-astro-cid-card] .glitch-text[data-astro-cid-card]{color:red}';

  assert.equal(findExactCssRule(exact, expected), 'color:red');
  assert.equal(
    findExactCssRule('.unrelated,.project-card[data-astro-cid-card] .glitch-text[data-astro-cid-card]{color:red}', expected),
    'color:red',
  );
  assert.equal(
    findExactCssRule(`.unrelated ${exact}`, expected),
    null,
  );
  assert.equal(
    findExactCssRule(`${exact.replace('{', ' .suffix{')}`, expected),
    null,
  );
});

test('text shuffle overlays share their semantic label typography and geometry', async () => {
  const css = await readBuiltCss();
  const rule = (selector) => {
    const block = findExactCssRule(css, new RegExp(`^${selector}$`));
    assert.ok(block, `missing compiled selector: ${selector}`);
    return block;
  };
  const wrappers = [
    {
      selector: '\\.work-feature__copy\\[data-astro-cid-[^\\]]+\\] \\.glitch-text\\[data-astro-cid-[^\\]]+\\]',
      declarations: [
        'margin-block:1rem',
        'font:900 clamp(4rem,10vw,8rem)/.82 var(--font-display)',
        'letter-spacing:-.055em',
        'text-transform:uppercase',
        'overflow-wrap:anywhere',
      ],
    },
    {
      selector: '\\.project-card\\[data-astro-cid-[^\\]]+\\] \\.glitch-text\\[data-astro-cid-[^\\]]+\\]',
      declarations: [
        'font:900 clamp(2.7rem,5vw,4.5rem)/.85 var(--font-display)',
        'letter-spacing:-.04em',
        'text-transform:uppercase',
      ],
    },
    {
      selector: '\\.chapter-index\\[data-astro-cid-[^\\]]+\\] \\.glitch-text\\[data-astro-cid-[^\\]]+\\]',
      declarations: ['font:900 clamp(1.2rem,3vw,2.4rem)/.9 var(--font-display)'],
    },
  ];
  for (const { selector, declarations } of wrappers) {
    const declarationsText = rule(selector);
    for (const declaration of declarations) {
      assert.ok(declarationsText.includes(declaration), `${selector} is missing ${declaration}`);
    }
  }

  const base = rule('\\.glitch-text');
  assert.match(base, /position:relative/);
  assert.match(base, /display:inline-block/);
  const semantic = rule('\\.glitch-text>:not\\(\\[aria-hidden=true\\]\\)');
  for (const declaration of [
    'display:block', 'margin:0', 'font:inherit', 'line-height:inherit',
    'letter-spacing:inherit', 'text-transform:inherit', 'overflow-wrap:inherit',
  ]) assert.ok(semantic.includes(declaration), `semantic child is missing ${declaration}`);
  const visual = rule('\\.glitch-text__visual');
  for (const declaration of [
    'position:absolute', 'inset:0', 'font:inherit', 'line-height:inherit',
    'letter-spacing:inherit', 'text-transform:inherit', 'overflow-wrap:inherit',
  ]) assert.ok(visual.includes(declaration), `visual overlay is missing ${declaration}`);
});

test('media block extraction scopes matching CSS and preserves quoted content', () => {
  const css = `
    .out-of-media { content: "decoy"; }
    @media (max-width: 639px) {
      .inside { content: "quoted } \\"value\\""; }
      /* a comment containing } must not close the block */
    }
    @media (max-width: 420px) { .other { content: "other"; } }
  `;
  const blocks = extractMaxWidthMediaBlocks(css, 639);

  assert.equal(blocks.length, 1);
  assert.match(blocks[0], /content:\s*"quoted } \\"value\\""/);
  assert.doesNotMatch(blocks[0], /out-of-media|\.other/);
});

test('media block extraction keeps immediately adjacent matching blocks in order', () => {
  const css = '@media (max-width: 420px){.first{--marker:first}}@media (max-width: 420px){.second{--marker:second}}@media (max-width: 420px){.third{--marker:third}}';
  const blocks = extractMaxWidthMediaBlocks(css, 420);

  assert.deepEqual(
    blocks.map((block) => block.match(/--marker:[^;}]+/)?.[0]),
    ['--marker:first', '--marker:second', '--marker:third'],
  );
  for (const block of blocks) assert.doesNotMatch(block, /}\s*}$/);
});

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
  assert.doesNotMatch(workflow, /build-resume\.py public\/resume\.pdf/);
  assert.match(workflow, /- name: Test public resume\s+run: python scripts\/test-resume\.py/);
  assert.match(
    workflow,
    /uses: actions\/upload-pages-artifact@[0-9a-f]{40} # v4[\s\S]*?path: \.\/dist/,
  );
  assert.match(readme, /public\/resume\.pdf.*file deployed by\s+the site/s);

  assert.match(
    nav,
    /\.masthead__brand,\s*\.masthead__desktop a\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?min-height:\s*44px;[\s\S]*?display:\s*inline-flex;/,
  );
  assert.match(nav, /\.masthead__desktop\s*\{[\s\S]*?gap:\s*clamp\(0\.25rem,\s*1vw,\s*0\.75rem\);/);
  assert.match(nav, /@media \(max-width: 639px\)[\s\S]*?\.masthead__desktop\s*\{\s*display:\s*none;/);

  assert.match(tokens, /--font-display:[^;]*'Arial Narrow'/);
  assert.match(global, /\.display\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/);
  assert.match(hero, /@media \(max-width: 639px\)[\s\S]*?\.cover h1\s*\{[\s\S]*?clamp\(3\.25rem,\s*18vw,/);
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

test('site data carries systems-first copy and structured project evidence', async () => {
  const source = await readSource('src/data/site.ts');

  assert.match(
    source,
    /Bay Area systems and embedded software engineer building C\+\+23 concurrency libraries, FreeRTOS telemetry, application security tools, and dependable product interfaces\./,
  );
  assert.match(source, /label: 'Notes', href: '\/writing\/'/);
  assert.match(source, /name: 'EmbNode'/);
  assert.match(source, /focus: \{/);
  assert.match(source, /systemDesign:/);
  assert.match(source, /evidence:/);
  assert.match(source, /export const featuredSkills/);
  assert.doesNotMatch(source, /0 cloud/i);
  assert.doesNotMatch(source, /proof, not prose/i);
});

test('homepage work navigation targets rendered work and leads with systems evidence', async () => {
  const homepage = await readHomepage();

  assert.match(homepage, /href="\/#work"/);
  assert.match(homepage, /<section id="work"/);
  assert.match(homepage, /Intermittent networks and low-power constraints make telemetry delivery unreliable/);
  assert.match(homepage, /CRC and decode checks run in a 0\.47-second host simulation/);
});

test('work chapter leads with EmbNode and keeps structured evidence for every project', async () => {
  const html = await readHomepage();
  const workChapter = html.match(/<section id="work"[^>]*>([\s\S]*?)<\/section>/)?.[0];

  assert.ok(workChapter, 'homepage renders the Work chapter');

  const text = visibleText(workChapter);
  const workFeature = workChapter.match(/<article class="work-feature"[^>]*>[\s\S]*?<\/article>/)?.[0];
  const secondaryPanels = workChapter.match(/<article class="project-card"[^>]*>[\s\S]*?<\/article>/g) ?? [];
  const embNode = workFeature;
  const gitOps = secondaryPanels.find((panel) => /<h3[^>]*>GitOps<\/h3>/.test(panel));
  const sysLib = secondaryPanels.find((panel) => /<h3[^>]*>SysLib<\/h3>/.test(panel));
  const aurora = secondaryPanels.find((panel) => /<h3[^>]*>AURORA<\/h3>/.test(panel));

  assert.equal((workChapter.match(/class="work-feature"/g) ?? []).length, 1);
  assert.equal(secondaryPanels.length, 3);
  assert.ok(workFeature, 'Work chapter renders the featured EmbNode panel');
  assert.ok(gitOps, 'Work chapter renders the GitOps secondary panel');
  assert.ok(sysLib, 'Work chapter renders the SysLib secondary panel');
  assert.ok(aurora, 'Work chapter renders the AURORA product panel');

  assert.match(text, /01\s*\/\s*Work/i);
  assert.match(text, /EmbNode/);
  assert.match(text, /0\.47 sec/);
  assert.match(text, /Host simulation/);
  assert.match(text, /0\.15 mA/);
  assert.match(text, /Problem/);
  assert.match(text, /System design/);
  assert.match(text, /Evidence/);
  assert.match(text, /Outcome/);
  assert.match(text, /EmbNode/);
  assert.match(text, /GitOps/);
  assert.match(text, /SysLib/);
  assert.match(embNode, /href="https:\/\/github\.com\/nmapaye\/embnode"/);
  assert.match(visibleText(embNode), /FreeRTOS/);
  assert.match(visibleText(embNode), /DMA/);
  assert.match(gitOps, /href="https:\/\/github\.com\/nmapaye\/gitops"/);
  assert.match(visibleText(gitOps), /Prometheus/);
  assert.match(visibleText(gitOps), /rollback path triggers/);
  assert.match(sysLib, /href="https:\/\/github\.com\/nmapaye\/syslib"/);
  assert.match(visibleText(sysLib), /26\.9M/);
  assert.match(visibleText(sysLib), /linearizability/);
  assert.match(aurora, /href="\/writing\/aurora-private-caffeine-tracking\/?"/);
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
  assert.match(text, /Bay Area systems and embedded software engineer/);
  assert.match(text, /Explore embedded systems projects/);
  assert.match(text, /Operating range/);
  assert.match(text, /C\+\+23, FreeRTOS, ESP32 and STM32 telemetry/);
  assert.match(text, /Lock-free concurrency, atomics, Linux, Go, Kubernetes/);
  assert.match(text, /Application security testing, vulnerability remediation, AI evaluation/);
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
  assert.match(text, /AI materials for Olympic, OFFO Living, and Technohome/);
  assert.match(html, /href="\/writing\/ai-olympic-offo-technohome-public-archive\/?"/);
  assert.match(text, /Read the latest note/);
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

  assert.match(index, /<title>Systems and Embedded Software Notes \| Nathaniel Mapaye<\/title>/);
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

test('compiled Notes actions create flow boxes for their vertical padding', async () => {
  const css = await readBuiltCss();
  const actions = findExactCssRule(
    css,
    /^\.notes__content(?:\[data-astro-cid-[^\]]+\])? \.btn(?:\[data-astro-cid-[^\]]+\])?$/,
  );

  assert.ok(actions, 'built CSS is missing the Notes action layout rule');
  assert.match(actions, /display:\s*inline-flex/);
  assert.match(actions, /align-items:\s*center/);
  assert.match(actions, /justify-content:\s*center/);
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
    ['LLM Specialist', 'Frontier AI Lab'],
    ['Cyber Security AI Red-Teamer Intern', 'CFX Indonesia'],
    ['Subject Matter Expert \\(SME\\), AI Alignment', 'Handshake'],
    ['Linear Algebra Tutor', 'UCSC ACE'],
    ['Data Center Engineering Intern', 'Bitera D\.C'],
    ['Cyber Security Analyst Intern', 'Xapiens Teknologi Indonesia'],
  ]) {
    assert.match(text, new RegExp(role));
    assert.match(text, new RegExp(organization));
  }

  assert.match(text, /520\+ frontier AI outputs/i);
  assert.match(text, /70\+ recurring failure patterns/i);
  assert.match(text, /89% of reviewed cases/i);
  assert.match(text, /30\+ assets/i);
  assert.match(text, /27\+ vulnerabilities/i);
  assert.match(text, /OJK-regulated/i);
  assert.match(text, /8\+ repository-level software tasks/i);
  assert.match(text, /structured rubrics/i);
  assert.match(text, /16\+ high-severity web findings/i);
  assert.match(text, /five live data-center domains/i);
  assert.match(text, /50\+ endpoints/i);
  assert.match(text, /CVSS 8\.0\+ findings/i);
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

  assert.equal(timelineEntries.length, 6, 'Experience renders six timeline entries');
  const roleBulletCounts = timelineEntries.map((entry) => {
    const roleBullets = entry.match(/<ul\b[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? '';

    return (roleBullets.match(/<li\b/g) ?? []).length;
  });

  assert.deepEqual(roleBulletCounts, [2, 2, 2, 2, 2, 2]);
  assert.equal(roleBulletCounts.reduce((total, count) => total + count, 0), 12);
});

test('built experience chapter uses the approved compact mobile layout', async () => {
  const [html, css] = await Promise.all([readHomepage(), readBuiltCss()]);
  const mobileCss = extractMaxWidthMediaBlocks(css, 639).join('\n');
  const narrowCss = extractMaxWidthMediaBlocks(css, 420).join('\n');
  const experienceChapter = html.match(
    /<section id="experience"[^>]*>[\s\S]*?<\/section>/,
  )?.[0] ?? '';

  assert.match(css, /scroll-padding-top:\s*calc\(var\(--nav-height\) \+ 1rem\)/);
  assert.match(
    mobileCss,
    /\.experience__header\[[^\]]+\]\s*\{\s*padding:\s*2\.75rem\s+1rem\s*\}/,
  );
  assert.match(
    mobileCss,
    /\.experience__header\[[^\]]+\]\s+h2\[[^\]]+\]\s*\{\s*font-size:\s*clamp\(2\.85rem,\s*14vw,\s*4\.75rem\)\}/,
  );
  assert.match(
    mobileCss,
    /\.experience__timeline\[[^\]]+\]\s*>\s*li\[[^\]]+\]\s*\{\s*display:\s*block;\s*padding-top:\s*1rem\s*\}/,
  );
  assert.match(
    mobileCss,
    /\.experience__index\[[^\]]+\]\s*\{[^}]*display:\s*inline-block[^}]*border:\s*var\(--rule\)[^}]*background:\s*var\(--yellow\)/,
  );
  assert.match(
    mobileCss,
    /\.experience__timeline\[[^\]]+\]\s+article\[[^\]]+\]\s*>\s*header\[[^\]]+\]\s*\{\s*flex-direction:\s*column;\s*gap:\s*\.4rem\s*\}/,
  );
  assert.match(
    mobileCss,
    /\.experience__timeline\[[^\]]+\]\s+ul\[[^\]]+\]\s*\{[^}]*font-size:\s*1rem[^}]*line-height:\s*1\.55[^}]*font-weight:\s*500/,
  );
  assert.match(
    mobileCss,
    /\.experience__credentials\[[^\]]+\]\s+ul\[[^\]]+\]\s*\{[^}]*padding:\s*0[^}]*list-style:\s*none/,
  );
  assert.match(
    mobileCss,
    /\.experience__credentials\[[^\]]+\]\s+li\[[^\]]+\]\s*\{[^}]*border:\s*2px\s+solid\s+var\(--ink\)/,
  );
  assert.match(
    mobileCss,
    /\.experience__credentials\[[^\]]+\]\s+img\[[^\]]+\]\s*\{\s*aspect-ratio:\s*3\s*\/\s*2\s*\}/,
  );
  assert.match(
    mobileCss,
    /\.experience__timeline\[[^\]]+\]\s+article\[[^\]]+\]\s*\{[^}]*width:\s*100%[^}]*padding:\s*1rem\s+1rem\s+1\.75rem/,
  );
  assert.match(
    mobileCss,
    /\.experience__tools\[[^\]]+\]\s*\{\s*overflow-wrap:\s*anywhere\s*\}/,
  );
  assert.doesNotMatch(
    narrowCss,
    /grid-template-columns:\s*3rem/,
  );
  assert.equal((experienceChapter.match(/class="experience__index"/g) ?? []).length, 6);
  assert.equal((experienceChapter.match(/class="experience__credentials"/g) ?? []).length, 1);
  assert.match(
    experienceChapter,
    /<p class="chapter__label"[^>]*>Selected tools<\/p>\s*<ul role="list"[^>]*>/,
  );
});

test('homepage renders the final issue architecture without legacy chapters', async () => {
  const html = await readHomepage();
  const main = html.match(/<main id="main-content"[^>]*>([\s\S]*?)<\/main>/)?.[1];

  assert.ok(main, 'homepage renders the main landmark');

  const chapterPositions = [
    main.indexOf('class="cover"'),
    main.indexOf('class="operating-range"'),
    main.indexOf('class="chapter-index"'),
    main.indexOf('<section id="work"'),
    main.indexOf('<section id="experience"'),
    main.indexOf('<section id="notes"'),
    main.indexOf('<section id="contact"'),
  ];

  assert.ok(
    chapterPositions.every((position) => position >= 0),
    'main contains the cover, operating range, chapter index, and four issue chapters',
  );
  assert.deepEqual(
    [...chapterPositions].sort((a, b) => a - b),
    chapterPositions,
    'homepage chapters retain the editorial reading order',
  );
  assert.match(html, /<header class="masthead"[^>]*>/);
  assert.match(html, /<footer class="footer"[^>]*>/);
  assert.match(html, /href="\/about\/"/);
  assert.doesNotMatch(html, /id="education"/);
  assert.doesNotMatch(html, /id="skills"/);
});

test('homepage source composes only the final homepage sections', async () => {
  const source = await readSource('src/pages/index.astro');

  assert.doesNotMatch(source, /components\/(?:About|Education|Skills)\.astro/);
  assert.match(
    source,
    /<Nav\s*\/>\s*<AnnouncementBanner\s*\/>\s*<main id="main-content"[^>]*>\s*<Hero\s*\/>\s*<OperatingRange\s*\/>\s*<ChapterIndex\s*\/>\s*<Projects\s*\/>\s*<Experience\s*\/>\s*<Notes\s*\/>\s*<Contact\s*\/>\s*<\/main>\s*<Footer\s*\/>/,
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

test('homepage publishes the temporary shared-document announcement before main', async () => {
  const html = await readHomepage();
  const banner = html.match(/<aside class="announcement"[\s\S]*?<\/aside>/)?.[0] ?? '';
  const mastheadPosition = html.indexOf('<header class="masthead"');
  const bannerPosition = html.indexOf('<aside class="announcement"');
  const mainPosition = html.indexOf('<main id="main-content"');

  assert.ok(mastheadPosition >= 0 && mastheadPosition < bannerPosition);
  assert.ok(bannerPosition < mainPosition);
  assert.match(banner, /aria-label="Shared documents"/);
  assert.match(banner, /data-announcement-expires-at="2026-09-04T09:27:00Z"/);
  assert.match(banner, /href="https:\/\/drive\.google\.com\/drive\/folders\/1SQIFiL1dMYHlsRJAZjIGK5RunMxWDTG7"/);
  assert.match(banner, /target="_blank"/);
  assert.match(banner, /rel="noopener noreferrer"/);
  assert.match(banner, /AI untuk Olympic, OFFO Living, dan Technohome/);
  assert.match(banner, /View all 4 PDFs/);
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
    { href: '/about/', label: 'About' },
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
