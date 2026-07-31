import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import { createFrameScheduler } from '../src/scripts/motion/scheduler.mjs';

function runtimeOwnershipViolations(name, source) {
  const tokens = codeTokens(source);
  const violations = [];
  if (hasIdentifier(tokens, 'setInterval')) violations.push('setInterval');
  if (hasMemberReference(tokens, 'Math', 'random')) violations.push('Math.random');
  if (
    name !== 'scheduler.mjs' &&
    ['requestAnimationFrame', 'cancelAnimationFrame']
      .some((name) => hasIdentifier(tokens, name))
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

function codeTokens(source) {
  const tokens = [];
  for (let index = 0; index < source.length;) {
    const character = source[index];
    if (/\s/.test(character)) {
      index += 1;
    } else if (source.startsWith('//', index)) {
      index = source.indexOf('\n', index + 2);
      if (index === -1) break;
    } else if (source.startsWith('/*', index)) {
      index = source.indexOf('*/', index + 2);
      if (index === -1) break;
      index += 2;
    } else if (character === '"' || character === "'" || character === '`') {
      const quote = character;
      index += 1;
      while (index < source.length && source[index] !== quote) {
        index += source[index] === '\\' ? 2 : 1;
      }
      index += 1;
    } else if (/[A-Za-z_$]/.test(character)) {
      const start = index;
      while (/[\w$]/.test(source[index] ?? '')) index += 1;
      tokens.push({ type: 'word', value: source.slice(start, index) });
    } else {
      tokens.push({ type: 'punctuation', value: character });
      index += 1;
    }
  }
  return tokens;
}

function hasIdentifier(tokens, expected) {
  return tokens.some((token) => token.type === 'word' && token.value === expected);
}

function hasMemberReference(tokens, object, property) {
  for (let index = 0; index < tokens.length; index += 1) {
    if (
      tokens[index].value === object &&
      tokens[index + 1]?.value === '.' &&
      tokens[index + 2]?.value === property
    ) return true;
    if (tokens[index].value !== object || tokens[index - 1]?.value !== '=') continue;
    for (let cursor = index - 2; cursor >= 0; cursor -= 1) {
      if (tokens[cursor].value === ';') break;
      if (tokens[cursor].value === '{') {
        if (tokens.slice(cursor + 1, index - 1).some((token) => token.value === property)) {
          return true;
        }
        break;
      }
    }
  }
  return false;
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
