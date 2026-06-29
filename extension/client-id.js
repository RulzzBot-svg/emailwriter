(function (global) {
  const STORAGE_KEY = 'prodraftClientId';

  function createClientId() {
    if (global.crypto?.randomUUID) {
      return global.crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const rand = Math.floor(Math.random() * 16);
      const value = char === 'x' ? rand : ((rand & 0x3) | 0x8);
      return value.toString(16);
    });
  }

  async function getChromeStorage(key) {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(key, (result) => {
          resolve(result?.[key] || '');
        });
      } catch {
        resolve('');
      }
    });
  }

  async function setChromeStorage(key, value) {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.set({ [key]: value }, () => resolve(true));
      } catch {
        resolve(false);
      }
    });
  }

  async function getClientId() {
    const fromChrome = await getChromeStorage(STORAGE_KEY);
    if (fromChrome) {
      return fromChrome;
    }

    const next = createClientId();
    await setChromeStorage(STORAGE_KEY, next);
    return next;
  }

  global.ProDraftClient = {
    STORAGE_KEY,
    getClientId,
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
