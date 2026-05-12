class FileSystem {
    constructor() {
        this.nodes = [];
        this.expandedFolders = new Set();
        this.selectedNodeId = null;
        this.storageKey = 'webpad_fs_v1';
        this.counter = 1;
    }

    async init() {
        const saved = await localforage.getItem(this.storageKey);
        if (saved && saved.nodes && saved.nodes.length > 0) {
            this.nodes = saved.nodes;
            this.expandedFolders = new Set(saved.expandedFolders || []);
            this.counter = saved.counter || 1;
        } else {
            this.nodes = [
                { id: 'root', parentId: null, type: 'folder', name: 'Project Workspace' }
            ];
            this.expandedFolders.add('root');
            this.save();
        }
        this.renderTree();
    }

    async save() {
        await localforage.setItem(this.storageKey, {
            nodes: this.nodes,
            expandedFolders: Array.from(this.expandedFolders),
            counter: this.counter
        });
    }

    getNode(id) { return this.nodes.find(n => n.id === id); }

    // Internal: create node without toast (used when auto-syncing from tab manager)
    _createNodeSilent(type, parentId, name) {
        if (this.nodes.some(n => n.parentId === parentId && n.name === name)) return null;
        const node = {
            id: 'fs_' + Date.now() + '_' + this.counter++,
            type: type,
            parentId: parentId,
            name: name,
            content: type === 'file' ? '' : null,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.nodes.push(node);
        if (type === 'folder') this.expandedFolders.add(node.id);
        return node;
    }

    createNode(type, parentId, name) {
        if (this.nodes.some(n => n.parentId === parentId && n.name === name)) {
            const msg = `"${name}" ${typeof t === 'function' ? (t('messages.errDuplicate') || 'already exists in this folder') : 'already exists in this folder'}`;
            if (typeof showToast === 'function') showToast(msg, 'error');
            return null;
        }
        const node = this._createNodeSilent(type, parentId, name);
        if (!node) return null;
        this.save();
        this.renderTree();
        return node;
    }
    
    createNodePrompt(type) {
        let parentId = 'root';
        if (this.selectedNodeId) {
            const sel = this.getNode(this.selectedNodeId);
            if (sel) {
                if (sel.type === 'folder') parentId = sel.id;
                else parentId = sel.parentId || 'root';
            }
        }
        
        const titleKey = type === 'file' ? 'nav.newFile' : 'nav.newFolder';
        const fallbackName = type === 'file' ? 'New File' : 'New Folder';
        let defaultName = typeof t === 'function' ? t(titleKey) : fallbackName;
        if (defaultName === titleKey) defaultName = fallbackName;
        if (type === 'file') defaultName += '.txt';
        
        showCustomPrompt(
            defaultName, 
            (typeof t === 'function' ? t('messages.renameMsg') : 'Enter name:'), 
            defaultName, 
            (name) => {
                if (name && name.trim() !== '') {
                    const node = this.createNode(type, parentId, name.trim());
                    if (node) {
                        this.expandedFolders.add(parentId);
                        this.save();
                        this.renderTree();
                        if (type === 'file') {
                            this.openFileInTab(node.id);
                        }
                    }
                }
            }
        );
    }

    _startInlineRename(nodeId, nameSpan) {
        if (nameSpan.querySelector('input')) return; // already renaming
        const node = this.getNode(nodeId);
        if (!node || nodeId === 'root') return;
        
        const currentName = node.name;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentName;
        input.className = 'tab-rename-input bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded px-1 max-w-[140px]';
        input.onclick = e => e.stopPropagation();
        
        const finish = () => {
            const newName = input.value.trim();
            input.remove();
            nameSpan.classList.remove('hidden');
            if (newName && newName !== currentName) {
                if (this.nodes.some(n => n.parentId === node.parentId && n.name === newName)) {
                    const msg = `"${newName}" ${typeof t === 'function' ? (t('messages.errDuplicate') || 'already exists') : 'already exists'}`;
                    if (typeof showToast === 'function') showToast(msg, 'error');
                    return;
                }
                node.name = newName;
                node.updatedAt = Date.now();
                this.save();
                this.renderTree();
                // sync open tab
                if (window.tabManager) {
                    const tab = window.tabManager.tabs.find(t => t.fsId === nodeId);
                    if (tab) { tab.name = newName; window.tabManager.saveTabs(); window.tabManager.renderTabs(); }
                }
            }
        };
        
        input.addEventListener('blur', finish);
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = currentName; input.blur(); }
        });
        
        nameSpan.classList.add('hidden');
        nameSpan.parentNode.insertBefore(input, nameSpan.nextSibling);
        input.focus();
        input.select();
    }

    renameSelectedNode() {
        if (!this.selectedNodeId || this.selectedNodeId === 'root') return;
        const node = this.getNode(this.selectedNodeId);
        if (!node) return;
        
        showCustomPrompt(
            (typeof t === 'function' ? t('nav.renameTitle') : 'Rename'),
            (typeof t === 'function' ? t('messages.renameMsg') : 'Enter new name:'),
            node.name,
            (newName) => {
                if (newName && newName.trim() !== '' && newName.trim() !== node.name) {
                    if (this.nodes.some(n => n.parentId === node.parentId && n.name === newName.trim())) {
                        const msg = `"${newName.trim()}" ${typeof t === 'function' ? (t('messages.errDuplicate') || 'already exists') : 'already exists'}`;
                        if (typeof showToast === 'function') showToast(msg, 'error');
                        return;
                    }
                    node.name = newName.trim();
                    node.updatedAt = Date.now();
                    this.save();
                    this.renderTree();
                    if (window.tabManager) {
                        const tab = window.tabManager.tabs.find(t => t.fsId === node.id);
                        if (tab) { tab.name = node.name; window.tabManager.saveTabs(); window.tabManager.renderTabs(); }
                    }
                }
            }
        );
    }

    deleteSelectedNode() {
        if (!this.selectedNodeId || this.selectedNodeId === 'root') {
            alert(typeof t === 'function' ? t('messages.errDeleteRoot', { defaultValue: 'Cannot delete root folder or no file selected.' }) : 'Cannot delete root folder or no file selected.');
            return;
        }
        const node = this.getNode(this.selectedNodeId);
        if (!node) return;
        
        const deleteLabel = (typeof t === 'function') ? t('nav.deleteNode') : 'Delete';
        const confirmMsg = `${(typeof t === 'function') ? t('messages.confirmDeleteMsg') : 'Are you sure you want to delete'} "${node.name}"?`;
        
        showCustomConfirm(deleteLabel, confirmMsg, () => {
            const getChildrenIds = (parentId) => {
                let ids = [];
                this.nodes.filter(n => n.parentId === parentId).forEach(n => {
                    ids.push(n.id);
                    if (n.type === 'folder') ids = ids.concat(getChildrenIds(n.id));
                });
                return ids;
            };
            
            const idsToDelete = [node.id, ...getChildrenIds(node.id)];
            this.nodes = this.nodes.filter(n => !idsToDelete.includes(n.id));
            this.selectedNodeId = null;
            this.save();
            this.renderTree();
            
            // Also close tabs
            idsToDelete.forEach(id => {
                const tab = tabManager.tabs.find(t => t.fsId === id);
                if (tab) {
                    tabManager.tabs = tabManager.tabs.filter(t => t.id !== tab.id);
                }
            });
            if (!tabManager.getActiveTab() && tabManager.tabs.length > 0) tabManager.switchToTab(tabManager.tabs[0].id);
            else if (tabManager.tabs.length === 0) tabManager.createNewTab();
            tabManager.renderTabs();
        });
    }

    toggleFolder(id, e) {
        if (e) e.stopPropagation();
        if (this.expandedFolders.has(id)) {
            this.expandedFolders.delete(id);
        } else {
            this.expandedFolders.add(id);
        }
        this.selectNode(id, false);
        this.save();
        this.renderTree();
    }

    selectNode(id, openIfFile = true) {
        this.selectedNodeId = id;
        this.renderTree();
        if (openIfFile) {
            const node = this.getNode(id);
            if (node && node.type === 'file') {
                this.openFileInTab(id);
            }
        }
    }

    openFileInTab(nodeId) {
        const node = this.getNode(nodeId);
        if (!node || node.type !== 'file') return;
        
        const existingTab = tabManager.tabs.find(t => t.fsId === nodeId);
        if (existingTab) {
            tabManager.switchToTab(existingTab.id);
            return;
        }
        
        tabManager.createNewTab(node.name, node.content || "", false, nodeId);
    }

    async exportZip() {
        if (!window.JSZip) {
            if (typeof showToast === 'function') showToast("JSZip not loaded", "error");
            return;
        }
        
        if (typeof showToast === 'function') showToast("Generating ZIP...", "info");
        
        const zip = new JSZip();
        
        const getPath = (node) => {
            if (!node || node.id === 'root') return '';
            const parent = this.getNode(node.parentId);
            const parentPath = getPath(parent);
            return parentPath ? parentPath + '/' + node.name : node.name;
        };
        
        // Add files and folders to ZIP
        this.nodes.forEach(node => {
            if (node.id === 'root') return;
            const path = getPath(node);
            if (!path) return;
            
            if (node.type === 'file') {
                zip.file(path, node.content || "");
            } else if (node.type === 'folder') {
                zip.folder(path);
            }
        });
        
        // Include unsaved draft content for files currently open
        if (window.tabManager) {
            window.tabManager.tabs.forEach(tab => {
                if (tab.fsId && tab.isUnsaved) {
                    const node = this.getNode(tab.fsId);
                    if (node) {
                        const path = getPath(node);
                        const content = window.editor ? window.editor.getValue(tab.eol) : tab.content;
                        zip.file(path, content);
                    }
                }
            });
        }
        
        try {
            const content = await zip.generateAsync({type:"blob", compression: "DEFLATE"});
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = "WebPad_Project.zip";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (typeof showToast === 'function') showToast(typeof t === 'function' ? (t('messages.toastSaved') || "Exported ZIP") : "Exported ZIP", "success");
        } catch(e) {
            console.error(e);
            if (typeof showToast === 'function') showToast("Failed to export ZIP", "error");
        }
    }

    renderTree() {
        const container = document.getElementById('file-tree');
        if (!container) return;
        container.innerHTML = '';
        
        const buildNode = (node, depth) => {
            const isSelected = node.id === this.selectedNodeId;
            const isExpanded = this.expandedFolders.has(node.id);
            const padding = depth * 12 + 4;
            
            // Row div
            const row = document.createElement('div');
            row.className = `flex items-center py-1 cursor-pointer transition-colors rounded ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700/50'}`;
            row.style.paddingLeft = padding + 'px';
            
            // Chevron
            const chevronEl = document.createElement('span');
            chevronEl.className = 'w-3 flex-shrink-0 text-center text-[10px] text-gray-400';
            if (node.type === 'folder') {
                chevronEl.innerHTML = isExpanded
                    ? '<i class="fa-solid fa-chevron-down"></i>'
                    : '<i class="fa-solid fa-chevron-right"></i>';
            }
            row.appendChild(chevronEl);
            
            // Icon
            const iconEl = document.createElement('span');
            iconEl.className = 'ms-1 me-1.5 flex-shrink-0 w-4 text-center';
            if (node.type === 'folder') {
                iconEl.innerHTML = isExpanded
                    ? '<i class="fa-solid fa-folder-open text-yellow-400"></i>'
                    : '<i class="fa-solid fa-folder text-yellow-400"></i>';
            } else {
                iconEl.innerHTML = '<i class="fa-regular fa-file-code text-blue-400"></i>';
            }
            row.appendChild(iconEl);
            
            // Name span
            const nameSpan = document.createElement('span');
            nameSpan.className = 'truncate max-w-[150px] font-medium select-none';
            nameSpan.textContent = node.name;
            row.appendChild(nameSpan);
            
            // Click: select or toggle folder
            row.addEventListener('click', (e) => {
                if (node.type === 'folder') {
                    window.fileSystem.toggleFolder(node.id, e);
                } else {
                    window.fileSystem.selectNode(node.id, true);
                }
            });
            
            // Double-click: inline rename
            row.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this._startInlineRename(node.id, nameSpan);
            });
            
            container.appendChild(row);
            
            if (node.type === 'folder' && isExpanded) {
                this.nodes
                    .filter(n => n.parentId === node.id)
                    .sort((a, b) => {
                        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                        return a.name.localeCompare(b.name);
                    })
                    .forEach(child => buildNode(child, depth + 1));
            }
        };
        
        const rootNode = this.getNode('root');
        if (rootNode) {
            // Root row
            const isSelected = rootNode.id === this.selectedNodeId;
            const rootRow = document.createElement('div');
            rootRow.className = `flex items-center py-1.5 px-2 cursor-pointer transition-colors font-bold mb-1 rounded ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700/50'}`;
            rootRow.innerHTML = '<i class="fa-solid fa-box-archive text-gray-500 mr-2"></i>';
            const rootNameSpan = document.createElement('span');
            rootNameSpan.textContent = rootNode.name;
            rootRow.appendChild(rootNameSpan);
            rootRow.addEventListener('click', () => window.fileSystem.selectNode('root', false));
            container.appendChild(rootRow);
            
            this.nodes
                .filter(n => n.parentId === 'root')
                .sort((a, b) => {
                    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                    return a.name.localeCompare(b.name);
                })
                .forEach(child => buildNode(child, 1));
        }
    }
}

window.fileSystem = new FileSystem();
document.addEventListener('DOMContentLoaded', () => {
    window.fileSystem.init();
    // Auto-collapse sidebar on mobile
    if (window.innerWidth < 640) {
        const sidebar = document.getElementById('sidebar');
        const resizer = document.getElementById('sidebar-resizer');
        if (sidebar) sidebar.classList.add('sidebar-collapsed');
        if (resizer) resizer.classList.add('resizer-hidden');
    }
});

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const resizer = document.getElementById('sidebar-resizer');
    const overlay = document.getElementById('sidebar-overlay');
    const isMobile = window.innerWidth < 640;
    const isCollapsed = sidebar.classList.contains('sidebar-collapsed');

    if (isCollapsed) {
        sidebar.classList.remove('sidebar-collapsed');
        resizer.classList.remove('resizer-hidden');
        if (isMobile) overlay.classList.add('active');
    } else {
        sidebar.classList.add('sidebar-collapsed');
        resizer.classList.add('resizer-hidden');
        overlay.classList.remove('active');
    }
    setTimeout(() => { if (typeof editor !== 'undefined' && editor) editor.refresh(); }, 320);
}

document.addEventListener('DOMContentLoaded', () => {
    const resizer = document.getElementById('sidebar-resizer');
    const sidebar = document.getElementById('sidebar');
    let isResizing = false;

    if (resizer) {
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            let newWidth = e.clientX;
            if (newWidth < 100) {
                sidebar.classList.add('sidebar-collapsed');
                sidebar.style.width = '';
            } else {
                sidebar.classList.remove('sidebar-collapsed');
                if (newWidth > 500) newWidth = 500;
                sidebar.style.width = newWidth + 'px';
                sidebar.classList.remove('w-64');
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                if (editor) editor.refresh();
            }
        });
    }
});
