export const NAVIGATION_TIMEOUT_MS = 300;

export function classifyNavigation(anchor, activation, currentUrl) {
  if (
    typeof anchor.href !== 'string'
    || anchor.href.trim() === ''
    || activation.defaultPrevented
    || activation.button !== 0
    || activation.metaKey
    || activation.ctrlKey
    || activation.shiftKey
    || activation.altKey
    || anchor.download
    || (anchor.target && anchor.target !== '_self')
  ) {
    return { eligible: false, destination: null };
  }

  let current;
  let destination;
  try {
    current = new URL(currentUrl);
    destination = new URL(anchor.href, current);
  } catch {
    return { eligible: false, destination: null };
  }

  const sameDocumentFragment =
    destination.origin === current.origin
    && destination.pathname === current.pathname
    && destination.search === current.search
    && anchor.href.includes('#');
  const extension = destination.pathname.match(/(\.[a-z0-9]+)$/i)?.[1]?.toLowerCase();
  const isHtml = extension === undefined || extension === '.html';
  if (
    destination.origin !== current.origin
    || !['http:', 'https:'].includes(destination.protocol)
    || sameDocumentFragment
    || !isHtml
  ) {
    return { eligible: false, destination: null };
  }

  return { eligible: true, destination: destination.href };
}

export function createNavigationWipeController({
  duration = NAVIGATION_TIMEOUT_MS,
  schedule,
  cancel,
  navigate,
  layer,
  panels,
  coordinator,
  beforeStart = () => {},
  policy = { motionAllowed: true, forcedColors: false },
  onError = () => {},
}) {
  let pending = null;
  let timer = null;
  let activePolicy = policy;
  let unlockMotion = () => {};

  function resetVisuals() {
    layer?.removeAttribute('data-active');
    for (const panel of panels) panel.removeAttribute('data-active');
  }

  function finish() {
    if (pending === null) return false;
    const destination = pending;
    pending = null;
    if (timer !== null) {
      try {
        cancel(timer);
      } catch (error) {
        onError(error);
      }
    }
    timer = null;
    try {
      resetVisuals();
    } catch (error) {
      onError(error);
    }
    coordinator?.release('navigation');
    try {
      navigate(destination);
    } catch (error) {
      onError(error);
      try {
        unlockMotion();
      } catch (unlockError) {
        onError(unlockError);
      }
    }
    unlockMotion = () => {};
    return true;
  }

  function fail(error) {
    const consumed = finish();
    if (consumed && error) onError(error);
    return consumed;
  }

  return {
    start(destination) {
      if (pending !== null) return false;
      pending = destination;
      try {
        unlockMotion = beforeStart() ?? (() => {});
        coordinator?.preempt('navigation', 3);
        if (!activePolicy.motionAllowed || activePolicy.forcedColors) {
          finish();
          return true;
        }
        layer?.setAttribute('data-active', '');
        for (const panel of panels) panel.setAttribute('data-active', '');
        timer = schedule(finish, duration);
      } catch (error) {
        fail(error);
      }
      return true;
    },
    complete() {
      return finish();
    },
    setPolicy(nextPolicy) {
      activePolicy = nextPolicy;
      if (!nextPolicy.motionAllowed || nextPolicy.forcedColors) finish();
    },
    pagehide() {
      finish();
    },
    fail,
    destroy() {
      if (pending !== null) {
        fail();
      } else {
        if (timer !== null) cancel(timer);
        timer = null;
        resetVisuals();
        coordinator?.release('navigation');
      }
    },
    snapshot() {
      return { pending, locked: pending !== null, timerActive: timer !== null };
    },
  };
}

export function mountNavigationWipe(context) {
  const document = context.root.ownerDocument;
  const browserWindow = document.defaultView;
  const layer = context.root.querySelector('[data-motion-wipe]');
  const panels = [...context.root.querySelectorAll('[data-motion-wipe-panel]')];
  const mobileMenus = [...document.querySelectorAll('[data-mobile-menu]')];
  if (!browserWindow || !layer || panels.length !== 3) return null;
  const listeners = new AbortController();
  const abortListeners = () => listeners.abort();
  if (context.signal?.aborted) abortListeners();
  else context.signal?.addEventListener('abort', abortListeners, { once: true });

  const wipe = createNavigationWipeController({
    schedule: (callback, delay) => browserWindow.setTimeout(callback, delay),
    cancel: (id) => browserWindow.clearTimeout(id),
    navigate: (destination) => browserWindow.location.assign(destination),
    layer,
    panels,
    coordinator: context.coordinator,
    beforeStart: context.lockForNavigation,
    policy: context.policy,
    onError: context.onError,
  });

  function closeOpenMobileMenus({ deferFocus = false } = {}) {
    for (const menu of mobileMenus) {
      const containsActiveElement = menu.contains(document.activeElement);
      menu.open = false;
      if (!containsActiveElement) continue;
      const focusSummary = () => {
        if (listeners.signal.aborted) return;
        menu.querySelector('summary')?.focus({ preventScroll: true });
      };
      if (deferFocus) queueMicrotask(focusSummary);
      else focusSummary();
    }
  }

  function onClick(event) {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    closeOpenMobileMenus({ deferFocus: true });
    const result = classifyNavigation({
      href: anchor.getAttribute('href'),
      target: anchor.getAttribute('target') ?? '',
      download: anchor.hasAttribute('download'),
    }, {
      button: event.button,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      defaultPrevented: event.defaultPrevented,
    }, browserWindow.location.href);
    if (!result.eligible) return;
    event.preventDefault();
    wipe.start(result.destination);
  }

  document.addEventListener('click', onClick, { signal: listeners.signal });
  browserWindow.addEventListener('resize', closeOpenMobileMenus, {
    signal: listeners.signal,
  });
  browserWindow.addEventListener('orientationchange', closeOpenMobileMenus, {
    signal: listeners.signal,
  });
  browserWindow.addEventListener('pagehide', () => {
    closeOpenMobileMenus();
    wipe.pagehide();
  }, {
    signal: listeners.signal,
  });
  panels.at(-1).addEventListener('transitionend', (event) => {
    if (event.propertyName === 'transform') wipe.complete();
  }, { signal: listeners.signal });
  for (const panel of panels) {
    panel.addEventListener('transitioncancel', () => {
      wipe.fail(new Error('navigation wipe transition cancelled'));
    }, { signal: listeners.signal });
  }

  return {
    navigation: true,
    setPolicy(policy) {
      wipe.setPolicy(policy);
    },
    destroy() {
      closeOpenMobileMenus();
      listeners.abort();
      context.signal?.removeEventListener?.('abort', abortListeners);
      wipe.destroy();
    },
  };
}
