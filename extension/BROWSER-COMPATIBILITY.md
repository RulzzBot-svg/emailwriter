# Browser Compatibility Guide

This extension works across all major browsers. Here's how to load it:

## Chrome, Brave, Opera, Edge (Chromium-based)

1. Use the default `manifest.json` (Manifest V3)
2. Go to `chrome://extensions/` (or equivalent in your browser)
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select this `extension` folder

## Firefox

1. Rename or copy `manifest-firefox.json` to `manifest.json` (or Firefox will look for `manifest.json`)
   - Option A: Copy `manifest-firefox.json` → `manifest.json`
   - Option B: Go to `about:debugging#/runtime/this-firefox` and load as-is, then rename files locally
   
2. Go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select the `manifest.json` file (or the modified one)

### Permanent Firefox Installation

For a persistent Firefox installation:
1. Follow the steps above
2. The extension will remain loaded until you restart Firefox
3. For permanent installation, you'd need to sign/publish through Mozilla Add-ons (AMO), which requires additional steps

## Summary

| Browser | Manifest | Instructions |
|---------|----------|--------------|
| Chrome | `manifest.json` | Extensions → Load unpacked |
| Brave | `manifest.json` | Extensions → Load unpacked |
| Opera | `manifest.json` | Extensions → Load unpacked |
| Edge | `manifest.json` | Extensions → Load unpacked |
| Firefox | `manifest-firefox.json` | about:debugging → Load Add-on |

**Note:** The extension uses Manifest V2 for Firefox (required) and Manifest V3 for Chromium browsers (modern standard).
