const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789◆✦';

export function shakeFrame(elapsed, config) {
  if (elapsed >= config.duration) return { x: 0, y: 0, done: true };
  const phase = Math.floor(
    (elapsed / config.duration) * config.oscillations * 2,
  );
  const direction = phase % 2 === 0 ? 1 : -1;
  return {
    x: direction * config.amplitude,
    y: -direction * config.amplitude,
    done: false,
  };
}

export function shuffleFrame(label, elapsed, options) {
  if (elapsed >= options.duration) return label;
  const resolved = Math.floor((elapsed / options.duration) * label.length);
  let state = (
    options.seed ^ options.triggerCount ^ Math.floor(elapsed / 40)
  ) >>> 0;
  return [...label].map((character, index) => {
    if (character === ' ' || index < resolved) return character;
    state = (state * 1664525 + 1013904223) >>> 0;
    return GLYPHS[state % GLYPHS.length];
  }).join('');
}

export function mountTextEffects(context) {
  const document = context.root.ownerDocument;
  const listeners = new AbortController();
  const abortListeners = () => listeners.abort();
  if (context.signal?.aborted) abortListeners();
  else context.signal?.addEventListener('abort', abortListeners, { once: true });
  const motionZone = (element) => element.closest(
    '[data-motion-hero], [data-motion-showcase], section, nav',
  ) ?? document.body;
  const shakes = [...document.querySelectorAll('[data-motion-shake]')].map(
    (element, index) => ({
      element,
      zone: motionZone(element),
      owner: `shake:${element.id || index}`,
      startedAt: null,
      baseDuration: 250,
      duration: 250,
    }),
  );
  const shuffles = [...document.querySelectorAll('[data-motion-shuffle]')].map(
    (element, index) => {
      const card = element.closest('[data-motion-card]');
      return {
        card,
        element,
        interactiveOwner: element.closest('a, button, [tabindex]'),
        zone: motionZone(element),
        visual: element.querySelector('[data-motion-shuffle-visual]'),
        label: element.getAttribute('data-motion-shuffle-label') ?? '',
        owner: card ? `shuffle:${card.dataset.motionCard}` : `shuffle:label:${index}`,
        startedAt: null,
        triggerCount: 0,
        baseDuration: 400,
        duration: 400,
      };
    },
  ).filter((entry) => entry.visual);
  const zones = [...new Set([...shakes, ...shuffles]
    .map((entry) => entry.zone)
    .filter(Boolean))];
  const zoneVisibility = new Map(zones.map((zone) => [zone, true]));
  const zoneEpoch = new Map(zones.map((zone) => [zone, 0]));
  const shakeByElement = new Map(shakes.map((entry) => [entry.element, entry]));
  const shuffleByElement = new Map(shuffles.map((entry) => [entry.element, entry]));
  const shuffleByInteractiveOwner = new Map(shuffles
    .filter((entry) => entry.interactiveOwner)
    .map((entry) => [entry.interactiveOwner, entry]));
  let visibilityObserver = null;
  let destroyed = false;

  function setVisualLabel(visual, label) {
    visual.setAttribute?.('data-label', label);
  }

  function cancelSchedulerIfIdle() {
    if ([...shakes, ...shuffles].every((entry) => entry.startedAt === null)) {
      context.scheduler.cancel(controller);
    }
  }

  function cancelShake(entry) {
    entry.startedAt = null;
    entry.element.style.setProperty('--shake-x', '0px');
    entry.element.style.setProperty('--shake-neg-x', '0px');
    entry.element.style.setProperty('--shake-y', '0px');
    entry.element.removeAttribute('data-motion-active');
    context.coordinator.release(entry.owner);
    cancelSchedulerIfIdle();
  }

  function cancelShuffle(entry) {
    entry.startedAt = null;
    setVisualLabel(entry.visual, entry.label);
    entry.element.removeAttribute('data-active');
    context.coordinator.release(entry.owner);
    cancelSchedulerIfIdle();
  }

  function startNow(entry, cancel, duration, startedAt = context.scheduler.now(context.clock())) {
    if (
      destroyed ||
      zoneVisibility.get(entry.zone) === false ||
      !context.policy.motionAllowed ||
      context.policy.forcedColors
    ) return;
    if (!context.coordinator.claim(entry.owner, 1, () => cancel(entry))) return;
    entry.duration = duration;
    entry.startedAt = startedAt;
    entry.triggerCount = (entry.triggerCount ?? 0) + 1;
    entry.element.setAttribute(entry.visual ? 'data-active' : 'data-motion-active', '');
    context.scheduler.request(controller);
  }

  function start(entry, cancel, trigger) {
    if (
      zoneVisibility.get(entry.zone) === false ||
      !context.policy.motionAllowed ||
      context.policy.forcedColors
    ) return;
    const triggeredAt = context.scheduler.now(context.clock());
    const burstTarget = trigger.closest?.('[data-motion-burst]');
    const currentOwner = context.coordinator.owner;
    const followsBurst = burstTarget && typeof currentOwner === 'string' && currentOwner.startsWith('link:');
    const duration = entry.visual && followsBurst ? 300 : entry.baseDuration;
    const queuedAtZoneEpoch = zoneEpoch.get(entry.zone);
    if (followsBurst && context.coordinator.afterRelease(
      currentOwner,
      entry.owner,
      () => {
        if (zoneEpoch.get(entry.zone) !== queuedAtZoneEpoch) return;
        startNow(entry, cancel, duration, triggeredAt + 100);
      },
    )) return;
    startNow(entry, cancel, duration, triggeredAt);
  }

  const controller = {
    update(timestamp) {
      for (const entry of shakes) {
        if (typeof entry.startedAt !== 'number') continue;
        const frame = shakeFrame(timestamp - entry.startedAt, {
          duration: entry.duration,
          amplitude: 2,
          oscillations: 3,
        });
        entry.element.style.setProperty('--shake-x', `${frame.x}px`);
        entry.element.style.setProperty('--shake-neg-x', `${-frame.x}px`);
        entry.element.style.setProperty('--shake-y', `${frame.y}px`);
        if (frame.done) cancelShake(entry);
      }
      for (const entry of shuffles) {
        if (typeof entry.startedAt !== 'number') continue;
        const elapsed = timestamp - entry.startedAt;
        setVisualLabel(entry.visual, shuffleFrame(entry.label, elapsed, {
          seed: 0x4e4d3031,
          triggerCount: entry.triggerCount,
          duration: entry.duration,
        }));
        if (elapsed >= entry.duration) cancelShuffle(entry);
      }
      return [...shakes, ...shuffles].some((entry) => entry.startedAt !== null);
    },
    setPolicy(policy) {
      if (!policy.motionAllowed || policy.forcedColors || policy.hidden) {
        for (const entry of shakes) cancelShake(entry);
        for (const entry of shuffles) cancelShuffle(entry);
        context.scheduler.cancel(controller);
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.abort();
      context.signal?.removeEventListener?.('abort', abortListeners);
      visibilityObserver?.takeRecords?.();
      visibilityObserver?.disconnect();
      for (const entry of shakes) {
        cancelShake(entry);
        entry.element.style.removeProperty('--shake-x');
        entry.element.style.removeProperty('--shake-neg-x');
        entry.element.style.removeProperty('--shake-y');
      }
      for (const entry of shuffles) {
        cancelShuffle(entry);
        entry.element.removeAttribute('data-motion-enhanced');
      }
      context.scheduler.cancel(controller);
    },
  };

  function applyZoneVisibility(zone, nextVisible) {
    if (destroyed) return;
    if (zoneVisibility.get(zone) === nextVisible) return;
    zoneVisibility.set(zone, nextVisible);
    if (nextVisible) return;
    zoneEpoch.set(zone, (zoneEpoch.get(zone) ?? 0) + 1);
    for (const entry of shakes) if (entry.zone === zone) cancelShake(entry);
    for (const entry of shuffles) if (entry.zone === zone) cancelShuffle(entry);
    cancelSchedulerIfIdle();
  }

  visibilityObserver = context.observerFactory((records) => {
    if (destroyed) return;
    for (const record of records) {
      if (zoneVisibility.has(record.target)) {
        applyZoneVisibility(record.target, record.isIntersecting);
      }
    }
  }, { threshold: 0 });
  if (visibilityObserver) {
    for (const zone of zones) visibilityObserver.observe(zone);
  } else {
    const browserWindow = document.defaultView;
    const refreshFallbackVisibility = () => {
      for (const zone of zones) {
        const rect = zone.getBoundingClientRect();
        applyZoneVisibility(
          zone,
          rect.bottom > 0 && rect.top < (browserWindow?.innerHeight ?? rect.bottom),
        );
      }
    };
    refreshFallbackVisibility();
    browserWindow?.addEventListener('scroll', refreshFallbackVisibility, {
      signal: listeners.signal,
      passive: true,
    });
    browserWindow?.addEventListener('resize', refreshFallbackVisibility, {
      signal: listeners.signal,
      passive: true,
    });
  }

  function resolveTarget(event) {
    const eventElement = event.target.closest?.('*');
    if (!eventElement) return null;
    const directShuffle = eventElement.closest('[data-motion-shuffle]');
    const directEntry = shuffleByElement.get(directShuffle);
    if (directEntry) {
      return {
        entry: directEntry,
        cancel: cancelShuffle,
        pointerBoundary:
          directEntry.card ?? directEntry.interactiveOwner ?? directEntry.element,
      };
    }
    const card = eventElement.closest('[data-motion-card]');
    const scopedShuffle = card?.querySelector(
      '[data-motion-shuffle]',
    );
    const scopedEntry = shuffleByElement.get(scopedShuffle);
    if (scopedEntry) {
      return { entry: scopedEntry, cancel: cancelShuffle, pointerBoundary: card };
    }
    const interactiveOwner = eventElement.closest('a, button, [tabindex]');
    const interactiveEntry = shuffleByInteractiveOwner.get(interactiveOwner);
    if (interactiveEntry) {
      return {
        entry: interactiveEntry,
        cancel: cancelShuffle,
        pointerBoundary: interactiveOwner,
      };
    }
    const directShake = eventElement.closest('[data-motion-shake]');
    const relatedId = eventElement.closest('[data-motion-shake-related]')
      ?.getAttribute('data-motion-shake-related');
    const shake = directShake ?? (relatedId ? document.getElementById(relatedId) : null);
    return shakeByElement.has(shake)
      ? {
          entry: shakeByElement.get(shake),
          cancel: cancelShake,
          pointerBoundary: shake,
        }
      : null;
  }

  function onTrigger(event) {
    const resolved = resolveTarget(event);
    if (!resolved) return;
    const currentOwner = context.coordinator.owner;
    const burstTarget = event.target.closest?.('[data-motion-burst]');
    const cardBurstHandoff =
      resolved.entry.card &&
      burstTarget &&
      !burstTarget.contains(event.relatedTarget) &&
      typeof currentOwner === 'string' &&
      currentOwner.startsWith('link:');
    if (
      event.type === 'pointerover' &&
      event.relatedTarget &&
      resolved.pointerBoundary.contains(event.relatedTarget) &&
      !cardBurstHandoff
    ) return;
    start(resolved.entry, resolved.cancel, event.target);
  }

  for (const type of ['pointerover', 'click', 'focusin']) {
    document.addEventListener(type, onTrigger, {
      signal: listeners.signal,
      passive: type === 'pointerover',
    });
  }
  for (const entry of shuffles) entry.element.setAttribute('data-motion-enhanced', '');
  return controller;
}
