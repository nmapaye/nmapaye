import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyNavigation,
  createNavigationWipeController,
  mountNavigationWipe,
} from '../src/scripts/motion/navigation-wipe.mjs';

const ordinary = {
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
};

test('only ordinary same-origin HTML navigation is eligible', () => {
  for (const [href, destination] of [
    ['/writing/', 'https://nmapaye.com/writing/'],
    ['/writing/#chapter', 'https://nmapaye.com/writing/#chapter'],
    ['/work.html?view=all', 'https://nmapaye.com/work.html?view=all'],
  ]) {
    assert.deepEqual(
      classifyNavigation(
        { href, target: '', download: false },
        ordinary,
        'https://nmapaye.com/',
      ),
      { eligible: true, destination },
    );
  }

  const rejected = [
    [{ href: '', target: '', download: false }, ordinary],
    [{ href: '/writing/', target: '', download: true }, ordinary],
    [{ href: '/writing/', target: '_blank', download: false }, ordinary],
    [{ href: '/writing/', target: '_parent', download: false }, ordinary],
    [{ href: '/writing/', target: 'portfolio', download: false }, ordinary],
    [{ href: '/writing/', target: '', download: false }, { ...ordinary, metaKey: true }],
    [{ href: '/writing/', target: '', download: false }, { ...ordinary, ctrlKey: true }],
    [{ href: '/writing/', target: '', download: false }, { ...ordinary, shiftKey: true }],
    [{ href: '/writing/', target: '', download: false }, { ...ordinary, altKey: true }],
    [{ href: '/writing/', target: '', download: false }, { ...ordinary, button: 1 }],
    [{ href: '/writing/', target: '', download: false }, { ...ordinary, button: 2 }],
    [{ href: '/writing/', target: '', download: false }, { ...ordinary, defaultPrevented: true }],
    [{ href: 'http://[', target: '', download: false }, ordinary],
    [{ href: 'javascript:alert(1)', target: '', download: false }, ordinary],
    [{ href: 'mailto:nmapaye@ucsc.edu', target: '', download: false }, ordinary],
    [{ href: 'tel:+123456789', target: '', download: false }, ordinary],
    [{ href: '/resume.pdf', target: '', download: false }, ordinary],
    [{ href: '/portrait.png', target: '', download: false }, ordinary],
    [{ href: 'http://nmapaye.com/writing/', target: '', download: false }, ordinary],
    [{ href: 'https://example.com/writing/', target: '', download: false }, ordinary],
    [{ href: 'https://nmapaye.com:444/writing/', target: '', download: false }, ordinary],
    [{ href: '#work', target: '', download: false }, ordinary],
  ];

  for (const [anchor, activation] of rejected) {
    assert.deepEqual(
      classifyNavigation(anchor, activation, 'https://nmapaye.com/'),
      { eligible: false, destination: null },
    );
  }
  assert.deepEqual(
    classifyNavigation(
      { href: '/writing/', target: '', download: false },
      ordinary,
      'not a url',
    ),
    { eligible: false, destination: null },
  );
  assert.deepEqual(
    classifyNavigation(
      { href: '/#work', target: '_self', download: false },
      ordinary,
      'https://nmapaye.com/writing/',
    ),
    { eligible: true, destination: 'https://nmapaye.com/#work' },
  );
});

function createControllerHarness({
  policy = { motionAllowed: true, forcedColors: false },
  navigate,
  beforeStart,
  schedule,
} = {}) {
  const scheduled = [];
  const cancelled = [];
  const destinations = [];
  const errors = [];
  const releases = [];
  const preemptions = [];
  const layer = new FakeTarget();
  const panels = Array.from({ length: 3 }, () => new FakeTarget());
  const controller = createNavigationWipeController({
    duration: 300,
    schedule: schedule ?? ((callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    }),
    cancel(id) { cancelled.push(id); },
    navigate: navigate ?? ((destination) => { destinations.push(destination); }),
    layer,
    panels,
    coordinator: {
      preempt(owner, priority) { preemptions.push([owner, priority]); },
      release(owner) { releases.push(owner); },
    },
    beforeStart,
    policy,
    onError(error) { errors.push(error); },
  });
  return {
    cancelled,
    controller,
    destinations,
    errors,
    layer,
    panels,
    preemptions,
    releases,
    scheduled,
  };
}

test('the first activation owns the wipe and completion races navigate exactly once', () => {
  for (const finishingRace of ['timeout', 'complete', 'pagehide', 'destroy', 'fail']) {
    const harness = createControllerHarness();
    assert.equal(harness.controller.start('https://nmapaye.com/writing/'), true);
    assert.equal(harness.controller.start('https://nmapaye.com/other/'), false);
    assert.equal(harness.scheduled.length, 1);
    assert.equal(harness.scheduled[0].delay, 300);
    assert.equal(harness.layer.hasAttribute('data-active'), true);
    assert.equal(harness.panels.every((panel) => panel.hasAttribute('data-active')), true);

    if (finishingRace === 'timeout') harness.scheduled[0].callback();
    else if (finishingRace === 'complete') harness.controller.complete();
    else if (finishingRace === 'pagehide') harness.controller.pagehide();
    else if (finishingRace === 'destroy') harness.controller.destroy();
    else harness.controller.fail(new Error('transition cancelled'));

    harness.scheduled[0].callback();
    harness.controller.complete();
    harness.controller.pagehide();
    harness.controller.destroy();
    assert.deepEqual(harness.destinations, ['https://nmapaye.com/writing/']);
    assert.deepEqual(harness.controller.snapshot(), {
      pending: null,
      locked: false,
      timerActive: false,
    });
    assert.equal(harness.layer.hasAttribute('data-active'), false);
    assert.equal(harness.panels.some((panel) => panel.hasAttribute('data-active')), false);
  }
});

test('immediate accessibility navigation does not schedule a wipe', () => {
  for (const policy of [
    { motionAllowed: false, forcedColors: false },
    { motionAllowed: true, forcedColors: true },
  ]) {
    const harness = createControllerHarness({ policy });
    assert.equal(harness.controller.start('https://nmapaye.com/writing/'), true);
    assert.deepEqual(harness.destinations, ['https://nmapaye.com/writing/']);
    assert.equal(harness.scheduled.length, 0);
    assert.equal(harness.layer.hasAttribute('data-active'), false);
    assert.equal(harness.panels.some((panel) => panel.hasAttribute('data-active')), false);
  }
});

test('navigation and setup failures clear the lock and report errors', () => {
  let unlocks = 0;
  const navigationFailure = new Error('assign failed');
  const navigationHarness = createControllerHarness({
    beforeStart() { return () => { unlocks += 1; }; },
    navigate() { throw navigationFailure; },
  });
  navigationHarness.controller.start('https://nmapaye.com/writing/');
  navigationHarness.controller.complete();
  assert.equal(navigationHarness.controller.snapshot().locked, false);
  assert.equal(unlocks, 1);
  assert.equal(navigationHarness.errors.includes(navigationFailure), true);

  const setupFailure = new Error('timer failed');
  const setupHarness = createControllerHarness({
    schedule() { throw setupFailure; },
  });
  assert.equal(setupHarness.controller.start('https://nmapaye.com/writing/'), true);
  assert.deepEqual(setupHarness.destinations, ['https://nmapaye.com/writing/']);
  assert.equal(setupHarness.controller.snapshot().locked, false);
  assert.equal(setupHarness.errors.includes(setupFailure), true);
});

class FakeTarget {
  constructor() {
    this.attributes = new Map();
    this.listeners = new Map();
  }

  addEventListener(type, listener, options = {}) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
    options.signal?.addEventListener('abort', () => {
      this.listeners.get(type)?.delete(listener);
    }, { once: true });
  }

  dispatch(type, event = {}) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
  }

  setAttribute(name, value = '') {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
}

test('the delegated adapter prevents every eligible locked click but retains the first destination', () => {
  const document = new FakeTarget();
  const browserWindow = new FakeTarget();
  const scheduled = [];
  const destinations = [];
  browserWindow.location = {
    href: 'https://nmapaye.com/',
    assign(destination) { destinations.push(destination); },
  };
  browserWindow.setTimeout = (callback, delay) => {
    scheduled.push({ callback, delay });
    return scheduled.length;
  };
  browserWindow.clearTimeout = () => {};
  document.defaultView = browserWindow;
  const layer = new FakeTarget();
  const panels = Array.from({ length: 3 }, () => new FakeTarget());
  const root = {
    ownerDocument: document,
    querySelector(selector) {
      return selector === '[data-motion-wipe]' ? layer : null;
    },
    querySelectorAll(selector) {
      return selector === '[data-motion-wipe-panel]' ? panels : [];
    },
  };
  const context = {
    root,
    signal: new AbortController().signal,
    coordinator: { preempt() {}, release() {} },
    lockForNavigation() { return () => {}; },
    policy: { motionAllowed: true, forcedColors: false },
    onError(error) { throw error; },
  };
  const controller = mountNavigationWipe(context);

  function anchor(href, attributes = {}) {
    const node = new FakeTarget();
    node.setAttribute('href', href);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    node.closest = (selector) => selector === 'a[href]' ? node : null;
    return node;
  }

  function click(target, overrides = {}) {
    let prevented = 0;
    document.dispatch('click', {
      ...ordinary,
      target,
      preventDefault() { prevented += 1; },
      ...overrides,
    });
    return prevented;
  }

  assert.equal(click(anchor('/writing/')), 1);
  assert.equal(click(anchor('/other/')), 1);
  assert.equal(scheduled.length, 1);
  assert.deepEqual(destinations, []);

  assert.equal(click(anchor('/download/', { download: '' })), 0);
  assert.equal(click(anchor('/new-tab/', { target: '_blank' })), 0);
  assert.equal(click(anchor('/modified/'), { metaKey: true }), 0);
  assert.equal(scheduled.length, 1);

  scheduled[0].callback();
  panels.at(-1).dispatch('transitionend', { propertyName: 'transform' });
  controller.destroy();
  assert.deepEqual(destinations, ['https://nmapaye.com/writing/']);
});
