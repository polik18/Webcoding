// js/core/offline.js
// PWA / Service Worker integration for first-online-use and later offline use.

(function() {
    'use strict';

    const app = window.WebcodingApp;
    const ns = app && app.namespace;
    const state = {
        supported: false,
        secure: false,
        registered: false,
        ready: false,
        online: navigator.onLine !== false,
        preparing: false,
        status: null,
        lastError: '',
        registration: null
    };

    function _isLocalhost() {
        return ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    }

    function _canUseServiceWorker() {
        return 'serviceWorker' in navigator && (window.isSecureContext || _isLocalhost());
    }

    function _connectionAllowsHeavyPreload() {
        const connection = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
        if (!connection) return true;
        if (connection.saveData) return false;
        return !/2g/i.test(connection.effectiveType || '');
    }

    function _toast(message, type) {
        if (typeof window.showToast === 'function') window.showToast(message, type || 'info');
    }

    function _el(id) { return document.getElementById(id); }

    function _setText(id, text) {
        const el = _el(id);
        if (el) el.textContent = text;
    }

    function _setProgress(done, total) {
        const bar = _el('offline-progress-bar');
        const pct = total ? Math.round((done / total) * 100) : 0;
        if (bar) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
        _setText('offline-progress-text', total ? `${done}/${total}` : '尚未開始');
    }

    function _countLabel(part) {
        if (!part || !part.total) return '尚未檢查';
        return `${part.cached}/${part.total}`;
    }

    function _setPill(mode, label, detail) {
        const dot = _el('offline-status-dot');
        const icon = _el('offline-status-icon');
        const button = _el('offline-status-button');
        _setText('offline-status-label', label);
        if (button) button.title = detail || label;
        if (dot) {
            dot.className = 'offline-status-dot';
            dot.classList.add(`offline-status-${mode}`);
        }
        if (icon) {
            icon.className = mode === 'ready'
                ? 'fa-solid fa-cloud-check text-emerald-500'
                : mode === 'working'
                    ? 'fa-solid fa-cloud-arrow-down text-blue-500'
                    : mode === 'error'
                        ? 'fa-solid fa-triangle-exclamation text-amber-500'
                        : 'fa-solid fa-cloud text-gray-400';
        }
    }

    function _updatePanel() {
        _setText('offline-detail-support', state.supported ? '可使用' : '需要 HTTPS 或 localhost');
        _setText('offline-detail-network', state.online ? '目前有網路' : '目前離線');
        _setText('offline-detail-core', _countLabel(state.status && state.status.core));
        _setText('offline-detail-ocr', _countLabel(state.status && state.status.ocr));
        _setText('offline-detail-version', state.status ? state.status.version : '尚未啟用');

        const note = _el('offline-detail-note');
        if (note) {
            if (!state.supported) note.textContent = '這個功能無法在 file:// 直接開啟時使用，請用 HTTPS 網站或 localhost 測試。';
            else if (state.preparing) note.textContent = '正在快取必要資源，請保持此頁開啟。';
            else if (state.lastError) note.textContent = state.lastError;
            else if (state.ready) note.textContent = '只要瀏覽器沒有清除網站資料，已快取的功能可在無網路時開啟。';
            else note.textContent = '正在等待 Service Worker 啟用。';
        }
    }

    function _updatePill() {
        if (!state.supported) {
            _setPill('error', '離線未啟用', '需要 HTTPS 或 localhost，file:// 無法安裝 Service Worker');
        } else if (state.preparing) {
            _setPill('working', '離線準備中', '正在快取網站與 OCR/QR 相關資源');
        } else if (state.ready) {
            const core = state.status && state.status.core;
            const coreReady = core && core.total && core.cached >= Math.max(1, Math.floor(core.total * 0.9));
            _setPill(coreReady ? 'ready' : 'working', coreReady ? '可離線' : '快取中', coreReady ? '核心資源已快取' : '核心資源尚未全部快取');
        } else {
            _setPill('idle', '離線待啟用', '正在註冊 Service Worker');
        }
        _updatePanel();
    }

    function _sendMessage(payload) {
        return new Promise((resolve, reject) => {
            if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
                reject(new Error('Service Worker 尚未接管此頁，重新整理一次後會更穩定。'));
                return;
            }
            const channel = new MessageChannel();
            let lastProgress = null;
            channel.port1.onmessage = event => {
                const data = event.data || {};
                if (data.type === 'OFFLINE_CACHE_PROGRESS') {
                    lastProgress = data;
                    _setProgress(data.done || 0, data.total || 0);
                    return;
                }
                resolve(data || lastProgress || {});
            };
            try {
                navigator.serviceWorker.controller.postMessage(payload, [channel.port2]);
            } catch (err) {
                reject(err);
            }
        });
    }

    async function refreshStatus() {
        if (!state.supported) {
            _updatePill();
            return null;
        }
        try {
            const status = await _sendMessage({ type: 'GET_OFFLINE_STATUS' });
            if (status && status.type === 'OFFLINE_STATUS') state.status = status;
            state.ready = true;
            state.lastError = '';
        } catch (err) {
            state.lastError = err.message || String(err);
        }
        _updatePill();
        return state.status;
    }

    async function cacheUrls(urls, options = {}) {
        if (!state.supported) return { ok: 0, failed: [] };
        if (!Array.isArray(urls) || !urls.length) return { ok: 0, failed: [] };
        try {
            const result = await _sendMessage({ type: 'CACHE_URLS', urls, refresh: !!options.refresh });
            await refreshStatus();
            return result;
        } catch (err) {
            state.lastError = err.message || String(err);
            _updatePill();
            return { ok: 0, failed: urls.map(url => ({ url, error: state.lastError })) };
        }
    }

    async function prepareAll(options = {}) {
        if (!state.supported) {
            _toast('離線安裝需要 HTTPS 或 localhost；直接開 HTML 檔無法使用這個功能。', 'error');
            _updatePill();
            return null;
        }
        if (state.preparing) return null;

        const includeOcr = options.includeOcr !== false;
        state.preparing = true;
        state.lastError = '';
        _setProgress(0, 0);
        _updatePill();

        try {
            const result = await _sendMessage({ type: 'PREPARE_OFFLINE', includeOcr, refresh: !!options.refresh });
            state.preparing = false;
            await refreshStatus();
            const failed = result && Array.isArray(result.failed) ? result.failed : [];
            if (failed.length) {
                state.lastError = `有 ${failed.length} 個資源尚未快取；通常是 OCR 遠端語言包或瀏覽器 CORS 限制。`;
                if (!options.silent) _toast('離線核心已準備，部分大型 OCR 資源尚未快取。', 'info');
            } else if (!options.silent) {
                _toast('離線資源已準備完成。', 'success');
            }
            _updatePill();
            return result;
        } catch (err) {
            state.preparing = false;
            state.lastError = err.message || String(err);
            _updatePill();
            if (!options.silent) _toast('離線資源準備失敗，請確認目前有網路。', 'error');
            return null;
        }
    }

    async function prepareCore(options = {}) {
        return prepareAll(Object.assign({}, options, { includeOcr: false }));
    }

    async function prepareOcr(options = {}) {
        if (!_connectionAllowsHeavyPreload() && options.silent) return null;
        return prepareAll(Object.assign({}, options, { includeOcr: true }));
    }

    function togglePanel(force) {
        const panel = _el('offline-panel');
        if (!panel) return;
        const show = typeof force === 'boolean' ? force : panel.classList.contains('hidden');
        panel.classList.toggle('hidden', !show);
        if (show) refreshStatus();
    }

    function closePanel() { togglePanel(false); }

    function _scheduleBackgroundPrep() {
        const run = () => {
            prepareCore({ silent: true }).then(() => {
                if (_connectionAllowsHeavyPreload()) {
                    setTimeout(() => prepareOcr({ silent: true }), 3500);
                }
            });
        };
        if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 3000 });
        else setTimeout(run, 1800);
    }

    async function init() {
        state.secure = window.isSecureContext || _isLocalhost();
        state.supported = _canUseServiceWorker();
        window.addEventListener('online', () => { state.online = true; _updatePill(); refreshStatus(); });
        window.addEventListener('offline', () => { state.online = false; _updatePill(); });

        if (!state.supported) {
            _updatePill();
            return;
        }

        try {
            state.registration = await navigator.serviceWorker.register('service-worker.js', { scope: './' });
            state.registered = true;
            await navigator.serviceWorker.ready;
            state.ready = true;
            _updatePill();

            if (!navigator.serviceWorker.controller) {
                // The worker is installed but this page may need one reload before it can receive messages.
                state.lastError = 'Service Worker 已安裝；重新整理一次後可顯示完整快取狀態。';
                _updatePill();
            } else {
                await refreshStatus();
                _scheduleBackgroundPrep();
            }
        } catch (err) {
            state.lastError = err.message || String(err);
            _updatePill();
        }
    }

    const api = {
        state,
        init,
        refreshStatus,
        prepareAll,
        prepareCore,
        prepareOcr,
        cacheUrls,
        togglePanel,
        closePanel
    };

    if (ns) ns.expose('core.offline', api);
    window.WebcodingOffline = api;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
