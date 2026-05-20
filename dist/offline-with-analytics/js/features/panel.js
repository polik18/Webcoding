// js/features/panel.js
// Responsibility: IDE bottom panel — Problems tab, Console tab, runCode, lintPython.

let pyodideInstance = null; // shared with editor.js via window
let currentPanelTab = 'problems';

function openPanel(tab) {
    document.getElementById('ide-panel').classList.remove('hidden');
    document.getElementById('ide-panel').classList.add('flex');
    if (tab) switchPanelTab(tab);
    setTimeout(() => editor.refresh(), 50);
}
function closePanel() {
    document.getElementById('ide-panel').classList.add('hidden');
    document.getElementById('ide-panel').classList.remove('flex');
    setTimeout(() => editor.refresh(), 50);
}
function switchPanelTab(tab) {
    currentPanelTab = tab;
    document.getElementById('tab-problems').classList.remove('border-blue-500','text-white');
    document.getElementById('tab-console').classList.remove('border-blue-500','text-white');
    document.getElementById('panel-problems').classList.add('hidden');
    document.getElementById('panel-console').classList.add('hidden');
    document.getElementById(`tab-${tab}`).classList.add('border-blue-500','text-white');
    document.getElementById(`panel-${tab}`).classList.remove('hidden');
}

function updateProblemsPanel(annotations) {
    if (!annotations || !Array.isArray(annotations)) return;
    const count = annotations.length;
    document.getElementById('problem-count').textContent = count;
    if (count > 0 && document.getElementById('ide-panel').classList.contains('hidden')) openPanel('problems');
    const container = document.getElementById('panel-problems');
    container.innerHTML = '';
    if (count === 0) { container.innerHTML = `<div class="text-green-400 mt-2 p-2">${t('messages.msgPerfect')}</div>`; return; }
    annotations.forEach(ann => {
        if (!ann) return;
        const div = document.createElement('div'); const isError = ann.severity === 'error';
        div.className = `p-2 mb-2 rounded border-s-4 cursor-pointer transition-colors bg-white/5 hover:bg-white/10 ${isError ? 'border-red-500' : 'border-yellow-500'}`;
        const fromLine = (ann.from && typeof ann.from.line !== 'undefined') ? ann.from.line + 1 : t('messages.msgUnknownLine');
        const fromCh = (ann.from && typeof ann.from.ch !== 'undefined') ? ann.from.ch : 0;
        const targetLine = fromLine !== t('messages.msgUnknownLine') ? fromLine - 1 : 0;
        const icon = isError ? '<i class="fa-solid fa-circle-xmark text-red-400"></i>' : '<i class="fa-solid fa-triangle-exclamation text-yellow-400"></i>';
        div.innerHTML = `<div class="flex items-start gap-2"><div class="mt-0.5">${icon}</div><div><div class="font-bold ${isError ? 'text-red-400' : 'text-yellow-400'}">${t('messages.msgLine')} ${fromLine} ${t('messages.msgLineSuf')}</div><div class="text-gray-300 mt-1">${ann.message || t('messages.msgUnknownErr')}</div></div></div>`;
        div.onclick = () => { editor.setCursor(targetLine, fromCh); editor.focus(); };
        container.appendChild(div);
    });
}

function printConsole(text, type = 'log') {
    const container = document.getElementById('panel-console');
    const div = document.createElement('div');
    let colorClass = 'text-gray-300';
    if (type === 'error') colorClass = 'text-red-400 font-bold';
    else if (type === 'system') colorClass = 'text-green-400';
    else if (type === 'yellow') colorClass = 'text-yellow-400';
    div.className = `mb-1 ${colorClass}`; div.textContent = text;
    container.appendChild(div); container.scrollTop = container.scrollHeight;
}
function clearConsole() { document.getElementById('panel-console').innerHTML = ''; }

async function lintPython(text) {
    if (!pyodideInstance) {
        showToast(t('messages.pyLoad'), "info");
        try { pyodideInstance = await loadPyodide(); window.pyodideInstance = pyodideInstance; showToast(t('messages.pyReady'), "success"); }
        catch (e) { return [{ message: t('messages.pyFail'), severity: "error", from: CodeMirror.Pos(0,0), to: CodeMirror.Pos(0,1) }]; }
    }
    try {
        pyodideInstance.runPython(`import ast\nast.parse(${JSON.stringify(text)})`); return [];
    } catch (err) {
        const lines = err.message.split('\n'); let lineNum = 1, msg = "Syntax Error";
        for (let line of lines) { if (line.includes('line')) { const m = line.match(/line (\d+)/); if (m) lineNum = parseInt(m[1]); } if (line.includes('Error:')) msg = line.trim(); }
        return [{ message: msg, severity: "error", from: CodeMirror.Pos(lineNum-1,0), to: CodeMirror.Pos(lineNum-1,100) }];
    }
}
if (typeof CodeMirror !== 'undefined' && CodeMirror.registerHelper) {
    CodeMirror.registerHelper("lint", "python", function(text) { return new Promise(resolve => lintPython(text).then(resolve)); });
}

async function runCode() {
    if (getActive().mode === 'visual') return showToast(t('messages.noRunVis'), "error");
    const mode = editor.getOption('mode'); const code = editor.getValue();
    if (mode === 'htmlmixed') {
        try {
            const blob = new Blob([code], { type: 'text/html;charset=utf-8' }); const url = URL.createObjectURL(blob); const newWin = window.open(url, '_blank');
            if (newWin) { showToast(t('messages.runHTML'), "success"); openPanel('console'); printConsole(`\n${t('messages.runStart')} (${new Date().toLocaleTimeString()}) ---\n`,'system'); printConsole(t('messages.runConsole'),'log'); }
            else showToast(t('messages.popBlock'), "error");
        } catch (err) { showToast(t('messages.runFail'), "error"); } return;
    }
    openPanel('console'); printConsole(`\n${t('messages.runStart')} (${new Date().toLocaleTimeString()}) ---\n`,'system');
    if (mode === 'javascript') {
        try {
            const origLog=console.log; const origErr=console.error; const origWarn=console.warn;
            console.log = (...a) => { printConsole(a.map(x=>typeof x==='object'?JSON.stringify(x):x).join(' '),'log'); origLog(...a); };
            console.error = (...a) => { printConsole(a.join(' '),'error'); origErr(...a); };
            console.warn = (...a) => { printConsole(a.join(' '),'yellow'); if(origWarn)origWarn(...a); };
            const AF = Object.getPrototypeOf(async function(){}).constructor; const result = await new AF(code)();
            if (result !== undefined) printConsole(`<- ${typeof result==='object'?JSON.stringify(result):result}`,'log');
            console.log=origLog; console.error=origErr; console.warn=origWarn;
        } catch (err) { printConsole(err.toString(),'error'); }
    } else if (mode === 'python') {
        if (!pyodideInstance) { printConsole(t('messages.runWait'),'error'); return; }
        try {
            await pyodideInstance.runPythonAsync(`import sys; import io; sys.stdout = io.StringIO(); sys.stderr = io.StringIO()`);
            await pyodideInstance.runPythonAsync(code);
            const stdout = await pyodideInstance.runPythonAsync(`sys.stdout.getvalue()`);
            const stderr = await pyodideInstance.runPythonAsync(`sys.stderr.getvalue()`);
            if (stdout) printConsole(stdout,'log'); if (stderr) printConsole(stderr,'error');
        } catch (err) { printConsole(err.toString(),'error'); }
    } else { printConsole(`${t('messages.runNotSup')} ${mode} ${t('messages.runHint')}`,'error'); }
}
