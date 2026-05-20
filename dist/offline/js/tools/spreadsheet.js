// js/tools/spreadsheet.js
// Responsibility: CSV / XLSX / XLS spreadsheet editor & export.
// Requires: js/tools/docutils.js (loaded before this file)
//
// ⚠️  DO NOT declare colLetterToIndex, indexToColLetter, evaluateFormula,
//     updateAllCellDisplays here more than once — they are defined in this
//     file and ONLY this file. The duplicate definitions that were at the
//     old monolithic document editor have been removed.
//
// ⚠️  _triggerDownload is defined in docutils.js — DO NOT re-declare here.

/* ═══════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════ */
let _sheetData = [];
let _sheetFilename = 'spreadsheet.csv';
let _sheetSaveTimer = null;

let _isDragging = false;
let _selStart = null;
let _selEnd = null;
let _lastSelectedCol = null;

/* ═══════════════════════════════════════════════════════
   FORMULA ENGINE
═══════════════════════════════════════════════════════ */
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
        if (visited.has(match)) { hasError = true; errorMsg = '#CIRC!'; return '0'; }
        const colMatch = match.match(/[A-Z]+/)[0];
        const rowMatch = match.match(/[0-9]+/)[0];
        const colIdx = colLetterToIndex(colMatch);
        const rowIdx = parseInt(rowMatch, 10) - 1;
        if (rowIdx < 0 || colIdx < 0 || !_sheetData[rowIdx] || _sheetData[rowIdx][colIdx] === undefined) return '0';
        const cellValue = _sheetData[rowIdx][colIdx];
        visited.add(match);
        let val;
        try { val = evaluateFormula(cellValue, visited); } catch (e) { hasError = true; errorMsg = e.message; val = '0'; }
        visited.delete(match);
        if (val === '#CIRC!' || val === '#VALUE!' || val === '#DIV/0!' || val === '#ERROR!') { hasError = true; errorMsg = val; return '0'; }
        if (typeof val !== 'number' && isNaN(Number(val))) return '0';
        return val === '' ? '0' : String(Number(val));
    });

    if (hasError) throw new Error(errorMsg);
    try {
        if (!/^[0-9+\-*/().\s]+$/.test(resolvedExpr)) throw new Error('#VALUE!');
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
        if (document.activeElement === td) return;
        const r = parseInt(td.dataset.row);
        const c = parseInt(td.dataset.col);
        const rawValue = _sheetData[r] && _sheetData[r][c] !== undefined ? _sheetData[r][c] : '';
        if (typeof rawValue === 'string' && rawValue.startsWith('=')) {
            try { td.textContent = evaluateFormula(rawValue, new Set([indexToColLetter(c) + (r + 1)])); }
            catch(e) { td.textContent = e.message; }
        } else {
            td.textContent = rawValue;
        }
    });
}

/* ═══════════════════════════════════════════════════════
   PERSISTENCE HELPERS
═══════════════════════════════════════════════════════ */
function _saveSheetToTab() {
    const tab = typeof getActive === 'function' ? getActive() : null;
    if (tab && tab.mode === 'spreadsheet') {
        tab.sheetData = _sheetData.map(r => [...r]);
    }
}
window._saveSheetToTab = _saveSheetToTab;

window._syncAndSaveSheetToTab = function(tab) {
    document.querySelectorAll('#spreadsheet-table td[data-row]').forEach(td => {
        const r = parseInt(td.dataset.row), c = parseInt(td.dataset.col);
        while (_sheetData.length <= r) _sheetData.push([]);
        while (_sheetData[r].length <= c) _sheetData[r].push('');
        _sheetData[r][c] = td.textContent;
    });
    if (tab) tab.sheetData = _sheetData.map(r => [...r]);
};

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

/* ═══════════════════════════════════════════════════════
   SELECTION
═══════════════════════════════════════════════════════ */
function getSelectedRange() {
    if (!_selStart || !_selEnd) return null;
    return {
        minR: Math.min(_selStart.r, _selEnd.r), maxR: Math.max(_selStart.r, _selEnd.r),
        minC: Math.min(_selStart.c, _selEnd.c), maxC: Math.max(_selStart.c, _selEnd.c)
    };
}

function _applySelection() {
    document.querySelectorAll('#spreadsheet-table td.sheet-selected').forEach(td => {
        td.classList.remove('sheet-selected', 'bg-blue-100', 'dark:bg-blue-900');
    });
    const range = getSelectedRange();
    if (!range) { if (typeof updateStatus === 'function') updateStatus(); return; }
    for (let r = range.minR; r <= range.maxR; r++) {
        for (let c = range.minC; c <= range.maxC; c++) {
            const cell = document.querySelector(`#spreadsheet-table td[data-row="${r}"][data-col="${c}"]`);
            if (cell) cell.classList.add('sheet-selected', 'bg-blue-100', 'dark:bg-blue-900');
        }
    }
    const posEl = document.getElementById('cursor-pos');
    if (posEl) {
        const colToLetter = (c) => String.fromCharCode(65 + c);
        posEl.textContent = `Selected: ${colToLetter(range.minC)}${range.minR+1}:${colToLetter(range.maxC)}${range.maxR+1} (${range.maxR-range.minR+1}R × ${range.maxC-range.minC+1}C)`;
    }
}

document.addEventListener('mouseup', () => { _isDragging = false; });

/* ═══════════════════════════════════════════════════════
   RENDER & EDIT
═══════════════════════════════════════════════════════ */
function renderSpreadsheet() {
    const wrapper = document.getElementById('spreadsheet-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    const table = document.createElement('table');
    table.id = 'spreadsheet-table';
    table.className = 'border-collapse text-sm';
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
                try { td.textContent = evaluateFormula(rawValue, new Set([indexToColLetter(ci) + (ri + 1)])); }
                catch(e) { td.textContent = e.message; }
            } else { td.textContent = rawValue; }
            td.dataset.row = ri; td.dataset.col = ci;
            td.addEventListener('input', () => {
                while (_sheetData.length <= ri) _sheetData.push([]);
                while (_sheetData[ri].length <= ci) _sheetData[ri].push('');
                _sheetData[ri][ci] = td.textContent;
                clearTimeout(_sheetSaveTimer);
                _sheetSaveTimer = setTimeout(_saveSheetToTab, 800);
            });
            td.addEventListener('keydown', e => {
                if (e.key === 'Tab') { e.preventDefault(); moveFocus(ri, ci, 0, 1); }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); moveFocus(ri, ci, 1, 0); }
            });
            td.addEventListener('mousedown', () => {
                if (document.activeElement === td) return;
                _isDragging = true; _selStart = {r: ri, c: ci}; _selEnd = {r: ri, c: ci}; _lastSelectedCol = ci; _applySelection();
            });
            td.addEventListener('mouseenter', () => {
                if (_isDragging) { _selEnd = {r: ri, c: ci}; _applySelection(); const sel = window.getSelection(); if (sel) sel.removeAllRanges(); }
            });
            td.addEventListener('focus', () => {
                const rawVal = _sheetData[ri] && _sheetData[ri][ci] !== undefined ? _sheetData[ri][ci] : '';
                if (typeof rawVal === 'string' && rawVal.startsWith('=')) {
                    td.textContent = rawVal;
                    const range = document.createRange(); const sel = window.getSelection();
                    range.selectNodeContents(td); range.collapse(false); sel.removeAllRanges(); sel.addRange(range);
                }
                _lastSelectedCol = ci;
                if (!_isDragging) { _selStart = {r: ri, c: ci}; _selEnd = {r: ri, c: ci}; _applySelection(); }
            });
            td.addEventListener('blur', () => {
                while (_sheetData.length <= ri) _sheetData.push([]);
                while (_sheetData[ri].length <= ci) _sheetData[ri].push('');
                _sheetData[ri][ci] = td.textContent;
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

/* ═══════════════════════════════════════════════════════
   LOAD / NEW
═══════════════════════════════════════════════════════ */
async function loadSpreadsheet(buffer, filename) {
    if (!await window.ensureDependency('xlsx', { message: '載入試算表引擎中...' })) return;
    _sheetFilename = filename;
    let wb;
    try { wb = XLSX.read(buffer, { type: 'array' }); }
    catch(e) { showToast('Failed to parse spreadsheet: ' + e.message, 'error'); return; }
    const ws = wb.Sheets[wb.SheetNames[0]];
    _sheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (_sheetData.length === 0) _sheetData = [['']];
    renderSpreadsheet(); switchToSpreadsheet();
    const tab = typeof getActive === 'function' ? getActive() : null;
    if (tab) { tab.mode = 'spreadsheet'; tab.docType = filename.split('.').pop().toLowerCase(); }
}

async function loadCsv(text, filename) {
    if (!await window.ensureDependency('xlsx', { message: '載入試算表引擎中...' })) return;
    _sheetFilename = filename;
    const wb = XLSX.read(text, { type: 'string' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    _sheetData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (_sheetData.length === 0) _sheetData = [['']];
    renderSpreadsheet(); switchToSpreadsheet();
    const tab = typeof getActive === 'function' ? getActive() : null;
    if (tab) { tab.mode = 'spreadsheet'; tab.docType = 'csv'; }
}

window.newSpreadsheet = async function() {
    if (!await window.ensureDependency('xlsx', { message: '載入試算表引擎中...' })) return;
    if (typeof tabManager !== 'undefined') tabManager.createNewTab('new.xlsx', '', false);
    const wb = XLSX.utils.book_new();
    const data = Array(50).fill(null).map(() => Array(26).fill(''));
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    _sheetFilename = 'new.xlsx';
    let parsedWb;
    try { parsedWb = XLSX.read(wbout, { type: 'array' }); }
    catch(e) { showToast('Failed to create spreadsheet: ' + e.message, 'error'); return; }
    const ws2 = parsedWb.Sheets[parsedWb.SheetNames[0]];
    _sheetData = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: '' });
    if (_sheetData.length === 0) _sheetData = [['']];
    renderSpreadsheet(); switchToSpreadsheet();
    const tab = typeof getActive === 'function' ? getActive() : null;
    if (tab) { tab.mode = 'spreadsheet'; tab.docType = 'xlsx'; tab.isUnsaved = true; }
    if (typeof updateUI === 'function') updateUI();
};

/* ═══════════════════════════════════════════════════════
   ROW / COL / SORT / MATH COMMANDS
═══════════════════════════════════════════════════════ */
window.ssAddRow = function() { _syncSheetData(); const cols = _sheetData[0] ? _sheetData[0].length : 1; _sheetData.push(Array(cols).fill('')); renderSpreadsheet(); };
window.ssDeleteRow = function() { _syncSheetData(); if (_sheetData.length > 1) { _sheetData.pop(); renderSpreadsheet(); } };
window.ssAddCol = function() { _syncSheetData(); _sheetData.forEach(r => r.push('')); renderSpreadsheet(); };
window.ssDeleteCol = function() { _syncSheetData(); _sheetData.forEach(r => { if (r.length > 1) r.pop(); }); renderSpreadsheet(); };

window.ssSort = function(dir) {
    _syncSheetData();
    const range = getSelectedRange();
    let colIdx = range ? range.minC : _lastSelectedCol;
    if (colIdx === null || colIdx === undefined) { showToast('Please click a cell in the column you want to sort.', 'info'); return; }
    if (_sheetData.length < 2) return;
    const header = _sheetData[0];
    let rows = _sheetData.slice(1);
    rows.sort((a, b) => {
        let valA = a[colIdx] !== undefined ? a[colIdx].toString() : '';
        let valB = b[colIdx] !== undefined ? b[colIdx].toString() : '';
        if (valA.trim() === '' && valB.trim() !== '') return 1;
        if (valA.trim() !== '' && valB.trim() === '') return -1;
        if (valA.trim() === '' && valB.trim() === '') return 0;
        const numA = parseFloat(valA), numB = parseFloat(valB);
        let comp = (!isNaN(numA) && !isNaN(numB)) ? numA - numB : valA.localeCompare(valB);
        return dir === 'asc' ? comp : -comp;
    });
    _sheetData = [header, ...rows]; renderSpreadsheet();
};

window.ssMath = function(type) {
    _syncSheetData();
    const range = getSelectedRange();
    if (!range) { showToast('Please select cells to calculate.', 'info'); return; }
    const startCell = indexToColLetter(range.minC) + (range.minR + 1);
    const endCell = indexToColLetter(range.maxC) + (range.maxR + 1);
    const formulaStr = type === 'sum' ? `=SUM(${startCell}:${endCell})` : `=AVERAGE(${startCell}:${endCell})`;
    let targetRow = range.maxR + 1;
    while (_sheetData.length <= targetRow) _sheetData.push([]);
    while (_sheetData[targetRow].length <= range.minC) _sheetData[targetRow].push('');
    _sheetData[targetRow][range.minC] = formulaStr;
    _saveSheetToTab(); renderSpreadsheet();
    showToast(`寫入公式 ${formulaStr}`, 'success');
};

/* ═══════════════════════════════════════════════════════
   EXPORT
═══════════════════════════════════════════════════════ */
window.ssExport = async function(fmt) {
    if (!await window.ensureDependency('xlsx', { message: '載入試算表引擎中...' })) return;
    _syncSheetData();
    const exportData = _sheetData.map(row => row.map(cell => {
        if (typeof cell === 'string' && cell.startsWith('=')) return { t: 'n', f: cell.substring(1).toUpperCase() };
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
        if (!await window.ensureDependency('spreadsheet-pdf', { message: '載入試算表 PDF 匯出引擎中...' })) return;
        const doc = new window.jspdf.jsPDF();
        doc.autoTable({ head: [_sheetData[0] || []], body: _sheetData.slice(1), theme: 'striped', styles: { font: 'helvetica', fontSize: 10 } });
        doc.save(base + '.pdf');
        showToast('Exported ' + base + '.pdf', 'success');
    } else {
        XLSX.writeFile(wb, base + '.xlsx');
        showToast('Exported ' + base + '.xlsx', 'success');
    }
};

window.ssExportAs = async function() {
    if (!await window.ensureDependency('xlsx', { message: '載入試算表引擎中...' })) return;
    _syncSheetData();
    const base = _sheetFilename.replace(/\.[^.]+$/, '');
    showSaveDialog(base + '.xlsx', ['xlsx','csv'], (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        const exportData = _sheetData.map(row => row.map(cell => {
            if (typeof cell === 'string' && cell.startsWith('=')) return { t: 'n', f: cell.substring(1).toUpperCase() };
            return cell;
        }));
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        if (ext === 'csv') { _triggerDownload(new Blob([XLSX.utils.sheet_to_csv(ws), {type:'text/csv;charset=utf-8'}]), filename); }
        else { XLSX.writeFile(wb, filename); }
        _sheetFilename = filename;
        showToast('Saved: ' + filename, 'success');
    });
};

// ─── Expose globals ───────────────────────────────────────────────────────────
window.loadSpreadsheet = loadSpreadsheet;
window.loadCsv = loadCsv;
