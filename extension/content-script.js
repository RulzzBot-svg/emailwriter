const { buildEmailPrompt, generateEmail, TONES, fetchUsage, startCheckout, openBillingPortal } = globalThis.ProDraftShared;
const API_BASE = String(globalThis.PRODRAFT_API_BASE_URL || '').trim();
let clientIdPromise = null;

const KNOWN_EMAIL_HOSTS = [
  'mail.google.com',
  'outlook.office.com',
  'outlook.live.com',
  'mail.yahoo.com',
];

const state = {
  activeField: null,
  anchorField: null,
  bubble: null,
  panel: null,
  notesInput: null,
  resultInput: null,
  toneSelect: null,
  shortToggle: null,
  status: null,
  generateButton: null,
  replaceButton: null,
  copyButton: null,
  undoButton: null,
  panelOpen: false,
  notesDirty: false,
  undoSnapshot: null,
  undoTimer: null,
  theme: 'dark',
  themeSelect: null,
  usageText: null,
  upgradeButton: null,
  manageButton: null,
};

function hostMatchesEmailClient() {
  return KNOWN_EMAIL_HOSTS.some((host) => window.location.hostname === host);
}

function isEditableField(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }

  if (element instanceof HTMLInputElement) {
    const allowedTypes = new Set(['text', 'search', 'email', 'url']);
    return allowedTypes.has((element.type || 'text').toLowerCase()) && !element.disabled && !element.readOnly;
  }

  return element.isContentEditable;
}

function isProDraftUiElement(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    element.closest('.prodraft-compose-panel')
    || element.closest('.prodraft-compose-bubble'),
  );
}

function looksLikeComposeField(element) {
  if (isProDraftUiElement(element)) {
    return false;
  }

  if (!isEditableField(element)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const signalText = [
    element.getAttribute('aria-label') || '',
    element.getAttribute('placeholder') || '',
    element.getAttribute('name') || '',
    element.id || '',
    element.className || '',
    element.getAttribute('role') || '',
  ].join(' ').toLowerCase();

  const isEmailCompose = /\b(compose|reply|forward|message\sbody|email\sbody|new\s*(mail|message|email)|to:\s*|subject:)\b/.test(signalText);

  if (!isEmailCompose) {
    return false;
  }

  return rect.width >= 200 && rect.height >= 50;
}

function getPositionField() {
  if (state.panelOpen && state.anchorField) {
    return state.anchorField;
  }

  return state.activeField;
}

function getFieldText(element) {
  if (!element) {
    return '';
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value || '';
  }

  return (element.innerText || element.textContent || '').replace(/\u00a0/g, ' ').trim();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToEditableHtml(value) {
  const normalized = value.replace(/\r\n/g, '\n');
  if (!normalized.trim()) {
    return '<div><br></div>';
  }

  return normalized
    .split('\n')
    .map((line) => `<div>${line ? escapeHtml(line) : '<br>'}</div>`)
    .join('');
}

function dispatchFieldEvents(element) {
  element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText' }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function setFieldText(element, value) {
  if (!element) {
    return;
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    element.focus();
    element.value = value;
    dispatchFieldEvents(element);
    return;
  }

  element.focus();
  element.innerHTML = textToEditableHtml(value);
  dispatchFieldEvents(element);
}

function clearUndo() {
  if (state.undoTimer) {
    clearTimeout(state.undoTimer);
    state.undoTimer = null;
  }
  state.undoSnapshot = null;
  if (state.undoButton) {
    state.undoButton.disabled = true;
  }
}

function scheduleUndo(previousText) {
  clearUndo();
  state.undoSnapshot = previousText;
  if (state.undoButton) {
    state.undoButton.disabled = false;
  }
  state.undoTimer = setTimeout(clearUndo, 10000);
}

async function applyTheme(theme) {
  const { applyTheme: applyThemeAttr } = globalThis.ProDraftTheme;
  state.theme = theme;
  applyThemeAttr(state.bubble, theme);
  applyThemeAttr(state.panel, theme);

  if (state.themeSelect) {
    state.themeSelect.value = theme;
  }
}

async function initTheme() {
  const theme = await globalThis.ProDraftTheme.getTheme();
  await applyTheme(theme);
}

async function onThemeChange(nextTheme) {
  const theme = await globalThis.ProDraftTheme.setTheme(nextTheme);
  await applyTheme(theme);
}

async function getClientId() {
  if (!clientIdPromise) {
    clientIdPromise = globalThis.ProDraftClient.getClientId();
  }
  return clientIdPromise;
}

async function openExternalUrl(url) {
  if (chrome?.tabs?.create) {
    await chrome.tabs.create({ url });
    return;
  }
  window.open(url, '_blank', 'noopener');
}

async function refreshUsageUi() {
  if (!state.usageText || !API_BASE) {
    return;
  }

  try {
    const clientId = await getClientId();
    const usage = await fetchUsage({ apiBase: API_BASE, clientId });
    state.usageText.textContent = `${usage.planName}: ${usage.used}/${usage.limit} polishes this month`;

    if (usage.planId === 'pro') {
      state.upgradeButton.style.display = 'none';
      state.manageButton.style.display = 'inline-flex';
    } else {
      state.upgradeButton.style.display = usage.billingEnabled ? 'inline-flex' : 'none';
      state.manageButton.style.display = 'none';
    }
  } catch (error) {
    state.usageText.textContent = error?.message || 'Could not load usage.';
  }
}

async function loadPreferences() {
  try {
    const stored = await chrome.storage.sync.get(['preferredTone', 'shortSimple']);
    if (stored.preferredTone && state.toneSelect) {
      state.toneSelect.value = stored.preferredTone;
    }
    if (state.shortToggle) {
      const active = stored.shortSimple === true;
      state.shortToggle.dataset.active = String(active);
      state.shortToggle.querySelector('strong').textContent = active ? 'On' : 'Off';
    }
  } catch {
    // Ignore storage errors in unsupported contexts.
  }
}

async function savePreferences() {
  try {
    await chrome.storage.sync.set({
      preferredTone: state.toneSelect?.value || 'professional',
      shortSimple: state.shortToggle?.dataset.active === 'true',
    });
  } catch {
    // Ignore storage errors in unsupported contexts.
  }
}

function ensureUi() {
  if (state.bubble && state.panel) {
    return;
  }

  state.bubble = document.createElement('button');
  state.bubble.className = 'prodraft-compose-bubble';
  state.bubble.type = 'button';
  state.bubble.setAttribute('data-prodraft-theme', 'oreo-mix');
  state.bubble.innerHTML = '<span class="prodraft-bubble-label">Polish</span>';
  state.bubble.title = 'Rewrite with ProDraft';

  state.panel = document.createElement('section');
  state.panel.className = 'prodraft-compose-panel';
  state.panel.setAttribute('data-prodraft-theme', 'oreo-mix');
  state.panel.innerHTML = `
    <div class="prodraft-panel-header">
      <div class="prodraft-header-brand">
        <div class="prodraft-icon-badge">P</div>
        <div class="prodraft-panel-title">
          <strong>ProDraft</strong>
          <span>Rewrite your compose text in place.</span>
        </div>
      </div>
      <div class="prodraft-header-actions">
        <select class="prodraft-theme-select" aria-label="Color theme"></select>
        <button class="prodraft-close" type="button" aria-label="Close">×</button>
      </div>
    </div>
    <div class="prodraft-panel-body">
      <div class="prodraft-row">
        <div class="prodraft-field">
          <label for="prodraft-tone">Tone</label>
          <select id="prodraft-tone" class="prodraft-select">
            ${TONES.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}
          </select>
        </div>
        <div class="prodraft-field">
          <label>Length</label>
          <button id="prodraft-short-toggle" class="prodraft-toggle" type="button" data-active="false">
            <span>Short + simple</span>
            <strong>Off</strong>
          </button>
        </div>
      </div>
      <div class="prodraft-editor-row">
        <div class="prodraft-field">
          <label for="prodraft-notes">Your notes</label>
          <textarea id="prodraft-notes" class="prodraft-textarea" data-prodraft-ui="true" placeholder="Your compose text appears here."></textarea>
        </div>
        <div class="prodraft-field">
          <label for="prodraft-result">Polished result</label>
          <textarea id="prodraft-result" class="prodraft-textarea" data-prodraft-ui="true" placeholder="Polished output appears here." readonly></textarea>
        </div>
      </div>
      <div class="prodraft-status" data-state="idle"></div>
      <div class="prodraft-actions">
        <button id="prodraft-generate" class="prodraft-button prodraft-button-primary" type="button">Generate</button>
        <button id="prodraft-replace" class="prodraft-button prodraft-button-secondary" type="button" disabled>Replace</button>
        <button id="prodraft-copy" class="prodraft-button prodraft-button-secondary" type="button" disabled>Copy</button>
      </div>
      <div class="prodraft-footer-row">
        <div class="prodraft-usage">
          <p class="prodraft-usage-text"></p>
          <div class="prodraft-usage-actions">
            <button id="prodraft-upgrade" class="prodraft-button prodraft-button-primary" type="button" style="display:none;">Upgrade</button>
            <button id="prodraft-manage" class="prodraft-button prodraft-button-secondary" type="button" style="display:none;">Manage</button>
          </div>
        </div>
        <button id="prodraft-undo" class="prodraft-button prodraft-button-secondary prodraft-undo" type="button" disabled>Undo replace</button>
      </div>
    </div>
  `;

  document.documentElement.appendChild(state.bubble);
  document.documentElement.appendChild(state.panel);

  state.notesInput = state.panel.querySelector('#prodraft-notes');
  state.resultInput = state.panel.querySelector('#prodraft-result');
  state.toneSelect = state.panel.querySelector('#prodraft-tone');
  state.shortToggle = state.panel.querySelector('#prodraft-short-toggle');
  state.status = state.panel.querySelector('.prodraft-status');
  state.generateButton = state.panel.querySelector('#prodraft-generate');
  state.replaceButton = state.panel.querySelector('#prodraft-replace');
  state.copyButton = state.panel.querySelector('#prodraft-copy');
  state.undoButton = state.panel.querySelector('#prodraft-undo');
  state.themeSelect = state.panel.querySelector('.prodraft-theme-select');
  state.usageText = state.panel.querySelector('.prodraft-usage-text');
  state.upgradeButton = state.panel.querySelector('#prodraft-upgrade');
  state.manageButton = state.panel.querySelector('#prodraft-manage');

  globalThis.ProDraftTheme.getThemeOptions().forEach(({ id, label }) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = label;
    state.themeSelect.appendChild(option);
  });

  initTheme();

  state.bubble.addEventListener('click', () => {
    if (state.panelOpen) {
      closePanel();
      return;
    }
    openPanel();
  });

  state.themeSelect.addEventListener('change', (event) => {
    event.stopPropagation();
    onThemeChange(event.target.value);
  });

  state.upgradeButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    try {
      const clientId = await getClientId();
      const url = await startCheckout({ apiBase: API_BASE, clientId });
      await openExternalUrl(url);
    } catch (error) {
      setStatus(error?.message || 'Checkout unavailable.', 'error');
    }
  });

  state.manageButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    try {
      const clientId = await getClientId();
      const url = await openBillingPortal({ apiBase: API_BASE, clientId });
      await openExternalUrl(url);
    } catch (error) {
      setStatus(error?.message || 'Billing portal unavailable.', 'error');
    }
  });

  state.panel.querySelector('.prodraft-close').addEventListener('click', closePanel);

  state.shortToggle.addEventListener('click', () => {
    const isActive = state.shortToggle.dataset.active === 'true';
    state.shortToggle.dataset.active = String(!isActive);
    state.shortToggle.querySelector('strong').textContent = isActive ? 'Off' : 'On';
    savePreferences();
  });

  state.toneSelect.addEventListener('change', savePreferences);

  state.notesInput.addEventListener('input', () => {
    state.notesDirty = true;
  });

  state.generateButton.addEventListener('click', generateDraft);

  state.replaceButton.addEventListener('click', () => {
    const result = state.resultInput.value.trim();
    if (!result || !state.activeField) {
      return;
    }

    const previousText = getFieldText(state.activeField);
    setFieldText(state.activeField, result);
    scheduleUndo(previousText);
    setStatus('Draft replaced in the compose box.', 'success');
  });

  state.undoButton.addEventListener('click', () => {
    if (!state.activeField || state.undoSnapshot === null) {
      return;
    }

    setFieldText(state.activeField, state.undoSnapshot);
    clearUndo();
    setStatus('Restored previous draft text.', 'success');
  });

  state.copyButton.addEventListener('click', async () => {
    const result = state.resultInput.value.trim();
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(result);
    setStatus('Copied polished draft to clipboard.', 'success');
  });

  document.addEventListener('mousedown', (event) => {
    if (!state.panelOpen) {
      return;
    }

    if (state.panel.contains(event.target) || state.bubble.contains(event.target)) {
      return;
    }

    closePanel();
  });

  window.addEventListener('scroll', syncUiToField, true);
  window.addEventListener('resize', syncUiToField);

  loadPreferences();
  refreshUsageUi();
}

function setStatus(message, stateName = 'idle') {
  state.status.textContent = message;
  state.status.dataset.state = stateName;
}

function isFieldVisible(element) {
  if (!element || !document.contains(element)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function syncDraftIntoPanel(force = false) {
  if (!state.activeField || !state.notesInput) {
    return;
  }

  if (force || !state.notesDirty) {
    state.notesInput.value = getFieldText(state.activeField);
  }
}

function positionBubble() {
  const field = getPositionField();
  if (!field || !isFieldVisible(field)) {
    state.bubble.style.display = 'none';
    return;
  }

  const rect = field.getBoundingClientRect();
  const top = Math.max(12, rect.bottom - 46);
  const left = Math.min(window.innerWidth - 120, rect.right - 110);

  state.bubble.style.top = `${top}px`;
  state.bubble.style.left = `${Math.max(12, left)}px`;
  state.bubble.style.display = 'inline-flex';
}

function positionPanel() {
  const field = getPositionField();
  if (!state.panelOpen || !field || !isFieldVisible(field)) {
    return;
  }

  const rect = field.getBoundingClientRect();
  const panelRect = state.panel.getBoundingClientRect();
  const preferredLeft = rect.right + 12;
  const fallbackLeft = rect.left - panelRect.width - 12;
  const top = Math.min(Math.max(12, rect.top), window.innerHeight - panelRect.height - 12);

  let left = preferredLeft;
  if (preferredLeft + panelRect.width > window.innerWidth - 12) {
    left = fallbackLeft;
  }
  if (left < 12) {
    left = Math.max(12, window.innerWidth - panelRect.width - 12);
  }

  state.panel.style.top = `${top}px`;
  state.panel.style.left = `${left}px`;
}

function syncUiToField() {
  const field = getPositionField();
  if (!field || !isFieldVisible(field)) {
    if (!state.panelOpen) {
      state.activeField = null;
      state.anchorField = null;
      state.bubble.style.display = 'none';
    }
    return;
  }

  positionBubble();
  if (state.panelOpen) {
    positionPanel();
  }
}

function openPanel() {
  if (!state.activeField) {
    return;
  }

  state.anchorField = state.activeField;
  state.panelOpen = true;
  state.panel.style.display = 'block';
  syncDraftIntoPanel(true);
  positionPanel();
  refreshUsageUi();
  setStatus('Compose text loaded. Adjust tone and generate when ready.');
}

function closePanel() {
  state.panelOpen = false;
  state.panel.style.display = 'none';
  state.anchorField = null;
}

async function generateDraft() {
  const draftNotes = state.notesInput.value.trim();
  if (!draftNotes) {
    setStatus('There is no draft text to rewrite yet.', 'error');
    return;
  }

  if (!API_BASE) {
    setStatus('ProDraft API URL is not configured.', 'error');
    return;
  }

  state.generateButton.disabled = true;
  state.replaceButton.disabled = true;
  state.copyButton.disabled = true;
  setStatus('Generating polished draft...');

  const prompt = buildEmailPrompt({
    draftNotes,
    tone: state.toneSelect.value,
    shortSimple: state.shortToggle.dataset.active === 'true',
  });

  try {
    const clientId = await getClientId();
    const generatedText = await generateEmail({ apiBase: API_BASE, prompt, clientId });
    state.resultInput.value = generatedText;
    state.replaceButton.disabled = false;
    state.copyButton.disabled = false;
    setStatus('Draft ready. Replace the compose box or copy the text.', 'success');
    await refreshUsageUi();
  } catch (error) {
    setStatus(error?.message || 'Request failed.', 'error');
    if (error?.code === 'USAGE_LIMIT') {
      await refreshUsageUi();
    }
  } finally {
    state.generateButton.disabled = false;
  }
}

document.addEventListener('focusin', (event) => {
  const target = event.target;

  if (isProDraftUiElement(target)) {
    return;
  }

  if (state.panelOpen) {
    return;
  }

  if (!looksLikeComposeField(target)) {
    return;
  }

  ensureUi();
  state.activeField = target;
  state.notesDirty = false;
  syncDraftIntoPanel(true);
  syncUiToField();
});

document.addEventListener('input', (event) => {
  const target = event.target;
  if (target !== state.activeField || !looksLikeComposeField(target)) {
    return;
  }

  syncDraftIntoPanel(false);
  syncUiToField();
});

if (hostMatchesEmailClient()) {
  ensureUi();
}
