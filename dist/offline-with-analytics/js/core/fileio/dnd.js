// js/core/fileio/dnd.js
// Drag-and-drop import logic. Requires constants.js and open.js.

// ─── Drag-and-Drop ────────────────────────────────────────────────────────────
let dragCounter = 0;
// 把單一檔案內容讀成 text（適合純文字／程式碼類型）
function _readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = (ev) => reject(ev);
        reader.readAsText(file);
    });
}

// ─── Drop-target detection ────────────────────────────────────────────────────
// 判斷拖放的目標屬於哪個區域：
//   'explorer' → 檔案總管（#file-tree 或側邊欄整塊）
//   'editor'   → 編輯區（#editor-container 內，包括分頁列與 CodeMirror）
//   'other'    → 其他區域；視同檔案總管處理（保守作法，不主動覆蓋使用者目前在編輯的內容）
//
// ⚠️ 注意：拖曳期間 #drop-overlay 會浮在最上層，e.target 會永遠是 overlay 而不是底下真正的元素。
//   因此我們用 document.elementFromPoint(clientX, clientY) 配合「暫時關閉 overlay 的 pointer-events」
//   來取得「拖放點下方真正的元素」。
function _detectDropZoneFromPoint(clientX, clientY) {
    const overlay = document.getElementById('drop-overlay');
    const prevPE = overlay ? overlay.style.pointerEvents : '';
    if (overlay) overlay.style.pointerEvents = 'none';
    let target = null;
    try {
        target = document.elementFromPoint(clientX, clientY);
    } finally {
        if (overlay) overlay.style.pointerEvents = prevPE;
    }
    if (!target || !(target instanceof Element)) return 'other';

    // 檔案總管（含側邊欄整塊）
    if (target.closest('#file-tree')) return 'explorer';
    if (target.closest('#sidebar')) return 'explorer';
    // 編輯區（分頁列 + CodeMirror）
    if (target.closest('#editor-container')) return 'editor';
    return 'other';
}

document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('drop-overlay');
    window.addEventListener('dragenter', (e) => { e.preventDefault(); dragCounter++; if (dragCounter === 1) overlay.classList.remove('hidden'); });
    window.addEventListener('dragleave', (e) => { e.preventDefault(); dragCounter--; if (dragCounter === 0) overlay.classList.add('hidden'); });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', async (e) => {
        e.preventDefault();
        dragCounter = 0;

        if (!e.dataTransfer) {
            overlay.classList.add('hidden');
            return;
        }

        // 先用座標偵測使用者放開拖曳的位置（檔案總管 vs 編輯區）。
        // 必須在 overlay 還可見的當下就抓座標，但 _detectDropZoneFromPoint 內部會暫時關掉
        // overlay 的 pointer-events，所以 elementFromPoint 仍能拿到底下真正的元素。
        const dropZone = _detectDropZoneFromPoint(e.clientX, e.clientY);
        console.log('[drop] dropZone =', dropZone, 'at', e.clientX, e.clientY);

        overlay.classList.add('hidden');

        try {

        const items = e.dataTransfer.items;
        // 蒐集 entries。每筆 entry 同時保留：
        //   - webkitEntry（用來判斷 isFile / isDirectory、遞迴讀資料夾）
        //   - directFile（直接從 dataTransfer.files 拿到的 File，避免 file:// 下 entry.file() 不回呼）
        const entries = [];
        if (items) {
            const dtFiles = e.dataTransfer.files;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
                    const directFile = item.getAsFile ? item.getAsFile() : (dtFiles && dtFiles[i] ? dtFiles[i] : null);
                    if (entry) {
                        entries.push({ webkitEntry: entry, directFile: directFile });
                    } else if (directFile) {
                        entries.push({ _plainFile: directFile });
                    }
                }
            }
        }
        // 退路：完全沒有 entry，就用 files
        if (entries.length === 0) {
            const files = e.dataTransfer.files;
            for (let i = 0; i < files.length; i++) entries.push({ _plainFile: files[i] });
        }
        if (entries.length === 0) { console.log('[drop] no entries collected, abort'); return; }
        console.log('[drop] entries collected:', entries.length, entries);

        // 判斷「最外層」是否包含任何資料夾。
        // 只看最外層 entries 即可——使用者規則只關心頂層拖入了什麼。
        const hasTopLevelFolder = entries.some(en => {
            if (!en) return false;
            if (en.webkitEntry) return en.webkitEntry.isDirectory === true;
            return false; // _plainFile 一定是檔案
        });
        console.log('[drop] hasTopLevelFolder =', hasTopLevelFolder);

        showToast('處理匯入檔案中...', 'info');

        // 將拖入的內容匯入到 fileSystem。
        //   topLevelFileNodes：只蒐集「最外層」就是檔案的那些節點（不含資料夾裡面的檔案）
        //   這份名單之後用來決定要打開哪些分頁。
        const topLevelFileNodes = [];

        const readDir = (dirEntry) => new Promise((resolve) => {
            const reader = dirEntry.createReader();
            let acc = [];
            const readNext = () => {
                reader.readEntries((results) => {
                    if (!results.length) resolve(acc);
                    else { acc = acc.concat(results); readNext(); }
                });
            };
            readNext();
        });

        // 將「檔案內容」匯入到 fileSystem 中的某個資料夾。
        // 規則（修正使用者回報的「拖進來功能失效」）：
        //   如果同資料夾內已有相同檔名的檔案節點 → 直接「覆蓋」其內容，不新建節點。
        //   只有當不存在同名節點時，才新建一個。
        // 這符合使用者拖檔的直覺：「我從電腦拖 foo.js 進來，就是要用這個內容取代之前的 foo.js」。
        const _writeDroppedFileToFs = (file, parentId, content) => {
            if (!window.fileSystem) return null;
            const existing = window.fileSystem.nodes.find(n => n.parentId === parentId && n.name === file.name && n.type === 'file');
            if (existing) {
                existing.content = content;
                existing.updatedAt = Date.now();
                existing._droppedFile = file;
                return existing;
            }
            const node = window.fileSystem._createNodeSilent('file', parentId, file.name);
            if (node) {
                node.content = content;
                node._droppedFile = file;
            }
            return node;
        };

        // 從 FileSystemFileEntry 取 File，加上 errorCallback 與 timeout 退路，
        // 避免在 file:// 環境下 entry.file() callback 不被呼叫而卡死。
        const _entryToFile = (entry, fallback) => new Promise((resolve) => {
            let settled = false;
            const finish = (f) => { if (!settled) { settled = true; resolve(f || null); } };
            try {
                entry.file(
                    (f) => finish(f),
                    (err) => { console.warn('[drop] entry.file() error, using fallback:', err); finish(fallback); }
                );
            } catch (e) {
                console.warn('[drop] entry.file() threw, using fallback:', e);
                finish(fallback);
            }
            // 1.5 秒沒回呼就走退路
            setTimeout(() => { if (!settled) { console.warn('[drop] entry.file() timed out, using fallback'); finish(fallback); } }, 1500);
        });

        // isTopLevel：此 entry 是否來自最外層（直接被拖入的那一層）。
        //   只有最外層的「檔案」節點才會被收集到 topLevelFileNodes，用於決定要開哪些分頁。
        //   資料夾內部的檔案不算最外層 → 不會自動開分頁。
        const processEntry = async (item, parentId, isTopLevel) => {
            // 情境 A：沒有 webkit entry（純 File，例如某些瀏覽器或拖一般檔案）
            if (item._plainFile) {
                const file = item._plainFile;
                const ext = (file.name.split('.').pop() || '').toLowerCase();
                let content = '';
                if (!_BINARY_EXTS.includes(ext)) {
                    try { content = await _readFileAsText(file); } catch(_) { content = ''; }
                }
                const node = _writeDroppedFileToFs(file, parentId, content);
                if (node && isTopLevel) topLevelFileNodes.push(node);
                return;
            }

            const entry = item.webkitEntry;
            if (!entry) return;

            if (entry.isFile) {
                // 最外層的檔案直接用 directFile（從 dataTransfer 拿到的 File），
                // 完全繞過 entry.file() 在 file:// 下不回呼的問題。
                // 資料夾內部的檔案沒有 directFile，只能呼叫 entry.file()（已包好 timeout/error）。
                const file = item.directFile || await _entryToFile(entry, null);
                if (!file) { console.warn('[drop] could not obtain File for entry:', entry.name); return; }
                const ext = (file.name.split('.').pop() || '').toLowerCase();
                let content = '';
                if (!_BINARY_EXTS.includes(ext)) {
                    try { content = await _readFileAsText(file); } catch(_) { content = ''; }
                }
                const node = _writeDroppedFileToFs(file, parentId, content);
                if (node && isTopLevel) topLevelFileNodes.push(node);
                return;
            }
            if (entry.isDirectory) {
                // 資料夾：若同名資料夾已存在則沿用它（不建新的、不加 -1 後綴）
                let folderNode = null;
                if (window.fileSystem) {
                    folderNode = window.fileSystem.nodes.find(n => n.parentId === parentId && n.name === entry.name && n.type === 'folder');
                    if (!folderNode) folderNode = window.fileSystem._createNodeSilent('folder', parentId, entry.name);
                }
                const folderId = folderNode ? folderNode.id : parentId;
                const children = await readDir(entry);
                // 資料夾內部 → 全部當作非最外層（isTopLevel=false），不會自動開分頁
                // 子層沒有 directFile，包成 { webkitEntry: child } 讓 processEntry 處理
                for (const child of children) await processEntry({ webkitEntry: child, directFile: null }, folderId, false);
            }
        };

        for (const entry of entries) {
            await processEntry(entry, 'root', true);
        }
        console.log('[drop] processEntry done. topLevelFileNodes:', topLevelFileNodes.length);

        if (window.fileSystem) { fileSystem.save(); fileSystem.renderTree(); console.log('[drop] fileSystem saved & re-rendered'); }
        else { console.warn('[drop] window.fileSystem is missing'); }

        // ─── 決定要打開哪些檔案到分頁 ──────────────────────────────────────────
        // 規則整理：
        //   • 拖到「檔案總管」  → 不開任何分頁（檔案/資料夾整體進入總管即可）
        //   • 拖到「編輯區」    →
        //       - 若最外層『沒有資料夾』（純檔案）：所有最外層檔案都各自開成分頁
        //         （第一個會覆蓋當前分頁/或建立新分頁，其餘都建立新分頁）
        //       - 若最外層『有資料夾』：只進總管，不開任何分頁
        //   • 拖到其他區域（標題列、空白）→ 視同檔案總管，不開分頁
        // 注意：清掉所有節點上暫存的 _droppedFile（避免序列化進 IndexedDB），
        //   即使最終不開分頁也要清。
        const _cleanupTransientFileRefs = () => {
            for (const n of topLevelFileNodes) {
                if (n && n._droppedFile) delete n._droppedFile;
            }
        };

        let nodesToOpen = [];
        if (dropZone === 'editor') {
            if (hasTopLevelFolder) {
                // 編輯區 + 含資料夾 → 不開分頁
                nodesToOpen = [];
            } else {
                // 編輯區 + 純檔案 → 全部最外層檔案都開
                nodesToOpen = topLevelFileNodes.slice();
            }
        } else {
            // 'explorer' 或 'other' → 不開分頁
            nodesToOpen = [];
        }
        console.log('[drop] nodesToOpen:', nodesToOpen.length, nodesToOpen.map(n => n && n.name));

        // 打開分頁。第一個用「覆蓋當前分頁或切換到已存在的同步分頁」的邏輯，
        // 其餘的一律 createNewTab（createNewTab 內部會 switchToTab，這沒關係——
        // 多檔案的情境下，最終會停在最後一個被打開的分頁，這在 VS Code 等編輯器是常見行為）。
        if (nodesToOpen.length > 0 && window.tabManager && window.fileSystem) {
            for (let i = 0; i < nodesToOpen.length; i++) {
                const node = nodesToOpen[i];
                const ext = (node.name.split('.').pop() || '').toLowerCase();
                const isBinary = _BINARY_EXTS.includes(ext);
                const file = node._droppedFile;

                if (isBinary && file) {
                    // 二進位（pdf/docx/xlsx/影像等）→ 走 loadFileContent 的特殊路徑
                    loadFileContent(file);
                    const cur = window.tabManager.getActiveTab && window.tabManager.getActiveTab();
                    if (cur && !cur.fsId) cur.fsId = node.id;
                } else {
                    const existingTab = window.tabManager.tabs.find(t => t.fsId === node.id);
                    if (existingTab) {
                        // 已對應某個 tab → 覆蓋其內容並切換過去
                        existingTab.content = node.content || '';
                        existingTab.isUnsaved = false;
                        existingTab.isDefault = false;
                        existingTab.history = null;
                        if (window.tabManager.activeTabId === existingTab.id) {
                            window.isProgrammaticChange = true;
                            if (window.editor) {
                                window.editor.setValue(existingTab.content);
                                window.editor.clearHistory();
                            }
                            window.isProgrammaticChange = false;
                            window.tabManager.renderTabs();
                            if (typeof updateUI === 'function') updateUI();
                            window.tabManager.saveToStorage();
                        } else {
                            window.tabManager.switchToTab(existingTab.id);
                        }
                    } else {
                        window.tabManager.createNewTab(node.name, node.content || '', false, node.id);
                    }
                }
            }
            // 最後一個被打開的節點，反白在檔案總管
            const last = nodesToOpen[nodesToOpen.length - 1];
            if (last) {
                window.fileSystem.selectedNodeId = last.id;
                window.fileSystem.renderTree();
            }
        }

        _cleanupTransientFileRefs();

        showToast('檔案匯入完成', 'success');
        } catch (err) {
            console.error('[drop] handler failed:', err);
            showToast('拖放處理失敗：' + (err && err.message ? err.message : err), 'error');
        }
    });
});

