# WebPad++ 系統技術文件

**版本：** 2.1  
**日期：** 2026-05-12  
**專案路徑：** `WebPad_Project/`

---

## 1. 專案概覽

WebPad++ 是一款純瀏覽器端的 IDE，無需後端伺服器。所有檔案、分頁狀態與設定皆儲存於瀏覽器的 IndexedDB（透過 localForage）。支援 30 種語言介面，可編輯 HTML、CSS、JavaScript、Python、SQL、Markdown 等程式碼，以及 PDF、DOCX、ODT、Excel、CSV 等辦公室文件格式。

### 核心設計原則

- **零後端**：完全於瀏覽器執行，無需 Node.js、PHP 等伺服器環境。
- **持久化**：以 IndexedDB 作為主要儲存引擎，5 秒自動儲存一次。
- **模組化**：程式碼分為四個 JS 模組（`i18n.js`、`filesystem.js`、`editor.js`、`doceditor.js`）。
- **多語言優先**：所有 UI 字串皆透過 i18next 動態載入，支援 RTL（阿拉伯文、希伯來文）。

---

## 2. 目錄結構

```
WebPad_Project/
├── index.html              # 主應用程式 HTML 骨架
├── favicon.ico             # 網站圖示
├── css/
│   └── style.css           # 自訂樣式（含試算表/PDF CSS）
├── js/
│   ├── i18n.js             # 國際化模組
│   ├── filesystem.js       # 虛擬檔案系統 + 側欄
│   ├── editor.js           # 編輯器核心邏輯 + Tab 管理
│   └── doceditor.js        # 文件格式處理（PDF/DOCX/ODT/Excel/CSV）
├── locales/                # 30 種語言翻譯 JSON（各含 content.default 歡迎頁）
│   ├── en.json, zh-TW.json, zh-CN.json, ja.json, ko.json ...
└── SYSTEM_DOC.md           # 本系統文件
```

---

## 3. 外部依賴函式庫

| 函式庫 | 版本 | 用途 |
|--------|------|------|
| TailwindCSS | CDN | UI 排版框架（dark mode 支援） |
| Font Awesome | 6.4.0 | 圖示 |
| CodeMirror | 5.65.13 | 程式碼編輯器核心 |
| JSHint | 2.13.6 | JavaScript 語法檢查 |
| CSSLint | 1.0.5 | CSS 語法檢查 |
| HTMLHint | 0.9.13 | HTML 語法檢查 |
| js-beautify | 1.14.9 | 程式碼格式化 |
| localForage | 1.10.0 | IndexedDB 封裝 |
| JSZip | 3.10.1 | 專案匯出 ZIP + DOCX 建構 |
| diff-match-patch | 20121119 | 檔案差異比對 |
| i18next | 23.10.1 | 國際化框架 |
| i18next-http-backend | 2.5.0 | 動態載入語言包 |
| **SheetJS (xlsx)** | **0.18.5** | **Excel / CSV 讀寫** |
| **mammoth.js** | **1.6.0** | **DOCX → HTML 轉換** |
| **PDF.js** | **3.11.174** | **PDF 渲染** |
| Pyodide | 0.23.4 | 瀏覽器端 Python 執行（懶載入） |

> 所有依賴皆透過 CDN 載入，需要網際網路連線。

---

## 4. 模組詳細說明

### 4.1 `js/i18n.js` — 國際化模組

**職責：** 初始化 i18next、偵測使用者語言、動態更新 UI 文字。

| 函式 | 說明 |
|------|------|
| `changeLanguage(lang)` | 切換語言，儲存至 `localStorage`，觸發 `onLanguageChanged` |
| `updateLanguageUI()` | 掃描 `[data-i18n]` / `[data-i18n-title]` 元素並更新；RTL 語言自動設 `dir="rtl"` |
| `window.t(key, opts)` | 全域翻譯函式，帶 fallback 機制 |

語言包格式 `locales/*.json` 五大 key：`nav`、`panel`、`visual`、`messages`、`content`。

---

### 4.2 `js/filesystem.js` — 虛擬檔案系統

IndexedDB key：`webpad_fs_v1`

| 方法 | 說明 |
|------|------|
| `_createNodeSilent(type, parentId, name)` | 靜默建立節點（不顯示 toast），供 tabManager 內部呼叫 |
| `createNode(type, parentId, name)` | 建立節點，重複名稱時顯示錯誤 toast |
| `createNodePrompt(type)` | 顯示 UI 對話框後建立 |
| `renameSelectedNode()` | 重命名並同步已開啟的分頁 |
| `deleteSelectedNode()` | 遞迴刪除節點及子代，關閉對應分頁 |
| `openFileInTab(nodeId)` | 在 tabManager 開啟或切換至該檔案分頁 |
| `exportZip()` | JSZip 打包整個虛擬 FS |
| `renderTree()` | 重繪 `#file-tree` DOM |

**雙向同步機制（v2.1 新增）：**
- tabManager 建立新分頁時，自動呼叫 `fileSystem._createNodeSilent()` 建立對應節點。
- filesystem 節點點擊時，呼叫 `openFileInTab()` 開啟或切換分頁。

---

### 4.3 `js/editor.js` — 編輯器核心

#### TabManager 資料模型

```javascript
{
  id: 'tab_<timestamp>_<counter>',
  fsId: '<filesystem_node_id>' | null,
  name: 'index.html',
  isDefault: false,
  content: '...',
  eol: '\n' | '\r\n',
  encoding: 'utf-8' | 'windows-1252' | 'shift-jis' | 'big5',
  mode: 'code' | 'split' | 'visual' | 'spreadsheet' | 'pdf',
  isUnsaved: false,
  docType: 'csv' | 'xlsx' | 'docx' | 'odt' | 'pdf' | undefined
}
```

#### 檢視模式管理（v2.1 修正）

新增 `_hideAllPanels()` 統一隱藏所有容器面板，並在切換模式時清除殘留的 inline `width`、`flexGrow`、`flexShrink` 樣式，解決分屏縮放後切換 Visual 模式版面破損問題。

| 函式 | 說明 |
|------|------|
| `_hideAllPanels()` | 隱藏 editor-container / visual-container / merge-container / spreadsheet-container |
| `switchToCode()` | 清除所有 inline 尺寸樣式，顯示 CodeMirror |
| `switchToVisual()` | 清除所有 inline 尺寸樣式，顯示 WYSIWYG iframe |
| `switchToSplit()` | 重置為 50/50，顯示兩個面板 |
| `switchToSpreadsheet()` | 顯示 #spreadsheet-container |

#### 檔案路由 `loadFileContent(file)`

依副檔名路由至不同處理器：

| 副檔名 | 處理器 | 說明 |
|--------|--------|------|
| `.pdf` | `window.loadPdf()` | PDF.js 渲染 |
| `.docx` | `window.loadDocx()` | mammoth.js 轉 HTML |
| `.odt` | `window.loadOdt()` | JSZip 解析 content.xml |
| `.csv` | `window.loadCsv()` | SheetJS 解析為 2D 陣列 |
| `.xlsx` `.xls` | `window.loadSpreadsheet()` | SheetJS 解析為 2D 陣列 |
| 其他 | TextDecoder | 純文字/程式碼 |

文件類型上限：50 MB；程式碼檔案上限：2 MB。

---

### 4.4 `js/doceditor.js` — 文件格式處理器（v2.1 新增）

#### 試算表模組（CSV / XLSX）

| 函式 | 說明 |
|------|------|
| `loadSpreadsheet(buffer, filename)` | SheetJS 讀取 ArrayBuffer → 2D 陣列 → 渲染表格 |
| `loadCsv(text, filename)` | SheetJS 讀取 CSV 字串 → 2D 陣列 → 渲染表格 |
| `renderSpreadsheet()` | 建立可編輯 HTML table，支援 Tab/Enter 鍵盤導航 |
| `ssAddRow()` / `ssDeleteRow()` | 新增/刪除最後一列 |
| `ssAddCol()` / `ssDeleteCol()` | 新增/刪除最後一欄 |
| `ssExport('csv'|'xlsx')` | SheetJS 匯出下載 |

#### 文件模組（DOCX / ODT）

| 函式 | 說明 |
|------|------|
| `loadDocx(buffer, filename)` | mammoth.js 轉 HTML → 寫入 editor → `switchToVisual()` |
| `loadOdt(buffer, filename)` | JSZip 解壓 content.xml → 去除 XML 標籤 → `switchToVisual()` |
| `exportDocx()` | 讀取 visual iframe DOM → `_buildMinimalDocx()` → 下載 |
| `_buildMinimalDocx(htmlBody)` | JSZip 建構最小化 OOXML DOCX（含 Content_Types + document.xml） |

#### PDF 模組

| 函式 | 說明 |
|------|------|
| `loadPdf(buffer, filename)` | PDF.js 逐頁渲染至 canvas，顯示於 `#pdf-container` |
| `pdfExportText()` | 提取所有頁面文字 → 轉 HTML → `switchToVisual()`，可繼續編輯並匯出 DOCX |

---

## 5. UI 架構

### HTML 骨架層次

```
<body>
├── <nav>                       頂部工具列
│   ├── Logo + Open/Save/Format/Run/Export DOCX 按鈕
│   ├── 模式切換（Code/Split Preview/Visual）
│   └── 檔名 + 語言選單 + 主題 + Reset
├── #tab-bar                    分頁列（含 Compare 按鈕）
├── <main>                      主內容區（flex-row）
│   ├── #sidebar-overlay        行動裝置遮罩
│   ├── #sidebar                側欄（檔案總管）
│   ├── #sidebar-resizer        側欄拖曳調整
│   ├── #editor-container       CodeMirror + 面板 + 狀態列
│   ├── #split-resizer          Split 模式分隔拖曳
│   ├── #visual-container       WYSIWYG 工具列 + iframe
│   ├── #merge-container        比較模式（MergeView）
│   ├── #spreadsheet-container  試算表編輯器（v2.1 新增）
│   └── #pdf-container          PDF 檢視器（v2.1 新增）
├── #drop-overlay               拖放提示全屏遮罩
├── #custom-modal               通用 Prompt/Confirm 對話框
├── #compare-modal              選擇比較分頁對話框
└── #toast-container            Toast 通知（最多 3 則）
```

---

## 6. 支援的程式語言與副檔名

| 副檔名 | CodeMirror Mode | Lint |
|--------|----------------|------|
| `.html` | `htmlmixed` | HTMLHint |
| `.js` | `javascript` | JSHint |
| `.json` | `application/json` | JSHint |
| `.css` | `css` | CSSLint |
| `.py` | `python` | Pyodide ast |
| `.ts` | `application/typescript` | 無 |
| `.c` `.cpp` `.h` | `text/x-c++src` | 無 |
| `.java` | `text/x-java` | 無 |
| `.cs` | `text/x-csharp` | 無 |
| `.php` | `application/x-httpd-php` | 無 |
| `.sql` | `text/x-sql` | 無 |
| `.rs` | `rust` | 無 |
| `.go` | `go` | 無 |
| `.md` | `markdown` | 無 |
| `.txt` `.srt` | `null`（純文字） | 無 |

---

## 7. 鍵盤快速鍵

| 快速鍵 | 功能 |
|--------|------|
| `Ctrl+S` | 儲存目前分頁 |
| `Ctrl+O` | 開啟本地檔案 |
| `Ctrl+Enter` | 執行程式碼 |
| `Ctrl+Space` | 觸發自動完成 |
| Sublime keymap | `Ctrl+D`（多游標）、`Ctrl+G`（跳至行）等 |
| Tab/Enter（分頁標題）| 完成行內重命名 |
| Esc（分頁標題）| 取消重命名 |
| 中鍵點擊（分頁）| 關閉分頁 |
| Tab/Enter（試算表）| 移動至下一格 |

---

## 8. 資料持久化架構

```
瀏覽器 IndexedDB
├── localforage
│   ├── webpad_tabs_v2   → TabManager（含 mode / docType）
│   └── webpad_fs_v1     → FileSystem 節點樹
└── localStorage
    └── webpad_lang      → 使用者語言偏好
```

自動儲存：每 5 秒 + 頁面關閉前 + 每次切換分頁。

---

## 9. 啟動順序

```
1. i18n.js → 偵測語言 → i18next.init() → updateLanguageUI()
2. filesystem.js → DOMContentLoaded → fileSystem.init() → renderTree()
3. editor.js → DOMContentLoaded → CodeMirror 初始化 → tabManager.init()
4. doceditor.js → 載入完成，全域函式掛載至 window
5. onI18nReady() → 更新預設分頁歡迎 Markdown → renderTabs()
```

---

## 10. 已知限制

| 限制 | 說明 |
|------|------|
| `file://` 協定 | CORS 限制無法載入語言包，需使用 HTTP 伺服器 |
| 程式碼檔案上限 | 2 MB |
| 文件格式上限 | 50 MB |
| Python 執行 | Pyodide 首次載入約需 5–10 秒 |
| Visual Mode Run | 不支援，需切換回 Code Mode |
| DOCX 匯出 | 目前為純文字段落結構（圖片/表格樣式可能簡化） |
| PDF 編輯 | 僅文字提取；無法保留複雜版面格式 |
| 比較模式 | 需至少兩個分頁才能使用 |

---

## 11. 本地開發啟動指令

```bash
# Python（推薦）
cd WebPad_Project && python3 -m http.server 8000

# Node.js
npx serve WebPad_Project

# VS Code Live Server
# 在 index.html 右鍵 → Open with Live Server
```

---

## 12. 翻譯擴充指南

1. 複製 `locales/en.json` 為 `locales/{lang}.json`。
2. 翻譯所有字串值（保留 JSON key 不變）。
3. 在 `index.html` `<select id="lang-select">` 加入 `<option value="{lang}">顯示名稱</option>`。
4. 若為 RTL 語言，在 `i18n.js` 的 `rtlLangs` 陣列中加入語言代碼。

---

*文件由 Antigravity AI 自動生成 — 2026-05-12 | WebPad++ v2.1*
