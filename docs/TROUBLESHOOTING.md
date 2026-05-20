# Troubleshooting / 維護排錯指南

這份文件列出 WebPad++ 常見故障、可能原因與排查順序。遇到問題先按順序查，不要一開始就大改架構。

---

## 1. 先跑基本檢查

```bash
npm test
npm run test:syntax
npm run docs:audit
npm run vendor:audit
```

若是發佈版問題：

```bash
npm run build:offline
npm run offline:audit
npm run build:offline:analytics
npm run offline:audit:analytics
```

---

## 2. 按鈕點了沒反應

### 可能原因

- HTML `data-call` 路徑打錯。
- 對應功能沒有 expose 到 `WebcodingApp`。
- script 載入順序錯誤。
- handler throw error，但 UI 只顯示簡短錯誤。

### 排查

1. 開 DevTools Console 看 `[events] Handler not found`。
2. 檢查 HTML：

```html
<button data-action="call" data-call="tools.qr.generate">
```

3. 在 Console 測：

```js
WebcodingApp.namespace.resolveCallable('tools.qr.generate')
```

4. 確認功能檔有：

```js
WebcodingApp.namespace.expose('tools.qr.generate', generateQrCode, {
  legacyName: 'generateQrCode'
});
```

5. 跑：

```bash
npm test
```

---

## 3. 第三方套件載入失敗

### 可能原因

- `libs/vendor/...` 檔案不存在。
- CDN 被擋、離線或 timeout。
- `check()` 條件寫錯。
- 離線旗標禁止遠端 fallback。

### 排查

1. Console 查看 `[Dependency]` 警告。
2. 檢查 dependency 狀態：

```js
dependencyManager.status()
```

3. 檢查 vendor：

```bash
npm run vendor:audit
```

4. 若要補齊本地 vendor：

```bash
npm run vendor:fetch
npm run vendor:audit:strict
```

5. 確認 `loader.js` 的 `check()` 真的對應該套件的全域物件。

---

## 4. QR Code 產生失敗

### 可能原因

- `qrcodejs` 沒載入。
- QR 容器不存在或 id 改掉。
- 輸入內容為空。
- qrcodejs 輸出格式與下載邏輯不一致。

### 排查

```js
await ensureDependency('qrcodejs')
typeof QRCode
WebcodingApp.namespace.resolveCallable('tools.qr.generate')
```

手動測：

1. 輸入 `https://example.com`。
2. 產生 QR。
3. 下載圖片。
4. 再上傳該圖片解碼。

---

## 5. QR 掃描失敗

### 可能原因

- `jsQR` 沒載入。
- 圖片太小、模糊、反光或對比不足。
- 相機權限被拒。
- 瀏覽器需要 HTTPS 或 localhost。

### 排查

```js
await ensureDependency('jsqr')
typeof jsQR
```

相機測試：

- 使用 Chrome / Edge 最新版。
- 優先用 `localhost` 或 HTTPS。
- 測明亮環境、清楚 QR、鏡頭對焦後再判斷。

---

## 6. OCR 中文辨識很差

### 可能原因

- 語言選錯，例如只用英文。
- `chi_tra` 語言資料沒有載入。
- 圖片解析度不足或文字太小。
- 反光、斜拍、陰影、手寫、表格或多欄排版。
- 使用快速語言包導致準確度下降。

### 排查

1. 確認語言模式選繁中或繁中 + 英文。
2. 檢查 tessdata 路徑設定：

```js
window.WEBCODING_TESSDATA_PATHS
```

3. 測一張清楚、水平、黑字白底的繁中圖片。
4. 如果清楚圖片可辨識，問題多半是輸入品質，不一定是程式錯。
5. 若所有繁中都失敗，檢查 Tesseract 與語言資料是否載入成功。

---

## 7. PDF 打不開或無法提取文字

### 可能原因

- `pdfjs` 沒載入。
- PDF 是掃描圖片，沒有文字層。
- PDF 太大或瀏覽器記憶體不足。
- Worker 路徑錯誤。

### 排查

```js
await ensureDependency('pdfjs')
window.pdfjsLib
```

判斷 PDF 類型：

- 可選取文字的 PDF：PDF.js 通常可提取。
- 掃描圖片 PDF：需要 OCR，準確度依圖片品質而定。

---

## 8. DOCX / ODT 打不開

### 可能原因

- `mammoth` 或 `jszip` 沒載入。
- 檔案不是有效 Office 文件。
- 文件內含複雜版面，轉 HTML 不完整。

### 排查

```js
await ensureDependency('mammoth')
await ensureDependency('jszip')
```

ODT 主要依賴 ZIP 解壓與 XML 解析；複雜格式可能無法完整保留。

---

## 9. XLSX / CSV 打不開或公式錯誤

### 可能原因

- `xlsx` 沒載入。
- CSV 編碼不符。
- 公式支援有限。
- 檔案太大導致瀏覽器卡住。

### 排查

```js
await ensureDependency('xlsx')
window.XLSX
```

CSV 若亂碼，先確認來源編碼。大型試算表請先用小檔測流程是否正常。

---

## 10. 離線發佈版仍然連外

### 可能原因

- vendor 檔缺失，程式回退到 CDN。
- OCR 語言資料沒有設成本地路徑。
- Google Analytics 未移除，或使用的是 GA 發佈版。
- HTML 仍有外部 script/link。

### 排查

無分析發佈版：

```bash
npm run build:offline
npm run offline:audit:strict
```

GA 發佈版：

```bash
npm run build:offline:analytics
npm run offline:audit:analytics:strict
```

再用瀏覽器 Network 面板確認實際請求。

---

## 11. Google Analytics 沒有資料

### 可能原因

- 用的是 `dist/offline`，這版會停用 GA。
- GA script 被瀏覽器外掛擋住。
- Measurement ID 錯誤。
- 本機 file:// 測試不一定能代表正式部署。

### 排查

1. 使用 `dist/offline-with-analytics`。
2. 檢查 HTML 是否保留 `googletagmanager.com`。
3. 使用正式網域或測試 server。
4. DevTools Network 搜尋 `gtag/js`。
5. GA 後台即時報表可能有延遲或被阻擋，請同時看 Network。

---

## 12. 文件稽核失敗

### 可能原因

README 或 docs 出現過度承諾的句子，例如保證任一版本都不連第三方、或保證速度。

### 排查

```bash
npm run docs:audit
```

依錯誤訊息修改文字。建議改成：

- 本機優先
- 無自建後端處理文件
- 嚴格離線發佈需通過 vendor、tessdata 與 Network 檢查
- GA 發佈版會連 Google Analytics

---

## 13. Smoke test 過了但瀏覽器壞掉

Smoke test 只抓高風險靜態問題與部分模擬環境，不會涵蓋：

- 真實相機權限。
- 真實檔案選擇器。
- OCR 實際準確度。
- 大型 PDF / XLSX 效能。
- 瀏覽器外掛造成的 GA 或 CDN 阻擋。
- 行動裝置瀏覽器差異。

所以發佈前仍要依 `docs/RELEASE_CHECKLIST.md` 手動測。
