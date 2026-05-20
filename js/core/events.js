// js/core/events.js — Centralized UI event bindings
// Step 2 refactor: app UI uses data-* attributes instead of inline onclick/onchange.
// Step 3 refactor: action resolution goes through WebcodingApp namespace first,
// then falls back to legacy globals for compatibility.

(function () {
    'use strict';

    const ACTIVE_DROP_CLASSES = ['border-violet-500', 'bg-violet-50', 'dark:bg-violet-900/20'];

    function isPromiseLike(value) {
        return value && typeof value.then === 'function';
    }

    function safeToast(message, type = 'error') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console[type === 'error' ? 'error' : 'log'](message);
        }
    }

    function parseArgs(raw) {
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (err) {
            console.warn('[events] Invalid data-args JSON:', raw, err);
            return [];
        }
    }

    function resolveCallable(path) {
        if (!path || typeof path !== 'string') return null;

        if (window.WebcodingApp && window.WebcodingApp.namespace) {
            const callable = window.WebcodingApp.namespace.resolveCallable(path);
            if (callable) return callable;
        }

        const parts = path.replace(/^window\./, '').split('.').filter(Boolean);
        let context = window;
        for (let i = 0; i < parts.length - 1; i += 1) {
            context = context && context[parts[i]];
        }
        const name = parts[parts.length - 1];
        const fn = context && context[name];
        if (typeof fn !== 'function') return null;
        return { fn, context };
    }

    function callNamed(path, args = [], options = {}) {
        const callable = resolveCallable(path);
        if (!callable) {
            const message = `[events] Handler not found: ${path}`;
            if (!options.optional) {
                console.warn(message);
                safeToast('功能尚未載入，請稍後再試', 'error');
            } else {
                console.info(message);
            }
            return undefined;
        }
        return callable.fn.apply(callable.context, args);
    }

    async function runCall(el, event) {
        const args = parseArgs(el.dataset.args);
        if (el.dataset.passEvent === 'true') args.push(event);
        return callNamed(el.dataset.call, args, { optional: el.dataset.optional === 'true' });
    }

    async function runSequence(el, event) {
        let sequence = [];
        try {
            sequence = JSON.parse(el.dataset.sequence || '[]');
        } catch (err) {
            console.warn('[events] Invalid data-sequence JSON:', el.dataset.sequence, err);
            return;
        }
        for (const item of sequence) {
            const call = typeof item === 'string' ? item : item.call;
            const args = typeof item === 'string' ? [] : (item.args || []);
            const optional = typeof item === 'string' ? false : item.optional === true;
            const finalArgs = Array.isArray(args) ? args.slice() : [args];
            if (typeof item === 'object' && item.passEvent === true) finalArgs.push(event);
            const result = callNamed(call, finalArgs, { optional });
            if (isPromiseLike(result)) await result;
        }
    }

    function setValue(el) {
        const target = document.querySelector(el.dataset.target || '');
        if (!target) {
            console.warn('[events] set-value target not found:', el.dataset.target);
            return;
        }
        target.value = el.dataset.value || '';
        target.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async function saveMenuCall(el, event) {
        const result = runCall(el, event);
        // Match the old inline behavior: close the menu immediately after triggering the action.
        document.getElementById('save-menu')?.classList.add('hidden');
        if (isPromiseLike(result)) await result;
        return result;
    }

    const ACTIONS = {
        call: runCall,
        sequence: runSequence,
        'set-value': setValue,
        'save-menu-call': saveMenuCall,
    };

    async function handleAction(event) {
        // A hidden file input may be nested inside a button that has data-action.
        // When input.click() is called programmatically, the click bubbles; ignore it
        // here so upload triggers do not recursively call themselves.
        if (event.target instanceof HTMLInputElement && event.target.type === 'file') return;

        const el = event.target.closest('[data-action]');
        if (!el || !document.documentElement.contains(el)) return;
        if (el.matches('button:disabled, [aria-disabled="true"]')) return;

        const actionName = el.dataset.action;
        const action = ACTIONS[actionName];
        if (!action) {
            console.warn('[events] Unknown data-action:', actionName, el);
            return;
        }

        if (el.dataset.preventDefault !== 'false') event.preventDefault();
        if (el.dataset.stopPropagation === 'true') event.stopPropagation();

        try {
            const result = action(el, event);
            if (isPromiseLike(result)) await result;
        } catch (err) {
            console.error('[events] Action failed:', actionName, err);
            safeToast('操作失敗，請開啟 Console 查看錯誤', 'error');
        }
    }

    async function handleChange(event) {
        const el = event.target.closest('[data-change-call]');
        if (!el || !document.documentElement.contains(el)) return;

        const args = el.dataset.passEvent === 'true' ? [event] : [el.value];
        try {
            const result = callNamed(el.dataset.changeCall, args, { optional: el.dataset.optional === 'true' });
            if (isPromiseLike(result)) await result;
        } catch (err) {
            console.error('[events] Change handler failed:', el.dataset.changeCall, err);
            safeToast('變更失敗，請開啟 Console 查看錯誤', 'error');
        }
    }

    function bindOcrDropZone() {
        const dropZone = document.querySelector('[data-drop-zone="ocr"]');
        if (!dropZone) return;

        const activate = (event) => {
            event.preventDefault();
            dropZone.classList.add(...ACTIVE_DROP_CLASSES);
        };
        const deactivate = (event) => {
            event.preventDefault();
            dropZone.classList.remove(...ACTIVE_DROP_CLASSES);
        };
        const drop = (event) => {
            event.preventDefault();
            dropZone.classList.remove(...ACTIVE_DROP_CLASSES);
            const dropHandler = window.WebcodingApp?.namespace?.resolve('tools.ocr.handleDrop') || window.handleOcrDrop;
            if (typeof dropHandler === 'function') {
                dropHandler(event);
            } else {
                safeToast('OCR 拖曳功能尚未載入', 'error');
            }
        };

        dropZone.addEventListener('dragover', activate);
        dropZone.addEventListener('dragleave', deactivate);
        dropZone.addEventListener('drop', drop);
    }

    function bindUiEvents() {
        document.addEventListener('click', handleAction);
        document.addEventListener('change', handleChange);
        bindOcrDropZone();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindUiEvents, { once: true });
    } else {
        bindUiEvents();
    }

    const api = {
        callNamed,
        parseArgs,
        bindUiEvents,
    };

    if (window.WebcodingApp && window.WebcodingApp.namespace) {
        window.WebcodingApp.namespace.expose('core.events', api, { legacyName: 'uiEventBinder' });
    } else {
        window.uiEventBinder = api;
    }
})();
