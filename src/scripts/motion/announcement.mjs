const MAX_TIMEOUT_MS = 2_147_483_647;

export function isAnnouncementActive(expiresAt, now = Date.now()) {
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) && now < expiry;
}

export function mountAnnouncementExpiry(context = {}) {
  const browserWindow = context.window ?? globalThis.window;
  const browserDocument = context.document ?? browserWindow?.document ?? globalThis.document;
  const banner = browserDocument?.querySelector?.('[data-announcement]');
  if (!banner) return null;

  const expiresAt = banner.getAttribute('data-announcement-expires-at');
  const expiry = Date.parse(expiresAt);
  const now = context.now ?? Date.now;
  const setTimer = context.setTimeout
    ?? browserWindow?.setTimeout?.bind(browserWindow)
    ?? globalThis.setTimeout;
  const clearTimer = context.clearTimeout
    ?? browserWindow?.clearTimeout?.bind(browserWindow)
    ?? globalThis.clearTimeout;
  let timeoutId = null;

  function hide() {
    banner.hidden = true;
    banner.setAttribute('aria-hidden', 'true');
  }

  function schedule() {
    const remaining = expiry - now();
    if (!Number.isFinite(remaining) || remaining <= 0) {
      hide();
      return;
    }
    timeoutId = setTimer(schedule, Math.min(remaining, MAX_TIMEOUT_MS));
  }

  schedule();

  return {
    destroy() {
      if (timeoutId !== null) clearTimer(timeoutId);
    },
  };
}
