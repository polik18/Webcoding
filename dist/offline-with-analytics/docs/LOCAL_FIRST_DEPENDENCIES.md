# Local-first dependencies

Step 5 moves WebPad++ toward a safer deployment model:

1. Try local files in `libs/` or `libs/vendor/` first.
2. If a local file is missing or fails to load, fall back to the existing free CDN URL.
3. Keep very large optional assets, especially OCR language data, explicit instead of silently bundling them.

This keeps normal online use working while giving release builds a clear path to offline support.

## What changed

### Lazy-loaded tool libraries

The dependency manager now supports `localUrls`, `localStyles`, `urls`, and `styles`.

Example:

```js
window.defineDependency('qrcodejs', {
  label: 'QR Code 產生器',
  localUrls: ['libs/vendor/qrcode.min.js'],
  urls: [
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
  ],
  check: () => typeof window.QRCode === 'function'
});
```

The app tries `libs/vendor/qrcode.min.js` first. If that file is not present, the browser falls back to CDN.

### Startup editor libraries

Several scripts that were previously CDN-only now use local-first script tags:

- extra CodeMirror modes: PHP, SQL, Rust, Go
- SQL hint, search, jump-to-line
- JSHint, CSSLint, HTMLHint
- JSZip
- i18next HTTP backend
- Turndown

Direct external startup scripts are intentionally limited to:

- Google Analytics, if kept enabled
- Tailwind CDN, because this project currently uses Tailwind's browser JIT runtime

This means a default online build is **not** the same as an offline or fully isolated build. See `PRIVACY_AND_LIMITATIONS.md` for the privacy boundary and `RELEASE_CHECKLIST.md` for offline release requirements.

## Vendor assets

The list of local vendor files is stored in:

```txt
scripts/vendor-dependencies.json
```

Download the free vendor assets:

```bash
npm run vendor:fetch
```

Audit local-first configuration:

```bash
npm run vendor:audit
```

For an offline/release build, require all local vendor files:

```bash
npm run vendor:audit:strict
```

## OCR language data

Tesseract.js itself is now local-first. The OCR language data is different: Chinese `tessdata_best` files can be large, so this project does **not** silently bundle them.

Default OCR language paths still use the free Project Naptha tessdata CDN:

- `https://tessdata.projectnaptha.com/4.0.0`
- `https://tessdata.projectnaptha.com/4.0.0_best`
- `https://tessdata.projectnaptha.com/4.0.0_fast`

For a fully offline OCR build, download the needed `.traineddata.gz` files and override the paths before OCR starts:

```html
<script>
window.WEBCODING_TESSDATA_PATHS = {
  standard: 'libs/tessdata/standard',
  best: 'libs/tessdata/best',
  fast: 'libs/tessdata/fast'
};
</script>
```

Only do this after the corresponding local language files exist; otherwise OCR will fail while loading language data.

## Rule for new dependencies

When adding a new dependency:

1. Add a local path in `libs/vendor/` or the appropriate `libs/` subfolder.
2. Add the CDN fallback URL.
3. Add the dependency to `scripts/vendor-dependencies.json`.
4. Add a `check` function to verify the global object really exists.
5. Run `npm test` and `npm run vendor:audit`.
