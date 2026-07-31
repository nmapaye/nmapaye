export function createMarqueeState({ scrollY = 0, timestamp = 0 } = {}) {
  return { position: 0, velocity: 0, scrollY, timestamp, active: false };
}

export function sampleScroll(state, sample, config) {
  const elapsed = Math.max(1, sample.timestamp - state.timestamp);
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

  const wrapSpan = tracks[0].scrollWidth;
  if (wrapSpan <= 0) return null;
  let state = createMarqueeState({
    scrollY: browserWindow.scrollY,
    timestamp: context.clock(),
  });
  let previousFrame = null;
  let nearViewport = true;
  let controller;
  let observer;
  try {
    observer = context.observerFactory?.((entries) => {
      nearViewport = entries.some((entry) => entry.isIntersecting);
      if (!nearViewport) {
        state = { ...state, velocity: 0, active: false };
        previousFrame = null;
        context.scheduler.cancel(controller);
      }
    }, { rootMargin: '25% 0px' });
    if (observer) {
      nearViewport = false;
      observer.observe(hero);
    }
  } catch (error) {
    element.removeAttribute('data-motion-enhanced');
    throw error;
  }

  controller = {
    update(timestamp) {
      if (
        !nearViewport
        || !context.policy.motionAllowed
        || context.policy.forcedColors
      ) return false;
      const elapsed = previousFrame === null ? 0 : timestamp - previousFrame;
      previousFrame = timestamp;
      state = advanceMarquee(state, elapsed, {
        decay: 0.58,
        stopVelocity: 0.25,
        wrapSpan,
      });
      element.style.setProperty('--motion-marquee-x', `${-state.position}px`);
      return state.active;
    },
    setPolicy(policy) {
      if (!policy.motionAllowed || policy.forcedColors) {
        state = { ...state, velocity: 0, active: false, position: 0 };
        previousFrame = null;
        element.style.setProperty('--motion-marquee-x', '0px');
        context.scheduler.cancel(controller);
      }
    },
    destroy() {
      context.scheduler.cancel(controller);
      observer?.disconnect();
      element.removeAttribute('data-motion-enhanced');
      element.style.removeProperty('--motion-marquee-x');
    },
  };

  function onScroll() {
    if (
      !nearViewport
      || !context.policy.motionAllowed
      || context.policy.forcedColors
    ) return;
    state = sampleScroll(state, {
      scrollY: browserWindow.scrollY,
      timestamp: context.clock(),
    }, { impulse: 12, maxVelocity: 40 });
    context.scheduler.request(controller);
  }
  try {
    browserWindow.addEventListener('scroll', onScroll, {
      signal: context.signal,
      passive: true,
    });
  } catch (error) {
    observer?.disconnect();
    element.removeAttribute('data-motion-enhanced');
    throw error;
  }
  element.setAttribute('data-motion-enhanced', '');
  return controller;
}
