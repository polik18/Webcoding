// js/tools/ocr-engine.js
// High-accuracy free browser OCR engine: lazy-loads Tesseract.js, chooses better
// Chinese language data, preprocesses images with CJK-friendly variants, runs
// multiple recognition passes, and returns the best-scored result.
// Requires: js/core/loader.js for loadScript().

(function() {
    const TESSDATA_PATHS = Object.assign({
        standard: 'https://tessdata.projectnaptha.com/4.0.0',
        best: 'https://tessdata.projectnaptha.com/4.0.0_best',
        fast: 'https://tessdata.projectnaptha.com/4.0.0_fast'
    }, window.WEBCODING_TESSDATA_PATHS || {});

    let _tesseractLoadPromise = null;
    let _worker = null;
    let _workerKey = null;
    let _activeLogger = null;

    const CJK_RE = /[\u3400-\u9fff\uf900-\ufaff]/g;
    const CJK_FULL_RE = /[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\u31f0-\u31ff\uac00-\ud7af\uff00-\uffef]/;
    const MEANINGFUL_RE = /[A-Za-z0-9\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\u31f0-\u31ff\uac00-\ud7af]/g;

    const PSM_VALUES = {
        auto: '3',
        column: '4',
        vertical: '5',
        block: '6',
        line: '7',
        sparse: '11'
    };

    function _setProgress(callback, percent, message, detail) {
        if (typeof callback === 'function') {
            callback({ percent: Math.max(0, Math.min(100, Math.round(percent))), message, detail });
        }
    }

    function _isCjkLang(lang) {
        return /(^|\+)(chi_tra|chi_sim|jpn|kor|chi_tra_vert|jpn_vert)(\+|$)/.test(lang || '');
    }

    function _selectTessdata(profile, lang) {
        if (profile === 'fast') {
            return { mode: 'fast', langPath: TESSDATA_PATHS.fast, label: '快速語言包' };
        }
        if (_isCjkLang(lang) || profile === 'accurate') {
            return { mode: 'best', langPath: TESSDATA_PATHS.best, label: '高準確語言包' };
        }
        return { mode: 'standard', langPath: TESSDATA_PATHS.standard, label: '標準語言包' };
    }

    function _loadImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('圖片載入失敗'));
            img.src = dataUrl;
        });
    }

    function _cloneCanvas(canvas) {
        const copy = document.createElement('canvas');
        copy.width = canvas.width;
        copy.height = canvas.height;
        copy.getContext('2d').drawImage(canvas, 0, 0);
        return copy;
    }

    function _scaledCanvasFromImage(img, profile, isCjk) {
        const naturalWidth = img.naturalWidth || img.width || 1;
        const naturalHeight = img.naturalHeight || img.height || 1;
        const longSide = Math.max(naturalWidth, naturalHeight);
        const maxSideByProfile = { fast: 2000, balanced: isCjk ? 2800 : 2400, accurate: isCjk ? 3600 : 3000 };
        const targetMinByProfile = { fast: 1200, balanced: isCjk ? 1700 : 1400, accurate: isCjk ? 2200 : 1700 };
        const maxSide = maxSideByProfile[profile] || maxSideByProfile.balanced;
        const targetMin = targetMinByProfile[profile] || targetMinByProfile.balanced;
        const upscale = longSide < targetMin ? Math.min(isCjk ? 4 : 3, targetMin / Math.max(1, longSide)) : 1;
        const downscale = longSide * upscale > maxSide ? maxSide / (longSide * upscale) : 1;
        const scale = Math.max(0.25, Math.min(isCjk ? 4 : 3, upscale * downscale));

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(naturalHeight * scale));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    function _addPadding(source, ratio) {
        const pad = Math.max(18, Math.round(Math.max(source.width, source.height) * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = source.width + pad * 2;
        canvas.height = source.height + pad * 2;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(source, pad, pad);
        return canvas;
    }

    function _computeOtsuThreshold(hist, total) {
        let sum = 0;
        for (let i = 0; i < 256; i++) sum += i * hist[i];
        let sumB = 0, wB = 0, maxVariance = 0, threshold = 128;
        for (let i = 0; i < 256; i++) {
            wB += hist[i];
            if (wB === 0) continue;
            const wF = total - wB;
            if (wF === 0) break;
            sumB += i * hist[i];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;
            const variance = wB * wF * Math.pow(mB - mF, 2);
            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = i;
            }
        }
        return threshold;
    }

    function _canvasStats(source) {
        const ctx = source.getContext('2d', { willReadFrequently: true });
        const imgData = ctx.getImageData(0, 0, source.width, source.height);
        const data = imgData.data;
        const hist = new Array(256).fill(0);
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            hist[gray]++;
            sum += gray;
        }
        const total = Math.max(1, source.width * source.height);
        return { avg: sum / total, threshold: _computeOtsuThreshold(hist, total), hist, total };
    }

    function _enhanceCanvas(source, options = {}) {
        const canvas = _cloneCanvas(source);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const hist = new Array(256).fill(0);
        const grayValues = new Uint8ClampedArray(canvas.width * canvas.height);
        let sum = 0;

        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
            const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            grayValues[p] = gray;
            hist[gray]++;
            sum += gray;
        }

        const total = Math.max(1, canvas.width * canvas.height);
        const avg = sum / total;
        const threshold = _computeOtsuThreshold(hist, total) + (options.thresholdBias || 0);
        const contrast = options.contrast == null ? 1.25 : options.contrast;
        const brightness = options.brightness == null ? 4 : options.brightness;
        const gamma = options.gamma || 1;
        const autoInvert = options.autoInvert !== false && avg < 92;
        const forceInvert = !!options.invert;
        const sharpen = options.sharpen || 0;
        const useThreshold = !!options.threshold;
        const softThreshold = !!options.softThreshold;

        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
            let gray = grayValues[p];
            if (sharpen > 0 && canvas.width > 2 && canvas.height > 2) {
                const x = p % canvas.width;
                const y = Math.floor(p / canvas.width);
                if (x > 0 && y > 0 && x < canvas.width - 1 && y < canvas.height - 1) {
                    const up = grayValues[p - canvas.width];
                    const down = grayValues[p + canvas.width];
                    const left = grayValues[p - 1];
                    const right = grayValues[p + 1];
                    const blur = (up + down + left + right) / 4;
                    gray = Math.max(0, Math.min(255, gray + (gray - blur) * sharpen));
                }
            }
            if (gamma !== 1) gray = 255 * Math.pow(Math.max(0, Math.min(255, gray)) / 255, gamma);
            gray = Math.max(0, Math.min(255, (gray - 128) * contrast + 128 + brightness));
            if (softThreshold) {
                const distance = gray - threshold;
                gray = Math.max(0, Math.min(255, 128 + distance * 1.8));
            }
            if (useThreshold) gray = gray >= threshold ? 255 : 0;
            if (forceInvert || autoInvert) gray = 255 - gray;
            data[i] = data[i + 1] = data[i + 2] = Math.round(gray);
        }

        ctx.putImageData(imgData, 0, 0);
        return canvas;
    }

    function _canvasToPngVariant(name, canvas) {
        return { name, dataUrl: canvas.toDataURL('image/png') };
    }

    async function _preprocessImage(dataUrl, profile, lang) {
        const isCjk = _isCjkLang(lang);
        const img = await _loadImage(dataUrl);
        const base = _addPadding(_scaledCanvasFromImage(img, profile, isCjk), isCjk ? 0.035 : 0.025);
        const stats = _canvasStats(base);

        const original = _canvasToPngVariant('原圖高清補邊', base);
        const cjkSharp = _canvasToPngVariant('中文細字銳化', _enhanceCanvas(base, {
            contrast: isCjk ? 1.28 : 1.22,
            brightness: 6,
            gamma: 0.96,
            sharpen: isCjk ? 0.55 : 0.35,
            autoInvert: true
        }));
        const softDoc = _canvasToPngVariant('柔化陰影文件', _enhanceCanvas(base, {
            contrast: 1.12,
            brightness: stats.avg < 150 ? 16 : 8,
            gamma: 0.9,
            sharpen: isCjk ? 0.25 : 0.15,
            softThreshold: false,
            autoInvert: true
        }));
        const bwDoc = _canvasToPngVariant('黑白文件保留筆畫', _enhanceCanvas(base, {
            contrast: isCjk ? 1.55 : 1.45,
            brightness: 4,
            sharpen: isCjk ? 0.45 : 0.25,
            threshold: true,
            thresholdBias: isCjk ? 10 : 4,
            autoInvert: true
        }));

        if (profile === 'fast') return [cjkSharp];

        const variants = [original, cjkSharp, softDoc, bwDoc];

        if (profile === 'accurate') {
            variants.push(_canvasToPngVariant('高對比截圖', _enhanceCanvas(base, {
                contrast: isCjk ? 1.7 : 1.55,
                brightness: 2,
                gamma: 1,
                sharpen: isCjk ? 0.75 : 0.45,
                softThreshold: true,
                thresholdBias: isCjk ? 6 : 0,
                autoInvert: true
            })));
            variants.push(_canvasToPngVariant('反白文字校正', _enhanceCanvas(base, {
                contrast: 1.35,
                brightness: 6,
                sharpen: isCjk ? 0.35 : 0.25,
                invert: true,
                autoInvert: false
            })));
        }

        return variants;
    }

    function _meaningfulCharCount(text) {
        const matches = text.match(MEANINGFUL_RE);
        return matches ? matches.length : 0;
    }

    function _scoreResult(text, confidence, lang) {
        const compact = (text || '').replace(/\s+/g, '');
        if (!compact) return -Infinity;
        const cjkLang = _isCjkLang(lang);
        const cjk = (compact.match(CJK_RE) || []).length;
        const kanaHangul = (compact.match(/[\u3040-\u30ff\u31f0-\u31ff\uac00-\ud7af]/g) || []).length;
        const latinDigits = (compact.match(/[A-Za-z0-9]/g) || []).length;
        const meaningful = _meaningfulCharCount(compact);
        const noise = (compact.match(/[~`^_|{}\[\]<>\\]/g) || []).length;
        const replacement = (compact.match(/[�□■◆◇●○◎]/g) || []).length;
        const repeatedNoise = (compact.match(/([^\u3400-\u9fff])\1{5,}/g) || []).length;
        const oddPunct = (compact.match(/[•·‧¦¤¬※#￥$]/g) || []).length;
        const cjkMissPenalty = cjkLang && meaningful >= 8 && cjk === 0 && kanaHangul === 0 ? 35 : 0;
        const symbolRatioPenalty = compact.length ? Math.max(0, (noise + replacement + oddPunct) / compact.length - 0.08) * 100 : 0;
        const confidenceScore = Math.max(0, Number(confidence) || 0) * 0.35;

        return (cjkLang ? cjk * 4.2 + kanaHangul * 3.5 + latinDigits * 1.3 : meaningful * 2.6)
            + compact.length * 0.18
            + confidenceScore
            - noise * 4
            - replacement * 12
            - repeatedNoise * 12
            - oddPunct * 3
            - cjkMissPenalty
            - symbolRatioPenalty;
    }

    async function _loadTesseract() {
        if (window.Tesseract) return window.Tesseract;
        if (_tesseractLoadPromise) return _tesseractLoadPromise;

        _tesseractLoadPromise = (async () => {
            if (typeof window.loadDependency !== 'function') {
                throw new Error('動態載入器尚未初始化');
            }
            await window.loadDependency('tesseract', { toast: false });
            if (window.Tesseract) return window.Tesseract;
            throw new Error('Tesseract.js 載入失敗');
        })().catch(err => {
            _tesseractLoadPromise = null;
            throw err;
        });

        return _tesseractLoadPromise;
    }

    async function _terminateWorker() {
        if (_worker) {
            try { await _worker.terminate(); } catch (e) { console.warn('[OCR] terminate worker failed:', e); }
            _worker = null;
            _workerKey = null;
        }
    }

    async function _getWorker(lang, dataProfile) {
        const Tesseract = await _loadTesseract();
        const key = `${lang}::${dataProfile.mode}`;
        if (_worker && _workerKey === key) return _worker;
        await _terminateWorker();

        const logger = m => {
            if (typeof _activeLogger === 'function') _activeLogger(m);
        };

        _worker = await Tesseract.createWorker({
            logger,
            langPath: dataProfile.langPath,
            cacheMethod: 'write',
            gzip: true
        });
        if (typeof _worker.load === 'function') await _worker.load();
        await _worker.loadLanguage(lang);
        // OCR Engine Mode 1 = LSTM only. For Chinese, the LSTM model is usually the useful one.
        await _worker.initialize(lang, 1);
        _workerKey = key;
        return _worker;
    }

    async function _setWorkerParameters(worker, psm) {
        if (!worker || typeof worker.setParameters !== 'function') return;
        await worker.setParameters({
            preserve_interword_spaces: '1',
            user_defined_dpi: '300',
            tessedit_pageseg_mode: PSM_VALUES[psm] || PSM_VALUES.block
        });
    }

    function _buildRuns(variants, profile, psm, lang) {
        const selectedPsm = psm || 'auto';
        if (selectedPsm !== 'auto') {
            return variants.map(v => ({ ...v, psm: selectedPsm }));
        }

        if (profile === 'fast') {
            return [{ ...variants[0], psm: 'block' }];
        }

        if (profile === 'accurate') {
            const runs = [];
            variants.forEach((variant, index) => {
                const name = variant.name;
                const psmForVariant = index === 0 ? 'auto' : (name.includes('截圖') ? 'sparse' : 'block');
                runs.push({ ...variant, psm: psmForVariant });
            });
            const bestSparse = variants.find(v => v.name.includes('中文細字')) || variants[1] || variants[0];
            runs.push({ ...bestSparse, name: `${bestSparse.name} / 零散文字`, psm: 'sparse' });
            return runs;
        }

        return variants.map((v, index) => ({ ...v, psm: index === 0 ? 'auto' : 'block' }));
    }



    const _preloadState = {
        enginePromise: null,
        languageLinks: new Set(),
        scheduled: false
    };

    function _connectionAllowsPreload() {
        const connection = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
        if (!connection) return true;
        if (connection.saveData) return false;
        return !/2g/i.test(connection.effectiveType || '');
    }

    function _langParts(lang) {
        return String(lang || 'chi_tra+eng')
            .split('+')
            .map(part => part.trim())
            .filter(Boolean);
    }

    function _tessdataUrl(langCode, dataProfile) {
        const base = (dataProfile && dataProfile.langPath) || TESSDATA_PATHS.best;
        return `${String(base).replace(/\/$/, '')}/${langCode}.traineddata.gz`;
    }

    function _prefetchUrl(url, asType = 'fetch') {
        if (!url || _preloadState.languageLinks.has(url)) return;
        _preloadState.languageLinks.add(url);
        try {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            link.as = asType;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        } catch (err) {
            console.warn('[OCR] prefetch link failed:', url, err);
        }
    }

    function _prefetchLanguageData(lang, profile) {
        if (!_connectionAllowsPreload()) return [];
        const dataProfile = _selectTessdata(profile || 'balanced', lang || 'chi_tra+eng');
        const urls = _langParts(lang).map(part => _tessdataUrl(part, dataProfile));
        urls.forEach(url => _prefetchUrl(url, 'fetch'));

        // If the PWA Service Worker is active, also place language data into
        // Cache Storage so the next OCR run can survive temporary network loss.
        try {
            const offline = window.WebcodingApp && window.WebcodingApp.namespace && window.WebcodingApp.namespace.get('core.offline');
            if (offline && typeof offline.cacheUrls === 'function') {
                offline.cacheUrls(urls, { reason: 'ocr-language-prefetch' }).catch(err => console.warn('[OCR] offline cache language data failed:', err));
            }
        } catch (err) {
            console.warn('[OCR] offline language cache hook failed:', err);
        }
        return urls;
    }

    window.preloadOcrAssets = function(options = {}) {
        const lang = options.lang || 'chi_tra+eng';
        const profile = options.profile || 'balanced';
        const includeLanguageData = options.includeLanguageData !== false;

        if (includeLanguageData) _prefetchLanguageData(lang, profile);

        if (!_preloadState.enginePromise) {
            _preloadState.enginePromise = _loadTesseract().catch(err => {
                _preloadState.enginePromise = null;
                console.warn('[OCR] background preload failed:', err);
                return null;
            });
        }
        return _preloadState.enginePromise;
    };

    window.scheduleOcrPreload = function(options = {}) {
        if (!_connectionAllowsPreload() && options.reason === 'idle') return Promise.resolve(null);
        if (_preloadState.scheduled && options.reason === 'idle') return _preloadState.enginePromise || Promise.resolve(null);
        if (options.reason === 'idle') _preloadState.scheduled = true;

        const run = () => window.preloadOcrAssets(options);
        if (options.reason === 'idle' && 'requestIdleCallback' in window) {
            return new Promise(resolve => requestIdleCallback(() => resolve(run()), { timeout: 2500 }));
        }
        const delay = options.reason === 'idle' ? 1200 : 0;
        return new Promise(resolve => setTimeout(() => resolve(run()), delay));
    };

    window.cleanOcrText = function(text, options = {}) {
        if (!text) return '';
        const mergeCjkLines = options.mergeCjkLines === true;
        let cleaned = String(text)
            .replace(/\r\n?/g, '\n')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[\t\u00A0]+/g, ' ')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n[ \t]+/g, '\n')
            .replace(/[，,]\s*([。！？!?])/g, '$1');

        let prev;
        do {
            prev = cleaned;
            cleaned = cleaned.replace(/([\u3000-\u303F\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\u31f0-\u31ff\uac00-\ud7af\uFF00-\uFFEF])\s+([\u3000-\u303F\u3400-\u9fff\uf900-\ufaff\u3040-\u30ff\u31f0-\u31ff\uac00-\ud7af\uFF00-\uFFEF])/g, '$1$2');
        } while (cleaned !== prev);

        cleaned = cleaned
            .replace(/\s+([，。！？；：、）」』】〉》])/g, '$1')
            .replace(/([「『（【〈《])\s+/g, '$1')
            .replace(/([A-Za-z])-\n([A-Za-z])/g, '$1$2');

        if (mergeCjkLines) {
            cleaned = cleaned.replace(/([^。！？!?；;：:\n])\n(?=[\u3400-\u9fff\uf900-\ufaff])/g, '$1');
        }

        cleaned = cleaned
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]{2,}/g, ' ')
            .trim();
        return cleaned;
    };

    window.recognizeImageWithOcr = async function(imageDataUrl, options = {}) {
        const lang = options.lang || 'chi_tra+eng';
        const profile = options.profile || 'balanced';
        const psm = options.psm || 'auto';
        const onProgress = options.onProgress;
        const dataProfile = _selectTessdata(profile, lang);

        _setProgress(onProgress, 3, '正在強化圖片...', _isCjkLang(lang) ? '中文細字模式' : '通用模式');
        const variants = await _preprocessImage(imageDataUrl, profile, lang);
        const runs = _buildRuns(variants, profile, psm, lang);

        _setProgress(onProgress, 12, '正在載入 OCR 引擎與語言資料...', dataProfile.label);
        let currentRun = 0;
        _activeLogger = m => {
            if (!m) return;
            const runStart = 22 + (currentRun / Math.max(1, runs.length)) * 73;
            const runSize = 73 / Math.max(1, runs.length);
            const p = typeof m.progress === 'number' ? m.progress : 0;
            const label = m.status === 'recognizing text' ? '正在辨識文字...' : (m.status || '正在處理...');
            _setProgress(onProgress, runStart + p * runSize, label, runs[currentRun] ? runs[currentRun].name : '');
        };
        const worker = await _getWorker(lang, dataProfile);

        let best = null;
        const attempts = [];
        for (currentRun = 0; currentRun < runs.length; currentRun++) {
            const run = runs[currentRun];
            _setProgress(onProgress, 22 + (currentRun / runs.length) * 73, `辨識中：${run.name}`);
            await _setWorkerParameters(worker, run.psm);
            const result = await worker.recognize(run.dataUrl);
            const rawText = (result && result.data && result.data.text) || '';
            const text = window.cleanOcrText(rawText);
            const confidence = result && result.data ? result.data.confidence : 0;
            const score = _scoreResult(text, confidence, lang);
            const attempt = { text, confidence, score, variant: run.name, psm: run.psm, imageDataUrl: run.dataUrl, dataMode: dataProfile.mode };
            attempts.push(attempt);
            if (!best || attempt.score > best.score) best = attempt;
        }

        _activeLogger = null;
        _setProgress(onProgress, 100, '辨識完成');
        return {
            text: best ? best.text : '',
            confidence: best ? best.confidence : 0,
            variant: best ? best.variant : '',
            psm: best ? best.psm : psm,
            dataMode: dataProfile.mode,
            dataLabel: dataProfile.label,
            processedImageDataUrl: best ? best.imageDataUrl : imageDataUrl,
            attempts
        };
    };

    window.releaseOcrWorker = _terminateWorker;
})();
