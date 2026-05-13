// js/editor.js

const MAX_FILE_SIZE = 2 * 1024 * 1024;
let editor, mergeView = null, pyodideInstance = null;
let isProgrammaticChange = false;

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

class TabManager {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this.counter = 1;
        this.storageKey = 'webpad_tabs_v2';
    }

    async init() {
        const saved = await localforage.getItem(this.storageKey);
        if (saved && saved.tabs && saved.tabs.length > 0) {
            this.tabs = saved.tabs;
            this.counter = saved.counter || 1;
            this.switchToTab(saved.activeTabId || this.tabs[0].id);
        } else {
            this.createNewTab(t('nav.defaultFile'), t('content.default'), true);
        }
    }

    async saveToStorage() {
        if (window.isResetting) return;
        if (this.activeTabId && editor) {
            const activeTab = this.getActiveTab();
            if (activeTab) {
                activeTab.content = editor.getValue();
                // Sync spreadsheet DOM → data → tab before persisting
                if (activeTab.mode === 'spreadsheet' && typeof window._syncAndSaveSheetToTab === 'function') {
                    window._syncAndSaveSheetToTab(activeTab);
                }
            }
        }
        await localforage.setItem(this.storageKey, {
            tabs: this.tabs.map(t => ({...t, history: null})), 
            activeTabId: this.activeTabId,
            counter: this.counter
        });
    }

    createNewTab(name, content = "", isDefault = false, fsId = null) {
        const id = 'tab_' + Date.now() + '_' + this.counter++;
        const tabName = name || `${t('nav.untitled')}-${this.counter}.txt`;

        // Auto-create a FS node for every non-default, non-fs-linked tab
        let resolvedFsId = fsId;
        if (!resolvedFsId && !isDefault && window.fileSystem && window.fileSystem.nodes) {
            // Ensure unique filename inside root
            let nodeName = tabName;
            const hasDup = (n) => window.fileSystem.nodes.some(nd => nd.parentId === 'root' && nd.name === n);
            if (hasDup(nodeName)) {
                const ext = nodeName.includes('.') ? '.' + nodeName.split('.').pop() : '';
                const base = ext ? nodeName.slice(0, -ext.length) : nodeName;
                let i = 1;
                while (hasDup(`${base}-${i}${ext}`)) i++;
                nodeName = `${base}-${i}${ext}`;
            }
            const fsNode = window.fileSystem._createNodeSilent('file', 'root', nodeName);
            if (fsNode) {
                fsNode.content = content;
                resolvedFsId = fsNode.id;
                window.fileSystem.save();
                window.fileSystem.renderTree();
            }
        }

        const newTab = {
            id,
            fsId: resolvedFsId,
            name: tabName,
            isDefault: isDefault,
            content: content,
            eol: '\n',
            encoding: 'utf-8',
            mode: 'code',
            isUnsaved: !isDefault,
            history: null,
            scrollInfo: null,
            cursor: null,
            fileBuffer: null
        };
        this.tabs.push(newTab);
        this.switchToTab(id);
    }

    getActiveTab() {
        return this.tabs.find(t => t.id === this.activeTabId);
    }

    switchToTab(id) {
        const currentTab = this.getActiveTab();
        if (currentTab && editor) {
            currentTab.content = editor.getValue();
            currentTab.history = editor.getHistory();
            currentTab.cursor = editor.getCursor();
            currentTab.scrollInfo = editor.getScrollInfo();
            // Save spreadsheet state when leaving a spreadsheet tab
            if (currentTab.mode === 'spreadsheet' && typeof window._syncAndSaveSheetToTab === 'function') {
                window._syncAndSaveSheetToTab(currentTab);
            }
        }

        this.activeTabId = id;
        const newTab = this.getActiveTab();
        if (!newTab) return;

        isProgrammaticChange = true;
        if (editor) {
            editor.setValue(newTab.content || '');
            if (newTab.history) editor.setHistory(newTab.history);
            else editor.clearHistory();
            if (newTab.cursor) editor.setCursor(newTab.cursor);
            if (newTab.scrollInfo) editor.scrollTo(newTab.scrollInfo.left, newTab.scrollInfo.top);
        }
        isProgrammaticChange = false;

        this.renderTabs();
        this.saveToStorage();
        updateUI();
        if (newTab.mode === 'visual') switchToVisual();
        else if (newTab.mode === 'split') switchToSplit();
        else if (newTab.mode === 'spreadsheet') {
            // Restore this tab's spreadsheet data
            if (typeof window.restoreSpreadsheetTab === 'function') {
                window.restoreSpreadsheetTab(newTab);
            } else {
                switchToSpreadsheet();
            }
        }
        else switchToCode();
    }

    closeTab(id, e) {
        if (e) e.stopPropagation();
        const tab = this.tabs.find(t => t.id === id);
        if (tab.isUnsaved) {
            if (!confirm(t('messages.confirmClose').replace('{{name}}', tab.name))) {
                return;
            }
        }
        
        // Actually, let's just close it. We rely on the user.
        this.tabs = this.tabs.filter(t => t.id !== id);
        if (this.tabs.length === 0) {
            this.createNewTab();
        } else if (this.activeTabId === id) {
            this.switchToTab(this.tabs[this.tabs.length - 1].id);
        } else {
            this.renderTabs();
            this.saveToStorage();
        }
    }

    renderTabs() {
        const container = document.getElementById('tabs-container');
        container.innerHTML = '';
        this.tabs.forEach(tab => {
            const isActive = tab.id === this.activeTabId;
            const div = document.createElement('div');
            const ms = document.documentElement.getAttribute('dir') === 'rtl' ? 'ml' : 'mr';
            div.className = `group flex items-center h-full px-3 sm:px-4 cursor-pointer border-e border-gray-300 dark:border-gray-700 transition-colors ${isActive ? 'bg-white dark:bg-gray-900 border-t-2 border-t-blue-500' : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-t-2 border-t-transparent'}`;
            div.onclick = (e) => {
                if (this.activeTabId === tab.id) {
                    this.startInlineRename(tab.id, e, div.querySelector('.tab-title-span'));
                } else {
                    this.switchToTab(tab.id);
                }
            };
            div.onauxclick = (e) => { if(e.button === 1) this.closeTab(tab.id, e); }; // middle click

            const dot = tab.isUnsaved ? `<span class="w-2 h-2 rounded-full bg-yellow-500 mr-2 ms-0 me-2"></span>` : '';
            div.innerHTML = `
                ${dot}
                <span class="tab-title-span text-xs sm:text-sm max-w-[120px] truncate ${isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}" ondblclick="tabManager.startInlineRename('${tab.id}', event, this)">${tab.name}</span>
                <input type="text" class="tab-rename-input hidden text-xs sm:text-sm" value="${tab.name}" onblur="tabManager.finishInlineRename('${tab.id}', this)" onkeydown="if(event.key==='Enter') this.blur(); if(event.key==='Escape') { this.value='${tab.name}'; this.blur(); }">
                <button onclick="tabManager.closeTab('${tab.id}', event)" class="ms-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                    <i class="fa-solid fa-xmark text-[10px]"></i>
                </button>
            `;
            container.appendChild(div);
        });
    }

    startInlineRename(tabId, event, spanEl) {
        event.stopPropagation();
        const inputEl = spanEl.nextElementSibling;
        spanEl.classList.add('hidden');
        inputEl.classList.remove('hidden');
        inputEl.focus();
        inputEl.select();
    }

    finishInlineRename(tabId, inputEl) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        let newName = inputEl.value.trim();
        if (newName && newName !== tab.name) {
            tab.name = newName;
            tab.isDefault = false;
            // Update filesystem if it's linked
            if (tab.fsId && window.fileSystem) {
                const node = window.fileSystem.getNode(tab.fsId);
                if (node) {
                    node.name = newName;
                    window.fileSystem.save();
                    window.fileSystem.renderTree();
                }
            }
            // Update document title if active
            if (this.activeTabId === tabId) {
                document.getElementById('current-filename').textContent = newName;
                document.title = newName + " - WebPad++";
                if (editor) {
                    const ext = newName.split('.').pop().toLowerCase();
                    const modes = { 'js': 'javascript', 'json': 'javascript', 'py': 'python', 'css': 'css', 'html': 'htmlmixed' };
                    editor.setOption("mode", modes[ext] || 'htmlmixed');
                }
            }
            this.saveTabs();
        }
        this.renderTabs();
    }

    markUnsaved() {
        const tab = this.getActiveTab();
        if (tab && !tab.isUnsaved) {
            tab.isUnsaved = true;
            tab.isDefault = false;
            this.renderTabs();
            updateUI();
        }
    }
}
window.tabManager = new TabManager();
const tabManager = window.tabManager;

// Aliases for compatibility
function getActive() { return tabManager.getActiveTab() || {}; }

window.onI18nReady = () => {
    if (document.getElementById('problem-count').textContent === "0") {
        document.getElementById('panel-problems').innerHTML = `<div class="text-green-400 mt-2 p-2">${t('messages.msgPerfect')}</div>`;
    }
    // Update default tabs if they haven't been modified
    tabManager.tabs.forEach(tab => {
        if (tab.isDefault) {
            tab.content = t('content.default');
            tab.name = t('nav.defaultFile');
            if (tab.id === tabManager.activeTabId && editor) {
                isProgrammaticChange = true;
                editor.setValue(tab.content);
                const ext = tab.name.split('.').pop().toLowerCase();
                const modes = { 'js': 'javascript', 'json': 'javascript', 'py': 'python', 'css': 'css', 'html': 'htmlmixed', 'md': 'markdown' };
                editor.setOption("mode", modes[ext] || 'htmlmixed');
                isProgrammaticChange = false;
                updateUI();
            }
        }
    });
    tabManager.renderTabs();
};

window.onLanguageChanged = () => {
    window.onI18nReady();
    // Force linting re-run so the Problems panel uses the new locale strings
    if (editor && editor.state && editor.state.lint && editor.state.lint.marked) {
        setTimeout(() => { if (editor) editor.performLint && editor.performLint(); }, 100);
    }
    // Re-render the file tree so tooltips update
    if (window.fileSystem) fileSystem.renderTree();
};

document.addEventListener('DOMContentLoaded', () => {
    editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
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

    editor.on('change', () => { 
        if (isProgrammaticChange) return;
        tabManager.markUnsaved();
        updateStatus(); 
        if (getActive().mode === 'visual' || getActive().mode === 'split') syncCodeToVisual(); 
    });
    
    editor.on('cursorActivity', () => {
        updateStatus();
        const tab = getActive();
        if (tab && tab.mode === 'split') {
            if (typeof syncSelectionToVisual === 'function') syncSelectionToVisual();
        }
    });
    
    initVisualFrame();

    window.addEventListener('beforeunload', (e) => {
        tabManager.saveToStorage();
        if (tabManager.tabs.some(t => t.isUnsaved)) {
            e.preventDefault();
            // Modern browsers show generic text; we use returnValue as a hint for older ones
            e.returnValue = '您有未下載的檔案。瀏覽器暫存區的資料在清除快取後會消失，建議先下載儲存。';
        }
    });

    // Show auto-save info toast once per session
    if (!sessionStorage.getItem('autosave_notice_shown')) {
        sessionStorage.setItem('autosave_notice_shown', '1');
        setTimeout(() => {
            showToast('💾 自動暫存已啟用 — 資料存於瀏覽器 IndexedDB，清除快取才會消失', 'info');
        }, 3000);
    }

    // Paste handler: intercept image pastes for QR/OCR
    document.addEventListener('paste', (e) => {
        const items = (e.clipboardData || {}).items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file && typeof window.handleImageFile === 'function') {
                    window.handleImageFile(file);
                }
                return;
            }
        }
    });
    
    // Auto-save to IndexedDB every 5 seconds
    setInterval(() => tabManager.saveToStorage(), 5000);

    document.addEventListener('keydown', (e) => { 
        if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); runCode(); } 
        if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveFile(); }
        if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); openFile(); }
    });

    tabManager.init();

    // Split-view horizontal resizer
    const splitResizer = document.getElementById('split-resizer');
    if (splitResizer) {
        let isSplitResizing = false;
        splitResizer.addEventListener('mousedown', (e) => {
            isSplitResizing = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            const vf = document.getElementById('visual-frame');
            if (vf) vf.style.pointerEvents = 'none';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isSplitResizing) return;
            const main = document.querySelector('main');
            const mainRect = main.getBoundingClientRect();
            const ec = document.getElementById('editor-container');
            const vc = document.getElementById('visual-container');
            const sidebar = document.getElementById('sidebar');
            const sidebarW = sidebar.classList.contains('sidebar-collapsed') ? 0 : sidebar.offsetWidth;
            const resizerW = document.getElementById('sidebar-resizer').offsetWidth;
            const splitResizerW = splitResizer.offsetWidth;
            const availableW = mainRect.width - sidebarW - resizerW - splitResizerW;
            let editorW = e.clientX - mainRect.left - sidebarW - resizerW;
            editorW = Math.max(200, Math.min(editorW, availableW - 200));
            ec.style.width = editorW + 'px';
            ec.style.flexGrow = '0'; ec.style.flexShrink = '0';
            vc.style.width = (availableW - editorW) + 'px';
            vc.style.flexGrow = '0'; vc.style.flexShrink = '0';
            if (editor) editor.refresh();
        });
        document.addEventListener('mouseup', () => {
            if (isSplitResizing) {
                isSplitResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                const vf = document.getElementById('visual-frame');
                if (vf) vf.style.pointerEvents = '';
            }
        });
    }
});

function _bindVisualFrameInput(doc) {
    // Remove any existing listener to avoid duplicates, then re-bind.
    // We store a named function reference on the doc object so we can remove it.
    if (doc.__visualInputHandler) {
        doc.body.removeEventListener('input', doc.__visualInputHandler);
    }
    doc.__visualInputHandler = () => {
        const mode = getActive().mode;
        if (mode === 'visual' || mode === 'split') syncVisualToCode();
    };
    doc.body.addEventListener('input', doc.__visualInputHandler);

    if (doc.__visualSelectionHandler) {
        doc.removeEventListener('selectionchange', doc.__visualSelectionHandler);
    }
    doc.__visualSelectionHandler = () => {
        const mode = getActive().mode;
        if (mode === 'split' && typeof syncSelectionToCode === 'function') {
            syncSelectionToCode();
        }
    };
    doc.addEventListener('selectionchange', doc.__visualSelectionHandler);
}

function initVisualFrame() {
    const doc = document.getElementById('visual-frame').contentWindow.document;
    doc.open(); 
    doc.write('<html><head></head><body style="padding: 20px; font-family: sans-serif;" contenteditable="true"></body></html>'); 
    doc.close();
    _bindVisualFrameInput(doc);
}

// ─── unified mode-button helper ───────────────────────────────────────────
function _setActiveBtn(activeId) {
    ['mode-code-btn', 'mode-split-btn', 'mode-visual-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (id === activeId) {
            btn.classList.add('bg-blue-600', 'text-white', 'shadow-sm');
            btn.classList.remove('text-gray-700', 'text-gray-300', 'hover:bg-gray-200');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white', 'shadow-sm');
            btn.classList.add('text-gray-700', 'hover:bg-gray-200');
        }
    });
}

function _hideAllPanels() {
    ['editor-container','visual-container','merge-container','spreadsheet-container'].forEach(cid => {
        const el = document.getElementById(cid);
        if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
    });
    const sp = document.getElementById('split-resizer');
    if (sp) sp.classList.add('hidden');
}

function switchToCode() {
    if (getActive()) getActive().mode = 'code';
    _setActiveBtn('mode-code-btn');
    _hideAllPanels();
    const ec = document.getElementById('editor-container');
    const vc = document.getElementById('visual-container');
    // ec fills all space; vc is hidden but reset to neutral
    ec.style.width    = '';  ec.style.flexGrow = '1';  ec.style.flexShrink = '1';
    vc.style.width    = '';  vc.style.flexGrow = '0';  vc.style.flexShrink = '1';
    ec.classList.remove('hidden'); ec.classList.add('flex');
    vc.classList.add('hidden');    vc.classList.remove('flex');
    setTimeout(() => editor.refresh(), 10);
}

function switchToVisual() {
    if (getActive()) getActive().mode = 'visual';
    _setActiveBtn('mode-visual-btn');
    _hideAllPanels();
    const ec = document.getElementById('editor-container');
    const vc = document.getElementById('visual-container');
    // vc must fill ALL remaining space — explicit flexGrow:1 is the key fix
    ec.style.width    = '';  ec.style.flexGrow = '0';  ec.style.flexShrink = '1';
    vc.style.width    = '';  vc.style.flexGrow = '1';  vc.style.flexShrink = '1';
    ec.classList.add('hidden');    ec.classList.remove('flex');
    vc.classList.remove('hidden'); vc.classList.add('flex');
    syncCodeToVisual();
}

function switchToSplit() {
    if (getActive()) getActive().mode = 'split';
    _setActiveBtn('mode-split-btn');
    _hideAllPanels();
    const ec = document.getElementById('editor-container');
    const vc = document.getElementById('visual-container');
    const sp = document.getElementById('split-resizer');
    // Hard 50/50 reset — override any previous resize or flexGrow state
    ec.style.width = '50%'; ec.style.flexGrow = '0'; ec.style.flexShrink = '0';
    vc.style.width = '50%'; vc.style.flexGrow = '0'; vc.style.flexShrink = '0';
    ec.classList.remove('hidden'); ec.classList.add('flex');
    vc.classList.remove('hidden'); vc.classList.add('flex');
    if (sp) sp.classList.remove('hidden');
    syncCodeToVisual();
    setTimeout(() => editor.refresh(), 10);
}

function switchToSpreadsheet() {
    if (getActive()) getActive().mode = 'spreadsheet';
    _setActiveBtn('mode-code-btn');
    _hideAllPanels();
    const sc = document.getElementById('spreadsheet-container');
    if (sc) { sc.style.flexGrow = '1'; sc.classList.remove('hidden'); sc.classList.add('flex'); }
}

// Prevent re-entrant loops: visual input → syncVisualToCode → editor.setValue → editor.on('change') → syncCodeToVisual
let isSyncingVisual = false;

function syncCodeToVisual() {
    if (isSyncingVisual) return;
    const frame = document.getElementById('visual-frame');
    const doc = frame.contentDocument || frame.contentWindow.document;
    const isDark = document.documentElement.classList.contains('dark');
    
    let content = editor.getValue();
    const tab = getActive();
    
    // Professional Visual Theme CSS
    const themeCss = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        :root {
            --bg: ${isDark ? '#0f172a' : '#ffffff'};
            --text: ${isDark ? '#e2e8f0' : '#1e293b'};
            --link: ${isDark ? '#60a5fa' : '#2563eb'};
            --code-bg: ${isDark ? '#1e293b' : '#f1f5f9'};
            --border: ${isDark ? '#334155' : '#e2e8f0'};
            --h-color: ${isDark ? '#f8fafc' : '#0f172a'};
            --blockquote: ${isDark ? '#475569' : '#94a3b8'};
        }
        body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            line-height: 1.7; 
            color: var(--text); 
            background: var(--bg); 
            padding: 40px; 
            max-width: 900px; 
            margin: 0 auto; 
            transition: background 0.3s, color 0.3s;
        }
        h1, h2, h3, h4 { color: var(--h-color); font-weight: 700; margin-top: 2em; margin-bottom: 1em; line-height: 1.3; }
        h1 { font-size: 2.25rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
        h2 { font-size: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
        p { margin-bottom: 1.25em; }
        a { color: var(--link); text-decoration: none; }
        a:hover { text-decoration: underline; }
        code { 
            font-family: 'JetBrains Mono', monospace; 
            background: var(--code-bg); 
            padding: 0.2em 0.4em; 
            border-radius: 6px; 
            font-size: 0.9em; 
        }
        pre { 
            background: var(--code-bg); 
            padding: 1.5rem; 
            border-radius: 12px; 
            overflow-x: auto; 
            border: 1px solid var(--border);
            margin: 1.5em 0;
        }
        pre code { background: transparent; padding: 0; }
        blockquote { 
            border-left: 4px solid var(--border); 
            margin: 1.5em 0; 
            padding: 0.5em 1.5rem; 
            color: var(--blockquote); 
            background: ${isDark ? 'rgba(51,65,85,0.2)' : 'rgba(241,245,249,0.5)'};
            border-radius: 0 8px 8px 0;
        }
        table { width: 100%; border-collapse: collapse; margin: 1.5em 0; border: 1px solid var(--border); }
        th, td { border: 1px solid var(--border); padding: 12px 15px; text-align: left; }
        th { background: var(--code-bg); font-weight: 600; }
        img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        hr { border: 0; border-top: 2px solid var(--border); margin: 2em 0; }
        ul, ol { padding-left: 1.5em; margin-bottom: 1.25em; }
        li { margin-bottom: 0.5em; }
    `;

    const isMarkdown = tab && (tab.name.toLowerCase().endsWith('.md') || tab.name.toLowerCase().endsWith('.markdown') || tab.docType === 'md');
    let isHtml = tab && (tab.name.toLowerCase().endsWith('.html') || tab.name.toLowerCase().endsWith('.htm') || tab.docType === 'docx' || tab.docType === 'odt' || tab.docType === 'pdf-text');
    
    // Content Sniffing: If it looks like HTML, treat it as HTML even if it's a .txt or untitled file
    if (!isMarkdown && !isHtml && content.trim().startsWith('<')) {
        if (/<(html|doctype|body|div|span|p|h[1-6]|a|img|table|ul|li|section|header|footer|nav|style)[>\s]/i.test(content)) {
            isHtml = true;
        }
    }
    
    let htmlContent;
    if (isMarkdown) {
        htmlContent = typeof marked !== 'undefined' ? marked.parse(content) : content;
    } else if (isHtml) {
        let bodyContent = content;
        // If content contains a full HTML document, extract only the body content
        // to avoid putting <html> and <head> inside doc.body.innerHTML
        const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        if (bodyMatch) {
            bodyContent = bodyMatch[1];
        }
        htmlContent = bodyContent;
    } else {
        const escapedContent = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        htmlContent = `<pre><code style="font-family: 'JetBrains Mono', monospace;">${escapedContent}</code></pre>`;
    }
    
    const isInitialized = doc.body && doc.head && doc.head.querySelector('style[data-theme="visual"]');
    
    if (isInitialized) {
        const scrollTop = doc.documentElement.scrollTop || doc.body.scrollTop;
        doc.body.innerHTML = htmlContent;
        doc.documentElement.scrollTop = doc.body.scrollTop = scrollTop;
    } else {
        const fullHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style data-theme="visual">${themeCss}</style>
</head>
<body spellcheck="false" class="markdown-body">
    ${htmlContent}
</body>
</html>`;

        doc.open();
        doc.write(fullHtml);
        doc.close();
    }
    
    if (doc.body) {
        // Always enable contentEditable in visual/split mode so the user can edit the preview
        const activeMode = tab ? tab.mode : 'code';
        doc.body.contentEditable = (activeMode === 'visual' || activeMode === 'split') ? 'true' : 'false';
        // Re-bind the input→sync handler because doc.write() destroys previous listeners
        _bindVisualFrameInput(doc);
    }
}

function formatHTML(html) {
    let formatted = ''; let pad = 0;
    html = html.replace(/\r?\n/g, '').replace(/(>)(<)(\/*)/g, '$1\n$2$3');
    html.split('\n').forEach(function(line) {
        let indent = 0;
        if (line.match(/.+<\/\w[^>]*>$/)) { indent = 0; }
        else if (line.match(/^<\/\w/)) { if (pad !== 0) pad -= 1; }
        else if (line.match(/^<\w([^>]*[^\/])?>.*$/)) { indent = 1; }
        formatted += '    '.repeat(pad) + line + '\n';
        pad += indent;
    });
    return formatted.trim();
}

let syncTimeout = null;
let turndownService = null;

function syncVisualToCode() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        const frame = document.getElementById('visual-frame');
        const doc = frame.contentDocument || frame.contentWindow.document;
        const tab = getActive();
        if (!tab) return;
        // Only sync back when in visual or split mode
        if (tab.mode !== 'visual' && tab.mode !== 'split') return;

        isSyncingVisual = true;
        const cursorPos = editor.getCursor();
        isProgrammaticChange = true;
        
        if (tab.name.toLowerCase().endsWith('.md') || tab.name.toLowerCase().endsWith('.markdown') || tab.docType === 'md') {
            if (typeof TurndownService !== 'undefined') {
                if (!turndownService) {
                    turndownService = new TurndownService({ 
                        headingStyle: 'atx', 
                        codeBlockStyle: 'fenced',
                        hr: '---',
                        bulletListMarker: '-'
                    });
                }
                // Only convert the BODY content to avoid Turndown processing the <style> tags
                const markdownContent = turndownService.turndown(doc.body.innerHTML);
                editor.setValue(markdownContent);
            }
        } else {
            // For HTML files, clean up and format
            const bodyHtml = doc.body.innerHTML;
            let cleanHTML = bodyHtml
                .replace(/ contenteditable="(true|false)"/gi, '')
                .replace(/ contenteditable/gi, '');
            // Wrap back in a basic HTML5 structure if it's a full page
            if (editor.getValue().toLowerCase().includes('<html')) {
                cleanHTML = `<!DOCTYPE html>\n<html>\n<head>\n    <meta charset="utf-8">\n    <title>${tab.name}</title>\n</head>\n<body>\n${cleanHTML}\n</body>\n</html>`;
            }
            editor.setValue(formatHTML(cleanHTML));
        }
        
        editor.setCursor(cursorPos);
        isProgrammaticChange = false;
        isSyncingVisual = false;
        tabManager.markUnsaved();
    }, 500);
}

let modalCallback = null;
function showCustomPrompt(title, message, defaultValue, callback) {
    const modal = document.getElementById('custom-modal'); const content = document.getElementById('custom-modal-content');
    document.getElementById('custom-modal-title').textContent = title; document.getElementById('custom-modal-message').textContent = message;
    const inputEl = document.getElementById('custom-modal-input');
    inputEl.value = defaultValue || ''; modalCallback = callback;
    inputEl.classList.remove('hidden');
    modal.classList.remove('hidden'); void modal.offsetWidth;
    content.classList.remove('scale-95', 'opacity-0'); content.classList.add('scale-100', 'opacity-100');
    inputEl.focus(); if (defaultValue) inputEl.select();
}

function showCustomConfirm(title, message, callback) {
    const modal = document.getElementById('custom-modal'); const content = document.getElementById('custom-modal-content');
    document.getElementById('custom-modal-title').textContent = title; document.getElementById('custom-modal-message').textContent = message;
    const inputEl = document.getElementById('custom-modal-input');
    inputEl.classList.add('hidden');
    modalCallback = () => { inputEl.classList.remove('hidden'); callback(true); };
    modal.classList.remove('hidden'); void modal.offsetWidth;
    content.classList.remove('scale-95', 'opacity-0'); content.classList.add('scale-100', 'opacity-100');
    document.getElementById('custom-modal-confirm').focus();
}

function closeCustomModal() {
    const modal = document.getElementById('custom-modal'); const content = document.getElementById('custom-modal-content');
    content.classList.remove('scale-100', 'opacity-100'); content.classList.add('scale-95', 'opacity-0');
    document.getElementById('custom-modal-input').classList.remove('hidden');
    setTimeout(() => { modal.classList.add('hidden'); modalCallback = null; }, 200);
}

document.getElementById('custom-modal-cancel').addEventListener('click', closeCustomModal);
document.getElementById('custom-modal-confirm').addEventListener('click', () => {
    if (modalCallback) modalCallback(document.getElementById('custom-modal-input').value); closeCustomModal();
});
document.getElementById('custom-modal-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('custom-modal-confirm').click(); }
    if (e.key === 'Escape') { e.preventDefault(); closeCustomModal(); }
});

let isSyncingSelection = false;

function syncSelectionToVisual() {
    if (isSyncingSelection || isSyncingVisual) return;
    const tab = getActive();
    if (!tab || tab.mode !== 'split') return;

    const frame = document.getElementById('visual-frame');
    if (!frame) return;
    const win = frame.contentWindow;
    const doc = win.document;
    if (!doc.body) return;
    
    isSyncingSelection = true;
    
    try {
        const cursor = editor.getCursor();
        const isSelection = editor.somethingSelected();
        let snippet = '';
        let offsetInSnippet = 0;
        
        if (isSelection) {
            snippet = editor.getSelection().replace(/[#*`_>\\[\\]\\(\\)]/g, '').trim();
        } else {
            const line = editor.getLine(cursor.line);
            if (line !== undefined && line !== null) {
                const start = Math.max(0, cursor.ch - 12);
                const end = Math.min(line.length, cursor.ch + 12);
                const leftText = line.substring(start, cursor.ch).replace(/[#*`_>\\[\\]\\(\\)]/g, '');
                const rightText = line.substring(cursor.ch, end).replace(/[#*`_>\\[\\]\\(\\)]/g, '');
                snippet = leftText + rightText;
                offsetInSnippet = leftText.length;
            }
        }
        
        if (snippet && snippet.length > 0) {
            const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
            const nodes = [];
            let fullText = "";
            let node;
            while(node = walker.nextNode()) {
                const val = node.nodeValue;
                nodes.push({ node, start: fullText.length, end: fullText.length + val.length });
                fullText += val;
            }
            
            const matchIndex = fullText.indexOf(snippet);
            if (matchIndex !== -1) {
                const sel = win.getSelection();
                sel.removeAllRanges();
                const range = doc.createRange();
                
                const findPos = (targetIdx) => {
                    for (const n of nodes) {
                        if (targetIdx >= n.start && targetIdx <= n.end) {
                            return { node: n.node, offset: targetIdx - n.start };
                        }
                    }
                    if (nodes.length > 0) {
                        const last = nodes[nodes.length - 1];
                        return { node: last.node, offset: last.node.nodeValue.length };
                    }
                    return null;
                };
                
                const startPos = findPos(isSelection ? matchIndex : matchIndex + offsetInSnippet);
                const endPos = findPos(isSelection ? matchIndex + snippet.length : matchIndex + offsetInSnippet);
                
                if (startPos && endPos) {
                    range.setStart(startPos.node, startPos.offset);
                    range.setEnd(endPos.node, endPos.offset);
                    sel.addRange(range);
                    
                    let scrollNode = startPos.node;
                    if (scrollNode.nodeType === 3) scrollNode = scrollNode.parentNode;
                    if (scrollNode && scrollNode.scrollIntoView) {
                        scrollNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }
        }
    } catch(e) { console.error('Sync to visual error:', e); }
    
    setTimeout(() => { isSyncingSelection = false; }, 300);
}

function syncSelectionToCode() {
    if (isSyncingSelection || isSyncingVisual) return;
    const tab = getActive();
    if (!tab || tab.mode !== 'split') return;

    const frame = document.getElementById('visual-frame');
    if (!frame) return;
    const win = frame.contentWindow;
    
    const sel = win.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    
    isSyncingSelection = true;
    
    try {
        const isSelection = !sel.isCollapsed;
        let snippet = '';
        let offsetInSnippet = 0;
        
        if (isSelection) {
            snippet = sel.toString().trim();
        } else {
            const node = sel.anchorNode;
            if (node && node.nodeType === 3) {
                const text = node.textContent;
                const offset = sel.anchorOffset;
                const start = Math.max(0, offset - 10);
                const end = Math.min(text.length, offset + 10);
                const leftText = text.substring(start, offset);
                const rightText = text.substring(offset, end);
                snippet = leftText + rightText;
                offsetInSnippet = leftText.length;
            }
        }
        
        if (snippet && snippet.length > 0) {
            let found = false;
            let targetPos = null;
            let targetEnd = null;

            const cursor = editor.getSearchCursor(snippet);
            if (cursor.findNext()) {
                found = true;
                if (isSelection) {
                    targetPos = cursor.from();
                    targetEnd = cursor.to();
                } else {
                    targetPos = { line: cursor.from().line, ch: cursor.from().ch + offsetInSnippet };
                }
            } else {
                if (!isSelection) {
                    const leftText = snippet.substring(0, offsetInSnippet).trim();
                    const leftCursor = editor.getSearchCursor(leftText);
                    if (leftText.length > 1 && leftCursor.findNext()) {
                        found = true;
                        targetPos = leftCursor.to();
                    } else {
                        const rightText = snippet.substring(offsetInSnippet).trim();
                        const rightCursor = editor.getSearchCursor(rightText);
                        if (rightText.length > 1 && rightCursor.findNext()) {
                            found = true;
                            targetPos = rightCursor.from();
                        }
                    }
                } else if (isSelection && snippet.length > 1) {
                    const words = snippet.split(/\\s+/).filter(w => w.length > 1);
                    if (words.length > 0) {
                        const subCursor = editor.getSearchCursor(words[0]);
                        if (subCursor.findNext()) {
                            found = true;
                            targetPos = subCursor.from();
                            targetEnd = subCursor.to();
                        }
                    }
                }
            }

            if (found) {
                if (isSelection && targetEnd) {
                    editor.setSelection(targetPos, targetEnd);
                } else {
                    editor.setCursor(targetPos);
                }
                editor.scrollIntoView(targetPos, 100);
            }
        }
    } catch(e) { console.error('Sync to code error:', e); }
    
    setTimeout(() => { isSyncingSelection = false; }, 300);
}

let visualSelectionRange = null;
function saveVisualSelection() {
    const sel = document.getElementById('visual-frame').contentWindow.getSelection();
    if (sel.rangeCount > 0) visualSelectionRange = sel.getRangeAt(0).cloneRange();
}

function execCmd(command, value = null) {
    const frame = document.getElementById('visual-frame');
    frame.contentDocument.execCommand('styleWithCSS', false, true);
    frame.contentDocument.execCommand(command, false, value);
    frame.contentWindow.focus(); syncVisualToCode();
}

function applyTextColor(color) {
    const win = document.getElementById('visual-frame').contentWindow; win.focus(); 
    if (visualSelectionRange) { const sel = win.getSelection(); sel.removeAllRanges(); sel.addRange(visualSelectionRange); }
    win.document.execCommand('styleWithCSS', false, true); win.document.execCommand('foreColor', false, color);
    syncVisualToCode();
}

function insertImagePrompt() { showCustomPrompt(t('visual.insertImg'), t('messages.promptImg'), "https://", (url) => { if(url) execCmd('insertImage', url); }); }
function insertLinkPrompt() { showCustomPrompt(t('visual.insertLink'), t('messages.promptLink'), "https://", (url) => { if(url) execCmd('createLink', url); }); }
function insertTablePrompt() {
    showCustomPrompt(t('visual.insertTable'), t('messages.promptTableMsg'), "ok", (res) => {
        if(res) {
            let tableHTML = '<table style="width:100%; border-collapse: collapse; margin-bottom: 24px;"><tbody>';
            for (let i = 0; i < 3; i++) {
                tableHTML += '<tr>';
                for (let j = 0; j < 3; j++) tableHTML += `<td style="border: 1px solid #e2e8f0; padding: 10px 12px; min-width: 50px;">${i===0 && j===0 ? t('messages.tableCell') : '<br>'}</td>`;
                tableHTML += '</tr>';
            }
            tableHTML += '</tbody></table><p><br></p>'; execCmd('insertHTML', tableHTML);
        }
    });
}

function getClosestTableElement(tagName) {
    const sel = document.getElementById('visual-frame').contentWindow.getSelection();
    if (sel.rangeCount === 0) return null;
    let node = sel.getRangeAt(0).startContainer; if (node.nodeType === 3) node = node.parentNode;
    while (node && node.nodeName !== 'BODY') { if (node.nodeName === tagName.toUpperCase()) return node; node = node.parentNode; }
    return null;
}

function addTableRow() { const tr = getClosestTableElement('TR'); if (tr) { const newTr = tr.cloneNode(true); Array.from(newTr.cells).forEach(cell => cell.innerHTML = '<br>'); tr.parentNode.insertBefore(newTr, tr.nextSibling); syncVisualToCode(); } else showToast(t('messages.errTable'), "error"); }
function addTableColumn() { const td = getClosestTableElement('TD') || getClosestTableElement('TH'); if (td) { const tr = td.parentNode; const idx = Array.from(tr.cells).indexOf(td); const table = getClosestTableElement('TABLE'); if (table) { Array.from(table.rows).forEach(row => { const newCell = row.cells[idx].cloneNode(true); newCell.innerHTML = '<br>'; row.insertBefore(newCell, row.cells[idx].nextSibling); }); syncVisualToCode(); } } else showToast(t('messages.errTable'), "error"); }
function removeTableRow() { const tr = getClosestTableElement('TR'); if (tr) { tr.parentNode.removeChild(tr); syncVisualToCode(); } else showToast(t('messages.errTable'), "error"); }
function removeTableColumn() { const td = getClosestTableElement('TD') || getClosestTableElement('TH'); if (td) { const idx = Array.from(td.parentNode.cells).indexOf(td); const table = getClosestTableElement('TABLE'); if (table) { Array.from(table.rows).forEach(row => { if (row.cells[idx]) row.removeChild(row.cells[idx]); }); syncVisualToCode(); } } else showToast(t('messages.errTable'), "error"); }

async function lintPython(text) {
    if (!pyodideInstance) { 
        showToast(t('messages.pyLoad'), "info"); 
        try { 
            pyodideInstance = await loadPyodide(); 
            showToast(t('messages.pyReady'), "success"); 
        } catch (e) { 
            return [{ message: t('messages.pyFail'), severity: "error", from: CodeMirror.Pos(0, 0), to: CodeMirror.Pos(0, 1) }]; 
        } 
    }
    try { 
        pyodideInstance.runPython(`import ast\nast.parse(${JSON.stringify(text)})`); 
        return []; 
    } catch (err) {
        const lines = err.message.split('\n'); let lineNum = 1, msg = "Syntax Error";
        for (let line of lines) { if (line.includes('line')) { const m = line.match(/line (\d+)/); if (m) lineNum = parseInt(m[1]); } if (line.includes('Error:')) msg = line.trim(); }
        return [{ message: msg, severity: "error", from: CodeMirror.Pos(lineNum - 1, 0), to: CodeMirror.Pos(lineNum - 1, 100) }];
    }
}
CodeMirror.registerHelper("lint", "python", function(text) { return new Promise(resolve => lintPython(text).then(resolve)); });

let currentPanelTab = 'problems';
function openPanel(tab) { document.getElementById('ide-panel').classList.remove('hidden'); document.getElementById('ide-panel').classList.add('flex'); if (tab) switchPanelTab(tab); setTimeout(() => editor.refresh(), 50); }
function closePanel() { document.getElementById('ide-panel').classList.add('hidden'); document.getElementById('ide-panel').classList.remove('flex'); setTimeout(() => editor.refresh(), 50); }
function switchPanelTab(tab) {
    currentPanelTab = tab; document.getElementById('tab-problems').classList.remove('border-blue-500', 'text-white'); document.getElementById('tab-console').classList.remove('border-blue-500', 'text-white');
    document.getElementById('panel-problems').classList.add('hidden'); document.getElementById('panel-console').classList.add('hidden');
    document.getElementById(`tab-${tab}`).classList.add('border-blue-500', 'text-white'); document.getElementById(`panel-${tab}`).classList.remove('hidden');
}

function updateProblemsPanel(annotations) {
    if (!annotations || !Array.isArray(annotations)) return;
    const count = annotations.length; document.getElementById('problem-count').textContent = count;
    if (count > 0 && document.getElementById('ide-panel').classList.contains('hidden')) openPanel('problems');
    const container = document.getElementById('panel-problems'); container.innerHTML = '';
    if (count === 0) { container.innerHTML = `<div class="text-green-400 mt-2 p-2">${t('messages.msgPerfect')}</div>`; return; }

    annotations.forEach(ann => {
        if (!ann) return;
        const div = document.createElement('div'); const isError = ann.severity === 'error';
        div.className = `p-2 mb-2 rounded border-s-4 cursor-pointer transition-colors bg-white/5 hover:bg-white/10 ${isError ? 'border-red-500' : 'border-yellow-500'}`;
        
        const fromLine = (ann.from && typeof ann.from.line !== 'undefined') ? ann.from.line + 1 : t('messages.msgUnknownLine');
        const fromCh = (ann.from && typeof ann.from.ch !== 'undefined') ? ann.from.ch : 0;
        const targetLine = fromLine !== t('messages.msgUnknownLine') ? fromLine - 1 : 0;
        
        const icon = isError ? '<i class="fa-solid fa-circle-xmark text-red-400"></i>' : '<i class="fa-solid fa-triangle-exclamation text-yellow-400"></i>';
        div.innerHTML = `<div class="flex items-start gap-2"><div class="mt-0.5">${icon}</div><div><div class="font-bold ${isError ? 'text-red-400' : 'text-yellow-400'}">${t('messages.msgLine')} ${fromLine} ${t('messages.msgLineSuf')}</div><div class="text-gray-300 mt-1">${ann.message || t('messages.msgUnknownErr')}</div></div></div>`;
        div.onclick = () => { editor.setCursor(targetLine, fromCh); editor.focus(); }; container.appendChild(div);
    });
}

function printConsole(text, type = 'log') {
    const container = document.getElementById('panel-console'); const div = document.createElement('div');
    let colorClass = 'text-gray-300';
    if (type === 'error') colorClass = 'text-red-400 font-bold'; else if (type === 'system') colorClass = 'text-green-400'; else if (type === 'yellow') colorClass = 'text-yellow-400';
    div.className = `mb-1 ${colorClass}`; div.textContent = text; container.appendChild(div); container.scrollTop = container.scrollHeight;
}
function clearConsole() { document.getElementById('panel-console').innerHTML = ''; }

async function runCode() {
    if (getActive().mode === 'visual') return showToast(t('messages.noRunVis'), "error");
    const mode = editor.getOption('mode'); const code = editor.getValue();
    
    if (mode === 'htmlmixed') {
        try {
            const blob = new Blob([code], { type: 'text/html;charset=utf-8' }); const url = URL.createObjectURL(blob); const newWin = window.open(url, '_blank');
            if (newWin) { showToast(t('messages.runHTML'), "success"); openPanel('console'); printConsole(`\n${t('messages.runStart')} (${new Date().toLocaleTimeString()}) ---\n`, 'system'); printConsole(t('messages.runConsole'), 'log'); } 
            else showToast(t('messages.popBlock'), "error");
        } catch (err) { showToast(t('messages.runFail'), "error"); } return;
    }

    openPanel('console'); printConsole(`\n${t('messages.runStart')} (${new Date().toLocaleTimeString()}) ---\n`, 'system');
    if (mode === 'javascript') {
        try {
            const originalLog = console.log; const originalError = console.error; const originalWarn = console.warn;
            console.log = (...args) => { printConsole(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '), 'log'); originalLog(...args); };
            console.error = (...args) => { printConsole(args.join(' '), 'error'); originalError(...args); };
            console.warn = (...args) => { printConsole(args.join(' '), 'yellow'); if(originalWarn) originalWarn(...args); };
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor; const result = await new AsyncFunction(code)();
            if (result !== undefined) printConsole(`<- ${typeof result === 'object' ? JSON.stringify(result) : result}`, 'log');
            console.log = originalLog; console.error = originalError; console.warn = originalWarn;
        } catch (err) { printConsole(err.toString(), 'error'); }
    } else if (mode === 'python') {
        if (!pyodideInstance) { printConsole(t('messages.runWait'), 'error'); return; }
        try { await pyodideInstance.runPythonAsync(`import sys; import io; sys.stdout = io.StringIO(); sys.stderr = io.StringIO()`); await pyodideInstance.runPythonAsync(code); const stdout = await pyodideInstance.runPythonAsync(`sys.stdout.getvalue()`); const stderr = await pyodideInstance.runPythonAsync(`sys.stderr.getvalue()`); if (stdout) printConsole(stdout, 'log'); if (stderr) printConsole(stderr, 'error'); } catch (err) { printConsole(err.toString(), 'error'); }
    } else { printConsole(`${t('messages.runNotSup')} ${mode} ${t('messages.runHint')}`, 'error'); }
}

function renameFile() {
    const tab = getActive();
    showCustomPrompt(t('messages.renamePrompt'), t('messages.renameMsg'), tab.name, (newName) => {
        if (newName && newName.trim() !== "") { 
            const prevName = tab.name;
            tab.name = newName.trim(); 
            tab.isDefault = false;
            if (prevName !== tab.name) { tab.isUnsaved = true; } 
            
            if (tab.fsId && window.fileSystem) {
                const node = fileSystem.getNode(tab.fsId);
                if (node) {
                    node.name = tab.name;
                    fileSystem.save();
                    fileSystem.renderTree();
                }
            }
            
            tabManager.renderTabs();
            updateUI(); 
            showToast(`${t('messages.toastRenamed')} ${tab.name}`, 'success'); 
        }
    });
}

// ─── Save Dialog with extension chooser ──────────────────────────────────────
// Extensions grouped by category for the dropdown
const EXT_GROUPS = {
    'Web':        ['html','css','js','ts'],
    'Data':       ['json','xml','csv','xlsx'],
    'Document':   ['docx','md','txt','pdf'],
    'Script':     ['py','sql','sh'],
    'Media':      ['svg','srt'],
};


function showSaveDialog(defaultName, allowedExts, onConfirm) {
    const modal    = document.getElementById('save-dialog');
    const nameInp  = document.getElementById('save-dialog-name');
    const extSel   = document.getElementById('save-dialog-ext');
    const okBtn    = document.getElementById('save-dialog-ok');
    const cancelBtn= document.getElementById('save-dialog-cancel');

    // Build extension list
    extSel.innerHTML = '';
    const addOpt = (val, label, sel) => {
        const o = document.createElement('option');
        o.value = val; o.textContent = label;
        if (sel) o.selected = true;
        extSel.appendChild(o);
    };

    const currentExt = defaultName.includes('.') ? defaultName.split('.').pop().toLowerCase() : '';
    const baseName   = defaultName.includes('.') ? defaultName.slice(0, defaultName.lastIndexOf('.')) : defaultName;

    if (allowedExts && allowedExts.length) {
        // Only show allowed extensions
        allowedExts.forEach(e => addOpt(e, '.' + e, e === currentExt || e === allowedExts[0]));
    } else {
        // All grouped extensions
        Object.entries(EXT_GROUPS).forEach(([group, exts]) => {
            const og = document.createElement('optgroup');
            og.label = group;
            exts.forEach(e => {
                const o = document.createElement('option');
                o.value = e; o.textContent = '.' + e;
                if (e === currentExt) o.selected = true;
                og.appendChild(o);
            });
            extSel.appendChild(og);
        });
    }

    nameInp.value = baseName;
    modal.classList.remove('hidden');
    setTimeout(() => { modal.querySelector('.modal-box').classList.add('scale-100','opacity-100'); nameInp.focus(); nameInp.select(); }, 10);

    const close = () => {
        modal.querySelector('.modal-box').classList.remove('scale-100','opacity-100');
        setTimeout(() => modal.classList.add('hidden'), 150);
        okBtn.onclick = null; cancelBtn.onclick = null;
    };

    okBtn.onclick = () => {
        const name = (nameInp.value.trim() || 'untitled') + '.' + extSel.value;
        close();
        onConfirm(name);
    };
    cancelBtn.onclick = close;

    nameInp.onkeydown = e => { if (e.key === 'Enter') okBtn.click(); if (e.key === 'Escape') cancelBtn.click(); };
}
window.showSaveDialog = showSaveDialog;

function fallbackDownload(content, filename) {
    const tab = getActive();
    showSaveDialog(filename, null, (chosen) => {
        tab.isDefault = false;
        executeDownload(content, chosen);
    });
}

function executeDownload(content, filename) {
    const tab = getActive();
    tab.name = filename;
    const blob = new Blob([content], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    tab.isUnsaved = false;
    tabManager.renderTabs();
    updateUI();
    showToast(t('messages.toastSaved') || 'Saved successfully', 'success');
}

window.openCameraToText = function() {
    if (typeof openOcrModal === 'function') {
        openOcrModal();
        setTimeout(() => {
            if (typeof startOcrCamera === 'function') {
                startOcrCamera();
            }
        }, 300);
    } else {
        showToast('OCR 模組尚未載入', 'error');
    }
};

async function openFile() {
    if ('showOpenFilePicker' in window) {
        try {
            const [fileHandle] = await window.showOpenFilePicker();
            const file = await fileHandle.getFile();
            file.handle = fileHandle; // Attach handle for future saves
            
            // Auto add to recent history
            if (typeof addToRecentHistory === 'function') {
                addToRecentHistory(fileHandle, 'file');
            }
            
            loadFileContent(file);
        } catch (e) {
            console.log('User cancelled or API failed:', e);
        }
    } else {
        // Fallback for older browsers
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = e => {
            const file = e.target.files[0];
            if (file) loadFileContent(file);
        };
        input.click();
    }
}

async function openFolder() {
    if ('showDirectoryPicker' in window) {
        try {
            const dirHandle = await window.showDirectoryPicker();
            
            if (typeof addToRecentHistory === 'function') {
                addToRecentHistory(dirHandle, 'directory');
            }
            
            if (confirm('這將會關閉目前所有的分頁並匯入該資料夾，確定嗎？')) {
                if (typeof fs !== 'undefined') fs.root.children = [];
                if (typeof tabManager !== 'undefined') {
                    tabManager.tabs = [];
                    document.getElementById('tabs-container').innerHTML = '';
                    document.getElementById('editor-container').classList.add('hidden');
                    document.getElementById('visual-container').classList.add('hidden');
                }
                
                showToast('處理匯入檔案中...', 'info');
                await processDirectoryHandle(dirHandle, 'root');
                
                if (typeof fs !== 'undefined') {
                    fs.save();
                    fs.renderTree();
                }
                showToast('資料夾匯入完成', 'success');
            }
        } catch (e) {
            console.log('User cancelled or API failed:', e);
        }
    } else {
        showToast('您的瀏覽器不支援直接開啟資料夾，請直接拖曳資料夾進入視窗', 'info');
    }
}

window.toggleSaveMenu = function(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('save-menu');
    if (!menu) return;
    menu.classList.toggle('hidden');
};

// Close save menu on outside click
document.addEventListener('click', (e) => {
    const menu = document.getElementById('save-menu');
    if (!menu || menu.classList.contains('hidden')) return;
    const wrapper = document.getElementById('save-menu-wrapper');
    if (wrapper && wrapper.contains(e.target)) return;
    menu.classList.add('hidden');
});

async function saveFile() {
    const tab = getActive();
    if (!tab) return;

    // Spreadsheet mode → route to ssExportAs
    if (tab.mode === 'spreadsheet') { window.ssExportAs && window.ssExportAs(); return; }
    // Doc/PDF visual mode → route to exportDocx
    if (tab.docType && ['docx','odt','pdf-text'].includes(tab.docType)) { window.exportDocx && window.exportDocx(); return; }

    const content = editor.getValue(tab.eol);

    // If it has a persistent FileSystemHandle attached to the node
    let node = null;
    if (tab.fsId && window.fileSystem) {
        node = fileSystem.getNode(tab.fsId);
        if (node && node.handle) {
            try {
                // Verify write permission
                const granted = await verifyPermission(node.handle, true);
                if (granted) {
                    const writable = await node.handle.createWritable();
                    await writable.write(content);
                    await writable.close();
                    
                    node.content = content;
                    fileSystem.save();
                    tab.isUnsaved = false;
                    tabManager.renderTabs();
                    updateUI();
                    showToast('已直接存入實體檔案', 'success');
                    
                    if (typeof addToRecentHistory === 'function') addToRecentHistory(node.handle, 'file');
                    return;
                }
            } catch (e) {
                console.error("Failed to save to existing handle:", e);
                // Fallthrough to regular save if handle fails
            }
        }
    }

    // Modern API: showSaveFilePicker
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: tab.name
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            
            // Attach handle to node if it exists
            if (node) node.handle = handle;
            
            tab.isUnsaved = false;
            tabManager.renderTabs();
            updateUI();
            showToast('已成功另存實體檔案', 'success');
            
            if (typeof addToRecentHistory === 'function') addToRecentHistory(handle, 'file');
            return;
        } catch (e) {
            console.log('User cancelled save:', e);
            return; // Cancelled
        }
    }

    // Fallback if not in FS or browser doesn't support File System Access API
    if (node) {
        node.content = content;
        fileSystem.save();
        tab.isUnsaved = false;
        tabManager.renderTabs();
        updateUI();
        showToast(t('messages.toastSaved') || 'Saved successfully', 'success');
    }
    downloadFileAs();
}

window.downloadFileAs = function() {
    const tab = getActive();
    if (!tab) return;
    const content = editor.getValue(tab.eol);
    const ext = tab.name.includes('.') ? tab.name.split('.').pop().toLowerCase() : 'txt';
    
    showSaveDialog(tab.name, null, (chosen) => {
        const chosenExt = chosen.split('.').pop().toLowerCase();
        if (chosenExt === 'pdf') {
            window.exportCurrentAsPdf && window.exportCurrentAsPdf();
        } else {
            tab.isDefault = false;
            executeDownload(content, chosen);
        }
    });
};



function toggleEOL() {
    const tab = getActive();
    tab.eol = tab.eol === '\n' ? '\r\n' : '\n';
    document.getElementById('eol-toggle').textContent = tab.eol === '\n' ? 'LF' : 'CRLF';
    tabManager.markUnsaved();
}

function changeEncoding(enc) {
    const tab = getActive();
    tab.encoding = enc;
    if (tab.fileBuffer) {
        try {
            const decoder = new TextDecoder(tab.encoding);
            const text = decoder.decode(tab.fileBuffer);
            isProgrammaticChange = true;
            editor.setValue(text);
            isProgrammaticChange = false;
            tab.isUnsaved = false; 
            tabManager.renderTabs();
            updateUI();
        } catch(e) {
            showToast(t('messages.errEncoding'), "error");
        }
    }
}

function loadFileContent(file) {
    const MAX_DOC_SIZE = 50 * 1024 * 1024; // 50 MB for docs
    const ext = file.name.split('.').pop().toLowerCase();
    const docExts   = ['pdf', 'docx', 'odt'];
    const sheetExts = ['xlsx', 'xls', 'csv'];
    const maxSize   = (docExts.includes(ext) || sheetExts.includes(ext)) ? MAX_DOC_SIZE : MAX_FILE_SIZE;

    if (file.size > maxSize) {
        showToast(`${t('messages.tooBig')} (${(file.size/1024/1024).toFixed(1)} MB)`, 'error');
        return;
    }

    const reader = new FileReader();

    // ── Document formats ──────────────────────────────
    if (ext === 'pdf') {
        reader.onload = e => {
            tabManager.createNewTab(file.name, '', false);
            window.loadPdf && window.loadPdf(e.target.result, file.name);
        };
        reader.readAsArrayBuffer(file);
        return;
    }
    if (ext === 'docx') {
        reader.onload = e => {
            tabManager.createNewTab(file.name, '', false);
            window.loadDocx && window.loadDocx(e.target.result, file.name);
        };
        reader.readAsArrayBuffer(file);
        return;
    }
    if (ext === 'odt') {
        reader.onload = e => {
            tabManager.createNewTab(file.name, '', false);
            window.loadOdt && window.loadOdt(e.target.result, file.name);
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    // ── Spreadsheet formats ───────────────────────────
    if (ext === 'csv') {
        reader.onload = e => {
            tabManager.createNewTab(file.name, '', false);
            window.loadCsv && window.loadCsv(e.target.result, file.name);
        };
        reader.readAsText(file);
        return;
    }
    if (ext === 'xlsx' || ext === 'xls') {
        reader.onload = e => {
            tabManager.createNewTab(file.name, '', false);
            window.loadSpreadsheet && window.loadSpreadsheet(e.target.result, file.name);
        };
        reader.readAsArrayBuffer(file);
        return;
    }

    // ── Image formats → OCR / QR dialog ─────────────────────────────────────
    const imgExts = ['jpg','jpeg','png','webp','bmp','gif','tiff'];
    if (imgExts.includes(ext)) {
        if (typeof window.handleImageFile === 'function') {
            window.handleImageFile(file);
        }
        return;
    }

    // ── Plain text / code files ───────────────────────
    reader.onload = (event) => {
        const buffer = event.target.result;
        try {
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(buffer);
            const eol = text.includes('\r\n') ? '\r\n' : '\n';

            const tab = getActive();
            if (tab.isDefault && !tab.isUnsaved) {
                tab.name = file.name;
                tab.isDefault = false;
                tab.fileBuffer = buffer;
                tab.eol = eol;
                isProgrammaticChange = true;
                editor.setValue(text);
                isProgrammaticChange = false;
                tabManager.renderTabs();
                updateUI();
                showToast(`${t('messages.toastLoaded') || 'Loaded'} ${file.name}`, 'success');
            } else {
                tabManager.createNewTab(file.name, text, false);
                const newTab = getActive();
                newTab.fileBuffer = buffer;
                newTab.eol = eol;
                updateUI();
                showToast(`${t('messages.toastLoaded') || 'Loaded'} ${file.name}`, 'success');
            }
        } catch(e) {
            showToast(t('messages.errDecode'), 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

// ─── New File Templates ──────────────────────────────────────────────────
const _FILE_TEMPLATES = {
    html: { name: 'index.html', content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        body { margin: 0; font-family: sans-serif; }
    </style>
</head>
<body>

</body>
</html>` },
    css:  { name: 'style.css',   content: `/* Styles */

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    font-family: sans-serif;
    line-height: 1.6;
}
` },
    js:   { name: 'script.js',  content: `// JavaScript

(function() {
    'use strict';

})();
` },
    ts:   { name: 'index.ts',   content: `// TypeScript

` },
    py:   { name: 'main.py',    content: `# Python

def main():
    pass

if __name__ == '__main__':
    main()
` },
    md:   { name: 'README.md',  content: `# 標題

## 說明

` },
    json: { name: 'data.json', content: `{
  
}
` },
    txt:  { name: 'notes.txt', content: '' },
    sql:  { name: 'query.sql', content: `-- SQL Query

SELECT * FROM table_name;
` },
    xlsx: null  // handled by newSpreadsheet()
};

window.newFileFromTemplate = function(type) {
    // Close dropdown
    const menu = document.getElementById('new-file-menu');
    if (menu) menu.classList.add('hidden');

    if (type === 'xlsx') {
        window.newSpreadsheet && window.newSpreadsheet();
        return;
    }
    const tmpl = _FILE_TEMPLATES[type];
    if (!tmpl) return;
    tabManager.createNewTab(tmpl.name, tmpl.content, false);
};

window.toggleNewFileMenu = function(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('new-file-menu');
    if (!menu) {
        console.error('Menu element #new-file-menu not found');
        return;
    }
    const isHidden = menu.classList.contains('hidden');
    console.log('Toggling menu. Currently hidden:', isHidden);
    if (isHidden) {
        menu.classList.remove('hidden');
    } else {
        menu.classList.add('hidden');
    }
};

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    const menu = document.getElementById('new-file-menu');
    if (!menu || menu.classList.contains('hidden')) return;
    
    // Don't close if clicking inside the menu wrapper
    const wrapper = document.getElementById('new-file-menu-wrapper');
    if (wrapper && wrapper.contains(e.target)) return;
    
    menu.classList.add('hidden');
});


// ─── Export current code/text as PDF ──────────────────────────────
window.exportCurrentAsPdf = function() {
    if (typeof html2pdf === 'undefined') {
        showToast('html2pdf.js not loaded', 'error'); return;
    }
    const tab = getActive();
    if (!tab) return;
    const content = editor.getValue();
    const base = (tab.name || 'document').replace(/\.[^.]+$/, '');
    // Wrap code in a styled HTML document for PDF output
    const htmlDoc = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:monospace;font-size:12px;white-space:pre-wrap;padding:20px;color:#000;background:#fff;}</style>
</head><body>${content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</body></html>`;
    const el = document.createElement('div');
    el.style.cssText = 'font-family:monospace;font-size:12px;white-space:pre-wrap;padding:20px;color:#000;background:#fff;';
    el.textContent = content;
    document.body.appendChild(el);
    html2pdf().set({
        margin: 0.5,
        filename: base + '.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    }).from(el).save().then(() => {
        document.body.removeChild(el);
        showToast('✅ PDF 導出完成！', 'success');
    }).catch(err => {
        document.body.removeChild(el);
        showToast('PDF 導出失敗: ' + err.message, 'error');
    });
};

function updateUI() {
    const tab = getActive();
    if (!tab) return;
    
    // 1. Filename & Unsaved indicator
    const nameEl = document.getElementById('file-name');
    if (nameEl) {
        nameEl.textContent = tab.name;
        const indicator = document.getElementById('unsaved-indicator');
        if (tab.isUnsaved) { 
            if (indicator) indicator.classList.remove('hidden'); 
            nameEl.classList.add('italic'); 
        } else { 
            if (indicator) indicator.classList.add('hidden'); 
            nameEl.classList.remove('italic'); 
        }
    }

    // 2. Editor Mode & Linting
    if (!tab.isDefault) {
        const name = tab.name.toLowerCase(); 
        let mode = 'htmlmixed'; 
        let lintType = true;
        if (name.endsWith('.js')) { mode = 'javascript'; } 
        else if (name.endsWith('.ts')) { mode = 'application/typescript'; lintType = false; }
        else if (name.endsWith('.css')) { mode = 'css'; } 
        else if (name.endsWith('.json')) { mode = 'application/json'; }
        else if (name.endsWith('.py')) { 
            mode = 'python'; 
            if (!window.loadPyodide) { 
                const script = document.createElement('script'); 
                script.src = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"; 
                document.head.appendChild(script); 
            } 
        }
        else if (name.endsWith('.c') || name.endsWith('.cpp') || name.endsWith('.h')) { mode = 'text/x-c++src'; lintType = false; }
        else if (name.endsWith('.java')) { mode = 'text/x-java'; lintType = false; }
        else if (name.endsWith('.cs')) { mode = 'text/x-csharp'; lintType = false; }
        else if (name.endsWith('.php')) { mode = 'application/x-httpd-php'; lintType = false; }
        else if (name.endsWith('.sql')) { mode = 'text/x-sql'; lintType = false; }
        else if (name.endsWith('.rs')) { mode = 'rust'; lintType = false; }
        else if (name.endsWith('.go')) { mode = 'go'; lintType = false; }
        else if (name.endsWith('.md')) { mode = 'markdown'; lintType = false; }
        else if (name.endsWith('.txt') || name.endsWith('.srt') || !name.includes('.')) { mode = 'null'; lintType = false; }
        
        if (editor) {
            editor.setOption('mode', mode);
            if (lintType) { 
                editor.setOption('lint', { onUpdateLinting: function(a, annotations) { if (typeof updateProblemsPanel === 'function') updateProblemsPanel(annotations); } }); 
            } else { 
                editor.setOption('lint', false); 
                if (typeof updateProblemsPanel === 'function') updateProblemsPanel([]); 
            }
        }
        const langDisplay = document.getElementById('language-mode');
        if (langDisplay) langDisplay.textContent = name.split('.').pop().toUpperCase();
    }
    
    // 3. Status Bar Bottom Bits
    const eolToggle = document.getElementById('eol-toggle');
    if (eolToggle) eolToggle.textContent = tab.eol === '\n' ? 'LF' : 'CRLF';
    
    const encSelect = document.getElementById('encoding-select');
    if (encSelect) encSelect.value = tab.encoding;
    
    // 4. Contextual Toolbar & Mode Buttons
    const btnOcr = document.getElementById('btn-ocr');
    const btnDocx = document.getElementById('btn-export-docx');
    const btnPdf = document.getElementById('btn-export-pdf-doc');
    const splitResizer = document.getElementById('split-resizer');
    const modeSwitchContainer = document.getElementById('mode-switch-container');

    // Default: hidden
    if (btnOcr) btnOcr.classList.add('hidden');
    if (btnDocx) btnDocx.classList.add('hidden');
    if (btnPdf) btnPdf.classList.add('hidden');

    const ext = tab.name.split('.').pop().toLowerCase();
    const isDocType = tab.docType && ['docx', 'odt', 'pdf-text'].includes(tab.docType);
    const isSpreadsheet = tab.mode === 'spreadsheet';
    const isPdf = ext === 'pdf';
    const isImage = ['jpg','jpeg','png','webp','bmp','gif'].includes(ext);

    // Show Export buttons for Docs or Visual modes
    if (isDocType || tab.mode === 'visual' || tab.mode === 'split') {
        if (btnDocx) btnDocx.classList.remove('hidden');
        if (btnPdf) btnPdf.classList.remove('hidden');
    }
    // Show OCR for images and PDF
    if (btnOcr && (isImage || isPdf)) {
        btnOcr.classList.remove('hidden');
    }

    // Toggle Mode Switchers
    if (modeSwitchContainer) {
        if (isSpreadsheet || isPdf) modeSwitchContainer.classList.add('hidden');
        else modeSwitchContainer.classList.remove('hidden');
    }

    _setActiveBtn('mode-code-btn', tab.mode === 'code');
    _setActiveBtn('mode-split-btn', tab.mode === 'split');
    _setActiveBtn('mode-visual-btn', tab.mode === 'visual');

    if (splitResizer) {
        if (tab.mode === 'split') splitResizer.classList.remove('hidden');
        else splitResizer.classList.add('hidden');
    }

    updateStatus();
}

function updateStatus() {
    if (!editor) return;
    const tab = getActive();
    const cursor = editor.getCursor(); 
    const selections = editor.getSelections();
    const selChars = selections.reduce((a, b) => a + b.length, 0);
    
    const posEl = document.getElementById('cursor-pos');
    if (posEl) {
        let statusText = `Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`;
        if (selChars > 0) statusText += ` (${selChars} selected)`;
        posEl.textContent = statusText;
    }

    const sizeEl = document.getElementById('file-size');
    if (sizeEl) {
        const bytes = new Blob([editor.getValue()]).size; 
        sizeEl.textContent = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' Bytes';
    }
}


function toggleTheme() {
    const html = document.documentElement;
    const icon = document.getElementById('theme-icon');
    const isDark = html.classList.toggle('dark');
    if (isDark) {
        icon.classList.replace('fa-moon', 'fa-sun');
        if (editor) editor.setOption('theme', 'dracula');
        if (mergeView) mergeView.edit.setOption('theme', 'dracula');
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
        if (editor) editor.setOption('theme', 'default');
        if (mergeView) mergeView.edit.setOption('theme', 'default');
    }
    // Re-apply active button styling that depends on colour context
    const mode = getActive() ? getActive().mode : 'code';
    if (mode === 'split') _setActiveBtn('mode-split-btn');
    else if (mode === 'visual') _setActiveBtn('mode-visual-btn');
    else _setActiveBtn('mode-code-btn');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container'); if (container.children.length >= 3) container.removeChild(container.firstChild);
    const toast = document.createElement('div');
    let bgColor = type === 'success' ? 'bg-green-800 dark:bg-green-900' : (type === 'error' ? 'bg-red-800 dark:bg-red-900' : 'bg-gray-800 dark:bg-gray-700');
    let icon = type === 'success' ? '<i class="fa-solid fa-circle-check text-green-400"></i>' : (type === 'error' ? '<i class="fa-solid fa-circle-xmark text-red-400"></i>' : '<i class="fa-solid fa-circle-info text-blue-400"></i>');
    toast.className = `${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 transform transition-all duration-300 translate-y-10 opacity-0`;
    toast.innerHTML = `${icon} <span>${message}</span>`; container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-y-10', 'opacity-0'));
    setTimeout(() => { toast.classList.add('opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
}

window.resetAll = function() {
    const warnTitle = typeof t === 'function' ? (t('nav.resetAllTitle') || 'Reset Everything') : 'Reset Everything';
    const warnMsg = typeof t === 'function'
        ? (t('messages.confirmReset') || '⚠️ This will permanently delete ALL files, tabs and settings. This action CANNOT be undone!')
        : '⚠️ This will permanently delete ALL files, tabs and settings. This action CANNOT be undone!';

    showCustomConfirm(warnTitle, warnMsg, async () => {
        window.isResetting = true;
        try {
            // 1. Clear localForage (primary app store)
            if (typeof localforage !== 'undefined') await localforage.clear();
        } catch(e) { console.error('localforage.clear failed', e); }

        try {
            // 2. Nuke every IndexedDB database the browser knows about
            const deleteDB = (name) => new Promise((res) => {
                const req = indexedDB.deleteDatabase(name);
                req.onsuccess = req.onerror = req.onblocked = res;
            });
            if (indexedDB.databases) {
                const dbs = await indexedDB.databases();
                await Promise.all(dbs.map(db => deleteDB(db.name)));
            } else {
                // Fallback: delete known names
                await Promise.all(['localforage', 'webpad', 'keyval-store'].map(deleteDB));
            }
        } catch(e) { console.error('indexedDB wipe failed', e); }

        try {
            // 3. Clear Web Storage
            localStorage.clear();
            sessionStorage.clear();
        } catch(e) {}

        try {
            // 4. Clear Cache API (service worker caches)
            if (window.caches) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
        } catch(e) {}

        // 5. Hard reload — app will boot as if first visit
        window.location.reload();
    });
}

let dragCounter = 0; const overlay = document.getElementById('drop-overlay');
window.addEventListener('dragenter', (e) => { e.preventDefault(); dragCounter++; if (dragCounter === 1) overlay.classList.remove('hidden'); });
window.addEventListener('dragleave', (e) => { e.preventDefault(); dragCounter--; if (dragCounter === 0) overlay.classList.add('hidden'); });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', async (e) => { 
    e.preventDefault(); 
    dragCounter = 0; 
    overlay.classList.add('hidden'); 
    
    if (e.dataTransfer.items) {
        showToast('處理匯入檔案中...', 'info');
        
        // Helper to read directory entries
        const readDir = (dirEntry) => {
            return new Promise((resolve) => {
                const reader = dirEntry.createReader();
                let entries = [];
                const readEntries = () => {
                    reader.readEntries((results) => {
                        if (!results.length) {
                            resolve(entries);
                        } else {
                            entries = entries.concat(results);
                            readEntries();
                        }
                    });
                };
                readEntries();
            });
        };

        // Recursive helper to process entries
        const processEntry = async (entry, parentId) => {
            if (entry.isFile) {
                return new Promise((resolve) => {
                    entry.file((file) => {
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            const ext = file.name.split('.').pop().toLowerCase();
                            // For images and pdfs, we could handle differently, but here we just store as string or pass to fs
                            // Wait, fs.createFile takes (name, content, parentId)
                            const content = e.target.result;
                            fs.createFile(file.name, content, parentId);
                            resolve();
                        };
                        // Read as text, or if binary read as ArrayBuffer/DataURL
                        // Simple check for text files:
                        if (['png', 'jpg', 'jpeg', 'gif', 'pdf', 'zip', 'xlsx'].includes(ext)) {
                            reader.readAsDataURL(file); // Data URL for binary
                        } else {
                            reader.readAsText(file);
                        }
                    });
                });
            } else if (entry.isDirectory) {
                // Create folder in fs
                const folderId = 'folder_' + Date.now() + Math.random().toString(36).substr(2, 9);
                fs.createFolder(entry.name, parentId, folderId);
                
                const entries = await readDir(entry);
                for (const child of entries) {
                    await processEntry(child, folderId);
                }
            }
        };

        const items = e.dataTransfer.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry();
                if (entry) {
                    await processEntry(entry, 'root');
                } else {
                    // Fallback for browsers that don't support webkitGetAsEntry
                    const file = item.getAsFile();
                    if (file) loadFileContent(file);
                }
            }
        }
        
        if (typeof renderExplorer === 'function') renderExplorer();
        showToast('檔案匯入完成', 'success');
        
    } else {
        // Fallback to older DataTransfer API
        const files = e.dataTransfer.files;
        if (files.length > 0) loadFileContent(files[0]);
    }
});

function formatCode() {
    if (getActive().mode === 'visual') return showToast(t('messages.noRunVis'), "error");
    const mode = editor.getOption('mode');
    const code = editor.getValue();
    
    let formattedCode = code;
    try {
        if (mode === 'htmlmixed') {
            formattedCode = html_beautify(code, { indent_size: 4, wrap_line_length: 0 });
        } else if (mode === 'javascript' || mode === 'application/json') {
            formattedCode = js_beautify(code, { indent_size: 4 });
        } else if (mode === 'css') {
            formattedCode = css_beautify(code, { indent_size: 4 });
        } else {
            return showToast(t('messages.errFormatNotSup'), "info");
        }
        
        if (formattedCode !== code) {
            const cursor = editor.getCursor();
            isProgrammaticChange = true;
            editor.setValue(formattedCode);
            isProgrammaticChange = false;
            editor.setCursor(cursor);
            tabManager.markUnsaved();
            showToast(t('nav.formatTitle') || "Formatted", "success");
        }
    } catch (e) {
        showToast(t('messages.errFormat'), "error");
        console.error(e);
    }
}
window.formatCode = formatCode;

// --- Compare (Merge View) Logic ---
function openCompareModal() {
    const tabs = tabManager.tabs.filter(t => t.id !== tabManager.activeTabId);
    if (tabs.length === 0) {
        showToast(t('messages.openCompareTab'), "info");
        return;
    }
    const select = document.getElementById('compare-tab-select');
    select.innerHTML = '';
    tabs.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        select.appendChild(opt);
    });
    
    const modal = document.getElementById('compare-modal');
    const content = document.getElementById('compare-modal-content');
    modal.classList.remove('hidden'); void modal.offsetWidth;
    content.classList.remove('scale-95', 'opacity-0'); content.classList.add('scale-100', 'opacity-100');
}

function closeCompareModal() {
    const modal = document.getElementById('compare-modal');
    const content = document.getElementById('compare-modal-content');
    content.classList.remove('scale-100', 'opacity-100'); content.classList.add('scale-95', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 200);
}

function executeCompare() {
    const targetId = document.getElementById('compare-tab-select').value;
    closeCompareModal();
    const targetTab = tabManager.tabs.find(t => t.id === targetId);
    const activeTab = tabManager.getActiveTab();
    if (!targetTab || !activeTab) return;
    
    document.getElementById('editor-container').classList.add('hidden');
    document.getElementById('visual-container').classList.add('hidden');
    document.getElementById('editor-container').classList.remove('flex');
    document.getElementById('visual-container').classList.remove('flex');
    
    const mergeContainer = document.getElementById('merge-container');
    mergeContainer.classList.remove('hidden');
    mergeContainer.classList.add('flex');
    
    const wrapper = document.getElementById('merge-view-wrapper');
    wrapper.innerHTML = '';
    
    const theme = document.documentElement.classList.contains('dark') ? 'dracula' : 'default';
    
    mergeView = CodeMirror.MergeView(wrapper, {
        value: editor.getValue(),
        orig: targetTab.content,
        lineNumbers: true,
        theme: theme,
        mode: editor.getOption('mode'),
        highlightDifferences: true,
        connect: 'align',
        collapseIdentical: false,
        revertButtons: false
    });
    
    mergeView.edit.on('change', () => {
        // synchronize merge view back to main editor
        isProgrammaticChange = true;
        editor.setValue(mergeView.edit.getValue());
        isProgrammaticChange = false;
        tabManager.markUnsaved();
    });
}

function exitCompareMode() {
    document.getElementById('merge-container').classList.add('hidden');
    document.getElementById('merge-container').classList.remove('flex');
    
    const activeTab = tabManager.getActiveTab();
    if (activeTab && activeTab.mode === 'visual') {
        document.getElementById('visual-container').classList.remove('hidden');
        document.getElementById('visual-container').classList.add('flex');
        syncCodeToVisual();
    } else {
        document.getElementById('editor-container').classList.remove('hidden');
        document.getElementById('editor-container').classList.add('flex');
    }
    if (mergeView) {
        mergeView = null;
        document.getElementById('merge-view-wrapper').innerHTML = '';
    }
}

// --- QR Code Modal UI Logic ---
window.openQrModal = function() {
    const modal = document.getElementById('qr-modal');
    modal.classList.remove('hidden');
    // Default to generate tab
    switchQrTab('generate');
};

window.closeQrModal = function() {
    document.getElementById('qr-modal').classList.add('hidden');
};

window.switchQrTab = function(tab) {
    const genTab = document.getElementById('qr-tab-generate');
    const scanTab = document.getElementById('qr-tab-scan');
    const genPanel = document.getElementById('qr-panel-generate');
    const scanPanel = document.getElementById('qr-panel-scan');

    if (tab === 'generate') {
        genTab.classList.add('border-emerald-500', 'text-emerald-600');
        genTab.classList.remove('border-transparent', 'text-gray-500');
        scanTab.classList.remove('border-emerald-500', 'text-emerald-600');
        scanTab.classList.add('border-transparent', 'text-gray-500');
        genPanel.classList.remove('hidden');
        scanPanel.classList.add('hidden');
    } else {
        scanTab.classList.add('border-emerald-500', 'text-emerald-600');
        scanTab.classList.remove('border-transparent', 'text-gray-500');
        genTab.classList.remove('border-emerald-500', 'text-emerald-600');
        genTab.classList.add('border-transparent', 'text-gray-500');
        scanPanel.classList.remove('hidden');
        genPanel.classList.add('hidden');
    }
};

window.qrImportContent = function(type) {
    const input = document.getElementById('qr-gen-input');
    if (type === 'current') {
        input.value = editor.getValue();
    } else if (type === 'link') {
        input.value = window.location.href;
    }
};

// --- SEO Tools Modal Logic ---
window.openSeoModal = function() {
    const modal = document.getElementById('seo-modal');
    modal.classList.remove('hidden');
    window.switchSeoTab('sitemap');
};

window.closeSeoModal = function() {
    document.getElementById('seo-modal').classList.add('hidden');
};

window.switchSeoTab = function(tab) {
    const sitemapTab = document.getElementById('seo-tab-sitemap');
    const robotsTab = document.getElementById('seo-tab-robots');
    const sitemapPanel = document.getElementById('seo-panel-sitemap');
    const robotsPanel = document.getElementById('seo-panel-robots');

    if (tab === 'sitemap') {
        sitemapTab.classList.add('border-blue-500', 'text-blue-600');
        sitemapTab.classList.remove('border-transparent', 'text-gray-500');
        robotsTab.classList.remove('border-blue-500', 'text-blue-600');
        robotsTab.classList.add('border-transparent', 'text-gray-500');
        sitemapPanel.classList.remove('hidden');
        robotsPanel.classList.add('hidden');
    } else {
        robotsTab.classList.add('border-blue-500', 'text-blue-600');
        robotsTab.classList.remove('border-transparent', 'text-gray-500');
        sitemapTab.classList.remove('border-blue-500', 'text-blue-600');
        sitemapTab.classList.add('border-transparent', 'text-gray-500');
        robotsPanel.classList.remove('hidden');
        sitemapPanel.classList.add('hidden');
    }
};

window.autoScanSitemap = function() {
    let htmlFiles = [];
    const scanNode = (node, path) => {
        if (node.type === 'file' && node.name.toLowerCase().endsWith('.html')) {
            htmlFiles.push((path + node.name).replace(/^\//, ''));
        } else if (node.type === 'folder' && node.children) {
            node.children.forEach(child => scanNode(child, path + node.name + '/'));
        }
    };
    
    if (fs && fs.root) {
        fs.root.children.forEach(child => scanNode(child, '/'));
    }
    
    if (htmlFiles.length === 0) {
        showToast('工作區內沒有找到 .html 檔案', 'info');
        return;
    }
    
    document.getElementById('seo-sitemap-paths').value = htmlFiles.map(f => '/' + f).join('\n');
    showToast(`成功掃描到 ${htmlFiles.length} 個 HTML 檔案`, 'success');
};

window.generateSitemap = function() {
    let baseUrl = document.getElementById('sitemap-base-url').value.trim();
    if (!baseUrl) baseUrl = 'https://example.com';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
    const freq = document.getElementById('sitemap-changefreq').value;
    const priority = document.getElementById('sitemap-priority').value;
    
    let htmlFiles = [];
    const scanNode = (node, path) => {
        if (node.type === 'file' && node.name.toLowerCase().endsWith('.html')) {
            htmlFiles.push((path + node.name).replace(/^\//, ''));
        } else if (node.type === 'folder' && node.children) {
            node.children.forEach(child => scanNode(child, path + node.name + '/'));
        }
    };
    
    if (typeof fs !== 'undefined' && fs && fs.root) {
        fs.root.children.forEach(child => scanNode(child, '/'));
    }
    
    if (htmlFiles.length === 0) {
        showToast('工作區內沒有找到任何 .html 檔案', 'error');
        return;
    }
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    htmlFiles.forEach(path => {
        if (!path.startsWith('/')) path = '/' + path;
        const loc = baseUrl + path;
        xml += `  <url>\n`;
        xml += `    <loc>${loc}</loc>\n`;
        xml += `    <changefreq>${freq}</changefreq>\n`;
        xml += `    <priority>${priority}</priority>\n`;
        xml += `  </url>\n`;
    });
    
    xml += `</urlset>`;
    
    if (typeof closeSeoModal === 'function') closeSeoModal();
    if (typeof tabManager !== 'undefined') {
        tabManager.createNewTab('sitemap.xml', xml, false);
        showToast('sitemap.xml 建立成功，請記得存檔', 'success');
    }
};

window.generateRobotsTxt = function() {
    const isAllowAll = document.getElementById('robots-allow-all').checked;
    const pathsRaw = document.getElementById('robots-disallow').value.split('\n');
    const paths = pathsRaw.map(p => p.trim()).filter(p => p.length > 0);
    
    let txt = `User-agent: *\n`;
    if (!isAllowAll) {
        txt += `Disallow: /\n`;
    } else {
        if (paths.length > 0) {
            paths.forEach(p => {
                if (!p.startsWith('/')) p = '/' + p;
                txt += `Disallow: ${p}\n`;
            });
        } else {
            txt += `Allow: /\n`;
        }
    }
    
    if (typeof closeSeoModal === 'function') closeSeoModal();
    if (typeof tabManager !== 'undefined') {
        tabManager.createNewTab('robots.txt', txt, false);
        showToast('robots.txt 建立成功，請記得存檔', 'success');
    }
};
