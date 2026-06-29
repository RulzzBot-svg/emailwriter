export const THEME_STORAGE_KEY = 'prodraft-theme';
export const DEFAULT_THEME = 'light';

export function normalizeTheme(theme) {
  return theme === 'light' ? 'light' : 'dark';
}

export function readStoredTheme() {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }

  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function persistTheme(theme) {
  const next = normalizeTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Ignore storage errors.
  }
  return next;
}

export function applyDocumentTheme(theme) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute('data-theme', normalizeTheme(theme));
}

export function getNextTheme(theme) {
  return normalizeTheme(theme) === 'dark' ? 'light' : 'dark';
}
