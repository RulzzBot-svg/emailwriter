document.addEventListener('DOMContentLoaded', async () => {
  const { buildEmailPrompt, generateEmail, TONES, fetchUsage, startCheckout, openBillingPortal } = globalThis.ProDraftShared;
  const { getClientId } = globalThis.ProDraftClient;
  const {
    getTheme,
    setTheme,
    applyTheme,
    themeToggleIcon,
    themeToggleLabel,
  } = globalThis.ProDraftTheme;
  const apiBase = String(globalThis.PRODRAFT_API_BASE_URL || '').trim();

  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const rawInput = document.getElementById('rawInput');
  const toneSelect = document.getElementById('toneSelect');
  const shortToggle = document.getElementById('shortToggle');
  const outputArea = document.getElementById('outputArea');
  const themeToggle = document.getElementById('themeToggle');
  const usageText = document.getElementById('usageText');
  const upgradeBtn = document.getElementById('upgradeBtn');
  const manageBtn = document.getElementById('manageBtn');

  const clientId = await getClientId();
  let currentTheme = await getTheme();
  applyTheme(document.body, currentTheme);
  themeToggle.textContent = themeToggleIcon(currentTheme);
  themeToggle.setAttribute('aria-label', themeToggleLabel(currentTheme));

  themeToggle.addEventListener('click', async () => {
    currentTheme = await setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    applyTheme(document.body, currentTheme);
    themeToggle.textContent = themeToggleIcon(currentTheme);
    themeToggle.setAttribute('aria-label', themeToggleLabel(currentTheme));
  });

  async function refreshUsage() {
    if (!apiBase) {
      usageText.textContent = 'API not configured.';
      return;
    }

    try {
      const usage = await fetchUsage({ apiBase, clientId });
      usageText.textContent = `${usage.planName}: ${usage.used}/${usage.limit} polishes this month`;

      if (usage.planId === 'pro') {
        upgradeBtn.style.display = 'none';
        manageBtn.style.display = 'block';
      } else {
        upgradeBtn.style.display = usage.billingEnabled ? 'block' : 'none';
        manageBtn.style.display = 'none';
      }
    } catch (error) {
      usageText.textContent = error?.message || 'Could not load usage.';
    }
  }

  upgradeBtn.addEventListener('click', async () => {
    try {
      const url = await startCheckout({ apiBase, clientId });
      chrome.tabs.create({ url });
    } catch (error) {
      usageText.textContent = error?.message || 'Checkout unavailable.';
    }
  });

  manageBtn.addEventListener('click', async () => {
    try {
      const url = await openBillingPortal({ apiBase, clientId });
      chrome.tabs.create({ url });
    } catch (error) {
      usageText.textContent = error?.message || 'Billing portal unavailable.';
    }
  });

  TONES.forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    if (value === 'professional') {
      option.selected = true;
    }
    toneSelect.appendChild(option);
  });

  shortToggle.addEventListener('click', () => {
    const isActive = shortToggle.dataset.active === 'true';
    shortToggle.dataset.active = String(!isActive);
    shortToggle.querySelector('strong').textContent = isActive ? 'Off' : 'On';
  });

  generateBtn.addEventListener('click', async () => {
    const text = rawInput.value.trim();
    if (!text) {
      return;
    }

    if (!apiBase) {
      outputArea.value = 'Error: ProDraft API URL is not configured. Set PRODRAFT_API_BASE_URL in prodraft/.env and run npm run sync:extension-config.';
      return;
    }

    generateBtn.innerText = 'Polishing with AI...';
    generateBtn.disabled = true;

    try {
      const prompt = buildEmailPrompt({
        draftNotes: text,
        tone: toneSelect.value,
        shortSimple: shortToggle.dataset.active === 'true',
      });

      const emailText = await generateEmail({ apiBase, prompt, clientId });
      outputArea.value = emailText;
      copyBtn.classList.add('visible');
      await refreshUsage();
    } catch (error) {
      outputArea.value = `Whoops, ProDraft request failed: ${error?.message || 'Unknown error.'}`;
      if (error?.code === 'USAGE_LIMIT') {
        await refreshUsage();
      }
    } finally {
      generateBtn.innerText = 'Translate to Professional';
      generateBtn.disabled = false;
    }
  });

  copyBtn.addEventListener('click', async () => {
    const text = outputArea.value.trim();
    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    copyBtn.innerText = 'Copied!';
    copyBtn.classList.add('success');
    setTimeout(() => {
      copyBtn.innerText = 'Copy to Clipboard';
      copyBtn.classList.remove('success');
    }, 2000);
  });

  await refreshUsage();
});
