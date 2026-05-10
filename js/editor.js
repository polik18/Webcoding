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
        const newTab = {
            id,
            fsId,
            name: name || `${t('nav.untitled')}-${this.counter}`,
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
        }

        this.activeTabId = id;
        const newTab = this.getActiveTab();
        if (!newTab) return;

        isProgrammaticChange = true;
        if (editor) {
            editor.setValue(newTab.content);
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
    
    editor.on('cursorActivity', updateStatus);
    
    initVisualFrame();

    window.addEventListener('beforeunload', (e) => { 
        if (tabManager.tabs.some(t => t.isUnsaved)) { e.preventDefault(); e.returnValue = ''; } 
        tabManager.saveToStorage();
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
            }
        });
    }
});

function initVisualFrame() {
    const doc = document.getElementById('visual-frame').contentWindow.document;
    doc.open(); 
    doc.write('<html><head></head><body style="padding: 20px; font-family: sans-serif;" contenteditable="true"></body></html>'); 
    doc.close();
    doc.body.addEventListener('input', () => { if (getActive().mode === 'visual') syncVisualToCode(); });
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

function switchToCode() {
    if (getActive()) getActive().mode = 'code';
    _setActiveBtn('mode-code-btn');
    const ec = document.getElementById('editor-container');
    const vc = document.getElementById('visual-container');
    const sp = document.getElementById('split-resizer');
    ec.style.width = '';
    ec.classList.remove('hidden'); ec.classList.add('flex');
    vc.classList.add('hidden');   vc.classList.remove('flex');
    if (sp) sp.classList.add('hidden');
    setTimeout(() => editor.refresh(), 10);
}

function switchToVisual() {
    if (getActive()) getActive().mode = 'visual';
    _setActiveBtn('mode-visual-btn');
    const ec = document.getElementById('editor-container');
    const vc = document.getElementById('visual-container');
    const sp = document.getElementById('split-resizer');
    ec.classList.add('hidden');    ec.classList.remove('flex');
    vc.style.width = '';
    vc.classList.remove('hidden'); vc.classList.add('flex');
    if (sp) sp.classList.add('hidden');
    syncCodeToVisual();
}

function switchToSplit() {
    if (getActive()) getActive().mode = 'split';
    _setActiveBtn('mode-split-btn');
    const ec = document.getElementById('editor-container');
    const vc = document.getElementById('visual-container');
    const sp = document.getElementById('split-resizer');
    ec.classList.remove('hidden'); ec.classList.add('flex');
    vc.classList.remove('hidden'); vc.classList.add('flex');
    // Default 50/50 split if not resized yet
    if (!ec.style.width) ec.style.width = '50%';
    if (!vc.style.width) vc.style.width = '50%';
    ec.style.flexGrow = '0'; ec.style.flexShrink = '0';
    vc.style.flexGrow = '0'; vc.style.flexShrink = '0';
    if (sp) sp.classList.remove('hidden');
    syncCodeToVisual();
    setTimeout(() => editor.refresh(), 10);
}

function syncCodeToVisual() {
    const frame = document.getElementById('visual-frame');
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open(); doc.write(editor.getValue()); doc.close();
    if (doc.body) doc.body.contentEditable = true;
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
function syncVisualToCode() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        const doc = document.getElementById('visual-frame').contentWindow.document;
        const htmlContent = doc.documentElement.innerHTML;
        let cleanHTML = '<!DOCTYPE html>\n<html>\n' + htmlContent.replace(/ contenteditable="true"/g, '') + '\n</html>';
        cleanHTML = formatHTML(cleanHTML);
        
        const cursorPos = editor.getCursor();
        isProgrammaticChange = true;
        editor.setValue(cleanHTML); editor.setCursor(cursorPos);
        isProgrammaticChange = false;
        tabManager.markUnsaved();
    }, 300);
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

function fallbackDownload(content, filename) {
    const tab = getActive();
    if (tab.isDefault) {
        showCustomPrompt(t('messages.savePrompt'), t('messages.saveMsg'), "index.html", (userInput) => {
            if (!userInput || userInput.trim() === "") { showToast(t('messages.cancelSave'), 'info'); return; }
            tab.isDefault = false;
            executeDownload(content, userInput.trim());
        });
    } else executeDownload(content, filename);
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

function openFile() { const input = document.createElement('input'); input.type = 'file'; input.onchange = e => { const file = e.target.files[0]; if (file) loadFileContent(file); }; input.click(); }
function saveFile() { 
    const tab = getActive(); 
    const content = editor.getValue(tab.eol); 
    
    if (tab.fsId && window.fileSystem) {
        const node = fileSystem.getNode(tab.fsId);
        if (node) {
            node.content = content;
            fileSystem.save();
            tab.isUnsaved = false;
            tabManager.renderTabs();
            updateUI();
            showToast(t('messages.toastSaved') || 'Saved successfully', 'success');
            return;
        }
    }
    
    fallbackDownload(content, tab.name); 
}

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
    if (file.size > MAX_FILE_SIZE) { showToast(`${t('messages.tooBig')} (${(file.size/1024/1024).toFixed(1)}MB)，${t('messages.limit')}`, 'error'); return; }
    const reader = new FileReader();
    reader.onload = (event) => { 
        const buffer = event.target.result;
        try {
            const decoder = new TextDecoder('utf-8'); // default assumption
            const text = decoder.decode(buffer);
            const eol = text.includes('\r\n') ? '\r\n' : '\n';
            
            // If current tab is empty/default and unsaved, reuse it. Otherwise create new.
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
            showToast(t('messages.errDecode'), "error");
        }
    };
    reader.readAsArrayBuffer(file);
}

function updateUI() {
    const tab = getActive();
    if (!tab) return;
    
    document.getElementById('file-name').textContent = tab.name;
    const indicator = document.getElementById('unsaved-indicator');
    if (tab.isUnsaved) { indicator.classList.remove('hidden'); document.getElementById('file-name').classList.add('italic'); } 
    else { indicator.classList.add('hidden'); document.getElementById('file-name').classList.remove('italic'); }

    if (!tab.isDefault) {
        const name = tab.name.toLowerCase(); let mode = 'htmlmixed'; let lintType = true;
        if (name.endsWith('.js')) { mode = 'javascript'; } else if (name.endsWith('.ts')) { mode = 'application/typescript'; lintType = false; }
        else if (name.endsWith('.css')) { mode = 'css'; } else if (name.endsWith('.json')) { mode = 'application/json'; }
        else if (name.endsWith('.py')) { mode = 'python'; if (!window.loadPyodide) { const script = document.createElement('script'); script.src = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"; document.head.appendChild(script); } }
        else if (name.endsWith('.c') || name.endsWith('.cpp') || name.endsWith('.h')) { mode = 'text/x-c++src'; lintType = false; }
        else if (name.endsWith('.java')) { mode = 'text/x-java'; lintType = false; }
        else if (name.endsWith('.cs')) { mode = 'text/x-csharp'; lintType = false; }
        else if (name.endsWith('.php')) { mode = 'application/x-httpd-php'; lintType = false; }
        else if (name.endsWith('.sql')) { mode = 'text/x-sql'; lintType = false; }
        else if (name.endsWith('.rs')) { mode = 'rust'; lintType = false; }
        else if (name.endsWith('.go')) { mode = 'go'; lintType = false; }
        else if (name.endsWith('.md')) { mode = 'markdown'; lintType = false; }
        else if (name.endsWith('.txt') || name.endsWith('.srt') || !name.includes('.')) { mode = 'null'; lintType = false; }
        editor.setOption('mode', mode);
        if (lintType) { editor.setOption('lint', { onUpdateLinting: function(a, annotations) { if (typeof updateProblemsPanel === 'function') updateProblemsPanel(annotations); } }); } 
        else { editor.setOption('lint', false); updateProblemsPanel([]); }
        document.getElementById('language-mode').textContent = name.split('.').pop().toUpperCase();
    } else { editor.setOption('lint', { onUpdateLinting: function(a, annotations) { updateProblemsPanel(annotations); } }); }
    
    document.getElementById('eol-toggle').textContent = tab.eol === '\n' ? 'LF' : 'CRLF';
    document.getElementById('encoding-select').value = tab.encoding;
    updateStatus();
}

function updateStatus() {
    if (!editor) return;
    const cursor = editor.getCursor(); document.getElementById('cursor-pos').textContent = `Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`;
    const bytes = new Blob([editor.getValue()]).size; document.getElementById('file-size').textContent = bytes > 1024 ? (bytes / 1024).toFixed(1) + ' KB' : bytes + ' Bytes';
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

function resetAll() {
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
window.addEventListener('drop', (e) => { e.preventDefault(); dragCounter = 0; overlay.classList.add('hidden'); const item = e.dataTransfer.items[0]; if (item && item.kind === 'file') { const file = item.getAsFile(); if (file) loadFileContent(file); } });

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
