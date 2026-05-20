// js/tools/image-actions.js
// Image-file routing modal: choose OCR or QR decode.
// Requires: ocr.js for openOcrDialog at runtime; qr.js for decodeQrFromImage at runtime.

/* ═══════════════════════════════════════════════════════
   IMAGE ACTION MODAL (OCR vs QR choice)
═══════════════════════════════════════════════════════ */
window.handleImageFile = function(file) {
    const reader = new FileReader();
    reader.onload = e => _showImageActionModal(e.target.result, file.name);
    reader.readAsDataURL(file);
};

function _showImageActionModal(dataUrl, filename) {
    const modal = document.getElementById('image-action-modal');
    const preview = document.getElementById('image-action-preview');
    if (!modal) { window.openOcrDialog(dataUrl); return; }
    preview.src = dataUrl;
    modal.classList.remove('hidden');
    document.getElementById('image-action-ocr').onclick = () => { modal.classList.add('hidden'); window.openOcrDialog(dataUrl); };
    document.getElementById('image-action-qr').onclick = () => { modal.classList.add('hidden'); window.decodeQrFromImage(dataUrl); };
    document.getElementById('image-action-cancel').onclick = () => modal.classList.add('hidden');
}
