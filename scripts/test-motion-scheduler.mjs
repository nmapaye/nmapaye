import assert from 'node:assert/strict';
import test from 'node:test';
import { createFrameScheduler } from '../src/scripts/motion/scheduler.mjs';

test('coalesces controllers into one frame and stops when idle', () => {
  const frames = [];
  const scheduler = createFrameScheduler({
    requestFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame() {},
    onError(error) {
      throw error;
    },
    maxDelta: 50,
  });
  const timestamps = [];
  const controller = {
    update(timestamp) {
      timestamps.push(timestamp);
      return false;
    },
  };

  scheduler.request(controller);
  scheduler.request(controller);
  assert.equal(frames.length, 1);

  frames.shift()(16);
  assert.deepEqual(timestamps, [16]);
  assert.deepEqual(scheduler.snapshot(), {
    pending: false,
    active: 0,
    suspended: false,
  });
});

test('caps restored-frame time and cancels every active controller', () => {
  const frames = [];
  const scheduler = createFrameScheduler({
    requestFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame() {},
    onError(error) {
      throw error;
    },
    maxDelta: 50,
  });
  const seen = [];
  const controller = {
    update(timestamp) {
      seen.push(timestamp);
      return seen.length < 2;
    },
  };

  scheduler.request(controller);
  frames.shift()(10);
  frames.shift()(5010);
  assert.deepEqual(seen, [10, 60]);
  scheduler.cancelAll();
  assert.equal(scheduler.snapshot().active, 0);
});

test('suspend and resume preserve virtual time without a restoration jump', () => {
  const frames = new Map();
  let nextId = 0;
  const flush = (timestamp) => {
    const [id, callback] = frames.entries().next().value;
    frames.delete(id);
    callback(timestamp);
  };
  const scheduler = createFrameScheduler({
    requestFrame(callback) {
      nextId += 1;
      frames.set(nextId, callback);
      return nextId;
    },
    cancelFrame(id) {
      frames.delete(id);
    },
  });
  const seen = [];
  const controller = {
    update(timestamp) {
      seen.push(timestamp);
      return seen.length < 3;
    },
  };

  scheduler.request(controller);
  flush(100);
  scheduler.suspend();
  scheduler.resume();
  flush(10_000);
  flush(10_016);

  assert.deepEqual(seen, [100, 100, 116]);
});

test('maps an idle event timestamp onto the next scheduler frame', () => {
  const frames = [];
  const scheduler = createFrameScheduler({
    requestFrame(callback) {
      frames.push(callback);
      return frames.length;
    },
    cancelFrame() {},
  });
  scheduler.request({ update() { return false; } });
  frames.shift()(100);

  const startedAt = scheduler.now(250);
  const elapsed = [];
  scheduler.request({
    update(timestamp) {
      elapsed.push(timestamp - startedAt);
      return false;
    },
  });
  frames.shift()(266);
  assert.deepEqual(elapsed, [16]);
});
