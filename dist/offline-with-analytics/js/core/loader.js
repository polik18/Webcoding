// js/core/loader.js
// Central dependency manager for optional / heavy browser libraries.
// Responsibilities:
// 1) load scripts/styles lazily and only once
// 2) try fallback CDNs in order
// 3) verify that the expected global object exists after loading
// 4) expose a small compatibility API: loadScript(), loadScripts(), loadCSS()

(function() {
    const scriptStates = new Map(); // absoluteUrl -> Promise
    const styleStates  = new Map(); // absoluteUrl -> Promise
    const registry     = new Map(); // dependencyName -> config
    const depStates    = new Map(); // dependencyName -> Promise

    function _absUrl(url) {
        try { return new URL(url, document.baseURI).href; }
        catch (e) { return url; }
    }

    function _asArray(value) {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
    }

    function _isRemoteUrl(url) {
        return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(String(url || ''));
    }

    function _isLocalUrl(url) {
        return !!url && !_isRemoteUrl(url) && !String(url).startsWith('data:');
    }

    function _remoteFallbacksEnabled() {
        return !(window.WEBCODING_OFFLINE === true || window.WEBCODING_DISABLE_REMOTE_FALLBACKS === true);
    }

    function _applyRemotePolicy(urls) {
        const list = _asArray(urls);
        return _remoteFallbacksEnabled() ? list : list.filter(url => !_isRemoteUrl(url));
    }

    function _preferLocal(config) {
        return config.preferLocal !== false;
    }

    function _orderedSources(config) {
        if (!config) return [];
        if (Array.isArray(config.sources)) return _applyRemotePolicy(config.sources.slice());
        const local = _asArray(config.localUrls);
        const remote = _asArray(config.urls);
        return _applyRemotePolicy(_preferLocal(config) ? local.concat(remote) : remote.concat(local));
    }

    function _orderedStyles(config) {
        if (!config) return [];
        if (Array.isArray(config.styleSources)) return _applyRemotePolicy(config.styleSources.slice());
        const local = _asArray(config.localStyles);
        const remote = _asArray(config.styles);
        return _applyRemotePolicy(_preferLocal(config) ? local.concat(remote) : remote.concat(local));
    }

    function _configuredSources(config) {
        if (!config) return [];
        if (Array.isArray(config.sources)) return config.sources.slice();
        const local = _asArray(config.localUrls);
        const remote = _asArray(config.urls);
        return _preferLocal(config) ? local.concat(remote) : remote.concat(local);
    }

    function _configuredStyles(config) {
        if (!config) return [];
        if (Array.isArray(config.styleSources)) return config.styleSources.slice();
        const local = _asArray(config.localStyles);
        const remote = _asArray(config.styles);
        return _preferLocal(config) ? local.concat(remote) : remote.concat(local);
    }

    function _sourceSummary(config) {
        const configuredScriptUrls = _configuredSources(config);
        const configuredStyleUrls = _configuredStyles(config);
        const configuredGroupUrls = _asArray(config && config.scripts).flatMap(group => {
            const groupConfig = typeof group === 'string' || Array.isArray(group) ? { urls: group } : group;
            return _configuredSources(groupConfig);
        });
        const configured = configuredScriptUrls.concat(configuredStyleUrls, configuredGroupUrls);
        const runtimeScriptUrls = _orderedSources(config);
        const runtimeStyleUrls = _orderedStyles(config);
        const runtimeGroupUrls = _asArray(config && config.scripts).flatMap(group => {
            const groupConfig = typeof group === 'string' || Array.isArray(group) ? { urls: group } : group;
            return _orderedSources(groupConfig);
        });
        const runtime = runtimeScriptUrls.concat(runtimeStyleUrls, runtimeGroupUrls);
        return {
            local: configured.filter(_isLocalUrl).length,
            remote: configured.filter(_isRemoteUrl).length,
            localFirst: configured.length > 1 && _isLocalUrl(configured[0]),
            total: configured.length,
            runtimeLocal: runtime.filter(_isLocalUrl).length,
            runtimeRemote: runtime.filter(_isRemoteUrl).length,
            remoteFallbacksEnabled: _remoteFallbacksEnabled()
        };
    }

    function _getLabel(name, config) {
        return (config && config.label) || name;
    }

    function _safeCheck(check) {
        if (typeof check !== 'function') return false;
        try { return !!check(); }
        catch (e) { return false; }
    }

    function _showToast(message, type) {
        if (typeof window.showToast === 'function') window.showToast(message, type || 'info');
    }

    function _loadScriptTag(url) {
        if (_isRemoteUrl(url) && !_remoteFallbacksEnabled()) {
            return Promise.reject(new Error('Remote script fallback disabled in offline mode: ' + url));
        }
        const key = _absUrl(url);
        if (scriptStates.has(key)) return scriptStates.get(key);

        const existing = Array.from(document.scripts || []).find(s => _absUrl(s.src) === key);
        if (existing && existing.dataset.webpadLoaded === 'true') {
            const resolved = Promise.resolve();
            scriptStates.set(key, resolved);
            return resolved;
        }

        const promise = new Promise((resolve, reject) => {
            const script = existing || document.createElement('script');
            const done = () => {
                script.dataset.webpadLoaded = 'true';
                resolve();
            };
            const fail = () => {
                scriptStates.delete(key);
                reject(new Error('Failed to load script: ' + url));
            };

            script.addEventListener('load', done, { once: true });
            script.addEventListener('error', fail, { once: true });

            if (!existing) {
                script.src = url;
                script.async = true;
                script.crossOrigin = 'anonymous';
                document.head.appendChild(script);
            } else {
                // If a matching script was already in the HTML, it may have loaded
                // before loader.js existed. Give its global check a microtask to run;
                // if no global check is used, treating the existing tag as loaded is safer
                // than injecting duplicate scripts.
                setTimeout(done, 0);
            }
        });

        scriptStates.set(key, promise);
        return promise;
    }

    function _loadCssTag(url) {
        if (_isRemoteUrl(url) && !_remoteFallbacksEnabled()) {
            return Promise.reject(new Error('Remote stylesheet fallback disabled in offline mode: ' + url));
        }
        const key = _absUrl(url);
        if (styleStates.has(key)) return styleStates.get(key);

        const existing = Array.from(document.styleSheets || []).find(sheet => sheet.href && _absUrl(sheet.href) === key)
            || document.querySelector(`link[href="${url}"]`);
        if (existing) {
            const resolved = Promise.resolve();
            styleStates.set(key, resolved);
            return resolved;
        }

        const promise = new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            link.onload = resolve;
            link.onerror = () => {
                styleStates.delete(key);
                reject(new Error('Failed to load stylesheet: ' + url));
            };
            document.head.appendChild(link);
        });

        styleStates.set(key, promise);
        return promise;
    }

    async function _loadFirstScript(urls, check, label) {
        let lastError = null;
        for (const url of _asArray(urls)) {
            try {
                await _loadScriptTag(url);
                if (!check || _safeCheck(check)) return url;
                lastError = new Error(`${label || 'Library'} loaded but expected global was not found: ${url}`);
            } catch (err) {
                lastError = err;
                console.warn('[Dependency] fallback script failed:', url, err);
            }
        }
        throw lastError || new Error(`No script URL configured for ${label || 'dependency'}`);
    }

    async function _loadFirstStyle(urls, label) {
        let lastError = null;
        for (const url of _asArray(urls)) {
            try {
                await _loadCssTag(url);
                return url;
            } catch (err) {
                lastError = err;
                console.warn('[Dependency] fallback stylesheet failed:', url, err);
            }
        }
        throw lastError || new Error(`No stylesheet URL configured for ${label || 'dependency'}`);
    }

    async function _loadStyles(urls) {
        await Promise.all(_asArray(urls).map(_loadCssTag));
    }

    function defineDependency(name, config) {
        if (!name || !config) throw new Error('defineDependency(name, config) is required');
        registry.set(name, Object.assign({}, config));
    }

    async function loadDependency(name, options = {}) {
        const config = registry.get(name);
        if (!config) throw new Error('Unknown dependency: ' + name);
        if (_safeCheck(config.check)) return config.exports ? config.exports() : true;
        if (depStates.has(name)) return depStates.get(name);

        const label = _getLabel(name, config);
        const promise = (async () => {
            if (options.toast !== false && options.message) _showToast(options.message, 'info');

            for (const dep of _asArray(config.depends)) await loadDependency(dep, { toast: false });

            const loadedUrls = [];
            const styleUrls = _orderedStyles(config);
            if (styleUrls.length) {
                if (config.localStyles || config.styleSources) {
                    loadedUrls.push(await _loadFirstStyle(styleUrls, label));
                } else {
                    await _loadStyles(styleUrls);
                    loadedUrls.push(...styleUrls);
                }
            }

            const scriptUrls = _orderedSources(config);
            if (scriptUrls.length) {
                loadedUrls.push(await _loadFirstScript(scriptUrls, config.check, label));
            }

            for (const group of _asArray(config.scripts)) {
                const groupConfig = typeof group === 'string' || Array.isArray(group) ? { urls: group } : group;
                loadedUrls.push(await _loadFirstScript(_orderedSources(groupConfig), groupConfig.check || config.check, groupConfig.label || label));
            }

            if (typeof config.afterLoad === 'function') await config.afterLoad({
                name,
                config,
                loadedUrls,
                usedLocal: loadedUrls.some(_isLocalUrl),
                usedRemote: loadedUrls.some(_isRemoteUrl)
            });
            if (config.check && !_safeCheck(config.check)) {
                throw new Error(`${label} 載入後仍無法使用`);
            }
            return config.exports ? config.exports() : true;
        })().catch(err => {
            depStates.delete(name);
            throw err;
        });

        depStates.set(name, promise);
        return promise;
    }

    async function ensureDependency(name, options = {}) {
        const config = registry.get(name);
        const label = _getLabel(name, config);
        try {
            await loadDependency(name, options);
            return true;
        } catch (err) {
            console.error('[Dependency] load failed:', name, err);
            const message = options.errorMessage || `${label} 載入失敗，請確認本地 vendor 檔案是否存在，或網路/CDN 是否可用`;
            if (options.toast !== false) _showToast(message, 'error');
            return false;
        }
    }

    function getDependencyStatus() {
        const rows = [];
        registry.forEach((config, name) => {
            rows.push({
                name,
                label: _getLabel(name, config),
                loaded: _safeCheck(config.check),
                loading: depStates.has(name),
                sources: _sourceSummary(config)
            });
        });
        return rows;
    }

    // Backward-compatible helpers used by older modules.
    window.loadScript = function(url, options = {}) {
        return _loadScriptTag(url).then(() => {
            if (typeof options.check === 'function' && !_safeCheck(options.check)) {
                throw new Error((options.label || url) + ' loaded but verification failed');
            }
        });
    };
    window.loadScripts = function(...urls) { return Promise.all(urls.flat().map(url => window.loadScript(url))); };
    window.loadCSS = function(url) { return _loadCssTag(url); };

    window.dependencyManager = {
        define: defineDependency,
        load: loadDependency,
        ensure: ensureDependency,
        status: getDependencyStatus,
        remoteFallbacksEnabled: _remoteFallbacksEnabled,
        setRemoteFallbacksEnabled(enabled) {
            window.WEBCODING_DISABLE_REMOTE_FALLBACKS = enabled === false;
        },
        has: name => registry.has(name),
        describe: name => {
            const config = registry.get(name);
            if (!config) return null;
            return {
                name,
                label: _getLabel(name, config),
                sources: _sourceSummary(config),
                loaded: _safeCheck(config.check),
                loading: depStates.has(name)
            };
        }
    };
    window.defineDependency = defineDependency;
    window.loadDependency = loadDependency;
    window.ensureDependency = ensureDependency;

    // ─── Optional / heavy dependency registry ──────────────────────────────────
    defineDependency('qrcodejs', {
        label: 'QR Code 產生器',
        localUrls: ['libs/vendor/qrcode.min.js'],
        urls: [
            'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
            'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
        ],
        check: () => typeof window.QRCode === 'function'
    });

    defineDependency('jsqr', {
        label: 'QR Code 掃描器',
        localUrls: ['libs/vendor/jsQR.min.js'],
        urls: [
            'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
            'https://unpkg.com/jsqr@1.4.0/dist/jsQR.min.js'
        ],
        check: () => typeof window.jsQR === 'function'
    });

    defineDependency('qr', {
        label: 'QR Code 工具',
        depends: ['qrcodejs', 'jsqr'],
        check: () => typeof window.QRCode === 'function' && typeof window.jsQR === 'function'
    });

    defineDependency('tesseract', {
        label: 'OCR 引擎 Tesseract.js',
        localUrls: ['libs/vendor/tesseract.min.js'],
        urls: [
            'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.4/dist/tesseract.min.js',
            'https://unpkg.com/tesseract.js@4.1.4/dist/tesseract.min.js'
        ],
        check: () => !!window.Tesseract
    });

    defineDependency('html2pdf', {
        label: 'PDF 匯出引擎',
        localUrls: ['libs/vendor/html2pdf.bundle.min.js'],
        urls: [
            'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
            'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js'
        ],
        check: () => typeof window.html2pdf === 'function'
    });

    defineDependency('mammoth', {
        label: 'DOCX 讀取引擎',
        localUrls: ['libs/vendor/mammoth.browser.min.js'],
        urls: [
            'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
            'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js'
        ],
        check: () => !!window.mammoth
    });

    defineDependency('pdfjs', {
        label: 'PDF.js 讀取引擎',
        localUrls: ['libs/vendor/pdf.min.js'],
        urls: [
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
            'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'
        ],
        check: () => !!(window.pdfjsLib || window['pdfjs-dist/build/pdf']),
        afterLoad: ({ usedLocal }) => {
            const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
            if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
                const localWorker = 'libs/vendor/pdf.worker.min.js';
                const cdnWorker = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                pdfjsLib.GlobalWorkerOptions.workerSrc = window.PDFJS_WORKER_SRC || (usedLocal ? localWorker : cdnWorker);
            }
        }
    });

    defineDependency('xlsx', {
        label: '試算表引擎 SheetJS',
        localUrls: ['libs/vendor/xlsx.full.min.js'],
        urls: [
            'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
            'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
        ],
        check: () => !!window.XLSX
    });

    defineDependency('jszip', {
        label: 'ZIP 壓縮引擎 JSZip',
        localUrls: ['libs/vendor/jszip.min.js', 'libs/jszip.min.js'],
        urls: [
            'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
            'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js'
        ],
        check: () => !!window.JSZip
    });

    defineDependency('jspdf', {
        label: 'jsPDF PDF 引擎',
        localUrls: ['libs/vendor/jspdf.umd.min.js'],
        urls: [
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
            'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
        ],
        check: () => !!(window.jspdf && window.jspdf.jsPDF)
    });

    defineDependency('jspdf-autotable', {
        label: 'jsPDF 表格匯出外掛',
        depends: ['jspdf'],
        localUrls: ['libs/vendor/jspdf.plugin.autotable.min.js'],
        urls: [
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
            'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'
        ],
        check: () => {
            if (!(window.jspdf && window.jspdf.jsPDF)) return false;
            try { return typeof new window.jspdf.jsPDF().autoTable === 'function'; }
            catch (e) { return false; }
        }
    });

    defineDependency('spreadsheet-pdf', {
        label: '試算表 PDF 匯出引擎',
        depends: ['jspdf', 'jspdf-autotable'],
        check: () => {
            if (!(window.jspdf && window.jspdf.jsPDF)) return false;
            try { return typeof new window.jspdf.jsPDF().autoTable === 'function'; }
            catch (e) { return false; }
        }
    });

    defineDependency('beautify-js', {
        label: 'JavaScript 格式化引擎',
        localUrls: ['libs/vendor/beautify.min.js'],
        urls: [
            'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.9/beautify.min.js',
            'https://cdn.jsdelivr.net/npm/js-beautify@1.14.9/js/lib/beautify.min.js'
        ],
        check: () => typeof window.js_beautify === 'function'
    });

    defineDependency('beautify-css', {
        label: 'CSS 格式化引擎',
        localUrls: ['libs/vendor/beautify-css.min.js'],
        urls: [
            'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.9/beautify-css.min.js',
            'https://cdn.jsdelivr.net/npm/js-beautify@1.14.9/js/lib/beautify-css.min.js'
        ],
        check: () => typeof window.css_beautify === 'function'
    });

    defineDependency('beautify-html', {
        label: 'HTML 格式化引擎',
        localUrls: ['libs/vendor/beautify-html.min.js'],
        urls: [
            'https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.9/beautify-html.min.js',
            'https://cdn.jsdelivr.net/npm/js-beautify@1.14.9/js/lib/beautify-html.min.js'
        ],
        check: () => typeof window.html_beautify === 'function'
    });

    defineDependency('beautify', {
        label: '程式碼格式化引擎',
        depends: ['beautify-js', 'beautify-css', 'beautify-html'],
        check: () => typeof window.js_beautify === 'function'
            && typeof window.css_beautify === 'function'
            && typeof window.html_beautify === 'function'
    });

    defineDependency('diff-match-patch', {
        label: '文字比對引擎',
        localUrls: ['libs/vendor/diff_match_patch.js'],
        urls: ['https://cdnjs.cloudflare.com/ajax/libs/diff_match_patch/20121119/diff_match_patch.js'],
        check: () => typeof window.diff_match_patch === 'function'
    });

    defineDependency('codemirror-merge', {
        label: 'CodeMirror Merge View',
        depends: ['diff-match-patch'],
        localStyles: ['libs/addon/merge/merge.min.css', 'libs/vendor/codemirror-merge.min.css'],
        styles: ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/merge/merge.min.css'],
        localUrls: ['libs/addon/merge/merge.min.js', 'libs/vendor/codemirror-merge.min.js'],
        urls: ['https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/addon/merge/merge.min.js'],
        check: () => !!(window.CodeMirror && window.CodeMirror.MergeView)
    });

    defineDependency('compare', {
        label: '檔案比對工具',
        depends: ['diff-match-patch', 'codemirror-merge'],
        check: () => typeof window.diff_match_patch === 'function' && !!(window.CodeMirror && window.CodeMirror.MergeView)
    });

    defineDependency('pyodide', {
        label: 'Python 執行環境 Pyodide',
        localUrls: ['libs/vendor/pyodide/pyodide.js'],
        urls: ['https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js'],
        check: () => typeof window.loadPyodide === 'function'
    });
})();
