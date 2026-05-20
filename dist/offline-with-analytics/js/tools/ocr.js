// js/tools/ocr.js
// OCR modal UI, camera / upload / paste integration, and result handling.
// Requires: js/tools/ocr-engine.js for recognizeImageWithOcr() and cleanOcrText().

let _ocrVideoStream = null;
let _ocrPendingDataUrl = null;
let _ocrLastResult = null;
let _ocrBusy = false;
let _ocrTorchOn = false;
let _ocrCameraStatusTimer = null;
let _ocrPreloadUiBound = false;

const OCR_CAMERA_CONSTRAINTS = {
    video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 },
        frameRate: { ideal: 30, max: 30 }
    },
    audio: false
};

function _ocrEl(id) { return document.getElementById(id); }

function _setOcrProgress(percent, message, detail) {
    const progressBar = _ocrEl('ocr-progress-bar');
    const progressLabel = _ocrEl('ocr-progress-label');
    if (progressBar) progressBar.style.width = `${Math.max(0, Math.min(100, Math.round(percent || 0)))}%`;
    if (progressLabel) progressLabel.textContent = detail ? `${message}（${detail}）` : (message || '正在處理...');
}

function _setOcrPreloadStatus(message) {
    const status = _ocrEl('ocr-preload-status');
    if (status && message) status.textContent = message;
}

function _setOcrCameraStatus(message) {
    const status = _ocrEl('ocr-camera-status');
    if (status && message) status.textContent = message;
}

function _setOcrCameraFullscreen(enabled) {
    const modal = _ocrEl('ocr-modal');
    if (modal) modal.classList.toggle('ocr-camera-fullscreen', !!enabled);
    if (document.body) document.body.classList.toggle('ocr-camera-live', !!enabled);
}

function _formatOcrFileTimestamp(date = new Date()) {
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function _openOcrResultAsEditableFile(text, metaText = '') {
    const finalText = typeof text === 'string' ? text : '';
    const fileName = `OCR_${_formatOcrFileTimestamp()}.txt`;

    if (typeof tabManager !== 'undefined' && typeof tabManager.createNewTab === 'function') {
        tabManager.createNewTab(fileName, finalText, false);
        const activeTab = tabManager.getActiveTab && tabManager.getActiveTab();
        if (activeTab) {
            activeTab.mode = 'code';
            activeTab.encoding = 'utf-8';
            activeTab.eol = '\n';
            activeTab.isUnsaved = true;
        }
        if (window.fileSystem && activeTab && activeTab.fsId) {
            const node = window.fileSystem.getNode && window.fileSystem.getNode(activeTab.fsId);
            if (node) {
                node.content = finalText;
                node.mime = 'text/plain';
                node.name = fileName;
                window.fileSystem.selectedNodeId = node.id;
                if (typeof window.fileSystem.save === 'function') window.fileSystem.save();
                if (typeof window.fileSystem.renderTree === 'function') window.fileSystem.renderTree();
            }
        }
        if (typeof tabManager.renderTabs === 'function') tabManager.renderTabs();
        if (typeof tabManager.saveToStorage === 'function') tabManager.saveToStorage();
        if (typeof updateUI === 'function') updateUI();
        if (window.editor && typeof window.editor.focus === 'function') setTimeout(() => window.editor.focus(), 0);
        window.closeOcrModal();
        showToast(finalText.trim() ? `已建立 ${fileName}，可直接編輯` : `已建立 ${fileName}，但沒有辨識到明顯文字`, finalText.trim() ? 'success' : 'info');
        return true;
    }

    const resultText = _ocrEl('ocr-result-text');
    const meta = _ocrEl('ocr-result-meta');
    if (resultText) resultText.value = finalText;
    if (meta) meta.textContent = metaText;
    _switchOcrView('result');
    showToast('已顯示辨識結果，但目前無法建立新分頁', 'info');
    return false;
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

function _scheduleOcrAssetWarmup(reason = 'ui') {
    if (typeof window.scheduleOcrPreload === 'function') {
        window.scheduleOcrPreload({
            ..._getOcrSettings(),
            reason,
            includeLanguageData: true
        });
        _setOcrPreloadStatus('OCR 引擎與語言資料正在背景預載，稍後辨識會更快。');
    }
}

function _bindOcrPreloadTriggers() {
    if (_ocrPreloadUiBound) return;
    _ocrPreloadUiBound = true;

    const bind = el => {
        if (!el || el.dataset.ocrPreloadBound === 'true') return;
        el.dataset.ocrPreloadBound = 'true';
        ['pointerenter', 'focus', 'touchstart'].forEach(type => {
            el.addEventListener(type, () => _scheduleOcrAssetWarmup(type), { passive: true, once: type !== 'focus' });
        });
    };

    ['btn-qr', 'qr-tab-ocr', 'image-action-ocr'].forEach(id => bind(_ocrEl(id)));
    document.querySelectorAll('[data-call^="tools.ocr"], [data-call="features.format.openQrModal"]').forEach(bind);

    ['ocr-lang-select', 'ocr-quality-select'].forEach(id => {
        const el = _ocrEl(id);
        if (el && el.dataset.ocrChangePreloadBound !== 'true') {
            el.dataset.ocrChangePreloadBound = 'true';
            el.addEventListener('change', () => _scheduleOcrAssetWarmup('settings-change'));
        }
    });
}

function _runWhenIdle(fn, timeout = 1800) {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(fn, { timeout });
    } else {
        setTimeout(fn, Math.min(timeout, 1200));
    }
}

function _safeCapabilities(track) {
    try { return track && typeof track.getCapabilities === 'function' ? track.getCapabilities() : {}; }
    catch (e) { return {}; }
}

function _chooseContinuousMode(values) {
    if (!Array.isArray(values)) return null;
    return values.includes('continuous') ? 'continuous' : (values.includes('single-shot') ? 'single-shot' : null);
}

async function _applyOcrCameraOptimizations(stream) {
    const track = stream && stream.getVideoTracks && stream.getVideoTracks()[0];
    if (!track || typeof track.applyConstraints !== 'function') {
        _setOcrCameraStatus('已開啟相機。請讓文字填滿畫面，等畫面清楚後再拍照。');
        return;
    }

    const caps = _safeCapabilities(track);
    const advanced = [];
    const notes = [];

    const focusMode = _chooseContinuousMode(caps.focusMode);
    if (focusMode) {
        advanced.push({ focusMode });
        notes.push(focusMode === 'continuous' ? '連續對焦' : '單次對焦');
    }

    const exposureMode = _chooseContinuousMode(caps.exposureMode);
    if (exposureMode) advanced.push({ exposureMode });

    const whiteBalanceMode = _chooseContinuousMode(caps.whiteBalanceMode);
    if (whiteBalanceMode) advanced.push({ whiteBalanceMode });

    if (caps.zoom && Number.isFinite(caps.zoom.min) && Number.isFinite(caps.zoom.max)) {
        const zoom = Math.min(caps.zoom.max, Math.max(caps.zoom.min, 1.25));
        if (zoom > caps.zoom.min) {
            advanced.push({ zoom });
            notes.push(`畫面放大 ${zoom.toFixed(1)}x`);
        }
    }

    if (advanced.length) {
        try {
            await track.applyConstraints({ advanced });
        } catch (err) {
            console.warn('[OCR] camera optimization skipped:', err);
        }
    }

    const torchBtn = _ocrEl('ocr-torch-btn');
    const torchSupported = !!caps.torch;
    if (torchBtn) torchBtn.classList.toggle('hidden', !torchSupported);

    _setOcrCameraStatus(notes.length
        ? `相機已最佳化：${notes.join('、')}。請把文字放在畫面中央，等待清晰後拍照。`
        : '已開啟相機。這台裝置沒有提供可調整的對焦參數，請前後微調距離，等畫面清楚後再拍照。');
}

function _startOcrCameraStatusNudge() {
    clearInterval(_ocrCameraStatusTimer);
    _ocrCameraStatusTimer = setInterval(() => {
        if (!_ocrVideoStream) {
            clearInterval(_ocrCameraStatusTimer);
            _ocrCameraStatusTimer = null;
            return;
        }
        _setOcrCameraStatus('小提醒：webcam 對焦慢時，請先停住 1～2 秒；文字清楚後按「拍照並匯入 TXT」。');
    }, 9000);
}

function _stopOcrCameraStatusNudge() {
    clearInterval(_ocrCameraStatusTimer);
    _ocrCameraStatusTimer = null;
}

window.openOcrModal = function() {
    _setOcrCameraFullscreen(false);
    const qrModal = _ocrEl('qr-modal');
    if (qrModal) qrModal.classList.add('hidden');
    const modal = _ocrEl('ocr-modal');
    if (modal) modal.classList.remove('hidden');
    _bindOcrPreloadTriggers();
    _scheduleOcrAssetWarmup('open-modal');
    window.resetOcr();
};

window.closeOcrModal = function() {
    _setOcrCameraFullscreen(false);
    window.stopOcrCamera({ keepView: true });
    _showOcrLoading(false);
    const modal = _ocrEl('ocr-modal');
    if (modal) modal.classList.add('hidden');
};

window.resetOcr = function() {
    if (_ocrBusy) return;
    _setOcrCameraFullscreen(false);
    _ocrPendingDataUrl = null;
    _ocrLastResult = null;
    window.stopOcrCamera({ keepView: true });
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
    _scheduleOcrAssetWarmup('start-camera');
    const video = _ocrEl('ocr-video');
    _switchOcrView('camera');
    _setOcrCameraFullscreen(true);
    _setOcrCameraStatus('正在開啟全螢幕相機與套用對焦設定...');
    try {
        _ocrVideoStream = await navigator.mediaDevices.getUserMedia(OCR_CAMERA_CONSTRAINTS);
        await _applyOcrCameraOptimizations(_ocrVideoStream);
        if (video) {
            video.srcObject = _ocrVideoStream;
            video.muted = true;
            video.setAttribute('playsinline', true);
            await video.play();
            if (video.videoWidth && video.videoHeight) {
                _setOcrCameraStatus(`相機畫面 ${video.videoWidth}×${video.videoHeight}。請等文字清楚後再拍照。`);
            }
        }
        _startOcrCameraStatusNudge();
    } catch (err) {
        _setOcrCameraFullscreen(false);
        showToast('無法存取相機: ' + err.message, 'error');
        window.resetOcr();
    }
};

window.stopOcrCamera = function(options = {}) {
    _setOcrCameraFullscreen(false);
    _stopOcrCameraStatusNudge();
    _ocrTorchOn = false;
    if (_ocrVideoStream) {
        _ocrVideoStream.getTracks().forEach(track => track.stop());
        _ocrVideoStream = null;
    }
    const video = _ocrEl('ocr-video');
    if (video) video.srcObject = null;
    const torchBtn = _ocrEl('ocr-torch-btn');
    if (torchBtn) {
        torchBtn.classList.add('hidden');
        torchBtn.classList.remove('bg-amber-500', 'text-white');
    }
    const container = _ocrEl('ocr-camera-container');
    if (container) {
        container.classList.add('hidden');
        container.classList.remove('flex');
    }
    if (!options.keepView && !_ocrPendingDataUrl) _switchOcrView('initial');
};

window.toggleOcrTorch = async function() {
    const track = _ocrVideoStream && _ocrVideoStream.getVideoTracks && _ocrVideoStream.getVideoTracks()[0];
    if (!track || typeof track.applyConstraints !== 'function') return;
    const caps = _safeCapabilities(track);
    if (!caps.torch) return;
    _ocrTorchOn = !_ocrTorchOn;
    try {
        await track.applyConstraints({ advanced: [{ torch: _ocrTorchOn }] });
        const torchBtn = _ocrEl('ocr-torch-btn');
        if (torchBtn) {
            torchBtn.classList.toggle('bg-amber-500', _ocrTorchOn);
            torchBtn.classList.toggle('text-white', _ocrTorchOn);
        }
        _setOcrCameraStatus(_ocrTorchOn ? '已開啟補光。請避免紙張反光，文字清楚後再拍照。' : '已關閉補光。請保持環境光線充足。');
    } catch (err) {
        _ocrTorchOn = !_ocrTorchOn;
        showToast('這台相機無法切換補光', 'info');
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
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    window.stopOcrCamera({ keepView: true });
    const dataUrl = canvas.toDataURL('image/png');
    window.showOcrPreview(dataUrl);
    if (autoStart) window.startPerformingOcr();
};

window.triggerOcrFileUpload = function() {
    _scheduleOcrAssetWarmup('upload');
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
    _scheduleOcrAssetWarmup('drop');
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
    _scheduleOcrAssetWarmup('paste');
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
        if (resultImg) resultImg.src = result.processedImageDataUrl || _ocrPendingDataUrl;
        let metaText = '';
        if (meta) {
            const confidence = Number.isFinite(result.confidence) ? Math.round(result.confidence) : 0;
            const dataLabel = result.dataLabel || (result.dataMode === 'best' ? '高準確語言包' : '標準語言包');
            metaText = `語言資料：${dataLabel} / 最佳模式：${result.variant || '自動'} / 版面：${result.psm || settings.psm} / 信心值：約 ${confidence}%`;
            meta.textContent = metaText;
        }
        _openOcrResultAsEditableFile(cleanedText, metaText);
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
    const metaText = (_ocrEl('ocr-result-meta') || {}).textContent || '';
    _openOcrResultAsEditableFile(text, metaText);
};

// Start warming the OCR engine after the editor is usable, and preload more
// aggressively when users hover/focus OCR-related controls.
function _initOcrPreloadHooks() {
    _bindOcrPreloadTriggers();
    _runWhenIdle(() => {
        if (typeof window.scheduleOcrPreload === 'function') {
            window.scheduleOcrPreload({ lang: 'chi_tra+eng', profile: 'balanced', reason: 'idle', includeLanguageData: true });
        }
    }, 2400);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initOcrPreloadHooks, { once: true });
} else {
    _initOcrPreloadHooks();
}
