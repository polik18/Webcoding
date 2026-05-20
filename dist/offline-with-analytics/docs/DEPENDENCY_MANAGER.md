# Dependency Manager

本專案的重型或選用型前端套件，統一由 `js/core/loader.js` 管理。

## 為什麼要集中管理

過去各模組各自呼叫 CDN，容易出現：

- 按鈕已出現，但套件尚未載入
- CDN 失敗後沒有備援
- script 載入成功，但全域物件沒有建立，功能仍然壞掉
- PDF / DOCX / XLSX / QR / OCR 的錯誤提示不一致

現在改成同一套入口：

```js
await window.ensureDependency('pdfjs', { message: '載入 PDF 讀取引擎中...' });
await window.ensureDependency('mammoth', { message: '載入 DOCX 讀取引擎中...' });
await window.ensureDependency('xlsx', { message: '載入試算表引擎中...' });
await window.ensureDependency('tesseract', { message: '載入 OCR 引擎中...' });
```

## 主要 API

### `window.ensureDependency(name, options)`

最常用。載入成功回傳 `true`，失敗會顯示 toast 並回傳 `false`。

```js
const ok = await window.ensureDependency('html2pdf', {
  message: '載入 PDF 匯出引擎中...',
  errorMessage: 'PDF 匯出引擎載入失敗'
});
if (!ok) return;
```

### `window.loadDependency(name, options)`

較底層。失敗時會 throw，適合需要自行處理錯誤的流程。

### `window.dependencyManager.status()`

除錯用，會列出每個依賴是否已載入、是否載入中。

## 已註冊依賴

- `qrcodejs`：QR Code 產生
- `jsqr`：QR Code 掃描
- `qr`：QR 產生 + 掃描
- `tesseract`：OCR 引擎
- `html2pdf`：HTML / 文件匯出 PDF
- `mammoth`：DOCX 讀取
- `pdfjs`：PDF 讀取
- `xlsx`：試算表讀寫
- `jszip`：ZIP / ODT / DOCX 壓縮解壓縮
- `jspdf`：PDF 建立
- `jspdf-autotable`：試算表匯出 PDF 表格
- `spreadsheet-pdf`：試算表 PDF 匯出組合依賴
- `beautify`：HTML / CSS / JS 格式化
- `compare`：文字比對與 CodeMirror Merge View
- `pyodide`：Python 執行環境

## 新增依賴範例

```js
window.defineDependency('example-lib', {
  label: '範例套件',
  urls: [
    'https://cdn-a.example.com/example.min.js',
    'https://cdn-b.example.com/example.min.js'
  ],
  check: () => !!window.ExampleLib
});
```

之後使用：

```js
const ok = await window.ensureDependency('example-lib', { message: '載入範例套件中...' });
if (!ok) return;
```

## Step 5: local-first sources

For deployable features, prefer this structure:

```js
window.defineDependency('example-lib', {
  label: 'Example Library',
  localUrls: ['libs/vendor/example-lib.min.js'],
  urls: ['https://cdn.example.com/example-lib.min.js'],
  check: () => !!window.ExampleLib
});
```

Use `localStyles` plus `styles` for CSS assets. The loader tries local paths first and then remote CDN fallbacks. The status rows returned by `dependencyManager.status()` now include a `sources` summary showing local/remote counts.
