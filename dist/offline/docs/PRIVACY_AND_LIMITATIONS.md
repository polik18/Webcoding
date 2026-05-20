# Privacy and Limitations

This document defines what WebPad++ can honestly claim about local processing, privacy, offline use, OCR quality, and browser limitations.

## Plain-language summary

WebPad++ is local-first. User files are handled primarily in the browser, and the project does not provide a custom backend where documents are uploaded for processing.

That does **not** mean every build is fully offline or that the browser never contacts third parties. The default web build can still request third-party resources such as analytics, Tailwind runtime, CDN fallback libraries, and OCR language data.

Use an audited offline build for sensitive documents.

## Data handling boundary

| Area | Current behavior |
|---|---|
| User files | Processed mainly in the browser by JavaScript libraries. |
| Workspace persistence | Stored in browser IndexedDB/localForage and localStorage. |
| Project backend | No project-owned backend endpoint is used for document processing. |
| Analytics | Google Analytics is present in `index.html` unless removed. |
| Optional dependencies | Local-first when configured; CDN fallback may be used if local files are missing. |
| OCR language data | Uses public tessdata URLs unless `WEBCODING_TESSDATA_PATHS` is configured to local files. |
| Camera | Browser permission and device-controlled; no camera stream is intentionally uploaded by this project. |

## Network requests that may happen

A default build may request network resources from:

- `www.googletagmanager.com` for Google Analytics.
- `cdn.tailwindcss.com` for the Tailwind browser runtime.
- CDNJS, jsDelivr, unpkg, or similar CDN providers when local vendor files are missing.
- `tessdata.projectnaptha.com` for OCR language data.

For offline or sensitive deployments, remove analytics, replace Tailwind runtime with a built CSS file, download local vendor assets, download required Tesseract language data, and confirm with the browser Network panel. For public deployments that require traffic tracking, use the analytics-enabled local-first build and disclose that Google Analytics is intentionally active.

## OCR limitations

The OCR feature is free and browser-side, but it has practical limits:

- Traditional Chinese OCR needs high-quality images.
- Handwriting, receipts, glare, motion blur, tiny text, vertical text, and skewed photos can reduce accuracy.
- Tables and multi-column documents may lose layout.
- Tesseract confidence values are not always reliable for Chinese text.
- Paid cloud OCR services may perform better for difficult documents, but they have different privacy and cost tradeoffs.

## QR and camera limitations

QR generation is deterministic, but QR scanning depends on:

- Browser camera permission.
- HTTPS or localhost requirements in some browsers.
- Device camera resolution and focus.
- Lighting, reflection, and QR code size.

## Offline release requirements

A release can only be called offline-ready after all of these are true:

1. `npm run vendor:audit:strict` passes.
2. Required OCR `.traineddata.gz` files are present locally.
3. `window.WEBCODING_TESSDATA_PATHS` points to local tessdata folders.
4. Google Analytics is removed or disabled for strict offline builds, or intentionally enabled and disclosed for analytics builds.
5. Tailwind CDN runtime is replaced with a local built CSS file.
6. Browser Network panel shows no unexpected external requests during core workflows.

## Allowed wording for public copy

Good wording:

- “local-first browser tool”
- “no project-owned backend for document processing”
- “user files are primarily processed in the browser”
- “offline-ready when all vendor and OCR assets are bundled locally”

Avoid wording:

- “100% offline” unless a strict offline release has been verified.
- Overbroad privacy wording that implies no third-party requests unless analytics, CDN, OCR language data, and all third-party requests are removed and tested.
- Latency-free wording, because OCR, PDF, and large dependency loading can be slow.
- “professional OCR accuracy” because free browser OCR has known limits.
