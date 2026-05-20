// js/tools/qr.js
// QR code generation, image decode, upload/paste shortcuts, and camera scanning.
// Heavy QR libraries are loaded through js/core/loader.js dependencyManager.

window.ensureQrLibraries = async function(options = {}) {
    const { generator = true, scanner = true } = options;
    const jobs = [];
    if (generator) jobs.push('qrcodejs');
    if (scanner) jobs.push('jsqr');
    if (!jobs.length) return true;

    try {
        showToast('正在載入 QR 工具...', 'info');
        for (const name of jobs) {
            const ok = await window.ensureDependency(name, {
                toast: false,
                errorMessage: 'QR 工具載入失敗，請確認網路連線或 CDN 是否被封鎖'
            });
            if (!ok) throw new Error(name + ' failed');
        }
        return true;
    } catch (err) {
        console.error('[QR] library load failed:', err);
        showToast('QR 工具載入失敗，請確認網路連線或 CDN 是否被封鎖', 'error');
        return false;
    }
};

/* ═══════════════════════════════════════════════════════
   QR CODE — DECODE
═══════════════════════════════════════════════════════ */
window.decodeQrFromImage = async function(imageSource) {
    if (!await window.ensureQrLibraries({ generator: false, scanner: true })) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const run = () => {
        canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR === 'undefined') { showToast('jsQR not loaded', 'error'); return; }
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
        if (code) {
            const modal = document.getElementById('qr-modal');
            if (modal && !modal.classList.contains('hidden')) {
                document.getElementById('qr-scan-result').textContent = code.data;
                document.getElementById('qr-scan-result-container').classList.remove('hidden');
                const linkBtn = document.getElementById('qr-result-link-btn');
                if (code.data.startsWith('http')) { linkBtn.classList.remove('hidden'); linkBtn.onclick = () => window.open(code.data, '_blank'); }
                else { linkBtn.classList.add('hidden'); }
                showToast('✅ QR Code 解碼成功！', 'success');
            } else {
                if (typeof tabManager !== 'undefined') tabManager.createNewTab('qr-result.txt', code.data, false);
                showToast('✅ QR Code 解碼成功！結果已開啟在新頁籤', 'success');
            }
        } else { showToast('❌ 未偵測到 QR Code', 'error'); }
    };
    if (typeof imageSource === 'string') { img.onload = run; img.src = imageSource; }
    else { showToast('無效的圖片來源', 'error'); }
};

/* ═══════════════════════════════════════════════════════
   QR CODE — GENERATE
═══════════════════════════════════════════════════════ */
let _qrGenerator = null;
window.generateQrCode = async function() {
    const input = document.getElementById('qr-gen-input');
    const output = document.getElementById('qr-output');
    const text = input.value.trim();
    if (!text) { showToast('請輸入內容', 'info'); return; }
    if (!await window.ensureQrLibraries({ generator: true, scanner: false })) return;
    output.innerHTML = '';
    _qrGenerator = new QRCode(output, { text, width: 180, height: 180, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
    showToast('QR Code 已產生', 'success');
};
window.downloadQrCode = function() {
    const output = document.getElementById('qr-output');
    const img = output && output.querySelector('img');
    const canvas = output && output.querySelector('canvas');
    const href = img ? img.src : (canvas ? canvas.toDataURL('image/png') : '');
    if (!href) { showToast('請先產生 QR Code', 'info'); return; }
    const a = document.createElement('a'); a.href = href; a.download = `qrcode_${Date.now()}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
};
window.triggerQrFileUpload = function() { document.getElementById('qr-file-input').click(); };
window.handleQrFileUpload = function(e) { const file = e.target.files && e.target.files[0]; if (!file) return; e.target.value = ''; if (!file.type.startsWith('image/')) { showToast('請選擇圖片檔案', 'error'); return; } const reader = new FileReader(); reader.onload = ev => window.decodeQrFromImage(ev.target.result); reader.readAsDataURL(file); };
window.triggerQrPaste = function() { showToast('請直接按下 Ctrl+V (或 Cmd+V) 貼上圖片', 'info'); };
window.copyQrResult = function() { navigator.clipboard.writeText(document.getElementById('qr-scan-result').textContent).then(() => showToast('已複製到剪貼簿', 'success')); };
window.openQrResultAsTab = function() {
    const text = document.getElementById('qr-scan-result').textContent;
    if (typeof tabManager !== 'undefined') { tabManager.createNewTab('qr-result.txt', text, false); window.closeQrModal(); }
};

/* ═══════════════════════════════════════════════════════
   QR CODE — CAMERA
═══════════════════════════════════════════════════════ */
let _qrVideoStream = null;
let _qrCameraFrameId = null;
let _qrCanvas = null;
let _qrCtx = null;
let _qrLastScanAt = 0;
let _qrNativeDetector = null;
let _qrNativeDetectorUnavailable = false;
let _qrScanningFrame = false;

const QR_SCAN_INTERVAL_MS = 120; // 約 8 FPS，避免每秒跑滿 60 次造成卡頓
const QR_MAX_CANVAS_EDGE = 1280;

function getQrCameraStatusElement() {
    return document.getElementById('qr-camera-status');
}

function setQrCameraStatus(message) {
    const status = getQrCameraStatusElement();
    if (status) status.textContent = message || '';
}

function getReusableQrCanvas(width, height) {
    if (!_qrCanvas) {
        _qrCanvas = document.createElement('canvas');
        _qrCtx = _qrCanvas.getContext('2d', { willReadFrequently: true });
    }
    if (_qrCanvas.width !== width) _qrCanvas.width = width;
    if (_qrCanvas.height !== height) _qrCanvas.height = height;
    return { canvas: _qrCanvas, ctx: _qrCtx };
}

function getQrScanSize(video) {
    const sourceWidth = video.videoWidth || 0;
    const sourceHeight = video.videoHeight || 0;
    if (!sourceWidth || !sourceHeight) return null;

    const longestEdge = Math.max(sourceWidth, sourceHeight);
    const scale = longestEdge > QR_MAX_CANVAS_EDGE ? QR_MAX_CANVAS_EDGE / longestEdge : 1;
    return {
        width: Math.max(1, Math.round(sourceWidth * scale)),
        height: Math.max(1, Math.round(sourceHeight * scale))
    };
}

function setQrResult(data) {
    const resultContainer = document.getElementById('qr-scan-result-container');
    const result = document.getElementById('qr-scan-result');
    const linkBtn = document.getElementById('qr-result-link-btn');

    if (resultContainer) resultContainer.classList.remove('hidden');
    if (result) result.textContent = data;

    if (linkBtn) {
        try {
            new URL(data);
            linkBtn.classList.remove('hidden');
            linkBtn.onclick = () => window.open(data, '_blank', 'noopener,noreferrer');
        } catch (e) {
            linkBtn.classList.add('hidden');
            linkBtn.onclick = null;
        }
    }
}

function finishQrCameraScan(data) {
    stopQrCamera();
    setQrResult(data);
    showToast('掃描成功！', 'success');
}

function getQrCameraConstraints() {
    return {
        video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 }
        },
        audio: false
    };
}

async function applyQrCameraOptimizations(stream) {
    const track = stream && stream.getVideoTracks && stream.getVideoTracks()[0];
    if (!track || typeof track.getCapabilities !== 'function' || typeof track.applyConstraints !== 'function') {
        setQrCameraStatus('相機已開啟。請把 QR Code 放在框線內，等待畫面清楚。');
        return;
    }

    const caps = track.getCapabilities();
    const advanced = [];
    const applied = [];

    if (Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
        advanced.push({ focusMode: 'continuous' });
        applied.push('連續對焦');
    }

    if (caps.zoom && Number.isFinite(caps.zoom.min) && Number.isFinite(caps.zoom.max) && caps.zoom.max > caps.zoom.min) {
        const targetZoom = Math.min(caps.zoom.max, Math.max(caps.zoom.min, 1.4));
        advanced.push({ zoom: targetZoom });
        applied.push('適度放大');
    }

    if (!advanced.length) {
        setQrCameraStatus('相機已開啟。若畫面模糊，請前後微調 QR Code，等清楚後按「手動辨識」。');
        return;
    }

    try {
        await track.applyConstraints({ advanced });
        setQrCameraStatus(`已啟用${applied.join('、')}。請把 QR Code 放在框線內。`);
    } catch (err) {
        console.warn('[QR] camera optimization skipped:', err);
        setQrCameraStatus('相機已開啟。若畫面模糊，請前後微調 QR Code，等清楚後按「手動辨識」。');
    }
}

async function decodeQrWithNativeDetector(video) {
    if (_qrNativeDetectorUnavailable) return null;
    if (!('BarcodeDetector' in window)) {
        _qrNativeDetectorUnavailable = true;
        return null;
    }

    try {
        if (!_qrNativeDetector) {
            if (typeof BarcodeDetector.getSupportedFormats === 'function') {
                const formats = await BarcodeDetector.getSupportedFormats();
                if (Array.isArray(formats) && !formats.includes('qr_code')) {
                    _qrNativeDetectorUnavailable = true;
                    return null;
                }
            }
            _qrNativeDetector = new BarcodeDetector({ formats: ['qr_code'] });
        }

        const results = await _qrNativeDetector.detect(video);
        return results && results[0] && results[0].rawValue ? results[0].rawValue : null;
    } catch (err) {
        console.warn('[QR] native BarcodeDetector failed, fallback to jsQR:', err);
        _qrNativeDetectorUnavailable = true;
        return null;
    }
}

function decodeQrWithJsQr(video) {
    if (typeof jsQR === 'undefined') return null;

    const size = getQrScanSize(video);
    if (!size) return null;

    const { canvas, ctx } = getReusableQrCanvas(size.width, size.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth'
    });

    return code && code.data ? code.data : null;
}

async function scanQrCurrentFrame(options = {}) {
    const { manual = false } = options;
    const video = document.getElementById('qr-video');

    if (_qrScanningFrame) return false;
    if (!video || video.readyState < video.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
        if (manual) showToast('相機畫面尚未準備好，請稍等一下再試。', 'info');
        return false;
    }

    _qrScanningFrame = true;
    try {
        const nativeResult = await decodeQrWithNativeDetector(video);
        const result = nativeResult || decodeQrWithJsQr(video);

        if (result) {
            finishQrCameraScan(result);
            return true;
        }

        if (manual) {
            showToast('尚未偵測到 QR Code，請靠近一點或等畫面清楚再試。', 'info');
            setQrCameraStatus('尚未掃到。請讓 QR Code 佔畫面大一點，避免反光，等清楚後再按一次手動辨識。');
        }

        return false;
    } finally {
        _qrScanningFrame = false;
    }
}

window.startQrCamera = async function() {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        showToast('此瀏覽器不支援相機掃描', 'error');
        return;
    }

    if (!await window.ensureQrLibraries({ generator: false, scanner: true })) return;

    const video = document.getElementById('qr-video');
    const container = document.getElementById('qr-camera-container');
    const resultContainer = document.getElementById('qr-scan-result-container');

    stopQrCamera();

    if (container) container.classList.remove('hidden');
    if (resultContainer) resultContainer.classList.add('hidden');
    setQrCameraStatus('正在開啟相機...');

    try {
        _qrVideoStream = await navigator.mediaDevices.getUserMedia(getQrCameraConstraints());
        await applyQrCameraOptimizations(_qrVideoStream);

        video.srcObject = _qrVideoStream;
        video.setAttribute('playsinline', true);
        video.muted = true;
        await video.play();

        _qrLastScanAt = 0;
        _qrCameraFrameId = requestAnimationFrame(tickQrCamera);
    } catch (err) {
        showToast('無法存取相機: ' + err.message, 'error');
        stopQrCamera();
    }
};

window.stopQrCamera = function() {
    if (_qrCameraFrameId) {
        cancelAnimationFrame(_qrCameraFrameId);
        _qrCameraFrameId = null;
    }

    if (_qrVideoStream) {
        _qrVideoStream.getTracks().forEach(t => t.stop());
        _qrVideoStream = null;
    }

    const video = document.getElementById('qr-video');
    if (video) {
        video.pause();
        video.srcObject = null;
    }

    const container = document.getElementById('qr-camera-container');
    if (container) container.classList.add('hidden');

    setQrCameraStatus('');
    _qrScanningFrame = false;
};

window.captureQrFrame = async function() {
    if (!_qrVideoStream) {
        showToast('請先開啟相機', 'info');
        return;
    }

    await scanQrCurrentFrame({ manual: true });
};

function tickQrCamera() {
    if (!_qrVideoStream) return;

    const now = performance.now();
    if (now - _qrLastScanAt < QR_SCAN_INTERVAL_MS) {
        _qrCameraFrameId = requestAnimationFrame(tickQrCamera);
        return;
    }

    _qrLastScanAt = now;

    scanQrCurrentFrame().finally(() => {
        if (_qrVideoStream) {
            _qrCameraFrameId = requestAnimationFrame(tickQrCamera);
        }
    });
}
const _origCloseQrModal = window.closeQrModal;
window.closeQrModal = function() { stopQrCamera(); if (_origCloseQrModal) _origCloseQrModal(); };

