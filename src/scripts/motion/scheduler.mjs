export function createFrameScheduler({
  requestFrame,
  cancelFrame,
  onError = () => {},
  maxDelta = 50,
}) {
  const active = new Set();
  let frameId = null;
  let suspended = false;
  let destroyed = false;
  let rawTime = null;
  let timeline = null;
  let realignOnNextFrame = false;

  function stopFrame({ resetTimeline = false } = {}) {
    if (frameId !== null) cancelFrame(frameId);
    frameId = null;
    rawTime = null;
    if (resetTimeline) timeline = null;
  }

  function schedule() {
    if (!destroyed && !suspended && active.size > 0 && frameId === null) {
      frameId = requestFrame(tick);
    }
  }

  function tick(timestamp) {
    frameId = null;
    if (timeline === null) timeline = timestamp;
    else if (rawTime !== null) {
      timeline += Math.min(maxDelta, Math.max(0, timestamp - rawTime));
    } else if (realignOnNextFrame) {
      timeline = Math.max(timeline, timestamp);
    }
    rawTime = timestamp;
    realignOnNextFrame = false;

    for (const controller of [...active]) {
      if (!active.has(controller)) continue;
      try {
        if (controller.update(timeline) !== true) active.delete(controller);
      } catch (error) {
        active.delete(controller);
        onError(error, controller);
      }
    }
    if (active.size === 0) {
      rawTime = null;
      realignOnNextFrame = true;
    }
    schedule();
  }

  return {
    request(controller) {
      if (destroyed) return false;
      const wasIdle = active.size === 0;
      active.add(controller);
      if (wasIdle && !suspended) realignOnNextFrame = true;
      schedule();
      return true;
    },
    cancel(controller) {
      active.delete(controller);
      if (active.size === 0) {
        stopFrame();
        realignOnNextFrame = true;
      }
    },
    cancelAll() {
      active.clear();
      stopFrame();
      realignOnNextFrame = true;
    },
    now(rawTimestamp) {
      if (timeline === null) return rawTimestamp;
      if (rawTime === null) {
        return realignOnNextFrame
          ? Math.max(timeline, rawTimestamp)
          : timeline;
      }
      return timeline + Math.min(
        maxDelta,
        Math.max(0, rawTimestamp - rawTime),
      );
    },
    suspend() {
      suspended = true;
      stopFrame();
      realignOnNextFrame = false;
    },
    resume() {
      suspended = false;
      schedule();
    },
    resetTiming() {
      rawTime = null;
      realignOnNextFrame = true;
    },
    destroy() {
      destroyed = true;
      active.clear();
      stopFrame({ resetTimeline: true });
      realignOnNextFrame = false;
    },
    snapshot() {
      return { pending: frameId !== null, active: active.size, suspended };
    },
  };
}

export function createBrowserFrameScheduler(browserWindow, options = {}) {
  return createFrameScheduler({
    requestFrame: browserWindow.requestAnimationFrame.bind(browserWindow),
    cancelFrame: browserWindow.cancelAnimationFrame.bind(browserWindow),
    ...options,
  });
}
