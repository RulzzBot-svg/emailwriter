// Proxies API calls from content scripts (Gmail, Outlook) so requests use
// extension host permissions instead of the page origin (which triggers CORS).
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'prodraft:fetch') {
    return false;
  }

  const { url, options = {} } = message;

  fetch(url, options)
    .then(async (response) => {
      sendResponse({
        ok: response.ok,
        status: response.status,
        body: await response.text(),
      });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        networkError: true,
        message: error?.message || 'Failed to fetch',
      });
    });

  return true;
});
