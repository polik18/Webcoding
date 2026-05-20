// js/tools/ocr.js
// OCR modal UI, camera / upload / paste integration, and result handling.
// Requires: js/tools/ocr-engine.js for recognizeImageWithOcr() and cleanOcrText().

let _ocrVideoStream = null;
let _ocrPendingDataUrl = null;
let _ocrLastResult = null;
let _ocrBusy = false;

function _ocrEl(id) { return document.getElementById(id); }

function _setOcrProgress(percent, message, detail) {
    const progressBar = _ocrEl('ocr-progress-bar');
    const progressLabel = _ocrEl('ocr-progress-label');
    if (progressBar) progressBar.style.width = `${Math.max(0, Math.min(100, Math.round(percent || 0)))}%`;
    if (progressLabel) progressLabel.textContent = detail ? `${message}（${detail}）` : (message || '正在處理...');
}

function _getOcrSettings() {
    return {
        lang: (_ocrEl('ocr-lang-select') || {}).value || 'chi_tra+eng',
        profile: (_ocrEl('ocr-quality-select') || {}).value || 'balanced',
        psm: (_ocrEl('ocr-psm-select') || {}).value || 'auto'
    };
}

function _switchOcrView(view) {
    ['initial', 'preview', 'result'].forEach(name => {
        const el = _ocrEl(`ocr-view-${name}`);
        if (el) el.classList.toggle('hidden', name !== view);
    });
    const camera = _ocrEl('ocr-camera-container');
    if (camera) {
        camera.classList.toggle('hidden', view !== 'camera');
        camera.classList.toggle('flex', view === 'camera');
    }
}

function _showOcrLoading(show) {
    const loadingEl = _ocrEl('ocr-loading');
    const scanLine = _ocrEl('ocr-scan-line');
    if (loadingEl) {
        loadingEl.classList.toggle('hidden', !show);
        loadingEl.classList.toggle('flex', show);
    }
    if (scanLine) scanLine.classList.toggle('hidden', !show);
}

window.openOcrModal = function() {
    const qrModal = _ocrEl('qr-modal');
    if (qrModal) qrModal.classList.add('hidden');
    const modal = _ocrEl('ocr-modal');
    if (modal) modal.classList.remove('hidden');
    window.resetOcr();
};

window.closeOcrModal = function() {
    window.stopOcrCamera();
    _showOcrLoading(false);
    const modal = _ocrEl('ocr-modal');
    if (modal) modal.classList.add('hidden');
};

window.resetOcr = function() {
    if (_ocrBusy) return;
    _ocrPendingDataUrl = null;
    _ocrLastResult = null;
    window.stopOcrCamera();
    _setOcrProgress(0, '準備辨識');
    _showOcrLoading(false);
    const resultText = _ocrEl('ocr-result-text');
    const meta = _ocrEl('ocr-result-meta');
    const previewImg = _ocrEl('ocr-preview-img');
    const resultImg = _ocrEl('ocr-result-img');
    if (resultText) resultText.value = '';
    if (meta) meta.textContent = '';
    if (previewImg) previewImg.removeAttribute('src');
    if (resultImg) resultImg.removeAttribute('src');
    _switchOcrView('initial');
};

window.showOcrPreview = function(dataUrl) {
    if (!dataUrl) return;
    _ocrPendingDataUrl = dataUrl;
    const previewImg = _ocrEl('ocr-preview-img');
    if (previewImg) previewImg.src = dataUrl;
    _setOcrProgress(0, '準備辨識');
    _showOcrLoading(false);
    _switchOcrView('preview');
};

window.startOcrCamera = async function() {
    if (_ocrBusy) return;
    window.resetOcr();
    const video = _ocrEl('ocr-video');
    const container = _ocrEl('ocr-camera-container');
    _switchOcrView('camera');
    try {
        _ocrVideoStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                advanced: [{ focusMode: 'continuous' }]
            },
            audio: false
        });
        if (video) {
            video.srcObject = _ocrVideoStream;
            video.setAttribute('playsinline', true);
            await video.play();
        }
    } catch (err) {
        showToast('無法存取相機: ' + err.message, 'error');
        window.resetOcr();
    }
};

window.stopOcrCamera = function() {
    if (_ocrVideoStream) {
        _ocrVideoStream.getTracks().forEach(track => track.stop());
        _ocrVideoStream = null;
    }
    const video = _ocrEl('ocr-video');
    if (video) video.srcObject = null;
    const container = _ocrEl('ocr-camera-container');
    if (container) {
        container.classList.add('hidden');
        container.classList.remove('flex');
    }
};

window.takeOcrPhoto = function(autoStart = false) {
    const video = _ocrEl('ocr-video');
    if (!video || !video.videoWidth) {
        showToast('無法取得相機畫面，請稍後再試', 'error');
        return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    window.stopOcrCamera();
    const dataUrl = canvas.toDataURL('image/png');
    window.showOcrPreview(dataUrl);
    if (autoStart) window.startPerformingOcr();
};

window.triggerOcrFileUpload = function() {
    const input = _ocrEl('ocr-file-input');
    if (input) input.click();
};

window.handleOcrFileUpload = function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    e.target.value = '';
    if (!file.type.startsWith('image/')) {
        showToast('請選擇圖片檔案', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = ev => window.showOcrPreview(ev.target.result);
    reader.readAsDataURL(file);
};

window.handleOcrDrop = function(e) {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
        showToast('請拖曳圖片檔案', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = ev => window.showOcrPreview(ev.target.result);
    reader.readAsDataURL(file);
};

window.triggerOcrPaste = function() {
    showToast('請直接按 Ctrl+V（或 Cmd+V）貼上圖片', 'info');
};

document.addEventListener('paste', function(e) {
    const ocrOpen = _ocrEl('ocr-modal') && !_ocrEl('ocr-modal').classList.contains('hidden');
    const qrOpen  = _ocrEl('qr-modal') && !_ocrEl('qr-modal').classList.contains('hidden');
    if (!ocrOpen && !qrOpen) return;
    const items = (e.clipboardData || e.originalEvent.clipboardData).items || [];
    for (const item of items) {
        if (item.kind === 'file') {
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = ev => {
                if (ocrOpen) window.showOcrPreview(ev.target.result);
                else if (qrOpen && typeof window.decodeQrFromImage === 'function') window.decodeQrFromImage(ev.target.result);
            };
            reader.readAsDataURL(blob);
            e.preventDefault();
            return;
        }
    }
});

window.startPerformingOcr = async function() {
    if (_ocrBusy) return;
    if (!_ocrPendingDataUrl) {
        showToast('請先選擇或貼上圖片', 'info');
        return;
    }
    if (typeof window.recognizeImageWithOcr !== 'function') {
        showToast('OCR 引擎尚未載入', 'error');
        return;
    }

    _ocrBusy = true;
    _showOcrLoading(true);
    _setOcrProgress(1, '正在初始化...');
    const startBtn = _ocrEl('ocr-start-btn');
    if (startBtn) startBtn.disabled = true;

    try {
        const settings = _getOcrSettings();
        const result = await window.recognizeImageWithOcr(_ocrPendingDataUrl, {
            ...settings,
            onProgress: evt => _setOcrProgress(evt.percent, evt.message, evt.detail)
        });
        _ocrLastResult = result;
        const cleanedText = window.cleanOcrText(result.text || '');
        const resultText = _ocrEl('ocr-result-text');
        const resultImg = _ocrEl('ocr-result-img');
        const meta = _ocrEl('ocr-result-meta');
        if (resultText) resultText.value = cleanedText;
        if (resultImg) resultImg.src = _ocrPendingDataUrl;
        if (meta) {
            const confidence = Number.isFinite(result.confidence) ? Math.round(result.confidence) : 0;
            const dataLabel = result.dataLabel || (result.dataMode === 'best' ? '高準確語言包' : '標準語言包');
            meta.textContent = `語言資料：${dataLabel} / 最佳模式：${result.variant || '自動'} / 版面：${result.psm || settings.psm} / 信心值：約 ${confidence}%`;
        }
        _switchOcrView('result');
        if (cleanedText.trim()) showToast('✅ OCR 辨識完成，可先檢查再儲存', 'success');
        else showToast('找不到明顯文字，建議改用「高準確」或重新拍攝較清楚的圖片', 'info');
    } catch (err) {
        console.error('[OCR] failed:', err);
        showToast('OCR 辨識失敗: ' + err.message, 'error');
    } finally {
        _ocrBusy = false;
        _showOcrLoading(false);
        if (startBtn) startBtn.disabled = false;
    }
};

window.openOcrDialog = function(imageDataUrl) {
    if (!imageDataUrl) {
        window.openOcrModal();
        window.triggerOcrFileUpload();
        return;
    }
    window.openOcrModal();
    window.showOcrPreview(imageDataUrl);
};

window.copyOcrResult = async function() {
    const text = (_ocrEl('ocr-result-text') || {}).value || '';
    if (!text.trim()) {
        showToast('沒有文字可複製', 'info');
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        showToast('已複製到剪貼簿', 'success');
    } catch (err) {
        showToast('複製失敗: ' + err.message, 'error');
    }
};

window.saveOcrResult = function() {
    const text = (_ocrEl('ocr-result-text') || {}).value || '';
    if (!text.trim()) {
        showToast('沒有文字可儲存', 'info');
        return;
    }
    const dateStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '').split('.')[0];
    if (typeof tabManager !== 'undefined') {
        tabManager.createNewTab(`OCR_Result_${dateStr}.txt`, text, false);
        window.closeOcrModal();
        showToast('已儲存為新檔案', 'success');
    }
};
