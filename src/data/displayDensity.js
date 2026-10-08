const DISPLAY_DENSITY_KEY = 'changping-jingkao:display-density';

function normalizeDisplayDensity(value) {
  return value === 'compact' ? 'compact' : 'comfortable';
}

export function readDisplayDensity(getStorage = () => globalThis.localStorage) {
  try {
    return normalizeDisplayDensity(getStorage()?.getItem(DISPLAY_DENSITY_KEY));
  } catch {
    return 'comfortable';
  }
}

export function writeDisplayDensity(value, getStorage = () => globalThis.localStorage) {
  const density = normalizeDisplayDensity(value);
  try {
    getStorage()?.setItem(DISPLAY_DENSITY_KEY, density);
  } catch {
    // Keep the preference for this session even when browser storage is unavailable.
  }
  return density;
}
