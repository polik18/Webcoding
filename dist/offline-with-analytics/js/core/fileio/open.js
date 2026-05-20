// js/core/fileio/open.js
// Open files/folders and route loaded content by extension.
// Requires: constants.js; document/tool loaders must be loaded before user invokes document routes.

async function openFile() {
    if ('showOpenFilePicker' in window) {
        try {
            const [fileHandle] = await window.showOpenFilePicker();
            const file = await fileHandle.getFile();
            file.handle = fileHandle;
            if (typeof addToRecentHistory === 'function') addToRecentHistory(fileHandle, 'file');
            loadFileContent(file);
        } catch (e) {
            console.log('User cancelled or API failed:', e);
        }
    } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.onchange = e => { const file = e.target.files[0]; if (file) loadFileContent(file); };
        input.click();
    }
}

// ─── Open Folder ──────────────────────────────────────────────────────────────
// 遞迴把資料夾匯入到 fileSystem，並讀取每個檔案的內容（修正：之前內容沒有真的讀進來）
async function _importDirectoryHandle(dirHandle, parentId) {
    if (!window.fileSystem) return;
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            try {
                const file = await entry.getFile();
                const ext = (file.name.split('.').pop() || '').toLowerCase();
                const binExts = ['png','jpg','jpeg','gif','bmp','webp','tiff','pdf','zip','xlsx','xls','docx','odt'];
                let content = '';
                if (binExts.includes(ext)) {
                    // 二進位類型暫不存入 node.content（節省 IndexedDB 體積），仍保留節點以供 UI 顯示
                    content = '';
                } else {
                    content = await file.text();
                }
                const node = window.fileSystem._createNodeSilent('file', parentId, file.name);
                if (node) {
                    node.content = content;
                    node.handle = entry; // 保留 handle 供日後直接儲存
                }
            } catch (err) {
                console.warn('Failed to import file', entry.name, err);
            }
        } else if (entry.kind === 'directory') {
            const node = window.fileSystem._createNodeSilent('folder', parentId, entry.name);
            if (node) await _importDirectoryHandle(entry, node.id);
        }
    }
}

async function openFolder() {
    if ('showDirectoryPicker' in window) {
        try {
            const dirHandle = await window.showDirectoryPicker();
            if (typeof addToRecentHistory === 'function') addToRecentHistory(dirHandle, 'directory');
            if (confirm('這將會關閉目前所有的分頁並匯入該資料夾，確定嗎？')) {
                if (typeof tabManager !== 'undefined') {
                    tabManager.tabs = [];
                    document.getElementById('tabs-container').innerHTML = '';
                    document.getElementById('editor-container').classList.add('hidden');
                    document.getElementById('visual-container').classList.add('hidden');
                }
                showToast('處理匯入檔案中...', 'info');
                await _importDirectoryHandle(dirHandle, 'root');
                if (window.fileSystem) { fileSystem.save(); fileSystem.renderTree(); }
                showToast('資料夾匯入完成', 'success');
            }
        } catch (e) {
            console.log('User cancelled or API failed:', e);
        }
    } else {
        showToast('您的瀏覽器不支援直接開啟資料夾，請直接拖曳資料夾進入視窗', 'info');
    }
}

// ─── Open File or Folder ─────────────────────────────────────────────────────
// 整合按鈕：跳出對話框讓使用者選「檔案」還是「資料夾」。
// 若瀏覽器不支援 showDirectoryPicker，僅顯示「開啟檔案」選項並直接執行；
// 「開啟資料夾」按鈕仍提示可以拖曳整個資料夾進來。
window.openFileOrFolder = function() {
    const modal = document.getElementById('open-chooser-modal');
    if (!modal) {
        // Fallback：對話框不存在時直接開啟檔案
        openFile();
        return;
    }
    const btnFile   = document.getElementById('open-chooser-file');
    const btnFolder = document.getElementById('open-chooser-folder');
    const btnCancel = document.getElementById('open-chooser-cancel');
    const close = () => modal.classList.add('hidden');
    // 重新綁定避免重複 handler
    btnFile.onclick = () => { close(); openFile(); };
    btnFolder.onclick = () => {
        close();
        if ('showDirectoryPicker' in window) {
            openFolder();
        } else {
            showToast('您的瀏覽器不支援直接開啟資料夾，請直接拖曳資料夾進入視窗', 'info');
        }
    };
    btnCancel.onclick = close;
    modal.classList.remove('hidden');
};

// ─── Load File Content (route by extension) ───────────────────────────────────
function loadFileContent(file) {
    const MAX_DOC_SIZE = 50 * 1024 * 1024;
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
        reader.onload = async e => {
            if (!await window.ensureDependency('pdfjs', { message: '載入 PDF 讀取引擎中...' })) return;
            tabManager.createNewTab(file.name, '', false);
            window.loadPdf && window.loadPdf(e.target.result, file.name);
        };
        reader.readAsArrayBuffer(file); return;
    }
    if (ext === 'docx') {
        reader.onload = async e => {
            if (!await window.ensureDependency('mammoth', { message: '載入 DOCX 讀取引擎中...' })) return;
            tabManager.createNewTab(file.name, '', false);
            window.loadDocx && window.loadDocx(e.target.result, file.name);
        };
        reader.readAsArrayBuffer(file); return;
    }
    if (ext === 'odt') {
        reader.onload = async e => {
            if (!await window.ensureDependency('jszip', { message: '載入 ODT 解壓縮引擎中...' })) return;
            tabManager.createNewTab(file.name, '', false);
            window.loadOdt && window.loadOdt(e.target.result, file.name);
        };
        reader.readAsArrayBuffer(file); return;
    }

    // ── Spreadsheet formats ───────────────────────────
    if (ext === 'csv') {
        reader.onload = async e => {
            if (!await window.ensureDependency('xlsx', { message: '載入試算表引擎中...' })) return;
            tabManager.createNewTab(file.name, '', false);
            window.loadCsv && window.loadCsv(e.target.result, file.name);
        };
        reader.readAsText(file); return;
    }
    if (ext === 'xlsx' || ext === 'xls') {
        reader.onload = async e => {
            if (!await window.ensureDependency('xlsx', { message: '載入試算表引擎中...' })) return;
            tabManager.createNewTab(file.name, '', false);
            window.loadSpreadsheet && window.loadSpreadsheet(e.target.result, file.name);
        };
        reader.readAsArrayBuffer(file); return;
    }

    // ── Image formats → OCR / QR dialog ──────────────
    const imgExts = ['jpg','jpeg','png','webp','bmp','gif','tiff'];
    if (imgExts.includes(ext)) {
        if (typeof window.handleImageFile === 'function') window.handleImageFile(file);
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
                tab.name = file.name; tab.isDefault = false; tab.fileBuffer = buffer; tab.eol = eol;
                if (file.handle) {
                    if (tab.fsId && window.fileSystem) {
                        const node = fileSystem.getNode(tab.fsId);
                        if (node) node.handle = file.handle;
                    }
                }
                window.isProgrammaticChange = true; editor.setValue(text); window.isProgrammaticChange = false;
                tabManager.renderTabs(); updateUI();
                showToast(`${t('messages.toastLoaded') || 'Loaded'} ${file.name}`, 'success');
            } else {
                tabManager.createNewTab(file.name, text, false);
                const newTab = getActive();
                newTab.fileBuffer = buffer; newTab.eol = eol;
                if (file.handle && newTab.fsId && window.fileSystem) {
                    const node = fileSystem.getNode(newTab.fsId);
                    if (node) node.handle = file.handle;
                }
                updateUI();
                showToast(`${t('messages.toastLoaded') || 'Loaded'} ${file.name}`, 'success');
            }
        } catch(e) {
            showToast(t('messages.errDecode'), 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

// Explicit globals for keyboard shortcuts and cross-module callers.
window.openFile = openFile;
window.openFolder = openFolder;
window.loadFileContent = loadFileContent;
