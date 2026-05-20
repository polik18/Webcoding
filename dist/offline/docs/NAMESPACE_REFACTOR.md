# Step 3 — WebcodingApp Namespace Refactor

This refactor introduces `window.WebcodingApp` as the official application namespace.

## Why

The project previously exposed most functions directly on `window`, for example:

```js
window.generateQrCode()
window.startPerformingOcr()
window.fileSystem.deleteSelectedNode()
```

That made load order, naming collisions, and feature boundaries harder to control.

## New convention

New code should be placed under a namespace path:

```js
WebcodingApp.tools.qr.generate()
WebcodingApp.tools.ocr.startRecognition()
WebcodingApp.core.fileSystem.deleteSelectedNode()
WebcodingApp.features.visual.switchToCode()
```

UI bindings in `index.html` now use namespaced `data-call` values:

```html
<button data-action="call" data-call="tools.qr.generate">Generate</button>
```

The centralized event binder resolves calls through `WebcodingApp.namespace.resolveCallable()` first, then falls back to legacy globals if needed.

## Compatibility layer

Legacy names are still supported during migration:

```js
window.generateQrCode
window.startPerformingOcr
window.fileSystem
window.tabManager
```

For many old `window.* = ...` assignments, `app.js` installs non-enumerable accessors so assignments are redirected into the namespace. This keeps existing modules working while making the namespace the source of truth.

## Adding a new feature

1. Add the implementation in the correct module.
2. Expose it with:

```js
WebcodingApp.namespace.expose('tools.example.doThing', doThing, {
  legacyName: 'doThing' // optional, only if older code still needs it
});
```

3. Use the namespaced path in HTML:

```html
<button data-action="call" data-call="tools.example.doThing">Run</button>
```

## Migration rule

Do not add new direct globals such as:

```js
window.myNewFeature = function () {}
```

Use `WebcodingApp.namespace.expose()` instead.

Existing globals are kept only as a transition layer and can be removed module-by-module in later steps.
