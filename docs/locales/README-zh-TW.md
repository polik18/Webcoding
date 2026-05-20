<div align="center">
  <h1>WebPad++ 🚀</h1>
  <p><strong>瀏覽器版程式碼、文件、OCR、QR 與 SEO 工具箱</strong></p>
  <p>無自建後端 • 本機優先處理 • 可設定 CDN 備援</p>

[English](../../README.md) | [繁體中文](README-zh-TW.md) | [简体中文](README-zh-CN.md) | [日本語](README-ja.md) | [Español](README-es.md) | [Français](README-fr.md) | [Deutsch](README-de.md)

</div>

<hr/>

## 專案概述

WebPad++ 是一個在瀏覽器中執行的工具箱，可用來編輯程式碼、管理本機文件、產生 SEO 檔案、建立或解讀 QR Code，也能透過 OCR 擷取圖片文字。

這個專案沒有為使用者檔案建立自家後端伺服器。大多數編輯與處理流程會在瀏覽器中完成，工作區資料主要存放在瀏覽器儲存空間。不過，依部署方式與使用功能不同，仍可能載入第三方腳本、樣式、OCR 語言資料、分析服務或 CDN 備援資源。

比較精準的定位是：**本機優先的瀏覽器工具箱**，不是保證無網路也能運作、也不是完全隔離的桌面軟體。

## 主要功能

### 程式碼編輯與預覽

- 使用 CodeMirror 編輯器，支援常見程式語言與網頁語法高亮。
- 可在瀏覽器中預覽 HTML / CSS / JavaScript。
- Pyodide 可用時，可在瀏覽器端執行 Python。
- 格式化、語法檢查與差異比對工具已改成本地優先載入。

### 文件工具

- Markdown 編輯與視覺化編輯流程。
- 透過 SheetJS 開啟與編輯 XLSX / XLS / CSV。
- 透過 Mammoth.js 顯示 DOCX，透過 JSZip 解析 ODT。
- 透過 PDF.js 檢視 PDF 與擷取文字。
- 支援 DOCX、XLSX、CSV、PDF 等匯出流程。

### OCR 與 QR 工具

- 使用免費的 Tesseract.js 做瀏覽器端 OCR。
- 針對繁體中文加入較高準確度語言資料選項與圖片前處理。
- 使用 qrcodejs 產生 QR Code。
- 使用 jsQR 解讀 QR 圖片或透過相機掃描，實際效果取決於瀏覽器權限與裝置品質。

### SEO 工具

- Sitemap XML 與 robots.txt 產生器。
- 可掃描工作區內的本機 HTML 檔案。
- 提供基本 HTML SEO 檢查與報告。

## 支援格式

| 格式 | 匯入與檢視 | 編輯 | 匯出 |
|---|---:|---:|---:|
| HTML / JS / CSS | 支援 | 程式碼與預覽 | 檔案 / ZIP 流程 |
| Markdown | 支援 | 程式碼與視覺化編輯 | MD |
| XLSX / XLS / CSV | 支援 | 表格、公式、排序 | XLSX / CSV |
| PDF | 檢視 / 文字擷取 | 非完整 PDF 編輯器 | PDF 相關匯出 |
| DOCX | 轉成富文字 HTML | 類 WYSIWYG 編輯 | DOCX / PDF 流程 |
| 圖片 | 預覽 / OCR / QR 解讀 | 有限圖片操作 | 文字或解讀結果 |

## 使用方式

1. 使用現代瀏覽器開啟 `index.html`，或用簡單的本機伺服器啟動專案資料夾。
2. 使用檔案總管建立檔案、開啟文件，或把支援的檔案 / 資料夾拖進頁面。
3. 開啟程式碼檔案後，可按執行按鈕或 `Ctrl+Enter` 使用支援的預覽流程。
4. 透過工具列開啟 OCR、QR、格式化、比對、Sitemap 與 SEO 工具。
5. 發佈前建議先跑測試：

```bash
npm test
```

## 部署模式

| 模式 | 適合情境 | 注意事項 |
|---|---|---|
| 線上開發 | 設定最簡單；缺少本地套件時可用 CDN 備援 | 可能會產生第三方網路請求 |
| 本地優先發佈 | 先載入本地 vendor 檔，失敗才使用 CDN | 需要執行 vendor audit 並補齊本地資源 |
| 離線發佈 | 目標是在無網路狀態下可用 | 需要把 vendor、OCR 語言資料、CSS/runtime 都準備在本地，並關閉 Google Analytics |

常用指令：

```bash
npm run vendor:fetch
npm run vendor:audit
npm run vendor:audit:strict
npm run docs:audit
```

## 隱私與網路邊界

WebPad++ 不會把使用者文件上傳到此專案自建的後端。工作區資料主要存放在 IndexedDB/localForage 與 localStorage。

但預設網頁版本仍可能因以下原因連線到第三方服務：

- `index.html` 中保留的 Google Analytics。
- 目前仍使用 Tailwind 的瀏覽器端 CDN runtime。
- 本地 vendor 檔不存在時使用 CDN 備援。
- OCR 語言資料未改成本地路徑時，會從公開 tessdata 路徑載入。
- 瀏覽器擴充功能、快取、字型或開發者工具等瀏覽器層行為。

若要處理敏感文件，請使用已檢查過的離線發佈版，移除分析碼，把所有依賴套件與 OCR 語言資料放在本地，並用瀏覽器開發者工具確認沒有非預期的網路請求。

詳見：[`docs/PRIVACY_AND_LIMITATIONS.md`](../PRIVACY_AND_LIMITATIONS.md)

## 已知限制

- 免費瀏覽器 OCR 對隱私友善，但遇到手寫中文、模糊照片、反光、歪斜、小字、表格或複雜版面時，通常無法達到付費雲端 OCR 的水準。
- 這是文件與工具箱環境，不是完整專業 IDE 的替代品。
- 相機 QR / OCR 會受瀏覽器權限、HTTPS 或 localhost 規則、鏡頭品質與光線影響。
- PDF 功能以檢視與文字擷取為主，不是完整 PDF 編輯器。
- 離線能力需要準備完整發佈版；若直接開啟未補齊 vendor 的專案，仍可能走 CDN 備援。

## 維護重點

目前專案已加入幾個穩定性防線：

- `js/core/loader.js`：本地優先的套件載入管理器。
- `js/core/events.js`：集中事件管理。
- `js/core/app.js`：`WebcodingApp` 命名空間與舊函式相容層。
- `tests/smoke/run-smoke-tests.js`：基礎 Smoke Test。
- `scripts/audit-doc-claims.js`：文件宣稱稽核，避免過度承諾隱私與離線能力。

發佈前建議執行：

```bash
npm test
npm run vendor:audit:strict
npm run docs:audit
```
