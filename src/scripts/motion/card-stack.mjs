export function reduceCardStack(state, event, policy) {
  if (!policy.motionAllowed) {
    return { ...state, expanded: true, animate: false, preventDefault: false };
  }
  const next = {
    ...state,
    hovered:
      event.type === 'pointerenter'
        ? true
        : event.type === 'pointerleave'
          ? false
          : state.hovered,
    focused:
      event.type === 'focusin'
        ? true
        : event.type === 'focusout'
          ? false
          : state.focused,
    tapped: event.type === 'activate' ? !state.tapped : state.tapped,
    preventDefault: false,
  };
  const expanded = Boolean(next.hovered || next.focused || next.tapped);
  return {
    ...next,
    expanded,
    animate: expanded !== state.expanded,
  };
}

export function mountCardStacks(context) {
  const document = context.root.ownerDocument;
  const cards = [...document.querySelectorAll('[data-motion-card]')];
  if (cards.length === 0) return null;
  const showcase = cards[0].closest('[data-motion-showcase]');
  let visible = true;
  let visibilityObserver = null;
  let destroyed = false;
  const listenerAbortController = new AbortController();
  const abortListeners = () => listenerAbortController.abort();
  if (context.signal?.aborted) abortListeners();
  else context.signal?.addEventListener('abort', abortListeners, { once: true });
  const entries = cards.map((card) => ({
    card,
    stack: card.querySelector('[data-motion-card-stack]'),
    state: {
      expanded: false,
      hovered: false,
      focused: false,
      tapped: false,
    },
    startedAt: null,
    owner: `card:${card.dataset.motionCard}`,
  })).filter((entry) => entry.stack);
  if (entries.length === 0) return null;

  function render(entry) {
    entry.stack.toggleAttribute('data-expanded', entry.state.expanded);
  }

  function finish(entry) {
    entry.startedAt = null;
    for (const layer of entry.stack.querySelectorAll('[data-motion-card-layer]')) {
      layer.style.removeProperty('will-change');
    }
    context.coordinator.release(entry.owner);
    render(entry);
    if (entries.every((candidate) => candidate.startedAt === null)) {
      context.scheduler.cancel(controller);
    }
  }

  function cancel(entry) {
    entry.state = {
      ...entry.state,
      animate: false,
      preventDefault: false,
    };
    entry.stack.setAttribute('data-motion-static', '');
    finish(entry);
  }

  function transition(entry, event) {
    if (destroyed || !visible) return;
    const next = reduceCardStack(entry.state, event, context.policy);
    if (!next.animate) {
      entry.state = next;
      render(entry);
      return;
    }
    const currentOwner = context.coordinator.owner;
    const relatedShuffleOwnsCard =
      currentOwner === `shuffle:${entry.card.dataset.motionCard}` &&
      entry.card.querySelector('[data-motion-shuffle][data-active]');
    if (
      (
        typeof currentOwner === 'string' &&
        currentOwner.startsWith('link:')
      ) ||
      relatedShuffleOwnsCard
    ) {
      entry.state = { ...next, animate: false };
      entry.stack.setAttribute('data-motion-static', '');
      render(entry);
      return;
    }
    if (!context.coordinator.claim(entry.owner, 1, () => cancel(entry))) return;
    entry.state = next;
    entry.stack.removeAttribute('data-motion-static');
    render(entry);
    entry.startedAt = context.scheduler.now(context.clock());
    for (const layer of entry.stack.querySelectorAll('[data-motion-card-layer]')) {
      layer.style.willChange = 'transform';
    }
    context.scheduler.request(controller);
  }

  const controller = {
    update(timestamp) {
      for (const entry of entries) {
        if (typeof entry.startedAt === 'number' && timestamp - entry.startedAt >= 220) {
          finish(entry);
        }
      }
      return entries.some((entry) => entry.startedAt !== null);
    },
    setPolicy(policy) {
      if (destroyed) return;
      for (const entry of entries) {
        entry.state = reduceCardStack(entry.state, { type: 'policy' }, policy);
        if (!policy.motionAllowed) entry.stack.setAttribute('data-motion-static', '');
        else entry.stack.removeAttribute('data-motion-static');
        finish(entry);
      }
      context.scheduler.cancel(controller);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      listenerAbortController.abort();
      context.signal?.removeEventListener?.('abort', abortListeners);
      context.scheduler.cancel(controller);
      visibilityObserver?.disconnect();
      for (const entry of entries) {
        context.coordinator.release(entry.owner);
        entry.stack.removeAttribute('data-expanded');
        entry.stack.removeAttribute('data-motion-static');
        for (const layer of entry.stack.querySelectorAll('[data-motion-card-layer]')) {
          layer.style.removeProperty('will-change');
        }
      }
    },
  };

  function applyVisibility(nextVisible) {
    if (destroyed || visible === nextVisible) return;
    visible = nextVisible;
    if (!visible) {
      for (const entry of entries) cancel(entry);
      context.scheduler.cancel(controller);
    }
  }

  visibilityObserver = context.observerFactory?.((records) => {
    const record = records.find((candidate) => candidate.target === (showcase ?? cards[0]));
    if (record) applyVisibility(record.isIntersecting);
  }, { threshold: 0 });
  if (visibilityObserver) {
    visibilityObserver.observe(showcase ?? cards[0]);
  } else {
    const browserWindow = document.defaultView;
    const refreshFallbackVisibility = () => {
      const rect = (showcase ?? cards[0]).getBoundingClientRect();
      applyVisibility(rect.bottom > 0 && rect.top < (browserWindow?.innerHeight ?? rect.bottom));
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

  for (const entry of entries) {
    entry.card.addEventListener('pointerenter', () => transition(entry, { type: 'pointerenter' }), {
      signal: listenerAbortController.signal,
    });
    entry.card.addEventListener('pointerleave', () => transition(entry, { type: 'pointerleave' }), {
      signal: listenerAbortController.signal,
    });
    entry.card.addEventListener('focusin', () => transition(entry, { type: 'focusin' }), {
      signal: listenerAbortController.signal,
    });
    entry.card.addEventListener('focusout', (event) => {
      if (!entry.card.contains(event.relatedTarget)) transition(entry, { type: 'focusout' });
    }, { signal: listenerAbortController.signal });
    entry.card.addEventListener('click', (event) => {
      transition(entry, {
        type: 'activate',
        interactiveTarget: Boolean(event.target.closest?.('a,button')),
      });
    }, { signal: listenerAbortController.signal });
  }
  return controller;
}
