// js/tools/docutils.js
// ⚠️  SHARED UTILITIES — loaded first, used by all doc tool modules.
//     Load order in index.html must be:
//       docutils.js → spreadsheet.js → docx.js → pdf.js → image-actions.js → qr.js → ocr.js
//
// ⚠️  DO NOT declare _triggerDownload or _xmlEscape in any other file.
//     They are global functions shared across all doc modules.

// ─── Download Helper ──────────────────────────────────────────────────────────
function _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── XML Escape ───────────────────────────────────────────────────────────────
function _xmlEscape(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Hide All Editor Panels ───────────────────────────────────────────────────
// ⚠️  This helper is called by pdf.js and spreadsheet.js — DO NOT duplicate.
function _hideAllPanels() {
    ['editor-container','visual-container','spreadsheet-wrapper','pdf-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
    });
}
