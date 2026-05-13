// SEO Expert Tool v2.0 for WebPad++
// ─── Modal ──────────────────────────────────────────────────────────────────
window.openSeoModal = function() {
    document.getElementById('seo-modal').classList.remove('hidden');
    switchSeoTab('sitemap');
};

window.closeSeoModal = function() {
    document.getElementById('seo-modal').classList.add('hidden');
};

// ─── Tab Switch ──────────────────────────────────────────────────────────────
window.switchSeoTab = function(tab) {
    ['sitemap', 'robots', 'audit'].forEach(t => {
        const btn = document.getElementById(`seo-tab-${t}`);
        const panel = document.getElementById(`seo-content-${t}`);
        const isActive = t === tab;
        if (btn) {
            btn.classList.toggle('border-blue-500', isActive);
            btn.classList.toggle('text-blue-600', isActive);
            btn.classList.toggle('border-transparent', !isActive);
            btn.classList.toggle('text-gray-500', !isActive);
        }
        if (panel) panel.classList.toggle('hidden', !isActive);
    });
    // Hide shared output preview when switching tabs
    const out = document.getElementById('seo-output-preview');
    if (out) out.classList.add('hidden');
    if (tab === 'audit') window.runSeoAudit && window.runSeoAudit();
};

// ─── Sitemap Mode Toggle ─────────────────────────────────────────────────────
window.switchSitemapMode = function(mode) {
    const localP = document.getElementById('sitemap-local-panel');
    const extP   = document.getElementById('sitemap-external-panel');
    const localB = document.getElementById('sitemap-mode-local');
    const extB   = document.getElementById('sitemap-mode-external');
    const isLocal = mode === 'local';
    [localP, extP].forEach((el, i) => el && el.classList.toggle('hidden', isLocal ? i !== 0 : i !== 1));
    [[localB, isLocal], [extB, !isLocal]].forEach(([b, active]) => {
        if (!b) return;
        b.classList.toggle('bg-blue-600', active);
        b.classList.toggle('text-white', active);
        b.classList.toggle('shadow', active);
        b.classList.toggle('text-gray-600', !active);
        b.classList.toggle('dark:text-gray-400', !active);
    });
};

// ─── Local Scan ──────────────────────────────────────────────────────────────
window.scanLocalWorkspace = function() {
    const htmlFiles = [];
    const scanNode = (nodes, path) => {
        nodes.forEach(node => {
            if (node.type === 'file' && node.name.toLowerCase().endsWith('.html')) {
                htmlFiles.push(path + node.name);
            } else if (node.type === 'folder') {
                const children = (window.fileSystem && window.fileSystem.nodes)
                    ? window.fileSystem.nodes.filter(n => n.parentId === node.id)
                    : [];
                scanNode(children, path + node.name + '/');
            }
        });
    };

    if (window.fileSystem && window.fileSystem.nodes) {
        const roots = window.fileSystem.nodes.filter(n => n.parentId === 'root');
        scanNode(roots, '/');
    }

    const listEl = document.getElementById('sitemap-local-files');
    const countEl = document.getElementById('sitemap-local-count');
    if (!listEl) return;

    if (htmlFiles.length === 0) {
        listEl.innerHTML = '<p class="text-xs text-gray-400 italic py-2">工作區內沒有找到 .html 檔案</p>';
        if (countEl) countEl.textContent = '0 個檔案';
        typeof showToast === 'function' && showToast('工作區內沒有找到 .html 檔案', 'info');
        return;
    }

    listEl.innerHTML = htmlFiles.map(f => `
        <label class="flex items-center gap-2 text-xs py-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <input type="checkbox" class="sitemap-file-cb accent-blue-600" value="${f}" checked>
            <span class="font-mono text-gray-700 dark:text-gray-300">${f}</span>
        </label>`).join('');
    if (countEl) countEl.textContent = `找到 ${htmlFiles.length} 個檔案`;
    typeof showToast === 'function' && showToast(`掃描完成：找到 ${htmlFiles.length} 個 HTML 檔案`, 'success');
};

// ─── External Fetch ──────────────────────────────────────────────────────────
window.fetchExternalSitemap = async function() {
    const rawUrl = (document.getElementById('sitemap-external-url') || {}).value?.trim();
    if (!rawUrl) { typeof showToast === 'function' && showToast('請輸入網站 URL', 'error'); return; }

    let origin;
    try {
        let u = rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl;
        origin = new URL(u).origin;
    } catch(e) { typeof showToast === 'function' && showToast('URL 格式不正確', 'error'); return; }

    const btn = document.getElementById('btn-fetch-external');
    const statusEl = document.getElementById('external-fetch-status');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i>讀取中…'; }
    if (statusEl) statusEl.textContent = '嘗試自動讀取中…';

    const sitemapTargets = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
    let urls = [];
    let success = false;

    for (const target of sitemapTargets) {
        if (success) break;
        const proxies = [
            `https://corsproxy.io/?${encodeURIComponent(target)}`,
            `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`
        ];
        for (const proxyUrl of proxies) {
            try {
                const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
                if (!resp.ok) continue;
                let text;
                if (proxyUrl.includes('allorigins')) {
                    const json = await resp.json(); text = json.contents;
                } else { text = await resp.text(); }
                const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
                const locs = Array.from(xmlDoc.querySelectorAll('loc')).map(l => l.textContent.trim());
                if (locs.length > 0) { urls = locs; success = true; break; }
            } catch(e) { /* try next */ }
        }
    }

    // Fallback: parse robots.txt for Sitemap: lines
    if (!success) {
        try {
            const rUrl = `https://corsproxy.io/?${encodeURIComponent(origin + '/robots.txt')}`;
            const resp = await fetch(rUrl, { signal: AbortSignal.timeout(5000) });
            if (resp.ok) {
                const text = await resp.text();
                const sitemapLines = text.split('\n')
                    .filter(l => l.toLowerCase().startsWith('sitemap:'))
                    .map(l => l.split(':').slice(1).join(':').trim());
                if (sitemapLines.length > 0) {
                    // Pre-fill the robots sitemap URL field
                    const robEl = document.getElementById('robots-sitemap-url');
                    if (robEl) robEl.value = sitemapLines[0];
                    urls = [origin + '/'];
                    success = true;
                    if (statusEl) statusEl.innerHTML = `<span class="text-yellow-600">在 robots.txt 找到 Sitemap 連結，但無法自動展開頁面列表。已將根 URL 加入列表。</span>`;
                }
            }
        } catch(e) {}
    }

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-rotate mr-1"></i>嘗試自動讀取'; }

    const textarea = document.getElementById('sitemap-external-urls');
    if (success && urls.length > 0) {
        if (textarea) textarea.value = urls.join('\n');
        if (statusEl) statusEl.innerHTML = `<span class="text-emerald-600">✅ 成功取得 ${urls.length} 個 URL</span>`;
        typeof showToast === 'function' && showToast(`自動讀取成功：${urls.length} 個 URL`, 'success');
    } else {
        if (statusEl) statusEl.innerHTML = `<span class="text-orange-500">⚠️ 無法自動讀取（CORS 限制），請手動貼入 URL 列表</span>`;
        if (textarea && !textarea.value.trim()) {
            textarea.value = `${origin}/\n${origin}/about/\n${origin}/contact/`;
        }
        typeof showToast === 'function' && showToast('無法自動讀取，已提供範本，請手動修改', 'warning');
    }
};

// ─── Generate Sitemap ────────────────────────────────────────────────────────
window.generateSitemap = function() {
    const extPanel = document.getElementById('sitemap-external-panel');
    const isExternal = extPanel && !extPanel.classList.contains('hidden');

    let baseUrl = (document.getElementById('sitemap-base-url') || {value: ''}).value.trim();
    if (!baseUrl) baseUrl = 'https://example.com';
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const freq     = (document.getElementById('sitemap-changefreq') || {value: 'weekly'}).value;
    const priority = (document.getElementById('sitemap-priority')   || {value: '0.8'   }).value;
    const today    = new Date().toISOString().split('T')[0];
    let urls = [];

    if (!isExternal) {
        const cbs = document.querySelectorAll('.sitemap-file-cb:checked');
        if (cbs.length === 0) {
            window.scanLocalWorkspace && window.scanLocalWorkspace();
            setTimeout(() => window.generateSitemap(), 300);
            return;
        }
        cbs.forEach(cb => urls.push(cb.value));
    } else {
        const raw = (document.getElementById('sitemap-external-urls') || {value: ''}).value.trim();
        if (!raw) { typeof showToast === 'function' && showToast('請先輸入 URL 列表', 'error'); return; }
        urls = raw.split('\n').map(u => u.trim()).filter(Boolean);
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    urls.forEach(path => {
        const loc = path.startsWith('http') ? path : (baseUrl + (path.startsWith('/') ? path : '/' + path));
        xml += `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
    });
    xml += `</urlset>`;

    _showSeoOutput('sitemap.xml', xml);
};

// ─── Generate Robots.txt ─────────────────────────────────────────────────────
window.generateRobotsTxt = function() {
    const isAllowAll  = (document.getElementById('robots-allow-all') || {checked: true}).checked;
    const pathsRaw    = (document.getElementById('robots-disallow')   || {value: ''}).value.split('\n');
    const paths       = pathsRaw.map(p => p.trim()).filter(Boolean);
    const sitemapUrl  = (document.getElementById('robots-sitemap-url') || {value: ''}).value.trim() ||
                        (document.getElementById('sitemap-base-url')   || {value: ''}).value.trim().replace(/\/$/, '') + '/sitemap.xml';
    const extraAgents = (document.getElementById('robots-extra') || {value: ''}).value.trim();

    let txt = `# robots.txt — generated by WebPad++ SEO Expert\n# ${new Date().toISOString()}\n\nUser-agent: *\n`;
    if (!isAllowAll) {
        txt += `Disallow: /\n`;
    } else {
        txt += paths.length > 0
            ? paths.map(p => `Disallow: ${p.startsWith('/') ? p : '/' + p}`).join('\n') + '\n'
            : `Allow: /\n`;
    }
    if (sitemapUrl && sitemapUrl !== '/sitemap.xml') txt += `\nSitemap: ${sitemapUrl}\n`;
    if (extraAgents) txt += `\n${extraAgents}\n`;

    _showSeoOutput('robots.txt', txt);
};

// ─── Output Preview / Download / Open ───────────────────────────────────────
function _showSeoOutput(filename, content) {
    const area = document.getElementById('seo-output-preview');
    const code = document.getElementById('seo-output-code');
    const name = document.getElementById('seo-output-filename');
    if (!area) return;
    area.classList.remove('hidden');
    if (code) code.textContent = content;
    if (name) name.textContent = filename;
    area._filename = filename;
    area._content  = content;
    area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

window.downloadSeoOutput = function() {
    const area = document.getElementById('seo-output-preview');
    if (!area) return;
    const filename = area._filename || 'output.txt';
    const content  = area._content  || document.getElementById('seo-output-code')?.textContent || '';
    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' })),
        download: filename
    });
    a.click(); URL.revokeObjectURL(a.href);
    typeof showToast === 'function' && showToast(`✅ ${filename} 已下載`, 'success');
};

window.openSeoOutputAsTab = function() {
    const area = document.getElementById('seo-output-preview');
    if (!area) return;
    const filename = area._filename || 'output.txt';
    const content  = area._content  || document.getElementById('seo-output-code')?.textContent || '';
    if (typeof tabManager !== 'undefined') {
        tabManager.createNewTab(filename, content, false);
        window.closeSeoModal && window.closeSeoModal();
        typeof showToast === 'function' && showToast(`${filename} 已在新頁籤開啟`, 'success');
    }
};

// ─── SEO Audit ───────────────────────────────────────────────────────────────
window.runSeoAudit = function() {
    const tab = typeof getActive === 'function' ? getActive() : null;
    const container = document.getElementById('seo-audit-results');
    if (!container) return;

    if (!tab || (!tab.name.toLowerCase().endsWith('.html') && tab.mode !== 'visual')) {
        container.innerHTML = `<div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-yellow-700 dark:text-yellow-300 text-sm flex items-center gap-2"><i class="fa-solid fa-triangle-exclamation"></i> 請切換到 HTML 檔案以進行 SEO 診斷。</div>`;
        _updateSeoScore(0, '無效檔案'); return;
    }

    const html = typeof editor !== 'undefined' ? editor.getValue() : '';
    const doc  = new DOMParser().parseFromString(html, 'text/html');
    const issues = []; let score = 100;

    // Title
    const title = doc.querySelector('title');
    if (!title) { issues.push({ t:'error', h:'遺漏 <title> 標籤', a:'標題是搜尋結果中最醒目的部分，請務必新增。' }); score -= 25; }
    else if (title.textContent.length < 10) { issues.push({ t:'warning', h:`標題太短（${title.textContent.length} 字）`, a:'建議標題長度在 30–60 字元之間。' }); score -= 5; }
    else if (title.textContent.length > 60) { issues.push({ t:'warning', h:`標題偏長（${title.textContent.length} 字）`, a:'超過 60 字元在 Google 可能被截斷。' }); score -= 3; }

    // Meta description
    const desc = doc.querySelector('meta[name="description"]');
    if (!desc) { issues.push({ t:'error', h:'遺漏 Meta Description', a:'影響搜尋結果摘要，建議 120–160 字。' }); score -= 20; }
    else if (desc.content.length < 50) { issues.push({ t:'warning', h:'描述太短', a:'建議 Meta Description 長度 120–160 字元。' }); score -= 5; }

    // H1
    const h1s = doc.querySelectorAll('h1');
    if (h1s.length === 0) { issues.push({ t:'error', h:'找不到 H1 標籤', a:'每頁應恰好有一個 H1 主標題。' }); score -= 15; }
    else if (h1s.length > 1) { issues.push({ t:'warning', h:`偵測到 ${h1s.length} 個 H1`, a:'建議一頁只用一個 H1。' }); score -= 5; }

    // Images alt
    let missingAlt = 0;
    doc.querySelectorAll('img').forEach(img => { if (!img.alt?.trim()) missingAlt++; });
    if (missingAlt > 0) { issues.push({ t:'warning', h:`${missingAlt} 張圖片缺少 alt 屬性`, a:'Alt 有助於圖片搜尋與無障礙讀屏。' }); score -= Math.min(missingAlt * 2, 10); }

    // Viewport
    if (!doc.querySelector('meta[name="viewport"]')) { issues.push({ t:'error', h:'缺少 viewport meta', a:'行動優先索引必備，請加入 <meta name="viewport" content="width=device-width, initial-scale=1">。' }); score -= 10; }

    // Open Graph
    if (!doc.querySelector('meta[property^="og:"]')) { issues.push({ t:'info', h:'缺少 Open Graph 標籤', a:'新增 og:title / og:image 優化社交分享外觀。' }); }

    // Canonical
    if (!doc.querySelector('link[rel="canonical"]')) { issues.push({ t:'info', h:'建議新增 Canonical URL', a:'<link rel="canonical" href="..."> 可避免重複內容問題。' }); }

    // Lang
    if (!doc.querySelector('html[lang]')) { issues.push({ t:'warning', h:'HTML 缺少 lang 屬性', a:'例如 <html lang="zh-TW">，有助於語言識別。' }); score -= 3; }

    _renderAuditResults(issues);
    _updateSeoScore(Math.max(0, score));
    _updateSerpPreview(title?.textContent || tab.name, desc?.content || '請新增 Meta Description…');
};

function _updateSeoScore(score, label) {
    const circle = document.getElementById('seo-score-circle');
    const text   = document.getElementById('seo-score-text');
    const lbl    = document.getElementById('seo-score-label');
    if (circle) {
        circle.setAttribute('stroke-dasharray', `${score}, 100`);
        circle.classList.remove('text-emerald-500','text-yellow-500','text-red-500');
        circle.classList.add(score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500');
    }
    if (text) text.textContent = score;
    if (lbl)  lbl.textContent  = label || (score >= 90 ? '表現優異 (Excellent)' : score >= 70 ? '尚可 (Good)' : score >= 40 ? '需要改進 (Poor)' : '極差 (Critical)');
}

function _updateSerpPreview(title, desc) {
    const t = document.getElementById('preview-google-title');
    const d = document.getElementById('preview-google-desc');
    if (t) t.textContent = title;
    if (d) d.textContent = desc;
}

function _renderAuditResults(issues) {
    const c = document.getElementById('seo-audit-results');
    if (!c) return;
    if (issues.length === 0) {
        c.innerHTML = `<div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2"><i class="fa-solid fa-circle-check"></i> 完美！未發現明顯 SEO 問題。</div>`;
        return;
    }
    const cfg = { error: ['fa-circle-exclamation text-red-500','border-red-100 dark:border-red-900'], warning: ['fa-triangle-exclamation text-yellow-500','border-yellow-100 dark:border-yellow-900'], info: ['fa-circle-info text-blue-500','border-blue-100 dark:border-blue-900'] };
    c.innerHTML = issues.map(i => {
        const [icon, border] = cfg[i.t] || cfg.info;
        return `<div class="bg-white dark:bg-gray-800 p-4 rounded-xl border ${border} shadow-sm flex gap-3"><i class="fa-solid ${icon} mt-0.5 flex-shrink-0"></i><div><div class="font-bold text-sm text-gray-900 dark:text-white">${i.h}</div><div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${i.a}</div></div></div>`;
    }).join('');
}

window.exportSeoReport = function() {
    const score = document.getElementById('seo-score-text')?.textContent || '--';
    const label = document.getElementById('seo-score-label')?.textContent || '';
    const tab   = typeof getActive === 'function' ? getActive() : null;
    let report  = `WebPad++ SEO 診斷報告\n${'='.repeat(40)}\n`;
    report += `檔案：${tab?.name || '未知'}\n時間：${new Date().toLocaleString()}\nSEO 評分：${score} — ${label}\n\n`;
    document.querySelectorAll('#seo-audit-results > div').forEach(div => {
        const h = div.querySelector('.font-bold')?.textContent || '';
        const a = div.querySelector('.text-xs')?.textContent  || '';
        if (h) report += `• ${h}\n  建議：${a}\n\n`;
    });
    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' })),
        download: 'seo-report.txt'
    });
    a.click(); URL.revokeObjectURL(a.href);
    typeof showToast === 'function' && showToast('SEO 報告已下載', 'success');
};
