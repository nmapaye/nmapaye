export function deriveMotionPolicy(input) {
  const motionAllowed = !input.reducedMotion && !input.hidden;
  return {
    navigationActive: false,
    motionAllowed,
    finePointerEffects:
      motionAllowed &&
      !input.forcedColors &&
      input.finePointer &&
      input.supportsPointer,
    blendAllowed:
      motionAllowed && !input.forcedColors && input.supportsBlend,
    perspectiveAllowed: motionAllowed && input.supports3d,
    pointerAllowed: input.supportsPointer,
    pointerCaptureAllowed:
      input.supportsPointer && input.supportsPointerCapture,
    reducedMotion: input.reducedMotion,
    hidden: input.hidden,
    forcedColors: input.forcedColors,
  };
}

export function observeMotionPolicy({
  window: browserWindow,
  document: browserDocument,
  onChange,
  signal,
}) {
  const inertQuery = { matches: false };
  const query = (value) => browserWindow?.matchMedia?.(value) ?? inertQuery;
  const reduced = query('(prefers-reduced-motion: reduce)');
  const fine = query('(hover: hover) and (pointer: fine)');
  const forced = query('(forced-colors: active)');
  const sources = [reduced, fine, forced];
  const legacyCleanups = [];

  const read = () => deriveMotionPolicy({
    reducedMotion: reduced.matches,
    finePointer: fine.matches,
    forcedColors: forced.matches,
    hidden: Boolean(browserDocument?.hidden),
    supportsBlend:
      browserWindow?.CSS?.supports?.('mix-blend-mode', 'difference') ?? false,
    supports3d:
      browserWindow?.CSS?.supports?.('transform-style', 'preserve-3d') ?? false,
    supportsPointer: 'PointerEvent' in (browserWindow ?? {}),
    supportsPointerCapture:
      'setPointerCapture' in (browserWindow?.Element?.prototype ?? {}),
  });
  let current;
  const emit = () => {
    current = read();
    onChange(current);
    return current;
  };

  for (const source of sources) {
    if (source.addEventListener) {
      source.addEventListener('change', emit, { signal });
    } else if (source.addListener) {
      source.addListener(emit);
      legacyCleanups.push(() => source.removeListener?.(emit));
    }
  }
  browserDocument?.addEventListener?.('visibilitychange', emit, { signal });
  signal?.addEventListener('abort', () => {
    for (const cleanup of legacyCleanups) cleanup();
  }, { once: true });
  emit();
  return {
    get current() {
      return current;
    },
    refresh: emit,
  };
}
