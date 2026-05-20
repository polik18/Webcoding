// js/features/visual.js
// Responsibility: Visual/Split/Code/Spreadsheet mode switching, iframe sync,
// contentEditable helpers, table editing commands, and custom modal dialogs.

// ─── Mode-button helper ───────────────────────────────────────────────────────
function _setActiveBtn(activeId) {
    ['mode-code-btn', 'mode-split-btn', 'mode-visual-btn'].forEach(id => {
        const btn = document.getElementById(id); if (!btn) return;
        if (id === activeId) { btn.classList.add('bg-blue-600','text-white','shadow-sm'); btn.classList.remove('text-gray-700','hover:bg-gray-200'); }
        else { btn.classList.remove('bg-blue-600','text-white','shadow-sm'); btn.classList.add('text-gray-700','hover:bg-gray-200'); }
    });
}
function _hideAllPanels() {
    ['editor-container','visual-container','merge-container','spreadsheet-container'].forEach(cid => {
        const el = document.getElementById(cid); if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
    });
    const sp = document.getElementById('split-resizer'); if (sp) sp.classList.add('hidden');
}

// ─── Mode Switches ────────────────────────────────────────────────────────────
function switchToCode() {
    if (getActive()) getActive().mode = 'code'; _setActiveBtn('mode-code-btn'); _hideAllPanels();
    const ec = document.getElementById('editor-container'); const vc = document.getElementById('visual-container');
    ec.style.width = ''; ec.style.flexGrow = '1'; ec.style.flexShrink = '1'; vc.style.width = ''; vc.style.flexGrow = '0'; vc.style.flexShrink = '1';
    ec.classList.remove('hidden'); ec.classList.add('flex'); vc.classList.add('hidden'); vc.classList.remove('flex');
    setTimeout(() => editor.refresh(), 10);
}
function switchToVisual() {
    if (getActive()) getActive().mode = 'visual'; _setActiveBtn('mode-visual-btn'); _hideAllPanels();
    const ec = document.getElementById('editor-container'); const vc = document.getElementById('visual-container');
    ec.style.width = ''; ec.style.flexGrow = '0'; ec.style.flexShrink = '1'; vc.style.width = ''; vc.style.flexGrow = '1'; vc.style.flexShrink = '1';
    ec.classList.add('hidden'); ec.classList.remove('flex'); vc.classList.remove('hidden'); vc.classList.add('flex');
    syncCodeToVisual();
}
function switchToSplit() {
    if (getActive()) getActive().mode = 'split'; _setActiveBtn('mode-split-btn'); _hideAllPanels();
    const ec = document.getElementById('editor-container'); const vc = document.getElementById('visual-container'); const sp = document.getElementById('split-resizer');
    ec.style.width = '50%'; ec.style.flexGrow = '0'; ec.style.flexShrink = '0'; vc.style.width = '50%'; vc.style.flexGrow = '0'; vc.style.flexShrink = '0';
    ec.classList.remove('hidden'); ec.classList.add('flex'); vc.classList.remove('hidden'); vc.classList.add('flex');
    if (sp) sp.classList.remove('hidden'); syncCodeToVisual(); setTimeout(() => editor.refresh(), 10);
}
function switchToSpreadsheet() {
    if (getActive()) getActive().mode = 'spreadsheet'; _setActiveBtn('mode-code-btn'); _hideAllPanels();
    const sc = document.getElementById('spreadsheet-container');
    if (sc) { sc.style.flexGrow = '1'; sc.classList.remove('hidden'); sc.classList.add('flex'); }
}

// ─── Visual Frame ─────────────────────────────────────────────────────────────
function _bindVisualFrameInput(doc) {
    if (doc.__visualInputHandler) doc.body.removeEventListener('input', doc.__visualInputHandler);
    doc.__visualInputHandler = () => { const mode = getActive().mode; if (mode === 'visual' || mode === 'split') syncVisualToCode(); };
    doc.body.addEventListener('input', doc.__visualInputHandler);
    if (doc.__visualSelectionHandler) doc.removeEventListener('selectionchange', doc.__visualSelectionHandler);
    doc.__visualSelectionHandler = () => { const mode = getActive().mode; if (mode === 'split' && typeof syncSelectionToCode === 'function') syncSelectionToCode(); };
    doc.addEventListener('selectionchange', doc.__visualSelectionHandler);
}
function initVisualFrame() {
    const frame = document.getElementById('visual-frame');
    let doc = null;
    try { doc = frame.contentWindow ? frame.contentWindow.document : frame.contentDocument; } catch(e) {}
    
    if (doc) {
        try {
            if (!doc.body) {
                const html = doc.createElement('html');
                const head = doc.createElement('head');
                const body = doc.createElement('body');
                html.appendChild(head);
                html.appendChild(body);
                doc.appendChild(html);
            }
            doc.body.style.cssText = "padding: 20px; font-family: sans-serif;";
            doc.body.contentEditable = "true";
            _bindVisualFrameInput(doc);
        } catch(e) { }
    } else {
        frame.src = 'data:text/html;charset=utf-8,' + encodeURIComponent('<html><head></head><body style="padding: 20px; font-family: sans-serif;" contenteditable="true"></body></html>');
    }
}

// ─── Code → Visual Sync ───────────────────────────────────────────────────────
let isSyncingVisual = false;
function syncCodeToVisual() {
    if (isSyncingVisual) return;
    const frame = document.getElementById('visual-frame');
    let doc = null;
    try { doc = frame.contentDocument || frame.contentWindow.document; } catch(e) {}
    const isDark = document.documentElement.classList.contains('dark');
    let content = editor.getValue(); const tab = getActive();
    const bg = isDark ? '#0f172a' : '#fff'; const fg = isDark ? '#e2e8f0' : '#1e293b'; const codeBg = isDark ? '#1e293b' : '#f1f5f9'; const border = isDark ? '#334155' : '#e2e8f0';
    const themeCss = `body{font-family:-apple-system,sans-serif;line-height:1.7;color:${fg};background:${bg};padding:40px;max-width:900px;margin:0 auto;}h1,h2,h3,h4{font-weight:700;margin-top:2em;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid ${border};padding:10px;}code{background:${codeBg};padding:0.2em 0.4em;border-radius:4px;}pre{background:${codeBg};padding:1.5rem;border-radius:8px;overflow-x:auto;}blockquote{border-left:4px solid ${border};margin:1em 0;padding:0.5em 1rem;}`;
    const isMarkdown = tab && (tab.name.toLowerCase().endsWith('.md') || tab.docType === 'md');
    let isHtml = tab && (tab.name.toLowerCase().endsWith('.html') || tab.name.toLowerCase().endsWith('.htm') || ['docx','odt','pdf-text'].includes(tab.docType));
    if (!isMarkdown && !isHtml && content.trim().startsWith('<') && /<(html|body|div|p|h[1-6]|section)[\>\s]/i.test(content)) isHtml = true;
    let htmlContent;
    if (isMarkdown) { htmlContent = typeof marked !== 'undefined' ? marked.parse(content) : content; }
    else if (isHtml) { const m = content.match(/<body[^>]*>([\s\S]*)<\/body>/i); htmlContent = m ? m[1] : content; }
    else { const esc = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); htmlContent = `<pre><code>${esc}</code></pre>`; }
    
    const m = tab ? tab.mode : 'code'; 
    const isEditable = (m === 'visual' || m === 'split');
    const full = `<!DOCTYPE html><html><head><meta charset="utf-8"><style data-theme="visual">${themeCss}</style></head><body spellcheck="false" ${isEditable ? 'contenteditable="true"' : ''}>${htmlContent}</body></html>`; 
    
    let success = false;
    if (doc) {
        try {
            if (!doc.head) doc.documentElement.appendChild(doc.createElement('head'));
            if (!doc.body) doc.documentElement.appendChild(doc.createElement('body'));
            
            let styleEl = doc.head.querySelector('style[data-theme="visual"]');
            if (!styleEl) {
                styleEl = doc.createElement('style');
                styleEl.setAttribute('data-theme', 'visual');
                doc.head.appendChild(styleEl);
            }
            styleEl.textContent = themeCss;
            
            const s = doc.documentElement.scrollTop || doc.body.scrollTop; 
            doc.body.innerHTML = htmlContent; 
            doc.body.spellcheck = false;
            doc.documentElement.scrollTop = doc.body.scrollTop = s; 
            
            doc.body.contentEditable = isEditable ? 'true' : 'false'; 
            _bindVisualFrameInput(doc);
            success = true;
        } catch(e) { console.error("Visual Sync DOM Error:", e); }
    } 
    
    if (!success) {
        frame.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(full);
        frame.onload = () => {
            try { _bindVisualFrameInput(frame.contentDocument || frame.contentWindow.document); } catch(e) {}
        };
    }
}

// ─── Visual → Code Sync ───────────────────────────────────────────────────────
function formatHTML(html) {
    let f = ''; let pad = 0;
    html = html.replace(/\r?\n/g,'').replace(/(>)(<)(\/*)/, '$1\n$2$3');
    html.split('\n').forEach(l => { let i = 0; if (l.match(/.+<\/\w[^>]*>$/)) {} else if (l.match(/^<\/\w/)) { if (pad !== 0) pad -= 1; } else if (l.match(/^<\w([^>]*[^\/])?>.*$/)) { i = 1; } f += '    '.repeat(pad) + l + '\n'; pad += i; });
    return f.trim();
}
let syncTimeout = null; let turndownService = null;
function syncVisualToCode() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        const frame = document.getElementById('visual-frame'); 
        let doc = null;
        try { doc = frame.contentDocument || frame.contentWindow.document; } catch(e) { return; }
        if (!doc) return;
        const tab = getActive();
        if (!tab || (tab.mode !== 'visual' && tab.mode !== 'split')) return;
        isSyncingVisual = true; const cur = editor.getCursor(); window.isProgrammaticChange = true;
        if (tab.name.toLowerCase().endsWith('.md') || tab.docType === 'md') {
            if (typeof TurndownService !== 'undefined') { if (!turndownService) turndownService = new TurndownService({headingStyle:'atx',codeBlockStyle:'fenced',hr:'---',bulletListMarker:'-'}); editor.setValue(turndownService.turndown(doc.body.innerHTML)); }
        } else {
            let c = doc.body.innerHTML.replace(/ contenteditable="(true|false)"/gi,'').replace(/ contenteditable/gi,'');
            if (editor.getValue().toLowerCase().includes('<html')) c = `<!DOCTYPE html>\n<html>\n<head>\n    <meta charset="utf-8">\n    <title>${tab.name}</title>\n</head>\n<body>\n${c}\n</body>\n</html>`;
            editor.setValue(formatHTML(c));
        }
        editor.setCursor(cur); window.isProgrammaticChange = false; isSyncingVisual = false; tabManager.markUnsaved();
    }, 500);
}

// ─── Custom Modal (shared) ────────────────────────────────────────────────────
let modalCallback = null;
function showCustomPrompt(title, message, defaultValue, callback) {
    const modal = document.getElementById('custom-modal'); const content = document.getElementById('custom-modal-content');
    document.getElementById('custom-modal-title').textContent = title; document.getElementById('custom-modal-message').textContent = message;
    const inputEl = document.getElementById('custom-modal-input'); inputEl.value = defaultValue || ''; modalCallback = callback;
    inputEl.classList.remove('hidden'); modal.classList.remove('hidden'); void modal.offsetWidth;
    content.classList.remove('scale-95','opacity-0'); content.classList.add('scale-100','opacity-100');
    inputEl.focus(); if (defaultValue) inputEl.select();
}
function showCustomConfirm(title, message, callback) {
    const modal = document.getElementById('custom-modal'); const content = document.getElementById('custom-modal-content');
    document.getElementById('custom-modal-title').textContent = title; document.getElementById('custom-modal-message').textContent = message;
    const inputEl = document.getElementById('custom-modal-input'); inputEl.classList.add('hidden');
    modalCallback = () => { inputEl.classList.remove('hidden'); callback(true); };
    modal.classList.remove('hidden'); void modal.offsetWidth;
    content.classList.remove('scale-95','opacity-0'); content.classList.add('scale-100','opacity-100');
    document.getElementById('custom-modal-confirm').focus();
}
function closeCustomModal() {
    const modal = document.getElementById('custom-modal'); const content = document.getElementById('custom-modal-content');
    content.classList.remove('scale-100','opacity-100'); content.classList.add('scale-95','opacity-0');
    document.getElementById('custom-modal-input').classList.remove('hidden');
    setTimeout(() => { modal.classList.add('hidden'); modalCallback = null; }, 200);
}
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('custom-modal-cancel').addEventListener('click', closeCustomModal);
    document.getElementById('custom-modal-confirm').addEventListener('click', () => { if (modalCallback) modalCallback(document.getElementById('custom-modal-input').value); closeCustomModal(); });
    document.getElementById('custom-modal-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('custom-modal-confirm').click(); } if (e.key === 'Escape') { e.preventDefault(); closeCustomModal(); } });
});

// ─── Visual editing commands ──────────────────────────────────────────────────
let visualSelectionRange = null;
function saveVisualSelection() { 
    try { 
        const win = document.getElementById('visual-frame').contentWindow;
        if (!win) return;
        const sel = win.getSelection(); 
        if (sel && sel.rangeCount > 0) visualSelectionRange = sel.getRangeAt(0).cloneRange(); 
    } catch(e) {} 
}
function execCmd(command, value = null) { 
    const frame = document.getElementById('visual-frame'); 
    let doc = null;
    try { doc = frame.contentDocument || frame.contentWindow.document; } catch(e) { return; }
    if (!doc) return;
    doc.execCommand('styleWithCSS',false,true); 
    doc.execCommand(command,false,value); 
    frame.contentWindow.focus(); 
    syncVisualToCode(); 
}
function applyTextColor(color) { 
    try {
        const win = document.getElementById('visual-frame').contentWindow; 
        if (!win || !win.document) return;
        win.focus(); 
        if (visualSelectionRange) { 
            const sel = win.getSelection(); 
            sel.removeAllRanges(); 
            sel.addRange(visualSelectionRange); 
        } 
        win.document.execCommand('styleWithCSS',false,true); 
        win.document.execCommand('foreColor',false,color); 
        syncVisualToCode(); 
    } catch(e) {}
}
function insertImagePrompt() { showCustomPrompt(t('visual.insertImg'),t('messages.promptImg'),"https://",(url) => { if(url) execCmd('insertImage',url); }); }
function insertLinkPrompt() { showCustomPrompt(t('visual.insertLink'),t('messages.promptLink'),"https://",(url) => { if(url) execCmd('createLink',url); }); }
function insertTablePrompt() {
    showCustomPrompt(t('visual.insertTable'),t('messages.promptTableMsg'),"ok",(res) => {
        if (res) { let h = '<table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tbody>'; for (let i=0;i<3;i++){h+='<tr>';for(let j=0;j<3;j++)h+=`<td style="border:1px solid #e2e8f0;padding:10px 12px;min-width:50px;">${i===0&&j===0?t('messages.tableCell'):'<br>'}</td>`;h+='</tr>';} h+='</tbody></table><p><br></p>'; execCmd('insertHTML',h); }
    });
}
function getClosestTableElement(tagName) { 
    try {
        const win = document.getElementById('visual-frame').contentWindow;
        if (!win) return null;
        const sel = win.getSelection(); 
        if (!sel || sel.rangeCount===0) return null; 
        let node = sel.getRangeAt(0).startContainer; 
        if (node.nodeType===3) node=node.parentNode; 
        while (node&&node.nodeName!=='BODY') { 
            if (node.nodeName===tagName.toUpperCase()) return node; 
            node=node.parentNode; 
        } 
        return null; 
    } catch(e) { return null; }
}
function addTableRow() { const tr = getClosestTableElement('TR'); if (tr) { const newTr = tr.cloneNode(true); Array.from(newTr.cells).forEach(c=>c.innerHTML='<br>'); tr.parentNode.insertBefore(newTr,tr.nextSibling); syncVisualToCode(); } else showToast(t('messages.errTable'),"error"); }
function addTableColumn() { const td=getClosestTableElement('TD')||getClosestTableElement('TH'); if(td){const tr=td.parentNode;const idx=Array.from(tr.cells).indexOf(td);const table=getClosestTableElement('TABLE');if(table){Array.from(table.rows).forEach(row=>{const nc=row.cells[idx].cloneNode(true);nc.innerHTML='<br>';row.insertBefore(nc,row.cells[idx].nextSibling);});syncVisualToCode();}}else showToast(t('messages.errTable'),"error"); }
function removeTableRow() { const tr=getClosestTableElement('TR'); if(tr){tr.parentNode.removeChild(tr);syncVisualToCode();}else showToast(t('messages.errTable'),"error"); }
function removeTableColumn() { const td=getClosestTableElement('TD')||getClosestTableElement('TH'); if(td){const idx=Array.from(td.parentNode.cells).indexOf(td);const table=getClosestTableElement('TABLE');if(table){Array.from(table.rows).forEach(row=>{if(row.cells[idx])row.removeChild(row.cells[idx]);});syncVisualToCode();}}else showToast(t('messages.errTable'),"error"); }
// Legacy sync stubs (for split-view selection bridging — full implementation in original)
function syncSelectionToVisual() {}
function syncSelectionToCode() {}
