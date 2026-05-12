// js/doceditor.js
// Handles: CSV, XLSX, DOCX, ODT, PDF upload → editor & export
// Requires: SheetJS (XLSX), mammoth.js, PDF.js (loaded lazily or via CDN)

/* ═══════════════════════════════════════════════════════
   SPREADSHEET EDITOR  (CSV / XLSX / XLS)
═══════════════════════════════════════════════════════ */

let _sheetData = [];   // 2D array of strings
let _sheetFilename = 'spreadsheet.csv';
let _sheetSaveTimer = null;

let _isDragging = false;
let _selStart = null;
let _selEnd = null;
let _lastSelectedCol = null;

// ── Spreadsheet Persistence Helpers ──────────────────────────────────────────
function _saveSheetToTab() {
    const tab = typeof getActive === 'function' ? getActive() : null;
    if (tab && tab.mode === 'spreadsheet') {
        tab.sheetData = _sheetData.map(r => [...r]);
    }
}
window._saveSheetToTab = _saveSheetToTab;

// Sync DOM cells → _sheetData → tab.sheetData (called before tab switch or storage)
window._syncAndSaveSheetToTab = function(tab) {
    document.querySelectorAll('#spreadsheet-table td[data-row]').forEach(td => {
        const r = parseInt(td.dataset.row), c = parseInt(td.dataset.col);
        while (_sheetData.length <= r) _sheetData.push([]);
        while (_sheetData[r].length <= c) _sheetData[r].push('');
        _sheetData[r][c] = td.textContent;
    });
    if (tab) tab.sheetData = _sheetData.map(r => [...r]);
};

// Restore spreadsheet data from a tab object
window.restoreSpreadsheetTab = function(tab) {
    if (!tab) return;
    _sheetFilename = tab.name || 'spreadsheet.xlsx';
    if (tab.sheetData && tab.sheetData.length > 0) {
        _sheetData = tab.sheetData.map(r => [...r]);
    } else {
        _sheetData = Array(50).fill(null).map(() => Array(26).fill(''));
    }
    renderSpreadsheet();
    switchToSpreadsheet();
    if (typeof updateUI === 'function') updateUI();
};

function getSelectedRange() {
    if (!_selStart || !_selEnd) return null;
    return {
        minR: Math.min(_selStart.r, _selEnd.r),
        maxR: Math.max(_selStart.r, _selEnd.r),
        minC: Math.min(_selStart.c, _selEnd.c),
        maxC: Math.max(_selStart.c, _selEnd.c)
    };
}

function _applySelection() {
    document.querySelectorAll('#spreadsheet-table td.sheet-selected').forEach(td => {
        td.classList.remove('sheet-selected', 'bg-blue-100', 'dark:bg-blue-900');
    });
    const range = getSelectedRange();
    if (!range) {
        if (typeof updateStatus === 'function') updateStatus();
        return;
    }
    
    for (let r = range.minR; r <= range.maxR; r++) {
        for (let c = range.minC; c <= range.maxC; c++) {
            const cell = document.querySelector(`#spreadsheet-table td[data-row="${r}"][data-col="${c}"]`);
            if (cell) cell.classList.add('sheet-selected', 'bg-blue-100', 'dark:bg-blue-900');
        }
    }

    // Update status bar with selected range
    const posEl = document.getElementById('cursor-pos');
    if (posEl) {
        const colToLetter = (c) => String.fromCharCode(65 + c);
        const start = `${colToLetter(range.minC)}${range.minR + 1}`;
        const end = `${colToLetter(range.maxC)}${range.maxR + 1}`;
        const rows = range.maxR - range.minR + 1;
        const cols = range.maxC - range.minC + 1;
        posEl.textContent = `Selected: ${start}:${end} (${rows}R × ${cols}C)`;
    }
}


document.addEventListener('mouseup', () => {
    _isDragging = false;
});

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

// Create a new blank spreadsheet and open in spreadsheet mode
window.newSpreadsheet = function() {
    // First create a dedicated tab for this spreadsheet
    if (typeof tabManager !== 'undefined') {
        tabManager.createNewTab('new.xlsx', '', false);
    }

    const wb = XLSX.utils.book_new();
    const data = Array(50).fill(null).map(() => Array(26).fill(''));
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    // loadSpreadsheet will call switchToSpreadsheet() which sets mode on the active tab
    _sheetFilename = 'new.xlsx';
    let parsedWb;
    try {
        parsedWb = XLSX.read(wbout, { type: 'array' });
    } catch(e) {
        showToast('Failed to create spreadsheet: ' + e.message, 'error');
        return;
    }
    const ws2 = parsedWb.Sheets[parsedWb.SheetNames[0]];
    _sheetData = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: '' });
    if (_sheetData.length === 0) _sheetData = [['']];
    renderSpreadsheet();
    switchToSpreadsheet();

    // Mark the active tab as a spreadsheet tab
    const tab = typeof getActive === 'function' ? getActive() : null;
    if (tab) {
        tab.mode = 'spreadsheet';
        tab.docType = 'xlsx';
        tab.isUnsaved = true;
    }
    if (typeof updateUI === 'function') updateUI();
};

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

    // Optional: make sure all rows have the same number of columns visually
    const maxCols = Math.max(..._sheetData.map(r => r.length), 26);

    _sheetData.forEach((row, ri) => {
        const tr = document.createElement('tr');

        // Row number cell
        const th = document.createElement('td');
        th.textContent = ri + 1;
        th.className = 'sheet-row-num select-none bg-gray-100 dark:bg-gray-800 text-center font-bold text-gray-500 border border-gray-300 dark:border-gray-700 w-10';
        tr.appendChild(th);

        const cols = Math.max(row.length, maxCols);
        for (let ci = 0; ci < cols; ci++) {
            const td = document.createElement('td');
            td.contentEditable = 'true';
            td.className = ri === 0 ? 'sheet-cell sheet-header border border-gray-300 dark:border-gray-700 px-2 py-1 outline-none' : 'sheet-cell border border-gray-300 dark:border-gray-700 px-2 py-1 outline-none';
            td.textContent = row[ci] !== undefined ? row[ci] : '';
            td.dataset.row = ri;
            td.dataset.col = ci;
            td.addEventListener('input', () => {
                while (_sheetData.length <= ri) _sheetData.push([]);
                while (_sheetData[ri].length <= ci) _sheetData[ri].push('');
                _sheetData[ri][ci] = td.textContent;
                // Debounced persist to tab
                clearTimeout(_sheetSaveTimer);
                _sheetSaveTimer = setTimeout(_saveSheetToTab, 800);
            });
            td.addEventListener('keydown', e => {
                if (e.key === 'Tab') { e.preventDefault(); moveFocus(ri, ci, 0, 1); }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); moveFocus(ri, ci, 1, 0); }
            });
            
            // Selection handling
            td.addEventListener('mousedown', (e) => {
                if (document.activeElement === td) return;
                _isDragging = true;
                _selStart = {r: ri, c: ci};
                _selEnd = {r: ri, c: ci};
                _lastSelectedCol = ci;
                _applySelection();
            });
            td.addEventListener('mouseenter', (e) => {
                if (_isDragging) {
                    _selEnd = {r: ri, c: ci};
                    _applySelection();
                    const sel = window.getSelection();
                    if (sel) sel.removeAllRanges();
                }
            });
            td.addEventListener('focus', () => {
                _lastSelectedCol = ci;
                if (!_isDragging) {
                    _selStart = {r: ri, c: ci};
                    _selEnd = {r: ri, c: ci};
                    _applySelection();
                }
            });
            
            tr.appendChild(td);
        }
        table.appendChild(tr);
    });

    wrapper.appendChild(table);
    _applySelection();
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
    _saveSheetToTab();
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

window.ssSort = function(dir) {
    _syncSheetData();
    const range = getSelectedRange();
    let colIdx = range ? range.minC : _lastSelectedCol;
    
    if (colIdx === null || colIdx === undefined) {
        showToast('Please click a cell in the column you want to sort.', 'info');
        return;
    }
    
    if (_sheetData.length < 2) return;
    
    // Assuming first row is header
    const header = _sheetData[0];
    let rows = _sheetData.slice(1);
    
    rows.sort((a, b) => {
        let valA = a[colIdx] !== undefined ? a[colIdx].toString() : '';
        let valB = b[colIdx] !== undefined ? b[colIdx].toString() : '';
        
        let isEmptyA = valA.trim() === '';
        let isEmptyB = valB.trim() === '';
        
        // Always push empty cells to the bottom
        if (isEmptyA && !isEmptyB) return 1;
        if (!isEmptyA && isEmptyB) return -1;
        if (isEmptyA && isEmptyB) return 0;
        
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        
        let comp = 0;
        if (!isNaN(numA) && !isNaN(numB)) {
            comp = numA - numB;
        } else {
            comp = valA.localeCompare(valB);
        }
        return dir === 'asc' ? comp : -comp;
    });
    
    _sheetData = [header, ...rows];
    renderSpreadsheet();
};

window.ssMath = function(type) {
    _syncSheetData();
    const range = getSelectedRange();
    
    if (!range) {
        showToast('Please select cells to calculate.', 'info');
        return;
    }
    
    let sum = 0;
    let count = 0;
    
    for (let r = range.minR; r <= range.maxR; r++) {
        for (let c = range.minC; c <= range.maxC; c++) {
            if (_sheetData[r] && _sheetData[r][c] !== undefined) {
                let val = _sheetData[r][c];
                if (val && !isNaN(parseFloat(val))) {
                    sum += parseFloat(val);
                    count++;
                }
            }
        }
    }
    
    let resultText = '';
    if (type === 'sum') {
        resultText = `Sum: ${sum}`;
    } else if (type === 'avg') {
        resultText = count > 0 ? `Avg: ${(sum / count).toFixed(2)}` : 'Avg: 0';
    }
    
    showToast(`${resultText} (Selected ${count} cells)`, 'success');
};

window.ssExport = function(fmt) {
    _syncSheetData();
    const ws = XLSX.utils.aoa_to_sheet(_sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const base = _sheetFilename.replace(/\.[^.]+$/, '');
    if (fmt === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(ws);
        _triggerDownload(new Blob([csv], {type:'text/csv;charset=utf-8'}), base + '.csv');
        showToast('Exported ' + base + '.csv', 'success');
    } else if (fmt === 'pdf') {
        if (typeof window.jspdf === 'undefined') { showToast('jsPDF not loaded', 'error'); return; }
        const doc = new window.jspdf.jsPDF();
        
        const header = _sheetData[0] || [];
        const body = _sheetData.slice(1);
        
        doc.autoTable({
            head: [header],
            body: body,
            theme: 'striped',
            styles: { font: 'helvetica', fontSize: 10 }
        });
        
        doc.save(base + '.pdf');
        showToast('Exported ' + base + '.pdf', 'success');
    } else {
        // SheetJS writeFile triggers download directly
        XLSX.writeFile(wb, base + '.xlsx');
        showToast('Exported ' + base + '.xlsx', 'success');
    }
};

// Export with custom filename prompt
window.ssExportAs = function() {
    _syncSheetData();
    const base = _sheetFilename.replace(/\.[^.]+$/, '');
    showSaveDialog(base + '.xlsx', ['xlsx','csv'], (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        const ws = XLSX.utils.aoa_to_sheet(_sheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        if (ext === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(ws);
            _triggerDownload(new Blob([csv], {type:'text/csv;charset=utf-8'}), filename);
        } else {
            XLSX.writeFile(wb, filename);
        }
        _sheetFilename = filename;
        showToast('Saved: ' + filename, 'success');
    });
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
        const options = {
            styleMap: [
                "b => b", "i => i", "u => u", "strike => s",
                "p[style-name='Normal'] => p:fresh",
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Heading 3'] => h3:fresh",
                "table => table:fresh",
                "tr => tr:fresh",
                "td => td:fresh"
            ]
        };
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer }, options);
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
body { font-family: "Times New Roman", Times, serif; max-width: 850px; margin: 2rem auto; padding: 2rem 4rem; line-height: 1.5; background: #fff; color: #000; box-shadow: 0 0 5px rgba(0,0,0,0.1); }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
table, th, td { border: 1px solid #000; }
th, td { padding: 6px 10px; text-align: left; vertical-align: top; }
h1, h2, h3, h4, h5, h6 { font-family: Arial, sans-serif; margin-top: 1.5em; margin-bottom: 0.5em; }
p { margin: 0 0 1em 0; }
</style>
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
    try {
        const frame = document.getElementById('visual-frame');
        const doc = frame.contentWindow.document;
        const bodyHtml = (doc && doc.body) ? doc.body.innerHTML : editor.getValue();
        showToast('Building DOCX…', 'info');
        const blob = await _buildMinimalDocx(bodyHtml);
        const base = _docFilename.replace(/\.[^.]+$/, '');
        _triggerDownload(blob, base + '.docx');
        showToast('✅ Saved: ' + base + '.docx', 'success');
    } catch(e) {
        showToast('DOCX export failed: ' + e.message, 'error');
        console.error('exportDocx error:', e);
    }
};

async function _buildMinimalDocx(htmlBody) {
    if (typeof JSZip === 'undefined') {
        // Absolute fallback: Word can open HTML with this MIME type
        const full = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
  xmlns:w='urn:schemas-microsoft-com:office:word'
  xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'>
<style>body{font-family:Calibri,sans-serif;font-size:11pt;line-height:1.5;}</style>
</head><body>${htmlBody}</body></html>`;
        return new Blob([full], { type: 'application/msword' });
    }

    // ── Convert HTML body to Word XML paragraphs ──────────────────────────
    const tmp = document.createElement('div');
    tmp.innerHTML = htmlBody;

    const wParagraphs = [];
    function addPara(text, bold = false, sz = 24) {
        if (!text.trim()) return;
        const rPr = bold ? '<w:rPr><w:b/></w:rPr>' : '';
        wParagraphs.push(
          `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr>` +
          `<w:r>${rPr}<w:rPr><w:sz w:val="${sz}"/></w:rPr>` +
          `<w:t xml:space="preserve">${_xmlEscape(text)}</w:t></w:r></w:p>`);
    }

    tmp.childNodes.forEach(node => {
        if (node.nodeType === 3) { addPara(node.textContent); return; }
        const tag = (node.tagName || '').toLowerCase();
        if (tag === 'h1') addPara(node.textContent, true, 36);
        else if (tag === 'h2') addPara(node.textContent, true, 28);
        else if (tag === 'h3') addPara(node.textContent, true, 26);
        else if (tag === 'table') {
            node.querySelectorAll('tr').forEach(tr => {
                const cells = [...tr.querySelectorAll('td,th')].map(td => td.textContent.trim()).join(' | ');
                addPara(cells);
            });
        } else if (tag === 'ul' || tag === 'ol') {
            node.querySelectorAll('li').forEach(li => addPara('• ' + li.textContent.trim()));
        } else if (tag === 'br') {
            wParagraphs.push('<w:p><w:r><w:t></w:t></w:r></w:p>');
        } else {
            const txt = node.textContent.trim();
            if (txt) addPara(txt);
        }
    });

    if (!wParagraphs.length) wParagraphs.push('<w:p><w:r><w:t>(empty)</w:t></w:r></w:p>');

    // ── Styles (required by Word) ──────────────────────────────────────────
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="24"/>
    </w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
</w:styles>`;

    // ── Settings (required by Word) ────────────────────────────────────────
    const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
</w:settings>`;

    // ── Main document ──────────────────────────────────────────────────────
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${wParagraphs.join('\n    ')}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800"/>
    </w:sectPr>
  </w:body>
</w:document>`;

    // ── word/_rels/document.xml.rels ──────────────────────────────────────
    const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`;

    // ── _rels/.rels ────────────────────────────────────────────────────────
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    // ── [Content_Types].xml ────────────────────────────────────────────────
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

    // ── Assemble ZIP ────────────────────────────────────────────────────────
    const zip = new JSZip();
    zip.file('[Content_Types].xml', contentTypes);
    zip.folder('_rels').file('.rels', rootRels);
    const word = zip.folder('word');
    word.file('document.xml', docXml);
    word.file('styles.xml', stylesXml);
    word.file('settings.xml', settingsXml);
    word.folder('_rels').file('document.xml.rels', docRels);

    return await zip.generateAsync({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });
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

window.pdfExportOCRText = async function() {
    if (!_pdfDoc) return;
    if (typeof Tesseract === 'undefined') {
        showToast('Tesseract.js not loaded', 'error'); return;
    }
    
    showToast('Starting OCR... This may take a while.', 'info');
    let allText = '';
    const canvases = document.querySelectorAll('.pdf-page-canvas');
    if (canvases.length === 0) {
        showToast('No PDF pages rendered to OCR.', 'error'); return;
    }
    
    for (let i = 0; i < canvases.length; i++) {
        showToast(`OCR processing page ${i + 1} of ${canvases.length}...`, 'info');
        try {
            const dataUrl = canvases[i].toDataURL('image/png');
            // Using English + Traditional Chinese
            const result = await Tesseract.recognize(dataUrl, 'eng+chi_tra');
            allText += result.data.text + '\n\n';
        } catch (e) {
            console.error('OCR Error on page', i+1, e);
        }
    }
    
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;padding:1rem;line-height:1.7;white-space:pre-wrap;}</style>
</head><body>${_xmlEscape(allText).replace(/\n/g,'<br>')}</body></html>`;
    const tab = getActive();
    if (tab) { tab.docType = 'pdf-text'; tab.content = html; _pdfFilename = _pdfFilename.replace('.pdf','.docx'); }
    isProgrammaticChange = true;
    editor.setValue(html);
    isProgrammaticChange = false;
    switchToVisual();
    showToast('OCR extracted — edit and Export DOCX', 'success');
};

window.exportDocxToPdf = async function() {
    if (typeof html2pdf === 'undefined') {
        showToast('html2pdf.js not loaded', 'error'); return;
    }
    const frame = document.getElementById('visual-frame');
    if (!frame) return;
    const doc = frame.contentWindow.document;
    const bodyEl = doc.body;
    
    showToast('Building PDF...', 'info');
    const base = _docFilename.replace(/\.[^.]+$/, '');
    
    const opt = {
        margin:       0.5,
        filename:     base + '.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(bodyEl).save().then(() => {
        showToast('✅ Saved: ' + base + '.pdf', 'success');
    }).catch(e => {
        showToast('PDF export failed: ' + e.message, 'error');
    });
};

/* ═══════════════════════════════════════════════════════
   OCR  (Image → Text, supports Chinese)
═══════════════════════════════════════════════════════ */

// Open OCR from an image DataURL or launch file-picker
window.openOcrDialog = async function(imageDataUrl) {
    if (!imageDataUrl) {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => window.openOcrDialog(ev.target.result);
            reader.readAsDataURL(file);
        };
        input.click(); return;
    }
    if (typeof Tesseract === 'undefined') {
        showToast('Tesseract.js not loaded', 'error'); return;
    }

    const modal = document.getElementById('ocr-progress-modal');
    const progressBar = document.getElementById('ocr-progress-bar');
    const progressText = document.getElementById('ocr-status-text');
    const progressPercent = document.getElementById('ocr-progress-percent');
    const cancelBtn = document.getElementById('ocr-cancel-btn');

    if (modal) modal.classList.remove('hidden');
    if (progressBar) progressBar.style.width = '0%';
    if (progressPercent) progressPercent.textContent = '0%';
    if (progressText) progressText.textContent = '正在初始化 OCR 引擎...';

    let isCancelled = false;
    let worker = null;

    if (cancelBtn) {
        cancelBtn.onclick = async () => {
            isCancelled = true;
            if (worker) await worker.terminate();
            if (modal) modal.classList.add('hidden');
            showToast('OCR 已取消', 'info');
        };
    }

    try {
        worker = await Tesseract.createWorker({
            logger: m => {
                if (isCancelled) return;
                if (m.status === 'recognizing text') {
                    const p = Math.floor(m.progress * 100);
                    if (progressBar) progressBar.style.width = p + '%';
                    if (progressPercent) progressPercent.textContent = p + '%';
                    if (progressText) progressText.textContent = '正在辨識文字...';
                } else {
                    if (progressText) progressText.textContent = m.status;
                }
            }
        });

        await worker.loadLanguage('eng+chi_tra+chi_sim');
        await worker.initialize('eng+chi_tra+chi_sim');
        
        if (isCancelled) return;
        
        const result = await worker.recognize(imageDataUrl);
        const text = result.data.text || '';
        await worker.terminate();

        if (modal) modal.classList.add('hidden');
        
        if (!isCancelled) {
            if (typeof tabManager !== 'undefined') {
                tabManager.createNewTab(`OCR_${new Date().getTime()}.txt`, text, false);
            }
            showToast('✅ OCR 辨識成功！', 'success');
        }
    } catch (err) {
        if (modal) modal.classList.add('hidden');
        if (!isCancelled) {
            console.error(err);
            showToast('OCR 辨識失敗: ' + err.message, 'error');
        }
    }
};


/* ═══════════════════════════════════════════════════════
   QR CODE DECODER  (jsQR)
═══════════════════════════════════════════════════════ */

window.decodeQrFromImage = function(imageSource) {
    // imageSource: DataURL string or HTMLImageElement or File
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    const run = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR === 'undefined') {
            showToast('jsQR not loaded', 'error'); return;
        }
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
            if (typeof tabManager !== 'undefined') {
                tabManager.createNewTab('qr-result.txt', code.data, false);
            }
            showToast('✅ QR Code 解碼成功！結果已開啟在新頁籤', 'success');
        } else {
            showToast('❌ 未偵測到 QR Code', 'error');
        }
    };

    if (typeof imageSource === 'string') {
        img.onload = run;
        img.src = imageSource;
    } else {
        showToast('無效的圖片來源', 'error');
    }
};

// Shared handler: called when an image file is opened/dropped — asks OCR or QR
window.handleImageFile = function(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const dataUrl = e.target.result;
        // Show choice modal
        _showImageActionModal(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
};

function _showImageActionModal(dataUrl, filename) {
    const modal = document.getElementById('image-action-modal');
    const preview = document.getElementById('image-action-preview');
    if (!modal) {
        // fallback: just do OCR
        window.openOcrDialog(dataUrl);
        return;
    }
    preview.src = dataUrl;
    modal.classList.remove('hidden');
    document.getElementById('image-action-ocr').onclick = () => {
        modal.classList.add('hidden');
        window.openOcrDialog(dataUrl);
    };
    document.getElementById('image-action-qr').onclick = () => {
        modal.classList.add('hidden');
        window.decodeQrFromImage(dataUrl);
    };
    document.getElementById('image-action-cancel').onclick = () => {
        modal.classList.add('hidden');
    };
}

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
