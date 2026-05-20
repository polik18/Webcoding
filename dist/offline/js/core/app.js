// js/core/app.js — Application namespace + legacy compatibility layer
// Step 3 refactor: new code should call WebcodingApp.* instead of adding more globals.
// Legacy window.* names are kept as non-enumerable aliases so existing modules keep working.

(function (global) {
    'use strict';

    const ROOT_NAME = 'WebcodingApp';
    const app = global[ROOT_NAME] || {};
    const legacyToPath = new Map();
    const pathToLegacy = new Map();

    function normalizePath(path) {
        return String(path || '')
            .replace(/^window\./, '')
            .replace(/^WebcodingApp\./, '')
            .replace(/^app\./, '')
            .split('.')
            .filter(Boolean)
            .join('.');
    }

    function ensureContainer(path) {
        const parts = normalizePath(path).split('.').filter(Boolean);
        let cursor = app;
        for (const part of parts) {
            if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
            cursor = cursor[part];
        }
        return cursor;
    }

    function setPath(path, value) {
        const parts = normalizePath(path).split('.').filter(Boolean);
        if (!parts.length) return value;
        const prop = parts.pop();
        let cursor = app;
        for (const part of parts) {
            if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
            cursor = cursor[part];
        }
        cursor[prop] = value;
        return value;
    }

    function getPath(path) {
        const parts = normalizePath(path).split('.').filter(Boolean);
        let cursor = app;
        for (const part of parts) {
            if (cursor == null) return undefined;
            cursor = cursor[part];
        }
        return cursor;
    }

    function getGlobalPath(path) {
        const parts = String(path || '').replace(/^window\./, '').split('.').filter(Boolean);
        let cursor = global;
        for (const part of parts) {
            if (cursor == null) return undefined;
            cursor = cursor[part];
        }
        return cursor;
    }

    function registerLegacy(globalName, appPath, options = {}) {
        const legacyName = String(globalName || '').replace(/^window\./, '');
        const normalized = normalizePath(appPath);
        if (!legacyName || !normalized) return;

        legacyToPath.set(legacyName, normalized);
        pathToLegacy.set(normalized, legacyName);

        if (options.accessor === false) return;

        const descriptor = Object.getOwnPropertyDescriptor(global, legacyName);
        if (descriptor && descriptor.configurable === false) return;

        // Keep old code working, but make the actual source of truth the namespace.
        Object.defineProperty(global, legacyName, {
            configurable: true,
            enumerable: false,
            get() {
                return getPath(normalized);
            },
            set(value) {
                setPath(normalized, value);
            }
        });
    }

    function expose(path, value, options = {}) {
        const normalized = normalizePath(path);
        setPath(normalized, value);
        const aliases = [];
        if (options.legacyName) aliases.push(options.legacyName);
        if (options.alias) aliases.push(options.alias);
        if (Array.isArray(options.aliases)) aliases.push(...options.aliases);
        aliases.forEach(alias => registerLegacy(alias, normalized, { accessor: options.accessor !== false }));
        return value;
    }

    function hydratePathFromLegacy(path) {
        const normalized = normalizePath(path);
        let value = getPath(normalized);
        if (value !== undefined) return value;
        const legacyName = pathToLegacy.get(normalized);
        if (!legacyName) return undefined;
        value = getGlobalPath(legacyName);
        if (value !== undefined) setPath(normalized, value);
        return value;
    }

    function resolve(path) {
        const raw = String(path || '');
        const normalized = normalizePath(raw);
        if (!normalized) return undefined;

        // Legacy action names like "generateQrCode" are mapped to namespaced paths.
        const mappedPath = legacyToPath.get(normalized);
        if (mappedPath) return hydratePathFromLegacy(mappedPath);

        // Namespaced action names like "tools.qr.generate" resolve here.
        const namespaced = hydratePathFromLegacy(normalized);
        if (namespaced !== undefined) return namespaced;

        // Final fallback for third-party globals or not-yet-migrated code.
        return getGlobalPath(raw);
    }

    function resolveCallable(path) {
        const raw = String(path || '');
        const normalized = normalizePath(raw);
        const parts = normalized.split('.').filter(Boolean);
        const fnName = parts.pop();
        const ownerPath = parts.join('.');
        let owner = ownerPath ? hydratePathFromLegacy(ownerPath) : app;
        let fn;

        if (owner && fnName) fn = owner[fnName];
        if (typeof fn !== 'function') {
            const value = resolve(raw);
            if (typeof value === 'function') {
                fn = value;
                owner = ownerPath ? (hydratePathFromLegacy(ownerPath) || app) : global;
            }
        }
        if (typeof fn !== 'function') return null;
        return { fn, context: owner || global };
    }

    function hydrateAll() {
        pathToLegacy.forEach((legacyName, path) => hydratePathFromLegacy(path));
        return status();
    }

    function status() {
        const rows = [];
        legacyToPath.forEach((path, legacy) => {
            rows.push({ legacy, path, namespaced: getPath(path) !== undefined, legacyAvailable: getGlobalPath(legacy) !== undefined });
        });
        return rows;
    }

    Object.assign(app, {
        name: 'WebcodingApp',
        version: 'step3-namespace',
        core: app.core || {},
        features: app.features || {},
        tools: app.tools || {},
        recent: app.recent || {},
        state: app.state || {},
        compat: app.compat || {},
        namespace: {
            normalizePath,
            ensureContainer,
            set: setPath,
            get: getPath,
            expose,
            registerLegacy,
            resolve,
            resolveCallable,
            hydrateAll,
            status
        }
    });

    Object.defineProperty(global, ROOT_NAME, {
        configurable: true,
        enumerable: false,
        writable: false,
        value: app
    });

    const accessorAliases = [
        // Core state / instances
        ['editor', 'state.editor'],
        ['mergeView', 'state.mergeView'],
        ['isProgrammaticChange', 'state.isProgrammaticChange'],
        ['defaultCSS', 'state.defaultCSS'],
        ['fileSystemReady', 'state.fileSystemReady'],
        ['isResetting', 'state.isResetting'],
        ['pyodideInstance', 'state.pyodideInstance'],
        ['recentHistory', 'recent.history'],
        ['fileSystem', 'core.fileSystem'],
        ['tabManager', 'core.tabManager'],

        // Dependency loader
        ['loadScript', 'core.loader.loadScript'],
        ['loadScripts', 'core.loader.loadScripts'],
        ['loadCSS', 'core.loader.loadCSS'],
        ['dependencyManager', 'core.dependencies'],
        ['defineDependency', 'core.loader.defineDependency'],
        ['loadDependency', 'core.loader.loadDependency'],
        ['ensureDependency', 'core.loader.ensureDependency'],

        // File / save functions assigned by modules
        ['openFileOrFolder', 'core.fileio.openFileOrFolder'],
        ['openFile', 'core.fileio.openFile'],
        ['openFolder', 'core.fileio.openFolder'],
        ['loadFileContent', 'core.fileio.loadFileContent'],
        ['newFileFromTemplate', 'core.fileio.newFileFromTemplate'],
        ['toggleNewFileMenu', 'core.fileio.toggleNewFileMenu'],
        ['openCameraToText', 'core.fileio.openCameraToText'],
        ['exportCurrentAsPdf', 'core.fileio.exportCurrentAsPdf'],
        ['showSaveDialog', 'core.save.showSaveDialog'],
        ['downloadFileAs', 'core.save.downloadFileAs'],
        ['toggleSaveMenu', 'core.save.toggleSaveMenu'],
        ['resetAll', 'core.ui.resetAll'],

        // Feature functions assigned by modules
        ['formatCode', 'features.format.formatCode'],
        ['openQrModal', 'features.format.openQrModal'],
        ['closeQrModal', 'tools.qr.closeModal'],
        ['switchQrTab', 'features.format.switchQrTab'],
        ['openOcrModal', 'tools.ocr.openModal'],
        ['closeOcrModal', 'tools.ocr.closeModal'],
        ['qrImportContent', 'features.format.qrImportContent'],
        ['toggleSidebar', 'features.sidebar.toggle'],
        ['changeLanguage', 'core.i18n.changeLanguage'],

        // QR
        ['ensureQrLibraries', 'tools.qr.ensureLibraries'],
        ['decodeQrFromImage', 'tools.qr.decodeFromImage'],
        ['generateQrCode', 'tools.qr.generate'],
        ['downloadQrCode', 'tools.qr.download'],
        ['triggerQrFileUpload', 'tools.qr.triggerFileUpload'],
        ['handleQrFileUpload', 'tools.qr.handleFileUpload'],
        ['triggerQrPaste', 'tools.qr.triggerPaste'],
        ['copyQrResult', 'tools.qr.copyResult'],
        ['openQrResultAsTab', 'tools.qr.openResultAsTab'],
        ['startQrCamera', 'tools.qr.startCamera'],
        ['stopQrCamera', 'tools.qr.stopCamera'],
        ['captureQrFrame', 'tools.qr.captureFrame'],

        // OCR
        ['cleanOcrText', 'tools.ocrEngine.cleanText'],
        ['recognizeImageWithOcr', 'tools.ocrEngine.recognizeImage'],
        ['releaseOcrWorker', 'tools.ocrEngine.releaseWorker'],
        ['preloadOcrAssets', 'tools.ocrEngine.preloadAssets'],
        ['scheduleOcrPreload', 'tools.ocrEngine.schedulePreload'],
        ['resetOcr', 'tools.ocr.reset'],
        ['showOcrPreview', 'tools.ocr.showPreview'],
        ['startOcrCamera', 'tools.ocr.startCamera'],
        ['stopOcrCamera', 'tools.ocr.stopCamera'],
        ['takeOcrPhoto', 'tools.ocr.takePhoto'],
        ['toggleOcrTorch', 'tools.ocr.toggleTorch'],
        ['triggerOcrFileUpload', 'tools.ocr.triggerFileUpload'],
        ['handleOcrFileUpload', 'tools.ocr.handleFileUpload'],
        ['handleOcrDrop', 'tools.ocr.handleDrop'],
        ['triggerOcrPaste', 'tools.ocr.triggerPaste'],
        ['startPerformingOcr', 'tools.ocr.startRecognition'],
        ['openOcrDialog', 'tools.ocr.openDialog'],
        ['copyOcrResult', 'tools.ocr.copyResult'],
        ['saveOcrResult', 'tools.ocr.saveResult'],

        // Document / PDF / image tools
        ['exportDocx', 'tools.docx.exportDocx'],
        ['exportDocxToPdf', 'tools.docx.exportToPdf'],
        ['loadDocx', 'tools.docx.loadDocx'],
        ['loadOdt', 'tools.docx.loadOdt'],
        ['pdfExportText', 'tools.pdf.exportText'],
        ['pdfExportOCRText', 'tools.pdf.exportOcrText'],
        ['loadPdf', 'tools.pdf.loadPdf'],
        ['handleImageFile', 'tools.image.handleFile'],

        // SEO / sitemap
        ['openSeoModal', 'tools.seo.openModal'],
        ['closeSeoModal', 'tools.seo.closeModal'],
        ['switchSeoTab', 'tools.seo.switchTab'],
        ['_updateSeoScore', 'tools.seo.updateScore'],
        ['_updateSerpPreview', 'tools.seo.updateSerpPreview'],
        ['runSeoAudit', 'tools.seo.runAudit'],
        ['exportSeoReport', 'tools.seo.exportReport'],
        ['sitemapUtils', 'tools.sitemap.utils'],
        ['switchSitemapMode', 'tools.sitemap.switchMode'],
        ['scanLocalWorkspace', 'tools.sitemap.scanLocalWorkspace'],
        ['generateSitemap', 'tools.sitemap.generateSitemap'],
        ['generateRobotsTxt', 'tools.sitemap.generateRobotsTxt'],
        ['fetchExternalSitemap', 'tools.sitemap.fetchExternalSitemap'],
        ['crawlExternalWebsite', 'tools.sitemap.crawlExternalWebsite'],
        ['updateExternalUrlCount', 'tools.sitemap.updateExternalUrlCount'],

        // Spreadsheet
        ['_saveSheetToTab', 'tools.spreadsheet.saveSheetToTab'],
        ['_syncAndSaveSheetToTab', 'tools.spreadsheet.syncAndSaveSheetToTab'],
        ['restoreSpreadsheetTab', 'tools.spreadsheet.restoreTab'],
        ['newSpreadsheet', 'tools.spreadsheet.newSpreadsheet'],
        ['ssAddRow', 'tools.spreadsheet.addRow'],
        ['ssDeleteRow', 'tools.spreadsheet.deleteRow'],
        ['ssAddCol', 'tools.spreadsheet.addCol'],
        ['ssDeleteCol', 'tools.spreadsheet.deleteCol'],
        ['ssSort', 'tools.spreadsheet.sort'],
        ['ssMath', 'tools.spreadsheet.math'],
        ['ssExport', 'tools.spreadsheet.export'],
        ['ssExportAs', 'tools.spreadsheet.exportAs'],
        ['loadSpreadsheet', 'tools.spreadsheet.loadSpreadsheet'],
        ['loadCsv', 'tools.spreadsheet.loadCsv'],

        // Recent files
        ['clearRecentHistory', 'recent.clear'],
        ['openRecentModal', 'recent.openModal'],
        ['closeRecentModal', 'recent.closeModal'],
        ['loadRecentItem', 'recent.loadItem'],

        // Event binder
        ['uiEventBinder', 'core.events'],
        ['onI18nReady', 'core.i18n.onReady'],
        ['onLanguageChanged', 'core.i18n.onLanguageChanged']
    ];

    // Function declarations from classic scripts are safer to hydrate lazily after load.
    const lazyAliases = [
        // UI / editor functions declared with function syntax
        ['showToast', 'core.ui.showToast'],
        ['toggleTheme', 'core.ui.toggleTheme'],
        ['saveFile', 'core.save.saveFile'],
        ['renameFile', 'features.format.renameFile'],
        ['toggleEOL', 'features.format.toggleEOL'],
        ['changeEncoding', 'features.format.changeEncoding'],
        ['openCompareModal', 'features.compare.openModal'],
        ['closeCompareModal', 'features.compare.closeModal'],
        ['executeCompare', 'features.compare.execute'],
        ['exitCompareMode', 'features.compare.exit'],
        ['switchToCode', 'features.visual.switchToCode'],
        ['switchToVisual', 'features.visual.switchToVisual'],
        ['switchToSplit', 'features.visual.switchToSplit'],
        ['execCmd', 'features.visual.execCmd'],
        ['insertImagePrompt', 'features.visual.insertImagePrompt'],
        ['insertLinkPrompt', 'features.visual.insertLinkPrompt'],
        ['insertTablePrompt', 'features.visual.insertTablePrompt'],
        ['addTableRow', 'features.visual.addTableRow'],
        ['addTableColumn', 'features.visual.addTableColumn'],
        ['removeTableRow', 'features.visual.removeTableRow'],
        ['removeTableColumn', 'features.visual.removeTableColumn'],
        ['openPanel', 'features.panel.openPanel'],
        ['closePanel', 'features.panel.closePanel'],
        ['switchPanelTab', 'features.panel.switchTab'],
        ['updateProblemsPanel', 'features.panel.updateProblems'],
        ['printConsole', 'features.panel.printConsole'],
        ['clearConsole', 'features.panel.clearConsole'],
        ['runCode', 'features.panel.runCode'],
        ['t', 'core.i18n.t']
    ];

    accessorAliases.forEach(([legacy, path]) => registerLegacy(legacy, path, { accessor: true }));
    lazyAliases.forEach(([legacy, path]) => registerLegacy(legacy, path, { accessor: false }));

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hydrateAll, { once: true });
    } else {
        hydrateAll();
    }
})(window);
