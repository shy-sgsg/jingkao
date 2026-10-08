export function runViewTransition(documentLike, update, motionIntensity = 'enhanced') {
  const reduceMotion = documentLike?.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  if ((reduceMotion && motionIntensity !== 'immersive') || typeof documentLike?.startViewTransition !== 'function') {
    update();
    return null;
  }
  return documentLike.startViewTransition(update);
}
