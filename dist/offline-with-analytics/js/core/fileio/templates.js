// js/core/fileio/templates.js
// New-file templates, new-file dropdown, OCR shortcut, and PDF export shortcut.

// ─── New File Templates ───────────────────────────────────────────────────────
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
    css:  { name: 'style.css',  content: `/* Styles */\n\n* { box-sizing: border-box; margin: 0; padding: 0; }\n\nbody {\n    font-family: sans-serif;\n    line-height: 1.6;\n}\n` },
    js:   { name: 'script.js',  content: `// JavaScript\n\n(function() {\n    'use strict';\n\n})();\n` },
    ts:   { name: 'index.ts',   content: `// TypeScript\n\n` },
    py:   { name: 'main.py',    content: `# Python\n\ndef main():\n    pass\n\nif __name__ == '__main__':\n    main()\n` },
    md:   { name: 'README.md',  content: `# 標題\n\n## 說明\n\n` },
    json: { name: 'data.json',  content: `{\n  \n}\n` },
    txt:  { name: 'notes.txt',  content: '' },
    sql:  { name: 'query.sql',  content: `-- SQL Query\n\nSELECT * FROM table_name;\n` },
    xlsx: null  // handled by newSpreadsheet()
};

window.newFileFromTemplate = function(type) {
    const menu = document.getElementById('new-file-menu');
    if (menu) menu.classList.add('hidden');
    if (type === 'xlsx') { window.newSpreadsheet && window.newSpreadsheet(); return; }
    const tmpl = _FILE_TEMPLATES[type];
    if (!tmpl) return;
    tabManager.createNewTab(tmpl.name, tmpl.content, false);
};

window.toggleNewFileMenu = function(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('new-file-menu');
    if (!menu) return;
    menu.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
    const menu = document.getElementById('new-file-menu');
    if (!menu || menu.classList.contains('hidden')) return;
    const wrapper = document.getElementById('new-file-menu-wrapper');
    if (wrapper && wrapper.contains(e.target)) return;
    menu.classList.add('hidden');
});

// ─── Camera to OCR shortcut ───────────────────────────────────────────────────
window.openCameraToText = function() {
    if (typeof openOcrModal === 'function') {
        openOcrModal();
        setTimeout(() => { if (typeof startOcrCamera === 'function') startOcrCamera(); }, 300);
    } else {
        showToast('OCR 模組尚未載入', 'error');
    }
};

// ─── Export as PDF (lazy-loads html2pdf) ─────────────────────────────────────
window.exportCurrentAsPdf = async function() {
    if (typeof html2pdf === 'undefined') {
        const ok = await window.ensureDependency('html2pdf', { message: '載入 PDF 匯出引擎中...' });
        if (!ok) return;
    }
    const tab = getActive();
    if (!tab) return;
    const content = editor.getValue();
    const base = (tab.name || 'document').replace(/\.[^.]+$/, '');
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
