# AI Translation Prompt for WebPad++ Locales

You can use the following prompt with AI tools like ChatGPT, Claude, or Gemini to automatically generate the remaining language packs (Tier 2 and Tier 3) for WebPad++.

## Instructions
1. Copy the **Prompt Template** below.
2. Replace `[TARGET_LANGUAGE_CODE]` with the language you want to generate (e.g., `ko` for Korean, `pt-BR` for Brazilian Portuguese).
3. Replace `[TARGET_LANGUAGE_NAME]` with the full name of the language (e.g., `Korean`, `Brazilian Portuguese`).
4. Provide the prompt to the LLM and save its output as `[TARGET_LANGUAGE_CODE].json` inside the `locales` folder.

---

## Prompt Template

```markdown
I am building a multi-language web application. Below is the base English JSON dictionary (`en.json`). 

Please translate all the values into **[TARGET_LANGUAGE_NAME]** and output ONLY the valid JSON format. 

### Rules:
1. Maintain the exact same JSON structure, keys, and hierarchy.
2. DO NOT translate any HTML tags (e.g., `<i>`, `<span>`, `<strong>`, `<ul>`, `<li>`, `<h1>`, `<h2>`, `<p>`, `<div>`). Keep them exactly as they are.
3. DO NOT translate the placeholders or variables if there are any.
4. DO NOT translate `Ctrl+Enter`, `3x3`, `H1`, `H2`, `HTML`, `JS`, `Python`.
5. Keep the tone professional but user-friendly.
6. The output must be valid JSON, without any markdown formatting wrappers like ```json if possible, or just standard JSON.

### Base English JSON:
{
  "nav": {
    "openBtn": "Open",
    "saveBtn": "Save",
    "runBtn": "Run",
    "code": "Code",
    "visual": "Visual",
    "openTitle": "Open File",
    "saveTitle": "Save File",
    "runTitle": "Run Code (Ctrl+Enter)",
    "renameTitle": "Click to rename",
    "defaultFile": "Untitled.html",
    "formatBtn": "Format",
    "formatTitle": "Format Code",
    "newTabTitle": "New Tab",
    "compareTitle": "Compare Mode",
    "compareBtn": "Compare",
    "untitled": "Untitled",
    "explorer": "Explorer",
    "newFile": "New File",
    "newFolder": "New Folder",
    "deleteNode": "Delete",
    "toggleExplorer": "Toggle Sidebar",
    "exportZip": "Export ZIP",
    "modeCode": "Code",
    "modeVisual": "Visual",
    "modeSplit": "Split Preview"
  },
  "panel": {
    "probTab": "Problems",
    "consoleTab": "Console",
    "clearConsole": "Clear Console",
    "closePanel": "Close Panel"
  },
  "visual": {
    "bold": "Bold",
    "italic": "Italic",
    "underline": "Underline",
    "alignLeft": "Align Left",
    "alignCenter": "Align Center",
    "alignRight": "Align Right",
    "h1": "H1",
    "h2": "H2",
    "textColor": "Text Color",
    "insertImg": "Insert Image",
    "insertLink": "Insert Link",
    "insertTableTitle": "Insert 3x3 Table",
    "insertTable": "Table",
    "rowAddTitle": "Add Row Below",
    "rowAdd": "+Row",
    "colAddTitle": "Add Col Right",
    "colAdd": "+Col",
    "rowDelTitle": "Delete Current Row",
    "rowDel": "-Row",
    "colDelTitle": "Delete Current Col",
    "colDel": "-Col"
  },
  "messages": {
    "dropText": "Drop to open file",
    "cancel": "Cancel",
    "confirm": "OK",
    "msgPerfect": "<i class='fa-solid fa-check'></i> Code looks perfect, no syntax errors found!",
    "msgUnknownLine": "Unknown",
    "msgUnknownErr": "Unknown Error",
    "msgLine": "Line",
    "msgLineSuf": "",
    "renamePrompt": "Rename File",
    "renameMsg": "Enter file name (with extension, e.g., test.srt, script.py):",
    "toastRenamed": "File renamed to:",
    "savePrompt": "Save File",
    "saveMsg": "Enter save name (with extension, e.g., subtitle.srt, index.html):",
    "cancelSave": "Save cancelled",
    "toastSaved": "File downloaded",
    "tooBig": "File too large",
    "limit": "limit 2MB",
    "toastLoaded": "Loaded:",
    "runHTML": "Web preview opened in a new tab!",
    "runConsole": "HTML deployed to a new tab for preview.\n(Hint: Allow popups if nothing happens)",
    "popBlock": "Popup blocked by browser, please allow",
    "runFail": "Preview failed",
    "noRunVis": "Cannot run code in Visual Mode, switch to Code Mode first.",
    "runStart": "--- Run Started",
    "runWait": "⏳ Python engine loading, please wait...",
    "runNotSup": "Direct execution not supported for",
    "runHint": "format.\nHint: Rename to .js or .py to enable execution.",
    "promptImg": "Enter image URL:",
    "promptLink": "Enter URL:",
    "promptTableMsg": "Insert default 3x3 table? (Type ok or click OK)",
    "tableCell": "Cell",
    "errTable": "Please click inside a table first",
    "pyLoad": "Loading Python engine...",
    "pyReady": "Python engine ready!",
    "pyFail": "Failed to load Python",
    "exitCompare": "Exit Compare",
    "selectCompareTab": "Select a tab to compare with:",
    "confirmClose": "Discard unsaved changes to {{name}}?",
    "openCompareTab": "Open another tab first to compare",
    "errEncoding": "Encoding not supported",
    "errDecode": "Failed to decode file",
    "errFormat": "Format error",
    "errFormatNotSup": "Formatting not supported",
    "confirmDeleteMsg": "Are you sure you want to delete"
  },
  "content": {
    "default": "<div class=\"content-wrapper\">\n    <h1>Welcome to WebPad++ <span style=\"font-size: 0.5em; color: #888;\">(IDE Edition)</span></h1>\n    <p>This is a powerful browser-based editor requiring zero backend.</p>\n    <h2>✨ Ultimate Update Highlights</h2>\n    <ul>\n        <li><strong>New IDE Panel</strong>: Make a typo, and the Problems panel pops up automatically!</li>\n        <li><strong>Run Code</strong>: Click \"Run\" to execute JS and Python instantly.</li>\n        <li><strong>Click to Rename</strong>: Click the top <i class=\"fa-solid fa-pen\"></i> to rename. Changing the extension updates the syntax highlighter.</li>\n        <li><strong>Multilingual Support</strong>: Auto-detects and supports dynamically switching!</li>\n    </ul>\n</div>"
  }
}
```
