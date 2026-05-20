// js/tools/sitemap-crawler.js
// Responsibility: external website URL discovery for Sitemap generation.
// Uses sitemapUtils for fetching/parsing so this file stays focused on crawl flow.

(function() {
    'use strict';

    const MAX_SITEMAP_FILES = 30;

    function readCrawlerOptions() {
        return {
            maxPages: Math.max(1, Math.min(500, Number(document.getElementById('sitemap-max-pages')?.value || 50))),
            maxDepth: Math.max(0, Math.min(8, Number(document.getElementById('sitemap-max-depth')?.value || 2))),
            stripQuery: Boolean(document.getElementById('sitemap-strip-query')?.checked),
            includeSubdomains: Boolean(document.getElementById('sitemap-include-subdomains')?.checked),
            useCanonical: Boolean(document.getElementById('sitemap-use-canonical')?.checked)
        };
    }

    function setExternalBusy(isBusy, label) {
        const buttons = [
            document.getElementById('btn-fetch-external'),
            document.getElementById('btn-crawl-external')
        ];
        buttons.forEach(btn => { if (btn) btn.disabled = isBusy; });
        const active = label ? document.getElementById(label) : null;
        if (active && isBusy) active.dataset.originalHtml = active.innerHTML;
        if (active && isBusy) active.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>處理中…';
        if (active && !isBusy && active.dataset.originalHtml) active.innerHTML = active.dataset.originalHtml;
    }

    function updateTextareaUrls(urls) {
        const textarea = document.getElementById('sitemap-external-urls');
        if (textarea) textarea.value = sitemapUtils.uniqueUrls(urls).join('\n');
        updateExternalUrlCount();
    }

    function updateExternalUrlCount() {
        const textarea = document.getElementById('sitemap-external-urls');
        const countEl = document.getElementById('sitemap-external-count');
        if (!textarea || !countEl) return;
        const count = sitemapUtils.uniqueUrls(textarea.value.split(/\r?\n/)).length;
        countEl.textContent = count ? `${count} 個 URL` : '';
    }

    function showStatus(message, type) {
        const classes = {
            info: 'text-blue-600 dark:text-blue-400',
            success: 'text-emerald-600 dark:text-emerald-400',
            warning: 'text-orange-500 dark:text-orange-400',
            error: 'text-red-600 dark:text-red-400'
        };
        sitemapUtils.setStatus('external-fetch-status', `<span class="${classes[type] || classes.info}">${message}</span>`);
    }

    function syncBaseUrl(seedUrl) {
        const base = document.getElementById('sitemap-base-url');
        const robot = document.getElementById('robots-sitemap-url');
        if (base && !base.value.trim()) base.value = seedUrl.origin;
        if (robot && !robot.value.trim()) robot.value = `${seedUrl.origin}/sitemap.xml`;
    }

    async function discoverSitemapLocations(seedUrl) {
        const candidates = [
            `${seedUrl.origin}/sitemap.xml`,
            `${seedUrl.origin}/sitemap_index.xml`,
            `${seedUrl.origin}/wp-sitemap.xml`
        ];
        try {
            const robots = await sitemapUtils.fetchText(`${seedUrl.origin}/robots.txt`, { timeoutMs: 7000 });
            candidates.push(...sitemapUtils.extractSitemapUrlsFromRobots(robots.text));
        } catch(e) {
            // robots.txt is optional. Continue with default guesses.
        }
        return sitemapUtils.uniqueUrls(candidates);
    }

    async function collectUrlsFromSitemaps(sitemapUrls, seedUrl, options, statusCallback) {
        const queue = sitemapUtils.uniqueUrls(sitemapUrls);
        const visitedSitemaps = new Set();
        const discoveredUrls = new Set();

        while (queue.length && visitedSitemaps.size < MAX_SITEMAP_FILES && discoveredUrls.size < options.maxPages) {
            const sitemapUrl = queue.shift();
            if (!sitemapUrl || visitedSitemaps.has(sitemapUrl)) continue;
            visitedSitemaps.add(sitemapUrl);
            if (statusCallback) statusCallback(`讀取 Sitemap ${visitedSitemaps.size}/${Math.min(queue.length + visitedSitemaps.size, MAX_SITEMAP_FILES)}：${sitemapUrl}`);

            try {
                const result = await sitemapUtils.fetchText(sitemapUrl, { timeoutMs: 12000 });
                const parsed = sitemapUtils.extractUrlsFromSitemapXml(result.text);
                parsed.sitemapUrls.forEach(url => {
                    try {
                        const clean = new URL(url, seedUrl.href).href;
                        if (/^https?:\/\//i.test(clean) && !visitedSitemaps.has(clean)) queue.push(clean);
                    } catch(e) {}
                });
                parsed.urls.forEach(url => {
                    const clean = sitemapUtils.cleanupUrl(url, seedUrl.href, options);
                    if (!clean) return;
                    const parsedUrl = new URL(clean);
                    if (sitemapUtils.isSameHost(parsedUrl, seedUrl, options.includeSubdomains)) discoveredUrls.add(clean);
                });
            } catch(error) {
                // Try next sitemap candidate. Status is kept positive unless everything fails.
            }
        }
        return Array.from(discoveredUrls).slice(0, options.maxPages);
    }

    window.fetchExternalSitemap = async function() {
        const rawUrl = document.getElementById('sitemap-external-url')?.value || '';
        let seedUrl;
        try {
            seedUrl = sitemapUtils.normalizeInputUrl(rawUrl);
        } catch(error) {
            sitemapUtils.toast(error.message, 'error');
            return;
        }

        const options = readCrawlerOptions();
        syncBaseUrl(seedUrl);
        setExternalBusy(true, 'btn-fetch-external');
        showStatus('正在尋找 robots.txt / sitemap.xml…', 'info');

        try {
            const sitemapLocations = await discoverSitemapLocations(seedUrl);
            const urls = await collectUrlsFromSitemaps(sitemapLocations, seedUrl, options, msg => showStatus(msg, 'info'));
            if (urls.length) {
                updateTextareaUrls(urls);
                showStatus(`✅ 已從既有 Sitemap 匯入 ${urls.length} 個 URL`, 'success');
                sitemapUtils.toast(`已匯入 ${urls.length} 個 URL`, 'success');
            } else {
                showStatus('沒有找到可用 Sitemap。可改用「爬取網站」建立清單。', 'warning');
                sitemapUtils.toast('沒有找到可用 Sitemap，請改用爬取網站', 'warning');
            }
        } catch(error) {
            showStatus(`讀取失敗：${sitemapUtils.escapeHtml(error.message)}。可改用「爬取網站」或手動貼 URL。`, 'error');
            sitemapUtils.toast('讀取外部 Sitemap 失敗', 'error');
        } finally {
            setExternalBusy(false, 'btn-fetch-external');
        }
    };

    window.crawlExternalWebsite = async function() {
        const rawUrl = document.getElementById('sitemap-external-url')?.value || '';
        let seedUrl;
        try {
            seedUrl = sitemapUtils.normalizeInputUrl(rawUrl);
        } catch(error) {
            sitemapUtils.toast(error.message, 'error');
            return;
        }

        const options = readCrawlerOptions();
        syncBaseUrl(seedUrl);
        setExternalBusy(true, 'btn-crawl-external');
        showStatus('開始爬取網站頁面…', 'info');

        const queue = [{ url: sitemapUtils.cleanupUrl(seedUrl.href, seedUrl.href, options), depth: 0 }];
        const queued = new Set(queue.map(item => item.url));
        const visited = new Set();
        const output = new Set();
        const failures = [];

        try {
            while (queue.length && visited.size < options.maxPages) {
                const current = queue.shift();
                if (!current || visited.has(current.url)) continue;
                visited.add(current.url);
                output.add(current.url);
                showStatus(`爬取中：${visited.size}/${options.maxPages}，深度 ${current.depth} — ${sitemapUtils.escapeHtml(current.url)}`, 'info');

                if (current.depth >= options.maxDepth) continue;

                try {
                    const result = await sitemapUtils.fetchText(current.url, { timeoutMs: 12000 });
                    const links = sitemapUtils.extractPageLinks(result.text, current.url, options);
                    if (options.useCanonical && links.canonicalUrl) {
                        const canonical = new URL(links.canonicalUrl);
                        if (sitemapUtils.isSameHost(canonical, seedUrl, options.includeSubdomains)) output.add(links.canonicalUrl);
                    }
                    links.urls.forEach(url => {
                        if (!url || queued.has(url) || visited.has(url)) return;
                        const parsed = new URL(url);
                        if (!sitemapUtils.isSameHost(parsed, seedUrl, options.includeSubdomains)) return;
                        queued.add(url);
                        if (queue.length + visited.size < options.maxPages * 3) queue.push({ url, depth: current.depth + 1 });
                    });
                } catch(error) {
                    failures.push(current.url);
                }
            }

            const urls = Array.from(output).slice(0, options.maxPages);
            if (urls.length) {
                updateTextareaUrls(urls);
                const failNote = failures.length ? `；${failures.length} 頁因 CORS/逾時未讀取` : '';
                showStatus(`✅ 爬取完成：建立 ${urls.length} 個 URL${failNote}`, failures.length ? 'warning' : 'success');
                sitemapUtils.toast(`爬取完成：${urls.length} 個 URL`, 'success');
            } else {
                updateTextareaUrls([seedUrl.origin + '/']);
                showStatus('沒有成功讀到頁面。已放入首頁，請手動補上其他 URL。', 'warning');
                sitemapUtils.toast('無法自動爬取，已放入首頁', 'warning');
            }
        } finally {
            setExternalBusy(false, 'btn-crawl-external');
        }
    };

    window.updateExternalUrlCount = updateExternalUrlCount;

    document.addEventListener('input', event => {
        if (event.target && event.target.id === 'sitemap-external-urls') updateExternalUrlCount();
    });
})();
