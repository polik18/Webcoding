# WebPad++ 系統技術文件

**版本：** 2.7 maintainability docs  
**日期：** 2026-05-20  
**專案路徑：** `Webcoding-main/`

---

## 0. 維護者先讀這裡

WebPad++ 是一個**本機優先的瀏覽器工具箱**，功能涵蓋程式碼編輯、文件處理、OCR、QR、SEO 與離線/分析版發佈流程。它沒有自建文件處理後端；多數文件處理在瀏覽器內完成，但依照發佈模式仍可能載入 Google Analytics、CDN 備援、OCR 語言資料或其他第三方資源。

新維護者請先照這個順序讀：

| 順序 | 文件 | 用途 |
|---:|---|---|
| 1 | `SYSTEM_DOC.md` | 專案總覽、模組地圖、載入順序與高風險區域。 |
| 2 | `docs/MAINTAINERS_GUIDE.md` | 日常修改流程、功能新增規則、提交前檢查。 |
| 3 | `docs/ARCHITECTURE_MAP.md` | Runtime 架構圖、事件流、資料流與發佈流。 |
| 4 | `docs/DEPENDENCY_MANAGER.md` | 第三方套件載入規則與本地優先設定。 |
| 5 | `docs/CENTRALIZED_EVENTS.md` | UI 事件綁定規則，避免回到 inline handler。 |
| 6 | `docs/NAMESPACE_REFACTOR.md` | `WebcodingApp` 命名空間與舊全域函式相容層。 |
| 7 | `docs/TESTING.md` | Smoke test、語法檢查、文件稽核與手動測試。 |
| 8 | `docs/TROUBLESHOOTING.md` | QR、OCR、PDF、離線版、GA、套件載入常見問題。 |
| 9 | `docs/RELEASE_CHECKLIST.md` | 發佈前檢查清單。 |
| 10 | `docs/PRIVACY_AND_LIMITATIONS.md` | 對外隱私與離線說法邊界。 |

> 維護原則：**不要為了快速修一個按鈕，把依賴載入、事件綁定、命名空間規則繞過去。** 這個專案之前的主要故障多半不是演算法本身，而是載入順序、CDN 缺檔、裸露全域函式與文件過度宣稱造成的。

---

## 1. 專案定位與邊界

### 1.1 產品定位

WebPad++ 是一個瀏覽器內的工具箱，主要使用情境：

- 程式碼與文字檔編輯。
- Markdown / HTML 預覽與視覺化編輯。
- PDF / DOCX / ODT / XLSX / CSV 等文件開啟、轉換與匯出輔助。
- 免費瀏覽器端 OCR，特別強化繁體中文圖片前處理。
- QR Code 產生、圖片解碼與相機掃描。
- Sitemap、robots.txt 與 HTML SEO 檢查。
- 本地優先與發佈版建置流程。

### 1.2 不要過度宣稱

對外描述請使用：

- 「本機優先」
- 「沒有自建後端處理使用者文件」
- 「可建立嚴格離線發佈版，但需補齊 vendor 與 OCR 語言資料」
- 「可建立保留 Google Analytics 的公開部署版」

避免寫成：

- 使用者資料不會接觸任何第三方。
- 任一版本都不需網路。
- OCR 準確度可等同付費雲端 OCR。
- 大型文件或 OCR 可保證即時完成。

這些說法會與目前架構不一致，也會被 `npm run docs:audit` 擋下部分高風險語句。

---

## 2. 目前目錄結構

```text
Webcoding-main/
├── index.html                         # 主要 UI 與 classic script 載入順序
├── css/
│   ├── style.css                      # 主要樣式
│   └── offline-fallback.css           # 離線/本地發佈版替代 Tailwind runtime 的基本樣式
├── js/
│   ├── core/
│   │   ├── app.js                     # WebcodingApp 命名空間與舊全域相容層
│   │   ├── loader.js                  # 本地優先 dependency manager
│   │   ├── events.js                  # data-* 集中事件處理
│   │   ├── tabs.js                    # 分頁狀態與 IndexedDB 儲存
│   │   ├── ui.js                      # 共用 UI、toast、reset 等
│   │   ├── save.js                    # 儲存/另存/下載流程
│   │   ├── filesystem.js              # 虛擬檔案系統
│   │   └── fileio/
│   │       ├── constants.js           # 檔案大小與二進位副檔名常數
│   │       ├── open.js                # 開檔、開資料夾、副檔名路由
│   │       ├── templates.js           # 新檔模板、Camera to Text、匯出捷徑
│   │       └── dnd.js                 # 拖放匯入
│   ├── features/
│   │   ├── visual.js                  # HTML 視覺化編輯模式
│   │   ├── panel.js                   # 底部/工具面板
│   │   ├── compare.js                 # 差異比對
│   │   ├── format.js                  # 格式化、重新命名、QR modal 入口
│   │   └── sidebar.js                 # 側欄互動
│   ├── tools/
│   │   ├── docutils.js                # 文件工具共用方法
│   │   ├── spreadsheet.js             # XLSX / XLS / CSV
│   │   ├── docx.js                    # DOCX / ODT
│   │   ├── pdf.js                     # PDF 讀取與匯出
│   │   ├── image-actions.js           # 圖片進入 OCR / QR 的分流 UI
│   │   ├── qr.js                      # QR 產生、解碼、相機掃描
│   │   ├── ocr-engine.js              # Tesseract、圖片前處理、辨識評分
│   │   ├── ocr.js                     # OCR UI 與相機/上傳/貼上流程
│   │   ├── seo-core.js                # SEO modal 與共用 UI
│   │   ├── sitemap-utils.js           # URL / XML / sitemap 共用工具
│   │   ├── sitemap-crawler.js         # 外部網站探索
│   │   ├── sitemap.js                 # Sitemap / robots.txt UI
│   │   └── seo-audit.js               # HTML SEO 診斷
│   ├── editor.js                      # CodeMirror 初始化與主入口
│   ├── i18n.js                        # i18next 初始化
│   └── recent.js                      # 最近開啟項目
├── libs/                              # 本地核心套件與 vendor 目錄
│   ├── vendor/                        # 由 vendor:fetch 補齊的第三方套件
│   └── tessdata/                      # OCR 語言資料本地路徑說明
├── scripts/                           # 測試、稽核、vendor、發佈腳本
├── tests/smoke/                       # 無外部套件 smoke test
├── docs/                              # 維護文件
├── dist/                              # build:offline 產出的發佈資料夾
├── README.md
├── package.json
└── SYSTEM_DOC.md
```

---

## 3. Runtime 載入順序

`index.html` 使用 classic script，不是 bundler；因此載入順序就是依賴圖的一部分。

```text
1. 基礎 CSS / 本地或外部啟動套件
2. js/core/app.js
3. js/core/loader.js
4. js/core/events.js
5. js/core/tabs.js, ui.js, save.js
6. js/core/fileio/constants.js → open.js → templates.js → dnd.js
7. js/features/visual.js → panel.js → compare.js → format.js
8. js/tools/seo-core.js → sitemap-utils.js → sitemap-crawler.js → sitemap.js → seo-audit.js
9. js/recent.js → js/i18n.js → js/core/filesystem.js → js/features/sidebar.js
10. js/tools/docutils.js → spreadsheet.js → docx.js → pdf.js → image-actions.js → qr.js → ocr-engine.js → ocr.js
11. js/editor.js
```

### 3.1 載入順序硬規則

- `app.js` 必須早於會 expose namespace 的任何模組。
- `loader.js` 必須早於需要 `ensureDependency()` 的工具模組。
- `events.js` 必須早於使用者互動，但不需要早於所有 handler 定義；它會在點擊時動態 resolve。
- `fileio/constants.js` 必須早於 `open.js` 與 `dnd.js`。
- `docutils.js` 必須早於 `spreadsheet.js`、`docx.js`、`pdf.js`。
- `seo-core.js` 必須早於 sitemap 與 audit 工具。
- `qr.js` 必須早於 `ocr.js`，因為圖片貼上/上傳會依 modal 狀態分流。
- `editor.js` 保持最後載入，避免初始化時工具或核心狀態尚未就緒。

---

## 4. 三個核心基礎設施

### 4.1 Dependency Manager：`js/core/loader.js`

用途：統一管理重型或選用套件，避免每個功能各自載 CDN。

基本用法：

```js
const ok = await window.ensureDependency('pdfjs', {
  message: '載入 PDF 讀取引擎中...',
  errorMessage: 'PDF 讀取引擎載入失敗'
});
if (!ok) return;
```

新增第三方套件時：

1. 在 `loader.js` 使用 `defineDependency()` 註冊。
2. 同時加到 `scripts/vendor-dependencies.json`。
3. 更新 `docs/DEPENDENCY_MANAGER.md` 與 `docs/LOCAL_FIRST_DEPENDENCIES.md`。
4. 執行 `npm run vendor:audit`。
5. 若要嚴格離線發佈，執行 `npm run vendor:audit:strict`。

### 4.2 Centralized Events：`js/core/events.js`

用途：所有主要 UI 操作改用 `data-*` 綁定，不回到 inline handler。

正確：

```html
<button data-action="call" data-call="tools.qr.generate">產生 QR</button>
```

避免：

```html
<button onclick="generateQrCode()">產生 QR</button>
```

新增 UI 按鈕時：

1. HTML 寫 `data-action="call"`。
2. `data-call` 使用命名空間路徑，例如 `tools.ocr.startRecognition`。
3. 如果需要參數，使用 `data-args='["value"]'`。
4. 如果需要事件物件，使用 `data-pass-event="true"`。
5. 執行 `npm test`，確認 HTML event audit 通過。

### 4.3 Namespace：`js/core/app.js`

用途：`WebcodingApp` 是正式命名空間；舊的 `window.xxx` 只作為相容層。

新增功能請使用：

```js
WebcodingApp.namespace.expose('tools.example.run', runExample, {
  legacyName: 'runExample' // 只有舊程式仍需要時才加
});
```

UI 呼叫：

```html
<button data-action="call" data-call="tools.example.run">Run</button>
```

避免新增：

```js
window.runExample = runExample;
```

---

## 5. 主要資料流

### 5.1 開啟檔案

```text
使用者選擇/拖放檔案
  ↓
core/fileio/open.js 或 dnd.js
  ↓
loadFileContent(file)
  ↓
依副檔名分流：
  .pdf  → tools/pdf.js + pdfjs
  .docx → tools/docx.js + mammoth
  .odt  → tools/docx.js + jszip
  .xlsx/.xls/.csv → tools/spreadsheet.js + xlsx
  image → tools/image-actions.js → OCR 或 QR
  other → TextDecoder → editor/tab
```

### 5.2 QR 流程

```text
UI data-call="tools.qr.generate" / upload / camera
  ↓
events.js resolve callable
  ↓
tools/qr.js
  ↓
ensureDependency('qr') 或 ensureDependency('jsqr')
  ↓
qrcodejs 產生 / jsQR 解碼
```

### 5.3 OCR 流程

```text
UI 上傳/拍照/貼上圖片
  ↓
tools/ocr.js
  ↓
tools/ocr-engine.js
  ↓
ensureDependency('tesseract')
  ↓
圖片前處理 → Tesseract 辨識 → 中文友善評分 → 結果清理
```

### 5.4 儲存資料

```text
TabManager
  └── IndexedDB/localForage: webpad_tabs_v2

FileSystem
  └── IndexedDB/localForage: webpad_fs_v1

Language preference
  └── localStorage: webpad_lang
```

---

## 6. 發佈模式

| 模式 | 指令 | 用途 | 注意事項 |
|---|---|---|---|
| 開發/一般網頁版 | 直接開 `index.html` 或本機 server | 最容易測試 | 可能使用 CDN 備援與 GA。 |
| 本地優先資產準備 | `npm run vendor:fetch` | 下載免費 vendor 檔 | 需有網路；完成後跑 `vendor:audit`。 |
| 無分析發佈版 | `npm run build:offline` | 敏感或需避免追蹤的發佈包 | 仍需補齊 vendor 與 OCR 語言資料後再做嚴格檢查。 |
| 保留 GA 發佈版 | `npm run build:offline:analytics` | 公開部署、需要流量追蹤 | 會連 Google Analytics；不應標示為無第三方請求。 |
| 嚴格檢查 | `npm run offline:audit:strict` | 確認無分析發佈版缺檔狀態 | 缺 vendor 或 tessdata 時會失敗。 |
| GA 版嚴格檢查 | `npm run offline:audit:analytics:strict` | 確認 GA 版只保留允許的外部請求 | Google Analytics 是刻意保留。 |

---

## 7. 修改功能時的固定流程

### 7.1 修改 QR / OCR / PDF / DOCX / XLSX

1. 先讀對應文件：`docs/TROUBLESHOOTING.md` 與 `docs/DEPENDENCY_MANAGER.md`。
2. 確認功能是否需要第三方套件。
3. 不要直接新增 `<script src="https://...">` 到功能模組。
4. 改用 `ensureDependency()`。
5. 如果牽涉 UI，改 `data-call` 與 namespace，不用 inline handler。
6. 跑：

```bash
npm test
npm run test:syntax
```

7. 用真實檔案手動測一次。

### 7.2 新增工具模組

1. 新檔放在 `js/tools/`，若是核心狀態才放 `js/core/`。
2. 使用 IIFE 包住，避免洩漏區域變數。
3. 對外入口用 `WebcodingApp.namespace.expose()`。
4. UI 綁定使用 `data-action` / `data-call`。
5. 第三方依賴加到 `loader.js` 與 `vendor-dependencies.json`。
6. 更新對應 docs。
7. 跑 smoke test。

### 7.3 修改文件或對外文案

1. 避免過度承諾隱私、離線與速度。
2. 跑：

```bash
npm run docs:audit
```

3. 若修改發佈模式，更新：
   - `README.md`
   - `SYSTEM_DOC.md`
   - `docs/PRIVACY_AND_LIMITATIONS.md`
   - `docs/OFFLINE_RELEASE.md`
   - `docs/RELEASE_CHECKLIST.md`

---

## 8. 測試與稽核

日常修改後至少跑：

```bash
npm test
npm run test:syntax
npm run docs:audit
```

新增或升級第三方套件後跑：

```bash
npm run vendor:audit
```

準備嚴格離線發佈前跑：

```bash
npm run vendor:fetch
npm run build:offline
npm run offline:audit:strict
```

準備保留 GA 的公開發佈版前跑：

```bash
npm run vendor:fetch
npm run build:offline:analytics
npm run offline:audit:analytics:strict
```

> Smoke test 不取代瀏覽器實測。相機、OCR 準確度、檔案選擇器、拖放、實際 CDN 或 GA 請求仍需手動驗證。

---

## 9. 高風險維護注意事項

- 不要重新宣告 `MAX_FILE_SIZE`；只在 `js/core/fileio/constants.js` 修改。
- 不要還原舊版大型檔並與拆分後模組同時載入。
- 不要在 `index.html` 新增功能型 `onclick`、`onchange`、`ondrop` 等 inline handler。
- 不要新增裸露全域函式；使用 `WebcodingApp.namespace.expose()`。
- 不要直接在工具模組硬塞 CDN script；使用 dependency manager。
- 不要把 GA 版說成沒有第三方請求；它就是會連 Google Analytics。
- 不要把免費瀏覽器 OCR 包裝成專業級文件辨識。
- 不要只改 `dist/` 內檔案；`dist/` 由 build 腳本產生，源頭應改根目錄與 `docs/`。
- 升級 vendor 後要同步更新 `scripts/vendor-dependencies.json` 與文件。
- 改動載入順序時，一定要跑 `npm test`，因為 classic script 順序會直接影響 runtime。

---

## 10. 常用指令速查

```bash
# 全部 smoke test
npm test

# JS 語法檢查
npm run test:syntax

# 文件宣稱稽核
npm run docs:audit

# 檢查本地優先 vendor 設定
npm run vendor:audit

# 下載免費 vendor 檔
npm run vendor:fetch

# 嚴格檢查 vendor 是否補齊
npm run vendor:audit:strict

# 建立無分析發佈版
npm run build:offline

# 建立保留 Google Analytics 的發佈版
npm run build:offline:analytics

# 檢查無分析發佈版
npm run offline:audit
npm run offline:audit:strict

# 檢查 GA 發佈版
npm run offline:audit:analytics
npm run offline:audit:analytics:strict
```

---

## 11. 文件維護規則

- `SYSTEM_DOC.md` 是總入口，保持精簡但要能帶路。
- 新功能應在 `docs/MAINTAINERS_GUIDE.md` 加入修改流程，或在對應專題文件補充。
- 發佈模式與隱私邊界改變時，必須同步更新 `README.md` 與 `docs/PRIVACY_AND_LIMITATIONS.md`。
- 測試指令改變時，必須同步更新 `docs/TESTING.md` 與 `docs/RELEASE_CHECKLIST.md`。
- 若文件內容會影響對外信任，請先跑 `npm run docs:audit`。
