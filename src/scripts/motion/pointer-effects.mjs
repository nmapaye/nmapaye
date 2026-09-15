export const BURST_SYMBOLS = ['✦', '◆', '⚡', '↗', '01', '02', '03', '04'];

const STICKER_LIFETIME = 900;
const STICKER_EXIT_DURATION = 150;

export function shouldSpawnSticker(previous, next, limits) {
  if (!previous) return false;
  return (
    next.timestamp - previous.timestamp >= limits.minInterval &&
    Math.hypot(next.x - previous.x, next.y - previous.y) >= limits.minDistance
  );
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

function resetStickerNode(node) {
  node.removeAttribute('data-active');
  node.removeAttribute('style');
}

function resetParticleNode(node) {
  node.removeAttribute('data-active');
  node.removeAttribute('style');
  node.textContent = '';
}

export function mountPointerEffects(context) {
  let stickerNodes = [...context.root.querySelectorAll('[data-motion-sticker]')];
  const stickerContainer = context.root.querySelector?.('[data-motion-stickers]');
  const stickerTemplate = context.root.querySelector?.('[data-motion-sticker-template]');
  let stickerSources = [];
  try {
    stickerSources = JSON.parse(context.root.getAttribute?.('data-motion-sticker-sources') ?? '[]');
  } catch {
    stickerSources = [];
  }
  const particleNodes = [...context.root.querySelectorAll('[data-motion-particle]')];
  const zones = [...context.root.ownerDocument.querySelectorAll(
    '[data-motion-hero], [data-motion-showcase]',
  )];
  const browserWindow = context.window ?? context.root.ownerDocument.defaultView;
  const visibleZones = new Map(zones.map((zone) => [zone, true]));
  const listenerAbortController = new AbortController();
  const abortPointerListeners = () => listenerAbortController.abort();
  if (context.signal?.aborted) abortPointerListeners();
  else context.signal?.addEventListener('abort', abortPointerListeners, { once: true });
  const state = {
    pointerZone: null,
    lastSticker: null,
    stickerZone: null,
    stickerCursor: 0,
    triggerCount: 0,
    burstOwner: null,
    stickers: [],
    particles: [],
  };

  function ensureStickerNodes() {
    if (stickerNodes.length || !stickerContainer || !stickerTemplate?.content) return stickerNodes;
    const fragment = context.root.ownerDocument.createDocumentFragment();
    for (let index = 0; index < 8; index += 1) {
      const clone = stickerTemplate.content.firstElementChild?.cloneNode(true);
      if (!clone) continue;
      clone.setAttribute('data-motion-sticker', String(index));
      const image = clone.querySelector?.('[data-motion-sticker-image]');
      if (image && stickerSources.length) {
        image.src = stickerSources[index % stickerSources.length];
        image.loading = 'eager';
      }
      fragment.append(clone);
    }
    stickerContainer.append(fragment);
    stickerNodes = [...stickerContainer.querySelectorAll('[data-motion-sticker]')];
    return stickerNodes;
  }

  const clearPointer = () => {
    state.pointerZone = null;
    state.lastSticker = null;
    state.stickerZone = null;
  };
  const clearStickers = () => {
    state.stickers = [];
    state.lastSticker = null;
    state.stickerZone = null;
    for (const node of stickerNodes) resetStickerNode(node);
  };
  const cancelBurst = () => {
    const owner = state.burstOwner;
    state.particles = [];
    state.burstOwner = null;
    for (const node of particleNodes) resetParticleNode(node);
    if (owner) context.coordinator.release(owner);
  };
  const stopIfIdle = () => {
    if (state.stickers.length || state.particles.length) return;
    context.scheduler.cancel(controller);
  };
  const request = () => {
    context.scheduler.request(controller);
  };
  const beginStickerExit = () => {
    if (state.stickers.length === 0) return;
    const timestamp = context.scheduler.now(context.clock());
    let changed = false;
    state.stickers = state.stickers.map((item) => {
      if (item.exitingAt !== undefined) return item;
      changed = true;
      return {
        ...item,
        exitingAt: timestamp,
        exitOpacity: Math.max(
          0,
          1 - (timestamp - item.startedAt) / STICKER_LIFETIME,
        ),
      };
    });
    state.lastSticker = null;
    state.stickerZone = null;
    if (changed) request();
  };

  const controller = {
    update(timestamp) {
      if (context.coordinator.owner === 'grid') {
        clearPointer();
        clearStickers();
      }
      state.stickers = state.stickers.filter((item) => (
        item.exitingAt === undefined
          ? timestamp - item.startedAt < STICKER_LIFETIME
          : timestamp - item.exitingAt < STICKER_EXIT_DURATION
      ));
      state.particles = state.particles
        .filter((item) => timestamp - item.startedAt < item.duration);
      if (state.particles.length === 0 && state.burstOwner) cancelBurst();

      stickerNodes.forEach((node, index) => {
        const item = state.stickers.find((entry) => entry.index === index);
        if (!item) {
          resetStickerNode(node);
          return;
        }
        node.toggleAttribute('data-active', true);
        const progress = Math.max(
          0,
          Math.min(1, (timestamp - item.startedAt) / STICKER_LIFETIME),
        );
        node.style.setProperty('--sticker-x', `${item.x}px`);
        node.style.setProperty('--sticker-y', `${item.y + progress * 72}px`);
        node.style.setProperty('--sticker-rotate', `${item.rotation}deg`);
        if (item.exitingAt === undefined) {
          node.style.opacity = String(Math.max(0, 1 - progress));
          return;
        }
        const exitProgress = Math.max(
          0,
          Math.min(1, (timestamp - item.exitingAt) / STICKER_EXIT_DURATION),
        );
        node.style.opacity = String(item.exitOpacity * (1 - exitProgress));
      });
      particleNodes.forEach((node, index) => {
        const item = state.particles[index];
        if (!item) {
          resetParticleNode(node);
          return;
        }
        node.toggleAttribute('data-active', true);
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
        state.stickers.length || state.particles.length,
      );
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
      context.scheduler.cancel(controller);
      observer?.disconnect();
      for (const node of [...stickerNodes, ...particleNodes]) {
        node.removeAttribute('data-active');
        node.removeAttribute('style');
      }
      for (const node of stickerNodes) node.remove?.();
      stickerNodes = [];
    },
  };

  function applyZoneVisibility(zone, nextVisible) {
    if (!visibleZones.has(zone)) return;
    visibleZones.set(zone, nextVisible);
    if (!nextVisible) {
      const ownsPointer = state.pointerZone === zone;
      const ownsStickerTrail = state.stickerZone === zone;
      if (ownsPointer) clearPointer();
      if (ownsPointer || ownsStickerTrail) beginStickerExit();
      stopIfIdle();
    }
  }

  let refreshFallbackVisibility = null;
  const observer = context.observerFactory?.((entries) => {
    for (const entry of entries) applyZoneVisibility(entry.target, entry.isIntersecting);
  }, { threshold: 0 });
  if (observer) {
    for (const zone of zones) observer.observe(zone);
  } else {
    refreshFallbackVisibility = () => {
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
    browserWindow?.addEventListener('resize', refreshFallbackVisibility, {
      signal: listenerAbortController.signal,
      passive: true,
    });
  }

  browserWindow?.addEventListener('scroll', () => {
    beginStickerExit();
    refreshFallbackVisibility?.();
  }, {
    signal: listenerAbortController.signal,
    passive: true,
  });

  function handlePointerMove(event) {
    const samples = event.getCoalescedEvents?.() || [event];
    const zone = event.target.closest?.('[data-motion-hero], [data-motion-showcase]');
    if (!context.policy.finePointerEffects) {
      clearPointer();
      clearStickers();
      stopIfIdle();
      return;
    }
    if (!zone || !visibleZones.get(zone)) {
      clearPointer();
      beginStickerExit();
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
      state.pointerZone = zone;
      if (!zone.matches('[data-motion-showcase]')) {
        beginStickerExit();
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
        ensureStickerNodes();
        if (stickerNodes.length === 0) continue;
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
    if (state.stickers.length || state.particles.length) request();
    else stopIfIdle();
  }

  function handlePointerOut(event) {
    const zone = event.target.closest?.('[data-motion-hero], [data-motion-showcase]');
    const nextZone = event.relatedTarget?.closest?.(
      '[data-motion-hero], [data-motion-showcase]',
    );
    if (zone && zone === nextZone) return;
    clearPointer();
    beginStickerExit();
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
