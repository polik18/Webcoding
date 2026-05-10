# WebPad++ IDE Edition

<div align="center">

![WebPad++ Logo](https://img.shields.io/badge/WebPad++-IDE_Edition-blue?style=for-the-badge&logo=codemirror)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Languages](https://img.shields.io/badge/Languages-30+-orange?style=for-the-badge)
![No Backend](https://img.shields.io/badge/Backend-None_Required-purple?style=for-the-badge)

**A powerful, browser-based IDE with zero backend requirements.**  
支援 30+ 語系 | 多頁籤 | 即時預覽 | 虛擬專案系統

</div>

---

## 🌐 Language / 語言選擇

| 語言 | Jump To |
|------|---------|
| 🇺🇸 English | [English Docs](#-english-documentation) |
| 🇹🇼 繁體中文 | [繁體中文說明](#-繁體中文說明) |
| 🇨🇳 简体中文 | [简体中文说明](#-简体中文说明) |
| 🇯🇵 日本語 | [日本語ドキュメント](#-日本語ドキュメント) |
| 🇰🇷 한국어 | [한국어 문서](#-한국어-문서) |
| 🇪🇸 Español | [Documentación en Español](#-documentación-en-español) |
| 🇫🇷 Français | [Documentation en Français](#-documentation-en-français) |
| 🇩🇪 Deutsch | [Deutsche Dokumentation](#-deutsche-dokumentation) |

---

## 🇺🇸 English Documentation

### Overview

**WebPad++** is a full-featured, browser-based IDE (Integrated Development Environment) that runs entirely in your web browser with no installation, no server, and no dependencies to install. It offers a professional coding experience comparable to lightweight desktop IDEs.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🗂️ **Multi-Tab** | Open multiple files simultaneously in independent tabs, each with its own undo/redo history |
| 📁 **File Explorer** | Hierarchical folder/file tree with drag-resize sidebar |
| 🌐 **30+ Languages** | Auto-detect browser language; switch UI language instantly |
| 🎨 **Syntax Highlighting** | HTML, CSS, JS, TS, Python, C/C++, Java, C#, PHP, SQL, Rust, Go |
| 🤖 **IntelliSense** | Auto-complete suggestions (Ctrl+Space) for all supported languages |
| 🔍 **Live Linting** | Real-time error & warning detection for HTML, CSS, JavaScript |
| ⚡ **Split Live Preview** | Side-by-side code + browser preview (like CodePen) |
| 👁️ **Visual WYSIWYG** | Rich-text visual editor with full formatting toolbar |
| 🔀 **Diff Compare** | Side-by-side diff viewer across any two open tabs |
| 💾 **Auto-Save** | Automatic persistence to IndexedDB; survives page refresh |
| 📦 **ZIP Export** | Export entire virtual file tree as a `.zip` download |
| 🌙 **Dark Mode** | Full dark/light theme toggle |
| 📏 **Code Formatter** | One-click code beautification for HTML, CSS, JS |
| 🔄 **EOL & Encoding** | Toggle LF/CRLF; switch UTF-8, Big5, Shift-JIS, Windows-1252 |
| 🐍 **Python Runner** | Execute Python in-browser via Pyodide WASM |

### 🚀 Getting Started

> **Important:** Must be served via a local HTTP server due to browser CORS restrictions.

```bash
# Clone or download the project
cd WebPad_Project

# Option 1: Python (recommended)
python3 -m http.server 8000

# Option 2: Node.js
npx serve .

# Option 3: PHP
php -S localhost:8000
```

Then open your browser and go to: **http://localhost:8000**

### 📋 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save / Download file |
| `Ctrl + O` | Open file from disk |
| `Ctrl + Enter` | Run code |
| `Ctrl + Space` | Trigger auto-complete |
| `Ctrl + F` | Find in file |
| `Ctrl + H` | Find & Replace |
| `Ctrl + /` | Toggle comment |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + ]` | Indent |
| `Ctrl + [` | Un-indent |

### 🗂️ Supported Languages & Extensions

| Extension | Language | Highlighting | IntelliSense | Run |
|-----------|----------|:---:|:---:|:---:|
| `.html` | HTML | ✅ | ✅ | ✅ |
| `.css` | CSS | ✅ | ✅ | — |
| `.js` | JavaScript | ✅ | ✅ | ✅ |
| `.ts` | TypeScript | ✅ | — | — |
| `.json` | JSON | ✅ | ✅ | — |
| `.py` | Python | ✅ | — | ✅ (Pyodide) |
| `.c` / `.cpp` / `.h` | C / C++ | ✅ | — | — |
| `.java` | Java | ✅ | — | — |
| `.cs` | C# | ✅ | — | — |
| `.php` | PHP | ✅ | — | — |
| `.sql` | SQL | ✅ | ✅ | — |
| `.rs` | Rust | ✅ | — | — |
| `.go` | Go | ✅ | — | — |
| `.md` / `.txt` | Markdown / Text | — | — | — |

### 🏗️ Project Architecture

```
WebPad_Project/
├── index.html          # Main application shell
├── css/
│   └── style.css       # Custom styles (RTL support, themes)
├── js/
│   ├── editor.js       # Core editor: TabManager, CodeMirror init, all features
│   ├── filesystem.js   # Virtual FileSystem: tree, ZIP export, IndexedDB
│   └── i18n.js         # i18next engine: language detection & switching
└── locales/
    ├── en.json         # English (master dictionary, 94 keys)
    ├── zh-TW.json      # 繁體中文
    ├── zh-CN.json      # 简体中文
    ├── ja.json         # 日本語
    └── ... (29 languages total)
```

### 🔧 Technology Stack

| Library | Version | Purpose |
|---------|---------|---------|
| CodeMirror | 5.65.13 | Core editor engine |
| i18next | 23.10.1 | Internationalization |
| localForage | 1.10.0 | IndexedDB persistence |
| JSZip | 3.10.1 | ZIP file generation |
| diff-match-patch | 20121119 | Diff algorithm for Compare mode |
| Tailwind CSS | CDN | UI styling framework |
| Font Awesome | 6.4.0 | Icons |
| Pyodide | 0.23.4 | Python WASM runtime (lazy loaded) |
| js-beautify | 1.14.9 | Code formatting |

---

## 🇹🇼 繁體中文說明

### 專案簡介

**WebPad++** 是一套完全運行於瀏覽器端的輕量級 IDE（整合開發環境），無需安裝任何後端程式、伺服器或套件。它提供堪比桌面輕量 IDE 的專業程式碼編輯體驗。

### ✨ 核心功能

| 功能 | 說明 |
|------|------|
| 🗂️ **多頁籤管理** | 同時開啟多個檔案，每個分頁擁有獨立的復原/重做歷史 |
| 📁 **虛擬檔案總管** | 可拖曳調整寬度的階層式資料夾/檔案樹狀結構 |
| 🌐 **30+ 國語系** | 自動偵測瀏覽器語系，支援即時切換介面語言 |
| 🎨 **語法高亮** | 支援 HTML、CSS、JS、TS、Python、C/C++、Java、C#、PHP、SQL、Rust、Go |
| 🤖 **智慧自動補全** | 按 `Ctrl+Space` 觸發所有語言的程式碼提示 |
| 🔍 **即時語法檢查** | 即時偵測 HTML、CSS、JavaScript 的錯誤與警告 |
| ⚡ **分屏即時預覽** | 程式碼與瀏覽器預覽並排顯示（類似 CodePen） |
| 👁️ **視覺化編輯** | 含完整格式工具列的所見即所得 (WYSIWYG) 富文字編輯器 |
| 🔀 **程式碼比對** | 任意兩個分頁之間的差異並排高亮顯示 |
| 💾 **自動暫存** | 自動持久化至 IndexedDB，瀏覽器重整後資料不遺失 |
| 📦 **ZIP 打包匯出** | 將整個虛擬檔案系統打包成 `.zip` 下載至電腦 |
| 🌙 **深色模式** | 完整的深色/淺色主題切換 |
| 📏 **程式碼排版** | 一鍵美化 HTML、CSS、JS 程式碼 |
| 🔄 **換行符號與編碼** | 切換 LF/CRLF；支援 UTF-8、Big5、Shift-JIS 等編碼 |
| 🐍 **Python 執行器** | 透過 Pyodide WASM 直接在瀏覽器執行 Python |

### 🚀 快速開始

> **重要提示：** 由於瀏覽器的 CORS 安全限制，必須透過本地 HTTP 伺服器開啟，不能直接雙擊 `index.html`。

```bash
# 進入專案目錄
cd WebPad_Project

# 方式一：Python（推薦）
python3 -m http.server 8000

# 方式二：Node.js
npx serve .

# 方式三：PHP
php -S localhost:8000
```

啟動後，開啟瀏覽器並前往：**http://localhost:8000**

### ⌨️ 鍵盤快捷鍵

| 快捷鍵 | 動作 |
|--------|------|
| `Ctrl + S` | 儲存 / 下載檔案 |
| `Ctrl + O` | 從磁碟開啟檔案 |
| `Ctrl + Enter` | 執行程式碼 |
| `Ctrl + Space` | 觸發自動補全 |
| `Ctrl + F` | 在檔案中搜尋 |
| `Ctrl + H` | 搜尋並取代 |
| `Ctrl + /` | 切換註解 |
| `Ctrl + Z` | 復原 |
| `Ctrl + Y` | 重做 |

### 📁 介面功能說明

#### 頂部導覽列（由左至右）

1. **☰ 漢堡選單** — 展開/收合左側檔案總管
2. **📂 開啟** — 從電腦開啟檔案（自動建立新分頁）
3. **💾 儲存** — 儲存目前檔案（儲存至虛擬系統或下載）
4. **✨ 格式化** — 自動排版程式碼（HTML/CSS/JS）
5. **▶ 執行** — 執行目前程式碼（JS/Python）
6. **模式切換** — 程式碼 / 分屏預覽 / 視覺化
7. **檔名欄位** — 點擊可重新命名目前檔案
8. **語系下拉選單** — 切換介面語系（支援 30 國語言）
9. **🌙 主題切換** — 切換深色/淺色模式

#### 左側檔案總管

- **📄 新增檔案** — 在選取的資料夾下建立新檔案
- **📁 新增資料夾** — 建立新資料夾（支援無限層級）
- **🗑️ 刪除** — 刪除選取的檔案或資料夾（含子項目）
- **📦 匯出 ZIP** — 將整個專案打包成 ZIP 下載

#### 分頁列

- 點擊分頁切換檔案
- 點擊 **＋** 按鈕新增空白分頁
- 黃色圓點表示有未儲存的變更
- 按下 **×** 關閉分頁（若有未儲存內容會提示確認）
- 按右側 **⇄ 比對** 按鈕，開啟分頁比對模式

### 🏗️ 專案架構

```
WebPad_Project/
├── index.html          # 主應用程式骨架
├── css/
│   └── style.css       # 自訂樣式（含 RTL 支援、主題）
├── js/
│   ├── editor.js       # 核心編輯器：TabManager、CodeMirror 初始化、所有功能
│   ├── filesystem.js   # 虛擬檔案系統：樹狀結構、ZIP 匯出、IndexedDB
│   └── i18n.js         # i18next 引擎：語言偵測與切換
└── locales/
    ├── en.json         # 英文（主字典，94 個鍵值）
    ├── zh-TW.json      # 繁體中文
    ├── zh-CN.json      # 简体中文
    └── ... （共 29 種語言）
```

---

## 🇨🇳 简体中文说明

### 项目简介

**WebPad++** 是一套完全运行于浏览器端的轻量级 IDE（集成开发环境），无需安装任何后端程序、服务器或依赖包。它提供堪比桌面轻量 IDE 的专业代码编辑体验。

### ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🗂️ **多标签管理** | 同时打开多个文件，每个标签拥有独立的撤销/重做历史 |
| 📁 **虚拟文件管理器** | 可拖拽调整宽度的层级文件夹/文件树状结构 |
| 🌐 **30+ 种语言** | 自动检测浏览器语言，支持即时切换界面语言 |
| 🎨 **语法高亮** | 支持 HTML、CSS、JS、TS、Python、C/C++、Java、C#、PHP、SQL、Rust、Go |
| 🤖 **智能自动补全** | 按 `Ctrl+Space` 触发所有语言的代码提示 |
| 🔍 **实时语法检查** | 实时检测 HTML、CSS、JavaScript 的错误与警告 |
| ⚡ **分屏实时预览** | 代码与浏览器预览并排显示（类似 CodePen） |
| 👁️ **可视化编辑** | 含完整格式工具栏的所见即所得富文本编辑器 |
| 🔀 **代码对比** | 任意两个标签之间的差异并排高亮显示 |
| 💾 **自动暂存** | 自动持久化至 IndexedDB，页面刷新后数据不丢失 |
| 📦 **ZIP 打包导出** | 将整个虚拟文件系统打包成 `.zip` 下载到电脑 |
| 🌙 **深色模式** | 完整的深色/浅色主题切换 |

### 🚀 快速开始

```bash
cd WebPad_Project
python3 -m http.server 8000
```

打开浏览器访问：**http://localhost:8000**

---

## 🇯🇵 日本語ドキュメント

### 概要

**WebPad++** は、バックエンドのインストールなしに完全にブラウザで動作する軽量 IDE（統合開発環境）です。インストール不要で、プロフェッショナルなコード編集体験を提供します。

### ✨ 主な機能

| 機能 | 説明 |
|------|------|
| 🗂️ **マルチタブ** | 複数ファイルを同時に開き、各タブが独立した履歴を保持 |
| 📁 **ファイルエクスプローラー** | ドラッグでリサイズ可能な階層型ファイルツリー |
| 🌐 **30以上の言語** | ブラウザの言語を自動検出し、UI言語を即座に切り替え |
| 🎨 **シンタックスハイライト** | HTML、CSS、JS、Python、C++、Java、PHP、SQL、Rust、Goに対応 |
| 🤖 **インテリセンス** | Ctrl+Spaceで全言語のオートコンプリートを起動 |
| ⚡ **分割ライブプレビュー** | コードとブラウザプレビューを並べて表示（CodePen風） |
| 💾 **自動保存** | IndexedDBへの自動永続化（ページリフレッシュ後もデータ保持） |
| 📦 **ZIPエクスポート** | 仮想ファイルツリー全体を `.zip` でダウンロード |

### 🚀 起動方法

```bash
cd WebPad_Project
python3 -m http.server 8000
```

ブラウザで **http://localhost:8000** を開いてください。

---

## 🇰🇷 한국어 문서

### 개요

**WebPad++** 는 백엔드 설치 없이 완전히 브라우저에서 동작하는 경량 IDE(통합 개발 환경)입니다.

### ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 🗂️ **다중 탭** | 여러 파일을 동시에 열고, 각 탭이 독립적인 실행 취소/다시 실행 기록 보유 |
| 📁 **파일 탐색기** | 드래그로 너비 조절 가능한 계층형 파일 트리 |
| 🌐 **30개 이상 언어** | 브라우저 언어 자동 감지, UI 언어 즉시 전환 |
| 🎨 **구문 강조** | HTML, CSS, JS, Python, C++, Java, PHP, SQL, Rust, Go 지원 |
| 🤖 **지능형 자동완성** | Ctrl+Space로 모든 언어 코드 제안 |
| ⚡ **분할 라이브 미리보기** | 코드와 브라우저 미리보기 나란히 표시 |
| 💾 **자동 저장** | IndexedDB 자동 저장 (새로 고침 후에도 데이터 유지) |
| 📦 **ZIP 내보내기** | 전체 가상 파일 트리를 `.zip` 으로 다운로드 |

### 🚀 시작하기

```bash
cd WebPad_Project
python3 -m http.server 8000
```

브라우저에서 **http://localhost:8000** 접속

---

## 🇪🇸 Documentación en Español

### Descripción general

**WebPad++** es un IDE ligero que funciona completamente en el navegador, sin necesidad de instalar ningún backend, servidor ni dependencias.

### ✨ Características principales

| Característica | Descripción |
|----------------|-------------|
| 🗂️ **Pestañas múltiples** | Abra varios archivos simultáneamente con historiales independientes |
| 📁 **Explorador de archivos** | Árbol de carpetas/archivos con panel redimensionable |
| 🌐 **30+ idiomas** | Detección automática del idioma del navegador |
| 🎨 **Resaltado de sintaxis** | HTML, CSS, JS, Python, C++, Java, PHP, SQL, Rust, Go |
| ⚡ **Vista previa en vivo** | Código y vista previa del navegador lado a lado |
| 💾 **Guardado automático** | Persistencia en IndexedDB |
| 📦 **Exportar ZIP** | Descargar todo el árbol de archivos como `.zip` |

### 🚀 Inicio rápido

```bash
cd WebPad_Project
python3 -m http.server 8000
```

Abra **http://localhost:8000** en su navegador.

---

## 🇫🇷 Documentation en Français

### Présentation

**WebPad++** est un IDE léger qui fonctionne entièrement dans le navigateur, sans installation de backend.

### ✨ Fonctionnalités principales

| Fonctionnalité | Description |
|----------------|-------------|
| 🗂️ **Onglets multiples** | Ouvrir plusieurs fichiers avec des historiques indépendants |
| 📁 **Explorateur de fichiers** | Arbre de dossiers/fichiers avec panneau redimensionnable |
| 🌐 **30+ langues** | Détection automatique de la langue du navigateur |
| 🎨 **Coloration syntaxique** | HTML, CSS, JS, Python, C++, Java, PHP, SQL, Rust, Go |
| ⚡ **Aperçu en direct** | Code et aperçu navigateur côte à côte |
| 💾 **Sauvegarde automatique** | Persistance dans IndexedDB |
| 📦 **Export ZIP** | Télécharger toute l'arborescence en `.zip` |

### 🚀 Démarrage rapide

```bash
cd WebPad_Project
python3 -m http.server 8000
```

Ouvrez **http://localhost:8000** dans votre navigateur.

---

## 🇩🇪 Deutsche Dokumentation

### Überblick

**WebPad++** ist eine leichte IDE, die vollständig im Browser läuft, ohne Backend-Installation.

### ✨ Hauptfunktionen

| Funktion | Beschreibung |
|----------|--------------|
| 🗂️ **Mehrere Tabs** | Mehrere Dateien gleichzeitig mit unabhängigen Historien öffnen |
| 📁 **Datei-Explorer** | Hierarchischer Ordner-/Dateibaum mit anpassbarer Seitenleiste |
| 🌐 **30+ Sprachen** | Automatische Erkennung der Browsersprache |
| 🎨 **Syntaxhervorhebung** | HTML, CSS, JS, Python, C++, Java, PHP, SQL, Rust, Go |
| ⚡ **Live-Vorschau** | Code und Browser-Vorschau nebeneinander |
| 💾 **Automatisches Speichern** | Persistenz in IndexedDB |
| 📦 **ZIP-Export** | Gesamten Dateibaum als `.zip` herunterladen |

### 🚀 Schnellstart

```bash
cd WebPad_Project
python3 -m http.server 8000
```

Öffnen Sie **http://localhost:8000** in Ihrem Browser.

---

## 🐛 Known Limitations / 已知限制

- **Python execution** requires internet to load Pyodide (~10MB) on first use  
  Python 執行需要網路以在首次使用時載入 Pyodide（約 10MB）
- **File:// protocol not supported** — must use a local HTTP server  
  不支援 `file://` 協定，必須使用本地 HTTP 伺服器
- **No server-side file access** — file system is virtual (IndexedDB)  
  沒有伺服器端的檔案系統存取，檔案系統為虛擬結構（IndexedDB）
- **Max file size**: 2MB per file  
  每個檔案最大 2MB

## 🤝 Contributing / 貢獻

1. Fork the project
2. Add/improve translations in `locales/`
3. Submit a Pull Request

## 📄 License

MIT License — Free to use, modify, and distribute.

---

<div align="center">
Made with ❤️ — WebPad++ IDE Edition
</div>
