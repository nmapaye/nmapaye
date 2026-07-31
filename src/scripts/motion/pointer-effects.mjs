export const BURST_SYMBOLS = ['✦', '◆', '⚡', '↗', '01', '02', '03', '04'];

export function shouldSpawnSticker(previous, next, limits) {
  if (!previous) return false;
  return (
    next.timestamp - previous.timestamp >= limits.minInterval &&
    Math.hypot(next.x - previous.x, next.y - previous.y) >= limits.minDistance
  );
}

export function advanceBlob(state, target, elapsed, config) {
  const scale = Math.min(elapsed, 50);
  let vx = (state.vx + (target.x - state.x) * config.stiffness * scale) * config.damping;
  let vy = (state.vy + (target.y - state.y) * config.stiffness * scale) * config.damping;
  const speed = Math.hypot(vx, vy);
  if (speed > config.maxSpeed) {
    vx *= config.maxSpeed / speed;
    vy *= config.maxSpeed / speed;
  }
  return { x: state.x + vx, y: state.y + vy, vx, vy };
}

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function createBurst({ seed, triggerCount, limit, lifetime }) {
  const random = seeded(seed ^ triggerCount);
  return Array.from({ length: Math.min(8, limit) }, (_, index) => ({
    symbol: BURST_SYMBOLS[Math.floor(random() * BURST_SYMBOLS.length)],
    x: (random() - 0.5) * 96,
    y: -24 - random() * 72,
    rotation: (random() - 0.5) * 80,
    scale: 0.75 + random() * 0.75,
    colorIndex: index % 3,
    expiresAt: lifetime,
  }));
}

export function mountPointerEffects(context) {
  const stickerNodes = [...context.root.querySelectorAll('[data-motion-sticker]')];
  const particleNodes = [...context.root.querySelectorAll('[data-motion-particle]')];
  const blobNodes = [...context.root.querySelectorAll('[data-motion-blob]')];
  const zones = [...context.root.ownerDocument.querySelectorAll(
    '[data-motion-hero], [data-motion-showcase]',
  )];
  const visibleZones = new Map(zones.map((zone) => [zone, true]));
  const listenerAbortController = new AbortController();
  const abortPointerListeners = () => listenerAbortController.abort();
  if (context.signal?.aborted) abortPointerListeners();
  else context.signal?.addEventListener('abort', abortPointerListeners, { once: true });
  const state = {
    pointer: null,
    pointerZone: null,
    previousFrame: null,
    running: false,
    lastSticker: null,
    stickerZone: null,
    stickerCursor: 0,
    triggerCount: 0,
    burstOwner: null,
    stickers: [],
    particles: [],
    blobs: blobNodes.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 })),
  };

  const hide = (nodes) => {
    for (const node of nodes) node.removeAttribute('data-active');
  };
  const clearPointer = () => {
    state.pointer = null;
    state.pointerZone = null;
    state.lastSticker = null;
    state.stickerZone = null;
    hide(blobNodes);
  };
  const clearStickers = () => {
    state.stickers = [];
    state.lastSticker = null;
    state.stickerZone = null;
    hide(stickerNodes);
  };
  const cancelBurst = () => {
    const owner = state.burstOwner;
    state.particles = [];
    state.burstOwner = null;
    hide(particleNodes);
    if (owner) context.coordinator.release(owner);
  };
  const stopIfIdle = () => {
    if (state.pointer || state.stickers.length || state.particles.length) return;
    state.running = false;
    state.previousFrame = null;
    context.scheduler.cancel(controller);
  };
  const request = () => {
    if (!state.running) state.previousFrame = context.scheduler.now(context.clock());
    state.running = true;
    context.scheduler.request(controller);
  };

  const controller = {
    update(timestamp) {
      const elapsed = state.previousFrame === null ? 0 : timestamp - state.previousFrame;
      state.previousFrame = timestamp;
      if (context.coordinator.owner === 'grid') {
        clearPointer();
        clearStickers();
      }
      state.stickers = state.stickers
        .filter((item) => timestamp - item.startedAt < 900);
      state.particles = state.particles
        .filter((item) => timestamp - item.startedAt < item.duration);
      if (state.particles.length === 0 && state.burstOwner) cancelBurst();

      let blobMoving = false;
      if (
        state.pointer &&
        context.policy.finePointerEffects &&
        context.coordinator.owner !== 'grid'
      ) {
        state.blobs = state.blobs.map((blob, index) =>
          advanceBlob(blob, state.pointer, elapsed, {
            stiffness: index === 0 ? 0.014 : 0.009,
            damping: index === 0 ? 0.78 : 0.82,
            maxSpeed: 32,
          }),
        );
        blobMoving = state.blobs.some((blob) =>
          Math.hypot(blob.vx, blob.vy) > 0.05 ||
          Math.hypot(blob.x - state.pointer.x, blob.y - state.pointer.y) > 0.5,
        );
      }

      blobNodes.forEach((node, index) => {
        const blob = state.blobs[index];
        node.style.setProperty('--blob-x', `${blob.x}px`);
        node.style.setProperty('--blob-y', `${blob.y}px`);
        const speed = Math.hypot(blob.vx, blob.vy);
        const stretch = Math.min(0.18, speed / 160);
        node.style.setProperty('--blob-scale-x', String(1 + stretch));
        node.style.setProperty('--blob-scale-y', String(1 - stretch * 0.5));
        node.style.setProperty(
          '--blob-rotate',
          `${Math.atan2(blob.vy, blob.vx) * (180 / Math.PI)}deg`,
        );
        node.toggleAttribute(
          'data-active',
          Boolean(state.pointer && context.policy.finePointerEffects),
        );
      });
      stickerNodes.forEach((node, index) => {
        const item = state.stickers.find((entry) => entry.index === index);
        node.toggleAttribute('data-active', Boolean(item));
        if (!item) return;
        const progress = Math.max(0, Math.min(1, (timestamp - item.startedAt) / 900));
        node.style.setProperty('--sticker-x', `${item.x}px`);
        node.style.setProperty('--sticker-y', `${item.y + progress * 72}px`);
        node.style.setProperty('--sticker-rotate', `${item.rotation}deg`);
        node.style.opacity = String(Math.max(0, 1 - progress));
      });
      particleNodes.forEach((node, index) => {
        const item = state.particles[index];
        node.toggleAttribute('data-active', Boolean(item));
        if (!item) return;
        const progress = Math.max(
          0,
          Math.min(1, (timestamp - item.startedAt) / item.duration),
        );
        node.textContent = item.symbol;
        node.style.setProperty('--particle-x', `${item.originX + item.x * progress}px`);
        node.style.setProperty('--particle-y', `${item.originY + item.y * progress}px`);
        node.style.setProperty('--particle-rotate', `${item.rotation}deg`);
        node.style.setProperty('--particle-scale', String(item.scale));
        node.style.opacity = String(Math.max(0, 1 - progress));
        node.style.setProperty(
          '--particle-color',
          ['var(--red)', 'var(--yellow)', 'var(--green)'][item.colorIndex],
        );
      });
      const needsAnotherFrame = Boolean(
        blobMoving || state.stickers.length || state.particles.length,
      );
      state.running = needsAnotherFrame;
      if (!needsAnotherFrame) state.previousFrame = null;
      return needsAnotherFrame;
    },
    setPolicy(policy) {
      if (!policy.finePointerEffects) {
        clearPointer();
        clearStickers();
      }
      if (!policy.motionAllowed || policy.forcedColors || policy.hidden) {
        clearPointer();
        clearStickers();
        cancelBurst();
        state.running = false;
        state.previousFrame = null;
        context.scheduler.cancel(controller);
      }
      if (!policy.finePointerEffects && state.particles.length === 0) stopIfIdle();
    },
    destroy() {
      listenerAbortController.abort();
      context.signal?.removeEventListener?.('abort', abortPointerListeners);
      clearPointer();
      clearStickers();
      cancelBurst();
      state.running = false;
      state.previousFrame = null;
      context.scheduler.cancel(controller);
      observer?.disconnect();
      for (const node of [...blobNodes, ...stickerNodes, ...particleNodes]) {
        node.removeAttribute('data-active');
        node.removeAttribute('style');
      }
    },
  };

  function applyZoneVisibility(zone, nextVisible) {
    if (!visibleZones.has(zone)) return;
    visibleZones.set(zone, nextVisible);
    if (!nextVisible && state.pointerZone === zone) {
      clearPointer();
      clearStickers();
      stopIfIdle();
    }
  }

  const observer = context.observerFactory?.((entries) => {
    for (const entry of entries) applyZoneVisibility(entry.target, entry.isIntersecting);
  }, { threshold: 0 });
  if (observer) {
    for (const zone of zones) observer.observe(zone);
  } else {
    const browserWindow = context.window ?? context.root.ownerDocument.defaultView;
    const refreshFallbackVisibility = () => {
      for (const zone of zones) {
        const rect = zone.getBoundingClientRect();
        applyZoneVisibility(
          zone,
          rect.bottom > 0 &&
            rect.top < (browserWindow?.innerHeight ?? rect.bottom) &&
            rect.right > 0 &&
            rect.left < (browserWindow?.innerWidth ?? rect.right),
        );
      }
    };
    refreshFallbackVisibility();
    browserWindow?.addEventListener('scroll', refreshFallbackVisibility, {
      signal: listenerAbortController.signal,
      passive: true,
    });
    browserWindow?.addEventListener('resize', refreshFallbackVisibility, {
      signal: listenerAbortController.signal,
      passive: true,
    });
  }

  function handlePointerMove(event) {
    const samples = event.getCoalescedEvents?.() || [event];
    const zone = event.target.closest?.('[data-motion-hero], [data-motion-showcase]');
    if (!zone || !visibleZones.get(zone) || !context.policy.finePointerEffects) {
      clearPointer();
      clearStickers();
      stopIfIdle();
      return;
    }
    if (context.coordinator.owner === 'grid') {
      clearPointer();
      clearStickers();
      stopIfIdle();
      return;
    }
    for (const sample of samples) {
      state.pointer = { x: sample.clientX, y: sample.clientY };
      state.pointerZone = zone;
      if (!zone.matches('[data-motion-showcase]')) {
        state.lastSticker = null;
        state.stickerZone = null;
        continue;
      }
      const nextSticker = {
        x: sample.clientX,
        y: sample.clientY,
        timestamp: sample.timeStamp,
      };
      if (state.stickerZone !== zone || !state.lastSticker) {
        state.stickerZone = zone;
        state.lastSticker = nextSticker;
        continue;
      }
      if (
        [null, 'grid-inertia'].includes(context.coordinator.owner) &&
        shouldSpawnSticker(state.lastSticker, nextSticker, {
          minDistance: 60,
          minInterval: 60,
        })
      ) {
        const index = state.stickerCursor % stickerNodes.length;
        state.stickerCursor += 1;
        state.stickers = state.stickers.filter((item) => item.index !== index);
        state.stickers.push({
          index,
          x: sample.clientX,
          y: sample.clientY,
          rotation: (context.random() - 0.5) * 24,
          startedAt: context.scheduler.now(context.clock()),
        });
        state.lastSticker = nextSticker;
      }
    }
    request();
  }

  function handlePointerOut(event) {
    const zone = event.target.closest?.('[data-motion-hero], [data-motion-showcase]');
    const nextZone = event.relatedTarget?.closest?.(
      '[data-motion-hero], [data-motion-showcase]',
    );
    if (zone && zone === nextZone) return;
    clearPointer();
    if (state.stickers.length || state.particles.length) request();
    else stopIfIdle();
  }

  function handleBurstTrigger(event) {
    const target = event.target.closest?.('[data-motion-burst]');
    if (
      !target ||
      !context.policy.motionAllowed ||
      context.policy.forcedColors ||
      context.coordinator.owner === 'grid'
    ) return;
    if (
      event.type === 'pointerover' &&
      event.relatedTarget &&
      target.contains(event.relatedTarget)
    ) return;
    const owner = `link:${target.getAttribute('href') ?? target.textContent}`;
    if (!context.coordinator.claim(owner, 1, cancelBurst)) return;
    if (state.burstOwner && state.burstOwner !== owner) cancelBurst();
    state.burstOwner = owner;
    const rect = target.getBoundingClientRect();
    const lifetime = target.closest('[data-motion-shake-related], [data-motion-card]') ? 100 : 300;
    const startedAt = context.scheduler.now(context.clock());
    state.triggerCount += 1;
    state.particles = createBurst({
      seed: 0x4e4d3031,
      triggerCount: state.triggerCount,
      limit: particleNodes.length,
      lifetime,
    }).map((item) => ({
      ...item,
      originX: rect.left + rect.width / 2,
      originY: rect.top + rect.height / 2,
      duration: lifetime,
      startedAt,
    }));
    request();
  }

  context.root.ownerDocument.addEventListener('pointermove', handlePointerMove, {
    signal: listenerAbortController.signal,
    passive: true,
  });
  context.root.ownerDocument.addEventListener('pointerout', handlePointerOut, {
    signal: listenerAbortController.signal,
    passive: true,
  });
  context.root.ownerDocument.addEventListener('focusin', handleBurstTrigger, {
    signal: listenerAbortController.signal,
  });
  context.root.ownerDocument.addEventListener('pointerover', handleBurstTrigger, {
    signal: listenerAbortController.signal,
    passive: true,
  });
  context.root.ownerDocument.addEventListener('pointerdown', handleBurstTrigger, {
    signal: listenerAbortController.signal,
    passive: true,
  });
  context.window?.addEventListener?.('blur', () => {
    clearPointer();
    if (state.stickers.length || state.particles.length) request();
    else stopIfIdle();
  }, { signal: listenerAbortController.signal });

  return controller;
}
