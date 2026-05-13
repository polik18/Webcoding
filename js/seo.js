// SEO Expert Analysis Engine for WebPad++

window.switchSeoTab = function(tab) {
    const tabs = ['sitemap', 'robots', 'audit'];
    tabs.forEach(t => {
        const btn = document.getElementById(`seo-tab-${t}`);
        const content = document.getElementById(`seo-content-${t}`);
        if (btn) {
            btn.classList.toggle('border-blue-500', t === tab);
            btn.classList.toggle('text-blue-600', t === tab);
            btn.classList.toggle('border-transparent', t !== tab);
            btn.classList.toggle('text-gray-500', t !== tab);
        }
        if (content) content.classList.toggle('hidden', t !== tab);
    });
    
    if (tab === 'audit') runSeoAudit();
};

window.runSeoAudit = function() {
    const tab = typeof getActive === 'function' ? getActive() : null;
    const resultsContainer = document.getElementById('seo-audit-results');
    if (!resultsContainer) return;
    
    if (!tab || (!tab.name.endsWith('.html') && tab.mode !== 'visual')) {
        resultsContainer.innerHTML = `
            <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-xl text-yellow-700 dark:text-yellow-300 text-sm flex items-center gap-2">
                <i class="fa-solid fa-triangle-exclamation"></i>
                請切換到 HTML 檔案以進行 SEO 診斷。
            </div>`;
        updateSeoScore(0, "無效檔案");
        return;
    }
    
    const html = typeof editor !== 'undefined' ? editor.getValue() : '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const issues = [];
    let score = 100;
    
    // 1. Title Tag
    const title = doc.querySelector('title');
    if (!title) {
        issues.push({ type: 'error', text: '遺漏 <title> 標籤', advice: '標題是搜尋結果中最醒目的部分，請務必新增。' });
        score -= 25;
    } else if (title.textContent.length < 10) {
        issues.push({ type: 'warning', text: '標題太短', advice: '建議標題長度在 30-60 字元之間。' });
        score -= 5;
    }
    
    // 2. Meta Description
    const desc = doc.querySelector('meta[name="description"]');
    if (!desc) {
        issues.push({ type: 'error', text: '遺漏 Meta Description', advice: '這會影響搜尋結果的摘要顯示，建議長度 120-160 字。' });
        score -= 20;
    }
    
    // 3. H1 Tag
    const h1s = doc.querySelectorAll('h1');
    if (h1s.length === 0) {
        issues.push({ type: 'error', text: '找不到 H1 標籤', advice: '每個頁面應該恰好有一個 H1 標籤作為主標題。' });
        score -= 15;
    } else if (h1s.length > 1) {
        issues.push({ type: 'warning', text: '偵測到多個 H1 標籤', advice: '建議一個頁面只使用一個 H1 以利搜尋引擎理解。' });
        score -= 5;
    }
    
    // 4. Image Alt Tags
    const imgs = doc.querySelectorAll('img');
    let missingAlt = 0;
    imgs.forEach(img => { if (!img.hasAttribute('alt') || !img.alt.trim()) missingAlt++; });
    if (missingAlt > 0) {
        issues.push({ type: 'warning', text: `${missingAlt} 張圖片缺少 alt 屬性`, advice: 'Alt 文字有助於圖片搜尋排名與無障礙讀屏。' });
        score -= (missingAlt * 2);
    }
    
    // 5. Open Graph Tags
    const og = doc.querySelector('meta[property^="og:"]');
    if (!og) {
        issues.push({ type: 'info', text: '缺少社交媒體 Open Graph 標籤', advice: '新增 og:title 與 og:image 可優化連結在 FB/LINE 分享時的外觀。' });
    }

    // Update UI
    renderAuditResults(issues);
    updateSeoScore(Math.max(0, score));
    updateSerpPreview(title ? title.textContent : tab.name, desc ? desc.content : "請新增 Meta Description 以顯示搜尋預覽...");
};

function updateSeoScore(score, label) {
    const circle = document.getElementById('seo-score-circle');
    const text = document.getElementById('seo-score-text');
    const labelEl = document.getElementById('seo-score-label');
    
    if (circle) circle.setAttribute('stroke-dasharray', `${score}, 100`);
    if (text) text.textContent = score;
    
    if (labelEl) {
        if (label) {
            labelEl.textContent = label;
        } else {
            if (score >= 90) labelEl.textContent = "表現優異 (Excellent)";
            else if (score >= 70) labelEl.textContent = "尚可 (Good)";
            else if (score >= 40) labelEl.textContent = "需要改進 (Poor)";
            else labelEl.textContent = "極差 (Critical)";
        }
    }
}

function updateSerpPreview(title, desc) {
    const pTitle = document.getElementById('preview-google-title');
    const pDesc = document.getElementById('preview-google-desc');
    if (pTitle) pTitle.textContent = title;
    if (pDesc) pDesc.textContent = desc;
}

function renderAuditResults(issues) {
    const container = document.getElementById('seo-audit-results');
    if (!container) return;
    
    if (issues.length === 0) {
        container.innerHTML = `
            <div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
                <i class="fa-solid fa-check-circle"></i>
                完美！未發現明顯的 SEO 技術問題。
            </div>`;
        return;
    }
    
    container.innerHTML = issues.map(issue => {
        let icon = 'fa-circle-exclamation text-red-500';
        let bg = 'bg-white dark:bg-gray-800';
        if (issue.type === 'warning') icon = 'fa-triangle-exclamation text-yellow-500';
        if (issue.type === 'info') icon = 'fa-circle-info text-blue-500';
        
        return `
            <div class="${bg} p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex gap-3">
                <i class="fa-solid ${icon} mt-1"></i>
                <div>
                    <div class="font-bold text-sm text-gray-900 dark:text-white">${issue.text}</div>
                    <div class="text-xs text-gray-500 mt-1">${issue.advice}</div>
                </div>
            </div>
        `;
    }).join('');
}
