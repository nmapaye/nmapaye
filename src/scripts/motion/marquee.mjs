export function createMarqueeState({ scrollY = 0, timestamp = 0 } = {}) {
  return { position: 0, velocity: 0, scrollY, timestamp, active: false };
}

export function sampleScroll(state, sample, config) {
  const sampleElapsed = Math.max(1, sample.timestamp - state.timestamp);
  const elapsed = Math.min(sampleElapsed, config.maxElapsed ?? sampleElapsed);
  const signed = ((sample.scrollY - state.scrollY) / elapsed) * config.impulse;
  return {
    ...state,
    velocity: Math.max(-config.maxVelocity, Math.min(config.maxVelocity, signed)),
    scrollY: sample.scrollY,
    timestamp: sample.timestamp,
    active: true,
  };
}

export function advanceMarquee(state, elapsed, config) {
  const velocity = Math.abs(state.velocity) <= config.stopVelocity
    ? 0
    : state.velocity * Math.pow(config.decay, elapsed / 25);
  const rawPosition = state.position + velocity * (elapsed / 16.667);
  const wrapSpan = config.wrapSpan ?? Number.MAX_SAFE_INTEGER;
  return {
    ...state,
    position: ((rawPosition % wrapSpan) + wrapSpan) % wrapSpan,
    velocity,
    active: velocity !== 0,
  };
}

export function mountMarquee(context) {
  const document = context.root.ownerDocument;
  const browserWindow = document.defaultView;
  const element = document.querySelector('[data-motion-marquee]');
  const hero = element?.closest('[data-motion-hero]');
  const tracks = [...(element?.querySelectorAll('[data-motion-marquee-track]') ?? [])];
  if (!browserWindow || !element || !hero || tracks.length !== 2) return null;

  let wrapSpan = tracks[0].scrollWidth;
  if (wrapSpan <= 0) return null;
  let state = createMarqueeState({
    scrollY: browserWindow.scrollY,
    timestamp: context.clock(),
  });
  let previousFrame = null;
  let stopAt = null;
  let nearViewport = true;
  let destroyed = false;
  let controller;
  let observer;
  const listenerAbortController = new AbortController();
  const abortListeners = () => listenerAbortController.abort();
  if (context.signal?.aborted) abortListeners();
  else context.signal?.addEventListener('abort', abortListeners, { once: true });

  function render() {
    element.style.setProperty('--motion-marquee-x', `${-state.position}px`);
  }

  function refreshGeometry() {
    if (destroyed) return;
    const nextWrapSpan = tracks[0].scrollWidth;
    if (nextWrapSpan <= 0) return;
    wrapSpan = nextWrapSpan;
    state = {
      ...state,
      position: ((state.position % wrapSpan) + wrapSpan) % wrapSpan,
    };
    render();
  }

  try {
    observer = context.observerFactory?.((entries) => {
      if (destroyed) return;
      nearViewport = entries.some((entry) => entry.isIntersecting);
      if (!nearViewport) {
        state = { ...state, velocity: 0, active: false };
        previousFrame = null;
        stopAt = null;
        context.scheduler.cancel(controller);
      }
    }, { rootMargin: '25% 0px' });
    if (observer) {
      nearViewport = false;
      observer.observe(hero);
    }
  } catch (error) {
    listenerAbortController.abort();
    context.signal?.removeEventListener?.('abort', abortListeners);
    element.removeAttribute('data-motion-enhanced');
    throw error;
  }

  controller = {
    update(timestamp) {
      if (
        destroyed
        || !nearViewport
        || !context.policy.motionAllowed
        || context.policy.forcedColors
      ) return false;
      if (stopAt !== null && context.clock() >= stopAt) {
        state = { ...state, velocity: 0, active: false };
        previousFrame = null;
        stopAt = null;
        render();
        return false;
      }
      const elapsed = previousFrame === null ? 0 : timestamp - previousFrame;
      previousFrame = timestamp;
      state = advanceMarquee(state, elapsed, {
        decay: 0.58,
        stopVelocity: 0.25,
        wrapSpan,
      });
      render();
      if (!state.active) {
        previousFrame = null;
        stopAt = null;
      }
      return state.active;
    },
    setPolicy(policy) {
      if (destroyed) return;
      if (!policy.motionAllowed || policy.forcedColors) {
        state = { ...state, velocity: 0, active: false, position: 0 };
        previousFrame = null;
        stopAt = null;
        element.style.setProperty('--motion-marquee-x', '0px');
        context.scheduler.cancel(controller);
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      listenerAbortController.abort();
      context.signal?.removeEventListener?.('abort', abortListeners);
      context.scheduler.cancel(controller);
      observer?.disconnect();
      previousFrame = null;
      stopAt = null;
      element.removeAttribute('data-motion-enhanced');
      element.style.removeProperty('--motion-marquee-x');
    },
  };

  function onScroll() {
    if (
      destroyed
      || !nearViewport
      || !context.policy.motionAllowed
      || context.policy.forcedColors
    ) return;
    const rawTimestamp = context.clock();
    const timelineTimestamp = context.scheduler.now?.(rawTimestamp) ?? rawTimestamp;
    const wasActive = state.active;
    state = sampleScroll(state, {
      scrollY: browserWindow.scrollY,
      timestamp: rawTimestamp,
    }, { impulse: 12, maxVelocity: 40, maxElapsed: 50 });
    if (!wasActive || previousFrame === null) previousFrame = timelineTimestamp;
    stopAt = rawTimestamp + 250;
    context.scheduler.request(controller);
  }
  try {
    browserWindow.addEventListener('scroll', onScroll, {
      signal: listenerAbortController.signal,
      passive: true,
    });
    browserWindow.addEventListener('resize', refreshGeometry, {
      signal: listenerAbortController.signal,
      passive: true,
    });
    browserWindow.addEventListener('orientationchange', refreshGeometry, {
      signal: listenerAbortController.signal,
      passive: true,
    });
  } catch (error) {
    listenerAbortController.abort();
    context.signal?.removeEventListener?.('abort', abortListeners);
    observer?.disconnect();
    element.removeAttribute('data-motion-enhanced');
    throw error;
  }
  element.setAttribute('data-motion-enhanced', '');
  return controller;
}
