// js/core/ui.js
// Responsibility: All UI state updates — file name display, mode buttons,
// status bar, toast notifications, theme toggle, and reset.

// ─── UI Update ───────────────────────────────────────────────────────────────
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
            if (!window.loadPyodide && typeof window.loadDependency === 'function') { 
                window.loadDependency('pyodide', { toast: false }).catch(err => console.warn('Pyodide preload failed:', err));
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

    if (btnOcr) btnOcr.classList.add('hidden');
    if (btnDocx) btnDocx.classList.add('hidden');
    if (btnPdf) btnPdf.classList.add('hidden');

    const ext = tab.name.split('.').pop().toLowerCase();
    const isDocType = tab.docType && ['docx', 'odt', 'pdf-text'].includes(tab.docType);
    const isSpreadsheet = tab.mode === 'spreadsheet';
    const isPdf = ext === 'pdf';
    const isImage = ['jpg','jpeg','png','webp','bmp','gif'].includes(ext);

    if (isDocType || tab.mode === 'visual' || tab.mode === 'split') {
        if (btnDocx) btnDocx.classList.remove('hidden');
        if (btnPdf) btnPdf.classList.remove('hidden');
    }
    if (btnOcr && (isImage || isPdf)) {
        btnOcr.classList.remove('hidden');
    }

    if (modeSwitchContainer) {
        if (isSpreadsheet || isPdf) modeSwitchContainer.classList.add('hidden');
        else modeSwitchContainer.classList.remove('hidden');
    }

    if (tab.mode === 'code') _setActiveBtn('mode-code-btn');
    else if (tab.mode === 'split') _setActiveBtn('mode-split-btn');
    else if (tab.mode === 'visual') _setActiveBtn('mode-visual-btn');

    if (splitResizer) {
        if (tab.mode === 'split') splitResizer.classList.remove('hidden');
        else splitResizer.classList.add('hidden');
    }

    updateStatus();
    const notesApi = window.WebcodingApp?.namespace?.resolve('features.notes') || window.notesFeature;
    if (notesApi && typeof notesApi.updateToolbarVisibility === 'function') notesApi.updateToolbarVisibility();
}

// ─── Status Bar ──────────────────────────────────────────────────────────────
function updateStatus() {
    if (!editor) return;
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

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
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
    const mode = getActive() ? getActive().mode : 'code';
    if (mode === 'split') _setActiveBtn('mode-split-btn');
    else if (mode === 'visual') _setActiveBtn('mode-visual-btn');
    else _setActiveBtn('mode-code-btn');
}

// ─── Toast Notifications ─────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (container.children.length >= 3) container.removeChild(container.firstChild);
    const toast = document.createElement('div');
    let bgColor = type === 'success' ? 'bg-green-800 dark:bg-green-900' : (type === 'error' ? 'bg-red-800 dark:bg-red-900' : 'bg-gray-800 dark:bg-gray-700');
    let icon = type === 'success' ? '<i class="fa-solid fa-circle-check text-green-400"></i>' : (type === 'error' ? '<i class="fa-solid fa-circle-xmark text-red-400"></i>' : '<i class="fa-solid fa-circle-info text-blue-400"></i>');
    toast.className = `${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 transform transition-all duration-300 translate-y-10 opacity-0`;
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-y-10', 'opacity-0'));
    setTimeout(() => { toast.classList.add('opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ─── Reset All ────────────────────────────────────────────────────────────────
window.resetAll = function() {
    const warnTitle = typeof t === 'function' ? (t('nav.resetAllTitle') || 'Reset Everything') : 'Reset Everything';
    const warnMsg = typeof t === 'function'
        ? (t('messages.confirmReset') || '⚠️ This will permanently delete ALL files, tabs and settings. This action CANNOT be undone!')
        : '⚠️ This will permanently delete ALL files, tabs and settings. This action CANNOT be undone!';

    showCustomConfirm(warnTitle, warnMsg, async () => {
        window.isResetting = true;
        try {
            if (typeof localforage !== 'undefined') await localforage.clear();
        } catch(e) { console.error('localforage.clear failed', e); }

        try {
            const deleteDB = (name) => new Promise((res) => {
                const req = indexedDB.deleteDatabase(name);
                req.onsuccess = req.onerror = req.onblocked = res;
            });
            if (indexedDB.databases) {
                const dbs = await indexedDB.databases();
                await Promise.all(dbs.map(db => deleteDB(db.name)));
            } else {
                await Promise.all(['localforage', 'webpad', 'keyval-store'].map(deleteDB));
            }
        } catch(e) { console.error('indexedDB wipe failed', e); }

        try {
            localStorage.clear();
            sessionStorage.clear();
        } catch(e) {}

        try {
            if (window.caches) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
        } catch(e) {}

        window.location.reload();
    });
};
