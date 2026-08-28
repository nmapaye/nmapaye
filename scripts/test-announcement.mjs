import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isAnnouncementActive,
  mountAnnouncementExpiry,
} from '../src/scripts/motion/announcement.mjs';

const expiresAt = '2026-09-04T09:27:00Z';

test('announcement activity uses a strict, parseable expiry boundary', () => {
  const expiry = Date.parse(expiresAt);
  assert.equal(isAnnouncementActive(expiresAt, expiry - 1), true);
  assert.equal(isAnnouncementActive(expiresAt, expiry), false);
  assert.equal(isAnnouncementActive('not-a-date', expiry - 1), false);
});

test('announcement schedules its expiry and hides at the boundary', () => {
  const attributes = new Map([['data-announcement-expires-at', expiresAt]]);
  const banner = {
    hidden: false,
    getAttribute(name) { return attributes.get(name) ?? null; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
  };
  const timers = [];
  const cleared = [];
  const expiry = Date.parse(expiresAt);
  let currentTime = expiry - 1_000;

  const controller = mountAnnouncementExpiry({
    document: { querySelector() { return banner; } },
    now() { return currentTime; },
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimeout(id) { cleared.push(id); },
  });

  assert.equal(banner.hidden, false);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].delay, 1_000);

  currentTime = expiry;
  timers[0].callback();
  assert.equal(banner.hidden, true);
  assert.equal(attributes.get('aria-hidden'), 'true');

  controller.destroy();
  assert.deepEqual(cleared, [1]);
});

test('announcement hides immediately when mounted after expiry', () => {
  const attributes = new Map([['data-announcement-expires-at', expiresAt]]);
  const banner = {
    hidden: false,
    getAttribute(name) { return attributes.get(name) ?? null; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
  };
  let timerCount = 0;

  mountAnnouncementExpiry({
    document: { querySelector() { return banner; } },
    now() { return Date.parse(expiresAt); },
    setTimeout() { timerCount += 1; },
  });

  assert.equal(banner.hidden, true);
  assert.equal(timerCount, 0);
});
