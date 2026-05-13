// Recent Files & File System Handle Manager
// Utilizes localforage to store FileSystemHandles in IndexedDB

const RECENT_KEY = 'webpad_recent_history';

window.recentHistory = [];

async function loadRecentHistory() {
    try {
        const history = await localforage.getItem(RECENT_KEY);
        if (history && Array.isArray(history)) {
            window.recentHistory = history;
        }
    } catch (e) {
        console.error("Error loading recent history:", e);
    }
    renderRecentModal();
}

async function saveRecentHistory() {
    try {
        await localforage.setItem(RECENT_KEY, window.recentHistory);
    } catch (e) {
        console.error("Error saving recent history:", e);
    }
}

async function addToRecentHistory(handle, type = 'file') {
    // Check if browser supports handles
    if (!handle || !handle.name) return;
    
    // Remove if already exists (to move it to top)
    window.recentHistory = window.recentHistory.filter(h => h.handle && h.handle.name !== handle.name);
    
    window.recentHistory.unshift({
        handle: handle,
        type: type,
        name: handle.name,
        lastAccessed: Date.now()
    });
    
    // Keep only last 20 items
    if (window.recentHistory.length > 20) {
        window.recentHistory.pop();
    }
    
    await saveRecentHistory();
    renderRecentModal();
}

window.clearRecentHistory = async function() {
    if (confirm('確定要清除所有最近存取的紀錄嗎？')) {
        window.recentHistory = [];
        await saveRecentHistory();
        renderRecentModal();
        showToast('紀錄已清除', 'success');
    }
};

window.openRecentModal = function() {
    document.getElementById('recent-modal').classList.remove('hidden');
    loadRecentHistory(); // Refresh
};

window.closeRecentModal = function() {
    document.getElementById('recent-modal').classList.add('hidden');
};

function renderRecentModal() {
    const container = document.getElementById('recent-list-container');
    if (!container) return;
    
    if (window.recentHistory.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
                <i class="fa-solid fa-folder-open text-3xl mb-3 text-gray-300 dark:text-gray-600 block"></i>
                目前沒有最近存取的紀錄。<br>當您開啟資料夾或儲存檔案時，會自動記錄於此。
            </div>`;
        return;
    }
    
    let html = '';
    window.recentHistory.forEach((item, index) => {
        const icon = item.type === 'directory' ? 'fa-folder text-yellow-500' : 'fa-file-code text-blue-500';
        const date = new Date(item.lastAccessed).toLocaleString();
        html += `
            <div class="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition" onclick="loadRecentItem(${index})">
                <div class="flex items-center gap-3">
                    <i class="fa-solid ${icon} text-2xl"></i>
                    <div>
                        <div class="font-bold text-gray-800 dark:text-gray-200">${item.name}</div>
                        <div class="text-[10px] text-gray-500">${date}</div>
                    </div>
                </div>
                <div class="text-xs text-blue-500 font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                    ${item.type === 'directory' ? '開啟資料夾' : '開啟檔案'}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Check and request permission for handle
async function verifyPermission(fileHandle, readWrite) {
    const options = {};
    if (readWrite) {
        options.mode = 'readwrite';
    }
    
    // Check if permission was already granted. If so, return true.
    if ((await fileHandle.queryPermission(options)) === 'granted') {
        return true;
    }
    
    // Request permission. If the user grants permission, return true.
    if ((await fileHandle.requestPermission(options)) === 'granted') {
        return true;
    }
    
    return false;
}

window.loadRecentItem = async function(index) {
    const item = window.recentHistory[index];
    if (!item || !item.handle) return;
    
    try {
        const handle = item.handle;
        
        // Request read permission
        const granted = await verifyPermission(handle, true);
        if (!granted) {
            showToast('讀取權限被拒絕', 'error');
            return;
        }
        
        closeRecentModal();
        showToast('讀取中...', 'info');
        
        if (item.type === 'file') {
            const file = await handle.getFile();
            file.handle = handle; // Attach handle so saveFile can use it
            loadFileContent(file);
        } else if (item.type === 'directory') {
            // It's a directory handle
            // First, clear current FS if needed or append?
            // Actually, we can use the existing folder drag-and-drop logic
            if (confirm('這將會關閉目前所有的分頁並匯入該資料夾，確定嗎？')) {
                // Wipe current
                if (typeof fs !== 'undefined') fs.root.children = [];
                if (typeof tabManager !== 'undefined') {
                    tabManager.tabs = [];
                    document.getElementById('tabs-container').innerHTML = '';
                    document.getElementById('editor-container').classList.add('hidden');
                    document.getElementById('visual-container').classList.add('hidden');
                }
                
                await processDirectoryHandle(handle, 'root');
                
                if (typeof fs !== 'undefined') {
                    fs.save();
                    fs.renderTree();
                }
                showToast('資料夾載入完成', 'success');
            }
        }
        
        // Update access time
        addToRecentHistory(handle, item.type);
        
    } catch (e) {
        console.error(e);
        showToast('無法讀取該檔案或資料夾 (可能已被移動或刪除)', 'error');
        // Remove it from history
        window.recentHistory.splice(index, 1);
        saveRecentHistory();
        renderRecentModal();
    }
};

// Recursive function to process a directory handle
async function processDirectoryHandle(dirHandle, parentId) {
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            const file = await entry.getFile();
            // Assign handle to file object so we can use it on save
            file.handle = entry;
            
            const reader = new FileReader();
            await new Promise((resolve) => {
                reader.onload = (e) => {
                    const content = e.target.result;
                    if (typeof fs !== 'undefined') {
                        // Create node with handle attached
                        const node = fs.createFile(file.name, content, parentId);
                        if (node) node.handle = entry; // Attach the handle for direct save later!
                    }
                    resolve();
                };
                
                const ext = file.name.split('.').pop().toLowerCase();
                if (['png', 'jpg', 'jpeg', 'gif', 'pdf', 'zip', 'xlsx'].includes(ext)) {
                    reader.readAsDataURL(file);
                } else {
                    reader.readAsText(file);
                }
            });
        } else if (entry.kind === 'directory') {
            const folderId = 'folder_' + Date.now() + Math.random().toString(36).substr(2, 9);
            if (typeof fs !== 'undefined') {
                fs.createFolder(entry.name, parentId, folderId);
            }
            await processDirectoryHandle(entry, folderId);
        }
    }
}

// Ensure localforage loads it on startup
window.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure localforage is ready
    setTimeout(loadRecentHistory, 1000);
});
