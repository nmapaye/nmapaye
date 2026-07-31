import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInteractionCoordinator,
  destroyMotion,
  initializeMotion,
} from '../src/scripts/motion/index.mjs';
import { mountNavigationWipe } from '../src/scripts/motion/navigation-wipe.mjs';
import { createFrameScheduler } from '../src/scripts/motion/scheduler.mjs';

test('initialization is idempotent and teardown destroys every controller', () => {
  const root = {};
  let mounts = 0;
  let destroys = 0;
  const environment = {
    controllerFactories: [
      () => {
        mounts += 1;
        return { destroy() { destroys += 1; } };
      },
    ],
    requestFrame() { return 1; },
    cancelFrame() {},
    observePolicy({ onChange }) {
      const policy = {
        motionAllowed: true,
        reducedMotion: false,
        hidden: false,
      };
      onChange(policy);
      return policy;
    },
  };

  assert.equal(initializeMotion(root, environment), initializeMotion(root, environment));
  assert.equal(mounts, 1);
  destroyMotion(root);
  assert.equal(destroys, 1);
});

test('higher-priority ownership preempts foreground motion', () => {
  const coordinator = createInteractionCoordinator();
  let cancelled = 0;
  assert.equal(coordinator.claim('card:01', 1, () => { cancelled += 1; }), true);
  assert.equal(coordinator.claim('grid', 2), true);
  assert.equal(coordinator.owner, 'grid');
  assert.equal(cancelled, 1);
  assert.equal(coordinator.claim('burst:01', 1), false);
  coordinator.release('grid');
  assert.equal(coordinator.owner, null);
});

test('a normal release runs one queued follow-up but preemption discards it', () => {
  const coordinator = createInteractionCoordinator();
  const seen = [];
  coordinator.claim('link:/work', 1);
  coordinator.afterRelease('link:/work', 'shuffle:01', () => {
    seen.push('shuffle');
  });
  coordinator.release('link:/work');
  assert.deepEqual(seen, ['shuffle']);

  coordinator.claim('link:/work', 1);
  coordinator.afterRelease('link:/work', 'shuffle:01', () => {
    seen.push('stale');
  });
  coordinator.claim('grid', 2);
  assert.deepEqual(seen, ['shuffle']);
});

test('navigation locks foreground motion until its idempotent unlock restores the latest policy', () => {
  const frames = [];
  const frameScheduler = createFrameScheduler({
    requestFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame() {},
  });
  let cancellations = 0;
  let suspensions = 0;
  let resumptions = 0;
  const scheduler = {
    ...frameScheduler,
    cancelAll() {
      cancellations += 1;
      frameScheduler.cancelAll();
    },
    suspend() {
      suspensions += 1;
      frameScheduler.suspend();
    },
    resume() {
      resumptions += 1;
      frameScheduler.resume();
    },
  };
  const policies = [];
  let context;
  let emitPolicy;
  const initialPolicy = {
    motionAllowed: true,
    finePointerEffects: true,
    blendAllowed: true,
    perspectiveAllowed: true,
    reducedMotion: false,
    hidden: false,
  };
  const changedPolicy = {
    ...initialPolicy,
    reducedMotion: true,
    motionAllowed: false,
    finePointerEffects: false,
    blendAllowed: false,
    perspectiveAllowed: false,
  };

  initializeMotion({}, {
    scheduler,
    observePolicy({ onChange }) {
      emitPolicy = onChange;
      onChange(initialPolicy);
      return { current: initialPolicy };
    },
    controllerFactories: [
      (controllerContext) => {
        context = controllerContext;
        return { setPolicy(policy) { policies.push(policy); } };
      },
    ],
  });

  const unlock = context.lockForNavigation();
  assert.deepEqual(policies.at(-1), {
    ...initialPolicy,
    navigationActive: true,
    motionAllowed: false,
    finePointerEffects: false,
    blendAllowed: false,
    perspectiveAllowed: false,
  });
  assert.equal(cancellations, 1);
  assert.equal(suspensions, 1);

  emitPolicy(changedPolicy);
  assert.equal(policies.at(-1).navigationActive, true);
  unlock();
  unlock();
  assert.deepEqual(policies.at(-1), {
    ...changedPolicy,
    navigationActive: false,
  });
  assert.equal(resumptions, 1);
  assert.equal(scheduler.snapshot().suspended, true);
  assert.equal(frames.length, 0);
});

class FakeEventTarget {
  constructor(sequence = [], label = 'node') {
    this.attributes = new Map();
    this.listeners = new Map();
    this.sequence = sequence;
    this.label = label;
  }

  addEventListener(type, listener, options = {}) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
    options.signal?.addEventListener('abort', () => {
      this.listeners.get(type)?.delete(listener);
    }, { once: true });
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type, event = {}) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size ?? 0;
  }

  setAttribute(name, value = '') {
    this.attributes.set(name, String(value));
    this.sequence.push(`attribute:${this.label}:${name}`);
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

function createClassList() {
  const values = new Set();
  return {
    add(value) { values.add(value); },
    remove(value) { values.delete(value); },
    contains(value) { return values.has(value); },
  };
}

function createSchedulerHarness(sequence = []) {
  const active = new Set();
  let suspended = false;
  return {
    scheduler: {
      request(controller) {
        active.add(controller);
        sequence.push('scheduler:request');
        return true;
      },
      cancel(controller) {
        active.delete(controller);
        sequence.push('scheduler:cancel');
      },
      cancelAll() {
        active.clear();
        sequence.push('scheduler:cancelAll');
      },
      suspend() {
        suspended = true;
        sequence.push('scheduler:suspend');
      },
      resume() {
        suspended = false;
        sequence.push('scheduler:resume');
      },
      resetTiming() {
        sequence.push('scheduler:resetTiming');
      },
      now(timestamp) { return timestamp; },
      destroy() {
        active.clear();
        suspended = true;
        sequence.push('scheduler:destroy');
      },
      snapshot() {
        return { active: active.size, suspended };
      },
    },
    active,
  };
}

function createLifecycleDom({ kinetic = true, assign = () => {}, sequence = [] } = {}) {
  const document = new FakeEventTarget(sequence);
  const browserWindow = new FakeEventTarget(sequence);
  const html = { classList: createClassList() };
  const layer = new FakeEventTarget(sequence, 'wipe');
  const panels = Array.from({ length: 3 }, () => new FakeEventTarget(sequence));
  const timers = new Map();
  let timerId = 0;

  browserWindow.location = {
    href: 'https://nmapaye.com/',
    assign,
  };
  browserWindow.setTimeout = (callback, delay) => {
    const id = ++timerId;
    timers.set(id, { callback, delay });
    sequence.push('timer:set');
    return id;
  };
  browserWindow.clearTimeout = (id) => {
    timers.delete(id);
    sequence.push('timer:clear');
  };
  document.defaultView = browserWindow;
  document.documentElement = html;
  document.hidden = false;

  const root = {
    ownerDocument: document,
    getAttribute(name) {
      return name === 'data-motion-kinetic' ? String(kinetic) : null;
    },
    querySelector(selector) {
      return selector === '[data-motion-wipe]' ? layer : null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-motion-wipe-panel]') return panels;
      return [];
    },
  };

  function anchor(href) {
    const node = new FakeEventTarget(sequence);
    node.setAttribute('href', href);
    node.closest = (selector) => selector === 'a[href]' ? node : null;
    return node;
  }

  function click(href) {
    let prevented = 0;
    document.dispatch('click', {
      target: anchor(href),
      button: 0,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      defaultPrevented: false,
      preventDefault() { prevented += 1; },
    });
    return prevented;
  }

  function runTimer() {
    const [id, timer] = timers.entries().next().value ?? [];
    if (!timer) return false;
    timers.delete(id);
    timer.callback();
    return true;
  }

  return {
    browserWindow,
    click,
    document,
    html,
    layer,
    panels,
    root,
    runTimer,
    timers,
  };
}

const visiblePolicy = {
  navigationActive: false,
  motionAllowed: true,
  finePointerEffects: true,
  blendAllowed: true,
  perspectiveAllowed: true,
  pointerAllowed: true,
  pointerCaptureAllowed: true,
  reducedMotion: false,
  hidden: false,
  forcedColors: false,
};

test('the default writing route mounts only navigation with zero background work', () => {
  const sequence = [];
  const dom = createLifecycleDom({ kinetic: false, sequence });
  const schedulerHarness = createSchedulerHarness(sequence);

  const mount = initializeMotion(dom.root, {
    window: dom.browserWindow,
    document: dom.document,
    scheduler: schedulerHarness.scheduler,
    observePolicy({ onChange }) {
      onChange(visiblePolicy);
      return { current: visiblePolicy, refresh() { return visiblePolicy; } };
    },
    observerFactory() {
      throw new Error('kinetic observer must not mount on writing');
    },
  });

  assert.equal(dom.document.listenerCount('click'), 1);
  assert.equal(dom.document.listenerCount('pointermove'), 0);
  assert.equal(dom.browserWindow.listenerCount('scroll'), 0);
  assert.equal(schedulerHarness.scheduler.snapshot().active, 0);
  assert.equal(dom.timers.size, 0);
  assert.equal(dom.html.classList.contains('motion-ready'), true);

  mount.destroy();
  mount.destroy();
  assert.equal(dom.document.listenerCount('click'), 0);
  assert.equal(dom.browserWindow.listenerCount('pagehide'), 0);
  assert.equal(dom.panels.some((panel) => panel.listenerCount('transitionend') > 0), false);
  assert.equal(dom.html.classList.contains('motion-ready'), false);
});

test('factory failures preserve static fallback and do not block later controllers', () => {
  const dom = createLifecycleDom();
  const schedulerHarness = createSchedulerHarness();
  const fallback = new FakeEventTarget();
  const errors = [];
  let laterPolicies = 0;
  let laterDestroys = 0;

  const mount = initializeMotion(dom.root, {
    window: dom.browserWindow,
    document: dom.document,
    scheduler: schedulerHarness.scheduler,
    observePolicy({ onChange }) {
      onChange(visiblePolicy);
      return { current: visiblePolicy };
    },
    onError(error) { errors.push(error); },
    controllerFactories: [
      () => { throw new Error('factory failed before enhancement'); },
      () => ({
        setPolicy() { laterPolicies += 1; },
        destroy() { laterDestroys += 1; },
      }),
    ],
  });

  assert.equal(errors.length, 1);
  assert.equal(fallback.hasAttribute('data-motion-enhanced'), false);
  assert.equal(fallback.hasAttribute('hidden'), false);
  assert.equal(laterPolicies, 1);
  mount.destroy();
  assert.equal(laterDestroys, 1);
});

function makeActivityFactory(name, state) {
  return (context) => {
    state.schedulers.add(context.scheduler);
    state.coordinators.add(context.coordinator);
    state.context = context;
    const client = { update() { return true; } };
    const marker = new FakeEventTarget(state.sequence);
    marker.setAttribute('data-active', '');
    context.scheduler.request(client);
    state.markers.push(marker);
    state.clients.push(client);
    if (name === 'owner') {
      context.coordinator.claim('card:01', 1, () => {
        marker.removeAttribute('data-active');
        context.scheduler.cancel(client);
      });
    }
    const controller = {
      setPolicy(policy) {
        state.policies.push({ name, policy });
        state.sequence.push(`policy:${name}:${policy.navigationActive}`);
        if (!policy.motionAllowed || policy.forcedColors || policy.hidden) {
          marker.removeAttribute('data-active');
          context.scheduler.cancel(client);
        }
      },
      pagehide(reason) {
        state.pagehides.push([name, reason]);
      },
      destroy() {
        marker.removeAttribute('data-active');
        context.scheduler.cancel(client);
        state.destroys.push(name);
      },
      startFromInput() {
        if (context.policy.motionAllowed) {
          marker.setAttribute('data-active', '');
          context.scheduler.request(client);
        }
      },
    };
    state.controllers.set(name, controller);
    return controller;
  };
}

function createOrchestrationHarness({ assign } = {}) {
  const sequence = [];
  const destinations = [];
  let assignmentFailure = null;
  const dom = createLifecycleDom({
    sequence,
    assign(destination) {
      sequence.push('location:assign');
      if (assignmentFailure) throw assignmentFailure;
      destinations.push(destination);
      assign?.(destination);
    },
  });
  const schedulerHarness = createSchedulerHarness(sequence);
  const state = {
    clients: [],
    context: null,
    controllers: new Map(),
    coordinators: new Set(),
    destroys: [],
    markers: [],
    pagehides: [],
    policies: [],
    schedulers: new Set(),
    sequence,
  };
  let emitPolicy;
  let refreshedPolicy = visiblePolicy;
  const errors = [];
  const mount = initializeMotion(dom.root, {
    window: dom.browserWindow,
    document: dom.document,
    scheduler: schedulerHarness.scheduler,
    onError(error) { errors.push(error); },
    observePolicy({ onChange }) {
      emitPolicy = onChange;
      onChange(visiblePolicy);
      return {
        current: visiblePolicy,
        refresh() {
          sequence.push('policy:refresh');
          onChange(refreshedPolicy);
          return refreshedPolicy;
        },
      };
    },
    controllerFactories: [
      mountNavigationWipe,
      makeActivityFactory('pointer', state),
      makeActivityFactory('marquee', state),
      makeActivityFactory('owner', state),
    ],
  });
  return {
    ...dom,
    destinations,
    emitPolicy,
    errors,
    mount,
    schedulerHarness,
    sequence,
    setAssignmentFailure(error) { assignmentFailure = error; },
    setRefreshedPolicy(policy) { refreshedPolicy = policy; },
    state,
  };
}

test('navigation broadcasts static policy before activation and keeps live policy locked', () => {
  const harness = createOrchestrationHarness();
  assert.equal(harness.schedulerHarness.scheduler.snapshot().active, 3);
  assert.equal(harness.state.schedulers.size, 1);
  assert.equal(harness.state.coordinators.size, 1);

  assert.equal(harness.click('/writing/'), 1);
  assert.equal(harness.timers.size, 1);
  assert.equal(harness.schedulerHarness.scheduler.snapshot().active, 0);
  assert.equal(harness.state.markers.some((marker) => marker.hasAttribute('data-active')), false);
  assert.equal(harness.state.policies.slice(-3).every(({ policy }) => (
    policy.navigationActive && !policy.motionAllowed
  )), true);
  const firstWipeActivation = harness.sequence.indexOf('attribute:wipe:data-active');
  const lastNavigationPolicy = harness.sequence.lastIndexOf('policy:owner:true');
  assert.equal(lastNavigationPolicy < firstWipeActivation, true);
  assert.equal(harness.sequence.indexOf('scheduler:cancelAll') < firstWipeActivation, true);

  harness.emitPolicy({
    ...visiblePolicy,
    finePointerEffects: false,
  });
  assert.equal(harness.state.policies.slice(-3).every(({ policy }) => (
    policy.navigationActive && !policy.motionAllowed && !policy.finePointerEffects
  )), true);
  assert.equal(harness.schedulerHarness.scheduler.snapshot().active, 0);
  assert.equal(harness.timers.size, 1);

  harness.mount.destroy();
  assert.equal(harness.timers.size, 0);
  assert.equal(harness.state.markers.some((marker) => marker.hasAttribute('data-active')), false);
  assert.equal(harness.state.destroys.length, 3);
});

test('grid and navigation preemption never exceed the three-client bound', () => {
  const harness = createOrchestrationHarness();
  const gridClient = { update() { return true; } };
  assert.equal(harness.schedulerHarness.scheduler.snapshot().active, 3);

  harness.state.context.coordinator.preempt('grid', 2, () => {
    harness.schedulerHarness.scheduler.cancel(gridClient);
  });
  assert.equal(harness.schedulerHarness.scheduler.snapshot().active, 2);
  harness.schedulerHarness.scheduler.request(gridClient);
  assert.equal(harness.schedulerHarness.scheduler.snapshot().active, 3);

  harness.click('/writing/');
  assert.equal(harness.schedulerHarness.scheduler.snapshot().active, 0);
  assert.equal(harness.timers.size, 1);
  harness.mount.destroy();
});

test('failed accessibility navigation unlocks to fresh policy without restarting background work', () => {
  for (const accessibilityPolicy of [
    {
      ...visiblePolicy,
      motionAllowed: false,
      finePointerEffects: false,
      blendAllowed: false,
      perspectiveAllowed: false,
      reducedMotion: true,
    },
    {
      ...visiblePolicy,
      finePointerEffects: false,
      blendAllowed: false,
      forcedColors: true,
    },
  ]) {
    const harness = createOrchestrationHarness();
    const assignmentFailure = new Error('location.assign failed');
    harness.setAssignmentFailure(assignmentFailure);
    harness.click('/writing/');
    harness.emitPolicy(accessibilityPolicy);

    assert.equal(harness.errors.includes(assignmentFailure), true);
    assert.equal(harness.timers.size, 0);
    assert.equal(harness.schedulerHarness.scheduler.snapshot().active, 0);
    assert.equal(harness.state.policies.slice(-3).every(({ policy }) => (
      policy.navigationActive === false
      && policy.reducedMotion === accessibilityPolicy.reducedMotion
      && policy.forcedColors === accessibilityPolicy.forcedColors
    )), true);

    harness.emitPolicy(visiblePolicy);
    assert.equal(harness.schedulerHarness.scheduler.snapshot().active, 0);
    harness.state.controllers.get('pointer').startFromInput();
    assert.equal(harness.schedulerHarness.scheduler.snapshot().active, 1);
    harness.mount.destroy();
  }
});

test('hidden pagehide and pageshow refresh policy before resume and clear the retained lock', () => {
  const harness = createOrchestrationHarness();
  harness.click('/writing/');
  assert.equal(harness.runTimer(), true);
  assert.deepEqual(harness.destinations, ['https://nmapaye.com/writing/']);

  const hiddenPolicy = {
    ...visiblePolicy,
    motionAllowed: false,
    finePointerEffects: false,
    blendAllowed: false,
    perspectiveAllowed: false,
    hidden: true,
  };
  harness.document.hidden = true;
  harness.emitPolicy(hiddenPolicy);
  harness.browserWindow.dispatch('pagehide', {});
  assert.equal(harness.state.pagehides.length, 3);
  harness.document.hidden = false;
  harness.setRefreshedPolicy(visiblePolicy);
  const beforePageShow = harness.sequence.length;
  harness.browserWindow.dispatch('pageshow', {});
  const pageShowSequence = harness.sequence.slice(beforePageShow);

  assert.equal(
    pageShowSequence.indexOf('policy:refresh')
      < pageShowSequence.indexOf('scheduler:resume'),
    true,
  );
  assert.equal(harness.state.policies.slice(-3).every(({ policy }) => (
    policy.navigationActive === false && policy.motionAllowed && !policy.hidden
  )), true);
  assert.equal(harness.schedulerHarness.scheduler.snapshot().active, 0);
  assert.equal(harness.click('/other/'), 1);
  assert.equal(harness.timers.size, 1);
  harness.mount.destroy();
});
