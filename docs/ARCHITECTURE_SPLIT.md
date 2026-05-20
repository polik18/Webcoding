# 模組拆分紀錄

本次整理目標是把「已經太大、責任混雜、或已經不被載入的舊檔」拆分/移除，讓維護者可以更快找到功能位置，也讓瀏覽器不要解析不必要的自製程式碼。

## 已拆分的 runtime 模組

### File I/O

`js/core/fileio.js` 已拆成：

- `js/core/fileio/constants.js`：共用常數。
- `js/core/fileio/open.js`：開檔/開資料夾與副檔名路由。
- `js/core/fileio/templates.js`：新檔模板、OCR 捷徑、PDF 匯出捷徑。
- `js/core/fileio/dnd.js`：拖放匯入與資料夾遞迴。

### File system / sidebar

`js/filesystem.js` 已拆成：

- `js/core/filesystem.js`：FileSystem class、IndexedDB 儲存、檔案樹渲染。
- `js/features/sidebar.js`：側欄收合、overlay、拖曳調整寬度。

### SEO

`js/seo.js` 已拆成，並補強外部網站 Sitemap 產生流程：

- `js/tools/seo-core.js`：SEO modal、tab、分數/預覽 UI。
- `js/tools/sitemap-utils.js`：URL 正規化、XML escape、CORS fallback fetch、Sitemap XML 產出/下載。
- `js/tools/sitemap-crawler.js`：外部網站 URL 匯入、robots.txt / sitemap.xml 讀取、同網域爬取。
- `js/tools/sitemap.js`：Sitemap / robots.txt UI、工作區掃描、產出入口。
- `js/tools/seo-audit.js`：SEO 診斷與報告。

### OCR / QR

`js/tools/ocr-qr.js` 已拆成：

- `js/tools/image-actions.js`：圖片檔進入 OCR 或 QR 的選擇視窗。
- `js/tools/qr.js`：QR 產生、解碼、相機掃描。
- `js/tools/ocr-engine.js`：Tesseract.js 懶載入、圖片預處理、多模式辨識、最佳結果評分。
- `js/tools/ocr.js`：OCR UI、相機、上傳/貼上、結果預覽與儲存。

## 已移除的 dead weight

- `js/doceditor.js`：舊版大型重複檔，已不被 `index.html` 載入，功能已由 `js/tools/*` 接手。
- `libs/tailwind.min.css`：未被引用；目前使用 Tailwind CDN JIT script。
- `libs/font-awesome.min.css`：未被引用，且缺少本地 webfont 檔，保留 CDN 載入。

## 載入順序提醒

`index.html` 使用 classic script，順序不可任意改動：

1. `js/core/fileio/constants.js` 必須早於 `open.js` / `dnd.js`。
2. `js/core/filesystem.js` 必須早於 `js/features/sidebar.js`。
3. `js/tools/docutils.js` 必須早於 spreadsheet/docx/pdf。
4. `js/tools/seo-core.js` 必須早於 `sitemap-utils.js` / `sitemap-crawler.js` / `sitemap.js` / `seo-audit.js`。
5. `js/tools/qr.js` 必須早於 `ocr.js`。
6. `js/editor.js` 保持最後載入。
