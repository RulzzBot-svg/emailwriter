(function (global) {
  const STORAGE_KEY = 'prodraftTheme';
  const DEFAULT_THEME = 'oreo-mix';

  const THEMES = [
    { id: 'oreo-mix', label: 'Oreo Mix' },
    { id: 'cherryvines', label: 'Cherryvines' },
    { id: 'dracula', label: 'Dracula' },
    { id: 'corporate-light', label: 'Clean Slate' },
    { id: 'midnight-blue', label: 'Midnight Blue' },
  ];

  const THEME_IDS = new Set(THEMES.map((theme) => theme.id));

  function normalizeTheme(theme) {
    return THEME_IDS.has(theme) ? theme : DEFAULT_THEME;
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

  function getThemeOptions() {
    return THEMES.slice();
  }

  function getThemeLabel(theme) {
    return THEMES.find((entry) => entry.id === normalizeTheme(theme))?.label || 'Theme';
  }

  global.ProDraftTheme = {
    STORAGE_KEY,
    DEFAULT_THEME,
    THEMES,
    getTheme,
    setTheme,
    applyTheme,
    getThemeOptions,
    getThemeLabel,
    normalizeTheme,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
