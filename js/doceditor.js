// js/doceditor.js
// Handles: CSV, XLSX, DOCX, ODT, PDF upload → editor & export
// Requires: SheetJS (XLSX), mammoth.js, PDF.js (loaded lazily or via CDN)

/* ═══════════════════════════════════════════════════════
   SPREADSHEET EDITOR  (CSV / XLSX / XLS)
═══════════════════════════════════════════════════════ */

let _sheetData = [];   // 2D array of strings
let _sheetFilename = 'spreadsheet.csv';

function loadSpreadsheet(buffer, filename) {
    _sheetFilename = filename;
    let wb;
    try {
        wb = XLSX.read(buffer, { type: 'array' });
    } catch(e) {
        showToast('Failed to parse spreadsheet: ' + e.message, 'error');
        return;
    }
    const ws = wb.Sheets[wb.SheetNames[0]];
    _sheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (_sheetData.length === 0) _sheetData = [['']];
    renderSpreadsheet();
    switchToSpreadsheet();

    // Link to the active tab
    const tab = typeof getActive === 'function' ? getActive() : null;
    if (tab) { tab.mode = 'spreadsheet'; tab.docType = filename.split('.').pop().toLowerCase(); }
}

function loadCsv(text, filename) {
    _sheetFilename = filename;
    const wb = XLSX.read(text, { type: 'string' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    _sheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (_sheetData.length === 0) _sheetData = [['']];
    renderSpreadsheet();
    switchToSpreadsheet();
    const tab = typeof getActive === 'function' ? getActive() : null;
    if (tab) { tab.mode = 'spreadsheet'; tab.docType = 'csv'; }
}

function renderSpreadsheet() {
    const wrapper = document.getElementById('spreadsheet-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    const table = document.createElement('table');
    table.id = 'spreadsheet-table';
    table.className = 'border-collapse text-sm';

    _sheetData.forEach((row, ri) => {
        const tr = document.createElement('tr');

        // Row number cell
        const th = document.createElement('td');
        th.textContent = ri + 1;
        th.className = 'sheet-row-num select-none';
        tr.appendChild(th);

        const cols = Math.max(row.length, 1);
        for (let ci = 0; ci < cols; ci++) {
            const td = document.createElement('td');
            td.contentEditable = 'true';
            td.className = ri === 0 ? 'sheet-cell sheet-header' : 'sheet-cell';
            td.textContent = row[ci] !== undefined ? row[ci] : '';
            td.dataset.row = ri;
            td.dataset.col = ci;
            td.addEventListener('input', () => {
                while (_sheetData.length <= ri) _sheetData.push([]);
                while (_sheetData[ri].length <= ci) _sheetData[ri].push('');
                _sheetData[ri][ci] = td.textContent;
            });
            td.addEventListener('keydown', e => {
                if (e.key === 'Tab') { e.preventDefault(); moveFocus(ri, ci, 0, 1); }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); moveFocus(ri, ci, 1, 0); }
            });
            tr.appendChild(td);
        }
        table.appendChild(tr);
    });

    wrapper.appendChild(table);
}

function moveFocus(row, col, dr, dc) {
    const nr = row + dr, nc = col + dc;
    const cell = document.querySelector(`#spreadsheet-table td[data-row="${nr}"][data-col="${nc}"]`);
    if (cell) { cell.focus(); const range = document.createRange(); const sel = window.getSelection(); range.selectNodeContents(cell); range.collapse(false); sel.removeAllRanges(); sel.addRange(range); }
}

function _syncSheetData() {
    document.querySelectorAll('#spreadsheet-table td[data-row]').forEach(td => {
        const r = parseInt(td.dataset.row), c = parseInt(td.dataset.col);
        while (_sheetData.length <= r) _sheetData.push([]);
        while (_sheetData[r].length <= c) _sheetData[r].push('');
        _sheetData[r][c] = td.textContent;
    });
}

window.ssAddRow = function() {
    _syncSheetData();
    const cols = _sheetData[0] ? _sheetData[0].length : 1;
    _sheetData.push(Array(cols).fill(''));
    renderSpreadsheet();
};
window.ssDeleteRow = function() {
    _syncSheetData();
    if (_sheetData.length > 1) { _sheetData.pop(); renderSpreadsheet(); }
};
window.ssAddCol = function() {
    _syncSheetData();
    _sheetData.forEach(r => r.push(''));
    renderSpreadsheet();
};
window.ssDeleteCol = function() {
    _syncSheetData();
    _sheetData.forEach(r => { if (r.length > 1) r.pop(); });
    renderSpreadsheet();
};

window.ssExport = function(fmt) {
    _syncSheetData();
    const ws = XLSX.utils.aoa_to_sheet(_sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const base = _sheetFilename.replace(/\.[^.]+$/, '');
    if (fmt === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(ws);
        _triggerDownload(new Blob([csv], {type:'text/csv'}), base + '.csv');
    } else {
        XLSX.writeFile(wb, base + '.xlsx');
    }
    showToast('Exported ' + (fmt === 'csv' ? base+'.csv' : base+'.xlsx'), 'success');
};

/* ═══════════════════════════════════════════════════════
   DOCX / ODT EDITOR  (mammoth.js → visual iframe)
═══════════════════════════════════════════════════════ */

let _docFilename = 'document.docx';

async function loadDocx(buffer, filename) {
    if (typeof mammoth === 'undefined') {
        showToast('mammoth.js not loaded', 'error'); return;
    }
    _docFilename = filename;
    showToast('Converting document…', 'info');
    try {
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;padding:1rem;line-height:1.7;}
table{border-collapse:collapse;width:100%;}td,th{border:1px solid #ccc;padding:6px 10px;}</style>
</head><body>${result.value}</body></html>`;

        const tab = getActive();
        if (tab) {
            tab.docType = 'docx';
            tab.content = html;
        }
        // Put HTML in editor and switch to visual
        isProgrammaticChange = true;
        editor.setValue(html);
        isProgrammaticChange = false;
        switchToVisual();
        showToast('Document loaded — edit freely, then Export DOCX', 'success');
    } catch(e) {
        showToast('Failed to read document: ' + e.message, 'error');
    }
}

async function loadOdt(buffer, filename) {
    // ODT is a ZIP; extract content.xml and strip tags
    if (typeof JSZip === 'undefined') { showToast('JSZip not loaded','error'); return; }
    _docFilename = filename;
    try {
        const zip = await JSZip.loadAsync(buffer);
        const xmlFile = zip.file('content.xml');
        if (!xmlFile) throw new Error('content.xml not found');
        const xml = await xmlFile.async('string');
        // Strip XML tags, preserve paragraphs
        const text = xml
            .replace(/<text:p[^>]*>/g, '\n').replace(/<\/text:p>/g, '')
            .replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;padding:1rem;line-height:1.7;white-space:pre-wrap;}</style>
</head><body>${text.replace(/\n/g,'<br>')}</body></html>`;
        const tab = getActive();
        if (tab) { tab.docType = 'odt'; tab.content = html; }
        isProgrammaticChange = true;
        editor.setValue(html);
        isProgrammaticChange = false;
        switchToVisual();
        showToast('ODT loaded — edit and export as DOCX', 'success');
    } catch(e) {
        showToast('Failed to read ODT: ' + e.message, 'error');
    }
}

window.exportDocx = async function() {
    const doc = document.getElementById('visual-frame').contentWindow.document;
    const bodyHtml = doc.body ? doc.body.innerHTML : editor.getValue();
    const docx = _buildMinimalDocx(bodyHtml);
    const base = _docFilename.replace(/\.[^.]+$/, '');
    const blob = await docx;
    _triggerDownload(blob, base + '.docx');
    showToast('Exported ' + base + '.docx', 'success');
};

async function _buildMinimalDocx(htmlBody) {
    if (typeof JSZip === 'undefined') {
        // Fallback: download as .html with Word MIME
        return new Blob(['<html><body>' + htmlBody + '</body></html>'],
            { type: 'application/msword' });
    }
    // Parse HTML into plain paragraphs for OOXML
    const tmp = document.createElement('div');
    tmp.innerHTML = htmlBody;
    const paras = [];
    tmp.querySelectorAll('p,h1,h2,h3,li,br').forEach(el => {
        const txt = el.textContent.trim();
        if (txt) paras.push(txt);
    });
    if (!paras.length) paras.push(tmp.textContent.trim() || '(empty)');

    const wParagraphs = paras.map(p => `
  <w:p><w:r><w:t xml:space="preserve">${_xmlEscape(p)}</w:t></w:r></w:p>`).join('');

    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${wParagraphs}
  <w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body>
</w:document>`;

    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
    zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`);
    zip.folder('word').file('document.xml', docXml);
    zip.folder('word/_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);
    return await zip.generateAsync({ type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE' });
}

function _xmlEscape(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ═══════════════════════════════════════════════════════
   PDF VIEWER (PDF.js)
═══════════════════════════════════════════════════════ */

let _pdfFilename = 'document.pdf';
let _pdfDoc = null;

async function loadPdf(buffer, filename) {
    _pdfFilename = filename;
    const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    if (!pdfjsLib) { showToast('PDF.js not loaded', 'error'); return; }
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    showToast('Rendering PDF…', 'info');
    const uint8 = new Uint8Array(buffer);
    try {
        _pdfDoc = await pdfjsLib.getDocument({ data: uint8 }).promise;
    } catch(e) {
        showToast('Failed to load PDF: ' + e.message, 'error'); return;
    }

    // Switch to pdf container
    const tab = getActive();
    if (tab) { tab.mode = 'pdf'; tab.docType = 'pdf'; }
    _hideAllPanels();
    const pc = document.getElementById('pdf-container');
    if (pc) { pc.classList.remove('hidden'); pc.classList.add('flex'); }

    const pages = document.getElementById('pdf-pages');
    if (!pages) return;
    pages.innerHTML = '';

    for (let i = 1; i <= _pdfDoc.numPages; i++) {
        const page = await _pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        canvas.className = 'pdf-page-canvas';
        pages.appendChild(canvas);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
    showToast(`PDF loaded (${_pdfDoc.numPages} pages) — Export Text to edit`, 'success');
}

window.pdfExportText = async function() {
    if (!_pdfDoc) return;
    let allText = '';
    for (let i = 1; i <= _pdfDoc.numPages; i++) {
        const page = await _pdfDoc.getPage(i);
        const content = await page.getTextContent();
        allText += content.items.map(it => it.str).join(' ') + '\n\n';
    }
    // Open as editable document in visual iframe
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;padding:1rem;line-height:1.7;white-space:pre-wrap;}</style>
</head><body>${_xmlEscape(allText).replace(/\n/g,'<br>')}</body></html>`;
    const tab = getActive();
    if (tab) { tab.docType = 'pdf-text'; tab.content = html; _pdfFilename = _pdfFilename.replace('.pdf','.docx'); }
    isProgrammaticChange = true;
    editor.setValue(html);
    isProgrammaticChange = false;
    switchToVisual();
    showToast('Text extracted — edit and Export DOCX', 'success');
};

/* ═══════════════════════════════════════════════════════
   SHARED UTILITY
═══════════════════════════════════════════════════════ */

function _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

// Expose for index.html handlers
window.loadSpreadsheet = loadSpreadsheet;
window.loadCsv = loadCsv;
window.loadDocx = loadDocx;
window.loadOdt = loadOdt;
window.loadPdf = loadPdf;
