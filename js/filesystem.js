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

    createNode(type, parentId, name) {
        const id = 'fs_' + Date.now() + '_' + this.counter++;
        const newNode = {
            id, parentId, type, name, 
            content: type === 'file' ? '' : null,
            eol: '\n', encoding: 'utf-8'
        };
        this.nodes.push(newNode);
        if (type === 'folder') this.expandedFolders.add(id);
        this.save();
        this.renderTree();
        return newNode;
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
        const defaultName = type === 'file' ? 'NewFile.txt' : 'NewFolder';
        
        showCustomPrompt(
            (typeof t === 'function' ? t(titleKey) : defaultName) || defaultName, 
            (typeof t === 'function' ? t('messages.renameMsg') : 'Enter name:'), 
            defaultName, 
            (name) => {
                if (name && name.trim() !== '') {
                    const node = this.createNode(type, parentId, name.trim());
                    this.expandedFolders.add(parentId);
                    this.save();
                    this.renderTree();
                    if (type === 'file') {
                        this.openFileInTab(node.id);
                    }
                }
            }
        );
    }

    deleteSelectedNode() {
        if (!this.selectedNodeId || this.selectedNodeId === 'root') return;
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
            if (!node.parentId || node.parentId === 'root') return node.name;
            const parent = this.getNode(node.parentId);
            return parent ? getPath(parent) + '/' + node.name : node.name;
        };
        
        // Add files to ZIP
        this.nodes.forEach(node => {
            if (node.type === 'file') {
                const path = getPath(node);
                zip.file(path, node.content || "");
            } else if (node.type === 'folder') {
                const path = getPath(node);
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
            const content = await zip.generateAsync({type:"blob"});
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
        
        const buildTreeHtml = (parentId, depth) => {
            const children = this.nodes.filter(n => n.parentId === parentId).sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
            
            let html = '';
            children.forEach(node => {
                const isSelected = node.id === this.selectedNodeId;
                const isExpanded = this.expandedFolders.has(node.id);
                const padding = depth * 12 + 4;
                
                let icon = '';
                if (node.type === 'folder') {
                    icon = isExpanded ? '<i class="fa-solid fa-folder-open text-yellow-400 w-4 text-center"></i>' : '<i class="fa-solid fa-folder text-yellow-400 w-4 text-center"></i>';
                } else {
                    icon = '<i class="fa-regular fa-file-code text-blue-400 w-4 text-center"></i>';
                }
                
                const chevron = node.type === 'folder' ? 
                    (isExpanded ? '<i class="fa-solid fa-chevron-down text-[10px] w-3 text-gray-400 text-center"></i>' : '<i class="fa-solid fa-chevron-right text-[10px] w-3 text-gray-400 text-center"></i>') 
                    : '<span class="w-3"></span>';
                
                const bgClass = isSelected ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700/50';
                
                html += `<div class="flex items-center py-1 cursor-pointer transition-colors ${bgClass}" style="padding-left: ${padding}px" 
                            onclick="fileSystem.${node.type === 'folder' ? \`toggleFolder('\${node.id}', event)\` : \`selectNode('\${node.id}', true)\`}">
                            ${chevron} <span class="ms-1 me-1.5">${icon}</span> <span class="truncate max-w-[150px] font-medium">${node.name}</span>
                        </div>`;
                        
                if (node.type === 'folder' && isExpanded) {
                    html += buildTreeHtml(node.id, depth + 1);
                }
            });
            return html;
        };
        
        const rootNode = this.getNode('root');
        if (rootNode) {
            const isSelected = rootNode.id === this.selectedNodeId;
            const bgClass = isSelected ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-200 dark:hover:bg-gray-700/50';
            container.innerHTML = `
                <div class="flex items-center py-1.5 px-2 cursor-pointer transition-colors ${bgClass} font-bold mb-1 rounded" onclick="fileSystem.selectNode('root', false)">
                    <i class="fa-solid fa-box-archive text-gray-500 mr-2"></i> ${rootNode.name}
                </div>
                ${buildTreeHtml('root', 1)}
            `;
        }
    }
}

window.fileSystem = new FileSystem();
document.addEventListener('DOMContentLoaded', () => {
    window.fileSystem.init();
});

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const resizer = document.getElementById('sidebar-resizer');
    if (sidebar.classList.contains('w-0')) {
        sidebar.classList.remove('w-0', 'border-0', 'opacity-0');
        sidebar.classList.add('w-64');
        resizer.classList.remove('hidden');
    } else {
        sidebar.classList.add('w-0', 'border-0', 'opacity-0');
        sidebar.classList.remove('w-64');
        resizer.classList.add('hidden');
    }
    setTimeout(() => { if (editor) editor.refresh(); }, 300);
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
            if (newWidth < 150) newWidth = 150;
            if (newWidth > 500) newWidth = 500;
            sidebar.style.width = newWidth + 'px';
            sidebar.classList.remove('w-64');
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
