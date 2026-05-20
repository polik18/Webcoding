# Centralized UI Events

Step 2 removes app-level inline handlers from `index.html` and moves click/change/drop handling into `js/core/events.js`.

## Why

Inline handlers such as `onclick="generateQrCode()"` make the HTML tightly coupled to JavaScript implementation details. They are hard to search safely, hard to test, and easy to break when a function is renamed or load order changes.

The new pattern keeps HTML declarative and routes events through one small dispatcher.

## Patterns

### Call a function

```html
<button data-action="call" data-call="generateQrCode">產生 QR Code</button>
```

### Call a function with arguments

```html
<button data-action="call" data-call="switchQrTab" data-args='["scan"]'>掃描</button>
```

### Pass the original event

```html
<button data-action="call" data-call="toggleSaveMenu" data-pass-event="true">更多</button>
```

### Run a sequence

```html
<button data-action="sequence" data-sequence='["closeQrModal","openOcrModal"]'>開啟 OCR</button>
```

### Set a field value

```html
<button data-action="set-value" data-target="#save-dialog-ext" data-value="html">.html</button>
```

### Change events

```html
<select data-change-call="changeLanguage"></select>
<input type="file" data-change-call="handleOcrFileUpload" data-pass-event="true">
```

### Drop zone

```html
<div data-drop-zone="ocr"></div>
```

`events.js` owns the `dragover`, `dragleave`, and `drop` listeners for this zone.

## Migration rule

New UI elements should not add `onclick`, `onchange`, `ondrop`, or similar app-level inline handlers. Add a `data-*` binding and route it through `events.js` instead.

Resource fallback handlers in the document head, such as CDN `onerror`, remain for now and should be handled separately in a later dependency cleanup step.
