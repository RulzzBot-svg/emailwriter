const { app, BrowserWindow, ipcMain, screen } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DIST_DIR = path.join(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.mjs': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const LAUNCHER_SIZE = 64;
const LAUNCHER_MARGIN = 20;
const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 750;

let launcherWindow = null;
let panelWindow = null;
let localServer = null;
let isQuitting = false;


function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.end(JSON.stringify(payload));
}

async function handleGenerateEmail(req, res) {
  const serverApiKey = process.env.GEMINI_API_KEY;

  if (!serverApiKey) {
    sendJson(res, 500, { error: { message: 'Server is missing GEMINI_API_KEY.' } });
    return;
  }

  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  let parsed;
  try {
    parsed = JSON.parse(body || '{}');
  } catch {
    sendJson(res, 400, { error: { message: 'Invalid JSON request body.' } });
    return;
  }

  try {
    const { handleGenerateEmailRequest } = await import('../server/handlers.js');
    const result = await handleGenerateEmailRequest(req, parsed, serverApiKey);
    sendJson(res, result.status, result.body);
  } catch (error) {
    sendJson(res, 500, { error: { message: error?.message || 'Proxy request failed.' } });
  }
}

function serveStatic(req, res) {
  const parsed = new URL(req.url || '/', 'http://127.0.0.1');
  const requestedPath = decodeURIComponent(parsed.pathname);
  const safePath = requestedPath === '/'
    ? '/index.html'
    : requestedPath;

  const absolutePath = path.normalize(path.join(DIST_DIR, safePath));
  const isInsideDist = absolutePath.startsWith(path.normalize(DIST_DIR + path.sep));

  if (!isInsideDist) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  let finalPath = absolutePath;
  if (!fs.existsSync(finalPath) || fs.statSync(finalPath).isDirectory()) {
    finalPath = path.join(DIST_DIR, 'index.html');
  }

  fs.readFile(finalPath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const ext = path.extname(finalPath).toLowerCase();
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    res.end(data);
  });
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (req.method === 'POST' && req.url === '/api/generate-email') {
        await handleGenerateEmail(req, res);
        return;
      }

      if (req.method === 'GET' || req.method === 'HEAD') {
        serveStatic(req, res);
        return;
      }

      res.statusCode = 405;
      res.end('Method Not Allowed');
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

function getAppUrl() {
  const devUrl = process.env.ELECTRON_START_URL;

  if (devUrl) {
    return devUrl;
  }

  if (!localServer) {
    throw new Error('Local server has not been started.');
  }

  return `http://127.0.0.1:${localServer.port}`;
}

function getWorkArea() {
  const referenceWindow = launcherWindow && !launcherWindow.isDestroyed()
    ? launcherWindow
    : panelWindow;

  if (referenceWindow && !referenceWindow.isDestroyed()) {
    return screen.getDisplayMatching(referenceWindow.getBounds()).workArea;
  }

  return screen.getPrimaryDisplay().workArea;
}

function positionLauncher() {
  if (!launcherWindow || launcherWindow.isDestroyed()) {
    return;
  }

  const workArea = getWorkArea();
  const x = Math.round(workArea.x + workArea.width - LAUNCHER_SIZE - LAUNCHER_MARGIN);
  const y = Math.round(workArea.y + workArea.height - LAUNCHER_SIZE - LAUNCHER_MARGIN);
  launcherWindow.setPosition(x, y);
}

function positionPanel() {
  if (!panelWindow || panelWindow.isDestroyed()) {
    return;
  }

  const workArea = getWorkArea();
  const launcherBounds = launcherWindow && !launcherWindow.isDestroyed()
    ? launcherWindow.getBounds()
    : { x: workArea.x + workArea.width - LAUNCHER_SIZE - LAUNCHER_MARGIN, y: workArea.y + workArea.height - LAUNCHER_SIZE - LAUNCHER_MARGIN, width: LAUNCHER_SIZE, height: LAUNCHER_SIZE };

  const desiredX = launcherBounds.x + launcherBounds.width - PANEL_WIDTH;
  const desiredY = launcherBounds.y + launcherBounds.height - PANEL_HEIGHT - 12;

  const minX = workArea.x + 12;
  const minY = workArea.y + 12;
  const maxX = workArea.x + workArea.width - PANEL_WIDTH - 12;
  const maxY = workArea.y + workArea.height - PANEL_HEIGHT - 12;

  const x = Math.min(Math.max(desiredX, minX), Math.max(minX, maxX));
  const y = Math.min(Math.max(desiredY, minY), Math.max(minY, maxY));

  panelWindow.setPosition(Math.round(x), Math.round(y));
}

async function createPanelWindow() {
  panelWindow = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    minWidth: 380,
    minHeight: 600,
    show: false,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#08111f',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'prodraft-icon.png'),
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      sandbox: true,
    },
  });

  panelWindow.on('blur', () => {
    if (!panelWindow.isDestroyed()) {
      panelWindow.hide();
    }
  });

  panelWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      panelWindow.hide();
    }
  });

  await panelWindow.loadURL(getAppUrl());
  positionPanel();
}

function getLauncherHtml() {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>ProDraft Launcher</title>
      <style>
        html, body {
          margin: 0;
          width: 100%;
          height: 100%;
          background: transparent;
          overflow: hidden;
          font-family: "Segoe UI", sans-serif;
        }
        body {
          display: flex;
          align-items: center;
          justify-content: center;
          -webkit-app-region: drag;
        }
        button {
          width: 56px;
          height: 56px;
          border: 0;
          border-radius: 18px;
          cursor: pointer;
          -webkit-app-region: no-drag;
          background: linear-gradient(135deg, #2563eb, #4f46e5 55%, #06b6d4);
          color: #fff;
          box-shadow: 0 20px 32px rgba(8, 17, 31, 0.45);
          font-size: 24px;
          font-weight: 700;
          transition: transform 120ms ease, box-shadow 120ms ease;
        }
        button:hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 24px 36px rgba(8, 17, 31, 0.52);
        }
        button:active {
          transform: scale(0.98);
        }
      </style>
    </head>
    <body>
      <button id="launcher" title="Open ProDraft">P</button>
      <script>
        const { ipcRenderer } = require('electron');
        document.getElementById('launcher').addEventListener('click', () => {
          ipcRenderer.invoke('prodraft:toggle-panel');
        });
      </script>
    </body>
  </html>`;
}

async function createLauncherWindow() {
  launcherWindow = new BrowserWindow({
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      sandbox: false,
    },
  });

  launcherWindow.on('closed', () => {
    launcherWindow = null;
    if (!isQuitting) {
      app.quit();
    }
  });

  positionLauncher();
  await launcherWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(getLauncherHtml())}`);
  launcherWindow.show();
}

async function togglePanelWindow() {
  if (!panelWindow || panelWindow.isDestroyed()) {
    await createPanelWindow();
  }

  if (panelWindow.isVisible()) {
    panelWindow.hide();
    return;
  }

  positionPanel();
  panelWindow.show();
  panelWindow.focus();
}

app.whenReady().then(async () => {
  if (!process.env.ELECTRON_START_URL) {
    localServer = await startLocalServer();
  }

  ipcMain.handle('prodraft:toggle-panel', async () => {
    await togglePanelWindow();
  });

  await createPanelWindow();
  await createLauncherWindow();

  app.on('activate', () => {
    if (!launcherWindow || launcherWindow.isDestroyed()) {
      createLauncherWindow();
      return;
    }

    launcherWindow.show();
  });

  screen.on('display-metrics-changed', () => {
    positionLauncher();
    positionPanel();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  if (localServer?.server) {
    localServer.server.close();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
