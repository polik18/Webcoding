# Testing / Smoke Test Guide

Step 4 adds no-dependency smoke tests so the project can catch high-risk regressions before manual browser testing.

## Run all smoke tests

```bash
node tests/smoke/run-smoke-tests.js
```

or, if you use npm:

```bash
npm test
```

## Run only JavaScript syntax checks

```bash
node scripts/check-js-syntax.js
```

or:

```bash
npm run test:syntax
```

## What the smoke tests check

The smoke test suite currently verifies:

1. Every file under `js/` has valid JavaScript syntax.
2. `index.html` does not reintroduce functional inline handlers such as `onclick`, `onchange`, `ondragover`, `ondragleave`, or `ondrop`.
3. HTML event calls use namespaced paths such as `tools.qr.generate`, not bare legacy globals such as `generateQrCode`.
4. `js/core/app.js` creates `WebcodingApp` and keeps legacy compatibility aliases working.
5. `js/core/loader.js` registers the expected optional dependency names, including QR, OCR, PDF, DOCX, XLSX, formatting, compare, and spreadsheet PDF export dependencies.
6. `js/core/events.js` can resolve and call namespaced handlers through the centralized event manager.
7. Step 5 local-first dependency configuration exists for the managed QR, OCR, PDF, DOCX, XLSX, formatting, compare, and export libraries.
8. Direct external startup scripts are limited to the explicit exceptions: Google Analytics and Tailwind browser runtime.
9. Public-facing documentation does not reintroduce overbroad privacy/offline claims that imply no third-party requests in every deployment.

## Documentation claim audit

```bash
npm run docs:audit
```

This checks the public README and Traditional Chinese README for risky overclaims about privacy, offline behavior, and latency. It does not replace manual review, but it prevents the most problematic phrases from coming back.

## Local-first dependency audits

```bash
npm run vendor:audit
```

This checks the local-first configuration and reports which local vendor files are still missing. It does not fail when files are missing, because CDN fallback remains valid for online development.

For an offline/release build, require every local vendor file:

```bash
npm run vendor:audit:strict
```

To download the free local vendor assets in an environment with internet access:

```bash
npm run vendor:fetch
```

## Important limitation

These are smoke tests, not full end-to-end browser tests. They intentionally avoid extra packages and paid services. They do not test real camera permission, real file picker behavior, real OCR accuracy, or CDN network availability.

For each release, run these smoke tests first, then manually verify:

- QR generation
- QR image decoding
- OCR upload recognition
- OCR camera capture
- PDF / DOCX / XLSX file opening
- Save / export behavior

## Maintainer test routine

Use this routine for most pull requests or handoffs:

```bash
npm test
npm run test:syntax
npm run docs:audit
npm run vendor:audit
```

Use this routine when release scripts, vendor assets, or analytics/offline behavior changes:

```bash
npm run build:offline
npm run offline:audit
npm run build:offline:analytics
npm run offline:audit:analytics
```

If vendor files and OCR language data have been downloaded for a strict release package, run the strict variants too:

```bash
npm run vendor:audit:strict
npm run offline:audit:strict
npm run offline:audit:analytics:strict
```

## Where to document new tests

- Add high-risk static or simulated-browser checks to `tests/smoke/run-smoke-tests.js`.
- Add syntax-only checks to `scripts/check-js-syntax.js` only if they are language parsing checks.
- Add release/network checks to `scripts/audit-offline-release.js`.
- Add documentation wording checks to `scripts/audit-doc-claims.js`.
- Update `docs/MAINTAINERS_GUIDE.md` if the required maintainer workflow changes.
