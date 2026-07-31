import {
  createBrowserFrameScheduler,
  createFrameScheduler,
} from './scheduler.mjs';
import { mountPointerEffects } from './pointer-effects.mjs';
import { mountMarquee } from './marquee.mjs';
import { mountGrid } from './grid.mjs';
import { mountCardStacks } from './card-stack.mjs';
import { mountTextEffects } from './text-effects.mjs';
import { mountNavigationWipe } from './navigation-wipe.mjs';
import { observeMotionPolicy } from './policy.mjs';

const mounts = new WeakMap();
const kineticFactories = [
  mountPointerEffects,
  mountMarquee,
  mountGrid,
  mountCardStacks,
  mountTextEffects,
];

function defaultFactories(root) {
  return [
    mountNavigationWipe,
    ...(root.getAttribute?.('data-motion-kinetic') === 'true'
      ? kineticFactories
      : []),
  ];
}

export function createSeededRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

export function createInteractionCoordinator(onError = () => {}) {
  let current = null;
  const followups = new Map();
  let preempting = false;

  function discardFollowups(owner) {
    followups.delete(owner);
  }

  function cancelOwner() {
    if (!current) return;
    const previous = current;
    preempting = true;
    try {
      previous.onPreempt();
    } catch (error) {
      onError(error, previous.owner);
    } finally {
      preempting = false;
      if (current?.owner === previous.owner) current = null;
      discardFollowups(previous.owner);
    }
  }
  return {
    claim(owner, priority, onPreempt = () => {}) {
      if (current && current.owner !== owner && current.priority > priority) {
        return false;
      }
      if (current && current.owner !== owner) cancelOwner();
      current = { owner, priority, onPreempt };
      return true;
    },
    release(owner) {
      if (current?.owner !== owner) return;
      current = null;
      const callbacks = [...(followups.get(owner)?.values() ?? [])];
      discardFollowups(owner);
      if (preempting || callbacks.length === 0) return;
      try {
        callbacks.at(-1)();
      } catch (error) {
        onError(error, owner);
      }
    },
    afterRelease(owner, key, callback) {
      if (current?.owner !== owner) return false;
      if (!followups.has(owner)) followups.set(owner, new Map());
      followups.get(owner).set(key, callback);
      return true;
    },
    preempt(owner, priority, onPreempt = () => {}) {
      if (current && current.owner !== owner) cancelOwner();
      current = { owner, priority, onPreempt };
    },
    cancelCurrent() {
      cancelOwner();
      current = null;
    },
    get owner() {
      return current?.owner ?? null;
    },
  };
}

export function initializeMotion(root, environment = {}) {
  if (mounts.has(root)) return mounts.get(root);
  const abortController = new AbortController();
  const browserWindow = environment.window ?? globalThis.window;
  const browserDocument = environment.document ?? globalThis.document;
  const scheduler = environment.scheduler ?? (
    environment.requestFrame
      ? createFrameScheduler({
          requestFrame: environment.requestFrame,
          cancelFrame: environment.cancelFrame ?? (() => {}),
          onError: environment.onError,
          maxDelta: 50,
        })
      : createBrowserFrameScheduler(browserWindow, {
          onError: environment.onError,
          maxDelta: 50,
        })
  );
  const context = {
    root,
    window: browserWindow,
    scheduler,
    coordinator: createInteractionCoordinator(environment.onError),
    clock:
      environment.clock ??
      (() => browserWindow?.performance?.now?.() ?? 0),
    random: environment.random ?? createSeededRandom(0x4e4d3031),
    observerFactory:
      environment.observerFactory ??
      ((callback, options) =>
        browserWindow?.IntersectionObserver
          ? new browserWindow.IntersectionObserver(callback, options)
          : null),
    onError: environment.onError ?? (() => {}),
    signal: abortController.signal,
    policy: null,
    refreshPolicy: null,
    lockForNavigation: null,
  };
  const controllers = [];
  let navigationLocked = false;
  let latestRawPolicy = null;
  const applyNavigationLock = (policy) => (
    navigationLocked
      ? {
          ...policy,
          navigationActive: true,
          motionAllowed: false,
          finePointerEffects: false,
          blendAllowed: false,
          perspectiveAllowed: false,
        }
      : { ...policy, navigationActive: false }
  );
  function applyPolicy(policy) {
    const wasInactive = context.policy && (
      context.policy.hidden
      || !context.policy.motionAllowed
      || context.policy.navigationActive
    );
    latestRawPolicy = policy;
    const effectivePolicy = applyNavigationLock(policy);
    context.policy = effectivePolicy;
    for (const controller of controllers) {
      try {
        controller.setPolicy?.(
          controller.navigation ? policy : effectivePolicy,
        );
      } catch (error) {
        context.onError(error, controller);
      }
    }
    const settledPolicy = applyNavigationLock(latestRawPolicy ?? effectivePolicy);
    if (
      effectivePolicy.navigationActive
      && !settledPolicy.navigationActive
    ) {
      for (const controller of controllers) {
        if (controller.navigation) continue;
        try {
          controller.setPolicy?.(settledPolicy);
        } catch (error) {
          context.onError(error, controller);
        }
      }
    }
    context.policy = settledPolicy;
    if (!settledPolicy.motionAllowed) {
      try {
        context.coordinator.cancelCurrent();
      } catch (error) {
        context.onError(error);
      }
    }
    if (
      settledPolicy.hidden
      || !settledPolicy.motionAllowed
      || settledPolicy.navigationActive
    ) {
      scheduler.cancelAll();
      scheduler.suspend();
    } else {
      if (wasInactive) scheduler.resetTiming();
      scheduler.resume();
    }
  }
  const observePolicy = environment.observePolicy ?? observeMotionPolicy;
  const observedPolicy = observePolicy({
    window: browserWindow,
    document: browserDocument,
    signal: abortController.signal,
    onChange: applyPolicy,
  });
  if (context.policy === null) {
    latestRawPolicy = observedPolicy?.current ?? observedPolicy;
    context.policy = applyNavigationLock(latestRawPolicy);
  }
  context.refreshPolicy =
    observedPolicy?.refresh?.bind(observedPolicy) ?? (() => context.policy);

  context.lockForNavigation = () => {
    if (navigationLocked) return () => {};
    navigationLocked = true;
    context.policy = applyNavigationLock(context.policy);
    for (const controller of controllers) {
      if (controller.navigation) continue;
      try {
        controller.setPolicy?.(context.policy);
      } catch (error) {
        context.onError(error, controller);
      }
    }
    try {
      context.coordinator.cancelCurrent();
    } catch (error) {
      context.onError(error);
    }
    scheduler.cancelAll();
    scheduler.suspend();
    let unlocked = false;
    return () => {
      if (unlocked) return;
      unlocked = true;
      navigationLocked = false;
      context.policy = applyNavigationLock(latestRawPolicy ?? context.policy);
      scheduler.resetTiming();
      if (context.policy.motionAllowed && !context.policy.hidden) scheduler.resume();
      else scheduler.suspend();
      for (const controller of controllers) {
        if (controller.navigation) continue;
        try {
          controller.setPolicy?.(context.policy);
        } catch (error) {
          context.onError(error, controller);
        }
      }
    };
  };

  const factories = environment.controllerFactories ?? defaultFactories(root);
  for (const factory of factories) {
    try {
      const controller = factory(context);
      if (!controller) continue;
      controllers.push(controller);
      controller.setPolicy?.(context.policy);
    } catch (error) {
      context.onError(error, factory);
    }
  }

  const browserHtml = browserDocument?.documentElement;
  browserHtml?.classList.add('motion-ready');
  let destroyed = false;
  let pageInactive = false;

  function applyPageInactive(reason) {
    if (pageInactive) return;
    pageInactive = true;
    const staticPolicy = {
      ...context.policy,
      motionAllowed: false,
      finePointerEffects: false,
      blendAllowed: false,
      perspectiveAllowed: false,
      hidden: true,
    };
    context.policy = staticPolicy;
    for (const controller of controllers) {
      try {
        controller.pagehide?.(reason);
        controller.setPolicy?.(staticPolicy);
      } catch (error) {
        context.onError(error, controller);
      }
    }
    try {
      context.coordinator.cancelCurrent();
    } catch (error) {
      context.onError(error);
    }
    scheduler.cancelAll();
    scheduler.suspend();
  }

  function onPageShow() {
    initializeMotion(root, environment);
    pageInactive = false;
    navigationLocked = false;
    scheduler.resetTiming();
    const refreshedPolicy = context.refreshPolicy();
    if (refreshedPolicy) latestRawPolicy = refreshedPolicy;
    context.policy = applyNavigationLock(latestRawPolicy ?? context.policy);
    if (context.policy.motionAllowed && !context.policy.hidden) scheduler.resume();
    else scheduler.suspend();
    for (const controller of controllers) {
      try {
        controller.setPolicy?.(
          controller.navigation
            ? (latestRawPolicy ?? context.policy)
            : context.policy,
        );
      } catch (error) {
        context.onError(error, controller);
      }
    }
  }

  browserWindow?.addEventListener('pagehide', () => applyPageInactive('pagehide'), {
    signal: abortController.signal,
  });
  browserWindow?.addEventListener('pageshow', onPageShow, {
    signal: abortController.signal,
  });

  const mount = {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      abortController.abort();
      applyPageInactive('destroy');
      for (const controller of controllers) {
        try {
          controller.destroy?.();
        } catch (error) {
          context.onError(error, controller);
        }
      }
      scheduler.destroy();
      browserHtml?.classList.remove('motion-ready');
      mounts.delete(root);
    },
  };
  mounts.set(root, mount);
  return mount;
}

export function destroyMotion(root) {
  mounts.get(root)?.destroy();
}
