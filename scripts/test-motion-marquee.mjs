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
    'listener:resize',
    'listener:orientationchange',
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

class MarqueeEventTarget {
  constructor() {
    this.handlers = new Map();
  }

  addEventListener(type, listener, options = {}) {
    if (options.signal?.aborted) return;
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(listener);
    options.signal?.addEventListener('abort', () => {
      this.handlers.get(type)?.delete(listener);
    }, { once: true });
  }

  dispatch(type, event = {}) {
    for (const listener of [...(this.handlers.get(type) ?? [])]) {
      listener({ type, ...event });
    }
  }
}

function createMountedMarqueeHarness({ trackWidth = 400 } = {}) {
  let clock = 0;
  const browserWindow = new MarqueeEventTarget();
  browserWindow.scrollY = 0;
  const tracks = [
    { scrollWidth: trackWidth },
    { scrollWidth: trackWidth },
  ];
  const hero = {};
  const element = {
    attrs: new Map(),
    style: {
      values: new Map(),
      setProperty(key, value) { this.values.set(key, value); },
      removeProperty(key) { this.values.delete(key); },
      getPropertyValue(key) { return this.values.get(key) ?? ''; },
    },
    setAttribute(name, value = '') { this.attrs.set(name, value); },
    removeAttribute(name) { this.attrs.delete(name); },
    closest(selector) { return selector === '[data-motion-hero]' ? hero : null; },
    querySelectorAll(selector) {
      return selector === '[data-motion-marquee-track]' ? tracks : [];
    },
  };
  const requested = new Set();
  const scheduler = {
    request(controller) { requested.add(controller); },
    cancel(controller) { requested.delete(controller); },
    now(timestamp) { return timestamp; },
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
    clock: () => clock,
    policy: { motionAllowed: true, forcedColors: false },
    signal: new AbortController().signal,
    scheduler,
    observerFactory: () => null,
  };
  const controller = mountMarquee(context);
  return {
    browserWindow,
    context,
    controller,
    element,
    requested,
    setClock(value) { clock = value; },
    tracks,
  };
}

function marqueeX(harness) {
  return Number(
    harness.element.style.getPropertyValue('--motion-marquee-x').replace('px', ''),
  );
}

test('mounted marquee stops no later than 250ms after the scroll event', () => {
  const harness = createMountedMarqueeHarness();
  harness.browserWindow.scrollY = 100;
  harness.browserWindow.dispatch('scroll');

  for (let timestamp = 16; timestamp < 250; timestamp += 16) {
    harness.setClock(timestamp);
    harness.controller.update(timestamp);
  }

  harness.setClock(250);
  assert.equal(harness.controller.update(250), false);
});

test('mounted marquee uses event time rather than capped frame time for its 250ms deadline', () => {
  const harness = createMountedMarqueeHarness();
  harness.browserWindow.scrollY = 100;
  harness.browserWindow.dispatch('scroll');

  harness.setClock(500);
  assert.equal(
    harness.controller.update(50),
    false,
    'a stalled frame cannot extend motion beyond the input deadline',
  );
});

test('mounted marquee restarts after natural idle without inheriting its old frame baseline', () => {
  const harness = createMountedMarqueeHarness();
  harness.browserWindow.scrollY = 100;
  harness.browserWindow.dispatch('scroll');

  let active = true;
  for (let timestamp = 16; active && timestamp <= 400; timestamp += 16) {
    active = harness.controller.update(timestamp);
  }
  assert.equal(active, false, 'first scroll session reaches natural idle');
  const settledX = marqueeX(harness);

  harness.setClock(2000);
  harness.browserWindow.scrollY = 200;
  harness.browserWindow.dispatch('scroll');
  assert.equal(harness.controller.update(2016), true);
  assert.ok(
    Math.abs(marqueeX(harness) - settledX) >= 1,
    'the later scroll produces visible movement',
  );
});

test('resize and orientation changes refresh the live marquee wrap span without scheduling work', () => {
  const harness = createMountedMarqueeHarness();
  harness.browserWindow.scrollY = 100;
  harness.browserWindow.dispatch('scroll');

  let active = true;
  for (let timestamp = 16; active && timestamp <= 400; timestamp += 16) {
    active = harness.controller.update(timestamp);
  }
  assert.equal(active, false);
  harness.context.scheduler.cancel(harness.controller);

  harness.tracks[0].scrollWidth = 50;
  harness.tracks[1].scrollWidth = 50;
  harness.browserWindow.dispatch('resize');
  assert.ok(marqueeX(harness) <= 0 && marqueeX(harness) > -50);
  assert.equal(harness.requested.size, 0);

  harness.tracks[0].scrollWidth = 20;
  harness.tracks[1].scrollWidth = 20;
  harness.browserWindow.dispatch('orientationchange');
  assert.ok(marqueeX(harness) <= 0 && marqueeX(harness) > -20);
  assert.equal(harness.requested.size, 0);
});

test('direct destroy removes marquee-owned listeners before later events can restart it', () => {
  const harness = createMountedMarqueeHarness();
  harness.browserWindow.scrollY = 100;
  harness.browserWindow.dispatch('scroll');
  harness.controller.update(16);
  harness.controller.destroy();

  assert.equal(harness.requested.size, 0);
  assert.equal(harness.element.attrs.has('data-motion-enhanced'), false);
  assert.equal(harness.element.style.getPropertyValue('--motion-marquee-x'), '');

  harness.setClock(1000);
  harness.browserWindow.scrollY = 200;
  harness.browserWindow.dispatch('scroll');
  harness.tracks[0].scrollWidth = 50;
  harness.browserWindow.dispatch('resize');

  assert.equal(harness.requested.size, 0);
  assert.equal(harness.element.style.getPropertyValue('--motion-marquee-x'), '');
});
