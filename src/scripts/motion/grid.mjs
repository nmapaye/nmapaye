function wrap(value, span) {
  return ((value % span) + span) % span;
}

export function layoutGridTiles(state, { columns = 4, rows = 4 } = {}) {
  const stepX = state.width / columns;
  const stepY = state.height / rows;
  return Array.from({ length: state.tileCount }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns) % rows;
    return {
      x: wrap(column * stepX + state.x + stepX, state.width) - stepX,
      y: wrap(row * stepY + state.y + stepY, state.height) - stepY,
    };
  });
}

export function createGridState({ tileCount, width, height }) {
  return {
    tileCount,
    width,
    height,
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    pointerId: null,
    originX: 0,
    originY: 0,
    lastX: 0,
    lastY: 0,
    lastTimestamp: 0,
    dragging: false,
    seamX: false,
    seamY: false,
    inertia: { active: false },
  };
}

export function advanceGrid(state, elapsed, config) {
  if (!state.inertia.active) return { ...state, seamX: false, seamY: false };
  const rawX = state.x + state.velocityX * (elapsed / 16.667);
  const rawY = state.y + state.velocityY * (elapsed / 16.667);
  const velocityX = state.velocityX * config.damping;
  const velocityY = state.velocityY * config.damping;
  const active = Math.hypot(velocityX, velocityY) >= config.stopVelocity;
  return {
    ...state,
    x: wrap(rawX, state.width),
    y: wrap(rawY, state.height),
    velocityX,
    velocityY,
    seamX: rawX < 0 || rawX >= state.width,
    seamY: rawY < 0 || rawY >= state.height,
    inertia: { active },
  };
}

export function reduceGrid(state, event, config) {
  if (event.type === 'pointerdown' && state.pointerId === null) {
    return {
      ...state,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      originX: event.x,
      originY: event.y,
      lastX: event.x,
      lastY: event.y,
      lastTimestamp: event.timestamp,
      dragging: false,
      velocityX: 0,
      velocityY: 0,
      inertia: { active: false },
    };
  }
  if (event.type === 'pointermove' && event.pointerId === state.pointerId) {
    const totalX = event.x - state.originX;
    const totalY = event.y - state.originY;
    const distance = state.pointerType === 'touch'
      ? Math.abs(totalX)
      : Math.hypot(totalX, totalY);
    const dragging = state.dragging || distance >= config.threshold;
    if (!dragging) return { ...state, lastX: event.x, lastY: event.y };
    const elapsed = Math.max(1, event.timestamp - state.lastTimestamp);
    const deltaX = event.x - state.lastX;
    const deltaY = state.pointerType === 'touch' ? 0 : event.y - state.lastY;
    return {
      ...state,
      x: wrap(state.x + deltaX, state.width),
      y: wrap(state.y + deltaY, state.height),
      velocityX: (deltaX / elapsed) * 16.667,
      velocityY: (deltaY / elapsed) * 16.667,
      lastX: event.x,
      lastY: event.y,
      lastTimestamp: event.timestamp,
      dragging: true,
    };
  }
  if (
    ['pointerup', 'pointercancel', 'lostpointercapture'].includes(event.type) &&
    event.pointerId === state.pointerId
  ) {
    const cancelled = event.type !== 'pointerup';
    return {
      ...state,
      pointerId: null,
      dragging: false,
      velocityX: cancelled ? 0 : state.velocityX,
      velocityY: cancelled ? 0 : state.velocityY,
      inertia: {
        active:
          !cancelled &&
          config.motionAllowed !== false &&
          Math.hypot(state.velocityX, state.velocityY) > 0,
      },
    };
  }
  if (event.type === 'key' && event.key === 'Home') {
    return {
      ...state,
      x: 0,
      y: 0,
      velocityX: 0,
      velocityY: 0,
      inertia: { active: false },
    };
  }
  if (event.type === 'key' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    return {
      ...state,
      x: wrap(state.x + direction * config.keyboardStep, state.width),
      velocityX: 0,
      velocityY: 0,
      inertia: { active: false },
    };
  }
  if (event.type === 'policy' && !event.motionAllowed) {
    return {
      ...state,
      pointerId: null,
      dragging: false,
      velocityX: 0,
      velocityY: 0,
      inertia: { active: false },
    };
  }
  return state;
}

export function mountGrid(context) {
  const element = context.root.ownerDocument.querySelector('[data-motion-grid]');
  if (!element) return null;
  const showcase = element.closest('[data-motion-showcase]');
  const tileNodes = [...element.querySelectorAll('[data-motion-grid-tile]')];
  const bounds = element.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0 || tileNodes.length !== 16) return null;

  let state = createGridState({
    tileCount: tileNodes.length,
    width: bounds.width,
    height: bounds.height,
  });
  let previousLayout = null;
  let previousFrame = null;
  let visible = true;
  let visibilityObserver = null;
  let resizeObserver = null;
  let promoted = false;
  const seamState = Array.from({ length: tileNodes.length }, () => false);
  const listenerAbortController = new AbortController();
  const abortGridListeners = () => listenerAbortController.abort();
  if (context.signal?.aborted) abortGridListeners();
  else context.signal?.addEventListener('abort', abortGridListeners, { once: true });

  function render() {
    const layout = layoutGridTiles(state, { columns: 4, rows: 4 });
    layout.forEach((position, index) => {
      const node = tileNodes[index];
      const previous = previousLayout?.[index];
      const crossed = previous && (
        Math.abs(position.x - previous.x) > state.width / 2 ||
        Math.abs(position.y - previous.y) > state.height / 2
      );
      node.style.setProperty('--tile-x', `${position.x}px`);
      node.style.setProperty('--tile-y', `${position.y}px`);
      const seam = Boolean(crossed && context.policy.motionAllowed);
      if (seamState[index] !== seam) {
        node.toggleAttribute('data-motion-tile-seam', seam);
        seamState[index] = seam;
      }
    });
    previousLayout = layout;
  }

  function setPromotion(nextPromoted) {
    if (promoted === nextPromoted) return;
    promoted = nextPromoted;
    for (const node of tileNodes) {
      if (promoted) node.style.setProperty('will-change', 'transform');
      else node.style.removeProperty('will-change');
    }
  }

  function refreshDimensions(rect = element.getBoundingClientRect()) {
    if (rect.width <= 0 || rect.height <= 0) return;
    if (rect.width === state.width && rect.height === state.height) return;
    state = {
      ...state,
      width: rect.width,
      height: rect.height,
      x: wrap(state.x, rect.width),
      y: wrap(state.y, rect.height),
    };
    previousLayout = null;
    seamState.fill(false);
    for (const node of tileNodes) node.removeAttribute('data-motion-tile-seam');
    render();
  }

  function releaseCapture() {
    const pointerId = state.pointerId;
    if (pointerId !== null && element.hasPointerCapture?.(pointerId)) {
      try {
        element.releasePointerCapture(pointerId);
      } catch {
        // The browser may already have released capture during cancellation.
      }
    }
  }

  function stopGridMotion() {
    releaseCapture();
    state = reduceGrid(state, { type: 'policy', motionAllowed: false }, {});
    previousFrame = null;
    showcase?.removeAttribute('data-motion-dragging');
    context.coordinator.release('grid');
    context.coordinator.release('grid-inertia');
    context.scheduler.cancel(controller);
    setPromotion(false);
    seamState.fill(false);
    for (const node of tileNodes) node.removeAttribute('data-motion-tile-seam');
    render();
  }

  function applyVisibility(nextVisible) {
    if (visible === nextVisible) return;
    visible = nextVisible;
    if (!visible) stopGridMotion();
  }

  const controller = {
    update(timestamp) {
      const elapsed = previousFrame === null ? 0 : timestamp - previousFrame;
      previousFrame = timestamp;
      state = advanceGrid(state, elapsed, { damping: 0.92, stopVelocity: 0.08 });
      render();
      setPromotion(state.dragging || state.inertia.active);
      if (!state.dragging && !state.inertia.active) {
        context.coordinator.release('grid-inertia');
        previousFrame = null;
      }
      return state.inertia.active;
    },
    setPolicy(policy) {
      if (!policy.motionAllowed) {
        stopGridMotion();
        element.removeAttribute('data-motion-seam-x');
        element.removeAttribute('data-motion-seam-y');
      }
    },
    destroy() {
      stopGridMotion();
      listenerAbortController.abort();
      context.signal?.removeEventListener?.('abort', abortGridListeners);
      visibilityObserver?.disconnect();
      resizeObserver?.disconnect();
      element.removeAttribute('tabindex');
      element.removeAttribute('role');
      element.removeAttribute('aria-label');
      element.removeAttribute('aria-describedby');
      element.removeAttribute('data-motion-enhanced');
      element.setAttribute('aria-hidden', 'true');
      element.removeAttribute('style');
      for (const node of tileNodes) {
        node.setAttribute('aria-hidden', 'true');
        node.removeAttribute('data-motion-tile-seam');
        node.style.removeProperty('--tile-x');
        node.style.removeProperty('--tile-y');
        node.style.removeProperty('--tile-bounce');
        node.style.removeProperty('will-change');
      }
    },
  };

  function onPointerDown(event) {
    if (!visible) return;
    if (state.pointerId === null) {
      context.coordinator.release('grid-inertia');
      context.scheduler.cancel(controller);
      previousFrame = null;
    }
    const wasIdle = state.pointerId === null;
    state = reduceGrid(state, {
      type: 'pointerdown',
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      timestamp: event.timeStamp,
    }, { threshold: 8 });
    if (
      wasIdle &&
      state.pointerId === event.pointerId &&
      context.policy.pointerCaptureAllowed
    ) {
      element.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event) {
    if (!visible) return;
    const samples = event.getCoalescedEvents?.() ?? [event];
    const sample = samples.at(-1) ?? event;
    const before = state.dragging;
    const nextState = reduceGrid(state, {
      type: 'pointermove',
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      x: sample.clientX,
      y: sample.clientY,
      timestamp: sample.timeStamp,
    }, { threshold: 8 });
    if (!before && nextState.dragging) {
      const claimed = context.coordinator.claim('grid', 2, () => {
        releaseCapture();
        state = reduceGrid(state, {
          type: 'pointercancel', pointerId: state.pointerId,
        }, { motionAllowed: false });
        showcase?.removeAttribute('data-motion-dragging');
        context.scheduler.cancel(controller);
        previousFrame = null;
        setPromotion(false);
      });
      if (!claimed) {
        releaseCapture();
        state = reduceGrid(state, {
          type: 'pointercancel', pointerId: state.pointerId,
        }, { motionAllowed: false });
        context.scheduler.cancel(controller);
        previousFrame = null;
        setPromotion(false);
        return;
      }
      state = nextState;
      showcase?.setAttribute('data-motion-dragging', '');
      setPromotion(true);
    } else {
      state = nextState;
    }
    if (state.dragging) {
      if (context.policy.motionAllowed) context.scheduler.request(controller);
      else render();
    }
  }

  function onPointerEnd(event) {
    if (event.pointerId !== state.pointerId) return;
    releaseCapture();
    state = reduceGrid(state, {
      type: event.type, pointerId: event.pointerId,
    }, { motionAllowed: context.policy.motionAllowed });
    render();
    showcase?.removeAttribute('data-motion-dragging');
    context.coordinator.release('grid');
    context.scheduler.cancel(controller);
    previousFrame = null;
    setPromotion(state.inertia.active);
    if (
      state.inertia.active &&
      context.coordinator.claim('grid-inertia', 0, () => {
        state = {
          ...state,
          velocityX: 0,
          velocityY: 0,
          inertia: { active: false },
        };
        for (const node of tileNodes) node.removeAttribute('data-motion-tile-seam');
        context.scheduler.cancel(controller);
        previousFrame = null;
        setPromotion(false);
      })
    ) {
      context.scheduler.request(controller);
    }
  }

  function onKeyDown(event) {
    if (!visible || !['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    context.scheduler.cancel(controller);
    context.coordinator.release('grid-inertia');
    previousFrame = null;
    state = reduceGrid(state, { type: 'key', key: event.key }, { keyboardStep: 80 });
    render();
  }

  visibilityObserver = context.observerFactory?.((entries) => {
    const entry = entries.find((candidate) => candidate.target === (showcase ?? element));
    if (entry) applyVisibility(entry.isIntersecting);
  }, { threshold: 0 });
  if (visibilityObserver) {
    visibilityObserver.observe(showcase ?? element);
  } else {
    const browserWindow = element.ownerDocument.defaultView;
    const refreshFallbackVisibility = () => {
      const rect = (showcase ?? element).getBoundingClientRect();
      applyVisibility(rect.bottom > 0 && rect.top < (browserWindow?.innerHeight ?? rect.bottom));
    };
    refreshFallbackVisibility();
    browserWindow?.addEventListener('scroll', refreshFallbackVisibility, {
      signal: listenerAbortController.signal, passive: true,
    });
    browserWindow?.addEventListener('resize', refreshFallbackVisibility, {
      signal: listenerAbortController.signal, passive: true,
    });
  }

  const resizeObserverFactory = context.resizeObserverFactory ?? ((callback) => {
    const ResizeObserver = element.ownerDocument.defaultView?.ResizeObserver;
    return ResizeObserver ? new ResizeObserver(callback) : null;
  });
  resizeObserver = resizeObserverFactory?.((entries) => {
    const entry = entries.find((candidate) => candidate.target === element);
    if (entry) refreshDimensions(entry.contentRect);
  });
  resizeObserver?.observe(element);

  element.addEventListener('pointerdown', onPointerDown, { signal: listenerAbortController.signal });
  element.addEventListener('pointermove', onPointerMove, {
    signal: listenerAbortController.signal,
    passive: true,
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    element.addEventListener(type, onPointerEnd, { signal: listenerAbortController.signal });
  }
  for (const type of ['pointerup', 'pointercancel']) {
    element.ownerDocument.addEventListener(type, onPointerEnd, {
      signal: listenerAbortController.signal,
    });
  }
  element.ownerDocument.defaultView?.addEventListener('blur', () => {
    if (state.pointerId !== null) {
      onPointerEnd({ type: 'pointercancel', pointerId: state.pointerId });
    }
  }, { signal: listenerAbortController.signal });
  element.addEventListener('keydown', onKeyDown, { signal: listenerAbortController.signal });

  element.style.touchAction = 'pan-y';
  element.removeAttribute('aria-hidden');
  for (const node of tileNodes) node.setAttribute('aria-hidden', 'true');
  element.tabIndex = 0;
  element.setAttribute('role', 'region');
  element.setAttribute('aria-label', 'Draggable project-poster grid');
  element.setAttribute('aria-describedby', 'project-grid-instructions');
  element.setAttribute('data-motion-enhanced', '');
  render();
  return controller;
}
