<div align="center">
  <h1>WebPad++ 🚀</h1>
  <p><strong>Browser-based code, document, OCR, QR, and SEO toolbox</strong></p>
  <p>No app backend • Local-first processing • Optional CDN fallbacks</p>

[English](README.md) | [繁體中文](docs/locales/README-zh-TW.md) | [简体中文](docs/locales/README-zh-CN.md) | [日本語](docs/locales/README-ja.md) | [Español](docs/locales/README-es.md) | [Français](docs/locales/README-fr.md) | [Deutsch](docs/locales/README-de.md)

</div>

<hr/>

## Overview

WebPad++ is a browser-based toolbox for editing code, managing local documents, generating SEO files, creating or decoding QR codes, and extracting text with OCR.

The application has no custom backend server for user files. Most editing and processing runs in the browser and stores workspace data in browser storage. Some third-party scripts, styles, OCR language files, analytics, and CDN fallbacks may still be requested from external services depending on how the project is deployed and which features are used.

This project is best described as a **local-first browser tool**, not a guaranteed offline or fully isolated desktop application.

## Key Features

### Code editing and preview

- CodeMirror-based editor with syntax highlighting for common web and programming languages.
- HTML / CSS / JavaScript preview in the browser.
- Optional browser-side Python execution through Pyodide when the Pyodide dependency is available.
- Formatting, linting, and visual diff tools with local-first dependency loading.

### Document tools

- Markdown editing with visual preview/editing workflows.
- Spreadsheet opening and editing for XLSX / XLS / CSV through SheetJS.
- DOCX rendering through Mammoth.js and ODT parsing through JSZip.
- PDF viewing and text extraction through PDF.js.
- Export helpers for DOCX, XLSX, CSV, and PDF workflows.

### OCR and QR utilities

- Free browser-side OCR based on Tesseract.js.
- Traditional Chinese OCR improvements through higher-quality language data options and image preprocessing.
- QR generation through qrcodejs.
- QR image decoding and camera scanning through jsQR when browser permissions allow it.

### SEO tools

- Sitemap XML and robots.txt generators.
- Workspace scanning for local HTML files.
- Basic SEO audit helpers for HTML content.

## Supported Formats

| Format | Import & view | Edit | Export |
|---|---:|---:|---:|
| HTML / JS / CSS | Yes | Code & preview | File / ZIP workflows |
| Markdown | Yes | Code & visual editing | MD |
| XLSX / XLS / CSV | Yes | Grid, formulas, sorting | XLSX / CSV |
| PDF | Viewer / text extraction | Not a full PDF editor | PDF-related exports |
| DOCX | Render to rich HTML | WYSIWYG-style editing | DOCX / PDF workflows |
| Images | Preview / OCR / QR decode | Limited image actions | Text or decoded result |

## How to Use

1. Open `index.html` in a modern browser, or serve the folder with a simple local web server.
2. Use the file explorer to create files, open documents, or drag supported folders/files into the page.
3. Open code files and press the Run button or `Ctrl+Enter` for supported preview workflows.
4. Use the toolbar to open OCR, QR, formatting, compare, sitemap, and SEO tools.
5. Run smoke tests before releasing changes:

```bash
npm test
```

## Deployment Modes

| Mode | What works well | Important limits |
|---|---|---|
| Online development | Easiest setup; CDN fallbacks can load missing libraries | Third-party requests may happen |
| Local-first release | Vendor files are bundled locally first, CDN only as fallback | Must run vendor audit and include local assets |
| Offline release | Intended to work without network access | Requires all vendor files, OCR language data, and CSS/runtime assets to be local; Google Analytics should be disabled |
| Analytics-enabled local-first release | Public deployment with traffic tracking | Uses local assets first but intentionally keeps Google Analytics; not a strict offline/private build |

Helpful commands:

```bash
npm run vendor:fetch
npm run vendor:audit
npm run vendor:audit:strict
npm run build:offline
npm run build:offline:analytics
npm run offline:audit:analytics
npm run docs:audit
```

## Privacy and Network Boundary

WebPad++ does not upload user documents to a project-owned backend. Workspace data is primarily kept in browser storage such as IndexedDB/localForage and localStorage.

However, the default web build can still contact third-party services for several reasons:

- Google Analytics, if the tag in `index.html` is kept enabled.
- Tailwind browser runtime from CDN in the current build.
- CDN fallbacks for missing local vendor libraries.
- OCR language data from public tessdata URLs unless local tessdata paths are configured.
- Browser-level behavior such as fonts, extensions, caching, or developer tools outside this project’s control.

For sensitive files, use a reviewed offline build, remove analytics, bundle all dependencies locally, and verify network requests in the browser developer tools.

See: [`docs/PRIVACY_AND_LIMITATIONS.md`](docs/PRIVACY_AND_LIMITATIONS.md)

## Known Limitations

- Browser OCR is free and private-friendly, but it will not match paid cloud OCR for difficult Chinese documents, handwriting, skewed photos, low resolution, glare, or complex table layouts.
- The app is a document/toolbox environment, not a full professional IDE replacement.
- Camera QR/OCR features depend on browser permission, HTTPS or localhost rules, device camera quality, and lighting.
- PDF support focuses on viewing and text extraction; it is not a full PDF editor.
- Offline support requires a prepared release build. Opening the repository directly without vendor assets can still use network fallback URLs.

## Project Maintenance

Start here if you are maintaining or extending the project:

- [`SYSTEM_DOC.md`](SYSTEM_DOC.md) — system overview and module map.
- [`docs/MAINTAINERS_GUIDE.md`](docs/MAINTAINERS_GUIDE.md) — daily maintenance workflow and coding rules.
- [`docs/ARCHITECTURE_MAP.md`](docs/ARCHITECTURE_MAP.md) — runtime, event, dependency, storage, and release flow diagrams.
- [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) — QR, OCR, document, release, and analytics troubleshooting.
- [`docs/TESTING.md`](docs/TESTING.md) — smoke tests and manual browser checks.
- [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) — release checklist.

Key guardrails added during the stabilization plan:

- `js/core/loader.js` — local-first dependency manager.
- `js/core/events.js` — centralized event handling.
- `js/core/app.js` — `WebcodingApp` namespace and legacy compatibility layer.
- `tests/smoke/run-smoke-tests.js` — smoke tests for high-risk regressions.
- `scripts/audit-doc-claims.js` — documentation claim audit for privacy, offline, and latency wording.

Run this before release:

```bash
npm test
npm run vendor:audit
npm run docs:audit
```

For a strict no-analytics release, also prepare local vendor/OCR assets and run the matching offline audit. For the analytics-enabled release, use the `build:offline:analytics` and `offline:audit:analytics` commands documented in the maintainer guide.
