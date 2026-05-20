# Maintainers Guide / 維護者指南

這份文件是給接手專案的人看的「日常操作手冊」。如果只讀一份維護文件，先讀這份。

---

## 1. 維護心法

WebPad++ 目前的重點不是再快速塞功能，而是讓既有功能穩定、可追蹤、可發佈。請優先遵守這四條規則：

1. **依賴統一走 dependency manager**：不要在功能檔自己新增遠端 script。
2. **UI 事件統一走 `data-*` + `events.js`**：不要新增 inline handler。
3. **公開入口統一走 `WebcodingApp` namespace**：不要新增裸露全域函式。
4. **文件說法要保守精準**：本機優先不等於任一部署都沒有第三方請求。

---

## 2. 開始修改前

### 2.1 先確認目前狀態

```bash
npm test
npm run test:syntax
npm run docs:audit
npm run vendor:audit
```

如果一開始就失敗，先修 baseline，不要在壞掉的狀態繼續加功能。

### 2.2 先找對模組

| 你要改的功能 | 優先看這些檔案 |
|---|---|
| QR Code | `js/tools/qr.js`, `docs/TROUBLESHOOTING.md`, `docs/DEPENDENCY_MANAGER.md` |
| OCR | `js/tools/ocr.js`, `js/tools/ocr-engine.js`, `docs/OCR_IMPROVEMENTS.md` |
| PDF | `js/tools/pdf.js`, `js/core/fileio/open.js` |
| DOCX / ODT | `js/tools/docx.js`, `js/tools/docutils.js` |
| XLSX / CSV | `js/tools/spreadsheet.js` |
| 開檔 / 拖放 | `js/core/fileio/open.js`, `js/core/fileio/dnd.js` |
| 儲存 / 下載 | `js/core/save.js`, `js/tools/docutils.js` |
| UI 按鈕失效 | `index.html`, `js/core/events.js`, `js/core/app.js` |
| 第三方套件載入 | `js/core/loader.js`, `scripts/vendor-dependencies.json` |
| 發佈版 | `scripts/build-offline-release.js`, `scripts/audit-offline-release.js` |
| 隱私/README | `README.md`, `docs/PRIVACY_AND_LIMITATIONS.md`, `docs/RELEASE_CHECKLIST.md` |

---

## 3. 新增一個 UI 按鈕

### 3.1 寫功能函式

```js
(function () {
  'use strict';

  function runExample() {
    // feature logic
  }

  WebcodingApp.namespace.expose('tools.example.run', runExample);
})();
```

### 3.2 在 HTML 綁定

```html
<button data-action="call" data-call="tools.example.run">執行</button>
```

### 3.3 需要參數時

```html
<button
  data-action="call"
  data-call="tools.example.open"
  data-args='["scan"]'>
  開啟掃描
</button>
```

### 3.4 需要事件物件時

```html
<button
  data-action="call"
  data-call="features.menu.toggle"
  data-pass-event="true">
  開啟選單
</button>
```

### 3.5 檢查

```bash
npm test
```

如果 HTML event audit 失敗，通常代表你用了裸露全域呼叫或 inline handler。

---

## 4. 新增一個第三方套件

### 4.1 在 `loader.js` 註冊

```js
window.defineDependency('example-lib', {
  label: 'Example Library',
  localUrls: ['libs/vendor/example-lib.min.js'],
  urls: [
    'https://cdn.example.com/example-lib.min.js'
  ],
  check: () => !!window.ExampleLib
});
```

### 4.2 在功能中載入

```js
const ok = await window.ensureDependency('example-lib', {
  message: '載入 Example Library 中...',
  errorMessage: 'Example Library 載入失敗'
});
if (!ok) return;
```

### 4.3 更新 vendor 清單

在 `scripts/vendor-dependencies.json` 加上本地檔路徑與下載來源。

### 4.4 更新文件

至少更新：

- `docs/DEPENDENCY_MANAGER.md`
- `docs/LOCAL_FIRST_DEPENDENCIES.md`
- 必要時更新 `docs/OFFLINE_RELEASE.md`

### 4.5 檢查

```bash
npm run vendor:audit
npm test
```

---

## 5. 新增一個工具模組

建議格式：

```js
// js/tools/example.js
(function () {
  'use strict';

  async function openModal() {
    // UI entry
  }

  async function run() {
    const ok = await window.ensureDependency('example-lib', {
      message: '載入工具中...'
    });
    if (!ok) return;

    // tool logic
  }

  const api = { openModal, run };

  WebcodingApp.namespace.expose('tools.example', api);
})();
```

然後在 `index.html` 的 script 順序中放在合理位置。若依賴 `docutils.js`，要放在 `docutils.js` 後面。

---

## 6. 修改 QR 功能的注意事項

QR 目前拆成：

- 產生：`qrcodejs`
- 圖片解碼/相機掃描：`jsQR`
- 入口：`tools.qr.*`

常見風險：

- 忘記 `ensureDependency('qr')` 或 `ensureDependency('jsqr')`。
- 下載 QR 時只處理 `canvas`，但 qrcodejs 有時輸出 `img`。
- 相機掃描在非 HTTPS / 非 localhost 環境失敗。
- 圖片解碼失敗其實是圖片太小、反光或解析度不足，不一定是程式錯。

修改後至少手動測：

1. 輸入文字產生 QR。
2. 下載 QR 圖。
3. 上傳剛下載的 QR 圖並解碼。
4. 在支援相機權限的瀏覽器測相機掃描。

---

## 7. 修改 OCR 功能的注意事項

OCR 目前拆成：

- `ocr.js`：UI、相機、上傳、貼上、結果操作。
- `ocr-engine.js`：Tesseract 載入、圖片前處理、辨識、結果評分。

常見風險：

- 繁中辨識需要正確語言包，例如 `chi_tra`。
- `tessdata_best` 準確度較好但載入較慢。
- 小字、模糊、斜拍、反光、表格與手寫中文會明顯降低準確度。
- 中文 OCR 的 confidence 不一定能單獨作為最佳結果依據。
- 相機流程需要權限與真機測試，Node smoke test 不會涵蓋。

修改後至少手動測：

1. 清楚繁中文字圖。
2. 中英數混合截圖。
3. 小字或低解析圖片。
4. 上傳、貼上、相機拍照三種入口。
5. `releaseOcrWorker()` 後再次辨識。

---

## 8. 修改離線/GA 發佈流程

目前有兩種主要發佈資料夾：

| 指令 | 產物 | 用途 |
|---|---|---|
| `npm run build:offline` | `dist/offline` | 無分析發佈版，適合敏感資料使用情境。 |
| `npm run build:offline:analytics` | `dist/offline-with-analytics` | 公開部署且保留 Google Analytics。 |

修改發佈腳本時要同步檢查：

```bash
npm run build:offline
npm run offline:audit
npm run build:offline:analytics
npm run offline:audit:analytics
```

若 vendor 與 OCR 語言資料已補齊，再跑 strict：

```bash
npm run offline:audit:strict
npm run offline:audit:analytics:strict
```

---

## 9. 發佈前固定檢查

### 9.1 一般公開版

```bash
npm test
npm run test:syntax
npm run docs:audit
npm run vendor:audit
npm run build:offline:analytics
npm run offline:audit:analytics
```

手動測：

- QR 產生與解碼。
- OCR 上傳繁中圖片。
- PDF / DOCX / XLSX / CSV 開啟。
- 匯出 PDF / DOCX / XLSX / CSV。
- Google Analytics 是否按預期存在。
- Network 面板是否只有預期中的外部請求。

### 9.2 敏感或無分析發佈版

```bash
npm run vendor:fetch
npm run vendor:audit:strict
npm run build:offline
npm run offline:audit:strict
```

手動測：

- Network 面板無非預期外部請求。
- OCR 語言資料走本地路徑。
- QR / OCR / PDF / DOCX / XLSX 在斷網情境仍可使用已補齊的功能。

---

## 10. Pull Request / 交接檢查清單

每次交接修改時，請在說明中附上：

- 改了哪些模組。
- 是否新增第三方依賴。
- 是否改到 `index.html` script 順序。
- 是否改到公開文案或隱私說法。
- 執行過哪些指令。
- 哪些功能已手動測，哪些因環境限制未測。
- 對使用者可見的行為改變。

建議格式：

```text
Change type: bugfix / feature / docs / release
Touched modules: js/tools/qr.js, js/core/loader.js
Dependencies: no new dependency
Commands run: npm test, npm run docs:audit
Manual tests: QR generate/upload decode passed; camera not tested
Known limits: camera requires HTTPS or localhost
```
