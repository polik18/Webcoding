# Architecture Map / 架構地圖

這份文件用圖解方式說明 WebPad++ 的主要 runtime 流程。維護時若不知道某個事件、依賴或資料從哪裡來，先看這份。

---

## 1. Runtime 分層

```text
Browser
  ↓
index.html
  ↓ classic script order
js/core/app.js
  ├── WebcodingApp namespace
  └── legacy window.* compatibility
  ↓
js/core/loader.js
  └── dependencyManager / ensureDependency()
  ↓
js/core/events.js
  └── data-action / data-call dispatcher
  ↓
core state
  ├── TabManager
  ├── FileSystem
  ├── Save / UI helpers
  └── File I/O routing
  ↓
features + tools
  ├── format / compare / visual / sidebar
  ├── QR / OCR
  ├── PDF / DOCX / XLSX
  └── SEO / sitemap
```

---

## 2. UI 事件流

```text
使用者點按按鈕
  ↓
HTML element with data-action / data-call
  ↓
js/core/events.js
  ↓
WebcodingApp.namespace.resolveCallable(path)
  ↓
對應功能函式
  ↓
必要時 ensureDependency(name)
  ↓
執行功能 / 更新 UI / 顯示 toast
```

範例：

```html
<button data-action="call" data-call="tools.qr.generate">產生 QR</button>
```

```text
events.js → tools.qr.generate → ensureDependency('qrcodejs') → render QR
```

---

## 3. Namespace 與相容層

正式入口：

```text
WebcodingApp.core
WebcodingApp.features
WebcodingApp.tools
WebcodingApp.recent
WebcodingApp.state
```

相容層：

```text
window.generateQrCode → WebcodingApp.tools.qr.generate
window.startPerformingOcr → WebcodingApp.tools.ocr.startRecognition
window.fileSystem → WebcodingApp.core.fileSystem
window.tabManager → WebcodingApp.core.tabManager
```

維護規則：

- 新功能放在 `WebcodingApp`。
- 舊全域只為了不讓既有程式壞掉。
- 不要讓新 UI 呼叫裸露全域名稱。

---

## 4. 第三方套件載入流

```text
feature wants library
  ↓
ensureDependency(name)
  ↓
dependencyManager registry
  ↓
localUrls / localStyles first
  ↓ if missing or failed
remote urls / styles fallback, unless remote fallback disabled
  ↓
check() confirms global object exists
  ↓
feature continues
```

離線旗標會影響 fallback：

```js
window.WEBCODING_OFFLINE = true;
window.WEBCODING_DISABLE_REMOTE_FALLBACKS = true;
```

GA 版會刻意保留分析追蹤，但仍應避免其他非預期外部依賴。

---

## 5. 開檔與文件處理流

```text
openFile / drag-drop
  ↓
File object
  ↓
loadFileContent(file)
  ↓
extension router
  ├── pdf  → ensureDependency('pdfjs') → tools/pdf.js
  ├── docx → ensureDependency('mammoth') → tools/docx.js
  ├── odt  → ensureDependency('jszip') → tools/docx.js
  ├── xlsx/xls/csv → ensureDependency('xlsx') → tools/spreadsheet.js
  ├── image → tools/image-actions.js → OCR or QR
  └── text/code → TextDecoder → editor tab
```

---

## 6. OCR 子系統

```text
User image source
  ├── file upload
  ├── paste image
  └── camera snapshot
       ↓
tools/ocr.js
  ↓
tools/ocr-engine.js
  ↓
ensureDependency('tesseract')
  ↓
image preprocessing
  ├── scale / pad
  ├── contrast / threshold
  ├── sharpening
  └── Chinese-friendly variants
       ↓
Tesseract recognize
  ↓
result scoring
  ├── confidence
  ├── Chinese character ratio
  ├── noise penalty
  └── layout cleanup
       ↓
preview / copy / save
```

注意：OCR 準確度高度依賴圖片品質。維護時不要只看 confidence，中文辨識需要額外文字品質評分。

---

## 7. QR 子系統

```text
QR generate
  ↓
tools.qr.generate
  ↓
ensureDependency('qrcodejs')
  ↓
render canvas/img
  ↓
download handles canvas or img
```

```text
QR decode / camera
  ↓
tools.qr.handleFileUpload or tools.qr.startCamera
  ↓
ensureDependency('jsqr')
  ↓
canvas imageData
  ↓
jsQR decode
  ↓
show result / open as tab / copy
```

---

## 8. Storage map

```text
IndexedDB via localForage
  ├── webpad_tabs_v2
  │   └── open tabs, active tab, editor contents
  └── webpad_fs_v1
      └── virtual file tree

localStorage
  └── webpad_lang
      └── selected language
```

清除資料入口通常由 `resetAll()` 處理。修改資料 key 前要評估舊使用者資料相容性。

---

## 9. Release pipeline

```text
source tree
  ↓
npm test
  ↓
optional: npm run vendor:fetch
  ↓
source build script
  ├── npm run build:offline
  │     └── dist/offline
  └── npm run build:offline:analytics
        └── dist/offline-with-analytics
  ↓
audit script
  ├── npm run offline:audit
  ├── npm run offline:audit:strict
  ├── npm run offline:audit:analytics
  └── npm run offline:audit:analytics:strict
```

`dist/` 是產物，不是主要修改來源。要改內容請改根目錄檔案與建置腳本。

---

## 10. 高風險耦合點

| 區域 | 風險 | 防護方式 |
|---|---|---|
| `index.html` script order | 順序錯會造成功能未定義 | `npm test` 檢查核心順序；手動 review 變更。 |
| `loader.js` registry | check 寫錯會誤判套件已載入 | 每個依賴都要有明確 `check()`。 |
| `events.js` data-call | 路徑錯會讓按鈕無反應 | 使用 namespaced path；跑 HTML event audit。 |
| `app.js` alias | legacy alias 映射錯會影響舊模組 | 新功能不要依賴舊全域；必要時加測試。 |
| OCR tessdata | 語言包缺失會導致辨識失敗 | 文件標明本地路徑；release 前手動測。 |
| Offline build | 誤以為缺檔也可用 | strict audit 與 Network 面板檢查。 |
| GA build | 使用者誤解隱私邊界 | README 與 Privacy 文件明確揭露。 |
