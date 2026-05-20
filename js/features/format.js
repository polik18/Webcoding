// js/features/format.js
// Responsibility: Code formatting (lazy-loads js-beautify), renameFile,
// toggleEOL, changeEncoding, and QR/OCR/SEO modal wiring.

// ─── Code Formatting (lazy-load beautify libs) ────────────────────────────────
async function formatCode() {
    if (getActive().mode === 'visual') return showToast(t('messages.noRunVis'), "error");
    const mode = editor.getOption('mode');
    const code = editor.getValue();

    if ((mode === 'htmlmixed' || mode === 'javascript' || mode === 'application/json' || mode === 'css')
        && (typeof js_beautify === 'undefined' || typeof css_beautify === 'undefined' || typeof html_beautify === 'undefined')) {
        const ok = await window.ensureDependency('beautify', { message: '載入格式化引擎中...' });
        if (!ok) return;
    }

    let formattedCode = code;
    try {
        if (mode === 'htmlmixed') { formattedCode = html_beautify(code, { indent_size: 4, wrap_line_length: 0 }); }
        else if (mode === 'javascript' || mode === 'application/json') { formattedCode = js_beautify(code, { indent_size: 4 }); }
        else if (mode === 'css') { formattedCode = css_beautify(code, { indent_size: 4 }); }
        else { return showToast(t('messages.errFormatNotSup'), "info"); }
        if (formattedCode !== code) {
            const cursor = editor.getCursor();
            window.isProgrammaticChange = true; editor.setValue(formattedCode); window.isProgrammaticChange = false;
            editor.setCursor(cursor); tabManager.markUnsaved();
            showToast(t('nav.formatTitle') || "Formatted", "success");
        }
    } catch (e) { showToast(t('messages.errFormat'), "error"); console.error(e); }
}
window.formatCode = formatCode;

// ─── Rename File ───────────────────────────────────────────────────────────────
function renameFile() {
    const tab = getActive();
    showCustomPrompt(t('messages.renamePrompt'), t('messages.renameMsg'), tab.name, (newName) => {
        if (newName && newName.trim() !== "") {
            const prevName = tab.name;
            tab.name = newName.trim();
            tab.isDefault = false;
            // Clear FS handle so next save triggers "Save As" (name has changed)
            if (tab.fsId && window.fileSystem) {
                const node = fileSystem.getNode(tab.fsId);
                if (node) {
                    node.name = tab.name;
                    if (prevName !== tab.name) delete node.handle;
                    window.fileSystem.save();
                    window.fileSystem.renderTree();
                }
            }
            tabManager.renderTabs();
            updateUI();
        }
    });
}

// ─── EOL and Encoding ─────────────────────────────────────────────────────────
function toggleEOL() {
    const tab = getActive();
    tab.eol = tab.eol === '\n' ? '\r\n' : '\n';
    document.getElementById('eol-toggle').textContent = tab.eol === '\n' ? 'LF' : 'CRLF';
    tabManager.markUnsaved();
}
function changeEncoding(enc) {
    const tab = getActive(); tab.encoding = enc;
    if (tab.fileBuffer) {
        try {
            const decoder = new TextDecoder(tab.encoding); const text = decoder.decode(tab.fileBuffer);
            window.isProgrammaticChange = true; editor.setValue(text); window.isProgrammaticChange = false;
            tab.isUnsaved = false; tabManager.renderTabs(); updateUI();
        } catch(e) { showToast(t('messages.errEncoding'), "error"); }
    }
}

// ─── QR / OCR Modal Wiring ────────────────────────────────────────────────────
window.openQrModal = async function() {
    document.getElementById('qr-modal').classList.remove('hidden');
    switchQrTab('generate');
    if (typeof window.ensureQrLibraries === 'function') {
        // Start QR libraries early while the user is still deciding between generate / scan.
        window.ensureQrLibraries({ generator: true, scanner: true });
    }
    if (typeof window.scheduleOcrPreload === 'function') {
        window.scheduleOcrPreload({ lang: 'chi_tra+eng', profile: 'balanced', reason: 'open-vision-tools', includeLanguageData: true });
    }
};
window.closeQrModal = function() { document.getElementById('qr-modal').classList.add('hidden'); };

window.switchQrTab = function(tab) {
    const tabs = ['generate','scan','ocr'];
    const colors = { generate: ['border-emerald-500','text-emerald-600'], scan: ['border-emerald-500','text-emerald-600'], ocr: ['border-violet-500','text-violet-600'] };
    tabs.forEach(t => {
        const tabEl = document.getElementById(`qr-tab-${t}`); const panelEl = document.getElementById(`qr-panel-${t}`);
        if (!tabEl || !panelEl) return;
        if (t === tab) { tabEl.classList.add(...colors[t]); tabEl.classList.remove('border-transparent','text-gray-500'); panelEl.classList.remove('hidden'); }
        else { tabEl.classList.remove(...colors[t]); tabEl.classList.add('border-transparent','text-gray-500'); panelEl.classList.add('hidden'); }
    });
    if (tab === 'ocr' && typeof window.scheduleOcrPreload === 'function') {
        window.scheduleOcrPreload({ lang: 'chi_tra+eng', profile: 'balanced', reason: 'ocr-tab', includeLanguageData: true });
    }
    if (tab !== 'ocr' && typeof stopOcrCamera === 'function') stopOcrCamera();
};

window.openOcrModal = function() { window.openQrModal(); window.switchQrTab('ocr'); };
window.closeOcrModal = function() {
    if (typeof stopOcrCamera === 'function') stopOcrCamera();
    const el = document.getElementById('ocr-loading'); if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
};

window.qrImportContent = function(type) {
    const input = document.getElementById('qr-gen-input');
    if (type === 'current') input.value = editor.getValue();
    else if (type === 'link') input.value = window.location.href;
};
