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

// --- Spreadsheet Formula Engine ---
function colLetterToIndex(letters) {
    let index = 0;
    for (let i = 0; i < letters.length; i++) {
        index = index * 26 + (letters.charCodeAt(i) - 64);
    }
    return index - 1;
}

function indexToColLetter(index) {
    let letter = '';
    while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
    }
    return letter;
}

function evaluateFormula(formula, visited = new Set()) {
    if (typeof formula !== 'string' || !formula.startsWith('=')) {
        if (formula === '' || formula === null || formula === undefined) return '';
        const num = Number(formula);
        return isNaN(num) ? formula : num;
    }

    const expr = formula.substring(1).toUpperCase();
    
    let hasError = false;
    let errorMsg = '';

    const resolvedExpr = expr.replace(/[A-Z]+[0-9]+/g, (match) => {
        if (visited.has(match)) {
            hasError = true;
            errorMsg = '#CIRC!';
            return '0';
        }
        
        const colMatch = match.match(/[A-Z]+/)[0];
        const rowMatch = match.match(/[0-9]+/)[0];
        
        const colIdx = colLetterToIndex(colMatch);
        const rowIdx = parseInt(rowMatch, 10) - 1;
        
        if (rowIdx < 0 || colIdx < 0 || !_sheetData[rowIdx] || _sheetData[rowIdx][colIdx] === undefined) {
            return '0'; 
        }
        
        const cellValue = _sheetData[rowIdx][colIdx];
        
        visited.add(match);
        let val;
        try {
            val = evaluateFormula(cellValue, visited);
        } catch (e) {
            hasError = true;
            errorMsg = e.message;
            val = '0';
        }
        visited.delete(match);
        
        if (val === '#CIRC!' || val === '#VALUE!' || val === '#DIV/0!' || val === '#ERROR!') {
            hasError = true;
            errorMsg = val;
            return '0';
        }
        
        if (typeof val !== 'number' && isNaN(Number(val))) {
             return '0';
        }
        return val === '' ? '0' : String(Number(val));
    });

    if (hasError) throw new Error(errorMsg);

    try {
        if (!/^[0-9+\-*/().\s]+$/.test(resolvedExpr)) {
            throw new Error('#VALUE!');
        }
        const result = new Function('return ' + resolvedExpr)();
        
        if (!isFinite(result)) throw new Error('#DIV/0!');
        if (isNaN(result)) throw new Error('#VALUE!');
        
        return Math.round(result * 1000000) / 1000000;
        
    } catch (e) {
        throw new Error(e.message.startsWith('#') ? e.message : '#ERROR!');
    }
}

function updateAllCellDisplays() {
    document.querySelectorAll('#spreadsheet-table td[data-row]').forEach(td => {
        if (document.activeElement === td) return; // Skip currently editing cell
        const r = parseInt(td.dataset.row);
        const c = parseInt(td.dataset.col);
        const rawValue = _sheetData[r] && _sheetData[r][c] !== undefined ? _sheetData[r][c] : '';
        
        if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
            try {
                td.textContent = evaluateFormula(rawValue, new Set([indexToColLetter(c) + (r + 1)]));
            } catch(e) {
                td.textContent = e.message;
            }
        } else {
            td.textContent = rawValue;
        }
    });
}
// ------------------------------------

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

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const cornerTh = document.createElement('th');
    cornerTh.className = 'w-10 bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 select-none';
    headerRow.appendChild(cornerTh);
    for (let ci = 0; ci < maxCols; ci++) {
        const th = document.createElement('th');
        th.textContent = indexToColLetter(ci);
        th.className = 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-2 py-1 select-none text-center font-bold';
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');

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
            
            const rawValue = row[ci] !== undefined ? row[ci] : '';
            if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
                try {
                    td.textContent = evaluateFormula(rawValue, new Set([indexToColLetter(ci) + (ri + 1)]));
                } catch(e) {
                    td.textContent = e.message;
                }
            } else {
                td.textContent = rawValue;
            }
            
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
                // Show raw formula when focused
                const rawVal = _sheetData[ri] && _sheetData[ri][ci] !== undefined ? _sheetData[ri][ci] : '';
                if (typeof rawVal === 'string' && rawVal.startsWith('=')) {
                    td.textContent = rawVal;
                    // Move cursor to the end
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(td);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
                
                _lastSelectedCol = ci;
                if (!_isDragging) {
                    _selStart = {r: ri, c: ci};
                    _selEnd = {r: ri, c: ci};
                    _applySelection();
                }
            });
            
            td.addEventListener('blur', () => {
                // Save any raw text typed into _sheetData
                while (_sheetData.length <= ri) _sheetData.push([]);
                while (_sheetData[ri].length <= ci) _sheetData[ri].push('');
                _sheetData[ri][ci] = td.textContent;
                
                // Re-evaluate all formulas
                updateAllCellDisplays();
                
                clearTimeout(_sheetSaveTimer);
                _sheetSaveTimer = setTimeout(_saveSheetToTab, 800);
            });
            
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
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
    
    const startCell = indexToColLetter(range.minC) + (range.minR + 1);
    const endCell = indexToColLetter(range.maxC) + (range.maxR + 1);
    const formulaStr = type === 'sum' ? `=SUM(${startCell}:${endCell})` : `=AVERAGE(${startCell}:${endCell})`;
    
    let targetRow = range.maxR + 1;
    while (_sheetData.length <= targetRow) _sheetData.push([]);
    while (_sheetData[targetRow].length <= range.minC) _sheetData[targetRow].push('');
    
    _sheetData[targetRow][range.minC] = formulaStr;
    
    _saveSheetToTab();
    renderSpreadsheet();
    
    showToast(`寫入公式 ${formulaStr}`, 'success');
};

window.ssExport = function(fmt) {
    _syncSheetData();
    const exportData = _sheetData.map(row => row.map(cell => {
        if (typeof cell === 'string' && cell.startsWith('=')) {
            return { t: 'n', f: cell.substring(1).toUpperCase() };
        }
        return cell;
    }));
    const ws = XLSX.utils.aoa_to_sheet(exportData);
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
        const exportData = _sheetData.map(row => row.map(cell => {
            if (typeof cell === 'string' && cell.startsWith('=')) {
                return { t: 'n', f: cell.substring(1).toUpperCase() };
            }
            return cell;
        }));
        const ws = XLSX.utils.aoa_to_sheet(exportData);
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
            allText += window.cleanOcrText(result.data.text) + '\n\n';
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

window.cleanOcrText = function(text) {
    if (!text) return text;
    let cleanedText = text;
    let prev;
    do {
        prev = cleanedText;
        // Matches exactly one space between Chinese/Fullwidth characters and removes it.
        // It won't match 2 spaces or more.
        cleanedText = cleanedText.replace(/([\u3000-\u303F\u4e00-\u9fa5\uFF00-\uFFEF]) ([\u3000-\u303F\u4e00-\u9fa5\uFF00-\uFFEF])/g, '$1$2');
    } while (cleanedText !== prev);
    return cleanedText;
};

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
        const text = window.cleanOcrText(result.data.text || '');
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
            const modal = document.getElementById('qr-modal');
            if (modal && !modal.classList.contains('hidden')) {
                const resultText = document.getElementById('qr-scan-result');
                const resultContainer = document.getElementById('qr-scan-result-container');
                const linkBtn = document.getElementById('qr-result-link-btn');
                
                resultText.textContent = code.data;
                resultContainer.classList.remove('hidden');
                
                if (code.data.startsWith('http')) {
                    linkBtn.classList.remove('hidden');
                    linkBtn.onclick = () => window.open(code.data, '_blank');
                } else {
                    linkBtn.classList.add('hidden');
                }
                showToast('✅ QR Code 解碼成功！', 'success');
            } else {
                if (typeof tabManager !== 'undefined') {
                    tabManager.createNewTab('qr-result.txt', code.data, false);
                }
                showToast('✅ QR Code 解碼成功！結果已開啟在新頁籤', 'success');
            }
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

// --- New QR Code Generation & Scanning Logic ---
let _qrGenerator = null;
window.generateQrCode = function() {
    const input = document.getElementById('qr-gen-input');
    const output = document.getElementById('qr-output');
    const text = input.value.trim();
    if (!text) { showToast('請輸入內容', 'info'); return; }
    if (typeof QRCode === 'undefined') { showToast('QRCode library not loaded', 'error'); return; }
    output.innerHTML = '';
    _qrGenerator = new QRCode(output, {
        text: text,
        width: 180,
        height: 180,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
    showToast('QR Code 已產生', 'success');
};

window.downloadQrCode = function() {
    const output = document.getElementById('qr-output');
    const img = output.querySelector('img');
    if (!img) { showToast('請先產生 QR Code', 'info'); return; }
    const a = document.createElement('a');
    a.href = img.src;
    a.download = `qrcode_${new Date().getTime()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

window.triggerQrFileUpload = function() { document.getElementById('qr-file-input').click(); };
window.handleQrFileUpload = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => window.decodeQrFromImage(ev.target.result);
    reader.readAsDataURL(file);
};
window.triggerQrPaste = function() { showToast('請直接按下 Ctrl+V (或 Cmd+V) 貼上圖片', 'info'); };
window.copyQrResult = function() {
    const text = document.getElementById('qr-scan-result').textContent;
    navigator.clipboard.writeText(text).then(() => showToast('已複製到剪貼簿', 'success'));
};
window.openQrResultAsTab = function() {
    const text = document.getElementById('qr-scan-result').textContent;
    if (typeof tabManager !== 'undefined') { tabManager.createNewTab('qr-result.txt', text, false); window.closeQrModal(); }
};

// --- Camera QR Code Logic ---
let _qrVideoStream = null;
let _qrCameraFrameId = null;

window.startQrCamera = async function() {
    const video = document.getElementById('qr-video');
    const container = document.getElementById('qr-camera-container');
    const resultContainer = document.getElementById('qr-scan-result-container');
    
    container.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    
    try {
        _qrVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = _qrVideoStream;
        video.setAttribute("playsinline", true); // required for iOS Safari
        video.play();
        requestAnimationFrame(tickQrCamera);
    } catch (err) {
        showToast('無法存取相機: ' + err.message, 'error');
        stopQrCamera();
    }
};

window.stopQrCamera = function() {
    if (_qrVideoStream) {
        _qrVideoStream.getTracks().forEach(track => track.stop());
        _qrVideoStream = null;
    }
    if (_qrCameraFrameId) {
        cancelAnimationFrame(_qrCameraFrameId);
        _qrCameraFrameId = null;
    }
    document.getElementById('qr-camera-container').classList.add('hidden');
};

function tickQrCamera() {
    const video = document.getElementById('qr-video');
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = typeof jsQR !== 'undefined' ? jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" }) : null;
        
        if (code && code.data) {
            stopQrCamera();
            
            // Show result
            document.getElementById('qr-scan-result-container').classList.remove('hidden');
            document.getElementById('qr-scan-result').textContent = code.data;
            showToast('掃描成功！', 'success');
            
            // Check if it's a URL
            const linkBtn = document.getElementById('qr-result-link-btn');
            try {
                new URL(code.data);
                linkBtn.classList.remove('hidden');
                linkBtn.onclick = () => window.open(code.data, '_blank');
            } catch(e) {
                linkBtn.classList.add('hidden');
            }
            return; // Stop ticking
        }
    }
    _qrCameraFrameId = requestAnimationFrame(tickQrCamera);
}

// Cleanup camera when closing QR modal
const originalCloseQrModal = window.closeQrModal;
window.closeQrModal = function() {
    stopQrCamera();
    if (originalCloseQrModal) originalCloseQrModal();
};

// --- OCR Tool Logic ---
let _ocrVideoStream = null;
let _ocrPendingDataUrl = null;

window.openOcrModal = function() {
    document.getElementById('ocr-modal').classList.remove('hidden');
    resetOcr();
};

window.closeOcrModal = function() {
    stopOcrCamera();
    document.getElementById('ocr-modal').classList.add('hidden');
};

window.resetOcr = function() {
    _ocrPendingDataUrl = null;
    stopOcrCamera();
    document.getElementById('ocr-view-initial').classList.remove('hidden');
    document.getElementById('ocr-view-preview').classList.add('hidden');
    document.getElementById('ocr-view-result').classList.add('hidden');
    document.getElementById('ocr-camera-container').classList.add('hidden');
    document.getElementById('ocr-loading').classList.add('hidden');
    document.getElementById('ocr-scan-line').classList.add('hidden');
    document.getElementById('ocr-progress-bar').style.width = '0%';
};

window.startOcrCamera = async function() {
    resetOcr();
    const video = document.getElementById('ocr-video');
    const container = document.getElementById('ocr-camera-container');
    document.getElementById('ocr-view-initial').classList.add('hidden');
    container.classList.remove('hidden');
    container.classList.add('flex');
    
    try {
        _ocrVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = _ocrVideoStream;
        video.setAttribute("playsinline", true);
        video.play();
    } catch (err) {
        showToast('無法存取相機: ' + err.message, 'error');
        resetOcr();
    }
};

window.stopOcrCamera = function() {
    if (_ocrVideoStream) {
        _ocrVideoStream.getTracks().forEach(track => track.stop());
        _ocrVideoStream = null;
    }
    const container = document.getElementById('ocr-camera-container');
    if (container) {
        container.classList.add('hidden');
        container.classList.remove('flex');
    }
};

window.switchOcrView = function(view) {
    const views = ['initial', 'preview', 'result'];
    views.forEach(v => {
        const el = document.getElementById(`ocr-view-${v}`);
        if (el) el.classList.toggle('hidden', v !== view);
    });
};

window.showOcrPreview = function(dataUrl) {
    _ocrPendingDataUrl = dataUrl;
    const previewImg = document.getElementById('ocr-preview-img');
    if (previewImg) previewImg.src = dataUrl;
    switchOcrView('preview');
};

window.startPerformingOcr = function() {
    if (_ocrPendingDataUrl) {
        performOcr(_ocrPendingDataUrl);
    }
};

window.takeOcrPhoto = function(autoSave = true) {
    const video = document.getElementById('ocr-video');
    if (!video || !video.videoWidth) { showToast('無法取得相機畫面', 'error'); return; }
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    stopOcrCamera();
    const dataUrl = canvas.toDataURL('image/png');
    performOcr(dataUrl);
};

window.triggerOcrFileUpload = function() { document.getElementById('ocr-file-input').click(); };
window.handleOcrFileUpload = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-selected
    const reader = new FileReader();
    reader.onload = ev => performOcr(ev.target.result);
    reader.readAsDataURL(file);
};
window.handleOcrDrop = function(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
        showToast('請拖曳圖片檔案', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = ev => performOcr(ev.target.result);
    reader.readAsDataURL(file);
};
window.triggerOcrPaste = function() { showToast('請直接按下 Ctrl+V (或 Cmd+V) 貼上圖片', 'info'); };

// Listen for paste anywhere in the OCR modal or Document
document.addEventListener('paste', function(e) {
    if (!document.getElementById('ocr-modal').classList.contains('hidden') || !document.getElementById('qr-modal').classList.contains('hidden')) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file') {
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = function(event) {
                    if (!document.getElementById('ocr-modal').classList.contains('hidden')) {
                        showOcrPreview(event.target.result);
                    } else if (!document.getElementById('qr-modal').classList.contains('hidden')) {
                        window.decodeQrFromImage(event.target.result);
                    }
                };
                reader.readAsDataURL(blob);
                return; // only handle one image
            }
        }
    }
});

async function enhanceImageForOcr(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const scale = 2; // Upscale 2x
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i]; const g = data[i+1]; const b = data[i+2];
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                // Boost contrast significantly to make it more binary, improving OCR
                let c = (gray - 128) * 2.5 + 128; 
                c = Math.max(0, Math.min(255, c));
                data[i] = data[i+1] = data[i+2] = c;
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

async function performOcr(imageDataUrl, autoSave = false) {
    if (typeof Tesseract === 'undefined') {
        showToast('Tesseract.js OCR 引擎尚未載入', 'error');
        return;
    }
    
    const loadingEl = document.getElementById('ocr-loading');
    loadingEl.classList.remove('hidden');
    loadingEl.classList.add('flex');
    
    const lang = document.getElementById('ocr-lang-select').value || 'chi_tra+eng';
    
    try {
        const enhancedDataUrl = await enhanceImageForOcr(imageDataUrl);
        const result = await Tesseract.recognize(enhancedDataUrl, lang);
        
        loadingEl.classList.add('hidden');
        loadingEl.classList.remove('flex');
        
        const cleanedText = window.cleanOcrText(result.data.text);
        
        if (!cleanedText.trim()) {
            showToast('找不到任何文字', 'info');
            return;
        }
        
        // Auto-save to new tab and close modal
        const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '').split('.')[0];
        const filename = `OCR_Result_${dateStr}.txt`;
        // Close QR modal
        const qrModal = document.getElementById('qr-modal');
        if (qrModal) qrModal.classList.add('hidden');
        if (typeof stopOcrCamera === 'function') stopOcrCamera();
        if (typeof tabManager !== 'undefined') {
            tabManager.createNewTab(filename, cleanedText, false);
            showToast('OCR 辨識並匯出完成', 'success');
        }
        
    } catch (e) {
        loadingEl.classList.add('hidden');
        loadingEl.classList.remove('flex');
        showToast('OCR 辨識失敗: ' + e.message, 'error');
    }
}

window.saveOcrResult = function() {
    const text = document.getElementById('ocr-result-text').value;
    if (!text.trim()) {
        showToast('沒有文字可儲存', 'info');
        return;
    }
    const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '').split('.')[0];
    const filename = `OCR_Result_${dateStr}.txt`;
    if (typeof tabManager !== 'undefined') {
        tabManager.createNewTab(filename, text, false);
        closeOcrModal();
        showToast('已儲存為新檔案', 'success');
    }
};

/* ═══════════════════════════════════════════════════════
   SPREADSHEET FORMULAS
   ═══════════════════════════════════════════════════════ */

function colLetterToIndex(letter) {
    let index = 0;
    for (let i = 0; i < letter.length; i++) {
        index = index * 26 + (letter.charCodeAt(i) - 64);
    }
    return index - 1;
}

function indexToColLetter(index) {
    let letter = '';
    while (index >= 0) {
        letter = String.fromCharCode((index % 26) + 65) + letter;
        index = Math.floor(index / 26) - 1;
    }
    return letter;
}

function evaluateFormula(formula, seen = new Set()) {
    if (typeof formula !== 'string' || !formula.startsWith('=')) return formula;
    let expression = formula.substring(1).toUpperCase();
    
    // Replace cell references (e.g., A1, B12) with their values
    const cellRefRegex = /([A-Z]+)([0-9]+)/g;
    
    expression = expression.replace(cellRefRegex, (match, colLetter, rowNum) => {
        const col = colLetterToIndex(colLetter);
        const row = parseInt(rowNum) - 1;
        
        const refId = colLetter + rowNum;
        if (seen.has(refId)) throw new Error('#REF!'); // Circular reference
        
        let val = (_sheetData[row] && _sheetData[row][col] !== undefined) ? _sheetData[row][col] : 0;
        
        if (typeof val === 'string' && val.startsWith('=')) {
            const newSeen = new Set(seen);
            newSeen.add(refId);
            val = evaluateFormula(val, newSeen);
        }
        
        const num = parseFloat(val);
        return isNaN(num) ? 0 : num;
    });
    
    try {
        // Basic math evaluation
        if (/[^0-9.+\-*/%() ]/.test(expression)) {
            return '#VALUE!';
        }
        return Function('"use strict";return (' + expression + ')')();
    } catch (e) {
        return '#ERR!';
    }
}

function updateAllCellDisplays() {
    document.querySelectorAll('#spreadsheet-table td[data-row]').forEach(td => {
        const r = parseInt(td.dataset.row);
        const c = parseInt(td.dataset.col);
        const rawValue = _sheetData[r] && _sheetData[r][c] !== undefined ? _sheetData[r][c] : '';
        
        if (document.activeElement === td) return;
        
        if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
            try {
                const result = evaluateFormula(rawValue, new Set([indexToColLetter(c) + (r + 1)]));
                td.textContent = result;
            } catch (e) {
                td.textContent = e.message;
            }
        } else {
            td.textContent = rawValue;
        }
    });
}

