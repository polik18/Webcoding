// js/tools/sitemap-utils.js
// Responsibility: URL cleanup, CORS-aware text fetching, sitemap XML creation/export.
// Keep this file framework-free so crawler/UI modules can reuse it safely.

(function() {
    'use strict';

    const BLOCKED_EXTENSIONS = new Set([
        '7z','aac','avi','avif','bmp','css','csv','doc','docx','eot','exe','gif','gz','ico','jpeg','jpg','js',
        'json','map','m4a','mov','mp3','mp4','mpeg','ogg','otf','pdf','png','ppt','pptx','rar','rss','svg',
        'tar','tif','tiff','ttf','txt','wav','webm','webp','woff','woff2','xls','xlsx','xml','zip'
    ]);

    const DEFAULT_FETCH_TIMEOUT_MS = 10000;

    function toast(message, type) {
        if (typeof window.showToast === 'function') window.showToast(message, type || 'info');
    }

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>'"]/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[ch]));
    }

    function escapeXml(value) {
        return String(value || '').replace(/[&<>'"]/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;'
        }[ch]));
    }

    function normalizeInputUrl(rawUrl) {
        const raw = String(rawUrl || '').trim();
        if (!raw) throw new Error('請輸入網站 URL');
        const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
        const url = new URL(withProtocol);
        if (!/^https?:$/.test(url.protocol)) throw new Error('只支援 http / https 網址');
        url.hash = '';
        return url;
    }

    function shouldDropUrl(url) {
        const path = url.pathname.toLowerCase();
        const match = path.match(/\.([a-z0-9]{1,8})$/i);
        return Boolean(match && BLOCKED_EXTENSIONS.has(match[1]));
    }

    function cleanupUrl(rawUrl, baseUrl, options) {
        try {
            const url = new URL(String(rawUrl || '').trim(), baseUrl || undefined);
            if (!/^https?:$/.test(url.protocol)) return '';
            if (shouldDropUrl(url)) return '';
            url.hash = '';
            if (options && options.stripQuery) url.search = '';
            return url.href;
        } catch(e) {
            return '';
        }
    }

    function isSameHost(url, seedUrl, includeSubdomains) {
        const host = url.hostname.toLowerCase();
        const seedHost = seedUrl.hostname.toLowerCase();
        return includeSubdomains ? (host === seedHost || host.endsWith(`.${seedHost}`)) : host === seedHost;
    }

    function uniqueUrls(urls) {
        return Array.from(new Set((urls || []).map(u => String(u || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    }

    function validatePriority(rawPriority) {
        const n = Number(rawPriority);
        if (!Number.isFinite(n)) return '0.8';
        return Math.min(1, Math.max(0, n)).toFixed(1);
    }

    function buildSitemapXml(urls, options) {
        const safeUrls = uniqueUrls(urls);
        const today = new Date().toISOString().slice(0, 10);
        const freq = options && options.changefreq ? options.changefreq : 'weekly';
        const priority = validatePriority(options && options.priority);
        const includeLastmod = !options || options.includeLastmod !== false;
        const includeChangefreq = !options || options.includeChangefreq !== false;
        const includePriority = !options || options.includePriority !== false;

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        safeUrls.forEach(url => {
            xml += '  <url>\n';
            xml += `    <loc>${escapeXml(url)}</loc>\n`;
            if (includeLastmod) xml += `    <lastmod>${today}</lastmod>\n`;
            if (includeChangefreq) xml += `    <changefreq>${escapeXml(freq)}</changefreq>\n`;
            if (includePriority) xml += `    <priority>${escapeXml(priority)}</priority>\n`;
            xml += '  </url>\n';
        });
        xml += '</urlset>\n';
        return xml;
    }

    function downloadText(filename, text, mimeType) {
        const blob = new Blob([text], { type: mimeType || 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    function openGeneratedFile(filename, content) {
        if (window.tabManager && typeof window.tabManager.createNewTab === 'function') {
            window.tabManager.createNewTab(filename, content, false);
            return true;
        }
        return false;
    }

    function getFetchUrls(targetUrl) {
        const encoded = encodeURIComponent(targetUrl);
        return [
            { label: 'direct', url: targetUrl, type: 'text' },
            { label: 'allorigins-raw', url: `https://api.allorigins.win/raw?url=${encoded}`, type: 'text' },
            { label: 'allorigins-get', url: `https://api.allorigins.win/get?url=${encoded}`, type: 'json-contents' },
            { label: 'corsproxy', url: `https://corsproxy.io/?${encoded}`, type: 'text' }
        ];
    }

    async function fetchWithTimeout(url, timeoutMs) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs || DEFAULT_FETCH_TIMEOUT_MS);
        try {
            return await fetch(url, {
                signal: controller.signal,
                headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml,text/xml,text/plain,*/*' }
            });
        } finally {
            clearTimeout(timer);
        }
    }

    async function fetchText(targetUrl, options) {
        const timeoutMs = (options && options.timeoutMs) || DEFAULT_FETCH_TIMEOUT_MS;
        const errors = [];
        for (const candidate of getFetchUrls(targetUrl)) {
            try {
                const response = await fetchWithTimeout(candidate.url, timeoutMs);
                if (!response.ok) {
                    errors.push(`${candidate.label}: HTTP ${response.status}`);
                    continue;
                }
                if (candidate.type === 'json-contents') {
                    const data = await response.json();
                    if (typeof data.contents === 'string') return { text: data.contents, via: candidate.label };
                    errors.push(`${candidate.label}: 無 contents`);
                    continue;
                }
                const text = await response.text();
                if (text) return { text, via: candidate.label };
                errors.push(`${candidate.label}: 空白回應`);
            } catch(error) {
                errors.push(`${candidate.label}: ${error && error.name === 'AbortError' ? '逾時' : '失敗'}`);
            }
        }
        throw new Error(`無法讀取 ${targetUrl}。${errors.slice(0, 3).join('；')}`);
    }

    function parseXmlDocument(text) {
        const doc = new DOMParser().parseFromString(text, 'application/xml');
        const parserError = doc.querySelector('parsererror');
        if (parserError) return null;
        return doc;
    }

    function extractUrlsFromSitemapXml(text) {
        const doc = parseXmlDocument(text);
        if (!doc) return { urls: [], sitemapUrls: [] };
        const root = doc.documentElement ? doc.documentElement.localName.toLowerCase() : '';
        const locs = Array.from(doc.getElementsByTagName('*'))
            .filter(node => node.localName && node.localName.toLowerCase() === 'loc')
            .map(node => node.textContent.trim())
            .filter(Boolean);
        if (root === 'sitemapindex') return { urls: [], sitemapUrls: locs };
        return { urls: locs, sitemapUrls: [] };
    }

    function extractSitemapUrlsFromRobots(text) {
        return String(text || '').split(/\r?\n/)
            .map(line => line.trim())
            .filter(line => /^sitemap\s*:/i.test(line))
            .map(line => line.replace(/^sitemap\s*:/i, '').trim())
            .filter(Boolean);
    }

    function extractPageLinks(htmlText, pageUrl, options) {
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        const canonical = doc.querySelector('link[rel~="canonical" i]')?.getAttribute('href') || '';
        const urls = Array.from(doc.querySelectorAll('a[href]'))
            .map(a => cleanupUrl(a.getAttribute('href'), pageUrl, options))
            .filter(Boolean);
        const canonicalUrl = cleanupUrl(canonical, pageUrl, options);
        return { urls, canonicalUrl };
    }

    function setStatus(id, html) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }

    window.sitemapUtils = {
        toast,
        escapeHtml,
        escapeXml,
        normalizeInputUrl,
        cleanupUrl,
        isSameHost,
        uniqueUrls,
        validatePriority,
        buildSitemapXml,
        downloadText,
        openGeneratedFile,
        fetchText,
        extractUrlsFromSitemapXml,
        extractSitemapUrlsFromRobots,
        extractPageLinks,
        setStatus
    };
})();
