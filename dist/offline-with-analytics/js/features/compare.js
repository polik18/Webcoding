// js/features/compare.js
// Responsibility: Compare (Merge View) modal and compare mode.
// Phase 0-C: diff_match_patch + CodeMirror merge addon are lazy-loaded on first use.

function openCompareModal() {
    const tabs = tabManager.tabs.filter(t => t.id !== tabManager.activeTabId);
    if (tabs.length === 0) { showToast(t('messages.openCompareTab'), "info"); return; }
    const select = document.getElementById('compare-tab-select');
    select.innerHTML = '';
    tabs.forEach(t => { const opt = document.createElement('option'); opt.value = t.id; opt.textContent = t.name; select.appendChild(opt); });
    const modal = document.getElementById('compare-modal'); const content = document.getElementById('compare-modal-content');
    modal.classList.remove('hidden'); void modal.offsetWidth;
    content.classList.remove('scale-95','opacity-0'); content.classList.add('scale-100','opacity-100');
}

function closeCompareModal() {
    const modal = document.getElementById('compare-modal'); const content = document.getElementById('compare-modal-content');
    content.classList.remove('scale-100','opacity-100'); content.classList.add('scale-95','opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 200);
}

async function executeCompare() {
    const targetId = document.getElementById('compare-tab-select').value;
    closeCompareModal();
    const targetTab = tabManager.tabs.find(t => t.id === targetId);
    const activeTab = tabManager.getActiveTab();
    if (!targetTab || !activeTab) return;

    // Lazy-load diff_match_patch + CodeMirror merge addon on first use
    if (typeof diff_match_patch === 'undefined' || !(window.CodeMirror && window.CodeMirror.MergeView)) {
        const ok = await window.ensureDependency('compare', { message: '載入比對引擎中...' });
        if (!ok) return;
    }

    document.getElementById('editor-container').classList.add('hidden');
    document.getElementById('visual-container').classList.add('hidden');
    document.getElementById('editor-container').classList.remove('flex');
    document.getElementById('visual-container').classList.remove('flex');

    const mergeContainer = document.getElementById('merge-container');
    mergeContainer.classList.remove('hidden'); mergeContainer.classList.add('flex');

    const wrapper = document.getElementById('merge-view-wrapper');
    wrapper.innerHTML = '';

    const theme = document.documentElement.classList.contains('dark') ? 'dracula' : 'default';
    mergeView = CodeMirror.MergeView(wrapper, {
        value: editor.getValue(),
        orig: targetTab.content,
        lineNumbers: true, theme, mode: editor.getOption('mode'),
        highlightDifferences: true, connect: 'align', collapseIdentical: false, revertButtons: false
    });
    mergeView.edit.on('change', () => { window.isProgrammaticChange = true; editor.setValue(mergeView.edit.getValue()); window.isProgrammaticChange = false; tabManager.markUnsaved(); });
}

function exitCompareMode() {
    document.getElementById('merge-container').classList.add('hidden');
    document.getElementById('merge-container').classList.remove('flex');
    const activeTab = tabManager.getActiveTab();
    if (activeTab && activeTab.mode === 'visual') {
        document.getElementById('visual-container').classList.remove('hidden');
        document.getElementById('visual-container').classList.add('flex');
        syncCodeToVisual();
    } else {
        document.getElementById('editor-container').classList.remove('hidden');
        document.getElementById('editor-container').classList.add('flex');
    }
    if (mergeView) { mergeView = null; document.getElementById('merge-view-wrapper').innerHTML = ''; }
}
