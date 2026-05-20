// js/tools/sitemap.js
// Responsibility: SEO modal Sitemap/Robots UI actions.
// External crawling/importing lives in sitemap-crawler.js; shared helpers live in sitemap-utils.js.

(function() {
    'use strict';

    function toast(message, type) {
        if (window.sitemapUtils) sitemapUtils.toast(message, type);
        else if (typeof window.showToast === 'function') window.showToast(message, type || 'info');
    }

    function getBaseUrl() {
        const raw = document.getElementById('sitemap-base-url')?.value.trim() || '';
        if (!raw) return '';
        try {
            const url = sitemapUtils.normalizeInputUrl(raw);
            return url.origin;
        } catch(e) {
            return raw.replace(/\/$/, '');
        }
    }

    function normalizeLocalPath(path) {
        const clean = String(path || '').trim().replace(/^\/+/, '');
        if (!clean || clean.toLowerCase() === 'index.html') return '/';
        return '/' + clean.replace(/index\.html$/i, '').replace(/\/+$/, '/');
    }

    function getSitemapOptions() {
        return {
            changefreq: document.getElementById('sitemap-changefreq')?.value || 'weekly',
            priority: document.getElementById('sitemap-priority')?.value || '0.8',
            includeLastmod: document.getElementById('sitemap-include-lastmod')?.checked !== false,
            includeChangefreq: document.getElementById('sitemap-include-changefreq')?.checked !== false,
            includePriority: document.getElementById('sitemap-include-priority')?.checked !== false
        };
    }

    function renderUrlPreview(urls) {
        const el = document.getElementById('sitemap-url-preview');
        if (!el) return;
        const cleanUrls = sitemapUtils.uniqueUrls(urls);
        if (!cleanUrls.length) {
            el.innerHTML = '<span class="text-gray-400 italic">尚未建立 URL 清單</span>';
            return;
        }
        el.innerHTML = cleanUrls.slice(0, 20).map(url => (
            `<div class="truncate font-mono text-[11px] text-gray-600 dark:text-gray-300">${sitemapUtils.escapeHtml(url)}</div>`
        )).join('') + (cleanUrls.length > 20 ? `<div class="text-xs text-gray-400 mt-1">…另有 ${cleanUrls.length - 20} 個 URL</div>` : '');
    }

    function collectLocalUrls(baseUrl) {
        if (!baseUrl) throw new Error('請先輸入網站基本路徑，例如 https://example.com');
        const checkboxes = document.querySelectorAll('.sitemap-file-cb:checked');
        if (checkboxes.length === 0) throw new Error('請先掃描並勾選工作區 HTML 檔案');
        return Array.from(checkboxes).map(cb => {
            const path = normalizeLocalPath(cb.value);
            return baseUrl.replace(/\/$/, '') + path;
        });
    }

    function collectExternalUrls(baseUrl) {
        const raw = document.getElementById('sitemap-external-urls')?.value || '';
        const stripQuery = Boolean(document.getElementById('sitemap-strip-query')?.checked);
        const fallbackBase = baseUrl || document.getElementById('sitemap-external-url')?.value || 'https://example.com';
        const urls = raw.split(/\r?\n/)
            .map(line => sitemapUtils.cleanupUrl(line, fallbackBase, { stripQuery }))
            .filter(Boolean);
        if (!urls.length) throw new Error('請先匯入、爬取或手動貼上 URL 列表');
        return urls;
    }

    function updateRobotsSitemapUrl(baseUrl) {
        const robotsInput = document.getElementById('robots-sitemap-url');
        if (robotsInput && baseUrl && !robotsInput.value.trim()) robotsInput.value = `${baseUrl.replace(/\/$/, '')}/sitemap.xml`;
    }

    window.switchSitemapMode = function(mode) {
        const localPanel = document.getElementById('sitemap-local-panel');
        const externalPanel = document.getElementById('sitemap-external-panel');
        const localButton = document.getElementById('sitemap-mode-local');
        const externalButton = document.getElementById('sitemap-mode-external');
        const isLocal = mode !== 'external';

        if (localPanel) localPanel.classList.toggle('hidden', !isLocal);
        if (externalPanel) externalPanel.classList.toggle('hidden', isLocal);

        [[localButton, isLocal], [externalButton, !isLocal]].forEach(([button, active]) => {
            if (!button) return;
            button.classList.toggle('bg-blue-600', active);
            button.classList.toggle('text-white', active);
            button.classList.toggle('shadow', active);
            button.classList.toggle('text-gray-600', !active);
            button.classList.toggle('dark:text-gray-400', !active);
        });

        renderUrlPreview([]);
    };

    window.scanLocalWorkspace = function() {
        const htmlFiles = [];
        const scanNode = (nodes, path) => {
            nodes.forEach(node => {
                if (node.type === 'file' && node.name.toLowerCase().endsWith('.html')) {
                    htmlFiles.push(path + node.name);
                    return;
                }
                if (node.type === 'folder') {
                    const children = window.fileSystem && Array.isArray(window.fileSystem.nodes)
                        ? window.fileSystem.nodes.filter(n => n.parentId === node.id)
                        : [];
                    scanNode(children, path + node.name + '/');
                }
            });
        };

        if (window.fileSystem && Array.isArray(window.fileSystem.nodes)) {
            scanNode(window.fileSystem.nodes.filter(n => n.parentId === 'root'), '/');
        }

        const listEl = document.getElementById('sitemap-local-files');
        const countEl = document.getElementById('sitemap-local-count');
        if (!listEl) return;

        if (!htmlFiles.length) {
            listEl.innerHTML = '<p class="text-xs text-gray-400 italic py-2">工作區內沒有找到 .html 檔案</p>';
            if (countEl) countEl.textContent = '0 個檔案';
            toast('工作區內沒有找到 .html 檔案', 'info');
            return;
        }

        listEl.innerHTML = htmlFiles.sort().map(file => `
            <label class="flex items-center gap-2 text-xs py-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <input type="checkbox" class="sitemap-file-cb accent-blue-600" value="${sitemapUtils.escapeHtml(file)}" checked>
                <span class="font-mono text-gray-700 dark:text-gray-300">${sitemapUtils.escapeHtml(file)}</span>
            </label>`).join('');
        if (countEl) countEl.textContent = `找到 ${htmlFiles.length} 個檔案`;
        toast(`掃描完成：找到 ${htmlFiles.length} 個 HTML 檔案`, 'success');
    };

    window.generateSitemap = function() {
        try {
            const externalPanel = document.getElementById('sitemap-external-panel');
            const isExternal = externalPanel && !externalPanel.classList.contains('hidden');
            const baseUrl = getBaseUrl();
            const urls = isExternal ? collectExternalUrls(baseUrl) : collectLocalUrls(baseUrl);
            const cleanUrls = sitemapUtils.uniqueUrls(urls);
            const xml = sitemapUtils.buildSitemapXml(cleanUrls, getSitemapOptions());

            sitemapUtils.openGeneratedFile('sitemap.xml', xml);
            sitemapUtils.downloadText('sitemap.xml', xml, 'application/xml;charset=utf-8');
            renderUrlPreview(cleanUrls);
            updateRobotsSitemapUrl(baseUrl || (cleanUrls[0] ? new URL(cleanUrls[0]).origin : ''));
            toast(`sitemap.xml 已產生並下載（${cleanUrls.length} 個 URL）`, 'success');
        } catch(error) {
            toast(error.message || '產生 sitemap.xml 失敗', 'error');
        }
    };

    window.generateRobotsTxt = function() {
        const isAllowAll = document.getElementById('robots-allow-all')?.checked !== false;
        const paths = (document.getElementById('robots-disallow')?.value || '')
            .split(/\r?\n/)
            .map(path => path.trim())
            .filter(Boolean);
        const baseUrl = getBaseUrl();
        const sitemapUrl = (document.getElementById('robots-sitemap-url')?.value || '').trim() || (baseUrl ? `${baseUrl}/sitemap.xml` : '');
        const extraRules = (document.getElementById('robots-extra')?.value || '').trim();

        let txt = `# robots.txt — generated by WebPad++ SEO Expert\n# ${new Date().toISOString()}\n\nUser-agent: *\n`;
        if (!isAllowAll) {
            txt += 'Disallow: /\n';
        } else if (paths.length) {
            txt += paths.map(path => `Disallow: ${path.startsWith('/') ? path : '/' + path}`).join('\n') + '\n';
        } else {
            txt += 'Allow: /\n';
        }
        if (sitemapUrl) txt += `\nSitemap: ${sitemapUrl}\n`;
        if (extraRules) txt += `\n${extraRules}\n`;

        sitemapUtils.openGeneratedFile('robots.txt', txt);
        sitemapUtils.downloadText('robots.txt', txt, 'text/plain;charset=utf-8');
        toast('robots.txt 已產生並下載', 'success');
    };

    document.addEventListener('input', event => {
        if (!event.target) return;
        if (event.target.id === 'sitemap-base-url') updateRobotsSitemapUrl(getBaseUrl());
        if (event.target.classList && event.target.classList.contains('sitemap-file-cb')) renderUrlPreview([]);
    });
})();
