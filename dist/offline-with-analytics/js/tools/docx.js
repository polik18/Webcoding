// js/tools/docx.js
// Responsibility: DOCX / ODT loading, editing, and export.
// Requires: js/tools/docutils.js (for _triggerDownload, _xmlEscape)
//
// ⚠️  _triggerDownload and _xmlEscape come from docutils.js — DO NOT re-declare.
// ⚠️  _docFilename is declared with `let` here — DO NOT declare it elsewhere.

let _docFilename = 'document.docx';

async function loadDocx(buffer, filename) {
    if (!await window.ensureDependency('mammoth', { message: '載入 DOCX 讀取引擎中...' })) return;
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
                "table => table:fresh", "tr => tr:fresh", "td => td:fresh"
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
        if (tab) { tab.docType = 'docx'; tab.content = html; }
        window.isProgrammaticChange = true; editor.setValue(html); window.isProgrammaticChange = false;
        switchToVisual();
        showToast('Document loaded — edit freely, then Export DOCX', 'success');
    } catch(e) {
        showToast('Failed to read document: ' + e.message, 'error');
    }
}

async function loadOdt(buffer, filename) {
    if (!await window.ensureDependency('jszip', { message: '載入 ODT 解壓縮引擎中...' })) return;
    _docFilename = filename;
    try {
        const zip = await JSZip.loadAsync(buffer);
        const xmlFile = zip.file('content.xml');
        if (!xmlFile) throw new Error('content.xml not found');
        const xml = await xmlFile.async('string');
        const text = xml
            .replace(/<text:p[^>]*>/g, '\n').replace(/<\/text:p>/g, '')
            .replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;padding:1rem;line-height:1.7;white-space:pre-wrap;}</style>
</head><body>${text.replace(/\n/g,'<br>')}</body></html>`;
        const tab = getActive();
        if (tab) { tab.docType = 'odt'; tab.content = html; }
        window.isProgrammaticChange = true; editor.setValue(html); window.isProgrammaticChange = false;
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
        const full = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
  xmlns:w='urn:schemas-microsoft-com:office:word'
  xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'>
<style>body{font-family:Calibri,sans-serif;font-size:11pt;line-height:1.5;}</style>
</head><body>${htmlBody}</body></html>`;
        return new Blob([full], { type: 'application/msword' });
    }
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
        else if (tag === 'table') { node.querySelectorAll('tr').forEach(tr => { addPara([...tr.querySelectorAll('td,th')].map(td => td.textContent.trim()).join(' | ')); }); }
        else if (tag === 'ul' || tag === 'ol') { node.querySelectorAll('li').forEach(li => addPara('• ' + li.textContent.trim())); }
        else if (tag === 'br') { wParagraphs.push('<w:p><w:r><w:t></w:t></w:r></w:p>'); }
        else { const txt = node.textContent.trim(); if (txt) addPara(txt); }
    });
    if (!wParagraphs.length) wParagraphs.push('<w:p><w:r><w:t>(empty)</w:t></w:r></w:p>');

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr>
    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="24"/>
  </w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>`;
    const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
</w:settings>`;
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
    const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`;
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

    const zip = new JSZip();
    zip.file('[Content_Types].xml', contentTypes);
    zip.folder('_rels').file('.rels', rootRels);
    const word = zip.folder('word');
    word.file('document.xml', docXml); word.file('styles.xml', stylesXml); word.file('settings.xml', settingsXml);
    word.folder('_rels').file('document.xml.rels', docRels);
    return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

window.exportDocxToPdf = async function() {
    if (!await window.ensureDependency('html2pdf', { message: '載入 PDF 匯出引擎中...' })) return;
    const frame = document.getElementById('visual-frame');
    if (!frame) return;
    const bodyEl = frame.contentWindow.document.body;
    showToast('Building PDF...', 'info');
    const base = _docFilename.replace(/\.[^.]+$/, '');
    html2pdf().set({ margin: 0.5, filename: base + '.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } })
        .from(bodyEl).save()
        .then(() => showToast('✅ Saved: ' + base + '.pdf', 'success'))
        .catch(e => showToast('PDF export failed: ' + e.message, 'error'));
};

// ─── Expose globals ───────────────────────────────────────────────────────────
window.loadDocx = loadDocx;
window.loadOdt = loadOdt;
