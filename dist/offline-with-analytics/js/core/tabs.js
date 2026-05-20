// js/core/tabs.js
// Responsibility: TabManager class — all tab state, switching, inline rename, and persistence.

class TabManager {
    constructor() {
        this.tabs = [];
        this.activeTabId = null;
        this.counter = 1;
        this.storageKey = 'webpad_tabs_v2';
    }

    async init() {
        if (typeof localforage === 'undefined') {
            this.createNewTab(t('nav.defaultFile'), t('content.default'), true);
            return;
        }
        try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000));
            const saved = await Promise.race([
                localforage.getItem(this.storageKey),
                timeoutPromise
            ]);
            
            if (saved && saved.tabs && saved.tabs.length > 0) {
                this.tabs = saved.tabs;
                this.counter = saved.counter || 1;
                
                // If the only saved tab is empty (due to previous crashes), restore the welcome page!
                if (this.tabs.length === 1 && (!this.tabs[0].content || this.tabs[0].content.trim() === '')) {
                    this.tabs[0].content = typeof t === 'function' ? t('content.default') : '';
                    this.tabs[0].isDefault = true;
                    if (typeof t === 'function') this.tabs[0].name = t('nav.defaultFile');
                }
                
                // Ensure default tabs get updated translations on load
                this.tabs.forEach(tab => {
                    if (tab.isDefault && typeof t === 'function') {
                        const defaultContent = t('content.default');
                        if (defaultContent && defaultContent !== 'content.default') {
                            tab.content = defaultContent;
                            tab.name = t('nav.defaultFile') || tab.name;
                        }
                    }
                });
                
                this.switchToTab(saved.activeTabId || this.tabs[0].id);
            } else {
                this.createNewTab(t('nav.defaultFile'), t('content.default'), true);
            }
        } catch (e) {
            console.error('Failed to load tabs from localforage', e);
            this.createNewTab(t('nav.defaultFile'), t('content.default'), true);
        }
    }

    async saveToStorage() {
        if (window.isResetting || typeof localforage === 'undefined') return;
        if (this.activeTabId && window.editor) {
            const activeTab = this.getActiveTab();
            if (activeTab) {
                activeTab.content = window.editor.getValue();
                // Sync spreadsheet DOM → data → tab before persisting
                if (activeTab.mode === 'spreadsheet' && typeof window._syncAndSaveSheetToTab === 'function') {
                    window._syncAndSaveSheetToTab(activeTab);
                }
                if (activeTab.fsId && window.fileSystem && typeof window.fileSystem.getNode === 'function') {
                    const node = window.fileSystem.getNode(activeTab.fsId);
                    if (node && node.type === 'file') {
                        node.content = activeTab.content;
                        node.updatedAt = Date.now();
                        if (activeTab.docType) node.docType = activeTab.docType;
                        if (activeTab.isTodoNote) node.isTodoNote = true;
                    }
                }
            }
            if (window.fileSystem && typeof window.fileSystem.save === 'function') window.fileSystem.save();
        }
        try {
            await localforage.setItem(this.storageKey, {
                tabs: this.tabs.map(t => ({...t, history: null})), 
                activeTabId: this.activeTabId,
                counter: this.counter
            });
        } catch (e) {
            console.error('Failed to save tabs', e);
        }
    }

    // Alias used by filesystem.js
    saveTabs() { return this.saveToStorage(); }

    createNewTab(name, content = "", isDefault = false, fsId = null) {
        const id = 'tab_' + Date.now() + '_' + this.counter++;
        let tabName = name || `${t('nav.untitled')}-${this.counter}.txt`;

        // Auto-create a FS node for every non-default, non-fs-linked tab
        let resolvedFsId = fsId;
        if (!resolvedFsId && !isDefault && window.fileSystem && window.fileSystem.nodes) {
            // _createNodeSilent 內部會自動避免重名（加 -1/-2 後綴），
            // 我們以節點實際使用的 name 為準，立即同步到 tab.name，避免頁籤名與檔案總管名不一致。
            const fsNode = window.fileSystem._createNodeSilent('file', 'root', tabName);
            if (fsNode) {
                fsNode.content = content;
                resolvedFsId = fsNode.id;
                if (fsNode.name !== tabName) tabName = fsNode.name; // 同步真正的名字
                window.fileSystem.save();
                window.fileSystem.renderTree();
            }
        }

        const isTodoNote = /data-webpad-note\s*=\s*["']true["']/i.test(content || '');
        const newTab = {
            id,
            fsId: resolvedFsId,
            name: tabName,
            isDefault: isDefault,
            content: content,
            eol: '\n',
            encoding: 'utf-8',
            mode: isTodoNote ? 'visual' : 'code',
            docType: isTodoNote ? 'note' : undefined,
            isTodoNote: isTodoNote,
            isUnsaved: !isDefault,
            history: null,
            scrollInfo: null,
            cursor: null,
            fileBuffer: null
        };
        this.tabs.push(newTab);
        this.switchToTab(id);
        return newTab;
    }

    getActiveTab() {
        return this.tabs.find(t => t.id === this.activeTabId);
    }

    switchToTab(id) {
        const currentTab = this.getActiveTab();
        if (currentTab && editor) {
            currentTab.content = editor.getValue();
            currentTab.history = editor.getHistory();
            currentTab.cursor = editor.getCursor();
            currentTab.scrollInfo = editor.getScrollInfo();
            // Save spreadsheet state when leaving a spreadsheet tab
            if (currentTab.mode === 'spreadsheet' && typeof window._syncAndSaveSheetToTab === 'function') {
                window._syncAndSaveSheetToTab(currentTab);
            }
        }

        this.activeTabId = id;
        const newTab = this.getActiveTab();
        if (!newTab) return;

        window.isProgrammaticChange = true;
        if (editor) {
            editor.setValue(newTab.content || '');
            if (newTab.history) editor.setHistory(newTab.history);
            else editor.clearHistory();
            if (newTab.cursor) editor.setCursor(newTab.cursor);
            if (newTab.scrollInfo) editor.scrollTo(newTab.scrollInfo.left, newTab.scrollInfo.top);
        }
        window.isProgrammaticChange = false;

        this.renderTabs();
        this.saveToStorage();
        updateUI();

        // 同步檔案總管的選取：切到任一頁籤時，檔案總管應反白該頁籤對應的節點。
        // 注意要避免遞迴：fileSystem.selectNode(id, true) 會再呼叫 openFileInTab → switchToTab，
        // 因此這裡只直接改 selectedNodeId 並重新繪製樹。
        if (window.fileSystem) {
            const desired = newTab.fsId || null;
            if (window.fileSystem.selectedNodeId !== desired) {
                window.fileSystem.selectedNodeId = desired;
                if (typeof window.fileSystem.renderTree === 'function') window.fileSystem.renderTree();
            }
        }

        if (newTab.mode === 'visual') switchToVisual();
        else if (newTab.mode === 'split') switchToSplit();
        else if (newTab.mode === 'spreadsheet') {
            if (typeof window.restoreSpreadsheetTab === 'function') {
                window.restoreSpreadsheetTab(newTab);
            } else {
                switchToSpreadsheet();
            }
        }
        else switchToCode();
    }

    closeTab(id, e) {
        if (e) e.stopPropagation();
        const tab = this.tabs.find(t => t.id === id);
        if (tab.isUnsaved) {
            if (!confirm(t('messages.confirmClose').replace('{{name}}', tab.name))) {
                return;
            }
        }
        this.tabs = this.tabs.filter(t => t.id !== id);
        if (this.tabs.length === 0) {
            this.createNewTab();
        } else if (this.activeTabId === id) {
            this.switchToTab(this.tabs[this.tabs.length - 1].id);
        } else {
            this.renderTabs();
            this.saveToStorage();
        }
    }

    renderTabs() {
        const container = document.getElementById('tabs-container');
        container.innerHTML = '';
        this.tabs.forEach(tab => {
            const isActive = tab.id === this.activeTabId;
            const div = document.createElement('div');
            div.className = `group flex items-center h-full px-3 sm:px-4 cursor-pointer border-e border-gray-300 dark:border-gray-700 transition-colors ${isActive ? 'bg-white dark:bg-gray-900 border-t-2 border-t-blue-500' : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border-t-2 border-t-transparent'}`;
            div.onclick = (e) => {
                if (this.activeTabId === tab.id) {
                    this.startInlineRename(tab.id, e, div.querySelector('.tab-title-span'));
                } else {
                    this.switchToTab(tab.id);
                }
            };
            div.onauxclick = (e) => { if(e.button === 1) this.closeTab(tab.id, e); };

            const dot = tab.isUnsaved ? `<span class="w-2 h-2 rounded-full bg-yellow-500 mr-2 ms-0 me-2"></span>` : '';
            div.innerHTML = `
                ${dot}
                <span class="tab-title-span text-xs sm:text-sm max-w-[120px] truncate ${isActive ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}" ondblclick="tabManager.startInlineRename('${tab.id}', event, this)">${tab.name}</span>
                <input type="text" class="tab-rename-input hidden text-xs sm:text-sm" value="${tab.name}" onblur="tabManager.finishInlineRename('${tab.id}', this)" onkeydown="if(event.key==='Enter') this.blur(); if(event.key==='Escape') { this.value='${tab.name}'; this.blur(); }">
                <button onclick="tabManager.closeTab('${tab.id}', event)" class="ms-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                    <i class="fa-solid fa-xmark text-[10px]"></i>
                </button>
            `;
            container.appendChild(div);
        });
    }

    startInlineRename(tabId, event, spanEl) {
        event.stopPropagation();
        const inputEl = spanEl.nextElementSibling;
        spanEl.classList.add('hidden');
        inputEl.classList.remove('hidden');
        inputEl.focus();
        inputEl.select();
    }

    finishInlineRename(tabId, inputEl) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        let newName = inputEl.value.trim();
        if (newName && newName !== tab.name) {
            const prevName = tab.name;
            // 修正：頁籤改名時，若同資料夾內已有重名，自動加 -1/-2 後綴，
            //   並把這個「實際採用的名字」同步回 tab.name，避免頁籤名與檔案總管名脫節。
            let finalName = newName;
            if (tab.fsId && window.fileSystem) {
                const node = window.fileSystem.getNode(tab.fsId);
                if (node) {
                    const dot = finalName.lastIndexOf('.');
                    const hasExt = dot > 0 && dot < finalName.length - 1;
                    const base = hasExt ? finalName.slice(0, dot) : finalName;
                    const ext  = hasExt ? finalName.slice(dot)   : '';
                    let i = 1;
                    while (window.fileSystem.nodes.some(n => n.parentId === node.parentId && n.id !== node.id && n.name === finalName)) {
                        finalName = `${base}-${i}${ext}`;
                        i++;
                    }
                    if (finalName !== newName && typeof showToast === 'function') {
                        showToast(`"${newName}" 已存在，已自動改為 "${finalName}"`, 'info');
                    }
                    node.name = finalName;
                    if (prevName !== finalName) delete node.handle; // 名字變了 → 原 handle 失效
                    window.fileSystem.save();
                    window.fileSystem.renderTree();
                }
            }
            tab.name = finalName;
            tab.isDefault = false;
            tab.isUnsaved = true;
            if (this.activeTabId === tabId) updateUI();
            this.saveTabs();
        }
        this.renderTabs();
    }

    markUnsaved() {
        const tab = this.getActiveTab();
        if (tab && !tab.isUnsaved) {
            tab.isUnsaved = true;
            tab.isDefault = false;
            this.renderTabs();
            updateUI();
        }
    }
}

window.tabManager = new TabManager();
const tabManager = window.tabManager;

// Alias for compatibility
function getActive() { return tabManager.getActiveTab() || {}; }
