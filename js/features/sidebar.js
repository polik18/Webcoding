// js/features/sidebar.js
// Sidebar toggle, drag-to-resize, and overlay control.
// Requires: js/core/filesystem.js loaded before this file.

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
window.toggleSidebar = toggleSidebar;


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
