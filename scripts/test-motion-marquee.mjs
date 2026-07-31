import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceMarquee,
  createMarqueeState,
  mountMarquee,
  sampleScroll,
} from '../src/scripts/motion/marquee.mjs';

test('signed scroll velocity accelerates and reverses the marquee', () => {
  let state = createMarqueeState({ scrollY: 100, timestamp: 0 });
  state = sampleScroll(state, { scrollY: 220, timestamp: 40 }, {
    impulse: 12,
    maxVelocity: 40,
  });
  assert.ok(state.velocity > 0);
  state = sampleScroll(state, { scrollY: 120, timestamp: 80 }, {
    impulse: 12,
    maxVelocity: 40,
  });
  assert.ok(state.velocity < 0);
});

test('marquee reaches zero no later than 250ms after input', () => {
  let state = { ...createMarqueeState({ scrollY: 0, timestamp: 0 }), velocity: 30 };
  for (let elapsed = 0; elapsed < 250; elapsed += 25) {
    state = advanceMarquee(state, 25, { decay: 0.58, stopVelocity: 0.25 });
  }
  assert.equal(state.velocity, 0);
  assert.equal(state.active, false);
});

test('marquee position remains inside one repeated-track span', () => {
  const state = advanceMarquee(
    { ...createMarqueeState(), position: 95, velocity: 20, active: true },
    16,
    { decay: 1, stopVelocity: 0.01, wrapSpan: 100 },
  );
  assert.ok(state.position >= 0 && state.position < 100);
});

test('marquee enhancement follows valid dimensions, observer, and scroll listener setup', () => {
  const sequence = [];
  const hero = {};
  const tracks = [{ scrollWidth: 400 }, { scrollWidth: 400 }];
  const element = {
    attrs: new Map(),
    style: {
      setProperty() {},
      removeProperty() {},
    },
    setAttribute(name, value = '') {
      sequence.push(`attribute:${name}`);
      this.attrs.set(name, value);
    },
    removeAttribute(name) { this.attrs.delete(name); },
    closest(selector) { return selector === '[data-motion-hero]' ? hero : null; },
    querySelectorAll(selector) {
      return selector === '[data-motion-marquee-track]' ? tracks : [];
    },
  };
  const browserWindow = {
    scrollY: 0,
    addEventListener(type) { sequence.push(`listener:${type}`); },
  };
  const context = {
    root: {
      ownerDocument: {
        defaultView: browserWindow,
        querySelector(selector) {
          return selector === '[data-motion-marquee]' ? element : null;
        },
      },
    },
    clock: () => 10,
    policy: { motionAllowed: true, forcedColors: false },
    signal: new AbortController().signal,
    scheduler: { request() {}, cancel() {} },
    observerFactory() {
      sequence.push('observer');
      return { observe() {}, disconnect() {} };
    },
  };

  const controller = mountMarquee(context);

  assert.ok(controller);
  assert.deepEqual(sequence, [
    'observer',
    'listener:scroll',
    'attribute:data-motion-enhanced',
  ]);
});

test('zero-width marquee remains an unenhanced semantic fallback', () => {
  let observerCreated = false;
  let listenerAdded = false;
  const hero = {};
  const tracks = [{ scrollWidth: 0 }, { scrollWidth: 0 }];
  const element = {
    attrs: new Map(),
    style: { setProperty() {}, removeProperty() {} },
    setAttribute(name, value = '') { this.attrs.set(name, value); },
    removeAttribute(name) { this.attrs.delete(name); },
    closest(selector) { return selector === '[data-motion-hero]' ? hero : null; },
    querySelectorAll(selector) {
      return selector === '[data-motion-marquee-track]' ? tracks : [];
    },
  };
  const browserWindow = {
    scrollY: 0,
    addEventListener() { listenerAdded = true; },
  };
  const context = {
    root: {
      ownerDocument: {
        defaultView: browserWindow,
        querySelector(selector) {
          return selector === '[data-motion-marquee]' ? element : null;
        },
      },
    },
    clock: () => 10,
    policy: { motionAllowed: true, forcedColors: false },
    signal: new AbortController().signal,
    scheduler: { request() {}, cancel() {} },
    observerFactory() {
      observerCreated = true;
      return { observe() {}, disconnect() {} };
    },
  };

  assert.equal(mountMarquee(context), null);
  assert.equal(element.attrs.has('data-motion-enhanced'), false);
  assert.equal(observerCreated, false);
  assert.equal(listenerAdded, false);
});

test('offscreen marquee ignores scroll, resumes onscreen, and cancels immediately', () => {
  const handlers = new Map();
  const requested = new Set();
  let observer;
  const hero = { matches: (selector) => selector === '[data-motion-hero]' };
  const tracks = [{ scrollWidth: 400 }, { scrollWidth: 400 }];
  const element = {
    attrs: new Map(),
    style: {
      values: new Map(),
      setProperty(key, value) { this.values.set(key, value); },
      removeProperty(key) { this.values.delete(key); },
    },
    setAttribute(name, value = '') { this.attrs.set(name, value); },
    removeAttribute(name) { this.attrs.delete(name); },
    closest(selector) { return selector === '[data-motion-hero]' ? hero : null; },
    querySelectorAll(selector) {
      return selector === '[data-motion-marquee-track]' ? tracks : [];
    },
  };
  const browserWindow = {
    scrollY: 0,
    addEventListener(type, listener) { handlers.set(type, listener); },
  };
  const document = {
    defaultView: browserWindow,
    querySelector(selector) { return selector === '[data-motion-marquee]' ? element : null; },
  };
  const context = {
    root: { ownerDocument: document },
    clock: () => 10,
    policy: { motionAllowed: true, forcedColors: false },
    signal: new AbortController().signal,
    scheduler: {
      request(controller) { requested.add(controller); },
      cancel(controller) { requested.delete(controller); },
    },
    observerFactory(callback) {
      observer = {
        observe() {},
        disconnect() {},
        emit(entries) { callback(entries); },
      };
      return observer;
    },
  };

  const controller = mountMarquee(context);
  observer.emit([{ isIntersecting: false }]);
  browserWindow.scrollY = 120;
  handlers.get('scroll')();
  assert.equal(requested.size, 0);

  observer.emit([{ isIntersecting: true }]);
  handlers.get('scroll')();
  assert.equal(requested.size, 1);

  observer.emit([{ isIntersecting: false }]);
  assert.equal(requested.size, 0);
  assert.ok(controller);
});
