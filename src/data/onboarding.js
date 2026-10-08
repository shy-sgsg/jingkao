const LAST_STEP = 3;

export function shouldShowOnboarding(state) {
  return state?.completed !== true && state?.hidden !== true;
}

export function advanceOnboarding(step, action = 'next') {
  const current = Number.isInteger(step) ? Math.max(0, Math.min(LAST_STEP, step)) : 0;
  if (action === 'later') return { step: current, hidden: true, completed: false };
  if (action === 'back') return { step: Math.max(0, current - 1), hidden: false, completed: false };
  if (current === LAST_STEP) return { step: 0, hidden: true, completed: true };
  return { step: current + 1, hidden: false, completed: false };
}
