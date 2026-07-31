import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInteractionCoordinator,
  destroyMotion,
  initializeMotion,
} from '../src/scripts/motion/index.mjs';

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
