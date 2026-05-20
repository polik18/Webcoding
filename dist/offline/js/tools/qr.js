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
        const code = jsQR(imageData.data, imageData.width, imageData.height);
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

window.startQrCamera = async function() {
    if (!await window.ensureQrLibraries({ generator: false, scanner: true })) return;
    const video = document.getElementById('qr-video');
    const container = document.getElementById('qr-camera-container');
    const resultContainer = document.getElementById('qr-scan-result-container');
    container.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    try {
        _qrVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        video.srcObject = _qrVideoStream; video.setAttribute("playsinline", true); await video.play();
        requestAnimationFrame(tickQrCamera);
    } catch (err) { showToast('無法存取相機: ' + err.message, 'error'); stopQrCamera(); }
};
window.stopQrCamera = function() {
    if (_qrVideoStream) { _qrVideoStream.getTracks().forEach(t => t.stop()); _qrVideoStream = null; }
    if (_qrCameraFrameId) { cancelAnimationFrame(_qrCameraFrameId); _qrCameraFrameId = null; }
    document.getElementById('qr-camera-container').classList.add('hidden');
};
function tickQrCamera() {
    const video = document.getElementById('qr-video');
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        const code = typeof jsQR !== 'undefined' ? jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" }) : null;
        if (code && code.data) {
            stopQrCamera();
            document.getElementById('qr-scan-result-container').classList.remove('hidden');
            document.getElementById('qr-scan-result').textContent = code.data;
            showToast('掃描成功！', 'success');
            const linkBtn = document.getElementById('qr-result-link-btn');
            try { new URL(code.data); linkBtn.classList.remove('hidden'); linkBtn.onclick = () => window.open(code.data, '_blank'); } catch(e) { linkBtn.classList.add('hidden'); }
            return;
        }
    }
    _qrCameraFrameId = requestAnimationFrame(tickQrCamera);
}
const _origCloseQrModal = window.closeQrModal;
window.closeQrModal = function() { stopQrCamera(); if (_origCloseQrModal) _origCloseQrModal(); };
