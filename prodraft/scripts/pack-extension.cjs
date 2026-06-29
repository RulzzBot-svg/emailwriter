const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prodraftDir = path.resolve(__dirname, '..');
const extensionDir = path.resolve(prodraftDir, '..', 'extension');
const outputZip = path.join(extensionDir, 'prodraft-extension.zip');

const REQUIRED_FILES = [
  'manifest.json',
  'background.js',
  'extension-config.js',
  'client-id.js',
  'theme.js',
  'prodraft-shared.js',
  'content-script.js',
  'content-script.css',
  'popup.html',
  'popup.js',
];

function readApiBase() {
  const configPath = path.join(extensionDir, 'extension-config.js');
  const text = fs.readFileSync(configPath, 'utf8');
  const match = text.match(/PRODRAFT_API_BASE_URL = '([^']+)'/);
  return match?.[1] || '';
}

function main() {
  if (!fs.existsSync(extensionDir)) {
    console.error('Extension folder not found.');
    process.exit(1);
  }

  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(extensionDir, file))) {
      console.error(`Missing required extension file: ${file}`);
      process.exit(1);
    }
  }

  const apiBase = readApiBase();
  if (/localhost|127\.0\.0\.1/i.test(apiBase)) {
    console.warn('\nWARNING: extension-config.js still points at localhost.');
    console.warn('Set PRODRAFT_API_BASE_URL to your live Vercel URL, run npm run sync:extension-config, then pack again.\n');
  } else {
    console.log(`API base: ${apiBase}`);
  }

  if (fs.existsSync(outputZip)) {
    fs.unlinkSync(outputZip);
  }

  const isWindows = process.platform === 'win32';
  if (isWindows) {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${extensionDir}\\*' -DestinationPath '${outputZip}' -Force"`,
      { stdio: 'inherit' },
    );
  } else {
    execSync(`cd "${extensionDir}" && zip -r "${outputZip}" . -x "*.zip"`, { stdio: 'inherit' });
  }

  console.log(`\nCreated ${outputZip}`);
  console.log('Upload this ZIP to the Chrome Web Store Developer Dashboard.');
}

main();
