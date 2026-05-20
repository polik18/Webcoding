// js/editor.js — Main Entry Point
// Responsibility: Global variable declarations, CodeMirror initialisation,
// keyboard shortcuts, sidebar resizer, i18n callbacks.
// All other logic is in js/core/ and js/features/ modules.

// ─── Global State ─────────────────────────────────────────────────────────────
// ⚠️  WARNING: DO NOT declare MAX_FILE_SIZE here!
//     It is already declared with `const` in js/core/fileio/constants.js (which loads before this file).
//     Declaring it again will cause:
//       → SyntaxError: Identifier 'MAX_FILE_SIZE' has already been declared
//       → This ENTIRE script will fail to execute
//       → window.editor stays undefined → tabs crash → editor is blank
//     If you need to change the value, edit js/core/fileio/constants.js.
window.editor = null;
window.mergeView = null;
window.isProgrammaticChange = false;

window.defaultCSS = `
<style>
    body { margin: 0; padding: 2rem; font-family: 'Inter', system-ui, sans-serif; line-height: 1.7; color: #334155; background-color: #ffffff; }
    .content-wrapper { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 2.25rem; font-weight: 800; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
    h2 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-top: 2rem; margin-bottom: 1rem; border-left: 4px solid #3b82f6; padding-left: 0.75rem; }
    p, ul, table { margin-bottom: 1.5rem; }
    ul { padding-left: 1.5rem; list-style-type: disc; }
    li { margin-bottom: 0.5rem; }
    strong { color: #0f172a; font-weight: 600; }
    code { background: #f1f5f9; color: #db2777; padding: 0.1rem 0.3rem; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    .highlight-box { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 1rem 1.25rem; color: #1d4ed8; font-size: 0.95rem; }
    table { border-collapse: collapse; width: 100%; }
    table td { border: 1px solid #e2e8f0; padding: 10px 12px; transition: background-color 0.2s; min-width: 50px; }
    table td:hover { background-color: #f1f5f9; cursor: text; }
</style>`;

// ─── i18n Callbacks ───────────────────────────────────────────────────────────
window.onI18nReady = () => {
    if (document.getElementById('problem-count').textContent === "0") {
        document.getElementById('panel-problems').innerHTML = `<div class="text-green-400 mt-2 p-2">${t('messages.msgPerfect')}</div>`;
    }
    tabManager.tabs.forEach(tab => {
        if (tab.isDefault) {
            tab.content = t('content.default');
            tab.name = t('nav.defaultFile');
            if (tab.id === tabManager.activeTabId && editor) {
                window.isProgrammaticChange = true;
                editor.setValue(tab.content);
                const ext = tab.name.split('.').pop().toLowerCase();
                const modes = { 'js': 'javascript', 'json': 'javascript', 'py': 'python', 'css': 'css', 'html': 'htmlmixed', 'md': 'markdown' };
                editor.setOption("mode", modes[ext] || 'htmlmixed');
                window.isProgrammaticChange = false;
                updateUI();
            }
        }
    });
    tabManager.renderTabs();
};

window.onLanguageChanged = () => {
    window.onI18nReady();
    if (editor && editor.state && editor.state.lint && editor.state.lint.marked) {
        setTimeout(() => { if (editor) editor.performLint && editor.performLint(); }, 100);
    }
    if (window.fileSystem) fileSystem.renderTree();
};

// ─── DOM Ready ────────────────────────────────────────────────────────────────
function initEditor() {
    // CodeMirror initialisation
    try {
        window.editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
            lineNumbers: true,
            theme: document.documentElement.classList.contains('dark') ? 'dracula' : 'default',
            mode: 'htmlmixed',
            indentUnit: 4,
            lineWrapping: true,
            matchBrackets: true,
            autoCloseBrackets: true,
            autoCloseTags: true,
            gutters: ["CodeMirror-lint-markers"],
            lint: true,
            keyMap: "sublime",
            extraKeys: {"Ctrl-Space": "autocomplete"}
        });
    } catch (err) {
        console.warn("CodeMirror not loaded (offline mode). Falling back to native textarea.");
        const ta = document.getElementById('code-editor');
        ta.style.display = 'block';
        ta.style.width = '100%';
        ta.style.height = '100%';
        ta.style.resize = 'none';
        ta.style.padding = '10px';
        ta.style.fontFamily = 'monospace';
        
        window.editor = {
            getValue: () => ta.value,
            setValue: (v) => { ta.value = v; },
            on: (event, cb) => {
                if (event === 'change') ta.addEventListener('input', cb);
                if (event === 'cursorActivity') ta.addEventListener('click', cb);
            },
            refresh: () => {},
            setOption: () => {},
            getOption: () => {},
            getCursor: () => ({line: 0, ch: 0}),
            setCursor: () => {},
            getSelections: () => [""],
            getSelection: () => "",
            replaceSelection: () => {},
            clearHistory: () => {},
            getHistory: () => null,
            setHistory: () => {},
            scrollTo: () => {},
            getScrollInfo: () => ({left: 0, top: 0, width: 0, height: 0}),
            focus: () => { ta.focus(); },
            execCommand: () => {},
            state: { lint: { marked: false } },
            performLint: () => {}
        };
    }

    if (window.editor) {
        window.editor.on('change', () => {
            if (window.isProgrammaticChange) return;
            tabManager.markUnsaved();
            updateStatus();
            if (getActive().mode === 'visual' || getActive().mode === 'split') syncCodeToVisual();
        });
        window.editor.on('cursorActivity', () => {
            updateStatus();
            const tab = getActive();
            if (tab && tab.mode === 'split' && typeof syncSelectionToVisual === 'function') syncSelectionToVisual();
        });
    }

    initVisualFrame();

    window.addEventListener('beforeunload', (e) => {
        tabManager.saveToStorage();
        if (tabManager.tabs.some(t => t.isUnsaved)) {
            e.preventDefault();
            e.returnValue = '您有未下載的檔案。瀏覽器暫存區的資料在清除快取後會消失，建議先下載儲存。';
        }
    });

    if (!sessionStorage.getItem('autosave_notice_shown')) {
        sessionStorage.setItem('autosave_notice_shown', '1');
        setTimeout(() => { showToast('💾 自動暫存已啟用 — 資料存於瀏覽器 IndexedDB，清除快取才會消失', 'info'); }, 3000);
    }

    // Image paste handler → QR/OCR dialog
    document.addEventListener('paste', (e) => {
        const items = (e.clipboardData || {}).items; if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file && typeof window.handleImageFile === 'function') window.handleImageFile(file);
                return;
            }
        }
    });

    // Auto-save every 5 s
    setInterval(() => tabManager.saveToStorage(), 5000);

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); runCode(); }
        if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveFile(); }
        if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); openFile(); }
    });

    // Wait for fileSystem to be ready before initializing tabs
    const waitForFS = new Promise(resolve => {
        if (window.fileSystemReady) {
            resolve();
        } else {
            const check = setInterval(() => {
                if (window.fileSystemReady) {
                    clearInterval(check);
                    resolve();
                }
            }, 50);
            // Timeout after 2s — initialize anyway
            setTimeout(() => { clearInterval(check); resolve(); }, 2000);
        }
    });
    waitForFS.then(() => tabManager.init());

    // If i18n.js fell back synchronously (offline mode), onI18nReady was missed. Call it now.
    if (typeof i18next === 'undefined' && typeof window.onI18nReady === 'function') {
        window.onI18nReady();
    }

    // ── Split-view resizer ───────────────────────────────────────────────────
    const splitResizer = document.getElementById('split-resizer');
    if (splitResizer) {
        let isSplitResizing = false;
        splitResizer.addEventListener('mousedown', (e) => { isSplitResizing = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; const vf = document.getElementById('visual-frame'); if (vf) vf.style.pointerEvents = 'none'; });
        document.addEventListener('mousemove', (e) => {
            if (!isSplitResizing) return;
            const main = document.querySelector('main'); const mainRect = main.getBoundingClientRect();
            const ec = document.getElementById('editor-container'); const vc = document.getElementById('visual-container');
            const sidebar = document.getElementById('sidebar'); const sidebarW = sidebar.classList.contains('sidebar-collapsed') ? 0 : sidebar.offsetWidth;
            const resizerW = document.getElementById('sidebar-resizer').offsetWidth; const splitResizerW = splitResizer.offsetWidth;
            const availableW = mainRect.width - sidebarW - resizerW - splitResizerW;
            let editorW = e.clientX - mainRect.left - sidebarW - resizerW;
            editorW = Math.max(200, Math.min(editorW, availableW - 200));
            ec.style.width = editorW + 'px'; ec.style.flexGrow = '0'; ec.style.flexShrink = '0';
            vc.style.width = (availableW - editorW) + 'px'; vc.style.flexGrow = '0'; vc.style.flexShrink = '0';
            if (editor) editor.refresh();
        });
        document.addEventListener('mouseup', () => { if (isSplitResizing) { isSplitResizing = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; const vf = document.getElementById('visual-frame'); if (vf) vf.style.pointerEvents = ''; } });
    }
}

initEditor();
