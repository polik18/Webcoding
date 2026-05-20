// js/core/save.js
// Responsibility: All file-saving logic — showSaveDialog, saveFile (File System Access API),
// downloadFileAs, executeDownload, and the save-menu toggle.

// ─── Extension Groups for Save Dialog ────────────────────────────────────────
const EXT_GROUPS = {
    'Web':      ['html','css','js','ts'],
    'Data':     ['json','xml','csv','xlsx'],
    'Document': ['docx','md','txt','pdf'],
    'Script':   ['py','sql','sh'],
    'Media':    ['svg','srt'],
};

// ─── Save Dialog ─────────────────────────────────────────────────────────────
function showSaveDialog(defaultName, allowedExts, onConfirm) {
    const modal     = document.getElementById('save-dialog');
    const nameInp   = document.getElementById('save-dialog-name');
    const extSel    = document.getElementById('save-dialog-ext');
    const okBtn     = document.getElementById('save-dialog-ok');
    const cancelBtn = document.getElementById('save-dialog-cancel');

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
        allowedExts.forEach(e => addOpt(e, '.' + e, e === currentExt || e === allowedExts[0]));
    } else {
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

    okBtn.onclick = () => { const name = (nameInp.value.trim() || 'untitled') + '.' + extSel.value; close(); onConfirm(name); };
    cancelBtn.onclick = close;
    nameInp.onkeydown = e => { if (e.key === 'Enter') okBtn.click(); if (e.key === 'Escape') cancelBtn.click(); };
}
window.showSaveDialog = showSaveDialog;

// ─── Download helpers ─────────────────────────────────────────────────────────
function fallbackDownload(content, filename) {
    const tab = getActive();
    showSaveDialog(filename, null, (chosen) => { tab.isDefault = false; executeDownload(content, chosen); });
}

function executeDownload(content, filename) {
    const tab = getActive();
    tab.name = filename;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    tab.isUnsaved = false;
    tabManager.renderTabs();
    updateUI();
    showToast(t('messages.toastSaved') || 'Saved successfully', 'success');
}

// ─── Core Save ────────────────────────────────────────────────────────────────
async function saveFile() {
    const tab = getActive();
    if (!tab) return;

    // Route special modes
    if (tab.mode === 'spreadsheet') { window.ssExportAs && window.ssExportAs(); return; }
    if (tab.docType && ['docx','odt','pdf-text'].includes(tab.docType)) { window.exportDocx && window.exportDocx(); return; }

    const content = editor.getValue(tab.eol);

    // Try persistent FileSystemHandle on the FS node
    let node = null;
    if (tab.fsId && window.fileSystem) {
        node = fileSystem.getNode(tab.fsId);
        if (node && node.handle) {
            try {
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
                console.error('Failed to save to existing handle:', e);
                // Fallthrough
            }
        }
    }

    // Modern File System Access API
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({ suggestedName: tab.name });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            if (node) node.handle = handle;
            tab.isUnsaved = false;
            tabManager.renderTabs();
            updateUI();
            showToast('已成功另存實體檔案', 'success');
            if (typeof addToRecentHistory === 'function') addToRecentHistory(handle, 'file');
            return;
        } catch (e) {
            console.log('User cancelled save:', e);
            return;
        }
    }

    // Fallback: save to FS cache then trigger download
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

// ─── Save As / Download ───────────────────────────────────────────────────────
window.downloadFileAs = function() {
    const tab = getActive();
    if (!tab) return;
    const content = editor.getValue(tab.eol);
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

// ─── Save Menu Toggle ─────────────────────────────────────────────────────────
window.toggleSaveMenu = function(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('save-menu');
    if (!menu) return;
    menu.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
    const menu = document.getElementById('save-menu');
    if (!menu || menu.classList.contains('hidden')) return;
    const wrapper = document.getElementById('save-menu-wrapper');
    if (wrapper && wrapper.contains(e.target)) return;
    menu.classList.add('hidden');
});
