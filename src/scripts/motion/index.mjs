import {
  createBrowserFrameScheduler,
  createFrameScheduler,
} from './scheduler.mjs';
import { observeMotionPolicy } from './policy.mjs';

const mounts = new WeakMap();

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
    lockForNavigation: () => {},
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
  const observePolicy = environment.observePolicy ?? observeMotionPolicy;
  const observedPolicy = observePolicy({
    window: browserWindow,
    document: browserDocument,
    signal: abortController.signal,
    onChange(policy) {
      const wasHidden = context.policy?.hidden;
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
      const settledPolicy = applyNavigationLock(latestRawPolicy);
      context.policy = settledPolicy;
      if (effectivePolicy.navigationActive && !settledPolicy.navigationActive) {
        for (const controller of controllers) {
          if (controller.navigation) continue;
          try {
            controller.setPolicy?.(settledPolicy);
          } catch (error) {
            context.onError(error, controller);
          }
        }
      }
      if (!settledPolicy.motionAllowed) context.coordinator.cancelCurrent();
      if (settledPolicy.hidden || settledPolicy.navigationActive) {
        scheduler.cancelAll();
        scheduler.suspend();
      } else {
        if (wasHidden) scheduler.resetTiming();
        scheduler.resume();
        if (!settledPolicy.motionAllowed) scheduler.cancelAll();
      }
    },
  });
  if (context.policy === null) {
    latestRawPolicy = observedPolicy?.current ?? observedPolicy;
    context.policy = applyNavigationLock(latestRawPolicy);
  }
  context.refreshPolicy =
    observedPolicy?.refresh?.bind(observedPolicy) ?? (() => context.policy);
  for (const factory of environment.controllerFactories ?? []) {
    try {
      const controller = factory(context);
      if (controller) {
        controllers.push(controller);
        controller.setPolicy?.(context.policy);
      }
    } catch (error) {
      environment.onError?.(error, factory);
    }
  }
  const mount = {
    destroy() {
      abortController.abort();
      for (const controller of controllers) controller.destroy?.();
      scheduler.destroy();
      mounts.delete(root);
    },
  };
  mounts.set(root, mount);
  return mount;
}

export function destroyMotion(root) {
  mounts.get(root)?.destroy();
}
