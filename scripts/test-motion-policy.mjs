import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveMotionPolicy,
  observeMotionPolicy,
} from '../src/scripts/motion/policy.mjs';

test('reduced motion and hidden pages disable every animated capability', () => {
  assert.deepEqual(
    deriveMotionPolicy({
      reducedMotion: true,
      finePointer: true,
      hidden: false,
      supportsBlend: true,
      supports3d: true,
      supportsPointer: true,
      supportsPointerCapture: true,
      forcedColors: false,
    }),
    {
      navigationActive: false,
      motionAllowed: false,
      finePointerEffects: false,
      blendAllowed: false,
      perspectiveAllowed: false,
      pointerAllowed: true,
      pointerCaptureAllowed: true,
      reducedMotion: true,
      hidden: false,
      forcedColors: false,
    },
  );
});

function createSignalAwareTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, callback, options = {}) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
      options.signal?.addEventListener('abort', () => {
        listeners.get(type)?.delete(callback);
      }, { once: true });
    },
    emit(type) {
      for (const callback of listeners.get(type) ?? []) callback();
    },
  };
}

function createMediaQuery(matches, { legacy = false } = {}) {
  const target = createSignalAwareTarget();
  const listeners = new Set();
  return {
    matches,
    addEventListener: legacy ? undefined : target.addEventListener,
    addListener: legacy ? (callback) => listeners.add(callback) : undefined,
    removeListener: legacy ? (callback) => listeners.delete(callback) : undefined,
    set(next) {
      this.matches = next;
      target.emit('change');
      for (const callback of listeners) callback();
    },
    listenerCount() {
      return listeners.size;
    },
  };
}

test('observes media and visibility changes synchronously and removes legacy listeners on abort', () => {
  const reduced = createMediaQuery(false);
  const fine = createMediaQuery(true);
  const forced = createMediaQuery(false, { legacy: true });
  const document = createSignalAwareTarget();
  document.hidden = false;
  const queries = new Map([
    ['(prefers-reduced-motion: reduce)', reduced],
    ['(hover: hover) and (pointer: fine)', fine],
    ['(forced-colors: active)', forced],
  ]);
  const window = {
    matchMedia(value) { return queries.get(value); },
    CSS: { supports() { return true; } },
    PointerEvent: class PointerEvent {},
    Element: { prototype: { setPointerCapture() {} } },
  };
  const abortController = new AbortController();
  const received = [];

  const observer = observeMotionPolicy({
    window,
    document,
    signal: abortController.signal,
    onChange(policy) { received.push(policy); },
  });

  assert.equal(received.length, 1);
  assert.equal(observer.current.motionAllowed, true);
  reduced.set(true);
  fine.set(false);
  document.hidden = true;
  document.emit('visibilitychange');
  assert.deepEqual(received.map((policy) => policy.motionAllowed), [true, false, false, false]);
  assert.equal(forced.listenerCount(), 1);
  abortController.abort();
  assert.equal(forced.listenerCount(), 0);
  reduced.set(false);
  document.hidden = false;
  document.emit('visibilitychange');
  assert.equal(received.length, 4);
});

test('refresh updates reduced-motion policy without scheduling work', () => {
  const reduced = createMediaQuery(true);
  const inert = createMediaQuery(false);
  let scheduled = 0;
  const observer = observeMotionPolicy({
    window: {
      matchMedia(value) {
        return value === '(prefers-reduced-motion: reduce)' ? reduced : inert;
      },
    },
    document: { hidden: false },
    onChange() { scheduled += 0; },
  });

  reduced.matches = false;
  assert.equal(observer.refresh().motionAllowed, true);
  assert.equal(scheduled, 0);
});
