# WebPad++ IDE Edition

<div align="center">

[![WebPad++](https://img.shields.io/badge/WebPad++-IDE_Edition-blue?style=for-the-badge&logo=codemirror)](#-quick-start)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#license)
[![Languages](https://img.shields.io/badge/Languages-30+-orange?style=for-the-badge)](#-language--語言選擇)
[![No Backend](https://img.shields.io/badge/Backend-None_Required-purple?style=for-the-badge)](#-quick-start)

**A powerful, browser-based IDE with zero backend requirements.**
支援 30+ 語系 | 多頁籤↔檔案總管同步 | 即時預覽 | 文件編輯（PDF/DOCX/XLSX）

</div>

---

## 🚀 Quick Start

```bash
cd WebPad_Project
python3 -m http.server 8000
# Open http://localhost:8000
```

---

## ✨ What's New (v2.1)

| Feature | Details |
|---------|---------|
| **Tab ↔ Explorer Sync** | Creating a new tab automatically adds the file to the File Explorer |
| **Visual Mode Fix** | Switching from Split → Visual no longer leaves a dead/blank region |
| **PDF Viewer** | Upload PDF → canvas rendering + extract text for editing |
| **DOCX Edit** | Upload DOCX → HTML visual editor → Export DOCX |
| **ODT Edit** | Upload ODT → visual editor → Export DOCX |
| **Excel / CSV** | Upload XLSX/XLS/CSV → spreadsheet grid editor → Export XLSX or CSV |

---

## 🌐 Language / 語言選擇

| Language | Jump To |
|----------|---------|
| 🇺🇸 English | [English Docs](#-english-documentation) |
| 🇹🇼 繁體中文 | [繁體中文 Docs](#-繁體中文-documentation) |
| 🇨🇳 简体中文 | [简体中文 Docs](#-简体中文-documentation) |
| 🇯🇵 日本語 | [日本語 Docs](#-日本語-documentation) |
| 🇰🇷 한국어 | [한국어 Docs](#-한국어-documentation) |
| 🇪🇸 Español | [Español Docs](#-español-documentation) |
| 🇫🇷 Français | [Français Docs](#-français-documentation) |
| 🇩🇪 Deutsch | [Deutsch Docs](#-deutsch-documentation) |
| + 22 more | See language selector in the app |

---

## 🇺🇸 English Documentation

**A powerful, browser-based IDE with zero backend requirements.**

### Features
- **Code Editor**: Syntax highlighting, IntelliSense, bracket matching, Sublime keymap.
- **Instant Execution**: HTML (new-tab preview), JavaScript (Console), Python (Pyodide).
- **Smart Linting**: Real-time error detection for HTML, CSS, JS, Python.
- **Code Formatter**: One-click beautify for HTML, CSS, JavaScript.
- **File Explorer + Tab Sync**: New tabs auto-appear in the Explorer; Explorer files open in tabs.
- **Three View Modes**: Code · Split Preview · Visual (WYSIWYG).
- **Document Support**: PDF viewer, DOCX/ODT editor, Excel/CSV spreadsheet editor.
- **Code Diff**: Compare any two open tabs side-by-side.
- **30 Languages**: Auto-detection with RTL support.
- **Dark Mode**: One-click theme toggle.

### Document Format Support

| Format | Import | Edit | Export |
|--------|--------|------|--------|
| PDF | ✅ Canvas viewer | ✅ Extract text | ✅ DOCX |
| DOCX | ✅ Rich HTML render | ✅ WYSIWYG | ✅ DOCX |
| ODT | ✅ Text extraction | ✅ WYSIWYG | ✅ DOCX |
| XLSX / XLS | ✅ Spreadsheet grid | ✅ Cell editing | ✅ XLSX / CSV |
| CSV | ✅ Spreadsheet grid | ✅ Cell editing | ✅ CSV / XLSX |

### Keyboard Shortcuts
- `Ctrl+S`: Save / Export
- `Ctrl+Enter`: Run Code
- `Ctrl+Space`: Autocomplete
- `Ctrl+F`: Find / Replace
- `Ctrl+O`: Open File

### Project Structure
```
WebPad_Project/
├── index.html          (Main Shell)
├── css/style.css       (Styles + Spreadsheet/PDF CSS)
├── js/
│   ├── editor.js       (Tab Manager, CodeMirror, Execution)
│   ├── filesystem.js   (IndexedDB Virtual File System)
│   ├── i18n.js         (i18next Multilingual Engine)
│   └── doceditor.js    (PDF/DOCX/ODT/Excel/CSV handlers)
└── locales/            (30 JSON translation files)
```

---

## 🇹🇼 繁體中文 Documentation

**強大的瀏覽器端整合開發環境，完全無需後端伺服器。**

### 功能特色
- **程式碼編輯器**：語法高亮、智慧補全、括號配對、Sublime 快捷鍵。
- **即時執行**：HTML（新分頁預覽）、JavaScript（Console）、Python（Pyodide）。
- **智慧 Lint**：即時偵測 HTML/CSS/JS/Python 語法錯誤。
- **一鍵格式化**：自動美化 HTML、CSS、JavaScript。
- **檔案總管 + 分頁同步**：新建分頁自動同步到檔案總管；總管檔案可直接在分頁中開啟。
- **三種檢視模式**：程式碼 · 分屏即時預覽 · 視覺化（WYSIWYG）。
- **文件格式支援**：PDF 檢視、DOCX/ODT 編輯、Excel/CSV 試算表編輯。
- **程式碼比對**：並排比較任意兩個分頁。
- **30 種語言**：自動偵測，支援 RTL。
- **深色模式**：一鍵切換主題。

### 文件格式支援

| 格式 | 匯入 | 編輯 | 匯出 |
|------|------|------|------|
| PDF | ✅ Canvas 檢視 | ✅ 提取文字 | ✅ DOCX |
| DOCX | ✅ 富文本渲染 | ✅ 視覺化編輯 | ✅ DOCX |
| ODT | ✅ 文字提取 | ✅ 視覺化編輯 | ✅ DOCX |
| XLSX / XLS | ✅ 試算表格 | ✅ 儲存格編輯 | ✅ XLSX / CSV |
| CSV | ✅ 試算表格 | ✅ 儲存格編輯 | ✅ CSV / XLSX |

### 快捷鍵
- `Ctrl+S`：儲存 / 匯出
- `Ctrl+Enter`：執行程式碼
- `Ctrl+Space`：自動補全
- `Ctrl+F`：搜尋 / 取代
- `Ctrl+O`：開啟檔案

### 專案結構
```
WebPad_Project/
├── index.html          (主頁面)
├── css/style.css       (樣式 + 試算表/PDF CSS)
├── js/
│   ├── editor.js       (分頁管理、CodeMirror、執行引擎)
│   ├── filesystem.js   (IndexedDB 虛擬檔案系統)
│   ├── i18n.js         (i18next 多語言引擎)
│   └── doceditor.js    (PDF/DOCX/ODT/Excel/CSV 處理器)
└── locales/            (30 個 JSON 翻譯檔)
```

---

## 🇨🇳 简体中文 Documentation

**强大的浏览器端集成开发环境，完全无需后端服务器。**

### 功能特性
- **代码编辑器**：语法高亮、智能补全、括号匹配、Sublime 快捷键。
- **即时执行**：HTML（新标签页预览）、JavaScript（Console）、Python（Pyodide）。
- **标签页↔资源管理器同步**：新建标签页自动同步到文件资源管理器。
- **文档格式支持**：PDF 查看、DOCX/ODT 编辑、Excel/CSV 电子表格编辑。
- **30 种语言**：自动检测，支持 RTL。

### 文档格式支持

| 格式 | 导入 | 编辑 | 导出 |
|------|------|------|------|
| PDF | ✅ Canvas 查看 | ✅ 提取文字 | ✅ DOCX |
| DOCX | ✅ 富文本渲染 | ✅ 可视化编辑 | ✅ DOCX |
| ODT | ✅ 文字提取 | ✅ 可视化编辑 | ✅ DOCX |
| XLSX / XLS | ✅ 电子表格 | ✅ 单元格编辑 | ✅ XLSX / CSV |
| CSV | ✅ 电子表格 | ✅ 单元格编辑 | ✅ CSV / XLSX |

---

## 🇯🇵 日本語 Documentation

**バックエンド不要の強力なブラウザベース IDE。**

### 機能
- コードエディター・即時実行・スマートリント・ファイルエクスプローラー。
- タブ↔エクスプローラー同期：新規タブが自動的にファイルエクスプローラーに追加。
- PDF ビューア・DOCX/ODT 編集・Excel/CSV スプレッドシート編集。
- 30 言語対応（RTL 含む）・ダークモード。

---

## 🇰🇷 한국어 Documentation

**백엔드가 필요 없는 강력한 브라우저 기반 IDE.**

### 기능
- 코드 편집기·즉시 실행·스마트 린트·파일 탐색기.
- 탭↔탐색기 동기화: 새 탭이 파일 탐색기에 자동으로 표시.
- PDF 뷰어·DOCX/ODT 편집·Excel/CSV 스프레드시트 편집.
- 30개 언어 지원(RTL 포함)·다크 모드.

---

*For other languages, switch the UI language in the app — all 30 language packs include a translated welcome guide.*

---

*Last updated: 2026-05-12 | WebPad++ v2.1*
