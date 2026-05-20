# Offline Release Guide

The regular web build is local-first, but it can still request third-party resources when local vendor files are missing. Step 7 adds generated release folders for two deployment needs: a strict offline-style build with analytics removed, and an analytics-enabled local-first build for public deployment where Google Analytics is still required.

## What the release builds change

`npm run build:offline` creates `dist/offline` and patches that copy of the app:

- Removes Google Analytics from `index.html`.
- Replaces the Tailwind CDN runtime with `css/offline-fallback.css`.
- Removes the Font Awesome CDN stylesheet. The fallback CSS keeps icon spacing stable, but exact icon glyphs require bundling Font Awesome webfonts separately.
- Removes HTML `onerror` handlers that pointed to CDN fallbacks.
- Sets `window.WEBCODING_OFFLINE = true`.
- Sets `window.WEBCODING_DISABLE_REMOTE_FALLBACKS = true` so `js/core/loader.js` will not load remote scripts or styles at runtime.
- Writes `OFFLINE_RELEASE_MANIFEST.json` and `README-OFFLINE.md` inside the release folder.


`npm run build:offline:analytics` creates `dist/offline-with-analytics` with the same local-first cleanup, but intentionally keeps the Google Analytics tag. Use this for normal public deployment when you still need traffic tracking. It is not a strict offline/private build because the page will contact Google Analytics when loaded online.

## Build commands

```bash
npm run vendor:fetch
npm run build:offline
npm run offline:audit
```

For the analytics-enabled local-first release:

```bash
npm run vendor:fetch
npm run build:offline:analytics
npm run offline:audit:analytics
```

If your network or DNS is unstable, you can narrow or shorten vendor fetching:

```bash
node scripts/fetch-vendor-dependencies.js --only=qr --timeout-ms=10000
node scripts/fetch-vendor-dependencies.js --only=ocr --timeout-ms=10000
```

For a release where every configured optional vendor asset must be present:

```bash
npm run offline:audit:strict
npm run offline:audit:analytics:strict
```

## OCR language data

Tesseract language data is large and is not bundled automatically. For OCR in a strict offline release, download the needed language folders into:

```txt
libs/tessdata/standard
libs/tessdata/best
libs/tessdata/fast
```

The generated offline index sets:

```js
window.WEBCODING_TESSDATA_PATHS = {
  standard: 'libs/tessdata/standard',
  best: 'libs/tessdata/best',
  fast: 'libs/tessdata/fast'
};
```

## Verification checklist

Before sharing an offline package:

1. Run `npm run vendor:fetch` in a network-enabled environment.
2. Add the OCR language data you need.
3. Run `npm run build:offline` for the no-analytics release, or `npm run build:offline:analytics` for the tracking release.
4. Run the matching strict audit: `npm run offline:audit:strict` or `npm run offline:audit:analytics:strict`.
5. Open `dist/offline/index.html` or `dist/offline-with-analytics/index.html` in a browser.
6. Use the browser Network panel. For `dist/offline`, confirm no external resources are requested. For `dist/offline-with-analytics`, confirm the only intentional startup external request is Google Analytics.
7. Test QR, OCR, PDF, DOCX, XLSX, formatting, compare, and export features using real files.

## Known trade-offs

- `css/offline-fallback.css` is a targeted utility subset, not a full Tailwind build. The app remains usable, but minor spacing or color differences can appear.
- Font Awesome icons are not bundled by default because the CSS requires matching webfont files and verified paths.
- Optional features whose vendor files are missing will fail gracefully instead of falling back to CDN in the offline release.
