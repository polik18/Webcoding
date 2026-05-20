// js/core/fileio/constants.js
// Shared constants for File I/O modules. Load before open.js and dnd.js.

// ⚠️  SINGLE SOURCE OF TRUTH: MAX_FILE_SIZE is declared HERE and ONLY here.
//     DO NOT re-declare it in js/editor.js or anywhere else — it will cause a fatal SyntaxError.
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB for plain text


// Binary-like formats are routed to specialized loaders and not stored as text.
const _BINARY_EXTS = ['png','jpg','jpeg','gif','bmp','webp','tiff','pdf','zip','xlsx','xls','docx','odt'];
