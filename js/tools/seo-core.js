// js/tools/seo-core.js
// Responsibility: SEO modal, tab switching, SERP preview display.
// ⚠️  _updateSeoScore, _updateSerpPreview are defined HERE — DO NOT declare in seo-audit.js

// ─── Modal ────────────────────────────────────────────────────────────────────
window.openSeoModal = function() {
    document.getElementById('seo-modal').classList.remove('hidden');
    switchSeoTab('sitemap');
};
window.closeSeoModal = function() {
    document.getElementById('seo-modal').classList.add('hidden');
};

// ─── Tab Switch ───────────────────────────────────────────────────────────────
// ⚠️  switchSeoTab is called from seo-audit.js (runSeoAudit auto-runs on tab='audit')
//     DO NOT remove it or rename it — keep this as the single definition.
window.switchSeoTab = function(tab) {
    ['sitemap', 'robots', 'audit'].forEach(t => {
        const btn   = document.getElementById(`seo-tab-${t}`);
        const panel = document.getElementById(`seo-content-${t}`);
        const isActive = t === tab;
        if (btn) {
            btn.classList.toggle('border-blue-500',     isActive);
            btn.classList.toggle('text-blue-600',       isActive);
            btn.classList.toggle('border-transparent', !isActive);
            btn.classList.toggle('text-gray-500',      !isActive);
        }
        if (panel) panel.classList.toggle('hidden', !isActive);
    });
    const out = document.getElementById('seo-output-preview');
    if (out) out.classList.add('hidden');
    if (tab === 'audit') window.runSeoAudit && window.runSeoAudit();
};

// ─── SERP Preview ─────────────────────────────────────────────────────────────
// Called by seo-audit.js — must be defined before seo-audit.js loads
function _updateSeoScore(score, label) {
    const circle = document.getElementById('seo-score-circle');
    const text   = document.getElementById('seo-score-text');
    const lbl    = document.getElementById('seo-score-label');
    if (circle) {
        circle.setAttribute('stroke-dasharray', `${score}, 100`);
        circle.classList.remove('text-emerald-500', 'text-yellow-500', 'text-red-500');
        circle.classList.add(score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500');
    }
    if (text) text.textContent = score;
    if (lbl)  lbl.textContent  = label || (score >= 90 ? '表現優異 (Excellent)' : score >= 70 ? '尚可 (Good)' : score >= 40 ? '需要改進 (Poor)' : '極差 (Critical)');
}
window._updateSeoScore = _updateSeoScore;

function _updateSerpPreview(title, desc) {
    const t = document.getElementById('preview-google-title');
    const d = document.getElementById('preview-google-desc');
    if (t) t.textContent = title;
    if (d) d.textContent = desc;
}
window._updateSerpPreview = _updateSerpPreview;
