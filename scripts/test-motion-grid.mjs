import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceGrid,
  createGridState,
  layoutGridTiles,
  mountGrid,
  reduceGrid,
} from '../src/scripts/motion/grid.mjs';
import { createInteractionCoordinator } from '../src/scripts/motion/index.mjs';
import { createFrameScheduler } from '../src/scripts/motion/scheduler.mjs';

test('starts at eight pixels and pointercancel removes ownership and inertia', () => {
  let state = createGridState({ tileCount: 16, width: 1200, height: 700 });
  state = reduceGrid(state, {
    type: 'pointerdown', pointerId: 4, pointerType: 'mouse',
    x: 0, y: 0, timestamp: 0,
  }, { threshold: 8 });
  state = reduceGrid(state, {
    type: 'pointermove', pointerId: 4, x: 7, y: 0, timestamp: 10,
  }, { threshold: 8 });
  assert.equal(state.dragging, false);
  state = reduceGrid(state, {
    type: 'pointermove', pointerId: 4, x: 8, y: 0, timestamp: 20,
  }, { threshold: 8 });
  assert.equal(state.dragging, true);
  const stillOwned = reduceGrid(
    state,
    { type: 'pointerup', pointerId: 99 },
    { motionAllowed: true },
  );
  assert.equal(stillOwned.pointerId, 4);
  state = reduceGrid(state, { type: 'pointercancel', pointerId: 4 }, { threshold: 8 });
  assert.equal(state.pointerId, null);
  assert.equal(state.inertia.active, false);
});

test('wraps continuously and flags a seam bounce', () => {
  let state = createGridState({ tileCount: 16, width: 100, height: 100 });
  state = { ...state, x: 95, velocityX: 20, inertia: { active: true } };
  state = advanceGrid(state, 16, { damping: 1, stopVelocity: 0.01 });
  assert.ok(state.x >= 0 && state.x < 100);
  assert.equal(state.seamX, true);
});

test('Home resets and reduced motion never starts inertia', () => {
  let state = createGridState({ tileCount: 16, width: 1000, height: 600 });
  state = { ...state, x: 300, y: 100 };
  state = reduceGrid(state, { type: 'key', key: 'Home' }, { keyboardStep: 80 });
  assert.equal(state.x, 0);
  assert.equal(state.y, 0);
  state = reduceGrid(state, { type: 'policy', motionAllowed: false }, {});
  assert.equal(state.inertia.active, false);
});

test('touch threshold is horizontal and recycled tiles cross opposite seams', () => {
  let state = createGridState({ tileCount: 16, width: 100, height: 100 });
  state = reduceGrid(state, {
    type: 'pointerdown', pointerId: 2, pointerType: 'touch',
    x: 0, y: 0, timestamp: 0,
  }, { threshold: 8 });
  state = reduceGrid(state, {
    type: 'pointermove', pointerId: 2, pointerType: 'touch',
    x: 2, y: 40, timestamp: 16,
  }, { threshold: 8 });
  assert.equal(state.dragging, false);
  state = { ...state, x: 10, y: 10 };
  const tiles = layoutGridTiles(state, { columns: 4, rows: 4 });
  assert.deepEqual(
    [...new Set(tiles.slice(0, 4).map((tile) => tile.x))].sort((a, b) => a - b),
    [-15, 10, 35, 60],
  );
  const xIntervals = [...new Set(tiles.slice(0, 4).map((tile) => tile.x))]
    .sort((a, b) => a - b);
  assert.ok(xIntervals[0] <= 0);
  assert.ok(xIntervals.at(-1) + 50 >= state.width);
  assert.ok(
    xIntervals.slice(1).every((value, index) => value - xIntervals[index] <= 50),
  );
});

test('a new pointer clears stale velocity before a stationary release', () => {
  let state = {
    ...createGridState({ tileCount: 16, width: 100, height: 100 }),
    velocityX: 12,
    velocityY: -6,
    inertia: { active: true },
  };
  state = reduceGrid(state, {
    type: 'pointerdown', pointerId: 4, pointerType: 'mouse',
    x: 0, y: 0, timestamp: 0,
  }, { threshold: 8 });
  assert.equal(state.velocityX, 0);
  assert.equal(state.velocityY, 0);
  state = reduceGrid(state, { type: 'pointerup', pointerId: 4 }, { motionAllowed: true });
  assert.equal(state.inertia.active, false);
});

class FakeEventTarget {
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

class FakeNode extends FakeEventTarget {
  constructor({ attrs = {}, parent = null, rect = {} } = {}) {
    super();
    this.attrs = new Map(Object.entries(attrs));
    this.parent = parent;
    this.children = [];
    this.rect = { top: 0, bottom: 300, left: 0, width: 400, height: 300, ...rect };
    this.captures = new Set();
    this.captureLog = [];
    this.toggleLog = [];
    this.style = {
      values: new Map(),
      setProperty: (key, value) => this.style.values.set(key, value),
      removeProperty: (key) => this.style.values.delete(key),
    };
  }

  append(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  querySelectorAll(selector) {
    if (selector === '[data-motion-grid-tile]') {
      return this.children.filter((child) => child.attrs.has('data-motion-grid-tile'));
    }
    return [];
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (selector === '[data-motion-showcase]' && current.attrs.has('data-motion-showcase')) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  getBoundingClientRect() {
    return this.rect;
  }

  hasPointerCapture(pointerId) {
    return this.captures.has(pointerId);
  }

  setPointerCapture(pointerId) {
    this.captures.add(pointerId);
    this.captureLog.push(['set', pointerId]);
  }

  releasePointerCapture(pointerId) {
    this.captures.delete(pointerId);
    this.captureLog.push(['release', pointerId]);
  }

  setAttribute(name, value = '') { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  removeAttribute(name) { this.attrs.delete(name); }
  toggleAttribute(name, enabled) {
    this.toggleLog.push([name, enabled]);
    if (enabled) this.attrs.set(name, '');
    else this.attrs.delete(name);
  }
  set tabIndex(value) { this.attrs.set('tabindex', String(value)); }
}

function createGridHarness({
  observer = true,
  resize = false,
  motionAllowed = true,
  scheduler: suppliedScheduler,
} = {}) {
  const document = new FakeEventTarget();
  const browserWindow = new FakeEventTarget();
  browserWindow.innerHeight = 900;
  document.defaultView = browserWindow;
  const showcase = new FakeNode({ attrs: { 'data-motion-showcase': '' } });
  const element = showcase.append(new FakeNode({ attrs: { 'data-motion-grid': '', 'aria-hidden': 'true' } }));
  element.ownerDocument = document;
  for (let index = 0; index < 16; index += 1) {
    element.append(new FakeNode({ attrs: { 'data-motion-grid-tile': String(index) } }));
  }
  document.querySelector = (selector) => selector === '[data-motion-grid]' ? element : null;
  const requested = new Set();
  const scheduler = suppliedScheduler ?? {
    request(controller) { requested.add(controller); },
    cancel(controller) { requested.delete(controller); },
  };
  let intersectionObserver;
  let resizeObserver;
  const context = {
    root: { ownerDocument: document },
    signal: new AbortController().signal,
    policy: { motionAllowed, pointerCaptureAllowed: true },
    scheduler,
    coordinator: createInteractionCoordinator(),
    observerFactory: observer ? (callback) => {
      intersectionObserver = {
        observe() {}, disconnect() {}, emit(entries) { callback(entries); },
      };
      return intersectionObserver;
    } : () => null,
    resizeObserverFactory: resize ? (callback) => {
      resizeObserver = {
        observe() {}, disconnect() {}, emit(entries) { callback(entries); },
      };
      return resizeObserver;
    } : undefined,
  };
  const controller = mountGrid(context);
  return {
    browserWindow, context, controller, document, element, intersectionObserver,
    resizeObserver, requested, showcase,
  };
}

function drag(harness, pointerId = 4, timestamp = 0) {
  harness.element.dispatch('pointerdown', {
    pointerId, pointerType: 'mouse', clientX: 0, clientY: 0, timeStamp: timestamp,
  });
  harness.element.dispatch('pointermove', {
    pointerId, pointerType: 'mouse', clientX: 8, clientY: 0, timeStamp: timestamp + 16,
  });
}

function createTestScheduler() {
  const callbacks = new Map();
  let nextId = 0;
  return {
    scheduler: createFrameScheduler({
      requestFrame(callback) {
        const id = ++nextId;
        callbacks.set(id, callback);
        return id;
      },
      cancelFrame(id) { callbacks.delete(id); },
    }),
    frame(timestamp) {
      const [id, callback] = callbacks.entries().next().value ?? [];
      assert.notEqual(callback, undefined, 'expected a scheduled frame');
      callbacks.delete(id);
      callback(timestamp);
    },
  };
}

function tileX(harness) {
  return Number(harness.element.children[0].style.values.get('--tile-x').replace('px', ''));
}

test('mount enhances after initialization and every cancellation path releases one captured pointer', () => {
  for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    const harness = createGridHarness();
    assert.equal(harness.element.getAttribute('aria-hidden'), null);
    assert.equal(harness.element.getAttribute('tabindex'), '0');
    drag(harness);
    harness.element.dispatch(ending, { pointerId: 4 });
    assert.equal(harness.element.hasPointerCapture(4), false, ending);
    assert.equal(harness.context.coordinator.owner, ending === 'pointerup' ? 'grid-inertia' : null, ending);
  }
});

test('enhancement exposes only the grid region while recycled tile visuals stay hidden through cleanup', () => {
  const harness = createGridHarness();
  assert.equal(harness.element.getAttribute('aria-hidden'), null);
  assert.equal(harness.element.getAttribute('role'), 'region');
  assert.equal(harness.element.getAttribute('tabindex'), '0');
  assert.equal(harness.element.getAttribute('aria-describedby'), 'project-grid-instructions');
  for (const tile of harness.element.querySelectorAll('[data-motion-grid-tile]')) {
    assert.equal(tile.getAttribute('aria-hidden'), 'true');
  }

  harness.controller.destroy();

  assert.equal(harness.element.getAttribute('aria-hidden'), 'true');
  assert.equal(harness.element.getAttribute('role'), null);
  assert.equal(harness.element.getAttribute('tabindex'), null);
  assert.equal(harness.element.getAttribute('aria-describedby'), null);
  for (const tile of harness.element.querySelectorAll('[data-motion-grid-tile]')) {
    assert.equal(tile.getAttribute('aria-hidden'), 'true');
  }
});

test('document end, window blur, policy and destroy converge on synchronous grid cleanup', () => {
  for (const ending of ['pointerup', 'pointercancel', 'blur', 'policy', 'destroy']) {
    const harness = createGridHarness();
    drag(harness);
    if (ending === 'blur') harness.browserWindow.dispatch('blur');
    else if (ending === 'policy') harness.controller.setPolicy({ motionAllowed: false });
    else if (ending === 'destroy') harness.controller.destroy();
    else harness.document.dispatch(ending, { pointerId: 4 });
    assert.equal(harness.element.hasPointerCapture(4), false, ending);
    assert.equal(harness.showcase.getAttribute('data-motion-dragging'), null, ending);
    assert.equal(
      harness.context.coordinator.owner,
      ending === 'pointerup' ? 'grid-inertia' : null,
      ending,
    );
    assert.equal(harness.requested.size, ending === 'pointerup' ? 1 : 0, ending);
  }
});

test('priority ownership preempts and rejects grid drag only after releasing browser capture', () => {
  const preempted = createGridHarness();
  drag(preempted);
  assert.equal(preempted.context.coordinator.claim('priority-three', 3), true);
  assert.equal(preempted.element.hasPointerCapture(4), false);
  assert.equal(preempted.context.coordinator.owner, 'priority-three');

  const rejected = createGridHarness();
  assert.equal(rejected.context.coordinator.claim('priority-three', 3), true);
  drag(rejected);
  assert.equal(rejected.element.hasPointerCapture(4), false);
  assert.equal(rejected.context.coordinator.owner, 'priority-three');
  rejected.context.coordinator.release('priority-three');
  drag(rejected, 5, 32);
  rejected.element.dispatch('pointerup', { pointerId: 5 });
  assert.equal(tileX(rejected), 8);
});

test('completion and cancellation reset the grid frame baseline before the next inertia session', () => {
  for (const ending of ['completion', 'cancellation']) {
    const frames = createTestScheduler();
    const harness = createGridHarness({ scheduler: frames.scheduler });
    let timestamp = 0;
    drag(harness, 4, timestamp);
    harness.element.dispatch('pointerup', { pointerId: 4 });
    frames.frame(timestamp);

    if (ending === 'completion') {
      for (let step = 0; step < 100 && frames.scheduler.snapshot().active > 0; step += 1) {
        timestamp += 16;
        frames.frame(timestamp);
      }
      assert.equal(frames.scheduler.snapshot().active, 0);
    } else {
      harness.context.policy.motionAllowed = false;
      harness.controller.setPolicy(harness.context.policy);
      harness.context.policy.motionAllowed = true;
    }

    const settled = tileX(harness);
    timestamp += 1000;
    drag(harness, 5, timestamp);
    harness.element.dispatch('pointerup', { pointerId: 5 });
    frames.frame(timestamp + 16);
    assert.ok(Math.abs(tileX(harness) - ((settled + 8) % 400)) < 0.001, ending);
  }
});

test('direct destroy aborts grid-owned listeners before later events can recapture motion', () => {
  const harness = createGridHarness({ observer: false });
  harness.controller.destroy();
  harness.element.dispatch('pointerdown', {
    pointerId: 4, pointerType: 'mouse', clientX: 0, clientY: 0, timeStamp: 0,
  });
  harness.element.dispatch('pointermove', {
    pointerId: 4, pointerType: 'mouse', clientX: 8, clientY: 0, timeStamp: 16,
  });
  harness.document.dispatch('pointerup', { pointerId: 4 });
  harness.browserWindow.dispatch('scroll');
  assert.equal(harness.element.hasPointerCapture(4), false);
  assert.equal(harness.context.coordinator.owner, null);
  assert.equal(harness.requested.size, 0);
});

test('offscreen observation and fallback stop active inertia synchronously while keyboard pans stay frame-free', () => {
  const observed = createGridHarness();
  drag(observed);
  observed.element.dispatch('pointerup', { pointerId: 4 });
  assert.equal(observed.requested.size, 1);
  observed.intersectionObserver.emit([{ target: observed.showcase, isIntersecting: false }]);
  assert.equal(observed.context.coordinator.owner, null);
  assert.equal(observed.requested.size, 0);
  observed.intersectionObserver.emit([{ target: observed.showcase, isIntersecting: true }]);
  observed.element.dispatch('keydown', { key: 'ArrowRight', preventDefault() {} });
  observed.element.dispatch('keydown', { key: 'Home', preventDefault() {} });
  assert.equal(observed.requested.size, 0);

  const fallback = createGridHarness({ observer: false });
  drag(fallback);
  fallback.element.dispatch('pointerup', { pointerId: 4 });
  fallback.showcase.rect = { ...fallback.showcase.rect, top: -400, bottom: -100 };
  fallback.browserWindow.dispatch('scroll');
  assert.equal(fallback.context.coordinator.owner, null);
  assert.equal(fallback.requested.size, 0);
});

test('non-owned pointers never alter capture or schedule a grid frame', () => {
  const harness = createGridHarness();
  harness.element.dispatch('pointerdown', {
    pointerId: 4, pointerType: 'mouse', clientX: 0, clientY: 0, timeStamp: 0,
  });
  harness.element.dispatch('pointermove', {
    pointerId: 99, pointerType: 'mouse', clientX: 80, clientY: 0, timeStamp: 16,
  });
  harness.element.dispatch('pointerup', { pointerId: 99 });
  assert.equal(harness.element.hasPointerCapture(4), true);
  assert.equal(harness.requested.size, 0);
});

test('grid uses the latest coalesced pointer sample and avoids redundant seam writes', () => {
  const harness = createGridHarness({ motionAllowed: false });
  harness.element.dispatch('pointerdown', {
    pointerId: 4, pointerType: 'mouse', clientX: 0, clientY: 0, timeStamp: 0,
  });
  harness.element.dispatch('pointermove', {
    pointerId: 4,
    pointerType: 'mouse',
    getCoalescedEvents() {
      return [
        { clientX: 9, clientY: 0, timeStamp: 10 },
        { clientX: 20, clientY: 0, timeStamp: 16 },
      ];
    },
  });
  assert.equal(tileX(harness), 20);
  assert.equal(harness.element.children[0].toggleLog.length, 0);
  harness.element.dispatch('pointermove', {
    pointerId: 4, pointerType: 'mouse', clientX: 28, clientY: 0, timeStamp: 32,
  });
  assert.equal(harness.element.children[0].toggleLog.length, 0);
});

test('grid refreshes wrap dimensions and promotes layers only while active', () => {
  const harness = createGridHarness({ resize: true });
  harness.resizeObserver.emit([{
    target: harness.element,
    contentRect: { width: 800, height: 320 },
  }]);
  assert.equal(
    harness.element.children[2].style.values.get('--tile-x'),
    '400px',
  );

  drag(harness);
  assert.equal(harness.element.children[0].style.values.get('will-change'), 'transform');
  harness.element.dispatch('pointercancel', { pointerId: 4 });
  assert.equal(harness.element.children[0].style.values.has('will-change'), false);
});
