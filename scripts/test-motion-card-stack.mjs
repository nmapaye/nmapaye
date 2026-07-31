import assert from 'node:assert/strict';
import test from 'node:test';
import { mountCardStacks, reduceCardStack } from '../src/scripts/motion/card-stack.mjs';
import { createInteractionCoordinator } from '../src/scripts/motion/index.mjs';
import { mountPointerEffects } from '../src/scripts/motion/pointer-effects.mjs';

const initial = {
  expanded: false,
  hovered: false,
  focused: false,
  tapped: false,
};

test('hover, focus, and tap expand without preventing a nested link', () => {
  assert.equal(reduceCardStack(initial, { type: 'pointerenter' }, { motionAllowed: true }).expanded, true);
  assert.equal(reduceCardStack(initial, { type: 'focusin' }, { motionAllowed: true }).expanded, true);
  const tapped = reduceCardStack(initial, {
    type: 'activate',
    interactiveTarget: true,
  }, { motionAllowed: true });
  assert.equal(tapped.expanded, true);
  assert.equal(tapped.preventDefault, false);
});

test('reduced motion uses the static expanded state', () => {
  const state = reduceCardStack(initial, { type: 'policy' }, { motionAllowed: false });
  assert.equal(state.expanded, true);
  assert.equal(state.animate, false);
});

test('a second tap collapses the same stack without cancelling activation', () => {
  const first = reduceCardStack(
    initial,
    { type: 'activate', interactiveTarget: true },
    { motionAllowed: true },
  );
  const second = reduceCardStack(
    first,
    { type: 'activate', interactiveTarget: true },
    { motionAllowed: true },
  );
  assert.equal(second.expanded, false);
  assert.equal(second.preventDefault, false);
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
    let prevented = false;
    for (const listener of [...(this.handlers.get(type) ?? [])]) {
      listener({
        type,
        preventDefault() { prevented = true; },
        ...event,
      });
    }
    return prevented;
  }
}

class FakeNode extends FakeEventTarget {
  constructor({ attrs = {}, parent = null, rect = {} } = {}) {
    super();
    this.attrs = new Map(Object.entries(attrs));
    this.parent = parent;
    this.children = [];
    this.rect = { top: 0, bottom: 300, ...rect };
    this.style = {
      values: new Map(),
      setProperty: (key, value) => this.style.values.set(key, value),
      removeProperty: (key) => this.style.values.delete(key),
      set willChange(value) { this.values.set('will-change', value); },
    };
  }

  append(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const required = selector.match(/\[([^\]=]+)(?:=[^\]]+)?\]/g) ?? [];
    const matches = (node) => required.every((part) => {
      const name = part.slice(1, -1).split('=')[0];
      return node.attrs.has(name);
    });
    const found = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (matches(child)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (selector === '[data-motion-showcase]' && current.attrs.has('data-motion-showcase')) return current;
      if (selector === '[data-motion-burst]' && current.attrs.has('data-motion-burst')) return current;
      if (
        selector === '[data-motion-shake-related], [data-motion-card]' &&
        (current.attrs.has('data-motion-shake-related') || current.attrs.has('data-motion-card'))
      ) return current;
      if (selector === 'a,button' && (current.attrs.has('href') || current.attrs.has('data-button'))) return current;
      current = current.parent;
    }
    return null;
  }

  contains(node) {
    for (let current = node; current; current = current.parent) {
      if (current === this) return true;
    }
    return false;
  }

  getBoundingClientRect() { return this.rect; }
  setAttribute(name, value = '') { this.attrs.set(name, String(value)); }
  removeAttribute(name) { this.attrs.delete(name); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  toggleAttribute(name, enabled) { if (enabled) this.attrs.set(name, ''); else this.attrs.delete(name); }
  get dataset() {
    return Object.fromEntries([...this.attrs].flatMap(([key, value]) => key.startsWith('data-')
      ? [[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value]]
      : []));
  }
}

function createHarness({ observer = true } = {}) {
  const document = new FakeEventTarget();
  const browserWindow = new FakeEventTarget();
  browserWindow.innerHeight = 900;
  document.defaultView = browserWindow;
  const root = new FakeNode();
  root.ownerDocument = document;
  for (let index = 0; index < 8; index += 1) {
    root.append(new FakeNode({ attrs: { 'data-motion-particle': String(index) } }));
  }
  const showcase = new FakeNode({ attrs: { 'data-motion-showcase': '' } });
  const cards = Array.from({ length: 4 }, (_, index) => {
    const card = showcase.append(new FakeNode({ attrs: { 'data-motion-card': String(index + 1) } }));
    const stack = card.append(new FakeNode({ attrs: { 'data-motion-card-stack': '' } }));
    for (let layer = 0; layer < 3; layer += 1) {
      stack.append(new FakeNode({ attrs: { 'data-motion-card-layer': String(layer) } }));
    }
    return { card, stack };
  });
  document.querySelectorAll = (selector) => {
    if (selector === '[data-motion-card]') return cards.map(({ card }) => card);
    if (selector === '[data-motion-hero], [data-motion-showcase]') return [showcase];
    return [];
  };
  const requested = new Set();
  const scheduler = {
    request(controller) { requested.add(controller); },
    cancel(controller) { requested.delete(controller); },
    now(timestamp) { return timestamp; },
  };
  let intersectionObserver;
  const context = {
    root,
    signal: new AbortController().signal,
    policy: { motionAllowed: true, finePointerEffects: false, forcedColors: false },
    scheduler,
    coordinator: createInteractionCoordinator(),
    clock: () => 100,
    observerFactory: observer ? (callback) => {
      intersectionObserver = { observe() {}, disconnect() {}, emit(records) { callback(records); } };
      return intersectionObserver;
    } : () => null,
  };
  const controller = mountCardStacks(context);
  return {
    browserWindow,
    cards,
    context,
    controller,
    document,
    intersectionObserver,
    requested,
    showcase,
  };
}

test('one shared client owns a 220ms card transition and cleans up on preemption', () => {
  const harness = createHarness();
  const { card, stack } = harness.cards[0];
  const link = card.append(new FakeNode({ attrs: { href: '/work' } }));

  assert.equal(card.dispatch('pointerdown', { target: link }), false);
  assert.equal(stack.getAttribute('data-expanded'), null);
  assert.equal(card.dispatch('click', { target: link }), false);
  assert.equal(stack.getAttribute('data-expanded'), '');
  assert.equal(harness.context.coordinator.owner, 'card:1');
  assert.equal(harness.requested.size, 1);
  for (const layer of stack.querySelectorAll('[data-motion-card-layer]')) {
    assert.equal(layer.style.values.get('will-change'), 'transform');
  }

  harness.controller.update(319);
  assert.equal(harness.context.coordinator.owner, 'card:1');
  harness.controller.update(320);
  assert.equal(harness.context.coordinator.owner, null);
  assert.equal(harness.requested.size, 0);
  for (const layer of stack.querySelectorAll('[data-motion-card-layer]')) {
    assert.equal(layer.style.values.has('will-change'), false);
  }

  card.dispatch('pointerleave');
  card.dispatch('focusin');
  card.dispatch('pointerenter');
  card.dispatch('pointerleave');
  assert.equal(stack.getAttribute('data-expanded'), '');
  assert.equal(harness.context.coordinator.claim('grid', 2), true);
  assert.equal(harness.requested.size, 0);
  assert.equal(harness.context.coordinator.owner, 'grid');
  const gridController = {};
  harness.context.scheduler.request(gridController);
  assert.ok(harness.requested.size <= 1);
  harness.context.scheduler.cancel(gridController);
  for (const layer of stack.querySelectorAll('[data-motion-card-layer]')) {
    assert.equal(layer.style.values.has('will-change'), false);
  }
});

test('link and same-card shuffle ownership yield while unrelated cards may preempt', () => {
  const harness = createHarness();
  const first = harness.cards[0];
  const second = harness.cards[1];
  const link = first.card.append(new FakeNode({ attrs: {
    href: '/work', 'data-motion-burst': '',
  } }));
  const pointerController = mountPointerEffects(harness.context);

  harness.document.dispatch('pointerover', { target: link, relatedTarget: null });
  assert.equal(harness.context.coordinator.afterRelease('link:/work', 'shuffle:1', () => {
    harness.context.coordinator.claim('shuffle:1', 1);
  }), true);
  first.card.dispatch('pointerenter');
  assert.equal(first.stack.getAttribute('data-expanded'), '');
  assert.equal(first.stack.getAttribute('data-motion-static'), '');
  assert.equal(harness.context.coordinator.owner, 'link:/work');
  assert.equal(harness.requested.size, 1);

  pointerController.update(150);
  assert.equal(harness.context.coordinator.owner, 'link:/work');
  assert.equal(pointerController.update(200), false);
  harness.context.scheduler.cancel(pointerController);
  assert.equal(harness.context.coordinator.owner, 'shuffle:1');
  const marker = first.card.append(new FakeNode({ attrs: {
    'data-motion-shuffle': '', 'data-active': '',
  } }));
  assert.ok(marker);
  first.card.dispatch('pointerleave');
  first.card.dispatch('pointerenter');
  assert.equal(harness.context.coordinator.owner, 'shuffle:1');
  second.card.dispatch('pointerenter');
  assert.equal(harness.context.coordinator.owner, 'card:2');
  assert.equal(harness.requested.size, 1);
});

test('offscreen observers and fallback scrolling synchronously cancel and leave re-entry idle', () => {
  for (const observer of [true, false]) {
    const harness = createHarness({ observer });
    harness.cards[0].card.dispatch('pointerenter');
    assert.equal(harness.requested.size, 1);
    if (observer) {
      harness.intersectionObserver.emit([{ target: harness.showcase, isIntersecting: false }]);
      harness.intersectionObserver.emit([{ target: harness.showcase, isIntersecting: true }]);
    } else {
      harness.showcase.rect = { top: 1000, bottom: 1200 };
      harness.browserWindow.dispatch('scroll');
      harness.showcase.rect = { top: 0, bottom: 300 };
      harness.browserWindow.dispatch('resize');
    }
    assert.equal(harness.context.coordinator.owner, null);
    assert.equal(harness.requested.size, 0);
  }
});
