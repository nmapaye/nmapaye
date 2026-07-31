import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mountTextEffects,
  shakeFrame,
  shuffleFrame,
} from '../src/scripts/motion/text-effects.mjs';
import { createInteractionCoordinator } from '../src/scripts/motion/index.mjs';

test('shake stays within 250ms, two pixels, and three oscillations', () => {
  const samples = [0, 42, 84, 125, 167, 209, 250].map((elapsed) =>
    shakeFrame(elapsed, { duration: 250, amplitude: 2, oscillations: 3 }),
  );
  assert.ok(samples.slice(0, -1).every(({ x, y }) => Math.abs(x) <= 2 && Math.abs(y) <= 2));
  assert.deepEqual(
    samples.slice(0, -1).map(({ x, y }) => [x, y]),
    [[2, -2], [-2, 2], [2, -2], [-2, 2], [2, -2], [-2, 2]],
  );
  assert.deepEqual(samples.at(-1), { x: 0, y: 0, done: true });
});

test('shuffle is deterministic and resolves to the exact label by 400ms', () => {
  const options = { seed: 23, triggerCount: 2, duration: 400 };
  assert.equal(
    shuffleFrame('AURORA', 160, options),
    shuffleFrame('AURORA', 160, options),
  );
  assert.equal(shuffleFrame('AURORA', 400, options), 'AURORA');
});

test('shuffle preserves spaces and never mutates the semantic source', () => {
  const source = 'Chapter Index';
  const visual = shuffleFrame(source, 120, {
    seed: 23,
    triggerCount: 1,
    duration: 400,
  });
  assert.equal(visual[7], ' ');
  assert.equal(source, 'Chapter Index');
});

class FakeEventTarget {
  constructor() { this.handlers = new Map(); }

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
  constructor({ attrs = {}, text = '', parent = null, rect = {} } = {}) {
    super();
    this.attrs = new Map(Object.entries(attrs));
    this.textContent = text;
    this.parent = parent;
    this.children = [];
    this.rect = { top: 0, bottom: 200, ...rect };
    this.style = {
      values: new Map(),
      setProperty: (key, value) => this.style.values.set(key, value),
      removeProperty: (key) => this.style.values.delete(key),
    };
  }

  append(child) { child.parent = this; this.children.push(child); return child; }
  setAttribute(name, value = '') { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  removeAttribute(name) { this.attrs.delete(name); }
  contains(node) {
    for (let current = node; current; current = current.parent) {
      if (current === this) return true;
    }
    return false;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  querySelectorAll(selector) {
    const output = [];
    const visit = (node) => {
      if (node.matches(selector)) output.push(node);
      for (const child of node.children) visit(child);
    };
    for (const child of this.children) visit(child);
    return output;
  }
  matches(selector) {
    if (selector === '*') return true;
    if (selector === '[aria-hidden="true"]') return this.attrs.get('aria-hidden') === 'true';
    const attribute = selector.match(/^\[([^\]=]+)(?:=\"([^\"]+)\")?\]$/);
    return Boolean(attribute && this.attrs.has(attribute[1]) && (
      attribute[2] === undefined || this.attrs.get(attribute[1]) === attribute[2]
    ));
  }
  closest(selector) {
    const selectors = selector.split(',').map((item) => item.trim());
    for (let current = this; current; current = current.parent) {
      if (selectors.some((item) => current.matches(item) || (
        item === 'section' && current.tagName === 'section'
      ) || (item === 'nav' && current.tagName === 'nav'))) return current;
    }
    return null;
  }
  getBoundingClientRect() { return this.rect; }
}

function createHarness({ observer = true } = {}) {
  const document = new FakeEventTarget();
  const browserWindow = new FakeEventTarget();
  browserWindow.innerHeight = 900;
  document.defaultView = browserWindow;
  const body = new FakeNode({ text: 'body' });
  const hero = new FakeNode({ attrs: { 'data-motion-hero': '' } });
  hero.tagName = 'section';
  const work = new FakeNode({ attrs: { 'data-motion-showcase': '' } });
  work.tagName = 'section';
  const nav = new FakeNode();
  nav.tagName = 'nav';
  const heroTitle = hero.append(new FakeNode({ attrs: { id: 'cover-title', 'data-motion-shake': '' }, text: 'Systems to screens.' }));
  const workTitle = work.append(new FakeNode({ attrs: { id: 'work-title', 'data-motion-shake': '' }, text: 'Selected work' }));
  const projectCard = work.append(new FakeNode({ attrs: { 'data-motion-card': '01' } }));
  const project = projectCard.append(new FakeNode({
    attrs: { 'data-motion-shuffle': '', 'data-motion-shuffle-label': 'AURORA' },
  }));
  const projectText = project.append(new FakeNode({ text: 'AURORA' }));
  const projectVisual = project.append(new FakeNode({ attrs: { 'data-motion-shuffle-visual': '', 'aria-hidden': 'true' }, text: 'AURORA' }));
  const projectLink = projectCard.append(new FakeNode({
    attrs: { 'data-motion-burst': '', 'data-motion-shake-related': 'work-title', href: '#aurora' },
  }));
  const chapter = nav.append(new FakeNode({
    attrs: { 'data-motion-shuffle': '', 'data-motion-shuffle-label': 'Work' },
  }));
  const chapterText = chapter.append(new FakeNode({ text: 'Work' }));
  const chapterVisual = chapter.append(new FakeNode({ attrs: { 'data-motion-shuffle-visual': '', 'aria-hidden': 'true' }, text: 'Work' }));
  const chapterLink = nav.append(new FakeNode({ attrs: { href: '#work' } }));
  document.body = body;
  document.querySelectorAll = (selector) => {
    if (selector === '[data-motion-shake]') return [heroTitle, workTitle];
    if (selector === '[data-motion-shuffle]') return [project, chapter];
    return [];
  };
  document.getElementById = (id) => ({ 'cover-title': heroTitle, 'work-title': workTitle }[id] ?? null);
  let now = 0;
  const requested = new Set();
  let intersectionObserver;
  const context = {
    root: { ownerDocument: document },
    signal: new AbortController().signal,
    policy: { motionAllowed: true, forcedColors: false },
    coordinator: createInteractionCoordinator(),
    scheduler: {
      request(controller) { requested.add(controller); },
      cancel(controller) { requested.delete(controller); },
      now() { return now; },
    },
    clock: () => now,
    observerFactory: observer ? (callback) => {
      intersectionObserver = { observed: [], observe(zone) { this.observed.push(zone); }, disconnect() {}, emit(records) { callback(records); } };
      return intersectionObserver;
    } : () => null,
  };
  const controller = mountTextEffects(context);
  return {
    body, browserWindow, chapter, chapterLink, chapterText, chapterVisual, context,
    controller, hero, heroTitle, intersectionObserver, project, projectLink,
    projectText, projectVisual, requested, setNow(value) { now = value; }, work, workTitle,
  };
}

function trigger(harness, target, type = 'pointerover') {
  harness.context.root.ownerDocument.dispatch(type, { target });
}

test('standalone shake and shuffle measure their deadlines from the event', () => {
  const shake = createHarness();
  shake.setNow(100);
  trigger(shake, shake.heroTitle);
  shake.controller.update(349);
  assert.equal(shake.heroTitle.getAttribute('data-motion-active'), '');
  shake.controller.update(350);
  assert.equal(shake.heroTitle.getAttribute('data-motion-active'), null);
  assert.equal(shake.requested.size, 0);

  const shuffle = createHarness();
  shuffle.setNow(100);
  trigger(shuffle, shuffle.project);
  shuffle.controller.update(499);
  assert.equal(shuffle.project.getAttribute('data-active'), '');
  shuffle.controller.update(500);
  assert.equal(shuffle.projectVisual.textContent, 'AURORA');
  assert.equal(shuffle.requested.size, 0);
});

test('policy, hidden state, destroy, and grid preemption restore text exactly and cancel the batched client', () => {
  for (const ending of ['policy', 'forced-colors', 'hidden', 'destroy', 'grid']) {
    const harness = createHarness();
    harness.setNow(0);
    trigger(harness, harness.heroTitle);
    assert.equal(harness.requested.size, 1);
    if (ending === 'policy') harness.controller.setPolicy({ motionAllowed: false, forcedColors: false });
    else if (ending === 'forced-colors') harness.controller.setPolicy({ motionAllowed: true, forcedColors: true });
    else if (ending === 'hidden') harness.controller.setPolicy({ motionAllowed: true, forcedColors: false, hidden: true });
    else if (ending === 'destroy') harness.controller.destroy();
    else harness.context.coordinator.claim('grid', 2);
    assert.deepEqual([...harness.heroTitle.style.values.entries()], [
      ['--shake-x', '0px'], ['--shake-neg-x', '0px'], ['--shake-y', '0px'],
    ], ending);
    assert.equal(harness.heroTitle.textContent, 'Systems to screens.', ending);
    assert.equal(harness.requested.size, 0, ending);
  }

  const shuffle = createHarness();
  trigger(shuffle, shuffle.project);
  shuffle.context.coordinator.claim('grid', 2);
  assert.equal(shuffle.projectVisual.textContent, 'AURORA');
  assert.equal(shuffle.projectText.textContent, 'AURORA');
  assert.equal(shuffle.requested.size, 0);

  const forcedShuffle = createHarness();
  trigger(forcedShuffle, forcedShuffle.project);
  forcedShuffle.controller.setPolicy({ motionAllowed: true, forcedColors: true });
  assert.equal(forcedShuffle.projectVisual.textContent, 'AURORA');
  assert.equal(forcedShuffle.projectText.textContent, 'AURORA');
  assert.equal(forcedShuffle.project.getAttribute('data-active'), null);
  assert.equal(forcedShuffle.requested.size, 0);
});

test('burst follow-ups use the original activation time and stale hidden work stays idle', () => {
  const harness = createHarness();
  harness.setNow(0);
  assert.equal(harness.context.coordinator.claim('link:#aurora', 1), true);
  trigger(harness, harness.projectLink);
  harness.context.coordinator.release('link:#aurora');
  harness.controller.update(399);
  assert.equal(harness.project.getAttribute('data-active'), '');
  harness.controller.update(400);
  assert.equal(harness.project.getAttribute('data-active'), null);

  assert.equal(harness.context.coordinator.claim('link:#aurora', 1), true);
  trigger(harness, harness.projectLink);
  harness.intersectionObserver.emit([{ target: harness.work, isIntersecting: false }]);
  harness.context.coordinator.release('link:#aurora');
  harness.intersectionObserver.emit([{ target: harness.work, isIntersecting: true }]);
  assert.equal(harness.requested.size, 0);
  assert.equal(harness.project.getAttribute('data-active'), null);
});

test('navigation preemption discards a queued burst follow-up before it can mutate text', () => {
  const harness = createHarness();
  harness.setNow(0);
  assert.equal(harness.context.coordinator.claim('link:#aurora', 1), true);
  trigger(harness, harness.projectLink);
  assert.equal(harness.requested.size, 0);
  harness.context.coordinator.claim('navigation', 3);
  harness.context.coordinator.release('link:#aurora');
  assert.equal(harness.project.getAttribute('data-active'), null);
  assert.equal(harness.projectText.textContent, 'AURORA');
  assert.equal(harness.projectVisual.textContent, 'AURORA');
  assert.equal(harness.project.style.values.size, 0);
  assert.equal(harness.requested.size, 0);
});

test('offscreen observer and fallback cancellation resolve Chapter Index entries to nav', () => {
  const observed = createHarness();
  assert.ok(observed.intersectionObserver.observed.includes(observed.chapter.parent));
  assert.ok(!observed.intersectionObserver.observed.includes(observed.body));
  trigger(observed, observed.chapter);
  observed.intersectionObserver.emit([{ target: observed.chapter.parent, isIntersecting: false }]);
  assert.equal(observed.chapter.getAttribute('data-active'), null);
  assert.equal(observed.chapterVisual.textContent, 'Work');
  assert.equal(observed.chapterText.textContent, 'Work');
  assert.equal(observed.requested.size, 0);

  const fallback = createHarness({ observer: false });
  trigger(fallback, fallback.project);
  fallback.work.rect = { top: 1000, bottom: 1200 };
  fallback.browserWindow.dispatch('scroll');
  assert.equal(fallback.project.getAttribute('data-active'), null);
  assert.equal(fallback.requested.size, 0);
});
