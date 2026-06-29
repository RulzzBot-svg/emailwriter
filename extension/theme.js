(function (global) {
  const STORAGE_KEY = 'prodraftTheme';
  const DEFAULT_THEME = 'dark';

  function normalizeTheme(theme) {
    return theme === 'light' ? 'light' : 'dark';
  }

  async function getTheme() {
    try {
      const stored = await chrome.storage.sync.get(STORAGE_KEY);
      return normalizeTheme(stored[STORAGE_KEY]);
    } catch {
      return DEFAULT_THEME;
    }
  }

  async function setTheme(theme) {
    const next = normalizeTheme(theme);
    try {
      await chrome.storage.sync.set({ [STORAGE_KEY]: next });
    } catch {
      // Ignore storage errors.
    }
    return next;
  }

  function applyTheme(element, theme) {
    if (element) {
      element.setAttribute('data-prodraft-theme', normalizeTheme(theme));
    }
  }

  function themeToggleLabel(theme) {
    return normalizeTheme(theme) === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  }

  function themeToggleIcon(theme) {
    return normalizeTheme(theme) === 'dark' ? '☀️' : '🌙';
  }

  global.ProDraftTheme = {
    STORAGE_KEY,
    DEFAULT_THEME,
    getTheme,
    setTheme,
    applyTheme,
    themeToggleLabel,
    themeToggleIcon,
    normalizeTheme,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
