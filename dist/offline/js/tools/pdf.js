// js/tools/pdf.js
// Responsibility: PDF viewing (PDF.js) and text/OCR extraction from PDF pages.
// Requires: js/tools/docutils.js (for _hideAllPanels)
//
// ⚠️  _hideAllPanels is defined in docutils.js — DO NOT re-declare here.
// ⚠️  _pdfFilename and _pdfDoc are declared with `let` here — DO NOT declare elsewhere.

let _pdfFilename = 'document.pdf';
let _pdfDoc = null;

async function loadPdf(buffer, filename) {
    _pdfFilename = filename;
    if (!await window.ensureDependency('pdfjs', { message: '載入 PDF 讀取引擎中...' })) return;
    const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
    if (!pdfjsLib) { showToast('PDF.js not loaded', 'error'); return; }
    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    showToast('Rendering PDF…', 'info');
    const uint8 = new Uint8Array(buffer);
    try { _pdfDoc = await pdfjsLib.getDocument({ data: uint8 }).promise; }
    catch(e) { showToast('Failed to load PDF: ' + e.message, 'error'); return; }

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
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;padding:1rem;line-height:1.7;white-space:pre-wrap;}</style>
</head><body>${_xmlEscape(allText).replace(/\n/g,'<br>')}</body></html>`;
    const tab = getActive();
    if (tab) { tab.docType = 'pdf-text'; tab.content = html; _pdfFilename = _pdfFilename.replace('.pdf','.docx'); }
    isProgrammaticChange = true; editor.setValue(html); isProgrammaticChange = false;
    switchToVisual();
    showToast('Text extracted — edit and Export DOCX', 'success');
};

window.pdfExportOCRText = async function() {
    if (!_pdfDoc) return;
    if (typeof window.recognizeImageWithOcr !== 'function') {
        showToast('OCR engine not loaded', 'error');
        return;
    }
    showToast('Starting enhanced OCR... This may take a while.', 'info');
    let allText = '';
    for (let i = 1; i <= _pdfDoc.numPages; i++) {
        showToast(`OCR processing page ${i} of ${_pdfDoc.numPages}...`, 'info');
        try {
            const page = await _pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 2.25 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            const result = await window.recognizeImageWithOcr(canvas.toDataURL('image/png'), {
                lang: 'chi_tra+eng',
                profile: 'balanced',
                psm: 'auto'
            });
            allText += window.cleanOcrText(result.text || '') + '\n\n';
        } catch (e) {
            console.error('OCR Error on page', i, e);
        }
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:Georgia,serif;max-width:800px;margin:2rem auto;padding:1rem;line-height:1.7;white-space:pre-wrap;}</style>
</head><body>${_xmlEscape(allText).replace(/\n/g,'<br>')}</body></html>`;
    const tab = getActive();
    if (tab) { tab.docType = 'pdf-text'; tab.content = html; _pdfFilename = _pdfFilename.replace('.pdf','.docx'); }
    isProgrammaticChange = true; editor.setValue(html); isProgrammaticChange = false;
    switchToVisual();
    showToast('Enhanced OCR extracted — edit and Export DOCX', 'success');
};

// ─── Expose globals ───────────────────────────────────────────────────────────
window.loadPdf = loadPdf;
