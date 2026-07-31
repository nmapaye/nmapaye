import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceBlob,
  createBurst,
  mountPointerEffects,
  shouldSpawnSticker,
} from '../src/scripts/motion/pointer-effects.mjs';
import { createFrameScheduler } from '../src/scripts/motion/scheduler.mjs';
import { destroyMotion, initializeMotion } from '../src/scripts/motion/index.mjs';

class FakeNode {
  constructor({ attrs = {}, parent = null, rect = {} } = {}) {
    this.attrs = new Map(Object.entries(attrs));
    this.parent = parent;
    this.style = {
      values: new Map(),
      setProperty: (key, value) => this.style.values.set(key, value),
      removeProperty: (key) => this.style.values.delete(key),
      opacity: '',
    };
    this.rect = { left: 0, top: 0, width: 40, height: 20, ...rect };
    this.textContent = '';
  }

  matches(selector) {
    return selector.split(',').some((part) => {
      const attribute = part.trim().match(/^\[([^\]]+)\]$/)?.[1];
      return attribute ? this.attrs.has(attribute) : false;
    });
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (current.matches(selector)) return current;
      current = current.parent;
    }
    return null;
  }

  contains(node) {
    let current = node;
    while (current) {
      if (current === this) return true;
      current = current.parent;
    }
    return false;
  }

  toggleAttribute(name, enabled) {
    if (enabled) this.attrs.set(name, '');
    else this.attrs.delete(name);
  }

  removeAttribute(name) {
    this.attrs.delete(name);
    if (name === 'style') {
      this.style.values.clear();
      this.style.opacity = '';
    }
  }

  getAttribute(name) {
    return this.attrs.get(name) ?? null;
  }

  getBoundingClientRect() {
    return {
      ...this.rect,
      right: this.rect.right ?? this.rect.left + this.rect.width,
      bottom: this.rect.bottom ?? this.rect.top + this.rect.height,
    };
  }
}

function createPointerHarness({
  scheduler,
  clock = () => 0,
  kinetic = true,
  mount = true,
  withObserver = true,
} = {}) {
  const handlers = new Map();
  const windowHandlers = new Map();
  const hero = new FakeNode({ attrs: { 'data-motion-hero': '' } });
  const showcase = new FakeNode({ attrs: { 'data-motion-showcase': '' } });
  const blobs = [new FakeNode(), new FakeNode()];
  const stickers = Array.from({ length: 24 }, () => new FakeNode());
  const particles = Array.from({ length: 8 }, () => new FakeNode());
  let observer;
  const addSignalOwnedListener = (store, type, listener, options = {}) => {
    if (options.signal?.aborted) return;
    store.set(type, listener);
    options.signal?.addEventListener('abort', () => {
      if (store.get(type) === listener) store.delete(type);
    }, { once: true });
  };
  const document = {
    addEventListener(type, listener, options) {
      addSignalOwnedListener(handlers, type, listener, options);
    },
    querySelectorAll(selector) {
      if (selector === '[data-motion-hero], [data-motion-showcase]') return [hero, showcase];
      return [];
    },
  };
  const root = {
    ownerDocument: document,
    getAttribute(name) {
      return name === 'data-motion-kinetic' && kinetic ? 'true' : 'false';
    },
    querySelectorAll(selector) {
      if (selector === '[data-motion-sticker]') return stickers;
      if (selector === '[data-motion-particle]') return particles;
      if (selector === '[data-motion-blob]') return blobs;
      return [];
    },
  };
  const requested = new Set();
  const activeScheduler = scheduler ?? {
    request(controller) { requested.add(controller); },
    cancel(controller) { requested.delete(controller); },
    now: clock,
  };
  const coordinator = {
    owner: null,
    claim(owner) { this.owner = owner; return true; },
    release(owner) { if (this.owner === owner) this.owner = null; },
  };
  const policy = {
    motionAllowed: true,
    finePointerEffects: true,
    forcedColors: false,
    hidden: false,
  };
  const browserWindow = {
    innerHeight: 720,
    innerWidth: 1280,
    addEventListener(type, listener, options) {
      addSignalOwnedListener(windowHandlers, type, listener, options);
    },
  };
  const context = {
    root,
    scheduler: activeScheduler,
    coordinator,
    policy,
    clock,
    random: () => 0.75,
    signal: new AbortController().signal,
    window: browserWindow,
    observerFactory: withObserver ? (callback) => {
      observer = {
        observe() {},
        disconnect() {},
        emit(entries) { callback(entries); },
      };
      return observer;
    } : () => null,
  };
  const controller = mount ? mountPointerEffects(context) : null;
  return {
    blobs,
    browserWindow,
    controller,
    dispatch(type, event) { handlers.get(type)(event); },
    dispatchIfPresent(type, event) { handlers.get(type)?.(event); },
    hero,
    listenerCount(type) { return handlers.has(type) ? 1 : 0; },
    observer,
    particles,
    requested,
    root,
    showcase,
    stickers,
    triggerWindow(type, event = {}) { windowHandlers.get(type)?.(event); },
    windowListenerCount(type) { return windowHandlers.has(type) ? 1 : 0; },
  };
}

function activateShowcasePointerEffects(harness) {
  harness.dispatch('pointermove', {
    target: harness.showcase,
    clientX: 0,
    clientY: 0,
    timeStamp: 0,
  });
  harness.dispatch('pointermove', {
    target: harness.showcase,
    clientX: 70,
    clientY: 0,
    timeStamp: 70,
  });
  harness.controller.update(70);
}

function firstActiveSticker(harness) {
  return harness.stickers.find((node) => node.attrs.has('data-active'));
}

test('stickers require both 60 pixels and 60 milliseconds', () => {
  const previous = { x: 0, y: 0, timestamp: 0 };
  assert.equal(
    shouldSpawnSticker(null, { x: 100, y: 0, timestamp: 100 }, {
      minDistance: 60,
      minInterval: 60,
    }),
    false,
  );
  assert.equal(
    shouldSpawnSticker(previous, { x: 59, y: 0, timestamp: 80 }, {
      minDistance: 60,
      minInterval: 60,
    }),
    false,
  );
  assert.equal(
    shouldSpawnSticker(previous, { x: 60, y: 0, timestamp: 59 }, {
      minDistance: 60,
      minInterval: 60,
    }),
    false,
  );
  assert.equal(
    shouldSpawnSticker(previous, { x: 60, y: 0, timestamp: 60 }, {
      minDistance: 60,
      minInterval: 60,
    }),
    true,
  );
});

test('burst output is deterministic, capped at eight, and expires at 300ms', () => {
  const first = createBurst({ seed: 11, triggerCount: 3, limit: 8, lifetime: 300 });
  const second = createBurst({ seed: 11, triggerCount: 3, limit: 8, lifetime: 300 });
  assert.deepEqual(first, second);
  assert.equal(first.length, 8);
  assert.ok(first.every((particle) => particle.expiresAt === 300));
  assert.ok(first.every((particle) => ['✦', '◆', '⚡', '↗', '01', '02', '03', '04'].includes(particle.symbol)));
});

test('expired bursts remove renderer-owned particle styles and glyphs', () => {
  const harness = createPointerHarness();
  const link = new FakeNode({
    attrs: {
      'data-motion-burst': '',
      'data-motion-shake-related': 'contact-title',
      href: '/resume.pdf',
    },
  });

  harness.dispatch('pointerover', { target: link, relatedTarget: null });
  harness.controller.update(0);

  assert.equal(harness.particles.some((node) => node.style.opacity !== ''), true);
  assert.equal(harness.particles.some((node) => node.textContent !== ''), true);

  harness.controller.update(100);

  assert.equal(harness.particles.some((node) => node.attrs.has('data-active')), false);
  assert.equal(harness.particles.every((node) => node.style.opacity === ''), true);
  assert.equal(harness.particles.every((node) => node.style.values.size === 0), true);
  assert.equal(harness.particles.every((node) => node.textContent === ''), true);
});

test('blob springs approach the target without overshooting the configured bound', () => {
  const next = advanceBlob(
    { x: 0, y: 0, vx: 0, vy: 0 },
    { x: 100, y: 50 },
    16,
    { stiffness: 0.014, damping: 0.78, maxSpeed: 32 },
  );
  assert.ok(next.x > 0 && next.x < 100);
  assert.ok(next.y > 0 && next.y < 50);
  assert.ok(Math.hypot(next.vx, next.vy) <= 32);
});

test('first Work pointer sample resets the sticker baseline after leaving Hero', () => {
  const harness = createPointerHarness();
  harness.dispatch('pointermove', {
    target: harness.hero,
    clientX: 0,
    clientY: 0,
    timeStamp: 0,
  });
  harness.dispatch('pointermove', {
    target: harness.showcase,
    clientX: 100,
    clientY: 0,
    timeStamp: 100,
  });
  harness.controller.update(100);
  assert.equal(harness.stickers.filter((node) => node.attrs.has('data-active')).length, 0);

  harness.dispatch('pointermove', {
    target: harness.showcase,
    clientX: 170,
    clientY: 0,
    timeStamp: 170,
  });
  harness.controller.update(170);
  assert.equal(harness.stickers.filter((node) => node.attrs.has('data-active')).length, 1);
});

test('offscreen motion zones ignore pointer movement without scheduling a frame', () => {
  const harness = createPointerHarness();
  harness.observer.emit([{ target: harness.hero, isIntersecting: false }]);
  harness.dispatch('pointermove', {
    target: harness.hero,
    clientX: 20,
    clientY: 20,
    timeStamp: 20,
  });
  assert.equal(harness.requested.size, 0);
  assert.equal(harness.blobs.some((node) => node.attrs.has('data-active')), false);
});

test('an active offscreen zone hides blobs and short-exits its sticker trail', () => {
  const harness = createPointerHarness();
  harness.dispatch('pointermove', {
    target: harness.showcase,
    clientX: 0,
    clientY: 0,
    timeStamp: 0,
  });
  harness.dispatch('pointermove', {
    target: harness.showcase,
    clientX: 70,
    clientY: 0,
    timeStamp: 70,
  });
  harness.controller.update(16);
  assert.equal(harness.requested.size, 1);
  assert.equal(harness.blobs.some((node) => node.attrs.has('data-active')), true);
  assert.equal(harness.stickers.some((node) => node.attrs.has('data-active')), true);

  harness.observer.emit([{ target: harness.showcase, isIntersecting: false }]);

  assert.equal(harness.blobs.some((node) => node.attrs.has('data-active')), false);
  assert.equal(harness.stickers.some((node) => node.attrs.has('data-active')), true);
  harness.controller.update(149);
  assert.equal(harness.stickers.some((node) => node.attrs.has('data-active')), true);
  harness.controller.update(150);
  assert.equal(harness.stickers.some((node) => node.attrs.has('data-active')), false);
  assert.equal(harness.stickers.every((node) => node.style.opacity === ''), true);
});

test('natural sticker expiry clears renderer-owned inline styles', () => {
  const harness = createPointerHarness();
  activateShowcasePointerEffects(harness);
  const sticker = firstActiveSticker(harness);
  assert.ok(sticker);
  assert.notEqual(sticker.style.opacity, '');

  harness.controller.update(900);

  assert.equal(sticker.attrs.has('data-active'), false);
  assert.equal(sticker.style.opacity, '');
  assert.equal(sticker.style.values.size, 0);
});

test('pointer exit fades stickers from their current opacity for exactly 150ms', () => {
  let clock = 0;
  const harness = createPointerHarness({ clock: () => clock });
  activateShowcasePointerEffects(harness);
  const sticker = firstActiveSticker(harness);
  assert.ok(sticker);

  clock = 450;
  harness.controller.update(450);
  const opacityAtExit = Number(sticker.style.opacity);
  harness.dispatch('pointerout', {
    target: harness.showcase,
    relatedTarget: null,
  });

  clock = 525;
  harness.controller.update(525);
  assert.ok(Math.abs(Number(sticker.style.opacity) - opacityAtExit / 2) < 0.001);

  harness.dispatch('pointerout', {
    target: harness.showcase,
    relatedTarget: null,
  });
  clock = 599;
  harness.controller.update(599);
  assert.equal(sticker.attrs.has('data-active'), true);

  clock = 600;
  harness.controller.update(600);
  assert.equal(sticker.attrs.has('data-active'), false);
  assert.equal(sticker.style.opacity, '');
  assert.equal(sticker.style.values.size, 0);
});

test('scroll begins the short sticker exit even with IntersectionObserver', () => {
  let clock = 0;
  const harness = createPointerHarness({ clock: () => clock });
  activateShowcasePointerEffects(harness);
  const sticker = firstActiveSticker(harness);
  assert.ok(sticker);

  clock = 100;
  harness.triggerWindow('scroll');
  clock = 249;
  harness.controller.update(249);
  assert.equal(sticker.attrs.has('data-active'), true);

  clock = 250;
  harness.controller.update(250);
  assert.equal(sticker.attrs.has('data-active'), false);
  assert.equal(sticker.style.opacity, '');
});

test('moving from Work to Hero retires the existing sticker trail', () => {
  let clock = 0;
  const harness = createPointerHarness({ clock: () => clock });
  activateShowcasePointerEffects(harness);
  const sticker = firstActiveSticker(harness);
  assert.ok(sticker);

  clock = 100;
  harness.dispatch('pointermove', {
    target: harness.hero,
    clientX: 100,
    clientY: 100,
    timeStamp: 100,
  });
  clock = 250;
  harness.controller.update(250);

  assert.equal(sticker.attrs.has('data-active'), false);
  assert.equal(sticker.style.opacity, '');
});

test('pointerout followed by offscreen notification cannot strand sticker styles', () => {
  let clock = 0;
  const harness = createPointerHarness({ clock: () => clock });
  activateShowcasePointerEffects(harness);
  const sticker = firstActiveSticker(harness);
  assert.ok(sticker);

  clock = 100;
  harness.dispatch('pointerout', {
    target: harness.showcase,
    relatedTarget: null,
  });
  harness.observer.emit([{ target: harness.showcase, isIntersecting: false }]);
  clock = 250;
  harness.controller.update(250);

  assert.equal(sticker.attrs.has('data-active'), false);
  assert.equal(sticker.style.opacity, '');
  assert.equal(sticker.style.values.size, 0);
});

test('policy cleanup removes sticker attributes and renderer-owned styles immediately', () => {
  const harness = createPointerHarness();
  activateShowcasePointerEffects(harness);
  const sticker = firstActiveSticker(harness);
  assert.ok(sticker);

  harness.controller.setPolicy({
    motionAllowed: false,
    finePointerEffects: false,
    forcedColors: false,
    hidden: false,
  });

  assert.equal(sticker.attrs.has('data-active'), false);
  assert.equal(sticker.style.opacity, '');
  assert.equal(sticker.style.values.size, 0);
});

test('fallback scroll clears active pointer effects when their zone leaves the viewport', () => {
  const harness = createPointerHarness({ withObserver: false });
  activateShowcasePointerEffects(harness);
  assert.equal(harness.requested.size, 1);
  assert.equal(harness.blobs.some((node) => node.attrs.has('data-active')), true);
  assert.equal(harness.stickers.some((node) => node.attrs.has('data-active')), true);

  harness.showcase.rect = { left: 0, top: 800, width: 100, height: 100 };
  harness.triggerWindow('scroll');

  assert.equal(harness.blobs.some((node) => node.attrs.has('data-active')), false);
  assert.equal(harness.stickers.some((node) => node.attrs.has('data-active')), true);
  harness.controller.update(150);
  assert.equal(harness.stickers.some((node) => node.attrs.has('data-active')), false);
  assert.equal(harness.stickers.every((node) => node.style.opacity === ''), true);
});

test('fallback scroll clears active pointer effects when their zone leaves horizontally', () => {
  const harness = createPointerHarness({ withObserver: false });
  activateShowcasePointerEffects(harness);
  assert.equal(harness.requested.size, 1);

  harness.showcase.rect = { left: 1400, top: 0, width: 100, height: 100 };
  harness.triggerWindow('scroll');

  assert.equal(harness.stickers.some((node) => node.attrs.has('data-active')), true);
  harness.controller.update(150);
  assert.equal(harness.stickers.some((node) => node.attrs.has('data-active')), false);
  assert.equal(harness.blobs.some((node) => node.attrs.has('data-active')), false);
  assert.equal(harness.stickers.some((node) => node.attrs.has('data-active')), false);
});

test('fallback resize clears active pointer effects when their zone leaves the viewport', () => {
  const harness = createPointerHarness({ withObserver: false });
  harness.showcase.rect = { left: 0, top: 650, width: 100, height: 100 };
  activateShowcasePointerEffects(harness);
  assert.equal(harness.requested.size, 1);

  harness.browserWindow.innerHeight = 600;
  harness.triggerWindow('resize');

  assert.equal(harness.blobs.some((node) => node.attrs.has('data-active')), false);
  assert.equal(harness.stickers.some((node) => node.attrs.has('data-active')), true);
  harness.controller.update(150);
  assert.equal(harness.stickers.some((node) => node.attrs.has('data-active')), false);
});

test('direct destroy removes listeners so later events cannot restart pointer work', () => {
  const harness = createPointerHarness({ withObserver: false });
  const link = new FakeNode({ attrs: { 'data-motion-burst': '', href: '/work' } });

  harness.controller.destroy();
  harness.dispatchIfPresent('pointermove', {
    target: harness.hero,
    clientX: 20,
    clientY: 20,
    timeStamp: 20,
  });
  assert.equal(harness.requested.size, 0);

  harness.dispatchIfPresent('pointerover', { target: link, relatedTarget: null });
  harness.triggerWindow('blur');
  assert.equal(harness.requested.size, 0);
  assert.equal(harness.particles.some((node) => node.attrs.has('data-active')), false);
  for (const type of ['pointermove', 'pointerout', 'focusin', 'pointerover', 'pointerdown']) {
    assert.equal(harness.listenerCount(type), 0);
  }
  for (const type of ['blur', 'scroll', 'resize']) {
    assert.equal(harness.windowListenerCount(type), 0);
  }
});

test('burst lifetime begins at the trigger timestamp between scheduler frames', () => {
  const frames = [];
  const scheduler = createFrameScheduler({
    requestFrame(callback) { frames.push(callback); return frames.length; },
    cancelFrame() {},
    maxDelta: 50,
  });
  scheduler.request({ update() { return false; } });
  frames.shift()(100);
  let clock = 200;
  const harness = createPointerHarness({ scheduler, clock: () => clock });
  const card = new FakeNode({ attrs: { 'data-motion-card': '' } });
  const link = new FakeNode({
    attrs: { 'data-motion-burst': '', href: '/work' },
    parent: card,
  });
  harness.dispatch('pointerover', { target: link, relatedTarget: null });
  frames.shift()(216);
  frames.shift()(266);
  frames.shift()(300);

  assert.equal(harness.particles.some((node) => node.attrs.has('data-active')), false);
  clock = 301;
});

test('a retriggered burst receives its full lifetime from the new trigger', () => {
  const frames = [];
  const scheduler = createFrameScheduler({
    requestFrame(callback) { frames.push(callback); return frames.length; },
    cancelFrame() {},
    maxDelta: 50,
  });
  let clock = 0;
  const harness = createPointerHarness({ scheduler, clock: () => clock });
  const card = new FakeNode({ attrs: { 'data-motion-card': '' } });
  const link = new FakeNode({
    attrs: { 'data-motion-burst': '', href: '/work' },
    parent: card,
  });

  harness.dispatch('pointerover', { target: link, relatedTarget: null });
  frames.shift()(0);

  clock = 50;
  harness.dispatch('pointerdown', { target: link });
  frames.shift()(50);
  frames.shift()(100);

  assert.equal(
    harness.particles.some((node) => node.attrs.has('data-active')),
    true,
  );

  frames.shift()(150);
  assert.equal(
    harness.particles.some((node) => node.attrs.has('data-active')),
    false,
  );
});

test('a new sticker receives its full lifetime while the controller is active', () => {
  const frames = [];
  const scheduler = createFrameScheduler({
    requestFrame(callback) { frames.push(callback); return frames.length; },
    cancelFrame() {},
    maxDelta: 50,
  });
  let clock = 0;
  const harness = createPointerHarness({ scheduler, clock: () => clock });

  harness.dispatch('pointermove', {
    target: harness.showcase,
    clientX: 0,
    clientY: 0,
    timeStamp: 0,
  });
  frames.shift()(0);

  clock = 60;
  harness.dispatch('pointermove', {
    target: harness.showcase,
    clientX: 60,
    clientY: 0,
    timeStamp: 60,
  });
  frames.shift()(60);

  clock = 120;
  harness.dispatch('pointermove', {
    target: harness.showcase,
    clientX: 120,
    clientY: 0,
    timeStamp: 120,
  });
  frames.shift()(120);

  for (let rawTime = 170; rawTime <= 970; rawTime += 50) {
    frames.shift()(rawTime);
  }
  assert.equal(harness.stickers[1].attrs.has('data-active'), true);

  frames.shift()(1020);
  assert.equal(harness.stickers[1].attrs.has('data-active'), false);
});

test('only kinetic roots register the pointer-effects controller by default', () => {
  const kinetic = createPointerHarness({ mount: false, kinetic: true });
  const staticRoot = createPointerHarness({ mount: false, kinetic: false });
  const policy = {
    motionAllowed: true,
    finePointerEffects: true,
    forcedColors: false,
    hidden: false,
  };
  const scheduler = {
    request() {},
    cancel() {},
    cancelAll() {},
    destroy() {},
    now() { return 0; },
    resume() {},
    suspend() {},
  };
  const environment = {
    scheduler,
    observePolicy({ onChange }) {
      onChange(policy);
      return { current: policy };
    },
  };

  initializeMotion(kinetic.root, environment);
  initializeMotion(staticRoot.root, environment);
  assert.doesNotThrow(() => kinetic.dispatch('pointermove', {
    target: kinetic.hero,
    clientX: 0,
    clientY: 0,
    timeStamp: 0,
  }));
  assert.throws(() => staticRoot.dispatch('pointermove', {
    target: staticRoot.hero,
    clientX: 0,
    clientY: 0,
    timeStamp: 0,
  }), /is not a function/);
  destroyMotion(kinetic.root);
  destroyMotion(staticRoot.root);
});
