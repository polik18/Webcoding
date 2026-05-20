# Release Checklist


## 0. Maintainer references

Before releasing, make sure the relevant maintenance docs are still accurate:

- `SYSTEM_DOC.md`
- `docs/MAINTAINERS_GUIDE.md`
- `docs/ARCHITECTURE_MAP.md`
- `docs/TROUBLESHOOTING.md`
- `docs/PRIVACY_AND_LIMITATIONS.md`
- `docs/OFFLINE_RELEASE.md`

Use this checklist before publishing a new WebPad++ build.

## 1. Automated checks

```bash
npm test
npm run test:syntax
npm run vendor:audit
npm run docs:audit
```

For an offline or privacy-sensitive release:

```bash
npm run vendor:audit:strict
```

## 2. Manual browser smoke test

Open `index.html` or the local server build and verify:

- File explorer opens and can create a file.
- HTML / CSS / JS preview still works.
- Markdown visual editing still opens.
- QR generation works.
- QR image decoding works with a known QR image.
- OCR upload works with a clear Traditional Chinese test image.
- PDF opens and extracts text.
- DOCX opens.
- XLSX or CSV opens and exports.
- Reset All clears local workspace data.

## 3. Network and privacy review

For a normal web release:

- Confirm the README mentions third-party requests and CDN fallback honestly.
- Confirm Google Analytics is intentional.
- Confirm CDN fallback is acceptable for the target audience.

For an offline release:

- Remove or disable Google Analytics.
- Replace Tailwind CDN runtime with built local CSS.
- Bundle all vendor files listed in `scripts/vendor-dependencies.json`.
- Bundle required OCR language data under `libs/tessdata/`.
- Configure `window.WEBCODING_TESSDATA_PATHS` before OCR starts.
- Use the browser Network panel to confirm no unexpected external requests.

For an analytics-enabled local-first release:

- Confirm Google Analytics is intentional and disclosed.
- Run `npm run build:offline:analytics`.
- Run `npm run offline:audit:analytics`.
- Confirm the Network panel shows Google Analytics as the intentional external request, not accidental CDN fallback.

## 4. Documentation review

Run:

```bash
npm run docs:audit
```

Then manually check:

- README deployment modes are accurate.
- Privacy wording does not overpromise.
- OCR limitations are visible.
- Offline requirements are clear.
- New dependencies are listed in `scripts/vendor-dependencies.json`.

## Offline release checks

- Run `npm run vendor:fetch` in a network-enabled environment.
- Add required OCR language data under `libs/tessdata/`.
- Run `npm run build:offline`.
- Run `npm run offline:audit:strict` for sensitive/offline distribution.
- Open `dist/offline/index.html` and inspect the browser Network panel during supported workflows.
- Confirm QR, OCR, PDF, DOCX, XLSX, formatting, compare, and export flows work with representative files.
