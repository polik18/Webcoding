// js/i18n.js

let defaultLang = localStorage.getItem('webpad_lang');
if (!defaultLang) {
    let navLang = navigator.language;
    if (navLang) {
        if (navLang.startsWith('zh')) {
            defaultLang = (navLang === 'zh-CN' || navLang === 'zh-SG') ? 'zh-CN' : 'zh-TW';
        } else {
            defaultLang = navLang.split('-')[0];
        }
    } else {
        defaultLang = 'en';
    }
}

const langSelect = document.getElementById('lang-select');
if (langSelect && !Array.from(langSelect.options).some(opt => opt.value === defaultLang)) {
    defaultLang = 'en';
}

// Safe translation helper: returns i18next result or English fallback
const _FALLBACKS = {
    "nav.openBtn": "Open",
    "nav.saveBtn": "Save",
    "nav.saveAs": "Save As...",
    "nav.saveAsPdf": "Export to PDF",
    "nav.saveAsDocx": "Export to DOCX",
    "nav.runBtn": "Run",
    "nav.code": "Code",
    "nav.visual": "Visual",
    "nav.openTitle": "Open a file from your computer (Shortcut: Ctrl+O)",
    "nav.saveTitle": "Directly save current changes back to the original file on your disk",
    "nav.runTitle": "Execute HTML, JavaScript, or Python code (Shortcut: Ctrl+Enter)",
    "nav.renameTitle": "Click to rename",
    "nav.defaultFile": "User Guide.md",
    "nav.formatBtn": "Format",
    "nav.formatTitle": "Automatically beautify and indent your code for better readability",
    "nav.newTabTitle": "New Tab",
    "nav.compareTitle": "Compare differences between two open tabs side-by-side",
    "nav.compareBtn": "Compare",
    "nav.untitled": "Untitled",
    "nav.explorer": "Explorer",
    "nav.newFile": "Create a new code file or document in the current folder",
    "nav.newFolder": "Create a new directory to organize your project",
    "nav.deleteNode": "Delete the selected file or folder permanently",
    "nav.toggleExplorer": "Show or hide the file explorer sidebar",
    "nav.exportZip": "Compress and download the entire workspace as a ZIP file",
    "nav.modeCode": "Code",
    "nav.modeVisual": "Visual",
    "nav.modeSplit": "Split Preview",
    "nav.resetAllTitle": "Permanently wipe all local data, files, and settings to start fresh",
    "nav.renameNode": "Rename the selected file or folder",
    "nav.ocrTitle": "Extract text from images, camera, or clipboard using AI recognition",
    "nav.ocrBtn": "OCR",
    "nav.qrTitle": "Generate QR codes from text or scan existing QR codes via webcam",
    "nav.qrBtn": "QR Code",
    "nav.seoTitle": "Generate Sitemap.xml and Robots.txt to optimize search rankings",
    "nav.recentTitle": "View and quickly reopen your recently accessed files and folders",
    "panel.probTab": "Problems",
    "panel.consoleTab": "Console",
    "panel.clearConsole": "Clear Console",
    "panel.closePanel": "Close Panel",
    "visual.bold": "Bold",
    "visual.italic": "Italic",
    "visual.underline": "Underline",
    "visual.alignLeft": "Align Left",
    "visual.alignCenter": "Align Center",
    "visual.alignRight": "Align Right",
    "visual.h1": "H1",
    "visual.h2": "H2",
    "visual.textColor": "Text Color",
    "visual.insertImg": "Insert Image",
    "visual.insertLink": "Insert Link",
    "visual.insertTableTitle": "Insert 3x3 Table",
    "visual.insertTable": "Table",
    "visual.rowAddTitle": "Add Row Below",
    "visual.rowAdd": "+Row",
    "visual.colAddTitle": "Add Col Right",
    "visual.colAdd": "+Col",
    "visual.rowDelTitle": "Delete Current Row",
    "visual.rowDel": "-Row",
    "visual.colDelTitle": "Delete Current Col",
    "visual.colDel": "-Col",
    "messages.dropText": "Drop to open file",
    "messages.cancel": "Cancel",
    "messages.confirm": "OK",
    "messages.msgPerfect": "<i class='fa-solid fa-check'></i> Code looks perfect, no syntax errors found!",
    "messages.msgUnknownLine": "Unknown",
    "messages.msgUnknownErr": "Unknown Error",
    "messages.msgLine": "Line",
    "messages.msgLineSuf": "",
    "messages.renamePrompt": "Rename File",
    "messages.renameMsg": "Enter file name (with extension, e.g., test.srt, script.py):",
    "messages.toastRenamed": "File renamed to:",
    "messages.savePrompt": "Save File",
    "messages.saveMsg": "Enter save name (with extension, e.g., subtitle.srt, index.html):",
    "messages.cancelSave": "Save cancelled",
    "messages.toastSaved": "Saved",
    "messages.toastDownloaded": "Downloading file...",
    "messages.tooBig": "File too large",
    "messages.limit": "limit 2MB",
    "messages.toastLoaded": "Loaded:",
    "messages.runHTML": "Web preview opened in a new tab!",
    "messages.runConsole": "HTML deployed to a new tab for preview.\\n(Hint: Allow popups if nothing happens)",
    "messages.popBlock": "Popup blocked by browser, please allow",
    "messages.runFail": "Preview failed",
    "messages.noRunVis": "Cannot run code in Visual Mode, switch to Code Mode first.",
    "messages.runStart": "--- Run Started",
    "messages.runWait": "⏳ Python engine loading, please wait...",
    "messages.runNotSup": "Direct execution not supported for",
    "messages.runHint": "format.\\nHint: Rename to .js or .py to enable execution.",
    "messages.promptImg": "Enter image URL:",
    "messages.promptLink": "Enter URL:",
    "messages.promptTableMsg": "Insert default 3x3 table? (Type ok or click OK)",
    "messages.tableCell": "Cell",
    "messages.errTable": "Please click inside a table first",
    "messages.pyLoad": "Loading Python engine...",
    "messages.pyReady": "Python engine ready!",
    "messages.pyFail": "Failed to load Python",
    "messages.exitCompare": "Exit Compare",
    "messages.selectCompareTab": "Select a tab to compare with:",
    "messages.confirmClose": "Discard unsaved changes to {{name}}?",
    "messages.openCompareTab": "Open another tab first to compare",
    "messages.errEncoding": "Encoding not supported",
    "messages.errDecode": "Failed to decode file",
    "messages.errFormat": "Format error",
    "messages.errFormatNotSup": "Formatting not supported",
    "messages.confirmDeleteMsg": "Are you sure you want to delete",
    "messages.errDuplicate": "already exists in this folder",
    "messages.confirmReset": "⚠️ This will permanently delete ALL files, tabs and settings. This action CANNOT be undone!",
    "content.default": "# Welcome to WebPad++ 🚀\n\nHello! 你好！こんにちは！Bonjour！Hola！Ciao！Привет！مرحبا！안녕하세요！Olá！\nMerhaba！Hallo！Namaste！Sawasdee！Xin chào！Selamat pagi！Jambo！Halo！\nGod dag！Hej！Goddag！Tervetuloa！Salut！Aloha！Shalom！Bula！Sain uu！Dobrý den！Sveiki！Witaj！\n\nWebPad++ is a powerful, fully browser-based IDE. **No backend required** — all your files, tabs, and settings are stored securely right in your browser.\n\n## ✨ New & Advanced Features\n\n* **Visual Editor (WYSIWYG)**: Seamlessly toggle between Code and Visual modes. Drag and drop folders directly into the editor, and sync beautifully formatted Markdown instantly!\n* **Smart Spreadsheet Engine**: Edit `.xlsx` & `.csv` files just like Excel! Supports drag-to-select, calculations (Sum/Average), dynamic sorting, and live formula evaluation (e.g. `=B3+C2*F2`).\n* **Image OCR Text Recognition**: Click the **OCR** tool to snap a photo with your camera, upload, or paste an image. It will auto-detect multi-language text and save it to a new file instantly!\n* **QR Code Suite**: Generate QR codes for any text/URL, or use your camera to scan and decode existing QR codes seamlessly.\n\n## 🛠 Core Capabilities\n\n* **Intelligent Editing**: Syntax highlighting, IntelliSense, bracket matching, and one-click code formatting.\n* **Instant Execution**: Run HTML (live preview in a new tab), JavaScript (Console), and Python (Pyodide).\n* **Split Preview & Diff**: Compare any two tabs side-by-side or preview code output in real-time.\n* **Advanced Document Support**: View, extract text, and edit PDFs, DOCX, and ODT documents with full export compatibility.\n* **File Management**: Create nested folders, drag-and-drop entire workspace directories, rename, delete, and Export your entire project as a ZIP.\n\n## 📖 Quick Start Guide\n\n1. **File Explorer**: Click `☰` to manage your files. Drag an entire folder from your computer straight into WebPad++!\n2. **Open Documents**: Drag a PDF, DOCX, or XLSX file into the window to open it in its dedicated editor.\n3. **Run Code**: Click ▶️ **Run** or press `Ctrl+Enter` to test your code instantly.\n4. **Contextual Tools**: Click the purple 🔠 **OCR** button or the green 📱 **QR Code** button for advanced utilities.\n5. **Save & Export**: Use the save dropdown to download your file or export your documents to DOCX/PDF.\n6. **Start Fresh**: Click the red 🔄 **Reset All** button to wipe all local data and restart.\n\nHappy coding! 🎉\n",
    "seo.auditTab": "Audit & Preview",
    "seo.sitemapTab": "Sitemap Generator",
    "seo.robotsTab": "Robots.txt",
    "seo.schemaTab": "Schema.org",
    "seo.scoreTitle": "SEO Audit Score",
    "seo.previewTitle": "Google Search Preview",
    "seo.desc": "Analyze your content for technical SEO issues and preview how it appears in search results.",
    "seo.auditTitle": "Current Page Audit",
    "seo.reanalyze": "Reanalyze",
    "seo.notAnalyzed": "Not Analyzed",
    "seo.clickToAnalyze": "Click 'Reanalyze' to get optimization suggestions",
    "ocr.initialTitle": "No Image Selected",
    "ocr.initialSub": "Select a source from the left or drag an image here",
    "ocr.startBtn": "Start Recognition",
    "ocr.resetBtn": "Start Over",
    "ocr.saveBtn": "Save to File",
    "ocr.langLabel": "Language Setting",
    "ocr.sourceLabel": "Input Source",
    "ocr.resultLabel": "Recognition Result (Editable)",
    "ocr.camera": "Take Photo",
    "ocr.upload": "Upload Image",
    "ocr.paste": "Paste Image",
    "notes.newBtn": "Notes",
    "notes.newTitle": "Create a todo note tab",
    "notes.newMenu": "Todo Note",
    "notes.toolbarTitle": "Todo Note",
    "notes.toolbarHint": "Checked items save automatically",
    "notes.inputPlaceholder": "Enter a todo item...",
    "notes.addBtn": "Add",
    "notes.clearBtn": "Clear done",
    "notes.clearTitle": "Remove completed todo items",
    "notes.fileBase": "Todo_Note",
    "notes.title": "Todo Note",
    "notes.kicker": "Todo Checklist",
    "notes.subtitle": "Write tasks, tick completed items, and keep everything in this local HTML note.",
    "notes.quickHint": "Tip: Use the input bar above the preview to add new tasks quickly.",
    "notes.initialOne": "Type your first task here",
    "notes.initialTwo": "Click the checkbox when it is done",
    "notes.initialThree": "Add more items from the toolbar above",
    "notes.freeTitle": "Notes",
    "notes.freePlaceholder": "Write additional details here...",
    "notes.itemPlaceholder": "New todo item",
    "notes.toastCreated": "Todo note created.",
    "notes.toastAdded": "Todo item added.",
    "notes.toastNeedText": "Please enter a todo item first.",
    "notes.toastCleared": "Completed items removed.",
    "notes.toastNothingClear": "No completed items to clear.",
    "notes.toastCreateFailed": "Todo note is not ready yet.",
    "recent.title": "Recent Access",
    "recent.clear": "Clear History",
    "recent.empty": "No recent records found.",
    "recent.desc": "Quickly reopen your recently accessed files and project folders."
};

window.t = (key, opts) => {
    if (typeof i18next !== 'undefined' && typeof i18next.t === 'function') {
        const result = i18next.t(key, opts);
        if (result !== key) return result;
    }
    return _FALLBACKS[key] || key;
};

if (typeof i18next !== 'undefined') {
    const isLocal = window.location.protocol === 'file:';
    const initOptions = {
        lng: defaultLang,
        fallbackLng: 'en',
        load: 'currentOnly',
        backend: {
            loadPath: 'locales/{{lng}}.json',
            queryStringParams: { v: Date.now() }
        }
    };
    
    let i18nInstance = i18next;
    if (!isLocal && typeof i18nextHttpBackend !== 'undefined') {
        i18nInstance = i18next.use(i18nextHttpBackend);
    }
    
    i18nInstance.init(isLocal ? { lng: defaultLang, fallbackLng: 'en', resources: {} } : initOptions)
        .then(function(t) {
            updateLanguageUI();
            
            const select = document.getElementById('lang-select');
            if (select && Array.from(select.options).some(opt => opt.value === i18next.language)) {
                select.value = i18next.language;
            } else if (select) {
                select.value = 'en';
            }

            if (typeof window.onI18nReady === 'function') {
                window.onI18nReady();
            }
        })
        .catch(err => {
            console.error("i18next failed to load (CORS issue usually)", err);
            updateLanguageUI();
            if (typeof window.onI18nReady === 'function') {
                window.onI18nReady();
            }
        });
} else {
    console.warn("i18next library is completely missing (CDN blocked). Using basic fallbacks.");
    updateLanguageUI();
    if (typeof window.onI18nReady === 'function') {
        window.onI18nReady();
    }
}

function updateLanguageUI() {
    const rtlLangs = ['ar', 'he'];
    const currentLang = (typeof i18next !== 'undefined' && i18next.language) ? i18next.language.split('-')[0] : 'en';
    
    if (rtlLangs.includes(currentLang)) {
        document.documentElement.setAttribute('dir', 'rtl');
    } else {
        document.documentElement.removeAttribute('dir');
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.innerHTML = window.t(el.getAttribute('data-i18n'));
    });
    
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = window.t(el.getAttribute('data-i18n-title'));
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = window.t(el.getAttribute('data-i18n-placeholder'));
    });
    
    const nameEl = document.getElementById('file-name');
    if (nameEl && nameEl.dataset.isDefault !== 'false') {
        nameEl.textContent = window.t('nav.defaultFile');
        nameEl.dataset.isDefault = 'true';
    }
}

function changeLanguage(lang) {
    localStorage.setItem('webpad_lang', lang);
    if (typeof i18next !== 'undefined') {
        i18next.changeLanguage(lang).then(() => {
            updateLanguageUI();
            if (typeof window.onLanguageChanged === 'function') {
                window.onLanguageChanged();
            }
        });
    } else {
        updateLanguageUI();
        if (typeof window.onLanguageChanged === 'function') {
            window.onLanguageChanged();
        }
    }
}

// Ensure global functions are available
window.changeLanguage = changeLanguage;
