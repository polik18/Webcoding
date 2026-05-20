// js/tools/seo-audit.js
// Responsibility: SEO audit scoring, result rendering, and report export.
// Requires: js/tools/seo-core.js (loaded before this — defines _updateSeoScore, _updateSerpPreview)
//
// ⚠️  _updateSeoScore and _updateSerpPreview are defined in seo-core.js — DO NOT re-declare here.
// ⚠️  _renderAuditResults is a private helper defined here and only here.

// ─── SEO Audit ────────────────────────────────────────────────────────────────
window.runSeoAudit = function() {
    const tab = typeof getActive === 'function' ? getActive() : null;
    const container = document.getElementById('seo-audit-results');
    if (!container) return;

    if (!tab || (!tab.name.toLowerCase().endsWith('.html') && tab.mode !== 'visual')) {
        container.innerHTML = `<div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-yellow-700 dark:text-yellow-300 text-sm flex items-center gap-2"><i class="fa-solid fa-triangle-exclamation"></i> 請切換到 HTML 檔案以進行 SEO 診斷。</div>`;
        _updateSeoScore(0, '無效檔案');
        return;
    }

    const html = typeof editor !== 'undefined' ? editor.getValue() : '';
    const doc  = new DOMParser().parseFromString(html, 'text/html');
    const issues = [];
    let score = 100;

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
    doc.querySelectorAll('img').forEach(img => { if (!img.alt || !img.alt.trim()) missingAlt++; });
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
    _updateSerpPreview(title ? title.textContent : tab.name, desc ? desc.content : '請新增 Meta Description…');
};

// ─── Audit Results Renderer ───────────────────────────────────────────────────
// ⚠️  Private helper — only called by runSeoAudit. DO NOT call from other modules.
function _renderAuditResults(issues) {
    const c = document.getElementById('seo-audit-results');
    if (!c) return;
    if (issues.length === 0) {
        c.innerHTML = `<div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2"><i class="fa-solid fa-circle-check"></i> 完美！未發現明顯 SEO 問題。</div>`;
        return;
    }
    const cfg = {
        error:   ['fa-circle-exclamation text-red-500',      'border-red-100 dark:border-red-900'],
        warning: ['fa-triangle-exclamation text-yellow-500', 'border-yellow-100 dark:border-yellow-900'],
        info:    ['fa-circle-info text-blue-500',            'border-blue-100 dark:border-blue-900']
    };
    c.innerHTML = issues.map(i => {
        const [icon, border] = cfg[i.t] || cfg.info;
        return `<div class="bg-white dark:bg-gray-800 p-4 rounded-xl border ${border} shadow-sm flex gap-3"><i class="fa-solid ${icon} mt-0.5 flex-shrink-0"></i><div><div class="font-bold text-sm text-gray-900 dark:text-white">${i.h}</div><div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${i.a}</div></div></div>`;
    }).join('');
}

// ─── Export Report ────────────────────────────────────────────────────────────
window.exportSeoReport = function() {
    const scoreEl = document.getElementById('seo-score-text');
    const labelEl = document.getElementById('seo-score-label');
    const score = scoreEl ? scoreEl.textContent : '--';
    const label = labelEl ? labelEl.textContent : '';
    const tab   = typeof getActive === 'function' ? getActive() : null;
    let report  = `WebPad++ SEO 診斷報告\n${'='.repeat(40)}\n`;
    report += `檔案：${(tab && tab.name) ? tab.name : '未知'}\n時間：${new Date().toLocaleString()}\nSEO 評分：${score} — ${label}\n\n`;
    document.querySelectorAll('#seo-audit-results > div').forEach(div => {
        const h = div.querySelector('.font-bold')?.textContent || '';
        const a = div.querySelector('.text-xs')?.textContent || '';
        if (h) report += `• ${h}\n  建議：${a}\n\n`;
    });
    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' })),
        download: 'seo-report.txt'
    });
    a.click();
    URL.revokeObjectURL(a.href);
    typeof showToast === 'function' && showToast('SEO 報告已下載', 'success');
};
