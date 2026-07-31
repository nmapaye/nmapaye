import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import { createFrameScheduler } from '../src/scripts/motion/scheduler.mjs';
import { assertValidModuleFixture, tokenizeJavaScript } from './motion-test-lexer.mjs';

function runtimeOwnershipViolations(name, source) {
  assertValidModuleFixture(source);
  const tokens = tokenizeJavaScript(source);
  const violations = [];
  if (hasNamedMemberReference(tokens, 'setInterval')) violations.push('setInterval');
  if (hasMemberReference(tokens, 'Math', 'random')) violations.push('Math.random');
  if (
    name !== 'scheduler.mjs' &&
    ['requestAnimationFrame', 'cancelAnimationFrame']
      .some((name) => hasNamedMemberReference(tokens, name))
  ) violations.push('frame API');
  if (
    [
      'pointer-effects.mjs',
      'marquee.mjs',
      'grid.mjs',
      'card-stack.mjs',
      'text-effects.mjs',
      'navigation-wipe.mjs',
    ].includes(name) &&
    (
      hasMemberReference(tokens, 'Date', 'now') ||
      hasMemberReference(tokens, 'performance', 'now')
    )
  ) violations.push('global clock');
  return violations;
}

function hasIdentifier(tokens, expected) {
  return tokens.some((token) => token.type === 'word' && token.value === expected);
}

function hasNamedMemberReference(tokens, property) {
  return hasIdentifier(tokens, property) || tokens.some((token, index) => (
    token.value === '[' &&
    tokens[index + 1]?.type === 'string' &&
    tokens[index + 1].value === property &&
    tokens[index + 2]?.value === ']'
  ));
}

function hasMemberReference(tokens, object, property) {
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].value === object && memberFollows(tokens, index, property)) return true;
    if (tokens[index].value !== '{') continue;
    const cursor = matchingBrace(tokens, index);
    if (
      cursor !== -1 &&
      rightHandIsObject(tokens, cursor, object) &&
      hasTopLevelDestructuredProperty(tokens, index + 1, cursor, property)
    ) {
      return true;
    }
  }
  return false;
}

function rightHandIsObject(tokens, closingBrace, object) {
  if (tokens[closingBrace + 1]?.value !== '=') return false;
  let cursor = closingBrace + 2;
  let parentheses = 0;
  while (tokens[cursor]?.value === '(') {
    parentheses += 1;
    cursor += 1;
  }
  if (tokens[cursor]?.value !== object) return false;
  cursor += 1;
  while (parentheses > 0) {
    if (tokens[cursor]?.value !== ')') return false;
    parentheses -= 1;
    cursor += 1;
  }
  return true;
}

function matchingBrace(tokens, start) {
  let depth = 1;
  for (let index = start + 1; index < tokens.length; index += 1) {
    if (tokens[index].value === '{') depth += 1;
    if (tokens[index].value === '}') depth -= 1;
    if (depth === 0) return index;
  }
  return -1;
}

function hasTopLevelDestructuredProperty(tokens, start, end, property) {
  let entryStart = start;
  let depth = 0;
  for (let index = start; index <= end; index += 1) {
    const token = tokens[index];
    if (index === end || (depth === 0 && token.value === ',')) {
      if (
        ['word', 'string'].includes(tokens[entryStart]?.type) &&
        tokens[entryStart].value === property
      ) {
        return true;
      }
      entryStart = index + 1;
    }
    if (token.value === '{' || token.value === '[' || token.value === '(') depth += 1;
    if (token.value === '}' || token.value === ']' || token.value === ')') depth -= 1;
  }
  return false;
}

function memberFollows(tokens, index, property) {
  let cursor = index + 1;
  while (tokens[cursor]?.value === ')') cursor += 1;
  if (tokens[cursor]?.value === '?') cursor += 1;
  if (tokens[cursor]?.value === '.') {
    return tokens[cursor + 1]?.value === property;
  }
  return (
    tokens[cursor]?.value === '[' &&
    tokens[cursor + 1]?.type === 'string' &&
    tokens[cursor + 1].value === property &&
    tokens[cursor + 2]?.value === ']'
  );
}

test('runtime ownership scan catches references while ignoring comments and literals', () => {
  for (const { title, source, violation } of [
    { title: 'direct interval', source: 'setInterval;', violation: 'setInterval' },
    { title: 'aliased interval', source: 'const later = setInterval;', violation: 'setInterval' },
    { title: 'destructured interval', source: 'const { setInterval: later } = globalThis;', violation: 'setInterval' },
    { title: 'direct randomness', source: 'Math.random;', violation: 'Math.random' },
    { title: 'aliased randomness', source: 'const choose = Math.random;', violation: 'Math.random' },
    { title: 'destructured randomness', source: 'const { random: choose } = Math;', violation: 'Math.random' },
    { title: 'direct frame API', source: 'requestAnimationFrame;', violation: 'frame API' },
    { title: 'aliased frame API', source: 'const frame = cancelAnimationFrame;', violation: 'frame API' },
    { title: 'destructured frame API', source: 'const { requestAnimationFrame: frame } = window;', violation: 'frame API' },
    { title: 'direct clock', source: 'Date.now;', violation: 'global clock' },
    { title: 'aliased clock', source: 'const now = performance.now;', violation: 'global clock' },
    { title: 'destructured clock', source: 'const { now: later } = Date;', violation: 'global clock' },
  ]) {
    assert.ok(
      runtimeOwnershipViolations('pointer-effects.mjs', source).includes(violation),
      `scanner misses ${title}`,
    );
  }
  assert.deepEqual(
    runtimeOwnershipViolations(
      'marquee.mjs',
      '// requestAnimationFrame; Math.random();\nconst literal = "cancelAnimationFrame Date.now setInterval";',
    ),
    [],
  );
});

test('runtime ownership scan handles expressions and valid member syntax without crossing declarations', () => {
  for (const { title, source, violation } of [
    { title: 'template randomness', source: '`${Math.random}`', violation: 'Math.random' },
    { title: 'template interval', source: '`${setInterval}`', violation: 'setInterval' },
    { title: 'optional randomness', source: 'Math?.random', violation: 'Math.random' },
    { title: 'parenthesized randomness', source: '(Math).random', violation: 'Math.random' },
    { title: 'optional clock', source: 'Date?.now', violation: 'global clock' },
    { title: 'bracket clock', source: 'performance["now"]', violation: 'global clock' },
    { title: 'optional frame API', source: 'window?.requestAnimationFrame', violation: 'frame API' },
    { title: 'bracket frame API', source: 'window["cancelAnimationFrame"]', violation: 'frame API' },
    { title: 'bracket interval', source: 'globalThis["setInterval"]', violation: 'setInterval' },
  ]) {
    assert.ok(
      runtimeOwnershipViolations('pointer-effects.mjs', source).includes(violation),
      `scanner misses ${title}`,
    );
  }
  assert.deepEqual(
    runtimeOwnershipViolations(
      'pointer-effects.mjs',
      'const { random } = source\nconst value = Math',
    ),
    [],
    'destructuring must not scan across an omitted semicolon',
  );
  assert.deepEqual(
    runtimeOwnershipViolations(
      'pointer-effects.mjs',
      '/Math.random Date.now requestAnimationFrame setInterval/',
    ),
    [],
    'regex literals must not create runtime ownership violations',
  );
});

test('runtime ownership scan ignores regexes after expression-prefix keywords', () => {
  const source = [
    'function returned(){ return /Math.random setInterval/giu; }',
    'function thrown(){ throw /Date.now requestAnimationFrame/; }',
    'switch (value) { case /performance.now cancelAnimationFrame/: break; }',
    'function* yielded(){ yield /Math.random/; }',
    'async function awaited(){ await /setInterval/; }',
    'const prefixed = typeof /Date.now/;',
    'const classified = void /[\\/]Math.random\\//gim;',
    'const quotient = value / Math.random / 2;',
  ].join('\n');

  assert.deepEqual(runtimeOwnershipViolations('pointer-effects.mjs', source), ['Math.random']);
});

test('runtime ownership scan resets expression context at tagged template interpolations', () => {
  assert.deepEqual(
    runtimeOwnershipViolations('pointer-effects.mjs', 'const tagged = tag`${/Date\\.now/}`;'),
    [],
  );
  assert.deepEqual(
    runtimeOwnershipViolations('pointer-effects.mjs', 'const tagged = tag`${/Math\\.random/.test(value), Math.random}`;'),
    ['Math.random'],
  );
});

test('runtime ownership scan ignores regex literals after default and extends', () => {
  const source = [
    'export default /Math\\.random/;',
    'class C extends /Date\\.now/.constructor {}',
  ].join('\n');

  assert.deepEqual(runtimeOwnershipViolations('pointer-effects.mjs', source), []);
});

test('runtime ownership scan recognizes division after property-named extends', () => {
  const source = 'object.extends / Math.random / 2;';

  assert.deepEqual(runtimeOwnershipViolations('pointer-effects.mjs', source), ['Math.random']);
});

test('runtime ownership scan selects only top-level destructured property keys', () => {
  for (const source of [
    'const { value: random } = Math;',
    'const { nested: { random } } = Math;',
    'const { value = random } = Math;',
    'const { [key]: random } = Math;',
    'const { nested = { random } } = Math;',
  ]) {
    assert.deepEqual(runtimeOwnershipViolations('pointer-effects.mjs', source), [], source);
  }
  for (const source of [
    'const { random } = Math;',
    'const { random: renamed } = Math;',
    'const { random = fallback } = Math;',
    'const { "random": choose } = Math;',
    "const { 'random': choose } = Math;",
    'const { random } = (Math);',
  ]) {
    assert.deepEqual(runtimeOwnershipViolations('pointer-effects.mjs', source), ['Math.random'], source);
  }
});

test('coalesces controllers into one frame and stops when idle', () => {
  const frames = [];
  const scheduler = createFrameScheduler({
    requestFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame() {},
    onError(error) {
      throw error;
    },
    maxDelta: 50,
  });
  const timestamps = [];
  const controller = {
    update(timestamp) {
      timestamps.push(timestamp);
      return false;
    },
  };

  scheduler.request(controller);
  scheduler.request(controller);
  assert.equal(frames.length, 1);

  frames.shift()(16);
  assert.deepEqual(timestamps, [16]);
  assert.deepEqual(scheduler.snapshot(), {
    pending: false,
    active: 0,
    suspended: false,
  });
});

test('caps restored-frame time and cancels every active controller', () => {
  const frames = [];
  const scheduler = createFrameScheduler({
    requestFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame() {},
    onError(error) {
      throw error;
    },
    maxDelta: 50,
  });
  const seen = [];
  const controller = {
    update(timestamp) {
      seen.push(timestamp);
      return seen.length < 2;
    },
  };

  scheduler.request(controller);
  frames.shift()(10);
  frames.shift()(5010);
  assert.deepEqual(seen, [10, 60]);
  scheduler.cancelAll();
  assert.equal(scheduler.snapshot().active, 0);
});

test('suspend and resume preserve virtual time without a restoration jump', () => {
  const frames = new Map();
  let nextId = 0;
  const flush = (timestamp) => {
    const [id, callback] = frames.entries().next().value;
    frames.delete(id);
    callback(timestamp);
  };
  const scheduler = createFrameScheduler({
    requestFrame(callback) {
      nextId += 1;
      frames.set(nextId, callback);
      return nextId;
    },
    cancelFrame(id) {
      frames.delete(id);
    },
  });
  const seen = [];
  const controller = {
    update(timestamp) {
      seen.push(timestamp);
      return seen.length < 3;
    },
  };

  scheduler.request(controller);
  flush(100);
  scheduler.suspend();
  scheduler.resume();
  flush(10_000);
  flush(10_016);

  assert.deepEqual(seen, [100, 100, 116]);
});

test('maps an idle event timestamp onto the next scheduler frame', () => {
  const frames = [];
  const scheduler = createFrameScheduler({
    requestFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame() {},
  });
  scheduler.request({ update() { return false; } });
  frames.shift()(100);

  const startedAt = scheduler.now(250);
  const elapsed = [];
  scheduler.request({
    update(timestamp) {
      elapsed.push(timestamp - startedAt);
      return false;
    },
  });
  frames.shift()(266);
  assert.deepEqual(elapsed, [16]);
});

test('motion sources have one frame owner and no global randomness or intervals', async () => {
  const directory = new URL('../src/scripts/motion/', import.meta.url);
  const names = (await readdir(directory)).filter((name) => name.endsWith('.mjs'));
  const sources = new Map(
    await Promise.all(names.map(async (name) => [
      name,
      await readFile(new URL(name, directory), 'utf8'),
    ])),
  );
  for (const [name, source] of sources) {
    assert.deepEqual(
      runtimeOwnershipViolations(name, source),
      [],
      `${name} has forbidden runtime ownership`,
    );
  }
});
