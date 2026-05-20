# Vendor libraries

This directory is for free third-party browser libraries used by WebPad++.

The app loads core optional dependencies in this order:

1. local file under `libs/` or `libs/vendor/`
2. CDN fallback

Run this from the project root to populate the directory:

```bash
npm run vendor:fetch
```

For an offline release build, run:

```bash
npm run vendor:audit:strict
```

OCR language data is intentionally not bundled here because Chinese `tessdata_best`
can be large. See `docs/LOCAL_FIRST_DEPENDENCIES.md` before shipping an offline OCR build.
